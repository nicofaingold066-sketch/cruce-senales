# Guion del pitch (5 min de demo y pitch + 3 min de preguntas)

Dueño: pitch-problema. Borrador del viernes 23 oct 2026. Fuentes: `docs/problema.md`, `docs-drive/00-sintesis-para-el-pitch.md`, `docs/caso-canonico.md` y `docs/agente-ia.md`.

**Regla:** en el pitch se dice solo lo que funciona en vivo. Lo que no está construido se dice como siguiente paso.

**Qué decide cada versión.** El coordinador publica en `TABLERO.md` (rama `coordinacion`) una sección "Estado verificado para el pitch" el viernes a las 17:00 y el sábado a las 10:30. Ahí cada paso del recorrido figura como verificado o no verificado, con su prueba. Este guion usa solo lo que esa sección marque como verificado.
- **Recorrido:** versión completa o reducida (ver 1:10).
- **Agente de IA:** por defecto es **siguiente paso**. Solo pasa a "mostrado" si el coordinador lo confirma.
- **Solo lo social.** Nico y Juan decidieron un solo caso, amigos. El uso en empresas no se muestra ni se presenta como parte del producto.

Marcas de datos, igual que en `docs/problema.md`: **[DATO]** con fuente, **[DATO PROPIO]** o **[HIPÓTESIS]**. Las marcas son para el equipo y no se leen en voz alta.

Los tres criterios valen lo mismo: Problema, Solución y Convicción. El jurado cierra con "¿Con cuál de estas sí cambiaría?". Cada bloque apunta a uno.

## 0:00-0:40 · El problema (criterio Problema)
> "El 8 de octubre íbamos a hacer un asado. Seis dijeron que les interesaba. Nadie dijo que no. Y el asado no se hizo." **[DATO PROPIO]**
>
> "No nos faltan amigos: el 43% de los chilenos tiene entre 3 y 5. Lo que no pasa es el encuentro." **[DATO]** Encuesta Bicentenario UC, vía chocale.cl, 2026; fuente secundaria, confirmar en el informe original antes del sábado.
>
> "WhatsApp está en casi todos los teléfonos. Sirve para hablar del plan, pero no para cerrarlo." **[DATO]** WhatsApp llega al 89,7% de la audiencia en línea de Chile (DataReportal/Statista 2025). Que no sirva para cerrar el plan es **[HIPÓTESIS]**.

Si hay respuestas de los amigos del asado, acá va **una frase textual**, sin nombre: "Uno nos dijo: '…'". Es lo que el jurado no escuchó de ningún otro equipo.

## 0:40-1:10 · Por qué falla (criterio Problema)
Las cuatro causas son **[HIPÓTESIS]**, salvo las que confirmen los amigos del asado. Se dicen como "creemos que":
1. Nadie cierra el plan: con seis interesados, cada uno espera al otro.
2. "Me interesa" no es un sí.
3. Hay cosas que no se dicen en el grupo, como la plata o el horario.
4. Si uno se baja, se cae todo.

> "Por eso no atacamos la soledad ni la motivación. Atacamos el último metro: que el plan se cierre y se sostenga."

## 1:10-4:00 · Demo en vivo (criterio Solución)
Dos teléfonos: Tomi (organizador) y Luna. Los demás son "Simulación" desde el teléfono de Tomi. Se sigue el recorrido de `docs/caso-canonico.md`.

Hay dos versiones. Se elige según "Estado verificado para el pitch".
- **Completa:** pasos 1 a 8, si están todos verificados.
- **Reducida:** si la baja y la reparación (pasos 6 y 7) no están verificadas, se muestran los pasos 1 a 4 en vivo y se cierra con "lo siguiente es que, si alguien se baja, el plan se repara solo". Si un paso del 1 al 4 no está verificado, se reemplaza por la grabación de respaldo y se dice que es una grabación.

**Versión completa:**
1. **1:10** · Reiniciar la demo. Mostrar el espacio "Los del finde".
2. **1:20** · Tomi crea la propuesta con dos franjas, sábado y domingo. Mostrar que "me interesa" no suma confirmados.
3. **1:40** · Cada uno carga sus condiciones en privado. Mostrar en el teléfono de Luna que no ve las de Tomi.
4. **2:00** · El motor elige el sábado con Tomi, Luna, Mati y Caro. Aceptan: **Grupo confirmado** en los dos teléfonos.
5. **2:30** · *Ver más abajo el bloque del agente.*
6. **2:45** · Caro se baja. Quedan tres, menos que el mínimo: **En revisión**. Mostrar en los dos teléfonos que el estado cambió y que la baja quedó registrada con su hora.
7. **3:05** · Tomi pide una alternativa: domingo con Fede, versión 2. Mostrar que **nadie quedó confirmado de antemano**: cero aceptaciones heredadas.
8. **3:25** · Los cuatro vuelven a aceptar la versión 2, incluida Luna desde su teléfono. **Grupo confirmado** otra vez. Mostrar en el historial quién hizo cada cosa, qué versión y a qué hora.
9. **3:45** · Una frase: "Si Tomi no puede, el sistema dice 'Sin opción compatible'. No baja el mínimo ni finge que se arregló".

### Bloque del agente (unos 15 segundos)
- **Por defecto, siguiente paso:** no se muestra. Se nombra solo en el cierre (ver 4:30). Hoy no tiene la aprobación de Nico, ni la puerta de las 14:30, ni modelo y gasto decididos.
- **Solo si el coordinador confirma que está integrado y probado:** se muestra *antes* del paso 2. Tomi toca "Que el agente proponga" y sale "Asado en casa de Tomi" con el pronóstico real y el quincho marcado "Simulación". Frase: "La IA propone, pero no decide por nadie y nunca supo quién dijo qué".

## 4:00-4:30 · Qué dejamos fuera y cómo lo mediríamos (criterios Solución y Convicción)
- **Fuera a propósito:** chat, pagos, reservas reales, calendarios, rankings individuales.
- **Uso en empresas:** decidimos un solo caso bien resuelto.
- **Cómo sabríamos si funciona:** tasa de encuentros concretados, si el grupo se vuelve a juntar a las 4 y 12 semanas, y cuántas bajas se reparan.
- **No prometemos** que la app cause más bienestar. Sí que el plan se cierra o dice con honestidad que no hay opción.

## 4:30-5:00 · Cierre (criterio Convicción)
> "Ese asado no se hizo porque nadie lo cerró. Con CRUCE, Tomi no tiene que perseguir a nadie: cada uno dice lo suyo en privado, el plan se cierra solo y, si alguien se baja, se arregla."
>
> "Elegimos un solo caso y lo resolvimos entero: que un grupo de amigos vuelva a juntarse."

Por defecto, mientras el coordinador no confirme el agente: "Lo siguiente es un agente que proponga el plan mirando el clima, las canchas y los eventos, sin saber nunca quién dijo qué. Ya está diseñado".

## Preguntas difíciles (3 min)
Respuestas cortas, de `docs-drive/00-sintesis-para-el-pitch.md` sección 8:
1. **¿Por qué no WhatsApp?** WhatsApp sirve para hablar. CRUCE cruza condiciones privadas, propone una opción y repara. Pueden convivir.
2. **¿Makana ya tiene grupos?** Sí, con desafíos y rachas. CRUCE es la pieza que hace que el encuentro ocurra.
3. **¿Qué evidencia hay de que cambie el hábito?** Causal, ninguna. El diseño se basa en evidencia (plan concreto, mínimo de personas, responsable visible) y lo mediríamos con encuentros concretados y repetición.
4. **¿Privacidad?** Las condiciones nunca se muestran. El grupo ve solo el plan. En grupos chicos no prometemos ausencia total de inferencia.
5. **¿Dónde está la IA?** Por defecto: está diseñada y es el siguiente paso; hoy priorizamos que lo central funcione en vivo y sea privado. Solo si el coordinador confirmó el agente: propone el plan con reglas que se pueden auditar, y la IA solo lo explica.
6. **¿Y en empresas? ¿Quién paga?** Decidimos un solo caso bien resuelto: amigos, y para amigos es gratis. Cómo se sostiene es una pregunta abierta que no resolvimos en este corte.

## Lo que NO se dice
- Que CRUCE cause más encuentros o más bienestar.
- Una cifra de soledad sin su umbral.
- Datos de cancelaciones en Chile (no existen).
- Que Makana "no tiene" eventos o RSVP.
- Que el agente funciona, si el coordinador no lo confirmó.
- Que CRUCE es un producto para empresas.
- Un paso del recorrido que no figure como verificado.

## Ensayo
- Cronometrar dos veces con los dos teléfonos.
- Tener una grabación de la demo como respaldo por si falla la red.
- Reiniciar la demo justo antes de subir.
- App en vivo: https://cruce-senales.vercel.app (enlace informado por el coordinador; probarla en los dos teléfonos antes de subir).
