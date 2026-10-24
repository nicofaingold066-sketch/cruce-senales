# Variantes que el jurado podría pedir en vivo

Dueño: pitch-problema. Viernes 23 oct 2026.

**Estado (viernes 23 oct, 16:20): las cuatro pruebas pasaron en la app local con la base real, pero no en la versión publicada.** Lo que dice "Qué esperamos" sale de leer las reglas de `docs/caso-canonico.md` y `docs/contrato-enmienda-2.md`. Codex lo corrió después en el navegador, a 375 px, con dos sesiones y clics y formularios del producto: 4 de 4, 23 comprobaciones, de 16:19:10 a 16:19:41 (`tests/e2e/jurado-navegador.mjs`; salida literal en `tests/e2e/evidencia-53-jurado.md`, que está en la rama `codex/revisiones` hasta que el coordinador la integre). Debajo, cada variante tiene su "Observado".

**Límites de esa evidencia (son de Codex, no míos):** se probó la aplicación local (servidor de desarrollo) contra la base real con la migración 0030, no la versión que publica Vercel; no se probó en teléfonos físicos, con lector de pantalla ni con el modelo de IA. El escáner de privacidad revisa que las respuestas compartidas no traigan disponibilidad, preferencias ni identificadores de usuario; no demuestra que nadie pueda inferir la causa a partir de lo que ve (los límites de inferencia siguen siendo los de la enmienda 7). El guion acepta una URL (`node tests/e2e/jurado-navegador.mjs <url>`), pero esa modalidad no se corrió todavía.

Todas parten del caso canónico "Los del finde":
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

**Observado (Codex, 16:19:10, V1):** con mínimo 5 elige B; cuatro aceptaciones dejan "Esperando compromisos" y Tomi, como quinto, confirma. Se ve igual en las dos sesiones.

## Variante 2: "¿Y si el anfitrión no puede ningún día?"
**Cambio:** Tomi guarda disponibilidad A = no y B = no, antes de evaluar o después de la baja de Caro.

**Qué esperamos:**
- Ninguna franja tiene a Tomi, así que ninguna es viable.
- Antes de evaluar: el resultado es "Sin opción" y la propuesta sigue reuniendo interés.
- Después de la baja de Caro: la alternativa responde `sin_alternativa`, "Sin opción compatible".
- En los dos casos no baja el mínimo, no saca a Tomi como imprescindible y no muestra el motivo, por privacidad.

**Qué muestra:** el sistema no finge una reparación.

**Por verificar:** los dos momentos, y que ninguna respuesta compartida revele que la causa fue Tomi.

**Observado (Codex, 16:19:18 y 16:19:29, V2a y V2b):**
- Antes de evaluar (V2a): Tomi no puede A ni B; las dos sesiones ven "Sin opción compatible", sin bajar el mínimo y sin mostrar la causa privada.
- Después de la baja de Caro (V2b): con el grupo confirmado y Caro afuera, Tomi pasa a no poder A ni B. El servidor responde `sin_alternativa`; las dos pantallas siguen en "En revisión" con la versión 1 y ninguna inventa una versión 2.
- Límite: el escáner no encontró campos privados en las respuestas compartidas, pero que la causa no se pueda deducir no está probado.

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

**Observado (Codex, 16:19:40, V3):** con máximo 4 y cinco elegibles en B, después de Luna y Mati se abre otra pestaña de Tomi en la que Sofi todavía puede aceptar. Mientras Fede acepta en la pestaña actual, el clic de Sofi desde la pantalla vieja llega al servidor y recibe `cupo_completo` con `reservado_imprescindible`. La pantalla actual ya no le ofrece el botón a Sofi. Tomi acepta último: cuatro confirmaciones y cero lugares libres, sin sobrecupo. La pantalla vieja muestra un texto con la palabra "reservado" (el aviso de la enmienda 2); la prueba busca esa palabra, no la frase completa, así que la redacción exacta no está comprobada.

## Cómo usar esto en el pitch
- Las cuatro variantes pasaron en la app local con la base real. Antes de ofrecer una en vivo, el coordinador corre el guion contra la URL publicada (`node tests/e2e/jurado-navegador.mjs <url>`) y marca el resultado: hasta entonces la verificación es de la versión local, no de lo que ve el jurado.
- Si el jurado pide otra cosa: "Esa no la probamos; preferimos no improvisarla en vivo. La regla dice que debería pasar X". X sale de las reglas, no de una promesa.
