# Eliminar un grupo

Pedido de Nico del 24 de octubre de 2026. Implementación local terminada; activación remota pendiente del acceso al proyecto Supabase de CRUXE.

## Comportamiento

- «Administrar grupo» aparece al final del grupo, después de «Historial», solo a quien tiene `mi_rol = organizador`.
- «Eliminar grupo» abre una confirmación que enumera el alcance y avisa que no se puede deshacer. Cancelar o plegar antes de enviar no borra nada y reanuda las actualizaciones.
- «Eliminar definitivamente» borra el grupo para todos sus integrantes y vuelve a la lista de grupos. El enlace de invitación deja de funcionar.
- Mientras se envía, se bloquea el doble clic. Ante una respuesta perdida o ilegible se conserva el mismo intento y se puede comprobar el resultado. El sondeo no desmonta esa recuperación; la salida alternativa dice «Ir a mis grupos».
- El servidor revalida la sesión, la membresía activa y el rol de administrador. Organizar un plan no concede permiso para borrar el grupo.

## Contrato añadido

`public.delete_space(p_espacio_id uuid, p_intento_id uuid)` usa el sobre habitual de contrato 2. Un éxito contiene únicamente:

```json
{"resultado":{"espacio_id":"uuid del grupo","eliminado":true,"repetido":false}}
```

Repetir el mismo intento, usuario y grupo devuelve `repetido: true`, incluso después del borrado. Reutilizar el intento con otro grupo u operación devuelve `entrada_incompleta/intento_reutilizado`.

La operación es transaccional: primero elimina propuestas y luego el espacio con sus dependencias. No borra cuentas Auth ni los catálogos compartidos. Un recibo mínimo propio en `cruce.intentos`, sin nombres ni claves foráneas al grupo, permite recuperar el resultado. La función usa `SECURITY DEFINER`, `search_path` vacío y acceso exclusivo a `authenticated`; también comprueba `auth.uid()` internamente.

La migración `20261024125723_eliminar_grupo.sql` amplía la lista cerrada a 43 RPC autenticadas y 0 anónimas, incluyendo `leave_space` y `delete_space`. Si se integra otra RPC nueva, se deben combinar ambas listas y ajustar el total antes de aplicar; no sustituir la lista cerrada por una concesión abierta.

## Verificación local observada

- TypeScript y build de producción correctos.
- Vitest: 21/21 pruebas en `eliminar-grupo`, `actividad-grupo` y `enmienda2`, ejecutando las migraciones y funciones SQL reales en PGlite con roles separados. El adaptador sustituye Auth y el transporte PostgREST.
- Comprobación física: 19 tablas con datos ficticios de grupo, miembros, planes, versiones, condiciones, confirmaciones, bajas, opiniones, preferencias, agente, invitaciones, eventos e intentos. Tras borrar, ninguna conserva filas del grupo; otro grupo completo permanece idéntico y los catálogos compartidos quedan intactos.
- Fallo inyectado al insertar el recibo, después de ambos DELETE: las 19 tablas se restauran y no se guarda recibo. Repetir el mismo intento luego funciona.
- Roles anónimo, autenticado sin UID, integrante, externo y exintegrante rechazados. La auditoría detecta una función pública adicional no permitida.
- Navegador real a 320, 375, 768 y 1280 px: confirmación, foco, cancelación, plegado, doble clic, navegación y ausencia para integrantes. Solo lectura bloquea el botón. Respuesta perdida y respuestas inválidas recuperan el éxito con el mismo UUID, incluso después del intervalo de sondeo. Sin errores JavaScript.

PGlite serializa peticiones. La prueba concurrente con conexiones PostgreSQL independientes está escrita en Vitest, pero requiere ejecutarse contra una instancia accesible. No se aplicó esta migración ni se borró ningún grupo en producción.

## Activación pendiente

El conector Supabase devuelve una lista de proyectos vacía y deniega `get_project` sobre el proyecto de CRUXE. Se requiere conectar una cuenta con acceso antes de aplicar la migración, verificar los permisos reales y publicar la interfaz. Coordinar la ventana de migración con las demás tareas del repositorio.
