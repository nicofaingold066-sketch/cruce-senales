# Agente: front-juan (rediseño del front pedido por Juan Morales)

Quien edita este archivo: solo esta sesión (Claude, a pedido de Juan, en la computadora de Nico, Mac-mini-de-Felix). Última actualización: viernes 23 oct, 18:37 Santiago (reloj).

## Tocando ahora
- CORRIENDO PRUEBA (18:46): instantáneas 1280 px para Figma (demo propia). Demos y propuestas propias, datos ficticios, cero llamadas al agente.

## Entregado: `wip/front-juan` = `4f2d690` (con `origin/wip/fundamentos` `a381a0c` fusionado, sin conflictos)
Respuesta al aviso de las 17:35:
- Merge de `origin/wip/fundamentos` hecho (`a6abbc6`), sin conflictos. No toqué `src/login/**` ni la lista de integrantes de `CrearGrupo.tsx`; `#/unirse` queda en "¿Quién eres?" de login.
- Guiones de `tests/e2e/` contra el build de `4f2d690` en localhost (backend real, sin MIGRACION EN CURSO, CORRIENDO PRUEBA anotado): `recorrido-dos-sesiones.mjs` **23/23**, `jurado-navegador.mjs` **4/4** (23 comprobaciones), `red-controlada.mjs` **10/10**.
- Rótulos y campos: **ningún guion necesita cambios.** El texto "Cupos libres para el resto: N" que espera `jurado-navegador` lo había acortado `c12d3e8`; ya está restaurado.
- `sesiones-recuperacion.mjs` (no pedido): 9 PASS y 3 FAIL (L1–L3 esperan `#/entrar` y vencen a los 30 s). Da exactamente lo mismo sobre `origin/wip/fundamentos` `a381a0c` sin mis cambios, así que no viene de esta rama.

Nuevo desde `91e9f9a` (pedido por Juan: estética mobile al 100 y después tablet y compu):
- **Mobile (320–430 px):** cifras de la opción en una fila (número arriba), versión "v1" en la tarjeta de estado, chips de personas con "(tú)" y el rol en su lugar, "Me interesa" en una línea, historial resumido con la hora en columna, cancelar como fila al pie, comparación v1 → v2 con antetítulos, horas de 44 px, la barra sin el nombre del grupo cortado, pasos y contadores enteros a 320 px, singular y plural en "Mis planes", una sola señal de "te toca" en la tarjeta del plan, tiras de chips que se desvanecen en los bordes.
- **Tablet (600–959 px):** contenido en una columna central de 640 px (margen fluido: barra, escena, hoja, pestañas y acción fija alineadas); la hoja llega hasta abajo.
- **Compu (960 px o más):** portada como hero centrado con la órbita grande, hoja centrada en su columna, navegación flotando sobre la hoja.
- Textos visibles que cambian (ningún guion los usa): "Aceptaciones" pasa a "Aceptaciones necesarias"; la tarjeta de cancelar se titula "¿Ya no va?" (el botón sigue siendo "Cancelar propuesta"); la pastilla "Tu turno" sale de la tarjeta del plan en las listas (el texto en brasa "Te toca confirmar…" queda).
- Sin desborde horizontal en las 17 pantallas del recorrido a 320, 375, 430, 768, 1024, 1280 y 1440 px. `npm run typecheck` y `npm run build` en verde. Sin dependencias nuevas.

## Pedidos
- **coordinador:** integrar `wip/front-juan` (`4f2d690`) cuando lo decidan con Nico.
- **login:** `sesiones-recuperacion.mjs` L1–L3 esperan `#/entrar` después de `mostrarApp()` y no llegan; falla igual en `a381a0c`. Revisar el guion o la ruta.
- **claude-b-interfaz:** esta rama toca pantallas y `src/styles.css`; coordinemos antes de tus próximas mejoras en `src/`.
- (Componentes externos: Lucide ya registrado por el coordinador en ce05e5e.)
