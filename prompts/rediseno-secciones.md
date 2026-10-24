# Mockup validado por Nico (02:40): qué hay en cada pantalla

Descripción textual de https://claude.ai/artifact/LqZBMzmLT187pv6duBpj6f (solo Nico lo abre). Es la referencia de ESTRUCTURA para cada sección; el aspecto final lo da el sistema de `wip/diseno` (`sistema.css`, `ui.tsx`, animaciones base en `dd61eeb`). Textos al hueso; un solo botón primario por pantalla; márgenes 20 px en móvil y 40 en computadora; 12 px entre cards, 24 entre bloques; solo 4 tamaños de letra; nada superpuesto; comprobación a 320, 375, 768 y 1280. Los rótulos del §9 de `docs/guion-demo.md` y de los guiones de `tests/` se mantienen o se avisan.

## Tres niveles, distintos a la vista
- **Mi espacio** (S1): barra de pestañas abajo, Grupos · Planes · Perfil. Cabecera clara con CRUXE y el chip "Datos ficticios".
- **Grupo** (S2): cabecera propia, oscura, con "‹ Grupos", ícono del grupo, nombre grande y los avatares.
- **Plan** (S4): "‹ Nombre del grupo" arriba y el resultado primero.

## Pantalla 1 · Home (S1, friccion con excepción sobre `Inicio.tsx`)
- Arriba: CRUXE + chip "Datos ficticios" + avatar del perfil.
- UNA línea de aviso, solo si te toca algo: "Te toca confirmar · Los del finde ›". Si no, el home arranca en "Tus grupos".
- "Tus grupos": filas grandes con ícono, nombre y una línea de estado ("6 personas · sáb 31 oct, 14:00"; "reuniendo respuestas"; "sin plan todavía") y chevron. NADA más: ni "Tu plan", ni formularios.
- "+" flotante abajo al centro con el rótulo "Nuevo grupo" → abre la pantalla 2.
- Pestañas abajo: Grupos (activa) · Planes · Perfil. "Planes" lista todos los planes de todos los grupos.

## Pantalla 2 · Hoja del "+" (S1)
- Hoja desde abajo sobre el home atenuado, con X para cerrar y el título "Nuevo grupo".
- Fila "Crear un grupo" (ícono +, "Ponés el nombre y a tus amigos. Después armás el plan.") → Crear grupo.
- Fila "Unirme con un código" ("Te lo mandó quien organiza.") que al tocarla se despliega ahí mismo: Código de invitación, Tu nombre en el grupo, botón "Unirme".
- Abajo, chico: "o prueba sin crear nada · Probar la demo «Los del finde»".

## Pantalla 3 · Grupo (S2, frontend)
- Cabecera oscura: "‹ Grupos", ícono, "Los del finde", "6 personas · organizas tú", avatares y "Personas ›".
- Card "Invitar al grupo": código grande en monoespaciada y dos botones, "Copiar enlace" y "WhatsApp". Es el output de quien organiza; va primero.
- "Planes" con "+ Nuevo plan": la card del plan activo con estado en mayúsculas chicas ("ESPERANDO CONFIRMACIONES · v1", cierre), fecha grande, título, barra "2 de 4 confirmaron" y el botón que toca ("Confirmar versión 1").
- Card "Agente del círculo": una línea con tus gustos resumidos, "Abrir ›" y el botón "Que el agente proponga un plan".
- Filas plegadas: "Simulación (demo)", "Historial".

## Pantalla 4 · Nueva propuesta (S3, frontend; entregada en `wip/rediseno-s3`)
- Cabecera: X, "Nuevo plan", "Los del finde".
- "Qué hacen": chips (Asado, Fútbol, Cena, Fiesta, Más…) y el campo del título con el valor sugerido.
- "Cuándo · dos opciones": filas A y B con fecha, hora y duración, editables; línea "Gana la que empieza antes. Más opciones (ronda de opiniones, la que pueden más)".
- Mínimo y Máximo lado a lado con −/+. "No puede faltar": avatares elegibles. "Cierre para confirmar" como fila.
- Un solo primario abajo: "Crear y abrir al grupo", con la nota "Cada uno marca en privado cuándo puede. Nadie queda confirmado."

## Pantalla 5 · El plan (S4, ux-flujo)
- Arriba: "‹ Los del finde" y, a la derecha, "v1 · cierra jue 29, 20:00".
- BLOQUE DE RESULTADO con borde grueso: estado en mayúsculas chicas ("ESPERANDO CONFIRMACIONES"); fecha grande ("Sábado 31 oct"), hora ("14:00 a 17:00"), título; avatares de quienes confirmaron (los pendientes punteados) y "2 de 4 confirmaron · faltan 2"; la tira de cuatro pasos Respuestas · Opción · Confirmar · Encuentro con el actual marcado; una línea "Cómo salió: 4 respondieron; se eligió la fecha más temprana en la que llegan al mínimo (4)." (o "la que pueden más", según la regla); UN botón primario, el de `siguiente_accion` ("Confirmar versión 1"), con "Tu confirmación vale solo para esta versión." Si no me toca nada, no hay primario: una frase.
- Debajo, filas: "Tu respuesta: puedo los dos días · Cambiar ›", "Así no puedo, pero sigo ›", "Avisar al grupo (WhatsApp) ›", "Ficha del plan · Quién confirmó ⌄", "Historial ⌄", y al final, chico, "Retirarme de este plan".
- Pestañas de Mi espacio abajo, con "Planes" activa.
- Animación: al confirmar, el botón pasa a "Confirmado ✓" con un pulso y el avatar se enciende; el bloque "respira" una vez al cambiar de estado; el Confeti existente queda para "¡Se juntan!".

## Pantalla 6 · ¿Cuándo puedes? (S5, friccion)
- "‹ Ver el plan", línea con el título del plan y el grupo, título "¿Cuándo puedes?", "Toca una opción y listo. Es privado: nadie del grupo ve qué elegiste."
- Tres botones grandes de un toque, con el día como ficha a la izquierda: "Puedo los dos días" (primario), "Solo el sábado", "Solo el domingo"; y "No puedo ninguno" punteado.
- "OPCIONAL", chico: "Avisar que me interesa (lo ve el grupo)", "Mis gustos y presupuesto (privado)", "Tomar de mi calendario (simulación)".
- Después de responder: "Respondiste. Cuando haya un plan, lo ves acá."

## Pantalla 7 · Agente del círculo (S6, agente-ia)
- "‹ Los del finde", título, una línea: "Mira el clima, los lugares y los gustos del grupo, y te propone un plan. Lo redacta la IA; el grupo decide."
- Arriba: chips de Finde (Sáb 31 oct) y Clima (Real / Sol / Lluvia); UN botón primario "Que el agente arme un plan" y, chico, "Tarda unos 15 segundos. Propuesta rápida (sin herramientas)".
- Card "Mis preferencias": una línea resumida ("Asado, Pádel · algo barato · tranquilo · Providencia, transporte público · tarde"), "Editar ›" y la nota de privacidad.
- Card de resultado con borde grueso: "RECOMENDADO · 3 OPCIONES", título grande, fecha y viaje, el mensaje de la IA entre comillas con "Lo redactó la IA", un desplegable "Lo que hizo el agente (4 pasos) y las otras 2 opciones", el primario "Usar esta opción" y, chico, "o que el agente invite al grupo por mí (revisás y aprobás antes)". "Comprobar servicio" desaparece como botón: si el servicio está, se dice en una línea.
- Animación: "El agente está trabajando" con los pasos apareciendo de a uno.

## Pantalla 8 · Home en computadora (S1 + S2)
- Barra superior con CRUXE, las pestañas Grupos · Planes · Perfil, el chip y el avatar.
- Dos columnas, sin scroll: a la izquierda (7/12) la línea de aviso y "Tus grupos"; a la derecha (5/12) la card "Nuevo grupo" con "Crear un grupo", la card "Unirme con un código" desplegada y la línea de la demo.
- Todas las demás pantallas en computadora: dos columnas donde tenga sentido (por ejemplo, en el plan, el bloque de resultado a la izquierda y las filas a la derecha), y sin scroll si entra.

# Las demás pantallas (agregadas 02:58, filas 3 y 4 del lienzo; Nico las está validando)

## Pantalla 9 · Portada sin sesión (S1, friccion)
CRUXE + chip arriba. Título "Del «nos juntamos» al encuentro que ocurre." y una línea. La órbita chica (no media pantalla). Card "Entrar": "Sin contraseña ni correo. Tu sesión queda en este teléfono.", campo "¿Cómo te llaman tus amigos?" y botón primario "Entrar". Debajo, dos filas: "Probar la demo «Los del finde»" (Serás Tomi…) y "Tengo un código de invitación", que se despliega ahí mismo (código, tu nombre, Unirme). "Cómo funciona" se va de la portada.

## Pantalla 10 · ¿Quién eres? (S1, friccion)
"Tomi te invitó a" + nombre del grupo grande + el plan en una línea. "¿Quién eres?" con "Toca tu nombre y entras. Sin contraseña." Lista de nombres como botones grandes con avatar; al final "No estoy en la lista" punteado, que abre "Tu nombre" + "Entrar". Si un nombre ya lo tomó otro teléfono, se pregunta "¿Eres X?". Siguiente pantalla: ¿Cuándo puedes?. Objetivo: 3 toques de enlace a "respondí".

## Pantalla 11 · Crear un grupo (S2, frontend)
Hoja a pantalla completa con X y título. "Nombre del grupo" con botón de ícono + campo. "Tu nombre en el grupo". "Quiénes son": lista con avatar (tú · organizas), cada fila con ×, y una fila de entrada "Nombre, o varios separados por comas" + "Agregar"; nota "Al abrir el enlace, cada uno toca su nombre y listo." Fila plegada "Opciones · ¿para qué es el grupo? · ¿quién viene?". Primario "Crear grupo" y debajo "Después, directo a armar el primer plan."

## Pantalla 12 · Pestaña Planes (S2, frontend; `Planes.tsx`)
"Tus planes" y la línea "Primero lo que te toca. Después, lo que espera a otros. Al final, lo pasado." Cards por plan con el estado en mayúsculas chicas (TE TOCA CONFIRMAR con borde brasa; REUNIENDO RESPUESTAS; SE JUNTARON · fecha, punteada), el nombre del grupo a la derecha, fecha y título grandes, y una línea de avance. Pestañas abajo con Planes activa.

## Pantalla 13 · Perfil (frontend, `Perfil.tsx`)
Avatar grande, nombre y "Así te ven tus amigos · Cambiar". Un bloque con tres filas que abren lo que ya existe: "Mis gustos y presupuesto" (resumen privado), "Cómo llego" (zona, movilidad, viaje), "Permisos del agente" (usa mis gustos / invitaciones). Nota: "Lo tuyo vive acá, una sola vez. Dentro de un grupo solo se ve como resumen." Segundo bloque: "Tu sesión" (guardada en este teléfono · código para seguir en otro) y "Privacidad" (tres líneas). Al final, chico, "Salir de este teléfono". Pestañas abajo con Perfil activa.

## Pantalla 14 · Respondiste (S5, friccion)
Check grande con animación corta, "Respondiste", lo que marcaste en una línea ("Puedes los dos días."), "Cuando haya un plan, lo ves acá. Solo tú ves lo que marcaste." Card del grupo con "reuniendo respuestas", barra "3 de 6 respondieron" y "Quien organiza busca la opción cuando haya suficientes respuestas." Filas: "Cambiar mi respuesta" y "Avisar que me interesa (opcional · lo ve el grupo)". Botón "Listo" al pie.

## Pantalla 15 · El plan · reuniendo respuestas (S4, ux-flujo)
Mismo bloque de resultado que la pantalla 5, con estado REUNIENDO RESPUESTAS (gris), título grande, las dos fechas, avatares de quienes respondieron (los que faltan punteados) y "4 de 6 respondieron", tira de pasos en el primero, línea "Con 4 respuestas ya se puede buscar una opción. Quien no respondió no entra en esta versión." y el primario de quien organiza: "Buscar opción compatible" con "Lo decide el servidor con lo que cada uno marcó en privado." Filas: "Recordar a quien falta (WhatsApp)", "Tu respuesta: … · Cambiar", "Ficha del plan", y chico "Cancelar la propuesta". Invitado: mismo bloque sin botón, "Faltan 2 por responder. Te avisamos cuando haya plan."

## Pantalla 16 · El plan · ¡Se juntan! (S4, ux-flujo)
Bloque con fondo brasa suave y borde brasa: "¡SE JUNTAN!", fecha enorme, "14:00 · Parrilla del parque", título, avatares llenos de quienes van y "Van 4: Tomi, Luna, Mati y Caro", tira de pasos completa con Encuentro marcado. El Confeti existente se dispara una vez acá. Botones: "Ver el lugar en el mapa" (secundario grande), "Avisar al grupo (WhatsApp)", "Agregar a mi calendario (simulación)", "Ficha del plan · Historial". Chico: "Ya no puedo ir · si te bajas, el plan pasa a revisión y los demás vuelven a confirmar".

## Pantalla 17 · El plan · en revisión (S4, ux-flujo)
Bloque con borde punteado: "EN REVISIÓN · UNA PERSONA SE RETIRÓ", la fecha vieja tachada en gris, "ya no llega al mínimo (4)", avatares de quienes siguen y un "?" punteado, "3 siguen · faltan 1 para el mínimo", tira de pasos, línea "Nadie ve quién se retiró. Si hay otra fecha que sirva, sale una versión nueva y todos vuelven a confirmar: nada se hereda." Primario de quien organiza: "Buscar alternativa", con "Si no hay alternativa: «Sin opción compatible», sin bajar el mínimo." Invitado: sin botón, "Una persona se retiró. Quien organiza busca alternativa."; cuando sale la v2: "Te toca confirmar la versión 2".

## Pantalla 18 · Simulación (S7, frontend)
Sello SIMULACIÓN arriba. Título y una línea. Primario "Cargar las respuestas de los 5 de una vez". Después UNA fila por persona simulada (avatar, nombre, estado en una línea "A: Sí · B: Sí · aceptó la v1") con UN botón según lo que corresponde ahora: "Aceptar v1" solo con versión publicada, "Se baja" solo si aceptó, "Editar" si no respondió. Sin tarjetas apiladas.

## Pantalla 19 · Historial (S7, frontend)
Agrupado por versión: "VERSIÓN 2 · VIGENTE", "VERSIÓN 1 · YA NO VALE", "ANTES". Cada evento: hora a la izquierda, punto (lleno si es una confirmación), texto corto. "Se publicó la versión 2: dom 1 nov, 14:00. Las confirmaciones empiezan de cero." "Una persona se retiró. El plan pasó a revisión." Nunca qué marcó cada uno ni quién se retiró. Los eventos simulados llevan "· simulación".

## Pantalla 20 · Agente social: revisar y aprobar (S6, agente-ia)
Hoja con X, "Revisar antes de invitar", "Paso 1 de 2 · el agente propone, tú decides". Bloque "BORRADOR DEL AGENTE": título grande y filas Cuándo / Cupos / No puede faltar / Cierre / Invita a (avatares + "5 que aceptan invitaciones") y el mensaje de la IA entre comillas con "Lo redactó la IA". Línea: "Esto es exactamente lo que se va a invitar. Nadie queda confirmado." Primario "Aprobar e invitar" (los dos pasos reales, aprobar y publicar, con un toque; si algo cambió en el medio, se avisa y se vuelve a revisar). Secundario "Descartar el borrador". Después: "Invitaciones enviadas a 5". "Comprobar servicio" y "Comprobar recibo" desaparecen como botones.

## Pantalla 21 · Invitación del agente, vista por un invitado (S6 + S4)
Arriba del bloque del plan, una línea punteada: "El agente de Tomi te invita. Tomi revisó y aprobó este plan. Lo redactó la IA; no es una confirmación." Debajo, el plan de siempre en estado reuniendo, con "Te toca decir cuándo puedes. Es privado." y el primario "Responder en un toque". Filas: "No me interesa este plan (solo lo sabe el servidor)" y "Ficha del plan". Nada nuevo que aprender.

# Computadora e iPad (03:15, validado con el resto: "nada de cambiar ningún botón")

Mismos bloques, mismos botones y mismos rótulos que en móvil; cambia solo cómo se reparten en el ancho.

## Computadora (1280 px): pantallas C1 a C9 del lienzo
- Barra superior de 64 px en todas: CRUXE, las pestañas Grupos · Planes · Perfil (la activa subrayada), chip "Datos ficticios" y el avatar. Sin barra inferior.
- Márgenes de 40 px; rejilla de 12 columnas con 24 px de separación. **Sin scroll** si el contenido entra.
- Portada sin sesión (C1): izquierda 7/12 el título grande, la línea y la órbita chica; derecha 5/12 la card "Entrar" y las filas de la demo y del código.
- ¿Quién eres? (C2): izquierda 5/12 quién te invitó y el plan; derecha 7/12 los nombres en dos columnas.
- Grupo (C3): la cabecera oscura ocupa el ancho (nombre, personas y avatares a la derecha); izquierda 7/12 "Planes" con la card del plan activo y las pasadas; derecha 5/12 "Invitar al grupo", "Agente del círculo", Simulación e Historial.
- Nueva propuesta (C4): hoja CENTRADA de 880 × 720 sobre el grupo atenuado, con el formulario en dos columnas (qué hacen y cuándo a la izquierda; cupos, no puede faltar, cierre y el primario a la derecha).
- El plan (C5): izquierda 7/12 el bloque de resultado con el primario adentro; derecha 5/12 las filas plegadas y "Retirarme" chico.
- ¿Cuándo puedes? (C6): izquierda 5/12 el título, la explicación y lo opcional; derecha 7/12 los cuatro botones grandes.
- Agente (C7): izquierda 5/12 título, finde, clima, el primario y "Mis preferencias"; derecha 7/12 la card del resultado recomendado con "Usar esta opción".
- Planes (C8): las cards en tres columnas, la que te toca con borde brasa.
- Perfil (C9): izquierda 4/12 avatar grande, nombre y "Salir"; derecha 8/12 los dos bloques de filas.
- Las demás pantallas (crear grupo, respondiste, estados del plan, simulación, historial, agente social, invitación) siguen la misma regla: bloque principal a la izquierda, filas y acciones secundarias a la derecha; las hojas, centradas.

## iPad (768 px vertical): pantallas T1 a T3
- La pantalla de móvil, centrada en una columna de **640 px**; las filas cortas van de a dos por fila; la barra inferior queda, centrada en los 640 px.
- Las hojas (nueva propuesta, crear grupo, "+") suben desde abajo con 640 px de ancho.
- iPad apaisado (1024 px o más): como computadora.
