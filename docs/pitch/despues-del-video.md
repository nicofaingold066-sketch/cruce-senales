# Después del video: los 2 minutos en voz alta

Sesión **pitch**, sábado 24 oct 2026 (pedido del coordinador, 11:34). Formato decidido por Nico y Juan: dentro de los 5 minutos va primero el **video de 2:46** (`/Users/macair/cruse/cruce-video/out/cruxe-pitch.mp4`) (sesión «video»: gancho, los siete amigos, cómo funciona con capturas reales, el plan, Joaco se baja y se repara, GRU, cifras) y después hablan ellos **~2 min**. Esto es lo que se dice después. **No repite el video:** no vuelve a contar el caso ni a mostrar pantallas. El video ya dice: 8 de octubre (6 interesados, 0 encuentros), 36 horas, «cerca de sesenta mil líneas», 30 personas a la vez sin sobrecupo, «GRU propone; nunca confirma», y cierra con «Que juntarse deje de depender de que uno persiga a todos» + «Gracias por escucharnos». Lo nuevo acá: el porqué, las cuatro reglas, 152 verificaciones, la auditoría, 15 enmiendas y el piloto. Defiende **por qué** elegimos esto. Todo ficticio.

Nombres de los amigos (deck y video): Bastián organiza, Carlos prefiere gratis, Kai necesita traslado simple, Charlie algo tranquilo, Nacho siempre propone pádel, Joaco confirma y se baja, Pía no responde.

Reglas: las causas van como «creemos que»; soledad **solo con su rango**, nunca como eje ni como promesa; no decir «probado con gente real», «baja el ausentismo», «resuelve la soledad».

---

## 0. Apertura antes del video (Nico, 20–30 segundos, pedido de Nico)

- «Una pregunta antes de empezar. Levanten la mano: ¿quién tuvo problemas para juntarse con sus amigos?» *(levantás la tuya primero; pausa, mirás la sala)*
- «Déjenla arriba si alguna vez alguien escribió en el grupo *che, ¿cuándo nos juntamos?*… y nunca pasó.»
- «Bueno. No es que falten ganas ni amigos. Todos dicen *dale*, nadie dice *no puedo*, y el plan se queda en el chat.»
- «A nosotros nos pasó el 8 de octubre: seis interesados, cero encuentros.»
- «Les mostramos cómo lo resolvimos.» → **play al video**.

Si la sala no levanta la mano: «Bueno, entonces son los únicos con amigos puntuales. Les cuento lo que nos pasa al resto.» Si el video ya abre con el 8 de octubre, se saca esa línea de acá.



### 0:00–0:25 · Por qué este problema (Nico)
- «Lo que acaban de ver no es un problema de agenda.»
- «Cuando un plan no ocurre una vez, no pasa nada. Cuando no ocurre nunca, el grupo se apaga.»
- «Y no es por falta de amigos: el 43 % de los chilenos tiene entre 3 y 5.»
- «Lo que falla es que el encuentro pase. Creemos que ahí, en ese último metro, se pierde mucho de lo social.»

> Fuentes: 43 %, Bicentenario UC vía prensa, fuente secundaria (`docs/problema.md` línea 13). Si preguntan por soledad, dar **siempre el rango**: entre el 9,6 % («casi siempre o siempre», MIDESO 2025) y el 48 % («algunas veces» en la última semana, Bicentenario UC 2025) (`docs/problema.md` línea 14). No afirmamos que CRUXE la reduzca.

### 0:25–1:00 · Por qué esta solución y no un chat o un calendario (Nico)
- «¿Por qué no un grupo de WhatsApp? Porque el chat sirve para hablar, no para cerrar.»
- «¿Por qué no una encuesta de fechas? Porque junta *me interesa*, y *me interesa* no es *voy*.»
- «Nosotros partimos de cuatro reglas:»
  - «Uno: **el silencio no es asistencia.** Si Pía no responde, no cuenta.»
  - «Dos: **lo privado se queda privado.** Carlos no tiene que decir delante de todos que quiere algo gratis.»
  - «Tres: **una confirmación vale para una versión.** Si el plan cambia, cada uno vuelve a decidir.»
  - «Cuatro: **si alguien se baja, se repara.** Sin culpas y sin decir quién.»
- «Ningún chat ni calendario que probamos hace esas cuatro cosas juntas.»

### 1:00–1:30 · Qué probamos (Juan)
- «Esto no es una maqueta. Lo decide el servidor: cupos, plazos y estado.»
- «Las treinta personas a la vez que vieron en el video son parte de 152 verificaciones, con cero defectos graves.»
- «Al agente, GRU, le hicimos una auditoría propia: encontró propuestas que no tenían sentido y arreglamos las más graves antes de publicar.»
- «Y el contrato del producto cambió 15 veces en 36 horas, siempre por escrito y probado contra la base real.»

> Fuentes: `docs/qa/gente-y-rendimiento.md` (152 verificaciones, 0 graves, c4–c6: 30 confirmaciones con máximo 20 → 19 aceptadas y 11 rechazos limpios; 7 hallazgos medios/bajos: no decir «sin errores»); `docs/auditoria-agente.md` (rama `auditoria-agente`: 4 de 7 casos simulados incoherentes, M1 y M3 arreglados con la 0057); enmiendas: `docs/contrato-enmienda-2.md` a `-16.md` = **15 enmiendas** sobre `docs/contrato.md` (el pedido decía 16; son 15 archivos de enmienda). 36 h: primer commit vie 23, 09:47 (`README.md`).

### 1:30–1:50 · Qué sigue (Nico)
- «Lo que falta es lo más importante: probarlo con gente de verdad.»
- «Proponemos un piloto voluntario con Makana, midiendo tres cosas: encuentros que ocurren, grupos que se repiten a las 4 y a las 12 semanas, y planes que se reparan.»
- «La empresa vería solo totales. Nunca lo que dijo cada persona.»

> Hoy no hay vista para empresas: «solo totales» es el diseño del piloto. Métricas: `docs/preguntas-jurado.md` P2; piloto como hipótesis: `docs/demo-makana.md` (rama `codex/demo-makana`).

### 1:50–2:00 · Cierre (Nico, de memoria)
El video ya cierra con «Que juntarse deje de depender de que uno persiga a todos» y «Gracias por escucharnos» (sesión video, `video/guion/escenas.json`): **no se repiten**. Cierre oral, que vuelve al gancho:
- *(lento)* «**La próxima vez que alguien escriba *che, ¿cuándo nos juntamos?*, que la respuesta sea una fecha.**»
- «Gracias.»

**Si vas largo:** se cae primero la línea de las 15 enmiendas; después, la del 43 %. Las cuatro reglas y el cierre no se tocan.

---

## 2. Tres refutaciones de 20 segundos

### «Esto lo hace un grupo de WhatsApp.» · Nico
«WhatsApp es donde se habla, y lo usamos: el enlace llega por ahí. Pero en el chat *me interesa* cuenta como sí, nadie dice que no le alcanza delante de todos, y cuando uno se baja el plan se muere. CRUXE no reemplaza el chat; cierra lo que el chat deja abierto.»
Fuente: `README.md` («Por qué este y no otro»); `docs/preguntas-jurado.md` P1.

### «¿Y si nadie carga sus gustos?» · Juan
«Los gustos son opcionales. Para cerrar un plan alcanza con decir cuándo podés, en un toque. Si no hay gustos, GRU no inventa: el plan se arma igual, a mano. Y lo decimos claro: los límites de cada uno solo los protege si los cargó.»
Fuente: `docs/auditoria-agente.md` («Trato parejo»: quien no cargó preferencias no queda protegido; el agente necesita al menos 2 personas con preferencias autorizadas); flujo de un toque: `src/friccion/Responder.tsx` («Puedo los dos días»).

### «¿La IA decide por la gente?» · Juan
«No. El servidor filtra con reglas fijas, y la IA solo elige entre opciones que ya le sirven a todos y explica por qué. Nunca ve lo que dijo una persona, nunca confirma ni cambia un estado. Si la IA falla, sale una regla con texto fijo y la pantalla lo dice.»
Fuente: `docs/agente-ia.md` §6–7; `AGENTS.md` («La IA, si se usa, solo explica; nunca confirma ni cambia estados»).

---

## 3. Tarjeta de bolsillo (8 líneas)

1. El plan que no ocurre apaga al grupo. Amigos hay: 43 % tiene 3 a 5.
2. Chat = hablar. CRUXE = cerrar y reparar.
3. El silencio no es asistencia.
4. Lo privado se queda privado.
5. Una confirmación vale para UNA versión. Si alguien se baja, se repara.
6. 30 a la vez sin sobrecupo · 152 verificaciones · auditoría de GRU · 36 h.
7. Piloto Makana: encuentros, repetición a 4 y 12 semanas, planes reparados. Empresa: solo totales.
8. Cierre: «La próxima vez que alguien escriba *che, ¿cuándo nos juntamos?*, que la respuesta sea una fecha.»
