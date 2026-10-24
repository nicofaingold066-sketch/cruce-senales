# QA de gente y rendimiento (qa-gente, 24 oct 2026, 08:00–08:50 Santiago)

Producción: https://cruce-senales.vercel.app. Corridas A–D iniciales sobre `main` `7f47a88` (08:02–08:19); tanda completa de regresión sobre `9364cd8` (08:31–08:43, intro nueva); guía (h) y repetición de (e) sobre `9a15539` (08:44–08:50).
Guiones en `tests/qa-gente/` (`node tests/qa-gente/<guion>.mjs [url]`; cada uno toma turno de base, corre ≤10 min y suelta). Registros de la tanda en `docs/qa/logs/`. Capturas en `docs/qa/capturas/`.
Todo ficticio (grupos «Dúo/Trío/Veinte/Treinta… <hhmm>», nombres inventados), sin agente de IA, sin borrar nada, sin `service_role`. Los grupos creados quedan en la base (no se borran).

**Resumen: 7 bloques, 150 verificaciones, 0 defectos graves. Un solo comportamiento contradice lo pedido (no hay tope de 20 en el grupo) y hay 5 hallazgos de gravedad media/baja.** Ningún 500, ningún `57014`, ningún sobrecupo, ninguna confirmación doble en las carreras.

## Tabla de escenarios

| Ángulo | Personas | Resultado | p50 / p95 (ms) | Errores |
|---|---|---|---|---|
| a1 grupo de 2, mínimo 2: ambos responden, confirman, ¡Se juntan! | 2 | PASS (13 s de punta a punta) | create_space 180/265, save_my_conditions 169/208, accept_version 208/226 | 0 |
| a2 grupo de 3, mínimo 3, nadie responde | 3 | PASS: **no hay botón «Buscar opción compatible»**; la pantalla dice «Primero marca tu disponibilidad: eres quien no puede faltar» | get_proposal_state 125/227 | 0 |
| a2b solo responde la organizadora y busca | 3 | PASS: «Sin opción compatible con las condiciones actuales. Se puede esperar más disponibilidad o cancelar», sin versión | evaluate_and_publish 160/262 | 0 |
| a3 uno dice «No puedo ninguno», mínimo 3 | 3 | PASS: sin «Confirmar versión»; «3 de 3 respondieron» y mensaje de sin opción | – | 0 |
| a4 la organizadora (imprescindible) se retira con versión publicada | 3 | PASS: «En revisión · Una persona se retiró», sin nombre, el invitado ve «La versión 1 ya no reúne lo necesario» | – | 0 |
| a5 cancelar con respuestas cargadas | 3 | PASS: «Cancelado» para todos, sin botones de confirmar | cancel_proposal 120/120 | 0 |
| b0–b8 grupo de 20 (12 por lista + 7 por «No estoy en la lista» + organizadora): entran, responden, confirman | 20 | PASS: «20 de 20 respondieron», versión publicada en 0,4–0,9 s, 19 confirmaciones en 6 s, ¡Se juntan! | join_space 133–140/206–248, save_my_conditions 149–153/226–276, accept_version 139–209/367–496; entrar→¿Cuándo puedes? 2,2–2,6 s / 8,2–8,4 s (5 a la vez) | 0 |
| b7 persona 21 | 21 | **HALLAZGO H1**: no se rechaza; entra al grupo («21 personas») y el plan dice «Cupos disponibles: 0» sin botones | join_space 200 ok | 0 |
| c1–c3 30 a la vez (Promise.all, un grupo propio) | 30 + organizadora | PASS: 30/30 entraron y respondieron en 11,6–14,2 s totales; «31 de 31 respondieron» cuadra | join_space 150–212/226–1326, save_my_conditions 130–138/210–223, get_proposal_state 126–133/219–254, list_proposals 131/207–212, preview_space_by_code 137–525/526–1483 | 0 (ni 57014) |
| c4–c6 30 confirmaciones simultáneas, máximo 20 | 30 | PASS: 19 aceptadas + 11 rechazadas con `cupo_completo:reservado_imprescindible` (el último cupo queda para la organizadora); nunca sobrecupo | accept_version 627–1781/828–1964 (30 en paralelo) | 11 rechazos limpios, 0 errores técnicos; **H5** (get_proposal_state hasta 4,3 s en esa ráfaga) |
| d1 mismo nombre desde dos navegadores | 3 | PASS: lugar tomado ya no aparece; nombre escrito repetido → «Ese nombre ya está en uso en este espacio.» | – | `nombre_en_uso` esperado |
| d2 vuelve con el enlace 3 veces | 2 | PASS: el grupo sigue en 2, 0 `join_space` nuevos, su respuesta intacta | – | 0 |
| d3 navegador compartido | 3 | PASS: avisa «Ya estás en este grupo como Gabi»; el teléfono pasa a Tito; Gabi no desaparece (3 personas) | – | 0 |
| d4 dos planes en el mismo grupo | 3 | PASS: ambos en el grupo; cada plan guarda su respuesta (sábado / domingo) | – | 0 |
| d5 baja después de ¡Se juntan! (mín 2, máx 3) | 3 | PASS: sigue ¡Se juntan! («Cupos disponibles: 1»), sin nombrar quién se retiró | withdraw_commitment 200/200 | 0 |
| d6 recarga en medio de una confirmación | 2 | PASS: una sola `accept_version`, plan coherente | – | 0 |
| d7 conexión lenta (+4 s por RPC) y sin conexión | 2 | PASS: sin conexión → banner «Sin conexión», «Reintentar confirmación de la versión 1» y no confirma; con +4 s hay señal de «trabajando» y confirma una vez (4,6 s) | – | `ERR_INTERNET_DISCONNECTED` esperado |
| e 20 y 30 integrantes a 320/375/768/1280 px | 20, 30 | PASS: lista de planes, espacio y hero ≈ 0,95–1,1 s (p95 ≤ 1,5 s; un pico de 2,2 s a 768 px con 20); desborde horizontal 0 px en plan, espacio y «Personas» | lista 951–1042 / 970–2168; hero 950–1051 / 981–1134 | consola limpia (1 corrida de 3 mostró 2 `404` de recurso sin URL, no reproducido: **H6**) |
| f intro de primera visita (main `9364cd8`) | 6 | PASS: 2,6 s + salida, primer toque posible a los 3,5 s; «Saltar intro» con foco, Escape cierra, no vuelve, «reducir movimiento» la omite, con almacenamiento bloqueado entra igual, 320 px sin desborde | «Saltar intro» cierra en 830 ms | 0 |
| g1 5 teléfonos reclaman el mismo lugar de la lista a la vez | 5 | PASS: 1 `ok` y 4 `miembro_ya_reclamado` | – | códigos esperados |
| g2 5 teléfonos escriben el mismo nombre a la vez | 5 | PASS: 1 `ok` y 4 `nombre_en_uso`; el grupo queda en 3 | – | códigos esperados |
| g3 doble toque en «Confirmar» / g5 doble toque en «Buscar opción» | 4 | PASS: 1 `accept_version`, 1 `evaluate_and_publish`, sin v2 | – | 0 |
| g4 y g4b la misma persona confirma desde dos aparatos a la vez (×4) | 3 | PASS: ambos `ok`, cuenta UNA vez («1 de 3»/«2 de 3»), la organizadora luego confirma y llega a ¡Se juntan! con cupos 0 | – | 0 |
| g7 organizadora cancela mientras otros responden | 4 | PASS: queda «Cancelado», `save_my_conditions` devuelve `ok` (3) o `opcion_desactualizada:estado_no_admite`, sin pantalla rota | – | 0 |
| h guía de 3 pasos (main `9a15539`) | 3 | PASS salvo copy: abre a los 0,6 s, no obliga a elegir, botón siempre dentro de 320×568, no vuelve, «Ayuda» la reabre, Escape cierra, invitaciones la saltan, con «reducir movimiento» aparece igual | – | **H4** (voseo) |

Latencia de servidor en toda la tanda (cliente en Santiago, producción): RPC de lectura típicas 100–200 ms p50, 170–300 ms p95; escrituras 130–250 ms p50, 210–510 ms p95. Con 30 personas a la vez las RPC siguen en 130–230 ms p50; el «entrar» de 10 s por persona es el navegador de la máquina de prueba con 31 contextos, no el servidor (el RPC más lento fue `preview_space_by_code` 1,5 s en la ráfaga inicial).

## Hallazgos por gravedad

**Media**

- **H1 · No hay tope de integrantes por grupo; el «máximo 20» es del plan, no del grupo.** Pasos: grupo con plan mín 10/máx 20, 20 personas confirman → ¡Se juntan!; una persona 21 abre el enlace y escribe su nombre → entra («21 personas», `join_space` ok) y ve «Cupos disponibles: 0». Esperado según el pedido: rechazo claro al entrar. Observado: no se rompe nada y el plan lleno no le deja responder, pero queda dentro del grupo (puede ver los planes). Además la lista de «Crear grupo» tiene su propio tope de 12 («Hasta 12 personas por ahora», `MAX_INTEGRANTES`), distinto del 20 del plan. Captura `docs/qa/capturas/b7-persona-21.png`, `b0-tope-lista.png`. Dueño: **servidor/contrato → coordinador** (decidir si el grupo tiene tope); la lista de 12 → **S2 frontend**.
- **H2 · La organizadora no puede cancelar un plan en «Esperando confirmaciones» ni en «¡Se juntan!».** Solo existe «Retirarme de este plan» / «Ya no puedo ir», que para la organizadora (la que no puede faltar) manda el plan a «En revisión». «Cancelar la propuesta» aparece solo en Reuniendo/En revisión (`FilasPlan.tsx`: `s.puede.cancelar && estado !== "esperando_compromisos"`). Pasos: plan con versión publicada, organizadora abre el plan; la fila no está (el guion g7 original se quedó 30 s esperando el botón). Dueño: **S4 ux-flujo** (y servidor si `puede.cancelar` debe ser falso allí).

**Baja**

- **H3 · Texto duplicado en el rechazo por cupo reservado.** Quien toca «Confirmar» cuando solo queda el cupo de la organizadora ve «El cupo que queda está reservado para la persona imprescindible» y, justo arriba y abajo, la frase gris «El último cupo está reservado para quien no puede faltar…» repetida. Captura `c6-quien-queda-afuera.png`. Dueño: **S4 ux-flujo**.
- **H4 · La guía interactiva usa voseo rioplatense** («Vos decís cuándo», «Elegí», «Probá acá», «Tocá») mientras el resto de CRUXE habla de «tú» (control en «Crear un grupo»: sin voseo). Pasos: primera visita a `#/` o «Ayuda» → pasos 1–3. Capturas `h-guia-375-paso1.png`, `h-guia-320-paso*.png`. Dueño: quien tenga `src/components/Guia.tsx` (no figura en S1–S7: **coordinador** asigna; propuesta: friccion/S1).
- **H5 · Cola de latencia en la ráfaga de confirmaciones.** Con 30 `accept_version` simultáneos: p50 627–1781 ms y p95 828–1964 ms, y en esa ventana `get_proposal_state` llegó a 3,7–4,3 s de p95/max (el sondeo de 30 pantallas). Sin errores, pero con 30 a la vez la pantalla puede tardar 2–4 s en reflejar. Dueño: **servidor → coordinador** (sondeo/índices), no urgente.
- **H6 · Dos respuestas `404` de recurso en consola** en una corrida de (e) (08:39, cuenta de la organizadora con 30 integrantes, sin URL registrada); repetida dos veces más (08:45 y barrido de rutas) no volvió a aparecer. Dueño: **frontend**; si se repite, la URL queda en `docs/qa/logs/e-visual.txt` (ya se registra).
- **H7 · La intro de primera visita retiene a quien llega por una invitación ≈3,5 s antes de poder tocar su nombre** (diálogo modal; «Saltar intro» tiene foco y cierra en 830 ms, Escape también). Total del enlace a «¿Cuándo puedes?»: 4,3–4,9 s con intro frente a ≈1,5 s sin ella. No rompe nada. Dueño: **S1 friccion** (decidir si en invitaciones se salta sola).

**Observaciones sin defecto (positivas)**: «nombre en uso», «miembro ya reclamado» y «cupo reservado» son rechazos claros y atómicos bajo carrera; el sin conexión avisa y ofrece «Reintentar confirmación»; baja sin nombre (E13) se mantiene en a4 y d5; el conteo «N de M respondieron» cuadra con 20 y 31; sin desborde horizontal en ningún ancho.

## Limitaciones y pendientes

- El grupo máximo probado fue 31 personas; no hay tope visible, así que no se probó un límite superior (H1).
- La lista de «Crear grupo» no admite 20 nombres (tope 12): los otros 7–19 entran por «No estoy en la lista».
- Las corridas de a–d precedieron a la intro/guía nuevas; la regresión completa (08:31–08:43) y (h) las cubren. Los guiones marcan la intro como ya vista (`cruxe:entrada-vista`) salvo `f-intro.mjs` y `h-guia.mjs`.
- No se probó Safari/iOS ni red 3G real (solo +4 s por RPC y sin conexión).
