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

## #34 — red controlada en navegador

Comando: `node tests/e2e/red-controlada.mjs`. Node 24.19.0, Chrome de /Applications/Google Chrome.app, Playwright ya disponible en el runtime de Codex. No se instaló ninguna dependencia ni navegador. Si Playwright no está en node_modules, se puede indicar su directorio con CRUXE_PLAYWRIGHT_DIR; CRUXE_CHROME permite indicar el ejecutable de Chrome. El runner levanta Vite local en 127.0.0.1:4189 y lo cierra al terminar. No ocupa ni reutiliza la sesión del navegador humano.

El banco HTML/JSX importa hooks, API, Espacio y SimulacionTab originales. No replica los filtros ni los tiempos límite del producto. Playwright intercepta todas las salidas externas y solo devuelve sobres ficticios de contrato 2 para RPC; cualquier otro host/endpoint se bloquea y hace fallar la prueba. No crea sesiones ni hace llamadas reales a Supabase. No necesita esperar la base: sus migraciones no influyen en esta corrida.

**Resultado: ocho regresiones correctas y UN defecto reproducido (F1).** El PASS de F1 comprueba que el defecto está presente: NO significa que la carga inicial funcione bien. Cuando lo arregle el dueño de src, reemplazar esa reproducción por una aserción positiva de que la primera lista aparece sin otro refresco.

Cobertura: N1 lectura colgada/tope real de 10 s/recuperación; N2 doble clic, respuesta perdida tras registrar y reintento con el mismo intento (el servidor simulado registra una sola vez; no certifica idempotencia de Postgres); N3 escritura colgada/tope/resultado incierto/botón liberado/identificador conservado; N4 respuesta anterior a una mutación; N5 rev_vista y respuesta corta, más respuesta completa con mismo state_rev; N6 corte antes del envío y borrador conservado; N7 reinicio y lista demorada de otra generación; N8 panel de simulación demorado contra revisión del padre; F1 primera carga del espacio con dos respuestas válidas en distinto orden.

Primera preparación de N1: 7 PASS y 1 FAIL al intentar observar el error de carga inicial durante un sondeo que se recuperaba. Se cambió el banco para medir directamente el timeout de lectura del API original y verificar luego la recuperación. La corrida intermedia dio 8 PASS; la final agrega F1. No se presenta la preparación fallida como un defecto adicional del producto.

Salida literal final:

```text
PASS N1 lectura colgada: aborta a 10 s y se recupera (10174 ms)
PASS N2 doble clic + respuesta perdida: un intento, un registro, reintento seguro (155 ms)
PASS N3 escritura colgada: libera botón a 10 s y conserva el intento (10149 ms)
PASS N4 lectura vieja no pisa la mutación nueva (156 ms)
PASS N5 sondeo liviano y cambio privado con igual state_rev (121 ms)
PASS N6 sin conexión antes del envío: cero escrituras y borrador conservado (120 ms)
PASS N7 reinicio: lista vieja no resucita propuestas de otra generación (552 ms)
PASS N8 simulación: panel demorado no pisa la revisión nueva del padre (385 ms)
PASS F1 REPRODUCIDO: primera lista válida se descarta hasta el próximo refresco (913 ms)
#34: 9 PASS, 0 FAIL. Incluye 8 regresiones y una reproducción de defecto F1 (PASS significa defecto reproducido). Red externa interceptada; cero llamadas reales a Supabase.
```

Typecheck: `node node_modules/typescript/bin/tsc -b --noEmit`, exit 0.
Build: `node node_modules/vite/bin/vite.js build`, exit 0. Salida:

```text
vite v8.3.5 building client environment for production...
transforming...
✓ 80 modules transformed.
rendering chunks...
computing gzip size...
dist/assets/cruxe-icono-CBHcJJty.svg      0.50 kB │ gzip:   0.32 kB
dist/index.html                           0.52 kB │ gzip:   0.32 kB
dist/assets/AgentePanel-CpOt3HdQ.css      0.34 kB │ gzip:   0.23 kB
dist/assets/index-DEFAHNOA.css           18.96 kB │ gzip:   4.62 kB
dist/assets/format-PxgFnt7e.js            2.81 kB │ gzip:   1.20 kB
dist/assets/api-DArDw98K.js               5.65 kB │ gzip:   2.49 kB
dist/assets/NuevaPropuesta-ZidIorjM.js    8.74 kB │ gzip:   2.94 kB
dist/assets/Espacio-BxViOoXg.js           9.25 kB │ gzip:   3.33 kB
dist/assets/AgentePanel-uK2N5xFe.js      14.12 kB │ gzip:   4.86 kB
dist/assets/Propuesta-CaYsfHa4.js        37.85 kB │ gzip:  10.19 kB
dist/assets/index-CZmeIjrl.js           462.55 kB │ gzip: 132.55 kB

✓ built in 77ms
```

## Límites del corte

- #29 es evidencia con la base anterior a 0024, código 92477ef. Se observó después en coordinación la aplicación de 0024 y 0025; no se certifica aquí toda la enmienda 7 ni migraciones 0026/0027.
- La comprobación de MIGRACION EN CURSO es una consulta previa, no un bloqueo distribuido: depende de que backend mantenga la ficha. Ante marca o fallo al consultarla, la suite real se detiene. No se volvió a ejecutar contra la base mientras backend avanzaba en E7.
- #34 verifica el código del banco en Chrome con respuestas y fallas controladas; no es una prueba de carga ni del despliegue Vercel ni de dos teléfonos físicos.
- El handler real se ejecuta sin clave y sin facturación; no prueba la IA ni su endpoint desplegado, sus secretos o CORS.
- No se corrió una suite global contra la base; se evitan carga ajena y carreras con migraciones.
