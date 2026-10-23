# Psicología del grupo: cómo CRUXE entiende una juntada entre amigos

Dueño: psico. Pedido de Nico (viernes 23 oct, 20:26). Solo investigación y diseño: **no cambia código, contrato ni base**. Todo ficticio: los nombres de abajo (Fede, Caro, Tomi, Luna…) son inventados. Fuentes con enlaces y fuerza de la evidencia: `docs/psicologia-fuentes.md` (códigos F1…F30).

Marcas, como en `docs/problema.md` y `docs/apertura.md`:
- **[FUENTE Fn]** = lo dice un estudio o fuente de `docs/psicologia-fuentes.md` (con su fuerza A/B/C).
- **[HIPÓTESIS]** = lo creemos y no lo comprobamos. **[PRÁCTICA]** = lo dice la experiencia común o del equipo, sin fuente.
- **[HOY]** = ya está en el producto o en el contrato aprobado. **[ENM10]** = enmienda 10 (zona, movilidad, tiempo, momento, 13 actividades).
- **[PEDIDO a …]** = ya está como pedido al dueño en `agentes/psico.md`.

## 0. En pocas líneas
1. Un grupo de amigos no pelea por el plan: pelea por **lo que el plan dice de cada uno** (mi casa, lo que como, lo que gasto, con quién vengo). Casi todo lo delicado es **identidad y reciprocidad**, no logística.
2. Por eso la regla de diseño es una sola: **el servidor resuelve la tensión sin nombrarla.** Cada persona dice lo suyo con opciones cerradas y en privado; el grupo ve un plan que sirve y que no se explica.
3. Lo que más daña no es cancelar sino **mentir sobre por qué** [F1]. CRUXE no pide motivos: ya cumple.
4. **Género y estado de pareja de una persona: no se piden ni se infieren.** Lo que importa para armar el plan no es quién es cada uno sino **quién puede venir** (solo el grupo, con parejas, abierta). Eso es una decisión del grupo, no un dato de la persona (§5).
5. "Quién pone la casa" se resuelve con **tres opciones y una regla acordada antes** (rotación, sorteo, lugar neutro), y se dice sin motivo: "esta vez toca un lugar neutro" (§6).
6. "No ser absolutista": el motor sigue publicando **una versión**, pero el agente le ofrece a quien organiza **dos formas parecidas con distinto concepto** ("asado en casa" y "parrilla en un lugar neutro"), las dos ya válidas para todos (§7).
7. Comida: se trata como **necesidad de esta comida**, no como etiqueta de la persona; el plan dice siempre "habrá opción sin carne", **tenga o no tenga alguien esa necesidad**, para que el texto no delate a nadie (§4).
8. Antes del sábado 13:00, sin migración: **textos, agente (prompt y presentación de dos caminos), ayudas en la interfaz y una lámina de pitch** (§9). Lo que necesita enmienda es mínimo y va a Nico.
9. Casi nada de lo que sigue está medido en Chile: la evidencia es de EE.UU. y Europa. Se dice como "creemos que", nunca como cifra nuestra.
10. Lo que CRUXE **no** hace: no resuelve conflictos entre personas, no media peleas, no promete que nadie se sienta bien. Evita ser la causa de uno.
11. **El eje de todo es el cierre** (§0b): cada tensión de arriba es una razón para no cerrar. De las siete causas de que un plan no se cierre, CRUXE ya tiene algún mecanismo contra todas; las más débiles son recordar (2) y **decir** lo que ya hace (5). Lo que más falta es **decir** que la confirmación solo vale si se llega al mínimo («si no llegan 4, nadie queda comprometido»), que le quita el miedo a ir primero (§8.9).
12. **Ubicación** (§12): día, hora y duración siempre visibles; «buscar el lugar en el mapa» con un enlace al LUGAR, nunca a las personas; el tiempo de cada uno lo calcula su propio teléfono; alarma en el calendario; nunca la comuna ni la ubicación de otro.
13. **Nivel de gasto sin clase social** (§13): no se pide ni se infiere (es dato sensible, la comuna es un mal proxy y delata). La intención —que un plan no quede mal— se cubre con un **estilo de la ocasión** elegido por quien organiza (simple · normal · especial), dos formas con distinto estilo y, después, un presupuesto privado que también empuje hacia arriba. El plan nunca supera el tope del que menos quiere gastar.

## 0b. El cierre: por qué los planes de grupo no se cierran (eje del documento)
Pedido de Nico (20:28): *«Somos seres sociales y a todos nos gusta estar con gente, pero el máximo problema es terminar de coordinar una juntada.»* Es el mismo problema de `docs/problema.md` §3, visto desde la psicología. Todo lo demás de este documento (casa, comida, parejas, plata, distancia) importa **porque cada una de esas tensiones es una razón para no cerrar**.

### Las siete causas, el mecanismo de CRUXE que ataca cada una y lo que falta
Lectura honesta: casi toda la evidencia viene de **otras situaciones** (emergencias, crowdfunding, encuestas de calendario) y se aplica acá **por analogía**. Está marcado [ANALOGÍA]. Lo que no se probó con grupos de amigos se dice como [HIPÓTESIS].

| # | Causa | Qué se sabe | Qué la ataca hoy [HOY] | Qué falta |
|---|---|---|---|---|
| **1** | **Difusión de la responsabilidad**: con muchos, cada uno espera que otro cierre. | En el experimento clásico, ayudar se volvió menos probable y más lento cuanto más personas creía el participante que había [F31, A]. [ANALOGÍA]: era una emergencia, no un plan; en `problema.md` ya se usa como analogía. | **Una** persona arma el plan y el **servidor** propone: nadie "decide" por el grupo. Aviso personal a quien falta (`FaltaTuRespuesta`, enmienda 12). | Un recordatorio dirigido a **todo el grupo** vuelve a difundir la responsabilidad. El aviso debe llegarle **a cada persona pendiente por su nombre en su pantalla** ("Falta tu respuesta"), no solo un texto al chat. Hoy "Recordar a quien falta" es un texto al grupo: sirve, pero es lo más débil. |
| **2** | **Nadie quiere ser el pesado**: pedir una respuesta cuesta. | Quien pide ayuda directa **subestima hasta en un 50 %** cuántos dirán que sí, porque sobrepesa el costo de decir sí y descuenta el costo social de negarse [F32, A; el 48 % viene de una revisión posterior, vía prensa]. Quien contacta a un amigo subestima cuánto se lo agradecen [F2, A]. | CRUXE arma el texto del recordatorio ("Faltan respuestas para «X»…", `compartir.ts`): el organizador solo lo manda. | **La app no puede enviar nada por sí sola** (notificaciones están fuera de alcance, `problema.md` §4): el recordatorio lo sigue mandando una persona por WhatsApp. Se reduce el costo, no desaparece. Propuesta: el texto dice "te lo recuerda CRUXE" y el organizador ve en la app, **sin enviar nada**, "Hoy conviene recordar: faltan 2, cierra mañana a las 20:00" [HIPÓTESIS: baja la incomodidad]. |
| **3** | **"Me interesa" no compromete** (la intención no es conducta). | Aumentar la intención produjo un efecto de d = 0,66 sobre la intención pero solo d = 0,36 sobre la conducta, en 47 experimentos [F33, A]. Los planes concretos ("dónde, cuándo") ayudan a cumplir (Gollwitzer y Sheeran 2006, d≈0,65, `problema.md`). | **Interés no es confirmación**: solo cuenta confirmar **una versión concreta** (día, hora, lugar). El silencio nunca es asistencia. | La confirmación pesa más si se ve **qué pasa con ella**. Ver causa 5. |
| **4** | **Parálisis por exceso de opciones.** | La idea popular **no se sostiene sola**: el metaanálisis de 50 experimentos da un efecto promedio casi nulo [F30, A]. Lo que sí se observa en agendas de grupo es otra cosa: en encuestas abiertas (Doodle) la gente aprueba los horarios muy populares o muy impopulares y se ve evidencia de razonamiento estratégico según lo que ya votaron los demás [F34, A, CSCW, 340.000 encuestas de EE.UU.]. | **Una** opción por versión; las dos franjas (A/B) son lo máximo que se pide. | "Dos formas de juntarse" (§7) es **para quien organiza**, nunca para el grupo, para no reabrir la negociación. **No** justificarla como "evitar la sobrecarga". |
| **5** | **Esperar a ver quién va** (nadie quiere ir primero). | Modelo de umbrales: cada persona se suma cuando ya se sumó una cantidad de otras; quien tiene umbral cero arranca, y el resultado depende de **cómo se distribuyen** los umbrales, no del promedio [F35, A, teórico]. [ANALOGÍA]. El mínimo de un plan es parecido a un **contrato de aseguramiento**: se compromete solo si se llega a la cantidad necesaria, y si no, se devuelve todo [F36, A, economía]. Ese diseño es lo que quita el miedo a ir primero. | **El mínimo ya funciona así**: "Grupo confirmado" solo con N confirmaciones; si no llegan, no hay plan. La barra muestra "3 de 4 necesarias". | **Decirlo.** Hoy la pantalla dice "Ya confirmaste… vale solo para esa versión", pero **no dice** que *"tu confirmación solo vale si llegan 4; si no, nadie queda comprometido"*. Esa frase le quita el riesgo de ser el primero. Es solo texto (§8.9). |
| **6** | **Sin plazo, todo se posterga.** | Las personas aceptan voluntariamente plazos costosos y les sirven, aunque los impuestos desde afuera funcionan mejor que los propios [F37, A, 2002]; **una réplica de 2026 reportó que cambiar los plazos tuvo un efecto despreciable en uno de los estudios** [F37]: la evidencia está disputada. Se mantiene como [HIPÓTESIS]. | El **servidor** pone el plazo y rechaza lo que llega fuera de plazo. | La pantalla debe decir **qué pasa si no se llega** ("si el jueves a las 20:00 no están las 4 confirmaciones, el plan no se arma y nadie queda comprometido"). Aclarar el final reduce el miedo. |
| **7** | **La baja de último momento.** | Cancelar duele menos de lo que se teme si es sincero y con aviso [F1]. La víspera aumenta las ganas de evitar [F5]. | Reparación a versión 2, sin aceptaciones heredadas; "No voy" sin motivo. | Texto (§8.1) y, después, la "otra forma" como versión 2 (§7). |

### Lo que CRUXE no resuelve
- **El cierre humano sigue necesitando a alguien que toque "enviar".** La app baja el costo, no lo elimina (causa 2).
- **No hay compromiso sin consecuencias.** CRUXE no multa ni "devuelve con bono" como el contrato de aseguramiento dominante [F36]; solo evita que alguien se quede solo.
- **No podemos decir que cierre más planes.** Es [HIPÓTESIS]; `problema.md` §4 ya declara que lo medible es la tasa de encuentros concretados.

### Resumen: qué mecanismo ataca qué
| Mecanismo de CRUXE | Causas que ataca |
|---|---|
| Una persona arma el plan, el servidor propone | 1, 2 |
| Condiciones privadas antes de ver el plan | 4, 5 |
| Una sola versión concreta | 3, 4 |
| Confirmación **solo vale si se llega al mínimo** | 5 |
| Plazo del servidor | 6 |
| Aviso personal "falta tu respuesta" | 1, 2 |
| Reparación a versión 2 sin aceptaciones heredadas | 7 |
| Texto de recordatorio armado por la app | 2 |

## 1. Principios de diseño (salen de todo lo que sigue)
| # | Principio | Por qué | Cómo se ve |
|---|---|---|---|
| P1 | **La app nunca es el origen de la broma.** | Las bromas entre amigos son afecto hasta que dejan de serlo, y el que las recibe puede disimular [F11, F12]. La app no sabe cuándo. | Nada de rankings, "quién siempre cancela", ni textos con apodos o etiquetas de personas. Las capturas de pantalla viajan al chat del grupo. |
| P2 | **Preguntar por la ocasión, no por la persona.** | Una etiqueta ("vegetariana", "sin pareja") es un dato sensible y persistente [F27, F13]; una necesidad de esta comida no. | "Para esta comida…" en vez de "soy…". |
| P3 | **Lo que importa para el plan es una regla del grupo, no un perfil.** | En un grupo chico, un dato por persona delata. | "Solo el grupo / con parejas / abierta" lo elige quien organiza y lo ve todo el grupo (§5). |
| P4 | **El texto compartido no cambia según quién respondió qué.** | Si "habrá opción sin carne" aparece solo cuando alguien lo pidió, el texto delata al que lo pidió. | La frase es siempre la misma para el mismo tipo de plan. |
| P5 | **No explicar el porqué de una restricción ni de una baja.** | F1: lo que duele es la mentira; si nadie pide el motivo, nadie necesita inventarlo. | "Esta vez toca un lugar neutro." "Cambió el plan." Sin "porque". |
| P6 | **Dos conceptos, no cuatro.** | La psicología no demuestra que menos opciones eviten la sobrecarga [F30]. Se justifica por otra razón: una versión concreta a la que comprometerse y un "otra forma" que da salida sin votar. | §7. |
| P7 | **El servidor decide; la IA solo explica.** | Regla del producto. | Todo lo de abajo que "elige" lo elige una regla fija; la IA redacta. |
| P8 | **Cada dato se usa solo para lo que se pidió.** | Usar un dato pedido para una cosa en otra es discriminación por proxy [F41]. | La zona sirve para el viaje y nada más; no se infiere nivel de gasto, ni de ninguna otra cosa, de la comuna ni de nada (§13). |

## 2. La línea de tiempo de una juntada: qué pasa antes, durante y después
Pedido de Nico: estudiar los comportamientos **antes** de una juntada. Los siete momentos de abajo son una lectura del equipo apoyada en literatura general, **no un estudio de campo**. Lo marcado [HIPÓTESIS] lo tiene que confirmar la gente (la pregunta a los del asado sigue sin respuesta, `docs/problema.md` §2).

| # | Momento | Qué suele pasar | Riesgo | Qué hace CRUXE hoy / podría |
|---|---|---|---|---|
| 1 | **La semilla**: "hay que juntarse" | Todos quieren, nadie propone. Con muchos, cada uno espera que otro ordene (difusión de la responsabilidad) [F4 → `problema.md`]. Quien se anima a organizar subestima cuánto se lo agradecen: en general, quien contacta subestima la recepción [F2, fuerza A pero no es sobre invitar a planes] [HIPÓTESIS en este caso]. | Que el "hay que juntarse" se repita meses. Que el que organiza se agote [F3]. | **[HOY]** Basta convencer a **uno**: crea el grupo y manda el enlace. Texto de apoyo al organizador: §8. |
| 2 | **El sondeo en el chat**: "¿quién se suma?" | Respuestas ambiguas: "capaz", "vemos", "me interesa". Cada uno cree que los demás quieren lo mismo y calla (ignorancia pluralista [F18]; "paradoja de Abilene" [F20]). | El grupo hace un plan que **nadie** quería, o no hace nada. | **[HOY]** Las condiciones se cargan en privado, antes de ver un plan: el plan sale de lo que cada uno realmente puede, no de lo que cada uno cree que el resto quiere [HIPÓTESIS: reduce el efecto; no está medido]. |
| 3 | **Negociar quién, dónde, qué, cuánto** | Aparecen las tensiones sensibles: la casa, la comida, la plata, las parejas. En el chat se resuelven a las bromas o a los silencios. | Alguien dice "no puedo" cuando quiere decir "no me alcanza" o "no me gusta ese lugar" [F1: las peores excusas son las inventadas]. | **[HOY]** Presupuesto, energía, ambiente, techo, zona, movilidad, tiempo, momento son privados y cerrados. **[PEDIDO]** cubrir lo que hoy falta: comida, +1, dónde (§4). |
| 4 | **La decisión** | Alguien tiene que cerrar. Una versión concreta de plan convierte intención en compromiso [Gollwitzer y Sheeran, `problema.md`]. | Que quien cierra quede como "el que decidió" si sale mal. | **[HOY]** El **servidor** propone, no la persona; cada uno confirma esa versión. Quien organiza no queda como juez. |
| 5 | **La víspera** | Se piensa de más: "¿y si me aburro?, ¿y si no tengo qué decir?, ¿y si hay alguien con quien no quiero estar?". Anticipar un evento social aumenta las ganas de evitarlo [F5, literatura clínica, extrapolación nuestra]. Cancelar a última hora es común (68 % de 18 a 34 en Reino Unido, Opinium/IPA 2025, `problema.md`). | La baja de último minuto rompe el mínimo y arrastra al grupo. | **[HOY]** "No voy" sin motivo, "Hoy paso", reparación a versión 2 sin aceptaciones heredadas. **[Texto]** que baje el costo de avisar (§8). |
| 6 | **El día** | Logística (quién lleva a quién), comida, alcohol, bromas. | Comida y alcohol como identidad [F13, F19]; bromas sobre la casa [F11]. | **[ENM10]** movilidad y viaje. **[PEDIDO]** frases de comida/alcohol universales (§4, §8). Fuera de CRUXE: lo que pase en la mesa. |
| 7 | **Después** | "¿Cómo estuvo?", "la próxima en tu casa", "siempre vamos a la de Fede". Se acumula la cuenta de quién recibió [F6: cenas domésticas suelen provocar reciprocidad]. | El resentimiento por la rotación injusta se instala en silencio. | **[Después]** historial de dónde fue cada juntada del grupo, para proponer rotación (§6). **[Barrido]** "¿Cómo les fue?" una pregunta cerrada (`docs/agente-barrido.md` §1). |

## 3. Mapa de la dinámica social
Para cada tema: **qué se sabe** (con la fuerza de la fuente), **qué riesgo tiene** y **qué puede hacer la app**. Donde no hay fuente, dice "sin fuente".

### 3.1 Anfitrión y orgullo
- **Se sabe.** Recibir en casa es un regalo que suele llamar a reciprocidad [F6, F7]. Hay un espectro entre la cena armada por el anfitrión y el "cada uno lleva algo", con la mayoría de las juntadas en el medio [F7]. Los invitados con menos presupuesto pueden sentir ansiedad por cómo contribuir, y el anfitrión tranquiliza a los demás sobre si aportaron lo suficiente [F7, reseña, B]. **No encontré un estudio que mida el orgullo ni la ansiedad del anfitrión** [S/F]; que la casa "habla" de uno es [HIPÓTESIS].
- **Riesgo.** Una casa que se ofrece y se juzga ("¡qué chico el living!") es una herida más grande que un restaurante mal elegido, porque el restaurante no es de nadie. El que siempre recibe termina cobrando el esfuerzo en silencio. La casa define sola el cupo máximo y el ambiente.
- **La app.**
  1. Tratar "dónde" como un **concepto del plan** ("en casa", "afuera") y nunca como un juicio sobre una casa concreta.
  2. Ofrecer siempre una versión **sin casa** (lugar neutro) junto a la de casa (§7).
  3. Reducir la carga del anfitrión: "cada uno lleva algo" como modalidad sugerida en el texto del plan [F7: potluck]. **[HOY]** el contrato tiene aporte fijo conocido por persona; "cada uno lleva algo" va solo como texto, sin cálculo.
  4. Jamás comparar casas ni ordenar anfitriones.

### 3.2 Quién pone la casa y quién se siente excluido
- **Se sabe.** La reciprocidad es una norma de las cenas en casa; cuándo se cumple o no es lo que examina F6 [B]. **Nada medido sobre "me ofendo porque no van a mi casa"** [S/F]; lo dijo Nico y es creíble [PRÁCTICA].
- **Riesgo (dos caras).** (a) Quien ofreció su casa y no fue elegido lo lee como "mi casa no sirve". (b) Quien siempre debe viajar, o siempre recibe, se cansa. Hoy la interfaz pide elegir una persona "No puede faltar" que ahí aparece como **anfitrión**: esa elección la hace quien organiza y es **un acto social** (queda pública).
- **La app.** Dar a quien organiza tres salidas ordenadas **antes** de elegir persona: *en una casa del grupo / en un lugar neutro / turnos*. Es un texto de ayuda, no un campo. Reglas completas en §6. **[PEDIDO a front-juan]** ayuda plegable en "Nueva propuesta".

### 3.3 Bromas internas
- **Se sabe.** Una burla es "una provocación en juego sobre algo relevante para el otro" y puede terminar en afecto o en daño [F11, A]. Se percibe mejor en grupos unidos con límites compartidos y suele ser recíproca; el que la recibe puede disimular que le dolió; lo hiriente se descarta como "solo una broma" [F12, B, sobre jóvenes y escuela]. Participantes de un estudio citado por esa fuente marcaron como fuera de límites la familia de la otra persona y los comentarios sobre su apariencia [F12, nivel C: lo leí en un resumen].
- **Riesgo.** La casa de alguien y la dieta de alguien son material de broma clásico (Nico lo vio en su grupo). La app puede **dar munición**: un texto que nombre "la casa de Fede" con tono, o que revele "hay un vegetariano". Y la captura de pantalla de un plan vuela al chat del grupo.
- **La app.** No es el árbitro de las bromas, es el origen que **no** debe ser. (a) Sin nombres de personas en textos generados por IA (ya: el modelo no recibe nombres); (b) sin etiquetas de comida, casa, pareja ni plata en lo que ve el grupo; (c) sin "estadísticas individuales" (ya fuera de alcance: `docs/problema.md` §4); (d) cuidar los **nombres que escribe quien organiza**: si usa un apodo, aparece tal cual. **[PEDIDO a friccion / front-juan]** nota breve al crear el grupo: "Escribe los nombres como te gusta que te llamen a ti" (hipótesis: sugiere respeto, no lo impone).

### 3.4 Comida e identidad
- **Se sabe.** Los vegetarianos que perciben estigma **cuentan menos** que lo son a quienes comen carne [F13, A, muestra de EE.UU.]. Hay una hipótesis de presión de pares entre hombres a no pedir platos vegetarianos con amigos varones [F14, **C**, no citar]. La desconfianza hacia las restricciones alimentarias tensa invitados y anfitriones [F16, B ensayo]. En Chile, el 87 % se define omnívoro y el 1 % vegano (Cadem 2026); 84 % / 9 % flexitariano / 4 % vegetariano / 3 % pescetariano (Ipsos) [F17, B/C; las cifras cambian con la definición]. Comer juntos se asocia a más cercanía, y las comidas que más unieron tenían más gente, risas, recuerdos y alcohol [F9, B, correlacional].
- **Hay tres cosas distintas que se suelen mezclar:** **identidad** ("soy vegetariano"), **necesidad** (alergia, sin gluten: roza la salud) y **ganas de hoy** ("hoy no me tinca carne"). Tratarlas igual es el error: convierte un humor pasajero en etiqueta y una necesidad de salud en un dato sin cuidado.
- **Riesgo.** (a) Pedir "¿eres vegetariano?" a una persona la señala; (b) mostrar totales ("1 vegetariano") delata en un grupo chico; (c) decirle al grupo "hay una persona celíaca" expone salud; (d) prometer seguridad que CRUXE no puede dar (no sabe qué cocina nadie).
- **La app.**
  - **Pregunta por esta comida, no por la persona**, con opciones cerradas: *de todo* · *prefiero una opción sin carne* · *necesito una opción sin gluten* · *tengo otra restricción* · *prefiero no decir* (§4, variable V2). Privada: solo el servidor.
  - **Texto universal.** En todo plan con comida, el texto compartido dice lo mismo siempre: "Habrá opción sin carne." (y, si corresponde, "y sin alcohol"). Sale haya pedido alguien o no. Así no delata a nadie y baja la presión sobre quien cocina: es una regla de la ocasión (P4).
  - **Nunca un total** de comida, nunca "alguien necesita…".
  - **No prometer seguridad médica.** Texto para quien marcó una restricción: "Si tienes una alergia, avísale directamente a quien cocina: la app no puede asegurar nada."

### 3.5 Alcohol
- **Se sabe.** La presión para tomar y el estigma de no tomar están documentados en estudiantes y jóvenes de países ricos: todos sufren alguna presión; algunos no bebedores se sienten aburridos o excluidos [F19, B]; en Noruega, el 90 % de 18 a 29 siente que se espera que consuma y 1 de cada 3 bebió para evitar preguntas [F19, encuesta Ipsos, B]. Por ignorancia pluralista, cada uno cree estar más incómodo con la norma que los demás [F18, A, sobre universitarios]. **Nada de Chile** [S/F].
- **Riesgo.** El que no toma tiene que justificarse; si CRUXE pregunta por alcohol y el plan sale "sin bar", se lee.
- **La app.** (a) **Propiedad del plan, no de la persona**: quien organiza elige "con alcohol / sin alcohol / da igual (siempre con opción sin alcohol)". (b) Texto universal "habrá opciones sin alcohol". (c) Una variable privada "prefiero un plan sin alcohol" queda **para después** (§4, V5): como el presupuesto, filtra sin que el grupo sepa de quién es.

### 3.6 Parejas y "+1"
- **Se sabe.** Las parejas reconfiguran la red de amigos: la hipótesis del "retiro diádico" dice que las redes se achican y se superponen con la pareja con las etapas de la vida [F21, A; no leí los tamaños de efecto]. Un estudio de Oxford con 540 participantes reportó que el círculo íntimo bajó de unas cinco personas a unas tres al empezar una relación nueva (autorreporte, **C**, prensa) [F22]. Fusionar redes de pareja puede mejorar la relación [F23, **C**, segunda mano]. **No encontré datos sobre cuánto tensa a un grupo que las parejas vengan o no a una juntada** [S/F].
- **Riesgo.** (a) La pareja que no es invitada se siente excluida y quien la dejó afuera queda mal con ella. (b) La pareja que viene cambia el ambiente, el cupo y las bromas. (c) Preguntarle a alguien "¿vienes con pareja?" expone su estado civil y a veces algo más. (d) Quien no tiene pareja puede sentirse el único.
- **La app.** El "+1" es **una regla de la juntada, no un dato de la persona**. Quien organiza la elige al crear el plan; la ve todo el grupo; nadie declara su estado. Tres valores: *solo el grupo* · *con parejas* · *abierta: cada uno puede traer a alguien* (§5). Se justifica el "solo el grupo" como **característica de la ocasión** ("esta vez es solo el grupo"), no como juicio. El **cupo** sigue siendo del servidor: si la regla es "con parejas", quien organiza sube el máximo (y debe decirlo). Contar acompañantes en el cupo **sin migración no es posible** (§9).

### 3.7 Composición del grupo (hombres, mujeres, mixto)
Ver §5. En una línea: **no se pide ni se infiere el género.** Lo que la evidencia sugiere es que el género es un eje de separación de amistad **más débil que otros** [F24] y que las diferencias psicológicas medias son chicas en casi todo [F25]; el resto son estereotipos con costo.

### 3.8 Quién organiza siempre
- **Se sabe.** En registros de llamadas y mensajes, en una relación promedio uno inicia casi el doble que el otro, y quien ya inicia tiende a seguir; los autores señalan que el desequilibrio puede llevar a que la relación se discontinúe [F3, A, no mide planes]. Quien contacta subestima cuánto se lo agradecen [F2, A, no es sobre invitaciones]. Cuando no hay quien cierre, la responsabilidad se difunde (`problema.md`). **Ninguna medición sobre quién organiza los planes entre amigos** [S/F].
- **Riesgo.** CRUXE baja la fricción a "basta convencer a uno", lo que **concentra el trabajo en esa persona**. Si siempre es la misma, se cansa y el grupo se vuelve dependiente de ella.
- **La app.** (a) Que CRUXE haga el seguimiento: recordar a quien falta lo hace la app, no la persona ([HOY] "Recordar a quien falta", ux-flujo #89). (b) Texto que reconoce el trabajo sin cargarlo: "Tú armas el plan; CRUXE hace el seguimiento" (§8). (c) **Después:** "pasar la organización": un botón para que otra persona tome la próxima [PEDIDO a ux-flujo, idea].

### 3.9 El que nunca puede / cancelar
- **Se sabe.** Con más de 1.100 encuestados: el 80 % dijo que cancelar no afectaría la amistad pero que se enojaría si supiera que el motivo era mentira; casi el 60 % quería aviso con tiempo y un medio rápido; solo el 10 % esperaba una disculpa; más de la mitad puso entre las peores excusas haber elegido un plan mejor [F1, A/B, EE.UU.]. **No hay datos de cancelaciones en Chile** (`problema.md`).
- **Riesgo.** Quien sufre de plata, de ánimo o de ganas **inventa una excusa** si la app se la pide. Quien siempre dice "no puedo" queda marcado en el grupo.
- **La app.** [HOY] **ya cumple lo central**: "No voy" sin motivo, "Hoy paso" que quita el interés sin anunciarlo, "No puedo ninguno" sin explicación. Lo que falta: (a) separar **"no puedo" de "no quiero"** como señales distintas (`docs/usuarios-sinteticos.md` ya lo marca como hueco: "avísenme la próxima"); (b) nunca mostrar frecuencia ni historial de bajas por persona; (c) texto de salida sin culpa (§8).

### 3.10 Plata
- **Se sabe.** La tensión por plata entre amigos se menciona en encuestas comerciales y comentarios de prensa [F29, **C**]; **no encontré un estudio revisado**. Lo más cercano: la ansiedad de contribuir de F7. En Chile, la Ley 21.719 clasifica la "situación socioeconómica" entre los datos sensibles [F27, fuente secundaria; entra en plena vigencia el 1 dic 2026].
- **Riesgo.** Decir "no me alcanza" frente al grupo es difícil; se dice "no puedo".
- **La app.** [HOY] El presupuesto es privado, nunca sale en totales, y el grupo lee solo "este plan cabe en el presupuesto del grupo" (`docs/apertura.md` §2.2). Mantenerlo. Sumar: "cada uno lleva algo" como modalidad (§3.1). **Nota para Nico (decisión D5):** como el presupuesto es un dato que la ley chilena trata como sensible, conviene revisar después del evento el texto de "¿Qué guarda CRUXE de mí?" y el consentimiento; no bloquea la entrega.

### 3.11 Distancia
- **Se sabe.** [ENM10] ya contempla zona, movilidad y tiempo máximo con equidad (`contrato-enmienda-10.md`). Estudios sobre equidad de viaje en grupos de amigos: **sin fuente** [S/F].
- **Riesgo.** Quien siempre viaja lejos, o siempre recibe en una zona, acumula esfuerzo. Si la casa de alguien es el lugar, esa persona se ahorra el viaje: ventaja silenciosa.
- **La app.** [ENM10] "nadie viaja demasiado". Pendiente de barrido §1.1 punto 5: equidad histórica (rotar zonas). Sin cambios de psico.

### 3.12 Las personas que no cuadran entre sí
- **No se sabe nada medido.** Es el caso más delicado: "no quiero ir si va X". Es el dato más dañino que se podría pedir.
- **La app: no preguntarlo nunca.** La salida de esa persona es "Hoy paso" o "No puedo ninguno", sin explicación. No existe ni existirá un campo "con quién no quiero ir". Está dicho acá para que nadie lo proponga como mejora.

## 4. Variables nuevas posibles
Reglas que cumple cada variable (las del producto): **opciones cerradas, privadas, nunca texto libre, "prefiero no decir" siempre disponible, compatible con el opt-out `usar_en_agente`** (quien lo apaga es indistinguible de quien no guardó). **Totales solo con 4 o más personas y 2 o más votos** (regla actual de `docs/agente-ia.md` §2, que coincide con la idea de evitar celdas chicas [F28]); para las variables sensibles de abajo la regla es más estricta: **no hay totales, solo filtros del servidor.**

Quién la pone: **Persona** (privada), **Organizador** (decisión del grupo, pública) o **Plan** (propiedad del plan).

| # | Variable | Quién | Valores | Cómo la usa el servidor / qué ve el grupo | Costo | Prioridad |
|---|---|---|---|---|---|---|
| **V1** | **Modalidad de la juntada** (+1 y parejas) | Organizador | `solo_grupo` · `con_parejas` · `abierta` | Nada por persona. Se muestra a todos: "Solo el grupo", "Con parejas", "Abierta: cada uno puede traer a alguien". | **Sin migración** (va en el título del plan y en el texto del enlace) → con enmienda, columna en la propuesta | **Alta** |
| **V2** | **Comida de esta juntada** | Persona | `de_todo` · `sin_carne` · `sin_gluten` · `otra_restriccion` · `prefiero_no_decir` | Solo el servidor. Efecto hoy: ninguno (el catálogo no tiene la propiedad). El texto del plan dice siempre "Habrá opción sin carne". | Texto: **sin migración**. Variable guardada: **enmienda** (clave nueva en `p_preferencias`, como E10 Parte A) | Texto: **Alta**; variable: Media |
| **V3** | **Dónde** (concepto) | Organizador / Plan | `en_casa` · `lugar_neutro` | Eje del plan: lo usa el agente para ofrecer "dos formas" (§7). Visible: "En una casa del grupo" / "En un lugar neutro". | **Sin migración** (mapeo actividad→concepto en `src/agente`); con enmienda, columna `tipo_lugar` en `catalogo_agente` | **Alta** |
| **V4** | **Alcohol del plan** | Organizador / Plan | `con` · `sin` · `da_igual_con_opcion_sin` | Propiedad del plan; el texto siempre aclara "habrá opciones sin alcohol". | Texto: sin migración | Media |
| **V5** | **Prefiero un plan sin alcohol** | Persona | `si` · `da_igual` · `prefiero_no_decir` | Filtro: descarta bares/fiestas, como el techo con lluvia. Sin totales. | **Enmienda** | Baja |
| **V6** | **Puedo recibir en mi casa esta vez** | Persona | `si` · `no_esta_vez` · `prefiero_no_decir` | Solo importa cuando el motor modele casas del grupo; hoy el catálogo es de lugares simulados. Elige entre quienes dijeron `si`, sin decir quién dijo `no`. | **Enmienda mayor** + catálogo de casas | Después |
| **V7** | **Acompañantes al aceptar** | Persona, al aceptar | `0` · `1` | Cuenta para el cupo; el acompañante no tiene datos. | **Enmienda** (cambia `accept_version`) | Después |
| **V8** | **Historial de dónde fue cada juntada** | Servidor | derivado | Propone rotación sin personas ("las últimas tres fueron en casa"). | **Enmienda** (campo `tipo_lugar` en la propuesta) | Después |
| **V9** | **Esta vez algo corto** | Persona | `si` · `da_igual` | Ya propuesto por sinteticos; misma lógica que energía. | Enmienda | Baja |
| **V10** | **Estilo de la juntada** | Organizador | `simple` · `normal` · `especial` | Acerca la elección al estilo **dentro del tope del grupo**; nunca lo supera (§13). Texto fijo: «Elegimos lo más especial que le sirve a todos.» | **Sin migración** (parámetro de la función `agente` + tabla fija actividad → nivel) | **Alta** |
| **V11** | **Presupuesto que también empuja hacia arriba** | Persona | se suma `algo_especial` a `da_igual` · `algo_barato` · `ojala_gratis` | Empuje (puntos), no tope. Nadie ve el presupuesto de otro. | **Enmienda** (lista cerrada + puntaje) | Después |

### Lo que NO se pide (y por qué)
| No pedir | Motivo |
|---|---|
| **Género o sexo de cada persona** | Dato sensible; en un grupo de 5 delata. Ver §5. |
| **Si tiene pareja / estado civil** | Mismo problema. El "+1" es regla del grupo (V1). |
| **Con quién no quiere ir** | El dato más dañino (§3.12). |
| **Dieta con etiqueta permanente** ("soy vegano") | Identidad persistente y sensible [F27, F13]. Se pregunta por la comida de esta juntada. |
| **Ingreso, deuda, sueldo en pesos** | Situación socioeconómica = dato sensible [F27]. El presupuesto es de tres niveles, y eso ya es el límite. |
| **Salud o ánimo** ("hoy estoy mal") | Ya decidido en `agente-barrido.md`: se cubre con "algo tranquilo". |
| **Cualquier texto libre** | Se puede escribir ahí cualquier cosa, incluida la burla o el dato de otro. |

### Cómo se pide cada una sin exponer a nadie (reglas comunes)
1. **En el mismo lugar que hoy** ("Mis preferencias" y, para V2, en el paso de responder), con el texto de siempre: "Solo lo usa el servidor… Nadie del grupo lo ve."
2. **Siempre una salida neutra**: "Prefiero no decir" que no aporta variable (no filtra ni suma).
3. **Sin defaults que digan algo**: `sinteticos` ya marcó que la energía parte en "algo tranquilo" y no se distingue de elegirla; las variables nuevas parten "sin elegir".
4. **El efecto en el plan es siempre del tipo "se descarta/no se descarta", nunca "porque alguien…"**. Es el mismo contrato de las demás (E10): sin motivos, sin minutos por persona, sin totales.
5. **Límite que hay que decir** (ya está en `agente-ia.md` §2 y en el pitch): el plan elegido también informa. Si el plan sale sin alcohol, alguien puede sospechar. No se promete ausencia total de inferencia en grupos chicos.

## 5. Composición del grupo (hombres, mujeres, parejas) con cuidado
**Propuesta.** CRUXE **no pide, no infiere y no usa el género** de nadie para armar un plan. La composición se trata como **una decisión explícita del grupo al crear la juntada**:

| Opción de la juntada | Qué significa | Qué cubre del pedido de Nico |
|---|---|---|
| **Solo el grupo** | Vienen quienes están en el grupo, sin acompañantes. | "Juntada de solo hombres / solo mujeres / solo ellos": se produce por **quién está en el grupo y quién puede traer a alguien**, sin que la app sepa el género de nadie. |
| **Con parejas** | Cada integrante puede venir con su pareja. | "Juntada mixta con parejas." |
| **Abierta** | Cada integrante puede traer a alguien (amigo, pareja, familiar). | Cumpleaños, reencuentros. |

**Por qué no el género.** Cinco razones:
1. **Es sensible y delata.** En un grupo de 5, un total por género ("3 mujeres y 2 hombres") identifica a cada uno. Es lo mismo que el equipo ya aplica a todo: no mostrar celdas chicas [F28]. La Ley 21.719 chilena lista "identidad de género" y "vida sexual" entre los datos sensibles, con consentimiento como regla general [F27, secundaria, vigente desde el 1 dic 2026]. *Nota honesta:* la lista que leí no dice "sexo" ni "género" a secas, solo identidad de género; no es una conclusión legal y hay que verificar el texto.
2. **Excluye.** Un formulario de "hombre / mujer" deja afuera a quien no se reconoce ahí.
3. **La evidencia no lo pide.** El género es un eje de separación de amistad **más débil** que raza, edad, religión, educación y ocupación [F24, A]. Las diferencias psicológicas medias son chicas o casi nulas en la gran mayoría de las variables medidas, con excepciones en conductas motoras, algunas medidas de sexualidad y agresión física [F25, A]; **no hay nada sobre preferencias de ocio en lo que leí** [S/F]. La idea de amistades "cara a cara" entre mujeres y "lado a lado" entre hombres existe [F26, B/C], pero la misma fuente advierte que mirar solo las diferencias oculta similitudes, y **no encontré ninguna revisión sobre grupos mixtos** [S/F].
4. **Los estereotipos cuestan.** "A los hombres les gusta el fútbol y a las mujeres el café" produce sugerencias equivocadas para cada persona que no encaja y las hace sentir leídas por una etiqueta. El motor ya tiene lo que sirve: **gustos individuales, privados y opcionales** ("Me gustaría", E10). Eso es mejor predictor de lo que a una persona le gusta que su género.
5. **No es necesario.** Todo lo que el pedido de Nico quería resolver con género se resuelve con **quién puede venir** (V1) y **qué se hace** (los gustos).

**¿Y si la evidencia sugiere otra cosa?** No encontré evidencia que lo sugiera. Lo que sí sugiere es esto: (a) las parejas reconfiguran las redes y pueden achicar el tiempo con amigos [F21, F22(C)], por lo que **un grupo que quiere un espacio "solo de amigos" tiene una razón legítima**, que "Solo el grupo" cubre sin que nadie explique nada [HIPÓTESIS]; (b) en los grupos de estudio, ex compañeros y familia (`docs/apertura.md` §1), la composición pesa distinto, y la regla "quién viene" lo cubre igual. Si apareciera una evidencia fuerte de que alguna composición cambia lo que conviene proponer, lo correcto sería **que el organizador lo decida con una pregunta del plan** ("¿Qué ambiente buscan? tranquilo/fiesta/da igual", que ya existe), no inferirlo de las personas.

**Qué hace la app con "Solo el grupo / Con parejas / Abierta".**
- **Sin migración (antes del sábado):** quien organiza elige una de las tres al crear el plan (**[PEDIDO a front-juan]**); la interfaz agrega al título una marca corta ("· solo el grupo") y el mensaje del enlace repite la regla (**[PEDIDO a friccion]**). El cupo máximo sigue siendo del servidor y de quien organiza.
- **Con enmienda (opcional, antes del sábado 12:00 y con OK de Nico):** columna `modalidad` en la propuesta, visible para todos. Ver §9.
- **Después:** V7 (acompañantes que cuentan en el cupo).

## 6. Rotación del anfitrión y conflictos de casa
### Qué pasa cuando varios quieren (o nadie quiere) poner la casa
Hay tres situaciones distintas y cada una pide algo distinto:
| Situación | Riesgo | Mejor salida |
|---|---|---|
| **Todos quieren ofrecer su casa** | Quien no es elegido se siente descartado. | Una regla **acordada antes** (rotación o sorteo entre quienes se ofrecen), no una decisión de quien organiza [F10: el sorteo aceptado ex ante se percibe justo; el impuesto puede caer mal]. |
| **Nadie quiere** (o alguien siempre queda como anfitrión) | Se cae el plan o se carga a uno. | **Lugar neutro** como valor por defecto de esa vez; "cada uno lleva algo" si es en casa [F7]. |
| **Hay tensión sobre una casa concreta** (broma, orgullo, quién fue la última vez) | Cualquier explicación hiere. | **Lugar neutro "esta vez"**, sin decir por qué. |

### Mecanismos
| Mecanismo | Cuándo sirve | Riesgo | Cómo se dice (sin exponer) | Estado |
|---|---|---|---|---|
| **A. Rotación en orden** (turnero del grupo) | Grupos estables; reciprocidad visible [F6]. | Rigidez; la persona sin espacio o con casa chica queda siempre "saltada". | "Esta vez toca la casa de Fede; la próxima, en la de Caro." | **Después** (necesita historial, V8) |
| **B. Sorteo transparente** entre quienes **se ofrecieron** | Muchos ofrecen; todos aceptan la regla. | Si lo impone una persona puede caer mal [F10]. | "Se sorteó entre quienes ofrecieron su casa; salió la de Fede." | **Después** (V6); mientras, texto para que lo hagan ellos |
| **C. Lugar neutro** | Tensión, cupo grande, nadie quiere. | Sentir que "se escapa" de las casas. | "Esta vez toca un lugar neutro." | **Hoy, como concepto del plan** (V3, §7) |
| **D. Quien propone, pone** | Planes de iniciativa personal. | Castiga al que organiza (§3.8). | "Esta vez recibe quien propuso." | No recomendado |
| **E. La ocasión decide** (cumpleaños) | Hay un festejado. | Poco. | "Este es el cumple de Vale: va donde ella diga." | Texto |
| **F. Mixta 2 y 1** (dos veces casa, una neutro) | Grupos que quieren casa pero no cargar. | Contabilidad que irrita. | "Esta vez toca un lugar neutro." | **Después** |

### Cómo decírselo al grupo sin que nadie quede expuesto
1. **Hablar del plan, no de la casa ni de la persona.** "Esta vez toca un lugar neutro" y no "como nadie quiere recibir…".
2. **Sin porque.** F1: si no se pide motivo, nadie lo inventa.
3. **Futuro sin deuda.** "La próxima puede ser en una casa", no "ya que no fue en la de X".
4. **Positivo: ofrecer es regalo.** Si la oferta es pública ("Fede ofreció su casa"), el valor está en quien da; la persona que no ofreció no aparece. *Trade-off de V6:* una oferta **privada** cuida a quien no puede recibir, pero hace que el motor sepa de casas; una oferta **pública** es simple, pero la ausencia de oferta se nota. Dejamos las dos descritas porque la elección es de producto (**decisión D4**).
5. **El texto lo dice CRUXE, no una persona.** Si lo dice la app, nadie queda como "el que sacó la casa".

## 7. "No ser absolutista": dos planes parecidos con distinto concepto
### Lo que no cambia
El motor publica **una versión** por vez y cada persona confirma **esa** versión (`AGENTS.md`, reglas del producto; `docs/contrato.md`). Eso es lo que convierte interés en compromiso y no se negocia.

### Lo que ya hace el agente
La función `agente` ya recibe hasta **tres candidatas** del servidor (`docs/contrato-enmienda-4.md` §4.1, `docs/agente-ia.md` §1), todas ya validadas contra las condiciones privadas; la IA elige **una recomendada** y redacta; quien organiza ve todas y toca "Usar esta opción", que precarga "Nueva propuesta" (**no crea ni confirma nada**). O sea: la parte "dos o tres opciones" **ya existe**. Lo que falta es que las opciones difieran en **concepto** y no solo en puntaje.

### Propuesta: "dos formas de juntarse"
El agente presenta a quien organiza **dos** de las candidatas elegidas para que difieran en **un eje de concepto**, ambas con **todas las restricciones cumplidas**. Los ejes son seguros porque no revelan a nadie:

| Eje | Un lado | El otro lado | Ejemplo | Por qué es seguro |
|---|---|---|---|---|
| **Dónde** (V3) | En casa (asado, juegos en casa) | Afuera / lugar neutro (parrilla, parque, restaurante) | "Asado en casa de Fede" ↔ "Parrilla en un lugar neutro" | Ambas ya cumplen techo, presupuesto, viaje. No revela quién prefiere cuál. |
| **Ritmo** (ya existe `energia`) | Tranquilo (café, juegos, cultura) | Con movimiento (pádel, fútbol, cerro) | "Tarde de café y juegos" ↔ "Pádel" | Mismo motivo. |
| **Momento** (ya existe `momento`) | De día | De noche | | Mismo motivo. |

**El eje precio, con cuidado**: se evita decir «más barato / más caro» (delata el presupuesto del grupo). Sí se puede ofrecer como **estilo** («más simple / más especial») cuando **ambas** formas ya pasaron el tope del grupo; ver §13.

### Cómo se explica sin herir
Estructura fija de texto (la redacta la IA con estos límites, §8.7):
- **Título:** "Dos formas de juntarse. Las dos le sirven al grupo."
- **Una línea por forma**, simétrica, con lo bueno de cada una: "En casa: más tiempo y más tranquilo" / "En un lugar neutro: nadie cocina ni recibe."
- **Una línea de diferencia:** "La diferencia es dónde." (el eje, nunca el porqué).
- **Cierre:** "Elige la que sientan más suya. La otra queda guardada para otra vez."
- **Una sola "Sugerida"** (la de mayor puntaje del servidor, como hoy). La otra se llama **"Otra forma"**, no "alternativa" ni "plan B", para que no suene a premio de consuelo.
- Nunca: motivos ("porque a alguien…"), nombres, comparación de casas, calificativos de personas.

### Cómo sigue (sin romper nada)
1. Quien organiza elige **una** → "Nueva propuesta" → **versión 1** como hoy. Una versión, una confirmación.
2. La otra forma **queda a mano** como candidata. **Después:** si el plan se cae, `propose_repair` puede ofrecer la "otra forma" como versión 2 (la reparación ya existe y no hereda aceptaciones). No está construido (**[Después]**).

### Qué se descarta y por qué
- **Que el grupo vote entre las dos.** Reintroduce la negociación en el chat que CRUXE evita y expone a quien pierde. Además hay más pasos antes de que alguien se comprometa. No recomendado para el sábado. Un "sondeo liviano" con totales solo desde 4 personas es una idea para después.
- **Publicar dos versiones a la vez.** Rompe "una opción por versión". No.
- **Ofrecer cuatro.** Sin fundamento: el metaanálisis de sobrecarga de opciones da efecto promedio casi cero [F30]. Dos es una decisión de diseño nuestra [HIPÓTESIS]: da una salida real sin reabrir la negociación. Lo mediría `sinteticos` si hubiera tiempo (pregunta: ¿quien organiza elige distinto con dos conceptos que con tres puntajes?).

### Qué hace falta
- **agente-ia** (sin migración): elegir de las tres candidatas la recomendada y la que más difiere en el eje de "dónde"; si no hay, en "ritmo"; presentar A/B; texto y lista de palabras prohibidas (§8.7). El mapeo actividad→concepto vive en `src/agente`:
  - **En casa:** `asado`, `juegos_casa`.
  - **Afuera / neutro:** `cena`, `bar`, `cine`, `cultura`, `juegos_salida`, `cafe`, `parque`, `padel`, `futbol`, `cerro`, `fiesta`.
  - **Ritmo (tranquilo / con movimiento):** no se mapea a mano: sale del campo `energia` que ya tiene cada fila del catálogo (`algo_tranquilo` / `con_todo`).
- **Un hueco que hay que decir:** el catálogo tiene **un solo asado**, "Quincho de Tomi (Simulación)", que es de casa. Para que "asado en casa" y "parrilla en un lugar neutro" compitan, hace falta **una fila nueva** de asado en lugar neutro. Es una fila de datos, **no una función**: ver §9 B1.
- Si el servidor devuelve tres candidatas del mismo concepto (por puntaje), hoy no hay segunda forma que mostrar. La garantía de que haya al menos una de cada concepto cuando existan es una regla de `proponer_plan_borrador` (migración de función): §9 B2.

## 8. Textos sugeridos
Tono rioplatense neutro, cálido y sin culpas. **La app habla de «tú»** (`rincones` y `sinteticos` ya marcaron el voseo como incoherencia), así que los textos van en «tú». Si el equipo decide voseo, se cambia en bloque. Cada texto dice **quién lo ve** y **dónde viviría** (el dueño de la ruta decide si lo aplica).

### 8.1 Alguien se baja
| Quién ve | Texto | Notas |
|---|---|---|
| **El grupo** (aviso) | «Cambió el plan: ahora son 3 y hacen falta 4. Las confirmaciones anteriores no cuentan; si te sirve, vuelve a confirmar.» | Sin nombre y sin motivo. Coherente con F1: nadie necesita explicar. (`avisoPersonal.ts` y `recordar.tsx` ya dicen "Cambió «X»…".) |
| **La persona que se baja** (al confirmar "No voy") | «Gracias por avisar. No hace falta contar por qué.» | Baja el costo de avisar. F1: casi el 60 % valora el aviso; solo el 10 % espera una disculpa. |
| **Quien organiza** | «Quedan 3 de 4. Puedes buscar otra fecha o ver otra forma de juntarse.» | Ofrece dos salidas (§7), no culpa. |
| **El grupo, cuando el plan se repara** | «Hay una versión nueva. Mira qué cambió y confirma de nuevo si puedes.» | |

### 8.2 No se va a la casa de alguien / se elige un lugar neutro
| Quién ve | Texto | Notas |
|---|---|---|
| **El grupo** (ficha del plan) | «Esta vez toca un lugar neutro.» | Sin porque. |
| **El grupo** (ficha, con viaje conocido) | «Esta vez toca un lugar neutro. Queda a menos de 35 minutos para todos (estimado).» | Solo si `viaje` no es null (4 personas o más). |
| **Quien organiza** (ayuda, antes de elegir persona) | «¿Dónde se juntan? En una casa del grupo, en un lugar neutro, o por turnos. Si varios quieren recibir, prueben con turnos: la próxima vez le toca a otro.» | |
| **El grupo, futuro sin deuda** | «La próxima puede ser en una casa.» | No: «la próxima sí va a ser en la de Caro» (compromete a una persona). |
| **Quien ofreció su casa y no fue elegido** (si la oferta es pública, V6) | «Gracias por ofrecerla. Queda para otra ocasión.» | Solo si se construye V6. |

### 8.3 Comida: «alguien no come carne»
| Quién ve | Texto | Notas |
|---|---|---|
| **El grupo** (ficha de cualquier plan con comida) | «Habrá opción sin carne.» | Siempre, sin que dependa de quién respondió (P4). Con alcohol: «Habrá opción sin carne y sin alcohol.» |
| **La persona que lo marca** (V2) | «Anotado. Solo lo ve la app y no se muestra a nadie.» | |
| **Quien tiene una restricción médica** | «Si tienes una alergia, avísale directamente a quien cocina: la app no puede asegurar nada.» | Evita prometer seguridad que CRUXE no puede dar. |
| **Quien organiza** | «Para esta comida, ten a mano una opción sin carne. No hace falta saber para quién.» | |
| **Frase prohibida** | «Hay un vegetariano.» «Para los que no comen carne.» «Para Luna.» | Etiqueta / dato de una persona. |

### 8.4 El plan cambia (versión nueva)
| Quién ve | Texto |
|---|---|
| **El grupo** | «Hay una versión nueva del plan. Las confirmaciones anteriores no cuentan; si te sirve, confirma de nuevo.» |
| **El grupo, qué cambió** | «Cambió: la fecha» / «Cambió: el lugar» (nunca «por qué»). |
| **Quien ya había confirmado** | «Tu confirmación era de la versión anterior. Esta es distinta: confírmala si te sirve.» |

### 8.5 +1 y parejas
| Quién ve | Texto |
|---|---|
| Solo el grupo | «Esta vez es solo el grupo.» |
| Con parejas | «Pueden venir con pareja.» |
| Abierta | «Cada uno puede traer a alguien. Cuenta para los cupos.» |
| Si el cupo cambia | «Cupo ampliado a 8 para que quepan acompañantes.» |
| **Prohibido** | «Sin parejas porque…», «solo para los que…» |

### 8.6 Sobre quien organiza
| Quién ve | Texto |
|---|---|
| **Quien organiza** (al crear) | «Tú armas el plan. CRUXE avisa a quien falta y hace el seguimiento.» |
| **Quien organiza** (al confirmarse) | «Se armó la juntada. Gracias por moverlo.» |
| **El grupo** (cuando el organizador ya organizó varias veces — después) | «¿Quién arma la próxima?» (con botón de pasar la organización) |

### 8.7 Dos formas de juntarse (para el agente)
**Salida que debe producir la IA** (plantilla; la validan las listas del servidor):
- Título: «Dos formas de juntarse. Las dos le sirven al grupo.»
- Forma sugerida: «En casa: un asado tranquilo, con tiempo para conversar.»
- Otra forma: «En un lugar neutro: parrilla afuera; nadie cocina ni recibe.»
- Diferencia: «La diferencia es dónde.»
- Cierre: «Elige la que sientan más suya; la otra queda para otra vez.»

**Lista adicional de palabras que el agente no puede escribir** (se suma a la que ya existe para presupuesto y viaje, `docs/agente-ia.md` §2): «vegetariano», «vegano», «celíaco», «alérgico», «no come», «pareja de», «novio», «novia», «soltero», «hombres», «mujeres», «chicos», «chicas», «casa de» seguido de un nombre en una comparación, «otra vez en casa», «de nuevo en casa», «ya que nadie», «como nadie», «para variar», «porque X no puede». Y los **nombres de integrantes** (ya prohibidos).

### 8.8 Otros momentos delicados
| Momento | Quién ve | Texto |
|---|---|---|
| Recordar sin presión | El grupo | «Faltan respuestas para «X». Sin apuro: solo cuenta lo que confirmes. Toca, elige tu nombre y marca cuándo puedes (es privado): enlace» |
| Quien dice «no puedo ninguno» | Quien responde | «Gracias por contestar. Puedes cambiarlo después.» (ya existe: «Puedes cambiarlo después».) |
| Quien tiene ganas pero no puede | Quien responde | «Cuenta como interés, no como confirmación.» (hoy el interés se muestra al grupo; ver `usuarios-sinteticos`.) |
| Después de la juntada | El grupo | «¿Cómo les fue? Se juntaron / No se pudo / La próxima.» (una pregunta cerrada) |
| Un grupo que quiere sorteo | Quien organiza | «Si varios quieren recibir, acuerden de antemano cómo decidir: turnos o sorteo. Es más fácil de aceptar si se decide antes.» (F10) |

### 8.9 El cierre: que nadie tenga que ir primero
| Quién ve | Texto | Notas |
|---|---|---|
| **Quien va a confirmar** (junto al botón) | «Tu confirmación solo vale si llegan 4. Si no llegan, nadie queda comprometido.» | Lo central de la causa 5 (§0b). Es la frase que más falta hoy. |
| **Todos** (cuenta atrás) | «Se cierra el jueves a las 20:00. Si para entonces no están las 4 confirmaciones, el plan no se arma y no pasa nada.» | Dice el final con claridad (causa 6). |
| **Quien falta, en su pantalla** | «Falta tu respuesta.» | El aviso por nombre propio (causa 1). |
| **El grupo, en el recordatorio** | «Te lo recuerda CRUXE: faltan 2 respuestas y se cierra mañana a las 20:00.» | Sin nombres. |
| **Quien organiza, solo en la app** | «Hoy conviene recordar: faltan 2 y se cierra mañana a las 20:00.» | No envía nada (causa 2). |
| **Recordatorio de la víspera** | «Mañana a las 14:00 en [lugar]. Calcula tu viaje con unos 15 minutos de margen. Si no puedes ir, avisa: no hace falta contar por qué.» | Une U4 y §8.1. |

## 9. Priorización
### A. Antes de la entrega del sábado 13:00, **sin migración** (textos, agente, interfaz)
| # | Qué | Dueño | Esfuerzo | Valor |
|---|---|---|---|---|
| A1 | **Frase universal de comida y alcohol** en el texto del plan y del mensaje del agente ("Habrá opción sin carne") | agente-ia (prompt del agente y texto fijo) | Bajo | Alto |
| A2 | **Lista de palabras prohibidas** ampliada (§8.7) en el filtro de salida del modelo | agente-ia | Bajo | Alto |
| A3 | **«Dos formas de juntarse»**: presentación A/B de dos de las tres candidatas con el eje de «dónde» y la plantilla de §7; mapeo actividad→concepto en `src/agente` | agente-ia | Medio | Alto |
| A4 | **Modalidad de la juntada** (solo grupo / con parejas / abierta) en «Nueva propuesta» como marca en el título y repetida en el mensaje del enlace | front-juan (NuevaPropuesta) + friccion (compartir.ts) | Bajo | Medio |
| A5 | **Ayuda plegable «¿Dónde se juntan?»** (casa / neutro / turnos) antes de elegir a la persona que no puede faltar | front-juan | Bajo | Medio |
| A6 | **Textos de §8** (baja, plan cambia, +1, quien organiza) en avisos y mensajes | ux-flujo (avisoPersonal, recordar), friccion (compartir.ts) | Bajo | Medio |
| A7 | **Lámina de pitch** (§10) | agente-ia (`docs/pitch*.md`) | Bajo | Alto |
| A8 | Pregunta de contexto a Nico: confirmar que **género/pareja de personas no se piden** (D2) | Nico | — | Alto |

### B. Necesita una **enmienda** (antes del sábado 12:00 y con OK de Nico)
Todo lo de abajo depende de que backend tenga tiempo; después de las 12:00 no hay migraciones. Los ordeno por costo.
| # | Qué | Por qué | Tamaño |
|---|---|---|---|
| **B1** | **Una fila de catálogo nueva**: «Asado en lugar neutro (Simulación)», zona ya existente, mismos atributos que el asado. | Sin ella, «dos formas» con asado no tiene segunda forma. **Es solo datos**, no cambia ninguna función ni firma. La redacta apertura (`catalogo-ampliado.md`); la aplica backend. | Muy chico |
| **B2** | **Columna `tipo_lugar` en `catalogo_agente`** (`casa` / `neutro`) y regla en `proponer_plan_borrador`: si existe, incluir al menos una candidata de cada tipo. | El servidor garantiza que haya dos conceptos; la IA no depende de la suerte del puntaje. Cambia una función (sin cambiar firma). | Medio |
| **B3** | **Clave `comida`** en `p_preferencias` (V2). | Variable guardada, para filtros futuros. Hoy no tiene efecto sin catálogo con propiedades de comida. | Medio, bajo valor hoy |
| **B4** | **Columna `modalidad` en la propuesta** (V1) y que `get_proposal_state` la devuelva. | Que sea un campo y no un texto en el título. Cambia `create_proposal` (firma) → choca con la lista permitida 31/0. | Alto riesgo |

**Mi recomendación:** pedir **solo B1** (y B2 si backend lo ve chico). B3 y B4 no valen el riesgo antes del sábado; mientras tanto A1 y A4 cubren lo esencial con texto.

### C. Para después de la entrega (anotar como «siguiente paso» en el README)
| # | Qué |
|---|---|
| C1 | **Historial de dónde fue cada juntada** del grupo y rotación (V8, §6). |
| C2 | **Oferta de casa** (V6) y sorteo transparente entre quienes se ofrecen. |
| C3 | **Acompañantes** que cuentan en el cupo (V7). |
| C4 | **«Pasar la organización»** a otra persona (§3.8). |
| C5 | **Versión 2 con la «otra forma»** cuando el plan se cae (§7). |
| C6 | **«¿Cómo les fue?»** después de la fecha. |
| C7 | **Sondeo liviano** con totales solo desde 4 personas (con cuidado: reintroduce votación). |
| C8 | **Variables de alcohol y duración** (V5, V9). |
| C9 | Revisión del texto de privacidad y consentimiento por la **Ley 21.719** (vigente desde el 1 dic 2026). |
| C10 | Validación **con gente real** de las hipótesis de §2 y §3 (hoy son de escritorio). |

### D. Cierre, ubicación y nivel de gasto (pedido de las 20:28)
| # | Qué | Dueño | Cuándo | Esfuerzo |
|---|---|---|---|---|
| D1 | Frase «Tu confirmación solo vale si llegan N; si no llegan, nadie queda comprometido» junto al botón de confirmar, y «Se cierra el jueves… si no están las N confirmaciones, el plan no se arma» (§8.9) | front-juan (PlanTab) | **Antes** | Bajo, alto valor |
| D2 | «Hoy conviene recordar: faltan N y se cierra mañana» visible solo para quien organiza, sin enviar nada; y «Te lo recuerda CRUXE» en el texto del recordatorio | ux-flujo | **Antes** | Bajo |
| D3 | `.ics` con `VALARM` (-1 día y -2 h) y `LOCATION`; margen de 15 minutos en el recordatorio (§12 U3, U4) | friccion (`compartir.ts`) | **Antes** | Bajo |
| D4 | Botón «Buscar el lugar en el mapa» (solo el lugar; oculto o «(ejemplo)» si es simulación) y línea fija de día, hora y duración (§12 U1, U2) | front-juan | **Antes** | Bajo |
| D5 | **Estilo** simple · normal · especial: selector para quien organiza, parámetro en la función `agente`, tabla fija actividad → nivel, frase fija; dos formas por estilo (§13) | agente-ia | **Antes** | Medio |
| D6 | Tiempo estimado propio por persona (§12 U6) | backend | **Después** (enmienda) | Medio |
| D7 | Presupuesto con `algo_especial` (V11) | backend | **Después** (enmienda) | Medio |

## 10. Lámina de pitch: «CRUXE entiende la dinámica de un grupo»
**Título:** *Un grupo no discute el plan: discute lo que el plan dice de cada uno.*

**Cinco tensiones, cinco respuestas de diseño** (una fila cada una; íconos de personas, sin caras):
| La tensión de un grupo real | Lo que hace CRUXE |
|---|---|
| «¿En la casa de quién?» | Dos formas de juntarse: *en casa* o *en un lugar neutro*, las dos ya válidas para todos. Sin decir por qué. |
| «Yo no como carne / yo no tomo» | Se pregunta por *la comida de esta juntada*, no por la persona. El plan dice siempre «habrá opción sin carne». |
| «¿Puedo ir con mi pareja?» | Una regla del grupo, no un dato de cada uno: *solo el grupo · con parejas · abierta*. |
| «Me bajo» | «Gracias por avisar. No hace falta contar por qué.» La versión nueva no hereda confirmaciones. |
| «Que confirme otro primero» | «Tu confirmación solo vale si llegan 4. Si no llegan, nadie queda comprometido.» Nadie va primero con riesgo. |

**Frase para decir en voz alta (≤ 25 segundos):** «Lo difícil de juntar amigos casi nunca es la fecha. Es que nadie quiere ser el que dice "no quiero ir a tu casa", "no como carne", "no me alcanza" o "no voy". CRUXE deja que cada uno lo diga en privado, y el grupo ve solo un plan que sirve, sin explicar por qué.»

**Cuando pregunten por género:** «No lo pedimos. Es un dato sensible y en un grupo de cinco delata. Lo que le importa a un plan no es quién es cada uno sino quién puede venir; y eso lo decide el grupo.»

**Reglas de la lámina** (igual que `apertura.md` §3): ninguna cifra sobre cuánto «mejoran» los planes; citas sólo con su fuente y fuerza (F1: «80 % dice que cancelar no daña la amistad pero que sí duele que mientan», muestra de EE.UU.); no decir «estudios muestran que» sin decir cuál; no afirmar nada sobre Chile que no sea de `problema.md`.

## 11. Límites honestos
- **Es investigación de escritorio de una noche.** No hay entrevistas, ni datos de personas reales, ni prueba con un grupo real. Lo etiquetado [HIPÓTESIS] se dice «creemos que».
- **La evidencia casi no es chilena.** Cancelaciones, anfitrión, alcohol y bromas vienen de EE.UU., Reino Unido, Noruega y Europa; si alguien pregunta por Chile, la respuesta honesta es «no encontramos estudios locales».
- **Dos números del proyecto vienen con cautela:** el 80 % de F1 es de una encuesta de EE.UU. y los datos de dieta de F17 son de encuestas de opinión citadas por prensa.
- **Lo que no pude verificar:** el tamaño de muestra de F13, la página de F15, el texto de la Ley 21.719 (solo guías secundarias), el original de F20, el libro de Oldenburg (F8) y las publicaciones de F23.
- **La privacidad tiene un límite que ya está declarado** (`docs/agente-ia.md` §2): el plan elegido también informa. «Habrá opción sin carne» siempre reduce ese límite en comida; «esta vez toca un lugar neutro» lo reduce en lugar. No lo elimina.
- **El cierre se apoya en analogías.** Difusión de responsabilidad, umbrales y contratos de aseguramiento vienen de emergencias, modelos teóricos y economía; no hay un estudio de planes entre amigos. Y la réplica de 2026 sobre plazos [F37] mantiene esa causa como hipótesis.
- **No hay mediación.** CRUXE no resuelve una pelea ni evita que alguien se ofenda. Evita ser la causa.

## 12. Ubicación: que cada uno se ubique en tiempo y espacio sin exponer a nadie
Pedido de Nico (20:28): *«que la gente esté ubicada en tiempo y espacio»*. Regla de oro (no se negocia): **nunca la ubicación, la comuna ni el tiempo de viaje de otra persona.** Lo que se puede mostrar es **del plan** (día, hora, duración, lugar) y **de uno mismo, calculado en su propio teléfono**.

### Qué existe hoy [HOY]
- **Tiempo:** la franja con día, hora de inicio y fin en hora de Santiago; el cierre de aceptación; "Calendario" que descarga un `.ics` (`descargarCalendario`, `src/lib/compartir.ts`, botón en `CierrePlan` de `PlanTab.tsx`). El `.ics` **no tiene alarma** (busqué `VALARM`, `TRIGGER` y `LOCATION` en `src/` y no están).
- **Espacio:** zona y movilidad privadas; "Queda a menos de N minutos para todos (estimado)" solo con 4 personas o más con zona [ENM10]. El lugar está **en el título** del plan (no hay campo de lugar: `docs/contrato.md`).
- **Enlaces a mapas:** `src/agente/canchas.ts` ya arma enlaces de Google Maps **por categoría y sin ubicación** (Maps muestra lo que está cerca de quien toca; CRUXE no la conoce).

### Propuestas
| # | Qué | Cómo se ve | Privacidad | Costo |
|---|---|---|---|---|
| **U1** | **Día, hora y duración siempre juntas y en grande** en la ficha del plan y en el aviso de confirmación: «Sáb 31 oct · 14:00 a 17:00 (3 h) · hora de Santiago». | Una línea fija arriba de todo. | Es del plan. | Texto/interfaz, sin migración |
| **U2** | **«Buscar el lugar en el mapa»**: enlace de Google Maps con **solo el lugar** (el título del plan) como búsqueda. Quien lo toca ve **su propio** tiempo, ruta y hora de salida **en Maps**, calculado en su dispositivo. | Botón en la ficha. | CRUXE **no recibe** de dónde sale nadie. Maps URLs no pide clave y se arma con `api=1` [F39]. | Sin migración |
| **U3** | **Alarma en el calendario**: el `.ics` suma dos recordatorios (1 día antes y 2 h antes). | Mismo botón «Calendario». | Todo ocurre en el teléfono. `VALARM` está en el estándar iCalendar [F39]. | Sin migración (`compartir.ts`, friccion) |
| **U4** | **«Sal con margen»**: texto fijo en el recordatorio: «Calcula tu viaje con unos 15 minutos de margen.» | Línea en `CierrePlan` y en el recordatorio. | Texto igual para todos. | Sin migración |
| **U5** | **«Punto medio»**: ya existe, **como regla del servidor**: se elige el lugar con **menor viaje máximo** (equidad, E10). No se dibuja un mapa con puntos de personas. Se dice: «Elegido para que nadie viaje demasiado» y, con 4 o más, el número. | Una línea. | Nada por persona. | Texto |
| **U6** | **Tu tiempo estimado, solo tuyo** calculado por el servidor y devuelto **solo a esa persona**: «Desde tu zona, unos 25 minutos (estimado)». | Línea en la ficha. | Es una salida nueva del servidor (minutos propios): **hoy no existe** y E10 prohíbe minutos por persona en respuestas **compartidas**. | **Enmienda** (nuevo campo propio en `get_proposal_state` o RPC nueva): no antes del sábado |

**Por qué U2 y no U6 para el sábado.** U2 da lo mismo (cada uno ve su tiempo) sin tocar el servidor ni mover datos de nadie. U6 es más prolijo (no depende de Maps ni de una dirección) pero cambia una respuesta del contrato.

### Límites que hay que decir
- **El lugar está en el título, no en un campo.** El enlace busca el texto del título: sirve para sitios públicos («Parrilla El Sabor, Ñuñoa»). **Para una casa no sirve, y está bien**: CRUXE no guarda direcciones de nadie. Los lugares del catálogo de la demo son de **simulación**: en la demo el botón debe decir «(ejemplo)» o quedar escondido. Pedido a front-juan.
- **El «hora de salida» exacto no se calcula acá.** Sale de Maps. Lo que se agrega es margen (U4). El respaldo es que las personas **subestiman cuánto tardan** en lo que planean: en un estudio con 37 estudiantes de psicología, la estimación promedio fue de 33,9 días y la realidad de 55,5, y solo cerca del 30 % terminó cuando lo había previsto [F38, A, tareas y no viajes: [ANALOGÍA]].
- **No hay ubicación en vivo** ni «mira dónde está cada uno» ni «voy en camino» con mapa. Mostrar dónde está alguien convierte una juntada en vigilancia y es justo lo contrario de «nadie ve tu zona». Una versión sin ubicación («Voy en camino» como botón de un toque que manda un texto) queda para después.
- **No mostrar la comuna de nadie** ni un mapa de zonas del grupo, aunque sea «anonimizado»: con 5 personas y 8 comunas, el mapa delata.

### Qué hace falta
- **front-juan**: botón «Buscar el lugar en el mapa» en `PlanTab.tsx` (oculto o «(ejemplo)» si el lugar es de simulación) y línea fija U1.
- **friccion**: `.ics` con `VALARM` (-1 día y -2 h) y `LOCATION` = título; texto de margen en el recordatorio.
- **ux-flujo**: línea U5 en la ficha del borrador cuando hay `viaje`.

## 13. Nivel de gasto y estilo, sin clase social
Pedido de Nico (20:28): que un plan no quede mal, por ejemplo proponer algo muy barato a un grupo que prefiere otra cosa. **Con una condición que él mismo fijó: no preguntar ni inferir la clase social.** Este apartado explica por qué y cómo se cubre la intención sin ese dato.

### 13.1 Por qué NO se usa la clase social
1. **Es dato sensible por ley.** La Ley 21.719 lista la «situación socioeconómica» entre los datos sensibles, con consentimiento como regla general [F27, guía secundaria; vigencia plena 1 dic 2026; verificar el texto oficial].
2. **La comuna es un proxy, y es un mal proxy.** Santiago tiene segregación residencial por ingresos documentada (la de los más pobres es mayor que la de los más ricos, y varía mucho entre comunas) [F40, A]. Pero **una comuna no dice cuánto gasta una persona**: se mezcla gente de muchos niveles, y usarla así es un caso de **discriminación por proxy**: un dato pedido para una cosa (viaje) se usa para otra [F41, A: analiza el caso del código postal en EE.UU.; [ANALOGÍA]]. En CRUXE esto se traduce en una regla: **la zona se usa solo para el viaje.** Se agrega como principio P8 (§1).
3. **Delata.** En un grupo de 5, «el grupo es de nivel alto» identifica a la persona que no lo es.
4. **Se equivoca.** Inferir mal hace exactamente lo que Nico no quiere: ofrecer algo que no va.
5. **Ya tenemos lo que sirve.** El presupuesto que la persona dice (tres niveles) es una **preferencia de esta juntada** y es mejor que cualquier inferencia: la persona lo decide, lo cambia cuando quiere y no queda como etiqueta.

**Lo que tampoco se infiere, aunque sea técnicamente posible:** nombre, apellido, comuna, modelo de teléfono, horario de uso, tipo de actividad que le gusta, o cómo responde.

### 13.2 La intención de Nico, cubierta sin ese dato
Hoy el presupuesto tiene **un solo sentido**: baja el tope. Valores: «ojalá gratis», «algo barato», «da igual». El plan nunca supera el presupuesto más bajo del grupo [HOY]. Eso protege a quien menos puede gastar, pero **no empuja hacia arriba**: un grupo donde todos eligieron «da igual» y quiere festejar algo igual puede recibir lo más simple. Son dos fallas distintas del mismo mecanismo: (a) el plan queda **por debajo** de lo que el grupo quería y (b) el plan queda **por encima** de lo que alguien puede. La (b) ya está cubierta. La (a) se cubre con tres capas, de la más rápida a la más completa.

| Capa | Qué es | Quién la pone | Qué hace el servidor / agente | Costo | Cuándo |
|---|---|---|---|---|---|
| **E1. Estilo de la juntada** | «Simple · Normal · Especial». Es el *tono de la ocasión* (un cumpleaños suele ser especial; un martes de pádel, simple). | **Quien organiza**, al pedirle al agente o al crear el plan. No es dato de ninguna persona. | El servidor **ya filtró** las candidatas por el tope del grupo. El agente **ordena las que quedaron** acercando la elección al estilo y lo dice con una frase fija: «Elegimos lo más especial que le sirve a todos.» | **Sin migración**: parámetro de la función `agente` y tabla fija actividad → nivel en `src/agente` (ver abajo) | **Antes del sábado** |
| **E2. Dos planes parecidos con distinto estilo** | Entre las candidatas, dos que difieren en estilo, ambas dentro del tope. Con el mismo diseño de «dos formas de juntarse» (§7), ahora con el eje **estilo**. | Quien organiza **elige una** (no vota el grupo) | Mismo mecanismo que §7. | Sin migración | **Antes del sábado**, junto con §7 |
| **E3. Presupuesto privado hacia arriba** | Un valor nuevo `algo_especial` («me gustaría algo especial esta vez»). Es un **empuje**, no un tope. | **Cada persona**, en privado | El tope sigue siendo el más bajo; el empuje suma puntos a candidatas de nivel mayor **dentro** del tope. Nadie ve el presupuesto de otro. | **Enmienda** (nuevo valor en la lista cerrada de `presupuesto` + regla de puntaje; cambia una función) | Después del sábado |

**Qué hace E1 sin tocar la base.** Hoy las candidatas no traen el precio (el presupuesto del grupo no sale de la función). Mientras tanto, el agente usa una tabla fija con el nivel de gasto de cada actividad, **copiada del catálogo sembrado** (`docs/contrato-enmienda-4.md` y migración 0038): `parque`, `cultura`, `cerro` = gratis; `asado`, `futbol`, `juegos_casa`, `cine`, `cafe` = barato; `padel`, `fiesta`, `cena`, `bar`, `juegos_salida` = medio. Riesgo: si el catálogo cambia, la tabla queda vieja; por eso se anota en el pedido. Con la columna `tipo_lugar`/`nivel` (§9 B) se acabaría ese riesgo.

### 13.3 Cómo se explica
- **Nombre del estilo**, sin palabras de plata (el filtro de salida ya bloquea «gratis», «barato», «económico»): **Simple · Normal · Especial**.
- **Texto al organizar:** «¿Qué estilo buscan? Simple, normal o especial. Siempre dentro de lo que le sirve a todos.»
- **Texto del resultado, siempre igual:** «Elegimos lo más especial que le sirve a todos.» (si pidió «especial») · «Elegimos algo simple que le sirve a todos.» (si pidió «simple»). **No cambia si no pudo llegar al estilo.**
- **Dos formas** (E2): «Dos formas de juntarse. Una más simple y otra más especial. Las dos le sirven al grupo.» Sin precios.

### 13.4 Lo que esto no resuelve (límites)
- **Inferencia residual.** Si el organizador pide «especial» y recibe algo simple, puede sospechar que alguien aceptó menos. **Ya existe** hoy: «Si sale un plan gratis, el grupo sabe que alguien lo pidió» (`agente-ia.md` §2). El texto fijo lo reduce; no lo elimina.
- **El tope más bajo manda, por diseño.** Quedar excluido pesa más que festejar de forma simple; esa asimetría es una decisión de valores, no un descuido.
- **Anclaje.** Mostrar primero el plan más caro puede subir lo que la gente está dispuesta a pagar (hay evidencia de anclaje de precios en menús y alojamiento, con muestras chicas; **no la usé como fuente**). Por eso la «Sugerida» es la del servidor y no la más cara.
- **Esto no es un perfil de nadie.** El estilo es de la **ocasión**. No se guarda por persona ni por grupo.

### 13.5 Otras formas de no dejar mal a nadie con la plata (sin datos)
1. **Costo visible desde el principio**: el plan ya declara «costo cero» o «aporte fijo conocido por persona» (`caso-canonico.md`). Mantenerlo y mostrarlo arriba (U1): nadie descubre el costo en la puerta.
2. **«Cada uno lleva algo»** como modalidad (§3.1).
3. **Un plan «simple» siempre disponible como segunda forma**, aunque el estilo pedido sea «especial».
