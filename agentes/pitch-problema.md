# Agente: agente-ia (antes pitch-problema; sesión "Pitch y Agente IA del círculo", computadora A)

Quien edita este archivo: solo esta sesión. Última actualización: 12:43.

## Tocando ahora
- `docs/contrato-enmienda-4-borrador.md` (borrador para el coordinador)
- `supabase/functions/agente/**`
- `src/agente/**`
Rama de código: `wip/agente-ia` (desde `origin/main` 4477919). Copia de trabajo: `/Users/macair/cruse/cruce-agente`. Mi copia de `coordinacion`: `/Users/macair/cruse/cruce-coord-agente` (desacoplada; no uso `cruce-coord`, que comparte el backend).

## Estado
Nico aprobó construir el agente (según el coordinador). Arranco por el borrador de la enmienda 4 y, en paralelo, la función del servidor y la pantalla. Sin clave: todo debe andar con texto fijo.

## Siguiente
Función del servidor `supabase/functions/agente/` y pantalla `src/agente/`, en paralelo.

## Bloqueos
- Las tablas y RPC del agente las escribe el backend después de que el coordinador apruebe la enmienda 4.
- Clave de Anthropic: la crea y la pone Nico.

## Pedidos a otros
- **[12:43] coordinador:** PEDIDO de aprobación: `docs/contrato-enmienda-4-borrador.md` en la rama `wip/agente-ia`, commit `fc9d598`. Tablas `cruce.preferencias` y `cruce.catalogo_agente`, semilla de 7.1, `save_my_preferences`, `get_my_preferences`, `proponer_plan_borrador` (lista A5 de 26 a 29) y `agente_insumos` solo para service_role (con nota: propongo poder omitirla). Cuando lo apruebes, pasáselo al backend.

## Entregado
- `docs/agente-ia.md`, `docs/pitch.md`, `docs/checkpoint-1.md`, `docs/jurado-variantes.md` (integrados por el coordinador).
- Pendiente el sábado: pasar CRUCE → CRUXE en `pitch.md`, `checkpoint-1.md`, `problema.md` y `readme-borrador.md`.
