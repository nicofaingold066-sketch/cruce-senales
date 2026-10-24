# Usuarios sintéticos de CRUXE

Seis amigos ficticios usan la app como lo haría gente real, para contar dónde se traban, qué no entienden y qué responden mal. Todo ficticio: los nombres no corresponden a personas reales. Cada corrida crea un grupo nuevo ("Los de la facu"); nunca se usa el demo «Los del finde».

- Guion: `tests/sinteticos/seis-amigos.mjs` (más `lib.mjs`, `revisar.mjs`, `guardia.mjs`).
- Correr contra un build propio: `npx vite build && npx vite preview --port 4186` y `node tests/sinteticos/seis-amigos.mjs http://localhost:4186`. Contra producción: sin argumento.
- Salida (no se commitea): `tests/sinteticos/salida/<sello>/` con una captura por pantalla importante, `textos.md` (el texto de cada pantalla que vio cada persona) y `resultados.json`.
- La guardia (`guardia.mjs`) frena el guion si la ficha de backend dice «MIGRACION EN CURSO».
- Los toques cuentan solo lo que la persona toca (no escribir, ni deslizar, ni las redirecciones automáticas). Los segundos son de máquina: son una cota inferior de lo que tarda una persona; un toque humano con lectura ronda 1,5 s.

## Cómo correr los guiones (para quien tome la posta; sesión archivada a las 03:14)

Todos corren con Playwright y el Chrome del sistema (como `tests/e2e/`), cada persona en un contexto aparte, siempre en un **grupo nuevo** (nunca la demo), sin tocar datos ajenos. Salida (no se commitea): `tests/sinteticos/salida/<sello>/` con capturas, `textos.md` (el texto de cada pantalla que vio cada persona) y `resultados.json` (toques, segundos, hallazgos y comprobaciones). La **guardia** (`guardia.mjs`) mira TODAS las fichas de `agentes/` y frena (código 3) si alguna declara «MIGRACION EN CURSO»; `turno.sh` además espera y marca «CORRIENDO PRUEBA» en la ficha de quien lo corre.

| Guion | Qué hace | Cómo se corre | Duración |
|---|---|---|---|
| `seis-amigos.mjs` | Los 6 perfiles (organizadora, apurado a 320 px, sin franja, con condiciones, interesado que se baja, silencio): crear grupo, responder, v1, baja, reparación | `node tests/sinteticos/seis-amigos.mjs https://cruce-senales.vercel.app` | ~1,3 min |
| `dos-planes.mjs` | Enmienda 15: dos planes con nombre, «la que pueden más», «¿cuál prefieres?», ronda de 2 h, totales solo a quien organiza | idem con `dos-planes` | ~1 min |
| `asi-no-puedo.mjs` | Enmienda 13: «Así no puedo, pero sigo», rearmar, v2 sin herencias, nadie ve quién | idem con `asi-no-puedo` | ~1,2 min |
| `psico-perfiles.mjs` | Perfiles de psico (siempre organiza, casa, sin carne, pareja en «solo el grupo» a 320 px, mal momento, silencio) | idem con `psico-perfiles` | ~1,3 min |
| `proposito-grupo.mjs` | Enmienda 14: propósito «Fútbol» al crear el grupo, atajos y «Me gustaría» solo deporte, texto de quórum del agente | idem; `CRUXE_AGENTE=0` evita la llamada al modelo (cuesta una por corrida) | ~1 min (sin agente) |

Una tanda completa contra un build propio: `npx vite build && npx vite preview --port 4186` y la URL `http://localhost:4186` en vez de producción. Con `tests/sinteticos/turno.sh <url> <guion>...` se encadenan cediendo ante migraciones y marcas de otros. Las ediciones de lib/escena/revisar son mías; el resto de `tests/sinteticos/` es de quien lo lea.

**Rótulos del rediseño que los guiones ya aceptan** (lo de hoy y lo nuevo, el viejo solo si existe): «Nuevo plan» o «Nueva propuesta» (título); «Revisar antes de crear» opcional (con el mockup S3 el primario «Crear y abrir al grupo» va en el formulario); fechas A y B plegadas (`details.s3-momento`, se abren antes de tocarlas); atajos tras «Más…» si no están a la vista; «Cómo llegas (opcional)» se abre si existe; el final de «Respondiste» puede ser «Ver el plan» o «Listo»; desde la portada el plan se alcanza por la tarjeta «Tu plan» o por la línea «Te toca confirmar» (`a[href*="/p/"]`); «Prefiero «<plan>»» en un toque (friccion) además de «¿cuál prefieres?» en Mi respuesta.

**Lo que NO está verificado todavía** (porque el `main` con ese diseño aún no se había publicado cuando se archivó la sesión): `main` `60a98e0` solo trae el S3 anterior; el mockup exacto de S3 (`wip/rediseno-s3` 0b7ce46), S1/S5 de friccion (`0b5e4d1`) y el resto de las secciones se probaron solo por lectura de código y mensajes de sus dueños. Primera corrida a hacer contra el `main` nuevo: `seis-amigos` y `dos-planes`; si alguno falla, el error dice qué rótulo no encontró en su línea.

**Hallazgos abiertos al archivar** (detalle y capturas arriba): H2 (franjas primero en «Mi respuesta», en manos del rediseño S5), H6 («Ya hay N personas con condiciones» cuenta a quien dijo No/No: decisión de Nico, después de la demo), H12 («1 confirmaron»), H13 (el editor de condiciones sigue a la vista tras «No voy»), H19/H20 (la invitación y el espacio del organizador no dicen «para jugar fútbol»), H21 («3 por ahora» frente a «4 personas»: agente-ia lo tomó), H22 (tenis al aire libre con lluvia sin decirlo), H23 («Flujo social no disponible» visible), H10 (la hora «de Santiago»: ux-flujo lo saca de la opción). Resueltos y verificados en producción: H1, H4, H8, H9, H14, H16, H17, H18 y la enmienda 13 completa, la 14 y la 15 con su ronda.

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
| No come carne («Ana») | Hoy: nada explícito (ambiente/actividad aproximan) | — | No | Pedido de psico (20:39, P-A): comprobar que el texto compartido del plan sea IDÉNTICO haya o no respondido alguien eso. **Pendiente**: lo compruebo cuando agente-ia aplique A1 (corrida con y sin la respuesta, comparando el texto compartido) |
| No toma («Beto») | Hoy: nada (ambiente «tranquilo» aproxima) | — | No | Idem: el texto compartido no puede cambiar si Beto respondió o no. **Pendiente** de A1 |
| Juntada solo del grupo (sin género ni pareja) | — | — | — | Comprobar que ninguna pantalla compartida diga género ni estado de pareja. **Pendiente** de A1; el revisor de textos (`revisar.mjs`) ya busca esas palabras en cada pantalla de la corrida |
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

## Ensayo de la demo con los perfiles (guion `docs/guion-demo.md` de apertura, `b52e0ad`; leído 21:15)

Cómo lo hice: recorrí cada paso del guion contra las pantallas que mis perfiles vieron **en producción a las 20:54** (`main` `3ace04e`, salida `20261023205443`) y en los builds integrados de las 20:06–20:43, más el código de hoy para los rótulos. La Parte B la cotejé solo contra el código y el guion e2e (`recorrido-dos-sesiones.mjs`): mis perfiles nunca tocan el demo «Los del finde». Los segundos son de máquina (cota inferior; una persona que lee tarda el doble o el triple).

### Los perfiles en el jurado: qué preguntaría cada uno y qué respalda la pantalla hoy

| Perfil | Pregunta que haría | Lo que la pantalla respalda hoy | Lo que no |
|---|---|---|---|
| Joaco, el apurado (320 px) | «¿Cuánto tardo en responder?» | 3 toques tras abrir el enlace (nombre, «Sí, soy», «Puedo los dos días»), 4 s de máquina; el guion dice 4 toques contando el enlace: coincide | A 320×640, «No puedo ninguno» y «Todavía no sé» quedan bajo el pliegue (captura `capturas/2006/joaco-03-responder-en-un-paso.png`): si T2 es un teléfono chico y hay que decir que no, hay que deslizar |
| Renata, la que no puede ninguna | «¿Y si no puedo ninguno de los dos?» | «No puedo ninguno · Puedes cambiarlo después», en un toque, sin explicar | Si lo pide en vivo en la Parte A (mínimo 2, solo Vale), «Buscar opción» da «Sin opción compatible» y la demo no cierra: dejarlo para las preguntas (variantes del jurado 4/4) o mostrarlo en la Parte B con «Tomi no puede» |
| Gonza, el que dice que le interesa y se baja | «¿Y si confirmo y después no puedo?» | La Parte B lo muestra con Caro: «En revisión», versión 2 desde cero | «¿Y si digo que me interesa y no confirmo?»: no suma («Interés no es confirmación»); en escena, tras «Respuesta guardada» aparece «¿Avisar al grupo que te interesa? Me interesa»: no tocarlo |
| Bruno, el de condiciones | «¿Dónde digo que no tengo plata o que prefiero techo?» | Parte B 1:45: «Presupuesto este finde», «Lugar», zona y movilidad, privados | En la Parte A no se ve nada de eso. «¿Y si solo sé el sábado?»: «Solo el sábado 31 oct · el domingo queda como No»: decirlo como decisión (lo que no se sabe no arma plan) |
| Pili, la que nunca abre | «¿Cómo se enteran los que no abrieron el enlace?» | «Beto, Coni, Diego y Ema… no cuentan. El silencio nunca es asistencia» coincide con la órbita («Sin confirmar») | La app no manda nada (D8) y «Recordar a quien falta» está construido y sin conectar: si piden verlo, no hay botón |
| Vale, la que siempre organiza | «¿Cuánto trabajo me da a mí?» | 17 toques desde la portada hasta «Buscar opción» (8 grupo + 5 propuesta + 4 su respuesta), 13 si pega la lista de una vez; por eso el guion lo hace antes | «¿La app avisa cuando sale la opción?» No: lo manda una persona (D8) |
| Dani (casa), Ana (sin carne), Beto (pareja), de psico | «¿Dónde digo…?» | Nada en pantalla hoy; las respuestas están en `docs/preguntas-jurado.md` | «Anfitrión (Vale)» en un plan de fútbol es lo primero que Dani señalaría (abajo, 1:18) |

### Parte A paso a paso: paso → riesgo → qué decir o qué cambiar

| Paso del guion | Qué dice la pantalla hoy (visto) | Riesgo en vivo | Qué decir o qué cambiar |
|---|---|---|---|
| Lista 1: crear «Los del fútbol» con 5 nombres | 8 toques (un «Agregar» por nombre), 9 s; con la lista pegada «Ana, Beto, Coni, Diego, Ema» en un solo «Agregar» (friccion `ee27fc5`, en el build integrado) son 4 | Si se reutiliza el grupo del ensayo de las 10:00, «Ana» puede quedar «no disponible» (ya reclamada por T2 en el ensayo) | Crear un grupo **nuevo** a las 13:30 (cuesta 9 s) y tener «Beto» de repuesto para T2 |
| Lista 2: «Crear propuesta» → «Fútbol» → «Revisar» → «Crear y abrir» | Valores por defecto confirmados: sábado 31 oct y domingo 1 nov, 20:00 a 22:00; mínimo 2; máximo 6; «Cierra vie 30 oct, 20:00» | Tocar solo el atajo deja el título «Fútbol» a secas en la tarjeta del plan | Escribir un título antes (p. ej. «Fútbol del sábado»); «Asado» sigue primero: no tocarlo |
| Lista 3: Vale responde «Sí puedo» A y B → «Guardar condiciones» | «Guardado. Solo tú ves estas condiciones.» ✔ | «Primero marca tu disponibilidad…» no lo vi en ninguna corrida (mis organizadoras siempre respondieron antes de buscar) | Mantener el orden del guion: responder antes de buscar |
| Lista 4: dejar T1 en el espacio | Bajo el código: «Compartir · Copiar · WhatsApp». La tarjeta «Invita a tu grupo», que es la que tiene «Mandar invitación por WhatsApp», **solo aparece con menos de 3 personas** (`Espacio.tsx:158-175`): con 6 nombres no se ve | El guion nombra un botón que no va a estar | **apertura**: en 0:55 decir «WhatsApp» (bajo el código) |
| Lista 5: T2 con el enlace en ventana privada | Si el mismo teléfono ya entró: «Ya estás en este grupo como Ana · Este teléfono ya entró como Ana. Sigue para responder o ver el plan.» y el botón **«Seguir como Ana»** (visto 19:59) | El plan B del guion dice tocar «Sigue para responder», que es texto, no botón. Si T2 fuera el mismo navegador de T1: «Este navegador ya está en este espacio como Vale» → «Entrar como otra persona» → «Sí, entrar como Ana» (3 toques más, texto largo) | **apertura**: plan B = «Seguir como Ana»; T2 siempre otro aparato o ventana privada nueva, cerrada después del ensayo |
| 0:45 «Los del fútbol» con Ana…Ema «por entrar» | ✔ «Personas del espacio … por entrar» | — | — |
| 0:55 mostrar la invitación por WhatsApp | El botón «WhatsApp» abre `wa.me` con el texto: «Súmate a «Los del fútbol» en CRUXE: toca el enlace, elige tu nombre y marca cuándo puedes. Sin cuenta ni contraseña; tus condiciones solo las ve la app: <enlace>» | En la notebook, `wa.me` abre otra pestaña (WhatsApp Web o «abrir la app») y puede robar la pantalla del proyector | Mostrarlo en el teléfono, o «Copiar» y leer la frase |
| 1:00 T2: «¿Quién eres?» → «Ana» → «¿Eres Ana?» → «Sí, soy Ana» | ✔ rótulos exactos. Arriba de la lista: «Vale — no disponible» | Red lenta: «No se pudo cargar la lista del grupo: El servidor tarda en responder. Seguimos intentando.» con «Reintentar» (lo vi a las 20:41, justo después de una migración) | Plan B: «Reintentar». Si preguntan por «Vale no disponible»: es quien creó el grupo |
| 1:10 «¿Cuándo puedes?» → «Puedo los dos días» → «Respuesta guardada» | ✔ La frase dicha coincide palabra por palabra con la pantalla («Solo el servidor ve lo que respondes; el grupo no sabe qué elegiste» y «Responder no es confirmar») | Debajo de «Respuesta guardada» salen «¿Avisar al grupo que te interesa? Me interesa» y «Contar mis gustos y presupuesto (opcional, privado)»: Gonza lo tocaría | No tocar; frase lista: «eso es opcional y lo ve el grupo; cuándo puede, no» |
| 1:18 T1: «Plan» → «Buscar opción compatible» | Antes: «Ya hay 2 personas con condiciones. Busca una opción compatible.» Después: «Te toca confirmar la versión 1.» ✔ | T1 quedó en el espacio (lista 4): primero hay que **tocar la tarjeta del plan** (+1 toque). Y la ficha dice «Anfitrión (Vale)», «Cupo del anfitrión reservado hasta que Vale confirme. Cupos libres para el resto: 5» y «Faltan por responder 1 persona» en un plan de fútbol | **apertura**: agregar el toque. **front-juan** (H9): «Quien no puede faltar (Vale)» antes de las 11:00; si no, frase lista: «anfitrión = quien no puede faltar» |
| 1:28 «Confirmar versión 1» | «Ya confirmaste la versión 1. Falta 1 para el mínimo.» ✔ | — | — |
| 1:33 T2: «Ver el plan» → «Confirmar versión 1» → «Grupo confirmado», «¡Se juntan!», «Calendario», «WhatsApp» | ✔ rótulos (visto: «¡Se juntan! … 3 personas confirmaron la versión 1. CRUXE coordina el plan; no reserva nada. Calendario / WhatsApp») | «Respuesta guardada» **no se actualiza sola**; solo la pantalla del plan sondea cada 3 s. Si Ana sigue en «Respuesta guardada» cuando Vale busca, no ve nada hasta tocar «Ver el plan» | **apertura**: T2 toca «Ver el plan» justo después de responder, antes de que Vale busque; así el botón aparece solo |
| 1:42 cierre | — | Tiempo: 60 s para la Parte A solo si T1 ya está en el plan y nadie lee los textos en voz alta | Cronometrar en el ensayo |

### Parte B (contra el código y el guion e2e; sin corrida propia)

| Paso | Qué respalda el código | Riesgo | Qué decir o qué cambiar |
|---|---|---|---|
| Lista 6: «Reiniciar demo» → «¿Reiniciar la demo?» | Existen (`Espacio.tsx:430,440`) | El rótulo del botón que confirma no lo encontré como «Sí, reiniciar» | Verificar el rótulo en el ensayo |
| 1:45 «Mis preferencias» con las cuatro preguntas de E10 | Vistas por Bruno en el build integrado: «Tu zona», «Cómo te movés», «Hasta cuánto viajás», «Momento del día», cada una con «Prefiero no responder» | Voseo («movés», «viajás», «Marcá al menos una») en una app que habla de tú; y «Guardar» exige marcar una actividad (H5) | Ya pedido a agente-ia; en escena no se guarda |
| 1:58 «Clima para la demo (Simulación)» → «Simular sol» → «Que el agente proponga» | Rótulos exactos (`AgentePanel.tsx:527,605,622`) | Con Opus, hasta 30 s: «El agente sigue pensando: puede tardar hasta medio minuto…» | Una sola llamada; frase de relleno lista (el guion la tiene) |
| 2:15 «Queda a menos de N minutos para todos (estimado)» | `AgentePanel.tsx:406`; necesita la función redesplegada y 4 o más personas con zona y movilidad | En un grupo real de 6 amigos casi nunca aparece (no cargan 4): no prometerlo fuera del demo | Plan B del guion ✔ |
| 2:48 Luna por enlace en T2 | Ventana privada nueva; «Solo Luna es reclamable» | Si alguien reclamó a Luna en ese demo: «no disponible», y «Reiniciar demo» no lo libera | Plan B del guion ✔ |
| 3:22 «Se baja: Caro» | Con E13 (c) el grupo verá «Una persona se retiró» mientras el orador dice «Caro» y Tomi toca «Se baja: Caro» en Simulación | Coherente, pero el nombre lo pone el orador, no la app; los botones «Aceptar versión 2 por …» muestran a los que quedan | Decirlo así: «la app no dice quién; lo digo yo porque es una simulación» |
| 3:35 «Sábado 31 oct 20:00 → Domingo 1 nov 20:00» | ✔ en el demo las franjas son distintas | En la Parte A una reparación diría «Sábado → Sábado» (H8); no hay reparación en la Parte A | — |
| 3:45 «Confirmaron 5 (mínimo 4)» | ✔ #56 | — | — |

### Riesgos transversales (red, segundo teléfono, nombre repetido, código)

| Situación | Qué muestra la app (visto) | Qué hacer |
|---|---|---|
| Red lenta o corte justo al abrir el enlace | «No se pudo cargar la lista del grupo: El servidor tarda en responder. Seguimos intentando.» + «Reintentar» (20:41) | «Reintentar». Después de las 12:00 no hay migraciones, que fue la causa de ese caso |
| Mismo teléfono abre el enlace por segunda vez | «Ya estás en este grupo como Ana» → «Seguir como Ana» | Un toque y sigue |
| El enlace se abre en el navegador de Vale | «Este navegador ya está en este espacio como Vale» → «Entrar como otra persona» → «Sí, entrar como Ana» | Evitarlo: T2 siempre aparte |
| Otra persona ya reclamó «Ana» | «Ana — no disponible» | Tocar otro nombre o «No estoy en la lista» (escribir un nombre nuevo) |
| Se escribe un nombre que ya existe en «No estoy en la lista» | «nombre en uso» (el servidor) | Elegir de la lista |
| Código tipeado a mano (8 letras y números en mayúscula, p. ej. «9PA9YTJW») | Enlace malo: «Ese enlace de invitación no es válido»; código inexistente en «Unirme con un código» | Nunca tipearlo en escena: el enlace ya trae el código |
| T1 se recarga en la portada | Entrada animada de 2,9 s con «Toca para saltar» | Tocar |
| «Datos ficticios» en la cabecera toda la demo | Decisión del coordinador (19:44): se queda | Frase lista: «todo lo que ven es ficticio por regla del evento; el flujo y el servidor son reales» |
| «Mínimo 2, máximo 6» en la tarjeta del plan | — | El guion ya lo prevé |

Pedidos de este ensayo y su estado (21:25): **apertura, hecho** en `5bd4d9e`: los 7 puntos (rótulo «WhatsApp» en 0:55, «Seguir como Ana» en el plan B, el toque de 1:18, «Ver el plan» en 1:33, grupo nuevo a las 13:30 y nombre de repuesto, frases listas, título antes del atajo) y los riesgos transversales están en `docs/guion-demo.md` §1, §2 y §4. **friccion, hecho** en `8793df5`: «¿Quieres avisar al grupo que te interesa?» pasa debajo de «Ver el plan» y «Cambiar mi respuesta», en letra chica y con «esto sí lo ve el grupo» (a verificar en la próxima corrida). **front-juan, pendiente**: H9 («Anfitrión (Vale)» en un plan de fútbol) queda como frase lista en el guion hasta que cambie el texto; conectar `RecordarFaltan` y `AvisoParaMi`.

## Rediseño de la noche: lo que buscan los guiones de sinteticos, por sección (02:15)

El encargo (`prompts/rediseno-noche.md`) pide que cada sección que cambie un texto o un nombre accesible que un guion busca lo actualice o avise con la línea exacta. Para que no haya que adivinar, esta es la lista completa de lo que buscan `tests/sinteticos/*.mjs` (texto exacto, salvo donde dice patrón). Lo que no está acá no lo busca ningún guion de sinteticos. Las clases e ids marcados con `código` son selectores de CSS/DOM, no textos.

| Sección (dueño) | Textos y nombres accesibles que se buscan | Selectores de código |
|---|---|---|
| **S1 Ingreso** (friccion) | encabezado «¿Quién eres?»; botón con el **nombre de la persona** (exacto); botón «Sí, soy X»; botón «Entrar» (portada); el primer cuadro de texto de la portada (el nombre); botón «Unirme» | — |
| **S2 Grupo** (frontend) | enlace «Crear un grupo»; encabezado «Crear un grupo»; etiqueta «Agregar a alguien del grupo»; botón «Agregar»; opción «Solo el grupo»; etiqueta «¿Para qué es este grupo?» (select); botón «Crear grupo»; encabezado con el **nombre del grupo**; enlace «Crear propuesta»; texto «por entrar»; enlace con el nombre del grupo para volver | `.codigo` (el código de invitación); `a.plan-vivo, a.tarjeta-prop` (la tarjeta del plan); `a[href^="https://wa.me"]` (la invitación) |
| **S3 Nueva propuesta** (frontend) | encabezado «Nueva propuesta»; botones de atajo «Cena», «Asado», «Fútbol», «Cerro», «Pádel/Tenis/Básquet»; etiqueta «Propósito de la propuesta» (el título); etiqueta accesible «Sumar uno al mínimo»; «Revisar antes de crear»; «Crear y abrir al grupo»; «Volver a editar»; «Más opciones»; «Sin ronda» / «2 h»; «La que pueden más»; «Nombre de este plan» | `.chip-actividad`; `.campo-etiqueta-plan input` |
| **S4 El plan** (ux-flujo) | pestaña «Plan»; «Buscar opción compatible»; «Confirmar versión N»; «Ya confirmaste la versión N»; «Grupo confirmado»; «En revisión»; «Buscar alternativa»; botón que empiece con «Así no puedo»; botón que contenga «Rearmar»; «Recordar a quien falta» / «Avisar al grupo»; «Opiniones hasta»; «El plan cambió»; «Nadie confirmó todavía»; «Una persona se retiró» | `header` (nombre y rol de quien mira), `main` (todo lo que se lee por pantalla), `h1` (clave de cada pantalla) |
| **S5 Mi respuesta** (friccion) | pestaña «Mi respuesta»; grupos «Franja A:» / «Franja B:» con «Sí puedo» / «No puedo» / «Pendiente»; «Guardar condiciones»; «Guardado. Solo tú ves estas condiciones.»; «Me interesa»; «Marcaste "Me interesa"»; «Retirarme de esta propuesta»; «Sí, no voy»; «Te retiraste» o «Gracias por avisar»; «Si te sirven los dos, ¿cuál prefieres?»; en «¿Cuándo puedes?» (Responder.tsx): encabezado «¿Cuándo puedes?», botones que empiecen con «Puedo los dos» / «Solo el» / «Solo de» / «No puedo ninguno», enlace «Todavía no sé: ver el plan», «Respuesta guardada», enlace «Ver el plan» | `fieldset` que contenga «Franja A»; `fieldset.prefiero label` |
| **S6 Agente** (agente-ia) | texto «Agente del círculo» (lo que abre el bloque); «Presupuesto este finde»; «Ojalá gratis»; «Prefiero bajo techo»; «Transporte público»; «Hasta 30 min»; «Guardar mis preferencias»; «Guardado. Nadie más ve tus preferencias.»; «Que el agente proponga»; «El agente está pensando» (desaparece al terminar); «Opciones del agente»; «hacen falta al menos N personas» | `input[id^=pref-gusta-]` (los chips de «Me gustaría») |
| **S7 Simulación e historial** (frontend) | pestaña «Historial» | — |

Si un texto cambia, lo mejor es que la pantalla acepte los dos durante la noche o que el dueño me avise con la línea; yo adapto el guion en la misma hora. Lo que mido no son los rótulos sino los toques, los segundos, las pantallas y lo que ve cada persona: con el rediseño vuelvo a correr los seis perfiles, los de psico, la enmienda 13, el propósito y los dos planes contra cada publicación, y comparo con los números de hoy (invitado: 3 toques desde el enlace; organizadora: 4 toques para crear el grupo y 5 para la propuesta).

Hallazgos abiertos de sinteticos que el rediseño puede resolver de paso (detalle arriba): **H2** (franjas primero en «Mi respuesta»), **H6** («Ya hay 4 personas con condiciones» cuenta a quien dijo No/No), **H10** («hora de Santiago (America/Santiago)»), **H12** («1 confirmaron»), **H13** (el editor de condiciones sigue a la vista tras «No voy»), **H19/H20** (la invitación y el espacio no dicen el propósito), **H21** («3 por ahora» frente a «4 personas»), **H23** («Flujo social no disponible» visible), y de la demo: «Datos ficticios» se queda (decisión), el 320 px deja «No puedo ninguno» bajo el pliegue.

## Perfiles de psico (pedido del coordinador, 20:53): guion `tests/sinteticos/psico-perfiles.mjs`

Grupo nuevo «Los del reencuentro», plan «Asado del reencuentro · solo el grupo» (la modalidad en el título, regla D3; hoy la escribe la organizadora a mano porque no hay selector). Mínimo 3. Fuente de los perfiles: `docs/psicologia-grupo.md` (§3.2, §3.4, §3.6, §3.8, §3.9, §8).

| Persona | Perfil | Qué hace | Qué se comprueba en pantalla |
|---|---|---|---|
| **Vale** | la que siempre organiza | crea el grupo **pegando la lista de una vez** (friccion), arma el plan, responde, busca la opción, confirma, repara | toques totales de quien organiza frente a los de un invitado; si ve «Tú armas el plan…», «Gracias por moverlo», «Hoy conviene recordar», «Recordar a quien falta» (psico §8.6, §8.9; `AvisoParaMi`/`RecordarFaltan` de ux-flujo, que Juan conecta); si «Nueva propuesta» ofrece «¿Dónde se juntan?» (A5) y la modalidad (A4); si la invitación de WhatsApp repite «solo el grupo» |
| **Dani** | se ofende si no van a su casa | entra, responde Sí/Sí, mira la ficha del plan, busca dónde ofrecer su casa | que ninguna pantalla compare casas ni diga «casa de Dani»; qué ve con «Anfitrión (Vale)» / «Imprescindible (anfitrión)» (elección pública de quien organiza, psico §3.2); que no haya forma de ofrecer la casa (V6, después) |
| **Ana** | no come carne, en un asado | entra, responde Sí/Sí, busca dónde decirlo en «Mis preferencias», mira la ficha del plan | que no exista el campo (V2: pendiente); que el plan **no diga nada** que la delate ni «hay un vegetariano»; si dice «Habrá opción sin carne» (A1: pendiente de agente-ia); orden de «Me gustaría» (apertura `0e03b8a`) |
| **Beto** (320 px) | va con pareja a una juntada «solo el grupo» | entra, responde Sí/Sí, mira el plan | que ninguna pantalla pregunte género ni pareja (revisor `psico-genero-pareja`); que «solo el grupo» se lea como regla de la ocasión y no quede solo en el título; que no haya «vengo con alguien» (V7, después) |
| **Flor** | se baja por un mal momento | entra, responde Sí/Sí, confirma la versión 1 (el grupo llega a 3), se baja | qué le dice la app al bajarse («Gracias por avisar. No hace falta contar por qué.», psico §8.1 / E13 c); qué ven Vale, Dani, Ana y Beto: con nombre y «había confirmado» (H14, hoy) o «Una persona se retiró» (E13 c); historial |
| **Pili** | nunca abre el enlace | nada | sigue «por entrar»; nunca cuenta |

Fugas que se revisan en cada pantalla ajena: Ana + comida, Beto + pareja, «casa de Dani», y la baja de Flor con nombre.

**Resultado (producción, 22:17–22:18, grupo «Los del reencuentro», sin errores del guion; capturas en `tests/sinteticos/capturas/2217/`):**

| Persona / tema | Qué se vio | Lectura |
|---|---|---|
| Vale crea el grupo | **4 toques** (antes 8): la lista de 5 nombres se pega de una vez («Agregar» una sola vez); 7 s | friccion, ✔ |
| Vale, la propuesta | Atajos nuevos (Pádel, Tenis, Cena, Cine, Cumple, Asado, Básquet, Bar, Bowling o escape room, Juegos de mesa, Película en casa, Café o brunch, Cerro, Picnic en el parque, Museo o feria, Fútbol, Juntada); «Si sirven las dos, gana la A.» sigue; sin ayuda «¿Dónde se juntan?» ni selector de «quién viene» (la modalidad solo va en el título que escribe ella) | A4/A5 de psico no conectados; la regla «solo el grupo» no llega al texto de la invitación de WhatsApp |
| Vale, aviso personal | ✔ conectado (`AvisoParaMi`): «Primero marca tu disponibilidad… Eres quien no puede faltar: si se busca la opción antes de que respondas, no va a haber ninguna.»; «Si no llegan 3, nadie queda comprometido. Tu confirmación solo vale si llegan 3…»; «Se armó la juntada · Gracias por moverlo.» | ✔ psico §8.6/§8.9 |
| Vale, recordar | ✔ conectado (`RecordarFaltan`): «Avisar al grupo · Recordar a quien falta · Copiar mensaje. El mensaje va a todo el grupo: no nombra a nadie ni dice cuántos faltan.» | ✔ responde la pregunta «¿cómo se enteran los que no abrieron?» con un mensaje listo, no un aviso automático |
| Dani (casa) | «Imprescindible (anfitrión) Vale» y «Cupo del anfitrión» sigue en un plan de asado entre amigos: no hay «casa de X» en ninguna pantalla; no hay dónde ofrecer la casa (V6, después) | sin fuga; «anfitrión» ya no es solo un problema de fútbol: también lo ve Dani en un asado |
| Ana (sin carne) | Las preferencias no tienen comida (V2 pendiente); el plan no dice «habrá opción sin carne» (A1 pendiente de agente-ia); ningún texto de la propuesta la delata ni nombra a nadie | sin fuga, y sin forma de decirlo: el hueco sigue |
| Beto (pareja, «solo el grupo», 320 px) | Ve «solo el grupo» solo porque está escrito en el título («Asado del reencuentro · solo el grupo»); no hay frase de regla («Esta vez es solo el grupo.»); nadie le pregunta por pareja ni género; no hay «traer a alguien» (V7) | sin fuga y sin exposición; la regla queda como parte del nombre del plan |
| Flor (se baja) | Ve «Gracias por avisar. No hace falta contar por qué.»; luego «Te retiraste de esta propuesta»; el editor de condiciones queda a la vista con «Guardar» apagado (H13) | ✔ texto de psico; H13 sigue |
| Los demás ven la baja | «**Cambió el plan.** Una persona se retiró. Falta 1 para el mínimo. Si sale una versión nueva, las confirmaciones anteriores no cuentan: si esa te sirve, la confirmas.»; el historial dice «Una persona se retiró (versión 1)» **sin nombre** y la aceptación de Flor desaparece de la lista (E13 c y `1ba3185`); «2 confirmaciones en total · 1 baja» | ✔ **H14 resuelto** |
| Quien mira la órbita (DECIDIDO 22:27: se queda; límite declarado en la enmienda 13, apertura lo suma a la respuesta del jurado) | El nodo de Flor se queda gris «Sin confirmar» como el de Pili y Ana; pero el anillo naranja de «Confirmó» que tenía Flor desaparece entre una pantalla y la otra: quien mire en vivo puede ver **quién** cayó | límite de diseño de la órbita (es público quién confirmó), no un defecto de la baja; se anota para la pregunta del jurado |
| Reparación | v2 empieza de cero («Si no llegan 3, nadie queda comprometido…»); «El plan cambió: versión 1 → versión 2 · Sábado 31 oct 20:00 → Sábado 31 oct 20:00» (H8 sigue) | |
| Pili | «por entrar» hasta el final | ✔ |

Fugas revisadas en cada pantalla ajena (Ana + comida, Beto + pareja, «casa de Dani», baja de Flor con nombre): **ninguna**. El revisor de género y pareja no encontró «novia/pareja/mujeres/chicos» en ninguna pantalla compartida.

## Enmienda 13, «Así no puedo, pero sigo»: guion `tests/sinteticos/asi-no-puedo.mjs`

Grupo nuevo «Los del cerro» (Vale, Joaco, Renata, Gonza, Pili), plan «Subida al cerro», mínimo 3. Versión 1 (sábado) con Vale, Joaco y Gonza; Vale confirma (1 de 3). Gonza dice «así no puedo, pero sigo», cambia su sábado a No (el domingo sigue Sí); Joaco hace lo mismo (con dos opiniones el total le llega a la organizadora); Vale prueba opinar habiendo aceptado (debe rechazarse: `ya_acepto`); Vale rearma con lo nuevo; versión 2 (domingo) con cero aceptaciones y cero opiniones heredadas; Renata y Joaco miran plan e historial: nadie ve quién opinó; Gonza confirma la versión 2 (no quedó como baja); el grupo se confirma.

Si la interfaz todavía no tiene los botones («Así no puedo, pero sigo» en Mi respuesta, «Rearmar con lo nuevo» para la organizadora), esos dos pasos se hacen por RPC con la sesión que esa persona ya tiene en su navegador (sin abrir otra) y quedan como hallazgo para front-juan. Si la RPC `opinar_version` no existe, el guion lo dice y sale sin fallar.

**Resultado (producción, 22:55–22:56; la primera vez, a las 22:45, el guion se cortó por un paso mío: el atajo «Paseo» ya no existe). La enmienda 13 anda de punta a punta:**

| Paso | Qué pasó | |
|---|---|---|
| Gonza opina «así no puedo» sobre la v1 | `opinar_version` aceptada; Gonza **sigue en el plan, no figura como baja** y vuelve a poder editar su disponibilidad | ✔ |
| Gonza cambia su sábado a «No puedo» | guardado (el editor ya no dice «tu disponibilidad no puede cambiar mientras esté vigente») | ✔ |
| Gonza mira su Plan | «**Así no puedes, pero sigues** · Marcaste que así no puedes. Sigues en el plan: si se rearma, cuenta lo que marques ahora.» + «Actualizar cuándo puedo · Editar día por día en Mi respuesta · Volver a «puedo»» | ✔ |
| Vale (que ya confirmó) intenta opinar | rechazado: «Ya confirmaste esta versión. Si no puedes ir, primero retírate.» (`no_autorizado/ya_acepto`) | ✔ |
| Vale ve el total | «**Algunos no pueden así.** 2 personas marcaron que así no pueden. Puedes rearmar con lo nuevo: la versión 2 usa la disponibilidad actualizada y empieza sin confirmaciones…» + «Rearmar con lo nuevo» + «Se puede rearmar hasta la versión 3.»; próxima acción: «Algunos no pueden así: puedes rearmar con lo nuevo.» Sin nombres | ✔ |
| Vale rearma (botón) | **versión 2 el domingo** («Sábado 31 oct 20:00 → Domingo 1 nov 20:00»), «Nadie confirmó todavía: empieza de cero», «Se confirma con 3 confirmaciones de esta versión, entre ellas la de Vale»; la v1 dice solo «Vale había confirmado»; **no hereda opiniones** | ✔ |
| Renata mira plan e historial | Historial: «2 versiones publicadas · 1 confirmación en total · 0 bajas»; «Se publicó la versión 2 como alternativa; ninguna aceptación anterior cuenta»; **ninguna opinión ni nombre** | ✔ |
| Gonza, Joaco y Vale confirman la v2 | «Grupo confirmado en la versión 2» · «Confirmaron 3 de 3: Gonza, Joaco, Vale. ¡Se juntan!» | ✔ |

Hallazgos nuevos de esta corrida (pedidos en la ficha):
- **H16 (media, front-juan):** en «Mi respuesta», Gonza lee «Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo»…» y «Si solo esta fecha no te sirve, usa "Así no puedo, pero sigo"», pero **el botón no está ahí**: vive en la pestaña Plan, junto a «Confirmar versión». Quien lee la instrucción en Mi respuesta no encuentra qué tocar; falta un enlace «Ir al plan» o el botón repetido.
- **H17 (RESUELTO 22:58: apertura lo declaró en `docs/preguntas-jurado.md` S5b, `9e606e1`) (media, apertura / límite a declarar):** con **3 personas elegibles** y 2 opiniones, quien organiza (que es una de las tres y ya confirmó) sabe exactamente quiénes opinaron: «2 personas marcaron que así no pueden» + «yo confirmé» = los otros dos. El umbral «solo desde 2» protege el caso de 1 y no el de grupos de 3. No es un defecto a arreglar (cierre de funciones); sí una frase para la pregunta del jurado sobre privacidad: «en grupos chicos el total puede deducirse; nunca dice quién».
- **H18 (RESUELTO: «Dijiste: así no puedo, pero sigo», en producción desde `22ae202`) (baja, front-juan):** el título «Así no puedes, pero sigues» habla en segunda persona mientras el botón dice «Así no puedo, pero sigo»; leerlo como respuesta de uno mismo («Dijiste: así no puedo, pero sigo») sería más claro.

**Verificado y sin hallazgo:** nadie ve quién opinó (ni Vale, ni Renata, ni el historial); la opinión no cuenta como baja; la v2 no hereda aceptaciones ni opiniones; el tope de 3 versiones está declarado.

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

## Hallazgos de la corrida de las 19:40 (build de `wip/fundamentos` `95def89`, contra la base)

Corrida completa, sin errores del guion: crear grupo, 5 invitados, v1, confirmaciones, baja de Gonza, En revisión, v2. Capturas en `tests/sinteticos/capturas/1940/`. El camino de un toque de friccion (#88) todavía no está en este build.

### Números por persona (de abrir el enlace a la primera respuesta guardada)

| Persona | Ancho | Toques | Pantallas | Segundos de máquina |
|---|---|---|---|---|
| Joaco (apurado) | 320 px | 7 (nombre, «Sí, soy», tarjeta del plan, pestaña «Mi respuesta», Sí, Sí, Guardar) | 5 | 6,2 |
| Renata | 375 px | 7 | 5 | 6,7 |
| Bruno (solo franja A) | 375 px | 6 | 5 | 7,0 |
| Gonza («Me interesa» + 2 franjas) | 375 px | 8 | 5 | 6,7 |
| Joaco confirma desde la portada | 320 px | 2 (tarjeta «Tu plan», «Confirmar versión 1») | 2 | 2,6 |
| Vale crea el grupo con 5 nombres | 375 px | 8 | 3 | 8,9 |

Una persona real tarda más que la máquina (leer, buscar con el dedo): 7 toques son del orden de 15 s, no 10.

### ALTA

**H1. Bruno queda fuera de la versión 1 y la app no le dice por qué ni qué hacer.** Paso: Bruno contesta solo la franja A y guarda («Guardado. Solo tú ves estas condiciones.»); Vale busca la opción; Bruno abre «Plan». Ve: «No formas parte de las personas que pueden aceptar esta versión.» y en «Mi respuesta», solo la etiqueta «Incompletas». No ve «te falta la franja B». Entra de nuevo recién cuando completa la B y Vale busca alternativa (lo hizo y quedó en la versión 2). Captura: `bruno-06`, `bruno-09`, `bruno-10`. → front-juan (texto de `PlanTab`/`RespuestaTab` para `condiciones = incompletas`), backend (`siguiente_accion` para quien tiene condiciones incompletas: «Completa la franja B para entrar»).

**H2. El invitado llega a lo que no necesita.** Paso: enlace → su nombre → «Sí, soy Joaco» → espacio. Ve el código de invitación con Compartir/Copiar/WhatsApp y un aviso; el plan queda debajo del pliegue (a 320×640, apenas el título «Propuestas»). En «Mi respuesta» las franjas quedan después de la nota de privacidad y la tarjeta de interés, a más de una pantalla de scroll. Captura: `joaco-03`, `joaco-05`. → friccion (#88 «Responder» lo resuelve para el enlace; falta para quien llega después), front-juan (ordenar «Mi respuesta»: franjas primero; esconder el código de invitación a quien no organiza).

### MEDIA

**H3 (CERRADO por decisión del coordinador, 19:44: el chip se queda, el jurado tiene que verlo). «Datos ficticios» en todas las pantallas de un grupo real.** Vale, Joaco… lo ven en el encabezado desde la portada. Un amigo duda de si su respuesta vale. → front-juan (`App.tsx` es de friccion: pedirle que lo muestre solo en demo).

**H4 (arreglado por friccion en `2b9650d`, a verificar en la próxima corrida). «Luna» y «persona simulada» en la pantalla «¿Quién eres?» de un grupo real.** En «Unirme con un código»: «Si usas el nombre de una persona simulada de la demo (por ejemplo "Luna"), reclamas su lugar.» Lo ve cada invitado (`joaco-01`). → friccion (`src/login/QuienEres.tsx`): mostrarlo solo si el grupo es demo.

**H5. Poner presupuesto y techo exige elegir una actividad.** Bruno encuentra «Agente del círculo» (plegado al final del espacio), marca «Ojalá gratis» y «Prefiero bajo techo»; «Guardar mis preferencias» queda apagado hasta que marque al menos una actividad («Marcá al menos una»). Fue en 6 toques porque el guion sabía dónde estaba; ningún texto de «Mi respuesta» lo menciona (pedido ya hecho por ux-flujo a front-juan y friccion). Captura: `bruno-07`. → agente-ia (`AgentePanel`: permitir guardar sin actividades).

**H6. Quedan «Con condiciones 4» aunque solo 3 pueden.** Renata dijo «No puedo» en las dos y cuenta como condiciones completas; Vale ve 4 y «Ya hay 3 personas con condiciones» y no puede saber que una de ellas no va. → backend/front-juan: decir «3 pueden» o contar solo con al menos un Sí (sin decir quién).

**H7 (decidido por ux-flujo 20:43: un Sí no se vuelve interés público porque haría públicas las condiciones; a quien organiza el centro dirá «N respondieron»). «Me interesa» separado de la respuesta.** Joaco, Renata y Bruno contestaron las franjas; el grupo ve «2 con interés» (Vale y Gonza) y a Joaco como los demás. Sí puedo no suma interés. Es la duplicación que friccion saca con #88. A comprobar cuando entre.

**H8. La reparación dice «Sábado → Sábado».** Tras la baja de Gonza, «Buscar alternativa» publica la versión 2 en la misma franja (con Bruno adentro); el cartel «El plan cambió: versión 1 → versión 2 · Sábado 31 oct 20:00 → Sábado 31 oct 20:00» no explica qué cambió (cambió la gente, no la fecha). Captura: `vale-15`. → front-juan: «Misma fecha; cambió quién va».

**H9. «Anfitrión» en una cena donde nadie recibe.** «Anfitrión (Vale)», «Cupo del anfitrión reservado», «perdió al anfitrión». → front-juan / apertura.

### BAJA

- **H10.** «hora de Santiago (America/Santiago)» (`vale-08`): un grupo en otra ciudad lo toma por error. → front-juan.
- **H11.** «Asado», «Fiesta», «Bar» entre las actividades de «Me gustaría» de Bruno, y «Los del finde» en el ejemplo del título del grupo: son del catálogo, ya ampliado con cena, cine, cultura, etc. Nada que hacer salvo el orden. → apertura.
- **H12.** «1 confirmaron» (singular mal). → front-juan.
- **H13.** Gonza: tras «No voy» la página sigue mostrando el editor de condiciones con «Completas» y un «Guardar condiciones» apagado: queda abierta una pantalla que ya no sirve. → front-juan.
- **H14 (RESUELTO en producción, 22:18: «Una persona se retiró», sin nombre; enmienda 13 c).** La baja era pública con nombre y «había confirmado» («Gonza se bajó (versión 1) · había confirmado», visible para Joaco y Vale). Es por diseño; para quien se baja por un mal momento es lo más expuesto de toda la app. → decisión de Nico (¿mostrar solo «una persona se bajó»?).

### Lo que anduvo bien

- Privacidad: en el teléfono de Vale, Joaco, Renata y Gonza no apareció nada de las condiciones ni de las preferencias de Bruno (presupuesto, techo, franja incompleta): revisión automática, sin fugas.
- Silencio: Pili nunca abrió el enlace y siguió «por entrar»; no cuenta para nada ni se la trata como asistente.
- Interés no es confirmación: «Marcaste "Me interesa". Esto no es una confirmación.» y el cuadro «Con interés 2 / Confirmados 0» son claros.
- Reparación: v2 empezó con 0 confirmaciones, con el cuadro «versión 1 → versión 2 · Estas confirmaciones no pasan a la versión 2».
- Un toque de ida y vuelta: Joaco confirmó desde la portada en 2 toques (tarjeta «Tu plan» y «Confirmar versión 1»).

## Corrida de las 20:06: build integrado (qué mejoró y qué no)

Build local: `wip/fundamentos` + `wip/friccion` + `wip/ux` + `wip/agente-ia` + `wip/front-juan` (merge sin conflictos, sin publicar), contra la base ya con 0035–0039. Capturas en `tests/sinteticos/capturas/2006/`. Sin fugas de privacidad de Bruno en los teléfonos de los demás.

| Persona | 19:40 | 20:06 | Cambio |
|---|---|---|---|
| Joaco (320 px) | 7 toques, 6,2 s | **3 toques**, 5,6 s (nombre, «Sí, soy Joaco», «Puedo los dos días») | de 8 a 4 contando el enlace (#88 de friccion) |
| Renata | 7 toques | **3 toques** («No puedo ninguno») | idem |
| Gonza («Me interesa» + 2 franjas) | 8 toques | **4 toques** (la tarjeta «¿Avisar al grupo que te interesa?» lo ofrece después) | idem |
| Bruno (no sabe la franja B) | 6 toques | 6 toques: «Todavía no sé: ver el plan» → «Mi respuesta» → A → Guardar | sin cambio: el camino de un toque no sirve a quien no sabe |
| Joaco confirma desde la portada | 2 toques | 2 toques | igual |

Qué mejoró:
- **H2 (en parte)**: el enlace lleva directo a «¿Cuándo puedes?» (títulos claros: «Puedo los dos días», «Solo el sábado 31 oct · el domingo queda como No», «No puedo ninguno · Puedes cambiarlo después»). Ya no pasa por el código de invitación.
- **H4**: la nota «Luna…» ya no sale en «¿Quién eres?» de un grupo real.
- **H1 (en parte)**: «Próxima acción» de Bruno dice «Completa tu disponibilidad para poder entrar en la opción.» (enmienda 12 de backend, f896112). Pero en la misma pantalla sigue «No formas parte de las personas que pueden aceptar esta versión.», que contradice y no dice cómo entrar. → front-juan: ocultar esa línea cuando las condiciones están incompletas.
- Tras guardar, la tarjeta ofrece «Contar mis gustos y presupuesto (opcional, privado)» (pedido de ux-flujo). Falta probar su destino.
- «Recordar a quien falta» ya dice «si todavía no respondiste…» (ux-flujo, `7347913`); no la muestra ninguna pantalla todavía en este build.

Qué no mejoró (sigue abierto): H5 («Marcá al menos una» bloquea guardar presupuesto/techo; voseo; las preguntas nuevas de la enmienda 10 dicen «movés», «viajás»), H6 («Ya hay 4 personas con condiciones» cuenta a Renata, que no puede), H7 (Joaco respondió y el grupo ve «2 con interés»: solo Gonza y Vale tocaron el botón), H8 («Sábado 31 oct 20:00 → Sábado 31 oct 20:00»), H9–H13, H14.

Nuevo en esta corrida:
- **H15 (media)**: en la enmienda 10 la zona solo tiene 8 comunas de Santiago y «Necesito que me lleven» es muy directo; ya anotado a agente-ia. Con 6 amigos y la regla de 4 personas, nunca aparece «Queda a menos de N minutos» en un grupo real de 6 donde no todos cargaron zona.

## Enmienda 14, propósito del grupo (producción `d978cc1`, 23:45; guion `tests/sinteticos/proposito-grupo.mjs`; capturas en `capturas/2347/`)

Grupo nuevo «Los del fútbol» (Teo organiza; Lalo, Maca y Rufi; Rufi nunca abre el enlace). El pedido de Nico: un grupo «para jugar fútbol» solo recibe propuestas de deporte.

| Qué se comprobó | Qué pasó |
|---|---|
| Crear el grupo | El formulario pregunta «¿Para qué es este grupo?» (Libre por defecto: «Cualquiera del grupo puede proponer lo que quiera») y «¿Quién viene?» (Sin definir / Solo el grupo / Con parejas / Abierta). Teo lo hizo en 6 toques (nombres pegados, «Fútbol», «Solo el grupo», «Crear grupo»); al elegir dice «Las propuestas de este grupo serán de este tipo de plan (deporte)» y «En la invitación dirá: …» |
| Nombre del grupo | Queda «Los del fútbol · solo el grupo» (la regla viaja en el nombre) |
| «¿Quién eres?» de Lalo | «en «Los del fútbol» · **Esta vez es solo el grupo. Este grupo es para jugar fútbol.**» ✔ |
| La invitación de WhatsApp (botón del espacio) | «Súmate a «Los del fútbol» en CRUXE… **Esta vez es solo el grupo.** Sin cuenta ni contraseña…»: lleva la regla pero **no dice «para jugar fútbol»** (H19, abajo) |
| Atajos de «Nueva propuesta» | Solo **Fútbol, Pádel, Tenis, Básquet**: no se ofrece «Asado»; el servidor no necesita rechazar nada porque la interfaz no deja elegirlo (el rechazo «Este grupo se armó para otro tipo de plan…» no se pudo provocar desde la pantalla) |
| «No puede faltar» | ✔ sin «anfitrión» (el parche 2 cambió el texto en el formulario y en el plan) |
| Propuesta de deporte (Pádel, distinto del propósito puntual) | creada y abierta ✔ |
| «Me gustaría» (las preferencias) | Lalo, Maca y Teo ven solo **Pádel, Fútbol, Tenis, Básquet** ✔ (así «me interesa más pádel» queda dentro del tipo de plan, sin votación) |
| Voseo | «Cómo te mueves», «Hasta cuánto viajas», «Marca al menos una»: ya en tuteo ✔ (H5 en lo del voseo) |
| El agente con 3 personas reales y fútbol pidiendo 10 | **Leído a las 00:27 (una segunda llamada):** ver la sección «El agente con quórum» abajo |

- **H19 (baja, front-juan):** la invitación del botón del espacio no incluye «para jugar fútbol» aunque `textoInvitacion` ya acepta el propósito (`src/lib/compartir.ts`): `Espacio.tsx` lo llama solo con nombre y código. «¿Quién eres?» sí lo dice. Con el texto de la invitación en el chat de WhatsApp, quien lo recibe se entera de la regla pero no del propósito.
- **H20 (baja, front-juan):** el espacio del organizador no recuerda para qué es el grupo ni la regla fuera del nombre: tras crearlo, la pantalla no dice «Este grupo es para jugar fútbol» (solo está el nombre con la marca). Nico pidió poder mostrarlo al jurado creando «Los del fútbol» en vivo; hoy el propósito se ve en «Nueva propuesta» (los atajos) y en «¿Quién eres?».

## El agente con quórum (producción `d978cc1`, 00:27; `proposito-grupo.mjs`; captura `capturas/0026/`)

Grupo «Los del fútbol · solo el grupo»: Teo, Lalo y Maca reales (con preferencias de deporte guardadas) y Rufi pendiente («por entrar»). Nico pidió que el agente no proponga fútbol a pocas personas sino algo parecido que sí alcance. **Pasó exactamente eso:**

> «**Para Fútbol hacen falta al menos 10 personas; este grupo tiene 3 por ahora. Estas opciones se pueden armar con el grupo actual. Cuando se sumen más, vuelve a pedir una propuesta.**» — «Opción para 3 personas · Tenis · Canchas de tenis del club (SIMULACIÓN) · Recomendada por el agente». Mensaje para el grupo: «Hola equipo, propongo tenis en parejas en las canchas del club: sábado 31 de 09:30 a 11:30 o domingo 1 de 09:30 a 11:30. Para fútbol se necesita un grupo más grande, pero esto se arma con los que somos. Marquen si les interesa y carguen su disponibilidad.»

Lo que se comprobó: solo deporte en las opciones ✔; sin nombres ni preferencias de nadie en el texto ✔ («Lo redactó la IA, que solo vio las opciones válidas, el clima y totales del grupo: nunca lo que puso cada uno»); «Usar esta opción» sigue sin crear nada («Primero revisas el plan, después lo apruebas y, en otro paso, publicas las invitaciones. Nadie queda confirmado.») ✔.

Hallazgos de esta llamada (pedidos en la ficha):
- **H21 (media, front-juan/pendientes):** «este grupo tiene 3 por ahora» contradice lo que ve el organizador arriba: «4 personas» (Rufi «por entrar» no cuenta como persona del quórum, por regla del servidor). Decir «3 que ya entraron» o «3 personas que ya están en el grupo».
- **H22 (a verificar, agente-ia):** el clima de la propuesta dice «Sábado con lluvia, máxima 20°. Domingo con lluvia» y la única opción es **tenis al aire libre** (las canchas del club no están techadas). La explicación dice «plan activo pero relajado para la mañana» y no menciona la lluvia. En el demo se usa «Simular sol», así que no afecta la demo; en un grupo real propondría jugar tenis bajo la lluvia. Si el filtro de lluvia solo actúa con «Prefiero bajo techo», decirlo; si debía filtrar, es un defecto.
- **H23 (baja, codex-juan/agente-ia):** al final de la opción aparece un bloque «**Flujo social no disponible** · No pudimos confirmar que el servidor admita este recorrido. No se enviará una preparación. Comprobar servicio · Preparar borrador social» (la función v13 todavía no está desplegada). Es un estado de error visible al jurado en la pantalla del agente: ocultarlo mientras no esté disponible o suavizar el texto.
- **H19 y H20** siguen: la invitación de WhatsApp lleva la regla pero no «para jugar fútbol», y el espacio del organizador no repite el propósito.

## Enmienda 15, dos planes con nombre y «la que pueden más» (producción `22ae202`, 02:10; guion `tests/sinteticos/dos-planes.mjs`; capturas en `capturas/0210/`)

Grupo nuevo «Los de la terraza»: Mara organiza con dos planes con nombre («Asado en el parque» el sábado, «Cine y pizza» el domingo) y regla «La que pueden más»; Teo (320 px) y Lola pueden los dos y prefieren «Cine y pizza»; Nano solo puede el sábado; Pipo nunca abre el enlace. Mínimo 3.

| Qué se comprobó | Qué pasó |
|---|---|
| Nueva propuesta | «Nombre de este plan (opcional)» en cada opción ✔; «Más opciones» (plegado) con «Sin ronda / 2 h / 12 h / 24 h» y «La que empieza antes / La que pueden más» ✔; el texto de arriba cambia a «Si sirven las dos, gana la que pueden más personas (lo cuenta el servidor).» ✔ |
| Mi respuesta | «Si te sirven los dos, ¿cuál prefieres?» aparece **solo con las dos en Sí** (Mara no lo vio antes de responder; sí después) y ofrece los nombres de los planes como opciones ✔; «Opcional y privado: solo desempata si los dos planes los pueden los mismos.» ✔; Teo y Lola guardaron su preferencia ✔ |
| Lo que ve quien organiza antes de buscar | «Cómo viene cada plan · Franja A: pueden 3 · Franja B: pueden 2 · la prefieren 2 · Solo lo ves tú, sin contarte a ti y sin decir quién. El servidor elige.» ✔ (los números son correctos: A = Teo, Lola, Nano; B = Teo, Lola) |
| Lo que ven los demás | Teo y Nano no ven totales ni preferencias ✔; ninguna pantalla ajena nombra a quien prefiere qué ni a quien solo puede un día ✔ (fugas: ninguna) |
| La opción publicada | Gana **A, «Asado en el parque»** (3 pueden) aunque B es la preferida de 2 ✔ (la regla cuenta quiénes pueden; la preferencia solo desempata); la etiqueta aparece en «Opción vigente · Asado en el parque» ✔ |
| «Así no puedo» y confirmar | Teo tiene el botón y confirmar sigue abierto ✔ |
| Ronda de 2 h (E-c) | **Verificada a las 02:24** (segunda corrida): en Revisar, «Ronda de opiniones · 2 h después de publicar cada versión (nunca después del cierre)»; al publicar, todos ven «**Opiniones hasta sáb 24 oct, 04:24** (hora de Santiago). Mientras tanto no se rearma; confirmar sigue abierto.» (2 h exactas después de publicar); Teo dice «así no puedo» (texto «Dijiste: así no puedo, pero sigo», H18 ya publicado); Mara **no ve «Rearmar»** con la ronda abierta y sí puede confirmar ✔ |
| Toques | Mara: 4 para el grupo (lista pegada); Teo, Lola y Nano: 3 desde el enlace; la preferencia cuesta 2 toques más (ir a «Mi respuesta», elegir, guardar) |

Hallazgos nuevos (pedidos en la ficha):
- **H24 (media, friccion S5 / ux-flujo):** la pantalla de un toque «¿Cuándo puedes?» **no muestra los nombres de los planes**: con «Asado en el parque» y «Cine y pizza» cargados, Teo leyó «Puedo los dos días · Sábado 31 oct y Domingo 1 nov», «Solo el sábado 31 oct», «Solo el domingo 1 nov». Responde sin saber qué es cada uno. Y ese camino **no ofrece «¿cuál prefieres?»**: con «la que pueden más», quien responde por el enlace (el 100 % de los invitados) nunca desempata; solo quien entra a «Mi respuesta». Captura `capturas/0210/teo-03-responder-en-un-paso.png`.
- **H25 (baja, límite ya declarado):** con 4 que entraron, «pueden 3 / pueden 2 · la prefieren 2» deja deducir cosas en un grupo chico; es el mismo límite que H17 y lo cubre la frase de `preguntas-jurado.md` S5b («en grupos chicos el total puede deducirse; la app nunca dice quién»).
- **Observación (baja, ux-flujo):** después de publicar, la «Ficha del plan» queda plegada y «Gana la que pueden más personas» deja de verse; para el jurado conviene que la regla se lea junto a la opción vigente («Ganó porque la pueden más»).

## Qué mejoró con el parche 2 (producción `d978cc1`, 23:46–23:50)

| Hallazgo | Estado hoy |
|---|---|
| **H9** «Anfitrión» en un plan de fútbol/asado | **RESUELTO**: «No puede faltar (Vale)», «Cupo reservado para Vale (no puede faltar) hasta que confirme. Libres para el resto: 5.»; el formulario también dice «No puede faltar» |
| **H16** «Mi respuesta» manda al botón que está en Plan | **RESUELTO**: «Ir al plan» bajo la frase |
| **H18** título de «Así no puedes, pero sigues» | **RESUELTO**: «Dijiste: así no puedo, pero sigo» |
| **H1** Bruno fuera de la v1 | **MEJOR**: «Esta versión no te incluye · Se armó sin tu disponibilidad completa. Si la completas, cuenta si el plan se rearma. Ir a Mi respuesta» |
| **H5** voseo de las preguntas nuevas | **RESUELTO el voseo** («Marca al menos una»); sigue exigiendo marcar una actividad para guardar presupuesto/techo |
| Baja en el historial | «Una persona se retiró.» también en la comparación v1 → v2 ✔ |
| **H6** «Ya hay 4 personas con condiciones» (cuenta a quien dijo No/No) | sigue (decisión de Nico: después de la demo) |
| **H8** «Sábado 31 oct 20:00 → Sábado 31 oct 20:00» | **RESUELTO en `44e6de6`**: «Misma fecha y hora; cambió quién puede ir.» |
| **H10** «hora de Santiago (America/Santiago)», **H12** «1 confirmaron», **H13** editor visible tras «No voy» | siguen |

## Corridas

| Hora | Contra | Resultado |
|---|---|---|
| 19:28 | build `95def89` (parcial: el guion se cortó al confirmar Gonza; corrió durante MIGRACION EN CURSO) | descartada |
| 19:40 | build `95def89`, base libre | completa; hallazgos H1–H14 |
| 02:23–02:29 | **PRODUCCIÓN** `22ae202` | `dos-planes` otra vez (ronda E-c verificada: «Opiniones hasta … 04:24», sin «Rearmar» con la ronda abierta), `asi-no-puedo` (23/23 verdaderas) y `psico-perfiles` (sin hallazgos nuevos; «Dijiste: así no puedo» y «Misma fecha y hora; cambió quién puede ir» ya en producción). `proposito-grupo` (sin agente) en cola detrás de rincones |
| 02:10–02:13 | **PRODUCCIÓN** `22ae202` (la demo se llama «Los del finde») | `dos-planes` (nuevo, E15): dos planes con nombre, «la que pueden más», «¿cuál prefieres?» y totales solo a quien organiza, sin fugas (ronda sin probar por mi selector; arreglado). `seis-amigos` completo: Joaco 3 toques (4,0 s), Renata 3, Gonza 4, Bruno 6, Joaco confirma en 2. Corrida cortada después por pedido de pendientes (0055): «así no puedo», psico y propósito quedan para después de su migración |
| 01:42–01:43 | **PRODUCCIÓN** `44e6de6` (v13, «Novedades» fuera, CSS de 320 px, fricción y arreglos de Juan) | `seis-amigos` completo, sin errores del guion ni fugas: Joaco 3 toques (4,7 s, 320 px), Renata 3, Gonza 4, Bruno 6, Joaco confirma en 2. **H8 resuelto**: la reparación dice «Misma fecha y hora; cambió quién puede ir.». Nuevos textos buenos: «Faltan por confirmar 3 personas», «6 personas (1 por entrar)» y la tarjeta «Invita a tu grupo · Por ahora entraron 5 · Faltan por entrar: Pili» (para quien nunca abre el enlace). Corrí antes de mi turno por un error de mi cola (empezó justo al liberarse la 0053): se terminó esa corrida de 1 minuto y no lancé más |
| 00:26–00:27 | **PRODUCCIÓN** `d978cc1` | `proposito-grupo` otra vez, esta vez esperando al agente: el texto de quórum sale como pidió Nico (arriba); H21–H23 nuevos |
| 23:45–23:50 | **PRODUCCIÓN** `main` `d978cc1` (parche 2 de pantallas + enmienda 14 visible) | cuatro guiones completos, sin errores del guion y sin fugas: `proposito-grupo` (nuevo), `seis-amigos` (Joaco 3 toques, Renata 3, Gonza 4, Bruno 6), `asi-no-puedo` (22/22 verdaderas y las dos «falsas» son lo esperado: nadie ve nombres) y `psico-perfiles`. La llamada del agente en `proposito-grupo` se leyó antes de que terminara de pensar (mi guion): pendiente repetirla |
| 23:06–23:11 | **PRODUCCIÓN** `main` `8f27c5b` (enmienda 14 completa, 0048–0050) | las tres corridas completas, sin errores del guion y sin fugas: **`asi-no-puedo` ahora con los BOTONES** («Así no puedo, pero sigo» y «Rearmar con lo nuevo», sin RPC de respaldo; las 23 comprobaciones en orden, v2 el domingo, nadie ve quién), `seis-amigos` (Joaco 3 toques, Renata 3, Gonza 4, Bruno 6, Joaco confirma en 2) y `psico-perfiles` (Vale 4 toques para crear el grupo, el resto 3). El plan en revisión dice «La versión 1 ya no reúne lo necesario para juntarse» (neutro) pero la «Próxima acción» del servidor todavía dice «…el plan ya no cumple el mínimo o la presencia del anfitrión». **H16 y H18 todavía no están en producción** (`73ab15e` de friccion y el enlace de front-juan no se publicaron); H17 ya está en `preguntas-jurado` |
| 22:17–22:20 | **PRODUCCIÓN** (con el parche de pantallas y la enmienda 13) | `psico-perfiles` completo (Vale 4 toques para crear el grupo, Dani/Ana/Beto/Flor 3 toques cada uno) y `seis-amigos` completo (Joaco 3, Renata 3, Gonza 4, Bruno 6, Joaco confirma en 2). Sin fugas. **H14 resuelto**: la baja sale como «Una persona se retiró» |
| 20:41 y 20:43 | build integrado local (+ apertura `0e03b8a`), base recién liberada tras la 0041 | 20:41: Renata no recibió «Respuesta guardada» en 20 s y vio «No se pudo cargar la lista del grupo: El servidor tarda en responder» (un tiempo del servidor justo después de la migración). 20:43: repetida, completa y sin fallas (Joaco 3 toques, Renata 3, Gonza 4, Bruno 6). Un solo caso: no lo trato como defecto, pero si vuelve a verse en producción va a backend |
| 20:26 | **PRODUCCIÓN** https://cruce-senales.vercel.app (`main` `7f2423e`) | completa, sin fugas, mismos números que el build integrado: Joaco 3 toques (4,2 s), Renata 3, Gonza 4, Bruno 6, Joaco confirma en 2. Solo 3 hallazgos automáticos (todos bajos: «asado», «hora de Santiago», «anfitrión») |
| 20:12 | mismo build integrado, rehecho con `b8e19ae` (enmienda 12 b), friccion `05e148d` | completa, sin fugas; Joaco 3 toques (3,5 s), Renata 3, Gonza 4, Bruno 6. **H1 cerrado en lo importante**: Bruno lee «Tu disponibilidad está incompleta: no entraste en esta versión. Si la completas, cuenta si el plan se rearma.» (queda además la línea repetida «No formas parte de las personas…», menor) |
| 20:06 | build integrado local (fundamentos + friccion + ux + agente-ia + front-juan), base con 0035–0039 | completa; Joaco 3 toques; H1 y H4 en parte arreglados |
