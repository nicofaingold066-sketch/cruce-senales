#!/usr/bin/env bash
# Vigía de coordinación CRUCE.
# Uso:  ./vigia.sh <agente> [segundos]        (por defecto 60 s)
# Agentes: coordinador | backend | claude-b-interfaz | codex | pitch-problema
# Una sola pasada (para probar): VIGIA_UNA_VEZ=1 ./vigia.sh <agente>
#
# Cada pasada hace `git fetch` de la rama coordinacion y SOLO imprime una línea cuando hay algo NUEVO para vos:
#   [AVISO PARA <agente>]  un aviso del coordinador dirigido a vos o a "todos" (sección AVISOS de TABLERO.md)
#   [PEDIDO de <otro> a <agente>]  una línea en "Pedidos a otros" de otro agente que te nombra
# Si no hay novedades no imprime nada (no gasta tokens del agente que lo escucha).
# No modifica tu copia de trabajo: lee todo con `git show origin/coordinacion:...`.
set -u
YO="${1:?uso: ./vigia.sh <agente> [segundos]}"
CADA="${2:-60}"
cd "$(dirname "$0")" || exit 1
ESTADO="${VIGIA_ESTADO:-${TMPDIR:-/tmp}/vigia-$YO.estado}"
: >> "$ESTADO"

visto()  { grep -qxF "$1" "$ESTADO"; }
marcar() { echo "$1" >> "$ESTADO"; }
firma()  { printf '%s' "$1" | shasum | cut -c1-12; }

pasada() {
  if ! git fetch -q origin coordinacion 2>/dev/null; then
    echo "[vigia $YO] no pude leer GitHub; reintento en ${CADA}s"
    return
  fi
  # 1) avisos del coordinador para mí o para todos
  git show origin/coordinacion:TABLERO.md 2>/dev/null | grep -E '^\*\*\[[0-9:]+\] PARA ' | while IFS= read -r linea; do
    case "$linea" in
      *"PARA $YO:"*|*"PARA $YO "*|*"PARA todos:"*|*"PARA todos "*)
        h="a:$(firma "$linea")"
        if ! visto "$h"; then marcar "$h"; echo "[AVISO PARA $YO] $linea"; fi ;;
    esac
  done
  # 2) pedidos de otros agentes que me nombran
  for f in $(git ls-tree --name-only origin/coordinacion agentes/ 2>/dev/null | sed 's|agentes/||'); do
    otro="${f%.md}"
    [ "$otro" = "$YO" ] && continue
    git show "origin/coordinacion:agentes/$f" 2>/dev/null \
      | awk '/^## Pedidos a otros/{p=1;next} /^## /{p=0} p' \
      | grep -iF -- "$YO" | while IFS= read -r linea; do
          h="p:$(firma "$otro$linea")"
          if ! visto "$h"; then marcar "$h"; echo "[PEDIDO de $otro a $YO] $linea"; fi
        done
  done
}

while true; do
  pasada
  [ -n "${VIGIA_UNA_VEZ:-}" ] && exit 0
  sleep "$CADA"
done
