# Revisión de accesibilidad de la app a 375 px (mejora #60)

Dueño del informe: agente-ia. Viernes 23 oct 2026, escrito a las 16:40 (hora del reloj, Santiago). Solo lectura: no se editó nada en `src/`. Lo toma claude-b (dueño de `src/`) como parte del resto de #44.

Alcance: toda la app fuera de `src/agente/` (ya revisado en #35). Cuatro preguntas: toques chicos, foco después de acciones y errores, anuncios de cambio de estado para lector de pantalla y textos que confunden a un jurado que ve la demo 5 minutos en un teléfono.

## Cómo se hizo y qué no prueba
- **Medición en vivo:** https://cruce-senales.vercel.app de 16:08:55 a 16:10:04, cuando lo publicado era `main` `9b62a2d` (el coordinador publicó `7b0335b`, con la parte 2 de #44, a las 16:18). Chrome sin ventana con Playwright, 375 × 812 con tacto, tres contextos (Tomi, Luna y uno nuevo), demo propia con datos ficticios. 31 pantallas: en cada una se guardó el árbol accesible (lo que oye un lector), dónde quedó el foco 1,8 s después de la acción, las regiones vivas (`aria-live`, `role=status`, `role=alert`) con su texto, los elementos tocables de menos de 44 px y el texto visible. Ninguna pantalla desborda a lo ancho; `lang="es"` está puesto.
- **Lectura de código:** `main` `7b0335b`. Cuatro revisores independientes (toques, foco, lector, jurado) y un verificador por enfoque que intentó refutar cada hallazgo contra el código y las mediciones. 65 observaciones: 30 confirmadas, 27 confirmadas en parte (el hecho es cierto, la gravedad o el alcance no), 8 refutadas o ya corregidas en `7b0335b`. Las líneas de abajo son las verificadas en `7b0335b`.
- **Límites:** no se usó un lector de pantalla real (VoiceOver, TalkBack). Que una región `role=status` que aparece ya con su texto "no se anuncie de forma fiable" es una advertencia conocida de los lectores, no algo medido acá. El foco se midió en Chrome: en Safari de iOS un toque no deja el foco en el botón, así que algunos de los casos de "foco al body" se comportan distinto. No se midió a 320 px (eso ya lo hizo claude-b).

## Lo que ya está bien (para no volver a tocarlo)
- Zona tocable de 44 px en `.btn-chico`, en el logo (`.marca::after`) y en los enlaces de texto `.enlace` ("Restablecer valores del caso", "Ver historial completo"): la medición los da en 24 px porque la zona extra sale de un pseudoelemento, pero la zona existe (`src/styles.css:751-756`).
- `Boton` con `aria-disabled` mientras trabaja y `aria-busy` (`src/components/ui.tsx:130-138`); `ErrorCaja` lleva el foco a "Reintentar" o al aviso tras una acción fallida (`ui.tsx:74-81`); en la pantalla 15 (sin conexión, "Me interesa") el error salió con `role=alert` y el foco quedó en su lugar.
- El encabezado de estado de la propuesta es una región viva siempre montada y atómica (`src/screens/Propuesta.tsx:150-156`): el cambio a "Esperando compromisos", "Grupo confirmado" o "En revisión" se anuncia, también cuando llega por sondeo en el otro teléfono (pantallas 19 y 23).
- `scroll-padding-top: 96px` y `scroll-padding-bottom: 150px` (`styles.css:61` y `:984`): lo que recibe foco no queda bajo el encabezado fijo ni bajo la barra de abajo.
- Pestañas con `role=tablist`, `role=tab`, `aria-selected` y `tabpanel` (`Propuesta.tsx:171-193`); enlace "Saltar al contenido" que enfoca `#contenido` (`src/App.tsx:157-161`); logo con `role=img` y nombre "CRUXE" (`src/components/Marca.tsx:36-43`).

## Prioridad alta (afecta el recorrido de la demo con lector de pantalla)

### A1. Cambiar de pantalla no se nota: ni título, ni foco, ni anuncio
- **Dónde:** `src/App.tsx:130-132` (el efecto de ruta solo hace `window.scrollTo(0, 0)`); `index.html:6` (`<title>CRUXE</title>`, nadie lo cambia). Avisos de una sola vez que se montan con la pantalla como `role=status`: `src/screens/Espacio.tsx:20` y `:120` ("Reclamaste el lugar de Luna…"), `src/screens/Propuesta.tsx:27` y `:121`.
- **Evidencia:** `document.title` = "CRUXE" en las 31 pantallas, incluidas `#/e/…`, `#/e/…/nueva`, `#/e/…/p/…` y `#/unirse/…`. Foco en `body` al cargar las pantallas 03, 05, 08 y 27 (tras "Probar la demo", "Unirme", "Crear y abrir al grupo" y volver a la portada). Lo único que cambia para un lector es el encabezado de identidad (ver M8), que dice "Sesión anónima…" y no en qué pantalla se está.
- **Impacto:** quien usa VoiceOver o TalkBack no sabe que pasó de la portada al espacio, a la propuesta o a "Nueva propuesta". Es todo el recorrido. WCAG 2.4.2 (título de página), nivel A.
- **Arreglo:** un hook `useTitulo(texto)` en Inicio, Espacio, NuevaPropuesta y Propuesta que ponga `document.title = "<pantalla> · CRUXE"` (en Propuesta, el título de la propuesta). En `App.tsx:130`, después del scroll y salvo en el primer render, mover el foco al `main` (ya tiene `tabIndex -1`) o al `h1` con `tabIndex={-1}`; si hay un aviso pendiente (`tomarAviso`), enfocar ese aviso.

### A2. Las confirmaciones de acciones irreversibles aparecen sin foco y sin anuncio fiable
- **Dónde:** el botón se desmonta y en su lugar aparece un `Aviso` (`role=status`, `src/components/ui.tsx:43`) que no recibe foco: "Cancelar propuesta" `src/screens/PlanTab.tsx:529-545` (Aviso en `:534`); "Se baja: X" `src/screens/SimulacionTab.tsx:288-307` (Aviso `:295`, "Volver" `:302`); "Retirarme de esta propuesta" `src/screens/RespuestaTab.tsx:180-197`; "Reiniciar demo" `src/screens/Espacio.tsx:357-373` (Aviso `:362`); "Entrar como otra persona" `src/screens/Inicio.tsx:388-422` y "Olvidarla" `Inicio.tsx:240-264`.
- **Evidencia:** pantalla 21 (`¿Dar de baja a Caro?`) y 29 (`¿Cancelar la propuesta?`): foco en `body`, el botón original ya no está y la pregunta es un `status` insertado de golpe con sus botones "Sí…" y "Volver". "Volver" vuelve a montar el botón sin devolverle el foco.
- **Impacto:** la baja de Caro es el disparador de la reparación y está en el recorrido de la demo. Con lector, la pregunta puede no oírse y la acción parece no hacer nada. Con teclado, se vuelve a empezar desde el encabezado. No es destructivo (si no se oye la confirmación, no pasa nada), por eso cancelar, retirarse y reiniciar valen menos que la baja.
- **Arreglo:** un solo componente `Confirmacion`: un `Aviso` con `ref` y `tabIndex={-1}` que se enfoca al montarse (o enfoca su botón "Volver"), y que con "Volver" devuelve el foco al botón que lo abrió (hace falta pasar `ref` por `Boton`, `ui.tsx:122`). Usarlo en los seis sitios. Tras "Sí, X se baja" enfocar el `h2` de la tarjeta (`SimulacionTab.tsx:270`); tras cancelar, el aviso "Cancelado" (`PlanTab.tsx:23-27`).

## Prioridad media (se nota, molesta, no bloquea)

### M1. Los enlaces de volver miden 18 px de alto
- **Dónde:** `src/screens/Propuesta.tsx:67` y `:103` ("← Los del asado" / "← Volver al espacio"), `src/screens/Espacio.tsx:118` ("← Tus espacios"), `src/screens/NuevaPropuesta.tsx:200`. Son `<a>` en línea sin clase; la regla de zona tocable solo cubre `.marca` y `.enlace` (`src/styles.css:751-756`).
- **Evidencia:** `a «← Tus espacios»` 18 × 117 px (pantallas 03 y 05); `a «← Los del asado»` 18 × 122 px en 24 pantallas más. Es el único retroceso visible dentro de la app.
- **Impacto:** con el pulgar se falla el toque en la acción de volver. Pasa WCAG 2.5.8 solo por la excepción de espaciado; queda lejos de los 44 px que pide el proyecto.
- **Arreglo:** clase `volver` en los cuatro enlaces y, junto a `styles.css:751`, `.volver { position: relative } .volver::after { content: ''; position: absolute; inset: -13px -6px }`. De paso, sacar la flecha del nombre accesible: `<span aria-hidden="true">← </span>` (hoy el lector dice "flecha izquierda Tus espacios" en cada pantalla).

### M2. En el teléfono, el error de "Confirmar versión" queda fuera de la vista
- **Dónde:** `src/screens/PlanTab.tsx:247` dibuja `<ErrorCaja error={error} enfocar />` en el flujo, al final de la sección, mientras el botón vive en la barra fija `.cta-fija` (`PlanTab.tsx:225`; `position: fixed` hasta 640 px en `styles.css:958-969`). `src/components/ui.tsx:78-80`: sin botón "Reintentar" en la caja, y con el foco todavía en el botón (ahora `aria-disabled`, no `body`), nada enfoca ni desplaza hasta el aviso.
- **Evidencia:** en 17 la sección termina a ~900 px CSS y en 25 a ~1460 px, bajo los 812 del visor: el error queda fuera de pantalla. La pantalla 15 (mismo mecanismo, otro botón) confirma que el foco no se mueve al aviso.
- **Impacto:** si falla la confirmación (sin conexión, plazo, cupo), quien mira la barra ve que el botón cambió a "Reintentar confirmación de la versión N" (`PlanTab.tsx:234`) pero no ve el motivo. Es la acción central de la demo; con lector no hay problema (`role=alert`). En Safari de iOS el foco sí cae en el aviso, porque el toque no enfoca el botón.
- **Arreglo:** en `ui.tsx`, después de la línea 80, `else el.scrollIntoView({ block: 'nearest' })` (el `scroll-padding-bottom` lo deja sobre la barra). O dibujar ese `ErrorCaja` dentro de `.cta-fija`, encima del botón.

### M3. Después de una acción que cambia la fase, el foco cae al `body`
El botón que se pulsó desaparece con el cambio de estado y nada toma el foco. El encabezado de estado (`Propuesta.tsx:150-156`) sí anuncia el cambio, así que el lector oye el resultado; lo que se pierde es el ancla y, con teclado, hay que volver a empezar desde arriba.
| Acción | Dónde se desmonta | Pantalla medida | Adónde debería ir el foco |
|---|---|---|---|
| "Buscar opción compatible" | `PlanTab.tsx:45-47` (sección `BuscarOpcion`), llamada en `:492-494` | 16, foco `body` | `#opcion-titulo` (`PlanTab.tsx:151`, agregar `tabIndex={-1}`) |
| "Confirmar versión N" | `PlanTab.tsx:224` (la barra) → `Aviso` info de `:245`; éxito en `:144-147` | 18, foco `body` | ese `Aviso` (ya acepta `ref` y `tabIndex`) |
| "Buscar alternativa" | `PlanTab.tsx:37-39` (`AlternativaOrganizador`), llamada en `:355-357` (hay que capturar el resultado de `correr`) | 24, foco `body` | `#cambio-version-titulo` (`PlanTab.tsx:283`) |
| "Ir a Mi respuesta" y "Ver historial completo" | `PlanTab.tsx:459` y `:417` llaman a `irAPestana`, que solo hace `setPestana` (`Propuesta.tsx:98`) y desmonta el panel (`:189-192`) | 08, 14, 22-25 (sin medir el clic) | la pestaña elegida: `requestAnimationFrame(() => document.getElementById(`tab-${t}`)?.focus())` |
| "Entendido" | `Propuesta.tsx:125` y `:139`, `Espacio.tsx:121` cierran su propio aviso | 05, 26 (sin medir el clic) | el `h1` (`Propuesta.tsx:149`, `Espacio.tsx:126`) |
| "Aceptar versión N por…" (Simulación) | `SimulacionTab.tsx:95-104` y `:283-286`; resumen en `:106-107` | sin medir | el párrafo de resumen o el `h2` "Atajos" |
| "Reintentar" al crear la propuesta | `NuevaPropuesta.tsx:234`; `src/lib/hooks.ts:136` borra el error y desmonta el botón; en el paso "editar" no hay ningún "Creando…" (`:337-342` solo en "revisar") | sin medir | un `role=status` "Creando…" en el paso editar |

Arreglo común: un helper `enfocarTras(id)` que haga `focus()` sobre un título con `tabIndex={-1}` después de `r?.ok`. Alternativa para "Confirmar": no desmontar el botón, dejarlo `aria-disabled` con el texto "Ya confirmaste la versión N".

### M4. Botones que pasan a `disabled` real cuando la acción tiene éxito
- **Dónde:** `src/components/ui.tsx:136` pasa `rest.disabled` tal cual al DOM y `:130` solo cubre `ocupado`. "Me interesa" `src/screens/RespuestaTab.tsx:57`, "Hoy paso" `:66`, "Guardar condiciones" `:136` ("Descartar cambios" `:140-144` se desmonta), "Guardar condiciones de X" `src/screens/SimulacionTab.tsx:328`.
- **Evidencia:** pantalla 10 (`button "Me interesa" [disabled] [pressed]`, foco `body`) y 11 (`button "Guardar condiciones" [disabled]`, foco `body`). En 13 y 15 el botón no queda deshabilitado y conserva el foco.
- **Impacto:** es el primer paso de cada persona en la demo. Chrome conserva el punto de navegación y el resultado ("Guardado…") queda al lado, por eso no es alta.
- **Arreglo:** en `Boton`, mientras el botón tenga el foco, no poner `disabled` real sino `aria-disabled` e ignorar la activación (ampliar la condición de `ui.tsx:130`); al perder el foco, `disabled` de verdad. claude-b decidió mantener `disabled` lógico con su estilo propio: este cambio no lo contradice si solo se aplica mientras el botón está enfocado.

### M5. "Nueva propuesta": el cambio entre editar y revisar no mueve el foco ni se anuncia
- **Dónde:** `src/screens/NuevaPropuesta.tsx:146` (`setPaso('revisar')`), `:343` (`setPaso('editar')`), `:185` (vuelta a editar por error); el formulario entero se reemplaza (`:204` y `:310`); el aviso "Revisa antes de crear" (`:312`) es un `role=status` montado con su texto; `h1` en `:202`.
- **Evidencia:** pantalla 07: foco `body`, títulos solo "H1 Nueva propuesta", y la captura muestra que la página conserva el scroll del formulario y el encabezado fijo tapa el aviso.
- **Arreglo:** `useEffect([paso])`, saltando el primer render: al pasar a revisar, enfocar el aviso (`ref` y `tabIndex -1`, como `ErrorCaja`) y `window.scrollTo(0, 0)`; al volver a editar, enfocar el `h1`.

### M6. Pestañas con roles pero sin el patrón de teclado
- **Dónde:** `src/screens/Propuesta.tsx:171-193`: las cuatro pestañas están en el orden de tabulación (sin `tabIndex={-1}` en las inactivas), no hay `onKeyDown` (flechas, Inicio, Fin), el `tabpanel` (`:188`) no es enfocable y `aria-controls` (`:179`) apunta a `panel-<id>` que solo existe para la activa (un validador como axe lo marca).
- **Impacto:** teclado físico y lector de escritorio; en el teléfono táctil casi no se nota.
- **Arreglo:** `tabIndex={activa === t.id ? 0 : -1}`, `onKeyDown` que mueva el foco y llame a `setPestana`, `tabIndex={0}` en el panel, y `aria-controls` solo en la activa (o montar los paneles con `hidden`).

### M7. El anillo de foco de las pestañas queda recortado
- **Dónde:** `.pestanas` tiene `overflow-x: auto` (`src/styles.css:684-690`), que vuelve `overflow-y` automático, sin relleno; el anillo de `:focus-visible` (`styles.css:102-105`: 3 px más 2 px de separación) se dibuja fuera de la caja y se corta. A 375 px aplica además `:712-719`.
- **Evidencia:** reproducido en una página mínima con el `styles.css` actual: solo se ven dos barras verticales entre pestañas; en la primera y la última, una sola.
- **Arreglo:** `.pestana:focus-visible { outline-offset: -3px }` (el anillo cae dentro de la pestaña) o relleno en `.pestanas`. No quitar el `overflow-x`, que sirve a 320 px.

### M8. El encabezado de identidad es una región viva que engaña
- **Dónde:** `src/App.tsx:73` (`aria-live="polite"`), textos en `:67` ("Sin espacio"), `:76` ("Sesión activa: …") y `:80` ("Sesión anónima: aún sin nombre en un espacio"); `src/lib/shell.tsx:35-38` lo vacía al desmontar cada pantalla; `src/screens/Inicio.tsx:17` pasa `(null, null, null)` en la portada.
- **Evidencia:** la región está en las 31 pantallas. Al cambiar de pantalla se oye "Sesión anónima: aún sin nombre en un espacio" mientras carga la siguiente y después "Sesión activa: Tomi organizador" (el rol pegado al nombre). En 27 y 31 la portada dice "Sin espacio" y "Sesión anónima…" mientras la misma pantalla lista "Tus espacios · Tú: miembro" y "Tu plan · Te toca confirmar la versión 2".
- **Impacto:** para el lector es lo único que se anuncia al cambiar de ruta, y es falso; para el jurado, "sesión anónima" suena a problema de cuenta, y la portada se contradice a la vista.
- **Arreglo:** quitar `aria-live` de esa línea (el anuncio de pantalla pasa a A1) o no vaciarla al desmontar sino sobrescribirla desde la pantalla siguiente. Textos: dentro de un espacio, "Estás como Tomi (organizador)"; en la portada, no afirmar "anónima" ni "sin espacio" si la persona tiene espacios.

### M9. "Sin conexión" se avisa tres veces a la vez
- **Dónde:** `src/App.tsx:86-91` (aviso global, `role=status`), `src/screens/Propuesta.tsx:106-119` (`viva.sinActualizar`, `role=status`, con "Actualizar ahora") y el `ErrorCaja` de la acción (`src/components/ui.tsx:87-91`, `role=alert`), que repite "Sin conexión" en el título y en el mensaje.
- **Evidencia:** pantalla 15: tres cajas "Sin conexión" visibles, una debajo de la otra.
- **Arreglo:** mostrar el aviso de `Propuesta.tsx:106` solo si hay conexión (`online`) o fusionarlo con el global; título del `ErrorCaja` sin conexión: "No se registró la acción".

### M10. Las confirmaciones de acción son `role=status` que nacen con su texto
- **Dónde (11 sitios):** `src/screens/RespuestaTab.tsx:72` y `:147`; `src/screens/SimulacionTab.tsx:106-107`; `src/screens/PlanTab.tsx:235`; `src/screens/Espacio.tsx:230-232`, `:319` y `:374`.
- **Evidencia:** pantalla 09 no tiene ningún `status` de acción; 10 agrega `Marcaste "Me interesa"…`, 11 agrega `Guardado. Solo tú ves estas condiciones.`, 13 agrega el resumen de la carga. Son nodos nuevos que aparecen ya con texto: los lectores no siempre los anuncian. Como además el foco cayó al `body` (M4), ese párrafo es la única confirmación.
- **Arreglo:** un componente `Anuncio`: un `<p role="status" aria-live="polite">` siempre montado y vacío, al que solo se le cambia el texto. Es lo que ya hace bien el encabezado de estado.

### M11. En el formulario, las franjas A y B no tienen nombre accesible
- **Dónde:** `src/screens/NuevaPropuesta.tsx:249-270`: "Franja A" y "Franja B" son `<strong>` sueltos (`:250`, `:261`); los cuatro campos se llaman "Inicio", "Fin", "Inicio", "Fin" (`:253`, `:257`, `:264`, `:268`) dentro de un único grupo "Franjas candidatas".
- **Evidencia:** árbol de la pantalla 06: `textbox "Inicio"`, `textbox "Fin"`, `textbox "Inicio"`, `textbox "Fin"`.
- **Impacto:** navegando por controles (Tab, lista de formularios) no se sabe cuál es la A, que es la prioritaria. En la demo el formulario viene precargado, así que no bloquea. WCAG 1.3.1 y 3.3.2.
- **Arreglo:** un `<fieldset>` por franja con `<legend>Franja A</legend>` y `<legend>Franja B</legend>`, o `aria-label="Inicio de la franja A"`, etc., en los cuatro campos.

### M12. Con enlace de invitación, el foco salta el aviso "Te invitaron a un plan"
- **Dónde:** `src/screens/Inicio.tsx:375` (`autoFocus` en el campo del nombre); el aviso está en `:53-59` (`:55`) y el `h2` "Unirme con un código" antes del campo; `Aviso` no admite `id` (`src/components/ui.tsx:27`).
- **Evidencia:** pantalla 04: foco en el campo de nombre al cargar; el aviso y el título quedan antes y no se oyen. Es la segunda persona de la demo (Luna, por enlace). En Safari de iOS el `autoFocus` sin gesto suele no aplicarse.
- **Arreglo:** dar `id` al aviso y `aria-describedby` en el campo del nombre (`:374`), así el lector lee la invitación al enfocar.

### M13. Validación de "Nueva propuesta": el aviso queda fuera de la vista y los campos vacíos no se marcan
- **Dónde:** `src/screens/NuevaPropuesta.tsx:233` (aviso "Completa todos los campos antes de revisar.", `role=alert`, arriba del formulario largo); `:242` es el único `aria-invalid`; fechas, cupos, imprescindible y cierre (`:253-302`) solo llevan clases (`:246`, `:273`, `:287`, `:300`) y el estilo de error cubre solo `input[aria-invalid]` y `.campo-error` (`src/styles.css:542-544`). No hay `aria-describedby`.
- **Evidencia:** lectura de código; no se midió ese estado. Quien toca el botón del final de la página no ve el aviso (queda arriba, sin scroll ni foco). Los errores que vienen del servidor sí nombran el campo (`supabase/migrations/0002_utilidades.sql:32-34`) y salen en un `ErrorCaja` con foco. En `Inicio.tsx` el código y el nombre ya tienen `aria-invalid` (`:369`, `:380`) y `ErrorCaja` enfocado (`:387`).
- **Impacto:** no pasa en la demo (formulario precargado); sí en un espacio real.
- **Arreglo:** en `revisar()`, si falta algo, enfocar el primer campo vacío y marcarlo con `aria-invalid`; listar en el aviso qué falta.

### Textos que frenan al jurado (media)

### M14. Los tres pasos de la portada mezclan jerga y persona gramatical
- **Dónde:** `src/screens/Inicio.tsx:85`, `:91` ("El servidor propone una sola opción compatible."), `:97` ("Confirmas esa versión. Si alguien se baja, se repara y se vuelve a confirmar."); la bajada de `:69` ya dice lo mismo.
- **Por qué:** es lo primero que lee el jurado; "servidor", "se repara" y "versión" (todavía no explicada) sacan del relato, y se pasa de "Cada uno" a "Confirmas".
- **Propuesta:** 1 "Cada uno marca en privado cuándo puede." 2 "CRUXE propone un solo horario que sirva al grupo." 3 "Cada uno lo confirma. Si alguien se baja, CRUXE busca otro horario y se vuelve a confirmar."

### M15. Cuatro palabras para lo mismo: confirmar, aceptar, aceptación, compromiso
- **Dónde:** "Esperando compromisos" `src/lib/types.ts:31` (y el `estado_etiqueta` del servidor, `supabase/migrations/0029_texto_confirmaron_minimo.sql:119`); "Falta la aceptación de…" `0029:100`; "Aceptaciones" `src/screens/PlanTab.tsx:170`; "aceptó la versión" `src/lib/format.ts:110` y "ninguna aceptación anterior cuenta" `:114`; "Las aceptaciones anteriores no cuentan" `src/screens/Propuesta.tsx:144`; `src/screens/SimulacionTab.tsx:102` y `:285`; `src/screens/NuevaPropuesta.tsx:301` y `:331`.
- **Evidencia:** la pantalla 25 junta "Esperando compromisos", "Las aceptaciones anteriores no cuentan", "Aceptaciones 0 de 4", "Confirmar versión 2", "Quién confirmó esta versión" y "Luna aceptó la versión 1".
- **Propuesta:** usar solo "confirmar": "Esperando confirmaciones", "Confirmaciones", "Caro confirmó la versión 1". Lo del servidor es una migración de backend (pedirla al coordinador); lo de `src/` lo puede hacer claude-b.

### M16. El aviso de la baja no dice quién se bajó y se repite con el encabezado
- **Dónde:** `src/screens/PlanTab.tsx:254-260` (título "Una baja dejó el plan sin cumplir" en `:256`; texto "ya no alcanza el mínimo o perdió al anfitrión"); el encabezado de estado dice casi lo mismo con texto del servidor (`0029:109`).
- **Evidencia:** pantallas 22 y 23: dos regiones `role=status` con el mismo hecho; el "o" queda sin resolver aunque la pantalla tiene `p.bajas` y `o.cupos`.
- **Propuesta:** título "Se bajó Caro"; texto "Quedan 3 de 4 confirmaciones. Tomi busca otro horario y todos vuelven a confirmar." (si la baja es del anfitrión, decirlo).

### M17. La versión en revisión se describe con ambigüedad y jerga
- **Dónde:** `src/screens/PlanTab.tsx:341` (título), `:343-347` ("Conserva 3 confirmación(es) de 4 necesarias. No se transfiere a la próxima versión."), `:374` ("La nueva ficha empieza con cero aceptaciones"), `:398` ("Quien se baja no vuelve a ser elegible").
- **Propuesta:** "Había 3 de 4 confirmaciones. No pasan a la versión nueva." (sin "(es)"); "La versión nueva empieza sin confirmaciones."; "Quien se baja no puede volver a sumarse a esta propuesta."

### M18. "Grupo confirmado" se dice tres veces en la misma pantalla
- **Dónde:** `src/screens/PlanTab.tsx:151` (título "Opción vigente") y `:153-155` (aviso verde "Grupo confirmado en la versión 1"); más el encabezado de estado, que trae del servidor "Grupo confirmado en la versión 1. Cupos disponibles: 2." (`0029:103`; `tests/backend/aceptacion-reparacion.test.ts:162` fija ese texto); más "Ya confirmaste la versión 1".
- **Evidencia:** pantallas 19 y 20: tres regiones `role=status` con el mismo hecho; la 20 muestra dos cajas casi iguales una bajo la otra.
- **Propuesta:** decir el hecho una vez: sacar el título del aviso de `:153` o fusionarlo con el encabezado, y dejar "CRUXE coordina el plan; no reserva nada" (es un límite declarado, no se cambia). "Cupos disponibles" es texto del contrato: si se quiere sacar, es migración y cambio del test de backend.

## Prioridad baja (detalles; conviene hacerlos juntos cuando se toque el archivo)
| # | Dónde | Qué | Arreglo |
|---|---|---|---|
| B1 | `src/screens/Inicio.tsx:382`; `src/screens/NuevaPropuesta.tsx:297` y `:303` | El `<small>` de ayuda está dentro del `<label>`: el nombre del campo se lee con la frase entera (pantallas 04 y 06) | Sacar el `<small>` del `label`, darle `id` y `aria-describedby` en el campo |
| B2 | `src/screens/SimulacionTab.tsx:275-279` | El separador " · " está en `aria-hidden`: se lee "Sin interés marcadoA: Sí" (12, 13, 21) | Espacio dentro del primer `span` o una sola cadena |
| B3 | `src/lib/format.ts:92-94` (se muestra en `PlanTab.tsx:111`) | "6 d 3 h 50 min": el lector dice "de", "hache" | Texto largo ("6 días 3 horas 50 minutos") en un `span` oculto visualmente y la forma corta en `aria-hidden` |
| B4 | `src/screens/HistorialTab.tsx:108` | La insignia de estado va al final sin rótulo: "…Simulación por Tomi Grupo confirmado" (26) | Prefijo oculto "Estado: " dentro de `hl-estado` |
| B5 | `src/components/ui.tsx:43`; ayudas fijas en `RespuestaTab.tsx:19`, `Inicio.tsx:444`, `NuevaPropuesta.tsx:219` | `Aviso` pone `role=status` a todo, incluidos textos fijos de ayuda (hasta 6 regiones vivas en la 15) | `role=status` solo a los avisos que aparecen por una acción; hacerlo junto con A2 y M10, no antes |
| B6 | `src/screens/Inicio.tsx:53-62` y `:65` | En la portada con plan o con invitación, el primer encabezado es un `h2` ("Tu plan", "Unirme con un código") y el `h1` va después (04, 27, 31) | Mover el `h1` antes de `TuPlan` y del bloque de invitación, o un `h1` oculto al principio |
| B7 | `src/screens/Espacio.tsx:148-153` y `:90`; `src/screens/Inicio.tsx:43` y `:160-178` | Las listas que cambian por sondeo (10 s) no anuncian "Te toca confirmar" a quien espera en el otro teléfono (27) | Una región `role=status` siempre montada cuyo texto cambie solo cuando aparece un turno nuevo |
| B8 | `src/screens/PlanTab.tsx:163-168` | Los puntos de confirmación (`role=img`) repiten la cifra que ya dice "Aceptaciones" (16-18) | Opcional: `aria-hidden` en `.puntos` |
| B9 | `src/styles.css:1002`, `:1007`, `:612`, `:621` | El "+" y "–" de `::after` entran al árbol accesible como texto (08, 14, 16…) | `content: '+' / ''` (texto alternativo vacío) |
| B10 | `src/screens/SimulacionTab.tsx:284` y `:299` | `aria-label` igual al texto fija el nombre: mientras trabaja, el lector sigue diciendo "Aceptar versión 1 por X" en vez de "Enviando…" (WCAG 2.5.3) | Quitar esos dos `aria-label` (`:289` y `:302` están bien) |
| B11 | `src/screens/Espacio.tsx:155`; `src/styles.css:219` y `:463` | 4 px entre la última tarjeta y "Nueva propuesta" (no hay regla de 8 px en el proyecto; es aire visual) | `.lista-tarjetas + .btn { margin-top: 12px }` |
| B12 | `src/components/Condiciones.tsx:27`; `src/screens/RespuestaTab.tsx:126`, `:130`; `.opcion-radio` en `styles.css` ~645 | Con el `fieldset` deshabilitado, la etiqueta elegida sigue con borde y fondo verde (el radio nativo sí se ve gris; la razón está justo debajo) | `fieldset:disabled .opcion-radio { cursor: not-allowed; border-color: var(--borde) }` |
| B13 | `src/styles.css:178-182`, `:590`, `:989`; `PlanTab.tsx:67`, `Inicio.tsx:441`, `Espacio.tsx:179` | En `details.tarjeta` solo el `summary` (44 px) responde; los 14 px de relleno de la tarjeta no | Cumple los 44 px; si se quiere, `margin: -14px -16px; padding: 14px 16px` en el `summary` |
| B14 | `src/screens/Inicio.tsx:384`, `:453`; `src/screens/Espacio.tsx:316` | "Unirme", "Crear espacio" y "Agregar a la simulación" quedan `disabled` sin explicación; los campos no declaran `required` (04, 27, 03) | Opcional: `aria-required` en los campos y una ayuda enlazada con `aria-describedby`. claude-b ya decidió mantener `disabled` |
| B15 | `src/screens/PlanTab.tsx:167`, `:181-182`, `:196`, `:203`; `:451`; `src/screens/Espacio.tsx:346` | "persona(s)" y "propuesta(s)" sin resolver; "0 de 4" dos veces seguidas. Los conteos sí cuadran (máximo 6, reservado 1) | Singular y plural; una sola fila de conteo |
| B16 | `src/screens/SimulacionTab.tsx:214`, `:215`, `:218`, `:265`, `:290`, `:296` | "Se baja: Mati" se lee como estado y no como acción; "Confirmó v1" abrevia. Lo demás ("Sin versión publicada", "A: Sí") es literal y correcto | "Confirmó la versión 1"; si se cambia "Se baja: X" hay que actualizar `tests/e2e/recorrido-dos-sesiones.mjs` (ver abajo) |
| B17 | `src/screens/NuevaPropuesta.tsx:247`, `:301`, `:324`; `src/screens/PlanTab.tsx:89`, `:159`; `src/lib/format.ts:9` | "America/Santiago" como identificador en pantalla ("hora de Santiago (America/Santiago)") | "hora de Chile"; `ZONA_VISIBLE` solo se usa para mostrar |
| B18 | `src/screens/NuevaPropuesta.tsx:303`; `src/screens/PlanTab.tsx:506`; `src/screens/RespuestaTab.tsx:20` | "esta pantalla no lo calcula", "el organizador pide al servidor…" (lo lee el propio organizador en tercera persona). "Lo decide el servidor" en la cuenta regresiva es un descargo a propósito: dejarlo | Sacar la frase de `:303`; segunda persona en `:506`. En `RespuestaTab.tsx:20`, "El grupo solo ve cuántas personas cargaron" es un tope (los miembros ven menos): precisar "el organizador solo ve cuántas respondieron" |
| B19 | `src/screens/RespuestaTab.tsx:52`, `:111`, `:129`; `PlanTab.tsx:450-451` | La portada dice "cuándo puede", el estado "disponibilidad" y la pestaña "condiciones"; nada dice que "Me interesa" no hace falta para que se busque opción | "condiciones" es el término del contrato y de las pruebas: no renombrar sin coordinar. Agregar una línea en "Tu interés": "Es opcional: lo que cuenta para armar el plan es tu disponibilidad" |
| B20 | `src/screens/NuevaPropuesta.tsx:313`, `:338`, `:341`, `:347-349` | "Nada se publica hasta que confirmes" usa "confirmar" con otro sentido; la explicación de "Abrir" va debajo de los botones | "hasta que toques un botón"; subir la nota sobre los botones |
| B21 | `src/screens/SimulacionTab.tsx:131` y `:90` | Tras cargar el caso, "En una sola operación: …" es jerga y la pestaña no ofrece saltar a Plan (el encabezado sí dice "Busca una opción compatible") | "Listo: cargué la disponibilidad de Mati, Caro, Fede y Sofi." y un botón "Ir a Plan" con `irAPestana('plan')` |
| B22 | `src/lib/api.ts:378`; `supabase/migrations/0028_e7_simular_solo_demo_y_mensaje.sql:129`; `src/components/ui.tsx:101` | En `asiento_en_uso` se muestran dos mensajes con dos sustantivos ("asiento" del servidor y "lugar" de la ayuda) | Unificar en "lugar" (el del servidor es migración) y no mostrar los dos juntos |

**Se miró y no cambia:** "Confirmar versión 1" (`PlanTab.tsx:232`): "versión" es el concepto central del producto (confirmación por versión) y la pantalla lo explica; no conviene reemplazarlo por la fecha. "Opción vigente" con el grupo confirmado es correcto. Los conteos "0 de 4 necesarias (máximo 6, disponibles 6)" y "Cupos libres para el resto: 5" son coherentes.

## Refutado o ya corregido en `7b0335b`
- "Saltar al contenido" y lo que recibe foco quedan bajo el encabezado fijo: ya no, `html { scroll-padding-top: 96px }` (`src/styles.css:61`, parte 2 de #44). La medición era de `9b62a2d`.
- Rótulo "Simulación" pegado al texto en el historial resumido: ya tiene espacio (`src/screens/PlanTab.tsx:412`, ítem 11 de claude-b). "Tomiorganizador" en el texto plano no es un defecto: el árbol accesible lee "Tomi organizador" porque `.etiqueta` es `inline-block`.
- El logo "CRU" + ícono + "E" se lee "CRUXE": `role=img` con `aria-label` (`src/components/Marca.tsx:36-43`) es el patrón correcto.

## Rótulos que fijan las pruebas de extremo a extremo
Si claude-b cambia alguno de estos textos, hay que cambiar también `tests/e2e/recorrido-dos-sesiones.mjs` (mío) y avisar a Codex por `tests/e2e/jurado-navegador.mjs` y `recorrido-canonico.test.ts`: "Probar la demo «Los del asado»", "Crear propuesta", "Revisar antes de crear", "Crear y abrir al grupo", "Reuniendo interés", "Unirme", "Reclamaste el lugar de Luna", "Me interesa", "Marcaste", "Sí puedo", "Guardar condiciones", "Guardado. Solo tú ves estas condiciones.", "Cargar condiciones del caso a las personas simuladas", "cargadas las condiciones de", "Buscar opción compatible", "Confirmar versión N", "Ya confirmaste la versión N", "Aceptar versión N por", "Confirmaron la versión N:", "Grupo confirmado", "Se baja: Caro", "Sí, Caro se baja", "En revisión", "Buscar alternativa", "Nadie confirmó todavía", "Estas confirmaciones no pasan a la versión 2", "Faltan por responder", "Con condiciones cargadas", "Este navegador ya está en este espacio como Tomi", "Entrar como otra persona", "queda guardada en este navegador", "Sí, entrar como Pepe", "Herramientas del organizador", "Este navegador guarda otra sesión: Tomi", "Volver a esa sesión".

## Orden sugerido para claude-b
1. A1 (título y foco por pantalla) y A2 (componente `Confirmacion`): son dos cambios chicos que arreglan lo que más pesa con lector.
2. M1 (zona tocable de volver), M2 (error de confirmar a la vista) y M7 (anillo de las pestañas): CSS y una línea.
3. M3 y M4 con un helper común de foco; M10 con un componente `Anuncio` (y ahí B5).
4. M8 y M9 (identidad y "sin conexión").
5. Textos M14 a M18, que son los que ve el jurado; los que tocan el servidor (M15, M16, M18) se piden al coordinador como una sola enmienda de textos.
6. M5, M6, M11, M12, M13 y la lista baja, cuando se toque cada archivo.

Capturas y mediciones (31 JSON y 31 PNG) están en mi carpeta temporal de la sesión; no van al repositorio.
