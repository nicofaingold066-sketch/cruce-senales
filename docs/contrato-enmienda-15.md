# Enmienda 15: ronda de opiniones con plazo (E-c) y dos planes con "la que más Sí" (E-d)

**APROBADA por el coordinador (pedido de Nico 23:50)**, el sábado 24 oct a las 00:0x, con los ajustes obligatorios de la sección "Ajustes del coordinador" (mandan sobre el texto donde choquen).

Borrador de **pendientes** (viernes 23 oct, 23:57), por pedido de Nico a las 23:50 (excepción explícita al cierre de funciones). Base del diseño: `docs/output-debate.md` §2.2 a §2.4 y §3.2 (ux-flujo). `contrato` sigue en 2.

Principios: todo es **opcional y con valor por defecto igual a hoy**. Ningún cliente, guion e2e ni prueba vieja cambia de resultado; "Los del finde" no cambia (no manda ninguno de los parámetros nuevos). Ninguna RPC nueva: la lista permitida sigue en 41 para `authenticated` y 0 para `anon`. Una sola firma cambia (`create_proposal`, dos parámetros opcionales al final, patrón 0048). Interés no es confirmación; una confirmación vale para UNA versión; el servidor decide plazos, regla y ganador; la interfaz solo muestra.

## (E-c) Ronda de opiniones con plazo

**Qué es.** Cuando se publica una versión, el organizador puede haber pedido una ronda de 2, 12 o 24 horas para que el grupo diga "así no puedo, pero sigo" (E13) antes de rearmar. Mientras la ronda está abierta nadie rearma por una sola queja temprana; al cerrar, se ve el total y el organizador decide. Aceptar la versión sigue abierto todo el tiempo (hasta el cierre de aceptación, como hoy).

**Entrada.** `create_proposal(..., p_actividad text default null, p_regla text default null, p_ronda_horas integer default null)`.
- `p_ronda_horas`: `null` (sin ronda: hoy) o `2`, `12`, `24`. Otro valor → `entrada_incompleta/formato_invalido` (bloque de forma).
- Entra en los parámetros del intento **solo si viene** (los intentos de antes siguen valiendo, como `p_actividad`).
- Columna `cruce.propuestas.ronda_horas integer null check (ronda_horas in (2, 12, 24))`.

**Cierre (lo decide el servidor).** Columna `cruce.versiones.ronda_cierra timestamptz null`. Al publicar CUALQUIER versión (`evaluate_and_publish`, `propose_repair` desde `en_revision` o desde `esperando_compromisos`) con `ronda_horas` no nulo: `ronda_cierra = publicada_en + ronda_horas`. **Nunca después del cierre de aceptación:** si `publicada_en + ronda_horas >= plazo`, esa versión queda **sin ronda** (`ronda_cierra = null`, se comporta como hoy). Así nada queda trabado hasta que la propuesta vence. Cada versión nueva abre su propia ronda, con las mismas horas.

**Qué cambia mientras la ronda está abierta** (`cruce.ahora() < ronda_cierra` de la versión vigente):
- `opinar_version` sigue igual (solo se puede opinar con la ronda abierta o sin ronda).
- `propose_repair` desde `esperando_compromisos` (E13 b, rearmar) → `opcion_desactualizada/ronda_abierta` (detalle nuevo, mensaje fijo: "La ronda de opiniones sigue abierta. Cuando cierre vas a poder rearmar con lo nuevo."). `mi_situacion.puede.proponer_reparacion` en `esperando_compromisos` es `false` mientras está abierta. Desde `en_revision` (después de una baja) **no cambia**: "Buscar alternativa" no espera la ronda.

**Con la ronda cerrada** (`cruce.ahora() >= ronda_cierra`):
- `opinar_version` → `plazo_vencido/ronda_cerrada` (detalle nuevo, mensaje fijo: "La ronda de opiniones ya cerró. Todavía puedes confirmar o retirarte."). `puede.opinar = false`. Las opiniones ya dadas siguen valiendo.
- Rearmar vuelve a la regla de E13 (≥1 opinión que vale para el servidor; el booleano con ≥2). `siguiente_accion` del organizador: el texto existente "Algunos no pueden así: puedes rearmar con lo nuevo." (sin código nuevo).

**Salida** (toda respuesta que trae la propuesta completa vía `cruce.vista_propuesta`: `get_proposal_state` y las escrituras; aditivo): en la raíz `ronda = {horas: 2|12|24, cierra: {utc, local}, abierta: boolean} | null`, de la versión vigente. Es pública (es la agenda del plan, no dice nada de nadie). `null` sin ronda pedida, sin versión publicada o cuando no cupo antes del cierre. La interfaz muestra "Opiniones hasta las 22:00" con `cierra` y nunca calcula `abierta`.

## (E-d) Dos planes con etiqueta y regla "la que más Sí"

**Qué es.** Hoy A y B son dos horarios de un mismo plan y gana la franja viable más temprana. Con E-d cada franja puede ser un plan con nombre ("Asado en lo de Tomi" / "Picnic en el parque") y el organizador puede pedir que gane **la viable con más Sí**. Cada persona responde como hoy (Sí/No por plan, en privado) y, si puede en los dos, puede decir cuál prefiere.

**Etiqueta.** En `p_franjas` cada objeto acepta `etiqueta` opcional (string). Se recorta; vacía → `null`; más de 40 caracteres o no string → `entrada_incompleta/formato_invalido`. Sin cambio de firma (ya entra en el intento con `p_franjas`). Columna `cruce.franjas.etiqueta text null check (char_length(etiqueta) between 1 and 40)`. La vista suma `etiqueta` (o `null`) en cada franja y en `opcion` (la franja publicada). Es pública, como el título.

**Regla.** `p_regla`: `null` o `temprana` (hoy) o `mas_si`. Otro valor → `entrada_incompleta/formato_invalido`. Solo en el intento si viene. Columna `cruce.propuestas.regla text not null default 'temprana' check (regla in ('temprana', 'mas_si'))`. La vista suma `propuesta.regla`.

**Motor** (`cruce.motor`, lo usan `evaluate_and_publish` y `propose_repair`; la viabilidad NO cambia: mínimo con el imprescindible entre los elegibles):
- `temprana`: exactamente la de hoy (inicio más temprano; empate por clave).
- `mas_si`: entre las viables, la que tiene **más elegibles** (Sí con condiciones completas, sin retirados); empate → **la que más prefieren** (abajo); empate → la más temprana; empate → clave.

**"Prefiero este plan" (el desempate).** Dentro de la disponibilidad privada, clave opcional `prefiero: 'A' | 'B'` en `save_my_conditions` / `simulate_save_conditions` (`p_disponibilidad = {A: 'si', B: 'si', prefiero: 'B'}`). `cruce.validar_disponibilidad` la admite solo con esos valores (otro → `entrada_incompleta/disponibilidad_invalida`, como hoy); `condiciones_estado` la ignora (completas sigue siendo A y B en si/no). Solo cuenta en `mas_si` y solo si la persona es elegible en las dos franjas; si no, se guarda y se ignora. Es privada como el resto de la disponibilidad: solo la persona la lee (y el organizador, la de sus simulados, como hoy). Texto sugerido en Mi respuesta, solo con `regla = 'mas_si'` y las dos en Sí: "Si te sirven los dos, ¿cuál prefieres?". Nota: "Prefiero el otro plan" como opinión DESPUÉS de publicar (`opinar_version` con `prefiero_otro`) **no entra** en esta enmienda: con la preferencia antes de evaluar el desempate ya ocurre en el motor y no hace falta rearmar; queda como siguiente paso.

**Totales (privacidad).** Solo para el organizador de la propuesta y solo con `regla = 'mas_si'`, en la raíz: `planes_totales = {A: {si: n|null, prefieren: n|null}, B: {...}} | null`. Cuenta solo a los DEMÁS (sin el organizador, como E7.4 y 0047), entre quienes no se retiraron y tienen condiciones completas. Cada número es `null` si es menor que 2. Para todos los demás, `planes_totales = null`. **Nunca quién eligió qué**, en ninguna respuesta, error ni log. El grupo ve solo la opción publicada (su etiqueta y sus elegibles, como hoy).

## Lo que NO cambia
- Viabilidad, cupos, plazo, imprescindible, aceptación por versión, cero aceptaciones heredadas, tope de 3 versiones, baja sin nombre (E13), propósito y actividad (E14), agente social (E11: `publicar_borrador_agente` sigue sin ronda ni regla: llama a `create_proposal` sin los parámetros nuevos).
- Sin ronda y con `temprana`, todo es byte a byte lo de hoy (salvo los campos nuevos `ronda: null`, `regla: 'temprana'`, `etiqueta: null`, `planes_totales: null`).

## Migraciones (de a una, MIGRACION EN CURSO, commit y push inmediato)
Numeración corrida (00:10): la 0051 es la fiesta con domingo (pedido de Nico 00:01, ver enmienda 14, ajuste 8); la E15 pasa a 0052 (E-c) y 0053 (E-d).
- **0052 `e15_ronda_con_plazo`**: columnas `ronda_horas` y `ronda_cierra`, firma de `create_proposal` con los DOS parámetros nuevos (para cambiar la firma una sola vez; `p_regla` se valida y se guarda ya en la 0052, la columna `regla` entra acá), `publicar_version` con `ronda_cierra`, `opinar_version`, `propose_repair`, `puede.*`, `ronda` en la vista, mensajes de `ronda_abierta` y `ronda_cerrada`. Lista 41/0, `verificar_privilegios()` sin hallazgos.
- **0053 `e15_dos_planes`**: `franjas.etiqueta`, `validar_disponibilidad` con `prefiero`, motor `mas_si`, `etiqueta` y `regla` en la vista, `planes_totales`. Si E-d se complica, la 0052 queda sola y `p_regla = 'mas_si'` se rechaza con `formato_invalido` hasta la 0053 (la interfaz no lo ofrece hasta el aviso).

## Pruebas mínimas (`tests/backend/enmienda15.test.ts`, base real, datos ficticios, en serie, sin ráfagas ni concurrencia)
1. **Compatibilidad:** `create_proposal` sin los parámetros nuevos → `ronda: null`, `regla: 'temprana'`, `etiqueta: null` en las dos franjas, `planes_totales: null`; motor igual que hoy. Recorrido canónico de "Los del finde" sin cambios (`aceptacion-reparacion` y `enmienda13` en verde sin tocarlas).
2. **Forma:** `p_ronda_horas = 5` → `formato_invalido`; `p_regla = 'x'` → `formato_invalido`; etiqueta de 41 → `formato_invalido`; etiqueta "  " → `null`; `prefiero: 'C'` → `disponibilidad_invalida`; mismo intento con otra ronda → `intento_reutilizado`.
3. **Ronda abierta:** con 2 h y plazo a 3 días: `ronda.cierra = publicada + 2 h`, `abierta: true`; dos "así no puedo" → `opiniones_totales.asi_no_puedo = 2` pero `puede.proponer_reparacion = false` y `propose_repair` → `opcion_desactualizada/ronda_abierta`; aceptar sigue funcionando.
4. **Ronda que no cabe:** 24 h con plazo a 2 h → `ronda: null`, rearmar como E13.
5. **Ronda cerrada:** comprobación manual (SQL sobre una propuesta de prueba propia, moviendo `ronda_cierra` al pasado; no hay forma de esperar 2 h en la suite): `opinar_version` → `plazo_vencido/ronda_cerrada`, rearmar habilitado, la versión N+1 abre su ronda nueva.
6. **`mas_si`:** A con 4 Sí y B con 5 Sí (las dos viables) → gana B aunque A sea más temprana; empate 4/4 con 2 `prefiero: 'B'` y 1 `prefiero: 'A'` → B; empate total → A (temprana). Con `temprana`, mismos datos → A.
7. **Privacidad:** `planes_totales` solo al organizador; `null` con 1; sin el voto del organizador; ningún nombre ni `prefiero` ajeno en ninguna respuesta (otra sesión lee el estado y su JSON no contiene `prefiero`).
8. Catálogo 41/0, una firma por nombre, `search_path=''`, `verificar_privilegios()` sin hallazgos; suite completa en serie en verde.

## Puente (`src/lib/types.ts`, `src/lib/api.ts`, antes de migrar, todo opcional)
- `CrearPropuestaParams.regla?: 'temprana' | 'mas_si'`, `rondaHoras?: 2 | 12 | 24`, `franjas[].etiqueta?: string` (se mandan solo si vienen).
- `EstadoPropuesta.ronda?: {horas, cierra, abierta} | null`, `regla?`, `planes_totales?`, franjas y `opcion` con `etiqueta?: string | null`; `Disponibilidad.prefiero?: 'A' | 'B'`; textos fijos de `ronda_abierta` y `ronda_cerrada`.
- Pedido a **frontend** (con la línea exacta, al publicar el puente): en Nueva propuesta, selector "Ronda de opiniones: sin ronda / 2 h / 12 h / 24 h", etiqueta por franja y "Gana: la más temprana / la que más pueden"; en Mi respuesta, "¿cuál prefieres?" con las dos en Sí; en el plan, "Opiniones hasta las HH:MM" y la etiqueta de la opción. Si no llegan antes del congelamiento de las 11:00, la base queda lista y nada cambia en pantalla.

## Plazos
Borrador 00:20 → OK del coordinador → 0052 (E-c) aplicada y en verde, después 0053 (E-d); las dos antes de las 04:00. Si E-d se complica, se entrega E-c sola. Límite duro 09:00; nada de 10:00 a 11:00; ninguna migración después de las 12:00.

## Ajustes del coordinador (obligatorios)
1. Mientras la ronda está abierta, el `siguiente_accion` del organizador NO invita a rearmar: "Algunos no pueden así: puedes rearmar con lo nuevo." sale solo con la ronda cerrada o sin ronda; con la ronda abierta queda el texto de espera de hoy. Va en la prueba 3.
2. `planes_totales` se calcula para quien llama, en `get_proposal_state` y en `list_proposals`. Prueba 7: otra sesión miembro lee las dos y recibe `null`; el JSON de las dos no contiene `prefiero` ni nombres.
3. `prefiero` dentro de la disponibilidad: antes de la 0053, revisar que nada recorra las claves de la disponibilidad como si fueran franjas (lista abajo). Si algo las recorre, filtrar `prefiero`. Si se complica, E-d sale sin `prefiero` y el desempate es el más temprano.
4. Cambio de firma de `create_proposal`: `publicar_borrador_agente` la llama con argumentos posicionales; los dos nuevos van AL FINAL con default, una sola firma. Las suites de enmienda11 y del agente social tienen que dar verde después de la 0052.
5. Antes de aplicar cada migración, el SQL para volver atrás queda escrito (cuerpos anteriores de cada función y `drop column`). Ver "Reversa".
6. No migrar mientras otra ficha diga CORRIENDO PRUEBA.
7. `plazo_vencido/ronda_cerrada` está bien: ante `plazo_vencido` el cliente solo refresca (`src/lib/hooks.ts:253`), y con `puede.opinar = false` el botón no aparece.

### Quién lee las claves de la disponibilidad (ajuste 3, revisado por pendientes 00:1x)
- Servidor: `cruce.validar_disponibilidad` (0002) RECHAZA toda clave que no sea A/B: hay que admitir `prefiero` ahí. `cruce.disp_normalizada` (0002) arma un objeto nuevo solo con A y B: todo lo que sale por ella (`get_my_conditions`, respuesta de `save_my_conditions`, panel de simulación 0005:448 y 0011:910) no trae `prefiero`. `cruce.condiciones_estado` y `cruce.elegibles_franja`/`cruce.motor` leen por clave (`->> 'A'`, `->> p_clave`): inofensivos. `cruce.op_save_conditions` guarda `disp_normalizada(p_disp)`: hoy descartaría `prefiero`, hay que guardarlo aparte del normalizado. `simulate_load_case` (0012:141) escribe disponibilidades fijas A/B: inofensivo. Ningún `jsonb_each`/`jsonb_object_keys` sobre la disponibilidad (los de 0015, 0035 y 0037 son de preferencias).
- `supabase/functions/agente/**`: no lee disponibilidades (solo las nombra en textos del modelo).
- Cliente: `src/friccion/Responder.tsx:197,214` (`Object.values(...).includes('si')`, inofensivo), Responder `:264` y `src/screens/SimulacionTab.tsx:265` leen por clave de franja.
- Decisión para la 0053: la disponibilidad que DEVUELVE el servidor sigue siendo exactamente `{A, B}` (nada cambia para ningún cliente); `prefiero` se guarda junto a la disponibilidad y vuelve SOLO a la propia persona en un campo hermano `condiciones.prefiero` (`'A' | 'B' | null`). Así ningún consumidor que recorra la disponibilidad lo ve.

## Reversa (ajuste 5)
- **0052**: `supabase/revertir/0052_revertir.sql` (no es migración; se corre a mano en una transacción). Recrea con sus cuerpos anteriores `create_proposal` de 10 parámetros (0048), `opinar_version` (0042), `propose_repair` y `cruce.situacion` (0047), `cruce.siguiente_accion_personal` (0050), `cruce.mensaje` (0048) y `cruce.publicar_version` (0011); devuelve `cruce.vista_propuesta_base` al cuerpo de 0029 (renombrado `vista_propuesta_base_e14` en la 0052); borra `cruce.ronda_json/ronda_abierta/ronda_cerrada` y las columnas `versiones.ronda_cierra`, `propuestas.regla` y `propuestas.ronda_horas`; termina con `verificar_privilegios()`.
- **0053**: `supabase/revertir/0053_revertir.sql` (se escribe antes de aplicarla).

## Implementación (pendientes, sáb 24 oct)
- **0051 fiesta** (pedido de Nico 00:01, no es E15 pero corre la numeración): aplicada 00:27. Ver enmienda 14, ajuste 8.
- **0052 E-c** aplicada a las 01:17 en `tjkfdnvzsikncjbskufm`. Se aplicó el SQL sin las líneas de comentario; el md5 de las 11 funciones en la base es igual al del archivo. Lista 41 `authenticated` / 0 `anon`, 0 funciones de `cruce` ejecutables, `verificar_privilegios()` sin hallazgos. `cruce.vista_propuesta_base` de 0029 quedó intacta como `vista_propuesta_base_e14` y la nueva la envuelve.
- Pruebas (base real, en serie, sin las 4 de concurrencia, sin las de E-d): suite completa 01:17:46–01:21:15, 100 ok y 1 falla de la propia prueba (el organizador sin aceptar ve "te toca confirmar" antes que "rearmar", como en E13); corregida y repetidas enmienda11, 13 y 15: 16/16 (01:21:25–01:22:06). `enmienda11` (agente social, `publicar_borrador_agente` llama a `create_proposal` por posición) en verde (ajuste 4).
- Cierre de la ronda verificado a mano (01:2x) en una transacción con ROLLBACK, sobre propuestas de prueba propias, moviendo `ronda_cierra` al pasado: `opinar_version` → `plazo_vencido/ronda_cerrada` con su mensaje; `ronda.abierta = false`, `puede.opinar = false`; el organizador (que ya aceptó) ve `puede.proponer_reparacion = true` y "Algunos no pueden así: puedes rearmar con lo nuevo."; `propose_repair` publica la v2 con 0 confirmados, totales en null y ronda nueva de 2 h abierta. En una propuesta cuyo cierre de aceptación está a 1 h, la v2 sale sin ronda (no cabe). Después del ROLLBACK, `ronda_cierra` quedó como estaba.
- **0053 E-d** aplicada a las 01:35 (base libre tras la tanda del coordinador). SQL sin las líneas de comentario; md5 de las 7 funciones en la base = archivo. 41/0, 0 de `cruce` ejecutables, `verificar_privilegios()` sin hallazgos. Antes de aplicar se verificó que las 6 funciones que reemplaza seguían iguales al repo.
- Pruebas (base real, en serie, sin las 4 de concurrencia): suite completa 01:35:17–01:40:17, 100 ok; la única falla fue `enmienda9` en su `beforeAll` (`signInAnonymously`: Gateway Timeout del servicio de autenticación), repetida sola 6/6 (01:40:27). `enmienda15` completa 7/7 (01:40:46–01:41:04): E-c 1 a 4, E-d 5 (etiqueta y `prefiero`, la disponibilidad que sale sigue siendo {A, B}), 6 (`mas_si`: más Sí; empate por preferencia; empate total, la más temprana; la preferencia de quien no puede en las dos no cuenta; `temprana` igual que siempre) y 7 (`planes_totales` solo al organizador, sin contarlo, null con 1; otra sesión no ve `prefiero` ni `planes_totales` en `get_proposal_state` ni en `list_proposals`).
- Puente: `src/lib/types.ts` y `src/lib/api.ts` (`wip/pendientes`): `regla`, `rondaHoras`, `etiqueta`, `prefiero` (tercer/cuarto parámetro de `saveMyConditions`/`simulateSaveConditions`), `Condiciones.prefiero`, `EstadoPropuesta.ronda/regla/planes_totales`, `Franja.etiqueta`. Ya se pueden mandar.
