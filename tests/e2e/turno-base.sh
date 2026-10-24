#!/usr/bin/env bash
# Turno para correr UNA prueba contra la base (regla del coordinador, 21:16 del 23 oct): en todo el equipo corre una sola
# e2e a la vez. Antes de empezar espera a que ninguna ficha de `agentes/` (rama coordinacion) diga MIGRACION EN CURSO,
# PRUEBA DE CARGA EN CURSO ni CORRIENDO PRUEBA; marca "CORRIENDO PRUEBA (hh:mm) <qué>" en la ficha propia, corre el
# comando y quita la marca al terminar (también si falla). Solo escribe la ficha propia.
#
# Uso:  tests/e2e/turno-base.sh "<qué se corre>" <comando...>
#       CRUXE_COORD=<copia de coordinacion> (por defecto /Users/macair/cruse/cruce-coord-qa)   CRUXE_YO=<ficha> (qa-noche)
#       CRUXE_ESPERA_MAX=<segundos> (por defecto 1800): si no se libera, sale con 3 sin correr nada.
set -u
QUE="${1:?uso: turno-base.sh \"<qué>\" <comando...>}"; shift
COORD="${CRUXE_COORD:-/Users/macair/cruse/cruce-coord-qa}"
YO="${CRUXE_YO:-qa-noche}"
MAX="${CRUXE_ESPERA_MAX:-1800}"
FICHA="agentes/$YO.md"
hora() { TZ=America/Santiago date +%H:%M; }

ocupada() {
  # Imprime quién ocupa la base (vacío si está libre). Lee la rama remota, no la copia de trabajo.
  git -C "$COORD" fetch -q origin coordinacion 2>/dev/null || { echo "sin-red"; return; }
  # Solo marcas reales: la migración/carga en la ficha de backend, y "CORRIENDO PRUEBA (hh:mm)" con hora en cualquier otra
  # (las fichas también mencionan las frases en prosa al explicar la regla: eso no ocupa la base).
  for f in $(git -C "$COORD" ls-tree --name-only origin/coordinacion agentes/); do
    otro="${f#agentes/}"; otro="${otro%.md}"
    [ "$otro" = "$YO" ] && continue
    tocando="$(git -C "$COORD" show "origin/coordinacion:$f" 2>/dev/null | sed -n '/## Tocando ahora/,/^## /p')"
    if [ "$otro" = backend ] && printf '%s' "$tocando" | grep -qE '^\s*-.*\*?\*?(MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO)\*?\*?'; then echo "$otro"; continue; fi
    if printf '%s' "$tocando" | grep -qE 'CORRIENDO PRUEBA \([0-9]{2}:[0-9]{2}'; then echo "$otro"; fi
  done
}

marcar() {   # $1 = poner | sacar
  for intento in 1 2 3 4 5; do
    git -C "$COORD" fetch -q origin coordinacion && git -C "$COORD" checkout -q --detach origin/coordinacion || { sleep 5; continue; }
    if [ "$1" = poner ]; then
      python3 - "$COORD/$FICHA" "$(hora)" "$QUE" <<'EOF'
import sys
p, h, que = sys.argv[1:4]
s = open(p).read()
s = s.replace("## Tocando ahora\n", f"## Tocando ahora\n- CORRIENDO PRUEBA ({h}) {que}\n", 1)
open(p, 'w').write(s)
EOF
    else
      python3 - "$COORD/$FICHA" <<'EOF'
import sys, re
p = sys.argv[1]
s = open(p).read()
s = re.sub(r"^- CORRIENDO PRUEBA \(\d\d:\d\d\).*\n", "", s, flags=re.M)
open(p, 'w').write(s)
EOF
    fi
    git -C "$COORD" add "$FICHA"
    git -C "$COORD" commit -qm "$YO: ${1} marca CORRIENDO PRUEBA" 2>/dev/null || return 0   # sin cambios: ya estaba así
    git -C "$COORD" push -q origin HEAD:coordinacion 2>/dev/null && return 0
    sleep $((intento * 3))
  done
  echo "[turno $YO] no pude $1 la marca en la ficha" >&2
  return 1
}

inicio=$(date +%s)
while :; do
  quien="$(ocupada | tr '\n' ' ')"
  [ -z "$quien" ] && break
  if [ $(( $(date +%s) - inicio )) -ge "$MAX" ]; then
    echo "PAUSADO: base ocupada por ${quien}(esperé ${MAX}s). No se corrió: $QUE"
    exit 3
  fi
  sleep 30
done
marcar poner || exit 3
echo "[turno $YO $(hora)] base libre; corriendo: $QUE"
"$@"; codigo=$?
marcar sacar
echo "[turno $YO $(hora)] terminó con código $codigo: $QUE"
exit $codigo
