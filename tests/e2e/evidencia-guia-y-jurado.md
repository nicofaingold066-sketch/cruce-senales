# Guía Codex: mejoras #1 y #17, evidencia real

23 oct 2026, America/Santiago. Guía adoptada: `coordinacion/prompts/codex.md`, leída tras pull de coordinación. Código de integración: `b7ac38c13802aeedf8e9a704edfccd3a597c98f6`, fusionado en `codex/revisiones` como `e017ac5992720ad5b774188534dbecaf6e3165c3`. Incluye singular 0013 y contrato del agente; no se certifica el despliegue de 0014+ por tener documentación.

## Qué cambió y resultados

- **#1:** el comprobador del recorrido ahora también prohíbe el campo `preferencias` en todo sobre compartido. Mismo archivo corrido dos veces seguidas sin cambios entre ejecuciones: **3/3 en 8.80 s y 3/3 en 12.97 s**, 63 RPC verificadas por ejecución. La disponibilidad propia y el estado de condiciones del llamador son excepciones explícitas, no fugas.
- **#10/#16:** informes UI y README ya entregados en 3718b6b/b45c226. Conservan la base y límites declarados; no se presentan como revisión de código nuevo del agente.
- **#17:** `jurado-variantes.test.ts` convierte las 3 variantes del documento en **4 pruebas reales**, porque la variante del anfitrión tiene dos momentos distintos. **4/4 en 11.04 s**, 53 RPC comprobadas.
- TypeScript: `tsc -b --noEmit`, salida vacía y código 0. Build Vite: código 0, salida real al final.

| Variante | Observado en RPC real |
|---|---|
| 1: mínimo 5 | B/v1; con cuatro aceptaciones sigue esperando; con Tomi último y cinco aceptaciones confirma. |
| 2a: anfitrión no puede antes de evaluar | Sin opción, sin versión, mínimo 4/máximo 6 y Tomi imprescindible intactos. |
| 2b: anfitrión no puede después de baja | Sin alternativa, En revisión, v1 conservada; sin relajar mínimo ni quitar a Tomi. |
| 3: máximo 4, cinco elegibles | B/v1, tres lugares para otros; Luna/Mati/Fede aceptan, Sofi recibe cupo_completo/reservado_imprescindible; Tomi entra último y confirma 4/4. |

## Reproducción

Con Node 24, dependencias existentes y `.env` local público de Supabase:

```sh
NODE_USE_ENV_PROXY=1 npx --no-install vitest run tests/e2e/recorrido-canonico.test.ts --reporter=verbose
NODE_USE_ENV_PROXY=1 npx --no-install vitest run tests/e2e/recorrido-canonico.test.ts --reporter=verbose
NODE_USE_ENV_PROXY=1 npx --no-install vitest run tests/e2e/jurado-variantes.test.ts --reporter=verbose
```

En esta máquina se invocó el binario Node ya disponible `/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` con `node_modules/vitest/vitest.mjs` (sin npx ni instalación); tipos con `node_modules/typescript/bin/tsc -b --noEmit` y build con `node_modules/vite/bin/vite.js build`.

Durante la preparación de #17 hubo una ejecución 3/4: el comprobador rechazó las condiciones de un simulado devueltas exclusivamente al organizador que acababa de editarlas (`simulate_save_conditions`, excepción documentada). Se corrigió ESA excepción del test; no fue una fuga nueva del servidor. La ejecución final 4/4 corresponde al archivo corregido.

## Límites y limpieza

Pruebas de integración por API, **no navegador ni dos teléfonos físicos**. No se comprobó el texto visual del cupo reservado de la variante 3. No se editó `docs/jurado-variantes.md` porque pertenece a otro dueño; el coordinador puede actualizar sus marcas de verificación citando esta evidencia API.

Cada archivo reutiliza solo dos sesiones por ejecución y crea el demo de la identidad nueva que lo ejecuta. Nunca toca el demo humano. Al terminar cancela propuestas propias y cierra sesión; quedan usuarios anónimos y espacios ficticios de prueba. Se mantienen fechas exactas del caso y el cierre 29 oct 2026: estas pruebas deben fallar después de ese plazo, no desplazarlo silenciosamente.

La ausencia de claves privadas y de IDs Auth conocidos en los sobres comprobados no demuestra ausencia total de inferencia ni certifica las nuevas RPC de preferencias. La función de IA/modelo no se invocó. Sin dependencias nuevas ni cambios propios en src/, supabase/, tests/backend/ o configuración.

## Salida real: Canónico 1

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
Dos sesiones independientes; demo propio reiniciado; Luna reclama asiento limpio.

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones
PASÓ: A/v1 confirmada en ambas sesiones; baja; B/v2 cero heredadas; v1 rechazada; v2 confirmada.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones 3484ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada
PASÓ: sin opción inicial; mínimo 4 y máximo 6; sin publicar versión ni motivo privado.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada 1239ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación
PASÓ: sin alternativa tras baja; En revisión; v1 conservada; mínimo intacto.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación 2572ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
RPC verificadas: 63 (cada respuesta se comprobó por privacidad y contrato).


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:55:15
   Duration  8.80s (tests 100%)

```

## Salida real: Canónico 2

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
Dos sesiones independientes; demo propio reiniciado; Luna reclama asiento limpio.

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones
PASÓ: A/v1 confirmada en ambas sesiones; baja; B/v2 cero heredadas; v1 rechazada; v2 confirmada.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones 6058ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada
PASÓ: sin opción inicial; mínimo 4 y máximo 6; sin publicar versión ni motivo privado.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada 1645ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación
PASÓ: sin alternativa tras baja; En revisión; v1 conservada; mínimo intacto.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación 2909ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
RPC verificadas: 63 (cada respuesta se comprobó por privacidad y contrato).


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:55:43
   Duration  12.97s (tests 100%)

```

## Salida real: Variantes finales

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias
Jurado: dos identidades nuevas; demo propio; Luna real, otros cuatro simulados.

stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V1: mínimo 5 elige B y necesita cinco aceptaciones, incluido Tomi
PASÓ V1: mínimo 5 → B/v1; espera con cuatro; confirma al quinto con Tomi.

 ✓ tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V1: mínimo 5 elige B y necesita cinco aceptaciones, incluido Tomi 2464ms
stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V2a: Tomi no puede A/B antes de evaluar → sin opción sin alterar reglas
PASÓ V2a: anfitrión no disponible → sin opción; mínimo y anfitrión intactos.

 ✓ tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V2a: Tomi no puede A/B antes de evaluar → sin opción sin alterar reglas 906ms
stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V2b: Tomi no puede tras baja de Caro → sin alternativa, conserva En revisión
PASÓ V2b: tras baja no hay alternativa; sigue En revisión/v1 sin motivo privado.

 ✓ tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V2b: Tomi no puede tras baja de Caro → sin alternativa, conserva En revisión 3764ms
stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V3: máximo 4 reserva lugar al anfitrión aunque haya cinco elegibles
PASÓ V3: cinco elegibles/máximo cuatro; Sofi rechazada por reserva; Tomi entra último.

 ✓ tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias > V3: máximo 4 reserva lugar al anfitrión aunque haya cinco elegibles 1884ms
stdout | tests/e2e/jurado-variantes.test.ts > variantes del jurado · datos ficticios · dos sesiones propias
Jurado: 53 RPC comprobadas por contrato y privacidad.


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  12:55:43
   Duration  11.04s (tests 100%)

```

## Salida real: Build

```text
vite v8.3.5 building client environment for production...
transforming...
✓ 76 modules transformed.
rendering chunks...
computing gzip size...
dist/assets/cruxe-icono-CBHcJJty.svg    0.50 kB │ gzip:   0.32 kB
dist/index.html                         0.52 kB │ gzip:   0.32 kB
dist/assets/index-B0EbvqzB.css         13.30 kB │ gzip:   3.61 kB
dist/assets/index-DFkVqGI8.js         505.49 kB │ gzip: 141.97 kB

✓ built in 86ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
