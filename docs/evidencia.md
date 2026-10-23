# Evidencia de CRUXE

Qué se probó, cuándo, sobre qué versión y quién lo corrió. Lo que no se probó está al final y no se da por bueno. "(IA)" indica que lo corrió una sesión de asistente de IA del equipo.

**En una línea:** el recorrido completo (condiciones privadas → plan con confirmaciones → baja → "En revisión" → alternativa desde cero) pasa por API, en el navegador y en producción con dos sesiones. No se probó la IA con su clave real ni dos teléfonos físicos.

Las pruebas de backend, de verificación A1–A5 y de punta a punta por API corren contra la base real de Supabase con datos ficticios. Las de la función del agente y de red controlada corren sin base ni red.

## Corte del viernes 23 oct 2026 (hora de Santiago, del reloj)

| Qué | Versión | Resultado | Quién | Detalle |
|---|---|---|---|---|
| Recorrido completo en producción con dos sesiones (Tomi en ventana normal, Luna en privada) | `7747bf6` (main publicado) | 16/16 | agente-ia (IA) | 15:36:03–15:36:44, Chrome sin ventana a 375 px, sin clave de IA: v1 sábado → baja de Caro → En revisión → v2 domingo sin heredar; Luna no ve conteos ni Simulación; navegador compartido ([agente-ia.md §8.2](agente-ia.md)) |
| Agente en producción a 375 px | `3313790` | perfil sin quien pide ni presupuesto; con sol 3 opciones, con lluvia 1 | agente-ia (IA) | 15:19–15:20 ([agente-ia.md §8.1](agente-ia.md)) |
| Punta a punta por API (`tests/e2e`) | `7747bf6` | 12/12 | coordinador (IA) | 15:31: 3 del recorrido canónico, 4 variantes del jurado y 5 de privacidad del agente. Los informes enlazados son corridas anteriores de Codex ([recorrido](../tests/e2e/evidencia-recorrido-canonico.md), [privacidad y red](../tests/e2e/evidencia-privacidad-red.md)) |
| Backend (`tests/backend`) | 0028 aplicada | 53/53 | backend (IA) | 15:10–15:13, en serie |
| Verificación A1–A5 (`tests/verificacion-altas`) | 0028 aplicada | a1–a3 sin fallas; a5 12/12; a4 23/23 | coordinador (IA) y backend (IA) | a1–a3 a las 15:16. a4: la primera corrida completa dio 21/23 (dos cortes por bloqueo y por tiempo con la base cargada por varias sesiones); esos dos pasan solos y la segunda corrida completa dio 23/23 (15:27–15:30) |
| Función del agente sin red ni modelo | `7747bf6` | 17/17 | coordinador (IA) | `node --test "supabase/functions/agente/*.test.ts"` |
| Red controlada en el navegador | `ca98414` | 8 regresiones pasan | coordinador (IA) | `node tests/e2e/red-controlada.mjs` (requiere Playwright y Chrome de la máquina, no están en package.json). El caso F1 del script todavía falla a propósito: reproducía un defecto que se corrigió en `ca98414` y falta convertirlo en regresión positiva ([informe previo a la corrección](revision-codex-6-privacidad-red.md)) |
| Revisión de privacidad de toda la app | `deeea83` | sin exposición directa; 8 hallazgos: 4 inferencias corregidas en la enmienda 7, 2 declaradas como límite y 2 endurecimientos menores aplicados | agente-ia (IA) | [informe](agente-revision-privacidad.md), [enmienda 7](contrato-enmienda-7.md) |

## No probado
- El agente con la clave real de Anthropic: sin clave elige con reglas fijas y texto fijo, y la pantalla lo indica.
- El pronóstico real de Open-Meteo en la app publicada (las pruebas usan el clima simulado del demo).
- Dos teléfonos físicos con el link público.
- Que el cierre sea la causa del asado que no se hizo, o que CRUXE haga que un grupo real se junte: las hipótesis de [problema.md](problema.md) no se validaron con personas y no se midió ningún efecto en el hábito.
- Encuentros, reservas o pagos reales: no existen en CRUXE.
