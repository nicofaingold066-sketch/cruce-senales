# Correcciones de gravedad alta A1 a A5: evidencia

Viernes 23 oct 2026. Proyecto Supabase `tjkfdnvzsikncjbskufm`. Fuente de los hallazgos: `docs/revision-codex-1.md` y `docs/revision-codex-2.md`. Decisiones: `docs/contrato-enmienda-2.md`.

## Cómo se verificó
1. **Pruebas del backend** (`tests/backend/`, escritas por quien implementó): 23 de 23 pasan, corridas por el coordinador contra la base real.
2. **Verificación independiente** (`tests/verificacion-altas/`): cinco verificadores, uno por hallazgo, sin leer las pruebas del backend, partiendo de las reproducciones propuestas por Codex y agregando variantes adversariales propias (concurrencia con `Promise.all`, repeticiones, casos límite). **75 de 75 pasan**, corridas otra vez por el coordinador (`npx vitest run tests/verificacion-altas`, 219 s).
3. **Catálogo de permisos** consultado directamente por el coordinador.

## Resultado por hallazgo
| Hallazgo | Estado | Migraciones | Evidencia principal | Límites |
|---|---|---|---|---|
| A1 cupo del imprescindible | **Corregido** | 0008, 0011 | 13 escenarios: caso de Codex (mín 2, máx 2, anfitrión último), máximos 3 y 4, ráfagas concurrentes con el anfitrión, imprescindible simulado y no organizador, retiro antes y después de confirmar. | Promise.all no fuerza un intercalado exacto dentro de Postgres. |
| A2 reclamo de simulado | **Corregido** | 0008, 0010 | 15 escenarios: reclamo tardío tras condiciones, opción publicada, aceptación y retiro; carreras join/simulación repetidas (hasta 10 veces); nunca un real hereda compromisos. | La intercalación forzada propuesta por Codex no se puede provocar desde las RPC públicas. |
| A3 reinicio y reintentos | **Corregido** | 0008, 0010, 0011 | 12 escenarios: las dos secuencias de Codex, resets concurrentes con el mismo id y con ids distintos, tombstones de otros miembros, ids cruzados. | — |
| A4 atomicidad | **Corregido** | 0008, 0010, 0011 | 22 escenarios: seed/seed, create/create, reset/create, join/simulación, aceptación contra vencimiento, colas de hasta 44 operaciones; sin deadlocks ni timeouts; errores sin datos internos. | La espera de bloqueo exacta de Codex requiere una conexión administrativa; se aproximó con contención real. El backend además lo probó con una sesión SQL (aceptación tras el cierre: `plazo_vencido`). |
| A5 privilegios | **Corregido** | 0009 | Catálogo: 25 funciones públicas, `anon` ejecuta 0, `authenticated` 25, todas SECURITY DEFINER con `search_path` vacío, 0 de 43 auxiliares ejecutables. 12 escenarios por REST: sin sesión todo rechazado, sesión ajena sin acceso, tablas de `cruce` inaccesibles, sin sobrecargas inyectables. | No se probó crear una función nueva para comprobar los permisos por defecto. |

## Fallas nuevas de baja gravedad (abiertas)
1. El ACL por defecto de `supabase_admin` en `public` concede EXECUTE a `anon` y `authenticated` (afecta solo funciones que cree ese rol, no las nuestras).
2. El ACL por defecto de `postgres` para tablas y secuencias en `public` concede privilegios a `anon` y `authenticated` (no hay tablas nuestras en `public`).
3. Un JWT sigue aceptado después de `signOut` hasta que expira (comportamiento de Supabase).
4. Un nombre con tabulador o espacio no separable al inicio evita `nombre_en_uso` y crea un miembro visualmente idéntico a un simulado.
5. Un asiento reclamado que solo tenía interés simulado hereda "me interesa" (interés no es compromiso; no rompe A2).
6. `docs/contrato.md` v1 todavía dice que `server_info` es ejecutable sin sesión: lo corrige la enmienda 2.

Ninguna bloquea la demo. Las 1, 2 y 4 se pueden cerrar con una migración chica si sobra tiempo.
