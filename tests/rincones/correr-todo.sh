#!/usr/bin/env bash
# Corrida completa de rincones contra un build (por defecto http://localhost:4187). Crea un grupo nuevo y un demo propio.
# Uso: tests/rincones/correr-todo.sh [url] [--con-agente]
# Cada fase escribe su JSON en /Users/macair/cruse/rincones-capturas/<corrida>/ ; al final se imprime el resumen de hallazgos.
cd "$(dirname "$0")" || exit 1
URL="${1:-http://localhost:4187}"
export RINCONES_CORRIDA="$(TZ=America/Santiago date +%Y%m%d%H%M)"
echo "corrida $RINCONES_CORRIDA contra $URL"
FASES="f0-sin-grupo f1-organizador f2-invitados f3-confirmar-y-reparar f3b-baja-y-reparar f4-listas-y-cancelar f5-demo f5b-demo-baja f6-quien-eres f7-grupo-b f9-sin-red-y-validaciones f10-fallas"
[ "$2" = "--con-agente" ] && FASES="$FASES f8-agente"
for f in $FASES; do
  echo "=== $f"
  for intento in 1 2; do
    node "$f.mjs" "$URL" > "/tmp/rincones-$f.log" 2>&1 && break
    echo "   (reintento de $f por falla del guion o de red)"; sleep 5
  done
  grep -E "ERROR DEL GUION|ERRORES \[\{" "/tmp/rincones-$f.log" | cut -c1-200
done
for j in /Users/macair/cruse/rincones-capturas/$RINCONES_CORRIDA/*.json; do echo "--- $j"; node resumen.mjs "$j" | grep -v "fuente-chica\|span.avatar"; done > "/Users/macair/cruse/rincones-capturas/$RINCONES_CORRIDA/resumen.txt"
echo "listo: /Users/macair/cruse/rincones-capturas/$RINCONES_CORRIDA/resumen.txt"
