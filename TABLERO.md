# Tablero (lo edita solo el coordinador)

Actualizado: viernes 23 oct, ~11:30 Santiago.

## Hitos de hoy
- 12:00 checkpoint 1: Problema. 17:15 checkpoint 2: algo funcionando. Sábado 13:00 entrega (último commit de `main`).
- Puerta 14:30: sin estado compartido estable en el backend, se corta todo lo extra.

## Quién hace qué ahora
| Agente | Haciendo | Rama |
|---|---|---|
| backend | Enmienda 2 (A1 a A5) como migraciones 0008+ sobre lo aplicado (0001 a 0007) y pruebas reales | `wip/fundamentos` |
| claude-b-interfaz | Ya empujó 3 commits solo en `src/` (contrato 2, reset con intento, cupo reservado, resultado incierto). Falta que lea el protocolo y ajuste: leer el motivo desde `mi_situacion.motivo_aceptar` | `wip/ui-enmienda` |
| codex | Revisiones solo lectura. Entregó `revision-codex-1` y `revision-codex-2` | `codex/revisiones` |
| pitch-problema | `docs/problema.md` (checkpoint 12:00) y guion del pitch | `wip/fundamentos` |
| coordinador | Coordinación, contrato, integración, verificación A1 a A5 | `wip/fundamentos` |

## Estado de los hallazgos altos (verificado contra la base real y por Codex)
Migraciones 0008 a 0011 de la enmienda 2 YA aplicadas por el backend (A1 reserva del imprescindible, A2 asiento_en_uso, A3 reinicio con generación y tombstones, A4 orden de bloqueos, A5 anon sin EXECUTE y contrato 2). Falta la verificación: pruebas reales A1 a A5 del backend y la verificación independiente del coordinador. Hasta tener esa evidencia, ninguno se da por corregido.

## Dependencias
1. Backend entrega la enmienda 2 y pasa sus pruebas reales.
2. Interfaz se sincroniza con el contrato 2 (puede ir en paralelo con el backend).
3. Coordinador integra ambos, corre verificación independiente y revisión adversarial.
4. Codex revisa las migraciones nuevas.

## Decisiones tomadas
Contrato v1 enmendado por `docs/contrato-enmienda-2.md`. Sofi elegible en la franja B. Costo fuera de este corte. Baja que rompe el mínimo lleva a En revisión con versión nueva.

## Incidentes
- 11:00 un duplicado del agente de backend escribió a la vez en la base; se detuvo el workflow original. Quedó un único backend.

## Decisiones pendientes de Nico
- **IA dentro del producto.** El tema es cambiar hábitos "con IA" y hoy el producto no usa IA (fuera de alcance). La sesión de pitch advierte que el jurado puede preguntar dónde está. Opciones: (a) responder con honestidad: IA en la construcción y, en el producto, solo opcional para explicar el plan; (b) agregar al final una explicación opcional con texto de respaldo, sin gasto, solo si sobra tiempo después de las 17:15.
