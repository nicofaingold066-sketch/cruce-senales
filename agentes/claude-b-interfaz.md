# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
- `src/components/**`, `src/screens/**`, `src/lib/api.ts`, `src/lib/types.ts`, `src/styles.css`, `src/assets/**` (enmienda 3 en la UI: `siguiente_accion.codigo` con respaldo de texto y `simulate_load_case` en el atajo; logo X v2; quitar "Empresa" del formulario; enlace de invitación `#/unirse/<código>`)

## Estado
Corte "identidad + UX móvil" (aviso 12:04 y pedido de Nico) CERRADO en `wip/ui-enmienda` `68f4b71`. Nombre nuevo del producto por decisión de Nico: **CRUXE** (antes CRUCE). Recorrido en vivo contra el backend real 11/11 con la UI nueva, sin respuestas `ok:false`; typecheck y build en verde.

Figma (para todo el equipo):
- User flow + estados de la propuesta (FigJam): https://www.figma.com/board/sqWhMOQEdpT80S7YhXPtCl
- Identidad + 7 pantallas móviles reales del recorrido: https://www.figma.com/design/RgQLomDluDvf2fBSlbaGUU

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
(a) Enlace de invitación `#/unirse/<código>` que precarga el formulario (no necesita backend), para abrir la demo en el segundo teléfono. (b) "Te toca confirmar" cuando `puede.aceptar` sea true (dato del servidor) hasta que exista la idea 1. Pendiente decisión de Nico: quitar "Empresa" del formulario de crear espacio.

## Bloqueos
Ninguno. Red a Supabase habilitada por Nico (14:2x).

## Pedidos a otros
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
Rama `wip/ui-enmienda`, último commit `68f4b71` (identidad CRUXE + UX móvil). Antes: `1624b4f`, `e7d868d`, enmienda 2.

