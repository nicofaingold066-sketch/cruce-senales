# Evidencia #29 y #34 · Codex

23 oct 2026, Santiago. Base de código `92477ef` (integración del coordinador, incorporada por fast-forward). Cambios propios solo en tests/e2e y docs/revision-codex-*.

## #29 — privacidad

Comando: `NODE_USE_ENV_PROXY=1 node node_modules/vitest/vitest.mjs run tests/e2e/privacidad-agente.test.ts --reporter=verbose` (Node 24.19.0 del runtime de Codex).

Cinco sesiones anónimas propias, dos espacios nuevos t-priv29*, sin propuestas ni datos reales. Antes de preparar y de cada caso real se consulta la ficha de backend en GitHub; se aborta si hay MIGRACION EN CURSO o si no se puede verificarla. Se comprueban singleton ausente y segundo voto visible, ausencia de nombres/ids/preferencias individuales incluso en errores, y permisos de organizador. El scanner se prueba con cuatro fugas deliberadas para evitar un falso verde por un filtro inoperante.

El handler es el index.ts real, sin editar: Node elimina tipos y se inyectan imports/runtime Deno. Las RPC y JWT son reales, el clima usa Open-Meteo; el entorno inyectado nunca ofrece una clave de Anthropic y un constructor trampa cuenta cualquier intento de modelo. No certifica la función desplegada: no tiene una opción de no facturar si alguien agrega una clave. Tampoco certifica todas las inferencias aceptadas o pendientes en la enmienda 7.

Primer intento de preparación: falló porque Vite 8 ya no incluye esbuild para transformWithEsbuild. No se instalaron paquetes: se cambió al eliminador de tipos nativo de Node. Se crearon cinco sesiones en esa preparación fallida y cinco en la corrida final; cada corrida cierra sus sesiones locales. Quedan los espacios y usuarios ficticios propios; no se borran datos.

Salida literal de la corrida final:

```text

 RUN  v5.0.5 /Users/macair/cruse/codex-work

 ✓ tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente > el scanner detecta singleton, identidad y preferencias, incluso anidados 1ms
 ✓ tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente > RPC real: singleton ausente, agregado de dos visible y sin datos individuales 241ms
 ✓ tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente > handler real, JWT real y sin clave: texto fijo, sin singleton ni preferencias individuales 1474ms
 ✓ tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente > el segundo voto hace visible Fútbol en ambos caminos; el filtro no borra todo el perfil 1157ms
 ✓ tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente > miembro común y ajeno reciben errores sin nombres ni preferencias por RPC y handler 1028ms
stdout | tests/e2e/privacidad-agente.test.ts > #29 · regresión de privacidad del agente
#29: 4 RPC de borrador; 0 intentos de modelo; 5 sesiones propias


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  14:43:22
   Duration  8.18s (tests 100%)

```

Typecheck `tsc -b --noEmit`: exit 0.
