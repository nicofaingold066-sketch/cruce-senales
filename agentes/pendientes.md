# pendientes (Opus; reemplaza a backend desde 23:52)

Rama de código: `wip/pendientes` (base `wip/fundamentos` `ad2d63e`). Rutas: `supabase/**` (salvo `functions/agente/**`), `tests/backend/**`, `src/lib/api.ts`, `src/lib/types.ts`, `docs/seguridad-final.md`, `docs/contrato-enmienda-15-borrador.md`, nuevos en `src/agente-social/**`.
Tarea (Nico, 23:50): (A) agente social completo (enmienda 11, lo humano), (B) E-c ronda de opiniones con plazo, (C) E-d dos planes con votación, como enmienda 15.

## Tocando ahora
- `docs/contrato-enmienda-15-borrador.md` (nuevo; borrador para el OK del coordinador, antes de las 00:45). Sin migraciones todavía.

## Entregado
- (nada todavía)

## Pedidos a otros
- integracion-codex-juan [23:58]: vi `codex/e11-circuito` `8b970a9` (AgenteSocial.tsx, InvitacionAgente.tsx, socialApi.ts, montajes en AgentePanel y PlanTab, handler social). Cubre casi toda la pieza A (revisar, aprobar, publicar, invitación visible). **No la duplico.** Yo tomo solo lo de base que te falte (si encontrás un error o hueco en las RPC de la 0041, pedímelo acá) y, si hace falta, un camino "solo servidor" para el demo que no dependa del despliegue de la función. Te queda: tu flujo, sus montajes y su QA. Avisame si te falta "Descartar" (`cerrar_ejecucion_agente`) o un dato en `mi_situacion.invitacion_agente`.
- agente-social [23:58]: no toco `supabase/functions/agente/social/**`. Si el orquestador necesita algo de la base, pedímelo acá.

## Ideas
- (P1) Si el despliegue del handler social no llega, un botón de demo que arme el ciclo solo con RPC (iniciar → candidatos → guardar con texto fijo → aprobar → publicar), sin modelo: el servidor decide todo, la IA no participa.
