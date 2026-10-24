# Codex · vida, color y microinteracciones del front

Pedido directo de Nico en Codex (24 oct): revisar todo el front porque le falta vida, animaciones, microinteracciones y algo de color. Esta instrucción nueva autoriza este pulido visual sobre el congelamiento anterior. Se preservan estructura, textos, contratos y lógica del producto.

Rama propia: `codex/vida-front`. Copia aislada: `/Users/macair/cruse/cruce-vida`, base `origin/main` `7f47a88`.

## Tocando ahora
- Integración de `codex/vida-front` con `origin/main`, TypeScript/build/pruebas y publicación de `main` por la integración Git de Vercel.
- Reclamo puntual de integración/publicación autorizado directamente por Nico: «Dale, integrá los cambios y publicalos para poder probarlos en la app». No se reescribe código de otras sesiones ni se cambia backend.

No se toca `src/styles.css`, `App.tsx` ni `Intro.*` (reclamados por codex-intro), backend, modelos o configuración.

## Verificación
Typecheck/build y navegador local con salida externa interceptada, fixtures ficticios, tamaños 320/375/768/1280, modo claro/oscuro y movimiento reducido. Sin suites contra base ni despliegue.

## Entregado
- Objetivo visual cumplido. `codex/vida-front` **`95b94dd`**, base main `7f47a88`. Tres archivos: `src/main.tsx`, nuevo `src/estilo/vida.css`, nuevo `src/components/FeedbackToque.tsx`.
- Color: primarios terracota, fondos cálidos, iconos coral/menta/lavanda, confirmación verde, modo oscuro propio. Estados y textos siempre siguen al servidor. Sin dependencias.
- Microinteracciones: hover/presión coherentes, eco decorativo de activación por puntero y teclado (280 ms, máximo 6, sin robar foco), selección guardada, detalles y nuevos avatares. El brillo del CTA se limita al gesto, no se repite en reposo. Reduce-motion desactiva animaciones/transiciones/eco.
- Correcciones visuales: enlaces primarios dentro de la escena tienen contraste explícito; detalle de respuesta sin opacidad (5,53:1 claro / 8,01:1 oscuro); etapas de resultado y cierre de Nuevo plan entran en dos filas a 320–375 px sin partir palabras.
- Pruebas: TypeScript sin errores; build producción correcto (`index-CcH6DX7x.js`); 96/96 pruebas puras. Revisión React/a11y y navegador independiente: puntero/Enter, limpieza, controles bloqueados, foco y cambio live de reduced-motion pasan.
- Navegador local con TODA red externa interceptada y datos ficticios: 180 capturas de 9 rutas + 4 estados S4 a 320/375/768/1280, claro/oscuro y normal/reduced. Cero desbordes horizontales, errores JS/console o animaciones activas en reduced. Hoja/Escape/retorno de foco, perfil, privacidad y plegables pasan. Revisión focalizada final del cierre a 320/375 en claro/oscuro también aprobada (abre/cierra, texto entero, sin desbordes ni errores).
- Evidencia fuera del repo: `/Users/macair/.codex/visualizations/2026/10/24/01a16d92-0314-7fa3-92b3-971df48ff304/cruxe-vida/` (capturas, clip WebM y reportes JSON).
- Límite: Chrome local y fuentes de respaldo, sin base/modelos ni despliegue. Próxima dependencia: integración por coordinador; no se tocó main ni archivos de la intro.

## Pedidos
Ninguno. El pedido directo del usuario autoriza el alcance visual. No se solicita trabajo a otras conversaciones.

## Publicación autorizada

Nico pidió integrar y publicar este corte. Se preservan Intro/Guia/Ayuda de main, se verifica el resultado antes de push a main y después se comprueba el dominio público con los assets del commit. Sin base/modelos ni migraciones. El conector Vercel carece de scope para el equipo; se usa Git→Vercel ya configurado.
