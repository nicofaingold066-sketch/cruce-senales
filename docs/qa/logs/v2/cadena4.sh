#!/bin/bash
cd /Users/macair/cruse/cruce-qa-gente
until grep -q FIN3 docs/qa/logs/v2/cadena3-estado.txt; do sleep 2; done
node tests/qa-gente/i-demo-makana.mjs > docs/qa/logs/v2/i-demo-makana.txt 2>&1
echo "i-demo-makana exit=$? $(TZ=America/Santiago date +%H:%M:%S)" >> docs/qa/logs/v2/cadena4-estado.txt
QA_SOLO=g8 node tests/qa-gente/g-carreras.mjs > docs/qa/logs/v2/g8-cancelar.txt 2>&1
echo "g8-cancelar exit=$? $(TZ=America/Santiago date +%H:%M:%S)" >> docs/qa/logs/v2/cadena4-estado.txt
echo FIN4 >> docs/qa/logs/v2/cadena4-estado.txt
