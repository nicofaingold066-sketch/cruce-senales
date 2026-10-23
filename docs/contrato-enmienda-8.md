# Enmienda 8 al contrato: el agente solo usa las preferencias de quien lo permite (opt-out)

Aprobada por el coordinador el 23 oct 2026, a partir de la propuesta de la sesión "Integración agente social CRUCE" (sujeta al veto de Nico). Cambio aditivo: `contrato` sigue en 2 y no cambia ninguna operación existente.

## Por qué
Hoy una persona que guardó preferencias no puede retirarlas del cálculo del agente; solo "no guardar" evita que cuenten. El opt-out explícito deja que cada uno decida, después de guardar, si el agente las usa.

## Qué cambia
- Cada fila de `cruce.preferencias` tiene `usar_en_agente boolean not null default true`. Las filas existentes quedan en `true`: sin cambio de comportamiento.
- **Sin RPC nuevas ni cambio de firma** (la lista permitida sigue en 30 para `authenticated` y 0 para `anon`, una sola firma por nombre). `save_my_preferences` acepta la clave opcional `usar_en_agente` (booleano) dentro de `p_preferencias`, que entra en la lista cerrada de claves permitidas; si falta, vale `true`.
- `get_my_preferences` devuelve `usar_en_agente` de la propia persona (nadie más lo ve).
- `proponer_plan_borrador` ignora por completo las filas con `usar_en_agente = false`: descartes por precio y techo, puntaje, umbrales y totales de `perfil_grupo`, `personas` y `pocas_preferencias`. Vale también para quien llama. Equivale a que esa persona no hubiera guardado preferencias.
- **Sin fuga:** nadie puede distinguir a una persona con opt-out de una que no guardó (mismos conteos y mismas respuestas compartidas).
- `simulate_save_preferences` y las semillas del demo no cambian (siempre `true`); `reset_demo` las vuelve a dejar así.

## Pruebas mínimas (`tests/backend/`)
1. Un miembro con opt-out que exige `ojala_gratis`: deja de filtrar candidatas; las candidatas coinciden con las de un grupo en el que esa persona no guardó preferencias.
2. `perfil_grupo`, `personas_con_preferencias` y `pocas_preferencias` iguales a los de "no guardó".
3. Por defecto `true`: las preferencias existentes siguen contando y la suite actual pasa sin cambios.
4. `get_my_preferences` devuelve el valor propio; ninguna respuesta compartida lo trae.
5. Catálogo 30/0 y `cruce.verificar_privilegios()` sin hallazgos.

## Interfaz (agente-ia, solo `src/agente/`)
Casilla "Que el agente use mis preferencias", marcada por defecto, en "Mis preferencias", con el texto: "Si la desmarcas, el agente no las usa; siguen guardadas solo para ti." Sin otros cambios en `src/`.

## Plazo y salida
Migración 0031 aplicada y suite backend completa en verde antes de las **20:00 del viernes 23**. Si no llega, se descarta sin tocar nada y queda como límite declarado en `docs/agente-ia.md`: "no se puede retirar el uso de preferencias ya guardadas". Después de las 12:00 del sábado no hay migraciones.

## Implementación (backend, 23 oct, 16:47)
- **Migración** `0031_e8_usar_en_agente`, aplicada a las 16:47. Las 2603 filas que había quedaron en `usar_en_agente = true`. La lista permitida sigue en 30 para `authenticated` y 0 para `anon`, y `cruce.verificar_privilegios()` no da hallazgos.
- **Forma de las respuestas** (para la interfaz): `usar_en_agente` va **a nivel raíz** de la respuesta, no dentro de `preferencias` (que no cambia).
  - `get_my_preferences` y `save_my_preferences` lo devuelven con el valor propio. En `get_my_preferences` vale `true` si la persona todavía no guardó nada.
  - `save_my_preferences` acepta `usar_en_agente` (booleano) dentro de `p_preferencias`. Si la clave falta, vale `true`: guardar sin la clave vuelve a activar el uso. Otro tipo de valor da `entrada_incompleta/preferencias_invalidas`.
  - Cambiar solo la casilla no cuenta como repetir (`repetido: false`).
- **Plan:** `proponer_plan_borrador` ignora las filas con `usar_en_agente = false` en todo. `personas_consideradas` y `pocas_preferencias` cuentan solo a quienes dejan usarlas. `get_my_preferences.personas_con_preferencias` tampoco las cuenta, así que nadie distingue a quien desmarcó de quien no guardó.
- **Sin cambios:** `simulate_save_preferences` rechaza la clave como antes, porque sigue con el validador de siempre. El helper nuevo `cruce.validar_preferencias_propias` es privado. `reset_demo` deja las semillas en `true`.
- **Pruebas:** `tests/backend/enmienda8.test.ts` (las 5 mínimas de la enmienda).
