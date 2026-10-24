# Codex · intro de primera visita

Pedido directo del usuario en Codex: «Sí, te autorizo a modificar la entrada. Hacela bien linda como decís, que aparezca solo la primera vez y se pueda saltar.» Esta autorización permite la excepción de propiedad para esta entrada y supera el congelamiento previo solo en este alcance.

Rama propia: `codex/intro-primera-visita`. Copia: `/Users/macair/cruse/cruce-intro`, desde `origin/main`.

## Tocando ahora
- Pedido directo de Nico: «la x con los circulos de movimiento lo haria un poco mas grande, dependiendo el dispositivo». Continúa el pulido de la intro publicada.
- Solo `src/components/Intro.css`: ampliar símbolo/círculos durante animación con escala por dispositivo, reservar espacio de escena y mantener marca final, controles y duración. Horizontal con altura baja usa aumento moderado.
- Rama `codex/intro-primera-visita`, base `main` `9a15539`. Verificación visual local y de producción con Auth/RPC bloqueadas; sin backend ni otras hojas. Integración/publicación dentro del alcance ya autorizado si pasa.

## Ayuda: repetir intro y guía (publicado)
Pedido directo: «Dale, que desde Ayuda también se pueda volver a ver todo el recorrido, incluida la animación del inicio.» Continuó el alcance ya autorizado de implementación/publicación.

Objetivo cumplido: sí. **`9a15539723264b542a0344c0ef8bde659edb9196`**, `codex/intro-primera-visita`, integrado por fast-forward atómico a `origin/wip/fundamentos` y `origin/main` desde `4e90813`. Archivos: **`src/App.tsx`, `src/components/Intro.tsx`** (10 líneas agregadas, 4 retiradas). Ayuda vuelve a abrir intro y luego guía desde paso1; Saltar/Escape de intro llevan a la guía. Al terminar, devuelve el foco al disparador y conserva ruta/formularios y marcas de primera visita. Movimiento reducido lleva directo a guía; cambiar la preferencia durante intro también funciona. Sin cambios de estilos, dependencias, sesiones ni backend.

Typecheck/build/diff-check verdes; revisión independiente de arquitectura/foco. **13/13 casos locales y 13/13 sobre assets publicados**, incluidas secuencia automática/Saltar/Escape, repetición desde cero, cierre/foco, recarga sin repetición automática, formulario de crear grupo conservado, preferencia de movimiento y vistas375/1280. Cero pageerrors y ninguna acción sobre datos reales; Auth/RPC/WS totalmente interceptados. Sin suites contra base.

Vercel **success**: https://vercel.com/nicofaingold066-sketchs-projects/cruce-senales/FReFzL2uyMAXB5ZZjiwexYkuFLsw. Producción https://cruce-senales.vercel.app/ HTTP200 (también GET estándar sin query) sirve **`/assets/index-Dj3EWALd.js`**, CSS `index-T88rqN0I.css`; SHA256 en manifiesto. Evidencia durable `/Users/macair/.codex/visualizations/2026/10/24/01a16d9b-0e5a-7f83-ad7a-d94e81c53cb8/guia-cruxe/ayuda-completa/{local,produccion}/`; arnés `/tmp/cruxe-ayuda-completa/verificar.mjs`. No quedan bloqueos.

## Publicación de la guía aprobada
Pedido directo de Nico: «Dale, me gusta cómo quedó. Integralo y publicalo así ya aparece en la app.» Autorizó integrar/publicar esta guía como excepción al circuito previo del coordinador.

Objetivo cumplido: sí. `origin/main` y `origin/wip/fundamentos` avanzados **por fast-forward atómico** desde `9364cd8` a **`4e9081316012be3f861f80cbec02da4f033dfb6e`**. Único cambio publicado: App + Guia.tsx/.css; sin ramas ajenas, cambios de configuración ni reescritura de historial.

Vercel Git: **success** en GitHub, https://vercel.com/nicofaingold066-sketchs-projects/cruce-senales/3tEhDJxRT8wdPVCvDP22tUPjixkw. Dominio **https://cruce-senales.vercel.app/** HTTP 200 sirve `/assets/index-D3oQxgqQ.js` y `/assets/index-T88rqN0I.css`; comprobado también con GET estándar sin query de bypass. La guía y su clave de primera visita están en el bundle publicado.

Typecheck/build/diff-check verdes. Navegador contra los assets reales de producción (Auth/RPC totalmente mockeados/abortados): splash → guía, tres pasos/selección/reconfirmación, saltar/Escape, primera visita/persistencia, Ayuda y visuales375/1280 aprobados; hashes SHA256 de JS/CSS fijados. No se crearon usuarios ni planes reales, ni se corrieron suites contra la base. Capturas y evidencia durable: `/Users/macair/.codex/visualizations/2026/10/24/01a16d9b-0e5a-7f83-ad7a-d94e81c53cb8/guia-cruxe/publicacion/`; arnés `/tmp/cruxe-guia-publicacion/verificar.mjs`. App publicada abierta en Codex para Nico.

## Entrega nueva: guía de tres pasos
Pedido directo de Nico: «Dale, hacela así, bien dinámica y divertida, con los 3 pasos. Que aparezca solo la primera vez, se pueda saltar y volver a ver desde Ayuda». Después pidió ver el resultado y cursor naranja. Autoriza esta ampliación puntual de la entrada.

Objetivo cumplido: `codex/intro-primera-visita` = **`4e90813`**, subida a origin sobre la intro `9364cd8`. Archivos de este corte: `src/App.tsx`, nuevos `src/components/Guia.tsx` y `Guia.css`. No se editaron Perfil, hojas compartidas, backend, configuración ni dependencias.

Tres pasos interactivos ficticios: idea (asado/café/fútbol), horario privado y confirmación manual. Cursor naranja decorativo señala sin activar acciones; avatares y celebración CSS. La confirmación del ejemplo se invalida si cambia el horario o el plan. Clave independiente `cruxe:guia-vista:v1`, localStorage/sessionStorage/memoria; se muestra tras la intro una sola vez y Ayuda permite repetir. Los enlaces directos conservan destino sin guía automática ni consumir la primera visita. Un solo modal activo, foco restaurado, Escape/Saltar, teclado encerrado y movimiento reducido estático.

Typecheck/build/diff-check verdes. QA Chrome local en StrictMode con todos los destinos externos mockeados/abortados: primera visita, recarga/pestaña/nueva sesión persistida, marca previa de intro, saltar/Escape/Ayuda, selección/retroceso/reconfirmación, almacenamiento bloqueado, movimiento reducido e invitación. Recheck foco y cinco tamaños (320×568, 375×812, 768×1024, 1280×800, 812×375) **9/9**, cero pageerrors/RPC de acciones. Barra con nombre largo a320/375/768: sin solapamientos; Ayuda y retorno de foco correctos. A375 los tres pasos caben completos, CTA visible; a320 las acciones son accesibles por scroll y pie fijo.

Arnés y evidencia fuera del repo: `/tmp/cruxe-guia-qa/`; capturas `/Users/macair/.codex/visualizations/2026/10/24/01a16d9b-0e5a-7f83-ad7a-d94e81c53cb8/guia-cruxe/`. Vista previa aislada, sin backend: `http://127.0.0.1:4199/` (fuente temporal `/tmp/cruxe-guia-preview/`), abierta al usuario. Esta entrega se integró/publicó después por el pedido directo registrado arriba.

## Verificación
Solo typecheck/build y navegador local con red externa interceptada; sin base, modelos, migraciones ni despliegue. Revisión independiente de accesibilidad/timers en subagente de esta misma conversación, solo lectura.

## Entregado
Objetivo de implementación cumplido: `codex/intro-primera-visita` = `9364cd8`, subida a origin; base `main` `7f47a88`. Archivos: `src/App.tsx`, `src/components/Intro.tsx`, `src/components/Intro.css` (nuevo), `src/styles.css` (retiro del bloque antiguo).

Intro de 2,9 s con marca propia; localStorage persistente y respaldo sessionStorage/memoria; botón, toque y Escape; foco en diálogo nativo con fondo inerte; movimiento reducido; carga de Auth en paralelo y rutas conservadas. Sin dependencias nuevas ni red para la animación.

Typecheck/build correctos; 15 comprobaciones Chrome offline PASS (StrictMode, duración, foco, primera visita/recarga/pestaña/sesión con storage persistido, los saltos, storage bloqueado, movimiento reducido inicial/en vivo, invitación, 320/375/768/1280/horizontal, fundido y cero errores JS). Capturas y grabación GIF revisadas en `/Users/macair/.codex/visualizations/2026/10/24/01a16d8d-bfac-77f3-8cc7-2788abb22dba/intro-cruxe/`; arnés reproducible fuera del repo: `/tmp/cruxe-intro-qa/verificar.mjs`. Revisión de React + subagente independiente, solo lectura; corregido el backdrop para fundir con la app.

Pendiente de integración/publicación por el coordinador. Intento de PR borrador hacia `wip/fundamentos` rechazado por el conector GitHub con 403 «Resource not accessible by integration»; no existe PR ni se modificó main. Comparar: https://github.com/nicofaingold066-sketch/cruce-senales/compare/wip/fundamentos...codex/intro-primera-visita


## Pedidos
Ninguno. Usuario ya autorizó modificar la entrada; no se solicita trabajo a otras conversaciones.
