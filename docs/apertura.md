# Apertura: CRUXE más allá del asado

Dueño: apertura. Pedido #96. Viernes 23 oct 2026. Todo ficticio: los grupos y las personas de abajo son inventados.

**Por qué existe este documento.** El jurado nos marcó que damos siempre el ejemplo del asado. El asado es el caso canónico de la demo y lo seguimos usando ("Los del asado"), pero el problema que resolvemos no es el asado: es que **un grupo quiere hacer algo juntos y no logra cerrarlo**. Acá se muestra cómo el mismo motor sirve para otras juntadas y qué pesa en cada una.

Marcas, como en `docs/problema.md`: **[HOY]** = ya existe en el producto o en el contrato aprobado; **[ENM10]** = entra con la enmienda 10 (zona, movilidad, tiempo máximo, momento del día; catálogo ampliado) si migra antes del corte de las 23:00; **[PENDIENTE]** = no existe y se dice así; **[DATO]** = cifra con fuente; **[HIPÓTESIS]** = lo creemos y no lo comprobamos.

## 1. Tipos de grupos y de juntadas

### Lo que CRUXE sabe pesar
| Variable | Quién la pone | Estado | Qué decide |
|---|---|---|---|
| Disponibilidad por franja (sí / no / pendiente) | cada persona, en privado | HOY | Qué franja sirve; quién es elegible |
| Cupos mínimo y máximo, y persona imprescindible | quien organiza | HOY | Si el plan es viable y si el cupo está completo |
| Plazo de aceptación | quien organiza; lo aplica el servidor | HOY | Hasta cuándo se puede aceptar |
| Aporte o costo conocido por persona | quien organiza | HOY (fijo, sin reparto) | Qué se acepta |
| Presupuesto (da igual / algo barato / ojalá gratis) | cada persona, privado | HOY (agente) | Se descarta lo que supera al presupuesto más bajo |
| Energía (con todo / algo tranquilo) y ambiente (fiesta / tranquilo / da igual) | cada persona, privado | HOY (agente) | Suma puntos a lo que coincide con la mayoría |
| Lugar (da igual / bajo techo) y clima | cada persona; el clima es del contexto | HOY (agente) | Con lluvia se descarta lo de aire libre si alguien pidió techo |
| Me gustaría (actividades) | cada persona, privado | HOY (5 actividades) / ENM10 (13) | Suma puntos; solo se muestra el total con 2 o más y 4 personas o más |
| Zona (comuna) | cada persona, privado | ENM10 | Qué lugar queda a mano para todos |
| Cómo me muevo (auto con lugar, auto sin lugar, transporte público, bici o a pie, me llevan) | cada persona, privado | ENM10 | Nadie queda sin forma de llegar |
| Tiempo máximo de viaje (15, 30, 45, 60) | cada persona, privado | ENM10 | Se descarta lo que supera el tiempo de alguien |
| Momento del día (mañana, tarde, noche, da igual) | cada persona, privado | ENM10 | Suma puntos; no descarta |
| Que el agente use mis preferencias | cada persona | HOY (opt-out) | Si no, es como si no hubiera guardado |

### Ocho tipos de juntadas
Para cada tipo: qué es lo que más cuesta cerrar y qué variables pesan. "Casi nada" significa que esa variable no cambia la decisión en ese tipo de grupo.

| Tipo de grupo | Qué suele trabar el plan | Pesa mucho | Pesa algo | Casi nada |
|---|---|---|---|---|
| **Amigos** (el caso del asado) | Nadie cierra; "me interesa" no es un sí | Disponibilidad, plazo, imprescindible (anfitrión), cupo | Presupuesto, ambiente, momento | Tiempo máximo si viven cerca |
| **Deporte semanal** (pádel, fútbol) | Falta uno y la cancha ya está pagada; cupo exacto | Cupo mínimo y máximo, plazo, disponibilidad, momento (mañana o noche) | Zona y tiempo máximo (la cancha queda lejos de alguien), energía | Ambiente, presupuesto |
| **Cumpleaños** | Cada uno ve distinto qué gastar; la persona que cumple tiene que estar | Imprescindible (quien cumple), presupuesto, momento, ambiente (fiesta o tranquilo) | Zona, movilidad (volver de noche) | Cupo exacto |
| **Familia** (almuerzo de domingo) | Muchos se mueven por otros (el auto de uno lleva a tres); horarios distintos por edades | Movilidad (me llevan / puedo llevar), imprescindible (quien recibe o quien viene de lejos), momento, tiempo máximo | Presupuesto (a veces no se dice), lugar bajo techo | Ambiente, energía |
| **Ex compañeros** (reencuentro) | Viven en comunas distintas y hace años que no se ven; nadie quiere ser el pesado que organiza | Zona, tiempo máximo, movilidad, disponibilidad, plazo | Presupuesto, ambiente | Energía |
| **Grupo de estudio** | Horarios cruzados con clases y trabajo; una sala tranquila | Disponibilidad, momento, plazo duro (antes del examen), bajo techo | Zona, tiempo máximo | Ambiente de fiesta, energía, presupuesto |
| **Club de lectura** | Se repite todos los meses y siempre cae el mismo día; cansancio de repetir lugar | Disponibilidad, momento, ambiente tranquilo, "lo que hicimos antes" (PENDIENTE: variar el lugar) | Zona, presupuesto (café o casa) | Cupo exacto, energía |
| **Viaje de fin de semana** | Muchas condiciones juntas: fecha, plata, auto, cupo; cuesta más cerrarlo | Disponibilidad (fin de semana largo), cupo, presupuesto, movilidad (quién lleva a quién), plazo para reservar | Zona de salida, energía | Momento del día (el viaje dura el día entero) |

**Qué se ve en la tabla.** El mismo motor (privado, una opción, una versión, reparación) cubre todos los tipos; lo que cambia es el peso. Pero hay un límite que hay que decir: **el catálogo de la demo es de simulación y las "escapadas" no están** (ver §4). Para el viaje de fin de semana, CRUXE cierra la fecha, el cupo y la presencia de quien es imprescindible, no el destino.

## 2. Cómo aplica en la vida de las personas: ocho escenarios

Todos los escenarios son sociales, ficticios y caben en el caso 06. Para cada uno: qué carga cada quien en privado, qué hace CRUXE y qué se ve. Los hechos de cada escenario son inventados.

### 2.1 El pádel de los martes: "Los de la cancha"
Cuatro amigos juegan dobles los martes a las 20:00. La cancha se paga entre cuatro y si falta uno, el partido se cae. Hace tres semanas se cayó dos veces porque uno avisaba el mismo día.
- **En privado:** cada uno marca disponibilidad por franja (martes 20:00 o jueves 20:00) y, si quiere, su tiempo máximo de viaje.
- **CRUXE:** cupo mínimo 4, máximo 4. Cada uno acepta la versión. Si alguien se baja, queda **En revisión** de inmediato y el plan salta a la otra franja como versión 2, sin heredar aceptaciones. Nadie se entera de por qué se bajó.
- **Se ve:** "3 de 4 confirmaron; falta Dani antes del miércoles 20:00". Nadie tiene que perseguir a nadie.
- **Variables que pesan:** cupo, plazo, momento. [HOY] casi todo.

### 2.2 El cumpleaños de Vale, sin presión
Vale cumple 30. Quieren hacer algo, pero en el grupo hay quien no puede gastar mucho y nadie lo dice. Cada vez que alguien propone una cena en un restaurante, dos dejan de contestar.
- **En privado:** presupuesto (ojalá gratis, algo barato o da igual), ambiente y momento.
- **CRUXE:** Vale es la persona imprescindible. El agente descarta lo que supera el presupuesto más bajo del grupo, sin decir de quién es. Si todos tienen presupuesto "da igual", una cena puede aparecer entre las opciones; si alguien marcó "ojalá gratis", solo quedan las gratuitas (un parque, una caminata por el cerro, un museo).
- **Se ve:** "este plan cabe en el presupuesto del grupo". Nunca "porque Mati no puede pagar".
- **Variables que pesan:** imprescindible, presupuesto, ambiente. [HOY] más catálogo ampliado [ENM10] para cena, juegos en casa y bar.

### 2.3 El almuerzo del domingo con la familia de Emi
Los tíos, los primos y la abuela se juntan una vez al mes. Dos primos no tienen auto, uno vive lejos y la abuela solo puede por la tarde. Siempre termina decidiendo quien más grita.
- **En privado:** zona, cómo se mueve ("me llevan" o "tengo auto con lugar"), momento y tiempo máximo.
- **CRUXE:** el plan considera que los dos primos que necesitan que los lleven solo funciona si hay autos con lugar o si queda a distancia en transporte público. La abuela es imprescindible: sin ella no hay confirmación.
- **Se ve:** "queda a menos de 35 minutos para todos (estimado)". No se ve quién no tiene auto ni quién vive dónde.
- **Variables que pesan:** movilidad, zona, tiempo máximo, imprescindible. [ENM10].

### 2.4 La cena de los ex compañeros del colegio
Doce personas, veinte años después. Viven en Maipú, Providencia, Puente Alto y Las Condes. Cada intento de reunión muere en el chat porque nadie quiere ser quien decide el lugar y alguien siempre queda lejos.
- **En privado:** zona, tiempo máximo (algunos 45, uno 30), cómo se mueven, noche o tarde.
- **CRUXE:** descarta las candidatas a las que alguien no llega en su tiempo, elige la de menor viaje máximo y propone una sola. Cada quien acepta esa versión.
- **Se ve:** una opción, la franja y quién falta aceptar, sin el motivo por el que se descartaron otras.
- **Variables que pesan:** zona, tiempo máximo, movilidad, cupo máximo 12. [ENM10].

### 2.5 El grupo de estudio de Derecho Civil
Cinco compañeros estudian juntos antes de la prueba. Cada uno tiene turnos de trabajo distintos y hay una prueba el viernes 30; si no se arma el martes, ya no hay tiempo.
- **En privado:** disponibilidad por franja y momento (tarde o noche).
- **CRUXE:** mínimo 4, plazo duro el lunes a las 21:00 (lo decide el servidor, no el chat). Si alguien se baja y quedan 3, la sala no sirve y el plan se revisa en el acto; no queda una confirmación a medias.
- **Se ve:** "Sin opción compatible" si no hay ninguna franja con 4; no se baja el mínimo para fingir que se arma.
- **Variables que pesan:** disponibilidad, plazo, cupo mínimo. [HOY].

### 2.6 El club de lectura de los jueves
Siete personas, una vez al mes, siempre en la casa de alguien. Cansa repetir y a veces el que ofrece la casa se baja a último momento.
- **En privado:** disponibilidad, ambiente tranquilo, presupuesto ("café o casa").
- **CRUXE:** el anfitrión es imprescindible. Si se baja, el plan queda En revisión y se busca otra franja o, con el catálogo ampliado, un café. La versión 2 empieza sin aceptaciones heredadas.
- **Se ve:** quién es el anfitrión de esta versión y qué falta confirmar.
- **Variables que pesan:** imprescindible, disponibilidad, ambiente, plazo. [HOY] más catálogo ampliado para el café.
- **Pendiente:** "variar el lugar" (el grupo no repite lo mismo tres veces seguidas) usa historial del grupo y no existe.

### 2.7 El fin de semana largo de los cuatro de siempre
Cuatro amigos quieren irse a una cabaña un fin de semana largo. Hay que ponerse de acuerdo en fecha, cuánto gastar y quién lleva el auto. Hace tres años que lo dicen.
- **En privado:** disponibilidad (viernes a domingo o sábado y domingo), presupuesto, cómo se mueven.
- **CRUXE:** cierra la fecha y el cupo (mínimo 4 y máximo 4) y deja a cada uno aceptar la versión. Si uno se baja, queda por debajo del mínimo y el sistema lo dice (En revisión) en vez de reducir el cupo en silencio.
- **Se ve:** "Falta que Fede acepte antes del lunes".
- **Lo que no hace:** no reserva la cabaña, no reparte la plata, no organiza quién lleva a quién. Eso es [PENDIENTE] y no se promete.
- **Variables que pesan:** disponibilidad, cupo, presupuesto, movilidad, plazo.

### 2.8 Los amigos que no se ven hace meses
Seis amigos que fueron muy cercanos y se ven poco. Se mandan fotos, se dicen "hay que juntarse" y no pasa nada. Todos quieren, y ninguno quiere ser el que insiste.
- **En privado:** disponibilidad de los dos fines de semana que vienen, presupuesto y energía.
- **CRUXE:** basta con que **una** persona cree el grupo y mande el enlace; los demás tocan su nombre y responden. El silencio nunca cuenta como asistencia, así que el sistema muestra quién falta y deja claro que es un plan sin comprometer hasta que alguien acepte.
- **Se ve:** un plan con fecha, una hora de cierre y "Grupo confirmado" solo cuando todos aceptaron esa versión.
- **Variables que pesan:** casi todas las del caso 06.
- Es el caso que describe `docs/problema.md`.

## 3. Lámina para el pitch

**Título:** *Sirve donde un grupo tiene que comprometerse sin exponer a nadie.*

**Lo que muestra:** una fila con cuatro momentos que se repiten en cualquier juntada:
1. *Cada uno pone sus condiciones, en privado.* (presupuesto, horario, cómo llega, hasta dónde viaja)
2. *El servidor propone una opción que le sirve al grupo, sin decir de quién fue cada condición.*
3. *Cada uno confirma esa versión exacta.* (interés no es confirmación; el silencio no es sí)
4. *Si alguien se baja, el plan se rearma desde cero.*

**Debajo, una cinta con las juntadas que ya funcionan con el mismo motor:** pádel de los martes · cumpleaños · cena de ex compañeros · almuerzo familiar · grupo de estudio · club de lectura · fin de semana largo · los amigos de siempre.

**Una frase para decir en voz alta:** "El asado fue el primer ejemplo, no el único. Es lo mismo cuando alguien necesita que lo lleven, cuando alguien no puede gastar tanto o cuando alguien no quiere decir por qué no puede."

**Más adelante (marcado en la lámina, NO construido; el caso 06 es social):** misma lógica en otros contextos donde un grupo tiene que comprometerse sin exponer a nadie. Se mencionan como visión, nunca como producto actual:
- Turnos de cuidado familiar (quién acompaña a quién, sin que nadie tenga que justificar por qué no puede).
- Auto compartido (quién lleva y quién pasa a buscar, sin decir dónde vive cada uno).
- Voluntariado (cupos mínimos para que la actividad se haga, con confirmación por versión).
Texto sugerido en la lámina: *"Más adelante: turnos de cuidado, auto compartido, voluntariado. No es lo que construimos hoy."* No se prometen fechas ni funciones.

**Reglas para la lámina:** nada de cifras sobre cuánto "mejoran" los planes (no las tenemos); se pueden citar los datos de `docs/problema.md` con su fuente; no decir que CRUXE "reserva", "paga" o "organiza el viaje".

## 4. Variables de juntadas que faltan investigar

Cada fila dice qué falta, por qué importa y qué se encontró. No se inventa ninguna cifra; donde no hay fuente se escribe **sin fuente**.

| Variable | Por qué importa en una juntada | Qué sabemos | Fuente |
|---|---|---|---|
| **Cancelaciones y cómo se manejan** | Si el plan se rearma bien, una baja no rompe el vínculo | **[DATO, sin Chile]** Estudio de Michigan State (más de 1.100 personas): la mayoría dice que una cancelación no daña la amistad; lo que molesta es la mentira sobre el motivo; unos 6 de cada 10 quieren aviso con tiempo. No hay datos de cancelaciones en Chile | [MSU Today, 2023](https://msutoday.msu.edu/news/2023/01/cancelling-plans-research) |
| **Cancelación de planes (encuesta comercial)** | Orden de magnitud de cuánto se cae | **[DATO débil]** Una encuesta comercial de Evite (OnePoll, 2017) decía que la gente falla casi la mitad de los planes. No es investigación revisada ni es de Chile: no usar como argumento central | [Refinery29, 2017](https://www.refinery29.com/2017/10/176964/flaky-friend-reasons-research) |
| **Accesibilidad física** (rampa, baño, mesas) | Un lugar "a la mano" puede no serlo para alguien con movilidad reducida; es sensible, hay que pedirlo sin exponer a la persona | Senadis tiene recomendaciones de rutas sin desniveles de al menos 1,20 m, baños accesibles y mesas de 80 cm de altura. Falta decidir cómo se pregunta ("necesito acceso sin escaleras") y que sea filtro del servidor, nunca un total visible | [La Tercera, recomendaciones de Senadis](https://www.latercera.com/nacional/noticia/viainclusiva-conoce-las-12-recomendaciones-las-fondas-sean-inclusivas/317660/) |
| **Comida** (vegetariano, sin carne, sin gluten) | Elegir restaurante o qué se cocina; también aplica al asado | **[DATO]** Cadem 2026: 87 % se define omnívoro y 1 % vegano; Ipsos: 84 % omnívoro, 9 % flexitariano, 4 % vegetariano, 3 % pescetariano. Las cifras cambian según la definición. En un grupo chico, mostrar un total delata a alguien: va como filtro del servidor ("que tenga opción vegetariana") | [The Clinic, 2026](https://www.theclinic.cl/2026/09/14/solo-un-1-de-veganos-y-menos-recetas-familiares-como-esta-cambiando-la-cocina-de-los-chilenos-en-fiestas-patrias/) · [La Tercera (Ipsos)](https://www.latercera.com/que-pasa/noticia/que-comen-los-chilenos-encuesta-dice-que-el-84-se-declara-omnivoro-el-9-flexitariano-el-4-vegetariano-y-un-3-pescetariano/SZXJMKOZQJFXVNCEAA2QKRTURE/) |
| **Alcohol** (bar o no bar) | Algunos no toman por motivos que no quieren decir | **Sin fuente** propia. Ya está dentro del barrido (`docs/agente-barrido.md` §1) como prioridad media | — |
| **Niños y mascotas** | Cambian lugar, horario y duración; la familia casi siempre los trae | **Sin fuente** propia; se resuelve con una pregunta cerrada | — |
| **Volver a casa de noche** | Con salida nocturna, quien depende de transporte público necesita que haya cómo volver | El Metro de Santiago cierra alrededor de las 23:00 según notas de prensa de años anteriores; **hay que confirmar el horario de 2026 en metro.cl** antes de usarlo como regla | [Redgol, nota de 2023](https://redgol.cl/tendencias/hasta-que-hora-esta-abierto-el-metro-este-viernes-23-de-junio-20230623-RDG-35431.html) (no es 2026) |
| **Duración del plan** | Una juntada de 2 horas y una de 8 pesan distinto | **Sin fuente.** El catálogo ya tiene horarios fijos; falta una duración preferida por persona | — |
| **Tamaño ideal del grupo** | Con más de 8 se vuelve difícil de coordinar | **Sin fuente** propia; es lo que dice la práctica del equipo, no un dato | — |
| **Frecuencia con la que el grupo se junta** | Medir si el plan "volvió a pasar" (el problema del caso) | El servidor lo puede calcular con propuestas confirmadas; falta definir qué es "volver a juntarse" | `docs/problema.md` §4 |
| **Cómo les fue después** | Es el dato más valioso para mejorar las propuestas | Pregunta cerrada al grupo ("¿se juntaron? ¿les gustó?"), ya propuesta en el barrido; no construida | `docs/agente-barrido.md` §1 |
| **Soledad y amistad en Chile** (contexto) | Justifica por qué importa verse | **[DATO secundario]** Encuesta Bicentenario UC 2025, vía prensa: 43 % tiene entre 3 y 5 amigos. Detalles y umbrales en `docs/problema.md` §1; las cifras de frecuencia de encuentros no las encontré | [chocale.cl, 2026](https://chocale.cl/2026/02/aumenta-el-numero-de-personas-con-amigos-en-chile-y-tambien-el-de-quienes-se-sienten-solos/) |
| **Privacidad al decidir en grupo** | Es nuestro diferencial; hay trabajo académico sobre intercambiar información personal vs. protegerla al decidir adónde ir | Existen artículos de coordinación con privacidad de calendarios y de preferencias (AAMAS 2014 y otros). No los leí completos: **solo es un punto de partida para citar, no una afirmación** | [AAMAS 2014](https://aamas.csc.liv.ac.uk/Proceedings/aamas2014/aamas/p1345.pdf) |

**Cómo cada variable nueva respeta la privacidad:** opciones cerradas; solo el servidor las lee; el grupo ve únicamente totales, y solo con 4 personas o más; el modelo de IA recibe opciones ya filtradas, nunca a una persona (`docs/agente-barrido.md` §1 y enmienda 10).

## 5. Qué hace falta de otros (pedidos)
- **front-juan:** usar `src/lib/ejemplos.ts` para que los placeholders y ayudas no asuman asado (detalle en la ficha `agentes/apertura.md`, mejora #92).
- **backend:** la Parte B de la enmienda 10 (`docs/catalogo-ampliado.md`) hace que los escenarios 2.2, 2.6 y 2.8 tengan cena, juegos en casa, café y cine entre las candidatas.
- **Para el pitch (agente-ia, dueño de `docs/pitch*.md`):** la lámina de §3 y la cinta de juntadas.

## 6. Respuestas de 30 segundos para el jurado
Cada una se dice en voz alta en menos de medio minuto. Ninguna promete lo que CRUXE no hace hoy.

- **"¿Esto es solo para asados?"** No. El asado fue el caso de la demo porque ahí empezó el problema. Lo que CRUXE resuelve es que un grupo no logra cerrar un plan: cada uno pone sus condiciones en privado, el servidor propone una sola opción, cada uno confirma esa versión y, si alguien se baja, se rearma. Eso es igual para un cine, un pádel o una cena.
- **"¿Y con un equipo de deporte?"** Es el caso más exigente en cupos: cuatro para dobles, ni uno más ni uno menos. CRUXE ya trabaja con mínimo y máximo, plazo y reparación cuando falta uno. El agente puede sugerir pádel o fútbol y un enlace a canchas, nunca "hay cancha".
- **"¿Y con la familia?"** La familia mueve gente: el auto de uno lleva a tres. Con la enmienda 10, cada persona dice en privado cómo se mueve y hasta dónde viaja, y el plan elige un lugar al que todos llegan sin que nadie se entere de quién no tiene auto.
- **"¿Y si alguien no puede pagar?"** El presupuesto es privado. El grupo ve "este plan cabe en el presupuesto del grupo", nunca de quién fue la restricción.
- **"¿Funciona para un grupo grande?"** El cupo máximo es 20. A mayor tamaño, más peso tienen zona y tiempo máximo. Lo que no hacemos hoy es repartir gastos ni reservar.
- **"¿Y si es algo que se repite, como un club de lectura?"** Cada reunión es un plan nuevo con su propia versión. Lo que falta es que el agente varíe el lugar según lo que el grupo ya hizo; eso está estudiado en `docs/agente-barrido.md` y no está construido.
- **"¿Sirve para otras cosas, como turnos de cuidado?"** Es la misma lógica, pero no es lo que construimos: el caso 06 es social. Lo mencionamos como camino futuro, junto con auto compartido y voluntariado, y no lo prometemos.
- **"¿Qué pasa si el catálogo no tiene mi actividad?"** El catálogo de la demo es de simulación (cada lugar dice "Simulación"). La fecha, el cupo y la confirmación funcionan igual para cualquier actividad que el organizador escriba; el agente solo sugiere sobre lo que tiene en el catálogo.
