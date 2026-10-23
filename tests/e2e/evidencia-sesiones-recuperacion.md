# #69 · evidencia de recuperación de sesiones

23 oct 2026; horas de America/Santiago. Objetivo cumplido: **sí, 12 PASS / 0 FAIL**, con control negativo que falla como corresponde. No se descubrió un defecto nuevo de producto en estos casos.

## Coordinación y base

Asignada por el coordinador a las 16:51, red interceptada y sin base; extensión a login #66. Leídos caso canónico y coordinación. Rutas exactas reclamadas mediante `agentes/codex.md`, push `b1544fd` a `coordinacion`; no hay reclamos superpuestos. Hubo un rechazo por avance remoto al actualizar los nombres del reclamo y se crearon los archivos antes de verificar ese push: se declaró, se hizo pull/rebase y se confirmó el push correcto antes de continuar editando o ejecutar. No se modificaron rutas ajenas.

Aplicación congelada en `61c5228` (main publicado según tablero 16:56), con login corte 1 `cd4d885`. Esta corrida sirve la aplicación local mediante Vite; **no es una prueba del sitio publicado** ni de la enmienda 9 que se desarrolla después. Chrome 156.0.8078.47, Playwright 1.56.1, Node 24.22.1, supabase-js/auth-js 2.118.0. Runtime y dependencias existentes, sin instalaciones nuevas.

## Método y reproducción

Desde la raíz del repo, con Node en PATH y Playwright disponible:

```sh
CRUXE_PLAYWRIGHT_DIR=/ruta/a/playwright node tests/e2e/sesiones-recuperacion.mjs
```

Si Playwright está resoluble como módulo, no hace falta esa variable. `CRUXE_CHROME` permite indicar el ejecutable; el valor predeterminado es Chrome instalado en macOS. Puerto local 4192 libre. La configuración pública local de Supabase ya existente permite construir su cliente; no imprimir ni versionar `.env`.

El HTML/JSX de prueba importa `src/lib/sesiones.ts`, Supabase, Inicio y App/login originales. No copia la lógica de recuperación ni reemplaza los métodos del SDK. La fixture solo prepara estado y permite consultar la identidad ficticia y la copia guardada. S4 bloquea únicamente la escritura de la clave de respaldo; no representa localStorage completamente inhabilitado.

Cada caso usa contexto nuevo, 375 × 812, service workers bloqueados y sesiones sintéticas vigentes por una hora. Los JWT son ficticios y sin firma real, generados en memoria; no son credenciales de un servicio. Solo el origen local de Vite puede salir del navegador. Toda otra petición queda interceptada: Auth simulado y respuestas ficticias de `server_info`, `list_my_spaces`, `list_proposals`; una ruta externa no declarada se aborta y hace fallar la prueba. No se guardan ni imprimen tokens, cabeceras o datos personales. Se exige cero pageerror, rutas externas inesperadas y logout en cada caso que pasa.

S1–S9 cubren rotación antes de guardar, retorno con recarga, copia previa, fallos al guardar, signup rechazado, fallo de transporte, copia inválida/doble clic y confirmación al olvidar. L1–L3 montan App/router/login completos: retorno válido a portada de Tomi, copia inválida con tres entradas y foco, HTTP 503 con copia conservada y foco útil. Detalle en [informe revisión 9](../../docs/revision-codex-9-sesiones.md).

## Corrida final (exit 0)

S6 usa `route.abort('failed')`, fallo real del transporte del navegador frente al SDK. L3 responde HTTP 503. Ambos agotan el backoff original (~26 s) antes del aviso; no se aceleran los tiempos ni se simula el resultado del helper.

```text
[2026-10-23 17:03:05] #69 SDK real, datos y Auth ficticios; red externa interceptada.
[2026-10-23 17:03:06] PASS S1 cambiar conserva Tomi y volver desde Inicio restaura su identidad (357 ms)
[2026-10-23 17:03:06] PASS S2 una nueva persona no pisa la copia ya guardada de Tomi (97 ms)
[2026-10-23 17:03:06] PASS S3 fallo al guardar la sesión actual no crea otra identidad (96 ms)
[2026-10-23 17:03:06] PASS S4 almacenamiento bloqueado conserva la identidad y no hace signup (98 ms)
[2026-10-23 17:03:06] PASS S5 signup rechazado conserva Tomi y limpia solo la copia de ese intento (94 ms)
[2026-10-23 17:03:32] PASS S6 red caída al volver conserva la copia y la sesión de Pepe (25618 ms)
[2026-10-23 17:03:32] PASS S7 copia inválida y doble clic: un refresh, Pepe sigue activo y se avisa (121 ms)
[2026-10-23 17:03:33] PASS S8 olvidar pide confirmación, permite cancelar y no revoca la sesión actual (237 ms)
[2026-10-23 17:03:33] PASS S9 signup rechazado con una copia previa no la borra ni cambia Pepe (88 ms)
[2026-10-23 17:03:33] PASS L1 login: retorno válido restaura Tomi, portada y sus espacios (234 ms)
[2026-10-23 17:03:33] PASS L2 login: copia inválida conserva Pepe y ofrece las tres entradas con foco útil (233 ms)
[2026-10-23 17:03:59] PASS L3 login: HTTP 503 conserva copia, sesión actual y foco en otra persona (25654 ms)
#69: 12 PASS, 0 FAIL; 40 peticiones Auth interceptadas; cero red externa real, base y modelos.
```

## Control negativo (exit 1 esperado)

Mismo banco, solo S1. El mock devuelve Pepe cuando se pide restaurar Tomi. La aserción final de identidad detecta el cambio; no se editó código del producto.

```sh
CRUXE_SESIONES_CASO=S1 CRUXE_SESIONES_CONTROL=identidad node tests/e2e/sesiones-recuperacion.mjs
```

Usar también `CRUXE_PLAYWRIGHT_DIR` si corresponde.

```text
[2026-10-23 17:04:11] #69 SDK real, datos y Auth ficticios; red externa interceptada.
[2026-10-23 17:04:12] FAIL S1 cambiar conserva Tomi y volver desde Inicio restaura su identidad: Expected values to be strictly deep-equal:
#69: 0 PASS, 1 FAIL; 4 peticiones Auth interceptadas; cero red externa real, base y modelos.
```

## Preparaciones y comprobaciones

- Primera batería de 8 casos: 8/8, 16:54:29–16:54:57.
- Ampliación a login: 9/12; las tres fallas de preparación fueron peticiones esperadas de `server_info` ausentes del mock. El guard las bloqueó y falló los casos; no fue defecto del producto. Se añadió la respuesta ficticia y se conservó el guard estricto.
- Batería con login y ambos fallos como HTTP 503: 12/12, 16:59:33–17:00:28. Luego se distinguió el fallo de transporte S6 del HTTP 503 L3; corrida final arriba.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; Vite 8.3.5, 83 módulos, bundle principal 473.73 kB.
- `node --check tests/e2e/sesiones-recuperacion.mjs` y revisión de espacios de Git: exit 0.

## Límites y entrega

No hubo acceso a Auth remoto, base, agente ni modelo; cero datos reales, cero sesiones remotas nuevas, cero propuestas creadas. No se ocupó turno compartido durante la migración 0032. Esto verifica integración local con respuestas controladas, no RLS ni rotación real/reutilización de refresh tokens. No cubre sesión activa vencida, varias pestañas, navegador móvil físico, nuevo flujo E9 ni rediseño de front-juan.

Archivos propios: `sesiones-recuperacion.mjs`, `.jsx`, `.html`, esta evidencia y `docs/revision-codex-9-sesiones.md`. Sin dependencias o componentes externos nuevos. Playwright/Supabase/React/Vite ya usados en el repo; catálogo general de componentes, integración y producción corresponden al coordinador. Próxima dependencia: integrar esta entrega y asignar QA del siguiente corte con su base y, si usa servicios reales, su turno.
