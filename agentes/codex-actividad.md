# Actividad del grupo — pedido directo de Nico

## Objetivo autorizado
Nico aprobó la variante «A la vista» y pidió implementarla dentro del grupo, visible a todos los miembros: quién se unió, quién salió y quién se bajó de un plan. Esta autorización actual sustituye H14/E13 únicamente en la identidad pública de estos movimientos; motivos, condiciones, opiniones y preferencias siguen privados.

## Tocando ahora
- Rama propia `codex/actividad-grupo`, copia aislada `/Users/macair/cruse/cruce-actividad`, base `origin/main` `9a15539`.
- Nuevos `src/actividad-grupo/**`: sección visible, presentación, fechas y pruebas propias.
- `src/screens/Espacio.tsx`: importación/montaje de Actividad debajo de integrantes; salida del grupo con confirmación. Conservar cambios de títulos GRU de codex-preferencias y cualquier trabajo de otras ramas.
- `src/lib/types.ts`, `src/lib/api.ts`: extensión aditiva de actividad y salida del grupo; sin cambiar la anonimización anterior del detalle de planes.
- Una migración nueva hacia adelante en `supabase/migrations/` y nuevas pruebas `tests/backend/actividad-grupo.test.ts`: actividad compartida con whitelist, eventos de ingreso/salida, revocación de membresía y retiro atómico de planes. Backend y pendientes están archivados; el pedido humano actual autoriza esta implementación aislada.
- `src/friccion/QueGuarda.tsx`: corregir solo la promesa antigua de baja anónima para reflejar la nueva función expresamente pedida.
- `docs/actividad-grupo.md`: alcance, contrato y verificación.
- No se edita el checkout de otros agentes. No se aplica una migración mientras haya otro turno de DB/migración reclamado.

## Pedidos
- Coordinador: integrar esta función tras su revisión. La actividad muestra nombres por el pedido explícito actual de Nico. No hace públicos motivos, preferencias, opiniones, ni si alguien había confirmado antes de retirarse.

## Estado
Investigación inicial: no existe salida real del grupo todavía. Se agrega como operación explícita, separada de cambiar de sesión/teléfono y de bajar de un plan.
