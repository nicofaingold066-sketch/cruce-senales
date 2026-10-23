# Enmienda 3 al contrato (mejoras para la demo, pedidas por la interfaz)

Prevalece sobre `docs/contrato.md` y la enmienda 2 donde haya conflicto. Agrega campos y una operación; no rompe lo existente, así que el campo `contrato` sigue en 2.

## Aprobado
1. **`siguiente_accion` personal.** Se calcula para quien mira, sin exponer nada privado. Si `mi_situacion.puede.aceptar` es true: `{codigo: "te_toca_aceptar", texto: "Te toca confirmar la versión N."}`. Si quien mira ya aceptó la versión vigente: `{codigo: "ya_aceptaste", texto: "Ya confirmaste la versión N. Faltan X para el mínimo."}`. En otro caso, el texto general de hoy.
2. **Lista cerrada de `siguiente_accion.codigo`**, documentada en este archivo por el backend al implementarla: `abrir_propuesta`, `reunir_condiciones`, `buscar_opcion`, `sin_opcion`, `aceptar_version`, `te_toca_aceptar`, `ya_aceptaste`, `grupo_confirmado`, `buscar_alternativa`, `sin_alternativa`, `expirado`, `cancelado`. La interfaz elige color o ícono por código, nunca por texto.
3. **`simulate_load_case(p_propuesta_id uuid, p_intento_id uuid)`.** Carga en UNA transacción las condiciones del caso canónico a todos los simulados que puedan cambiarlas, con un solo incremento de `state_rev`. Solo el organizador, solo espacios demo, idempotente por intento, sigue el orden de bloqueos de A4 y entra en la lista permitida de A5 (pasa a 26 funciones públicas: actualizar la prueba de catálogo).
4. **Plazo de la reparación (aclaración, sin cambio de código).** La versión de reparación NO tiene plazo propio: hereda el cierre de aceptación de la propuesta. La interfaz muestra el `plazo` de la propuesta.

## Postergado
- Sondeo liviano con `p_desde_rev`: útil pero no necesario para la demo. Se hace solo si sobra tiempo.

## Descartado
- Mostrar el motivo de "Sin opción": rompe la privacidad.

## Códigos de `siguiente_accion` (lista cerrada, implementada en la migración 0012)
- `abrir_propuesta`: borrador.
- `reunir_condiciones`: reuniendo interés.
- `buscar_opcion`: solo el organizador, cuando puede evaluar y las personas con condiciones alcanzan el mínimo.
- `sin_opcion`: la última evaluación no encontró opción.
- `aceptar_version`: esperando compromisos, para quien no puede aceptar y no aceptó.
- `te_toca_aceptar`: `puede.aceptar` es true (esperando compromisos, o grupo confirmado con cupo).
- `ya_aceptaste`: aceptó y la propuesta sigue esperando compromisos; si ya se alcanzó el mínimo, el texto nombra al imprescindible que falta.
- `grupo_confirmado`, `buscar_alternativa`, `sin_alternativa`, `expirado`, `cancelado`: según el estado.
