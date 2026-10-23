# qa-noche (sesión de la noche: que nada se rompa)

Guía: `prompts/equipo-noche.md`. Rama: `wip/qa` (copia `/Users/macair/cruse/cruce-qa`). Rutas: `tests/e2e/**`, `docs/qa-noche.md`. Puerto de preview: 4185.

## Tocando ahora
- [19:29] Vigilando entregas y humo cada hora. Sin editar: `tests/e2e/**` y `docs/qa-noche.md` libres entre tareas.

## Entregado
- [20:30] `wip/qa` (ver `docs/qa-noche.md`): privacidad E10 en el jurado. Producción main fae49fa: recorrido 23/23, jurado 4/4. Ramas friccion/ux/agente-ia verdes con base. Pendiente: versionar guion #98 de ux-flujo.
- [19:38] `wip/qa` guiones de friccion versionados; red-controlada 10/10 sobre friccion cac56d8, ux c444bea, agente-ia 27bc499 (coordinador pidió 2 y 3: hechos). Pendiente: correr con base.- [19:29] #76 hecho: `wip/qa` `4b2047c`, sesiones-recuperacion 12/12 (L1–L3 sobre la portada). `7773076`: guardia común `tests/e2e/base-libre.mjs` (el recorrido ahora también se frena con MIGRACION EN CURSO) y `docs/qa-noche.md`. Producción 19:27: recorrido 23/23, red 10/10. Jurado no corrió (MIGRACION EN CURSO de backend 19:26).

## Pedidos a otros
- psico [20:44]: hecho P-A: `tests/e2e/guardia-palabras.mjs` en `wip/qa` (estático; sin comentarios ni pruebas ni listas de prohibidas ni catálogo; sale 1 si hay hallazgo; con control probado). Hoy 0 hallazgos en d9176a9. Lo corro en cada entrega de agente-ia y friccion, y al integrar.
- front-juan [20:36]: en `src/components/Sesiones.tsx` (`OtraSesion`), cuando «Volver a esa sesión» falla, llevar el foco al aviso de error (antes lo hacía `#/entrar`; hoy L2/L3 ya no lo comprueban). Prioridad baja, antes del congelamiento de las 11:00 si hay tiempo; si lo hacés avisame y recupero la comprobación.
- friccion [20:05]: ya corregido el patrón `[\w-]+` en `red-import-cortada.mjs`. Con la base libre, `wip/friccion` 05e148d en mi preview: recorrido 23/23, jurado 4/4, friccion-flujo 19/19, red-import 4/4, toques = 4. Verde, sin regresiones.
- friccion [19:38]: versionados tus guiones en `wip/qa`: `tests/e2e/toques-invitacion.mjs` (= medir), `red-import-cortada.mjs` (= red82) y `preparar-grupo.mjs`, con guardia de MIGRACION EN CURSO. Los corro contra `wip/friccion` al terminar la migración. Red-controlada 10/10 con cac56d8.- friccion [19:32]: gracias por `Responder`; sí, pasame tu guion de los toques (ponelo en tu ficha o en el repo si es tuyo) y lo versiono en `tests/e2e/`. Lo corro contra tu rama en cuanto backend saque MIGRACION EN CURSO. Con `efede20`: sesiones 12/12 y red 10/10 (sin base).- friccion [19:29]: aviso, no pedido: L2/L3 de sesiones-recuperacion ya no comprueban el foco tras el error de «Volver a esa sesión» (la portada nueva no mueve el foco). Si lo agregás en `OtraSesion`, avisame y lo vuelvo a probar.

## Ideas
- P2 [19:32] front-juan (dueño de `OtraSesion`): foco al aviso de error al fallar «Volver a esa sesión» (antes lo hacía `#/entrar`; L2/L3 ya no lo comprueban). Baja prioridad.
- P2: recorrido "convencer a uno" con 5 invitados (ux-flujo lo guioniza como #98; coordinamos para no duplicar).
- P2: reintento de imports con la red cortada (relacionado con #82 de friccion).
- P2: pasada a 320 px de las pantallas principales.
- P1 (cuando llegue la enmienda 10): privacidad en red: ninguna respuesta compartida trae zona, movilidad, minutos por persona ni "me_llevan".
