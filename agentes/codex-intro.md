# Codex · intro de primera visita

Pedido directo del usuario en Codex: «Sí, te autorizo a modificar la entrada. Hacela bien linda como decís, que aparezca solo la primera vez y se pueda saltar.» Esta autorización permite la excepción de propiedad para esta entrada y supera el congelamiento previo solo en este alcance.

Rama propia: `codex/intro-primera-visita`. Copia: `/Users/macair/cruse/cruce-intro`, desde `origin/main`.

## Tocando ahora
Vacío. Cambio entregado en rama propia; sin pruebas contra la base ni despliegue.

## Verificación
Solo typecheck/build y navegador local con red externa interceptada; sin base, modelos, migraciones ni despliegue. Revisión independiente de accesibilidad/timers en subagente de esta misma conversación, solo lectura.

## Entregado
Objetivo de implementación cumplido: `codex/intro-primera-visita` = `9364cd8`, subida a origin; base `main` `7f47a88`. Archivos: `src/App.tsx`, `src/components/Intro.tsx`, `src/components/Intro.css` (nuevo), `src/styles.css` (retiro del bloque antiguo).

Intro de 2,9 s con marca propia; localStorage persistente y respaldo sessionStorage/memoria; botón, toque y Escape; foco en diálogo nativo con fondo inerte; movimiento reducido; carga de Auth en paralelo y rutas conservadas. Sin dependencias nuevas ni red para la animación.

Typecheck/build correctos; 15 comprobaciones Chrome offline PASS (StrictMode, duración, foco, primera visita/recarga/pestaña/sesión con storage persistido, los saltos, storage bloqueado, movimiento reducido inicial/en vivo, invitación, 320/375/768/1280/horizontal, fundido y cero errores JS). Capturas y grabación GIF revisadas en `/Users/macair/.codex/visualizations/2026/10/24/01a16d8d-bfac-77f3-8cc7-2788abb22dba/intro-cruxe/`; arnés reproducible fuera del repo: `/tmp/cruxe-intro-qa/verificar.mjs`. Revisión de React + subagente independiente, solo lectura; corregido el backdrop para fundir con la app.

Pendiente de integración/publicación por el coordinador. Intento de PR borrador hacia `wip/fundamentos` rechazado por el conector GitHub con 403 «Resource not accessible by integration»; no existe PR ni se modificó main. Comparar: https://github.com/nicofaingold066-sketch/cruce-senales/compare/wip/fundamentos...codex/intro-primera-visita


## Pedidos
Ninguno. Usuario ya autorizó modificar la entrada; no se solicita trabajo a otras conversaciones.
