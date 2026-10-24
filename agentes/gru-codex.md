# GRU · integración del asistente animado

Pedido directo de Nico en Codex (24 oct): integrar el personaje aprobado, llamado **GRU**, con más movimiento y estados reales; que permanezca visible en pequeño como asistente durante la navegación y abra su panel al tocarlo. Esta autorización nueva define este alcance visual sobre las reglas anteriores del mockup.

Rama propia `codex/gru-vivo`, copia aislada `/Users/macair/cruse/cruce-gru`, base `origin/main` `7f47a88`.

## Tocando ahora
Nada. Código entregado en rama propia; sin corridas contra la base.

## Verificación
Typecheck, build y navegador local con fixtures ficticios y red externa interceptada. Comprobar navegación, estados de éxito/error/sin opción, teclado, movimiento reducido, móvil 320/375 y escritorio 1280. Cero consultas pagas o escrituras en la base.

## Entregado
Objetivo de implementación cumplido. Rama `codex/gru-vivo`, commits `7d48892` y `bb701b2` (base main `4e90813` con intro/guía ya integradas). Rama subida; checkout limpio.

Archivos: `src/agente/{AgentePanel.tsx,GruPersonaje.tsx,GruAsistente.tsx,gru.css,gru-asistente.css,gruEstado.ts}`, montaje mínimo en `src/lib/shell.tsx`, nombre de pestaña/acceso en `src/screens/Espacio.tsx`. No se tocaron App, main, Intro, Guia, vida, backend, configuración ni dependencias.

GRU grande en su pestaña (también para miembros); miniatura sin fondo en las demás, acceso directo a la pestaña, última ruta de grupo, posiciones libres medidas y transición suave. Estado/borrador conservados en memoria por grupo; solicitudes reutilizadas al navegar. Estados disponible/buscando/listo/sin opción/error con resultados reales del flujo existente. Saludo, mirada, balanceo, parpadeo y movimiento reducido. Mini oculta en diálogos, sin tapar controles.

Validación observada: TypeScript, build Vite y diff --check pasan. QA local con toda salida externa interceptada y datos ficticios: recorrido funcional 6/6 (éxito/sin opción/error, continuidad con una sola solicitud, teclado/reducido, popover sin grupo, 320 sin desborde); validación final de posiciones 320/375/1280 sin colisiones; GRU grande sin mini en su pestaña, miembro sin botón de búsqueda, Ayuda oculta/restaura, viewport bajo/campo y resize. Cero llamadas reales a modelos/base. Artefactos fuera repo: `/Users/macair/.codex/visualizations/2026/10/24/01a16d93-5666-7e91-925e-fde45ae15a16/gru-app-qa/`. GIF `gru-movimiento-375.gif`, captura final `gru-solo-grande-375-viewport.png`.

Límite: continuidad solo en memoria (una recarga descarta borrador). Defecto ajeno detectado en el encabezado existente a 375: `.barra-rol` organizador desborda 8 px con Ayuda. Verificado removiendo GRU del DOM: scrollWidth 383→383; evidencia `overflow-diagnostic.json`. No se modificó el encabezado ajeno.

Intento de PR draft hacia wip/fundamentos rechazado por conector GitHub: HTTP403 Resource not accessible by integration. Ningún PR fue creado. Rama remota sí subida y disponible para integrar; no main ni despliegue desde esta sesión.

## Pedidos
Coordinador: integrar `codex/gru-vivo` `bb701b2` y publicar mediante el flujo habitual. Frontend/intro: revisar el desborde preexistente del rol en encabezado375 con Ayuda. Rutas App/main/Intro/Guia/vida excluidas del diff de GRU.
