# Enmienda 11 (BORRADOR, no aprobada): backend del agente social

Autor: backend, viernes 23 oct 2026, 20:10 (Santiago), a pedido de Nico vía coordinador. **Borrador**: lo registra el coordinador como definitivo y Nico autoriza aplicarlo a la base. Hasta entonces backend solo prepara migración y pruebas en `wip/backend`, sin aplicar. `contrato` sigue en 2. La "enmienda 10" de zona y movilidad es otra cosa y ya está aplicada (0035–0038).

## 1. Respuesta breve (punto 13 del pedido)

### Qué existe hoy (verificado en la base `tjkfdnvzsikncjbskufm`, última migración 0039)
- Preferencias privadas con opt-out del agente (E8, `usar_en_agente`), zona, movilidad, tiempo y momento (E10), 13 actividades (E10 Parte B).
- `proponer_plan_borrador(p_espacio_id, p_sabado, p_clima jsonb)`: solo organizador; hasta 3 candidatas con `id` del catálogo, franjas sábado y domingo, frases, `viaje`; agregados con umbrales.
- Circuito humano completo: `create_proposal` (exactamente 2 franjas, mínimo y máximo entre 2 y 20, plazo antes de la primera franja, `p_intento_id`), `open_proposal`, interés, condiciones privadas, `evaluate_and_publish`, `accept_version` (solo elegibles de la versión), bajas y `propose_repair`. Idempotencia con `cruce.intentos` (por usuario, intento y operación; mismo intento con otros parámetros: `entrada_incompleta/intento_reutilizado`).
- La función `agente` (agente-ia, `fd89382`) llama a `proponer_plan_borrador` y redacta con Vercel AI Gateway; no escribe nada.

### Qué falta (y qué NO existe en ninguna rama de origin)
- Ninguna de las 9 funciones del agente social existe. `wip/agente-social` no está en origin (el módulo está solo en la Mac mini).
- No hay: consentimiento para recibir invitaciones, política del espacio, ejecuciones con recibo, borrador inmutable con aprobación por hash, invitaciones, localidad del espacio.
- **Disponibilidad previa**: no existe y esta enmienda NO la inventa. La disponibilidad sigue cargándose por propuesta (condiciones privadas) después de publicar. El agente propone con preferencias autorizadas y clima; quién puede, lo decide el circuito existente.
- **Reparación automática**: queda fuera (decisión D). Se conserva la reparación humana (`propose_repair`).

### Archivos que toma backend
- `supabase/migrations/0041_e11_agente_social.sql` (0040 queda reservado a la corrección de texto de la enmienda 12 (b) pedida al coordinador).
- `tests/backend/enmienda11.test.ts` (y `helpers.ts`: lista permitida de 31 a 40).
- Nada en `supabase/functions/agente/**` ni en `src/agente/**`: el cliente RPC del módulo lo adapta agente-social en sus tres archivos; el handler y la interfaz, agente-ia.

### Dependencias y bloqueos
1. Nico: aprobar este contrato y autorizar aplicar 0041 (antes de las 12:00 del sábado; si a las 03:00 no hay acuerdo, queda el circuito humano).
2. agente-social: empujar `wip/agente-social` a origin (solo sus tres archivos) y adaptar el módulo a los cambios de forma de la sección 4 (franjas en plural, errores nuevos, `propia`).
3. agente-ia: conectar `orquestarAgenteSocial` al handler, la casilla de invitaciones, el selector de política y la aprobación del borrador en `src/agente/**`.
4. Los dos parches de UX de la Mac mini van a sus dueños (agente-ia y front-juan) por sus ramas; backend no los aplica.

## 2. Las cuatro decisiones

### A. Recibos y exclusión entre workers
- Tabla `cruce.ejecuciones_agente`. Una ejecución **efectiva** por `(espacio, oportunidad)`: índice único parcial sobre las que no están `fallida`.
- `iniciar_ejecucion_agente` con un `p_ejecucion_id` nuevo y la oportunidad ocupada devuelve la ejecución canónica con `repetido: true` y `propia: false`. Con `propia: false` el worker NO llama al modelo, ni guarda, ni publica. Todos los workers usan la sesión del mismo organizador, así que el servidor no puede distinguirlos por identidad: la protección es que el borrador es inmutable (el segundo `guardar` distinto se rechaza), la publicación es única por ejecución y el lease vencido se cierra con compare-and-swap.
- El recibo es la propia ejecución: `{id, estado, oportunidad, propuesta_id?, borrador?: {hash, opcion_ref, texto}, aprobacion?: {hash, aprobado_en}, motivo?}`. Repetir `iniciar` con el mismo id (o cualquier id) recupera el estado canónico: `propuesta_id` si publicó, borrador si lo dejó, `en_curso` si sigue.
- **Lease**: `en_curso` tiene `lease_hasta = ahora + 120 s` (lo renueva `guardar`). Si una ejecución `en_curso` tiene el lease vencido, el siguiente `iniciar` de la misma oportunidad la cierra como `fallida/lease_vencido` (compare-and-swap: `update … where estado = 'en_curso' and lease_hasta < ahora`) y crea la nueva. El worker viejo, si despierta, recibe `opcion_desactualizada/ejecucion_cerrada` en cualquier escritura. Un borrador guardado no vence: queda esperando aprobación o publicación.
- Timeout del cliente: nunca se asume que no ocurrió. Se repite la MISMA llamada (mismo id o mismo `p_intento_id`) y el servidor devuelve el resultado guardado.

### B. Idempotencia y borrador inmutable
- `iniciar`: la clave es `p_ejecucion_id`. Mismo id con la misma oportunidad y el mismo `p_parametros_hash` → recibo con `repetido: true`. Mismo id con otra oportunidad u otro hash → `entrada_incompleta/intento_reutilizado`. Otro id, misma oportunidad, otro hash (por ejemplo, cambió el clima) → `opcion_desactualizada/oportunidad_en_uso`, con el recibo canónico en `ejecucion` junto al error; para recalcular, el organizador cierra la canónica (`cerrar_ejecucion_agente`, motivo `reemplazada`) y empieza otra. Nunca dos invitaciones para la misma oportunidad.
- **Oportunidad validada en servidor**: formato exacto `sabado:YYYY-MM-DD`, sábado futuro dentro de 16 días (las mismas reglas de `proponer_plan_borrador`). Cualquier otra cadena: `entrada_incompleta/oportunidad_invalida`.
- `guardar_borrador_agente`: inmutable. La primera vez fija `{opcion_ref, texto, hash}` y pasa la ejecución a `borrador`. Repetir lo mismo → `repetido: true`. Otro contenido → `opcion_desactualizada/borrador_cambiado`. Después de `aprobada` o `publicada`, cualquier guardado distinto se rechaza igual: una respuesta tardía no reemplaza nada.
- `cerrar_ejecucion_agente`: idempotente por estado (cerrar una ya `fallida` con el mismo motivo → `repetido: true`); no se puede cerrar una `publicada` (`opcion_desactualizada/ejecucion_publicada`).
- `aprobar`, `publicar` y `set_politica` llevan `p_intento_id` en `cruce.intentos`. **Ojo**: `cruce.intentos` es por usuario e intento para TODAS las operaciones (verificado en `cruce.intento_previo`): el mismo uuid en otra operación da `entrada_incompleta/intento_reutilizado`. Usar el id de la ejecución como `p_intento_id` de `publicar` es válido (`iniciar` no usa `cruce.intentos`), pero `aprobar` tiene que usar OTRO uuid. Además, `publicar` sobre una ejecución ya publicada con el mismo hash devuelve la misma propuesta aunque el intento sea otro (respuesta perdida).

### C. Continuación después de la aprobación
- El servidor calcula el hash (sha256, hex) sobre JSON canónico de: espacio, oportunidad, entrada del catálogo, título, franjas, mínimo, máximo, imprescindible, plazo, **texto** y **lista ordenada de destinatarios** (ids de miembros reales con invitaciones activadas). El hash identifica contenido; no da autoridad.
- `aprobar_borrador_agente(p_ejecucion_id, p_borrador_hash, p_intento_id)`: solo el organizador del espacio (sesión). Recalcula el hash con los datos actuales; si no coincide → `opcion_desactualizada/borrador_cambiado`. Persiste `{hash, aprobado_por, aprobado_en}`.
- `publicar_borrador_agente`: en UNA transacción revalida sesión, rol, pertenencia, política actual, que la opción siga entre las candidatas actuales, opt-ins actuales y, si la política es `aprobacion` (o cambió de versión desde `iniciar`), que exista aprobación del hash recalculado. Cualquier cambio relevante (alguien revocó invitaciones o `usar_en_agente`, cambió una preferencia que saca la opción, cambió la política) invalida la aprobación: `no_autorizado/sin_aprobacion` u `opcion_desactualizada/opcion_vencida`. No regenera opciones ni texto.

### D. Reparación
- **Fuera de esta enmienda.** Una propuesta publicada por el agente es una propuesta común: bajas, `en_revision` y `propose_repair` humano funcionan igual (nueva versión, sin aceptaciones heredadas, quien se bajó no vuelve solo). Se guarda `ejecucion_id` en la invitación para que una reparación automática futura pueda deduplicarse por causa (`propuesta_id`, `version_origen`, evento de baja). Lo automático queda pendiente y explícito.

## 3. Datos nuevos (todo en `cruce`, RLS deny-all)
- `cruce.miembros.recibir_invitaciones_agente boolean not null default false`. Las filas existentes quedan en false (el `usar_en_agente` heredado NO es consentimiento).
- `cruce.politicas_agente (espacio_id pk, modo 'aprobacion'|'autonoma', version int, actualizada_por, actualizada_en)`. Sin fila = `{modo: 'aprobacion', version: 0}`.
- `cruce.opciones_agente (opcion_ref pk, espacio_id, sabado, clima jsonb, catalogo_id, emitida_en)`: cada `opcion_ref` que entrega `agente_social_candidatos` (opaca: `op_` + 20 hex aleatorios). Sirve para validar referencias sin aceptar ids del catálogo desde el cliente. Vencen a las 24 h.
- `cruce.ejecuciones_agente (id pk, espacio_id, oportunidad, sabado, parametros_hash, estado, politica_version, lease_hasta, opcion_ref, texto, borrador_hash, aprobado_hash, aprobado_por, aprobado_en, propuesta_id, motivo, creada_por, creada_en, actualizada_en)`.
- `cruce.invitaciones_agente (propuesta_id, miembro_id, ejecucion_id, texto, creada_en, pk (propuesta_id, miembro_id))`.
- `cruce.espacios.localidad text not null default 'santiago'` (lista cerrada: `santiago`). Zona horaria: `America/Santiago`, la única que acepta `create_proposal`.

## 4. Funciones (9 nuevas; lista permitida 31 → 40 para `authenticated`, 0 para `anon`)
Todas: `SECURITY DEFINER`, `search_path = ''`, sobre `{ok, contrato, servidor_ahora, …}` o `{ok:false, error:{codigo, detalle, mensaje, reintentable}}`. Identidad y rol salen de `auth.uid()`; nunca de un actor en el payload.

| Función | Entrada | Respuesta `ok` | Quién |
|---|---|---|---|
| `agente_social_contexto` | `p_espacio_id` | `localidad`, `zona_horaria`, `politica {modo, version}`, `personas_autorizadas` (con `usar_en_agente` y preferencias), `destinatarios` (con invitaciones activadas, sin contar a quien llama) | organizador del espacio |
| `agente_social_candidatos` | `p_espacio_id`, `p_sabado date`, `p_clima jsonb` (misma forma que `proponer_plan_borrador`: `{sabado, domingo}` en `seco`/`lluvia`/`desconocido`) | `opciones[]`: `{opcion_ref, actividad, actividad_etiqueta, titulo, franjas: [{inicio, fin}] (2), viaje}`; o `{sin_plan_compatible: true, motivo?}` | organizador |
| `set_recibir_invitaciones_agente` | `p_espacio_id`, `p_recibir boolean` | `recibir_invitaciones_agente` persistido | cada persona, solo lo suyo |
| `set_politica_agente_social` | `p_espacio_id`, `p_modo` (`aprobacion`/`autonoma`), `p_intento_id` | `politica {modo, version}` | organizador |
| `iniciar_ejecucion_agente` | `p_espacio_id`, `p_ejecucion_id uuid`, `p_oportunidad text`, `p_parametros_hash text` (≤ 128) | `ejecucion` (recibo), `repetido`, `propia` | organizador |
| `guardar_borrador_agente` | `p_ejecucion_id`, `p_opcion_ref`, `p_texto` (1 a 280, sin controles) | `borrador {hash, opcion_ref}`, `repetido` | organizador, ejecución propia `en_curso` |
| `aprobar_borrador_agente` | `p_ejecucion_id`, `p_borrador_hash`, `p_intento_id` | `aprobacion {hash, aprobado_en}` | organizador (humano, desde la interfaz) |
| `publicar_borrador_agente` | `p_ejecucion_id`, `p_borrador_hash`, `p_intento_id` | `propuesta {id}`, `invitados` (cuántos), `repetido` | organizador |
| `cerrar_ejecucion_agente` | `p_ejecucion_id`, `p_estado` (`fallida`), `p_motivo` (`sin_plan`, `candidatos_rechazados`, `modelo_fallo`, `reemplazada`) | `ejecucion` | organizador |

`get_my_preferences` suma a nivel raíz `recibir_invitaciones_agente` (aditivo). `get_proposal_state` y `list_proposals` suman `mi_situacion.invitacion_agente` = `{texto}` o `null`, solo para la persona invitada (aditivo).

**Cambios de forma respecto del módulo local** (agente-social adapta):
1. `franja` singular → `franjas` (2: sábado y domingo), porque `create_proposal` exige exactamente 2 y el motor elige después con las condiciones. No se inventa una segunda franja: vienen del catálogo.
2. `p_clima` de `candidatos` es el JSON `{sabado, domingo}` de siempre, no un escalar.
3. `iniciar` devuelve `propia`.
4. Actividades: las 13 del catálogo (E10 Parte B), no 5.
5. Motivos de `cerrar`: se suman `modelo_fallo` y `reemplazada`; `sin_plan` cierra como `fallida` con motivo (no hay estado aparte).

### Lo que fija el servidor al publicar (no viene del cliente ni del modelo)
- Título y franjas: los de la entrada del catálogo para ese sábado. Lugar: el nombre de simulación del catálogo; nunca una dirección.
- Imprescindible: el organizador que publica. Mínimo: `least(3, máximo)`. Máximo: personas del espacio (reales, simuladas y pendientes), tope 20. Plazo: 3 horas antes de la primera franja; si ya pasó o queda a menos de 1 hora, `opcion_desactualizada/opcion_vencida`.
- La propuesta se crea y se abre (`reuniendo_interes`) como una humana; la audiencia es el espacio, como siempre. Las invitaciones van a las personas reales (con sesión) que tienen `recibir_invitaciones_agente` en ese momento, sin el organizador. `usar_en_agente` no hace falta para recibir invitaciones ni las habilita: son permisos separados. Sin destinatarios: `sin_alternativa/sin_destinatarios`.
- **Una invitación no es interés ni asistencia**: no toca participaciones, condiciones ni aceptaciones. Solo `accept_version` humano suma.

### Errores nuevos (además de los de siempre)
`no_autorizado/sin_aprobacion`, `opcion_desactualizada/borrador_cambiado`, `opcion_desactualizada/opcion_vencida`, `opcion_desactualizada/oportunidad_en_uso`, `opcion_desactualizada/ejecucion_cerrada`, `opcion_desactualizada/ejecucion_publicada`, `sin_alternativa/sin_destinatarios`, `entrada_incompleta/politica_invalida`, `entrada_incompleta/oportunidad_invalida`. Ningún mensaje dice quién bloquea, quién no recibe invitaciones ni por qué.

## 5. Privacidad
- Al modelo: solo `opcion_ref`, actividad, etiqueta, título, franjas y `viaje.max_minutos` (E10). Nunca nombres, zonas, condiciones ni quién tiene apagado qué.
- No se guardan prompts ni respuestas crudas del proveedor: solo el texto final validado (≤ 280).
- `destinatarios` y `personas_autorizadas` son conteos solo para el organizador. Con 3 o menos se informan igual (el organizador necesita saber si hay a quién invitar); no dicen quiénes.
- `errores_internos` sigue guardando solo función, sqlstate y contexto SQL.

## 5 bis. Estado de la implementación
- `supabase/migrations/0041_e11_agente_social.sql` preparada en `wip/backend`, **no aplicada**. Ensayo con `begin … rollback` de las tablas y del cálculo de plan/hash (20:25): correcto y sin residuos. La migración entera se aplica en una transacción: si algo falla, no queda nada.
- `tests/backend/enmienda11.test.ts`: se saltea solo mientras las funciones no existan en la base; corre con la suite apenas se aplique.
- Al aplicar: en el mismo commit, `helpers.ts` (PERMITIDAS 31 → 40) y las pruebas que fijan 31.

## 6. Pruebas (`tests/backend/enmienda11.test.ts`, contra la base real, datos ficticios, demo propio)
Sin sesión, espacio ajeno, ejecución ajena y rol indebido · `usar_en_agente` sí e invitaciones no: no invita · opt-in apagado por defecto, persistencia y revocación · revocación entre borrador y publicación invalida la aprobación · política por defecto y cambio durante la ejecución · aprobación del hash exacto y rechazo de hash cambiado · doble clic con el mismo intento: un efecto · dos uuid concurrentes para la misma oportunidad: una ejecución canónica · mismo id con otros parámetros: rechazo · respuesta perdida después del commit: repetir devuelve la misma propuesta · lease vencido: el worker viejo no escribe · opción inexistente o ajena · clima desconocido no suma "buen tiempo" · atomicidad (si falla una invitación, no queda propuesta) · invitación visible solo para la persona invitada · aceptación humana posterior sin cambios · privacidad de respuestas y errores · regresión: la suite completa. Las pruebas son de base real; no cubren modelo ni interfaz.
