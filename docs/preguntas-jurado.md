# Preguntas probables del jurado y respuestas honestas

Dueño: apertura. Pedido #101 (Nico, 20:30 del viernes 23 oct 2026). Todo ficticio; nada de esto lleva datos de personas reales.

**Para qué sirve.** El pitch dura 5 minutos con demo en vivo y hay 3 minutos de preguntas. El jurado (equipo de producto de Makana) puntúa **Problema, Solución y Convicción**, de 1 a 7, con el mismo peso; en la convicción cuentan las respuestas a las preguntas (`prompts/contexto-dia-pitch-reglas.md`, bases §10). Acá hay 32 preguntas probables, incluidas las incómodas, con una respuesta de 2 o 3 frases y la evidencia que la respalda.

**Cómo usarlo.**
- **★ = una de las 5 más probables.** **⚠ = una de las 3 más peligrosas** (la respuesta honesta cuesta; hay que ensayarla).
- Cada respuesta está escrita para decirse en voz alta, sin leer. No se dicen las marcas.
- **Evidencia:** archivo, prueba o número. Si no hay evidencia, la fila dice **«Sin evidencia»** y propone qué decir sin inventar.
- **Regla de oro** (de `docs/pitch.md`): solo se dice lo que funciona en vivo. Lo demás es «siguiente paso». El guion de la demo, con rótulos exactos y plan B, está en `docs/guion-demo.md`.
- **Enmienda 13** (aprobada por Nico a las 20:51; corte: aplicada antes de la 01:00 del sábado): opinar sin bajarse, rearmar con lo nuevo, baja sin nombre y asado en lugar neutro. Varias respuestas tienen dos versiones, «si entró» y «si no entró»: elegir en el «Estado verificado» de las 10:30.
- Las pruebas citadas son de esta noche; las horas son del reloj de Santiago. Las fuentes viven en `docs/evidencia.md`, `docs/usuarios-sinteticos.md`, `docs/rincones.md`, `docs/qa-noche.md` y `docs/flujo-usuario.md`. Antes de subir al escenario, rehacer las cifras con el último `main` (el estado cambia hasta las 12:45).

## Las cinco más probables (★)
1. P1 · ¿Por qué no un grupo de WhatsApp o una encuesta?
2. S1 · ¿Cómo convencen a todo el grupo de usar la app?
3. S3 · ¿Cómo se discute o se debate la propuesta?
4. S4 · ¿Dónde está la IA y qué hace?
5. C1 · ¿Qué probaron con gente real?

## Las tres más peligrosas (⚠)
1. **C1** · ¿Qué probaron con gente real? La respuesta honesta es «nada con gente real»; hay que decirla sin esconderse.
2. **P2** · ¿Cómo saben que el cierre es la causa? Es una hipótesis que no validamos; nadie de los amigos del asado contestó.
3. **S5b** · ¿Un grupo chico puede deducir quién dijo qué? Hay límites de privacidad declarados que no están arreglados.

---

## 1. Problema

### P1 ★ · ¿Por qué no un grupo de WhatsApp o una encuesta de fechas?
**Respuesta.** Los dos sirven para hablar y para juntar interés, y los usamos: WhatsApp llega a casi todos y la encuesta junta fechas. Lo que no hacen es cerrar: «me interesa» queda como interés, las condiciones (plata, horario) no se dicen delante del grupo y, si alguien se baja, nadie rearma. CRUXE no reemplaza el chat: convive con él y atiende el último metro (cerrar y sostener el plan).
**Evidencia.** Que el chat no cierra es **hipótesis** (`docs/problema.md` §2). Dato: WhatsApp llega al 89,7 % de la audiencia en línea de Chile (DataReportal/Statista 2025, en `docs/problema.md`). En la app, interés y compromiso están separados: «Me interesa» no suma confirmados (`docs/caso-canonico.md`, recorrido paso 2; `tests/backend/`).
**Si no hay evidencia.** No decir «la encuesta no sirve». Decir: «Creemos que falla el cierre; lo medimos como cuántos planes se concretan».

### P2 ⚠ · ¿Cómo saben que el cierre es la causa del asado que no se hizo?
**Respuesta.** No lo sabemos. Es una hipótesis: los seis interesados dejaron de responder y no preguntamos por qué. Elegimos atacar el cierre porque es la parte que el chat no hace y porque podíamos ponerlo a prueba en dos días, no porque lo hayamos comprobado.
**Evidencia.** `docs/problema.md` §2 y §5: la causa real «está por investigar y no se afirma» (`docs/caso-canonico.md`). La sección «Lo que dijeron los del asado» sigue vacía (nadie respondió).
**Sin evidencia causal.** Decir exactamente eso, y cuál sería la prueba: tasa de planes concretados y repetición del encuentro a las 4 y 12 semanas. **No** decir «esto resuelve el problema».
**D6 (Nico, 21:06).** Las cuatro causas se dicen como «creemos que». Si se nombra evidencia de psicología, decir que es de EE.UU. y Europa y que no hay de Chile. La única cifra de psico que se cita, tal cual la dejó psico: «el 80 % de más de 1.100 encuestados en EE.UU. dijo que cancelar no daña la amistad, pero sí duele que mientan» ([MSU Today, 2023](https://msutoday.msu.edu/news/2023/01/cancelling-plans-research); F1 en `docs/psicologia-fuentes.md`, rama `wip/psico`). Sirve para la reparación: «por eso no pedimos el motivo cuando alguien se baja».

### P3 · ¿Quién es la persona y qué le pasa?
**Respuesta.** Alguien que quiere ver a sus amigos y no logra que pase: contestó «me interesa», pero nadie fija día y hora, y esperó a que otro lo ordene. En CRUXE esa persona es Vale, la que organiza: crea el grupo, manda el enlace y los demás responden.
**Evidencia.** `docs/problema.md` §1; los seis perfiles del recorrido (Vale, Joaco, Renata, Bruno, Gonza, Pili) están en `docs/usuarios-sinteticos.md`. Son **personajes ficticios**, no entrevistas.

### P4 ★ · Si dicen que sirve para todo, ¿por qué su ejemplo es un asado?
**Respuesta.** Porque el asado es lo que nos pasó (el 8 de octubre, seis interesados y no se hizo) y es el caso de la demo. Lo que resolvemos no es el asado, es cerrar un plan de grupo; por eso el catálogo ya tiene cena, bar, cine, cultura, cerro, café y juegos, y cada grupo trae sus condiciones.
**Evidencia.** `docs/apertura.md` (8 tipos de juntadas y 8 escenarios); catálogo ampliado a 13 actividades, aplicado en la migración 0038 (`docs/catalogo-ampliado.md`; publicado en `main` `fae49fa`, 20:25); atajos de actividad en `src/lib/ejemplos.ts`.
**Límite.** Los lugares del catálogo son de simulación; ninguna actividad nueva se probó con un grupo real.

### P5 · ¿Por qué amigos y no empresas?
**Respuesta.** Elegimos un solo caso y resolverlo entero. Para amigos la privacidad pesa más (la plata, el ánimo, la movilidad) y el cierre es más difícil porque nadie manda. El motor admite otro tipo de grupo, pero no lo mostramos.
**Evidencia.** Decisión de Nico y Juan, «solo lo social» (`prompts/contexto-dia-pitch-reglas.md`, punto 7). `docs/pitch.md`: no se presenta como producto para empresas.

### P6 · ¿Qué cifra respalda que hay un problema?
**Respuesta.** Hay amigos pero no hay encuentro: el 43 % de los chilenos tiene entre 3 y 5 amigos (Encuesta Bicentenario UC 2025, fuente secundaria). Sobre soledad damos siempre el rango (9,6 % casi siempre; 48 % algunas veces) y no afirmamos que CRUXE la reduzca.
**Evidencia.** `docs/problema.md` §1, con fuente. **No existen cifras de cancelaciones de planes en Chile**; la que hay es del Reino Unido (68 % de 18 a 34 años, Opinium/IPA 2025) y se dice así.
**Si piden más.** «No tenemos un dato propio; no inventamos uno». Y por D6: ninguna otra cifra de psicología que la F1 de P2.

### P7 · ¿No es un problema de soledad o de motivación?
**Respuesta.** Puede ser parte, pero no es lo que atacamos. Si la gente no quiere verse, CRUXE no sirve; si quiere y no logra cerrar, sí. No prometemos más bienestar.
**Evidencia.** `docs/problema.md` §3 y §5 («no afirmamos que cause más encuentros o bienestar»).

### P8 · ¿Y si el grupo no tiene a nadie que organice?
**Respuesta.** Basta con convencer a una persona. El resto toca su nombre y responde; no hace falta cuenta. Hoy esa persona sigue siendo quien organiza; no hay un organizador automático.
**Evidencia.** Ver S1. Lo no resuelto (que nadie quiera ser quien manda el enlace) queda como límite; **sin evidencia** de que alguien lo vaya a hacer.

---

## 2. Solución

### S1 ★ · ¿Cómo convencen a todo el grupo de usar la app?
**Respuesta.** No hace falta. Basta convencer a uno: quien organiza crea el grupo con los nombres y manda el enlace; cada uno toca su nombre y responde, sin cuenta ni contraseña. Medimos 4 toques desde el enlace hasta la primera respuesta.
**Evidencia.** `docs/flujo-usuario.md` §3: invitados a 4 toques (tercera corrida en producción, `main` `fae49fa`, 20:26–20:28, 6 sesiones, `49ab5ea`; antes eran 7 u 8 en `docs/usuarios-sinteticos.md`); `tests/e2e/toques-invitacion.mjs` = 4 toques (`docs/qa-noche.md`, 20:02). El organizador usa unos 21 toques en total.
**Límite.** Los toques son de máquina (cota inferior; una persona tarda más). Las pruebas son con usuarios sintéticos, no con gente.

### S2 · ¿Qué pasa si nadie confirma?
**Respuesta.** El silencio nunca es asistencia: quien no responde no cuenta como confirmado ni como elegible. Si pasa el cierre sin llegar al mínimo, el plan expira y lo dice; no baja el mínimo ni finge que se armó.
**Evidencia.** `docs/contrato.md` (vencimiento: la propuesta pasa a «Expirado»); `tests/backend/aceptacion-reparacion.test.ts` (aceptación fuera de plazo rechazada); la persona que nunca abre el enlace (Pili) sigue «por entrar» y no se trata como asistente (`docs/usuarios-sinteticos.md`).
**Límite (declarado, D8).** CRUXE no manda notificaciones ni recordatorios: deja el mensaje listo y lo manda una persona por WhatsApp. «Recordar a quien falta» (`RecordarFaltan`, de ux-flujo) arma ese texto y está construido pero **sin conectar a la pantalla**.

### S3 ★ · ¿Cómo se discute o se debate la propuesta?
**Estado (22:28): la enmienda 13 está en la base y las pantallas conectadas en `main` `bd9dc36` (`src/friccion/AsiNoPuedo.tsx`, `RearmarConLoNuevo` en `PlanTab.tsx`): vale la segunda respuesta, a confirmar viendo el botón en el recorrido del ensayo.**
**Respuesta, si la enmienda 13 NO está en producción o el botón no está en pantalla.** La charla sigue en WhatsApp: bromas, quién lleva qué. CRUXE no es un chat; lo que se decide no se pierde ahí. Cada persona responde en la app, en privado (puedo los dos días, solo un día, no puedo), y después confirma esa versión o se baja. Si una versión no junta el mínimo, el plan se rearma con lo que dijeron y nadie arrastra una confirmación vieja. Hoy cada persona confirma o se baja; lo siguiente que tenemos diseñado es poder decir «así no puedo, pero sigo» y elegir entre dos planes, siempre con totales y nunca con nombres.
**Respuesta, si la enmienda 13 está en producción Y el botón está conectado (verificar en el recorrido de 5 invitados antes del pitch).** La charla sigue en WhatsApp. Cuando sale la opción, cuando cambia y cuando se confirma, CRUXE le deja listo al organizador un mensaje con el enlace. Cada uno responde en la app, en privado: confirma esa versión o dice «así no puedo, pero sigo», sin bajarse. Si la versión no junta el mínimo, el organizador la rearma con lo nuevo y nadie arrastra una confirmación vieja. El organizador ve cuántos no pueden, nunca quiénes. Lo que dejamos para después es elegir entre dos planes distintos.
**Evidencia.** `docs/output-debate.md` §1 (tabla del output de hoy) y §4 (las dos versiones de la respuesta; ux-flujo, `wip/ux` `a4d78ed`); `docs/flujo-usuario.md` §3.6 (corrida en producción, `fae49fa`, 20:26); `docs/contrato-enmienda-13.md` (a) `opinar_version` con `asi_no_puedo`, totales solo al organizador y solo con 2 o más, y (b) `propose_repair` desde «esperando compromisos», tope de 3 versiones. Hoy el único mensaje de WhatsApp que sale es el de cierre («Confirmado en CRUXE… Van: …», `PlanTab.tsx:641`); al publicarse la opción no sale nada.
**Construido pero sin conectar a pantalla** (decisión de Nico pendiente): `RecordarFaltan` (`8e2432d`, prueba 14/14) y los mensajes de WhatsApp al publicar y al cerrar. La pantalla del botón «Así no puedo, pero sigo» es de front-juan.
**No decir** que hoy se puede votar entre planes ni comentar en la app: no existe. No decir que CRUXE «manda mensajes solo»: deja el mensaje listo; lo manda una persona.

### S4 ★ · ¿Dónde está la IA y qué hace?
**Respuesta.** Hay un agente opcional: con preferencias privadas y el clima, el servidor elige hasta tres planes de un catálogo ficticio y un modelo (Claude Haiku, por el AI Gateway de Vercel) redacta el porqué. La IA solo explica: no confirma, no crea ni cambia estados, y nunca ve quién dijo qué. Si el modelo falla o no hay clave, entra una regla fija y un texto fijo, y la pantalla lo dice.
**Evidencia.** Probado en vivo con el modelo real el 23 a las 16:50:59 (`docs/evidencia.md`: `eleccion_fuente` y `explicacion_fuente` = «modelo»); función sin red 17/17 (`node --test "supabase/functions/agente/*.test.ts"`); pruebas del opt-out en `tests/backend/` (enmienda 8). `docs/agente-ia.md`.
**Límites.** La función con la enmienda 10 estaba sin desplegar a las 20:25 (aviso del coordinador); no se midió el límite de costo; cada llamada cuesta. En la demo usar «Simular sol/lluvia» y una o dos llamadas. La base ya tiene el «agente social» (enmienda 11, migración 0041, suite 84/84 a las 20:40), pero su interfaz no está conectada: **no decir** que el agente invita, publica o manda nada solo.

### S5 ★ · ¿Y la privacidad?
**Respuesta.** Cada persona carga sus condiciones y preferencias en privado, con opciones cerradas y sin texto libre; solo las lee el servidor. El grupo ve el plan y totales (con 4 personas o más y 2 o más votos), nunca el presupuesto ni quién dijo qué. Hay un opt-out para que el agente no use las preferencias de alguien.
**Evidencia.** Revisión de toda la app: sin exposición directa, 8 hallazgos (4 corregidos en la enmienda 7, 2 declarados como límite y 2 endurecimientos) en `docs/agente-revision-privacidad.md` y `docs/contrato-enmienda-7.md`; backend 78/78 y verificación de privilegios sin hallazgos (`docs/evidencia.md`, aviso 20:25); guiones de punta a punta con privacidad de sobres sin hallazgos (`jurado-navegador` 4/4, `docs/qa-noche.md`).

### S5b ⚠ · ¿Un grupo chico puede deducir quién dijo qué?
**Respuesta.** A veces sí, y lo decimos. Quien organiza puede usar el motor como «oráculo» (probando varias veces) para deducir si alguien puede una franja; comparar el perfil antes y después de que alguien guarde deja ver qué cargó; y una baja que deja el plan «En revisión» dice que alguien que podía se bajó (con la enmienda 13 (c) ya no se muestra su nombre al grupo; el organizador ve el total de bajas, no quién). No prometemos ausencia total de inferencia en grupos chicos; sí que ninguna respuesta muestra condiciones ajenas. Un caso concreto de la enmienda 13 (hallazgo H17 de sinteticos): quien organiza ve cuántos marcaron «así no puedo, pero sigo» solo desde 2; en un grupo de 3 elegibles con 2 opiniones, y habiendo confirmado él mismo, deduce exactamente quiénes son. Frase lista: «En grupos chicos el total puede deducirse; la app nunca dice quién.»
**Evidencia.** `docs/contrato-enmienda-7.md`, «Límites declarados». README: «No prometemos privacidad perfecta».
**No decir** «es 100 % privado».

### S6 · ¿Qué pasa si alguien se baja?
**Respuesta.** Si la baja deja el plan por debajo del mínimo, pasa a «En revisión» y se registra la baja con su hora. Quien organiza busca una alternativa, que sale como **versión 2 y empieza sin aceptaciones heredadas**; solo vuelve a «Grupo confirmado» cuando todos aceptan esa versión. Si no hay opción, dice «Sin opción compatible» y no baja el mínimo.
**Evidencia.** Recorrido canónico (`docs/caso-canonico.md`, pasos 5 a 7); `recorrido-dos-sesiones.mjs` 23/23 en producción (`docs/qa-noche.md`, 19:52); variantes del jurado 4/4 (`jurado-navegador`, 19:59).
**Límite (visto por sintéticos).** Si la baja no cambia la fecha, el cartel puede decir «Sábado → Sábado» sin explicar que cambió la gente (`docs/usuarios-sinteticos.md`, H8).
**Estado (22:28): la enmienda 13 (c) está en producción (`main` `140cdaf`; privacidad E13 comprobada por el jurado 4/4 del coordinador).** El grupo ve «Una persona se retiró», sin nombre, sin motivo y sin decir si había confirmado; quien se retira lee «Gracias por avisar. No hace falta contar por qué.» Si no entró, hoy el grupo ve el nombre de quien se bajó (hallazgo H14 de sintéticos): decirlo así.

### S7 · ¿Escala a otros grupos o a otras actividades?
**Respuesta.** El motor es el mismo para cualquier juntada (deporte semanal, cumpleaños, familia, ex compañeros, estudio, club de lectura); cambia el peso de cada condición. El catálogo del agente tiene 13 actividades de simulación. No escala hoy a otras ciudades (zonas de Santiago) ni a usos que no son sociales.
**Evidencia.** `docs/apertura.md` §1 y §2; `docs/catalogo-ampliado.md`. **Sin evidencia** de uso con grupos reales.

### S8 · ¿Qué dejaron fuera?
**Respuesta.** Chat, pagos, reservas reales, calendarios, notificaciones y estadísticas individuales. Queríamos probar el cierre y la reparación, no integrar servicios; tampoco prometemos que el encuentro ocurra.
**Evidencia.** README «Qué dejamos fuera y por qué»; `docs/problema.md` §4.
**Cómo se mediría.** Encuentros concretados y repetición a las 4 y 12 semanas (`docs/problema.md` §4).

### S9 · ¿Funciona en un teléfono real?
**Respuesta.** Lo probamos en navegador a 375 px (y a 320 px) con la app publicada, pero **no en un teléfono físico**.
**Evidencia.** `docs/evidencia.md` («No probado: dos teléfonos físicos con el link público»); `docs/rincones.md` (130 de unos 140 rincones recorridos a 320, 375, 768 y 1280 px: 0 rotos, 14 observados).
**Si piden verlo.** Mostrar la demo en dos dispositivos del equipo; no afirmar nada más.

### S10 · ¿Los lugares son reales? ¿Reservan algo?
**Respuesta.** No. Todo el catálogo es de simulación y cada lugar lo dice («Simulación»). La app propone y deriva con enlaces a Google Maps, EasyCancha o ATC; nunca dice «disponible» ni «reservado».
**Evidencia.** `docs/agente-barrido.md` (fuentes reales estudiadas, sin conectar); `src/agente/canchas.ts` (solo enlaces). Con la enmienda 13 (d) el catálogo suma «Parrilla del parque (Simulación)» (`lugar-sim-14`, `docs/catalogo-ampliado.md`): el asado deja de ser solo «en casa de alguien» y puede competir con un lugar neutro.

### S11 · ¿Y si se corta internet durante la demo?
**Respuesta.** Probamos cortes de red controlados y la app reintenta y avisa. Igual dejamos un video de respaldo grabado.
**Evidencia.** `red-controlada.mjs` 10/10 y `red-import-cortada.mjs` 4/4 (`docs/qa-noche.md`, 20:02–20:14). El video de respaldo: **Sin evidencia todavía**: grabarlo antes de las 13:00 (`prompts/contexto-dia-pitch-reglas.md`, punto 15).

### S12 · ¿Preguntan género o si alguien está en pareja? ¿Cómo saben quién viene?
**Respuesta.** No. El género y la situación de pareja no se piden ni se infieren: son datos sensibles y en un grupo de cinco delatan a alguien. «Quién viene» es una regla del grupo, no de una persona: solo el grupo, con parejas o abierta. Por ahora va en el título del plan; un campo propio queda para después.
**En diez segundos (texto de psico, D2):** «No los pedimos ni los inferimos. En un grupo de cinco, delatan. Lo que importa es quién puede venir y qué estilo quieren, y eso lo decide el grupo.» Vale igual para la clase social: el presupuesto se pide como tope («ojalá gratis», «algo barato», «da igual»), nunca como clase. «Estilo» es el estilo de la ocasión (simple, normal, especial; D7, lo arma agente-ia sin migración): nombrarlo solo si está en producción a las 10:30.
**Evidencia.** Decisiones D2 y D3 de psico, aceptadas por Nico (20:51): `agentes/psico.md`, `docs/psicologia-grupo.md` (rama `wip/psico`); `docs/contrato-enmienda-13.md`, «Fuera». La Ley 21.719 lista identidad de género y vida sexual entre los datos sensibles (guía secundaria; plena vigencia el 1 dic 2026): no citar artículos que no leímos.

### S14 · Si el grupo es de fútbol, ¿puede alguien proponer un asado? ¿Y si somos pocos?
**Estado a las 23:08:** las reglas están en el servidor (0048–0050, `main` `8f27c5b`) pero ninguna pantalla las expone todavía (`CampoProposito` y los atajos por familia sin conectar): hoy en la app un grupo no puede elegir propósito. Decir lo siguiente solo si a las 10:30 se ve en pantalla.
**Respuesta (solo si la enmienda 14 está en producción Y conectada en pantalla a las 10:30).** Un grupo puede armarse para algo concreto, por ejemplo jugar fútbol: entonces solo recibe propuestas de ese tipo (deporte), y hay un modo libre sin restricción. El servidor decide, no la pantalla. Si el grupo es chico para el fútbol, el agente no propone lo que no se puede armar: dice cuántas personas hacen falta y ofrece algo parecido que sí alcance (tenis, pádel). Se habla de tamaño de grupo, nunca de quién va a asistir.
**Si no está conectada en pantalla:** «Hoy cualquier grupo propone cualquier cosa; que un grupo se arme para un tipo de plan ya lo decide el servidor, y falta la pantalla para elegirlo» (`docs/contrato-enmienda-14.md`).
**Evidencia.** `docs/contrato-enmienda-14.md` (aprobada por Nico, 21:55): propósito, familias y quórum; atajos por familia en `src/lib/ejemplos.ts` (prueba 12/12). **Cuidado:** «Me interesa más sushi» = marcar Cena en «Me gustaría»; en grupos de 3 o menos (además de quien pide) los gustos no ordenan por privacidad, y el camino es que el organizador escriba el título y elija la actividad.

### S13 · ¿La app avisa o manda recordatorios?
**Respuesta (texto de psico, D8).** «CRUXE no manda notificaciones. Deja listo el mensaje con el enlace y lo manda una persona por WhatsApp; cada mensaje dice qué hacer si no puedes. Es un límite declarado, no un descuido.» Así nadie recibe avisos de una app nueva y el grupo sigue hablando donde habla.
**Cuidado.** «Cada mensaje dice qué hacer si no puedes» vale para los mensajes de ux-flujo cuando estén conectados; hoy en producción solo sale el de cierre. Si a las 10:30 siguen sin conectar, decir «deja listo el mensaje de cierre» y no más.
**Evidencia.** Decisión D8 de Nico (21:06): se acepta para la entrega y se declara como límite (`agentes/psico.md`). Hoy el único mensaje listo es el de cierre (`PlanTab.tsx:641`); los de «sale la opción» y «cambió» están construidos y sin conectar (`RecordarFaltan`, ux-flujo). `docs/problema.md` §4 (notificaciones fuera a propósito).
**No decir** que «la app avisa».

---

## 3. Convicción

### C1 ★ ⚠ · ¿Qué probaron con gente real?
**Respuesta.** Con gente real, nada. Todo es ficticio y las pruebas son con datos inventados y usuarios sintéticos: seis personajes que recorren la app para encontrar dónde se traban. Es una limitación que decimos de frente: lo que probamos es que el flujo funciona y no se rompe, no que un grupo real se junte.
**Evidencia.** `docs/usuarios-sinteticos.md` (6 perfiles, 2 corridas, hallazgos H1 a H8); `docs/evidencia.md` («No probado: que CRUXE haga que un grupo real se junte»). Las reglas del hackatón prohíben datos reales.
**No decir** «hicimos pruebas con usuarios». Sí: «hicimos pruebas con usuarios simulados; lo siguiente es probarlo con un grupo de verdad».

### C2 · ¿Por qué la usaría esa persona una segunda semana?
**Respuesta.** No lo sabemos todavía. La razón por la que debería volver es que el plan no se cae si alguien se baja y nadie tiene que perseguir a nadie. Pero que la use una segunda vez es la hipótesis más débil.
**Evidencia.** **Sin evidencia** de uso repetido. Cómo se mediría: repetición del encuentro a las 4 y 12 semanas.

### C3 · ¿Cómo sabrían que funciona?
**Respuesta.** Con tres números: planes que llegan a «Grupo confirmado», bajas que se reparan y grupos que se juntan de nuevo a las 4 y 12 semanas. Hoy no tenemos ninguno medido en el mundo real.
**Evidencia.** `docs/problema.md` §4 y `docs/pitch.md` (4:00).

### C4 · ¿Cómo se sostiene? ¿Quién paga?
**Respuesta.** Para amigos es gratis; cómo se sostiene lo dejamos abierto. Hoy el costo real es el modelo de IA (cada llamada cuesta) y por eso es opcional y tiene un respaldo gratuito.
**Evidencia.** `docs/pitch.md` («una pregunta abierta»); `docs/agente-barrido.md` §6 (decisiones pendientes sobre gasto y licencias, p. ej. Open-Meteo gratis solo para uso no comercial).

### C5 · ¿Cómo evitan que el agente se equivoque o diga algo raro?
**Respuesta.** El modelo no decide: elige entre opciones ya filtradas por reglas y redacta un texto. Si lo que devuelve no pasa la validación, entra el texto fijo. La IA nunca confirma ni cambia estados.
**Evidencia.** `docs/agente-ia.md`; función 17/17 sin red; texto fijo cuando falla (`docs/evidencia.md`). **Límite:** se vio voseo en un texto del agente en una app que tutea (`docs/rincones.md`, O-11).

### C6 ⚠ · ¿Quién escribió el código? ¿No es de otro?
**Respuesta.** Lo escribimos durante el evento: el primer commit es del viernes 23 a las 09:47, con dos cuentas de GitHub (Nico y Juan). Casi todo el código lo escribieron asistentes de IA dirigidos por nosotros, y el README lo dice, incluidos ocho commits tempranos con autor «Claude».
**Evidencia.** README «Participantes» y «Componentes externos» (con enlaces). Reglas del hackatón: asistentes de IA permitidos; código previo propio no. **Ensayar esta respuesta**: es la pregunta con más riesgo formal.

### C7 · ¿Makana ya tiene grupos y rachas? ¿Qué agregan ustedes?
**Respuesta.** Makana ya tiene grupos, desafíos y rachas. CRUXE sería la pieza que hace que el encuentro ocurra: cierra el plan y lo repara. No reemplaza nada de eso.
**Evidencia.** `docs/pitch.md`, pregunta difícil 2. **No decir** que Makana «no tiene» eventos o RSVP.

### C8 · ¿Qué harían con una semana más?
**Respuesta.** Probarlo con un grupo real. Después: mejorar el debate y la respuesta de la persona que no puede «esta vez pero sí otra» (otra fecha), sumar recordatorios y conectar el catálogo con fuentes reales (canchas por enlace, eventos de Chile Cultura).
**Evidencia.** `docs/usuarios-sinteticos.md` (lo que no se puede expresar hoy); `docs/agente-barrido.md` §5; `docs/apertura.md` §3 para la visión «más adelante».

### C9 · ¿Con cuál de los casos sí cambiaría esta persona? (pregunta de cierre del jurado)
**Respuesta.** Con este: es el caso donde el problema no es querer, es cerrar, y donde cada uno puede responder en cuatro toques sin cuenta. No lo comparamos con otros; no sumamos puntos con esta pregunta, se mira en los empates.
**Evidencia.** `prompts/contexto-dia-pitch-reglas.md`, punto 2 (pregunta de cierre por caso). Ensayar una frase corta, no una comparación con otros equipos. La lámina de 30 segundos «CRUXE entiende la dinámica de un grupo» (psico, `docs/psicologia-grupo.md` §14) está en `docs/guion-demo.md` §7 y sirve de cierre.

---

## 4. Lo que no se dice (recordatorio)
- Que CRUXE cause más encuentros o más bienestar.
- Una cifra de soledad sin su umbral.
- Datos de cancelaciones en Chile (no existen).
- Que se probó con gente real.
- Que el agente funciona, si el coordinador no lo confirmó; que reserva, paga o confirma algo.
- Que es un producto para empresas.
- Que la privacidad es total en grupos chicos.
- Un paso del recorrido que no figure como verificado.
- Las causas del problema como hechos: van con «creemos que» (D6). Cifras de psicología distintas de F1, o evidencia presentada como chilena cuando es de EE.UU. o Europa (D6).
- Que la app avisa, notifica o recuerda sola (D8).

## 5. Pendientes (se actualizan con las ramas)
- **Enmienda 13 (corte 01:00):** S3, S5b, S6 y S10 tienen versión «si entró» y «si no entró». A las 10:30, con el «Estado verificado», dejar una sola. El botón «Así no puedo, pero sigo» lo conecta front-juan; sin botón, vale la versión «no entró» aunque la base lo tenga.
- **Guion de la demo:** `docs/guion-demo.md` (#103). Sus seis puntos [a verificar] están en la tabla §8; agente-ia (1 y 2) y qa-noche (4 y 5) los prueban esta noche (pedidos 21:12) y el coordinador llena «Estado 10:30».
- **Cifras vivas:** rehacer 78/78, 23/23, 4/4, 10/10 y los 4 toques con el `main` final antes del pitch (sábado 10:30, «Estado verificado para el pitch»).
- **Video de respaldo** y **ensayo de C1, C6, P2 y S5b** con cronómetro: tareas de Nico.
- **Teléfono físico:** no probado; si se prueba antes del pitch, actualizar S9.
