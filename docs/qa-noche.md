# QA de la noche (vie 23 → sáb 24 oct)

Dueña: sesión `qa-noche` (rama `wip/qa`). Las horas son del reloj de Santiago. Todo con datos ficticios; nunca se imprimen claves.

## Cómo se corre cada guion
| Guion | Qué prueba | Base | Comando |
|---|---|---|---|
| `recorrido-dos-sesiones.mjs` | Dos sesiones (Tomi, Luna), baja, reparación v2, navegador compartido, volver a Tomi (23 comprobaciones) | sí | `node tests/e2e/recorrido-dos-sesiones.mjs <url>` |
| `jurado-navegador.mjs` | Las 4 variantes del jurado por la UI | sí | `node tests/e2e/jurado-navegador.mjs <url>` |
| `red-controlada.mjs` | N1–N8, F1, F1b con red interceptada (10) | no | `node tests/e2e/red-controlada.mjs <url>` |
| `sesiones-recuperacion.mjs` | S1–S9 y L1–L3 (12): sesión guardada, volver, identidad conservada; Auth ficticio | no | `node tests/e2e/sesiones-recuperacion.mjs` (levanta su propio Vite) |

Los guiones que usan la base se frenan solos (salida 3, "PAUSADO") si `agentes/backend.md` dice `MIGRACION EN CURSO` o `PRUEBA DE CARGA EN CURSO`; la guardia común está en `tests/e2e/base-libre.mjs`. Una falla 57014 o de tiempo se reintenta antes de concluir. Desde las 21:16 (aviso del coordinador: Nico probando producción; parones de ~7 s con pruebas en paralelo) toda corrida contra la base va de a UNA en todo el equipo, con la marca «CORRIENDO PRUEBA (hh:mm)» en la ficha: para eso está `turno-base.sh`.
| `toques-invitacion.mjs` | Toques del enlace de invitación a la primera respuesta, 375 px (de friccion) | sí | `node tests/e2e/toques-invitacion.mjs <url> <etiqueta>` |
| `red-import-cortada.mjs` | #82: corte de red al importar una pantalla (reintento `?r=1`, barrera «Recargar», precarga) | sí (caso C) | `node tests/e2e/red-import-cortada.mjs <url>` |
| `friccion-flujo.mjs` | #88, #90 (demo) y volver con el mismo enlace, de friccion (85 líneas) | sí | `node tests/e2e/friccion-flujo.mjs <url>` |
| `convencer-uno.mjs` | #98 de ux-flujo: organizador + 5 invitados por enlace, toques y pantallas por persona (6 sesiones por corrida) | sí | `node tests/e2e/convencer-uno.mjs <url>` |
| `guardia-palabras.mjs` | P-A de psico (§8.7) + regla D2 (género y pareja de una persona no se piden ni se muestran): ninguna palabra de la lista (vegetariano, celíaco, «pareja de», novio/a, hombres, mujeres, chicos, chicas, «otra vez en casa»…) en copia visible de `src/` ni `supabase/functions/agente/` (sin pruebas, comentarios, catálogo ni listas de prohibidas) | no | `node tests/e2e/guardia-palabras.mjs [raíz de otra copia]` (sale 1 si hay hallazgos) |
| `plan-b-un-aparato.mjs` | Guion de la demo §8 (5), de apertura: una sola sesión (Tomi) recorre el caso con Simulación; informa si el caso carga a Luna, v1 sábado con 4, quiénes aceptan, baja de Caro, v2 domingo y segundos totales | sí | `node tests/e2e/plan-b-un-aparato.mjs <url>` |
| `demo-reinicio-luna.mjs` | Guion de la demo §8 (4), de apertura: Luna reclamada sigue reclamada tras «Reiniciar demo» (sesión nueva no puede elegirla; la misma sesión sigue en un toque y responde) | sí | `node tests/e2e/demo-reinicio-luna.mjs <url>` |
| `turno-base.sh` | Envoltorio de la regla 21:16: espera a que ninguna ficha diga MIGRACION / PRUEBA DE CARGA / CORRIENDO PRUEBA, marca «CORRIENDO PRUEBA (hh:mm)» en mi ficha, corre UNA prueba y quita la marca | — | `tests/e2e/turno-base.sh "<qué>" <comando…>` |
| `proposito.mjs` | Enmienda 14 (propósito del grupo): create_space con propósito, propuesta fuera de propósito rechazada con el mensaje exacto y sin crear nada, pádel aceptada, ajuste 2 (un ajeno no se entera del propósito), demo libre, «Me gustaría» por familia (0049) e invitación «para jugar fútbol». Salida 4 = 0048 no aplicada | sí | `tests/e2e/turno-base.sh "propósito" node tests/e2e/proposito.mjs <url>` |
| `proposito-pantalla.mjs` | Enmienda 14 por la pantalla: selector «¿Para qué es este grupo?» (por defecto Libre), crear con «Fútbol» manda `p_proposito`, atajos de actividad solo de deporte (sin Asado/Cena/Café), la propuesta viaja con una actividad de deporte y el servidor la acepta, y un grupo libre ofrece 17 atajos de todas las familias | sí | `node tests/e2e/proposito-pantalla.mjs <url>` |
| `preparar-grupo.mjs` | Ayudante: crea grupo ficticio (Orga, Ana, Beto) y propuesta abierta | sí | lo llaman los dos anteriores |

## Cambios en los guiones
- 19:26 #76: L1–L3 de `sesiones-recuperacion.mjs` apuntan a la portada actual (`#/entrar` ya no es una pantalla aparte). Siguen probando sesión guardada, volver a esa sesión e identidad conservada. Lo que cambió:
  - L1 espera los espacios de Tomi en la portada (sección «Tus grupos»).
  - L2 ofrece las entradas que existen hoy con alguien sin nombre: demo, «Unirme» y «Entrar» (nombre). «Crear un espacio» ya no está en esa pantalla: «Crear un grupo» solo aparece con nombre guardado.
  - L3 verifica que, con HTTP 503, la copia sigue ofrecida (volver / olvidarla).
  - Se quitó la comprobación de **foco** tras el error (antes en `#/entrar`); la portada nueva no maneja foco al fallar el retorno. Idea para friccion/Juan: mover el foco al aviso de error. No se baja lo demás.
- 19:28 `recorrido-dos-sesiones.mjs` ahora también respeta `MIGRACION EN CURSO` (antes corría igual).
- 20:28 Enmienda 10: `jurado-navegador.mjs` revisa en toda respuesta compartida (todas menos get/save/simulate_save_preferences) que no aparezcan las claves `movilidad`, `tiempo_max`, `minutos_por_persona` ni los valores de movilidad (`me_llevan`, `auto_con_lugar`…) ni las 8 zonas. Pasa contra producción con la enmienda 10 publicada (main fae49fa).
- 21:08 **Enmienda 13** (pedido del coordinador 20:51), listo antes de que backend la aplique. Todo se activa solo cuando el servidor trae `mi_situacion.mi_opinion` / `opiniones_totales`; hasta entonces los guiones dicen "E13 pendiente" y no cuentan.
  - `recorrido-canonico.test.ts` (vitest, RPC): dos pruebas nuevas. (1) Luna opina `asi_no_puedo` sin bajarse (idempotente por intento, puede volver a guardar condiciones, no cuenta como baja ni aceptación); el organizador ve `opiniones_totales` null con 1 y `{asi_no_puedo: 2}` con 2 (Tomi es la segunda opinión), sin nombres; Luna nunca lo ve; versión no vigente → `opcion_desactualizada/version_no_vigente`; `propose_repair` desde `esperando_compromisos` → v2 con cero aceptaciones y cero opiniones, usando la disponibilidad nueva; opinar después de aceptar → `no_autorizado/ya_acepto`. (2) Rearmar sin opiniones se rechaza; v2 y v3 nacen limpias; la cuarta → `sin_alternativa/tope_versiones` (si con dos franjas no hay alternativa antes, se anota). Además, en toda baja (`bajarCaro`) ninguna respuesta compartida —ni la del organizador— trae nombre ni `habia_aceptado`. La suite se salta sola con `MIGRACION EN CURSO`.
  - `jurado-navegador.mjs`: en cada sobre con `propuesta`, bajas y eventos de baja sin nombre ni `habia_aceptado`; `opiniones_totales` solo en respuestas de Tomi, ≥ 2 y sin nombres. En V2b, el Historial de Luna y de Tomi no nombra a quien se retiró (el texto "Una persona se bajó" es de la interfaz: se avisa, no se exige).
  - `recorrido-dos-sesiones.mjs`: mismas comprobaciones de red más el Historial de Luna tras la baja de Caro.
  - `guardia-palabras.mjs`: regla **D2** (género y pareja de una persona no se piden ni se muestran): género/sexo, hombre/mujer, masculino/femenino, casado, estado civil, "tu/su pareja", "¿vienes con pareja?", `autocomplete="sex"`… «Con parejas» / «solo el grupo» como regla de la juntada se permite. Control positivo: detecta las frases prohibidas y deja pasar las permitidas.

## Registro de corridas
| Hora | Qué | Contra | Resultado |
|---|---|---|---|
| 19:23 | sesiones-recuperacion (antes del cambio) | Vite local | 9 PASS, 3 FAIL (L1–L3: `#/entrar`) |
| 19:26 | sesiones-recuperacion | Vite local, `wip/qa` = `95def89`+cambio | 12/12 |
| 19:27 | recorrido-dos-sesiones | producción | 23/23 |
| 19:28 | red-controlada | producción | 10/10 |
| 19:27 | jurado-navegador | producción | no corrió: backend ya había avisado `MIGRACION EN CURSO` (19:26) |
| 19:31 | sesiones-recuperacion con el código de `wip/friccion` `efede20` | Vite local (copia descartable) | 12/12; typecheck ok |
| 19:32 | red-controlada con `wip/friccion` `efede20` (build + preview) | localhost | 10/10 |
| 19:31 | sesiones-recuperacion con `wip/agente-ia` `d5d913e` | Vite local | 12/12; typecheck ok |
| — | recorrido y jurado con friccion / agente-ia / apertura / ux | base | pendiente: backend con MIGRACION EN CURSO (desde 19:26) |
| 19:38 | red-controlada con `wip/friccion` cac56d8 (#90), `wip/ux` c444bea, `wip/agente-ia` 27bc499 (build + preview) | localhost | 10/10 en las tres; builds ok |
| 19:38 | guiones de friccion versionados (`toques-invitacion`, `red-import-cortada`, `preparar-grupo`) | — | solo `node --check`; sin correr (esperan fin de MIGRACION EN CURSO) |
| 19:52 | recorrido-dos-sesiones | producción, base con 0035–0038 | 23/23 |
| 19:59 | jurado-navegador | producción | 4/4 (23 comprobaciones, privacidad de sobres sin hallazgos); se había frenado 19:53 por MIGRACION 0039 |
| 20:02 | `wip/friccion` 05e148d: recorrido 23/23, jurado 4/4, toques-invitacion = 4 toques, friccion-flujo 19/19, red-import-cortada 4/4 (tras corregir el patrón de hash con guion) | localhost, base | verde |
| 20:07 | `wip/ux` 715ec27: typecheck, build, recorrido 23/23, jurado 4/4, red 10/10 | localhost, base | verde |
| 20:09 | `wip/agente-ia` ddcce58: typecheck, build, recorrido 23/23; jurado cortado a mitad por una MIGRACION EN CURSO nueva de backend (no es regresión) | localhost, base | jurado y red se reintentan al salir la migración |
| 20:14 | `wip/agente-ia` ddcce58: jurado 4/4 (privacidad de sobres sin hallazgos) y red 10/10 (reintento) | localhost, base | verde |
| 20:28 | main `fae49fa` publicado (enmienda 10/12, fricción): recorrido 23/23, jurado 4/4 con la revisión nueva de privacidad E10 | producción | verde |
| 20:35 | `convencer-uno.mjs` versionado | — | sin correr (backend con MIGRACION EN CURSO 0041 desde 20:32) |
| 20:42 | guardia-palabras sobre `wip/qa`+fundamentos d9176a9: 57 archivos, 0 hallazgos; control con un archivo de prueba detecta 2 | estático | verde |
| 20:42 | `wip/friccion` 05e148d: jurado V2a cayó una vez por timeout de 15 s en `waitForResponse` (justo al salir la migración 0041); había pasado 4/4 a las 20:02 | localhost, base | falla aislada, no reproducida |
| 20:45 | `wip/ux` e1794e1: recorrido 23/23, jurado 4/4, friccion-flujo 19/19, red 10/10 | localhost, base | verde |
| 20:48 | `wip/friccion` 6bddd27 (merge de fundamentos): recorrido 23/23, jurado 4/4, friccion-flujo 19/19, red-import 4/4, red 10/10 | localhost, base | verde |
| 20:55 | humo de producción (main 3ace04e) | producción | frenado: backend con MIGRACION EN CURSO (enmienda 13: 0042–0044) desde 20:59; corre solo al liberarse |
| 21:08 | guardia-palabras con D2 sobre fundamentos 3ace04e | estático | 57 archivos, 0 hallazgos (§8.7: 0, D2: 0); control positivo detecta |
| 21:08 | sintaxis y tipos de los guiones nuevos (`node --check`, `tsc -p tsconfig.node.json`) | — | ok; E13 sin correr contra la base hasta que backend aplique 0042–0044 |
| 21:12 | `wip/friccion` fc66c0b (E13 (a) «Así no puedo, pero sigo» y D3 «¿Quién viene?»): typecheck, build, red 10/10, sesiones-recuperación 12/12, guardia-palabras 0/0 (61 archivos). El selector «¿Quién viene?» es regla del grupo (Sin definir / Solo el grupo / Con parejas / Abierta), sin datos de personas: cumple D2 | localhost, sin base | verde; recorrido, jurado y friccion-flujo esperan la base |
| 21:12 | `wip/ux` 603678e: typecheck, build, red 10/10, guardia-palabras 0/0 | localhost, sin base | verde; recorrido y jurado esperan la base |
| 21:19 | guiones nuevos para apertura (`plan-b-un-aparato`, `demo-reinicio-luna`) y `turno-base.sh` | — | solo sintaxis; corren de a uno contra producción cuando la base se libere (migración E13 desde 20:59) |
| 21:22 | set sin base: `wip/friccion` 8793df5 (auditoría de tono), `wip/ux` 3013850, `wip/apertura` 5e44ef5: typecheck, build, red 10/10 y guardia-palabras 0/0 en las tres | localhost | verde |
| 21:22 | `sesiones-recuperacion` sobre friccion 8793df5: la primera corrida (en lote, en segundo plano) terminó con un error de Node sin salida del guion; repetida sola a las 21:24: 12/12 | Vite local | falla transitoria, no reproducida |
| 21:22 | backend confirma: `propose_repair` desde `esperando_compromisos` sin ningún `asi_no_puedo` → `opcion_desactualizada/estado_no_admite`; la prueba E13 lo exige. Base libre desde las 21:22 (0042–0045 aplicadas) | — | — |
| 21:26 | recorrido canónico (vitest) con E13 contra la base, en turno con marca CORRIENDO PRUEBA | base | corriendo |
| 21:37 | recorrido canónico (vitest) con E13 contra la base, base 0042–0045 | base | 5/5. Dos primeros intentos fallaron por forma que yo supuse mal: `opiniones_totales` llega como `{ asi_no_puedo: n|null }`, no `null`; guion corregido |
| 21:37 | hallazgo para backend (sin cambiar nada): con 2 opiniones, el organizador que NO aceptó esa versión ve `siguiente_accion = te_toca_aceptar` y no el texto «Algunos no pueden así: puedes rearmar con lo nuevo.» (0043 evalúa `puede.aceptar` antes). El botón sí está (`puede.proponer_reparacion = true`). El contrato dice que ese texto es del organizador «en ese caso» | base | consulta abierta, no regresión |
| 21:55 | humo de producción (dos sesiones), repetición con capturas: **26/26** (E13 activo: el historial de Luna dice «Una persona se retiró»). El primero, 21:42, había caído a los 20 s en el paso de Luna (Mi respuesta) con la base cargada por otras corridas en paralelo (parones de ~7 s avisados 21:16); no se reprodujo | producción | verde |
| 21:55 | `proposito.mjs` sonda: 0048 aún no aplicada → salida 4 (`PGRST202` en `create_space` con `p_proposito`) | base | pendiente de backend |
| 22:00 | backend 21:45: `te_toca_aceptar` antes de «puedes rearmar» es lo buscado; con 0047 `opiniones_totales` cuenta solo las opiniones de los demás. La prueba E13 acepta las dos formas (2 o null) y lo informa | — | adaptado |
| 22:31 | `proposito.mjs` completo con 0048 + 0049: **25/25**, sin pendientes (el mismo intento con otra actividad es `entrada_incompleta/intento_reutilizado`; un primer uso fallido no queda guardado) | base | verde |
| 22:40–22:47 | `tests/verificacion-altas` adaptados a la baja sin nombre (cedidos por el coordinador): a2 15/15 (la baja es una sola, sin `miembro_id` ni nombre en `get_proposal_state` ni `list_proposals`); a4 «aceptar y retirarse el MISMO miembro» y «retiro de OTRO miembro» 2/2. `a4CadenaEventos` ahora ignora para la cadena de estados las bajas anónimas (`estado_previo` y `estado_nuevo` null) y no compara el estado actual si el último evento es una de ellas | base | verde; el resto de a4 son ráfagas y no se corrió por la regla 21:16 |
| 22:55 | humo de producción (main bd9dc36): dos sesiones **26/26** y jurado **4/4** (26 comprobaciones; E13 «baja sin nombre, totales solo al organizador» detectada y comprobada; 178 RPC sin hallazgos de privacidad) | producción | verde |
| 23:35–23:45 | set completo sobre `wip/agente-ia` 130ea9b (bucle con herramientas) y `wip/ux` 43e3327: guardia 0/0, red 10/10, dos sesiones 26/26, jurado 4/4, friccion-flujo 19/19, red-import 4/4, recuperación 12/12 | localhost, base | verde en las dos |
| 23:52 | `proposito-pantalla.mjs` sobre `wip/fundamentos` ad2d63e: **10/10** (la rama de ux aún no tiene el selector; lo conectó el coordinador en fundamentos) | localhost, base | verde |
| 23:54 | humo de producción (main d978cc1 + parche 2): dos sesiones **26/26**, `proposito.mjs` **25/25**, `proposito-pantalla.mjs` **10/10** | producción | verde |

## Regresiones abiertas
(ninguna)
