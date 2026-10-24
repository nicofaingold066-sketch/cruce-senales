# Guiones de rincones: cómo correrlos (entrega al coordinador, 03:30 del sábado 24)

Todo ficticio. Cada guion crea su propio grupo (o su propio demo) con una sesión anónima por persona; nunca toca datos ajenos ni reinicia el demo de nadie.
Playwright y Chrome del sistema: `/Users/macair/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` y `/Applications/Google Chrome.app` (variables `CRUXE_PLAYWRIGHT_DIR`, `CRUXE_CHROME`). Sin dependencias nuevas.

## Una fase suelta (la forma de uso recomendada)
```
tests/rincones/correr-fase.sh <url> <fase> [fase ...]
RINCONES_CORRIDA=<carpeta> tests/rincones/correr-fase.sh https://cruce-senales.vercel.app f12-a11y-demo
```
`correr-fase.sh` espera su turno (lee las fichas de `coordinacion` en `/Users/macair/cruse/cruce-coord-rincones`; si usás otra copia, cambiá `COORD` arriba del script), anota `CORRIENDO PRUEBA (hh:mm)` en `agentes/rincones.md`, corre, y la suelta (también si lo matan). **Si la sesión rincones ya no usa su ficha, cambiá `FICHA` y `COORD` por los tuyos**, o corré el guion suelto: `node tests/rincones/<fase>.mjs <url>`.
Capturas y JSON: `/Users/macair/cruse/rincones-capturas/<corrida>/` (`<id>-<ancho>.png`, `<id>-<ancho>-ini.png`, `fN.json`, `a11y-*.json`). Cada JSON guarda el bundle de producción contra el que corrió.

## Orden recomendado para un barrido (turnos de ≤ 10 minutos)
1. `f12-a11y-demo` (accesibilidad de la demo, 8 min)
2. `f15-enmienda15` (dos planes, «¿cuál prefieres?», ronda; **no se llegó a correr completo**)
3. `f13-enmienda13` y `f14-proposito` (enmienda 13 y propósito del grupo)
4. `f5-demo` `f5b-demo-baja` (demo y Simulación)
5. `f0-sin-grupo` `f1-organizador` `f2-invitados` (portada, Crear grupo, invitados). `f1` y `f2` van juntos y en ese orden (comparten el grupo en `rincones-capturas/estado/`).
6. `f3-confirmar-y-reparar` `f3b-baja-y-reparar` `f4-listas-y-cancelar` (cadena: v1 → confirmado → baja → v2 → listas → cancelada)
7. `f6-quien-eres` `f7-grupo-b` (variantes de entrada; necesitan `f1` y `f5` corridos antes)
8. `f9-sin-red-y-validaciones` `f10-fallas` `f11-responder`
9. `f8-agente` (UNA llamada al modelo: «Que el agente proponga» y «Que el agente arme un plan»; cuesta, corré solo una vez)
`correr-todo.sh <url>` corre todo en bloques y acepta `DESDE=<fase>` para retomar.

## Qué falta correr (con lo publicado después de las 03:00)
`f15` (corregido, nunca completo), `f8`, `f9`, `f10`, `f11`, y `f12` A13/A15 (el botón de la agenda ahora es «Ver qué sugiere mi agenda»; ya lo acepta). Los guiones aceptan la S3 vieja y la del mockup (filas plegadas auto-abiertas, «Revisar antes de crear» opcional, sin «Crear solo el borrador»). Si S1, S2, S4, S5, S6 o S7 cambian un rótulo, el guion que lo busque dice `ERROR DEL GUION` en sus notas (no es un fallo de la app: ajustar el selector).

## Cómo leer los resultados
- `node tests/rincones/resumen.mjs <carpeta>/fN.json` (hallazgos visuales por rincón y ancho) y `node tests/rincones/resumen-a11y.mjs <carpeta>/a11y-*.json` (accesibilidad).
- `node tests/rincones/comparar.mjs <carpeta-antes> <carpeta-después>`: qué hallazgo desapareció, cuál es nuevo y qué rincones cambiaron de texto.
- `node tests/rincones/contar-doc.mjs`: cuenta aprobados/observados/rotos de `docs/rincones.md`.
- Falsos positivos conocidos del módulo de accesibilidad: transiciones de foco (se espera 380 ms), contenido de `<details>` cerrado, y «texto cortado» en `strong` de la cabecera a 320 px (el nombre se oculta a propósito). Cuando hay una falla de contraste, el módulo guarda `<id>-contraste-<ancho>.png` con la captura medida.

## Reglas de base que cumplen los guiones
Un turno a la vez con marca en la ficha; sondeo del candado cada 15 s; nada durante `MIGRACION EN CURSO`; sin ráfagas (un grupo, una sesión por persona, un RPC por acción). `f8` es la única que llama al modelo.
