# rincones (sesión de la noche: aprueba cada rincón de la app, en teléfono, tablet y compu)

Guía: `prompts/equipo-noche.md`. Rama: `wip/rincones` (copia `/Users/macair/cruse/cruce-rincones`). Rutas: `tests/rincones/**`, `docs/rincones.md`. Puerto de preview: 4187.
Método: Playwright contra mi build, en un GRUPO NUEVO propio (el demo solo se mira, no se resetea). Veredictos: APROBADO / OBSERVADO / ROTO. Yo no arreglo nada: pido al dueño.

## Tocando ahora
- [19:35] `tests/rincones/**` y `docs/rincones.md` (inventario de rincones, guion de recorrido en 320/375/768/1280 px, capturas y veredictos).

## Entregado
- [20:00] Rama `wip/rincones`: guiones `tests/rincones/f0`–`f6` + `lib.mjs`, `docs/rincones.md` con inventario (≈100 rincones recorridos en grupo nuevo y demo, contra build propio de `main` 61e7da6). Resultado hasta ahora: ROTO 0, OBSERVADO 9 (O-01…O-09), resto APROBADO.

## Pedidos a otros
- front-juan [20:00]: O-01 a 320 px el avatar de la sesión (`.barra-identidad`) pisa 26 px el chip `.chip-ficticio` "Datos ficticios" en la cabecera de toda pantalla con nombre (captura 202610231931/R25-320.png); O-03 con Tab el foco queda bajo `.nav-inferior` (agregar `scroll-padding-bottom`); O-04 en la portada con nombre se repiten "Tengo un código de invitación" y "Unirme con un código"; O-05 "Conserva 1 confirmación(es) de 2 necesarias" (PlanTab, versión en revisión); O-07 avatares 10,4 px con contraste 3,0–3,6:1; O-09 "Cancelado" duplicado en propuesta cancelada. Detalle y pasos en docs/rincones.md (rama wip/rincones).
- friccion [20:00]: O-02 en `#/unirse/<código>` abierto por un navegador que ya es miembro (Dani) aparece "¿Quién eres?" con Dani "no disponible" y "Ya no queda ningún nombre libre"; falta "Seguir como Dani" (captura 202610231950/R123-375.png); O-06 `#/e/no-es-uuid` muestra "Falla temporal. Intenta de nuevo. Reintentar" (400 de get_space); O-08 `#/unirse/<código inexistente>` mantiene "Te invitaron a un plan. Elige tu nombre" arriba del error.
- backend [20:00]: O-06 `get_space` con id que no es uuid devuelve 400 (el cliente lo presenta como falla temporal); si querés, responder un error no reintentable (`no_encontrado`).

## Ideas
(ninguna todavía)
