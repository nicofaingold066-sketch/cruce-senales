# rincones (sesión de la noche: aprueba cada rincón de la app, en teléfono, tablet y compu)

Guía: `prompts/equipo-noche.md`. Rama: `wip/rincones` (copia `/Users/macair/cruse/cruce-rincones`). Rutas: `tests/rincones/**`, `docs/rincones.md`. Puerto de preview: 4187.
Método: Playwright contra mi build, en un GRUPO NUEVO propio (el demo solo se mira, no se resetea). Veredictos: APROBADO / OBSERVADO / ROTO. Yo no arreglo nada: pido al dueño.

## Tocando ahora
- [19:35] `tests/rincones/**` y `docs/rincones.md` (inventario de rincones, guion de recorrido en 320/375/768/1280 px, capturas y veredictos).

## Entregado
- [20:12] Rama `wip/rincones`: guiones `tests/rincones/f0`–`f6` + `lib.mjs`, `docs/rincones.md` con inventario (≈130 rincones recorridos en grupo nuevo y demo, contra build propio de `main` 61e7da6). Resultado hasta ahora: ROTO 0, OBSERVADO 14 (O-01…O-14; O-02, O-06 y O-08 ya corregidos en wip/friccion, pendientes de main), resto APROBADO.

## Pausa
- [20:37] PAUSA por MIGRACION EN CURSO (0041). Corrida 3 sobre main 7f2423e detenida; el guion f11 (Responder en un paso) espera. Retomo cuando backend saque la línea.

## Pedidos a otros
- front-juan [20:00]: O-01 a 320 px el avatar de la sesión (`.barra-identidad`) pisa 26 px el chip `.chip-ficticio` "Datos ficticios" en la cabecera de toda pantalla con nombre (captura 202610231931/R25-320.png); O-03 con Tab el foco queda bajo `.nav-inferior` (agregar `scroll-padding-bottom`); O-04 en la portada con nombre se repiten "Tengo un código de invitación" y "Unirme con un código"; O-05 "Conserva 1 confirmación(es) de 2 necesarias" (PlanTab, versión en revisión); O-07 avatares 10,4 px con contraste 3,0–3,6:1; O-09 "Cancelado" duplicado en propuesta cancelada. Detalle y pasos en docs/rincones.md (rama wip/rincones).
- friccion [20:00]: O-02 en `#/unirse/<código>` abierto por un navegador que ya es miembro (Dani) aparece "¿Quién eres?" con Dani "no disponible" y "Ya no queda ningún nombre libre"; falta "Seguir como Dani" (captura 202610231950/R123-375.png); O-06 `#/e/no-es-uuid` muestra "Falla temporal. Intenta de nuevo. Reintentar" (400 de get_space); O-08 `#/unirse/<código inexistente>` mantiene "Te invitaron a un plan. Elige tu nombre" arriba del error.
- backend [20:00]: O-06 `get_space` con id que no es uuid devuelve 400 (el cliente lo presenta como falla temporal); si querés, responder un error no reintentable (`no_encontrado`).

- friccion [20:06]: gracias, re-revisado en un build de `wip/friccion` (05e148d): O-06 y O-08 APROBADOS ("Este enlace no lleva a ningún grupo", "Esta invitación no existe"); O-02 APROBADO con un miembro que entró por formulario ("Seguir como Mica"). Ojo: en el build de `main` quien entra por formulario no queda con `cruxe:perfil`, por eso allá no sale "Seguir como". Los marco APROBADOS cuando estén en `main`.
- front-juan [20:06]: O-10 en Nueva propuesta, "No puede faltar" ofrece a integrantes "por entrar" sin avisar (R141, captura 202610231956/R141-375.png): si el elegido nunca entra, no se publica opción; sugiero marcarlos "aún no entró" en el chip.
- agente-ia [20:06]: O-11 resultado del agente en un grupo real: voseo ("Elegís vos", "completás vos"), la opción "Asado · Quincho de Tomi" y lugares "SIMULACIÓN" fuera del demo (captura 202610231958/R154-375.png).
- front-juan [20:12]: O-14 demo, pestaña Simulación a 320 px: la pestaña "Simulación" se sale de la pantalla (262–360 de 320) y la etiqueta "SIMULACIÓN" de cada persona queda tapada por la insignia "Sin versión publicada" (captura 202610231946/R104-320.png); O-12 tres avisos de "sin conexión" a la vez y "Hoy paso" deshabilitado sin explicación.
- friccion [20:12]: O-13 al fallar el login anónimo el texto dice "el inicio de sesión anónimo puede estar deshabilitado en el proyecto" (técnico para quien solo abrió un enlace); O-12b con contrato incompatible salen dos avisos con el mismo texto.

- agente-ia [20:40]: O-15 en "Mis preferencias" el grupo "Me gustaría" aparece en rojo (error) con "Marcá al menos una." desde que se abre el panel, antes de tocar nada (captura 202610231958/R150-375.png); mostrarlo en rojo solo tras intentar guardar sin actividad, y tutear ("Marca").
- (retirado [20:45]) lo que parecía un encimado de chips en Nueva propuesta del demo era texto oculto para lectores de pantalla; visualmente está bien.

## Ideas
(ninguna todavía)
