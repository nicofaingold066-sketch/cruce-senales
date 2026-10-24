# Demo en vivo de CRUXE: qué tocar, qué decir, qué se ve

Sesión **pitch**, sábado 24 oct 2026. Reparto (guía de Nico, 10:52): **Juan opera, Nico narra mirando a la sala.** Todo ficticio.

> **Cambio 11:07:** el coordinador publicó `main` `018215d` (11:03) con la demo Makana en la portada y **«Los del finde» salió de la portada** (TABLERO, aviso 11:04). El deck usa el caso Makana. Por eso:

- **Versión principal: Makana (nombres nuevos desde 11:28) «El plan que no deja a nadie afuera»** (sección «Versión b» abajo). Portada verificada en producción a las 11:07 («Probar la demo «El plan que no deja a nadie afuera»»); desde las 11:28 dice «Serás Bastián, quien organiza; los otros seis amigos son ficticios y simulados» (`src/lib/casoDemo.ts` en `main` `233bb2e`, leído en el código).
- **Versión de respaldo: «Los del finde»** (sección «Versión a»): ya no se abre desde la portada; solo sirve en un navegador que ya la tenga en «Tus grupos». Su recorrido sí está probado 27/27; el de Makana lo recorrió el coordinador a mano hasta la respuesta (demo → grupo → nuevo plan → respuesta). **El resto (buscar, confirmar, baja, v2) lo valida Juan en el ensayo.**

Duración: el recorrido completo dura unos **4 minutos**. En el pitch de 5 minutos la demo tiene **1:40** (`guion-pitch.md`, 2:10–3:50): lo marcado **✂** se hace **antes de subir** o se salta.

## Qué se verificó y cómo

| Qué | Cómo | Resultado |
|---|---|---|
| Pantalla del grupo en producción (10:57) | Navegador, solo mirando, en una demo propia | «Los del finde», «Actividad del grupo» (con «Visible para todo el grupo»), «Invitar al grupo» con «Copiar enlace» y «WhatsApp», «+ Nuevo plan», «GRU · Planes para el grupo», «Simulación (demo)», «Herramientas del organizador» → «Reiniciar demo». Portada: «Tus grupos», «Nuevo grupo», «Abrir la demo «Los del finde»». |
| Resto de los rótulos | Código de `origin/main` (`08aa6e2`) y el guion que el coordinador corre antes de cada publicación (`tests/e2e/recorrido-dos-sesiones.mjs`, 27/27 en cada tanda del TABLERO) | «¿Quién eres?» (Luna entra en **un toque**; «Sí, soy Luna» puede no aparecer), «¿Cuándo puedes?», «Puedo los dos días», «Ver el plan» / «Listo», «Responder en un toque», «Buscar opción compatible», «Confirmar versión 1», «¡Se juntan!», «Se baja: Caro», «En revisión», «Una persona se retiró», «Buscar alternativa», «Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión», «Aceptar versión N por …». |
| Portada con la demo Makana (11:07, `main` `018215d`) | Navegador, solo mirando | «Probar la demo «El plan que no deja a nadie afuera»» y «Serás Ana, quien organiza…». No la abrí: abrirla crea la demo (escribe en la base). |
| Lo que no hice | Tocar botones que escriben (reiniciar, crear, confirmar) | El permiso de esta sesión no lo deja: **el recorrido completo lo valida Juan en el ensayo**, con cronómetro. |

---

## Antes de subir · versión a «Los del finde» (respaldo)

1. **Dos aparatos.** T1 = Tomi (notebook al proyector o teléfono de Juan). T2 = Luna (otro teléfono). Datos móviles como respaldo del Wi-Fi.
2. **T1:** portada → «Abrir la demo «Los del finde»» (la primera vez dice «Probar la demo…»). En el grupo: «Herramientas del organizador» → «Reiniciar demo» → confirmar. ✂
3. **T1:** «+ Nuevo plan» (viene precargado con el caso: asado, sábado 31 y domingo 1, 14:00, mínimo 4, máximo 6, Tomi no puede faltar) → **cambiar el título a «Pádel y algo después»** (el deck no usa el asado como ejemplo; el título es libre y no cambia el recorrido) → «Crear y abrir al grupo». Tomi responde lo suyo: «Puedo los dos días». ✂ Si el ensayo muestra que cambiar el título trae otro problema, dejar el asado y no nombrarlo: «un plan del grupo».
4. **T2:** tener el enlace `…/#/unirse/<código>` listo **sin abrir** (el código está en «Invitar al grupo» → «Copiar enlace»). Si T2 ya fue Luna en el ensayo, usar **la misma sesión**: dirá «Ya estás en este grupo como Luna» → «Seguir como Luna». Una sesión nueva vería a Luna «no disponible» (el reclamo sobrevive al reinicio, `docs/guion-demo.md` §1 punto 8).
5. **No tocar nada que llame al modelo**: «Que el agente proponga un plan», «Que el agente arme un plan» y la pestaña de GRU con generar. Solo si Nico lo decide en el momento, y **una sola vez**.
6. Tener abiertas las capturas del plan B (abajo) en una carpeta del escritorio.

---

## Versión a · «Los del finde» (respaldo: solo si el navegador ya la tiene)

| Min | Aparato | Juan toca | Se ve | Nico dice |
|---|---|---|---|---|
| 0:00 | T1 | Nada: mostrar el grupo | «Los del finde», 6 personas, «Actividad del grupo» | «Tomi armó el grupo del finde: él y cinco amigos. Luna recibe el enlace por WhatsApp.» |
| 0:10 | T2 | Abrir el enlace → «¿Quién eres?» → tocar «Luna» (si pregunta, «Sí, soy Luna») | Cae directo en «¿Cuándo puedes?» con el nombre del plan | «Toca su nombre. Sin cuenta, sin contraseña.» |
| 0:25 | T2 | «Puedo los dos días» → «Ver el plan» (o «Listo») | «Respuesta guardada» / «Respondiste» | «Responde en un toque. Esto lo ve solo el servidor: el grupo no sabe qué eligió. Y responder no es confirmar.» |
| 0:40 ✂ | T1 | «Simulación (demo)» → «Cargar condiciones del caso a las personas simuladas» | «… cargadas las condiciones de …» | «Mati, Caro, Fede y Sofi son simulados, y dice que lo son. Cada uno respondió en privado.» |
| 0:55 | T1 | Plan → «Buscar opción compatible» | Versión 1: sábado 31, Tomi, Luna, Mati y Caro | «Con lo que hay, el servidor propone una sola opción. Fede y Sofi no pueden el sábado: no cuentan. El silencio nunca cuenta como un sí.» |
| 1:10 | T1 | «Confirmar versión 1» → «Simulación» → «Aceptar versión 1 por …» | «Confirmaron la versión 1: …» | «Cada uno confirma **esta** versión.» |
| 1:25 | T2 | «Confirmar versión 1» (o «Responder en un toque» si aparece) | **«¡Se juntan!»** (confeti), «Grupo confirmado» | «Recién ahora hay un plan. Y lo ven los dos teléfonos.» |
| 1:40 | — | *(pausa de 2 s)* | — | «Ahora alguien se baja.» |
| 1:45 | T1 | «Simulación» → «Se baja: Caro» → «Sí, Caro se baja» → Plan | **«En revisión»**, «Una persona se retiró» | «Quedan tres, menos del mínimo. El plan no finge que sigue armado. Y fíjense: no dice quién se bajó. Lo digo yo porque es una simulación.» |
| 2:05 | T2 | Mostrar el teléfono de Luna | También «En revisión», sin nombre | «Luna lo ve igual. Nadie tiene que dar explicaciones.» |
| 2:15 | T1 | «Buscar alternativa» | Versión 2: domingo 1, con Fede. «Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión» | «Se rearma con otra fecha: versión 2. Empieza de cero.» |
| 2:35 | T1 + T2 | «Confirmar versión 2» (Tomi) → «Simulación» → «Aceptar versión 2 por …» → T2 «Confirmar versión 2» | «¡Se juntan!» otra vez, «Confirmaron 5 (mínimo 4)» | «Cada uno vuelve a decidir. Y el plan sigue en pie.» |
| 3:00 ✂ | T1 | «Actividad del grupo» | Quién entró y quién se bajó de un plan | «Lo que pasa en el grupo queda a la vista; lo que dijo cada uno, no.» |
| 3:15 ✂ | — | — | — | (si preguntan) «Si Tomi, que no puede faltar, no pudiera, diría *Sin opción compatible*. No inventa un plan.» (`docs/guion-demo.md` §3, variantes del jurado 4/4) |

**Corte de 1:40 para el pitch:** pasos 2–3 de «Antes de subir» y la carga de simulados hechos antes; en escena: Luna entra y responde (0:10–0:40) → buscar y confirmar (0:55–1:25) → baja de Caro (1:45) → versión 2 (2:15) → confirmar (2:35). Si el tiempo aprieta, la versión 2 se muestra hasta «Nadie confirmó todavía» y se dice «vuelven a confirmar y queda cerrado».

---

## Versión b · Makana «El plan que no deja a nadie afuera» (PRINCIPAL desde las 11:03)

**Estado:** publicada (`018215d`, migración 0058 aplicada 10:33). Juan la recorre una vez entera en el ensayo antes de subir. Fuente del caso: `docs/demo-makana.md` (rama `codex/demo-makana`); «Participación del plan» viene de `codex/participacion-visible`.

**Personas (ficticias, en producción desde `main` `233bb2e`, 11:28):** Bastián organiza (Juan); Nacho, Carlos, Kai, Charlie, Joaco y Pía son simulados y rotulados. Portada: «Serás Bastián, quien organiza; los otros seis amigos son ficticios y simulados.» Con los nombres ya en pantalla, **Nico puede nombrarlos**.

**El caso cambió con la 0060 (11:24)** (`supabase/migrations/0060_demo_makana_cargada.sql`): Nacho, Kai y Joaco pueden **los dos días**; Charlie **solo el sábado**; Carlos **solo el domingo**; Pía no responde. Los seis traen gustos cargados (pádel y comida). El deck y el video dicen «Joaco solo sábado»: en pantalla Joaco puede los dos días; Nico no dice «solo sábado» de Joaco.

**Antes de subir (un solo aparato: Juan es Bastián y simula al resto):**
1. Abrir la demo **desde una sesión nueva o con «Reiniciar demo»** para tomar los nombres y gustos nuevos (la 0060 dice que las demos ya sembradas los toman al reiniciar). Portada → «Probar la demo «El plan que no deja a nadie afuera»».
2. «+ Nuevo plan»: precargado con **«Parque del Encuentro (ficticio) · acceso norte · encuentro gratuito»**, sáb 31 oct y dom 1 nov a las 16:00, 2 horas, mínimo 2, máximo 7 (`src/lib/casoDemo.ts`) → «Crear y abrir al grupo». ✂
3. Bastián responde «Puedo los dos días». ✂

**Clave para que se vea la reparación:** con mínimo 2, la baja solo pone el plan «En revisión» si las confirmaciones vigentes quedan por debajo de 2. Por eso en la versión 1 confirman **solo Bastián y Joaco**: no usar «aceptar por todos». Si confirman más, la baja de Joaco no rompe el plan (queda registrada y el plan sigue: `docs/caso-canonico.md`, «Regla del motor»).

**Respuestas de los simulados:** en «Simulación (demo)», por persona: «Usar valores del caso para Joaco» (y para Carlos y Charlie si hay tiempo) o «Editar interés y condiciones de …» → «Guardar condiciones de …». El atajo de una vez «Cargar las respuestas de los N de una vez» sigue oculto para Makana en el cliente (`SimulacionTab.tsx:90`, condición `!makana`), aunque la 0060 lo habilita en el servidor: **verlo en el ensayo**.

| Min | Juan toca (como Bastián) | Se ve | Nico dice |
|---|---|---|---|
| 0:00 | Mostrar el grupo | Siete amigos, «Actividad del grupo», el plan del parque «Reuniendo respuestas» | «Bastián propone un plan que le sirve a todos: un parque, gratis, sábado o domingo a la tarde.» |
| 0:15 | «Simulación (demo)» → «Usar valores del caso para Joaco» | Fila de Joaco con su respuesta (solo la ve quien simula) | «Cada uno dice en privado cuándo puede. Nadie del grupo ve lo de los demás.» |
| 0:30 ✂ | Igual con Carlos (solo domingo) y Charlie (solo sábado) | — | «Carlos, solo el domingo. Charlie, solo el sábado. Pía no respondió.» |
| 0:45 | Plan → «Buscar opción compatible» | Versión 1: sábado 31, 16:00 | «El servidor propone una sola opción: el sábado. Pía no respondió: no cuenta. El silencio no es asistencia.» |
| 1:00 | «Confirmar versión 1» → «Simulación (demo)» → **solo** «Aceptar v1» en la fila de Joaco | «Participación del plan»: «Confirmaron la versión 1» (Bastián, Joaco), «Sin confirmar esta versión»; «¡Se juntan!» (mínimo 2) | «Bastián y Joaco confirman esta versión. El grupo ve quién confirmó, no qué dijo cada uno.» |
| 1:20 | *(pausa)* | — | «Ahora Joaco se baja.» |
| 1:25 | «Simulación (demo)» → «Se baja: Joaco» → «Sí, Joaco se baja» → Plan | **«En revisión»**, «Una persona se retiró» | «Queda una sola confirmación: no llega al mínimo. El plan no finge que sigue armado. Y no dice quién se bajó; lo digo yo porque es una simulación.» |
| 1:45 | «Buscar alternativa» (o «Rearmar con lo nuevo») | Versión 2 (**leer el día en pantalla**: por la regla del motor, la franja más temprana viable sin Joaco; con Nacho, Kai y Charlie el sábado sigue viable); «Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión» | «Se rearma sin Joaco: versión 2, desde cero.» (no decir «el domingo» si la pantalla dice sábado) |
| 2:00 | «Confirmar versión 2» → «Simulación (demo)» → «Aceptar v2» en una fila (p. ej. Kai) | **«¡Se juntan!»** | «Cada uno vuelve a decidir. Y el plan sigue en pie.» |

La secuencia exacta (sobre todo el día de la v2) no la vi en pantalla: **Juan la recorre una vez en el ensayo** y, si el día cambia, Nico dice el que se ve.

**No decir en la versión Makana** (`docs/demo-makana.md`, «Relato breve y límites»): que el agente usó la preferencia «gratis» de Carlos, salvo que se haya llamado al agente y se haya visto; «integración con Makana»; resultados comerciales. Mínimo 2 es del caso, no se sube para fabricar la revisión.

---

## Plan B

| Falla | Qué hace Juan | Qué dice Nico |
|---|---|---|
| Se corta la red | «Reintentar» o «Recargar» (la app reintenta sola una vez) | «Se cortó la red del lugar; reintento.» |
| Sin red del todo | Pasar a capturas (abajo), en este orden | «Les muestro las capturas del recorrido en producción.» |
| T2 ve «Luna — no disponible» | Seguir solo con T1: la carga de simulados incluye a Luna (§3b de `docs/guion-demo.md`) | «Hoy Luna es simulada.» |
| «Falla temporal. Intenta de nuevo.» | Tocar «Reintentar» una vez | «La base tardó; reintento.» |
| Algo no responde en 10 s | Saltar al paso siguiente o a las capturas | «Esto es lo que se ve cuando funciona.» (sin disimular) |

**Capturas para el plan B** (en el repo; abrirlas desde el escritorio antes de subir):
1. Portada: `docs/rediseno/capturas/s4/produccion/02-portada-375.png`
2. ¿Cuándo puedes?: `docs/rediseno/capturas/produccion/s5-responder-375.png` y `s5-respondiste-375.png`
3. Reuniendo respuestas: `docs/rediseno/capturas/s4/produccion/06-1-reuniendo-375.png`
4. Simulación: `docs/rediseno/capturas/s4/produccion/10-1b-simulacion-375.png`
5. Esperando confirmaciones: `docs/rediseno/capturas/s4/produccion/14-2-esperando-375.png`
6. ¡Se juntan!: `docs/rediseno/capturas/s4/produccion/26-3-se-juntan-375.png`
7. En revisión: `docs/rediseno/capturas/s4/produccion/30-4-en-revision-375.png`
8. Versión 2 desde cero: `docs/rediseno/capturas/s4/esperando-v2-reparada-no-elegible-375.png`
9. 30 personas a la vez: `docs/qa/capturas/c3-conteo-31.png` y `docs/qa/capturas/c6-quien-queda-afuera.png` (para preguntas de escala)

## Qué NO tocar

- **Nada que llame al modelo de IA** (botones del agente/GRU que generan propuestas) salvo que Nico lo decida en escena; una sola llamada.
- «Reiniciar demo» durante el pitch (borra el plan en curso).
- «Eliminar grupo», «Cancelar la propuesta», «Entrar como otra persona» en T1.
- Abrir el enlace de invitación en el navegador de T1 (pide cambiar de persona: tres toques de más).
- Ningún grupo con datos reales; todo lo que se muestra dice «Datos ficticios».
