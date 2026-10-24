#!/usr/bin/env bash
# Corrida de rincones contra un build (por defecto http://localhost:4187). Crea un grupo nuevo y un demo propio.
# Uso: tests/rincones/correr-todo.sh [url] [--con-agente]
#   DESDE=<fase>           retoma desde esa fase (las anteriores se saltan; el estado del grupo vive en rincones-capturas/estado)
#   RINCONES_CORRIDA=<id>  escribe en esa carpeta (por defecto, la hora)       SOLO_CHEQUEO=1  solo dice si la base está ocupada
# Regla del equipo (TABLERO 21:16): UNA sola corrida e2e contra la base a la vez. Antes de cada bloque de fases (~10 min) espera a
# que ninguna otra ficha diga "CORRIENDO PRUEBA (hh:mm)" en su "Tocando ahora" ni backend "MIGRACION EN CURSO", anuncia
# "CORRIENDO PRUEBA (hh:mm)" en agentes/rincones.md y lo saca al terminar el bloque (también si la matan).
cd "$(dirname "$0")" || exit 1
URL="${1:-http://localhost:4187}"
export RINCONES_CORRIDA="${RINCONES_CORRIDA:-$(TZ=America/Santiago date +%Y%m%d%H%M)}"
SALIDA="/Users/macair/cruse/rincones-capturas/$RINCONES_CORRIDA"
COORD=/Users/macair/cruse/cruce-coord-rincones
FICHA=agentes/rincones.md
hora() { TZ=America/Santiago date +%H:%M; }

BLOQUES=("f0-sin-grupo f1-organizador f2-invitados" "f3-confirmar-y-reparar f3b-baja-y-reparar f4-listas-y-cancelar" "f5-demo f5b-demo-baja f6-quien-eres f7-grupo-b" "f9-sin-red-y-validaciones f10-fallas f11-responder f13-enmienda13" "f12-a11y-demo")
[ "${2:-}" = "--con-agente" ] && BLOQUES+=("f8-agente")

coord_actualizar() { git -C "$COORD" fetch -q origin && git -C "$COORD" checkout -q --detach origin/coordinacion; }
# ¿Alguien más está probando o migrando? Mira solo "Tocando ahora" de cada ficha ajena y exige el formato con hora.
ocupada() {
  coord_actualizar || { echo "sin-github"; return 0; }
  local f
  for f in "$COORD"/agentes/*.md; do
    [ "$(basename "$f")" = "rincones.md" ] && continue
    if sed -n '/^## Tocando ahora/,/^## /p' "$f" | grep -v TERMINAD | grep -qE 'CORRIENDO PRUEBA ?\(|MIGRACION EN CURSO|PRUEBA DE CARGA EN CURSO'; then
      echo "$(basename "$f" .md)"; return 0
    fi
  done
  return 1
}
if [ -n "${SOLO_CHEQUEO:-}" ]; then q=$(ocupada) && echo "ocupada: $q" || echo "libre"; exit 0; fi
esperar_libre() { local q; while q=$(ocupada); do echo "   (espera $(hora): $q tiene CORRIENDO PRUEBA / MIGRACION EN CURSO)"; sleep 60; done; }
empujar_ficha() {
  local msg="$1" i
  for i in 1 2 3 4 5 6; do
    git -C "$COORD" add "$FICHA" && git -C "$COORD" commit -q -m "$msg" 2>/dev/null
    git -C "$COORD" push -q origin HEAD:coordinacion 2>/dev/null && return 0
    git -C "$COORD" fetch -q origin && { git -C "$COORD" rebase -q origin/coordinacion 2>/dev/null || git -C "$COORD" rebase --abort 2>/dev/null; }
    sleep 5
  done
  echo "   (no pude empujar la ficha: $msg)"; return 1
}
tomar() {
  coord_actualizar
  python3 - "$COORD/$FICHA" "$1" "$(hora)" <<'PY'
import sys,re
p,bloque,hora=sys.argv[1:4]; s=open(p).read()
s=re.sub(r"\n- \[\d\d:\d\d\] CORRIENDO PRUEBA \([^\n]*\n","\n",s)
s=s.replace("## Tocando ahora\n", f"## Tocando ahora\n- [{hora}] CORRIENDO PRUEBA ({hora}): corrida rincones, fases {bloque}, contra mi build local (grupo propio, una sesión por persona; sin ráfagas).\n",1)
open(p,'w').write(s)
PY
  empujar_ficha "rincones: CORRIENDO PRUEBA ($(hora)) $1"
}
soltar() {
  coord_actualizar
  python3 - "$COORD/$FICHA" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p).read()
s=re.sub(r"\n- \[\d\d:\d\d\] CORRIENDO PRUEBA \([^\n]*\n","\n",s)
open(p,'w').write(s)
PY
  empujar_ficha "rincones: prueba terminada ($(hora))"
}
trap 'soltar >/dev/null 2>&1' EXIT
trap 'exit 130' INT TERM

echo "corrida $RINCONES_CORRIDA contra $URL${DESDE:+ (desde $DESDE)}"
saltar="${DESDE:+1}"
for bloque in "${BLOQUES[@]}"; do
  fases=()
  for f in $bloque; do
    if [ -n "$saltar" ] && [ "$f" = "${DESDE:-}" ]; then saltar=""; fi
    [ -z "$saltar" ] && fases+=("$f")
  done
  [ ${#fases[@]} -eq 0 ] && continue
  esperar_libre
  tomar "${fases[*]}"
  for f in "${fases[@]}"; do
    echo "=== $f $(hora)"
    for intento in 1 2; do
      node "$f.mjs" "$URL" > "/tmp/rincones-$f.log" 2>&1 && break
      echo "   (reintento de $f por falla del guion o de red)"; sleep 5
    done
    grep -E "ERROR DEL GUION|ERRORES \[\{" "/tmp/rincones-$f.log" | cut -c1-200
  done
  soltar
done
trap - EXIT
for j in "$SALIDA"/f*.json; do echo "--- $j"; node resumen.mjs "$j" 2>/dev/null | grep -v "fuente-chica\|span.avatar"; done > "$SALIDA/resumen.txt"
echo "listo: $SALIDA/resumen.txt"
