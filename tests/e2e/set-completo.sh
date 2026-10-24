#!/usr/bin/env bash
# Set completo de e2e contra el build de una copia de trabajo (rama a probar), en SERIE. Pensado para correr dentro de
# `turno-base.sh` (una sola marca de CORRIENDO PRUEBA para toda la secuencia).
#   Uso: tests/e2e/set-completo.sh <copia de trabajo con node_modules y .env> [puerto=4185]
# Imprime una línea por guion y un resumen final; sale 1 si algún guion falla. No toca la rama probada.
set -u
DIR="${1:?uso: set-completo.sh <copia> [puerto]}"; PUERTO="${2:-4185}"
E="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:$PUERTO"
hora() { TZ=America/Santiago date +%H:%M:%S; }
cd "$DIR" || exit 2
echo "[$(hora)] $(git log --oneline -1 | cut -c1-90)"
npx tsc -b --noEmit >/dev/null 2>&1 && echo "typecheck ok" || { echo "TYPECHECK FALLA"; exit 1; }
npx vite build >/dev/null 2>&1 && echo "build ok" || { echo "BUILD FALLA"; exit 1; }
(npx vite preview --port "$PUERTO" >/dev/null 2>&1 &)
sleep 4
fallas=0
correr() {  # nombre, patrón de la línea resumen, comando...
  local nombre="$1" patron="$2"; shift 2
  local salida; salida="$("$@" 2>&1)"; local cod=$?
  local resumen; resumen="$(printf '%s\n' "$salida" | grep -E "$patron" | tail -1 | cut -c1-170)"
  if [ $cod -eq 0 ]; then echo "OK  $nombre: ${resumen:-(sin resumen)}"; else echo "MAL $nombre (salida $cod): ${resumen:-$(printf '%s\n' "$salida" | grep -E 'MAL|FAIL|Error|ERROR' | head -3 | cut -c1-170)}"; fallas=$((fallas+1)); fi
}
correr "guardia-palabras"   "guardia-palabras:"  node "$E/guardia-palabras.mjs" "$DIR"
correr "red-controlada"     "#34:"               node "$E/red-controlada.mjs" "$URL"
correr "dos-sesiones"       "RECORRIDO"          node "$E/recorrido-dos-sesiones.mjs" "$URL"
correr "jurado"             "#17 navegador"      node "$E/jurado-navegador.mjs" "$URL"
correr "friccion-flujo"     "FRICCION"           node "$E/friccion-flujo.mjs" "$URL"
correr "red-import-cortada" "#82 red"            node "$E/red-import-cortada.mjs" "$URL"
correr "sesiones-recuperacion" "#69:"            node "$E/sesiones-recuperacion.mjs"
pkill -f "vite preview --port $PUERTO" 2>/dev/null
echo "[$(hora)] set completo: $fallas guion(es) con fallas"
exit $((fallas > 0))
