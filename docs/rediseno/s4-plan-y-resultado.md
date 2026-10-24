# S4 «El plan y su resultado»: esquema del rediseño (ux-flujo, sáb 24, 02:30)

Esquema de la sección, en seco, como pide el aviso del coordinador de las 02:13 (la fase 1 la dirige **frontend** en `wip/diseno`; no hay sesión diseno). Insumo para el brief de S4 y plan de obra de ux-flujo. Datos de `main` `22ae202` (`src/screens/Propuesta.tsx` 402 líneas, `src/screens/PlanTab.tsx` 806, `components/PlanVivo.tsx` 68, `Orbita.tsx` 71). Todo lo que sigue es lectura del código, no opinión de nadie más.

## 1. Lo que hay hoy, de arriba abajo (Propuesta.tsx + PlanTab.tsx)

**Escena** (fondo oscuro): «← {nombre del grupo}» · h1 título · `Cuando` (día + «20:00 a 23:00 · franja A», o las dos candidatas) · `Cruce` SVG 340×252 (personas en órbita, centro «2/4 confirmaron», leyenda Confirmó / Le interesa / Sin confirmar).
**Hoja**: avisos de red («Sin conexión» / «No se pudo actualizar»), aviso previo, «Hay una versión nueva (versión N)» (cuando cambia la versión mientras miras) → `header.propuesta-cabecera` con el **estado-hero** (`role=status aria-live=polite`: ícono + `estado_etiqueta` + «vN» + pastillas «Tu turno…»/«Ya confirmaste…» + `siguiente_accion.texto` + `Pasos` Respuestas·Opción·Confirmar·Encuentro + «Ir a confirmar» si no estás en Plan) → pestañas Plan · Mi respuesta · Historial · (Simulación) → panel.

**Pestaña Plan, cards en orden** (× = aparece):

| # | Card (h2) | borrador | reuniendo | esperando | confirmado | en revisión | cancelado |
|---|---|---|---|---|---|---|---|
| 1 | `AvisoParaMi` (una de: Gracias por avisar · Cambió el plan · Esta versión no te incluye · Hoy conviene recordar · Dijiste: así no puedo · Si no llegan N, nadie queda comprometido · Se armó la juntada) | | × | × | × | × | |
| 2 | `InvitacionAgente` («Tienes una invitación del agente») | si hay | si hay | si hay | | | |
| 3 | Aviso cancelado/expirado (`siguiente_accion.texto`) | | | | | | × |
| 4 | `BloqueRevision` (aviso «Una baja dejó el plan sin cumplir») | | | | | × | |
| 5 | `CambioDeVersion` («El plan cambió: versión 1 → versión 2», dos columnas, «Nadie confirmó todavía», «Estas confirmaciones no pasan a la versión 2») | | | si v≥2 reparada | si v≥2 | | |
| 6 | `AbrirPropuesta` («Borrador» · «Abrir propuesta») | × | | | | | |
| 7 | `CierrePlan` («¡Se juntan!» + confeti · Calendario · WhatsApp o `RecordarFaltan confirmado`) | | | | si confirmé | | |
| 8 | `OpcionVigente` («Opción vigente · Versión N»: DiaTile + franja + «Franja A · hora de Santiago (America/Santiago) · publicada …» · `BuscarLugar` · `Progreso` + leyenda · `cifras` Aceptaciones necesarias / No puede faltar (X) / Faltan por confirmar (org) · «Cupo reservado…» · h3 «Quién confirmó esta versión» chips · «Las condiciones de cada persona son privadas…» · **Confirmar versión N** o `razonNoAceptar` · ronda «Opiniones hasta…» · `AsiNoPuedo` · errores) | | | × | × | | |
| 9 | `RearmarConLoNuevo` (org, ≥2 «así no puedo») | | | org | | | |
| 10 | «Avisar al grupo» (`RecordarFaltan` versión nueva/reparación; org, con cupos libres) | | | org | | | |
| 11 | `AlternativaOrganizador` («Alternativa»: «Sin opción compatible» · **Buscar alternativa** / «El organizador (X) debe buscar una alternativa.») | | | | | × | |
| 12 | `OpcionAnterior` («Versión N (en revisión, no confirmada)») | | | | | × | |
| 13 | `ReuniendoInteres` («Respuestas del grupo»: stats Con condiciones / Mínimo (org) · texto · chips «Me interesa» · aviso «Aún no completaste tus condiciones» + «Ir a Mi respuesta») | × | × | | | | |
| 14 | `FaltaTuRespuesta` («¿Cuándo puedes?» · **Responder en un toque**) | | sin responder | | | | |
| 15 | «Avisar al grupo» (`RecordarFaltan faltan`; org) | | org | | | | |
| 16 | `BuscarOpcion` («Buscar opción»: «Sin opción compatible» · **Buscar opción compatible** / «Volver a buscar opción» · notas) | | × | | | | |
| 17 | `Bajas` («Cambios en el grupo»: «Una persona se retiró (versión N).») | | si hay | si hay | si hay | si hay | si hay |
| 18 | `HistorialResumido` (3 últimos + «Ver historial completo») | | si bajas | si bajas | si bajas | × | si bajas |
| 19 | `Ficha` (`details` «Ficha del plan»: Organiza · No puede faltar · Franjas candidatas · Si sirven las dos · Cómo viene cada plan (org, E15) · Zona horaria · Cupos · Cierre de aceptación + cuenta regresiva) | abierta | abierta | plegada | plegada | plegada | plegada |
| 20 | `Cancelar` («¿Ya no va?» · Cancelar propuesta → «Sí, cancelar» / Volver) | org | org | org | org | org | |

Peor caso real (organizadora, esperando, con 2 «así no puedo» y una baja): 1+8+9+10+17+18+19+20 = **8 cards** debajo de escena + hero + pestañas. Invitado que vuelve a confirmar: 1+8+19 = 3 cards, pero la 8 tiene 12 bloques internos antes del botón.

## 2. Contrato de textos: lo que buscan los guiones (no se cambia sin avisar)

Fuentes: `docs/usuarios-sinteticos.md` «Rediseño de la noche…» (sinteticos, 02:15), `docs/guion-demo.md` §9 (apertura, `wip/apertura` `258242e`), `grep -rn` en `tests/e2e`, `tests/rincones`, `tests/verificacion-altas`.

**Se quedan exactos (texto o nombre accesible):**
- Pestañas (role tab): «Plan», «Mi respuesta», «Historial», «Simulación». `h1` = título del plan; `header` con nombre y rol; `main`.
- Estado del servidor visible en `main` (`estado(T, …)` de qa): «Reuniendo interés», «Esperando compromisos», «Grupo confirmado», «En revisión». Y la región `role=status aria-live` con `siguiente_accion.texto` (rincones `anunciado`: «Te toca confirmar la versión 1», «Ya confirmaste la versión 1», «Grupo confirmado», «En revisión»).
- Botones: «Buscar opción compatible» / «Volver a buscar opción» · «Confirmar versión N» (regex `^Confirmar versión`) · «Buscar alternativa» / «Volver a buscar alternativa» · «Rearmar con lo nuevo» (regex `/Rearmar/`) · «Así no puedo, pero sigo» (friccion) · «Cancelar propuesta» → «Sí, cancelar» · «Ir a Mi respuesta» (convencer-uno) · «Calendario» (rincones R59, descarga) · enlace «WhatsApp» / «Avisar al grupo» / «Recordar a quien falta» · «Abrir propuesta».
- Textos: «Ya confirmaste la versión N» · «Opción vigente · Versión N» (qa `jurado-navegador` L215; sinteticos `asi-no-puedo` L155) · «Versión N (en revisión, no confirmada)» (qa L324) · «Sin opción compatible» · «Nadie confirmó todavía» y «Estas confirmaciones no pasan a la versión N» (qa `recorrido-dos-sesiones` L230, tras reparar) · regex `/Confirmaron \d+ \(mínimo \d+\)/` en texto y aria-label (#56) · «Con condiciones» visible SOLO para quien organiza (qa L182-184, E7.2) · «Una persona se retiró» · «Opiniones hasta» / «Mientras tanto no se rearma» · «¡Se juntan!» · «Ficha del plan» como `details` que contenga «Cómo viene cada plan: pueden N · la prefieren N» (rincones f15 R521) · «Faltan por confirmar» · «no puede faltar» · «nadie queda comprometido» (AvisoParaMi) · «Primero marca tu disponibilidad» y «Ya hay N personas con condiciones» (los manda el servidor en `siguiente_accion.texto`: se muestran tal cual).
- Selectores: `a.plan-vivo` (tarjeta «Tu plan», sinteticos y S2), `details` (ficha), `fieldset` (S5, no es mío).

**Se pueden ir (nadie los busca, y sinteticos los marca como ruido):** «Franja A · hora de Santiago (America/Santiago) · publicada …» (H10), «Zona horaria» en la ficha, «Tu confirmación vale solo para la versión N…» bajo el botón (lo dice el aviso), «Las condiciones de cada persona son privadas y no se muestran» (una vez alcanza, en la ficha), los títulos «Buscar opción», «Alternativa», «Respuestas del grupo», «Historial resumido», «Cambios en el grupo», «Borrador», «¿Ya no va?», las notas largas de `BuscarOpcion`, la leyenda del `Progreso` duplicada con `cifras`, «Ver historial completo» (puede ser la pestaña).

## 3. Lo que propongo para S4 (a validar en el brief de frontend)

Objetivo: que quien abre el plan vea en la primera pantalla **qué salió, cuántos van y qué le toca**, y que el jurado vea **cómo se llegó**. Un botón primario por pantalla (regla del sistema).

**A. Escena, más baja**: volver · título · una línea «{estado_etiqueta} · versión N» (sigue siendo la región `status`) · `siguiente_accion.texto`. El `Cruce` se queda como escena viva pero chico (≈160 px) y en 1280 px a la derecha de la hoja; si diseno prefiere sacarlo, su información (quién confirmó / le interesa / sin confirmar) pasa a chips en «Quiénes». `Pasos` (Respuestas·Opción·Confirmar·Encuentro) sale del hero y se vuelve la espina de «Cómo se armó».

**B. Resultado** (primera card, la única con botón primario):
- Fecha grande: hoja de calendario + «Sábado 31 oct · 20:00 a 23:00» + etiqueta del plan si la hay (E15). Sin «Franja A · hora de Santiago (America/Santiago) · publicada…».
- Una fila de datos del servidor: «Confirmaron 2 de 4» (o «5 (mínimo 4)») con la barra · «No puede faltar: Vale ✓ / pendiente» · (org) «Faltan por confirmar: 2» · «Cupo reservado…» solo si aplica.
- **Acción primaria por rol y estado**: borrador/org «Abrir propuesta» · reuniendo/sin responder «Responder en un toque» · reuniendo/org con `buscar_opcion` «Buscar opción compatible» (si el servidor aún dice `reunir_condiciones`, secundario) · esperando/puede aceptar «Confirmar versión N» · en revisión/org «Buscar alternativa» · confirmado/confirmé «Calendario» (Agregar al calendario) · esperando/org con ≥2 «así no puedo» «Rearmar con lo nuevo».
- Secundarias en una fila: «Así no puedo, pero sigo» (friccion) · «Buscar el lugar en el mapa» · (org) «Avisar al grupo».
- Cuando no puede confirmar: una sola línea (`razonNoAceptar`): «Ya confirmaste la versión N» / «No formas parte de las personas que pueden aceptar esta versión» / «El plazo de aceptación ya cerró».
- Sin opción todavía: la misma card dice «Todavía sin opción» con «N respondieron · mínimo M» (org) o «Respondiste ✓» / «Falta tu respuesta», y el aviso «Sin opción compatible» si lo hubo.
- En revisión: «Versión N (en revisión, no confirmada)» + «Una baja dejó el plan sin cumplir» + la acción.
- Confirmado: «¡Se juntan!» arriba de la fecha, confeti una vez, Calendario primario, Avisar al grupo secundario.

**C. Cómo se armó** (nuevo; el pedido de Nico «mostrar bien cómo sale el output»): tres pasos con datos reales del servidor, en una tira vertical (320/375) u horizontal (1280):
1. «Respondieron en privado» — org: «Con condiciones: N · mínimo M» (mantiene el texto E7.2); los demás: «Cada uno marcó Sí o No por franja; nadie ve lo de los demás».
2. «El servidor cruzó las respuestas» — «eligió la franja más temprana» o «la que pueden más personas» (`p.regla`, pedido de sinteticos 02:25 «Ganó porque la pueden más»), «contando a quien no puede faltar (Vale)»; sin opción: «no hubo franja posible; el mínimo no se toca».
3. «Versión N» — «empieza sin confirmaciones; cada confirmación vale solo para esta versión». Debajo, la línea de versiones: «v1 · sáb 31 oct 20:00 · ya no vale (una persona se retiró / algunos no podían así) → **v2 · dom 1 nov 13:00 · vigente**», con «Nadie confirmó todavía: empieza de cero» y «Estas confirmaciones no pasan a la versión 2» cuando corresponde. Funde `CambioDeVersion`, `OpcionAnterior`, `Bajas`, `HistorialResumido` y los chips «Me interesa» (que pasan a «Quiénes»). Enlace a la pestaña Historial.

**D. Quiénes**: «Quién confirmó esta versión» como chips con estado (Confirmó / Le interesa / Sin confirmar), una sola vez (hoy están el Cruce y la lista). Nada por persona que no sea público (confirmó, le interesa, se retiró sin nombre).

**E. Ficha del plan** (`details`, plegada con opción, abierta sin): Organiza · No puede faltar · Franjas candidatas (con etiqueta E15) · Si sirven las dos · Cómo viene cada plan (org) · Cupos · Cierre de aceptación con la cuenta regresiva informativa · una sola nota «Las condiciones de cada persona son privadas». Sin «Zona horaria».

**F. Mover el plan** (solo org, al final): «Avisar al grupo» (`RecordarFaltan` con el motivo que toque), y «Cancelar propuesta» en zona de peligro con confirmación inline. «Rearmar con lo nuevo» va arriba, en Resultado, cuando el servidor lo habilita.

**G. Avisos personales** (`AvisoParaMi`, `InvitacionAgente`, versión nueva, red): una línea con ícono bajo la escena, no una card más; el título del aviso se mantiene (los busca sinteticos: «Hoy conviene recordar», «Gracias por…», «nadie queda comprometido»).

Toques resultantes: invitado que vuelve: portada «Tu plan» → «Confirmar versión N» = 2 (igual que hoy, pero el botón queda arriba del pliegue a 320 px). Organizador: 1 toque por paso (Buscar opción / Buscar alternativa / Rearmar), siempre en la misma posición.

## 4. Preguntas para el brief (frontend)
1. ¿El `Cruce` se queda (chico) o se va? Si se queda, ¿puedo tocar `components/Cruce.tsx` (no está en mi lista; solo lo usa `Propuesta.tsx`) o le pido a frontend un prop de tamaño?
2. ¿Sigue la estructura escena oscura + hoja clara, o S4 pasa a una sola superficie? (Afecta `.vista/.escena/.hoja`, que son globales.)
3. Los 4 tamaños: cuál es el de la fecha grande del resultado (¿título?) y cuál el de las notas.
4. API de `Card`, `Encabezado de sección`, `Chip` y `Aviso` nuevos en `ui.tsx`: nombres de props y clases, para no inventar.
5. 1280 px: ¿dos columnas (escena/quiénes a la izquierda fija, resultado + cómo se armó a la derecha) o una columna centrada de ~640 px?
6. ¿El sello de versión («v2») va como chip del sistema?

## 5. Cómo voy a entregar
- Capturas de HOY (antes del rediseño) de cada estado a 320/375/1280 en `docs/rediseno/capturas/s4/antes/`, para comparar; las del rediseño en `docs/rediseno/capturas/s4/`.
- Estilos solo en `src/estilo/seccion-s4.css`. Pantallas: `Propuesta.tsx`, `PlanTab.tsx` (se parte en `plan/*.tsx` dentro de `componentes-nuevos/` o se deja en `screens/`, según prefiera frontend), `PlanVivo.tsx` (tarjeta de la lista: misma jerarquía «fecha · confirmaron N de M · te toca»; mantiene la clase `plan-vivo` que buscan los guiones), `Orbita.tsx` solo si S1 lo pide (es decorativa de la portada).
- Capturas sin base: `src/componentes-nuevos/prueba/estados-s4.ts` (fixtures ficticios por estado y rol, `d405f9f`) + una galería que renderiza la pantalla real con esos datos; Playwright a 320, 375 y 1280 → `docs/rediseno/capturas/s4/`. Más una corrida real (Parte A, 9 pasos) contra la base cuando haya turno.
- Pruebas: `tsc`, `npx vitest run src $(ls tests/*.test.ts)`, `node --test` de mis piezas puras, `npm run build`. Guiones: si cambio un texto del contrato (§2) lo acepto en ambos o aviso con la línea a qa-noche / rincones / sinteticos / apertura.
