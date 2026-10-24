#!/usr/bin/env bash
# Turno para correr UNA prueba contra la base (regla del coordinador, 23 oct 21:16): espera a que la ficha de
# backend no diga "MIGRACION EN CURSO" ni ninguna otra ficha tenga una marca "CORRIENDO PRUEBA" activa; marca
# "CORRIENDO PRUEBA (hh:mm)" en agentes/sinteticos.md, corre el guion, y saca la marca al terminar. Con varios
# guiones, repite la espera entre uno y otro (alguien pudo empezar mientras tanto).
#
#   tests/sinteticos/turno.sh <url> <guion> [<guion>...]      (guion = nombre en tests/sinteticos/, sin .mjs)
#
# CRUXE_COORD: copia de la rama coordinacion (por defecto ../cruce-coord-sinteticos). Espera hasta 60 min por guion.
set -u
URL="${1:?uso: turno.sh <url> <guion>...}"; shift
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
COORD="${CRUXE_COORD:-$RAIZ/../cruce-coord-sinteticos}"
export CRUXE_COORD="$COORD"
FICHA="agentes/sinteticos.md"
hora() { TZ=America/Santiago date +%H:%M; }

# La misma lectura que guardia.mjs (ignora la frase citada entre comillas).
migrando() { (cd "$RAIZ" && node -e "import('./tests/sinteticos/guardia.mjs').then(m=>process.exit(m.migracionEnCurso()?0:1))"); }

# Una marca activa de otro agente.
otros_corriendo() {
  git -C "$COORD" fetch -q origin coordinacion 2>/dev/null || return 1
  for f in $(git -C "$COORD" ls-tree --name-only origin/coordinacion agentes/ | grep '\.md$' | grep -v "$FICHA"); do
    # Solo cuenta la marca en sí: una línea que EMPIEZA con «- CORRIENDO PRUEBA (hh:mm)» (formato de la regla del 21:16).
    # Menciones dentro de otra frase ("el coordinador está en CORRIENDO PRUEBA…") no son una marca.
    if git -C "$COORD" show "origin/coordinacion:$f" | grep -E '^[-*] \**CORRIENDO PRUEBA \(?[0-9]' | grep -v -i -E 'terminad' | grep -q .; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

# marcar "texto": pone la marca (y saca la anterior); marcar "": la saca. Siempre sobre el último origin/coordinacion.
marcar() {
  for intento in 1 2 3; do
    git -C "$COORD" fetch -q origin coordinacion && git -C "$COORD" checkout -q --detach origin/coordinacion || { sleep 5; continue; }
    python3 - "$COORD/$FICHA" "$1" <<'PY'
import re, sys
p, marca = sys.argv[1], sys.argv[2]
t = open(p).read()
t = re.sub(r'^- CORRIENDO PRUEBA \(.*\(sinteticos\)\n', '', t, flags=re.M)
if marca:
    t = t.replace('## Tocando ahora\n', '## Tocando ahora\n- ' + marca + '\n', 1)
open(p, 'w').write(t)
PY
    if git -C "$COORD" add "$FICHA" && git -C "$COORD" commit -qm "sinteticos: ${1:-fin de prueba}" && git -C "$COORD" push -q origin HEAD:coordinacion; then
      return 0
    fi
    sleep 5
  done
  return 1
}

for g in "$@"; do
  for i in $(seq 1 120); do
    if migrando; then echo "[$(hora)] base en migración; espero"; sleep 30; continue; fi
    if o=$(otros_corriendo); then echo "[$(hora)] $o está corriendo; espero"; sleep 30; continue; fi
    marcar "CORRIENDO PRUEBA ($(hora)): $g contra $URL (sinteticos)" || { echo "[$(hora)] no pude marcar; reintento"; sleep 30; continue; }
    sleep 15
    if o=$(otros_corriendo); then echo "[$(hora)] $o marcó a la vez; cedo el turno"; marcar ""; sleep 45; continue; fi
    echo "=== $g contra $URL ($(hora))"
    (cd "$RAIZ" && node "tests/sinteticos/$g.mjs" "$URL" 2>&1 | tail -34)
    marcar "" || echo "OJO: no pude sacar la marca de la ficha"
    break
  done
done
