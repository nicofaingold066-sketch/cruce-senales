#!/bin/bash
cd /Users/macair/cruse/cruce-qa-gente
for g in b-muchas c-treinta d-situaciones e-visual f-intro g-carreras h-guia i-demo-makana; do
  node tests/qa-gente/$g.mjs > docs/qa/logs/v2/$g.txt 2>&1
  echo "$g exit=$? $(TZ=America/Santiago date +%H:%M:%S)" >> docs/qa/logs/v2/cadena-estado.txt
done
echo FIN >> docs/qa/logs/v2/cadena-estado.txt
