# Especificación: el agente del círculo (corte chico)

Dueño: agente-ia (sesión "Pitch y Agente IA del círculo"). Estado: **solo especificación, sin código**. Viernes 23 oct 2026, ~12:00.

Idea original de Nico: `/Users/macair/cruse/ideas-nico/01-agente-del-circulo.md` (fuera del repo).

**Antes de escribir código tienen que cumplirse tres condiciones** (`PROPIEDAD.md`, rama `coordinacion`):
1. Nico lo aprueba.
2. La puerta de las 14:30 está en verde: el backend tiene un estado compartido estable y A1 a A5 pasaron su prueba real.
3. Nico decide qué modelo se usa y con qué tope de gasto.

**Corte duro:** si el sábado a las 10:00 el agente no está integrado y probado, se saca del producto y se cuenta en el pitch como siguiente paso. Esta especificación queda igual. El pitch no presenta el agente como construido hasta que lo esté.

## 1. Qué hace y qué no
El agente arma un **borrador de plan** para el grupo: qué actividad, dónde y en qué dos franjas. Lo hace mirando las preferencias privadas de cada uno, el clima y un catálogo de lugares y eventos.

- **Hace:** propone un borrador y explica en una o dos frases por qué le sirve al grupo.
- **No hace:** no crea la propuesta solo, no confirma a nadie, no cambia ningún estado y no escribe en el grupo. Las reglas del producto se mantienen: "la IA solo explica".

## 2. Dónde entra en el recorrido
Cambia solo el primer paso del recorrido canónico (`docs/caso-canonico.md`):
1. Cada persona carga en privado sus preferencias (sección 4).
2. El organizador toca **"Que el agente proponga"**.
3. El servidor elige el plan (sección 5) y el modelo lo redacta (sección 6).
4. El organizador ve el borrador, lo puede editar y, si quiere, lo usa para `create_proposal`.
5. Desde ahí sigue el motor actual sin cambios: condiciones, evaluación, confirmación, baja y reparación.

## 3. Qué es real y qué es simulado
Esta tabla va tal cual al README y al pitch.

| Pieza | En la demo | Detalle |
|---|---|---|
| Preferencias privadas de cada uno | Real, con datos ficticios | Opciones cerradas (sección 4). |
| Elección del plan | Real | Reglas fijas en el servidor (sección 5). |
| Redacción de la explicación | Real si se construye el agente | Proveedor: API de Anthropic, modelo sugerido `claude-haiku-5-5`. Si no se construye, o si el modelo falla, texto fijo. |
| Clima | Real | Pronóstico de Santiago con Open-Meteo, que es gratis y no pide clave. Si no responde, se sigue "sin pronóstico". Con la semilla de la demo no cambia el plan, solo la explicación (sección 7.1). |
| Canchas de pádel, fútbol y tenis, y otros lugares | **Simulado**, con rótulo "Simulación" | Catálogo ficticio. No conocemos una API pública de reservas de canchas en Chile. |
| Eventos, charlas y fiestas | **Simulado**, con rótulo "Simulación" | Catálogo ficticio del fin de semana. |
| Búsqueda en internet, reservas y pagos | **Fuera** | Visión para después. Se cuenta en el pitch, no se muestra. |

## 4. Preferencias privadas (opciones cerradas, sin texto libre)
Las palabras son suaves a propósito: nada de salud ni montos de dinero, por la Ley 21.719 y el pedido de Makana.
- **Presupuesto este finde:** da igual · algo barato · ojalá gratis.
- **Energía:** con todo · algo tranquilo.
- **Ambiente:** fiesta · tranquilo · da igual.
- **Me gustaría:** marcar varias de las actividades del grupo.
- **Lugar:** da igual · prefiero bajo techo.

La disponibilidad por franja sigue como hoy, en el motor. Las preferencias siguen las mismas reglas que las condiciones: nunca aparecen en respuestas compartidas, errores ni logs.

## 5. Elección del plan: reglas fijas en el servidor
El servidor elige con los datos privados, **sin IA**, con un puntaje que se puede revisar y probar.

Para cada combinación de actividad y lugar del catálogo:
1. **Se descarta** si no cumple lo que alguien necesita: el precio supera el presupuesto más bajo del grupo, o es al aire libre cuando alguien pidió bajo techo y el pronóstico da lluvia.
2. **Se puntúa:**
   - cuántos la marcaron en "me gustaría";
   - si coincide con la energía y el ambiente que eligieron la mayoría;
   - si el clima la favorece (sol para un parque, lluvia para algo bajo techo).
3. **Se elige** la de mayor puntaje. Si hay empate, la más barata. Si nada pasa el paso 1, el resultado es "sin plan compatible" y no se baja ninguna exigencia, igual que el motor actual.

Las dos franjas salen de los horarios del lugar en el fin de semana siguiente, con el formato exacto de `create_proposal`: exactamente 2 franjas en hora local de Santiago.

## 6. Redacción: lo que ve el modelo y lo que no
El modelo **nunca recibe datos de una persona**, ni con nombre ni sin nombre. Solo recibe:
- el plan ya elegido: actividad, lugar del catálogo, franjas y precio aproximado;
- el clima;
- frases sobre el grupo entero, generadas por el servidor y no identificables. Ejemplos: "le sirve al presupuesto de todos", "es bajo techo", "es lo que más eligieron".

Con eso redacta una o dos frases de explicación. El servidor valida la respuesta:
- largo máximo;
- que no nombre a ningún miembro;
- que no mencione presupuesto, ánimo ni otra preferencia de alguien en particular.

Si la respuesta no pasa la validación, si el modelo tarda más de unos 8 segundos o si no hay modelo aprobado, se usa un **texto fijo** armado con las mismas frases del grupo. La demo nunca depende de que responda la IA.

**Riesgo de inferencia en grupos chicos.** Con 4 o 5 personas, una frase como "es gratis porque alguien lo necesitaba" deja adivinar quién fue. Por eso las frases del grupo son siempre afirmativas sobre el plan ("le sirve al presupuesto de todos"), nunca sobre una restricción ("alguien no tiene plata"). Con 3 personas o menos no se da ninguna explicación de presupuesto ni de ánimo, solo de clima y lugar.

**Límite honesto: el resultado también informa.** Aunque el modelo no vea datos individuales, la elección misma dice algo. Si sale un plan gratis, el grupo sabe que alguien pidió algo gratis, y en un grupo chico se puede adivinar quién. No se puede evitar del todo sin dejar de respetar lo que cada uno pidió. Por eso **no se promete ausencia total de inferencia en grupos chicos**, y esa frase va al README tal cual.

## 7. Qué devuelve
Ejemplo con los datos de semilla de la sección 7.1:
```json
{
  "tipo": "borrador",
  "actividad": "Asado",
  "lugar": { "id": "lugar-sim-01", "nombre": "Quincho de Tomi (Simulación)", "simulado": true },
  "titulo": "Asado en casa de Tomi",
  "franjas": [
    { "inicio": "2026-10-31T14:00", "fin": "2026-10-31T17:00" },
    { "inicio": "2026-11-01T14:00", "fin": "2026-11-01T17:00" }
  ],
  "clima": { "fuente": "open-meteo", "resumen": "Sábado despejado, 24°" },
  "explicacion": "Le sirve al presupuesto de todos, es bajo techo por si cambia el tiempo y es lo que más eligieron.",
  "explicacion_fuente": "modelo"
}
```
El agente **no elige al imprescindible ni el mínimo y el máximo**. Eso lo completa el organizador al crear la propuesta.

### 7.1 Datos de semilla de la demo ("Los del asado")
Todo es ficticio y está a la vista. El borrador que sale es el que calcula el puntaje con estos datos, sin reglas escondidas para forzarlo.

**Catálogo (Simulación):**
| id | Actividad | Lugar | Precio | Techo | Horarios del fin de semana |
|---|---|---|---|---|---|
| lugar-sim-01 | Asado | Quincho de Tomi | Barato (aporte) | Sí | sáb y dom 14:00-17:00 |
| lugar-sim-02 | Pádel | Club de pádel | Medio | Sí | sáb y dom 10:00-12:00 |
| lugar-sim-03 | Fútbol | Cancha de barrio | Barato | No | sáb y dom 11:00-13:00 |
| lugar-sim-04 | Parque | Parque de la comuna | Gratis | No | sáb y dom 12:00-15:00 |
| evento-sim-01 | Fiesta | Fiesta de un bar | Medio | Sí | sáb 23:00-03:00 |

**Preferencias (cada una privada):**
| Persona | Presupuesto | Energía | Ambiente | Me gustaría | Lugar |
|---|---|---|---|---|---|
| Tomi | Da igual | Algo tranquilo | Tranquilo | Asado, pádel | Da igual |
| Luna | Da igual | Algo tranquilo | Da igual | Asado, parque | Da igual |
| Mati | Algo barato | Con todo | Da igual | Asado, fútbol | Da igual |
| Caro | Da igual | Algo tranquilo | Tranquilo | Asado, parque | Prefiero bajo techo |
| Fede | Da igual | Con todo | Fiesta | Fútbol, fiesta | Da igual |
| Sofi | Algo barato | Algo tranquilo | Da igual | Asado | Da igual |

**Qué calcula el puntaje con esto:**
- Se descartan el pádel y la fiesta, porque son de precio medio y hay quien pidió "algo barato".
- Si llueve, también se descartan la cancha y el parque, porque son al aire libre y Caro pidió techo. Si hay sol, siguen en carrera.
- Gana el asado igual: lo marcaron 5 de 6, la mayoría eligió "algo tranquilo" y tiene techo.
- Las franjas del quincho coinciden con las del caso canónico: A el sábado 31 y B el domingo 1, de 14:00 a 17:00.
- El clima real **no puede cambiar el resultado de esta semilla**; solo cambia la frase del clima en la explicación. La tabla real/simulado lo dice.
- `explicacion_fuente` es `"modelo"` o `"texto_fijo"`, para que la demo diga con honestidad qué escribió la IA.
- Si no hay plan, la respuesta es `{ "tipo": "sin_plan_compatible" }`, sin motivos, igual que "Sin opción" en el motor.

## 8. Qué hace falta y de quién es
El puntaje vive en Postgres y la función del servidor queda solo para lo que necesita salir a internet.

| Pieza | Qué hace | Ruta | Dueño |
|---|---|---|---|
| Tablas de preferencias y catálogo, con RLS | Guardan los datos privados y la semilla | `supabase/migrations/` | backend, a pedido del coordinador |
| RPC de preferencias (guardar y leer las propias) | Igual que `save_my_conditions` / `get_my_conditions` | `supabase/migrations/` | backend |
| RPC `proponer_plan_borrador` | Calcula el puntaje de la sección 5 y devuelve el plan elegido, sin datos individuales. Testeable y atómica | `supabase/migrations/` | backend |
| RPC de insumos para la función | Devuelve el plan elegido y las frases del grupo. **Concedida solo a `service_role`, nunca a `authenticated`** | `supabase/migrations/` | backend |
| Función del servidor `proponer-plan` | Solo trae el clima, arma las frases del grupo, llama al modelo y valida la respuesta. Lee los insumos con la RPC anterior | `supabase/functions/agente/**` | agente-ia, rama `wip/agente-ia` |
| Pantalla de preferencias y botón | Formulario y borrador | `src/agente/**`; el enganche lo hace claude-b-interfaz | agente-ia y claude-b |
| Cambio de contrato (operaciones nuevas) | Enmienda 3, después de la puerta de las 14:30 | `docs/contrato-enmienda-*.md` | coordinador |
| Clave del modelo | Secreto de Supabase, solo en el servidor; nunca en el repo, el chat ni el cliente | — | la pone Nico |

**Modelo (decidido por Nico, viernes ~11:10):** API de Anthropic. El modelo sugerido es `claude-haiku-5-5`, porque solo redacta una o dos frases a partir de un plan ya elegido.
**Tope de gasto: pendiente.** Lo decide Nico. Hasta entonces no se pide ni se pone ninguna clave y no se escribe código. Faltan además la aprobación de construirlo y la puerta de las 14:30.

**Privilegios (A5 ampliado):** toda RPC nueva entra a la lista permitida, que hoy tiene 25 operaciones, con `SECURITY DEFINER`, `search_path` vacío y `EXECUTE` solo para `authenticated`. La excepción es la RPC de insumos, que va solo a `service_role`. La prueba de catálogo del backend se actualiza para que la lista siga siendo exacta. El pedido formal lo hace el coordinador como enmienda 3.

**Corte duro:** si el sábado a las 10:00 esto no está integrado y probado, se saca del producto (ver sección 1).

## 9. Demo de 60 segundos
1. Mostrar que cada uno cargó sus preferencias y que nadie ve las del otro.
2. Tomi toca "Que el agente proponga". Sale "Asado en casa de Tomi", con las dos franjas del caso, el pronóstico real y el quincho marcado "Simulación". Tomi completa mínimo, máximo e imprescindible.
3. Se crea la propuesta y sigue el recorrido de siempre: confirmación, baja de Caro y reparación.
4. Frase del pitch: "La IA propone, pero no decide por nadie y nunca supo quién dijo qué".

## 10. Pruebas mínimas (cuando haya código)
- Ninguna respuesta del agente ni ningún log contiene preferencias individuales.
- El texto que se le envía al modelo no tiene nombres, ids ni preferencias individuales.
- El modelo apagado o lento produce el texto fijo y el mismo plan.
- Con un presupuesto "ojalá gratis", nunca sale un plan pago.
- Sin opción posible, sale "sin plan compatible" y no se baja ninguna exigencia.
- Los lugares y eventos simulados siempre llevan el rótulo "Simulación".
- Con la semilla de la sección 7.1 sale el asado, con lluvia y con sol.
- La RPC de insumos no es ejecutable desde `anon` ni desde `authenticated`.
