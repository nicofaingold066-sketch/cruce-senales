# Enmienda 2 al contrato (correcciones de gravedad alta A1 a A5)

Origen: `docs/revision-codex-1.md` (revisión estática; los riesgos no se presentan como fallas demostradas de funciones desplegadas). Esta enmienda PREVALECE sobre `docs/contrato.md` v1 donde haya conflicto. Cambia la API, por eso el campo `contrato` de todos los envoltorios pasa de `1` a `2`.
Dueño del contrato: Operador 1. Backend y UI implementan; nadie cambia estas decisiones por su cuenta.
Fecha: viernes 23 oct 2026.

## Cambios de API (resumen para sincronizar tipos, llamadas y pruebas)
- Todas las respuestas: `contrato: 2`.
- `reset_demo(p_espacio_id, p_intento_id uuid)`: gana el parámetro `p_intento_id` (idempotencia). Respuesta: `{ok, generacion, ...}`.
- `get_space` y `list_my_spaces`: devuelven `generacion` (entero que sube con cada reinicio real).
- `cupos` de una propuesta: nuevos campos `reservado_imprescindible` (boolean) y `libres_para_otros` (entero).
- `puede.aceptar` puede ser `false` con `motivo: "cupo_reservado"`.
- Errores nuevos: `asiento_en_uso` (A2) e `intento_obsoleto` (A3). `cupo_completo` conserva su código y agrega `detalle: "reservado_imprescindible"` cuando corresponde.
- `create_proposal`: valida además `minimo >= 2` y `maximo >= 2` (con imprescindible) y `minimo <= maximo`.

## A1. Cupo del imprescindible
Decisión: mientras el imprescindible (anfitrión) no tenga una aceptación vigente de esa versión, se le RESERVA un cupo. Capacidad efectiva para los demás = `maximo - 1`. En cuanto él acepta, la reserva se consume y los demás pueden ocupar hasta `maximo` en total.
- Un no imprescindible que acepta cuando `libres_para_otros = 0` y el anfitrión no aceptó recibe `cupo_completo` con `detalle: "reservado_imprescindible"`. No ocupa ningún cupo.
- El imprescindible nunca recibe `cupo_completo` por culpa de otros invitados.
- Si el imprescindible cancela su compromiso, desaparece la reserva y la propuesta pasa a `en_revision` (es una baja que rompe la presencia obligatoria).
- Prueba obligatoria: mínimo 2, máximo 2, tres elegibles; dos invitados aceptan primero (solo uno logra aceptar; el otro recibe `cupo_completo`/`reservado_imprescindible`); el anfitrión acepta último y el grupo queda confirmado.

## A2. Reclamo de un asiento simulado
Decisión (la más restrictiva, para que nadie herede compromisos que no hizo): `join_space` sobre un asiento simulado solo se permite si ese asiento NO tiene condiciones guardadas, NO figura como elegible en ninguna versión de opción publicada y NO tiene aceptaciones (vigentes ni históricas) en ninguna propuesta del espacio. Si está usado, responde `asiento_en_uso` y el mensaje sugiere entrar con otro nombre visible (miembro real nuevo, sin heredar nada).
- Los eventos simulados históricos conservan `origen = 'simulacion'` aunque después el asiento se reclame.
- Concurrencia: `join_space` y todas las operaciones `simulate_*` toman primero el bloqueo del espacio y luego el del miembro; el reclamo revalida las tres condiciones DESPUÉS de bloquear.
- Pruebas: reclamo tardío (tras una aceptación simulada) rechazado; reclamo concurrente con `simulate_accept` y `simulate_save_conditions`: o gana el reclamo y la simulación falla con `no_autorizado`/`miembro_no_simulado`, o gana la simulación y el reclamo recibe `asiento_en_uso`; nunca un miembro real con compromisos heredados.

## A3. Reinicio y reintentos tardíos
Decisión: el espacio demo tiene `generacion` (bigint, empieza en 1). `reset_demo` es idempotente por `p_intento_id`: un reintento con el mismo id devuelve la respuesta original SIN borrar nada nuevo. Un reinicio real (id nuevo) incrementa `generacion`.
- Los intentos de `create_proposal` NO se borran con el reinicio: se conservan como tombstones (`propuesta_id` en NULL, `generacion` del espacio al crearlos; la clave foránea pasa de `ON DELETE CASCADE` a `SET NULL`). Un reintento de creación cuyo intento pertenece a una generación anterior o a una propuesta eliminada responde `intento_obsoleto`. Nunca resucita la propuesta borrada.
- Pruebas: (1) reinicio, propuesta nueva, repetición del MISMO reinicio: la propuesta nueva sigue viva. (2) crear, reiniciar, repetir la creación vieja: `intento_obsoleto` y no hay propuesta nueva.

## A4. Atomicidad entre operaciones
Orden único de bloqueos para TODAS las operaciones que escriben (si una necesita menos niveles, respeta el mismo orden):
1. Bloqueo asesor por usuario (`pg_advisory_xact_lock` sobre `auth.uid()`), solo para `seed_demo_space` y `create_space`.
2. Fila del espacio (`FOR UPDATE`).
3. Intento (inserción con restricción única `(miembro, operacion, intento_id)`; `ON CONFLICT` devuelve el resultado guardado).
4. Fila del miembro (`FOR UPDATE`).
5. Fila de la propuesta (`FOR UPDATE`).
- Después de adquirir los bloqueos, SIEMPRE se revalida estado, pertenencia, versión y plazo. El instante de decisión del servidor se toma después de bloquear.
- Las lecturas que provocan vencimiento (`vencer`) primero comprueban sin bloqueo y, solo si hay que vencer, bloquean la propuesta y revalidan.
- `seed_demo_space`: restricción única de un espacio demo por usuario; dos seeds concurrentes terminan con UN solo espacio y ambas devuelven el mismo.
- Pruebas concurrentes: seed/seed, join/simulación, reset/create, create/create con el mismo intento (una sola propuesta, ambas respuestas iguales).

## A5. Privilegios de las RPC
Decisión:
- Lista permitida de entradas públicas: SOLO las operaciones del contrato (las 25 de `docs/contrato.md` §0, más `server_info`). Cualquier otra función en `public` está prohibida.
- Helpers y funciones auxiliares viven en el esquema privado `cruce` sin `EXECUTE` para `public`, `anon` ni `authenticated`.
- Cada entrada pública: `SECURITY DEFINER`, `SET search_path = ''`, referencias calificadas (`cruce.`, `public.`, `auth.`), comprobación de `auth.uid() IS NOT NULL`, de rol del miembro y de pertenencia DENTRO de la función. RLS no sustituye estos controles.
- `REVOKE EXECUTE ... FROM PUBLIC, anon` en todas; `GRANT EXECUTE ... TO authenticated` solo en la lista permitida. Además `ALTER DEFAULT PRIVILEGES` (para el rol creador de funciones, en `public`) revocando `EXECUTE` a `public`, `anon` y `authenticated`, para que una función nueva no quede expuesta por defecto.
- Prueba de privilegios: desde sesión SIN autenticar (anon) ninguna RPC es ejecutable; desde una sesión ajena ninguna entrada devuelve ni modifica datos de otro; una consulta a `pg_proc`/`information_schema.routine_privileges` confirma que las funciones ejecutables por `authenticated` en `public` son exactamente la lista permitida.

## Cómo se da por corregido
Un hallazgo solo cuenta como corregido cuando la prueba de regresión correspondiente se ejecutó contra el proyecto real y pasó, con la salida registrada en `docs/correcciones-altas-1.md`. Actualizar este documento o pasar las pruebas de andamiaje no cuenta.
