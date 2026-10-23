# Agente: front-juan (rediseño del front pedido por Juan Morales)

Quien edita este archivo: solo esta sesión (Claude, a pedido de Juan, en la computadora de Nico, Mac-mini-de-Felix). Última actualización: viernes 23 oct, 17:38 Santiago (reloj).

## Tocando ahora
- CORRIENDO PRUEBA (18:20): capturas compu 1280 y 1440 px de wip/front-juan (demo propia). Demos y propuestas propias, datos ficticios, cero llamadas al agente.

## Entregado: `wip/front-juan` = `91e9f9a` (sobre `main` `30e4c76`, ya fusionado)
Nuevo desde lo que integraste (`9269e8e`), pedido por Juan:
- **Nueva propuesta simple:** cada opción (A y B) es un día de una tira de próximos días + una hora de encuentro (o una propia); la duración se elige una vez (1–4 h) y el fin se calcula solo, sin convertir zonas. Atajos de actividad (Asado 3 h, Fútbol 1 h…). Mínimo y máximo en la misma fila, anfitrión tocando su avatar, cierre por defecto "el día antes, 20:00". En la demo, el caso exacto (A sáb 31 y B dom 1, 14–17; cierre jue 29 20:00). El contrato no cambia.
- **Menos scroll** (medido a 375 px): plan con reparación y grupo confirmado 3593 → 2663 px; grupo 1526 → 1385 px; mi respuesta 1975 → 1796 px (datos en grilla 2 × 2, personas como chips, sin avisos duplicados, comparación v1 → v2 lado a lado).
- **Portada:** cruce 3D en CSS (órbita en perspectiva, esferas con luz y sombra, rayos hacia la X, paralaje con el dedo). Quieta con movimiento reducido.
- **Respuesta a `docs/agente-revision-front-juan.md`:** P1, "Sin confirmar" y el paso "Encuentro" ya venían arreglados en `main` (80b8444). En esta rama: la invitación no precarga el nombre del dueño del navegador y ofrece "Soy X" / "No soy X" (P2); textos según E7.2, solo quien organiza ve cuántas personas respondieron (P3); aviso en "Volver a esa sesión" y etiqueta solo con el nombre (P3); `.ics` con `;`, saltos y caracteres de control bien tratados (P3); "¡Se juntan!" solo para quien confirmó la versión; el cruce avisa "+N más" con más de 10 personas.

## Cómo se probó (backend real, sin MIGRACION EN CURSO, con CORRIENDO PRUEBA anotado)
- `npm run typecheck` y `npm run build` en verde.
- 17:34–17:35, versión compilada de `91e9f9a` sin la pasada estética de la órbita (solo CSS decorativo, aria-hidden): `cruxe-pruebas/e2e-recorrido.js` **11/11** y `cruxe-pruebas/recorrido-invitacion.js` **9/9** (actualizado al formulario nuevo), ninguna `ok:false` ni `contrato` distinto de 2.
- Auditoría responsive de 11 pantallas a 320, 375, 430, 768 y 1280 px: sin desborde y toques de al menos 44 × 44 px.

## Pedidos
- **coordinador:** integrar `wip/front-juan` cuando lo decidan con Nico. La rama reescribe casi todo `src/` (menos `src/agente/**`). Antes de fusionar conviene volver a correr los dos recorridos de arriba.
- **coordinador (componentes externos):** (hecho por vos en ce05e5e, gracias) **Lucide** (`lucide-react` 1.53.0, versión fija, licencia ISC, https://lucide.dev). Es la única dependencia nueva; está en `package.json` y `package-lock.json` de la rama. Las ideas tomadas de componentry.dev (texto anotado y tablero tipo split-flap) son implementación propia, sin código copiado; se pueden mencionar como inspiración.
- **claude-b-interfaz:** aviso de solapamiento. Esta rama reescribe pantallas y estilos de `src/`; si seguís con mejoras en `src/`, coordinemos antes de la fusión para no pisarnos.
