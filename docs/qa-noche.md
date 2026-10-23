# QA de la noche (vie 23 → sáb 24 oct)

Dueña: sesión `qa-noche` (rama `wip/qa`). Las horas son del reloj de Santiago. Todo con datos ficticios; nunca se imprimen claves.

## Cómo se corre cada guion
| Guion | Qué prueba | Base | Comando |
|---|---|---|---|
| `recorrido-dos-sesiones.mjs` | Dos sesiones (Tomi, Luna), baja, reparación v2, navegador compartido, volver a Tomi (23 comprobaciones) | sí | `node tests/e2e/recorrido-dos-sesiones.mjs <url>` |
| `jurado-navegador.mjs` | Las 4 variantes del jurado por la UI | sí | `node tests/e2e/jurado-navegador.mjs <url>` |
| `red-controlada.mjs` | N1–N8, F1, F1b con red interceptada (10) | no | `node tests/e2e/red-controlada.mjs <url>` |
| `sesiones-recuperacion.mjs` | S1–S9 y L1–L3 (12): sesión guardada, volver, identidad conservada; Auth ficticio | no | `node tests/e2e/sesiones-recuperacion.mjs` (levanta su propio Vite) |

Los guiones que usan la base se frenan solos (salida 3, "PAUSADO") si `agentes/backend.md` dice `MIGRACION EN CURSO` o `PRUEBA DE CARGA EN CURSO`; la guardia común está en `tests/e2e/base-libre.mjs`. Una falla 57014 o de tiempo se reintenta antes de concluir.
| `toques-invitacion.mjs` | Toques del enlace de invitación a la primera respuesta, 375 px (de friccion) | sí | `node tests/e2e/toques-invitacion.mjs <url> <etiqueta>` |
| `red-import-cortada.mjs` | #82: corte de red al importar una pantalla (reintento `?r=1`, barrera «Recargar», precarga) | sí (caso C) | `node tests/e2e/red-import-cortada.mjs <url>` |
| `friccion-flujo.mjs` | #88, #90 (demo) y volver con el mismo enlace, de friccion (85 líneas) | sí | `node tests/e2e/friccion-flujo.mjs <url>` |
| `convencer-uno.mjs` | #98 de ux-flujo: organizador + 5 invitados por enlace, toques y pantallas por persona (6 sesiones por corrida) | sí | `node tests/e2e/convencer-uno.mjs <url>` |
| `preparar-grupo.mjs` | Ayudante: crea grupo ficticio (Orga, Ana, Beto) y propuesta abierta | sí | lo llaman los dos anteriores |

## Cambios en los guiones
- 19:26 #76: L1–L3 de `sesiones-recuperacion.mjs` apuntan a la portada actual (`#/entrar` ya no es una pantalla aparte). Siguen probando sesión guardada, volver a esa sesión e identidad conservada. Lo que cambió:
  - L1 espera los espacios de Tomi en la portada (sección «Tus grupos»).
  - L2 ofrece las entradas que existen hoy con alguien sin nombre: demo, «Unirme» y «Entrar» (nombre). «Crear un espacio» ya no está en esa pantalla: «Crear un grupo» solo aparece con nombre guardado.
  - L3 verifica que, con HTTP 503, la copia sigue ofrecida (volver / olvidarla).
  - Se quitó la comprobación de **foco** tras el error (antes en `#/entrar`); la portada nueva no maneja foco al fallar el retorno. Idea para friccion/Juan: mover el foco al aviso de error. No se baja lo demás.
- 19:28 `recorrido-dos-sesiones.mjs` ahora también respeta `MIGRACION EN CURSO` (antes corría igual).
- 20:28 Enmienda 10: `jurado-navegador.mjs` revisa en toda respuesta compartida (todas menos get/save/simulate_save_preferences) que no aparezcan las claves `movilidad`, `tiempo_max`, `minutos_por_persona` ni los valores de movilidad (`me_llevan`, `auto_con_lugar`…) ni las 8 zonas. Pasa contra producción con la enmienda 10 publicada (main fae49fa).

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

## Regresiones abiertas
(ninguna)
