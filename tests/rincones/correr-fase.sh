#!/usr/bin/env bash
# Corre UNA o varias fases sueltas con el mismo candado que correr-todo.sh (espera a otras fichas, anota CORRIENDO PRUEBA, lo saca).
# Uso: tests/rincones/correr-fase.sh <url> <fase> [fase...]      Ej.: correr-fase.sh https://cruce-senales.vercel.app f13-enmienda13
cd "$(dirname "$0")" || exit 1
URL="$1"; shift
export RINCONES_CORRIDA="${RINCONES_CORRIDA:-$(TZ=America/Santiago date +%Y%m%d%H%M)}"
COORD=/Users/macair/cruse/cruce-coord-rincones; FICHA=agentes/rincones.md
hora() { TZ=America/Santiago date +%H:%M; }
coord_actualizar() { git -C "$COORD" fetch -q origin && git -C "$COORD" checkout -q --detach origin/coordinacion; }
ocupada() {
  coord_actualizar || { echo "sin-github"; return 0; }
  local f
  for f in "$COORD"/agentes/*.md; do
    [ "$(basename "$f")" = "rincones.md" ] && continue
    if sed -n '/^## Tocando ahora/,/^## /p' "$f" | grep -v 'TERMINAD' | grep -viE 'esper(a|an|ando)|saque|saquen|cuando backend|hasta que' | grep -qE 'CORRIENDO PRUEBA ?\(|\*\*MIGRACION EN CURSO\*\*|PRUEBA DE CARGA EN CURSO'; then echo "$(basename "$f" .md)"; return 0; fi
  done
  return 1
}
empujar_ficha() {
  local i; for i in 1 2 3 4 5 6; do
    git -C "$COORD" add "$FICHA" && git -C "$COORD" commit -q -m "$1" 2>/dev/null
    git -C "$COORD" push -q origin HEAD:coordinacion 2>/dev/null && return 0
    git -C "$COORD" fetch -q origin && { git -C "$COORD" rebase -q origin/coordinacion 2>/dev/null || git -C "$COORD" rebase --abort 2>/dev/null; }; sleep 4
  done; return 1
}
marcar() { coord_actualizar; python3 - "$COORD/$FICHA" "$1" "$(hora)" <<'PY'
import sys,re
p,fases,h=sys.argv[1:4]; s=open(p).read()
s=re.sub(r"\n- \[\d\d:\d\d\] CORRIENDO PRUEBA \([^\n]*\n","\n",s)
s=s.replace("## Tocando ahora\n", f"## Tocando ahora\n- [{h}] CORRIENDO PRUEBA ({h}): rincones, fases {fases} (grupo propio, una sesión por persona, sin ráfagas).\n",1)
open(p,'w').write(s)
PY
}
soltar() { coord_actualizar; python3 - "$COORD/$FICHA" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p).read()
s=re.sub(r"\n- \[\d\d:\d\d\] CORRIENDO PRUEBA \([^\n]*\n","\n",s); open(p,'w').write(s)
PY
empujar_ficha "rincones: prueba terminada ($(hora))"; }
trap 'soltar >/dev/null 2>&1' EXIT
# Turno con ventana de choque: espera libre, marca, sube, vuelve a leer a los 8 s; si apareció otra marca, retrocede un tiempo al azar.
while :; do
  while q=$(ocupada); do echo "   (espera $(hora): $q)"; sleep 45; done
  marcar "$*"; empujar_ficha "rincones: CORRIENDO PRUEBA ($(hora)) $*"
  sleep 8
  if q=$(ocupada); then echo "   (choque con $q: suelto y reintento)"; soltar >/dev/null 2>&1; sleep $((20 + RANDOM % 40)); continue; fi
  break
done
for f in "$@"; do
  echo "=== $f $(hora)"
  for intento in 1 2; do node "$f.mjs" "$URL" > "/tmp/rincones-$f.log" 2>&1 && break; echo "   (reintento de $f)"; sleep 5; done
  grep -E "ERROR DEL GUION|ERRORES \[\{" "/tmp/rincones-$f.log" | cut -c1-200
done
echo "listo: /Users/macair/cruse/rincones-capturas/$RINCONES_CORRIDA"
