# Agente: claude-b-interfaz (único dueño de src/, en la computadora B)

Quien edita este archivo: solo claude-b-interfaz. Última actualización: viernes 23 oct, tras leer coordinacion (README, PROPIEDAD, TABLERO).

## Tocando ahora
(vacío)

## Estado
11:2x: trabajando el plan sin red (aviso 11:21). Integrada mi rama en wip/fundamentos por el coordinador; yo traje `origin/wip/fundamentos` a `wip/ui-enmienda`.
Corte "interfaz enmienda 2" (rama de código `wip/ui-enmienda`): los 7 puntos hechos. Ajuste de `mi_situacion.motivo_aceptar` hecho. `npm run typecheck` y `npm run build` pasan. Traída `origin/wip/fundamentos` (AGENTS.md actualizado) a mi rama.

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
- Corte enmienda 2 (rama `wip/ui-enmienda`): contrato 2, `reset_demo` con intento, cupos reservados (`mi_situacion.motivo_aceptar`), errores `asiento_en_uso`/`intento_obsoleto`/`cupo_completo` con ayuda, falla antes/después de enviar.
- Plan sin red (aviso 11:21), verificado con un banco descartable (fuera del repo) que intercepta la red con datos ficticios del caso y abre las 4 pantallas a 320, 390 y 430 px en escenarios normal / cupo reservado / en revisión:
  1. Teléfono: sin desborde horizontal en ningún caso. Único hallazgo: enlaces de texto (logo, "Restablecer valores del caso", "Ver historial completo") con 24 px de alto; arreglado con zona tocable de 44 px (commit `e7d868d`).
  2. Estados vacío / error del servidor / sin conexión / sin opción: presentes y con texto en inicio, espacio, nueva propuesta y propuesta (ErrorCaja con Reintentar, banner "Sin conexión", "Sin opción compatible").
  3. Accesibilidad: foco visible (outline 3 px), enlace "Saltar al contenido", 0 botones sin texto.
  4. Textos del caso: Tomi, Luna, Mati, Caro, Fede, Sofi, franjas A y B 14:00 a 17:00, America/Santiago presentes.
- LÍMITE: todo eso con respuestas ficticias interceptadas, NO contra el servidor real. El recorrido en vivo sigue bloqueado por la red (ver Bloqueos).

## Siguiente
Esperar indicaciones del coordinador (probar contra el backend con migraciones 0008-0011 requiere `.env`).

## Bloqueos
Ninguno. Red a Supabase habilitada por Nico (14:2x).

## Pedidos a otros
- Para coordinador (re aviso 12:02, "falta rama sin opción"): ya la corrí EN LA INTERFAZ contra el backend real, paso 11 de "Recorrido EN VIVO" arriba: propuesta nueva, Tomi "No puedo" A y B, simulados con el caso → "Sin opción compatible", sin opción publicada, mínimo 4 intacto, sin errores del servidor. Variante por evaluación inicial; la variante tras la baja de Caro (reparación) NO la corrí: si la querés verificada, avisame.

## Entregado
Rama `wip/ui-enmienda`, último commit `1624b4f` (pestañas sin cortar en teléfono, solo CSS; typecheck y build pasan). Incluye merge de `origin/wip/fundamentos` 615ef0f. Recorrido en vivo 11/11 más arriba.
