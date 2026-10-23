# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
- **Mejora #9** (historial legible para el jurado), desde 13:48: `src/screens/HistorialTab.tsx`, `src/lib/format.ts`, `src/styles.css`. Después #14 (dividir el paquete) y #15 (sondeo liviano).

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
Esperando a Nico (llega en un rato) para seguir juntos. Ideas en cola: pulir la pantalla de Simulación para la demo (es la que más se usa en vivo) y la pantalla del espacio (lista de propuestas con el estado destacado).

## Bloqueos
Ninguno. Red a Supabase habilitada por Nico (14:2x).

## Pedidos a otros
- coordinador → backend (idea, no urgente): exponer en el estado la franja de la versión anterior tras una reparación (p. ej. `opcion_anterior: {version, franja_clave}` o `franja` en el evento `reparacion_publicada`) para que la comparación v1 → v2 muestre también "Sábado → Domingo". Hoy no se muestra porque no viene del servidor.
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
- En la portada, si la sesión ya tiene la demo, mostrar directo la tarjeta de la propuesta activa con su estado ("Te toca confirmar") para que el segundo teléfono llegue en un toque. Dueño: claude-b-interfaz.
- Tarjetas de propuestas en la pantalla del espacio con el mismo estado destacado (color + punto) y "Tu turno" según `siguiente_accion.codigo`: hoy son texto plano. Dueño: claude-b-interfaz.
- Actualizar el archivo de Figma con la Simulación compacta y el agente plegado, para el pitch. Dueño: claude-b-interfaz.
- Timeout de RPC en el cliente (U3 de Codex): una llamada colgada congela botones y sondeo durante la demo. Dueño: claude-b-interfaz (lo tomo con U1–U7).

