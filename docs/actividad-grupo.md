# Actividad del grupo

Pedido y variante «A la vista» aprobados por Nico el 24 de octubre de 2026. Nico autorizó además integrar los cambios y publicarlos en producción.

## Comportamiento

- Dentro del grupo, debajo de los integrantes, todas las personas ven tres movimientos recientes y pueden abrir el historial completo.
- Los textos distinguen «se unió al grupo», «salió del grupo» y «se bajó de [plan]». La baja del plan enlaza a su pantalla.
- Ingresos con acento verde suave; salidas en tono neutro; bajas de planes con el acento de la aplicación. Fechas y horas de America/Santiago enviadas por el servidor.
- Una persona anotada como pendiente todavía no se unió. Solo su ingreso real genera un movimiento. Repetir una unión o baja no duplica el evento.
- Los ingresos y las salidas se registran desde esta versión. No se reconstruyen fechas históricas de unión a partir de `creado_en`, porque en un pendiente esa fecha corresponde a la carga inicial. Las bajas de planes ya registradas sí se incluyen.
- «Personas» incorpora «Salir del grupo» con confirmación. Salir también retira las participaciones activas y revoca el acceso. No equivale a cambiar la sesión del teléfono.
- Quien organiza el grupo no puede salir sin transferir la organización; esa función no existe todavía. Quien organiza planes activos debe cancelarlos antes de salir. Los rechazos no registran una salida.
- La misma sesión puede volver a entrar conservando su identidad. Esto no restaura confirmaciones ni participaciones anteriores. Repetir un intento de salida anterior tampoco vuelve a sacar a alguien que ya reingresó.

## Contrato aditivo

`get_space` devuelve `espacio.actividad`, ordenada del movimiento más reciente al más antiguo:

```ts
{
  id: string,
  tipo: 'miembro_unido' | 'miembro_salio' | 'baja_plan',
  miembro: { miembro_id: string, nombre: string, simulado: boolean },
  en: { utc: string, local: string },
  plan: { id: string, titulo: string } | null
}
```

No requiere consultas adicionales: utiliza el sondeo de `get_space` existente. Un servidor sin esta extensión muestra un estado de función todavía no disponible, sin movimientos de ejemplo.

`leave_space(p_espacio_id uuid, p_intento_id uuid)` devuelve el sobre habitual y `resultado: {espacio_id, miembro_id, repetido}`. No devuelve el grupo después de revocar la membresía. El intento permite reintentar una respuesta incierta sin repetir efectos.

## Privacidad y consistencia

El pedido actual autoriza compartir nombres en estos tres movimientos. La proyección contiene solo los campos anteriores: nunca motivos, disponibilidad, gustos, presupuesto, opiniones, identificadores de Auth ni si alguien había confirmado antes de bajarse. El detalle histórico del plan conserva la redacción E13 anterior; la identidad de estos movimientos se muestra en la actividad del grupo. La explicación «¿Qué guarda CRUXE de mí?» refleja el cambio.

La salida conserva la fila del miembro y las referencias históricas. Se guarda su propietario original de forma privada y se desvincula `user_id` activo; así los controles de pertenencia existentes dejan de autorizarlo. Las vistas, los conteos y el motor excluyen miembros que salieron. Se invalidan también las lecturas mediante reintentos guardados. Un ajeno al grupo, una persona que salió y la vista previa por código no reciben la actividad.

La retirada de varios planes y la salida ocurren en la misma transacción. Se reutiliza el motor existente para cupos, revisión y bajas. Si falla un retiro, se revierte todo. Los planes sin una participación real no reciben una baja pública inventada. No se heredan aceptaciones.

La migración agrega una RPC pública a la lista cerrada: 42 ejecutables por `authenticated`, ninguna por `anon`, y ningún helper interno expuesto. Conserva RLS y privilegios de tablas. Archivo: `supabase/migrations/20261024115616_actividad_grupo.sql`.

## Verificación

- Tipos, build de producción y 62 pruebas puras: aprobados.
- Vista a 320, 375 y 1280 px, tema claro/oscuro, nombres largos, teclado y movimiento reducido: aprobados. Contraste mínimo observado de la nueva sección: 4,70:1.
- PostgreSQL aislado PGlite 0.5.11, instalado solo como herramienta temporal fuera del repositorio: las 56 migraciones originales y la migración nueva aplican sin modificar el SQL.
- Las seis pruebas nuevas de `tests/backend/actividad-grupo.test.ts` pasan contra ese PostgreSQL aislado, usando un adaptador de transporte local. Esto verifica el SQL real, aunque no sustituye la comprobación del servidor publicado.
- Fallo forzado en el segundo retiro: ambos planes, aceptaciones, actividad y membresía quedan sin efectos parciales; el reintento posterior funciona.
- Auditoría independiente del SQL: sin bloqueantes.
- Servidor real: migración `20261024115616` instalada. Catálogo observado: 42 RPC autenticadas, 0 sin sesión, 0 helpers expuestos y 0 tablas de `cruce` sin RLS. Las seis pruebas nuevas pasan contra producción (16,12 s). Las nueve pruebas de E2/privilegios también pasaron. La primera tanda E13 se interrumpió por fallos de conexión y se repite por separado antes de publicar el front.
- Despliegue de interfaz y verificación visual en producción: pendientes al escribir este corte.

No se agregaron dependencias de producción ni llamadas a modelos.

### Regresión local: filas anteriores al CHECK de nombres

La primera aplicación en producción encontró una fila histórica de prueba cuyo nombre empieza con un tabulador. El CHECK de normalización de 0017 es `NOT VALID`: conserva esas filas, pero cualquier `UPDATE` vuelve a comprobarlas. La transacción se revirtió. La migración corregida no actualiza filas antiguas: materializa `usuario_original_id` al insertar o en la primera mutación del asiento; al salir captura `OLD.user_id` antes de desvincular la sesión. No modifica ni relaja las restricciones de nombres.

Reproducción exclusivamente en PostgreSQL local descartable, sin credenciales ni servicios remotos:

1. Aplicar las migraciones 0001 a 0016 y crear un grupo ficticio con un miembro llamado `E'\tNombre legacy inválido'`; el esquema de ese momento lo permite. Añadir también un miembro real con nombre válido.
2. Aplicar 0017 a 0056. Comprobar que `miembros_nombre_normalizado.convalidated = false` y capturar el estado de esas filas:

```sql
create temp table actividad_legacy_antes as
select m.id, m.ctid::text as tupla, m.xmin::text as revision, to_jsonb(m) as fila
from cruce.miembros m;
```

3. Aplicar `20261024115616_actividad_grupo.sql` dentro de `BEGIN` / `COMMIT` y comprobar:

```sql
select count(*) = 0 as filas_anteriores_intactas
from cruce.miembros m
join actividad_legacy_antes a using (id)
where m.ctid::text is distinct from a.tupla
   or m.xmin::text is distinct from a.revision
   or (to_jsonb(m) - 'usuario_original_id' - 'salio_en') is distinct from a.fila;

select not convalidated as nombres_sin_revalidar
from pg_constraint
where conrelid = 'cruce.miembros'::regclass
  and conname = 'miembros_nombre_normalizado';
```

Resultado observado: ambas consultas devuelven `true`; ctid, xmin y contenido de las filas antiguas permanecen idénticos. La salida del miembro antiguo válido con propietario todavía nulo captura su sesión original, y el reingreso conserva su `miembro_id`; otra sesión no puede reclamarlo. Se vuelve a comprobar ACL 42/0.

La fila histórica inválida se conserva tal cual. Intentar actualizarla todavía falla por su restricción de nombres preexistente: la prueba confirma que una salida rechazada revierte completamente, conserva el acceso anterior y no registra movimientos. Resolver esos nombres requiere una intervención separada que contemple colisiones; no se normalizan ni se borran en este cambio.
