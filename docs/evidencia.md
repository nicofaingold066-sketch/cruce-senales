# Evidencia de CRUXE

Qué se probó, cuándo, sobre qué versión y quién lo corrió. Lo que no se probó está al final y no se da por bueno. "(IA)" indica que lo corrió una sesión de asistente de IA del equipo.

**En una línea:** el recorrido completo (condiciones privadas → plan con confirmaciones → baja → "En revisión" → alternativa desde cero) pasa por API, en el navegador y en producción con dos sesiones. No se probó la IA con su clave real ni dos teléfonos físicos.

Las pruebas de backend, de verificación A1–A5 y de punta a punta por API corren contra la base real de Supabase con datos ficticios. Las de la función del agente y de red controlada corren sin base ni red.

**Actualizado el 24/10:** las filas del viernes de abajo ya no son el `main` publicado. El sábado se rediseñó la app (plan sin pestañas, portada nueva, demo Makana) y los guiones se adaptaron ([`tests/e2e/nav.mjs`](../tests/e2e/nav.mjs)): hoy el recorrido de dos sesiones cuenta 27 comprobaciones y la red controlada 10 (cifras en la sección del sábado, al final). La línea «No se probó la IA con su clave real» quedó corta: hubo una llamada real el viernes (primera fila) y una verificación manual el sábado 11:29, nunca pruebas en cantidad. La última vez que el recorrido de dos sesiones corrió contra producción fue el humo de las 04:56 (`ab9de9f`, 27/27).

## Corte del viernes 23 oct 2026 (hora de Santiago, del reloj)

| Qué | Versión | Resultado | Quién | Detalle |
|---|---|---|---|---|
| Agente con el modelo real (Claude Haiku 5.5 vía Vercel AI Gateway, función v8) | `fd89382` | `eleccion_fuente` y `explicacion_fuente` = "modelo"; texto válido (sin nombres ni datos de nadie) | coordinador (IA) | 16:50:59, una llamada sobre un demo propio con sol simulado. Límite de costo: una llamada por persona cada 10 s y 30 por minuto; sin clave o si falla, regla y texto fijo |
| Recorrido completo con dos sesiones, guion versionado (`tests/e2e/recorrido-dos-sesiones.mjs`) | `9b62a2d` (main publicado) | 19/19 en producción y 19/19 en la versión compilada local | coordinador (IA) | Producción 16:01:48–16:02:14; local 16:00:51–16:01:17. Chrome sin ventana a 375 px, tres sesiones (Tomi, Luna y Pepe), sin clave de IA: lista que aparece sola, conteos solo para quien organiza, v1 → baja → En revisión → v2 que empieza de cero → confirmada, "5 confirmaron (mínimo 4)", navegador compartido, sin desborde ni errores en consola. Requiere Playwright y Chrome de la máquina |
| Recorrido completo en producción con dos sesiones (Tomi en ventana normal, Luna en privada) | `7747bf6` | 16/16 (dos comprobaciones medían menos de lo que decían; ver la nota en §8.2 y la fila de arriba, que las mide bien) | agente-ia (IA) | 15:36:03–15:36:44, Chrome sin ventana a 375 px, sin clave de IA: v1 sábado → baja de Caro → En revisión → v2 domingo sin heredar; Luna no ve conteos ni Simulación; navegador compartido ([agente-ia.md §8.2](agente-ia.md)) |
| Agente en producción a 375 px | `3313790` | perfil sin quien pide ni presupuesto; con sol 3 opciones, con lluvia 1 | agente-ia (IA) | 15:19–15:20 ([agente-ia.md §8.1](agente-ia.md)) |
| Punta a punta por API (`tests/e2e`) | `7747bf6` | 12/12 | coordinador (IA) | 15:31: 3 del recorrido canónico, 4 variantes del jurado y 5 de privacidad del agente. Los informes enlazados son corridas anteriores de Codex ([recorrido](../tests/e2e/evidencia-recorrido-canonico.md), [privacidad y red](../tests/e2e/evidencia-privacidad-red.md)) |
| Backend (`tests/backend`) | 0028 aplicada | 53/53 | backend (IA) | 15:10–15:13, en serie |
| Verificación A1–A5 (`tests/verificacion-altas`) | 0028 aplicada | a1–a3 sin fallas; a5 12/12; a4 23/23 | coordinador (IA) y backend (IA) | a1–a3 a las 15:16. a4: la primera corrida completa dio 21/23 (dos cortes por bloqueo y por tiempo con la base cargada por varias sesiones); esos dos pasan solos y la segunda corrida completa dio 23/23 (15:27–15:30) |
| Función del agente sin red ni modelo | `7747bf6` | 17/17 | coordinador (IA) | `node --test "supabase/functions/agente/*.test.ts"` |
| Red controlada en el navegador | `1b8a3d8` | 9/9 | coordinador (IA) | 16:06, `node tests/e2e/red-controlada.mjs` (requiere Playwright y Chrome de la máquina, no están en package.json): N1–N8 y F1, que desde #53 es la regresión positiva del arreglo de la primera lista ([informe con el defecto original](revision-codex-6-privacidad-red.md)) |
| Revisión de privacidad de toda la app | `deeea83` | sin exposición directa; 8 hallazgos: 4 inferencias corregidas en la enmienda 7, 2 declaradas como límite y 2 endurecimientos menores aplicados | agente-ia (IA) | [informe](agente-revision-privacidad.md), [enmienda 7](contrato-enmienda-7.md) |

## No probado
- El pronóstico real de Open-Meteo en la app publicada (las pruebas usan el clima simulado del demo).
- Dos teléfonos físicos con el link público.
- Que el cierre sea la causa del asado que no se hizo, o que CRUXE haga que un grupo real se junte: las hipótesis de [problema.md](problema.md) no se validaron con personas y no se midió ningún efecto en el hábito.
- Encuentros, reservas o pagos reales: no existen en CRUXE.

*Actualizado el 24/10: lo que sigue sin probarse del sábado (llamadas al modelo en cantidad, la demo Makana completa en producción) está al final, en la sección del sábado, punto 6.*

## Sábado 24 de octubre (rediseño y cierre)

Horas de America/Santiago, del reloj. «TABLERO» es `TABLERO.md` de la rama `coordinacion` (se cita con la hora del aviso); «ficha» es `agentes/<nombre>.md` de esa rama. Escrito el sábado 24 a las 11:51. Lo que no tiene fuente anotada no se afirma.

### 1. Qué se publicó y cuándo

Cada fila es una publicación de `main` a producción (Vercel).

| Hora | `main` | Qué trajo |
|---|---|---|
| 04:54 | `ab9de9f` | El rediseño completo: S1–S7, plan sin pestañas, computadora, 0056 y guiones adaptados (TABLERO 04:56) |
| 05:07 | `6756ab7` | Arreglos de la pasada botón por botón: «reuniendo respuestas» en fila y chip, barras a 13/18 px, rótulo demo (TABLERO 05:08) |
| 05:24 | `c119e93` | Insignia DEMO de la fila «Simulación», solo CSS (TABLERO 05:26) |
| 07:55 | `7f47a88` | «Responder en un toque» se leía blanco sobre blanco; contraste 18,7 en claro y 16,6 en oscuro (TABLERO 07:57) |
| 09:44 | `74b5cbe` | Intro de primera visita, guía de tres pasos (en «tú»), GRU, actividad del grupo, guiones con `sinIntro` (TABLERO 09:45) |
| 09:55 | `1f7826b` | Arreglos del agente de la auditoría: chips de fecha, sin «de Tomi», sin ATC/Mendoza, tamaño en el prompt, prohibidas acotadas (TABLERO 09:55) |
| 10:31 | sin hash en el aviso | Barra sin desborde, «Sin hora de fin», sesión renovada ante 401 (TABLERO 11:04) |
| 11:03 | `018215d` | Demo Makana en la portada, participación visible, pruebas E16; congelamiento de UI (TABLERO 11:04) |
| 11:28 | `233bb2e` | Makana con Bastián y seis amigos, cargada desde el inicio, y arrastre de GRU (TABLERO 11:29) |

Migraciones del día (encabezados): `0057_coherencia_borrador` (aplicada 10:06, enmienda 16), `20261024124500_demo_makana` o 0058 (aplicada 10:33; reversa en `supabase/revertir/0058_demo_makana_revertir.sql`), `0059` (nombres nuevos de la demo), `0060` (la demo nace cargada: gustos, invitaciones, caso canónico, «Cargar las respuestas»), `0061` (alias de los nombres viejos, 11:29) y `0062` (11:40: Kai pasa a «solo domingo» para que el relato del pitch sea exacto). El último aviso del TABLERO al escribir esto es el de las 11:29.

### 2. Cómo se verificó cada publicación

Antes de publicar, el coordinador corrió una tanda en serie con turno de base. Contra la base real: `recorrido-dos-sesiones.mjs` (Tomi y Luna), `jurado-navegador.mjs`, `friccion-flujo.mjs`, `proposito.mjs` (por RPC) y `proposito-pantalla.mjs` (por pantalla). Sin base y con la red interceptada: `red-controlada.mjs` y `sesiones-recuperacion.mjs`. Todos en `tests/e2e/`.
- **04:54, 05:07, 05:24, 07:55 y 09:44:** los siete en verde con las mismas cifras: recorrido 27/27, jurado 4/4, red 10/10, recuperación 12/12, fricción 19/19, propósito 25/25, pantalla de propósito 10/10 (TABLERO 04:56, 05:08, 05:26, 07:57, 09:45). En la primera, además, tsc 0, puras 96/96, el jurado con 26 comprobaciones (E13 y E15 incluidas) y el humo de dos sesiones **en producción: 27/27 a las 04:56**. En las de 05:24 y 07:55 el aviso dice «humo de producción corriendo» y en la de 05:07 «pasadas en producción» por sección; ninguna anota un resultado de dos sesiones contra producción.
- **09:55:** «tanda toda en verde», sin cifras en el aviso (TABLERO 09:55). **10:31:** las corridas de las 10:26 sobre `08aa6e2`, todas en verde, sin cifras en el aviso (TABLERO 11:04).
- **11:03:** tsc 0, puras 125/125, red 10/10, recuperación **11/12** (el aviso no dice cuál falló), la demo Makana recorrida a mano en el build (demo, grupo, nuevo plan, respuesta, sin errores de consola) y la suite de backend 130/130 en serie, 10:41–10:49, con 0058 aplicada (ficha del coordinador). Recorrido y jurado **no se corrieron** (TABLERO 11:04).
- **11:28:** tsc 0, puras 125/125, fricción 19/19, propósito 25/25, pantalla 10/10, red 10/10, recuperación **11/12**, la demo nueva recorrida a mano y una llamada real al agente. Recorrido y jurado tampoco (TABLERO 11:29).
- **Guiones:** `nav.mjs` traduce «Plan», «Mi respuesta», «Historial» y «Simulación» a lo que hay sin pestañas, responde con un toque (`responderRapido`) y, si no encuentra algo, falla diciendo qué buscó. `sinIntro(browser)` marca la intro y la guía como vistas (`cruxe:entrada-vista`, `cruxe:guia-vista:v1`): estos guiones **no ejercitan la intro ni la guía**; las cubrió el QA de gente (bloques f y h).

### 3. QA de gente y rendimiento (producción, 08:00–08:50)

Sobre `main` `7f47a88` (bloques a–d), `9364cd8` (regresión con la intro) y `9a15539` (guía). Guiones en `tests/qa-gente/`; todo ficticio, sin agente de IA ni `service_role` ([informe](qa/gente-y-rendimiento.md)).
- **152 verificaciones, 150 PASS y 2 FAIL** (H1, sin tope de grupo, y H4, voseo en la guía; ficha de qa-gente). Ningún 500, ningún `57014`, ningún sobrecupo ni confirmación doble en las carreras.
- **30 personas a la vez:** 30 de 30 entraron y respondieron en 11,6–14,2 s, y «31 de 31 respondieron» cuadra. Con 30 confirmaciones simultáneas y máximo 20: 19 aceptadas y 11 rechazadas con `cupo_completo:reservado_imprescindible`; nunca hubo sobrecupo.
- **Latencia de servidor** (cliente en Santiago): lecturas p50 100–200 ms y p95 170–300 ms; escrituras p50 130–250 ms y p95 210–510 ms; con 30 a la vez, p50 130–230 ms. Pantallas con 20 y 30 integrantes a 320/375/768/1280 px: ≈ 0,95–1,1 s y 0 px de desborde horizontal.
- **Carreras:** 5 teléfonos por el mismo lugar o el mismo nombre dieron 1 `ok` y 4 rechazos limpios; el doble toque en «Confirmar» o «Buscar opción» dispara una sola llamada; la misma persona desde dos aparatos cuenta una vez.
- **Hallazgos (7):** medios H1 (sin tope de integrantes) y H2 (sin «Cancelar» en esperando confirmaciones ni en «¡Se juntan!»); bajos H3 (texto repetido en el rechazo por cupo), H4 (voseo), H5 (cola de latencia), H6 (dos `404` que no se repitieron) y H7 (la intro retiene unos 3,5 s a quien llega por invitación). El resumen del informe dice «5 hallazgos» y la lista trae 7.
- **Estado:** según el TABLERO 09:45, H3, H4 y H7 se corrigieron en la publicación de las 09:44 (rechazo por cupo sin repetir, guía en «tú», intro solo en portada, entrar y crear). Esos arreglos no tienen una corrida nueva del QA en el repo; la vuelta 2 estaba corriendo a las 11:48 (ficha de qa-gente). H1 y H5 siguen abiertos, H2 se dejó por diseño y H6 no se reprodujo.

### 4. Auditoría del agente (GRU), desde las 09:15

Solo lectura de código, una consulta al catálogo y siete grupos ficticios contra la función real dentro de un bloque que se deshace (09:38). **Cero llamadas al modelo.** Por pedido de Nico quedaron fuera privacidad, costos y seguridad ([auditoría](auditoria-agente.md)).
- **Semáforo:** creatividad rojo; fuentes de datos reales rojo (solo el clima es real); coherencia amarillo (era rojo: 4 de 7 casos daban una propuesta incoherente, como pádel para 12 o brunch de máximo 6 para 20); trato parejo verde con matices; que funcione amarillo.
- **Arreglado hoy:** (a) coherencia del borrador, migración 0057 aplicada a las 10:06: los 7 casos dan resultados coherentes (`tests/backend/coherencia-borrador.test.ts`, 7/7). El costo, decidido por Nico, es que cae la protección E7.1 de los grupos chicos ([enmienda 16](contrato-enmienda-16.md)); la corrida completa limpia que esa enmienda dice que faltaba la dio después la suite de backend, 130/130 (10:41–10:49). (b) Agente `f475683`, publicado a las 09:55 con la función v14 desplegada a las 10:02 (TABLERO 10:04): chips de fecha dentro de los 16 días (M4), sin «de Tomi» (M2), sin ATC/Mendoza (M5; `src/agente/canchas.ts`), regla de tamaño en el prompt (M1) y prohibidas acotadas con el código de la regla en el log (A2). El informe solo marca M1 y M3 como arreglados; lo demás consta en el TABLERO y no hubo auditoría de seguimiento.
- **Sigue abierto:** A1, el catálogo es fijo (17 lugares inventados, todos «(Simulación)»; el modelo elige entre 3 y el plan sale igual para el mismo grupo y clima). A3, no hay textos reales del modelo guardados para juzgar su creatividad (la auditoría propone 5 llamadas reales con permiso de Nico). M6 (el clima casi no pesa) y M7 (el camino «Revisar antes de invitar» escribe con menos datos). A1 y A3 son decisión de Nico (TABLERO 09:32).

### 5. Límites conocidos que siguen
- **El grupo no tiene tope de integrantes** (H1): el «máximo 20» es del plan, no del grupo; una persona 21 entra y ve «Cupos disponibles: 0». La lista de «Crear grupo» tiene su propio tope de 12.
- **«Cancelar» solo en «Reuniendo» y «En revisión», por diseño:** con versión publicada, quien organiza solo puede «Retirarme de este plan» (H2).
- **Latencia con 30 confirmaciones simultáneas:** `get_proposal_state` llegó a 3,7–4,3 s y la pantalla puede tardar 2–4 s en reflejar el cambio (H5), sin errores. El grupo más grande probado fue de 31 personas; no se probó Safari/iOS ni una red 3G real.
- **«Dos sesiones» y «jurado» ya no cubren la portada:** entran por la demo «Los del finde» y, desde las 11:03, la portada ofrece la demo Makana. La última regresión completa de los dos fue sobre `08aa6e2` a las 10:26 (TABLERO 11:04). A las 11:44 una tanda con ambos figuraba «corriendo» (ficha del coordinador), sin resultado anotado al escribir esto.
- **Migraciones 0059–0062 sin suite de backend posterior** que conste en avisos o fichas (la 130/130 es de las 10:41–10:49). Solo reemplazan `seed_demo_makana` y `caso_canonico`, las funciones de la demo. Las demos ya sembradas conservan sus nombres hasta abrirlas desde una sesión nueva o con «Reiniciar demo».
- **La intro volvió:** la decisión 7 del rediseño era quitar la entrada animada ([decisiones](rediseno/decisiones.md)), pero la intro de primera visita entró a las 08:05 (`9364cd8`). Los guiones la saltan.

### 6. Qué NO se probó hoy
- **Llamadas reales al modelo en cantidad.** Solo una verificación manual: una llamada real en una demo cargada que dio una propuesta coherente («Museo y feria del centro» con pronóstico de lluvia; TABLERO 11:29), además de la del viernes 16:50 (primera fila de la tabla). No se midió cuántas veces el agente cae al texto fijo ni se guardaron textos del modelo (A3).
- **La demo Makana completa en producción, solo a mano.** Se recorrió demo, grupo, nuevo plan y respuesta (TABLERO 11:04). Buscar, confirmar v1, la baja de Joaco y la v2 del domingo no tienen un guion contra producción con el caso final (0062, 11:40); los valida Juan en el ensayo ([demo en vivo](pitch/demo-en-vivo.md)). Lo más cercano es un ensayo local con Auth simulado y PostgreSQL local sobre una versión anterior del caso, que su autora aclara que no acredita despliegue (ficha codex-caso-demo), y `tests/e2e/demo-makana-local.mjs`, que corre con Auth y RPC ficticios, sin base ni IA.
- **El QA de gente sobre lo publicado después de las 08:50** (`018215d`, `233bb2e`): la vuelta 2 no tenía resultado a las 11:48.
- Siguen sin probarse el pronóstico real de Open-Meteo en la app publicada, dos teléfonos físicos y cualquier efecto en el hábito de un grupo real (lista de arriba).
