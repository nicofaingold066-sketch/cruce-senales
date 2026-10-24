# Actividad del grupo — pedido directo de Nico

## Objetivo autorizado
Nico aprobó la variante «A la vista» y pidió implementarla dentro del grupo, visible a todos los miembros: quién se unió, quién salió y quién se bajó de un plan. Esta autorización actual sustituye H14/E13 únicamente en la identidad pública de estos movimientos; motivos, condiciones, opiniones y preferencias siguen privados.

## Tocando ahora
- CORRIENDO PRUEBA: actividad del grupo, E13 y ACL42 contra backend real; solo espacios propios ficticios. Migración `20261024115616` ya aplicada y verificada 42/0.
- Rama propia `codex/actividad-grupo`, copia aislada `/Users/macair/cruse/cruce-actividad`, base `origin/main` `9a15539`.
- Nuevos `src/actividad-grupo/**`: sección visible, presentación, fechas y pruebas propias.
- `src/screens/Espacio.tsx`: importación/montaje de Actividad debajo de integrantes; salida del grupo con confirmación. Conservar cambios de títulos GRU de codex-preferencias y cualquier trabajo de otras ramas.
- `src/lib/types.ts`, `src/lib/api.ts`: extensión aditiva de actividad y salida del grupo; sin cambiar la anonimización anterior del detalle de planes.
- Una migración nueva hacia adelante en `supabase/migrations/`, nuevas pruebas `tests/backend/actividad-grupo.test.ts` y ajuste mínimo de lista permitida en `tests/backend/helpers.ts` y expectativas 41→42 en `tests/backend/enmienda2.test.ts` / `tests/backend/enmienda13.test.ts`: actividad compartida con whitelist, eventos de ingreso/salida, revocación de membresía y retiro atómico de planes. Backend y pendientes están archivados; el pedido humano actual autoriza esta implementación aislada.
- `src/friccion/QueGuarda.tsx`, `src/screens/Perfil.tsx` (solo texto de privacidad) y `src/componentes-nuevos/plan/Resultado.tsx` (solo frase de retirada): corregir las promesas antiguas de anonimato para que coincidan con la actividad nominal aprobada. Sin cambiar lógica, temas ni estados de esos componentes.
- `docs/actividad-grupo.md`: alcance, contrato y verificación.
- No se edita el checkout de otros agentes. No se aplica una migración mientras haya otro turno de DB/migración reclamado.

## Pedidos
- Coordinador: integrar esta función tras su revisión. La actividad muestra nombres por el pedido explícito actual de Nico. No hace públicos motivos, preferencias, opiniones, ni si alguien había confirmado antes de retirarse.

## Estado
Nico autorizó además integrar y publicar en producción al terminar (mensaje de esta sesión). Front integrado y 62 pruebas puras + tipos/build en verde. Migración en construcción, todavía no aplicada. Se verifican SQL y roles en PostgreSQL aislado PGlite fuera del repositorio; las 56 migraciones base aplican sin modificaciones.

Acceso de publicación: el conector Supabase de esta sesión lista cero proyectos y rechaza el proyecto CRUXE por permisos; Nico inició sesión en el panel de Supabase y confirmó la conexión; acceso al SQL Editor del proyecto de producción verificado. Se inspeccionan metadatos antes de aplicar. Migración aplicada por SQL Editor en transacción; catálogo real 42 RPC autenticadas/0 sin sesión. Primera tentativa revertida por validación histórica; corregida y aplicada sin reescribir filas antiguas. Vercel se publicará por la integración Git existente tras la verificación de backend.
