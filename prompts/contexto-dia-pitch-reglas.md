# Contexto del día (vie 23 oct 2026): pitch, agente de IA y reglas del hackatón

Para el equipo de la noche de CRUXE (hackatón Señales, caso 06 social). Escrito el viernes 23 a las 19:27 (hora de `TZ=America/Santiago date`).
Fuente: transcripciones completas de dos sesiones de Claude Desktop, más los archivos que ellas dejaron. Las horas de abajo ya están pasadas a hora de Chile (UTC-3).
Sin claves ni datos personales. Si ves "[clave omitida]", es a propósito.

Cómo leer:
- **NICO DIJO** = mensaje que Nico escribió él mismo en esa sesión.
- **ATRIBUIDO A NICO** = lo cuenta otra sesión (el coordinador). Nico no lo escribió ahí. Verificalo en `cruce-coord/TABLERO.md`.
- **CLAUDE PROPUSO** = idea o texto de Claude. No es decisión de Nico.

---

## SESIÓN 1: "Pitch y Agente IA del círculo"
ID `local_b7ae42ef-90ad-4c2d-914d-4000fe609f36`. En el repo y el tablero figura como rol `agente-ia` (antes `pitch-problema`).

### 1. Qué es y en qué estado quedó
- Creada el viernes a las 01:59. Última actividad: 19:21. Está detenida, esperando.
- Rol: dueña del agente de IA del círculo (`src/agente/**`, `supabase/functions/agente/**`, `docs/agente*.md`) y, hasta las 12:02, del pitch.
- El pitch está **en pausa por decisión de Nico**: se trabaja el sábado.
- Trabajo abierto a las 19:21: enmienda 10 (zona, movilidad, tiempo máximo y momento del día). Interfaz y función ya escritas, con 38 pruebas sin red. Falta la migración 0035 del backend para probar en vivo. Plazo 23:45 (`MEJORAS.md` #87).
- Otras tareas libres suyas: #84 (ensayo del agente con 3 grupos ficticios) y el ensayo de 30 segundos para el pitch.
- Su ficha: `/Users/macair/cruse/cruce-coord/agentes/pitch-problema.md`. Rama: `wip/agente-ia`. Copia: `/Users/macair/cruse/cruce-agente`.
- La sesión sigue con vigía (`./vigia.sh pitch-problema 60`) y recibe avisos del coordinador.

### 2. Decisiones de Nico
**NICO DIJO** (casi textual, con hora):
- 01:59 y 02:00: pidió info de "crockpot" y "grok bot". Quería usar algo así mañana. Se entendió Grok y varios agentes en paralelo.
- 02:08 y 02:20: un conocido le mostró "10 agentes distintos, todos corriendo" (product manager, reliability, SEO, uno que busca errores en la página). Dijo "obviamente que no necesitamos todo". Preguntó cuánto saldría en plata.
- 10:13: "como afrontamos el problema" (el criterio Problema del checkpoint de las 12:00).
- 10:25: "escribí el texto del checkpoint de Problema en docs/problema.md, marcando qué es hipótesis y qué es dato".
- 10:44: dictó la idea del agente. "Haces tu círculo de amigos, y cada uno pone sus intereses". "Ninguno vea todas las cosas que pone uno". El agente revisa dinero, tiempo, si termina de trabajar, si se siente mal, si quiere algo tranquilo o fiesta. Preguntó si sería web app. Pidió ir armando una carpeta con lo que dicte.
- 10:47: el agente también mira el clima, parques, correr, fútbol, asado, tenis, pádel, canchas libres, "actividades en internet", Mendoza. "Que sea el mejor coordinador de eventos del mundo".
- 10:50: "si hay eventos, si hay charlas, si hay fiestas, si es muy difícil armar esto para mañana".
- 10:52: "en esta sesión podemos ir trabajando la gente, ir mejorándolo, y la otra sesión va a ser la coordinadora". Pidió comunicarse constantemente con ella.
- 10:58: "Sí, apruebo problema.md, agente-ia.md y pitch.md; avisale a la coordinadora que los integre". Esto aprueba la ESPECIFICACIÓN, no construir el agente.
- 11:04: "tope de gasto tengo 200 usd de api en claude". El coordinador lo registró como saldo, no como tope por clave.
- 11:05: "y juan tiene otros 100 en otra api, se puede hacer una organización y juntar las api".
- 11:41: subió el PDF de Juan "CRUCE / Agente, producto y modelos" (14 págs.). Copia en `/Users/macair/cruse/ideas-nico/`.
- 12:08: pidió un contexto para el checkpoint (qué armamos, back y front, cómo corre el agente, qué problema elegimos). 12:09 y 12:20 preguntó stack y framework.
- 12:48: el agente debe leer los intereses de todos y proponer según todos. "Multidisciplinario", "comprensivo, ejecutivo, coordinador, amable, empático".
- 15:43 (dos veces): "como conectamos la api".
- 17:12: "y como vamos". 17:14: "como funcionó el agente, pudo responder acordemente y coherente". 17:20: "está lista la demo con el agente conectado".
- 17:18: pidió "un barrido" de actividades de un grupo de amigos y de APIs (canchas de tenis, pádel y fútbol, lugares con charlas, restaurantes con "vibras").
- 17:41: el agente debe pesar la **distancia** de todos. Otra variable: que un integrante **no tenga movilidad**.
- 17:42: que ofrezca "posibles reservas": link de EasyCancha (181 clubes) o clubes cercanos, tal vez Google Maps.
- 17:44: "agregá al panel los botones de canchas cerca (Google Maps, EasyCancha y ATC), rotulados como posibles canchas, y probalo antes del corte".

**ATRIBUIDO A NICO** (por el coordinador, hora del mensaje):
- 11:01: proveedor del modelo = API de Anthropic. Aún sin tope.
- 11:51: "SOLO LO SOCIAL" (con Juan). Se descartó Empresa del pitch y del PDF de Juan.
- 12:02: pitch mañana, hoy nadie lo trabaja. Nombres de la demo (Tomi, Luna, Mati, Caro, Fede, Sofi) **no son reales**.
- 12:29: nombre del producto = **CRUXE**. Lo interno no cambia (esquema `cruce`, repo `cruce-senales`, URL de Vercel, ramas).
- 12:41: aprobó CONSTRUIR el agente "en todas sus directrices".
- 12:48: modo "bola de nieve": nunca frenar, tomar la siguiente mejora de `MEJORAS.md`.
- ~15:17: pagó Vercel Pro. La app volvió en la misma URL.
- 16:30: aprobó pasar la función del agente a Vercel AI Gateway. Cargó la clave como secreto de Supabase a las 16:45 [clave omitida].
- 19:11: aprobó la enmienda 10. 19:20: pidió el equipo de la noche.

**CLAUDE PROPUSO** (no es decisión de Nico): agentes en paralelo y vigías, que el modelo solo redacte, clave propia con tope bajo, "Simular sol/lluvia", botones de WhatsApp y canchas nivel 1, perfil agregado con 4+ personas.

### 3. Qué se construyó o escribió
Todo en `wip/agente-ia`, integrado por el coordinador. Producción: https://cruce-senales.vercel.app.
- **Agente del círculo.** Cada persona carga preferencias en privado (opciones cerradas). La base elige hasta 3 candidatas con reglas fijas. Un modelo (Claude Haiku por Vercel AI Gateway) elige una y redacta el porqué y un mensaje. Sin clave o si falla: regla + texto fijo, y la pantalla lo dice. El organizador decide; nada se crea solo.
- Probado en vivo con el modelo real el 23 a las 16:50, 16:51 y 16:52, y de nuevo 17:14 y 17:23 en el rediseño de Juan. Tarda 3 a 4 s.
- Pantalla `src/agente/AgentePanel.tsx`: preferencias, selector "Clima real / Simular sol / Simular lluvia", WhatsApp (enlace `wa.me`), "Usar esta opción", botones "Posibles canchas reales" (Google Maps, EasyCancha, ATC; solo enlaces). Publicados y probados en producción a las 19:05.
- Función `supabase/functions/agente/{index,logica,logica.test}.ts` (v8 en vivo; hay cambios nuevos de la enmienda 10 sin desplegar).
- Documentos: `docs/problema.md`, `docs/checkpoint-1.md`, `docs/pitch.md`, `docs/jurado-variantes.md`, `docs/agente-ia.md`, `docs/agente-barrido.md`, `docs/agente-revision-privacidad.md`, `docs/agente-revision-a11y.md`, `docs/agente-revision-front-juan.md`, `docs/agente-qa-enmienda9.md`. Carpeta de ideas: `/Users/macair/cruse/ideas-nico/`.
- `docs/readme-borrador.md`: **sin commitear** y viejo. El README real ya está en `main` (lo escribió el coordinador).
- Pruebas: `node --test "supabase/functions/agente/*.test.ts"`; `tests/e2e/recorrido-dos-sesiones.mjs` (23/23 en producción a las 16:32); `tests/e2e/red-controlada.mjs` (9/9).
- Arreglos de otros archivos que le reasignaron: #52, #47, #51, #56, #53.
- Contratos: `docs/contrato-enmienda-4.md` a `-10.md` (los pidió el agente y los aprobó el coordinador).

### 4. Reglas que importan para entrega y evaluación (de esta sesión)
- Fuente: `docs/agente-ia.md`, `docs/pitch.md`, `prompts/equipo-noche.md`.
- **Corte duro del agente: sábado 10:00.** Si no está integrado y probado, sale del producto y el pitch lo cuenta como siguiente paso.
- Función redesplegada antes de las 11:00. Interfaz congelada a las 11:00. Sin migraciones desde las 12:00. Último push entre 12:15 y 12:45.
- En el pitch solo se dice lo que funciona en vivo. Un paso del recorrido que no figure como verificado no se muestra.
- La IA solo explica. Nunca confirma ni cambia estados. No ve datos individuales. Nunca dice "reservado", "confirmado" ni nombres.
- Privacidad del perfil del grupo: con 3 personas o menos solo cuenta; "lo más elegido" solo con 4+ y actividad de 2+; el presupuesto nunca se muestra.
- Pitch: 5 min con demo en vivo + 3 min de preguntas. Estructura de `docs/pitch.md`: 0:00 problema, 0:40 por qué falla, 1:10 demo, 4:00 qué dejamos fuera y cómo se mediría, 4:30 cierre.
- Lo que NO se dice: que CRUXE cause más encuentros o bienestar; cifras de soledad sin umbral; datos de cancelaciones en Chile; que el agente funciona sin que esté probado; que es producto para empresas.
- Demo: usar "Simular sol" o "Simular lluvia", no el clima real (el fin de semana llueve). Cada pedido válido al agente **cuesta**. Una o dos llamadas por ensayo.
- El Wi-Fi del evento y la clave no van en ningún archivo del repo.

### 5. Ideas pendientes, ideas descartadas
**Pendientes**
- Enmienda 10 (zona, movilidad, minutos máximos, momento del día). Parte B (catálogo ampliado) solo si entra.
- #84 ensayo del agente con 3 grupos; ensayo de 30 s para el pitch. Se hacen el sábado.
- Actualizar el pitch: nombre CRUXE, agente ya probado, entrada "¿Quién eres?" por lista de integrantes (enmienda 9), sin Empresa.
- Link de atribución a Open-Meteo (la licencia lo exige). Propuesto al coordinador; sin respuesta antes del corte de las 10:00.
- Nivel 2 de canchas (Google Places, 5.000 búsquedas gratis al mes) y nivel 3 (acuerdo con EasyCancha y ATC): después de la demo.
- Mensaje de "por qué salió texto fijo"; contador de llamadas en la base; medir 5 llamadas seguidas (gasta, pedir visto bueno).
- 4 decisiones del barrido que Nico no contestó: qué ciudad primero (Santiago o Mendoza), cuánto gastar en Google, qué pasa con Open-Meteo/cine si CRUXE cobra, quién habla con EasyCancha, ATC y el Ministerio.

**Descartadas (y por qué)**
- Empresa como segundo uso: Nico y Juan eligieron un solo caso bien resuelto. El motor ya admite `empresa`, pero no se muestra.
- PDF de Juan, partes grandes (publicar solo, cron, 30 perfiles, Opus 5.5 principal, comparar modelos): alcance enorme para ~25 h y choca con "la IA solo explica". Se tomó el plan reducido. El AI Gateway sí entró.
- Que el modelo lea preferencias individuales: rompe la promesa de privacidad y la ley de datos. Lo hace la base con reglas.
- Buscar en internet, reservar y pagar: fuera. Se cuenta como visión.
- EasyCancha por scraping: sus condiciones lo prohíben. Solo enlace.
- 10 agentes con SEO: no sirve para una demo de un día. Se hizo una versión chica (sesiones + vigía + equipo de la noche).
- Juntar los USD 200 de Nico y los USD 100 de Juan: no se encontró forma de unir saldos entre organizaciones (búsqueda de Claude, sin fuente oficial).
- Mendoza en la demo: la demo es en Santiago.
- Tres inferencias de privacidad quedaron como **límites declarados** (no arreglados): el organizador puede deducir la disponibilidad de alguien probando varias veces; comparar el perfil antes y después de que alguien guarde; y "la baja que pasa a En revisión delata a quien podía" (`docs/contrato-enmienda-7.md`). No se prometen resueltos.

### 6. Feedback recibido y respuesta
- Del jurado o mentores: **ninguno** en esta sesión.
- Feedback de Nico sobre el producto: 17:41 (distancia y movilidad) y 17:42 (enlaces de canchas). Se respondió con la enmienda 10 y los botones de canchas.
- Feedback "del jurado, dicho por Nico" está en `prompts/equipo-noche.md` (publicado 19:20). Llegó por el coordinador. Ver sesión 3 y el punto 1 de la sección final.
- Revisiones internas: Codex (`docs/revision-codex-1` a `-9`), privacidad del agente (#42, 8 hallazgos; el backend corrigió la mayoría con la enmienda 7), accesibilidad (#60, 65 observaciones; las altas pasaron a claude-b) y revisión del rediseño de Juan. Respuesta: ver cada documento.

### 7. Riesgos y preguntas abiertas
- **El pitch está desactualizado.** `docs/pitch.md` todavía dice "CRUCE" y trata al agente como "siguiente paso". Hoy el agente está probado en vivo.
- La sección "Lo que dijeron los del asado" de `docs/problema.md` quedó vacía. Nadie respondió en estas sesiones. Las 4 causas siguen como hipótesis.
- La sección "Estado verificado para el pitch" que el coordinador prometió para el viernes 17:00 y el sábado 10:30 **no aparece** en `TABLERO.md` a las 19:26.
- Cada llamada al agente cuesta. Nadie confirmó el tope de gasto de la clave del Gateway. No probar en bucle. Hay límite por persona (1 cada 10 s), pero no se probó con clave real.
- La función v8 está en vivo; los cambios de la enmienda 10 y de privacidad extra están en rama sin desplegar.
- Si la red del lugar se corta, una pantalla puede no abrir hasta recargar (visto 19:06, `ERR_NETWORK_CHANGED`). Tarea #82, asignada a friccion.
- No se probó en teléfono físico. Todo fue en navegador a 375 px.
- La IA con la clave real puede dar un texto raro: la validación lo rechaza y cae al texto fijo.
- Pregunta abierta: ¿quién paga el Gateway? No quedó confirmado si sale de la cuenta de Vercel de Nico o de los USD 200 de Anthropic. La sesión lo preguntó a las 11:42 y no hay respuesta escrita.
- Pregunta abierta: ¿el agente se muestra en el pitch o solo se cuenta? Nico dijo "está lista la demo con el agente conectado" (17:20). Pero `docs/pitch.md` exige que el coordinador lo confirme.

---

## SESIÓN 2: "Reglas del haka"
ID `local_18a311f9-1ce8-4c70-a111-2a13b24d6a2f`.

### 1. Qué es y en qué estado quedó
- Creada el viernes 11:31. Última actividad 11:46. Detenida.
- Sesión corta de revisión de bases. Terminó con una auditoría de solo lectura. No tocó el repo.
- Su auditoría tiene más de 7 horas: **está desactualizada**. Rehacé cada chequeo de la sección 7 antes de confiar.

### 2. Decisiones de Nico
**NICO DIJO:**
- 11:31: "fijate las reglas del haka".
- 11:35: "fijata algo relacionado a las cuentas de google".

**ATRIBUIDO A NICO** (el coordinador, 11:43): pidió revisar a fondo las reglas "para que no nos descalifiquen" y una lista cumple/riesgo/no cumple en 10 puntos.

**CLAUDE PROPUSO:** subir un README mínimo a `main`, hacer squash merge de los commits firmados "Claude", confirmar que los nombres de la demo son inventados.

### 3. Qué se construyó o escribió
- `/Users/macair/cruse/notas/auditoria-reglas.md` (11:46), fuera del repo. Resumen enviado al coordinador.
- Nada más. No hubo commits ni cambios al repo.

### 4. Reglas de la hackatón que importan
Fuentes: bases v1.5 del 19 oct (https://hack.makana.cl/bases.html), página del evento (https://hack.makana.cl/evento) y PDF "CRUCE manual de tres operadores" Edición 4, págs. 24-26 y 50 (`/Users/macair/cruse/docs-drive/`).

**Entrega**
- Cierra el **sábado 24 a las 13:00:00**. Lo que no esté subido no compite (bases §9).
- Cuenta el **último commit de la rama principal** a esa hora. Cuenta la **llegada del push a GitHub**, no la hora local del commit (PDF págs. 24 y 50). No confiar en un push iniciado segundos antes.
- Se entregan tres cosas (bases §9): solución funcionando, repo con README de **una página**, pitch de 5 min con demo en vivo + 3 min de preguntas.
- El README responde 3 preguntas: qué problema atacan, por qué ese y no otro, qué dejaron fuera (bases §9, evento).
- El README lleva **enlaces a los componentes externos** (PDF pág. 26).
- Repo **público** y registrado en la página del evento el mismo viernes. El panel dice si se ve y si tiene README.
- Cada integrante con **su propia cuenta de GitHub** para que el historial muestre quién hizo qué.
- Demo en vivo **obligatoria**: sin demo se evalúa "como una idea sin nada corriendo" (bases §9, evento).
- El PDF (pág. 50) recomienda un video de respaldo. No sustituye la demo en vivo, salvo indicación de la organización.

**Cronograma**
- Viernes: trabajo hasta las 18:30. Checkpoint 1 a las 12:00 (problema y por qué ese). Checkpoint 2 a las 17:15 ("algo corriendo, aunque sea feo"). Ambos sin nota. La sede cierra a las 18:30 pero el trabajo nocturno fuera de sede está permitido.
- Sábado: sede abre 09:00. Entrega 13:00. Sorteo del orden 13:45 (en pantalla). Pitches desde 14:00. Deliberación 17:00. Premiación 17:30. Cierre 18:00.
- Plan interno del PDF (pág. 50): 09:00-10:00 revisar lo desplegado; 10:00-11:00 cerrar README y ensayar con cronómetro; congelar funciones a las 11:00; 11:00-12:15 QA y demo en dos dispositivos; 12:15-12:45 último push estable; 12:45-13:00 solo verificar.

**Evaluación** (bases §10; página /evento)
- Jurado = equipo de producto de Makana. Cada uno puntúa 1 a 7 tres criterios **con el mismo peso**. La suma decide. Decisiones inapelables.
- **Problema:** ¿qué tan bien entendieron a la persona? 1 = repiten el caso. 4 = ven qué le pasa pero no por qué fallaron intentos anteriores. 7 = dicen algo de la persona que no estaba escrito y que cambia cómo se ataca, y eligieron qué atacar con razones.
- **Solución:** 1 = idea sin nada corriendo. 4 = lo central funciona, pero quisieron abarcar todo. 7 = corre en vivo, cada parte responde al problema y saben decir qué dejaron fuera y por qué. **Lo que más pesa es la demo en vivo.**
- **Convicción:** ¿qué tan creíble es que esa persona cambie? 1 = cuesta creer que la use una segunda semana. 7 = responden con precisión y convencen. Cuentan las respuestas a las preguntas.
- Pregunta de cierre: "¿con cuál sí cambiaría esta persona?". Se responde por caso, entre equipos del mismo caso. No suma puntos; se mira en los empates.
- El caso 06 compite igual que los otros: mismo ranking, mismos criterios, mismo premio (Mac mini M6).

**Prohibido y descalificación inmediata** (bases §8, §16)
- Presentar como propio código escrito antes del evento. Todo el trabajo debe hacerse en el evento. Repo creado el viernes 23 a las 09:00 o después.
- Cargar o usar **datos de personas reales** (propios o de terceros, y en especial de salud). Si hacen falta ejemplos, se inventan. Contar el caso en palabras sí se permite.
- Entregar como propio el trabajo de otro equipo.
- Incumplir el código de conducta.
- Equipos de 1 a 3 personas. Los reemplazos requieren autorización escrita de la organización.
- Permitidos: bibliotecas abiertas, plantillas públicas, servicios de terceros y asistentes de IA.
- Un componente propio previo solo se puede usar si ya estaba publicado como código abierto antes del evento (PDF pág. 26).
- Propiedad intelectual: el código es del equipo. Makana tiene licencia no exclusiva para evaluar y difundir, con mención de autores. Makana puede usar libremente las ideas presentadas, también las de equipos que no ganan.
- Premio: debe haber al menos un integrante en la premiación (17:30) o una autorización escrita.

**Cuentas** (pregunta de Nico de las 11:35)
- Las bases no mencionan cuentas de Google.
- Se entra al panel del equipo en /evento con el correo con el que se postuló + un código de un solo uso. No hay login con Google.
- Hay dos correos de Nico en circulación. Sirve solo el de la postulación.
- Cada integrante necesita su cuenta de GitHub: Nico `nicofaingold066-sketch`, Juan `JuanMorales10`. Marcos no participa; en esta compu la sesión de `gh` incluye su cuenta, pero está inactiva. No commitear como Marcos.

### 5. Ideas pendientes, descartadas
- Pendiente de la auditoría: registrar el repo en /evento (no verificado), README mínimo en `main`, squash de los commits "Claude", no dar la URL de despliegue protegida al jurado, recorrido final en `cruce-senales.vercel.app`.
- Descartado: reescribir la historia para cambiar el autor de los commits "Claude". Solo si Nico lo pide.
- No se descartó nada más.

### 6. Feedback recibido
- Ninguno del jurado. La sesión devolvió una lista cumple/riesgo/no cumple al coordinador (11:46).
- El coordinador la usó para ordenar la publicación. No hay respuesta registrada en esta sesión.

### 7. Riesgos y preguntas abiertas (estado de la auditoría de las 11:46, rehecho a las 19:26 donde pude)
- **Commits "Claude"**: la auditoría contó 15. En `origin/main` hoy hay 8 con autor "Claude". En todas las ramas son 15. El README de `main` ya los declara ("ocho commits tempranos"). Sigue siendo un riesgo para "cada integrante con su cuenta". Hay commits de Juan con dos correos distintos; uno es un correo personal en un repo público (no es descalificante, conviene saberlo).
- **README**: ya existe en `main` (CRUXE, 3 preguntas, componentes externos con enlaces). Verificar que quede en una página y sin la URL protegida.
- **Registro en /evento**: no verificado por nadie en estas sesiones. Hacerlo con el correo de la postulación.
- **`main` sin la app** (riesgo de las 11:46): ya se resolvió. `main` tiene la app y se publica desde ahí (último commit de `main` visto 19:06). Verificar al final.
- **Nombres de la demo**: resuelto por Nico a las 12:02 (vía coordinador). El pitch no debe citar frases literales de amigos reales en el repo.
- **URL de despliegue**: la pública es `https://cruce-senales.vercel.app`. Las URL propias de cada despliegue pueden pedir login de Vercel. No usarlas.
- Pregunta abierta: los checkpoints de las 12:00 y 17:15, ¿se presentaron? No hay registro.

---

## SESIÓN 3: "Chat lateral"
**No la pude encontrar.** Revisé `list_sessions` con archivadas (11 sesiones) y busqué "Chat lateral" y "lateral" en todas las transcripciones. Ninguna se llama así. Puede ser un chat lateral de la app que no es una sesión de Claude Code, o una sesión que no se ve desde acá. Sin ese contexto, no hay nada que contar de ella. Si alguien la tiene abierta, que pegue el resumen en `cruce-coord`.

---

## Lo que el equipo de la noche tiene que saber sí o sí

1. **Entrega: sábado 24 a las 13:00:00.** Cuenta el último commit de `main` recibido por GitHub a esa hora. Apuntar al último push entre 12:15 y 12:45 y solo verificar después. Funciones congeladas a las 11:00, sin migraciones desde las 12:00.
2. **El jurado puntúa Problema, Solución y Convicción, 1 a 7, mismo peso.** La demo en vivo es lo que más pesa. Sin demo, la solución vale "idea sin nada corriendo".
3. **Descalifica**: código previo presentado como propio, datos de personas reales, trabajo de otro equipo, romper el código de conducta. Todo dato es inventado. Cero nombres, frases ni correos reales en código, seeds, tests, docs o capturas.
4. **Cada integrante con su cuenta de GitHub.** Nico: `nicofaingold066-sketch`. Juan: `JuanMorales10`. Nunca la cuenta de Marcos ni `gh` ni el conector de Vercel. Commits con `Co-Authored-By` como pide `prompts/equipo-noche.md`. Los commits de esta computadora salen con la identidad git de Nico (vale solo dentro de `/Users/macair/cruse/`). No cambiarla. Los commits "Claude" viejos ya están declarados en el README.
5. **El README es de una página** y responde: qué problema, por qué ese, qué dejamos fuera. Lleva enlaces a los componentes externos. Se cierra el sábado entre 10:00 y 11:00. Si agregan una librería, anotarla y pedirle permiso al coordinador.
6. **Repo público y registrado** en https://hack.makana.cl/evento con el correo de la postulación. Nadie verificó que esté registrado. Es una tarea de Nico a primera hora.
7. **Solo lo social, nombre CRUXE.** Se descartó Empresa. Los nombres internos (esquema `cruce`, repo `cruce-senales`) no cambian. El pitch aún dice "CRUCE" en varios lugares.
8. **El agente está construido y probado en vivo con el modelo real** (16:50). Corre por Vercel AI Gateway y cae a texto fijo si falla. Corte duro: sábado 10:00. Cada llamada cuesta: no probarlo en bucle. En demo usar "Simular sol/lluvia".
9. **Privacidad es parte del producto.** Condiciones y preferencias nunca aparecen en respuestas compartidas, errores ni logs. La IA solo explica. En el pitch decir: "no se promete ausencia total de inferencia en grupos chicos". No negar los límites declarados en `docs/contrato-enmienda-7.md`.
10. **Feedback del jurado (dicho por Nico) que guía la noche:** (a) eliminar la fricción: basta convencer a UNO, el resto toca su nombre y responde, sin login obligatorio; (b) no solo asados: todo tipo de juntadas; (c) flujo completo de información y de usuario; (d) front y back se adaptan entre sí. Detalle en `prompts/equipo-noche.md` y `MEJORAS.md` #85-#91.
11. **El pitch está en pausa por orden de Nico y hay que reescribirlo el sábado.** Faltan: nombre CRUXE, agente como mostrado (solo si el coordinador lo confirma), entrada por lista de integrantes, sin Empresa. Respuesta honesta a "¿dónde está la IA?" ya existe en `docs/pitch.md`.
12. **Falta el "Estado verificado para el pitch"** del coordinador (prometido viernes 17:00 y sábado 10:30). Sin él, el pitch no debe prometer pasos. Recorrido completo ya pasó 23/23 en producción con `tests/e2e/recorrido-dos-sesiones.mjs`.
13. **Respuesta de los amigos del asado: nadie contestó.** El hueco en `docs/problema.md` sigue vacío. Si Nico trae una frase, va en el pitch hablado y sin nombre, no en el repo público. Las 4 causas siguen como hipótesis y se dicen como "creemos que".
14. **Reglas operativas de la noche.** Una ruta, un escritor. Base: solo el proyecto Supabase de CRUXE (nunca el otro que aparece en `equipo-noche.md`). Migraciones solo de backend y con aviso `MIGRACION EN CURSO`. Nadie corre suites contra la base mientras diga eso. Nunca push a `main` ni a `wip/fundamentos`. Hora siempre con `TZ=America/Santiago date`.
15. **Riesgo de demo en sala:** la red inestable puede dejar una pantalla sin abrir hasta recargar (#82). No se probó en teléfono físico. Dejar un video de respaldo grabado durante el evento. Usar ventana privada para la segunda persona al ensayar (el navegador compartido hereda la identidad anterior).
