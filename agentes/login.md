# login (sesión de ENTRADA: login y comienzo del user flow)

Guía: `prompts/login.md`. Rama: `wip/login`. Rutas: `src/login/**` + enganche mínimo en `src/lib/shell.tsx` (ruta `entrar`) y `src/App.tsx` (`case 'entrar'` y redirección de primera visita).

## Tocando ahora
- `src/login/**`
- `src/App.tsx`: la línea de `case 'unirse'` (autorizada, enmienda 9)
- `src/lib/api.ts`: SOLO `VistaPorCodigoOk`, `previewSpaceByCode` y `p_miembro_id` opcional en `joinSpace` (autorizado)

## Estado
- [17:03] CONGELADO src/ por orden del coordinador (entra el rediseño de Juan; él unifica #/entrar con "Ingreso con nombre"). No empujo ni rebaso; wip/login queda en a7ab1a9. Sigo probando la fase 1 contra la base, sin empujar, cuando backend la aplique.
- [17:01] Enmienda 9 fase 1: interfaz lista en `wip/login` = `a7ab1a9` (rebasada sobre `wip/fundamentos` 55194f2). **NO INTEGRAR TODAVÍA:** espero que backend aplique la fase 1 para correr recorrido-dos-sesiones y jurado-navegador. typecheck, build y red-controlada (10/10) en verde; banco sin base `src/login/prueba/quien.html` probado a 320 y 375 px.
- [16:58] Corte 2 (entrada estilo Tricount): esperando decisión del coordinador sobre la enmienda. Armo la pantalla "¿Quién eres?" en `src/login` sin engancharla.
- [16:51] Corte 1 entregado en `wip/login` (cd4d885). Espero integración del coordinador.
- [16:46] Arranqué. Rama `wip/login` desde `origin/wip/fundamentos` (9e3fa09). Leyendo código.

## Pedidos a otros
- [16:58] **coordinador (y backend): enmienda "entrada estilo Tricount"** (pedido de Nico). A) `create_space` con `p_integrantes text[]` → miembros "pendientes" (no simulados, nunca cuentan como interés/asistencia/quórum). B) `preview_space_by_code(p_codigo)` → solo `{ espacio: {nombre, demo}, miembros: [{miembro_id, nombre, libre}] }`. C) `join_space(..., p_miembro_id)` reclama ese pendiente (o simulado del demo); errores `miembro_ya_reclamado`, `miembro_inexistente`. Excepción explícita a E7.3 (con el código se ven los nombres, ficticios). Además: que `#/unirse/<código>` pase a `src/login` (una línea en `PantallaRuta`). Mínimo si no llega a las 20:00: B + C solo para el demo. Detalle enviado por mensaje al coordinador.

## Entregado
- [16:50] `wip/login` = `cd4d885` (base `wip/fundamentos` 9e3fa09). Archivos: `src/login/Entrar.tsx`, `src/login/login.css` (nuevos); `src/lib/shell.tsx` (+3 líneas: tipo, parseRuta y `rutas.entrar`); `src/App.tsx` (import, `case 'entrar'` y `PrimeraVisita` envolviendo `<Inicio />`).
  - Qué hace: `#/` con sesión sin espacios → `#/entrar` (location.replace, sin ensuciar el historial). Con espacios → portada de siempre. `#/entrar` con espacios → `#/`. `#/unirse/<código>` no pasa por la entrada. Si hay sesión guardada (#47): "Sigues como <etiqueta>" con "Volver a esa sesión" / "Entrar como otra persona". "Crear un espacio" lleva a `#/` sin redirigir y abre el formulario plegado de la portada. Errores con `ErrorCaja` y los textos de `api.ts` (nada nuevo); tras código inexistente o nombre en uso, el foco va al campo.
  - Pruebas (16:47–16:50): `npm run typecheck` OK · `npm run build` OK · `node tests/e2e/red-controlada.mjs` 10 PASS, 0 FAIL · `node tests/e2e/recorrido-dos-sesiones.mjs http://127.0.0.1:4317` (vite preview de mi build) **RECORRIDO OK: 23 aprobadas, 0 fallidas**. A mano en el navegador: redirección `#/`→`#/entrar`, un solo h1, foco inicial en la demo, botones de 44–52 px, sin desborde a 375 y 320 px, código inválido ("El código de invitación no existe.", aria-invalid y foco al campo), "Crear un espacio" abre el formulario con foco, sesión guardada con token vencido (avisa, la olvida y muestra las tres entradas).
  - Límites: la portada hace una lectura extra de `list_my_spaces` por carga de página hasta ver espacios (después queda en memoria). Si `list_my_spaces` falla en `#/`, se muestra la portada de siempre (no la entrada). Si al unirse desde la entrada el servidor dice `ya_era_miembro`, se manda a `#/unirse/<código>` para que la portada avise. Texto con "tú" (como el resto de la app): "Sigues como…", no "Seguís". No corrí `jurado-navegador.mjs`.

## Ideas
- Que la portada (claude-b) exporte `UnirsePorCodigo` para que la entrada lo use tal cual y no haya dos formularios de unirse que mantener.
- En la entrada, un enlace chico "¿Qué guarda CRUXE de mí?" que explique en dos líneas la sesión anónima y el nombre ficticio (bueno para el pitch de privacidad).
