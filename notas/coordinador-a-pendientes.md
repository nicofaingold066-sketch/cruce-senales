# Coordinador → pendientes (sábado 24, 00:09)

Copia escrita de los tres mensajes que te mandé por SendMessage (por si no te llegaron).

## 1. Enmienda 15: APROBADA con 7 ajustes obligatorios
Copiá el borrador a `docs/contrato-enmienda-15.md` con un encabezado "APROBADA por el coordinador (pedido de Nico 23:50)" y una sección "Ajustes del coordinador" con estos 7 puntos.
1. Con la ronda abierta, el `siguiente_accion` del organizador NO invita a rearmar ("Algunos no pueden así: puedes rearmar con lo nuevo." solo con la ronda cerrada o sin ronda). Con la ronda abierta, el texto de espera de hoy. Va en la prueba 3.
2. `planes_totales` se calcula para quien llama, en `get_proposal_state` y en `list_proposals` (`cruce.vista_propuesta`). En la prueba 7, otro miembro lee las dos y recibe `null`, sin `prefiero` ni nombres en el JSON.
3. Si `prefiero` va dentro de la disponibilidad, antes de la 0052 revisá que nada recorra sus claves como si fueran franjas. Cliente: `src/friccion/Responder.tsx:197` y `:214` (`Object.values(...).includes('si')`) son inofensivos; Responder `:264` y `SimulacionTab` leen por clave de franja. Servidor: `validar_disponibilidad`, `condiciones_estado`, motor, `simulate_save_conditions` y `supabase/functions/agente/**` (solo leer). Dejá la lista en el contrato. Si algo recorre las claves, filtrá `prefiero`. Si se complica, E-d sale sin `prefiero` y desempata la franja más temprana.
4. `create_proposal`: `publicar_borrador_agente` (0041:647) la llama con 9 argumentos posicionales. Los dos parámetros nuevos van AL FINAL con default, en una sola firma. Las suites de enmienda11 y agente-social tienen que dar verde después de la 0051.
5. Antes de aplicar cada migración, dejá escrito en el contrato el SQL para volver atrás (cuerpos anteriores de las funciones y `drop column`). Es la única base y Nico la usa.
6. No migres mientras otra ficha diga CORRIENDO PRUEBA. Yo corro un turno ahora (00:09, unos 8 minutos, para publicar el panel de agente-ia y frontend 42ac29f); esperá que lo saque.
7. `plazo_vencido/ronda_cerrada` está bien: el cliente, ante `plazo_vencido`, solo refresca (`src/lib/hooks.ts:253`), y como `puede.opinar` queda en `false`, el botón no aparece.

## 2. Pieza A del agente social
NO armes el camino "solo servidor": duplicaría `codex/e11-circuito` `8b970a9`, y Nico quiere que redacte la IA. Tu parte de A va después de la E-c: (1) la revisión de solo lectura que ya hiciste (00:05, gracias) y (2) una corrida por RPC del circuito, sin modelo, en tu turno: iniciar → candidatos → guardar un borrador de texto fijo → aprobar → publicar → la invitación aparece en `mi_situacion` de quien aceptó. Espacio ficticio propio; el resultado va a tu ficha.

## 3. PEDIDO DE NICO (00:01): la fiesta en su horario de noche, ANTES de la E-c
Hoy nunca es candidata: el filtro de `proponer_plan_borrador` (0050:232) es `cat.sab_inicio is not null and cat.dom_inicio is not null`, y `evento-sim-01` (0014:36) solo tiene el sábado de 23:00 a 03:00. El paso de la medianoche ya está en `plan_franjas` (`fin <= inicio` suma 1 día).
1. Migración chica de datos (próximo número libre; corré la numeración de la E15), con MIGRACION EN CURSO: domingo de 22:00 a 02:00 para `evento-sim-01`; el sábado queda igual. El título pasa de "Fiesta del sábado" a "Fiesta en un bar". El nombre sigue terminando en "(Simulación)".
2. ANTES de aplicarla, simulá en una transacción con ROLLBACK, como quien organiza "Los del asado" (claims de su uid, sin escribir nada), las candidatas de `proponer_plan_borrador` antes y después, con propósito libre, sol y el sábado de la demo. Si cambian las 3 candidatas, NO apliques: mandame el antes y el después, y decide Nico. Si no cambian, aplicala.
3. Probá también un grupo ficticio propio de 6 o más personas con "Salida / noche" o "Fiesta" y preferencias de noche: la fiesta tiene que salir candidata, con franjas sábado 23:00–03:00 y domingo 22:00–02:00 (fin al día siguiente).
4. Actualizá la prueba de la enmienda 14 que dice que la fiesta nunca es candidata. Lista 41/0 y `verificar_privilegios()` sin hallazgos.
5. En el contrato de la enmienda 14, ajuste 8, anotá que se levantó el límite (pedido de Nico, 00:01).
Avisame cuando esté aplicada. friccion ya tiene el cambio del selector en `wip/friccion` `9e5aec2`; lo integro recién después.

Ojo: `npx vitest run` también corre `tests/backend/**` contra la base. Para las pruebas puras usá `npx vitest run src $(ls tests/*.test.ts)`.
