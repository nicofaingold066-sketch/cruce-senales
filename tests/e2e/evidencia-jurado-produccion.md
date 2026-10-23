# Jurado en producción · evidencia Codex

23 oct 2026, America/Santiago. URL: https://cruce-senales.vercel.app.

## Estado

**Objetivo cumplido: sí.** Aviso al coordinador recibido y entrega integrada en `wip/fundamentos`. Variantes en producción: **4/4, 23 comprobaciones**, en la primera pasada y en la corrida aislada posterior. La evidencia final aislada es la de **16:37:21–16:38:10**, con turno adelantado expresamente por el coordinador (aviso 16:35).

## Versión identificada

El coordinador confirmó en TABLERO.md (16:30) que producción corresponde a `main` `7b0335b`, y que el código de aplicación coincide con el de la integración de `0e4ba7f` en `wip/fundamentos`. Integró la entrega #53/#17; los docs/tests pasarán a main en su siguiente lote. Codex no publicó ni modificó main.

La API de Vercel del conector no resolvió el alias (404); no se atribuye a esa API la identificación del commit. Se comprobó el artefacto servido: `/assets/index-DIGoIDy8.js` coincide **byte a byte** con el build local del código de `main` `7b0335b`, incorporado en `74c5b5a`. SHA256 de ambos: `a0582c58041ab664ad5037d475702423f97bb42eb773da0890839d863981dc1f`.

## Primera pasada (con solapamiento declarado)

Se inició a las 16:31:50 tras el aviso 16:30 y la ficha del backend libre. El nuevo aviso 16:31 fijó turnos (#61, luego #65, luego Codex) mientras el guion ya estaba en marcha; al leerlo se detectó que agente-ia tenía CORRIENDO PRUEBA para #61. La corrida terminó a las 16:32:59, canceló sus cuatro propuestas y no lanzó otra contra la base. El solapamiento quedó avisado en `agentes/codex.md` antes de esperar el turno correcto.

```text
[2026-10-23 16:31:50 Santiago] Jurado navegador: https://cruce-senales.vercel.app; 375 px; base 74c5b5a
[2026-10-23 16:31:53 Santiago] Demo propio creado por UI; Luna reclama su asiento. Se reutilizan las dos sesiones.
[2026-10-23 16:32:07 Santiago] PASS V1 mínimo 5: domingo, espera con cuatro y confirma con Tomi quinto (13754 ms)
[2026-10-23 16:32:17 Santiago] PASS V2a anfitrión no disponible: sin opción, conserva mínimo y privacidad (8459 ms)
[2026-10-23 16:32:32 Santiago] PASS V2b baja de Caro y anfitrión no disponible: sin alternativa, sigue En revisión/v1 (14038 ms)
[2026-10-23 16:32:57 Santiago] PASS V3 máximo 4: reserva al anfitrión, rechaza Sofi desde pantalla vieja (23950 ms)
[2026-10-23 16:32:59 Santiago] RPC observadas: 167; privacidad de sobres compartidos sin hallazgos; 2 rechazos esperados; 0 llamadas al modelo.
[2026-10-23 16:32:59 Santiago] #17 navegador: 4 PASS, 0 FAIL; 23 comprobaciones; 4/4 propuestas propias canceladas.

```

## Alcance del guion

`node tests/e2e/jurado-navegador.mjs https://cruce-senales.vercel.app`

Chrome a 375×812, dos contextos e identidades anónimas propias (Tomi/Luna), un demo propio y cuatro propuestas. Mutaciones mediante la interfaz publicada; el resto de personajes son Simulación rotulada. El caso del cupo usa una tercera pestaña con la misma identidad de Tomi y lecturas retenidas: Sofi pulsa un botón viejo, y el servidor real rechaza el cupo reservado. No hay peticiones manuales de escritura ni llamadas al agente o a modelos. Todas las propuestas se cancelan por la UI.

Se comprueban mínimo 5, falta de anfitrión antes de evaluar, falta de alternativa después de la baja de Caro y máximo 4 con reserva al anfitrión. Se escanean las propuestas compartidas y los conteos E7.2 por rol; no es una certificación total de privacidad ni de teléfonos físicos, lector de pantalla o IA.

## Corrida serial final

El coordinador adelantó el turno a 16:35–16:50 al confirmar que #65 había terminado (16:34:58). Codex publicó `CORRIENDO PRUEBA` en su ficha antes de empezar (`1444622`) y lo retiró al cerrar. Backend estaba preparando 0031 **sin aplicarla ni tocar la base**, por orden de esperar hasta las 16:55. El guion volvió a consultar la ficha antes de preparar cada variante y antes de cancelar.

Salida literal final, exit 0:

```text
[2026-10-23 16:37:21 Santiago] Jurado navegador: https://cruce-senales.vercel.app; 375 px; base 74c5b5a
[2026-10-23 16:37:25 Santiago] Demo propio creado por UI; Luna reclama su asiento. Se reutilizan las dos sesiones.
[2026-10-23 16:37:36 Santiago] PASS V1 mínimo 5: domingo, espera con cuatro y confirma con Tomi quinto (10166 ms)
[2026-10-23 16:37:44 Santiago] PASS V2a anfitrión no disponible: sin opción, conserva mínimo y privacidad (6595 ms)
[2026-10-23 16:37:54 Santiago] PASS V2b baja de Caro y anfitrión no disponible: sin alternativa, sigue En revisión/v1 (9480 ms)
[2026-10-23 16:38:08 Santiago] PASS V3 máximo 4: reserva al anfitrión, rechaza Sofi desde pantalla vieja (12793 ms)
[2026-10-23 16:38:09 Santiago] RPC observadas: 151; privacidad de sobres compartidos sin hallazgos; 2 rechazos esperados; 0 llamadas al modelo.
[2026-10-23 16:38:10 Santiago] #17 navegador: 4 PASS, 0 FAIL; 23 comprobaciones; 4/4 propuestas propias canceladas.

```

| Caso | Resultado en producción |
|---|---|
| Mínimo 5 | Franja B; con cuatro sigue esperando; Tomi quinto confirma en ambos contextos. |
| Tomi no puede A/B antes de evaluar | Sin opción compatible; no cambia el mínimo ni se muestra la causa privada. |
| Caro se baja y Tomi no puede A/B | Sin alternativa; ambas pantallas mantienen En revisión/v1, sin inventar v2. |
| Máximo 4 con cinco elegibles | Rechazo real de Sofi desde una pantalla vieja por reserva del anfitrión; Tomi confirma último, cuatro de cuatro y sin sobrecupo. |

No se hallaron campos privados prohibidos en las propuestas compartidas observadas; los dos conteos E7.2 son null para Luna. Solo los dos rechazos esperados, cero errores JS, cero llamadas al agente/modelo. El guard es una consulta previa, no un bloqueo distribuido.

Después de la corrida se volvieron a descargar HTML y bundle: el HTML siguió byte a byte igual (SHA256 `f048582578d82f2fd6a42044d5fb9e15d3fb03f74cfc1d30ff5d157dd50c1841`), con el mismo script `/assets/index-DIGoIDy8.js`, y el bundle mantuvo el SHA256 indicado arriba. No cambió la aplicación publicada entre las dos pasadas y la comprobación final.

En total, estas dos corridas crearon dos demos propios, cuatro identidades anónimas ficticias y ocho propuestas; las ocho se cancelaron por la UI. Se cerraron los contextos, sin guardar tokens. No se borraron usuarios ni demos ni se tocaron datos ajenos.

## Otras verificaciones y entrega

- Sobre la integración del código de `main` `7b0335b`: build exit 0 y `red-controlada.mjs` **10 PASS, 0 FAIL**, exit 0 (sin llamadas reales a la base). No se reescribió F1 ni el guion del jurado para esta prueba de producción.
- Archivo nuevo de este corte: `tests/e2e/evidencia-jurado-produccion.md`. Canal de aviso y cierre: solo `agentes/codex.md` en `coordinacion`. No se editaron archivos de otros agentes ni se desplegó desde Codex.
- Publicación de evidencia en `codex/revisiones`; integración de documentación pendiente del próximo lote del coordinador. La integración previa de #53/#17 ya fue confirmada por él.
- Límites: Chrome con viewport de teléfono, no dos teléfonos físicos. Backend con 0030 aplicada; no certifica 0031 ni cambios posteriores al intervalo medido, IA, lector de pantalla ni toda la privacidad del producto.
