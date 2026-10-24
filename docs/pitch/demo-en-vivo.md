# Demo en vivo de CRUXE: qué tocar, qué decir, qué se ve

Sesión **pitch**, sábado 24 oct 2026. Reparto (guía de Nico, 10:52): **Juan opera, Nico narra mirando a la sala.** Todo ficticio.

- **Versión a, «Los del finde»**: la que está en producción y verificada. **Es la de por defecto.**
- **Versión b, Makana «El plan que no deja a nadie afuera»**: solo si el coordinador la publica antes de las 13:00 y se ensaya una vez entera.

Duración: el recorrido completo dura unos **4 minutos**. En el pitch de 5 minutos la demo tiene **1:40** (`guion-pitch.md`, 2:10–3:50): lo marcado **✂** se hace **antes de subir** o se salta.

## Qué se verificó y cómo

| Qué | Cómo | Resultado |
|---|---|---|
| Pantalla del grupo en producción (10:57) | Navegador, solo mirando, en una demo propia | «Los del finde», «Actividad del grupo» (con «Visible para todo el grupo»), «Invitar al grupo» con «Copiar enlace» y «WhatsApp», «+ Nuevo plan», «GRU · Planes para el grupo», «Simulación (demo)», «Herramientas del organizador» → «Reiniciar demo». Portada: «Tus grupos», «Nuevo grupo», «Abrir la demo «Los del finde»». |
| Resto de los rótulos | Código de `origin/main` (`08aa6e2`) y el guion que el coordinador corre antes de cada publicación (`tests/e2e/recorrido-dos-sesiones.mjs`, 27/27 en cada tanda del TABLERO) | «¿Quién eres?» (Luna entra en **un toque**; «Sí, soy Luna» puede no aparecer), «¿Cuándo puedes?», «Puedo los dos días», «Ver el plan» / «Listo», «Responder en un toque», «Buscar opción compatible», «Confirmar versión 1», «¡Se juntan!», «Se baja: Caro», «En revisión», «Una persona se retiró», «Buscar alternativa», «Nadie confirmó todavía: las confirmaciones anteriores no pasan a esta versión», «Aceptar versión N por …». |
| Lo que no hice | Tocar botones que escriben (reiniciar, crear, confirmar) | El permiso de esta sesión no lo deja: **el recorrido completo lo valida Juan en el ensayo**, con cronómetro. |

---

## Antes de subir (13:30–13:55)

1. **Dos aparatos.** T1 = Tomi (notebook al proyector o teléfono de Juan). T2 = Luna (otro teléfono). Datos móviles como respaldo del Wi-Fi.
2. **T1:** portada → «Abrir la demo «Los del finde»» (la primera vez dice «Probar la demo…»). En el grupo: «Herramientas del organizador» → «Reiniciar demo» → confirmar. ✂
3. **T1:** «+ Nuevo plan» (viene precargado con el caso: asado, sábado 31 y domingo 1, 14:00, mínimo 4, máximo 6, Tomi no puede faltar) → «Crear y abrir al grupo». Tomi responde lo suyo: «Puedo los dos días». ✂
4. **T2:** tener el enlace `…/#/unirse/<código>` listo **sin abrir** (el código está en «Invitar al grupo» → «Copiar enlace»). Si T2 ya fue Luna en el ensayo, usar **la misma sesión**: dirá «Ya estás en este grupo como Luna» → «Seguir como Luna». Una sesión nueva vería a Luna «no disponible» (el reclamo sobrevive al reinicio, `docs/guion-demo.md` §1 punto 8).
5. **No tocar nada que llame al modelo**: «Que el agente proponga un plan», «Que el agente arme un plan» y la pestaña de GRU con generar. Solo si Nico lo decide en el momento, y **una sola vez**.
6. Tener abiertas las capturas del plan B (abajo) en una carpeta del escritorio.

---

## Versión a · «Los del finde» (en producción)

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

## Versión b · Makana «El plan que no deja a nadie afuera» (solo si se publica)

**Condición para usarla:** que el coordinador avise en su TABLERO que `seed_demo_makana` está en producción y que Juan la haya recorrido una vez entera en el ensayo. Si no, **versión a**. Fuente del caso: `docs/demo-makana.md` (rama `codex/demo-makana`); «Participación del plan» viene de `codex/participacion-visible`.

**Personas (ficticias):** Ana organiza; Bruno, Camila, Diego, Elena, Felipe y Gabriela. **Nadie trae respuestas precargadas** y no hay botón de «aceptar por todos»: cada respuesta se da a mano y la simulación queda rotulada.

**Antes de subir:** T1 = Ana («Probar la demo»). T2 = Felipe (o Camila) reclamado desde el enlace. Plan creado con «Nuevo plan»: **«Parque del Encuentro (ficticio), acceso norte, encuentro gratuito», sáb 31 oct o dom 1 nov, 16:00–18:00, mínimo 2, máximo 7.** Ana responde «Puedo los dos días».

| Min | Aparato | Juan toca | Se ve | Nico dice |
|---|---|---|---|---|
| 0:00 | T1 | Mostrar el grupo | Siete personas, «Actividad del grupo» | «Siete compañeros. Siempre se propone pádel o comida, y no le sirve a todos.» |
| 0:15 | T2 | Felipe: enlace → «¿Quién eres?» → «Felipe» → «Solo el sábado …» | «Respuesta guardada» | «Felipe dice en privado que solo puede el sábado. Nadie más lo ve.» |
| 0:35 | T1 | Respuesta de Camila (su sesión o la simulación rotulada): «Solo el domingo …» | — | «Camila, solo el domingo.» |
| 0:50 | T1 | Plan → «Buscar opción compatible» | Versión 1: sábado | «El servidor elige el sábado: Ana y Felipe pueden. Gabriela no respondió: no cuenta.» |
| 1:05 | T1 + T2 | «Confirmar versión 1» en Ana y en Felipe | «Participación del plan»: «Confirmaron la versión 1», «Sin confirmar esta versión», «Por entrar al grupo» | «La participación se ve: quién confirmó y quién no. Lo que cada uno dijo de su agenda, no. Y estar en el grupo no confirma el encuentro.» |
| 1:25 | — | *(pausa)* | — | «Ahora Felipe se baja.» |
| 1:30 | T2 | Felipe: «Ya no puedo ir» / «Retirarme de este plan» → confirmar | T1: «En revisión», «Una persona se retiró» | «Queda una persona: no llega al mínimo. El plan entra en revisión.» |
| 1:50 | T1 | «Buscar alternativa» / «Rearmar con lo nuevo» | Versión 2: domingo, con Camila; «Nadie confirmó todavía» | «Se rearma el domingo. Versión 2, desde cero: cada uno vuelve a decidir.» |
| 2:10 | T1 | «Confirmar versión 2» (Ana; Camila confirma en su sesión o rotulada) | «¡Se juntan!» | «Un plan que no dejó a nadie afuera por no animarse a decir que no podía.» |

**No decir en la versión b** (`docs/demo-makana.md`, «Relato breve y límites»): que el agente usó la preferencia «gratis» de Camila, salvo que se haya llamado al agente y se haya visto; «integración con Makana»; resultados comerciales. Mínimo 2 es del caso, no se sube para fabricar la revisión.

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
