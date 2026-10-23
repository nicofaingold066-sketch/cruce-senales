# Enmienda 5 al contrato: preferencias simuladas en vivo (variantes del jurado)

Aprobada por el coordinador. Agrega una operación; no cambia ninguna existente (`contrato` sigue en 2).

## `simulate_save_preferences(p_espacio_id uuid, p_miembro_id uuid, p_preferencias jsonb)` (pública, `authenticated`)
- **Quién:** solo el organizador del espacio; solo en espacios demo; solo sobre miembros que siguen `simulado = true`. Si no: `no_autorizado / no_es_organizador_espacio`, `no_autorizado / espacio_no_demo` o `no_autorizado / miembro_no_simulado`.
- **Entrada:** `p_preferencias` con el mismo formato y las mismas validaciones que `save_my_preferences` (opciones cerradas, sin claves extra, sin texto libre).
- **Efectos:** inserta o reemplaza las preferencias de ese simulado. Idempotente por contenido (`resultado.repetido`). No toca propuestas ni `state_rev`. Queda en el historial como acción de Simulación del organizador, sin el contenido de las preferencias.
- **Bloqueos (A4):** espacio, después miembro.
- **A5:** la lista permitida pasa de 29 a 30; actualizar la verificación de catálogo.
- **`reset_demo`:** vuelve a cargar la semilla original de los simulados (como hoy), deshaciendo cualquier cambio en vivo.

## Pruebas mínimas
1. El organizador cambia las preferencias de Sofi y `proponer_plan_borrador` refleja el cambio; `reset_demo` las restituye.
2. Un no organizador, un espacio no demo y un miembro real reciben el error correspondiente, sin cambios.
3. Ninguna respuesta compartida expone las preferencias individuales.
4. Catálogo: 30 funciones para `authenticated`, 0 para `anon`.
