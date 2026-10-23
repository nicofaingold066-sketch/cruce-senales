# Enmienda 12 al contrato: avisos personales de "siguiente acción" (fricción)

Aprobada por el coordinador el 23 oct 2026 a las 19:52, a pedido de ux-flujo y sinteticos y con propuesta de backend, dentro de la línea de Nico de bajar la fricción. `contrato` sigue en 2. **Sin códigos nuevos, sin RPC nuevas, sin campos nuevos**: solo cambia cuándo se muestra un código que ya existe y su texto, y solo a la persona a la que le toca. (La enmienda 11 es la del agente social, en preparación.)

## (a) El organizador imprescindible sin condiciones
En `reuniendo_interes`, si quien consulta es el organizador, es el imprescindible y todavía no tiene condiciones completas: `siguiente_accion = { codigo: "reunir_condiciones", texto: "Primero marca tu disponibilidad: eres quien no puede faltar." }`, en lugar de `buscar_opcion`. Es solo para esa persona y sobre sí misma; no revela nada de otros.

## (b) Condiciones incompletas con una opción publicada
Si hay una opción publicada y quien consulta tiene condiciones incompletas (por eso queda fuera del cálculo): `siguiente_accion = { codigo: "reunir_condiciones", texto: "Completa tu disponibilidad para poder entrar en la opción." }`. Es solo para esa persona. No cambia elegibilidad, cupos ni conteos.

## Fuera de esta enmienda
- (c) `personas_que_pueden` (cuántos marcaron al menos un Sí): queda como decisión de Nico, porque en grupos chicos un conteo de "quién no puede ninguna franja" puede delatar a alguien.
- Claves nuevas de preferencias (`sin_alcohol`, `apto_peques_y_mascotas`, `duracion_max`): para después de la demo.

## Pruebas mínimas (backend, `tests/backend/enmienda12.test.ts`)
1. (a) organizador imprescindible sin condiciones → `reunir_condiciones` con el texto; con condiciones completas, `buscar_opcion` como antes.
2. (b) persona con una sola franja respondida y opción publicada → `reunir_condiciones` con el texto; las demás personas no ven ningún cambio.
3. La lista cerrada de códigos de la enmienda 3 no cambia; catálogo 31/0; suite completa en verde.

Aviso: si `front-juan` o `friccion` muestran `siguiente_accion.texto` tal cual, no necesitan cambios.
