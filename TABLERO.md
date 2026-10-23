# Tablero (lo edita solo el coordinador)

Actualizado: viernes 23 oct, ~11:05 Santiago.

## Hitos de hoy
- 12:00 checkpoint 1: Problema. 17:15 checkpoint 2: algo funcionando. Sábado 13:00 entrega (último commit de `main`).
- Puerta 14:30: sin estado compartido estable en el backend, se corta todo lo extra.

## Quién hace qué ahora
| Agente | Haciendo | Rama |
|---|---|---|
| backend | Enmienda 2 (A1 a A5) como migraciones 0008+ sobre lo aplicado (0001 a 0007) y pruebas reales | `wip/fundamentos` |
| claude-b-interfaz | Sincronizar `src/` con la enmienda 2 (tarea `docs/tareas/interfaz-enmienda-2.md`) | `wip/ui-enmienda` |
| codex | Revisiones solo lectura. Entregó `revision-codex-1` y `revision-codex-2` | `codex/revisiones` |
| pitch-problema | `docs/problema.md` (checkpoint 12:00) y guion del pitch | `wip/fundamentos` |
| coordinador | Coordinación, contrato, integración, verificación A1 a A5 | `wip/fundamentos` |

## Estado de los hallazgos altos (verificado contra la base real y por Codex)
A1 pendiente · A2 pendiente · A3 pendiente · A4 parcial · A5 parcial (`anon` ejecuta las 25 funciones; respuestas dicen `contrato: 1`). Ninguno está corregido todavía.

## Dependencias
1. Backend entrega la enmienda 2 y pasa sus pruebas reales.
2. Interfaz se sincroniza con el contrato 2 (puede ir en paralelo con el backend).
3. Coordinador integra ambos, corre verificación independiente y revisión adversarial.
4. Codex revisa las migraciones nuevas.

## Decisiones tomadas
Contrato v1 enmendado por `docs/contrato-enmienda-2.md`. Sofi elegible en la franja B. Costo fuera de este corte. Baja que rompe el mínimo lleva a En revisión con versión nueva.

## Incidentes
- 11:00 un duplicado del agente de backend escribió a la vez en la base; se detuvo el workflow original. Quedó un único backend.
