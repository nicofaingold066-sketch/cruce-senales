# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
(nada en `src/`: congelamiento del aviso de las 17:02.) **#67** asignada (aviso 16:51: A1 título y foco por pantalla, A2 confirmaciones con foco y "Volver" que devuelve el foco) y después **#68**. Las hago **sobre la base nueva con el rediseño de Juan** apenas avises que `src/` se descongela; no las empiezo sobre `main` viejo porque el rediseño reescribe los mismos archivos. Plan listo: hook de título y foco en cada pantalla (sin tocar el enganche de login en `App.tsx`/`shell.tsx`), componente `Confirmacion` en `ui.tsx` y `ref` en `Boton`.
## Estado
16:43: recibido el aviso de las 16:42 (sesión "login"). No toco `src/login/**` ni sus líneas de enganche en `shell.tsx`/`App.tsx` hasta que login entregue. Antes de cambiar `Inicio.tsx` aviso acá, y mantengo los nombres accesibles "Probar la demo «Los del asado»" y "Unirme".
15:40: **relevo**. Esta es la sesión local en la computadora de Nico (la de la nube quedó en pausa a las 14:55). Arranque hecho según el traspaso; vigía corriendo.
- **Por qué no se me vio entre 14:49 y ahora:** esta máquina no tenía credenciales de GitHub, así que mis reclamos (#47 a las 14:49, #52 a las 14:53) y mis entregas quedaron en commits locales. Mientras, el coordinador hizo #52 (`ca98414`), #47 (`c389722`) y #51 (`ea7342d`) en `wip/fundamentos`. **Descarté mis versiones de esas tres** y rearmé `wip/ui-enmienda` sobre `main` `7747bf6`.
- **Hallazgo en #47 de `main` (`c389722`), corregido abajo (`5204837`):** `supabase.auth.signOut({ scope: 'local' })` igual hace `POST /logout?scope=local` (auth-js 2.118, `GoTrueAdminApi.signOut`) y revoca en el servidor la sesión anónima que estaba en el navegador. En la notebook de la demo, si un jurado toca "Entrar como otra persona", la sesión de Tomi (organizador) no vuelve más. El traspaso pedía no usar `signOut` justo por esto. Mi arreglo mantiene tu flujo, tu confirmación y el borrado de `sessionStorage`; solo cambia cómo se abre la sesión nueva.
- Intermitencia observada (1 de 9 corridas del recorrido): en el paso 2 Luna entró bien pero no apareció el aviso "Reclamaste el lugar de Luna". No se reprodujo en 6 repeticiones de los pasos 1 y 2. Ver Ideas.
- Transparencia: una auditoría de 28 pantallas (15:08–15:12) se solapó con la 0028 (15:09–15:10); al empezar, `backend.md` no tenía MIGRACION EN CURSO. Desde el aviso de las 15:14 no corrí nada hasta que se liberó la base (15:18).
12:55: sigo `prompts/claude-b.md` (rama `coordinacion`) como guía. Arranque verificado (identidad Nico, merge de `wip/fundamentos` y `wip/agente-ia`, `.env`, lectura de README/PROPIEDAD/TABLERO/MEJORAS) y `./vigia.sh claude-b-interfaz 60` corriendo. Mejoras #2 y #4 entregadas; tomo #7, después #8, #9 y #14.

Figma (para todo el equipo):
- User flow + estados de la propuesta (FigJam): https://www.figma.com/board/sqWhMOQEdpT80S7YhXPtCl
- Identidad (logo X v2) + pantallas móviles reales: https://www.figma.com/design/RgQLomDluDvf2fBSlbaGUU

## Recorrido EN VIVO contra el backend real (14:3x, build de `wip/ui-enmienda` = `wip/fundamentos` 615ef0f + mi e7d868d)
Chromium sin cabeza, dos contextos = dos sesiones anónimas (Tomi y Luna), 390 px, a través de la interfaz (clics reales, sin tocar la API a mano). Se registró toda respuesta RPC con `ok:false` o `contrato` distinto de 2: **ninguna**.
1. Cargar demo "Los del asado" (Tomi): PASÓ (seis personas visibles).
2. Luna se une por código a un asiento limpio, otra sesión: PASÓ ("Reclamaste el lugar de Luna").
3. Tomi crea la propuesta A sáb 31 oct / B dom 1 nov 14:00-17:00, America/Santiago, y la abre: PASÓ.
4. Interés de Tomi y Luna: Confirmados = 0: PASÓ.
5. Condiciones privadas (Tomi y Luna cada uno en su sesión; simulados con el atajo del caso); Luna no ve condiciones ajenas: PASÓ.
6. Buscar opción → versión 1 franja A (con "Cupo del anfitrión reservado, libres para el resto: 5"): PASÓ.
7. Tomi, Luna (doble clic), Mati y Caro aceptan v1 → Grupo confirmado en las dos sesiones, 4 de 4 (sin duplicar): PASÓ.
8. Caro se baja → En revisión, "Bajas registradas", Luna no ve "Reparado": PASÓ.
9. Buscar alternativa → v2 franja B, "Todavía nadie confirmó la versión 2", Luna no ve confirmado: PASÓ.
10. Tomi, Luna, Mati y Fede aceptan v2 → Grupo confirmado otra vez en las dos sesiones: PASÓ.
11. Rama sin opción (propuesta nueva, Tomi "No puedo" A y B) → "Sin opción compatible", sin opción publicada, mínimo 4 intacto: PASÓ. (Variante: por evaluación inicial, no por reparación tras la baja.)
Además: `NODE_USE_ENV_PROXY=1 npm run test:backend` → 10 archivos, 100 pruebas pasan.

## Hecho
- **Mejora 4 entregada** (aviso 12:47 y 12:51), commits `0fe1b55` + `dd66806` + merge `3e81c69`: `AgentePanel` montado en el espacio dentro de un bloque plegable ("Agente del círculo (opcional)"), que se monta solo al abrir (plegado no hace llamadas); `tomarBorradorAgente` precarga título y franjas en Nueva propuesta (una sola vez, a prueba del doble efecto de StrictMode) con aviso "el agente no crea ni confirma nada". **Probado en vivo con la base del agente ya publicada**: preferencias → "Que el agente proponga" → borrador ("Asado en casa de Tomi", sáb/dom 14-17, texto fijo) → "Usar este borrador" → Nueva propuesta precargada. Recorrido canónico 11/11. No toqué `src/agente/**`. La pantalla de candidatas (4.1) llega cuando agente-ia la publique en `wip/agente-ia`; la traigo apenas esté.
- (pedido de Nico + aviso 12:42) Simulación compacta para la demo, commit `75f41c4`: tarjeta por persona con estado de un vistazo (Puede confirmar / Confirmó vN / Se bajó / No forma parte), solo acciones posibles, edición plegada; **todos los botones por persona dicen de quién son y tienen aria-label** ("Se baja: Caro", "Sí, Caro se baja", "Aceptar versión N por Mati", "Editar interés y condiciones de Fede"…); atajo nuevo "Aceptar versión N por <las que el servidor habilita>" (una llamada por persona, el servidor revalida cada una). En revisión ya no muestra "Ya confirmaste" (el acento usa solo los códigos de la enmienda 3). Pantalla de ~4700 px a ~1700 px en 375 px. Recorrido en vivo 11/11.
- (aviso 12:28) Atajo de simulación: UNA llamada a `simulate_load_case`, resumen con los nombres de `cargados` y `omitidos` (con motivo). Sin respaldo persona por persona. En vivo: "En una sola operación: cargadas las condiciones de Mati, Caro, Fede, Sofi." Commit `08a87c3`.
- Logo X v2 (pedido de Nico: "una X copada, inspirada en la de X con toque propio"): trazo grueso brasa (el plan) y trazo fino partido en dos personas que llegan al cruce desde lados opuestos y se encuentran en su borde. CRU✕E en el nombre; ícono `src/assets/cruxe-icono.svg`.
- Enmienda 3 en la UI: acento personal por `siguiente_accion.codigo` (`te_toca_aceptar`, `ya_aceptaste`) con respaldo en `puede.aceptar`/`acepte_version`; atajo de simulación con `simulate_load_case` y respaldo persona por persona si la operación no estuviera publicada.
- Enlace de invitación `#/unirse/<código>` (precarga el código, foco en el nombre) + botón "Compartir enlace" (menú nativo del teléfono o copia el enlace). Probado en vivo: Luna entra por el enlace.
- Solo social: "Crear espacio" ya no ofrece Empresa (tipo fijo "amigos").
- Identidad CRUXE: logo propio (dos trazos que vienen de lados opuestos y se encuentran = la X; en el nombre la X es el logo: CRU✕E), paleta brasa #B4400F / carbón #1F1A17 / papel #FAF6F1, fuente del sistema, ícono `src/assets/cruxe-icono.svg`.
- UX móvil: portada con lema y 3 pasos; estado de la propuesta grande y con color (texto del servidor); avance en puntos (números del servidor); "Confirmar versión N" fijo abajo en teléfono (52 px); ficha plegable; sin aviso repetido de versión nueva; pestañas sin cortar.
- Corte enmienda 2 (rama `wip/ui-enmienda`): contrato 2, `reset_demo` con intento, cupos reservados (`mi_situacion.motivo_aceptar`), errores `asiento_en_uso`/`intento_obsoleto`/`cupo_completo` con ayuda, falla antes/después de enviar.
- Plan sin red (aviso 11:21), verificado con un banco descartable (fuera del repo) que intercepta la red con datos ficticios del caso y abre las 4 pantallas a 320, 390 y 430 px en escenarios normal / cupo reservado / en revisión:
  1. Teléfono: sin desborde horizontal en ningún caso. Único hallazgo: enlaces de texto (logo, "Restablecer valores del caso", "Ver historial completo") con 24 px de alto; arreglado con zona tocable de 44 px (commit `e7d868d`).
  2. Estados vacío / error del servidor / sin conexión / sin opción: presentes y con texto en inicio, espacio, nueva propuesta y propuesta (ErrorCaja con Reintentar, banner "Sin conexión", "Sin opción compatible").
  3. Accesibilidad: foco visible (outline 3 px), enlace "Saltar al contenido", 0 botones sin texto.
  4. Textos del caso: Tomi, Luna, Mati, Caro, Fede, Sofi, franjas A y B 14:00 a 17:00, America/Santiago presentes.
- LÍMITE: todo eso con respuestas ficticias interceptadas, NO contra el servidor real. El recorrido en vivo sigue bloqueado por la red (ver Bloqueos).

## Siguiente
Orden del coordinador (14:37): #48 (hecha) → **#47** → **#44 parte 2**.

**#47 navegador compartido. Plan listo, sin código todavía.** Rutas: `src/screens/Inicio.tsx` (UnirsePorCodigo y la portada) y `src/lib/sesiones.ts` (nuevo).
- Si `join_space` responde `ya_era_miembro`, NO navegar. En el formulario va un aviso: "Este navegador ya está en este espacio como <nombre>". El nombre sale de `r.data.espacio.miembros` con `miembro_id === r.data.espacio.mi_miembro_id`. Dos botones:
  - "Entrar como otra persona": primario si el nombre escrito es otro.
  - "Seguir como <nombre>": navega al espacio.
- "Entrar como otra persona" NO usa `supabase.auth.signOut()`: en auth-js 2.118, `_signOut` llama a `/logout` y REVOCA la sesión anónima, que no se recupera. En la notebook de la demo Tomi se perdería.
  - En su lugar se guarda el `refresh_token` de la sesión actual en `localStorage` (`cruxe:sesion-guardada`, con una etiqueta "Tomi en «Los del asado»").
  - Después `supabase.auth.signInAnonymously()`, que solo reemplaza la sesión local, y se repite `join_space` con OTRA clave de intento.
  - Si `signInAnonymously` falla: se borra lo guardado y sigue la sesión de antes.
  - Si falla el segundo `join_space` (por ejemplo, nombre en uso): el error queda en el formulario, que se puede corregir y reenviar.
- En la portada, si hay una sesión guardada: "Este navegador guarda otra sesión: Tomi en «Los del asado»" con "Volver a esa sesión" y "Olvidarla".
  - "Volver" hace `supabase.auth.refreshSession({ refresh_token })` y después `location.reload()`.
  - Si el token no sirve, se borra y se avisa.
- El código de antes ya avisaba sin navegar distinto. El texto viejo "Este teléfono ya estaba en este espacio…" se reemplaza.
- Probar en vivo:
  1. Tomi abre `#/unirse/<su código>` en SU navegador y escribe "Luna": aviso y no entra.
  2. "Entrar como otra persona" → reclama a Luna con sesión nueva.
  3. En el inicio, "Volver a esa sesión" → otra vez Tomi organizador.
  - Además: doble clic sin duplicar y recorrido 11/11.

**#44 parte 2: arreglos visuales a 320 px.** Salen de la revisión de las 28 pantallas, de 14:30 a 14:45. Nada se rompe; todo es apretado o desprolijo.
- **Medio:**
  1. Leyenda de fieldset de dos líneas cruzada por el borde (`.grupo legend`, `.franja-cond legend`): leyenda con `float:left; width:100%` + `clear`.
  2. Radios "Sí puedo / No puedo / Pendiente" con anchos desparejos (`.opcion-radio`): a ≤400 px, `flex:1 1 calc(50% - 4px)`.
  3. Candidatas del agente con el radio solo en su línea: es `src/agente/agente.css`, se PIDE a agente-ia (grid `auto 1fr`).
  4. Pestañas del organizador en dos filas a 320 px, con "Simulación" sola: a ≤360 px, nowrap y letra 0.875rem, o grid 2×2.
  5. Encabezado de 3 líneas (~92 px): a ≤400 px, ocultar la `/` y `margin-left:auto` en "Datos ficticios".
  6. La barra fija `cta-fija` mide ~137 px: a ≤400 px, letra del texto 0.8rem y botón de 48 px.
  7. `html{scroll-padding-top}` para el encabezado fijo (la parte 1 solo puso el de abajo).
  8. Los `summary` de `.plegable` y `.sim-editar` sin indicador de abrir: el patrón `+/–` de `.ficha` y título de 1.15rem.
  9. Botones apilados de anchos desparejos ("Copiar código / Compartir enlace", "Sí, X se baja / Volver"): `.fila-botones` con gap 8 y `flex:1 1 auto`, y envolver Copiar/Compartir en `.fila-botones`.
  10. Fechas cortadas a la mitad en listas: `white-space:nowrap` en el `.suave` de la fecha.
  11. Rótulo SIMULACIÓN pegado al texto en "Historial resumido": espacio en `PlanTab.tsx` ~389.
  12. Columna del historial angosta: a ≤400 px, `3rem 12px 1fr` y `text-wrap:pretty`.
- **Menor:**
  - `text-wrap:balance` en botones, títulos y `.franja-grande`.
  - Borde izquierdo doble en `.estado-hero-turno` y `.plan-activo-turno`: usar `border-left` en vez de `box-shadow`.
  - "Versión N" sola a la derecha.
  - `.etiqueta` corrida 4 px en las tarjetas.
  - `small` del agente con interlineado suelto: es de agente-ia.
  - `.btn:disabled` lavado: estilo propio sin opacidad, sin tocar `[aria-disabled]`, que ahora significa "ocupado".
- Verificar con la auditoría a 320 y 375 px (28 pantallas, mide desborde, toques de 44 px y letra de 12 px) y el recorrido 11/11.

## Bloqueos
Ninguno. Red a Supabase habilitada por Nico (14:2x).

## Pedidos a otros
- coordinador (16:14): integrar `wip/ui-enmienda` = `7b0335b` (`main` `dda21c6` + `4945241` #44 parte 2 + `5204837` arreglo de #47; la fusión con main entró sin conflictos, typecheck y build en verde, recorrido 11/11). Si preferís dejar la #47 con `signOut`, revertí solo `5204837`; `4945241` no depende de él. La #56 ("5 de 4") la hizo agente-ia (`7107902`, ya en main): descarté mi versión.
- backend (15:40): gracias por E7.5 (0028) para `puede.simular` fuera de demo; con eso permiso e interfaz dicen lo mismo.
- backend (E7.3, 14:50): que `mi_situacion.puede.simular` sea false fuera de los espacios demo (hoy = organizador y activa y hay simulados). La interfaz ya oculta la Simulación con `espacio.demo` (`b2adc4d`); así el permiso del servidor y la interfaz dicen lo mismo.
- agente-ia (#44, 14:50): a 320 px, en `src/agente/agente.css`, `.agente-candidatas .opcion-radio` deja el radio solo en su línea ("Asado · Quincho de Tomi", SIMULACIÓN y "Recomendada" bajan). Propuesta: `display:grid; grid-template-columns:auto 1fr; column-gap:8px` y los `span` en la columna 2. También `.agente-panel small{display:block; line-height:1.4}`.
- coordinador (re aviso 12:23, nombre): Nico confirmó CRUXE en ESTA sesión (claude-b, ~12:15: "pongámosle nombre cruxe") y me autorizó a avanzar sin preguntar. Si querés confirmarlo con él en persona, llega en un rato. Mientras, dentro de `src/` ya está CRUXE; fuera de `src/` no toco nada.
- coordinador (nombre CRUXE, rutas tuyas): en `index.html` poner `<title>CRUXE</title>`, `<link rel="icon" type="image/svg+xml" href="/src/assets/cruxe-icono.svg">` y `<meta name="theme-color" content="#b4400f">`; cambiar CRUCE→CRUXE en README, AGENTS.md, docs/contexto-proyecto.md, docs/como-correr.md y textos del contrato. El esquema interno `cruce`, el repo y la URL de Vercel pueden quedar (decidilo vos).
- pitch-problema (nombre CRUXE, cuando retomes el sábado): `docs/pitch.md`, `docs/checkpoint-1.md`, `docs/readme-borrador.md` → CRUXE. El logo está en Figma (links en Estado).
- backend: por el nombre no hace falta nada (ningún mensaje del servidor dice CRUCE; solo comentarios y el esquema `cruce`).
- coordinador → backend (IDEAS de backend para que las decidas y asignes; son cambios de contrato, no los hago yo):
  1. `siguiente_accion` personal según quien mira. Hoy Luna ve "Versión 2: confirmaron 0 de 4. Falta la aceptación de Tomi." y no "te toca a vos". Propuesta: si `mi_situacion.puede.aceptar` → `{codigo:"te_toca_aceptar", texto:"Te toca confirmar la versión N."}`; si `acepte_version` → `{codigo:"ya_aceptaste", texto:"Ya confirmaste la versión N. Faltan X para el mínimo."}`. Mismo dato, sin exponer nada privado.
  2. Lista cerrada de `siguiente_accion.codigo` en el contrato (abrir_propuesta, reunir_condiciones, sin_opcion, aceptar_version, grupo_confirmado, buscar_alternativa, cancelado, …) para que la UI elija color o ícono por código y no por texto.
  3. `simulate_load_case(p_propuesta_id, p_intento_id)`: carga en UNA transacción las condiciones del caso a todos los simulados (un solo `state_rev`). Hoy el atajo hace 4-5 llamadas; si una falla en la demo en vivo, quedan condiciones a medias.
  4. Sondeo liviano: `get_proposal_state(p_propuesta_id, p_desde_rev)` que devuelva `{ok:true, sin_cambios:true, state_rev}` si no cambió. Hoy cada teléfono baja el estado completo cada 3 s.
  5. Aclarar en el contrato si la versión de reparación (v2) hereda el cierre de aceptación (jue 29 oct 20:00) o tiene uno propio; si es propio, exponer `opcion.plazo`.
  - Descartada a propósito: mostrar el motivo de "Sin opción" (rompe la privacidad: revelaría que Tomi no puede).

## Entregado
- **#47, arreglo sobre `c389722`**: `5204837` (15:40). Sin `signOut`: se guarda el `refresh_token` de la sesión actual en `localStorage` (`cruxe:sesion-guardada`, `src/lib/sesiones.ts`) y se abre otra sesión anónima; la portada ofrece "Volver a esa sesión" (`refreshSession({ refresh_token })` y recarga) y "Olvidarla" (con confirmación). Si ya hay otra guardada, no se pisa y la confirmación lo dice con botón de peligro. En vivo a 375 y 320 px: 12/12 (aviso sin entrar, la confirmación dice que se guarda, doble clic = 1 `join_space` y 1 sesión nueva, **0 llamadas a `/logout`**, vuelta a Tomi organizador). Recorrido 11/11.
- **#44 parte 2** arreglos visuales a 320 px: `4945241` (15:40). Leyendas dentro del recuadro; opciones de respuesta una por fila y del mismo ancho; pestañas del organizador en 2 × 2 a ≤360 px; encabezado de 3 a 2 líneas; `scroll-padding-top`; barra "Confirmar" más baja; +/– en `.plegable` y `.sim-editar`; botones parejos (Copiar/Compartir en `.fila-botones`); fechas sin cortar; espacio antes de SIMULACIÓN en el historial resumido; columna del historial más ancha; borde de "tu turno" sin doble línea; "Versión N" sin quedar sola; `.btn:disabled` gris sin opacidad (`aria-disabled` igual). Pendiente de agente-ia: `agente.css` (pedido de las 14:50). Auditoría de 28 pantallas a 320 y 375 px antes y después (sin desborde) y comparación de capturas lado a lado. Recorrido 11/11.
- (#52, #47 y #51: los hizo el coordinador en `main`; mis versiones locales se descartaron. La #51 la verifiqué igual en vivo antes de saberlo.)
- **#48** interfaz de la enmienda 7: `b2adc4d` (14:52).
  - E7.2: `pendientes` y `personas_con_condiciones` son `number | null`; con null no aparecen "Faltan por responder" ni "Con condiciones cargadas", y queda "N de M necesarias".
  - E7.3: la pestaña Simulación y las herramientas del organizador solo aparecen en espacios demo; el texto de "Crear un espacio" ya no promete simulados.
  - En vivo, con los conteos en null en las respuestas de Luna: 14/14. El organizador sigue viendo los números reales y un espacio propio no muestra Simulación en ningún lado. Recorrido 11/11.
- **#44 parte 1**: `23331e2` (14:35).
  - `Boton` ocupado usa aria-disabled: con `disabled` el foco caía en BODY después de cada acción.
  - Foco útil tras errores de acciones ("Reintentar", o el aviso si el foco se perdió), nunca en errores de sondeo.
  - `.btn-chico` a 44 px; la barra fija no tapa el foco; el estado de la propuesta se anuncia completo.
  - Auditoría de 28 pantallas a 375 y 320 px sin desborde. Error, sin red y 3 Enter seguidos (= 1 llamada) probados en vivo. Recorrido 11/11.
- **#43** textos sin promesa de unanimidad: `0445771` (14:28).
- Cinco arreglos de mi revisión adversarial propia: `c95952d` (14:21). Aviso al unirse si la sesión ya era miembro; tarjeta de opción reiniciada por versión; aviso de versión nueva consistente con la comparación; texto de "En revisión" preciso; atajo de simulación según `puede.simular`. En vivo; recorrido 11/11.
- Figma actualizado (14:18): página **"Pantallas v2"** en https://www.figma.com/design/RgQLomDluDvf2fBSlbaGUU con 10 pantallas reales del recorrido (portada, invitación, espacio, tu turno, Simulación, en revisión, v1 → v2, historial, tu plan, agente), para el pitch.
- Arreglo `0fd761d` (14:18): con un plan activo la portada oculta los botones de demo (en el segundo teléfono, "Probar la demo" le creaba a Luna otra demo donde era Tomi). Recorrido 11/11.
- **#15** sondeo liviano (interfaz): `6df9595` (14:12). La propuesta manda el último `rev_vista`; quieta → 3 de 3 sondeos cortos (~172 bytes); tras un cambio llega la completa. Recorrido 11/11.
- **#22** comparación v1 → v2 con "Sábado → Domingo" (`opcion_anterior`, enmienda 6): `a294210` (14:09). En vivo; recorrido 11/11.
- **#31** tarjetas del espacio con estado destacado: `a1fa96b` (14:07). Franja de color por estado, "Tu turno" por `siguiente_accion.codigo`, próxima acción del servidor en negrita en tu turno. En vivo con Luna y Tomi; recorrido 11/11.
- **#30** portada con el plan activo: `5e0a788` (14:04). "Tu plan" arriba con estado, versión y "Te toca confirmar" por código; un toque a la propuesta. Además: scroll arriba en cada pantalla nueva y "Abrir la demo" solo si la sesión organiza una (para un miembro creaba otra demo). En vivo con Luna; recorrido 11/11.
- **#14** paquete dividido: `6d9806c` (13:53). Inicial 528 → 460 KB (148 → 132 KB gzip), sin la advertencia; pantallas y agente en partes de 3 a 37 KB con precarga en segundo plano. Recorrido 11/11 y agente OK en vivo. (El resto del inicial es React + supabase-js; bajar más pediría tocar la config de Vite, que no es mía.)
- **#9** historial legible para el jurado: `460c8b5` (13:51). En orden, agrupado por versión, hora del servidor, marca de color por tipo, Simulación "por Tomi", cambio de estado como etiqueta y resumen (versiones, confirmaciones en total, bajas). Verificado en vivo; recorrido 11/11.
- **U5, U6, U7** de Codex: `a9fbe42` (13:48). U5 "Saltar al contenido" mueve el foco sin cambiar la ruta; U6 enlace de invitación mal formado → aviso "no es válido" + formulario (probado con "%", "%E0%A4%A", "ABC%20DEF"); U7 cupo reservado sin promesa ("podrás confirmar si se libera un cupo para otros"). Recorrido 11/11. **Con esto U1–U7 quedan entregados.**
- **U4** el panel de Simulación respeta el state_rev: `7f01756` (13:45). En vivo con dos pedidos retenidos (foto vieja entregada al final): con el arreglo muestra el dato nuevo y no retrocede; con el código anterior seguía mostrando el viejo. Recorrido: 3 corridas seguidas 11/11; una corrida previa dio 9/11 (falló el paso 10, aceptar v2 desde Simulación) y no se repitió: probable intermitencia de tiempos, lo sigo mirando.
- **U1** la lista del espacio no retrocede ni reaparece tras un reinicio: `188f22e` (13:37). En vivo con una respuesta vieja retenida 9 s: tras cancelar sigue "Cancelado"; tras reiniciar siguen 0 tarjetas. Recorrido 11/11.
- **#24** `demo={espacio.demo}` a `AgentePanel` (pedido de agente-ia): `5bea676` (13:29), con merge de `wip/agente-ia` `b709369`. En vivo: selector de clima simulado solo en el demo.
- **U3** tope de 10 s en cada RPC: `10b014d` (13:29). En vivo: escritura colgada → aviso "No pudimos confirmar el resultado" a los 10 s, reintento con el MISMO intento y una sola aceptación; lectura colgada → el sondeo sigue. Recorrido 11/11.
- **U2** ("Crear y abrir" ya no crea dos propuestas): `a4b1e30` (13:26). Bloqueo del flujo completo crear → abrir → navegar; si abrir falla, no se recrea y se avisa en la propuesta. Repro de Codex en vivo (open demorado 5 s + 5 clics): 1 create, 1 open, 1 propuesta (2 de 2). Recorrido 11/11.
- Integración de `wip/agente-ia` `9cfd290` (enmienda 4.1: candidatas + `agente.css`) en `wip/ui-enmienda`: merge `f120056` (13:20). Verificado en vivo: candidatas con "Por qué", "Mensaje para el grupo" y fuente; "Usar esta opción" precarga Nueva propuesta; recorrido canónico 11/11. (Respuesta al pedido 13:18 de agente-ia.)
- **#8** reparación obvia (v1 → v2): `878caea` (13:03). Tarjeta "El plan cambió: versión 1 → versión 2" con quién confirmó la anterior (historial), quién se bajó y la vigente desde cero. Verificado en vivo 11/11.
- **#7** primera pantalla en 5 segundos: `764b1cb` (12:57). Arriba del pliegue en 375×812 y 320×640: logo, lema, qué hace en una frase, "Probar la demo «Los del asado»" y "Tengo un código de invitación"; tres pasos numerados. Recorrido en vivo 11/11.
- **#2** botones por persona en Simulación con nombre y aria-label: `75f41c4` (wip/ui-enmienda). Verificado en vivo 11/11.
- **#4** enganche del agente (AgentePanel en el espacio, precarga con tomarBorradorAgente): `0fe1b55` + `dd66806` + merge `3e81c69`. Verificado en vivo con la base del agente publicada.
- Antes (fuera de MEJORAS): `08a87c3` simulate_load_case con resumen, `a890f11` enmienda 3 + logo X v2 + invitación por enlace, `68f4b71`/`b6578ce` identidad y UX móvil.

## Ideas
- Aviso de un solo uso (`dejarAviso`/`tomarAviso`) más robusto: hoy se consume en el inicializador de `useState` de la pantalla destino; si React descarta ese primer render, el aviso se pierde (posible causa de la intermitencia del paso 2). Consumirlo en un efecto. Dueño: claude-b-interfaz.
- Portada: mientras "Buscando tus espacios…" se ven los botones de demo; en el segundo teléfono, un toque rápido crea otra demo donde Luna sería Tomi. Ocultarlos hasta que responda `list_my_spaces`. Dueño: claude-b-interfaz.
- Sondeo liviano también para la lista del espacio y el panel de Simulación (hoy bajan todo cada 10 s y 3 s): pediría `p_desde_rev` en `list_proposals` y `get_simulation_panel`. Dueño: backend + claude-b-interfaz.
- Para el jurado: modo "presentación" que agranda letra y botones en la pantalla de la propuesta (un toque en el encabezado). Dueño: claude-b-interfaz.
- Navegación: el botón atrás del teléfono vuelve a la pantalla anterior pero el scroll arranca arriba; para Historial y Simulación largos podría conservarse por pantalla. Dueño: claude-b-interfaz (baja prioridad).
- En la portada, si la sesión ya tiene la demo, mostrar directo la tarjeta de la propuesta activa con su estado ("Te toca confirmar") para que el segundo teléfono llegue en un toque. Dueño: claude-b-interfaz.
- Tarjetas de propuestas en la pantalla del espacio con el mismo estado destacado (color + punto) y "Tu turno" según `siguiente_accion.codigo`: hoy son texto plano. Dueño: claude-b-interfaz.
- Actualizar el archivo de Figma con la Simulación compacta y el agente plegado, para el pitch. Dueño: claude-b-interfaz.
- Timeout de RPC en el cliente (U3 de Codex): una llamada colgada congela botones y sondeo durante la demo. Dueño: claude-b-interfaz (lo tomo con U1–U7).

## Traspaso a la sesión local (vie 23 oct, 14:55)

Sección para la sesión de claude-b-interfaz que sigue en la computadora de Nico. **Si sos esa sesión, leé todo lo de abajo y seguilo al pie de la letra.** Todo el resto de este archivo (Siguiente, Entregado, Pedidos) también es tuyo.

### Traspaso: sos claude-b-interfaz (CRUXE)

Sos **claude-b-interfaz**, el agente de INTERFAZ de **CRUXE** (antes "CRUCE") en la hackatón Señales de Makana (23 y 24 oct 2026). La entrega es el **sábado 24 a las 13:00** y se guarda el último commit de `main`. El **sábado a las 11:00 se congelan las funciones**: desde ahí, solo se arreglan defectos. Tomá la hora siempre del reloj: `TZ=America/Santiago date`.

Retomás el trabajo de otra sesión que ya no está. Este documento es todo lo que sabés. **Antes de tocar nada, leé TODO lo que se indica en el paso 1.** No adivines: si algo no está acá ni en el repo, preguntale a Nico.

---

#### 0. Quién es quién y qué es tuyo
- **Usuario humano:** Nico Faingold (decide). En el equipo también está Juan Morales (`JuanMorales10`).
- **Repo:** https://github.com/nicofaingold066-sketch/cruce-senales
- **Tu rama de código:** `wip/ui-enmienda`. Empujá SOLO ahí. Nunca a `main`, `wip/fundamentos` ni a otra rama; el coordinador integra.
- **Tus rutas:** todo `src/**` **salvo `src/agente/**`**, que es de la sesión agente-ia.
- **No tocás:** `supabase/`, `tests/`, `docs/`, `package.json`, `package-lock.json`, configuración (Vite, TS, Vitest), `index.html`, `README.md`, `AGENTS.md`. Si necesitás algo ahí, pedilo en tu archivo de coordinación (sección 3).
- **Otros agentes:**
  - coordinador: sesión "Coordinador CRUCE", computadora A. Integra, despliega y decide el contrato.
  - backend: dueño de `supabase/` y `tests/backend/`.
  - codex: revisiones y E2E en la rama `codex/revisiones`.
  - agente-ia: `src/agente/**` y `supabase/functions/agente/**`, en la rama `wip/agente-ia`.
  - pitch-problema: docs del pitch.
- **Identidad de git** (regla de las bases), configurada en las DOS copias:
  ```
  git config user.name "Nico Faingold"
  git config user.email "296561131+nicofaingold066-sketch@users.noreply.github.com"
  ```

#### 1. Arranque: hacelo en orden y leé absolutamente todo
1. Clonar o actualizar, y pasarte a tu rama:
   ```
   git clone https://github.com/nicofaingold066-sketch/cruce-senales.git && cd cruce-senales
   git fetch origin && git switch wip/ui-enmienda && git pull
   git merge origin/wip/fundamentos && git merge origin/wip/agente-ia
   npm ci
   ```
2. Coordinación. Es una rama sin código y es el canal con los demás agentes:
   ```
   git fetch origin coordinacion && git worktree add ../cruce-coord coordinacion
   ```
   Si ya existe: `git -C ../cruce-coord pull --rebase`.
3. **Leé enteros**, en este orden:
   - En `../cruce-coord`:
     - `prompts/claude-b.md`: **tu guía oficial; seguila al pie de la letra.**
     - `README.md`: reglas de coordinación, el vigía y la "bola de nieve".
     - `PROPIEDAD.md`: quién escribe cada ruta.
     - `TABLERO.md`: todos los avisos `PARA claude-b-interfaz` y `PARA todos`.
     - `MEJORAS.md`: la lista viva y priorizada de mejoras.
     - `agentes/claude-b-interfaz.md`: tu archivo, con estado, entregas, pedidos e ideas.
     - El resto de `agentes/*.md`.
     - `entorno-publico.txt`.
   - En el repo de código:
     - `AGENTS.md` y `CLAUDE.md`.
     - `docs/caso-canonico.md`: el caso de la demo, "Los del asado".
     - `docs/contexto-proyecto.md`.
     - `docs/contrato.md` con TODAS las enmiendas `docs/contrato-enmienda-*.md` (2, 3, 4 con la 4.1, 5, 6 y 7). **Mandan las enmiendas.** Desde `origin/wip/fundamentos`.
     - `docs/correcciones-altas-1.md`.
   - Las revisiones de Codex en `origin/codex/revisiones` (`docs/revision-codex-*.md`). U1–U7 ya están entregados; mirá si hay hallazgos nuevos.
   - Todo `src/`: pantallas en `src/screens`, componentes en `src/components`, y `src/lib/{api,types,hooks,format,shell,supabase}.ts(x)`, `src/App.tsx`, `src/styles.css`. Leé `src/agente/` también, sin editarlo.
4. Creá el `.env` en la raíz del repo de código con las dos líneas `VITE_` de `entorno-publico.txt`. Es la clave *publishable*, que no es secreta. **Nunca lo commitees**; ya está en `.gitignore`.
5. Dejá corriendo el vigía, con la herramienta Monitor o en segundo plano: `cd ../cruce-coord && bash ./vigia.sh claude-b-interfaz 60`. En la primera pasada repite TODOS los avisos viejos, que ya están resueltos. Después solo avisa lo nuevo. Cada línea nueva es un aviso: leelo y actuá si es tuyo.

#### 2. Producto: reglas que no se rompen
- Solo lo **social** (caso 06, "Los del asado"). **Nada de "Empresa"**: ya se quitó del formulario.
- **Interés no es confirmación.** El silencio nunca es asistencia.
- Las condiciones y preferencias de cada persona son **privadas**: nunca aparecen para otros, en errores ni en logs.
- **El servidor decide** cupos, plazos, elegibilidad, estado y confirmación. La interfaz **nunca calcula autoridad**: solo muestra lo que devuelve el servidor.
- Una confirmación vale para **una versión**. La reparación crea una **versión nueva sin aceptaciones heredadas**. Nunca mostrar "Reparado" ni "Confirmado" antes de que lo diga el servidor.
- Usá `siguiente_accion.codigo` para colores e íconos, nunca el texto. La lista cerrada está en `src/lib/types.ts` (`CODIGOS_SIGUIENTE`) y en la enmienda 3.
- **No hay datos reales ni secretos.** **No agregues dependencias.** Nada de servicios pagos.
- La IA (el agente) **solo propone y explica**: no crea ni confirma nada.

#### 3. Protocolo de coordinación (README de `coordinacion`)
1. **Reclamá antes de tocar.** En `../cruce-coord/agentes/claude-b-interfaz.md`, sección "Tocando ahora", poné la mejora (#) y las rutas exactas. Después commit (`claude-b-interfaz: <qué>`) y `git push origin coordinacion`. Si da error de fast-forward: `git pull --rebase` y repetí el push.
2. Solo escribís TU archivo de `agentes/`. `TABLERO.md`, `PROPIEDAD.md` y `MEJORAS.md` son del coordinador.
3. Reportá cada ~20 minutos y al cerrar cada corte. Al terminar:
   - vaciá "Tocando ahora";
   - en "Entregado", anotá el número de mejora y el commit;
   - en "Ideas", agregá una o dos mejoras nuevas (qué, por qué y dueño probable).
4. **Bola de nieve:** al terminar, tomá la siguiente mejora `libre` tuya de `MEJORAS.md` (P1 antes que P2, P2 antes que P3) y seguí sin parar.
5. Si algo es de otro dueño, va en "Pedidos a otros" y seguís con otra cosa. **Nunca edites rutas ajenas.**
6. **No dejes cambios sin commitear en el repo de código.** Un hook de cierre exige el árbol limpio. Por eso los scripts de prueba van FUERA del repo, en un temporal.

#### 4. Cómo verificar (obligatorio antes de cada push a `wip/ui-enmienda`)
1. Corré `npm run typecheck` y `npm run build`, y que den verde.
2. **Probá en vivo contra el backend real, con dos sesiones distintas.** Dos pestañas del mismo perfil comparten sesión; usá dos contextos de navegador o dos teléfonos. Se hace así:
   - Corré `npm run build` y después `npx vite preview --port 4173`, y abrí http://localhost:4173.
   - Usá el script `e2e-recorrido.js` (está al final de esta sección, en "Scripts de prueba", con el comando para extraerlo) junto con `a375.js` (auditoría de 28 pantallas a 375 y 320 px: `ANCHO=320 node a375.js`, deja capturas e `informe-<ancho>.json` en `./a375/`) y `v48.js`/`v48b.js` (verificación de la enmienda 7). Ponelo fuera del repo y correlo con `node e2e-recorrido.js`. Tiene que dar **11/11 PASÓ** y "(ninguna)" respuesta `ok:false` o con `contrato` distinto de 2.
   - Los pasos:
     1. Tomi carga la demo con "Probar la demo «Los del asado»".
     2. Luna entra por el enlace `#/unirse/<código>`, que se comparte desde el espacio con "Compartir enlace", y reclama su asiento.
     3. Tomi crea la propuesta y la abre con "Revisar antes de crear" → "Crear y abrir al grupo".
     4. Los dos marcan interés y los confirmados siguen en 0.
     5. Cada uno carga sus condiciones: Tomi y Luna "Sí puedo" en A y B. Los simulados se cargan con "Cargar condiciones del caso a las personas simuladas".
     6. Tomi pulsa "Buscar opción compatible" y sale la versión 1 en la franja A. Luna ve "Te toca confirmar".
     7. Confirman Tomi y Luna (Luna con doble clic, sin duplicar), y después "Aceptar versión 1 por Mati, Caro". Resultado: grupo confirmado en las dos sesiones.
     8. "Se baja: Caro" → "Sí, Caro se baja". El plan pasa a "En revisión".
     9. "Buscar alternativa" → versión 2 en la franja B con cero heredadas. Aparece la tarjeta "El plan cambió: versión 1 → versión 2".
     10. Confirman Tomi, Luna, "Aceptar versión 2 por Mati" y "por Fede". Grupo confirmado.
     11. En una propuesta nueva, Tomi marca "No puedo" en A y B. Resultado: "Sin opción compatible".
   - Para la demo, el segundo teléfono **siempre entra como Luna**. En demos viejos, Mati, Caro, Fede y Sofi ya no se pueden reclamar porque tienen preferencias.
   - Si trabajás en la nube de Claude Code:
     - el dominio `tjkfdnvzsikncjbskufm.supabase.co` tiene que estar permitido en la red del entorno;
     - para las pruebas de Node usá `NODE_USE_ENV_PROXY=1 npm run test:backend`;
     - lanzá Chromium con `proxy: { server: process.env.HTTPS_PROXY }`. El script ya lo hace solo.
3. Capturá pantallas a 320, 375 y 430 px y miralas: sin desborde horizontal, zonas tocables de 44 px como mínimo y foco visible.

#### 5. Estado al traspaso (vie 23 oct, ~14:55 Santiago)
- `wip/ui-enmienda` está en **`b2adc4d`**. Todo commiteado y empujado; el árbol queda limpio.
- `main` ya integra hasta la #43 y la #44 parte 1 (aviso del coordinador de 14:37). Publica solo el coordinador: GitHub está desconectado de Vercel y empujar no despliega.
- Lo último entregado:
  - **#48** `b2adc4d`: interfaz de la enmienda 7. Los conteos `pendientes` y `personas_con_condiciones` pueden llegar en null para quien no organiza; la Simulación solo aparece en espacios demo.
  - **#44 parte 1** `23331e2`:
    - `Boton` ocupado usa `aria-disabled`, para no perder el foco;
    - `ErrorCaja enfocar` en los errores de acciones;
    - `.btn-chico` a 44 px;
    - `aria-atomic` en el estado de la propuesta.
  - **#43** `0445771`: textos sin promesa de unanimidad.
  - Antes: U1–U7, #2, #4, #7, #8, #9, #14, #15, #22, #24, #30 y #31. El detalle está en "Entregado" de tu archivo de coordinación.
- **Enmienda 7 en curso en backend** (migraciones 0024–0027). **Mientras `agentes/backend.md` diga "MIGRACION EN CURSO", no corras pruebas contra la base.**
- **Identidad visual:**
  - Logo: X con un trazo grueso de brasa (el plan) y uno fino partido en dos personas. Nombre CRU✕E. Está en `src/components/Marca.tsx` y el ícono en `src/assets/cruxe-icono.svg`.
  - Colores: brasa `#B4400F`, carbón `#1F1A17`, papel `#FAF6F1`.
- **Figma:**
  - User flow (FigJam): https://www.figma.com/board/sqWhMOQEdpT80S7YhXPtCl
  - Identidad y pantallas: https://www.figma.com/design/RgQLomDluDvf2fBSlbaGUU. Las páginas son "Identidad", "Pantallas móviles" y **"Pantallas v2"** (10 pantallas reales).
  - **Figma y pitch quedan para el sábado** (pedido de Nico): hoy no se trabajan.

#### 6. Lo que queda, en este orden (orden del coordinador de 14:37)
Todo el detalle está en la sección **"Siguiente"** de `../cruce-coord/agentes/claude-b-interfaz.md`. Leela entera.

**A. #47 Navegador compartido.** El plan completo está en "Siguiente".
- Reclamala con la hora y hacela.
- **Clave:** NO uses `supabase.auth.signOut()`, que revoca la sesión anónima de Tomi sin vuelta. Guardá el `refresh_token` de la sesión actual en `localStorage` y después llamá a `signInAnonymously()`, que solo reemplaza la sesión local. En la portada va "Volver a esa sesión", que usa `refreshSession({ refresh_token })` y recarga.

**B. #44 parte 2: arreglos visuales a 320 px.** Son 12 de prioridad media y 6 menores, listados en "Siguiente".
- Corrí `a375.js` antes y después y miralo en las capturas.
- Lo de `src/agente/agente.css` ya está pedido a agente-ia: no lo toques.

**C. Después:** las mejoras `libre` tuyas de `MEJORAS.md` y los avisos del vigía (bola de nieve).

#### 7. Trampas conocidas
- **Router por hash** (`#/`, `#/e/<id>`, `#/e/<id>/nueva`, `#/e/<id>/p/<id>`, `#/unirse/<código>`). Cualquier `<a href="#algo">` rompe la navegación; usá botones con scroll o foco.
- `tomarBorradorAgente` **borra** el borrador al leerlo. La guarda con `useRef` en NuevaPropuesta evita que el doble efecto de StrictMode lo pise.
- Las RPC del agente devuelven `PGRST202` si no están publicadas. La interfaz muestra "todavía no está disponible" y no se rompe.
- Hay que **mantener los nombres accesibles de los botones**, porque las pruebas en vivo y Codex los usan:
  - "Probar la demo «Los del asado»", "Compartir enlace", "Unirme";
  - "Revisar antes de crear", "Crear y abrir al grupo";
  - "Me interesa", "Guardar condiciones", "Buscar opción compatible", "Confirmar versión N", "Buscar alternativa";
  - "Cargar condiciones del caso a las personas simuladas", "Aceptar versión N por X", "Se baja: X", "Sí, X se baja".
- `mi_situacion.motivo_aceptar` (no `puede.motivo`) da `"cupo_reservado"`.
- Cada push tuyo a `coordinacion` vuelve como evento del vigía. No es un pedido nuevo.
- El vigía hace `fetch` en `../cruce-coord`: antes de `git pull --rebase` ahí, esperá 1 s (`sleep 1`). Si sale "Cannot rebase onto multiple branches", reintentá.
- `Boton` con `ocupado` ya NO pone `disabled` (usa `aria-disabled` y bloquea el clic): en Playwright no esperes `toBeDisabled()` mientras trabaja.
- `ErrorCaja` lleva `enfocar` SOLO en errores de acciones de la persona, nunca en errores de carga o sondeo, que se repiten cada 10 s y robarían el foco.
- Solo hacé commit si el recorrido da 11/11 (`if [ "$P" = "11" ]`). No encadenes el commit sin mirar el resultado.

Empezá por el paso 1 completo. Después reclamá la #47 con la hora actual en tu archivo de coordinación y seguí la sección 6 sin parar, reportando cada ~20 minutos.

### Scripts de prueba (van FUERA del repo de código)

Para extraerlos, parado en una carpeta fuera del repo (por ejemplo, `../cruxe-pruebas`, hermana de `cruce-senales` y `cruce-coord`), corré este comando, que escribe los cuatro archivos:

```
node -e "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');for(const m of s.matchAll(/<!-- archivo: (\S+) -->\n\x60\x60\x60js\n([\s\S]*?)\n\x60\x60\x60/g)){fs.writeFileSync(m[1],m[2]+'\n');console.log('escrito',m[1])}" ../cruce-coord/agentes/claude-b-interfaz.md
```

Ajustá la ruta del final si tu copia de `coordinacion` está en otro lado. Se corren con `node <script>` contra `npx vite preview --port 4173` (después de `npm run build`, con `.env`). Usan Playwright: el global (`npm i -g playwright` + `npx playwright install chromium`) o el del proyecto si está. En local no hace falta proxy.

<details><summary><code>e2e-recorrido.js</code>: recorrido canónico de 11 pasos con dos sesiones (Tomi y Luna). Tiene que dar 11/11 PASÓ y "(ninguna)".</summary>

<!-- archivo: e2e-recorrido.js -->
```js
// Recorrido canónico de CRUXE EN VIVO por la interfaz (dos sesiones: Tomi y Luna) contra el backend real.
// Uso: 1) npm run build && npx vite preview --port 4173  (con .env)  2) node e2e-recorrido.js
// Requiere Playwright (global o local) y Chromium. En la nube de Claude Code: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
// y el proxy de HTTPS_PROXY; en local no hace falta proxy. Registra toda respuesta RPC con ok:false o contrato != 2.
// Script de prueba descartable de claude-b-interfaz: NO va en src/ (tests/e2e es de Codex).
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const BASE = process.env.BASE || 'http://localhost:4173/';
const res = []; const errs = [];
const ok = (paso, extra = '') => { res.push(`PASÓ  ${paso}${extra ? ' — ' + extra : ''}`); console.log(res.at(-1)); };
const fail = (paso, e) => { res.push(`FALLÓ ${paso} — ${String(e).split('\n')[0].slice(0, 300)}`); console.log(res.at(-1)); };
async function abrir(br, quien) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 900 } });
  const p = await ctx.newPage();
  p.on('response', async (r) => {
    const m = r.url().match(/rpc\/(\w+)/); if (!m) return;
    try { const j = await r.json(); if (j && j.ok === false) errs.push(`${quien} ${m[1]} -> ${JSON.stringify({ contrato: j.contrato, error: j.error, state_rev: j.state_rev })}`);
      if (j && j.contrato !== 2) errs.push(`${quien} ${m[1]} contrato=${j.contrato}`); } catch {}
  });
  p.on('pageerror', (e) => errs.push(`${quien} pageerror ${e.message}`));
  return p;
}
const texto = (p) => p.locator('main').innerText();
const esperaTexto = (p, t, ms = 15000) => p.getByText(t, { exact: false }).first().waitFor({ timeout: ms });
const tab = (p, n) => p.getByRole('tab', { name: n, exact: true }).click();
const btn = (p, n, exact = true) => p.getByRole('button', { name: n, exact }).first();
async function misCondiciones(p, a, b) {
  await tab(p, 'Mi respuesta');
  for (const [k, v] of [['A', a], ['B', b]]) await p.locator('fieldset', { has: p.locator('legend', { hasText: `Franja ${k}:` }) }).first().getByLabel(v, { exact: true }).check();
  await btn(p, 'Guardar condiciones').click();
  await p.waitForTimeout(1500);
}
async function simAceptar(p, nombre, v) { await tab(p, 'Simulación'); const b = btn(p, `Aceptar versión ${v} por ${nombre}`); await b.waitFor({ timeout: 10000 }); await b.click(); await p.waitForTimeout(1500); }
async function crearPropuesta(T, espacioUrl) {
  await T.goto(espacioUrl); await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click();
  await btn(T, 'Revisar antes de crear').click(); await btn(T, 'Crear y abrir al grupo').click();
  await T.waitForURL(/#\/e\/[^/]+\/p\//, { timeout: 15000 }); await esperaTexto(T, 'Reuniendo interés');
  return T.url();
}
(async () => {
  const opts = { args: ['--no-sandbox'] }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium'; if (process.env.HTTPS_PROXY) opts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  const br = await pw.chromium.launch(opts);
  const T = await abrir(br, 'Tomi'); const L = await abrir(br, 'Luna');
  let espacioUrl, codigo, propUrl;
  const pasos = [
    ['1. Cargar demo "Los del asado" (Tomi)', async () => { await T.goto(BASE + '#/'); await btn(T, 'Probar la demo «Los del asado»').click(); await T.waitForURL(/#\/e\//, { timeout: 15000 }); await esperaTexto(T, 'Código de invitación'); espacioUrl = T.url(); codigo = (await T.locator('strong.codigo').innerText()).trim(); const t = await texto(T); for (const n of ['Tomi', 'Luna', 'Mati', 'Caro', 'Fede', 'Sofi']) if (!t.includes(n)) throw 'falta ' + n; return 'código ' + codigo.replace(/./g, (c, i) => (i < 2 ? c : '•')); }],
    ['2. Luna entra por el ENLACE de invitación y reclama un asiento limpio (otra sesión)', async () => { if (!(await T.getByRole('button', { name: 'Compartir enlace' }).count())) throw 'falta Compartir enlace'; await L.goto(BASE + '#/unirse/' + codigo); await L.getByText('Te invitaron a un plan').waitFor(); if ((await L.getByLabel('Código de invitación').first().inputValue()) !== codigo) throw 'código no precargado'; const f = L.locator('form', { has: L.getByRole('heading', { name: 'Unirme con un código' }) }); await f.getByLabel('Tu nombre en el espacio').fill('Luna'); await f.getByRole('button', { name: 'Unirme', exact: true }).click(); await L.waitForURL(/#\/e\//, { timeout: 15000 }); await esperaTexto(L, 'Reclamaste el lugar de Luna'); }],
    ['3. Tomi crea la propuesta con A y B y la abre', async () => { propUrl = await crearPropuesta(T, espacioUrl); const t = await texto(T); if (!/Sábado 31 oct 2026, 14:00 a 17:00/.test(t) || !/Domingo 1 nov 2026, 14:00 a 17:00/.test(t) || !t.includes('America/Santiago')) throw 'franjas/zona no visibles'; }],
    ['4. Interés de Tomi y Luna no suma confirmados', async () => { await tab(T, 'Mi respuesta'); await btn(T, 'Me interesa').click(); await L.goto(propUrl); await L.getByRole('tab', { name: 'Mi respuesta', exact: true }).waitFor({ timeout: 15000 }); await tab(L, 'Mi respuesta'); await btn(L, 'Me interesa').click(); await L.waitForTimeout(1500); await tab(T, 'Plan'); await T.waitForTimeout(3500); const t = await texto(T); const m = t.match(/Confirmados\s*\n?\s*(\d+)/); if (!m || m[1] !== '0') throw 'Confirmados no es 0: ' + (m ? m[1] : 'no visible'); return 'Confirmados 0 con interés marcado'; }],
    ['5. Condiciones privadas: Tomi A+B, Luna A+B (cada uno en su sesión), simulados con el atajo del caso', async () => { await misCondiciones(T, 'Sí puedo', 'Sí puedo'); await misCondiciones(L, 'Sí puedo', 'Sí puedo'); await tab(T, 'Simulación'); await btn(T, 'Cargar condiciones del caso a las personas simuladas').click(); await T.waitForTimeout(4000); const tl = await texto(L); if (/Caro[^\n]*(A: Sí|Solo A)/.test(tl)) throw 'Luna ve condiciones de Caro'; const st = await T.locator('[role=status]').allInnerTexts(); return 'atajo: ' + (st.find((x) => /En una sola operación|Guardadas:/.test(x)) || '?').slice(0, 200); }],
    ['6. Buscar opción: versión 1 en franja A', async () => { await tab(T, 'Plan'); await btn(T, 'Buscar opción compatible').click(); await esperaTexto(T, 'Opción vigente · Versión 1'); const t = await texto(T); if (!t.includes('Sábado 31 oct 2026, 14:00 a 17:00')) throw 'v1 no es franja A'; await tab(L, 'Plan'); await esperaTexto(L, 'Opción vigente · Versión 1'); const h = await L.locator('.estado-hero').innerText(); if (!/Tu turno|Te toca confirmar/.test(h)) throw 'Luna no ve que es su turno: ' + h.replace(/\s+/g, ' '); return 'Luna: ' + h.replace(/\s+/g, ' ').slice(0, 110); }],
    ['7. Tomi, Luna, Mati y Caro aceptan v1 (doble clic de Luna) → Grupo confirmado en las dos sesiones', async () => { await btn(T, 'Confirmar versión 1').click(); await T.waitForTimeout(1500); await tab(L, 'Plan'); await btn(L, 'Confirmar versión 1').dblclick(); await L.waitForTimeout(2000); await tab(T, 'Simulación'); const bt = T.getByRole('button', { name: 'Aceptar versión 1 por Mati, Caro', exact: true }); await bt.waitFor({ timeout: 10000 }); await bt.click(); await T.getByText('Confirmaron la versión 1: Mati, Caro.').waitFor({ timeout: 15000 }); await tab(T, 'Plan'); await esperaTexto(T, 'Grupo confirmado'); await esperaTexto(L, 'Grupo confirmado', 10000); const t = await texto(L); const m = t.match(/(\d+) de 4\s*\n?\s*necesarias/); return 'Luna ve ' + (m ? m[0].replace(/\s+/g, ' ') : '?'); }],
    ['8. Caro se baja → En revisión, baja registrada', async () => { await tab(T, 'Simulación'); const c = T.locator('section[aria-label="Simulación de Caro"]'); await c.getByRole('button', { name: 'Se baja: Caro', exact: true }).click(); await c.getByRole('button', { name: 'Sí, Caro se baja', exact: true }).click(); await T.waitForTimeout(1500); await tab(T, 'Plan'); await esperaTexto(T, 'En revisión'); await esperaTexto(T, 'Bajas registradas'); await esperaTexto(L, 'En revisión', 10000); const t = await texto(L); if (/Reparado/.test(t)) throw 'Luna ve "Reparado"'; }],
    ['9. Buscar alternativa → v2 en franja B con cero aceptaciones heredadas', async () => { await btn(T, 'Buscar alternativa').click(); await esperaTexto(T, 'Opción vigente · Versión 2'); const t = await texto(T); if (!t.includes('Domingo 1 nov 2026, 14:00 a 17:00')) throw 'v2 no es franja B'; if (!t.includes('Todavía nadie confirmó la versión 2')) throw 'v2 no empieza en cero'; await esperaTexto(L, 'Opción vigente · Versión 2', 10000); const tl = await texto(L); if (/Reparado|Grupo confirmado/.test(tl)) throw 'Luna ve confirmado/reparado antes de aceptar'; const cv = (await L.locator('.cambio-version').innerText()).replace(/\s+/g, ' '); if (!/versión 1 → versión 2/.test(cv) || !/Sábado 31 oct 14:00 → Domingo 1 nov 14:00/.test(cv) || !/Caro( SIMULACIÓN)? se bajó/.test(cv) || !/Nadie confirmó todavía/.test(cv)) throw 'comparación v1→v2 incompleta: ' + cv; await L.locator('.cambio-version').screenshot({ path: 'cv-L.png' }); return 'Luna: ' + cv.slice(0, 170); }],
    ['10. Tomi, Luna, Mati y Fede aceptan v2 → Grupo confirmado de nuevo', async () => { await btn(T, 'Confirmar versión 2').click(); await T.waitForTimeout(1500); await btn(L, 'Confirmar versión 2').click(); await L.waitForTimeout(1500); await simAceptar(T, 'Mati', 2); await simAceptar(T, 'Fede', 2); await tab(T, 'Plan'); await esperaTexto(T, 'Grupo confirmado'); await esperaTexto(L, 'Grupo confirmado', 10000); }],
    ['11. Rama "sin opción": nueva propuesta, Tomi no puede A ni B → Sin opción compatible', async () => { await crearPropuesta(T, espacioUrl); await tab(T, 'Mi respuesta'); await btn(T, 'Me interesa').click(); await misCondiciones(T, 'No puedo', 'No puedo'); await tab(T, 'Simulación'); await btn(T, 'Cargar condiciones del caso a las personas simuladas').click(); await T.waitForTimeout(4000); await tab(T, 'Plan'); await btn(T, 'Buscar opción compatible').click(); await esperaTexto(T, 'Sin opción compatible'); const t = await texto(T); if (/Opción vigente/.test(t)) throw 'publicó opción sin Tomi'; if (!/Mínimo 4/.test(t)) throw 'mínimo cambió'; }],
  ];
  for (const [n, f] of pasos) { try { const x = await f(); ok(n, x); } catch (e) { fail(n, e); await T.screenshot({ path: 'fallo-T.png', fullPage: true }); await L.screenshot({ path: 'fallo-L.png', fullPage: true }); break; } }
  console.log('\n--- respuestas ok:false o contrato≠2 del servidor ---\n' + (errs.length ? [...new Set(errs)].join('\n') : '(ninguna)'));
  await br.close();
})();
```

</details>

<details><summary><code>a375.js</code>: auditoría de 28 pantallas: `ANCHO=375 node a375.js` y `ANCHO=320 node a375.js`. Deja capturas e `informe-<ancho>.json` en `./a375/`.</summary>

<!-- archivo: a375.js -->
```js
// Auditoría #44: todas las pantallas y estados a 375 y 320 px, en vivo. Capturas de página completa + mediciones.
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const BASE = 'http://localhost:4173/';
const ANCHO = Number(process.env.ANCHO || 375);
const fs = require('fs');
const DIR = __dirname + '/a375';
fs.mkdirSync(DIR, { recursive: true });
const medir = () => {
  const vw = document.documentElement.clientWidth;
  const out = { ancho: vw, desbordeDoc: document.documentElement.scrollWidth > vw, fueraDePantalla: [], recortados: [], tocablesChicos: [], letraChica: [] };
  const desc = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (el.textContent ? ' «' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '»' : '');
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    if (r.right > vw + 1 || r.left < -1) out.fueraDePantalla.push(desc(el) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2) out.recortados.push(desc(el) + ` [${el.scrollWidth}>${el.clientWidth}]`);
    if (el.matches('button, a.btn, input:not([type=radio]):not([type=checkbox]), select, summary, [role=tab]') && r.height < 44) out.tocablesChicos.push(desc(el) + ` [${Math.round(r.height)}px]`);
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 12) out.letraChica.push(desc(el) + ` [${cs.fontSize}]`);
  }
  for (const k of ['fueraDePantalla', 'recortados', 'tocablesChicos', 'letraChica']) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
};
(async () => {
  const opts = { args: ['--no-sandbox'] }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium'; if (process.env.HTTPS_PROXY) opts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  const br = await pw.chromium.launch(opts);
  const nueva = async () => (await br.newContext({ viewport: { width: ANCHO, height: 812 } })).newPage();
  const T = await nueva(); const L = await nueva(); const N = await nueva();
  const informe = {};
  const foto = async (pg, nombre) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `${DIR}/${ANCHO}-${nombre}.png`, fullPage: true }); informe[nombre] = await pg.evaluate(medir); };
  const btn = (pg, n) => pg.getByRole('button', { name: n, exact: true }).first();
  const tab = (pg, n) => pg.getByRole('tab', { name: n, exact: true }).click();
  const cond = async (pg, a, b) => { await tab(pg, 'Mi respuesta'); for (const [k, v] of [['A', a], ['B', b]]) await pg.locator('fieldset', { has: pg.locator('legend', { hasText: `Franja ${k}:` }) }).first().getByLabel(v, { exact: true }).check(); await btn(pg, 'Guardar condiciones').click(); await pg.waitForTimeout(1200); };
  try {
    await N.goto(BASE + '#/'); await btn(N, 'Probar la demo «Los del asado»').waitFor(); await foto(N, '01-portada-nueva');
    await N.goto(BASE + '#/unirse/%'); await N.getByText('Ese enlace de invitación no es válido').waitFor(); await foto(N, '02-invitacion-invalida');
    await T.goto(BASE + '#/'); await btn(T, 'Probar la demo «Los del asado»').click(); await T.waitForURL(/#\/e\//); const espacioUrl = T.url();
    await T.locator('strong.codigo').waitFor(); await foto(T, '03-espacio-vacio-organizador');
    const codigo = (await T.locator('strong.codigo').innerText()).trim();
    await L.goto(BASE + '#/unirse/' + codigo); await L.getByText('Te invitaron a un plan').waitFor(); await foto(L, '04-invitacion');
    const f = L.locator('form', { has: L.getByRole('heading', { name: 'Unirme con un código' }) }); await f.getByLabel('Tu nombre en el espacio').fill('Luna'); await f.getByRole('button', { name: 'Unirme', exact: true }).click(); await L.waitForURL(/#\/e\//); await foto(L, '05-espacio-miembro-recien-unida');
    await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await btn(T, 'Revisar antes de crear').waitFor(); await foto(T, '06-nueva-propuesta-form');
    await btn(T, 'Revisar antes de crear').click(); await btn(T, 'Crear y abrir al grupo').waitFor(); await foto(T, '07-nueva-propuesta-revisar');
    await btn(T, 'Crear y abrir al grupo').click(); await T.waitForURL(/\/p\//); const propUrl = T.url(); await tab(T, 'Plan'); await foto(T, '08-reuniendo-plan-organizador');
    await tab(T, 'Mi respuesta'); await foto(T, '09-mi-respuesta'); await tab(T, 'Simulación'); await T.locator('section[aria-label="Simulación de Mati"]').waitFor(); await foto(T, '10-simulacion-reuniendo');
    await T.locator('section[aria-label="Simulación de Mati"] summary').click(); await foto(T, '11-simulacion-editar-abierto');
    await cond(T, 'Sí puedo', 'Sí puedo'); await tab(T, 'Simulación'); await btn(T, 'Cargar condiciones del caso a las personas simuladas').click(); await T.waitForTimeout(2500);
    await L.goto(propUrl); await L.getByRole('tab', { name: 'Mi respuesta', exact: true }).waitFor(); await cond(L, 'Sí puedo', 'Sí puedo');
    await tab(T, 'Plan'); await btn(T, 'Buscar opción compatible').click(); await T.getByText('Opción vigente · Versión 1').waitFor(); await foto(T, '12-v1-organizador');
    await tab(L, 'Plan'); await L.getByText('Opción vigente · Versión 1').waitFor(); await foto(L, '13-v1-luna-tu-turno');
    await btn(T, 'Confirmar versión 1').click(); await T.waitForTimeout(1500); await btn(L, 'Confirmar versión 1').click(); await L.waitForTimeout(1500);
    await tab(T, 'Simulación'); await btn(T, 'Aceptar versión 1 por Mati, Caro').click(); await T.getByText('Confirmaron la versión 1').waitFor(); await foto(T, '14-simulacion-v1-confirmada');
    await tab(T, 'Plan'); await T.locator('.estado-hero-etiqueta', { hasText: 'Grupo confirmado' }).waitFor(); await foto(T, '15-grupo-confirmado-organizador'); await L.locator('.estado-hero-etiqueta', { hasText: 'Grupo confirmado' }).waitFor({ timeout: 15000 }); await foto(L, '16-grupo-confirmado-luna');
    await tab(T, 'Simulación'); const c = T.locator('section[aria-label="Simulación de Caro"]'); await c.getByRole('button', { name: 'Se baja: Caro', exact: true }).click(); await foto(T, '17-simulacion-confirmar-baja'); await c.getByRole('button', { name: 'Sí, Caro se baja', exact: true }).click(); await T.waitForTimeout(1500);
    await tab(T, 'Plan'); await T.locator('.estado-hero-etiqueta', { hasText: 'En revisión' }).waitFor(); await foto(T, '18-en-revision-organizador'); await L.locator('.estado-hero-etiqueta', { hasText: 'En revisión' }).waitFor({ timeout: 15000 }); await foto(L, '19-en-revision-luna');
    await btn(T, 'Buscar alternativa').click(); await T.getByText('Opción vigente · Versión 2').waitFor(); await foto(T, '20-v2-organizador'); await L.getByText('Opción vigente · Versión 2').waitFor({ timeout: 15000 }); await foto(L, '21-v2-luna-comparacion');
    await tab(L, 'Historial'); await foto(L, '22-historial-luna'); await tab(L, 'Mi respuesta'); await foto(L, '23-mi-respuesta-luna-con-version');
    await L.goto(BASE + '#/'); await L.locator('.tu-plan').waitFor({ timeout: 15000 }); await foto(L, '24-portada-tu-plan');
    await T.goto(espacioUrl); await T.locator('a.tarjeta-prop').first().waitFor(); await T.locator('summary', { hasText: 'Agente del círculo' }).click(); await btn(T, 'Que el agente proponga').waitFor({ timeout: 15000 }); await btn(T, 'Que el agente proponga').click(); await T.getByRole('button', { name: /^Usar (este borrador|esta opción)$/ }).first().waitFor({ timeout: 20000 }).catch(() => {}); await foto(T, '25-espacio-con-propuesta-y-agente');
    await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await btn(T, 'Revisar antes de crear').click(); await btn(T, 'Crear y abrir al grupo').click(); await T.waitForURL(/\/p\//);
    await cond(T, 'No puedo', 'No puedo'); await tab(T, 'Simulación'); await btn(T, 'Cargar condiciones del caso a las personas simuladas').click(); await T.waitForTimeout(2500); await tab(T, 'Plan'); await btn(T, 'Buscar opción compatible').click(); await T.getByText('Sin opción compatible').first().waitFor(); await foto(T, '26-sin-opcion');
    await btn(T, 'Cancelar propuesta').click(); await foto(T, '27-confirmar-cancelar'); await T.getByRole('button', { name: /^Sí, cancelar/ }).first().click(); await T.locator('.estado-hero-etiqueta', { hasText: 'Cancelado' }).waitFor(); await foto(T, '28-cancelado');
  } catch (e) {
    console.log('CORTE:', e.message.split('\n')[0]);
  }
  fs.writeFileSync(`${DIR}/informe-${ANCHO}.json`, JSON.stringify(informe, null, 1));
  const resumen = Object.fromEntries(Object.entries(informe).map(([k, v]) => [k, [v.desbordeDoc ? 'DESBORDA' : 'ok', v.fueraDePantalla.length, v.recortados.length, v.tocablesChicos.length, v.letraChica.length].join('/')]));
  console.log(ANCHO, Object.keys(informe).length, 'pantallas', JSON.stringify(resumen));
  await br.close();
})();
```

</details>

<details><summary><code>v48.js</code>: verificación de la enmienda 7 (#48): conteos null para Luna y Simulación solo en demo (13 comprobaciones).</summary>

<!-- archivo: v48.js -->
```js
// Verificación #48 en vivo: conteos null para no organizadores (E7.2, simulado en la respuesta) y Simulación solo en demo (E7.3).
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const BASE = 'http://localhost:4173/';
const res = []; const ok = (c, t) => { res.push((c ? 'PASÓ  ' : 'FALLÓ ') + t); };
(async () => {
  const opts = { args: ['--no-sandbox'] }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium'; if (process.env.HTTPS_PROXY) opts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  const br = await pw.chromium.launch(opts);
  const nueva = async () => (await br.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  const T = await nueva(); const L = await nueva(); const N = await nueva();
  let nuleadas = 0;
  // Luna: como hará el servidor con E7.2, los dos conteos llegan en null.
  await L.route(/\/rest\/v1\/rpc\//, async (route) => {
    const r = await route.fetch(); let body = await r.text();
    try { const j = JSON.parse(body); const pr = j && j.propuesta; if (pr) { if ('personas_con_condiciones' in pr) { pr.personas_con_condiciones = null; nuleadas++; } if (pr.opcion && pr.opcion.cupos) pr.opcion.cupos.pendientes = null; body = JSON.stringify(j); } } catch {}
    await route.fulfill({ response: r, body });
  });
  const btn = (pg, n) => pg.getByRole('button', { name: n, exact: true }).first();
  const tab = (pg, n) => pg.getByRole('tab', { name: n, exact: true }).click();
  const tabs = async (pg) => (await pg.getByRole('tab').allInnerTexts()).map((s) => s.trim());
  const cond = async (pg, a, b) => { await tab(pg, 'Mi respuesta'); for (const [k, v] of [['A', a], ['B', b]]) await pg.locator('fieldset', { has: pg.locator('legend', { hasText: `Franja ${k}:` }) }).first().getByLabel(v, { exact: true }).check(); await btn(pg, 'Guardar condiciones').click(); await pg.waitForTimeout(1200); };
  try {
    await T.goto(BASE + '#/'); await btn(T, 'Probar la demo «Los del asado»').click(); await T.waitForURL(/#\/e\//);
    await T.locator('strong.codigo').waitFor(); const codigo = (await T.locator('strong.codigo').innerText()).trim();
    ok(await T.getByRole('heading', { name: /Herramientas del organizador/ }).isVisible(), 'Demo: el organizador ve "Herramientas del organizador"');
    await L.goto(BASE + '#/unirse/' + codigo); const f = L.locator('form', { has: L.getByRole('heading', { name: 'Unirme con un código' }) }); await f.getByLabel('Tu nombre en el espacio').fill('Luna'); await f.getByRole('button', { name: 'Unirme', exact: true }).click(); await L.waitForURL(/#\/e\//);
    ok(!(await L.getByRole('heading', { name: /Herramientas del organizador/ }).count()), 'Demo: un miembro común no ve herramientas del organizador');
    await T.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await btn(T, 'Revisar antes de crear').click(); await btn(T, 'Crear y abrir al grupo').click(); await T.waitForURL(/\/p\//); const propUrl = T.url();
    await T.getByRole('tab', { name: 'Simulación', exact: true }).waitFor(); ok((await tabs(T)).includes('Simulación'), 'Demo: el organizador tiene la pestaña Simulación — ' + (await tabs(T)).join(' | '));
    await cond(T, 'Sí puedo', 'Sí puedo'); await tab(T, 'Simulación'); await btn(T, 'Cargar condiciones del caso a las personas simuladas').click(); await T.waitForTimeout(2500);
    await L.goto(propUrl); await L.getByRole('tab', { name: 'Mi respuesta', exact: true }).waitFor(); await cond(L, 'Sí puedo', 'Sí puedo');
    await tab(L, 'Plan'); await L.waitForTimeout(800);
    ok(!(await L.getByText('Con condiciones cargadas').count()), 'E7.2 Luna (reuniendo, conteo null): sin "Con condiciones cargadas"');
    ok(!(await L.getByText('null', { exact: false }).count()), 'E7.2 Luna: no aparece el texto "null" en la pantalla');
    await tab(T, 'Plan'); await T.waitForTimeout(800);
    ok(await T.getByText('Con condiciones cargadas').isVisible(), 'Organizador (conteo real): ve "Con condiciones cargadas" — ' + (await T.locator('dt:has-text("Con condiciones cargadas") + dd').innerText().catch(() => '?')));
    await btn(T, 'Buscar opción compatible').click(); await T.getByText('Opción vigente · Versión 1').waitFor();
    await L.getByText('Opción vigente · Versión 1').waitFor({ timeout: 15000 }); await L.waitForTimeout(500);
    ok(!(await L.getByText('Faltan por responder').count()), 'E7.2 Luna (v1, pendientes null): sin "Faltan por responder"');
    ok(await L.getByText(/de 4/).first().isVisible(), 'E7.2 Luna: sigue viendo "N de M necesarias" — ' + (await L.locator('dt:has-text("Aceptaciones") + dd').innerText()).replace(/\s+/g, ' '));
    ok(!(await L.getByRole('tab', { name: 'Simulación', exact: true }).count()), 'Demo: Luna (miembro) no tiene pestaña Simulación');
    ok(await T.getByText('Faltan por responder').isVisible(), 'Organizador (v1): ve "Faltan por responder" — ' + (await T.locator('dt:has-text("Faltan por responder") + dd').innerText()));
    ok(nuleadas > 0, `Se interceptaron ${nuleadas} respuestas de propuesta de Luna con los conteos en null`);
    await L.screenshot({ path: __dirname + '/a375/v48-luna-v1.png', fullPage: true });
    // Espacio propio (no demo)
    await N.goto(BASE + '#/'); await N.locator('summary', { hasText: 'Crear un espacio de prueba' }).click();
    ok(await N.getByText('La Simulación (personas ficticias) es solo para la demo').isVisible(), 'Crear espacio: el texto ya no promete agregar personas simuladas');
    const fc = N.locator('details.plegable form'); await fc.getByLabel('Nombre del espacio').fill('Los del club'); await fc.getByLabel('Tu nombre en el espacio').fill('Ana'); await fc.getByRole('button', { name: 'Crear espacio', exact: true }).click(); await N.waitForURL(/#\/e\//);
    await N.getByRole('heading', { name: 'Personas del espacio' }).waitFor();
    ok(!(await N.getByRole('heading', { name: /Herramientas del organizador/ }).count()) && !(await N.getByText('Agregar persona simulada').count()), 'No demo: el organizador no ve herramientas de Simulación ni "Agregar persona simulada"');
    await N.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await btn(N, 'Revisar antes de crear').waitFor(); await btn(N, 'Revisar antes de crear').click();
    await btn(N, 'Crear y abrir al grupo').waitFor({ timeout: 8000 }).then(() => btn(N, 'Crear y abrir al grupo').click()).catch(async () => { res.push('(nota) no se pudo crear propuesta en el espacio propio: ' + (await N.locator('main').innerText()).slice(0, 200).replace(/\s+/g, ' ')); });
    if (/\/p\//.test(await N.url()) || await N.waitForURL(/\/p\//, { timeout: 8000 }).then(() => true).catch(() => false)) {
      await N.getByRole('tab', { name: 'Plan', exact: true }).waitFor(); await N.waitForTimeout(1500);
      const t = await tabs(N); ok(!t.includes('Simulación'), 'No demo: el organizador NO tiene pestaña Simulación — ' + t.join(' | '));
      await N.screenshot({ path: __dirname + '/a375/v48-no-demo-propuesta.png', fullPage: true });
    }
  } catch (e) { res.push('CORTE: ' + e.message.split('\n')[0]); }
  console.log(res.join('\n')); await br.close();
})();
```

</details>

<details><summary><code>v48b.js</code>: propuesta en un espacio propio sin pestaña Simulación (1 comprobación).</summary>

<!-- archivo: v48b.js -->
```js
let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const BASE = 'http://localhost:4173/';
(async () => {
  const opts = { args: ['--no-sandbox'] }; if (require('fs').existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium'; if (process.env.HTTPS_PROXY) opts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  const br = await pw.chromium.launch(opts);
  const N = await (await br.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  const btn = (n) => N.getByRole('button', { name: n, exact: true }).first();
  try {
    await N.goto(BASE + '#/'); await N.locator('summary', { hasText: 'Crear un espacio de prueba' }).click();
    const fc = N.locator('details.plegable form'); await fc.getByLabel('Nombre del espacio').fill('Los del club'); await fc.getByLabel('Tu nombre en el espacio').fill('Ana'); await btn('Crear espacio').click(); await N.waitForURL(/#\/e\//);
    await N.getByRole('link', { name: /Crear propuesta|Nueva propuesta/ }).first().click(); await btn('Revisar antes de crear').waitFor();
    await N.getByLabel('Propósito de la propuesta').fill('Partido del sábado');
    const dt = N.locator('input[type=datetime-local]');
    await dt.nth(0).fill('2026-10-31T14:00'); await dt.nth(1).fill('2026-10-31T17:00'); await dt.nth(2).fill('2026-11-01T14:00'); await dt.nth(3).fill('2026-11-01T17:00'); await dt.nth(4).fill('2026-10-30T20:00');
    await N.getByLabel(/Mínimo/).fill('2'); await N.getByLabel('Máximo').fill('6');
    await btn('Revisar antes de crear').click(); await btn('Crear y abrir al grupo').click(); await N.waitForURL(/\/p\//, { timeout: 15000 });
    await N.getByRole('tab', { name: 'Plan', exact: true }).waitFor(); await N.waitForTimeout(2000);
    const t = (await N.getByRole('tab').allInnerTexts()).map((s) => s.trim());
    console.log((t.includes('Simulación') ? 'FALLÓ ' : 'PASÓ  ') + 'No demo: el organizador NO tiene pestaña Simulación — ' + t.join(' | '));
  } catch (e) { console.log('CORTE: ' + e.message.split('\n')[0] + ' | ' + (await N.locator('main').innerText()).slice(0, 300).replace(/\s+/g, ' ')); }
  await br.close();
})();
```

</details>
