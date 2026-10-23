# friccion (sesión de la noche: quitar fricción entre producto y usuario)

Guía: `prompts/equipo-noche.md`. Rama: `wip/friccion`. Rutas: `src/login/**`, `src/App.tsx`, `src/lib/shell.tsx`, archivos NUEVOS en `src/friccion/**`.

## Tocando ahora
- [19:30] #82 reintento de import en la precarga: `src/App.tsx` (y un archivo nuevo `src/friccion/importar.ts`).

## Entregado
- [19:29] `wip/friccion` = `3c07fe3` (base `wip/fundamentos` 95def89). **Entrada por código coherente con el enlace**: `src/friccion/porCodigo.ts` (nuevo) con `destinoPorCodigo(codigo, nombre)`. Falta que front-juan lo conecte en `Inicio.tsx` (ver Pedidos). Pruebas: typecheck OK; 8/8 casos de `destinoDesdeVista` (vitest fuera del repo: coincide con libre, sin tildes/mayúsculas, sin coincidencia → elegir, sin libres → se une, demo nunca desvía, demo reclama Luna, nombres duplicados → elegir).
- [19:27] `wip/friccion` = `efede20`. **#88 Respuesta en un paso: 8 → 4 toques.**
  - Qué hace: quien toca su nombre en "¿Quién eres?" y "Sí, soy X" va a `#/e/<id>/responder` (`src/friccion/Responder.tsx`, nuevo): la propuesta abierta con respuestas de UN toque ("Puedo los dos días", "Solo el jueves 29 oct", "Solo el viernes 30 oct", "No puedo ninguno"; con una franja, "Puedo"/"No puedo"), que guardan las dos franjas con `save_my_conditions`. Después: "Me interesa" opcional (dice que es público y no es confirmación), "Ver el plan" y "Cambiar mi respuesta". Si no hay exactamente una propuesta en "Reuniendo interés" que el servidor deje responder (`puede.guardar_condiciones`, condiciones no completas), reemplaza la ruta por el espacio y le pasa el aviso "Entraste como X" (el botón atrás vuelve a la invitación, no a la pantalla vacía). Por el formulario "No estoy en la lista" se sigue entrando al espacio (los guiones entran así). "Seguir como X" desde la lista también pasa por la respuesta rápida.
  - Archivos: `src/friccion/Responder.tsx`, `src/friccion/friccion.css` (nuevos); `src/lib/shell.tsx` (ruta `responder` y `rutas.responder`); `src/App.tsx` (case); `src/login/QuienEres.tsx` (destino tras unirse por la lista).
  - Medición con Playwright propio (fuera del repo), build propio en 4182, 375 px, grupo ficticio nuevo (Orga + integrantes Ana y Beto, propuesta abierta con dos franjas): ANTES (19:24) **8 toques** = enlace, "Ana", "Sí, soy Ana", tarjeta, pestaña Mi respuesta, franja A, franja B, Guardar. DESPUÉS (19:27) **4 toques** = enlace, "Ana", "Sí, soy Ana", "Puedo los dos días" (2,7–4,3 s de punta a punta). Sin desborde a 375 px, sin errores en consola. "Me interesa" opcional probado (+1 toque, no cuenta para la respuesta).
  - Casos de vuelta probados: grupo sin propuesta y propuesta en borrador → entra al espacio con "Entraste como Ana", atrás vuelve a `#/unirse/<código>`.
  - Guiones: `recorrido-dos-sesiones.mjs http://localhost:4182` **23/23** (19:28). `red-controlada.mjs` no corrió: el puerto 4189 lo tiene otra sesión; lo repito.
  - Límites: con dos o más propuestas abiertas no hay atajo (va al espacio). Con más de dos franjas tampoco. El texto del aviso se acorta a su primera oración.

## Pedidos a otros
- front-juan [19:30]: **entrada por código** (flujo-usuario §6.6: escribir el código en la portada con el nombre de un integrante anotado da "nombre en uso"). En `src/screens/Inicio.tsx`, `UnirsePorCodigo.hacer()` (~línea 378), antes del `ejecutar`: `const d = await destinoPorCodigo(codigo.trim(), nombre.trim()); if (d.elegir) { irA(rutas.unirse(codigo.trim())); return }` y en la llamada `api.joinSpace(codigo.trim(), d.nombre, d.miembroId)` (import `destinoPorCodigo` de `../friccion/porCodigo`). Opcional: en `entrar()`, si `d.miembroId` no es null, `irA(rutas.responder(r.espacio_id))` en vez de `rutas.espacio(...)` (la pantalla vuelve sola al espacio si no hay nada que responder). No cambia rótulos ("Unirme", "Tu nombre en el espacio" siguen). En la demo no desvía nunca.
- front-juan [19:30]: idea para conectar cuando puedas: en `Espacio.tsx` (o `PlanVivo.tsx`), si la propuesta abierta tiene `mi_situacion` sin responder, un botón "Responder en un toque" con `href={rutas.responder(espacioId)}`; la pantalla nueva se encarga del resto.
- qa-noche [19:30]: aviso, no pedido: nueva ruta `#/e/<id>/responder` (`src/friccion/Responder.tsx`). Solo se llega eligiendo un nombre de la LISTA de "¿Quién eres?"; por el formulario "Unirme" no cambia nada. Botones con nombre accesible que empieza con "Puedo los dos días" / "Solo el …" / "No puedo ninguno"; al guardar: título "Respuesta guardada" y "Guardado. Solo tú ves estas condiciones.". Si querés un guion de los toques, el mío está listo para pasártelo.
- qa-noche [19:30]: sobre el foco en L2/L3: `OtraSesion` está en `src/components/Sesiones.tsx`, que es de front-juan, no mío.

## Ideas
- (P1, mía) Que el organizador también llegue al "¿Cuándo puedes?" después de crear la propuesta (hoy carga sus condiciones en la pestaña).
- (P2, mía) Saltar "¿Eres X?" cuando el teléfono ya tiene ese nombre guardado en su perfil local (3 toques).
- (P2, front-juan) Botón "Responder en un toque" en el espacio para quien vuelve más tarde (ver Pedidos).
