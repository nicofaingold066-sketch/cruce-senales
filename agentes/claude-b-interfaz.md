# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
(vacío desde 14:55: pausa por traspaso de esta sesión a una sesión local en la computadora de Nico. Lo que sigue está en "Siguiente".)

## Estado
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
- Sondeo liviano también para la lista del espacio y el panel de Simulación (hoy bajan todo cada 10 s y 3 s): pediría `p_desde_rev` en `list_proposals` y `get_simulation_panel`. Dueño: backend + claude-b-interfaz.
- Para el jurado: modo "presentación" que agranda letra y botones en la pantalla de la propuesta (un toque en el encabezado). Dueño: claude-b-interfaz.
- Navegación: el botón atrás del teléfono vuelve a la pantalla anterior pero el scroll arranca arriba; para Historial y Simulación largos podría conservarse por pantalla. Dueño: claude-b-interfaz (baja prioridad).
- En la portada, si la sesión ya tiene la demo, mostrar directo la tarjeta de la propuesta activa con su estado ("Te toca confirmar") para que el segundo teléfono llegue en un toque. Dueño: claude-b-interfaz.
- Tarjetas de propuestas en la pantalla del espacio con el mismo estado destacado (color + punto) y "Tu turno" según `siguiente_accion.codigo`: hoy son texto plano. Dueño: claude-b-interfaz.
- Actualizar el archivo de Figma con la Simulación compacta y el agente plegado, para el pitch. Dueño: claude-b-interfaz.
- Timeout de RPC en el cliente (U3 de Codex): una llamada colgada congela botones y sondeo durante la demo. Dueño: claude-b-interfaz (lo tomo con U1–U7).

