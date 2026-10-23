# Contrato backend-interfaz de CRUCE (caso "Los del asado")

Versión del contrato: **1**. Dueño: Operador 1 (coordinador). Fuente del caso: `docs/caso-canonico.md`.
Backend e interfaz se implementan en paralelo contra este documento. Nadie cambia un nombre, un tipo o un significado por su cuenta: todo cambio se propone al coordinador, que sube la versión del contrato.

Todo dato de este documento es ficticio. Los identificadores de los ejemplos son ilustrativos: el servidor genera los reales.

---

## 0. Reglas generales (aplican a todas las operaciones)

### 0.1 Transporte y sesión
- Proyecto Supabase: ref `tjkfdnvzsikncjbskufm`, URL `https://tjkfdnvzsikncjbskufm.supabase.co`. Ningún otro proyecto.
- Variables del navegador (ya presentes en `.env.example`): `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Solo la clave publishable llega al navegador.
- Sesión: `supabase.auth.signInAnonymously()`. La interfaz llama a `signInAnonymously` **solo si `getSession()` no devuelve sesión**: una nueva sesión anónima es otra persona y pierde sus membresías.
- La API es exclusivamente un conjunto de funciones Postgres en el esquema `public`, invocadas con `supabase.rpc('<nombre>', { p_...: ... })`. La interfaz nunca usa `supabase.from(...)` ni Realtime en este corte.
- Todas las funciones:
  - devuelven un único valor `jsonb` con el sobre de 0.3 (también para errores de negocio: no lanzan excepción);
  - tienen todos sus parámetros obligatorios, sin valores por defecto y sin sobrecargas (un solo nombre = una sola firma);
  - son ejecutables por los roles `anon` y `authenticated`; si `auth.uid()` es nulo devuelven `sesion_invalida`;
  - son volátiles (una lectura puede aplicar el vencimiento de plazo, ver 0.6).
- Las tablas no son accesibles desde el navegador: RLS activado sin políticas para `anon`/`authenticated` (o tablas fuera de los esquemas expuestos). Una consulta directa a cualquier tabla desde el navegador devuelve 0 filas o error de permiso.

### 0.2 Actor
- El actor de toda operación es **siempre** `auth.uid()`, traducido al `miembro_id` de ese usuario en el espacio correspondiente. Ninguna operación recibe el id del actor.
- Única excepción controlada: las operaciones `simulate_*` reciben `p_miembro_id` como **destino** (el miembro simulado sobre el que se actúa). El actor registrado sigue siendo el organizador del espacio (ver 1.6).
- El id de usuario de Auth (`auth.uid()`) nunca aparece en ninguna respuesta. Hacia afuera solo existen `miembro_id`.

### 0.3 Sobre de respuesta

Éxito:
```json
{ "ok": true, "contrato": 1, "servidor_ahora": { "utc": "2026-10-24T14:05:10Z", "local": "2026-10-24T11:05:10" }, "...": "campos propios de la operación" }
```

Error:
```json
{
  "ok": false,
  "contrato": 1,
  "servidor_ahora": { "utc": "2026-10-24T14:05:10Z", "local": "2026-10-24T11:05:10" },
  "error": { "codigo": "cupo_completo", "detalle": "sin_cupo", "mensaje": "Ya se completaron los cupos de esta versión.", "reintentable": false },
  "state_rev": 14
}
```
- `state_rev` en errores: el `state_rev` actual de la propuesta si la operación es sobre una propuesta que el llamador puede ver; `null` en cualquier otro caso.
- `mensaje` es exactamente el texto de la tabla 0.5 para ese par (`codigo`, `detalle`). La interfaz puede mostrarlo tal cual. Nunca contiene condiciones privadas ni nombres de terceros.
- Si `supabase.rpc` devuelve `error` distinto de `null` (red, PostgREST, excepción no controlada) la interfaz lo trata como `fallo_temporal`.

### 0.4 Tipos comunes

| Tipo | Forma | Notas |
|---|---|---|
| `uuid` | cadena UUID | |
| `Momento` | `{ "utc": "YYYY-MM-DDTHH:MM:SSZ", "local": "YYYY-MM-DDTHH:MM:SS" }` | `local` es la hora de pared en `America/Santiago`. La interfaz muestra `local` y nunca convierte zonas horarias. |
| `HoraLocal` (entrada) | `"YYYY-MM-DDTHH:MM"` o `"YYYY-MM-DDTHH:MM:SS"` | Hora de pared en la zona de la propuesta, **sin desfase**. El servidor la convierte. Cualquier otro formato: `entrada_incompleta / formato_invalido`. |
| `MiembroRef` | `{ "miembro_id": uuid, "nombre": string, "simulado": boolean }` | Si `simulado` es `true`, la interfaz agrega siempre el rótulo "Simulación" junto al nombre. |
| `Disponibilidad` | objeto con claves de franja (`"A"`, `"B"`) y valores `"si"`, `"no"` o `"pendiente"` | Clave ausente = `"pendiente"`. Una clave que no es franja de la propuesta o un valor fuera de la lista: `entrada_incompleta / disponibilidad_invalida`. |
| `estado` | `"borrador"`, `"reuniendo_interes"`, `"esperando_compromisos"`, `"grupo_confirmado"`, `"en_revision"`, `"expirado"`, `"cancelado"` | Etiquetas visibles: Borrador, Reuniendo interés, Esperando compromisos, Grupo confirmado, En revisión, Expirado, Cancelado. |

Zona horaria: en este corte la única admitida es `America/Santiago`. Los ejemplos asumen UTC-3, vigente en Chile en octubre-noviembre de 2026; el desfase real lo calcula siempre el servidor.

### 0.5 Errores tipados (lista cerrada)

| codigo | detalle | mensaje exacto | reintentable | Qué hace la interfaz |
|---|---|---|---|---|
| `sesion_invalida` | `sin_sesion` | No hay una sesión válida. Recarga la página para continuar. | false | Mostrar el mensaje. No crear otra sesión si ya existe una. |
| `entrada_incompleta` | `campo_faltante` | Falta completar un dato obligatorio. | false | Marcar el formulario. |
| `entrada_incompleta` | `formato_invalido` | Un dato tiene un formato inválido. | false | Marcar el formulario. |
| `entrada_incompleta` | `franjas_invalidas` | Las franjas deben ser exactamente dos, futuras y con fin posterior al inicio. | false | Marcar el formulario. |
| `entrada_incompleta` | `cupos_invalidos` | El mínimo debe ser al menos 2 y no superar al máximo; el máximo no puede superar 20. | false | Marcar el formulario. |
| `entrada_incompleta` | `plazo_invalido` | El cierre de aceptación debe ser futuro y no posterior al inicio de ninguna franja. | false | Marcar el formulario. |
| `entrada_incompleta` | `zona_horaria_no_soportada` | Por ahora solo se admite la zona horaria America/Santiago. | false | Marcar el formulario. |
| `entrada_incompleta` | `imprescindible_invalido` | La persona imprescindible debe ser miembro del espacio. | false | Marcar el formulario. |
| `entrada_incompleta` | `disponibilidad_invalida` | La disponibilidad solo admite las franjas de la propuesta con los valores si, no o pendiente. | false | Marcar el formulario. |
| `entrada_incompleta` | `nombre_en_uso` | Ese nombre ya está en uso en este espacio. | false | Pedir otro nombre. |
| `entrada_incompleta` | `intento_reutilizado` | Este identificador de intento ya se usó para otra operación. | false | Generar un intento nuevo (es un error de la interfaz). |
| `fuera_de_audiencia` | `no_miembro` | No perteneces a este espacio o el elemento no existe. | false | Volver a la lista de espacios. |
| `fuera_de_audiencia` | `codigo_inexistente` | El código de invitación no existe. | false | Pedir otro código. |
| `fuera_de_audiencia` | `no_elegible_en_version` | No formas parte de las personas que pueden aceptar esta versión. | false | Refrescar el estado. |
| `opcion_desactualizada` | `version_no_vigente` | Esta versión ya no está vigente. Actualiza para ver la versión actual. | false | Refrescar el estado y mostrar la versión nueva. |
| `opcion_desactualizada` | `estado_no_admite` | La propuesta cambió de estado y esta acción ya no aplica. Actualiza la pantalla. | false | Refrescar el estado. |
| `cupo_completo` | `sin_cupo` | Ya se completaron los cupos de esta versión. | false | Refrescar el estado. |
| `plazo_vencido` | `plazo_vencido` | El plazo de aceptación ya cerró. | false | Refrescar el estado. |
| `sin_alternativa` | `sin_alternativa` | Sin opción compatible: no hay alternativa con las condiciones actuales. | false | Refrescar y mostrar "Sin opción compatible". |
| `no_autorizado` | `no_es_organizador` | Solo el organizador de la propuesta puede hacer esto. | false | Ocultar la acción. |
| `no_autorizado` | `no_es_organizador_espacio` | Solo el organizador del espacio puede hacer esto. | false | Ocultar la acción. |
| `no_autorizado` | `retirado` | Te retiraste de esta propuesta y ya no puedes participar en ella. | false | Refrescar el estado. |
| `no_autorizado` | `condiciones_congeladas` | Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente. | false | Refrescar el estado. |
| `no_autorizado` | `espacio_no_demo` | El reinicio solo está permitido en espacios de demostración. | false | Ocultar la acción. |
| `no_autorizado` | `miembro_no_simulado` | Solo se puede simular a miembros marcados como Simulación. | false | Refrescar el espacio. |
| `fallo_temporal` | `reintentar` | Falla temporal. Intenta de nuevo. | true | Reintentar con el **mismo** `p_intento_id`. |

El servidor devuelve `fallo_temporal` ante bloqueo agotado o conflicto de serialización; en ese caso la transacción completa se revierte.

**Orden de validación** (igual en todas las operaciones; el primer fallo es el que se devuelve):
1. `sesion_invalida`.
2. `entrada_incompleta` de forma (tipos, formatos, rangos que no dependen de la base).
3. Repetición de intento (solo operaciones con `p_intento_id`, ver 0.7).
4. `fuera_de_audiencia / no_miembro` (espacio o propuesta inexistente, o el llamador no es miembro de ese espacio; no se distingue entre ambos casos).
5. Vencimiento perezoso (0.6). Se aplica y queda guardado aunque la operación termine en error.
6. `no_autorizado` (rol, retirado, miembro no simulado, espacio no demo, condiciones congeladas).
7. `plazo_vencido`.
8. `opcion_desactualizada` (estado o versión).
9. Validaciones propias de la operación (`entrada_incompleta` que depende de la base, `fuera_de_audiencia / no_elegible_en_version`, `cupo_completo`, `sin_alternativa`).

### 0.6 Plazo
- `plazo_vencido` es verdadero cuando `now() >= plazo` (hora del servidor). La interfaz nunca decide el plazo; puede mostrar una cuenta regresiva **solo informativa** con `plazo.utc` y `servidor_ahora.utc`.
- Vencimiento perezoso: toda operación que lee o escribe una propuesta (incluidas `get_proposal_state` y `list_proposals`) primero aplica: si `plazo_vencido` y el estado es `borrador`, `reuniendo_interes`, `esperando_compromisos` o `en_revision`, la propuesta pasa a `expirado`, se registra el evento `propuesta_expirada` (actor `sistema`) y sube `state_rev`.
- `grupo_confirmado` no expira: sigue confirmado después del plazo.
- Con el plazo vencido: `open_proposal`, `mark_interest`, `save_my_conditions`, `evaluate_and_publish`, `accept_version`, `propose_repair` y sus `simulate_*` devuelven `plazo_vencido`. `withdraw_commitment`, `simulate_withdraw` y `cancel_proposal` siguen permitidas, salvo en estado `expirado`.
- En estado `expirado` toda operación de escritura sobre la propuesta devuelve `plazo_vencido`. En estado `cancelado` toda operación de escritura devuelve `opcion_desactualizada / estado_no_admite` (salvo `cancel_proposal`, que responde `ok` con `repetido: true`).

### 0.7 Idempotencia (`p_intento_id`)
- Operaciones con `p_intento_id` (uuid): `create_proposal`, `evaluate_and_publish`, `accept_version`, `propose_repair`, `simulate_accept`.
- La clave es (usuario real llamador, `p_intento_id`). Se guarda el nombre de la operación, sus parámetros y la respuesta.
- Se guarda la respuesta de toda llamada con `ok: true` y además las respuestas `sin_alternativa` de `propose_repair`. Los demás errores no se guardan (un reintento vuelve a ejecutar).
- Si llega de nuevo la misma clave con la misma operación y los mismos parámetros: no se ejecuta nada, se devuelve el mismo `resultado` guardado con `"repetido": true` y el `propuesta` **actual** (no el guardado). No sube `state_rev`. Si lo guardado era un error `sin_alternativa`, se devuelve el mismo sobre de error con el `state_rev` actual (los errores no llevan campo `repetido`).
- Si llega la misma clave con otra operación u otros parámetros: `entrada_incompleta / intento_reutilizado`.
- La interfaz genera `crypto.randomUUID()` al hacer clic, lo reutiliza solo para reintentos de ese mismo clic tras `fallo_temporal` y desactiva el botón mientras espera.
- Operaciones naturalmente idempotentes (sin intento): `mark_interest`, `save_my_conditions`, `withdraw_commitment`, `cancel_proposal`, `open_proposal`, `join_space`, `seed_demo_space`. Repetirlas no duplica nada y devuelve `"repetido": true` cuando no hubo cambio.

### 0.8 Atomicidad
- Cada llamada es una transacción. Las operaciones que escriben una propuesta se serializan por propuesta: dos llamadas concurrentes sobre la misma propuesta se ejecutan una después de la otra, y la segunda ve el resultado de la primera.
- Consecuencia exigida: dos sesiones que compiten por el último cupo obtienen exactamente un `ok` y un `cupo_completo`; un doble clic nunca crea dos aceptaciones, dos versiones ni dos propuestas.

---

## 1. Operaciones

Índice (25 funciones RPC):

| # | Función | Quién | Escribe |
|---|---|---|---|
| 1.0 | `server_info` | cualquiera | no |
| 1.1 | `create_space` | sesión | sí |
| 1.2 | `join_space` | sesión | sí |
| 1.3 | `list_my_spaces` | sesión | no |
| 1.4 | `get_space` | miembro | no |
| 1.5 | `seed_demo_space` | sesión | sí |
| 1.6 | `add_simulated_member` | organizador del espacio | sí |
| 1.7 | `reset_demo` | organizador del espacio demo | sí |
| 1.8 | `create_proposal` | miembro | sí |
| 1.9 | `open_proposal` | organizador de la propuesta | sí |
| 1.10 | `list_proposals` | miembro | vencimiento |
| 1.11 | `get_proposal_state` | miembro | vencimiento |
| 1.12 | `mark_interest` | miembro | sí |
| 1.13 | `save_my_conditions` | miembro | sí |
| 1.14 | `get_my_conditions` | miembro | vencimiento |
| 1.15 | `evaluate_and_publish` | organizador de la propuesta | sí |
| 1.16 | `accept_version` | miembro elegible en la versión | sí |
| 1.17 | `withdraw_commitment` | miembro | sí |
| 1.18 | `propose_repair` | organizador de la propuesta | sí |
| 1.19 | `cancel_proposal` | organizador de la propuesta | sí |
| 1.20 | `simulate_mark_interest` | organizador del espacio | sí |
| 1.21 | `simulate_save_conditions` | organizador del espacio | sí |
| 1.22 | `simulate_accept` | organizador del espacio | sí |
| 1.23 | `simulate_withdraw` | organizador del espacio | sí |
| 1.24 | `get_simulation_panel` | organizador del espacio | vencimiento |

Roles:
- **Organizador del espacio**: quien creó el espacio (o quien llamó a `seed_demo_space`). Uno por espacio.
- **Organizador de la propuesta**: el miembro que la creó. En el caso canónico Tomi es ambos.
- **Imprescindible**: miembro indicado al crear la propuesta (el anfitrión). Cuenta dentro del mínimo.
- **Audiencia de una propuesta**: los miembros actuales del espacio (reales y simulados). Quien se une después de crear la propuesta entra en la audiencia, pero no en las versiones ya publicadas.

Identificadores usados en los ejemplos (ficticios):

| Quién/qué | id |
|---|---|
| Espacio "Los del asado" | `5e000000-0000-4000-8000-000000000001` |
| Tomi (organizador, real, dispositivo 1) | `6d000000-0000-4000-8000-000000000001` |
| Luna (real, dispositivo 2, asiento reclamado) | `6d000000-0000-4000-8000-000000000002` |
| Mati (simulado) | `6d000000-0000-4000-8000-000000000003` |
| Caro (simulada) | `6d000000-0000-4000-8000-000000000004` |
| Fede (simulado) | `6d000000-0000-4000-8000-000000000005` |
| Sofi (simulada) | `6d000000-0000-4000-8000-000000000006` |
| Propuesta "Asado en casa de Tomi" | `9a000000-0000-4000-8000-000000000001` |
| Código de invitación | `KQ7M2XPA` |

Momentos fijos del caso: franja A inicio `{"utc":"2026-10-31T17:00:00Z","local":"2026-10-31T14:00:00"}`, fin `{"utc":"2026-10-31T20:00:00Z","local":"2026-10-31T17:00:00"}`; franja B inicio `{"utc":"2026-11-01T17:00:00Z","local":"2026-11-01T14:00:00"}`, fin `{"utc":"2026-11-01T20:00:00Z","local":"2026-11-01T17:00:00"}`; plazo `{"utc":"2026-10-29T23:00:00Z","local":"2026-10-29T20:00:00"}`. En los ejemplos se abrevian como `<A.inicio>`, `<B.fin>`, `<plazo>`, etc.; en las respuestas reales siempre son objetos `Momento` completos.

### Objetos de respuesta reutilizados

**`Espacio`** (lo devuelven `get_space` y las operaciones de espacio):

| Campo | Tipo | Significado |
|---|---|---|
| `id` | uuid | |
| `nombre` | string | |
| `tipo` | `"amigos"` \| `"empresa"` | Solo rótulo; el motor es el mismo. |
| `demo` | boolean | true solo para espacios creados con `seed_demo_space`. |
| `codigo_invitacion` | string | 8 caracteres de `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Visible para todos los miembros. |
| `creado_en` | Momento | |
| `ultimo_reinicio` | Momento \| null | Última ejecución de `reset_demo`. |
| `mi_miembro_id` | uuid | |
| `mi_rol` | `"organizador"` \| `"miembro"` | |
| `miembros` | array de `{ miembro_id, nombre, rol, simulado, es_yo }` | Orden: fecha de alta ascendente. |

**`EstadoPropuesta`** (lo devuelven `get_proposal_state` y todas las operaciones que escriben sobre una propuesta, bajo la clave `propuesta`). Es la vista compartida más una sección `mi_situacion` exclusiva del llamador.

| Campo | Tipo | Significado |
|---|---|---|
| `id`, `espacio_id` | uuid | |
| `titulo` | string | |
| `organizador`, `imprescindible` | MiembroRef | |
| `minimo`, `maximo` | integer | Ficha. |
| `zona_horaria` | `"America/Santiago"` | |
| `franjas` | array de `{ clave, inicio: Momento, fin: Momento }` | Exactamente 2, claves `"A"` y `"B"` en el orden de creación. |
| `plazo` | Momento | Cierre de aceptación. |
| `plazo_vencido` | boolean | Calculado por el servidor en esta llamada. |
| `creada_en` | Momento | |
| `estado`, `estado_etiqueta` | string | Ver 0.4. |
| `state_rev` | integer | Revisión del estado (sección 4). |
| `confirmados` | integer | Aceptaciones vigentes de la versión mostrada en `opcion`; 0 si `opcion` es null. |
| `opcion` | objeto \| null | Última versión publicada (ver abajo). null si nunca se publicó. |
| `ultima_evaluacion` | `{ resultado, version, en }` \| null | `resultado`: `"opcion_publicada"`, `"sin_opcion"`, `"reparacion_publicada"` o `"sin_alternativa"`. `version`: la publicada o null. Nunca incluye el motivo. |
| `interesados` | `{ cantidad, miembros: MiembroRef[] }` | Quienes marcaron "me interesa" y no se retiraron. |
| `personas_con_condiciones` | integer | Cuántos miembros no retirados tienen condiciones completas. Solo la cantidad. |
| `bajas` | array de `{ miembro: MiembroRef, en: Momento, version: integer \| null, habia_aceptado: boolean }` | Retiros registrados, en orden. `version`: la versión vigente al retirarse. |
| `siguiente_accion` | `{ codigo, texto }` | Calculada por el servidor (ver 2.4). |
| `mi_situacion` | objeto | Solo del llamador (ver abajo). |
| `historial` | array de `Evento` | Últimos 50 eventos, orden ascendente (sección 2.5). |

`opcion`:

| Campo | Tipo | Significado |
|---|---|---|
| `version` | integer | Versión de la opción (empieza en 1). |
| `franja` | `{ clave, inicio, fin }` | Franja elegida. |
| `publicada_en` | Momento | |
| `aceptaron` | array de `{ miembro: MiembroRef, aceptado_en: Momento }` | Aceptaciones vigentes de **esta** versión, por orden de aceptación. |
| `cupos.minimo`, `cupos.maximo` | integer | |
| `cupos.confirmados` | integer | = largo de `aceptaron`. |
| `cupos.disponibles` | integer | `maximo - confirmados`. |
| `cupos.faltan_para_minimo` | integer | `max(0, minimo - confirmados)`. |
| `cupos.imprescindible_acepto` | boolean | |
| `cupos.pendientes` | integer | Elegibles de esta versión no retirados que aún no aceptaron. Solo la cantidad. |

`mi_situacion`:

| Campo | Tipo | Significado |
|---|---|---|
| `miembro_id`, `nombre` | | El llamador. |
| `es_organizador` | boolean | De la propuesta. |
| `es_organizador_espacio` | boolean | |
| `interesado` | boolean | |
| `condiciones` | `"sin_cargar"` \| `"incompletas"` \| `"completas"` | Estado de **mis** condiciones, sin su contenido. |
| `retirado` | boolean | |
| `elegible_en_version` | boolean \| null | Si estoy en el conjunto elegible de `opcion.version`; null si no hay opción. |
| `acepte_version` | boolean | Si tengo aceptación vigente de `opcion.version`. |
| `puede` | `{ abrir, marcar_interes, guardar_condiciones, evaluar, aceptar, retirarme, proponer_reparacion, cancelar, simular }` | Booleanos calculados por el servidor con las mismas reglas que validan las operaciones (2.3). La interfaz habilita botones solo con esto. |

**`PropuestaResumen`** (lo devuelve `list_proposals`):
`{ id, titulo, estado, estado_etiqueta, version (integer|null), confirmados, minimo, maximo, plazo: Momento, plazo_vencido, siguiente_accion: {codigo, texto}, state_rev, mi_situacion: { interesado, retirado, acepte_version, puede_aceptar } }`. Cada campo vale exactamente lo mismo que su homónimo en `EstadoPropuesta` (`version` = `opcion.version`; `puede_aceptar` = `mi_situacion.puede.aceptar`).

---

### 1.0 `server_info()`
- Quién: cualquiera, con o sin sesión. Única función que no devuelve `sesion_invalida`.
- Parámetros: ninguno.
- Efectos: ninguno.
- Respuesta: `{ ok, contrato, servidor_ahora, sesion: { autenticada: boolean } }`.
- Errores: `fallo_temporal`.
- Ejemplo: entrada `{}` → `{"ok":true,"contrato":1,"servidor_ahora":{"utc":"2026-10-24T14:00:00Z","local":"2026-10-24T11:00:00"},"sesion":{"autenticada":true}}`.

### 1.1 `create_space(p_nombre text, p_tipo text, p_nombre_visible text)`
- Quién: cualquier sesión.
- Parámetros: `p_nombre` 1-60 caracteres tras recortar espacios; `p_tipo` `"amigos"` o `"empresa"`; `p_nombre_visible` 1-30 caracteres (nombre del creador dentro del espacio).
- Precondiciones: ninguna más.
- Efectos: crea un espacio `demo=false` con código de invitación único; crea al llamador como miembro `rol="organizador"`, `simulado=false`. Sin límite de espacios (espacios de prueba ilimitados).
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { espacio_id, codigo_invitacion, miembro_id }, espacio: Espacio }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`), `fallo_temporal`.
- Ejemplo (un tester crea un espacio de prueba):
  entrada `{"p_nombre":"Prueba cupos","p_tipo":"amigos","p_nombre_visible":"Organizador prueba"}` →
  `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"espacio_id":"5e000000-0000-4000-8000-0000000000aa","codigo_invitacion":"T4XWZ9MB","miembro_id":"6d000000-0000-4000-8000-0000000000a1"},"espacio":{"id":"5e000000-0000-4000-8000-0000000000aa","nombre":"Prueba cupos","tipo":"amigos","demo":false,"codigo_invitacion":"T4XWZ9MB","creado_en":{...},"ultimo_reinicio":null,"mi_miembro_id":"6d000000-0000-4000-8000-0000000000a1","mi_rol":"organizador","miembros":[{"miembro_id":"6d000000-0000-4000-8000-0000000000a1","nombre":"Organizador prueba","rol":"organizador","simulado":false,"es_yo":true}]}}`

### 1.2 `join_space(p_codigo text, p_nombre_visible text)`
- Quién: cualquier sesión.
- Parámetros: `p_codigo` (se compara sin distinguir mayúsculas, recortado); `p_nombre_visible` 1-30 caracteres.
- Reglas, en este orden:
  1. Si el llamador ya es miembro del espacio: no cambia nada; `ya_era_miembro: true`, `repetido: true` (se ignora el nombre enviado).
  2. Si el espacio es `demo` y existe un miembro `simulado=true` cuyo nombre coincide (sin distinguir mayúsculas ni espacios extremos): el llamador **reclama ese asiento**; el miembro pasa a `simulado=false` y queda ligado a esta sesión, conservando su `miembro_id`, sus condiciones, interés, aceptaciones y bajas. Desde ese momento el organizador ya no puede simularlo ni ver sus condiciones.
  3. Si otro miembro (real o simulado) ya usa ese nombre: `entrada_incompleta / nombre_en_uso`.
  4. Si no: crea un miembro nuevo `rol="miembro"`, `simulado=false`.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { espacio_id, miembro_id, reclamo_asiento_simulado: boolean, ya_era_miembro: boolean, repetido: boolean }, espacio: Espacio }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`, `nombre_en_uso`), `fuera_de_audiencia / codigo_inexistente`, `fallo_temporal`.
- Ejemplo (Luna, dispositivo 2): entrada `{"p_codigo":"kq7m2xpa","p_nombre_visible":"Luna"}` →
  `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"espacio_id":"5e000000-0000-4000-8000-000000000001","miembro_id":"6d000000-0000-4000-8000-000000000002","reclamo_asiento_simulado":true,"ya_era_miembro":false,"repetido":false},"espacio":{"id":"5e000000-0000-4000-8000-000000000001","nombre":"Los del asado","tipo":"amigos","demo":true,"codigo_invitacion":"KQ7M2XPA","creado_en":{...},"ultimo_reinicio":null,"mi_miembro_id":"6d000000-0000-4000-8000-000000000002","mi_rol":"miembro","miembros":[{"miembro_id":"6d000000-0000-4000-8000-000000000001","nombre":"Tomi","rol":"organizador","simulado":false,"es_yo":false},{"miembro_id":"6d000000-0000-4000-8000-000000000002","nombre":"Luna","rol":"miembro","simulado":false,"es_yo":true},{"miembro_id":"6d000000-0000-4000-8000-000000000003","nombre":"Mati","rol":"miembro","simulado":true,"es_yo":false},{"miembro_id":"6d000000-0000-4000-8000-000000000004","nombre":"Caro","rol":"miembro","simulado":true,"es_yo":false},{"miembro_id":"6d000000-0000-4000-8000-000000000005","nombre":"Fede","rol":"miembro","simulado":true,"es_yo":false},{"miembro_id":"6d000000-0000-4000-8000-000000000006","nombre":"Sofi","rol":"miembro","simulado":true,"es_yo":false}]}}`
- Ejemplo de error: entrada `{"p_codigo":"ZZZZZZZZ","p_nombre_visible":"Luna"}` → `{"ok":false,"contrato":1,"servidor_ahora":{...},"error":{"codigo":"fuera_de_audiencia","detalle":"codigo_inexistente","mensaje":"El código de invitación no existe.","reintentable":false},"state_rev":null}`

### 1.3 `list_my_spaces()`
- Quién: cualquier sesión.
- Respuesta: `{ ok, contrato, servidor_ahora, espacios: [ { id, nombre, tipo, demo, codigo_invitacion, mi_miembro_id, mi_rol, cantidad_miembros } ] }`, orden `creado_en` descendente. Lista vacía si no es miembro de ninguno.
- Errores: `sesion_invalida`, `fallo_temporal`.
- Ejemplo (Luna): entrada `{}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"espacios":[{"id":"5e000000-0000-4000-8000-000000000001","nombre":"Los del asado","tipo":"amigos","demo":true,"codigo_invitacion":"KQ7M2XPA","mi_miembro_id":"6d000000-0000-4000-8000-000000000002","mi_rol":"miembro","cantidad_miembros":6}]}`

### 1.4 `get_space(p_espacio_id uuid)`
- Quién: miembro del espacio.
- Respuesta: `{ ok, contrato, servidor_ahora, espacio: Espacio }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- Ejemplo (Tomi): entrada `{"p_espacio_id":"5e000000-0000-4000-8000-000000000001"}` → igual al objeto `espacio` del ejemplo 1.2, con `mi_miembro_id` de Tomi, `mi_rol:"organizador"` y `es_yo:true` en Tomi.

### 1.5 `seed_demo_space()`
- Quién: cualquier sesión. La usa el dispositivo que hará de Tomi.
- Idempotencia: si el llamador ya es organizador de un espacio `demo=true`, lo devuelve sin cambios (`creado: false`, `repetido: true`).
- Efectos (solo la primera vez): crea el espacio `nombre="Los del asado"`, `tipo="amigos"`, `demo=true`, con código único, y estos miembros en este orden: Tomi (`rol="organizador"`, `simulado=false`, ligado al llamador), Luna, Mati, Caro, Fede, Sofi (`rol="miembro"`, `simulado=true`, sin sesión). **No** crea la propuesta (la crea Tomi en vivo, paso 2 del recorrido) ni carga condiciones.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { espacio_id, creado: boolean, repetido: boolean }, espacio: Espacio }`.
- Errores: `sesion_invalida`, `fallo_temporal`.
- Ejemplo (Tomi): entrada `{}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"espacio_id":"5e000000-0000-4000-8000-000000000001","creado":true,"repetido":false},"espacio":{...como en 1.2, con los 6 miembros, Luna con "simulado":true, "mi_rol":"organizador"}}`
- Sesiones distintas que llaman a `seed_demo_space` obtienen espacios demo distintos y aislados (base de la prueba de reinicio aislado).

### 1.6 `add_simulated_member(p_espacio_id uuid, p_nombre_visible text)`
- Quién: organizador del espacio (cualquier espacio, demo o no). Sirve para pruebas con una sola sesión.
- Efectos: crea un miembro `simulado=true`, `rol="miembro"`, sin sesión.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { miembro_id }, espacio: Espacio }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`, `nombre_en_uso`), `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador_espacio`, `fallo_temporal`.
- Ejemplo: entrada `{"p_espacio_id":"5e000000-0000-4000-8000-0000000000aa","p_nombre_visible":"Invitado simulado 1"}` → `{"ok":true,...,"resultado":{"miembro_id":"6d000000-0000-4000-8000-0000000000a9"},"espacio":{...}}`

**Simulación, reglas comunes (1.6 y 1.20-1.24).** Un miembro `simulado=true` no tiene sesión. Solo el organizador de su espacio puede hacerlo actuar. Cada acción simulada tiene exactamente la misma semántica, validaciones y errores que la acción real equivalente, evaluadas sobre el miembro simulado como si fuera el actor (por ejemplo, un simulado retirado recibe `no_autorizado / retirado`). En el registro queda `actor_tipo:"simulacion"`, `actor` = el simulado y `ejecutado_por` = el organizador. La interfaz muestra siempre el rótulo "Simulación" en estas acciones y junto a cada nombre simulado.

### 1.7 `reset_demo(p_espacio_id uuid)`
- Quién: organizador del espacio, y solo si el espacio es `demo=true`.
- Efectos: elimina todas las propuestas de ese espacio y todo lo que cuelga de ellas (condiciones, interés, versiones, aceptaciones, bajas, intentos y eventos de esas propuestas). Conserva el espacio, su código y sus miembros tal como están (los asientos reclamados siguen reclamados, así los dispositivos no vuelven a unirse). Actualiza `ultimo_reinicio`. Registra un evento de espacio `demo_reiniciada` con actor y momento. No toca ningún otro espacio.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { propuestas_eliminadas: integer }, espacio: Espacio }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `no_autorizado` (`no_es_organizador_espacio`, `espacio_no_demo`), `fallo_temporal`.
- Ejemplo (Tomi): entrada `{"p_espacio_id":"5e000000-0000-4000-8000-000000000001"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"propuestas_eliminadas":1},"espacio":{...,"ultimo_reinicio":{"utc":"2026-10-24T13:58:00Z","local":"2026-10-24T10:58:00"}}}`
- Ejemplo de error (Luna): misma entrada → `{"ok":false,...,"error":{"codigo":"no_autorizado","detalle":"no_es_organizador_espacio","mensaje":"Solo el organizador del espacio puede hacer esto.","reintentable":false},"state_rev":null}`
- Después de un reinicio, cualquier pantalla abierta sobre una propuesta eliminada recibe `fuera_de_audiencia / no_miembro` y vuelve a la lista de propuestas.

### 1.8 `create_proposal(p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer, p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid)`
- Quién: cualquier miembro real del espacio. Queda como organizador de la propuesta.
- Parámetros:
  - `p_titulo`: 1-80 caracteres.
  - `p_franjas`: array de **exactamente 2** objetos `{ "inicio": HoraLocal, "fin": HoraLocal }`. La primera recibe la clave `"A"` y la segunda `"B"`; ese orden es el desempate del motor.
  - `p_minimo`, `p_maximo`: `2 <= p_minimo <= p_maximo <= 20`. El mínimo cuenta al imprescindible.
  - `p_imprescindible_id`: `miembro_id` de un miembro del espacio (real o simulado).
  - `p_plazo`: HoraLocal.
  - `p_zona_horaria`: debe ser `"America/Santiago"`.
- Validaciones: cada franja con `fin > inicio` e `inicio > now()` (si no, `franjas_invalidas`); `plazo > now()` y `plazo <= inicio` de ambas franjas (si no, `plazo_invalido`); imprescindible miembro del espacio (si no, `imprescindible_invalido`).
- Efectos: crea la propuesta en estado `borrador`, sin opción, `state_rev = 1`, evento `propuesta_creada`. No marca interés de nadie.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { propuesta_id, repetido }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`, `franjas_invalidas`, `cupos_invalidos`, `plazo_invalido`, `zona_horaria_no_soportada`, `imprescindible_invalido`, `intento_reutilizado`), `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- Ejemplo (Tomi):
  entrada `{"p_espacio_id":"5e000000-0000-4000-8000-000000000001","p_titulo":"Asado en casa de Tomi","p_franjas":[{"inicio":"2026-10-31T14:00","fin":"2026-10-31T17:00"},{"inicio":"2026-11-01T14:00","fin":"2026-11-01T17:00"}],"p_minimo":4,"p_maximo":6,"p_imprescindible_id":"6d000000-0000-4000-8000-000000000001","p_plazo":"2026-10-29T20:00","p_zona_horaria":"America/Santiago","p_intento_id":"1c000000-0000-4000-8000-000000000001"}` →
  `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"propuesta_id":"9a000000-0000-4000-8000-000000000001","repetido":false},"propuesta":{...,"estado":"borrador","estado_etiqueta":"Borrador","state_rev":1,"confirmados":0,"opcion":null,"franjas":[{"clave":"A","inicio":<A.inicio>,"fin":<A.fin>},{"clave":"B","inicio":<B.inicio>,"fin":<B.fin>}],"plazo":<plazo>,"siguiente_accion":{"codigo":"abrir_propuesta","texto":"El organizador debe abrir la propuesta."},...}}`
  Repetir la misma entrada devuelve el mismo `propuesta_id` con `"repetido":true` y no crea otra propuesta.

### 1.9 `open_proposal(p_propuesta_id uuid)`
- Quién: organizador de la propuesta.
- Precondiciones: estado `borrador`; plazo no vencido. Si el estado ya es `reuniendo_interes`: `ok` con `repetido: true`. Otros estados: `opcion_desactualizada / estado_no_admite`.
- Efectos: `borrador` → `reuniendo_interes`; evento `propuesta_abierta`; sube `state_rev`.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { repetido }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador`, `plazo_vencido`, `opcion_desactualizada / estado_no_admite`, `fallo_temporal`.
- Ejemplo (Tomi): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}` → `{"ok":true,...,"resultado":{"repetido":false},"propuesta":{...,"estado":"reuniendo_interes","estado_etiqueta":"Reuniendo interés","state_rev":2,"siguiente_accion":{"codigo":"reunir_condiciones","texto":"Cada persona marca su disponibilidad en privado. Luego el organizador busca una opción."}}}`

### 1.10 `list_proposals(p_espacio_id uuid)`
- Quién: miembro del espacio. Aplica vencimiento perezoso a cada propuesta listada.
- Respuesta: `{ ok, contrato, servidor_ahora, propuestas: PropuestaResumen[] }`, orden `creada_en` descendente, incluye todos los estados (también `borrador`, `expirado`, `cancelado`).
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- Ejemplo (Luna, tras el paso 4): entrada `{"p_espacio_id":"5e000000-0000-4000-8000-000000000001"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"propuestas":[{"id":"9a000000-0000-4000-8000-000000000001","titulo":"Asado en casa de Tomi","estado":"grupo_confirmado","estado_etiqueta":"Grupo confirmado","version":1,"confirmados":4,"minimo":4,"maximo":6,"plazo":<plazo>,"plazo_vencido":false,"siguiente_accion":{"codigo":"grupo_confirmado","texto":"Grupo confirmado en la versión 1. Cupos disponibles: 2."},"state_rev":9,"mi_situacion":{"interesado":true,"retirado":false,"acepte_version":true,"puede_aceptar":false}}]}`

### 1.11 `get_proposal_state(p_propuesta_id uuid)`
- Quién: miembro del espacio de la propuesta. Aplica vencimiento perezoso.
- Respuesta: `{ ok, contrato, servidor_ahora, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- Ejemplo completo (vista de Luna después del paso 4 parcial: Luna, Mati y Caro aceptaron la versión 1, falta Tomi). Entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}` →
```json
{
  "ok": true,
  "contrato": 1,
  "servidor_ahora": { "utc": "2026-10-24T14:20:00Z", "local": "2026-10-24T11:20:00" },
  "propuesta": {
    "id": "9a000000-0000-4000-8000-000000000001",
    "espacio_id": "5e000000-0000-4000-8000-000000000001",
    "titulo": "Asado en casa de Tomi",
    "organizador": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false },
    "imprescindible": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false },
    "minimo": 4,
    "maximo": 6,
    "zona_horaria": "America/Santiago",
    "franjas": [
      { "clave": "A", "inicio": { "utc": "2026-10-31T17:00:00Z", "local": "2026-10-31T14:00:00" }, "fin": { "utc": "2026-10-31T20:00:00Z", "local": "2026-10-31T17:00:00" } },
      { "clave": "B", "inicio": { "utc": "2026-11-01T17:00:00Z", "local": "2026-11-01T14:00:00" }, "fin": { "utc": "2026-11-01T20:00:00Z", "local": "2026-11-01T17:00:00" } }
    ],
    "plazo": { "utc": "2026-10-29T23:00:00Z", "local": "2026-10-29T20:00:00" },
    "plazo_vencido": false,
    "creada_en": { "utc": "2026-10-24T14:06:00Z", "local": "2026-10-24T11:06:00" },
    "estado": "esperando_compromisos",
    "estado_etiqueta": "Esperando compromisos",
    "state_rev": 8,
    "confirmados": 3,
    "opcion": {
      "version": 1,
      "franja": { "clave": "A", "inicio": { "utc": "2026-10-31T17:00:00Z", "local": "2026-10-31T14:00:00" }, "fin": { "utc": "2026-10-31T20:00:00Z", "local": "2026-10-31T17:00:00" } },
      "publicada_en": { "utc": "2026-10-24T14:15:00Z", "local": "2026-10-24T11:15:00" },
      "aceptaron": [
        { "miembro": { "miembro_id": "6d000000-0000-4000-8000-000000000002", "nombre": "Luna", "simulado": false }, "aceptado_en": { "utc": "2026-10-24T14:16:00Z", "local": "2026-10-24T11:16:00" } },
        { "miembro": { "miembro_id": "6d000000-0000-4000-8000-000000000003", "nombre": "Mati", "simulado": true }, "aceptado_en": { "utc": "2026-10-24T14:17:00Z", "local": "2026-10-24T11:17:00" } },
        { "miembro": { "miembro_id": "6d000000-0000-4000-8000-000000000004", "nombre": "Caro", "simulado": true }, "aceptado_en": { "utc": "2026-10-24T14:18:00Z", "local": "2026-10-24T11:18:00" } }
      ],
      "cupos": { "minimo": 4, "maximo": 6, "confirmados": 3, "disponibles": 3, "faltan_para_minimo": 1, "imprescindible_acepto": false, "pendientes": 1 }
    },
    "ultima_evaluacion": { "resultado": "opcion_publicada", "version": 1, "en": { "utc": "2026-10-24T14:15:00Z", "local": "2026-10-24T11:15:00" } },
    "interesados": {
      "cantidad": 2,
      "miembros": [
        { "miembro_id": "6d000000-0000-4000-8000-000000000002", "nombre": "Luna", "simulado": false },
        { "miembro_id": "6d000000-0000-4000-8000-000000000003", "nombre": "Mati", "simulado": true }
      ]
    },
    "personas_con_condiciones": 6,
    "bajas": [],
    "siguiente_accion": { "codigo": "aceptar_version", "texto": "Versión 1: confirmaron 3 de 4 necesarias. Falta la aceptación de Tomi." },
    "mi_situacion": {
      "miembro_id": "6d000000-0000-4000-8000-000000000002",
      "nombre": "Luna",
      "es_organizador": false,
      "es_organizador_espacio": false,
      "interesado": true,
      "condiciones": "completas",
      "retirado": false,
      "elegible_en_version": true,
      "acepte_version": true,
      "puede": { "abrir": false, "marcar_interes": true, "guardar_condiciones": false, "evaluar": false, "aceptar": false, "retirarme": true, "proponer_reparacion": false, "cancelar": false, "simular": false }
    },
    "historial": [
      { "tipo": "propuesta_creada", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false }, "actor_tipo": "persona", "ejecutado_por": null, "en": { "utc": "2026-10-24T14:06:00Z", "local": "2026-10-24T11:06:00" }, "estado_previo": null, "estado_nuevo": "borrador", "version_previa": null, "version_nueva": null, "state_rev": 1 },
      { "tipo": "propuesta_abierta", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false }, "actor_tipo": "persona", "ejecutado_por": null, "en": { "utc": "2026-10-24T14:07:00Z", "local": "2026-10-24T11:07:00" }, "estado_previo": "borrador", "estado_nuevo": "reuniendo_interes", "version_previa": null, "version_nueva": null, "state_rev": 2 },
      { "tipo": "opcion_publicada", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false }, "actor_tipo": "persona", "ejecutado_por": null, "en": { "utc": "2026-10-24T14:15:00Z", "local": "2026-10-24T11:15:00" }, "estado_previo": "reuniendo_interes", "estado_nuevo": "esperando_compromisos", "version_previa": null, "version_nueva": 1, "state_rev": 5 },
      { "tipo": "aceptacion", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000002", "nombre": "Luna", "simulado": false }, "actor_tipo": "persona", "ejecutado_por": null, "en": { "utc": "2026-10-24T14:16:00Z", "local": "2026-10-24T11:16:00" }, "estado_previo": "esperando_compromisos", "estado_nuevo": "esperando_compromisos", "version_previa": 1, "version_nueva": 1, "state_rev": 6 },
      { "tipo": "aceptacion", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000003", "nombre": "Mati", "simulado": true }, "actor_tipo": "simulacion", "ejecutado_por": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false }, "en": { "utc": "2026-10-24T14:17:00Z", "local": "2026-10-24T11:17:00" }, "estado_previo": "esperando_compromisos", "estado_nuevo": "esperando_compromisos", "version_previa": 1, "version_nueva": 1, "state_rev": 7 },
      { "tipo": "aceptacion", "actor": { "miembro_id": "6d000000-0000-4000-8000-000000000004", "nombre": "Caro", "simulado": true }, "actor_tipo": "simulacion", "ejecutado_por": { "miembro_id": "6d000000-0000-4000-8000-000000000001", "nombre": "Tomi", "simulado": false }, "en": { "utc": "2026-10-24T14:18:00Z", "local": "2026-10-24T11:18:00" }, "estado_previo": "esperando_compromisos", "estado_nuevo": "esperando_compromisos", "version_previa": 1, "version_nueva": 1, "state_rev": 8 }
    ]
  }
}
```
Notar lo que **no** está: ninguna disponibilidad, ni la lista de elegibles por nombre, ni quién no es elegible ni por qué. Luna sabe que hay 1 pendiente y que falta Tomi porque `imprescindible_acepto` es false.

### 1.12 `mark_interest(p_propuesta_id uuid, p_interesado boolean)`
- Quién: miembro del espacio, no retirado.
- Precondiciones: estado `reuniendo_interes`, `esperando_compromisos`, `grupo_confirmado` o `en_revision`; plazo no vencido.
- Efectos: fija mi interés. Si cambió, sube `state_rev` (no genera evento de historial: no es una transición). **No modifica confirmados, elegibilidad ni aceptaciones.** Si no cambió: `repetido: true`.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { interesado, repetido }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`), `fuera_de_audiencia / no_miembro`, `no_autorizado / retirado`, `plazo_vencido`, `opcion_desactualizada / estado_no_admite`, `fallo_temporal`.
- Ejemplo (Luna, paso 2): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_interesado":true}` → `{"ok":true,...,"resultado":{"interesado":true,"repetido":false},"propuesta":{...,"estado":"reuniendo_interes","state_rev":3,"interesados":{"cantidad":1,"miembros":[{"miembro_id":"6d000000-0000-4000-8000-000000000002","nombre":"Luna","simulado":false}]},"confirmados":0,"opcion":null}}`

### 1.13 `save_my_conditions(p_propuesta_id uuid, p_disponibilidad jsonb)`
- Quién: miembro del espacio, no retirado.
- Parámetros: `p_disponibilidad` de tipo `Disponibilidad`. **Reemplaza** por completo mis condiciones anteriores (no mezcla).
- Precondiciones: estado `reuniendo_interes`, `esperando_compromisos`, `grupo_confirmado` o `en_revision`; plazo no vencido; si el estado es `esperando_compromisos` o `grupo_confirmado` y estoy en el conjunto elegible de la versión vigente: `no_autorizado / condiciones_congeladas` (para cambiar debe retirarse). En `en_revision` cualquiera no retirado puede cambiarlas.
- Efectos: guarda mis condiciones. Condiciones completas = todas las franjas con `"si"` o `"no"`. **No sube `state_rev`** y no genera evento (no es una transición y no revela actividad). No cambia la versión publicada: solo se usa en la próxima evaluación o reparación.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { repetido }, condiciones: { disponibilidad: Disponibilidad (con las 2 claves explícitas), estado: "sin_cargar"|"incompletas"|"completas", actualizadas_en: Momento }, propuesta: EstadoPropuesta }`. El bloque `condiciones` es solo del llamador.
- Errores: `sesion_invalida`, `entrada_incompleta` (`campo_faltante`, `formato_invalido`, `disponibilidad_invalida`), `fuera_de_audiencia / no_miembro`, `no_autorizado` (`retirado`, `condiciones_congeladas`), `plazo_vencido`, `opcion_desactualizada / estado_no_admite`, `fallo_temporal`.
- Ejemplo (Luna, paso 3): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_disponibilidad":{"A":"si","B":"si"}}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"repetido":false},"condiciones":{"disponibilidad":{"A":"si","B":"si"},"estado":"completas","actualizadas_en":{"utc":"2026-10-24T14:10:00Z","local":"2026-10-24T11:10:00"}},"propuesta":{...,"state_rev":4,"personas_con_condiciones":2,"mi_situacion":{...,"condiciones":"completas"}}}`
- Ejemplo con pendiente: `{"p_disponibilidad":{"A":"si"}}` → `condiciones.disponibilidad = {"A":"si","B":"pendiente"}`, `estado:"incompletas"`: no es elegible en ninguna franja hasta completarlas.

### 1.14 `get_my_conditions(p_propuesta_id uuid)`
- Quién: miembro del espacio. Única lectura de condiciones para personas reales, y solo de las propias.
- Respuesta: `{ ok, contrato, servidor_ahora, condiciones: { disponibilidad, estado, actualizadas_en: Momento|null }, state_rev }`. Sin condiciones guardadas: `{"disponibilidad":{"A":"pendiente","B":"pendiente"},"estado":"sin_cargar","actualizadas_en":null}`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `fallo_temporal`.
- Ejemplo (Luna): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"condiciones":{"disponibilidad":{"A":"si","B":"si"},"estado":"completas","actualizadas_en":{"utc":"2026-10-24T14:10:00Z","local":"2026-10-24T11:10:00"}},"state_rev":4}`

### 1.15 `evaluate_and_publish(p_propuesta_id uuid, p_intento_id uuid)`
- Quién: organizador de la propuesta.
- Precondiciones: estado `reuniendo_interes`; plazo no vencido. (Para estados posteriores se usa `propose_repair`.)
- Regla del motor (idéntica en 1.18):
  - **Elegible en una franja**: miembro actual del espacio, no retirado de la propuesta, con condiciones completas y `"si"` en esa franja.
  - **Viable**: la franja tiene al menos `minimo` elegibles **y** el imprescindible está entre ellos.
  - **Elección**: la franja viable con `inicio` más temprano; si empatan, la de clave menor (`"A"` antes que `"B"`).
  - **Máximo**: el conjunto elegible puede ser mayor que `maximo`; el máximo se respeta en las aceptaciones (`cupo_completo`), por orden de llegada.
- Efectos si hay franja viable: crea la versión `1` con esa franja y con la **foto** del conjunto elegible en ese momento (quien se una o cargue condiciones después no entra en esta versión); estado → `esperando_compromisos`; `ultima_evaluacion = {resultado:"opcion_publicada", version:1}`; evento `opcion_publicada`; sube `state_rev`.
- Efectos si no hay franja viable: no crea versión; el estado sigue `reuniendo_interes`; `ultima_evaluacion = {resultado:"sin_opcion", version:null}`; evento `evaluacion_sin_opcion`; sube `state_rev`. **No** baja el mínimo ni informa el motivo.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { tipo: "opcion_publicada"|"sin_opcion", version: integer|null, franja: "A"|"B"|null, repetido }, propuesta: EstadoPropuesta }`. "Sin opción" es un resultado con `ok: true`, no un error ni un estado.
- Errores: `sesion_invalida`, `entrada_incompleta` (`formato_invalido`, `intento_reutilizado`), `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador`, `plazo_vencido`, `opcion_desactualizada / estado_no_admite`, `fallo_temporal`.
- Ejemplo (Tomi, paso 3; condiciones: Tomi A+B, Luna A+B, Mati A+B, Caro solo A, Fede solo B, Sofi solo B → A tiene 4 elegibles con Tomi): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_intento_id":"1c000000-0000-4000-8000-000000000002"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"tipo":"opcion_publicada","version":1,"franja":"A","repetido":false},"propuesta":{...,"estado":"esperando_compromisos","state_rev":5,"confirmados":0,"opcion":{"version":1,"franja":{"clave":"A",...},"aceptaron":[],"cupos":{"minimo":4,"maximo":6,"confirmados":0,"disponibles":6,"faltan_para_minimo":4,"imprescindible_acepto":false,"pendientes":4}},"siguiente_accion":{"codigo":"aceptar_version","texto":"Versión 1: confirmaron 0 de 4 necesarias. Falta la aceptación de Tomi."}}}`
- Ejemplo sin opción (espacio de prueba donde el imprescindible marcó `{"A":"no","B":"no"}`): → `{"ok":true,...,"resultado":{"tipo":"sin_opcion","version":null,"franja":null,"repetido":false},"propuesta":{...,"estado":"reuniendo_interes","opcion":null,"ultima_evaluacion":{"resultado":"sin_opcion","version":null,"en":{...}},"siguiente_accion":{"codigo":"sin_opcion","texto":"Sin opción compatible con las condiciones actuales. Se puede esperar más disponibilidad o cancelar."}}}`

### 1.16 `accept_version(p_propuesta_id uuid, p_version integer, p_intento_id uuid)`
- Quién: miembro del conjunto elegible de esa versión.
- Validación exacta, en orden (aplica el orden general 0.5):
  1. `sesion_invalida`. 2. `entrada_incompleta` (`p_version >= 1`, uuids válidos). 3. Repetición de intento → respuesta guardada. 4. `fuera_de_audiencia / no_miembro`. 5. Vencimiento perezoso. 6. Retirado → `no_autorizado / retirado`. 7. Plazo vencido → `plazo_vencido`. 8. Estado distinto de `esperando_compromisos` y `grupo_confirmado` → `opcion_desactualizada / estado_no_admite`. 9. `p_version` distinto de la versión vigente → `opcion_desactualizada / version_no_vigente`. 10. No está en la foto de elegibles de esa versión → `fuera_de_audiencia / no_elegible_en_version`. 11. Ya tiene aceptación vigente de esa versión → `ok` con `repetido: true`, sin cambios. 12. `confirmados >= maximo` → `cupo_completo`. 13. Registra la aceptación.
- Efectos: aceptación vigente de esa versión; evento `aceptacion`; sube `state_rev`. Si tras aceptar `confirmados >= minimo` y el imprescindible aceptó, y el estado era `esperando_compromisos`, pasa a `grupo_confirmado` (en el mismo evento: `estado_nuevo = "grupo_confirmado"`). En `grupo_confirmado` se puede seguir aceptando hasta el máximo; el estado no cambia.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { version, repetido, grupo_confirmado: boolean }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`formato_invalido`, `intento_reutilizado`), `fuera_de_audiencia` (`no_miembro`, `no_elegible_en_version`), `no_autorizado / retirado`, `plazo_vencido`, `opcion_desactualizada` (`estado_no_admite`, `version_no_vigente`), `cupo_completo`, `fallo_temporal`.
- Ejemplo (Tomi, cuarto en aceptar la versión 1): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_version":1,"p_intento_id":"1c000000-0000-4000-8000-000000000003"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"version":1,"repetido":false,"grupo_confirmado":true},"propuesta":{...,"estado":"grupo_confirmado","estado_etiqueta":"Grupo confirmado","state_rev":9,"confirmados":4,"opcion":{...,"cupos":{"minimo":4,"maximo":6,"confirmados":4,"disponibles":2,"faltan_para_minimo":0,"imprescindible_acepto":true,"pendientes":0}},"siguiente_accion":{"codigo":"grupo_confirmado","texto":"Grupo confirmado en la versión 1. Cupos disponibles: 2."}}}`
- Ejemplo de versión vieja (Luna con la pantalla desactualizada después de publicada la versión 2): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_version":1,"p_intento_id":"1c000000-0000-4000-8000-000000000010"}` → `{"ok":false,"contrato":1,"servidor_ahora":{...},"error":{"codigo":"opcion_desactualizada","detalle":"version_no_vigente","mensaje":"Esta versión ya no está vigente. Actualiza para ver la versión actual.","reintentable":false},"state_rev":11}`

### 1.17 `withdraw_commitment(p_propuesta_id uuid)`
"Cancelar mi compromiso" / "No voy". Retiro **definitivo** de esa propuesta.
- Quién: miembro del espacio.
- Precondiciones: estado `reuniendo_interes`, `esperando_compromisos`, `grupo_confirmado` o `en_revision` (también con plazo vencido si el estado es `grupo_confirmado`). Si ya estaba retirado: `ok`, `repetido: true`, `efecto: "sin_cambio_de_estado"`.
- Efectos: marca al miembro como retirado de la propuesta (no vuelve a ser elegible en ninguna versión, pierde interés y su aceptación vigente si la tenía); agrega la baja a `bajas`; evento `baja`; sube `state_rev`. Luego aplica la regla de baja (sección 2.2) y devuelve el `efecto`.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { repetido, efecto: "sin_cambio_de_estado"|"acuerdo_conservado"|"pasa_a_revision"|"expirado" }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `plazo_vencido` (solo si el estado es `expirado` o si el plazo venció y el estado no es `grupo_confirmado`), `opcion_desactualizada / estado_no_admite` (`borrador`, `cancelado`), `fallo_temporal`.
- Ejemplo (Caro se baja, paso 5, ejecutado como simulación con `simulate_withdraw`; con una sesión real la entrada sería `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}`) → `{"ok":true,...,"resultado":{"repetido":false,"efecto":"pasa_a_revision"},"propuesta":{...,"estado":"en_revision","estado_etiqueta":"En revisión","state_rev":10,"confirmados":3,"opcion":{"version":1,...,"cupos":{"minimo":4,"maximo":6,"confirmados":3,"disponibles":3,"faltan_para_minimo":1,"imprescindible_acepto":true,"pendientes":0}},"bajas":[{"miembro":{"miembro_id":"6d000000-0000-4000-8000-000000000004","nombre":"Caro","simulado":true},"en":{...},"version":1,"habia_aceptado":true}],"siguiente_accion":{"codigo":"buscar_alternativa","texto":"Hubo una baja y el plan ya no cumple el mínimo o la presencia del anfitrión. El organizador debe buscar una alternativa."}}}`

### 1.18 `propose_repair(p_propuesta_id uuid, p_intento_id uuid)`
- Quién: organizador de la propuesta.
- Precondiciones: estado `en_revision`; plazo no vencido.
- Efectos si hay franja viable (mismo motor que 1.15, con las condiciones actuales y excluyendo retirados; ambas franjas son candidatas, incluida la de la versión rota): crea la versión `N+1` con su propia foto de elegibles y **cero aceptaciones** (ninguna se hereda, aunque la franja sea la misma); estado → `esperando_compromisos`; `ultima_evaluacion = {resultado:"reparacion_publicada", version:N+1}`; evento `reparacion_publicada`; sube `state_rev`. Nunca pasa directo a `grupo_confirmado`.
- Efectos si no hay franja viable: devuelve **error** `sin_alternativa`; el estado sigue `en_revision`; igual se guarda `ultima_evaluacion = {resultado:"sin_alternativa", version:null}`, el evento `reparacion_sin_alternativa` y sube `state_rev` (el error no revierte esto). No baja el mínimo ni finge reparación.
- Respuesta de éxito: `{ ok, contrato, servidor_ahora, resultado: { tipo: "reparacion_publicada", version, franja, repetido }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta` (`formato_invalido`, `intento_reutilizado`), `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador`, `plazo_vencido`, `opcion_desactualizada / estado_no_admite`, `sin_alternativa`, `fallo_temporal`.
- Ejemplo (Tomi, paso 6; Caro retirada; A queda con Tomi, Luna, Mati = 3, no viable; B tiene Tomi, Luna, Mati, Fede, Sofi = 5, viable): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_intento_id":"1c000000-0000-4000-8000-000000000004"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"resultado":{"tipo":"reparacion_publicada","version":2,"franja":"B","repetido":false},"propuesta":{...,"estado":"esperando_compromisos","state_rev":11,"confirmados":0,"opcion":{"version":2,"franja":{"clave":"B",...},"aceptaron":[],"cupos":{"minimo":4,"maximo":6,"confirmados":0,"disponibles":6,"faltan_para_minimo":4,"imprescindible_acepto":false,"pendientes":5}},"siguiente_accion":{"codigo":"aceptar_version","texto":"Versión 2: confirmaron 0 de 4 necesarias. Falta la aceptación de Tomi."}}}`
- Ejemplo contraejemplo (paso 7: tras la baja de Caro, Tomi guarda `{"A":"no","B":"no"}` y luego pide reparación): → `{"ok":false,"contrato":1,"servidor_ahora":{...},"error":{"codigo":"sin_alternativa","detalle":"sin_alternativa","mensaje":"Sin opción compatible: no hay alternativa con las condiciones actuales.","reintentable":false},"state_rev":11}`

### 1.19 `cancel_proposal(p_propuesta_id uuid)`
- Quién: organizador de la propuesta.
- Precondiciones: estado distinto de `expirado` (en `expirado` → `plazo_vencido`). Si ya está `cancelado`: `ok`, `repetido: true`. Se permite con plazo vencido si el estado es `grupo_confirmado`.
- Efectos: estado → `cancelado` (terminal); evento `propuesta_cancelada`; sube `state_rev`. Las aceptaciones quedan guardadas pero ya no cuentan para nada.
- Respuesta: `{ ok, contrato, servidor_ahora, resultado: { repetido }, propuesta: EstadoPropuesta }`.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador`, `plazo_vencido`, `fallo_temporal`.
- Ejemplo (Tomi, tras el contraejemplo): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}` → `{"ok":true,...,"resultado":{"repetido":false},"propuesta":{...,"estado":"cancelado","estado_etiqueta":"Cancelado","state_rev":12,"siguiente_accion":{"codigo":"cancelado","texto":"El organizador canceló la propuesta."}}}`

### 1.20 `simulate_mark_interest(p_propuesta_id uuid, p_miembro_id uuid, p_interesado boolean)`
- Quién: organizador del espacio de la propuesta. `p_miembro_id` debe ser un miembro `simulado=true` de ese espacio (si no: `no_autorizado / miembro_no_simulado`; si no es organizador: `no_autorizado / no_es_organizador_espacio`).
- Semántica, respuesta y demás errores: los de 1.12 aplicados al miembro simulado; `resultado` agrega `"simulado": true`. `propuesta.mi_situacion` es la del organizador.
- Ejemplo (Tomi por Mati): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_miembro_id":"6d000000-0000-4000-8000-000000000003","p_interesado":true}` → `{"ok":true,...,"resultado":{"interesado":true,"repetido":false,"simulado":true},"propuesta":{...,"interesados":{"cantidad":2,...},"confirmados":0}}`

### 1.21 `simulate_save_conditions(p_propuesta_id uuid, p_miembro_id uuid, p_disponibilidad jsonb)`
- Quién y validación del destino: como 1.20.
- Semántica: la de 1.13 sobre el miembro simulado. La respuesta incluye `condiciones` **del simulado** (las cargó el propio organizador) y `resultado.simulado: true`.
- Ejemplo (Tomi por Caro): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_miembro_id":"6d000000-0000-4000-8000-000000000004","p_disponibilidad":{"A":"si","B":"no"}}` → `{"ok":true,...,"resultado":{"repetido":false,"simulado":true},"condiciones":{"disponibilidad":{"A":"si","B":"no"},"estado":"completas","actualizadas_en":{...}},"propuesta":{...}}`
- Ejemplo de error (Tomi intenta simular a Luna, que reclamó su asiento): `{"ok":false,...,"error":{"codigo":"no_autorizado","detalle":"miembro_no_simulado","mensaje":"Solo se puede simular a miembros marcados como Simulación.","reintentable":false},"state_rev":4}`

### 1.22 `simulate_accept(p_propuesta_id uuid, p_miembro_id uuid, p_version integer, p_intento_id uuid)`
- Quién y validación del destino: como 1.20. Semántica, orden de validación y errores: los de 1.16 sobre el simulado. `resultado.simulado: true`.
- Ejemplo (Tomi por Mati, versión 1): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_miembro_id":"6d000000-0000-4000-8000-000000000003","p_version":1,"p_intento_id":"1c000000-0000-4000-8000-000000000005"}` → `{"ok":true,...,"resultado":{"version":1,"repetido":false,"grupo_confirmado":false,"simulado":true},"propuesta":{...,"state_rev":7,"confirmados":2}}`

### 1.23 `simulate_withdraw(p_propuesta_id uuid, p_miembro_id uuid)`
- Quién y validación del destino: como 1.20. Semántica y errores: los de 1.17 sobre el simulado. `resultado.simulado: true`.
- Ejemplo (Tomi por Caro, paso 5): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001","p_miembro_id":"6d000000-0000-4000-8000-000000000004"}` → respuesta del ejemplo 1.17 con `"resultado":{"repetido":false,"efecto":"pasa_a_revision","simulado":true}`.

### 1.24 `get_simulation_panel(p_propuesta_id uuid)`
- Quién: organizador del espacio de la propuesta. Única respuesta que muestra condiciones de terceros, y solo de miembros `simulado=true` (ficticios, cargados por el propio organizador). Un miembro que reclamó su asiento desaparece del panel.
- Respuesta: `{ ok, contrato, servidor_ahora, state_rev, simulacion: { rotulo: "Simulación", miembros: [ { miembro: MiembroRef, interesado, condiciones: { disponibilidad, estado }, retirado, elegible_en_version, acepte_version, puede: { marcar_interes, guardar_condiciones, aceptar, retirarme } } ] } }`. `puede` con las mismas reglas de 2.3 aplicadas al simulado.
- Errores: `sesion_invalida`, `entrada_incompleta / formato_invalido`, `fuera_de_audiencia / no_miembro`, `no_autorizado / no_es_organizador_espacio`, `fallo_temporal`.
- Ejemplo (Tomi, tras publicar la versión 1): entrada `{"p_propuesta_id":"9a000000-0000-4000-8000-000000000001"}` → `{"ok":true,"contrato":1,"servidor_ahora":{...},"state_rev":5,"simulacion":{"rotulo":"Simulación","miembros":[{"miembro":{"miembro_id":"6d000000-0000-4000-8000-000000000003","nombre":"Mati","simulado":true},"interesado":true,"condiciones":{"disponibilidad":{"A":"si","B":"si"},"estado":"completas"},"retirado":false,"elegible_en_version":true,"acepte_version":false,"puede":{"marcar_interes":true,"guardar_condiciones":false,"aceptar":true,"retirarme":true}},{"miembro":{"miembro_id":"6d000000-0000-4000-8000-000000000004","nombre":"Caro","simulado":true},"interesado":false,"condiciones":{"disponibilidad":{"A":"si","B":"no"},"estado":"completas"},"retirado":false,"elegible_en_version":true,"acepte_version":false,"puede":{"marcar_interes":true,"guardar_condiciones":false,"aceptar":true,"retirarme":true}},{"miembro":{"miembro_id":"6d000000-0000-4000-8000-000000000005","nombre":"Fede","simulado":true},"interesado":false,"condiciones":{"disponibilidad":{"A":"no","B":"si"},"estado":"completas"},"retirado":false,"elegible_en_version":false,"acepte_version":false,"puede":{"marcar_interes":true,"guardar_condiciones":true,"aceptar":false,"retirarme":true}},{"miembro":{"miembro_id":"6d000000-0000-4000-8000-000000000006","nombre":"Sofi","simulado":true},"interesado":false,"condiciones":{"disponibilidad":{"A":"no","B":"si"},"estado":"completas"},"retirado":false,"elegible_en_version":false,"acepte_version":false,"puede":{"marcar_interes":true,"guardar_condiciones":true,"aceptar":false,"retirarme":true}}]}}`
- Ejemplo de error (Luna): `{"ok":false,...,"error":{"codigo":"no_autorizado","detalle":"no_es_organizador_espacio","mensaje":"Solo el organizador del espacio puede hacer esto.","reintentable":false},"state_rev":5}`

---

## 2. Máquina de estados

### 2.1 Transiciones

| Desde | Hacia | Disparador | Quién | Evento |
|---|---|---|---|---|
| (nada) | `borrador` | `create_proposal` | miembro (queda organizador) | `propuesta_creada` |
| `borrador` | `reuniendo_interes` | `open_proposal` | organizador | `propuesta_abierta` |
| `reuniendo_interes` | `esperando_compromisos` | `evaluate_and_publish` con franja viable (versión 1) | organizador | `opcion_publicada` |
| `reuniendo_interes` | `reuniendo_interes` | `evaluate_and_publish` sin franja viable (resultado "Sin opción") | organizador | `evaluacion_sin_opcion` |
| `esperando_compromisos` | `grupo_confirmado` | `accept_version` / `simulate_accept` que deja `confirmados >= minimo` con el imprescindible aceptado | quien acepta | `aceptacion` |
| `esperando_compromisos` | `esperando_compromisos` | aceptación que aún no confirma; baja que no rompe (2.2) | quien acepta / se baja | `aceptacion` / `baja` |
| `esperando_compromisos` | `en_revision` | baja que rompe (2.2) | quien se baja | `baja` |
| `grupo_confirmado` | `grupo_confirmado` | aceptación adicional hasta el máximo; baja que conserva el acuerdo (2.2) | quien acepta / se baja | `aceptacion` / `baja` |
| `grupo_confirmado` | `en_revision` | baja que rompe, con plazo no vencido | quien se baja | `baja` |
| `grupo_confirmado` | `expirado` | baja que rompe, con plazo vencido (ya no hay reparación posible) | quien se baja | `baja` |
| `en_revision` | `esperando_compromisos` | `propose_repair` con franja viable (versión N+1, cero aceptaciones) | organizador | `reparacion_publicada` |
| `en_revision` | `en_revision` | `propose_repair` sin franja viable (error `sin_alternativa`) | organizador | `reparacion_sin_alternativa` |
| `borrador`, `reuniendo_interes`, `esperando_compromisos`, `en_revision` | `expirado` | vencimiento perezoso al llegar el plazo (0.6) | sistema | `propuesta_expirada` |
| todo estado salvo `expirado` y `cancelado` | `cancelado` | `cancel_proposal` | organizador | `propuesta_cancelada` |

`expirado` y `cancelado` son terminales. `grupo_confirmado` no expira. No existe estado "Reparado" ni "Encuentro realizado": después de una reparación el plan solo vuelve a `grupo_confirmado` con las nuevas aceptaciones de la nueva versión.

### 2.2 Regla de baja (se evalúa después de registrar el retiro)
Definiciones sobre la versión vigente `V`:
- `confirmados(V)` = aceptaciones vigentes de `V` (sin retirados).
- `potencial(V)` = elegibles de la foto de `V` que no se retiraron (aceptaron o no).

| Estado al bajarse | Condición | Resultado | `efecto` |
|---|---|---|---|
| `reuniendo_interes` o `en_revision` | siempre | el estado no cambia | `sin_cambio_de_estado` |
| `esperando_compromisos` | `potencial(V) >= minimo` y el imprescindible no se retiró | sigue `esperando_compromisos` | `sin_cambio_de_estado` |
| `esperando_compromisos` | `potencial(V) < minimo` o se retiró el imprescindible | `en_revision` | `pasa_a_revision` |
| `grupo_confirmado` | quien se baja no había aceptado `V` | sigue `grupo_confirmado` | `sin_cambio_de_estado` |
| `grupo_confirmado` | había aceptado, y tras la baja `confirmados(V) >= minimo` y el imprescindible sigue aceptado | sigue `grupo_confirmado`: **el acuerdo se conserva**; la baja queda en `bajas` y en `historial` | `acuerdo_conservado` |
| `grupo_confirmado` | había aceptado, y tras la baja `confirmados(V) < minimo` o el imprescindible se retiró; plazo no vencido | `en_revision` | `pasa_a_revision` |
| `grupo_confirmado` | igual que la fila anterior pero con plazo vencido | `expirado` | `expirado` |

Nota: en `grupo_confirmado`, una baja que deja `confirmados < minimo` pasa a revisión aunque haya pendientes que podrían aceptar; la recuperación se hace con una versión nueva (`propose_repair`).

### 2.3 Reglas de `puede` (las mismas que validan las operaciones)
Sea `activo` = estado en {`reuniendo_interes`, `esperando_compromisos`, `grupo_confirmado`, `en_revision`}; `con_opcion` = estado en {`esperando_compromisos`, `grupo_confirmado`}.
- `abrir` = es_organizador y estado `borrador` y no plazo_vencido.
- `marcar_interes` = activo y no retirado y no plazo_vencido.
- `guardar_condiciones` = activo y no retirado y no plazo_vencido y no (con_opcion y elegible_en_version).
- `evaluar` = es_organizador y estado `reuniendo_interes` y no plazo_vencido.
- `aceptar` = con_opcion y elegible_en_version y no retirado y no acepte_version y no plazo_vencido y `cupos.disponibles > 0`.
- `retirarme` = no retirado y (estado en {`reuniendo_interes`, `esperando_compromisos`, `en_revision`} y no plazo_vencido, o estado `grupo_confirmado`).
- `proponer_reparacion` = es_organizador y estado `en_revision` y no plazo_vencido.
- `cancelar` = es_organizador y estado no en {`expirado`, `cancelado`}.
- `simular` = es_organizador_espacio y activo y existe al menos un miembro simulado en el espacio.

### 2.4 `siguiente_accion` (lista cerrada; texto exacto)

| Situación | codigo | texto |
|---|---|---|
| `borrador` | `abrir_propuesta` | El organizador debe abrir la propuesta. |
| `reuniendo_interes` y `ultima_evaluacion` null | `reunir_condiciones` | Cada persona marca su disponibilidad en privado. Luego el organizador busca una opción. |
| `reuniendo_interes` y `ultima_evaluacion.resultado = "sin_opcion"` | `sin_opcion` | Sin opción compatible con las condiciones actuales. Se puede esperar más disponibilidad o cancelar. |
| `esperando_compromisos` | `aceptar_version` | Versión {v}: confirmaron {c} de {minimo} necesarias. + si el imprescindible no aceptó: " Falta la aceptación de {nombre del imprescindible}." |
| `grupo_confirmado` | `grupo_confirmado` | Grupo confirmado en la versión {v}. Cupos disponibles: {d}. |
| `en_revision` y `ultima_evaluacion.resultado` distinto de `"sin_alternativa"` | `buscar_alternativa` | Hubo una baja y el plan ya no cumple el mínimo o la presencia del anfitrión. El organizador debe buscar una alternativa. |
| `en_revision` y `ultima_evaluacion.resultado = "sin_alternativa"` | `sin_alternativa` | Sin opción compatible: no hay alternativa con las condiciones actuales. El organizador puede cancelar. |
| `expirado` | `expirado` | Venció el plazo sin grupo confirmado. |
| `cancelado` | `cancelado` | El organizador canceló la propuesta. |

En `aceptar_version`, `{c}` puede ser mayor o igual que `{minimo}` cuando falta solo el imprescindible; el texto se arma igual (por ejemplo "Versión 1: confirmaron 3 de 3 necesarias. Falta la aceptación de Tomi." en un espacio de prueba con mínimo 3). `{v}`, `{c}`, `{minimo}` y `{d}` son enteros sin formato; `{d}` = `cupos.disponibles`.

### 2.5 Registro de cambios (`historial`)
Cada transición y cada aceptación, baja, evaluación o reparación guarda un evento inmutable con:
`{ tipo, actor: MiembroRef|null, actor_tipo: "persona"|"simulacion"|"sistema", ejecutado_por: MiembroRef|null, en: Momento (hora del servidor), estado_previo, estado_nuevo, version_previa, version_nueva, state_rev }`.
- `tipo` (lista cerrada): `propuesta_creada`, `propuesta_abierta`, `opcion_publicada`, `evaluacion_sin_opcion`, `aceptacion`, `baja`, `reparacion_publicada`, `reparacion_sin_alternativa`, `propuesta_cancelada`, `propuesta_expirada`. Evento de espacio (no aparece en `historial` de propuestas): `demo_reiniciada`.
- `actor_tipo:"sistema"` (solo `propuesta_expirada`): `actor` y `ejecutado_por` null.
- `actor_tipo:"simulacion"`: `actor` = miembro simulado; `ejecutado_por` = organizador del espacio.
- Ningún evento guarda texto libre, condiciones, motivos de elegibilidad ni ids de Auth.
- `mark_interest` y `save_my_conditions` no generan eventos.

---

## 3. Campos compartidos y privados

### 3.1 Lo que se comparte con todo miembro del espacio
Ficha (título, organizador, imprescindible, mínimo, máximo, franjas, plazo, zona horaria), estado y etiqueta, `state_rev`, versión vigente y su franja, `aceptaron` (nombres de quienes aceptaron la versión mostrada), cupos (cantidades), `interesados` (nombres), `personas_con_condiciones` (solo cantidad), `bajas` (nombres), `ultima_evaluacion` (resultado, sin motivo), `siguiente_accion`, `historial`, miembros del espacio (nombre, rol, simulado) y código de invitación.

### 3.2 Lo que NUNCA sale (lista cerrada)
Ninguna respuesta, mensaje de error, evento de historial ni registro del servidor (incluidos `RAISE` y logs de Postgres) contiene:
1. La disponibilidad (`"si"`/`"no"`/`"pendiente"`) de cualquier miembro distinto del llamador. Excepción única: `get_simulation_panel` y `simulate_save_conditions`, para el organizador del espacio y solo sobre miembros `simulado=true`.
2. El estado de condiciones (`sin_cargar`/`incompletas`/`completas`) de otro miembro con nombre. Solo se publica la cantidad agregada `personas_con_condiciones`.
3. La lista nominal de elegibles de una versión, o quién no fue elegible. Solo se publica `cupos.pendientes` (cantidad) y, a cada uno, su propio `elegible_en_version`.
4. Cantidades de elegibles por franja no elegida o de evaluaciones fallidas.
5. El motivo de un resultado "Sin opción" o `sin_alternativa` (por ejemplo, que el anfitrión no está disponible).
6. Los ids de usuario de Auth (`auth.uid()`), tokens o claves.
7. Los `p_intento_id` de otras personas.
8. Datos de espacios de los que el llamador no es miembro (ni siquiera si existen).

`mi_situacion`, `get_my_conditions` y el bloque `condiciones` de `save_my_conditions` contienen datos del propio llamador y solo se devuelven a él.

---

## 4. Los tres contadores

| Contador | Dónde aparece | Qué cuenta | Cuándo cambia | Uso en la interfaz |
|---|---|---|---|---|
| `contrato` | En toda respuesta, raíz del sobre | Versión de **este documento** (API). Hoy `1`. | Solo cuando el coordinador publica un cambio de contrato. | La interfaz tiene la constante `CONTRATO_ESPERADO = 1`. Si una respuesta trae otro valor: muestra "Versión incompatible: recarga la aplicación" y bloquea las acciones de escritura. |
| `opcion.version` | `EstadoPropuesta.opcion.version`, `PropuestaResumen.version`, `resultado.version` | Versión de la **opción del plan** dentro de una propuesta. 1 en la primera publicación, +1 en cada reparación publicada. "Sin opción" y `sin_alternativa` no la cambian. | `evaluate_and_publish` y `propose_repair` exitosos. | Se muestra como "Versión N". El botón Aceptar envía como `p_version` la versión **del estado que el usuario está viendo**, nunca una calculada. Si cambia la versión mostrada, se descarta cualquier confirmación local en curso y se muestra "Hay una versión nueva: las aceptaciones anteriores no cuentan". |
| `state_rev` | `EstadoPropuesta.state_rev`, `PropuestaResumen.state_rev`, errores sobre propuestas, `get_my_conditions`, `get_simulation_panel` | Revisión de **todo lo compartido** de una propuesta. Empieza en 1 y nunca baja. | Sube en 1 en cada cambio visible: abrir, interés, evaluación (con o sin opción), aceptación, baja, reparación (con o sin alternativa), cancelación, expiración. **No** sube con `save_my_conditions` ni con llamadas repetidas. | Por propuesta, la interfaz guarda el mayor `state_rev` aplicado. Aplica una respuesta solo si su `state_rev` es **mayor o igual** al guardado (igual se aplica porque `mi_situacion` puede haber cambiado); si es menor, la descarta (respuesta vieja que llegó tarde). Si un error trae un `state_rev` mayor al guardado, pide `get_proposal_state`. |

Refresco: no hay Realtime en este corte. Con la pantalla de una propuesta visible, la interfaz llama a `get_proposal_state` cada 3 segundos; con la lista visible, a `list_proposals` cada 10 segundos; y además inmediatamente después de cada error con `state_rev`. Si la lista muestra un `state_rev` mayor que el de la propuesta abierta, refresca la propuesta. Cada respuesta de escritura ya trae el `EstadoPropuesta` actualizado, así que no hace falta un refresco extra tras una escritura exitosa.

---

## 5. Seed del escenario canónico

`seed_demo_space` crea (ver 1.5):

| Dato | Valor |
|---|---|
| Espacio | "Los del asado", tipo `amigos`, `demo=true` |
| Organizador del espacio | Tomi (la sesión que llama al seed) |
| Miembros simulados | Luna, Mati, Caro, Fede, Sofi (en ese orden). Cualquiera puede reclamarse desde otro dispositivo uniéndose con el código y el mismo nombre. |

La propuesta **no** se siembra: Tomi la crea en vivo (paso 2). La interfaz ofrece el formulario precargado con estos valores exactos:

| Campo | Valor |
|---|---|
| `p_titulo` | "Asado en casa de Tomi" |
| `p_franjas` | A: `{"inicio":"2026-10-31T14:00","fin":"2026-10-31T17:00"}` (sábado 31 oct 2026, 14:00-17:00); B: `{"inicio":"2026-11-01T14:00","fin":"2026-11-01T17:00"}` (domingo 1 nov 2026, 14:00-17:00) |
| `p_minimo` / `p_maximo` | 4 (contando a Tomi) / 6 |
| `p_imprescindible_id` | Tomi |
| `p_plazo` | `"2026-10-29T20:00"` (jueves 29 oct 2026, 20:00) |
| `p_zona_horaria` | `"America/Santiago"` (visible en pantalla) |

Condiciones privadas del caso (cada persona carga solo las suyas; los simulados las carga Tomi con `simulate_save_conditions`):

| Persona | `p_disponibilidad` |
|---|---|
| Tomi | `{"A":"si","B":"si"}` |
| Luna | `{"A":"si","B":"si"}` |
| Mati | `{"A":"si","B":"si"}` |
| Caro | `{"A":"si","B":"no"}` |
| Fede | `{"A":"no","B":"si"}` |
| Sofi | `{"A":"no","B":"si"}` |

Resultado esperado del motor: versión 1 = franja A con 4 elegibles (Tomi, Luna, Mati, Caro). Tras la baja de Caro: A queda con 3 (no viable), B tiene 5 elegibles (Tomi, Luna, Mati, Fede, Sofi): versión 2 = franja B. El caso canónico narra que aceptan Tomi, Luna, Mati y Fede: con 4 aceptaciones y Tomi presente, el grupo se confirma; Sofi sigue pudiendo aceptar (quinto cupo) y no es necesaria.

Costo y lugar: no hay campos. El lugar va en el título; el aporte por persona queda fuera de este corte (pendiente, ver sección 8).

### 5.1 Recorrido canónico como secuencia de llamadas
Dispositivo 1 = Tomi (organizador). Dispositivo 2 = Luna (asiento reclamado). Mati, Caro, Fede y Sofi = Simulación desde el dispositivo de Tomi. `state_rev` esperado al final de cada llamada:

| Paso | Llamada | Quién | Resultado esperado | `state_rev` |
|---|---|---|---|---|
| 1 | `seed_demo_space` (o `reset_demo` si ya existe) | Tomi | espacio demo sin propuestas | - |
| 1 | `join_space("KQ7M2XPA","Luna")` | Luna | `reclamo_asiento_simulado: true` | - |
| 2 | `create_proposal(...)` + `open_proposal` | Tomi | `reuniendo_interes` | 1, 2 |
| 2 | `mark_interest(true)` | Luna | interesados 1, confirmados 0 | 3 |
| 2 | `simulate_mark_interest(Mati, true)` | Tomi | interesados 2, confirmados 0 | 4 |
| 3 | `save_my_conditions` (Tomi, Luna) y `simulate_save_conditions` (Mati, Caro, Fede, Sofi) | cada uno | `personas_con_condiciones` 6 | 4 (no sube) |
| 3 | `evaluate_and_publish` | Tomi | versión 1, franja A, `esperando_compromisos`, pendientes 4 | 5 |
| 4 | `accept_version(1)` | Luna | confirmados 1 | 6 |
| 4 | `simulate_accept(Mati,1)`, `simulate_accept(Caro,1)` | Tomi | confirmados 3, sigue `esperando_compromisos`, falta Tomi | 7, 8 |
| 4 | `accept_version(1)` | Tomi | `grupo_confirmado` (visible en ambos dispositivos al siguiente sondeo) | 9 |
| 5 | `simulate_withdraw(Caro)` | Tomi | `en_revision`, `efecto: pasa_a_revision`, Caro en `bajas` | 10 |
| 6 | `propose_repair` | Tomi | versión 2, franja B, `esperando_compromisos`, confirmados 0 | 11 |
| 6 | `accept_version(1)` con pantalla vieja | Luna | `opcion_desactualizada / version_no_vigente` | 11 |
| 6 | `accept_version(2)` Tomi; `accept_version(2)` Luna; `simulate_accept(Mati,2)`; `simulate_accept(Fede,2)` | Tomi, Luna | `grupo_confirmado` recién con la cuarta aceptación | 12, 13, 14, 15 |
| 7 (rama alternativa desde el paso 5, `state_rev` 10) | `save_my_conditions({"A":"no","B":"no"})` y luego `propose_repair` | Tomi | error `sin_alternativa`; sigue `en_revision`; mínimo intacto | 10, 11 |

---

## 6. Pruebas críticas

| Prueba crítica | Operaciones que la ejercen | Resultado esperado |
|---|---|---|
| Privacidad: otra sesión no lee condiciones ajenas | `save_my_conditions` (Tomi y Luna, sesiones reales distintas), `get_my_conditions`, `get_proposal_state`, `list_proposals`, `get_simulation_panel` (por Luna), consulta directa a tablas desde el cliente de Luna, errores provocados | `get_my_conditions` de Luna devuelve solo `{"A":"si","B":"si"}` suyo. Ninguna respuesta a Luna contiene la cadena de disponibilidad de Tomi ni los campos de 3.2. `get_simulation_panel` por Luna → `no_autorizado / no_es_organizador_espacio`. Consulta directa a tablas → 0 filas o error de permiso. Después de que Luna reclama su asiento, el panel de Tomi ya no la lista y `simulate_save_conditions` sobre Luna → `no_autorizado / miembro_no_simulado`. |
| Interés sin compromiso = 0 confirmados | `mark_interest`, `simulate_mark_interest`, `get_proposal_state` | `interesados.cantidad = 2`, `confirmados = 0`, `opcion = null`, estado `reuniendo_interes`. |
| Confirmación solo con Tomi presente | `accept_version`, `simulate_accept`; además un espacio de prueba con mínimo 3 | Caso: con Luna, Mati y Caro aceptados → `esperando_compromisos`, `imprescindible_acepto: false`; con Tomi → `grupo_confirmado`. Prueba: mínimo 3, tres no imprescindibles aceptan → sigue `esperando_compromisos` con `faltan_para_minimo: 0`; acepta el imprescindible → `grupo_confirmado`. |
| Doble clic no duplica | dos `accept_version` concurrentes con el mismo `p_intento_id`; luego otro con intento distinto | Ambas respuestas `ok`; exactamente una con `repetido: false`; `confirmados` sube en 1; un solo evento `aceptacion`. La tercera llamada (intento nuevo, misma versión) → `ok`, `repetido: true`, sin cambios. Mismo criterio para `create_proposal`, `evaluate_and_publish` y `propose_repair` con el mismo intento (una sola propuesta/versión). |
| Baja pasa a revisión | `simulate_withdraw(Caro)` en `grupo_confirmado` v1 | `en_revision`, `efecto: pasa_a_revision`, Caro en `bajas` con `habia_aceptado: true`, evento `baja` con actor Caro (Simulación), `ejecutado_por` Tomi y momento del servidor. `simulate_accept(Caro, ...)` posterior → `no_autorizado / retirado`. |
| Reparación sin aceptaciones heredadas | `propose_repair`, `get_proposal_state` | Versión 2, `aceptaron: []`, `confirmados: 0`, estado `esperando_compromisos` (nunca `grupo_confirmado` ni texto "Reparado" antes de nuevas aceptaciones). Con 3 aceptaciones de v2 sin Tomi sigue `esperando_compromisos`. |
| Versión vieja rechazada | `accept_version(p_version=1)` tras publicarse la 2 | `opcion_desactualizada / version_no_vigente` con `state_rev` actual; `confirmados` de v2 sin cambios. |
| Último cupo con dos sesiones | espacio de prueba (`create_space` + 2 `join_space` reales), mínimo 2, máximo 2; organizador imprescindible acepta; U1 y U2 `accept_version` concurrentes | Exactamente una `ok` y una `cupo_completo / sin_cupo`; `confirmados = 2 = maximo`; `grupo_confirmado`. |
| Aceptación fuera de plazo rechazada | espacio de prueba; `create_proposal` con `p_plazo` = `servidor_ahora.local` + 20 s y franjas a futuro; `open_proposal`, condiciones, `evaluate_and_publish`; esperar a que pase el plazo; `accept_version` | `plazo_vencido`; `get_proposal_state` → `expirado`, `plazo_vencido: true`, evento `propuesta_expirada` con `actor_tipo: "sistema"`. |
| Reinicio de demo aislado | dos sesiones (Tomi1, Tomi2) con `seed_demo_space` cada una y una propuesta cada una; `reset_demo` por Tomi1; `reset_demo` por Luna; `reset_demo` sobre un espacio no demo | Espacio de Tomi1 sin propuestas, miembros intactos, `ultimo_reinicio` actualizado. Propuesta de Tomi2 intacta con el mismo `state_rev`. Luna → `no_autorizado / no_es_organizador_espacio`. No demo → `no_autorizado / espacio_no_demo`. |
| Contraejemplo: sin opción compatible | rama del paso 7 (`save_my_conditions` de Tomi + `propose_repair`); y `evaluate_and_publish` en espacio de prueba con imprescindible sin disponibilidad | `sin_alternativa` (reparación) / `resultado.tipo = "sin_opcion"` (evaluación); el mínimo y el máximo no cambian; no se crea versión. |
| Baja que conserva el acuerdo | v2 confirmada con Tomi, Luna, Mati, Fede; `simulate_accept(Sofi,2)`; `simulate_withdraw(Sofi)` | Sigue `grupo_confirmado`, `efecto: acuerdo_conservado`, Sofi en `bajas`, `confirmados = 4`. |

---

## 7. Cortes verticales (en orden)

Cada corte incluye backend (carpeta del dueño de backend, por ejemplo `supabase/`) e interfaz (`src/`). La interfaz puede avanzar antes que el backend usando como datos falsos los ejemplos de este documento, dentro de su propia carpeta. Un corte está terminado solo si su prueba de aceptación se corrió contra el proyecto `tjkfdnvzsikncjbskufm` y pasó.

| # | Corte | Operaciones | Prueba de aceptación |
|---|---|---|---|
| C0 | Conexión y sobre | `server_info`; sesión anónima | Con `.env` cargado, un cliente anónimo llama a `server_info` y recibe `ok: true`, `contrato: 1`, `sesion.autenticada: true`. Sin sesión, `create_space` devuelve `sesion_invalida`. Una consulta directa a cualquier tabla devuelve 0 filas o error. |
| C1 | Espacios y seed | `create_space`, `join_space`, `list_my_spaces`, `get_space`, `seed_demo_space`, `add_simulated_member` | Sesión T llama dos veces a `seed_demo_space`: mismo `espacio_id`, segunda con `repetido: true`, 6 miembros (5 simulados). Sesión L se une con el código y "Luna": `reclamo_asiento_simulado: true`, Luna `simulado: false`. Una tercera sesión con "Luna" → `nombre_en_uso`. Código inválido → `codigo_inexistente`. La interfaz muestra el espacio con el rótulo "Simulación" en los simulados. |
| C2 | Propuesta, interés y estado compartido | `create_proposal`, `open_proposal`, `list_proposals`, `get_proposal_state`, `mark_interest`, `simulate_mark_interest`, `cancel_proposal` | Tomi crea la propuesta canónica (dos veces con el mismo intento: una sola propuesta), la abre; Luna y Mati (simulado) marcan interés: `interesados.cantidad = 2`, `confirmados = 0`. Validaciones: 3 franjas → `franjas_invalidas`; mínimo 5 máximo 4 → `cupos_invalidos`; zona "UTC" → `zona_horaria_no_soportada`. La interfaz muestra ficha, estado, hora de Santiago y `siguiente_accion`, y refresca cada 3 s descartando `state_rev` menores. |
| C3 | Condiciones privadas y evaluación | `save_my_conditions`, `get_my_conditions`, `simulate_save_conditions`, `get_simulation_panel`, `evaluate_and_publish` | Prueba de privacidad (sección 6) completa. Con las condiciones del caso, `evaluate_and_publish` → versión 1, franja A, `pendientes: 4`. Contraejemplo en espacio de prueba → `sin_opcion`. Disponibilidad con clave "C" → `disponibilidad_invalida`. |
| C4 | Aceptación | `accept_version`, `simulate_accept` | Pruebas: confirmación solo con Tomi, doble clic, último cupo con dos sesiones, aceptación fuera de plazo. Paso 4 del recorrido: `grupo_confirmado` visible en los dos dispositivos dentro de 3 s. |
| C5 | Baja y reparación | `withdraw_commitment`, `simulate_withdraw`, `propose_repair` | Pruebas: baja pasa a revisión, reparación sin heredadas, versión vieja rechazada, baja que conserva el acuerdo, rama del paso 7 con `sin_alternativa`. La interfaz nunca muestra "Reparado". |
| C6 | Reinicio de demo y recorrido completo | `reset_demo`, todas | Prueba de reinicio aislado. Recorrido 5.1 completo desde `reset_demo` hasta la versión 2 confirmada, con los `state_rev` de la tabla 5.1, en dos dispositivos. Historial con actor, versiones y momento en cada transición. |

---

## 8. Pendientes y decisiones a confirmar

1. **"Versión del contrato"** se interpretó como la versión de este documento/API (campo `contrato`), distinta de la versión de la opción y de `state_rev`. Si el equipo quería decir otra cosa (por ejemplo, la versión de la ficha de la propuesta), hay que decidirlo antes de C2. No existe operación para editar la ficha en este corte.
2. **Sofi en la versión 2**: el caso canónico dice "B como versión 2, con Tomi, Luna, Mati y Fede", pero con sus propias reglas Sofi (solo B) también es elegible en B. Este contrato la incluye como elegible (pendientes 5) y confirma el grupo con las 4 aceptaciones narradas. Si se quiere que v2 tenga exactamente 4 personas, hay que cambiar el caso o la regla.
3. **Privacidad de la lista de elegibles**: el caso narra "A con Tomi, Luna, Mati y Caro". Para no revelar disponibilidad ajena, la vista compartida solo muestra quién aceptó y la cantidad de pendientes; cada persona ve si ella es elegible; el organizador ve a los simulados en el panel. Confirmar que esto alcanza para la narración de la demo.
4. **`create_space` recibe un tercer parámetro** (`p_nombre_visible`) para el nombre del creador; el encargo listaba solo nombre y tipo.
5. **Costo**: el caso menciona "aporte fijo conocido por persona, o costo cero". No hay campo; queda fuera de este corte salvo que se decida agregarlo a la ficha.
6. **Inicio de sesión anónimo**: debe estar habilitado en el proyecto (Auth). No verificado por el coordinador. Supabase limita por defecto los inicios de sesión anónimos por IP y por hora: las pruebas deben reutilizar pocas sesiones; si el límite molesta, ajustarlo es una decisión humana.
7. **Exactamente 2 franjas** en este corte (el motor está definido para cualquier cantidad, pero la validación exige 2).
8. **Baja en `grupo_confirmado` que rompe el mínimo con pendientes posibles**: pasa a `en_revision` (requiere nueva versión), según el caso. Alternativa no adoptada: volver a `esperando_compromisos` con la misma versión.
