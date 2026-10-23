# Flujo de usuario de CRUXE, tal como está hoy en el código

Fuente: rama `wip/fundamentos`, commit `95def89`, leído el viernes 23 oct 2026, 19:17 (hora de `date`).
Solo describe lo que hay en `src/` y `supabase/migrations/0001` a `0034`. La enmienda 10 (zona, movilidad, tiempo de viaje) está aprobada en `docs/contrato-enmienda-10.md`, pero no tiene código ni migración: no entra acá.
Las referencias son `archivo:línea`. Las de SQL son `0011_enmienda2_propuestas.sql` salvo que diga otra cosa.

## 1. Roles

En el código "organizador" tiene dos sentidos. Conviene no mezclarlos.

- **Organizador del espacio.** Quien crea el grupo (`create_space`, rol `organizador`) o quien toca "Probar la demo" (`seed_demo_space`, entra como Tomi). Llega abriendo la app (`#/`). Es el único que ve el agente que propone, y en el demo las herramientas y la pestaña Simulación (`Espacio.tsx:261`, `Propuesta.tsx:116`).
- **Organizador de la propuesta.** Quien crea esa propuesta. Es el único que la abre, busca la opción, busca la alternativa, la cancela y ve los conteos (`personas_con_condiciones`, "Faltan por responder"). El servidor no exige rol de espacio para crearla (`create_proposal`, línea 30 en adelante), y la pantalla "Crear propuesta" se muestra a todos los miembros (`Espacio.tsx:196`, `212`).
- **Invitado real.** Llega por el enlace `#/unirse/<código>` que el organizador manda por WhatsApp, o escribiendo el código en la portada. Entra como `miembro` con sesión anónima propia. Elige su nombre en la lista o escribe uno nuevo (`QuienEres.tsx`).
- **Integrante pendiente.** Nombre que el organizador anotó al crear el grupo (`CrearGrupo.tsx`, `Integrantes.tsx`). Es una fila sin sesión (`pendiente=true`). No cuenta para nada hasta que alguien la reclama con el enlace (`0033`, `0034`).
- **Persona simulada del demo.** Luna, Mati, Caro, Fede y Sofi, creadas por `seed_demo_space` (`0014:135`). No tienen sesión. Las mueve el organizador del demo desde la pestaña Simulación (`simulate_*`). Un jurado puede tomar uno de esos lugares entrando con el enlace del demo y eligiendo el nombre, si ese lugar no tuvo actividad (`0032`, `join_space` con `p_miembro_id`). Desde ahí es real.
- **Sesión.** Anónima, sin contraseña (`hooks.ts:36-51`, `signInAnonymously`). El nombre local vive solo en el teléfono (`perfil.ts:6`).

## 2. Recorrido del organizador

Rutas: `shell.tsx:77-90`. Pantallas: `App.tsx:175-197`. Todos los RPC salen de `api.ts:269-383`.

**Paso 0. Abrir el link de la app** (`App.tsx:127-147`, `hooks.ts:53-78`)
- Ve: "Iniciando tu sesión…". La primera vez por pestaña, una entrada animada de 2,9 s que se salta con un toque (`Intro.tsx:8,31`).
- Input: nada.
- Dispara: login anónimo si no hay sesión (no es RPC de negocio) y `server_info` (chequea la versión del contrato).
- Cambia: queda una sesión anónima en el navegador.

**Paso 1. Portada, primera vez** (`Inicio.tsx:55`, `96-109`, `232-255`)
- Ve: lema, formulario "Entrar a CRUXE", "Probar la demo", "Tengo un código".
- Input: su nombre ("¿Cómo te llaman tus amigos?").
- Dispara: `list_my_spaces` (para saber si ya tiene grupos).
- Cambia: el nombre queda solo en `localStorage` (`cruxe:perfil`). No va al servidor. Aparecen "Hola, X. ¿Qué plan armamos?", la barra inferior y el acceso "Crear un grupo" (`Inicio.tsx:137`; mientras la persona es "nueva" ese acceso no se muestra).

**Paso 2. Crear un grupo** (`#/crear`, `CrearGrupo.tsx`)
- Ve: "Crear un grupo" con nombre del grupo, tu nombre (precargado) y "Quiénes son" (opcional, hasta 12 nombres, `Integrantes.tsx:7`).
- Input: nombre del grupo (60), tu nombre (30), lista de integrantes.
- Dispara: `create_space(nombre, 'amigos', nombre_visible, integrantes)` (`CrearGrupo.tsx:30`; el tipo está fijo, `:22`).
- Devuelve: espacio, código de invitación, tu miembro como `organizador`, un miembro pendiente por cada nombre. Redirige al espacio con un aviso.

**Paso 3. Espacio del grupo** (`#/e/<id>`, `Espacio.tsx`)
- Ve: código con "Compartir / Copiar / WhatsApp" (`Espacio.tsx:301-329`), tarjeta "Invita a tu grupo" si hay menos de 3 miembros (`:158`), lista de propuestas, "Personas del espacio" (los pendientes dicen "por entrar"), bloque plegado "Agente del círculo".
- Dispara: `get_space` y `list_proposals` al entrar y cada 10 s (`:93`).
- Invitar: el texto es "Súmate a «X» en CRUXE para armar el próximo plan: <enlace>" (`compartir.ts:9`). Se manda por WhatsApp (`wa.me`) o `navigator.share`. No hay RPC.

**Paso 3b. Agente, opcional** (`AgentePanel.tsx`, dentro del paso 3)
- Preferencias de cada persona: `get_my_preferences` y `save_my_preferences` (`:110`, `:140`). Presupuesto, energía, ambiente, lugar y al menos una actividad.
- "Que el agente proponga" (solo organizador del espacio): función `agente` y, si falla, el RPC `proponer_plan_borrador` (`agente/api.ts:287-311`). Entra un sábado (por defecto `2026-10-31`, `:34`) y, en el demo, un clima simulado.
- Devuelve: hasta 3 candidatas válidas, clima, motivo y mensaje para el grupo. Exige al menos 2 personas con preferencias (`pocas_preferencias`).
- "Usar esta opción" guarda título y franjas en `sessionStorage` y abre la nueva propuesta (`:291`). El agente no crea ni confirma nada.

**Paso 4. Nueva propuesta** (`#/e/<id>/nueva`, `NuevaPropuesta.tsx`)
- Ve: "Paso 1 de 2 · El plan" y "Paso 2 de 2 · Revisar y crear".
- Input: título (atajos de actividad `:47-55`), opciones A y B (día entre los próximos 14 y hora), duración, mínimo, máximo, quién no puede faltar, cierre.
- Valores iniciales en un grupo real: próximo sábado con 2 días de margen y domingo, 20:00, 2 h, mínimo 2, máximo 6, imprescindible = tú, cierre el día antes 20:00 (`:165-177`).
- Dispara: `create_proposal` (`:277`) y, con "Crear y abrir al grupo", `open_proposal` (`:299`). "Crear solo el borrador" no abre.
- Devuelve: propuesta en `borrador` o en `reuniendo_interes`. Navega a la propuesta.

**Paso 5. Propuesta, pestaña Plan** (`#/e/<id>/p/<pid>`, `Propuesta.tsx`, `PlanTab.tsx`)
- Ve: estado y próxima acción del servidor, 4 etapas (Interés, Opción, Confirmar, Encuentro), pestañas Plan, Mi respuesta, Historial (y Simulación en el demo).
- Dispara: `get_proposal_state` cada 3 s con `p_desde_rev` (`hooks.ts:237`).
- En borrador: botón "Abrir propuesta" → `open_proposal` (`PlanTab.tsx:521`). Pasa a `reuniendo_interes`.

**Paso 6. Su propia respuesta** (pestaña Mi respuesta, `RespuestaTab.tsx`)
- Input: "Me interesa" / "Hoy paso" (`mark_interest`, `:50`); Sí puedo / No puedo / Pendiente por franja (`get_my_conditions` `:102`, `save_my_conditions` `:116`).
- Por defecto el organizador es el imprescindible. Sin sus condiciones el motor no puede publicar.

**Paso 7. Buscar opción** (`PlanTab.tsx:533-563`)
- Ve: contadores "Con interés", "Confirmados", "Con condiciones" (los dos últimos solo el organizador). Cuando hay tantas personas con condiciones como el mínimo, la próxima acción pasa a "Busca una opción compatible" (`0013`).
- Dispara: `evaluate_and_publish` (`:537`).
- Devuelve `opcion_publicada`: estado `esperando_compromisos`, versión 1, franja y lista de elegibles. O `sin_opcion`: sigue en `reuniendo_interes` con aviso.
- Regla: la franja que empieza antes, con al menos "mínimo" elegibles y con el imprescindible entre ellos (`0002_utilidades.sql:241-252`). Elegible = condiciones completas (A y B en Sí o No), "Sí" en esa franja, sin baja (`:227-239`). El interés no entra.

**Paso 8. Confirmar la versión** (`PlanTab.tsx:145-275`)
- Cada elegible toca "Confirmar versión N" → `accept_version` (`:154`). El organizador también.
- El último cupo queda reservado para el imprescindible hasta que confirme.
- Con confirmados ≥ mínimo y el imprescindible dentro, pasa a `grupo_confirmado` (`op_accept`, `:566`).

**Paso 9. Grupo confirmado** (`PlanTab.tsx:603-648`, solo para quien confirmó)
- Ve: "¡Se juntan!", confeti, botón Calendario (descarga un `.ics`, `compartir.ts:35`) y WhatsApp "Confirmado en CRUXE: …". Dice "CRUXE coordina el plan; no reserva nada".

**Paso 10. Alguien se baja y se repara**
- Quien se baja: Mi respuesta → "No voy" → `withdraw_commitment` (`RespuestaTab.tsx:189`). Es definitivo en esa propuesta.
- Efectos posibles: `sin_cambio_de_estado`, `acuerdo_conservado`, `pasa_a_revision`, `expirado` (`op_withdraw`, `:687`).
- En revisión: todos ven "Una baja dejó el plan sin cumplir" (`PlanTab.tsx:279`). El organizador ve "Buscar alternativa" → `propose_repair` (`:386`).
- Devuelve: versión N+1 en `esperando_compromisos` con cero confirmaciones heredadas, o `sin_alternativa` (sigue en revisión). Con la nueva versión aparece la comparación "versión anterior → vigente" (`PlanTab.tsx:294`). Todos vuelven a confirmar.
- Cancelar: "Cancelar propuesta" → `cancel_proposal` (`:569`).

**Variante demo (Tomi)**
- Portada → "Probar la demo «Los del asado»" (1 toque) → `seed_demo_space` (`Inicio.tsx:303`) → espacio con 5 simulados.
- Nueva propuesta ya cargada con el caso: A sáb 31 oct, B dom 1 nov, 14:00 a 17:00, mínimo 4, máximo 6, cierre jue 29 oct 20:00 (`NuevaPropuesta.tsx:34-45`).
- Pestaña Simulación (`SimulacionTab.tsx`): "Cargar condiciones del caso" (`simulate_load_case`), "Aceptar versión N por…" (`simulate_accept`), "Se baja: X" (`simulate_withdraw`), editar interés y condiciones (`simulate_mark_interest`, `simulate_save_conditions`).
- Herramientas del organizador: `add_simulated_member` y `reset_demo` (`Espacio.tsx:366-455`).
- Las condiciones de Tomi se cargan a mano en Mi respuesta.

## 3. Recorrido del invitado (enlace por WhatsApp hasta la primera respuesta)

Caso base: el organizador anotó los nombres al crear el grupo y la propuesta ya está abierta.

| Toque | Qué toca | Pantalla y RPC |
|---|---|---|
| 1 | El enlace en WhatsApp | Carga la app. "Iniciando tu sesión…" y "Buscando tu grupo…". `preview_space_by_code` (`QuienEres.tsx:188`). Sin entrada animada: solo sale en `#/` (`App.tsx:69`). |
| 2 | Su nombre en la lista | "¿Quién eres?" (`QuienEres.tsx:263-271`). Solo cambia a la pantalla de confirmar. |
| 3 | "Sí, soy X" | "¿Eres X?" (`:236-244`). `join_space(código, nombre, miembro_id)`. Redirige al espacio con aviso. |
| 4 | La tarjeta del plan | Espacio (`Espacio.tsx:207`, `PlanVivo.tsx:26`). Abre la propuesta en la pestaña Plan (`Propuesta.tsx:41`). |
| 5 | Pestaña "Mi respuesta" | O el botón "Ir a Mi respuesta" (`PlanTab.tsx:501`). Mismo costo. |
| 6 | Sí o No en la franja A | `Condiciones.tsx`. Todo parte en "Pendiente". |
| 7 | Sí o No en la franja B | Sin las dos, quedan "Incompletas" y no entra al motor. |
| 8 | "Guardar condiciones" | `save_my_conditions`. Es la primera respuesta que el motor usa. |

**Resultado: 8 toques contando el del enlace (7 desde que la app carga).** Son 5 vistas después del cargador: ¿Quién eres?, ¿Eres X?, espacio, Plan, Mi respuesta.

Cómo lo conté:
- Cuento cada toque que cambia de pantalla o guarda algo.
- No cuento escribir, hacer scroll, ni las redirecciones automáticas (cargador de sesión, ir al espacio tras unirse).
- "Primera respuesta" = disponibilidad guardada. Si se toma "Me interesa" como primera respuesta, son 6 toques (enlace, nombre, "Sí, soy", tarjeta, pestaña, "Me interesa").

Variantes:
- Sin lista (grupo creado sin integrantes): enlace, tocar el campo de nombre y "Unirme" = 3 toques más escribir. El total sigue en 8 (`QuienEres.tsx:310-378`).
- Navegador que ya es miembro: +1 toque, "Seguir como X" (`QuienEres.tsx:160`).
- Propuesta en borrador: no puede responder (`puede.guardar_condiciones` es falso fuera de `reuniendo_interes` y siguientes, `0028`).
- Sin propuesta: el espacio dice "Todavía no hay propuestas" y ofrece "Crear propuesta" también al invitado (`Espacio.tsx:191-199`).
- Tocar "Me interesa" además de las condiciones suma 1 toque (`RespuestaTab.tsx:67`).

Confirmar después: portada → tarjeta "Tu plan" (`Inicio.tsx:129,280`), que dice "Te toca confirmar la versión N" → "Confirmar versión N". Son 2 toques con la app abierta. No hay aviso fuera de la app.

## 4. Datos

| Dato | Lo carga | Dónde se guarda | Quién lo ve | Qué lo usa |
|---|---|---|---|---|
| Sesión anónima | automática | Supabase Auth, en el navegador | solo ese navegador | todos los RPC (`auth.uid()`) |
| Nombre local (perfil) | cada persona, portada o Perfil | `localStorage cruxe:perfil` (`perfil.ts:6`) | solo ese teléfono | precarga de nombre al unirse o crear |
| Sesión guardada de otra persona | automático al "Entrar como otra persona" | `localStorage cruxe:sesion-guardada` (`sesiones.ts:9`) | cualquiera que use ese navegador | "Volver a esa sesión" |
| Nombre y tipo del grupo | organizador | `cruce.espacios` | miembros. Nombre y demo también con solo el código (`preview_space_by_code`) | listas, invitación |
| Nombre visible en el grupo | cada uno o el organizador (integrantes) | `cruce.miembros` | miembros. La lista completa de nombres, con solo el código | todo el grupo |
| Código de invitación | servidor | `cruce.espacios` | miembros | `join_space`, enlace |
| Título, franjas A/B, mínimo, máximo, imprescindible, cierre | organizador de la propuesta | `cruce.propuestas`, `franjas` | todo el grupo | motor, cupos, plazo |
| Me interesa / Hoy paso | cada uno | `cruce.participaciones` | todo el grupo ve los nombres de quienes marcaron | contador y nodos. No suma confirmados. No lo usa el motor |
| Condiciones (Sí/No/Pendiente por franja) | cada uno. En el demo, el organizador por los simulados | `cruce.condiciones` | solo yo (`get_my_conditions`). Organizador: cuántas completas, no quién | motor (`elegibles_franja`) |
| Elegibilidad en la versión | servidor | `cruce.elegibles` | cada uno ve si él es elegible, no la lista | quién puede confirmar |
| Confirmación de versión | cada elegible | `cruce.aceptaciones` | todo el grupo (nombre y hora) | cupos, `grupo_confirmado` |
| Baja | cada uno | `cruce.bajas`, `participaciones` | todo el grupo (nombre, versión, si había confirmado) | estado, reparación |
| Preferencias del agente | cada uno | `cruce.preferencias` | solo yo. El organizador recibe totales solo con más de 3 personas y 2 o más votos. El presupuesto nunca | `proponer_plan_borrador` |
| "Que el agente use mis preferencias" | cada uno | `preferencias.usar_en_agente` | solo yo | filtra a quién cuenta el agente |
| Sábado y clima simulado del agente | organizador | no se guarda | no aplica | función `agente` (clima real vía Open-Meteo) |
| Borrador del agente | organizador | `sessionStorage cruxe:borrador-agente:<id>` (`agente/api.ts:318`) | solo esa pestaña | nueva propuesta, se lee una vez |
| Historial | servidor | eventos de la propuesta | todo el grupo (actor, hora, versión) | pestaña Historial |

## 5. Estados del plan

Etiquetas del servidor: `types.ts:28-36`. Texto "Próxima acción": `0029`, `0013`.

| Estado | Próxima acción que muestra | Cómo se llega |
|---|---|---|
| Borrador | "El organizador debe abrir la propuesta." | `create_proposal` sin abrir. Nadie puede marcar interés ni cargar condiciones |
| Reuniendo interés | "Cada persona marca su disponibilidad en privado…". Al organizador, con suficientes condiciones: "Busca una opción compatible" | `open_proposal` |
| (sigue en Reuniendo interés) con aviso "Sin opción compatible" | "Se puede esperar más disponibilidad o cancelar" | `evaluate_and_publish` sin franja viable. "Sin opción" es un resultado, no un estado |
| Esperando compromisos | "Te toca confirmar la versión N" / "Ya confirmaste… Faltan X para el mínimo" / "Versión N: confirmaron X de MIN necesarias. Falta la aceptación de [imprescindible]" | `evaluate_and_publish` con opción, o `propose_repair` |
| Grupo confirmado | "Grupo confirmado en la versión N. Cupos disponibles: X." | confirmados ≥ mínimo y confirmó el imprescindible. Se puede seguir confirmando hasta el máximo |
| En revisión | "Hubo una baja… El organizador debe buscar una alternativa" o, tras buscar sin éxito, "Sin opción compatible: no hay alternativa" | baja que deja menos elegibles que el mínimo o saca al imprescindible. También baja con grupo ya confirmado si queda bajo el mínimo y falta plazo |
| Expirado | "Venció el plazo sin grupo confirmado." | pasa el cierre en borrador, reuniendo, esperando o en revisión. El servidor lo marca al leer o actuar (`cruce.vencer`). Un grupo confirmado no expira solo, salvo baja después del plazo |
| Cancelado | "El organizador canceló la propuesta." | `cancel_proposal`, solo el organizador de la propuesta |

Reparación: En revisión → Esperando compromisos con versión N+1 y cero confirmaciones.
Barra de etapas (`Propuesta.tsx:342-365`): Interés (borrador, reuniendo), Opción (en revisión), Confirmar (esperando), Encuentro (confirmado).
"Te toca" en las listas sale del código `te_toca_aceptar` (`PlanVivo.tsx:9`).

## 6. Fricciones que se ven en el código

**Antes de la primera respuesta del invitado**
1. El enlace deja al invitado en el espacio, no en la propuesta. Para llegar a "Mi respuesta" hay dos navegaciones más: tarjeta y pestaña (`QuienEres.tsx:53`, `Propuesta.tsx:41`). Con un solo plan abierto podría ir directo.
2. Pantalla de confirmación "¿Eres X?" después de tocar el nombre (`QuienEres.tsx:229-252`). Es un toque de paso. Si el navegador ya era miembro, otra pantalla más (`:108-172`).
3. Las condiciones exigen A y B. Quien responde solo una queda "Incompletas" y fuera del motor, y la única señal es una etiqueta (`0002_utilidades.sql:143-148`, `RespuestaTab.tsx:128`, `:147`). Además hay un botón Guardar aparte (`:150`).
4. "Me interesa" aparece primero en Mi respuesta (`RespuestaTab.tsx:35`) pero el motor no lo mira (`0002_utilidades.sql:227-239`). Tres textos explican que no es confirmación (`:65`, `PlanTab.tsx:484`, `Perfil.tsx:99`).
5. Grupo creado sin integrantes: "¿Quién eres?" muestra al organizador como "no disponible" y el invitado tiene que bajar al formulario (`QuienEres.tsx:254-293`). Anotar nombres es opcional (`Integrantes.tsx:58`).
6. Entrar escribiendo el código en la portada no pasa `miembro_id` (`Inicio.tsx:384`). Si el nombre coincide con un integrante anotado, el servidor responde "nombre en uso" y no lo reclama (`0032`, rama sin `p_miembro_id`). Solo el enlace sirve.
7. Duplicado: el formulario de la portada (`Inicio.tsx:338-505`) repite casi todo `QuienEres.tsx:86-172` y `310-378`.

**Para el organizador**
8. Pide el nombre dos veces: "Entrar a CRUXE" (`Inicio.tsx:232-255`) y "Tu nombre en el grupo" (`CrearGrupo.tsx:57`). El primero es solo local y bloquea el acceso a "Crear un grupo" (`Inicio.tsx:137`). Más la entrada animada de 2,9 s (`Intro.tsx:8`).
9. Nadie avisa que hay opción nueva. WhatsApp existe solo en invitación (`Espacio.tsx:171,323`), mensaje del agente (`AgentePanel.tsx:378`) y cierre (`PlanTab.tsx:641`). No hay botón al publicar la versión ni al reparar. No hay push. El sondeo corre solo con la app abierta (3 s en la propuesta, 10 s en listas).
10. "Quién no puede faltar" ofrece también a los pendientes que no entraron (`NuevaPropuesta.tsx:430-444`). Si se elige a uno, el motor nunca publica (exige al imprescindible entre los elegibles, `0002_utilidades.sql:241-252`).
11. El texto dice "Si sirven las dos, gana la A" (`NuevaPropuesta.tsx:383`) pero el servidor ordena por fecha de inicio (`0002_utilidades.sql:249`). Si B es anterior a A, gana B. La pantalla no valida el orden.
12. "Faltan por responder" (`PlanTab.tsx:212`) es el conteo de elegibles que aún no confirmaron (`0027`), no de quienes no cargaron condiciones.
13. Tres formas de decir que no: "No puedo" por franja, "Hoy paso" (`RespuestaTab.tsx:82`) y "No voy", que es definitivo (`:195`).

**Textos que asumen "asado" o anfitrión**
14. Ejemplos fijos: `NuevaPropuesta.tsx:375` ("Asado en casa de Tomi"), `CrearGrupo.tsx:55` ("Los del asado").
15. "Anfitrión" en `PlanTab.tsx:84,134,202,222-224,282` y `api.ts:393`, mientras la creación dice "No puede faltar" (`NuevaPropuesta.tsx:427`). Para fútbol o cine, "anfitrión" no aplica.
16. El catálogo del agente es fijo para cualquier grupo: 5 actividades, "Quincho de Tomi (Simulación)", fiesta de 23:00 a 03:00 (`0014:25-36`). El título propuesto es "Asado en casa de Tomi". "Presupuesto este finde" está en `AgentePanel.tsx:153`.

**Cosas que solo funcionan en el demo, o que se ven igual en un grupo real**
17. Los valores del caso tienen fechas fijas: 31 oct, 1 nov y cierre 29 oct 20:00 (`NuevaPropuesta.tsx:34-45`, `:341`). Pasado el 29 oct 20:00 el servidor rechaza el cierre (`plazo_invalido`) y hay que editar las fechas.
18. El agente trae por defecto el sábado `2026-10-31` (`AgentePanel.tsx:34,472`). El servidor solo acepta un sábado entre mañana y hoy + 16 días (`0031`, `proponer_plan_borrador`), así que desde el 1 nov falla con `fecha_invalida` si no se cambia.
19. El chip "Datos ficticios" está siempre en el encabezado, también en grupos reales (`App.tsx:82`).
20. Solo demo: botón con "Serás Tomi…" (`Inicio.tsx:322`), Herramientas del organizador (`Espacio.tsx:261`), pestaña Simulación (`Propuesta.tsx:116`), clima simulado (`AgentePanel.tsx:520`), reclamar lugar de un simulado (`QuienEres.tsx:370`).
21. Las preferencias del agente están en un bloque plegado "Opcional" al final del espacio (`Espacio.tsx:242-250`). Nada se las pide a los invitados, y el agente necesita 2 personas. En un grupo real lo más probable es `pocas_preferencias`.

**Detalles de forma y código**
22. `AgentePanel.tsx` usa voseo ("Marcá", "Elegís", "podés": `:171`, `:299`, `:446`, `:585`). El resto de la app usa tuteo.
23. Zona fija: `'America/Santiago'` en `api.ts:313` y textos "hora de Santiago" (`PlanTab.tsx:104,166`).
24. Código sin uso: `src/login/Entrar.tsx` entero (la ruta `entrar` usa `Inicio`, `App.tsx:191`) y la rama `codigoInvitacion` de `Inicio.tsx:57-92` (nadie la pasa).
