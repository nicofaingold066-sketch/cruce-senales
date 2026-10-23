# Evidencia Codex · #53 y #17 en navegador

23 oct 2026, America/Santiago. Objetivo cumplido: sí.

## Base y preparación

Código de aplicación: `main` `dda21c6`, incorporado mediante merge `e7fdf5f`. El primer F1 positivo es de agente-ia (`1b8a3d8`, incorporado antes de ampliarlo); su bloque y N1–N8 quedan intactos. F1b invierte las latencias como caso aparte. Cambios propios: pruebas e informes, sin editar `src/`, `supabase/`, configuración o `main`.

Runtime existente: Node 24.22.1, Playwright 1.56.1, Chrome 156.0.8078.47. Las dependencias existentes se copiaron de otra copia local cuyo package-lock coincide; no se instalaron paquetes ni se cambió el lockfile. `.env` local ignorado contiene solo las variables públicas del proyecto. Ninguna credencial se incluye aquí.

Reclamo publicado en `coordinacion` antes de editar: `b8d3f44`. La autorización de GitHub se resolvió antes del push. La ficha de backend estaba sin migración ni prueba de carga. La suite nueva consulta esa ficha antes de preparar y entre variantes; también antes de cancelar. Aborta si no puede leerla o encuentra `MIGRACION EN CURSO` / `PRUEBA DE CARGA EN CURSO` en «Tocando ahora». Es una comprobación previa, no un bloqueo distribuido.

Para reproducir, poner Node 24 en PATH, configurar las dos variables de `.env` y apuntar `CRUXE_PLAYWRIGHT_DIR` a Playwright ya instalado si no está en node_modules. `CRUXE_CHROME` permite cambiar el ejecutable. Ningún comando instala dependencias:

```sh
node tests/e2e/red-controlada.mjs
node tests/e2e/jurado-navegador.mjs
npm run typecheck
npm run build
```

El segundo guion levanta Vite local en 127.0.0.1:4191 y lo cierra al terminar. Un argumento URL o `CRUXE_URL` permite elegir un despliegue. Esa modalidad no se ejecutó en este corte.

## #53 · red controlada

F1: espacio 20 ms, lista 180 ms. F1b: espacio 180 ms, lista 20 ms. Ambos exigen título y lista visibles antes de 2 s, sin «Cargando propuestas…», con una sola petición de cada RPC, sin visibilitychange ni esperar el sondeo de 10 s. El arreglo serializa la primera carga: con las latencias invertidas tampoco se manda la lista antes de conocer la generación. No se afirma haber forzado respuestas concurrentes en orden inverso en el código arreglado, ni se impone la serialización como requisito de la prueba.

Salida literal final (exit 0). Red externa interceptada; cero sesiones o llamadas reales a Supabase en este banco:

```text
PASS N1 lectura colgada: aborta a 10 s y se recupera (10210 ms)
PASS N2 doble clic + respuesta perdida: un intento, un registro, reintento seguro (175 ms)
PASS N3 escritura colgada: libera botón a 10 s y conserva el intento (10141 ms)
PASS N4 lectura vieja no pisa la mutación nueva (156 ms)
PASS N5 sondeo liviano y cambio privado con igual state_rev (126 ms)
PASS N6 sin conexión antes del envío: cero escrituras y borrador conservado (127 ms)
PASS N7 reinicio: lista vieja no resucita propuestas de otra generación (421 ms)
PASS N8 simulación: panel demorado no pisa la revisión nueva del padre (367 ms)
PASS F1 primera lista válida aparece sin refresco ni sondeo (603 ms)
PASS F1b espacio lento / lista rápida: lista inicial sin refresco ni sondeo (677 ms)
#34: 10 PASS, 0 FAIL. Incluye 10 regresiones: N1 a N8, F1 y F1b (latencias invertidas; #53, arreglo #52). Red externa interceptada; cero llamadas reales a Supabase.

```

## #17 · interfaz real → RPC real → interfaz

Chrome sin interfaz, viewport 375×812, dos contextos aislados: Tomi y Luna. Solo dos identidades anónimas por ejecución, un demo propio y cuatro propuestas; todas las escrituras nacen de clics o formularios del producto. Luna reclama un asiento limpio; el resto de personas se operan mediante la Simulación rotulada.

- V1: mínimo 5 elige B; cuatro aceptaciones dejan Esperando compromisos; Tomi quinto confirma, visible en ambas sesiones.
- V2a: Tomi no puede A/B antes de evaluar; ambos ven Sin opción compatible, sin bajar el mínimo ni revelar la causa privada.
- V2b: grupo confirmado, baja de Caro, Tomi pasa a no poder A/B; el servidor responde sin_alternativa. Ambas pantallas mantienen En revisión/v1 y ninguna inventa v2.
- V3: máximo 4 y cinco elegibles en B. Después de Luna y Mati se abre otra pestaña de Tomi, con Sofi todavía habilitada. Se retienen sus lecturas mientras Fede acepta en la pestaña actual. El clic de Sofi desde esa pantalla vieja hace una escritura real: cupo_completo/reservado_imprescindible. La pantalla actual ya no ofrece el botón de Sofi. Tomi acepta último: cuatro confirmaciones y cero lugares, sin sobrecupo. La tercera pestaña reutiliza la identidad de Tomi.

La captura de respuestas escanea los objetos `propuesta` compartidos, también al cancelar: no encuentra campos de disponibilidad, preferencias, `user_id` ni otros campos privados prohibidos por el scanner. Para Luna se comprueba que los dos conteos E7.2 sean null. Solo se admiten los dos rechazos previstos. Cero errores JS y cero llamadas al agente/modelo; sus endpoints están bloqueados en el guion.

La primera preparación falló por selector ambiguo del campo de nombre (dos formularios). La segunda falló porque el label incluye también el texto de ayuda y no admite la coincidencia exacta usada. Se acotó el selector al formulario de unirse y se quitó exact. Fueron errores del guion, no defectos del producto: no se crearon propuestas en esos intentos. Cada preparación creó su demo propio. No se ocultan ni cuentan como verdes.

Primera ejecución completa: 16:16:17–16:17:03, 4/4 y 23 comprobaciones, 204 RPC observadas, 4/4 propuestas canceladas. Tras ampliar la comprobación final de privacidad a las cancelaciones y agregar la marca de prueba de carga al guard, se ejecutó la entrega completa de nuevo. El HEAD que imprime el log era el disponible al iniciar; los ajustes finales de F1b solo cambian la prueba y el código de producto sigue siendo dda21c6.

Salida literal de entrega (exit 0):

```text
[2026-10-23 16:18:56 Santiago] Jurado navegador: http://127.0.0.1:4191; 375 px; base d5a2a40
[2026-10-23 16:18:59 Santiago] Demo propio creado por UI; Luna reclama su asiento. Se reutilizan las dos sesiones.
[2026-10-23 16:19:10 Santiago] PASS V1 mínimo 5: domingo, espera con cuatro y confirma con Tomi quinto (10877 ms)
[2026-10-23 16:19:18 Santiago] PASS V2a anfitrión no disponible: sin opción, conserva mínimo y privacidad (6911 ms)
[2026-10-23 16:19:29 Santiago] PASS V2b baja de Caro y anfitrión no disponible: sin alternativa, sigue En revisión/v1 (9348 ms)
[2026-10-23 16:19:40 Santiago] PASS V3 máximo 4: reserva al anfitrión, rechaza Sofi desde pantalla vieja (9829 ms)
[2026-10-23 16:19:41 Santiago] RPC observadas: 202; privacidad de sobres compartidos sin hallazgos; 2 rechazos esperados; 0 llamadas al modelo.
[2026-10-23 16:19:41 Santiago] #17 navegador: 4 PASS, 0 FAIL; 23 comprobaciones; 4/4 propuestas propias canceladas.

```

Se cerraron los contextos; no se guardaron sus tokens. Las ocho propuestas de las dos corridas completas fueron canceladas por UI. Quedan los demos y usuarios anónimos ficticios propios de las cuatro preparaciones; no se borraron datos de otros. Capturas opcionales de la entrega en `/tmp/cruxe-53-capturas/` (no se versionan).

## Comprobaciones de entrega

`node --check tests/e2e/jurado-navegador.mjs`: exit 0.

`npm run typecheck`: exit 0, salida literal:

```text

> cruce-senales@0.1.0 typecheck
> tsc -b --noEmit


```

`npm run build`: exit 0, salida literal:

```text

> cruce-senales@0.1.0 build
> tsc -b && vite build

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
dist/assets/api-xGqTC6Dj.js               5.65 kB │ gzip:   2.49 kB
dist/assets/NuevaPropuesta-DkRyhsbY.js    8.74 kB │ gzip:   2.94 kB
dist/assets/Espacio-BkdS75TJ.js           9.37 kB │ gzip:   3.37 kB
dist/assets/AgentePanel-C_bb2C-t.js      14.12 kB │ gzip:   4.86 kB
dist/assets/Propuesta-nysZvhjR.js        38.89 kB │ gzip:  10.43 kB
dist/assets/index-DTHcLOiU.js           464.44 kB │ gzip: 133.08 kB

✓ built in 101ms

```

## Límites y siguiente dependencia

- El banco de red usa sobres ficticios y código original; no certifica idempotencia de Postgres ni el despliegue.
- El jurado se verificó contra la aplicación local y la base real (backend con 0030 aplicada). No certifica la versión que Vercel publique después, teléfonos físicos, lector de pantalla ni el modelo de IA.
- El scanner abarca propuestas compartidas observadas, no toda la privacidad del producto. Se mantienen los límites de inferencia declarados en la enmienda 7.
- El coordinador integra `codex/revisiones` y puede ejecutar este guion contra la URL publicada. Pitch/coordinador deben actualizar su `docs/jurado-variantes.md`, que aún dice «Nada de esto está verificado».
