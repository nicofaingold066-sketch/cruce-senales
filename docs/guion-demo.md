# Guion de la demo (dos partes, con tiempos, frases y plan B)

Dueño: apertura. Pedido #103 (Nico, vía coordinador, 20:52 del viernes 23 oct 2026). Todo ficticio.

**Qué es.** Lo que se toca y lo que se dice, paso por paso, en los 5 minutos del pitch (demo en vivo obligatoria; después 3 minutos de preguntas: `prompts/contexto-dia-pitch-reglas.md`, bases §9 y §10). Dos partes:
- **Parte A, grupo nuevo: «convencer a uno».** Vale crea el grupo con los nombres, manda el enlace, Ana responde en 4 toques y sale la opción.
- **Parte B, espacio demo «Los del asado»: el agente.** Con «Simular sol», zona y movilidad, «queda a menos de N minutos para todos», alguien se baja y el plan se rearma.

**Cómo leerlo.** Cada paso tiene: lo que se toca (rótulo exacto de la pantalla, entre comillas), lo que se dice (una frase) y qué prueba lo respalda. Marcas: **[visto]** = pasó en producción esta noche, con guion y hora; **[leído]** = sale del código, no se vio en pantalla; **[a verificar]** = hay que confirmarlo en el ensayo del sábado (10:00–11:00) y en el «Estado verificado para el pitch» de las 10:30. Los segundos son una estimación para repartir el tiempo: se miden con cronómetro en el ensayo. Producción al escribir esto (20:59): `main` `3ace04e`.

**Reglas que no se rompen en escena.** Solo se dice lo que funciona en vivo. Nunca «reservado», «confirmado por la IA», «la app manda mensajes sola», ni «probado con gente real». Las causas del problema se dicen como «creemos que» y sin cifras de psicología salvo F1 con fuente (D6). La app no manda notificaciones: el recordatorio lo manda una persona por WhatsApp con el texto que arma CRUXE, y eso se declara como límite (D8). Si un paso falla, se usa su plan B sin disimular («esto es la versión de respaldo»).

## 0. Reparto del tiempo (propuesta; cambia la estructura de `docs/pitch.md`)

| Tramo | Qué | Criterio del jurado |
|---|---|---|
| 0:00–0:45 | Problema: el asado del 8 de octubre y por qué **creemos que** falla el cierre (`docs/pitch.md` 0:00–1:10, comprimido). Decisión D6 de Nico: las causas se dicen como «creemos que»; si se nombra evidencia, decir que es de EE.UU. y Europa y que no hay de Chile; la única cifra de psicología que se cita es F1 con su fuente (80 % de 1.100 encuestados en EE.UU.: cancelar no daña la amistad, mentir sobre el motivo sí; MSU 2023) | Problema |
| 0:45–1:45 | **Parte A** (1:00) | Solución |
| 1:45–3:55 | **Parte B** (2:10) | Solución |
| 3:55–4:25 | Qué dejamos fuera y cómo lo mediríamos | Solución, Convicción |
| 4:25–5:00 | Cierre | Convicción |

Hoy `docs/pitch.md` reserva 1:10–4:00 para una sola demo (2:50). Con dos partes, el problema baja a 45 segundos y la demo ocupa 3:10. Si en el ensayo no entra, se recorta primero lo marcado **(recortable)** en la Parte B; la Parte A no se recorta, porque es la respuesta al primer punto del jurado (fricción).

## 1. Antes de subir (lista de control, 13:30–13:55)

Dos aparatos: **T1** (quien organiza: Vale en A, Tomi en B) y **T2** (quien recibe el enlace: Ana en A, Luna en B). Si el proyector lo permite, T1 puede ser la notebook (pantalla grande) y T2 un teléfono. Red: datos del teléfono como respaldo del Wi-Fi del lugar. Ninguno de los dos recorridos se probó en teléfono físico (`docs/evidencia.md`, «No probado»): el ensayo del sábado es la primera vez.

**Parte A, en T1 (Vale), hecho de antemano para no gastar tiempo en escena:**
1. Portada → «¿Cómo te llaman tus amigos?» = Vale → «Entrar» → «Crear un grupo». Nombre del grupo: «Los del fútbol». «Agregar» cinco nombres: Ana, Beto, Coni, Diego, Ema. «Crear grupo». **[visto]** (`tests/e2e/convencer-uno.mjs`, ux-flujo; `docs/flujo-usuario.md` §3.1: 21 toques del organizador, por eso se hace antes).
2. «Crear propuesta» → atajo «Fútbol» (hoy el primer atajo es «Asado»: no tocarlo; si front-juan conectó `atajosParaGrupo`, «Fútbol» sale primero) → «Revisar antes de crear» → «Crear y abrir al grupo». Valores por defecto de un grupo nuevo: sábado 31 oct y domingo 1 nov a las 20:00, mínimo 2, máximo 6, Vale no puede faltar, cierre viernes 30 a las 20:00 **[leído]** (`src/screens/NuevaPropuesta.tsx:162-173`).
3. Pestaña «Mi respuesta» → «Sí puedo» en A y en B → «Guardar condiciones» → «Guardado. Solo tú ves estas condiciones.» (si Vale no responde antes de buscar, el servidor dice «Primero marca tu disponibilidad: eres quien no puede faltar.» y no publica: **[visto]** `docs/flujo-usuario.md` §3.6).
4. Dejar T1 en la pantalla del espacio «Los del fútbol» (el código, «Compartir», «Copiar», «Mandar invitación por WhatsApp», y «Personas del espacio» con Ana…Ema «por entrar»).
5. En T2: una **ventana privada nueva** con el enlace `…/#/unirse/<código>` escrito pero sin abrir. Si T2 ya entró a ese grupo antes, la pantalla dice «Este teléfono ya entró como Ana. Sigue para responder o ver el plan.» (plan B: tocar «Sigue para responder»).

**Parte B, en T1 (Tomi):**
6. Portada → «Abrir la demo «Los del asado»» (dice «Probar la demo…» solo la primera vez) → «Herramientas del organizador Simulación» → «Reiniciar demo» → «¿Reiniciar la demo?» → «Sí, reiniciar». **[visto]** (recorrido canónico paso 1; `tests/e2e/recorrido-dos-sesiones.mjs`).
7. «Agente del círculo – Opcional» → «Mis preferencias»: marcar presupuesto, energía, ambiente, dos actividades en «Me gustaría», y las cuatro de la enmienda 10 («Tu zona», «Cómo te movés», «Hasta cuánto viajás», «Momento del día»; p. ej. Ñuñoa, «Tengo auto y puedo llevar gente», «Hasta 45 min», «Da igual») → «Guardar mis preferencias» → «Guardado. Nadie más ve tus preferencias.» En escena solo se muestran las preguntas; no se vuelve a guardar. **[visto]** las cuatro preguntas guardan (agente-ia, 19:40, 13/14, contra la base migrada).
8. Dejar T1 en el espacio «Los del asado», con «Agente del círculo» plegado. En T2: otra ventana privada nueva (sesión nueva) con el enlace del demo escrito, sin abrir. **Solo Luna es reclamable** en el demo; los demás nombres salen «no disponible» (`prompts/contexto-dia-login-agente-social.md`, punto 5).
9. El agente cuesta por llamada: **una llamada en el ensayo y una en el pitch**, no más (`docs/evidencia.md`). Tope de 10 segundos entre llamadas de la misma persona: no tocar dos veces.
10. Grabar el **video de respaldo** del recorrido completo durante el ensayo (no existe todavía; `prompts/contexto-dia-pitch-reglas.md`, punto 15).

## 2. Parte A: grupo nuevo, «convencer a uno» (0:45–1:45)

| Seg. | Aparato | Qué se toca | Qué se dice | Prueba |
|---|---|---|---|---|
| 0:45 | T1 | Nada: mostrar el espacio «Los del fútbol» con Ana…Ema «por entrar» | «Basta convencer a una persona. Vale creó el grupo con los nombres de sus amigos; nadie más tuvo que instalar nada ni crear una cuenta.» | **[visto]** `docs/flujo-usuario.md` §3.1 |
| 0:55 | T1 | «Mandar invitación por WhatsApp» (mostrar el mensaje con el enlace; cerrar sin enviar) | «Les manda este enlace por el grupo de WhatsApp que ya tienen.» | **[leído]** `src/screens/Espacio.tsx:171-175`; texto en `src/lib/compartir.ts` (friccion) |
| 1:00 | T2 | Abrir el enlace → «¿Quién eres?» → tocar «Ana» → «¿Eres Ana?» → «Sí, soy Ana» | «Ana toca el enlace y toca su nombre. Sin contraseña, sin correo.» | **[visto]** 4 toques en producción, `fae49fa`, 20:26–20:28 (`docs/flujo-usuario.md` §3.6); `tests/e2e/toques-invitacion.mjs` = 4 (`docs/qa-noche.md`, 20:02) |
| 1:10 | T2 | «¿Cuándo puedes?» → «Puedo los dos días» → «Respuesta guardada» | «Responde en un toque. Esto lo ve solo el servidor: el grupo no sabe qué eligió. Y responder no es confirmar.» | **[visto]** ídem; `tests/e2e/friccion-flujo.mjs` 19/19 (20:02) |
| 1:18 | T1 | Pestaña «Plan» → «Buscar opción compatible» → aparece la versión 1 (sábado 31) y «Te toca confirmar la versión 1» | «Con las respuestas que hay, el servidor propone una sola opción. Beto, Coni, Diego y Ema no abrieron el enlace: no cuentan. El silencio nunca es asistencia.» | **[visto]** §3.6; `recorrido-dos-sesiones` 23/23 (la misma RPC) |
| 1:28 | T1 | «Confirmar versión 1» → «Ya confirmaste la versión 1» | «Vale confirma esa versión exacta.» | **[visto]** ídem |
| 1:33 | T2 | «Ver el plan» (si no está ya en el plan) → «Confirmar versión 1» → «Grupo confirmado» y «¡Se juntan!» con «Calendario» y «WhatsApp» | «Ana confirma desde su teléfono y el grupo queda confirmado. Recién ahora hay un plan.» | **[visto]** §3.6 (Ana, Beto, Diego y Ema confirmaron en producción); `PlanTab.tsx:628-642` |
| 1:42 | — | — | «Eso es todo lo que le pedimos a un amigo: tocar el enlace, su nombre, cuándo puede y confirmar.» | — |

Notas de la Parte A:
- Si Ana queda en «Respuesta guardada» y la opción tarda en aparecer, el plan se actualiza solo cada 3 segundos (`get_proposal_state`, `docs/flujo-usuario.md` paso 5); no recargar.
- Mínimo 2 es un valor de la demo para cerrar con dos personas en escena; decirlo si preguntan.
- **No decir** que la app avisa sola cuando sale la opción: CRUXE no manda notificaciones (límite declarado, D8). Si preguntan: «La app deja el mensaje listo; lo manda una persona por WhatsApp. Lo dejamos fuera a propósito.» (`RecordarFaltan` está construido y sin conectar, ux-flujo.)

## 3. Parte B: demo «Los del asado», el agente, la baja y el rearmado (1:45–3:55)

| Seg. | Aparato | Qué se toca | Qué se dice | Prueba |
|---|---|---|---|---|
| 1:45 | T1 | «Agente del círculo – Opcional: tus preferencias y una idea de plan» → «Mis preferencias» (mostrar «Tu zona», «Cómo te movés», «Hasta cuánto viajás»; no guardar) | «Cada uno puede decir, en privado, cuánto quiere gastar, si prefiere algo tranquilo, su zona y cómo se mueve. Nadie del grupo ve nada de esto.» | **[visto]** agente-ia 19:40 (13/14); contrato `docs/contrato-enmienda-10.md` |
| 1:58 | T1 | En «Agente del círculo»: «Clima para la demo Simulación» → «Simular sol» → «Que el agente proponga» | «Le pedimos una idea al agente con sol simulado, porque el pronóstico real de este fin de semana es lluvia.» Mientras piensa (3 a 30 s): «El servidor filtra con reglas fijas y la IA solo elige entre opciones válidas y redacta. Nunca ve lo que puso cada uno.» | **[visto]** modelo real 16:50:59 (`docs/evidencia.md`); 3–4 s con Haiku (`docs/agente-ia.md` §8.3). Con Opus (si el coordinador redesplegó) la pantalla avisa «puede tardar hasta medio minuto» **[a verificar]** |
| 2:15 | T1 | Leer «Opciones del agente» («N opciones para N personas»; la «Recomendada por el agente» con su «Por qué») y la línea «Queda a menos de N minutos para todos (estimado).» | «Esta opción le queda a menos de N minutos a todos, incluida la persona que necesita que la lleven. El grupo ve un solo número; nunca quién vive dónde ni quién no tiene auto.» | «Queda a menos de 25 minutos…» **[visto]** agente-ia 19:40 contra la base migrada. En producción, la función v8 deja pasar el `viaje` de cada candidata tal cual viene de la base **[leído]** (`fd89382`: `index.ts:212`, `logica.ts:276`); si la línea no aparece, ver plan B |
| 2:28 | T1 | «Usar esta opción» → «Nueva propuesta» precargada (título y dos franjas del agente; mínimo 4, máximo 6, Tomi no puede faltar) → «Revisar antes de crear» → «Crear y abrir al grupo» | «El agente no crea nada: Tomi decide, revisa el mínimo y abre la propuesta al grupo.» | **[leído]** `NuevaPropuesta.tsx:152-175` (en el demo el formulario parte del caso; el borrador cambia solo título y franjas) |
| 2:40 | T1 | «Mi respuesta» → «Sí puedo» en A y B → «Guardar condiciones» **(recortable: hacerlo mientras se habla)** | «Tomi responde lo suyo, como cualquiera.» | **[visto]** recorrido paso 4 |
| 2:48 | T2 | Abrir el enlace → «¿Quién eres?» → «Luna» → «Sí, soy Luna» → «Puedo los dos días» | «Luna entra con el enlace, igual que Ana.» (Si no hay tiempo, **recortable**: Luna recibe el caso como simulada en el paso siguiente.) | **[visto]** recorrido paso 3 (Luna por enlace, sin pestaña «Simulación», sin conteos de los demás: E7.2) |
| 2:58 | T1 | Pestaña «Simulación» → «Cargar condiciones del caso a las personas simuladas» | «Los demás son simulados y se ve: cada uno responde en privado.» | **[visto]** recorrido paso 4; `SimulacionTab.tsx:11-17` (Luna A y B; Caro solo A; Fede y Sofi solo B) |
| 3:05 | T1 | «Plan» → «Buscar opción compatible» → «Confirmar versión 1» → «Simulación» → «Aceptar versión 1 por …» → «Plan»: «Grupo confirmado» | «Sábado: Tomi, Luna, Mati y Caro. Cuatro, el mínimo. Cada uno confirmó esa versión.» (Mostrar T2: Luna también ve «Grupo confirmado» y puede confirmar la 1.) | **[visto]** recorrido pasos 5 (v1 confirmado en el teléfono de Luna; conteos solo para Tomi) |
| 3:22 | T1 | «Simulación» → «Se baja: Caro» → «Sí, Caro se baja» → «Plan»: **En revisión** | «Caro se baja. Quedan tres: el plan entra en revisión. No se finge que sigue armado y no se baja el mínimo.» Con la enmienda 13 en producción: «El grupo ve que una persona se retiró, sin nombre ni motivo.» **[a verificar]** | **[visto]** recorrido paso 6 («Baja de Caro: En revisión»); E13 (c) corte 01:00, `docs/contrato-enmienda-13.md` |
| 3:35 | T1 | «Buscar alternativa» → «Confirmar versión 2»; mostrar «Nadie confirmó todavía» y «Estas confirmaciones no pasan a la versión 2» | «Domingo, con Fede: versión 2, y empieza de cero. Nadie arrastra una confirmación vieja.» | **[visto]** recorrido paso 6 («v2: empieza de cero») |
| 3:45 | T1 + T2 | «Confirmar versión 2» (Tomi) → «Simulación» → «Aceptar versión 2 por …» → T2: «Confirmar versión 2» → «Grupo confirmado», «Confirmaron 5 (mínimo 4)» | «Vuelven a confirmar y el plan vuelve a estar cerrado. Si Tomi no pudiera, diría ‹Sin opción compatible›, no inventaría una.» | **[visto]** recorrido paso 6 y #56; variantes del jurado 4/4 (`jurado-navegador`, 19:59: mínimo 5 → domingo; anfitrión no puede → «Sin opción compatible») |

Notas de la Parte B:
- La opción que elige el agente puede no ser el asado (con sol hay varias candidatas y el modelo elige). Está bien: el grupo se llama «Los del asado» y el plan es lo que el grupo decida. Leer lo que aparece; no forzar.
- Si el agente propone franjas distintas a las del caso (p. ej. 12:00–15:00), el caso de Simulación carga igual por franja A y B: sábado con Tomi, Luna, Mati y Caro; domingo con Fede y Sofi. **[leído]** (`SimulacionTab.tsx`, `CASO` por clave A/B).
- Los botones «Aceptar versión N por …» llevan los nombres de quienes pueden aceptar; se toca una vez y espera «Confirmaron la versión N: …».
- Solo T1 (organizador) ve «Con condiciones» y «Faltan por responder»; T2 no. Si hay tiempo, decirlo con los dos aparatos a la vista. **[visto]** recorrido (E7.2 con control positivo).

## 4. Plan B (qué hacer si algo falla)

| Falla | Cómo se ve | Qué hacer | Qué se dice | Prueba |
|---|---|---|---|---|
| Se corta la red al cambiar de pantalla | Pantalla en blanco o «Recargar» | Tocar «Reintentar» o «Recargar»; la app reintenta sola la importación una vez (#82) | «Se cortó la red del lugar; la app reintenta.» | **[visto]** `red-import-cortada.mjs` 4/4 y `red-controlada.mjs` 10/10 (`docs/qa-noche.md`, 20:02); no probado con la red del salón |
| Un aparato pierde la sesión | Portada con «Este navegador guarda otra sesión: …» | «Volver a esa sesión» | — | **[visto]** `sesiones-recuperacion.mjs` 12/12 |
| El agente tarda más de 20 s | «El agente sigue pensando: puede tardar hasta medio minuto…» | Seguir hablando (privacidad; las cuatro preguntas). No volver a tocar | «Está pensando; mientras, lo importante: nunca ve a una persona.» | **[leído]** `AgentePanel.tsx:577` |
| El agente falla o tarda demasiado | «El agente no está disponible ahora» / «El agente tardó demasiado» → «Reintentar» | Un reintento. Si falla otra vez: volver al espacio → «Crear propuesta» (precargada con el caso: «Asado en casa de Tomi», sábado 31 y domingo 1 a las 14:00) → «Revisar antes de crear» → «Crear y abrir al grupo», y seguir desde el paso 2:40 | «El agente es opcional: el plan se cierra igual.» | **[visto]** la caída a texto fijo existe (`docs/evidencia.md`); el camino manual es el recorrido canónico 23/23 |
| Sale «Recomendada» sin «por el agente», o dice «Texto fijo» | Sin clave o el modelo no respondió | Seguir igual | «Esta vez redactó el servidor con reglas fijas; la IA es opcional.» | **[visto]** `docs/evidencia.md` (regla y texto fijo) |
| No aparece «Queda a menos de N minutos» | La función de producción no manda el `viaje` | Saltar la frase del viaje; decir la de las preferencias privadas | «La zona y cómo se mueve cada uno ya se guardan en privado; el número de minutos entra en la próxima versión de la función.» | función con E10 sin desplegar a las 20:25 (TABLERO) **[a verificar 10:30]** |
| T2 no puede reclamar a Luna («no disponible») | Alguien ya la reclamó en ese demo | «Reiniciar demo» no libera un lugar reclamado: usar un segundo aparato con sesión nueva, o seguir con un solo aparato: Luna recibe el caso como simulada | «Luna hoy es simulada.» | **[leído]** `SimulacionTab.tsx` `CASO`; **[a verificar]** en el ensayo |
| Sin red del todo | Nada carga | Video de respaldo (grabar en el ensayo) | «Esto es la grabación del ensayo de esta mañana.» | No existe todavía: tarea de Nico |

## 5. Lo que este guion no promete
- Que el agente invite o publique solo (la enmienda 11 está en la base, 0041, pero la interfaz no está conectada).
- «Así no puedo, pero sigo» y «Rearmar con lo nuevo» (enmienda 13 a y b): solo si entran antes de la 01:00 y front-juan conecta el botón; si no, se dicen como siguiente paso en las preguntas (`docs/preguntas-jurado.md`, S3).
- Notificaciones o avisos automáticos (límite declarado, D8), reservas, pagos, calendario compartido, chat.

## 6. Pedidos que salen de este guion
- **agente-ia (dueño de `docs/pitch.md`):** adoptar el reparto de §0 (problema 0:45, demo en dos partes hasta 3:55) o proponer otro; el guion de 2:30 del bloque del agente queda cubierto por la Parte B.
- **front-juan:** `atajosParaGrupo` en `NuevaPropuesta.tsx:47` (pedido del 19:41) para que un grupo «Los del fútbol» vea «Fútbol» primero.
- **coordinador:** redesplegar la función del agente con la enmienda 10 (si no, aplica el plan B del viaje) y confirmar en el «Estado verificado» de las 10:30 cada **[a verificar]** de arriba.
- **Nico:** ensayo con cronómetro entre 10:00 y 11:00 en los dos aparatos, con una sola llamada al agente; grabar el video de respaldo en ese ensayo; decidir si la Parte B lleva T2 (Luna) o un solo aparato.
