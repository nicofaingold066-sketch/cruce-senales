#!/bin/bash
cd /Users/macair/cruse/cruce-qa-gente
for g in i-demo-makana d-situaciones f-intro h-guia c-treinta; do
  node tests/qa-gente/$g.mjs > docs/qa/logs/v2/$g.txt 2>&1
  echo "$g exit=$? $(TZ=America/Santiago date +%H:%M:%S)" >> docs/qa/logs/v2/cadena2-estado.txt
done
echo FIN2 >> docs/qa/logs/v2/cadena2-estado.txt
