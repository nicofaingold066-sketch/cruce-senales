# 12 preguntas probables del jurado (respuestas de 20 segundos)

Sesión **pitch**, sábado 24 oct 2026. Para los 3 minutos de preguntas. Cada respuesta tiene 2–3 frases para decir en voz alta y la fuente en el repo. Quién responde: la guía de Nico (`/Users/macair/cruse/demo-makana-20261024/pitch-guia-nico.md`) reparte producto/negocio para **Nico** y técnica/privacidad para **Juan**. El banco largo (32 preguntas, con las incómodas) sigue en `docs/preguntas-jurado.md`.

**Regla de oro:** si no lo sabemos → «No lo medimos todavía; es lo primero que mediríamos en el piloto.»

---

### 1. ¿Por qué no un grupo de WhatsApp o una encuesta de fechas? · Nico
«WhatsApp es para hablar del plan; CRUXE es para cerrarlo. La encuesta junta fechas, pero *me interesa* queda como interés, nadie dice en público que no le alcanza, y si uno se baja nadie rearma. No competimos con WhatsApp: el enlace se manda por el grupo que ya tienen.»
Fuente: `README.md` («Por qué este y no otro»); `docs/preguntas-jurado.md` P1. Que el chat no cierra es **hipótesis** (`docs/problema.md` §2).

### 2. ¿Cómo saben que el problema es el cierre y no las ganas? · Nico
«No lo sabemos con certeza: es nuestra hipótesis. Lo vivimos el 8 de octubre: seis interesados, nadie dijo que no y no se hizo. Atacamos el cierre porque es lo que el chat no hace y porque se podía poner a prueba en dos días; el piloto lo mide con planes concretados.»
Fuente: `docs/caso-canonico.md` («La causa real del episodio está por investigar y no se afirma»); `README.md`.

### 3. ¿Quién ve lo que yo respondo? · Juan
«Cuándo podés y tus gustos los ve solo el servidor: ni el organizador ni el grupo. El grupo ve el plan, quién confirmó y quién se sumó; nunca qué respondió cada uno, ni quién se bajó. La base no deja leer ninguna tabla desde el teléfono: todo pasa por 41 funciones que revisan quién pregunta.»
Fuente: `docs/seguridad-final.md` (22 de 22 tablas con RLS, 0 permisos de lectura directa, 41 funciones); baja sin nombre: `docs/contrato-enmienda-13.md` y `docs/qa/gente-y-rendimiento.md` (a4, d5).

### 4. En un grupo de cuatro, ¿no se deduce quién dijo qué? · Juan
«Puede pasar, y lo declaramos. Por eso con grupos chicos el organizador ve solo totales, *lo más elegido* aparece recién con cuatro o más personas, y el presupuesto nunca se muestra. No prometemos privacidad perfecta; los límites que quedan están escritos.»
Fuente: `README.md` («No prometemos privacidad perfecta», enlace a `docs/contrato-enmienda-7.md`); reglas del perfil del grupo en `prompts/contexto-dia-pitch-reglas.md` §4.

### 5. ¿Qué hace la IA? ¿Qué pasa si no hay IA? · Juan
«El agente, GRU, propone: el servidor filtra con reglas fijas (presupuesto más bajo, clima, viaje máximo) y la IA elige entre opciones ya válidas y redacta el porqué. Nunca confirma ni cambia un estado; eso lo hace una persona. Sin IA, la app funciona igual: el plan se arma a mano y, si el modelo falla, sale una regla con texto fijo y la pantalla lo dice.»
Fuente: `docs/agente-ia.md` §6–7; `docs/auditoria-agente.md` §1 (rama `auditoria-agente`); `AGENTS.md` («La IA, si se usa, solo explica»).

### 6. ¿Cuánto cuesta el agente y cómo evitan que se dispare? · Juan
«Una llamada por pedido, con topes: como máximo una por persona cada 10 segundos y 30 por minuto, salida corta y corte a los 8 segundos, sin reintentos. Pasado el tope, responde igual con la regla y texto fijo. El agente es opcional: el corazón del producto no gasta en IA.»
Fuente: `docs/agente-ia.md` §6 («Costo de la IA (#64)»). Costo por llamada en pesos: **no medido**; si preguntan, decir eso.

### 7. ¿Escala? ¿Qué pasa si 30 personas confirman a la vez? · Juan
«Lo probamos esta mañana: 30 personas entrando y respondiendo a la vez, y 30 confirmaciones simultáneas sobre un plan de 20 cupos. Entraron 19, rechazó 11 con un mensaje claro y nunca se pasó del cupo ni contó a nadie dos veces. 152 verificaciones, cero defectos graves.»
Fuente: `docs/qa/gente-y-rendimiento.md` (c1–c6, g1–g4; latencias 130–230 ms p50 con 30 a la vez). Límite honesto: con 30 a la vez la pantalla puede tardar 2–4 s (H5), y no hay tope de integrantes por grupo (H1).

### 8. ¿Qué evita el abuso: alguien que se haga pasar por otro, o confirme dos veces? · Juan
«Cada lugar de la lista se reclama una sola vez: si cinco teléfonos tocan el mismo nombre, entra uno y los otros cuatro reciben *ya reclamado*. Doble toque en confirmar cuenta una vez, y una confirmación vieja no sirve para una versión nueva. Sin sesión, la base no responde nada.»
Fuente: `docs/qa/gente-y-rendimiento.md` (g1, g2, g3, g4); `docs/seguridad-final.md` (0 funciones para `anon`); `docs/caso-canonico.md` («Pruebas críticas»). Límite: la entrada es sin contraseña (sesión anónima); el grupo confía en quien tiene el enlace.

### 9. ¿Es accesible? · Juan
«Se diseñó para teléfono desde 320 px: botones de 44 px, el estado del plan se anuncia al lector de pantalla y el foco vuelve a *Reintentar* si algo falla. Respeta *reducir movimiento*. No lo probamos con VoiceOver ni TalkBack reales; eso falta.»
Fuente: `docs/agente-revision-a11y.md` («Lo que ya está bien» y «Límites»); `docs/qa/gente-y-rendimiento.md` (f, h: «reducir movimiento», 320 px sin desborde).

### 10. ¿Cuál es el negocio? ¿Quién paga? · Nico
«Para amigos, gratis. Creemos que paga quien gana con que la gente se junte: una empresa o una plataforma de bienestar como Makana, por persona. Es una hipótesis: no la validamos todavía.»
Fuente: guía de Nico (tabla de preguntas). Sin evidencia en el repo: decirlo como hipótesis.

### 11. ¿Por qué le sirve a Makana? · Nico
«Makana ya tiene grupos y desafíos; CRUXE cierra el último metro: que el encuentro pase. Proponemos un piloto voluntario midiendo encuentros concretados, si el grupo se repite a las 4 y 12 semanas, y bajas reparadas. La empresa vería solo totales, nunca lo que dijo cada persona.»
Fuente: `docs/demo-makana.md` («Relato breve y límites», rama `codex/demo-makana`: «Makana es una hipótesis de piloto voluntario»); `docs/preguntas-jurado.md` P2 (métricas a 4 y 12 semanas). No existe hoy una vista de empresa: es diseño propuesto.

### 12. ¿Qué probaron con gente real y qué sigue? · Nico
«Con gente real, todavía nada: todo lo que vieron es ficticio por regla del evento; lo probado son el flujo y el servidor, con usuarios simulados y 30 personas a la vez. Lo siguiente es un piloto con un grupo de verdad y un ensayo en teléfonos físicos. En 36 horas, con un equipo de sesiones de IA coordinadas y pruebas contra la base antes de cada publicación, llegamos hasta acá.»
Fuente: `docs/preguntas-jurado.md` C1 (la más peligrosa: decirlo sin esconderse); `docs/qa/gente-y-rendimiento.md` («No se probó Safari/iOS ni red 3G real»); ~1 088 commits en `main` (`git rev-list --count origin/main`, 10:55).

---

**Cifras que se pueden decir (y su fuente):**
- 152 verificaciones, 0 defectos graves, 30 personas a la vez sin sobrecupo: `docs/qa/gente-y-rendimiento.md`.
- 22 de 22 tablas protegidas, 41 funciones con permiso, 0 para quien no tiene sesión: `docs/seguridad-final.md`.
- 4 toques del enlace a responder: `docs/guion-demo.md` §2 (`tests/e2e/toques-invitacion.mjs`).
- ~1 000 commits en 36 horas; primer commit viernes 23, 09:47: `README.md` («Componentes externos»).
- 43 % de los chilenos tiene entre 3 y 5 amigos (fuente secundaria): `docs/problema.md`.

**No decir:** «probado con gente real», «reservado», «lo confirmó la IA», «la app avisa sola», «baja el ausentismo», «resuelve la soledad», «ninguna app repara» (no está relevado).
