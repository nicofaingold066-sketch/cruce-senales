# Variantes que el jurado podría pedir en vivo

Dueño: pitch-problema. Viernes 23 oct 2026.

**Nada de esto está verificado.** Lo que dice "Qué esperamos" sale de leer las reglas de `docs/caso-canonico.md` y `docs/contrato-enmienda-2.md`. No es un resultado probado. El coordinador lo verifica después con pruebas reales, y hasta entonces no se promete en el pitch.

Todas parten del caso canónico "Los del asado":
- Franjas: A = sábado 31 oct, 14:00-17:00. B = domingo 1 nov, 14:00-17:00.
- Disponibilidad: Tomi, Luna y Mati pueden A y B; Caro solo A; Fede y Sofi solo B.
- Tomi es el imprescindible. Mínimo 4 contando a Tomi, máximo 6.
- Regla del motor: se elige la franja más temprana con al menos el mínimo de elegibles, incluido Tomi.

## Variante 1: "Suban el mínimo a 5"
**Cambio:** crear la propuesta con mínimo 5 en vez de 4.

**Qué esperamos:**
- La franja A tiene 4 elegibles (Tomi, Luna, Mati, Caro): no llega a 5, así que no es viable.
- La franja B tiene 5 (Tomi, Luna, Mati, Fede, Sofi): es viable.
- El motor publica la versión 1 con la franja B y esos 5 elegibles. El grupo se confirma cuando aceptan los 5.

**Qué muestra:** el motor no se queda con la primera franja si no alcanza. Cambia de día antes de bajar el mínimo.

**Por verificar:** que la evaluación elija B y no responda "Sin opción".

## Variante 2: "¿Y si el anfitrión no puede ningún día?"
**Cambio:** Tomi guarda disponibilidad A = no y B = no, antes de evaluar o después de la baja de Caro.

**Qué esperamos:**
- Ninguna franja tiene a Tomi, así que ninguna es viable.
- Antes de evaluar: el resultado es "Sin opción" y la propuesta sigue reuniendo interés.
- Después de la baja de Caro: la alternativa responde `sin_alternativa`, "Sin opción compatible".
- En los dos casos no baja el mínimo, no saca a Tomi como imprescindible y no muestra el motivo, por privacidad.

**Qué muestra:** el sistema no finge una reparación.

**Por verificar:** los dos momentos, y que ninguna respuesta compartida revele que la causa fue Tomi.

## Variante 3: "Pongan máximo 4 y que alguien acepte antes que el anfitrión"
**Cambio:** Caro guarda A = no, así que A queda con 3 elegibles y no es viable. La propuesta se crea con mínimo 4 y máximo 4. En B hay 5 elegibles para 4 lugares. Luna, Mati y Fede aceptan antes que Tomi, y después intenta aceptar Sofi.

**Qué esperamos (regla A1 de la enmienda 2):**
- Mientras Tomi no acepte, se le reserva un lugar. Para los demás quedan 3 (`libres_para_otros = 3`).
- Luna, Mati y Fede aceptan. Quedan `libres_para_otros = 0`.
- Sofi intenta aceptar y recibe `cupo_completo` con `detalle: "reservado_imprescindible"`. No ocupa lugar. La pantalla dice que el último lugar está reservado para el anfitrión.
- Tomi acepta último: el grupo queda confirmado con 4.

**Qué muestra:** el anfitrión nunca se queda afuera por llegar tarde, y nadie ocupa un lugar que no existe.

**Por verificar:**
- Que la versión 1 incluya a los 5 elegibles aunque el máximo sea 4. Las reglas que leímos no dicen qué hace el motor cuando hay más elegibles que lugares.
- Que la interfaz muestre el aviso del lugar reservado. Es parte de la enmienda 2, en manos de claude-b-interfaz.

## Cómo usar esto en el pitch
- Solo se ofrece en vivo una variante que el coordinador haya marcado como verificada.
- Si el jurado pide otra cosa: "Esa no la probamos; preferimos no improvisarla en vivo. La regla dice que debería pasar X". X sale de las reglas, no de una promesa.
