# Usuarios sintéticos de CRUXE

Seis amigos ficticios usan la app como lo haría gente real, para contar dónde se traban, qué no entienden y qué responden mal. Todo ficticio: los nombres no corresponden a personas reales. Cada corrida crea un grupo nuevo ("Los de la facu"); nunca se usa el demo «Los del asado».

- Guion: `tests/sinteticos/seis-amigos.mjs` (más `lib.mjs`, `revisar.mjs`, `guardia.mjs`).
- Correr contra un build propio: `npx vite build && npx vite preview --port 4186` y `node tests/sinteticos/seis-amigos.mjs http://localhost:4186`. Contra producción: sin argumento.
- Salida (no se commitea): `tests/sinteticos/salida/<sello>/` con una captura por pantalla importante, `textos.md` (el texto de cada pantalla que vio cada persona) y `resultados.json`.
- La guardia (`guardia.mjs`) frena el guion si la ficha de backend dice «MIGRACION EN CURSO».
- Los toques cuentan solo lo que la persona toca (no escribir, ni deslizar, ni las redirecciones automáticas). Los segundos son de máquina: son una cota inferior de lo que tarda una persona; un toque humano con lectura ronda 1,5 s.

## Los seis perfiles

| # | Persona | Ancho | Qué quiere | Qué hace el guion |
|---|---|---|---|---|
| 1 | **Vale**, la organizadora. Convence al resto. | 375 px | Que el grupo cierre una cena de egresados el finde que viene. | Entra a la portada, escribe su nombre, «Crear un grupo» con los 5 nombres, crea la propuesta («Cena de egresados», mínimo 3), responde ella, busca la opción, confirma, ve la baja y busca alternativa. |
| 2 | **Joaco**, el apurado. Abre el enlace en el colectivo y quiere responder en 10 segundos. | **320 px** (alto 640) | Contestar y guardar el teléfono. | Enlace → su nombre → «Sí, soy Joaco» → plan → «Mi respuesta» → Sí / Sí → Guardar. Más tarde confirma la versión desde la portada. |
| 3 | **Renata**, la que no puede ninguna franja. | 375 px | Decir que no puede sin quedar mal ni perderse el aviso. | Contesta «No puedo» en las dos franjas y mira qué ve del plan. |
| 4 | **Bruno**, el que tiene condiciones (presupuesto bajo, prefiere bajo techo). | 375 px | Que su límite cuente, pero hoy solo sabe la franja A. | Contesta solo la franja A y deja la B en «Pendiente». Después vuelve, ve que quedó fuera, completa la B y busca dónde cargar presupuesto y techo. |
| 5 | **Gonza**, el que dice que le interesa y después se baja. | 375 px | Quedar bien: «me interesa» primero, confirma, y después no puede. | «Me interesa», Sí / Sí, confirma la versión 1, y se retira con «No voy». |
| 6 | **Pili**, la que nunca abre el enlace. | — | Nada: no ve el mensaje. | No hace nada. Se comprueba que el silencio no cuenta como asistencia y cómo la ve el grupo. |

Escenario: mínimo 3, máximo 6, franjas por defecto (sábado y domingo siguientes, 20:00). Los elegibles de la versión 1 son Vale, Joaco y Gonza; Renata dijo que no, Bruno quedó incompleto, Pili no existe para el servidor hasta que abra el enlace. Con la baja de Gonza el grupo baja de 3 a 2 y pasa a «En revisión».

## Situaciones de un amigo: cómo se expresan hoy y qué falta

Pedido de Nico (19:30, vía coordinador): cubrir todo tipo de situación, no solo seis casos. Para cada una: con qué variable se expresa, si queda privada, si el plan la tiene en cuenta y qué no se puede decir. Regla: lo sensible (salud, ánimo, plata) nunca se pide de forma explícita; se expresa con opciones neutras («algo tranquilo», «ojalá gratis»).

Estado de esta tabla: **lectura de `src/` y del contrato** (23 oct, 19:45). Lo que dice «a comprobar» lo confirma o corrige la corrida (`seis-amigos.mjs` ya cubre franjas, interés, baja y silencio; las preferencias del agente y la enmienda 10 se suman cuando backend libere la base).

Variables que existen hoy: **franjas** Sí / No / Pendiente por opción A y B (privadas, solo cuenta el servidor); **«Me interesa» / «Hoy paso»** (el grupo ve quién marcó interés); **«No voy»** (el grupo ve nombre y versión, sin motivo); **preferencias del agente** (solo la propia persona las ve; el grupo recibe totales solo con 4 o más personas y 2 o más votos, y el presupuesto nunca): presupuesto «da igual / algo barato / ojalá gratis», energía «con todo / algo tranquilo», ambiente «fiesta / tranquilo / da igual», lugar «da igual / bajo techo», «me gustaría» (actividades). Con la enmienda 10 (si entra): zona, movilidad, tiempo máximo, momento.

| Situación | Cómo se expresa hoy | ¿Queda privado? | ¿El plan la considera? | Qué NO se puede decir |
|---|---|---|---|---|
| Bajón / sin ganas | Energía «algo tranquilo»; o «Hoy paso»; o «No puedo» en las franjas; o no responder | Preferencia sí. «Hoy paso» solo quita el interés (no se anuncia). «No voy» sí es público (nombre, sin motivo) | Solo vía agente: energía «algo tranquilo» baja el ritmo del plan sugerido. El plan armado a mano no la mira | «Esta semana prefiero algo corto»: no hay duración por persona. Ojo: la energía parte en «algo tranquilo» por defecto, así que no se distingue a quien eligió de a quien no tocó (a comprobar) |
| Sin tiempo (una sola franja) | Sí en una franja, No en la otra | Sí | **Sí**, es lo central del motor: la opción sale de las franjas | Una tercera fecha o una hora distinta: la propuesta tiene solo A y B |
| Sin tiempo (ninguna franja) | No / No (queda «Completas» y fuera de la versión) | Sí | Sí: queda fuera de los elegibles; ve «No formas parte de las personas que pueden aceptar esta versión» | «Avísenme para la próxima»: no hay forma de pedir otra fecha ni de que se la propongan a ella después |
| Sin plata | Presupuesto «ojalá gratis» (o «algo barato») | Sí; el presupuesto nunca sale del servidor | Solo vía agente: filtra planes caros. No hay costo en la propuesta manual | Un tope en pesos (no se pide a propósito). «No puedo pagar ese lugar» a la propuesta ya publicada: solo «No puedo» a la franja, que mezcla fecha con plata |
| Sin movilidad (lejos / necesita que lo lleven) | Hoy: nada. Con enmienda 10: movilidad «me_llevan» + zona + tiempo máximo | Con E10: sí (nunca minutos por persona ni quién necesita que lo lleven) | Hoy no. Con E10: sí, descarta lugares lejos y prefiere el de menor viaje | Hoy, todo. Con E10: «alguien me pasa a buscar» como mensaje para el grupo (a propósito no existe) |
| Tiene ganas pero no puede este finde | «Me interesa» + No / No | Interés es público; las franjas no. El grupo ve «le interesa» sin saber que no puede | Las franjas sí (queda fuera); el interés no suma confirmados | «Quiero, pero otro día»: no hay otra fecha ni «avisenme». La señal de ganas llega al grupo y puede leerse como que viene |
| Niños o mascota | Hoy: nada | — | No | No hay etiqueta ni «apto para ir con peques/mascota». Parte de la solución: «bajo techo», un momento temprano, pero no lo dice |
| No toma alcohol | Ambiente «tranquilo» (aproximado) | Sí | Aproximado vía agente | No hay forma de decir «sin alcohol», ni el plan lo muestra como propiedad del lugar. Fiesta/bar lo dejan afuera sin decirlo |
| Prefiere algo tranquilo | Energía «algo tranquilo» + ambiente «tranquilo» | Sí; el grupo ve solo «La mayoría prefiere…» con 4 o más personas | Sí, vía agente | — (está cubierto) |
| No responde nunca | Silencio | — | **Nunca cuenta como asistencia**: ni elegible ni confirmada; el grupo la ve «Sin confirmar» como a cualquiera que no confirmó | Nada de más: sigue «por entrar» hasta que abra el enlace. El organizador no tiene un «recordarle» (mejora #89, ux-flujo) |

### Las tres comprobaciones

1. **¿Se puede expresar sin exponerse?** Por lectura: las franjas y las preferencias no las ve nadie más; los totales del agente salen con 4 o más personas y 2 o más votos. Se expone (a propósito) «Me interesa» y «No voy», y por eso importan: «No voy» tras un día malo se ve con nombre. A comprobar en la corrida: que ninguna pantalla de otra persona (Vale, Joaco…) muestre las condiciones de Renata ni de Bruno, ni «Bruno quedó incompleto».
2. **¿El plan la tiene en cuenta?** Franjas: sí, siempre. Todo lo demás (plata, energía, ambiente, techo, movilidad) solo entra por el agente, que es opcional y que el organizador puede ignorar; la propuesta armada a mano no mira nada de eso.
3. **¿Qué no se puede expresar hoy?** Ver la última columna. Resumen: duración corta, otra fecha, niños o mascota, sin alcohol, y todo lo de movilidad hasta que entre la enmienda 10.

Ideas para quienes puedan hacerlas, también en la ficha:
- backend / apertura: etiquetas del catálogo `sin_alcohol` y `apto_peques_y_mascotas`, como propiedad del lugar y no de la persona (una persona que lo pide se vería en un grupo de seis). El filtro se activa si lo pide el organizador para el plan («este plan: sin alcohol / con niños»).
- ux-flujo: «Me interesa pero otro día» (aviso de próxima fecha) y proponer una tercera fecha cuando el motor no encuentra.
- backend: una preferencia opcional «prefiero algo corto» (duración máxima), en la misma lista cerrada.
- friccion / front-juan: mostrar la energía por defecto como «sin elegir» y no como «algo tranquilo».

## Revisión de código de lo entregado hoy (sin correr; 23 oct, 19:55)

Leído en las ramas `wip/friccion` (`efede20`…`cac56d8`), `wip/ux` (`ede33ca`) y `wip/agente-ia` (`d5d913e`), todavía sin integrar. Lo confirma o corrige la corrida con el build que las incluya.

### friccion: «¿Cuándo puedes?» (#88), calendario simulado (#90)

| Situación | ¿Se entiende el texto? | ¿Expone a alguien? | Hallazgo |
|---|---|---|---|
| Sin tiempo / no puede ninguna | «No puedo ninguno», detalle «Puedes cambiarlo después»: claro y baja la presión | No: guarda en privado | Después dice «Si te sirve, la confirmas en el plan» a quien acaba de decir que no puede |
| Una sola franja | «Solo el sábado» / «Solo el domingo»: claro | No | — |
| Bruno (solo sabe la A) | «Solo el sábado» guarda la B como **No**, no como «no sé»; «Todavía no sé: ver el plan» no guarda nada y lo manda a «Mi respuesta» (más toques) | No | Es mejor que quedar «Incompletas» sin avisar, pero mezcla «no sé» con «no puedo» (a comprobar en la corrida) |
| Tiene ganas pero no puede | «Me interesa» solo se ofrece si dijo que sí a alguna franja | El interés es público | Con eso nadie puede decir «quiero pero otro día» |
| Bajón | «No puedo ninguno» sirve: un toque y sin explicación | No | — |
| Calendario simulado | «Tomar de mi calendario» + rótulo Simulación; la agenda inventa eventos («Hora al dentista», «Turno en el trabajo») | No | **Media-alta**: «Responder con esta agenda» guarda de inmediato, sin revisar, y la agenda es inventada: un amigo real puede quedar con «No» por un dentista que no existe. En un grupo real el rótulo «Simulación» contradice «nada es simulado» y el dentista parece dato de salud |
| Llega tarde (v1 ya publicada) | Cae al espacio sin explicar | — | Bruno no se entera de que ya no puede responder en un toque |

### ux-flujo: «Recordar a quien falta» / «Avisar al grupo» (#89)

| Mensaje | ¿Se entiende? | ¿Expone a alguien? |
|---|---|---|
| «Faltan respuestas para «X». Toca, elige tu nombre y marca cuándo puedes (es privado): enlace» | Sí, corto y claro | No nombra a nadie ni cuenta cuántos faltan. Pero llega a todo el grupo, también a quien ya dijo que no (Renata) y a quien se bajó |
| «Cambió «X»… Las confirmaciones anteriores no cuentan; si vas, toca y confirma de nuevo» | Sí | Dice que algo cambió, no por qué; quien se bajó lo recibe igual |
| Enlace | Es el enlace de invitación del grupo | Quien lo reenvíe fuera del grupo deja entrar a desconocidos: el código sigue valiendo (ya era así) |

### agente-ia: zona, movilidad, tiempo máximo y momento (enmienda 10)

| Situación | ¿Se entiende? | ¿Expone? | Hallazgo |
|---|---|---|---|
| Sin movilidad | «Necesito que me lleven» y «Hasta cuánto viajás» son directos | No: «Nadie del grupo ve tu zona ni cómo te movés», y el servidor no devuelve minutos por persona | La etiqueta nombra la limitación sin rodeo; evaluar una forma más suave («Prefiero que me pasen a buscar») |
| Todas | Cada pregunta tiene «Prefiero no responder» | No | Bien. Pero usa «movés», «viajás» (voseo) en una app que habla de «tú» |
| Zona | 8 comunas de Santiago, sin «otra» | Es una dirección aproximada, privada | Un grupo de otra ciudad no puede responder (solo «Prefiero no responder») |
| Todo el panel | Vive plegado al final del espacio («Agente del círculo – Opcional») | — | Ningún invitado lo ve: nada en «¿Cuándo puedes?» ni en «Mi respuesta» lo menciona, así que Bruno (poca plata, bajo techo) no encuentra dónde decirlo |
| Sin plan por viaje | «Ningún plan… queda dentro del tiempo de viaje de todos. Por privacidad no se dice para quién» | Al organizador sí le dice que alguien limita el viaje | Aceptable; no dice quién |

Los pedidos de esta revisión están en la ficha `agentes/sinteticos.md`.

## Hallazgos

(Se completa con cada corrida; ordenados por gravedad.)
