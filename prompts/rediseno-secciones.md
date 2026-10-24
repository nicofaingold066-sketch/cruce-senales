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
