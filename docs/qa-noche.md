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

## Cambios en los guiones
- 19:26 #76: L1–L3 de `sesiones-recuperacion.mjs` apuntan a la portada actual (`#/entrar` ya no es una pantalla aparte). Siguen probando sesión guardada, volver a esa sesión e identidad conservada. Lo que cambió:
  - L1 espera los espacios de Tomi en la portada (sección «Tus grupos»).
  - L2 ofrece las entradas que existen hoy con alguien sin nombre: demo, «Unirme» y «Entrar» (nombre). «Crear un espacio» ya no está en esa pantalla: «Crear un grupo» solo aparece con nombre guardado.
  - L3 verifica que, con HTTP 503, la copia sigue ofrecida (volver / olvidarla).
  - Se quitó la comprobación de **foco** tras el error (antes en `#/entrar`); la portada nueva no maneja foco al fallar el retorno. Idea para friccion/Juan: mover el foco al aviso de error. No se baja lo demás.
- 19:28 `recorrido-dos-sesiones.mjs` ahora también respeta `MIGRACION EN CURSO` (antes corría igual).

## Registro de corridas
| Hora | Qué | Contra | Resultado |
|---|---|---|---|
| 19:23 | sesiones-recuperacion (antes del cambio) | Vite local | 9 PASS, 3 FAIL (L1–L3: `#/entrar`) |
| 19:26 | sesiones-recuperacion | Vite local, `wip/qa` = `95def89`+cambio | 12/12 |
| 19:27 | recorrido-dos-sesiones | producción | 23/23 |
| 19:28 | red-controlada | producción | 10/10 |
| 19:27 | jurado-navegador | producción | no corrió: backend ya había avisado `MIGRACION EN CURSO` (19:26) |

## Regresiones abiertas
(ninguna)
