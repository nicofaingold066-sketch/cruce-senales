#!/usr/bin/env bash
# Revisión del equipo (coordinador): por cada copia de trabajo, cambios sin commitear, commits sin subir y último commit.
# Uso: ./revisar-equipo.sh   (no modifica nada)
cd "$(dirname "$0")/.." || exit 1
printf '%-22s %-18s %8s %8s  %s\n' COPIA RAMA SIN_COMMIT SIN_SUBIR ULTIMO_COMMIT
for d in cruce-senales cruce-backend cruce-friccion cruce-ux cruce-apertura cruce-qa cruce-sinteticos cruce-rincones cruce-agente cruce-coord cruce-coord-backend cruce-coord-friccion cruce-coord-ux cruce-coord-apertura cruce-coord-qa cruce-coord-sinteticos cruce-coord-rincones; do
  [ -d "$d" ] || continue
  rama=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null)
  sucios=$(git -C "$d" status --porcelain 2>/dev/null | grep -v -e ' node_modules$' -e 'readme-borrador.md$' | wc -l | tr -d ' ')
  if [ "$rama" = "HEAD" ]; then
    git -C "$d" fetch -q origin coordinacion 2>/dev/null
    sinsubir=$(git -C "$d" rev-list --count origin/coordinacion..HEAD 2>/dev/null)
  else
    sinsubir=$(git -C "$d" rev-list --count "origin/$rama..HEAD" 2>/dev/null || echo '?')
  fi
  ultimo=$(git -C "$d" log -1 --format='%cr · %s' 2>/dev/null | cut -c1-60)
  printf '%-22s %-18s %8s %8s  %s\n' "$d" "$rama" "$sucios" "$sinsubir" "$ultimo"
done
