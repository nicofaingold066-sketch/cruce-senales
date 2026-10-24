# S4 (el plan): qué cambia para los guiones (`wip/ux` `e16b2cc`)

El plan ya no tiene barra de pestañas (mockup obligatorio; decisión del coordinador 03:30). Esta lista dice, para cada cosa que buscan los guiones, cómo se llega ahora. Archivos afectados (grep, 03:40):
- **Pestañas** (`getByRole('tab', …)`, `tab()`, `pestana()`): e2e `friccion-flujo`, `toques-invitacion`, `plan-b-un-aparato`, `jurado-navegador`, `recorrido-dos-sesiones`, `convencer-uno`; rincones `f1`, `f2`, `f3`, `f3b`, `f4`, `f5`, `f5b`, `f5c`, `f9`, `f12`, `f13`, `f15`, `ver`; sinteticos `escena`, `seis-amigos`, `proposito-grupo`, `dos-planes`, `lib`.

| Antes | Ahora |
|---|---|
| pestaña «Plan» | no existe: el plan es la pantalla. Quitar el toque (o tolerar que falte). |
| pestaña «Mi respuesta» (editor por franja, `fieldset` «Franja A», «Guardar condiciones», «Me interesa») | enlace «Tu respuesta: … · Cambiar» (`a.fila[href*="/responder/"]`) → ¿Cuándo puedes? (S5, friccion; el editor día por día va ahí plegado: «Ajustar día por día», desplegable) |
| pestaña «Historial» | `details` con `summary` «Historial» (en ¡se juntan! y en revisión está dentro de «Ficha del plan · Historial») |
| pestaña «Simulación» | botón «Simulación demo» (fila; solo quien organiza la demo) → misma pantalla con «‹ Volver al plan» |
| «Retirarme de esta propuesta» → «Sí, no voy» (en Mi respuesta) | en el plan: «Retirarme de este plan» (esperando) o «Ya no puedo ir…» (¡se juntan!) → «¿Retirarte definitivamente?» → «Sí, no voy» (igual) |
| `.estado-hero-etiqueta` «Reuniendo interés» / «Esperando compromisos» / «Grupo confirmado» | «Reuniendo respuestas» / «Esperando confirmaciones» / «¡Se juntan!» («En revisión» igual). El texto del servidor (`siguiente_accion`) sigue en la región `role=status`, así que `getByText('Grupo confirmado')` pasa. |
| «Con condiciones» (solo quien organiza) | «N de M respondieron» (solo quien organiza) |
| «Confirmaron N (mínimo M)» | «N confirmaron (mínimo M)»; con menos del mínimo, «N de M confirmaron · faltan X» |
| «Estas confirmaciones no pasan a la versión 2» | «El plan cambió: versión 1 → versión 2. Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión.» |
| «Cancelar propuesta» | «Cancelar la propuesta» (solo en reuniendo y en revisión) → «Sí, cancelar» (igual) |
| «Calendario» | «Agregar a mi calendario» (¡se juntan!, quien confirmó) |
| «Buscar el lugar en el mapa» | «Ver el lugar en el mapa» (solo ¡se juntan!) |
| «Avisar al grupo» / «Recordar a quien falta» | «Avisar al grupo (WhatsApp)» / «Recordar a quien falta (WhatsApp)» (enlaces `a[href^="https://wa.me"]`) |
| «Faltan por confirmar», «Cambios en el grupo», «Ir a Mi respuesta», «Ver historial completo», «Copiar mensaje» | se fueron |

Se quedan igual: «Confirmar versión N», «Ya confirmaste la versión N», «Buscar opción compatible», «Volver a buscar opción», «Buscar alternativa», «Sin opción compatible», «Rearmar con lo nuevo», «Una persona se retiró», «Así no puedo, pero sigo» (ahora es una fila: un toque marca, como antes; marcada, la fila muestra la pieza con «Volver a «puedo»»), «Nadie confirmó todavía», «Opiniones hasta», «Opción vigente · Versión N» y «Versión N (en revisión, no confirmada)» (texto para lector), `h1` con el título, «Entendido».
