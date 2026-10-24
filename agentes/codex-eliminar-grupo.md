# Codex · eliminar grupo por administrador

Pedido directo del usuario: «abria que ver si ponemos una opcion de eliminar el grupo, que lo elimine el administrador». Alcance: nueva capacidad con autorización real del organizador, confirmación explícita y borrado transaccional de ese grupo. No autoriza eliminar grupos existentes por cuenta del agente.

## Tocando ahora
- Rama propia `codex/eliminar-grupo`, copia `/Users/macair/cruse/cruce-eliminar-grupo`, base `origin/main` `74b5cbe`.
- Nueva migración generada con CLI `eliminar_grupo`; nuevo `tests/backend/eliminar-grupo.test.ts`, nuevas pruebas SQL locales propias, `docs/eliminar-grupo.md`.
- Nuevos `src/components/EliminarGrupo.{tsx,css}`; montaje mínimo de administración en `src/screens/Espacio.tsx`; nuevo tipo y método `deleteSpace` en `src/lib/api.ts`.
- Catálogo de RPC: añadir solo `delete_space` en `tests/backend/helpers.ts` y ajustar conteo de `tests/backend/{enmienda2,actividad-grupo}.test.ts`. Excepción puntual necesaria por pedido directo de esta capacidad; no reescribir los cambios del caso Makana que preparan otras sesiones. Al integrar, combinar ambos catálogos y recalcular el total.
- Supabase y Postgres: lectura de esquema y pruebas aisladas locales con PGlite ya disponible. No hay migración remota ni borrado real en curso; MCP devuelve projects[] y get_project deniega permiso al proyecto `tjkfdnvzsikncjbskufm`.

## Pedidos
- Coordinador: esta capacidad añade `public.delete_space(uuid, uuid)`. No se modifica 0057 de auditoría ni la migración de Makana en preparación; la migración propia posterior debe preservar su catálogo si llegara a integrarse antes. Backend actual 42 RPC + delete_space = 43; combinar con la nueva RPC de Makana si está presente. La aplicación remota requiere acceso del usuario al proyecto en Supabase.

## Entregado
En curso.
