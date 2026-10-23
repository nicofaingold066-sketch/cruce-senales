# CRUXE


Hackatón Señales (Makana), 23 y 24 de octubre de 2026. Caso 06: recuperar el hábito de verse con amigos.

## El problema que atacamos
Un grupo de amigos que quiere verse y no se ve. El 8 de octubre organizamos un asado: seis personas dijeron que les interesaba, nadie dijo que no, y no se hizo. No faltan amigos: el 43% de los chilenos tiene entre 3 y 5 (Encuesta Bicentenario UC, vía chocale.cl; fuente secundaria). Lo que no ocurre es el encuentro.

Creemos que el plan falla por cuatro razones, que todavía son hipótesis: nadie lo cierra, "me interesa" no es un sí, hay condiciones que no se dicen en el grupo (plata, horario) y, si uno se baja, se cae todo.

## Por qué este problema y no otro
El chat ya resuelve hablar del plan: WhatsApp llega al 89,7% de la audiencia en línea de Chile (DataReportal/Statista 2025). Lo que no resuelve es cerrarlo y sostenerlo. No atacamos la soledad ni la motivación, que son más amplias y difíciles de mover en dos días, sino el último metro: que el encuentro ocurra.

## Qué hace CRUXE
1. Cada persona carga sus condiciones **en privado**. Nadie ve las de otro.
2. El servidor propone **una sola opción** compatible con todos.
3. Cada uno confirma **esa versión exacta** del plan. Interés no es confirmación y el silencio nunca es asistencia.
4. Si alguien se baja y se rompe el mínimo, el plan pasa a **En revisión** y se propone una alternativa que todos deben volver a aceptar, sin aceptaciones heredadas.
5. Si no hay opción posible, lo dice: "Sin opción compatible". No baja el mínimo ni finge una reparación.

Verificación: el servidor tiene 98 pruebas automáticas que pasan contra la base real (ver `docs/correcciones-altas-1.md`). La verificación del recorrido completo en la interfaz se actualiza antes de la entrega.

## Qué dejamos fuera a propósito, y por qué
| Fuera | Por qué |
|---|---|
| Chat | Ya existe en WhatsApp; competir con él no es nuestro problema. |
| Pagos y reparto de costos | Agregan riesgo y datos sensibles; no son la causa del plan que no se cierra. |
| Reservas reales, calendarios, mapas | Cada integración es un proyecto en sí y podía romper la demo. |
| Notificaciones push | No hacían falta para demostrar el cierre y la reparación. |
| Uso en empresas | Decidimos enfocarnos solo en lo social: un caso, bien resuelto. |
| Rankings o estadísticas individuales | Van contra la privacidad, que es parte de la solución. |
| Agente de IA que propone el plan | Diseñado en `docs/agente-ia.md`, sin construir en este corte. **[PENDIENTE]** si se construye y se prueba antes del sábado a las 10:00. |

## Real y simulado
| Pieza | Estado |
|---|---|
| Espacio "Los del asado", condiciones privadas, propuesta, confirmación | Real, con datos ficticios. **[PENDIENTE]** verificación de punta a punta. |
| Baja y reparación | Real, con datos ficticios. **[PENDIENTE]** verificación de punta a punta. |
| Mati, Caro, Fede y Sofi | Personas ficticias, marcadas "Simulación" y controladas desde el teléfono del organizador. |
| Agente de IA | Solo especificación. **[PENDIENTE]** |

Todos los datos son ficticios. No hay datos de personas reales.

**Privacidad.** Las condiciones de cada persona nunca aparecen en lo que ven los demás. Toda la lógica corre en el servidor, en funciones de Postgres con RLS. En grupos chicos no se promete ausencia total de inferencia: el plan elegido también dice algo.

## Cómo correrlo
App desplegada: https://cruce-senales.vercel.app (datos ficticios).

En local (detalle en `docs/como-correr.md`):
1. `npm install` (Node 24).
2. Copiar `.env.example` a `.env` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Solo la clave publishable, nunca la de servicio.
3. `npm run dev`.
4. Pruebas: `npm test`.

Stack: React, Vite y TypeScript en el cliente; Supabase (Postgres, RLS y sesiones anónimas) en el servidor. 

## Componentes externos
- [Supabase](https://supabase.com) (Postgres, RLS, sesiones anónimas) y [supabase-js](https://github.com/supabase/supabase-js)
- [React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Vitest](https://vitest.dev)
- [Vercel](https://vercel.com) para el despliegue
- Asistentes de programación con IA: [Claude Code](https://claude.com/claude-code) y [Codex](https://openai.com/codex). Parte de los commits los hicieron agentes de IA en sesiones de los integrantes.

## Participantes
- Nico Faingold: [nicofaingold066-sketch](https://github.com/nicofaingold066-sketch)
- Juan Morales: [JuanMorales10](https://github.com/JuanMorales10)
