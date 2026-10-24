# Rediseño de la noche (pedido de Nico, sábado 24, 01:55–02:00)

Nico y Juan duermen. No hay a quién preguntar: ante cada duda, elegí la opción que recomendarías vos y anotala en `docs/rediseno/decisiones.md`. Este archivo es el encargo completo; leelo entero.

## Lo que pide Nico, con sus palabras
- "Que sea muy de uso rápido, como Tricount: entrás, ponés tu nombre, ponés lo tuyo y chau. Después volvés y ya está todo hecho."
- "La menor cantidad de clics posible." Marcar intereses y disponibilidad tiene que ser rapidísimo y muy visual, sin que falte ninguna opción.
- "Que el jurado entienda la importancia de la app, del output y del botón." Jerarquía visual clara: qué es lo importante, cuál es la acción y cuál es el resultado.
- "Mostrar bien cómo sale el output": cómo se procesó la información y en qué terminó el plan, a la vista.
- Tipografía **Plus Jakarta Sans**. **Solo 4 tamaños de letra** en toda la app.
- Moderno y contemporáneo, pero **que no se note hecho por IA**: humano, sobrio, como una app que la gente ya usa.
- Textos profesionales y al hueso. Ningún texto que no aporte. El objetivo es armar la juntada.
- Nada se pisa: ningún texto con otro ni ninguna card con otra, en el teléfono (320 y 375 px) ni en la computadora (1280 px). El jurado usa los dos.
- Hacer un user flow NUEVO (el de `docs/flujo-usuario.md` es del principio del hackatón) y una experiencia de usuario nueva, y dividir la app en secciones para rediseñarla de a una.

## Lo que NO cambia
- El backend está cerrado. No se tocan `supabase/**` ni las RPC, ni el significado de nada. El servidor decide; la interfaz solo muestra.
- Reglas del producto (`AGENTS.md`): interés no es confirmación; una confirmación vale para una versión; las condiciones privadas nunca se muestran a otros; la IA nunca confirma. Los avisos de privacidad que importan se quedan, pero cortos.
- Se mantienen el chip "Datos ficticios", "Lo redactó la IA" (sin nombre de modelo) y el sello "SIMULACIÓN" en lo simulado.
- No agregar dependencias de npm. La tipografía va por Google Fonts en `index.html`; registrala en `docs/componentes-externos.md`.
- Todo dato es ficticio. Ningún secreto.

## Tu rol: sesión **diseno**, directora de arte del rediseño
Rama `wip/diseno`, copia `/Users/macair/cruse/cruce-diseno`. Tu copia de coordinación: `/Users/macair/cruse/cruce-coord-diseno`. Primero leé `prompts/equipo-noche.md`, `PROPIEDAD.md`, `TABLERO.md` y `MEJORAS.md` (sobre todo el bloque "EN ESPERA", con el recorrido como usuario nuevo de las 01:14), `docs/flujo-usuario.md`, `docs/guion-demo.md` y `docs/caso-canonico.md`. Creá tu ficha `agentes/diseno.md`.

### Fase 1, hasta las 03:00 (sin tocar la base)
1. `docs/rediseno/user-flow.md`: el user flow nuevo, por rol (quien organiza, quien es invitado) y por momento. Primero el camino rápido: entrar, cargar lo tuyo, irte, volver y ver el resultado. Contá los toques de cada tarea y fijá un objetivo; por ejemplo, invitado de 0 a "respondí" en 3 toques o menos.
2. `docs/rediseno/inventario.md`: inventario de TODO lo que hay en la app (pantallas, cards, botones, chips, avisos, ventanas emergentes, pestañas y textos), dividido en estas secciones:
   - S1 Ingreso: portada, entrar, "¿Quién eres?" y unirse con código.
   - S2 Grupo: crear grupo, pantalla del grupo, personas y lista de planes.
   - S3 Nueva propuesta.
   - S4 El plan y su resultado: encabezado, órbita, estado, la opción, confirmar, cambios de versión y avisos.
   - S5 Mi respuesta: disponibilidad e intereses.
   - S6 Agente: panel, preferencias, agente social e invitación.
   - S7 Simulación e historial.
   Para cada pieza: dónde está, qué hace, qué se queda, qué se fusiona y qué se va.
3. `docs/rediseno/sistema.md` y el código del sistema de diseño:
   - Tokens en un archivo NUEVO, `src/estilo/sistema.css`, importado primero:
     - la tipografía Plus Jakarta Sans;
     - 4 tamaños con su uso (por ejemplo, título, subtítulo, cuerpo y nota);
     - pesos, escala de espaciado, radios, sombras y colores, con contraste AA en modo oscuro;
     - toques de 44 px como mínimo.
   - Componentes base en `src/components/ui.tsx`: Card, Boton (primario, secundario y peligro), Chip, Aviso y Encabezado de sección.
   - Un solo botón primario por pantalla.
4. Avisale al coordinador (`local_98e4e650-1136-4e42-8cf2-6108e6bb3e43`) con el commit. Lo integro y lo publico con las pruebas contra la base en verde.

### Fase 2, de las 03:00 a las 07:00: secciones en paralelo con sus dueños
Al publicar el sistema, mandá a cada dueño por SendMessage su brief de sección: qué cambia según el inventario, el objetivo de toques, los textos nuevos y las capturas de referencia.
- **friccion** (`local_33bd9a46-140e-41ab-be3f-41d8a4f3b92d`): S1 Ingreso, con excepción para `src/screens/Inicio.tsx`, y S5 Mi respuesta, con `RespuestaTab.tsx` y `friccion/Responder.tsx`. Es la especialista en pocos toques.
- **frontend** (`local_edbc1f23-98a2-483e-aa90-7601e6e6aca4`): S2 Grupo, S3 Nueva propuesta y S7 Simulación e historial.
- **ux-flujo** (`local_171f16bf-6db3-4c9e-851c-bf0988f11c38`): S4 El plan y su resultado: `Propuesta.tsx`, `PlanTab.tsx`, `components/PlanVivo.tsx`, `Orbita.tsx` y `componentes-nuevos/**`. Es la sección más importante para el jurado: el OUTPUT.
- **agente-ia** (`local_b7ae42ef-90ad-4c2d-914d-4000fe609f36`): S6 Agente, en `src/agente/**`. Ya está bajando el scroll del formulario por pedido de Nico.
Cada sección escribe sus estilos en su archivo `src/estilo/seccion-sN.css`, para no pisarse en `styles.css`. Vos sos la única que toca `sistema.css` y `ui.tsx`. Revisá cada entrega con capturas a 320, 375 y 1280 px antes de que el dueño se la pase al coordinador. Si algo no cumple el sistema, devolvelo con el detalle exacto.

### Reglas de entrega para todas las secciones
- Cada sección se entrega en su rama, sola: `wip/rediseno-sN` o la rama del dueño, con tsc, las pruebas puras (`npx vitest run src $(ls tests/*.test.ts)`) y el build en verde, y capturas a 320, 375 y 1280 px en `docs/rediseno/capturas/sN/`.
- Los guiones e2e buscan textos. Si una sección cambia un texto o el nombre accesible de un botón que un guion busca (`grep -rn` en `tests/`), actualizá el guion en la misma entrega para que acepte los dos, o avisale a su dueño (qa-noche, rincones o sinteticos) con la línea exacta.
- Contra la base, una sola corrida a la vez, con marca en la ficha y al final de la cola del TABLERO. Nunca durante una MIGRACION EN CURSO.
- Publica solo el coordinador, sección por sección, con la tanda contra la base en verde.

### Horario y red de seguridad
- 02:00–03:00: fase 1. 03:00–07:00: secciones. 07:00–09:00: arreglos y barrido visual de rincones a 320, 375, 768 y 1280 px.
- **09:00, límite duro:** la sección que no esté publicada en verde queda como está hoy. `main` antes del rediseño queda marcado con la etiqueta `demo-segura`.
- 10:00–11:00: ensayo de Nico, sin cambios salvo lo que pida. **11:00: congelamiento de la interfaz.** Entrega a las 13:00.

### Ciclo y vigía
- Monitor con `cd /Users/macair/cruse/cruce-coord && ./vigia.sh diseno 60`, con el timeout máximo. Re-armala cuando venza.
- CronCreate a los minutos 8 y 38 con este ciclo: "CICLO diseno: hora real, leer coordinación y pedidos para mí, revisar entregas de secciones con capturas, ficha al día, commit y push cada 30 min; parar a las 11:00".
