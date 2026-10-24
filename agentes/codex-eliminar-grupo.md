# Codex · eliminar grupo por administrador

Pedido directo del usuario: «abria que ver si ponemos una opcion de eliminar el grupo, que lo elimine el administrador». Alcance: nueva capacidad con autorización real del organizador, confirmación explícita y borrado transaccional de ese grupo. No autoriza eliminar grupos existentes por cuenta del agente.

## Tocando ahora
Nada. Rutas liberadas. No hay migración remota ni borrado real en curso.

## Pedidos
- Coordinador: esta capacidad añade `public.delete_space(uuid, uuid)`. No se modifica 0057 de auditoría ni la migración de Makana en preparación; la migración propia posterior debe preservar su catálogo si llegara a integrarse antes. Backend actual 42 RPC + delete_space = 43; combinar con la nueva RPC de Makana si está presente. La aplicación remota requiere acceso del usuario al proyecto en Supabase.

## Entregado
- Rama publicada `codex/eliminar-grupo`, commit de función `f3f8657`, entrega `6a27fae` (incluye `origin/main` `1f7826b`). Copia `/Users/macair/cruse/cruce-eliminar-grupo` limpia.
- Migración `supabase/migrations/20261024125723_eliminar_grupo.sql`; `delete_space(uuid,uuid)` solo organizador actual, cascada transaccional y recibo propio mínimo sin FKs para reintento. Catálogo cerrado 43 authenticated / 0 anon.
- Interfaz `src/components/EliminarGrupo.{tsx,css}`, montaje y pausa temporal de sondeo en `src/screens/Espacio.tsx`, wrapper validado en `src/lib/api.ts`. Confirmación explícita, cancelación/foco, bloqueo doble clic, recuperación de respuesta perdida/ilegible sin desmontaje por sondeo. Miembros no ven la opción.
- Nuevas pruebas `tests/backend/eliminar-grupo.test.ts` y ajustes mínimos al catálogo de helpers/enmienda2/actividad. Documento `docs/eliminar-grupo.md` describe contrato, evidencia y activación.
- Verificación local: typecheck/build/diff-check verdes; frontend34/34; SQL+roles reales PGlite backend21/21; fixture física19tablas, otro grupo idéntico y rollback tras fallo al guardar recibo; navegador9escenarios en320/375/768/1280px,0erroresJS. PGlite serializa: concurrencia independiente y recorrido remoto pendientes.
- Bloqueo de activación: conector Supabase projects[] y get_project denegado para CRUXE `tjkfdnvzsikncjbskufm`. No se aplicó esta migración ni se publicó la UI en main. GitHub permitió push propio; crear PR borrador devolvió403 Resource not accessible by integration, así que la entrega es la rama, sin PR creado.
- Evidencia y arneses locales: `/Users/macair/.codex/visualizations/2026/10/24/01a16da8-de03-7fc0-ba16-59b52a264cc7/eliminar-grupo/`.

## Ideas
- Al habilitar acceso, ejecutar la prueba concurrente contra conexiones PostgreSQL independientes y verificar la UI en la app publicada usando únicamente un grupo ficticio nuevo.
