# Del output al grupo: cómo se discute la opción (#100)

Dueño: ux-flujo (rama `wip/ux`). Pedido de Nico (20:30, vía coordinador): "La gente manda un input, pero ¿cómo se hace después para discutir ese output en el grupo de WhatsApp? Que se pueda opinar sobre la propuesta y debatir, sin ser tan absolutista."
Escrito: viernes 23 oct 2026, 20:33. Marcas: **[visto]** en pantalla (producción `fae49fa`, 20:26-20:28, grupo ficticio "Los del pádel"), **[leído]** en el código, **[propuesta]** no existe todavía.

## 0. En cinco líneas

1. Hoy el output es UNA opción (versión N) y cada persona tiene dos respuestas: **confirmar** o **retirarse para siempre**. No hay un "esta fecha no, pero sigo en el plan".
2. Al publicarse la opción no sale nada hacia WhatsApp; recién con el grupo confirmado hay un mensaje, y ese mensaje no trae enlace.
3. Propuesta: no abrir un chat nuevo. Sumar **opiniones estructuradas sobre la versión** ("voy", "así no puedo, pero sigo", "prefiero el otro plan"), privadas como las condiciones, con una **ronda con plazo** que alimenta la versión siguiente por el circuito de versiones que ya existe.
4. WhatsApp queda para la charla (bromas, quién lleva qué, el "+1"); la app guarda la decisión (fecha, quiénes van, qué versión).
5. Antes de las 11:00 sin migraciones: mensajes de WhatsApp más útiles (hechos), avisos personales (hechos, falta conectarlos) y textos. Lo demás necesita una enmienda: ver §3.2 y "Decisiones para Nico" en `agentes/ux-flujo.md`.

## 1. El output de punta a punta, hoy

| Momento | Organizador | Quien puede ir | Quien no puede ir | Qué sale a WhatsApp |
|---|---|---|---|---|
| Se publica la versión 1 (`evaluate_and_publish`) | "Te toca confirmar la versión 1", cupos, "Faltan por responder N" **[visto]** | "Te toca confirmar la versión 1" en la portada y en el plan, solo si vuelve a abrir la app **[visto]** | "Grupo confirmado"/"Esperando compromisos" sin aviso de que es sin él/ella; abajo, "No formas parte de las personas que pueden aceptar esta versión" **[visto]** | **Nada** (0 enlaces de WhatsApp en la pantalla) **[visto]** |
| Confirman | lista pública de quién confirmó, con hora **[visto]** | "Ya confirmaste la versión 1" **[visto]** | igual que arriba | nada |
| Grupo confirmado | "¡Se juntan!", "Calendario" (.ics) y "WhatsApp" **[visto]** | lo mismo, solo quien confirmó **[visto]** | sin botones **[visto]** | "Confirmado en CRUXE: «título», «fecha» (hora de Santiago). Van: «nombres»." **sin enlace** (`PlanTab.tsx:608`) **[leído]** |
| Alguien no puede después de confirmar | — | única salida: "Retirarme de esta propuesta", **definitivo**: no vuelve a participar en ella (`RespuestaTab.tsx`) **[visto]** | — | nada |
| La baja rompe el mínimo | "Buscar alternativa" (`propose_repair`, solo en `en_revision`, `0011:842`) **[leído]** | "Una baja dejó el plan sin cumplir" | — | nada |
| Sale la versión 2 | comparación v1 → v2, cero confirmaciones heredadas **[leído]** | tiene que volver a confirmar | puede entrar si sus condiciones calzan | nada |

Lo que el grupo NO puede hacer hoy **[leído]**:
- **Decir "esta fecha no" sin irse.** Quien es elegible en la versión ya no puede cambiar su disponibilidad (`puede.guardar_condiciones` es falso con opción publicada y elegible, `0028:84`). Para decir que no, le queda no confirmar (silencio, que no cuenta) o retirarse para siempre.
- **Pedir otro horario.** Solo el organizador puede crear otra propuesta desde cero. "Buscar alternativa" existe solo después de una baja que rompe el mínimo.
- **Elegir entre dos planes.** El agente propone hasta 3 candidatas, pero las ve solo el organizador, que elige una y la convierte en propuesta. El grupo nunca ve la otra.
- **Hablar del plan con datos.** En el chat solo circulan el enlace de invitación y el mensaje de cierre. Todo lo demás vuelve a ser "¿quién puede?" en el chat, que es el problema que CRUXE quiere cerrar.

Lo que pasa en el chat después es una hipótesis, no algo medido: sin un mensaje al publicar la versión, el organizador escribe a mano "salió el sábado, confirmen", alguien responde "yo el sábado no puedo" en el chat (no en la app), y ese "no" no llega al servidor.

## 2. Opinar sin volver al caos del chat

### 2.1 Principio
No se agrega un chat ni comentarios libres en la app: eso repite WhatsApp y expone a la gente. Se agregan **respuestas cerradas sobre la versión**, que el servidor puede usar. Siguen valiendo las reglas de siempre: interés no es confirmación, el silencio no es asistencia, una confirmación vale para UNA versión y las condiciones son privadas.

### 2.2 Tres respuestas sobre la versión vigente **[propuesta]**

| Respuesta | Qué significa | Quién la ve | Qué hace el servidor |
|---|---|---|---|
| **Voy** | es `accept_version` (existe) | todos (como hoy) | cuenta para cupos y quórum |
| **Así no puedo, pero sigo en el plan** | esta versión no me sirve; no me retiro | nadie con nombre. El organizador ve el total solo si son 2 o más ("2 personas no pueden así") | la persona vuelve a poder actualizar su disponibilidad. No cuenta como baja ni rompe el acuerdo |
| **Prefiero el otro plan** (solo si la propuesta trae dos planes, §2.4) | me sirven los dos, pero prefiero el otro | nadie con nombre; total al organizador con 2 o más | pesa en la elección entre los dos planes |

"Retirarme" sigue existiendo para quien de verdad no va a ninguna versión.

### 2.3 Cómo alimenta la versión siguiente (circuito que ya existe)
1. Con la versión N publicada se abre una **ronda de opinión** con plazo (el organizador elige 2 h, 12 h o 24 h; nunca después del cierre de aceptación). El servidor decide cuándo cierra.
2. Quien marca "Así no puedo, pero sigo" actualiza su disponibilidad, que es privada como siempre.
3. Al cerrar la ronda:
   - si la versión N llegó al mínimo con el imprescindible, sigue: nada cambia para quien confirmó;
   - si no llegó y hay "así no puedo", el organizador ve **"Rearmar con lo nuevo"**, que es `propose_repair` habilitado también desde `esperando_compromisos`. Sale la versión N+1 con la disponibilidad actualizada y cero confirmaciones heredadas (igual que la reparación de hoy). Si no hay ninguna franja viable: "Sin opción compatible", sin bajar el mínimo.
4. Un tope de versiones por propuesta (por ejemplo 3) evita que se eternice. Después de la tercera, el organizador cierra o cancela.

### 2.4 "No ser absolutista": dos planes parecidos con distinto concepto **[propuesta]**
Hoy A y B son dos horarios de un mismo plan. Propuesta: que cada franja pueda llevar una **etiqueta corta** ("Asado en lo de Tomi" / "Picnic en el parque") y que el organizador arme la propuesta con las dos candidatas del agente.
- Cada persona responde como hoy (Sí/No por franja), en privado.
- Regla del motor, para decidir con Nico:
  - (a) la de hoy: la más temprana que sea viable;
  - (b) nueva: entre las viables, la que más "Sí" junta, y en empate la más temprana.
  - Con (b), "Prefiero el otro plan" suma como desempate.
- El grupo ve solo la opción publicada y los totales con la regla de 2 o más. Nunca quién eligió qué.

Esto encaja con lo que estudia psico (quién pone la casa, sorteo o lugar neutro, comida). La etiqueta de cada plan puede decir "en lo de X" o "lugar neutro". La decisión sobre la casa no se vota en la app: se resuelve con el plan que junta más "Sí".

### 2.5 Qué queda en WhatsApp y qué en la app

| En WhatsApp (charla) | En CRUXE (decisión) |
|---|---|
| bromas, "yo llevo el carbón", "voy con +1", "¿vegetariano?" | fecha y lugar de la versión vigente |
| avisos: "salió opción", "faltan respuestas", "se juntan" (mensajes listos de CRUXE) | quién confirmó cada versión |
| discutir gustos en voz alta, si el grupo quiere | disponibilidad, presupuesto, zona y movilidad, privados |
| | "así no puedo" y "prefiero el otro plan", con totales y no nombres |

Regla para el texto de la app: cada mensaje que CRUXE manda al chat termina con el enlace y dice **qué hacer si no puedes**. Así el "no" vuelve a la app y no se queda en el chat.

## 3. Qué se puede hacer y cuándo

### 3.1 Antes de las 11:00 del sábado, sin migraciones

| Qué | Dueño | Estado |
|---|---|---|
| Mensaje al publicar o rearmar: "Hay opción para «X»: sábado 31 oct, 20:00. Si vas, toca y confírmala; si no puedes, no confirmes: el plan sale solo con quienes confirman. <enlace>" | ux-flujo `RecordarFaltan motivo="version_nueva"` | hecho (`8e2432d`); falta conectarlo en `PlanTab.tsx` (decisión de Nico pendiente) |
| Mensaje de cierre con enlace y cupos: "Se juntan: «X», sábado 31 oct, 20:00. Quedan 2 cupos. Si vas y no confirmaste, toca y confirma: <enlace>" (sin nombres) | ux-flujo `RecordarFaltan motivo="confirmado"` | hecho (`8e2432d`); reemplazaría o acompañaría el texto de `PlanTab.tsx:608` |
| "Esta versión es sin ti" para quien no puede ir, y "Primero marca tu disponibilidad" para el imprescindible | ux-flujo `AvisoParaMi` | hecho (`e10a5b0`); falta conectarlo |
| Junto a "Retirarme", aclarar la diferencia: "Si solo esta fecha no te sirve, no confirmes. Retirarte es para no participar más en este plan." | front-juan (`RespuestaTab.tsx`) | por pedir |
| Recordar a quien falta, sin nombres | ux-flujo `RecordarFaltan motivo="faltan"` | hecho; falta conectarlo |
| Mientras no exista §2.4: dos planes como dos franjas con el título que los nombre ("Asado el sábado o picnic el domingo"). El motor elige el más temprano viable, no el que más gusta, y hay que decirlo así | organizador (uso) | posible hoy |

### 3.2 Necesita enmienda (después de la demo, o si Nico lo decide esta noche)

| Pieza | Forma concreta | Riesgo |
|---|---|---|
| E-a: opinión sobre la versión | `opinar_version(p_propuesta_id, p_version, p_opinion text, p_intento_id)` con `p_opinion` en `asi_no_puedo` / `prefiero_otro` / `retirar_opinion`. Tabla `cruce.opiniones (propuesta, version, miembro, opinion, en)`. `get_proposal_state` suma `mi_situacion.mi_opinion` y, solo al organizador, `opiniones_totales {asi_no_puedo, prefiero_otro}` con `null` por debajo de 2. Con `asi_no_puedo`, `puede.guardar_condiciones` vuelve a ser verdadero para esa persona | conteos en grupos chicos (misma regla de 2 o más que E7) |
| E-b: rearmar sin baja | `propose_repair` aceptado también en `esperando_compromisos` cuando hay al menos un `asi_no_puedo` en la versión vigente y la versión no llegó al mínimo, o al cerrar la ronda. Tope de 3 versiones | romper "una confirmación = una versión": no se rompe, la N+1 nace con cero |
| E-c: ronda con plazo | `open_proposal`/`evaluate_and_publish` aceptan `p_ronda_horas` (2, 12, 24). `get_proposal_state` suma `ronda_cierra` (hora del servidor) | ninguno nuevo; el servidor decide el cierre |
| E-d: dos planes | `franjas[].etiqueta` (texto de hasta 40 caracteres) y regla del motor (b) de §2.4 como opción de la propuesta (`p_regla = 'temprana' / 'mas_si'`) | cambia el motor: pruebas nuevas en el recorrido canónico |

## 4. Para el jurado: "¿Y cómo se discute la propuesta?" (30 segundos)

> "La charla sigue en WhatsApp: bromas, quién lleva qué. Lo que se decide no se pierde en el chat. CRUXE manda al grupo un mensaje con el enlace cuando sale la opción, cuando cambia y cuando se confirma, y cada mensaje dice qué hacer si no puedes. Cada uno responde en la app, en privado. Si una versión no junta el mínimo, el plan se rearma con lo que dijeron y nadie arrastra una confirmación vieja. Hoy cada persona confirma o se baja. El paso siguiente que tenemos diseñado es poder decir 'así no puedo, pero sigo' y elegir entre dos planes, siempre con totales y nunca con nombres."

Lo que NO hay que decir: que hoy se puede votar entre planes o comentar en la app. No existe.
