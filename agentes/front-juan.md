# Agente: front-juan (rediseño del front pedido por Juan Morales)

Quien edita este archivo: solo esta sesión (Claude, a pedido de Juan, en la computadora de Nico, Mac-mini-de-Felix). Última actualización: viernes 23 oct, 16:40 Santiago (reloj).

## Tocando ahora
(vacío. Todo está en la rama `wip/front-juan`; no toqué `main`, `wip/fundamentos`, `wip/ui-enmienda` ni las ramas de los demás.)

## Entregado: `wip/front-juan` = `a7b56ed`, lista para integrar
Pedido de Juan: rehacer todo el front, mobile-first, con estilo de app de viaje en curso (Uber), y el flujo completo desde el ingreso hasta el final de una invitación. Ya trae fusionado `main` `7b0335b`: #47, #52, #56 y #51 de `main` quedaron adentro del rediseño (se descartaron las versiones locales viejas de #47 y #52).
- **Sistema visual nuevo** (`src/styles.css`, fuente del sistema, modo oscuro): arriba una escena oscura con el estado en vivo; encima sube una hoja clara con el detalle; la acción principal queda fija abajo. En escritorio, la escena va fija a la izquierda.
- **"El cruce"** (`src/components/Cruce.tsx`): las personas del espacio alrededor del plan. Solo dibuja datos del servidor (`opcion.aceptaron`, `interesados`, `bajas`, cupos). Nunca muestra condiciones.
- **Flujo completo:**
  - Ingreso con nombre, sin contraseña ni correo. Es la sesión anónima del contrato 0.1; el nombre queda solo en el navegador (`src/lib/perfil.ts`).
  - Perfil, con "Entrar como otra persona" sin `signOut` (usa `sesionNueva` de #47).
  - Mis planes: Te toca / En curso / Confirmados / Cerrados.
  - Crear un grupo.
  - Invitación con pantalla propia, invitar por WhatsApp y tarjeta "Invita a tu grupo".
  - Cierre "¡Se juntan!" con "Agregar al calendario" (`.ics` armado en el teléfono) y aviso por WhatsApp.
  - "Ir a confirmar" cuando te toca y estás en otra pestaña.
  - Barra inferior Inicio / Planes / Perfil.
- **Legibilidad:**
  - Gris terciario a ~5,3:1 y textos de ~12 px como mínimo.
  - Ícono por estado del plan, no solo color.
  - Texto anotado a mano, código de invitación en tablero de aeropuerto y confeti al confirmarse el grupo. Todo con CSS y SVG propios; se apaga con movimiento reducido.
- **Reglas:**
  - El servidor decide cupos, estado y confirmación; la interfaz no calcula autoridad.
  - Interés no es confirmación.
  - No se tocó `src/agente/**`.
  - Se conservan los nombres accesibles de botones y pestañas, `strong.codigo`, `.estado-hero` y `.cambio-version`, que usan las pruebas.

## Cómo se probó (backend real, sin MIGRACION EN CURSO en `backend.md`)
- `npm run typecheck` y `npm run build` en verde.
- `cruxe-pruebas/e2e-recorrido.js` (11 pasos, Tomi y Luna, versión compilada): **11/11**, ninguna respuesta `ok:false` ni `contrato` distinto de 2. Última corrida: ~16:30.
- `cruxe-pruebas/recorrido-invitacion.js` (9 pasos, grupo propio Ana y Bruno, versión compilada): **9/9**, ninguna `ok:false` ni error de página. Cubre ingreso, crear grupo, invitar, unirse por enlace, propuesta con campos a mano, condiciones, opción, confirmar, ¡Se juntan!, `.ics` y perfil.
- Capturas a 320, 375 y 430 px y en escritorio: sin desborde horizontal. Modo oscuro revisado.
- No corrí `tests/e2e/red-controlada.mjs` (usa el Playwright y el Chrome de la computadora A). La lógica que prueba en `Espacio.tsx` y `SimulacionTab.tsx` es la de `main`; solo cambió el marcado.
- No corro nada contra la base durante la 0031 (16:55).

## Pedidos
- **coordinador:** integrar `wip/front-juan` cuando lo decidan con Nico. La rama reescribe casi todo `src/` (menos `src/agente/**`). Antes de fusionar conviene volver a correr los dos recorridos de arriba.
- **coordinador (componentes externos):** registrar en `docs/componentes-externos.md` **Lucide** (`lucide-react` 1.53.0, versión fija, licencia ISC, https://lucide.dev). Es la única dependencia nueva; está en `package.json` y `package-lock.json` de la rama. Las ideas tomadas de componentry.dev (texto anotado y tablero tipo split-flap) son implementación propia, sin código copiado; se pueden mencionar como inspiración.
- **claude-b-interfaz:** aviso de solapamiento. Esta rama reescribe pantallas y estilos de `src/`; si seguís con mejoras en `src/`, coordinemos antes de la fusión para no pisarnos.
