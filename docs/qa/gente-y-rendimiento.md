# QA de gente y rendimiento (qa-gente)

## Vuelta 2 (main 018215d) — sáb 24 oct 2026, 11:06–11:51 Santiago

Producción: https://cruce-senales.vercel.app. Guiones en `tests/qa-gente/` (a–i), registros en `docs/qa/logs/v2/` (la 1.ª pasada de cada bloque en `pasada1/`, la 2.ª en `pasada2/`), capturas en `docs/qa/capturas/v2/`. `node tests/qa-gente/resumen.mjs docs/qa/logs/v2` suma PASS/FAIL del último registro de cada bloque. Todo ficticio, sin agente de IA, sin borrar nada, sin `service_role`; un turno de base por bloque (marca «CORRIENDO PRUEBA … vuelta 2 bloque X»). **Corte pedido por el coordinador a las 11:50: no se corrió nada más; la marca está sacada.**

**Qué había en producción mientras se corría** (importa para leer los resultados): a–h y la 1.ª pasada de (i) corrieron con el front de `018215d` (11:06–11:28, texto «Serás Ana…»); la base ya traía las migraciones 0059/0060/0061 del coordinador (nombres nuevos y demo «cargada»), así que durante ≈11:27–11:30 el front decía «Ana…» y el servidor entregaba «Bastián…». Desde ≈11:30 el front publicado trae los nombres nuevos (main `233bb2e`: Bastián organiza; Nacho, Carlos, Kai, Charlie, Joaco, Pía; «amigos»). Las corridas de (c) 2.ª, (d) final, (f), (h) e (i) 2.ª/3.ª son sobre ese front. Los guiones aceptan ambos juegos de nombres (se detectan por lo que entrega el servidor).

**Resumen: 9 bloques corridos (a–i), 213 PASS / 11 FAIL (último registro de cada bloque).** De los 11 FAIL: 1 es el hallazgo H1 de la vuelta 1 que sigue igual (b7), 1 es un timeout de d6 que no se reprodujo en las dos corridas anteriores, 3 son defectos de la guía/GRU (h), y 6 salen de (i): **2 defectos nuevos** (D1 en 3 filas, D2 en 1) más 2 límites del guion (explicados abajo). Ningún 500, ningún `57014`, ningún sobrecupo, ninguna confirmación doble. **No se alcanzó a correr `g8` (¿puede la organizadora cancelar con versión publicada?, H2 de la vuelta 1): el escenario está escrito en `g-carreras.mjs` (`QA_SOLO=g8 node tests/qa-gente/g-carreras.mjs`) y queda pendiente.**

### Tabla por bloque

| Bloque | Qué se probó | Personas | Resultado | p50 / p95 (ms) | Errores |
|---|---|---|---|---|---|
| a | pocas personas: dúo que se junta, trío sin respuestas, «No puedo ninguno», organizadora que se retira, cancelar con respuestas (11:06) | 2–3 | **18 PASS / 0 FAIL** | create_space 247/404, save_my_conditions 223/297, evaluate_and_publish 228/316, accept_version 267/348, get_proposal_state 131/217 | 0 |
| b | grupo de 20 + persona 21 (11:14): aviso de la lista «Hasta 12 personas en la lista; el resto entra con el enlace» (b0 ok), 19 entran (12 por lista + 7 escritos), «20 de 20 respondieron», versión en 0,5 s, 19 confirmaciones en 5,6 s, ¡Se juntan! | 20–21 | **11 PASS / 1 FAIL** (b7: H1 sigue, la 21 entra al grupo) | join_space 120/190, save_my_conditions 124/205, accept_version 151/206; entrar→¿Cuándo puedes? 2123/8142 (5 a la vez) | 0 |
| c | 30 a la vez + 30 confirmaciones simultáneas, máximo 20, 2 corridas | 31 | **9 PASS (11:15) y 10 PASS (11:37) / 0 FAIL**: 30/30 entran en 10,8 y 13,0 s, «31 de 31 respondieron», 19 aceptadas + 11 `cupo_completo:reservado_imprescindible`, nunca sobrecupo | **corrida 1 (11:15)**: join_space 142/238, save_my_conditions 123/174, preview_space_by_code 250/410, **accept_version 3538/7182** (30 en paralelo), get_my_conditions p95 3386; **corrida 2 (11:37)**: join_space 168/1556, preview_space_by_code 1073/1769, save_my_conditions 177/262, **accept_version 459/686**, get_proposal_state p95 1282 | 11 rechazos limpios por corrida, 0 técnicos; sin `57014`; sin consola |
| d | situaciones: mismo nombre, vuelve con el enlace, navegador compartido, dos planes, baja tras ¡Se juntan!, recarga, red lenta/sin conexión, **d8 nuevo: 401 simulado** | 2–3 | **25 PASS / 1 FAIL** (final 11:48–11:51; d6 «recarga en medio» agotó 45 s esperando; en 11:17 y 11:35 pasó en 14 s; coincide con la ventana en que el coordinador usaba la base: **no reproducido**). d8 PASS: con 401 en lectura y en escritura la app renueva (`token?refresh_token`), reintenta UNA vez (`accept_version 401,200`) y no queda error visible | – | `401` simulado y `ERR_INTERNET_DISCONNECTED` esperados |
| e | rendimiento visual a 320/375/768/1280 con 20 y 30 integrantes | 20, 30 | **28 PASS / 0 FAIL**: sin desborde en plan, espacio ni «Personas» a ningún ancho | 20 personas: lista 984–1065 / ≤1126, espacio 945–1044 / ≤1047, hero 938–1058 / ≤1230; 30: lista 1092–1680 / ≤2106, espacio 1141–1404 / ≤2096, hero 956–1209 / ≤1517 | consola limpia |
| f | intro de primera visita | 6 | **17 PASS / 0 FAIL** (el guion cambió: la intro es solo de la portada; ver «Vuelta 1 resueltos»): la invitación entra directa (lista a los 1,3 s), la portada muestra la intro 3,6 s, «Saltar intro» 339 ms, Escape, no vuelve, «reducir movimiento» la omite, 320 px sin desborde, con almacenamiento bloqueado entra | – | 0 |
| g | carreras: 5 teléfonos por el mismo lugar y mismo nombre, doble toque, dos aparatos, cancelar mientras responden | 3–5 | **25 PASS / 0 FAIL** (1 `ok` + 4 `miembro_ya_reclamado`; 1 `ok` + 4 `nombre_en_uso`; 1 sola versión y 1 sola confirmación; la misma persona desde dos aparatos cuenta UNA vez) | accept_version 261/353, join_space 206/297, save_my_conditions 200/315 | códigos esperados |
| h | guía de 3 pasos en la primera visita (375 y 320) | 3 | **21 PASS / 3 FAIL**: abre a los 0,5 s, no obliga, «Ayuda» la reabre, Escape la cierra, las invitaciones la saltan, «reducir movimiento» no la quita; fallos: D4, D5, D6 | – | 0 |
| i | **demo Makana** (portada → demo → 7 personas → Nuevo plan con «Sin hora de fin» → un toque → «Respondiste» → «Tu respuesta» y «1 de 7 respondieron» → alguien entra por el enlace → Participación y Actividad → versión, confirmaciones, baja) | 3 contextos | **58 PASS / 6 FAIL** (11:38–11:40; los 6 FAIL = D1 ×3 filas + D2 + 2 límites del guion) | create_proposal 212, seed_demo_makana 196, save_my_conditions 193/209, get_proposal_state 131/237, join_space 194 | consola limpia, sin 4xx, solo `asiento_en_uso` (D1) |

**Lo que sí anda en la demo Makana (todo PASS, sin consola ni desborde a 320 y 375 en las 14 pantallas medidas):** la portada ofrece «Probar la demo «El plan que no deja a nadie afuera»» y ya no «Los del finde»; el grupo nace con 7 personas (1 ya entró + 6 simuladas), «Actividad del grupo» y «Personas simuladas» visibles; Nuevo plan viene precargado con el parque y «Sin hora de fin» se marca y se lee «16:00 · sin hora de fin» (resumen) y «desde las 16:00 · sin hora de fin» (opciones de un toque y versión publicada), sin inventar un fin; «Responder en un toque» → «Respondiste» y «1 de 7 respondieron»; el plan muestra «Tu respuesta: puedo los dos días» y «1 de 7 respondieron»; la Simulación no ofrece «Cargar condiciones del caso» (el servidor 018215d/0059 respondía `caso_no_disponible`; con 0060 responde `ok`, ver D7); «Participación del plan» pasa de «Versión 1 · 0 confirmaciones» (todos «Sin confirmar») a «1 confirmación» (la organizadora) y a «2 confirmaciones» con ¡Se juntan!, y deja de nombrar a quien se bajó en el plan («Una persona se retiró»); «Actividad del grupo» muestra «<persona> se unió al grupo» y «<persona> se bajó de Parque del Encuentro… · Ver plan».

### Defectos nuevos (vuelta 2)

**Alta**

- **D1 · Demo Makana: nadie puede reclamar su lugar por el enlace (desde 0060).** Pasos: portada → «Probar la demo…» → copiar el código → otro navegador abre `#/unirse/<código>` → aparece «Escribe tu nombre para entrar · Los nombres de la lista ya entraron» sin ninguna de las seis personas simuladas; escribir «Carlos» (o cualquier nombre simulado) → `join_space` devuelve `asiento_en_uso` y la pantalla dice «Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.», aunque justo debajo la ayuda promete «Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar». Causa probable (leída en `supabase/migrations`): 0060 siembra `cruce.preferencias` de los seis amigos y `cruce.asiento_usado` (0014) cuenta cualquier fila de `preferencias`, así que `libre=false` para los seis. Con la base en 0059 (11:13, mismas corridas) Camila sí reclamaba su lugar: «Reclamaste el lugar de Camila», respondía y «Actividad del grupo» mostraba «Camila se unió al grupo». Se rompe justo el momento de la demo en que «un amigo entra por el enlace y toma su asiento»; sigue pudiendo entrar con un nombre nuevo (queda como 8.º integrante, «2 de 8 respondieron»). Capturas: `i6-sin-lugar-para-reclamar-375.png`, `i6-reclamo-escrito-rechazado-375.png`, `i6-quien-eres-despues-375.png`. Dueño: **servidor → coordinador** (o la sesión que hizo 0060: **codex-caso-demo**): que `asiento_usado` ignore `preferencias` sembradas en demos, o que 0060 no las cuente como actividad.

**Media**

- **D2 · La confirmación de baja promete lo que «Actividad del grupo» ya no cumple.** Pasos: demo con versión 1 publicada y confirmada por dos personas → quien confirmó toca «Ya no puedo ir» → «¿Retirarte definitivamente? … la baja queda registrada **sin tu nombre**» → «Sí, no voy» → en el grupo, «Actividad del grupo» dice «**Camila Qa se bajó de Parque del Encuentro (ficticio)…** · Ver plan» (pedido de Nico en `docs/actividad-grupo.md`); el plan, en cambio, sigue diciendo «Una persona se retiró» sin nombre (E13). Son dos mensajes contradictorios sobre lo mismo. Capturas: `i8-actividad-tras-baja-375.png`, `i8-tras-la-baja-375.png`. Dueño: **S4 ux-flujo** (texto de `FilasPlan.tsx`/`RespuestaTab.tsx`: «sin tu nombre»); la decisión de producto (¿se nombra o no?) → **coordinador**.
- **D3 · Voseo que queda: «volvés a confirmar» en el paso 3 de la guía** («Mostrar interés no es confirmar. Si el plan cambia, volvés a confirmar.») **y el asistente GRU habla de «vos»**: texto «Elegí uno de tus grupos para abrir mi pestaña… Me vas a encontrar por acá» y aria-label «…Elegí un grupo para abrir su pestaña». El resto de la guía ya está en «tú» (H4 resuelto salvo esto). Capturas: `h-guia-375-paso3.png`. Dueño: **S1 friccion** (`Guia.tsx`) y **S6 agente-ia** (`GruAsistente.tsx`).

**Baja**

- **D4 · Guía paso 3 a 375×812: el botón «Dale, vamos» termina en y=820 de 812 (8 px bajo la pantalla)** (pasos 1 y 2 caben; a 320×568 cabe). En la vuelta 1 cabía a 375×812: es nuevo (el pie de ese paso ahora tiene más texto). Captura `h-guia-375-paso3.png`. Dueño: **S1 friccion**.
- **D5 · «¿Eres X?» en la demo llama «persona simulada» a quien no lo es.** `QuienEres.tsx` (≈322): en un espacio demo el aviso es «X es una persona simulada de la demo y ya está respondiendo» para cualquier lugar no libre, también para quien organiza («¿Eres Ana? Ana es una persona simulada de la demo…», reproducido 11:13, base 0059) y para quien ya reclamó su lugar. Hoy no se ve porque D1 vacía la lista; reaparecerá al arreglar D1. Dueño: **S1 friccion**.
- **D6 · La ayuda de «Escribe tu nombre para entrar» sigue poniendo de ejemplo «Luna»** (persona de otra demo) en la demo Makana. Dueño: **S1 friccion**.
- **D7 · Base por delante del front (informativo, no defecto del producto):** entre ≈11:05 y ≈11:30 convivieron front viejo y base 0059–0061: el front decía «Serás Ana…» mientras el servidor entregaba «Bastián…»; y `simulate_load_case` pasó de `caso_no_disponible` (0059) a `ok` (0060, «Cargar respuestas» vuelve). Mi llamada directa de prueba a esa RPC (11:27) hizo saltar el conteo de la demo de prueba a «7 de 8 respondieron», o sea que cargó las respuestas de los simulados: por eso el guion la llama al final de un escenario (`i9`).
- **Observación de latencia (H5 sigue, variable):** la ráfaga de 30 `accept_version` a las 11:15 dio p50 3538 / p95 7182 ms (get_my_conditions p95 3386, get_space p95 2289), pero a las 11:37 dio p50 459 / p95 686 ms (la vuelta 1 midió 627–1781 / 828–1964). Sin errores en ambas; la diferencia coincide con la tanda del coordinador marcada ese rato. Dueño: **servidor → coordinador**, no urgente. Además el campo de hora nativo de Nuevo plan se ve «04:00 p. m.» en Chrome es-CL mientras el resumen dice «16:00» (depende del reloj del aparato; sin acción).

**Límites del guion de (i), contados como FAIL pero no son defectos:** (1) «tocar el lugar tomado de Camila Qa NO la hace entrar» y (2) «el aviso de Bastián no dice que es persona simulada» fallan porque, tras D1, esas filas no existen en la lista (el guion esperaba el botón y agotó 8 s/60 s); el guion final ya las salta cuando el lugar no se pudo reclamar; (3) «sin errores de RPC» cuenta el `asiento_en_uso` de D1, que ya está registrado.

### Defectos de la vuelta 1: cómo quedaron

| Defecto | Estado en la vuelta 2 | Evidencia |
|---|---|---|
| H1 · no hay tope de integrantes por grupo (la 21 entra a un plan lleno) | **Sigue.** La lista de «Crear grupo» ahora avisa «Hasta 12 personas en la lista; el resto entra con el enlace» (b0 PASS, texto corregido), pero la persona 21 entra al grupo («21 personas», `join_space` ok) | b7 FAIL, `docs/qa/logs/v2/b-muchas.txt` |
| H2 · la organizadora no puede cancelar en «Esperando confirmaciones» / «¡Se juntan!» | **Sin verificar** (no alcancé a correr `g8`, escrito) | `tests/qa-gente/g-carreras.mjs` g8 |
| H3 · frase duplicada del cupo reservado | **Resuelto**: «El último cupo está reservado para quien no puede faltar» aparece 1 vez (c6c PASS) | `c6-quien-queda-afuera.png` |
| H4 · la guía en voseo | **Casi resuelto**: «Vos decís», «Elegí», «Probá», «Tocá» ya no están; quedan «volvés» y el GRU (D3). Ojo: el guion de la vuelta 1 usaba `\b`, que no reconoce «í/á», y no habría detectado «Elegí/Probá/Tocá»; ahora usa `\p{L}` | h7 FAIL / h7c FAIL |
| H5 · cola de latencia en 30 confirmaciones | **Variable, no resuelto** (3538/7182 ms a las 11:15; 459/686 a las 11:37) | `c-treinta.txt`, `pasada1/c-treinta.txt` |
| H6 · dos `404` de recurso en consola | **No reapareció** en ninguna de las 9 corridas con consola vigilada (a–i) | logs |
| H7 · la intro retiene ≈3,5 s a quien llega por una invitación | **Resuelto**: la intro es solo de la portada (`#/`, `#/entrar`, `#/crear`); la invitación muestra «¿Quién eres?» a los 1,3 s y llega a «¿Cuándo puedes?» en 2,1 s | f1 PASS (`src/components/Intro.tsx`) |

### Cambios a los guiones (vuelta 2)

`lib.mjs`: marca las dos vistas (`cruxe:entrada-vista` y `cruxe:guia-vista:v1`, en local y session storage, igual que `sinIntro`), capturas a `capturas/v2/`, corte 12:15, marca «vuelta 2 bloque X». `f-intro.mjs` reescrito (intro de portada, invitaciones sin intro); `h-guia.mjs`: voseo con `\p{L}`, más formas, revisa GRU y captura el paso 3; `c-treinta.mjs`: c6c (H3); `d-situaciones.mjs`: d8 (401) y manejo del `route.continue()` colgado; `g-carreras.mjs`: g8 (sin correr); **nuevo** `i-demo-makana.mjs` (bloque i); `resumen.mjs`.

---

## Vuelta 1 (main 7f47a88 → 9a15539, 08:00–08:50)

### QA de gente y rendimiento (qa-gente, 24 oct 2026, 08:00–08:50 Santiago)

Producción: https://cruce-senales.vercel.app. Corridas A–D iniciales sobre `main` `7f47a88` (08:02–08:19); tanda completa de regresión sobre `9364cd8` (08:31–08:43, intro nueva); guía (h) y repetición de (e) sobre `9a15539` (08:44–08:50).
Guiones en `tests/qa-gente/` (`node tests/qa-gente/<guion>.mjs [url]`; cada uno toma turno de base, corre ≤10 min y suelta). Registros de la tanda en `docs/qa/logs/`. Capturas en `docs/qa/capturas/`.
Todo ficticio (grupos «Dúo/Trío/Veinte/Treinta… <hhmm>», nombres inventados), sin agente de IA, sin borrar nada, sin `service_role`. Los grupos creados quedan en la base (no se borran).

**Resumen: 7 bloques, 152 verificaciones, 0 defectos graves. Un solo comportamiento contradice lo pedido (no hay tope de 20 en el grupo) y hay 5 hallazgos de gravedad media/baja.** Ningún 500, ningún `57014`, ningún sobrecupo, ninguna confirmación doble en las carreras.

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
