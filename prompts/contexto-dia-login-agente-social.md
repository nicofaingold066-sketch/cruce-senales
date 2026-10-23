# Contexto del viernes 23 oct: login, "¿Quién eres?" y agente social

Fuente: transcripciones de cuatro sesiones de Claude Desktop, leídas a las 19:26 (reloj, UTC-3, igual que "Santiago"). Las horas de abajo son del reloj local. Un mensaje de otra sesión (Coordinador, agente-ia) NO es Nico: aquí se marca como "Coordinador dijo".
Nombres propios permitidos: Nico (usuario), Juan Morales (socio, front-juan y su sesión Codex), Marcos (dueño de la sesión abierta en esta compu: no usarla, ni `gh` ni el conector de Vercel).

## 0. Ojo con los nombres (se confunden)
- "Integración agente social CRUCE" (sesión Claude, 16:25-16:57): probó el agente que YA existe. No construyó nada nuevo.
- "Agente social Cruce: módulo Supabase" (sesión Claude, 17:28-17:30): solo escribió un reparto y un contrato PROPUESTO en `PROPIEDAD.md`.
- "Agente social Codex" (sesión `01a16a31-3df5-7220-92d7-d0c8545c403b`, de Juan, ficha `agentes/agente-social-codex.md`): es otra sesión, no se leyó aquí. Es la que tendría el módulo `supabase/functions/agente/social/`. Hoy no hay código suyo en el repo.
- "Enmienda 10" tiene DOS significados. La real y aprobada por Nico (19:11) es zona, movilidad, tiempo máximo y momento del día (sin RPC nuevas, 31/0, `docs/contrato-enmienda-10.md`). El contrato social de `PROPIEDAD.md` dice "enmienda nueva (10)" por error de numeración: no está aprobado ni asignado.

---
## SESIÓN 1: "Login" (`local_b9838e7f-6d20-4f53-8477-9de03a3a96a8`)

### 1. Qué es y estado
- Sesión login (Opus), creada 16:39, última actividad 17:38. Nombre de sesión del prompt: `login`. Hace la ENTRADA de CRUXE (pantalla de entrada, "¿Quién eres?", splash).
- Rama `wip/login`, último commit `a381a0c` (splash fuera de la invitación). Ya está en `origin/main` (y `82e544d` publicó la enmienda 9 a las 17:34). Fichas: `agentes/login.md` ("Tocando ahora" vacío).
- Copias de trabajo: `/Users/macair/cruse/cruce-login` (código) y `/Users/macair/cruse/cruce-coord-login` (coordinación). Queda un vigía de fondo (`vigia.sh login 60`).
- Esta noche `src/login/**` pasó a la sesión friccion.

### 2. Decisiones de Nico (mensajes suyos)
- 16:39 escribió solo "login". El Coordinador mandó después el prompt completo "por pedido de Nico" (eso lo dijo el Coordinador, no Nico).
- 16:51 (mid-turn): "y como venis aca" (preguntó cómo iba; se respondió con el resumen del corte 1).
- 16:52: "fijate como maneja tricount el ingreso que primero se crea un grupo con los integrantes y despues cuando iniicias te pregunta quien eres y esa sesion queda asociada a esa persona armemos el login igual al de tricount".
- 16:54 (botón del recap, en inglés): pidió mandar al coordinador el pedido estilo Tricount con tres cambios de backend y construir la pantalla en `src/login` contra lo que aprobaran.
- 17:11: "dale" (seguir esperando la base y probar).
- Nada más de Nico en esta sesión.
- Dijo el Coordinador (no Nico): "Nico decidió integrar ya el rediseño de Juan" (17:02, congeló `src/` hasta 17:19); una sola puerta de entrada, la portada de Juan; `#/entrar` queda desconectada.
- Propuso Claude (no Nico): texto "Sigues como…" en vez de "Seguís"; rótulo "no disponible" en vez de "ya entró".

### 3. Qué se construyó
- Corte 1 (`cd4d885`, 16:50): `src/login/Entrar.tsx` + `login.css`, ruta `entrar`, redirección de primera visita. Hoy desconectada.
- Enmienda 9 fase 1 (`a7ab1a9`, rebasada luego): `#/unirse/<código>` muestra "¿Quién eres?" con los nombres del grupo; tocar un nombre pide confirmar ("¿Eres Luna?", "Este teléfono queda como Luna"); abajo siempre el formulario clásico ("Unirme con un código", "Tu nombre en el espacio", "Unirme", "No estoy en la lista").
- Fase 2 + rediseño (`b13ba4b`, 17:27, publicado en main 82e544d 17:34): `src/login/QuienEres.tsx`, `Integrantes.tsx`, `fuente.ts`, `estado.ts`, banco `src/login/prueba/`; en `src/lib/api.ts` solo `previewSpaceByCode`, `p_miembro_id` en `joinSpace`, `p_integrantes` en `createSpace`; en `src/screens/CrearGrupo.tsx` el campo de integrantes (excepción autorizada); `src/App.tsx` apunta `unirse` a `QuienEres`.
- Splash (`a381a0c`, 17:39): `useEntrada(ruta.nombre === 'inicio')` en `src/App.tsx`. Quien abre una invitación no ve la animación (2,9 s) encima de "¿Quién eres?". La portada la sigue mostrando.
- Pruebas (todas contra su build y la base real, base libre): `red-controlada` 10/10, `recorrido-dos-sesiones` 23/23, `jurado-navegador` 4/4 (172 RPC, privacidad sin hallazgos). Propia con 3 sesiones a 320/375 px: crear grupo con Ana y Beto, Ana elige su nombre y entra, para otra sesión Ana queda "no disponible" y Beto libre. Producción (Coordinador): dos sesiones 23/23.
- Tocó fuera de su carpeta `/Users/macair/cruse/.claude/launch.json` (agregó `login-preview` y `login-dev`).
- A medias: nada obligatorio. Sin hacer: #80 (teclado y lector en "¿Quién eres?"), ver ideas.

### 4. Diseño y contratos
- Identidad: NO hay contraseñas, correos ni teléfonos. Identidad = sesión anónima de Supabase que el navegador guarda + nombre visible ficticio dentro de cada espacio.
- Flujo estilo Tricount: el organizador crea el grupo con su nombre y los integrantes (hasta 12, solo nombres); comparte enlace/código; quien abre el enlace ve la lista y toca su nombre; esa sesión queda ligada a ese miembro (también al recargar). "Entrar como otra persona" cambia de sesión.
- Enmienda 9 (`docs/contrato-enmienda-9.md`; migraciones 0032, 0033, 0034):
  - `preview_space_by_code(p_codigo)`: sin ser miembro; devuelve solo `espacio {nombre, demo}` y `miembros [{miembro_id, nombre, libre}]`. Excepción declarada a E7.3: con el código se ven los nombres (ficticios).
  - `join_space(p_codigo, p_nombre_visible, p_miembro_id)`: con `p_miembro_id` reclama ese lugar y el nombre visible se ignora (mandar `""`). Errores: `miembro_inexistente`, `miembro_ya_reclamado`, `asiento_en_uso`; si ya era miembro, `ya_era_miembro` y no cambia de persona. Dos reclamos a la vez: uno gana.
  - `create_space(..., p_integrantes text[])`: crea miembros "pendientes" (sin sesión, sin condiciones). Nunca cuentan como interés, aceptación, cupo ni quórum. `get_space` los marca `pendiente: true` (la UI muestra "por entrar", #73 ya publicado).
  - `libre = true` solo para simulados del demo SIN actividad y pendientes sin reclamar.
- Una sola puerta: la portada nueva de Juan. `#/entrar` sigue desconectada; no reactivarla.
- Rótulos que buscan los guiones: "Probar la demo «Los del asado»", "Tu nombre en el espacio", "Unirme", "No estoy en la lista". Ningún título de "¿Quién eres?" puede contener el nombre del espacio (los guiones lo usan para saber que alguien entró): el h1 es "¿Quién eres?" y el nombre va debajo como texto.
- Hora: siempre `TZ=America/Santiago date`. Tope de 500 sesiones anónimas por hora: reusar sesiones en pruebas.

### 5. Ideas y descartes
- Pendientes (en `agentes/login.md`): rotular "por entrar" y poder reenviar la invitación a quien falta (hecho el rótulo; falta reenviar, ver #89 de ux-flujo); que la portada exporte `UnirsePorCodigo` para no mantener dos formularios; enlace "¿Qué guarda CRUXE de mí?" para el pitch de privacidad; #80 accesibilidad de "¿Quién eres?".
- Descartado: `#/entrar` como puerta aparte (dos puertas distintas no conviven con el "Ingreso con nombre" de Juan); registro/contraseña/correo (las bases lo prohíben); que el demo muestre la lista llena (cambiar la regla vieja en backend; el Coordinador dijo que así es honesto).

### 6. Riesgos y preguntas abiertas
- En el demo "Los del asado" solo Luna se puede elegir; Mati, Caro, Fede y Sofi vienen con preferencias simuladas y salen "no disponible". La lista se luce solo con un grupo creado de cero.
- Un comentario de `src/components/Intro.tsx` aún dice que la animación sale también en la invitación (es de Juan/claude-b).
- La portada hace una lectura extra de `list_my_spaces` por carga hasta ver espacios. Si falla, se muestra la portada normal.
- Primera corrida de `recorrido-dos-sesiones` dio 22/23 por el título con el nombre del espacio (ya corregido).

---
## SESIÓN 2: "Login" fork, login-fork (`local_a49de502-c871-469c-9463-aa8ef309b7b5`)

1. Fork de la sesión 1 creado a las 16:58:58. Su última actividad es 1 segundo después (16:58:59, "No response requested" y un aviso de que el vigía de fondo quedó parado). Sin rama ni commit propios.
2. Decisiones de Nico: ninguna propia. Hereda los mismos mensajes de Nico de la sesión 1 hasta las 16:58 (16:39, 16:51, 16:52, 16:54).
3. Qué se construyó: nada propio. Hereda hasta el commit `0efdf18` (pantalla "¿Quién eres?" sin enganchar, ya rebasada). Todo lo posterior está solo en la sesión 1.
4 a 6. No hay diseño, ideas ni riesgos propios. Usá la sesión 1 como fuente única.

---
## SESIÓN 3: "Integración agente social CRUCE" (`local_fa9a91e7-f6af-4236-97ef-80036e943652`)

### 1. Qué es y estado
- Sesión (Fable 5.1, medium), 16:25-16:57. Pedido de Nico: revisar el backend, coordinar y probar de punta a punta el agente social ("integrar el agente social"). Terminó todo verificado; el Coordinador dijo "no hay más tareas" (16:57). Ofreció probar la enmienda 9 punta a punta, pero la sesión login ya lo hizo.
- Sin rama ni commits de código. Entregables fuera del repo: `/Users/macair/cruse/notas/coordinacion-agente-social.md` (65 líneas, resumen y resultados) y scripts en su scratchpad (`recorrido-agente.mjs`, `prueba-modelo.mjs`, `prueba-optout.mjs`).
- Tableros: #65 (recorrido) y #64/#62 (Gateway y opt-out) figuran verificados en `MEJORAS.md`.

### 2. Decisiones de Nico (mensajes suyos)
- 16:25: pidió integrar el agente social SIN segundo agente ni endpoints/tablas duplicados; coordinar con el backend; autorización y cupos en el servidor, no en el modelo; datos ficticios; probar propuesta, invitación visible, aceptación, baja y alternativa con casos de acceso ajeno, opt-out, cupo lleno y reintentos; "Tenemos que mostrar algo corriendo". Su mensaje quedó cortado ("Pero en esa no, esa no es un…"); la sesión lo notó y no se aclaró.
- 16:28 (botón del recap): "Sí, pasá la función del agente a Vercel AI Gateway (lo hace agente-ia; la clave la pongo yo)".
- 16:42: "hagamos la integracion con supabe" / "asupabase"; 16:43: "en l navegador de claude".
- 16:44: "de donde saco el value". 16:45: "ahi quedo". 16:45: "esta bien". Con eso cargó él el secreto `AI_GATEWAY_API_KEY` (el valor jamás pasó por el chat ni por Claude).
- 16:47: "ahi le cargue plata cmo hacemos para probarlo" (puso crédito en Vercel AI Gateway).
- 16:53 (botón): "Sí, probá el opt-out del agente contra la base (enmienda 8, migración 0031)".
- Dijo el Coordinador (no Nico): aprobó el opt-out como enmienda 8 (veto posible de Nico); autorizó el recorrido con tope de 15 sesiones anónimas.
- Propuso Claude (no Nico): columna/clave `usar_en_agente`; dejar fuera la "localidad por espacio"; poner un tope de gasto en el Gateway antes de la demo (no se sabe si se puso).

### 3. Qué se construyó
- Recorrido real contra la base (datos ficticios, solo clave pública, sin mocks): 16:31:14, 16:31:35 y 16:34:46-16:34:58. Última corrida 23/24; la fallida era una expectativa errónea del script (Luna no organiza, el agente es solo del organizador). Cubre: sin sesión, sesión ajena (`no_miembro` en 5 operaciones), publicar sin ser organizador (`no_es_organizador`), invitación visible (`te_toca_aceptar`), 4 aceptaciones = grupo confirmado, baja de Caro = `en_revision`, v2 con cero aceptaciones heredadas, aceptar v1 vieja falla, cupo 2/2 da `cupo_completo`, reintentos concurrentes sin duplicados.
- Gateway en vivo: función `agente` v8 desplegada por el Coordinador desde `fd89382` (16:50). Llamadas 16:51:54 (sol, 3116 ms, 3 candidatas) y 16:52:09 (lluvia, 3806 ms, 1 candidata): `eleccion_fuente=modelo` y `explicacion_fuente=modelo`. Sin nombres ni datos privados en el texto.
- Opt-out (migración 0031, publicada en main 61c5228): 17/17 el 16:54:16-16:54:20 con 2 sesiones. Casilla en UI: #72, entregada por agente-ia (`5ab6cc4`).
- A medias / sin ver: los registros de la función en Supabase (no tuvo acceso); el límite de una llamada por persona cada 10 s (las dos llamadas distaron 15 s); no se midió.

### 4. Diseño y contratos (el agente que EXISTE)
- Función `supabase/functions/agente` (dueño: agente-ia). POST con `Authorization: Bearer <JWT del usuario>`. Cuerpo: `{espacio_id, sabado, clima_simulado?}` (`sabado` obligatorio: un sábado futuro a ≤16 días; si no, `entrada_incompleta/fecha_invalida`). `clima_simulado` solo vale en espacios demo.
- Respuesta en sobre: `{ok, contrato:2, resultado:{tipo:'borrador', candidatas (hasta 3), elegida, explicacion, mensaje_al_grupo, eleccion_fuente: regla|modelo, explicacion_fuente: texto_fijo|modelo, clima{fuente}, perfil_grupo}}`.
- Errores van en el sobre con HTTP 200 (por diseño, el Coordinador lo verificó): sin Authorization = `sesion_invalida/sin_sesion`; con token falso la plataforma da 401. Las docs nunca prometieron 401.
- Solo el ORGANIZADOR del espacio puede pedir el borrador (`no_autorizado/no_es_organizador_espacio`); un ajeno recibe `fuera_de_audiencia/no_miembro`.
- El agente NUNCA crea, invita ni confirma. El organizador elige un borrador y crea la propuesta (`create_proposal`, `evaluate_and_publish`). La "invitación" es que la propuesta sea visible a los miembros; cada elegible ve `te_toca_aceptar`. Cada persona acepta cada versión (`accept_version`); `propose_repair` publica v2 con cero aceptaciones heredadas.
- Idempotencia: `p_intento_id` por acción del usuario, generado UNA vez y reusado en reintentos; `repetido` devuelve la respuesta original.
- Modelo: Vercel AI Gateway (`https://ai-gateway.vercel.sh`), por defecto `anthropic/claude-haiku-5.5`, 8 s, tope 1500 tokens, una llamada por persona cada 10 s; si no hay clave, falla o responde fuera de las opciones, vuelve a regla fija + texto fijo. Modelo cambiable con el secreto `AGENTE_MODELO`. Al modelo solo le llegan opciones validadas, clima y totales agregados.
- Opt-out (enmienda 8): `usar_en_agente` (default true) a nivel raíz de `get_my_preferences`/`save_my_preferences`; dentro de `p_preferencias` solo en la entrada de `save`. Quien lo apaga produce un plan idéntico a quien nunca guardó; nadie puede distinguirlo.
- Clima real: Open-Meteo, centro de Santiago fijo (no hay localidad por espacio). Opt-in actual: implícito (ser miembro + guardar preferencias).
- Secretos del proyecto: el único cargado es `AI_GATEWAY_API_KEY` (`ANTHROPIC_API_KEY` nunca existió). Nadie imprime ni pega claves.

### 5. Ideas y descartes
- Descartado: construir un segundo agente, endpoint o tabla ("localidad por espacio" quedó fuera del corte; hoy la enmienda 10 trae zona por persona).
- Descartado: forzar 401 sin sesión (era un aviso viejo, sin defecto).
- Pendiente de baja prioridad: medir el límite de 10 s; mirar los registros de la función ("respuesta del modelo descartada", "el modelo no respondió gateway … 400" no deben aparecer).

### 6. Riesgos y preguntas abiertas
- Reglas de convivencia con la base compartida: nadie corre pruebas mientras la ficha de backend diga "MIGRACION EN CURSO" o "PRUEBA DE CARGA EN CURSO", ni mientras agente-ia diga "CORRIENDO PRUEBA". Se avisa con hora exacta (pasó una vez un cruce de orden, sin daño).
- Gasto en el Gateway: no hay evidencia de un tope puesto. Preguntar a Nico.
- Juan pidió (vía Codex) Opus 5.5 con respaldo a otro proveedor; hoy el principal es Haiku 5.5 y no hay cadena de respaldo. Sin resolver (agente-ia/Coordinador).
- La sesión `01a16a31…` "no existe" en esta compu como sesión Claude: es la Codex de Juan.

---
## SESIÓN 4: "Agente social Cruce: módulo Supabase" (`local_6c9cff5e-98e3-45ec-bedd-71227f62d7d7`)

### 1. Qué es y estado
- Sesión (Opus, medium), 17:28-17:30. Tarea corta: dejar por escrito el reparto del "agente social" y un contrato PROPUESTO.
- Quedó en `origin/coordinacion` con el commit `0fbdd67` ("Coordinador: reparto del agente social…"), solo `PROPIEDAD.md` (sección "Agente social", líneas ~66-105 y una fila nueva del mapa). Sin código, sin migración, sin despliegue.

### 2. Decisiones de Nico (mensajes suyos)
- 17:28: pegó un bloque («pasted_content») pidiendo confirmar en `PROPIEDAD.md` este reparto: el módulo `supabase/functions/agente/social/` (solo `contratos.ts`, `orquestador.ts`, `orquestador.test.ts`) es de la sesión «Integrar agente social Cruce» (`01a16a31…`) en rama local propia, sin otra función HTTP ni otro proveedor; backend conserva migraciones y define contexto/candidatos autorizados, permiso para recibir invitaciones, aprobación o política persistida, publicación atómica y registro idempotente de ejecuciones; agente-ia conserva handler, AI Gateway e interfaz y conecta el módulo. Acordar nombres, parámetros, respuestas y errores ANTES de integrar. "El permiso para usar preferencias no equivale a permiso para enviar invitaciones: cada persona sigue aceptando cada versión del plan". Por ahora cambios locales, sin push, despliegue ni claves nuevas.
- 17:30: "Hacé commit y push de PROPIEDAD.md a coordinacion." (hecho).

### 3. Qué se construyó
- Solo `PROPIEDAD.md` (fila nueva del mapa de dueños + sección "Agente social"). Rama del módulo TS: `wip/agente-social` (local, no existe todavía).
- Nada del contrato existe en SQL ni en TS.

### 4. Diseño y contratos PROPUESTOS (no aprobados)
- Estado oficial del texto: "contrato PROPUESTO, no integrar hasta acordarlo". Backend no escribe migración y agente-ia no conecta nada hasta que backend, agente-ia, agente-social y el Coordinador lo acuerden.
- Orquestador (agente-social): `orquestarAgenteSocial(entrada {espacioId, sabado, clima, ejecucionId, oportunidad}, puertos {backend, modelo})` → `{estado: borrador | publicada | sin_plan | necesita_aprobacion | error, ejecucion, borrador?, propuesta?, error?}`. Función pura, sin `Deno.serve`, sin cliente Supabase propio, sin SDK ni claves. Si el modelo devuelve algo fuera de las opciones o texto inválido, usa `mensajeFijo`. Pruebas solo con mocks.
- Nueve funciones SQL propuestas (todas en sobre `{ok, error:{codigo, detalle}}`; las que escriben llevan `p_intento_id` y `cruce.intento_previo`):
  - `agente_social_contexto(p_espacio_id)`: localidad, zona horaria, política, conteos de personas autorizadas y destinatarios.
  - `agente_social_candidatos(p_espacio_id, p_sabado, p_clima)`: `opciones[]` con `opcion_ref` opaca (reusa el motor de `proponer_plan_borrador` + opt-out).
  - `set_recibir_invitaciones_agente(p_espacio_id, p_recibir)`: opt-in aparte, apagado por defecto, revocable; cada persona solo lo suyo.
  - `set_politica_agente_social(p_espacio_id, p_modo, p_intento_id)`: `aprobacion` (default) o `autonoma`.
  - `iniciar_ejecucion_agente`: única por (espacio, oportunidad como `sabado:2026-10-24`); un segundo id devuelve la existente.
  - `guardar_borrador_agente`, `aprobar_borrador_agente` (aprueba el hash exacto, lo hace una persona desde la UI), `publicar_borrador_agente` (una sola transacción: revalida política, opt-ins y aprobación; crea y abre la propuesta; invita solo a quien activó invitaciones), `cerrar_ejecucion_agente`.
- Errores nuevos propuestos (a confirmar): `no_autorizado/sin_aprobacion`, `opcion_desactualizada/borrador_cambiado`, `opcion_desactualizada/opcion_vencida`, `sin_alternativa/sin_destinatarios`, `entrada_incompleta/politica_invalida`. Ningún mensaje explica la restricción u opt-out de otra persona.
- Reglas que no se negocian: `usar_en_agente` NO es permiso para recibir invitaciones; una invitación no es una aceptación (ni el modelo ni el orquestador llaman `accept_version`, ni se heredan aceptaciones); el modelo solo elige y redacta entre opciones validadas y no recibe nombres ni condiciones.

### 5. Ideas y descartes
- Idea de la ficha Codex: adapter temporal sobre RPC existentes y pruebas de integración en rutas disjuntas; runners vivos de E8 (ya corridos 7/7, 22 RPC). No se asignó nada.
- Descartado explícito: segundo agente, otra función HTTP, otro proveedor de modelos, otro runner.

### 6. Riesgos y preguntas abiertas
- COLISIÓN DE NÚMERO: el contrato dice "enmienda 10" pero la enmienda 10 real es otra (zona/movilidad, 0035/0036, corte 23:00, backend). Las 9 funciones nuevas romperían la lista permitida 31/0 de E10. El Coordinador no la aprobó ni la puso en `MEJORAS.md`.
- Nadie tiene la tarea asignada ni plazo. Sábado 12:00 no hay migraciones. Es una brecha respecto del encargo de Juan: invitaciones dirigidas, política/aprobación persistida, publicación atómica y recibos de ejecución no existen.
- La ficha Codex dice que hoy NO hay "contrato de invitaciones dirigidas" y que el agente actual no descubre personas por disponibilidad.
- Pregunta abierta para Nico/Coordinador: ¿se hace algo de esto antes del sábado 13:00 o queda como "siguiente paso" del README?

---
## LO QUE EL EQUIPO DE LA NOCHE TIENE QUE SABER SÍ O SÍ

1. [friccion, ux-flujo] La entrada: sin contraseñas, correos ni teléfonos. Sesión anónima + nombre ficticio. Una sola puerta: la portada de Juan. `#/entrar` está desconectada; no la reactives. El organizador crea el grupo con nombres y manda el enlace; los demás tocan su nombre.
2. [friccion, qa-noche] No rompas los rótulos de los guiones: "Probar la demo «Los del asado»", "Tu nombre en el espacio", "Unirme", "No estoy en la lista", "Unirme con un código", "Volver a esa sesión". Ningún título de "¿Quién eres?" puede contener el nombre del espacio. Si cambiás uno, pedíselo a qa-noche.
3. [qa-noche] Línea base verde para comparar: `red-controlada` 10/10, `recorrido-dos-sesiones` 23/23, `jurado-navegador` 4/4 (172 RPC, privacidad sin hallazgos). Tope de 500 sesiones anónimas/hora y 15 por prueba: reusá sesiones.
4. [backend, qa-noche] Enmienda 9 ya está aplicada (0032, 0033, 0034): `preview_space_by_code`, `join_space(p_miembro_id)`, `create_space(p_integrantes)`, pendientes con `pendiente: true` que nunca cuentan. Errores: `miembro_inexistente`, `miembro_ya_reclamado`, `asiento_en_uso`. Cualquier migración nueva debe mantener el catálogo 31/0.
5. [ux-flujo, friccion, qa-noche] En el demo "Los del asado" solo Luna es reclamable (los demás traen preferencias simuladas: "no disponible"). Para medir toques y mostrar "¿Quién eres?" usá un grupo creado de cero (organizador + Ana/Beto).
6. [friccion] `src/App.tsx` es tuyo esta noche. El splash ya sale solo en la portada (`useEntrada(ruta.nombre === 'inicio')`, `a381a0c`); no vuelvas a ponerlo en `unirse`. Pendientes de login útiles para #88: entrar directo a responder tras "¿Quién eres?", #80 (teclado/lector), exportar `UnirsePorCodigo`, enlace "¿Qué guarda CRUXE de mí?".
7. [ux-flujo] Lo que falta de la entrada: reenviar la invitación a quien está "por entrar" (el rótulo ya está, #73). Encaja con tu #89 "Recordar a quien falta". Documentá en `docs/flujo-usuario.md` que "invitar" = compartir código o enlace; no hay invitación por persona.
8. [backend, ux-flujo, apertura] El agente existente NO crea, invita ni confirma: propone un borrador al organizador; la propuesta es la invitación; cada persona acepta cada versión; `propose_repair` da v2 con cero aceptaciones heredadas. No contradigas esto en textos, flujos ni catálogo.
9. [backend, qa-noche] Contrato de la función `agente`: POST con JWT, cuerpo `{espacio_id, sabado, clima_simulado?}` (`sabado` = sábado futuro a ≤16 días), solo organizador, errores en el sobre con HTTP 200 (token falso = 401 de la plataforma), borrador de hasta 3 candidatas. Una llamada por persona cada 10 s; Gateway `anthropic/claude-haiku-5.5`, 8 s, 1500 tokens; si falla, regla fija + texto fijo.
10. [backend, qa-noche, apertura] Opt-out (E8): `usar_en_agente` default true, a nivel raíz de get/save; quien lo apaga no es distinguible de quien nunca guardó. Toda actividad o regla nueva (E10, catálogo ampliado) debe respetarlo y no filtrar quién tiene apagado qué.
11. [backend] NO construyas el "agente social" con las 9 funciones (`agente_social_*`, ejecuciones, aprobación por hash) salvo orden explícita del Coordinador. Su contrato en `PROPIEDAD.md` es solo una PROPUESTA, mal numerada como "enmienda 10", y no encaja con el 31/0 de la E10 real. Prioridad de backend: E10 Parte A, Parte B, #93, #81, con corte 23:00.
12. [qa-noche, backend] Base compartida: no corras suites ni e2e mientras una ficha diga "MIGRACION EN CURSO", "PRUEBA DE CARGA EN CURSO" o "CORRIENDO PRUEBA". No borres datos de prueba. Solo el proyecto Supabase del equipo; nunca el otro. Sin `gh` ni conector de Vercel (son de Marcos).
13. [qa-noche, backend] No llames al modelo salvo lo imprescindible: el Gateway cobra a Nico (puso crédito 16:47) y no se sabe si hay tope. Ya hay evidencia en vivo (16:50-16:52) y 7/7 + 17/17 de opt-out; no repitas esas pruebas sin motivo. Pendiente sin medir: el límite de 10 s.
14. [todas] Datos siempre ficticios; nunca claves, tokens ni valores de variables de entorno en repo, capturas, logs o mensajes (el único secreto cargado es `AI_GATEWAY_API_KEY`, lo puso Nico). Hora siempre con `TZ=America/Santiago date`. Solo vos escribís en tus rutas; los pedidos van en "## Pedidos a otros".
