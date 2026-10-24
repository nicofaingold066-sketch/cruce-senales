# GRU · integración del asistente animado

Pedido directo de Nico en Codex (24 oct): integrar el personaje aprobado, llamado **GRU**, con más movimiento y estados reales; que permanezca visible en pequeño como asistente durante la navegación y abra su panel al tocarlo. Esta autorización nueva define este alcance visual sobre las reglas anteriores del mockup.

Rama propia `codex/gru-vivo`, copia aislada `/Users/macair/cruse/cruce-gru`, base `origin/main` `7f47a88`.

## Tocando ahora
Vacío. Arrastre manual implementado, probado y subido a la rama propia. Sin procesos ni turno de base.

## Verificación
Typecheck, build y navegador local con fixtures ficticios y red externa interceptada. Comprobar navegación, estados de éxito/error/sin opción, teclado, movimiento reducido, móvil 320/375 y escritorio 1280. Cero consultas pagas o escrituras en la base.

## Entregado
Objetivo de implementación cumplido. Rama `codex/gru-vivo`, commits `7d48892` y `bb701b2` (base main `4e90813` con intro/guía ya integradas). Rama subida; checkout limpio.

Archivos: `src/agente/{AgentePanel.tsx,GruPersonaje.tsx,GruAsistente.tsx,gru.css,gru-asistente.css,gruEstado.ts}`, montaje mínimo en `src/lib/shell.tsx`, nombre de pestaña/acceso en `src/screens/Espacio.tsx`. No se tocaron App, main, Intro, Guia, vida, backend, configuración ni dependencias.

GRU grande en su pestaña (también para miembros); miniatura sin fondo en las demás, acceso directo a la pestaña, última ruta de grupo, posiciones libres medidas y transición suave. Estado/borrador conservados en memoria por grupo; solicitudes reutilizadas al navegar. Estados disponible/buscando/listo/sin opción/error con resultados reales del flujo existente. Saludo, mirada, balanceo, parpadeo y movimiento reducido. Mini oculta en diálogos, sin tapar controles.

Validación observada: TypeScript, build Vite y diff --check pasan. QA local con toda salida externa interceptada y datos ficticios: recorrido funcional 6/6 (éxito/sin opción/error, continuidad con una sola solicitud, teclado/reducido, popover sin grupo, 320 sin desborde); validación final de posiciones 320/375/1280 sin colisiones; GRU grande sin mini en su pestaña, miembro sin botón de búsqueda, Ayuda oculta/restaura, viewport bajo/campo y resize. Cero llamadas reales a modelos/base. Artefactos fuera repo: `/Users/macair/.codex/visualizations/2026/10/24/01a16d93-5666-7e91-925e-fde45ae15a16/gru-app-qa/`. GIF `gru-movimiento-375.gif`, captura final `gru-solo-grande-375-viewport.png`.

Límite: continuidad solo en memoria (una recarga descarta borrador). Defecto ajeno detectado en el encabezado existente a 375: `.barra-rol` organizador desborda 8 px con Ayuda. Verificado removiendo GRU del DOM: scrollWidth 383→383; evidencia `overflow-diagnostic.json`. No se modificó el encabezado ajeno.

Intento previo de PR draft hacia wip/fundamentos rechazado por conector GitHub: HTTP403 Resource not accessible by integration. Ningún PR fue creado. Posteriormente Nico autorizó la publicación directa, completada como se registra abajo.

## Ampliación del formulario (pedido directo de Nico)
Entregada en `codex/gru-vivo` **`3cb0c07`** (incluye todo GRU): `src/agente/AgentePanel.tsx` (solo presentación de MisPreferencias/Opciones) y nuevo `src/agente/gru-preferencias.css`. Secciones con títulos/íconos, privacidad explícita, tarjetas de selección con controles nativos visibles, distribución adaptable, extras plegables y resumen en chips. Cancelar corregido localmente para contraste: 6,91:1 claro / 9,48:1 oscuro. No cambió estado, API, validación ni permisos.

QA final: TypeScript/build/diffcheck pasan. Flujo de preferencias con transporte completamente ficticio: preferencias vacías, guardar sin actividad y foco, selección, payload exacto con opcionales/permisos, espera de respuesta sin fingir guardado, confirmación del servidor/resumen, editar/cancelar e invitaciones por RPC independiente. Cero llamadas reales/errores JS. Capturas 320/375/1280, claro y oscuro; formulario sin desbordes nuevos. Evidencia en la misma carpeta: `prefs-final-375-light-viewport.png`, `prefs-final-1280-light-viewport.png`, `prefs-final-375-dark-viewport.png`, `prefs-visual-final.json` y scripts/reportes prefs.

## Pedidos
Integración/publicación resueltas por autorización directa de Nico. Frontend/intro: revisar el desborde preexistente del rol en encabezado375 con Ayuda. Rutas App/main/Intro/Guia/vida excluidas del diff de GRU.

## Publicación completada (24 oct)
Autorización directa de Nico: «publicá esta versión con GRU y el formulario nuevo así lo probamos en la app». Esta instrucción nueva autorizó integrar y publicar desde esta sesión.

Se integró el main vigente `09a5595c8984ccaac101c17b51fedb0610f11ed9` en la rama aprobada (GRU y formulario hasta `3cb0c07`), conservando los cambios recientes de Intro/App. Commit resultante **`07f037c1725f4b69c1abea7260306aee98c7917c`**, subido a `codex/gru-vivo` y a `main` mediante avance normal, sin force push. TypeScript, build Vite y diff --check pasan tras la integración. Checkout limpio.

El conector Vercel corresponde a otra cuenta/equipo; se utilizó el despliegue Git ya configurado. GitHub reportó contexto Vercel **success** para este commit: https://vercel.com/nicofaingold066-sketchs-projects/cruce-senales/73wtP8iUV2Eg8VCeBzqs9kZo7fWe . Alias público https://cruce-senales.vercel.app devuelve HTTP200 y sirve `index-CMAR1AFt.js`.

Prueba del frontend publicado en 375 y 1280: mini transparente, click abre GRU solo grande, formulario nuevo `.gru-prefs-form`, selección nativa de actividades/presupuesto, cancelar restaura y Perfil recupera mini. Ambos recorridos pasan, cero errores JS. Auth/RPC/modelos interceptados antes de navegar con datos ficticios (12 solicitudes simuladas por viewport); cero llamadas reales a base/modelos, cero escrituras. Sin cambios backend ni migraciones. Evidencia: `gru-app-qa/produccion-report.json`, `produccion-gru-375.png`, `produccion-preferencias-375.png` y equivalentes 1280 en la carpeta de artefactos indicada arriba.


## Arrastre manual completado (24 oct, nuevo pedido de Nico)
Rama `codex/gru-vivo`, commit **`9c046d1e8d9e41e181339ed25d3e7e9c90fdf70c`**, sobre main `08aa6e2`. Rama subida, checkout limpio. **No integrado a main ni publicado este corte.** Archivos exactos: `src/agente/GruAsistente.tsx`, `src/agente/gru-asistente.css`.

Arrastrar con mouse o dedo, umbral de 6 px para conservar tap/clic, captura de puntero y recuperación de cancelación. Suelta sin abrir ni navegar; un toque posterior conserva el enlace/panel. Conserva animaciones al soltar y la ubicación elegida en memoria entre rutas y scroll. Clamp del personaje/panel al viewport visible en resize y zoom; panel elige el lado con más espacio. En móvil conserva el anclaje inicial hasta moverlo; ubicación manual por encima de barras y oculta durante modales. Alternativa de teclado Alt+flechas, 16 px y foco conservado.

Validación final: TypeScript y build Vite pasan, diff --check limpio. QA Playwright/Chrome sobre main08aa6e2+drag: **10/10** casos principales y **2/2** zoom2x/horizontal812x240. Mouse real, touch nativo CDP, microgesto, link, panel centro/4 esquinas y botón cerrar real, cancel, rutas/scroll/resize, Alt+flechas, Enter/Space/Escape y movimiento reducido. Cero errores JS, cero escrituras ni llamadas reales a DB/modelos; todo transporte ficticio interceptado. Revisión independiente de código sin hallazgos pendientes tras corregir z-order/ancho/alto del panel.

Evidencia fuera del repo: `/Users/macair/.codex/visualizations/2026/10/24/01a16df4-5928-7463-bcde-e790d4ad173a/gru-drag-qa/` (`drag-report.json`, `viewport-report.json`, scripts y capturas). La ubicación se reinicia al recargar la app. Listo para integración del coordinador o publicación si Nico lo pide.
