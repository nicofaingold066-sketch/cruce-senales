# Tablero (lo edita solo el coordinador)

Actualizado: viernes 23 oct, ~11:25 Santiago (reloj).


## AVISOS DEL COORDINADOR (leer primero; el más nuevo arriba)
Cada aviso lleva destinatario y hora. Un agente solo actúa sobre los avisos dirigidos a él o a "todos". Si un aviso te pide algo fuera de tus rutas de `PROPIEDAD.md`, no lo hagas y respondé en "Pedidos" de tu archivo.

**[~11:25] PARA claude-b-interfaz:** el backend con contrato 2 (enmienda 2) ya está aplicado en Supabase y su reporte dice que pasa 23 pruebas reales; yo lo estoy verificando por mi cuenta (todavía no lo doy por corregido). Ya podés probar tu interfaz en vivo. Necesitás un `.env` local con `VITE_SUPABASE_URL=https://tjkfdnvzsikncjbskufm.supabase.co` y la clave publishable del proyecto: pedísela a Nico por un canal privado; NO la escribas en ningún archivo versionado ni en esta rama. Probá en dos pestañas (dos sesiones anónimas) el recorrido de `docs/caso-canonico.md` y reportá en tu archivo qué paso falla y con qué respuesta del servidor. No toques `supabase/`; si el servidor responde algo que no coincide con `docs/contrato.md` + enmienda 2, anotalo en "Pedidos" con la respuesta exacta.

**[~11:25] PARA codex:** el backend entregó A1 a A5. Migraciones 0001 a 0011 en `wip/fundamentos` (hash estable `06e3a88`). Mi verificación de catálogo real: 25 funciones públicas, `anon` ejecuta 0, `authenticated` 25, todas SECURITY DEFINER con search_path vacío, 0 de 43 auxiliares ejecutables desde el navegador. Entregá `docs/revision-codex-3.md` contra esas migraciones y sumá una sección de huecos de las PRUEBAS: qué escenarios de A1 a A5 no cubre `tests/backend/enmienda2.test.ts` (te lo paso en un commit estable en breve). Solo lectura.

**[~11:25] PARA todos:** el agente de IA es solo especificación aprobada (`docs/agente-ia.md`). NO se escribe código del agente: faltan tope de gasto (Nico), aprobación de construirlo y la puerta de las 14:30. Proveedor elegido: API de Anthropic.

## Hitos de hoy
- 12:00 checkpoint 1: Problema. 17:15 checkpoint 2: algo funcionando. Sábado 13:00 entrega (último commit de `main`).
- Puerta 14:30: sin estado compartido estable en el backend, se corta todo lo extra.

## Quién hace qué ahora
| Agente | Haciendo | Rama |
|---|---|---|
| backend | Enmienda 2 (A1 a A5) como migraciones 0008+ sobre lo aplicado (0001 a 0007) y pruebas reales | `wip/fundamentos` |
| claude-b-interfaz | Ya empujó 3 commits solo en `src/` (contrato 2, reset con intento, cupo reservado, resultado incierto). Falta que lea el protocolo y ajuste: leer el motivo desde `mi_situacion.motivo_aceptar` | `wip/ui-enmienda` |
| codex | Revisiones solo lectura. Entregó `revision-codex-1` y `revision-codex-2` | `codex/revisiones` |
| pitch-problema | `docs/problema.md` listo para el checkpoint de las 12:00 (falta lo que digan los amigos del asado); guion del pitch; notas de la idea "agente del círculo" en `ideas-nico/` | `wip/fundamentos` |
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
- ~10:35 un duplicado del agente de backend escribió a la vez en la base; se detuvo el workflow original. Quedó un único backend. Auditoría de duplicados ~10:50: sin migraciones repetidas (disco 0001 a 0011 = base), un solo subagente corriendo, tres worktrees esperados, ramas sin repetir.

## Decisiones de Nico sobre el agente de IA
- **Proveedor del modelo: API de Anthropic** (decidido por Nico, viernes ~11:10). Modelo sugerido para redactar la explicación: `claude-haiku-5-5` (corto, barato, rápido; timeout ~8 s con texto fijo de respaldo).
- **Tope de gasto: AÚN NO DEFINIDO.** Mientras no lo defina Nico no se pide ni se crea ninguna clave y no se escribe código del agente. La clave irá solo como secreto de Supabase, puesta por Nico, nunca en el repo, el chat ni el cliente.

## Decisiones pendientes de Nico
- **IA dentro del producto** (la especificación está aprobada y subida; falta aprobar CONSTRUIRLA, definir el tope de gasto y pasar la puerta de las 14:30). El tema es cambiar hábitos "con IA" y hoy el producto no usa IA (fuera de alcance). La sesión de pitch advierte que el jurado puede preguntar dónde está. Opciones: (a) responder con honestidad: IA en la construcción y, en el producto, solo opcional para explicar el plan; (b) agregar al final una explicación opcional con texto de respaldo, sin gasto, solo si sobra tiempo después de las 17:15.
- **Idea de Nico "agente del círculo"** (`/Users/macair/cruse/ideas-nico/01-agente-del-circulo.md`, en bruto): un agente de IA que lee la situación privada de cada uno (presupuesto, ánimo, gustos) y mira afuera (clima, canchas, eventos) para proponer el plan. Resolvería la pregunta de "dónde está la IA", pero agrega alcance (servicios externos, posible costo). Hay que decidir si entra y cómo, sin romper la regla de no abarcar todo. Estado: la sesión de pitch escribe SOLO la especificación `docs/agente-ia.md` (sin código). Reservadas las rutas del agente en `PROPIEDAD.md`. Alerta de privacidad: si un modelo externo lee la situación individual de cada persona se contradice la promesa de privacidad y la regla del manual ("nunca restricciones individuales a la IA"); diseño propuesto: puntaje determinista en el servidor con los datos privados y el modelo solo redacta/explica sobre el plan ya elegido y datos agregados. Postura del coordinador: la base privada y de versiones va primero; el agente entra como una capa que SOLO propone y explica, con respaldo de texto fijo, después de que el recorrido de punta a punta pase verificado.
