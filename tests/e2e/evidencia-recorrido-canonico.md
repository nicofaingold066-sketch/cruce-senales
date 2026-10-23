# E2E canónico: evidencia real de Codex

Fecha: 23 oct 2026, America/Santiago. Base de código: `4477919e05fb89584a59b39bc732cbbcc4e5db16` (incorporada en `codex/revisiones`, HEAD inicial `7eb5965`). Proyecto: `tjkfdnvzsikncjbskufm`. Solo clave publishable, nunca credenciales administrativas.

## Alcance y reproducción

`recorrido-canonico.test.ts` usa supabase-js y Vitest contra RPC reales. Cada ejecución abre dos identidades anónimas distintas (Tomi y Luna), crea el demo propio de Tomi y reclama Luna antes de cargar condiciones. Los demás son simulados. Cubre A/v1, 4 aceptaciones, baja de Caro, B/v2 con 0 heredadas, rechazo de v1 y 4 aceptaciones nuevas; sin opción inicial; sin alternativa después de la baja. Comprueba códigos cerrados de próxima acción, contrato 2 y campos privados en cada sobre compartido. Solo se admite el estado de condiciones del propio llamador; disponibilidad propia exclusivamente en save/get propios.

Comando portable con Node 24 y dependencias ya presentes:

```sh
NODE_USE_ENV_PROXY=1 npx --no-install vitest run tests/e2e/recorrido-canonico.test.ts --reporter=verbose
```

En esta máquina Node no estaba en PATH. Se usó el runtime existente, sin instalar dependencias:

```sh
NODE_USE_ENV_PROXY=1 /Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/e2e/recorrido-canonico.test.ts --reporter=verbose
```

`.env` se copió localmente desde el worktree de integración; queda ignorado. `node_modules` apunta a las dependencias existentes del mismo proyecto. No se cambiaron configuración ni lockfile.

## Resultado

Dos ejecuciones consecutivas del MISMO archivo, sin cambios entre ellas: **3/3 + 3/3**. También pasó `tsc -b --noEmit` (código 0). No se ejecutó de nuevo toda la suite backend.

Durante la preparación hubo una ejecución fallida por una aserción demasiado restrictiva del test: prohibía también `mi_situacion.condiciones`, estado propio permitido por el contrato. Se corrigió el test antes de las dos ejecuciones registradas. No era una falla de privacidad del backend.

## Límites

Es integración de extremo a extremo por API, no automatización de navegador ni prueba de dos teléfonos. No certifica despliegue ni layout. Las pruebas usan fechas exactas del caso (cierre 29 oct 2026, 20:00 Santiago): después del cierre deben fallar; no se desplaza la fecha silenciosamente. No cubre todos los intercalados de carreras o plazos. La inspección de privacidad detecta campos y valores de identidad conocidos, no ausencia total de inferencia ni fugas semánticas arbitrarias.

Al terminar cancela las propuestas creadas y cierra las sesiones. Quedan usuarios anónimos y demos ficticios propios de pruebas en el proyecto; no se usaron privilegios administrativos para borrarlos. Nunca reinicia la demo de una persona ajena.

## Salida real, ejecución 1

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
Dos sesiones independientes; demo propio reiniciado; Luna reclama asiento limpio.

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones
PASÓ: A/v1 confirmada en ambas sesiones; baja; B/v2 cero heredadas; v1 rechazada; v2 confirmada.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones 3223ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada
PASÓ: sin opción inicial; mínimo 4 y máximo 6; sin publicar versión ni motivo privado.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada 1214ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación
PASÓ: sin alternativa tras baja; En revisión; v1 conservada; mínimo intacto.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación 2284ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
RPC verificadas: 63 (cada respuesta se comprobó por privacidad y contrato).


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:44:09
   Duration  8.37s (tests 100%)

```

## Salida real, ejecución 2

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
Dos sesiones independientes; demo propio reiniciado; Luna reclama asiento limpio.

stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones
PASÓ: A/v1 confirmada en ambas sesiones; baja; B/v2 cero heredadas; v1 rechazada; v2 confirmada.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > A/v1 → 4 aceptaciones → baja → B/v2 con cero heredadas → 4 nuevas aceptaciones 31285ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada
PASÓ: sin opción inicial; mínimo 4 y máximo 6; sin publicar versión ni motivo privado.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin opción inicial: imprescindible no disponible, mínimo intacto, sin versión inventada 9247ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación
PASÓ: sin alternativa tras baja; En revisión; v1 conservada; mínimo intacto.

 ✓ tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3 > sin alternativa tras la baja: sigue En revisión y conserva v1, sin fingir reparación 19411ms
stdout | tests/e2e/recorrido-canonico.test.ts > recorrido canónico real · dos sesiones · contrato 2/enmienda 3
RPC verificadas: 63 (cada respuesta se comprobó por privacidad y contrato).


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:44:31
   Duration  73.50s (tests 100%)

```
