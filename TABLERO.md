# Tablero (lo edita solo el coordinador)

Actualizado: viernes 23 oct, 11:03 Santiago (reloj).


## AVISOS DEL COORDINADOR (leer primero; el más nuevo arriba)
Cada aviso lleva destinatario y hora. Un agente solo actúa sobre los avisos dirigidos a él o a "todos". Si un aviso te pide algo fuera de tus rutas de `PROPIEDAD.md`, no lo hagas y respondé en "Pedidos" de tu archivo.

**[12:29] PARA todos: NOMBRE = CRUXE (confirmado por Nico al coordinador).** Ya aplicado en index.html (título, ícono, color), README, AGENTS.md y docs, y desplegado en https://cruce-senales.vercel.app. Lo interno NO cambia: esquema `cruce`, repo `cruce-senales`, URL de Vercel y nombres de ramas. `main` = `4477919` con la interfaz de Claude B (CRUXE + UX móvil) y la enmienda 3 integradas.

**[12:28] PARA claude-b-interfaz:** enmienda 3 LISTA en la base real (migración 0012, 27 pruebas del backend pasan): `siguiente_accion` personal con códigos cerrados (lista al final de `docs/contrato-enmienda-3.md`) y `simulate_load_case(p_propuesta_id, p_intento_id)` atómico, que devuelve `cargados` y `omitidos` con motivo. Ya podés usarlos: el atajo de la simulación debe llamar a `simulate_load_case` (una sola llamada). Traé `origin/wip/fundamentos` a tu rama.

**[12:23] PARA claude-b-interfaz:** tus ideas de backend: aprobadas 1 (siguiente_accion personal), 2 (códigos cerrados) y 3 (simulate_load_case atómico); 5 se aclara: la reparación hereda el plazo de la propuesta. Postergado 4 (sondeo liviano). Está en `docs/contrato-enmienda-3.md` y el backend ya lo está implementando: cuando esté te aviso; mientras tanto podés preparar la UI para leer `siguiente_accion.codigo` (con el texto actual como respaldo) y para llamar a `simulate_load_case` en el atajo cuando exista. El cambio de nombre a CRUXE lo decide Nico: no lo apliques fuera de `src/` hasta que confirme.

**[12:04] PARA claude-b-interfaz:** gracias, coincide con mi prueba en la versión publicada. La variante 'sin alternativa tras la baja' no hace falta: la cubren las pruebas del backend. Ahora que tenés red, prioridad única: UX/UI de la demo en teléfono (320 a 430 px): que cada paso del recorrido se entienda a la primera, botones grandes, estados claros (En revisión, Versión 2, Sin opción). Probá en vivo y empujá a `wip/ui-enmienda` con typecheck y build en verde; yo integro y despliego.

**[12:02] PARA todos:** (1) Nico confirmó que los nombres de la demo (Tomi, Luna, Mati, Caro, Fede, Sofi) son inventados. (2) El pitch es MAÑANA: hoy nadie trabaja en el pitch. (3) Recorrido completo verificado EN LA INTERFAZ por el coordinador con dos sesiones reales: demo, reclamo de Luna, propuesta, condiciones privadas, opción v1, grupo confirmado, baja de Caro, En revisión, versión 2 con cero heredadas, grupo confirmado v2. Falta en la interfaz: rama sin opción compatible.

**[11:51] PARA todos: DECISIÓN DE NICO Y JUAN — SOLO LO SOCIAL.** El producto es solo para amigos (caso 06, "Los del asado"). Lo empresarial queda FUERA a propósito: no se construye, no se muestra y no se menciona como funcionalidad. No toquen nada de "Empresa". El despliegue vive en el Vercel personal de Nico: https://cruce-senales.vercel.app. Prioridad única: que el recorrido social completo (propuesta, condiciones privadas, opción, confirmar, baja, reparación) funcione en vivo en dos teléfonos.

**[11:46] PARA claude-b-interfaz: URGENTE, ATRIBUCIÓN (regla de las bases).** Tus commits salen como "Claude <noreply@anthropic.com>" y las bases exigen que el historial muestre qué integrante hizo qué. ANTES de tu próximo commit, en tu copia del código y en tu `../cruce-coord`, corré: `git config user.name "Nico Faingold"` y `git config user.email "296561131+nicofaingold066-sketch@users.noreply.github.com"` (sos la sesión de Nico). No reescribas lo ya hecho: lo declaramos en el README. Además: la app está desplegada en https://cruce-senales.vercel.app y `main` ya tiene la integración con tu interfaz.

**[11:28] PARA codex:** tu copia `../codex-work` ya tiene todo lo nuevo (merge de `wip/fundamentos` en `codex/revisiones`): pruebas del backend (23 pasan), verificación independiente `tests/verificacion-altas/` (75 pasan), `docs/correcciones-altas-1.md`, decisiones O1/O2/A2 en la enmienda 2 y la interfaz de Claude B integrada. Recibí tu `revision-codex-3.md`. Siguiente tarea: `docs/revision-codex-4-ui.md` (revisión solo lectura de `src/`, ver aviso de tareas). Si encontrás algo que contradiga `correcciones-altas-1.md`, ponelo primero.

**[11:21] PARA claude-b-interfaz: BLOQUEO DE RED Y NUEVO PLAN.** Recibido tu bloqueo (proxy 403 a Supabase). Nico va a habilitar el dominio en la red de tu entorno; hasta entonces NO esperes: yo (coordinador) integré tu rama en `wip/fundamentos` (commit `749b1a9`, typecheck y build pasan) y voy a probar el recorrido EN VIVO desde la computadora A, desde donde sí hay red. Mientras tanto hacé lo que no necesita red, en `src/` y empujando a `wip/ui-enmienda`: (1) uso en teléfono (320 a 430 px de ancho): nada cortado, botones tocables, texto legible; (2) estados de carga, vacío, error y sin conexión en TODAS las pantallas; (3) accesibilidad básica: foco visible, botones con texto, contraste; (4) que el recorrido de la demo tenga los textos del caso canónico (Tomi, Luna, Mati, Caro, Fede, Sofi; franjas A y B de 14:00 a 17:00; zona America/Santiago). Si cambiás tipos o llamadas a la API, corré `npm run typecheck` y `npm run build`.

**[11:19] PARA claude-b-interfaz: TAREAS (en orden):** (1) Creá tu `.env` local con las dos líneas de `entorno-publico.txt` (esta rama). (2) Probá tu interfaz EN VIVO contra el backend real, en dos pestañas (dos sesiones anónimas), el recorrido de `docs/caso-canonico.md`: cargar el demo "Los del asado", unirte por código como Luna a un asiento limpio, simulaciones de los demás desde el panel, publicar opción v1, 4 aceptaciones, baja de Caro, En revisión, reparación v2, 4 aceptaciones nuevas, y la rama "sin opción". Anotá en tu archivo de agentes, paso por paso: pasó / falló y la respuesta EXACTA del servidor si falló. (3) Arreglá en `src/` lo que sea tuyo; si el fallo parece del servidor, ponelo en "Pedidos" con la respuesta exacta. (4) `npm run typecheck` y `npm run build` antes de cada push a `wip/ui-enmienda`. (5) Usá `mi_situacion.motivo_aceptar` y `espacio.generacion` (ver enmienda 2). Meta: recorrido completo estable ANTES de las 14:30. No toques `supabase/` ni `tests/`. Reportá cada ~20 min.

**[11:19] PARA codex: TAREAS:** (1) `docs/revision-codex-3.md`: las migraciones 0008-0011 contra A1-A5, más los huecos de las pruebas de `tests/backend/enmienda2.test.ts`. (2) Después, revisión SOLO LECTURA de la interfaz: traé `origin/wip/ui-enmienda` a tu copia y escribí `docs/revision-codex-4-ui.md`: (a) lugares donde la UI calcula como autoridad elegibilidad, cupos o confirmación; (b) textos que digan "Reparado" o "Confirmado" antes de que el servidor lo confirme; (c) respuestas atrasadas que pisen estado nuevo (`state_rev`); (d) cualquier dato privado mostrado al grupo; (e) manejo de errores nuevos (`asiento_en_uso`, `intento_obsoleto`, `cupo_completo/reservado_imprescindible`). Con archivo y línea. No edites código.

**[11:19] PARA pitch-problema: TAREAS:** (1) `docs/checkpoint-1.md`: guion de 90 segundos para el checkpoint de Problema de las 12:00 (qué decimos, qué mostramos de problema.md, qué NO afirmamos); solo con marcas [DATO]/[DATO PROPIO]/[HIPÓTESIS]. (2) `docs/readme-borrador.md`: borrador del README de UNA página que exigen las bases: qué problema atacamos, por qué ese y no otro, qué dejamos fuera a propósito y por qué; más qué es real y qué es simulado, cómo correrlo y participantes (nicofaingold066-sketch y JuanMorales10). Marcá con [PENDIENTE] todo lo que dependa de pruebas todavía no verificadas. (3) `docs/jurado-variantes.md`: 3 condiciones que un jurado podría pedir cambiar en vivo (por ejemplo "todos prefieren bajo techo", "Tomi no puede el sábado") y qué esperamos que pase, SIN prometer nada: yo las verifico después con pruebas reales. No commitees; avisame con un PEDIDO cuando estén listos.

**[11:19] PARA backend:** sin tareas por ahora; no consumas tokens. Si hace falta, te despierto por este canal.

**[11:17] PARA codex:** (1) tus pedidos de commit estable ya estaban resueltos: migraciones 0001-0011 en `wip/fundamentos` hash `06e3a88`, y las pruebas del backend en `bb08369`. (2) O1, O2 y la restricción extra de A2 están decididos en `docs/contrato-enmienda-2.md` (commit `a941383`): O1 se documenta con dos significados (raíz = eco del reinicio original, `espacio.generacion` = actual); O2 se declara excepción diagnóstica porque el privilegio ya exige sesión; el rechazo por retiro en A2 se acepta. (3) `docs/correcciones-altas-1.md` lo escribo cuando terminen los verificadores independientes (en curso); no certifica nada hasta entonces.

**[11:17] PARA backend:** tu pedido de commit de `tests/backend` está resuelto (`bb08369`). No hace falta nada más hasta nuevo aviso; los verificadores independientes están corriendo.

**[11:17] PARA todos:** arranquen su vigía: en `../cruce-coord` corran `./vigia.sh <su-nombre> 60` (nombres en README.md). Cada IA empuja SOLO a su rama (tabla en `PROPIEDAD.md`). Desde ahora los avisos del coordinador llegan por el vigía; no hace falta que Nico les pase mensajes.

**[11:03] PARA claude-b-interfaz:** el backend con contrato 2 (enmienda 2) ya está aplicado en Supabase y su reporte dice que pasa 23 pruebas reales; yo lo estoy verificando por mi cuenta (todavía no lo doy por corregido). Ya podés probar tu interfaz en vivo. Necesitás un `.env` local con `VITE_SUPABASE_URL=https://tjkfdnvzsikncjbskufm.supabase.co` y la clave publishable del proyecto: las dos variables públicas están en `entorno-publico.txt` en la raíz de ESTA rama: copialas a un `.env` local de tu copia del código (el `.env` ya está en `.gitignore`; no lo commitees). Probá en dos pestañas (dos sesiones anónimas) el recorrido de `docs/caso-canonico.md` y reportá en tu archivo qué paso falla y con qué respuesta del servidor. No toques `supabase/`; si el servidor responde algo que no coincide con `docs/contrato.md` + enmienda 2, anotalo en "Pedidos" con la respuesta exacta.

**[11:03] PARA codex:** el backend entregó A1 a A5. Migraciones 0001 a 0011 en `wip/fundamentos` (hash estable `06e3a88`). Mi verificación de catálogo real: 25 funciones públicas, `anon` ejecuta 0, `authenticated` 25, todas SECURITY DEFINER con search_path vacío, 0 de 43 auxiliares ejecutables desde el navegador. Entregá `docs/revision-codex-3.md` contra esas migraciones y sumá una sección de huecos de las PRUEBAS: qué escenarios de A1 a A5 no cubre `tests/backend/enmienda2.test.ts` (te lo paso en un commit estable en breve). Solo lectura.

**[11:03] PARA todos:** el agente de IA es solo especificación aprobada (`docs/agente-ia.md`). NO se escribe código del agente: faltan tope de gasto (Nico), aprobación de construirlo y la puerta de las 14:30. Proveedor elegido: API de Anthropic.

## Hitos de hoy
- 12:00 checkpoint 1: Problema. 17:15 checkpoint 2: algo funcionando. Sábado 13:00 entrega (último commit de `main`).
- Puerta 14:30: sin estado compartido estable en el backend, se corta todo lo extra.

## Quién hace qué ahora
| Agente | Haciendo | Rama |
|---|---|---|
| backend | Enmienda 2 (A1 a A5) como migraciones 0008+ sobre lo aplicado (0001 a 0007) y pruebas reales | `wip/fundamentos` |
| claude-b-interfaz | Ya empujó 3 commits solo en `src/` (contrato 2, reset con intento, cupo reservado, resultado incierto). Falta que lea el protocolo y ajuste: leer el motivo desde `mi_situacion.motivo_aceptar` | `wip/ui-enmienda` |
| codex | Revisiones solo lectura. Entregó `revision-codex-1` y `revision-codex-2` | `codex/revisiones` |
| pitch-problema | `docs/problema.md` listo para el checkpoint de las 12:00 (falta lo que digan los amigos del asado); guion del pitch; notas de la idea "agente del círculo" en `ideas-nico/` | `wip/fundamentos` |
| coordinador | Coordinación, contrato, integración, verificación A1 a A5 | `wip/fundamentos` |

## Estado de los hallazgos altos (verificado contra la base real y por Codex)
Migraciones 0008 a 0011 de la enmienda 2 YA aplicadas por el backend (A1 reserva del imprescindible, A2 asiento_en_uso, A3 reinicio con generación y tombstones, A4 orden de bloqueos, A5 anon sin EXECUTE y contrato 2). Falta la verificación: pruebas reales A1 a A5 del backend y la verificación independiente del coordinador. Hasta tener esa evidencia, ninguno se da por corregido.

## Dependencias
1. Backend entrega la enmienda 2 y pasa sus pruebas reales.
2. Interfaz se sincroniza con el contrato 2 (puede ir en paralelo con el backend).
3. Coordinador integra ambos, corre verificación independiente y revisión adversarial.
4. Codex revisa las migraciones nuevas.

## Decisiones tomadas
Contrato v1 enmendado por `docs/contrato-enmienda-2.md`. Sofi elegible en la franja B. Costo fuera de este corte. Baja que rompe el mínimo lleva a En revisión con versión nueva.

## Incidentes
- ~10:35 un duplicado del agente de backend escribió a la vez en la base; se detuvo el workflow original. Quedó un único backend. Auditoría de duplicados ~10:50: sin migraciones repetidas (disco 0001 a 0011 = base), un solo subagente corriendo, tres worktrees esperados, ramas sin repetir.

## Decisiones de Nico sobre el agente de IA
- **Proveedor del modelo: API de Anthropic** (decidido por Nico, viernes ~11:10). Modelo sugerido para redactar la explicación: `claude-haiku-5-5` (corto, barato, rápido; timeout ~8 s con texto fijo de respaldo).
- **Crédito disponible: USD 200 en la API de Anthropic (dicho por Nico, relatado por la sesión de pitch; confirmar con Nico). Ese es el saldo, no el tope del agente: el límite por clave aún no está definido.** Mientras no lo defina Nico no se pide ni se crea ninguna clave y no se escribe código del agente. La clave irá solo como secreto de Supabase, puesta por Nico, nunca en el repo, el chat ni el cliente.

## Decisiones pendientes de Nico
- **IA dentro del producto** (la especificación está aprobada y subida; falta aprobar CONSTRUIRLA, definir el tope de gasto y pasar la puerta de las 14:30). El tema es cambiar hábitos "con IA" y hoy el producto no usa IA (fuera de alcance). La sesión de pitch advierte que el jurado puede preguntar dónde está. Opciones: (a) responder con honestidad: IA en la construcción y, en el producto, solo opcional para explicar el plan; (b) agregar al final una explicación opcional con texto de respaldo, sin gasto, solo si sobra tiempo después de las 17:15.
- **Idea de Nico "agente del círculo"** (`/Users/macair/cruse/ideas-nico/01-agente-del-circulo.md`, en bruto): un agente de IA que lee la situación privada de cada uno (presupuesto, ánimo, gustos) y mira afuera (clima, canchas, eventos) para proponer el plan. Resolvería la pregunta de "dónde está la IA", pero agrega alcance (servicios externos, posible costo). Hay que decidir si entra y cómo, sin romper la regla de no abarcar todo. Estado: la sesión de pitch escribe SOLO la especificación `docs/agente-ia.md` (sin código). Reservadas las rutas del agente en `PROPIEDAD.md`. Alerta de privacidad: si un modelo externo lee la situación individual de cada persona se contradice la promesa de privacidad y la regla del manual ("nunca restricciones individuales a la IA"); diseño propuesto: puntaje determinista en el servidor con los datos privados y el modelo solo redacta/explica sobre el plan ya elegido y datos agregados. Postura del coordinador: la base privada y de versiones va primero; el agente entra como una capa que SOLO propone y explica, con respaldo de texto fijo, después de que el recorrido de punta a punta pase verificado.
