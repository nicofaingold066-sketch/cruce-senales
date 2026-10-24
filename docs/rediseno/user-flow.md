# User flow nuevo (rediseño de la noche)

Fase 1 del rediseño, sábado 24 oct 2026, 02:15–03:00. Lo escribe la sesión frontend haciendo el rol de diseno (pedido del coordinador 02:12; encargo en `prompts/rediseno-noche.md`). Reemplaza como guía de diseño a `docs/flujo-usuario.md` (del principio del hackatón), que sigue valiendo como medición de lo que hay hoy. Todo dato es ficticio.

## El principio, con las palabras de Nico

"Como Tricount: entrás, ponés tu nombre, ponés lo tuyo y chau. Después volvés y ya está todo hecho." La app tiene dos momentos y nada más: **cargar lo mío** (rápido, visual, sin que falte una opción) y **ver el resultado** (qué salió, quiénes van, qué me toca). Todo lo que no sirva a uno de esos dos momentos se pliega o se va.

Tres cosas tienen que entenderse de un vistazo en cada pantalla: **qué es importante** (el resultado), **cuál es la acción** (un solo botón primario) y **cómo salió el resultado** (qué entró, qué decidió el servidor, en qué terminó).

## Roles y momentos

| Rol | Momento | Entra con | Hace | Se va con (output) |
|---|---|---|---|---|
| Quien organiza | Armar | nombre del grupo, nombres de sus amigos | crea el grupo y una propuesta con dos fechas | el enlace para mandar por WhatsApp |
| Quien organiza | Responder | — | marca cuándo puede, igual que todos | "Respondiste" |
| Quien organiza | Cerrar | — | toca "Buscar opción compatible" cuando hay respuestas | la opción publicada y "te toca confirmar" |
| Quien organiza | Reparar | — | si alguien se baja, "Buscar alternativa" | versión nueva, confirmaciones desde cero |
| Invitado | Responder | el enlace | toca su nombre y cuándo puede | "Respondiste. Te avisamos cuando haya plan." |
| Invitado | Confirmar | abre la app (nadie lo avisa; límite declarado) | toca "Confirmar versión N" | "¡Se juntan!" con fecha, hora y quiénes |
| Cualquiera | Volver | abre la app | nada: mira | el estado del plan y, si le toca algo, UN botón |

El servidor decide cupos, plazos, elegibilidad, estado y ganador. La pantalla solo muestra y ofrece la acción que el servidor marca en `siguiente_accion`.

## Tres niveles que se ven distintos (Nico y Juan, 02:15; mockup validado 02:40)

Nico y Juan: "confundo el home con estar dentro de un grupo; no terminamos de descifrar dónde estamos". La referencia de estructura es el mockup validado (https://claude.ai/artifact/LqZBMzmLT187pv6duBpj6f, 8 pantallas) y las capturas de Tricount en `referencias/` de la rama coordinacion (como concepto, no como copia; CRUXE sigue oscuro).

| Nivel | Qué es | Cómo se reconoce sin leer | Volver | Pantallas |
|---|---|---|---|---|
| **Mi espacio** | lo mío: mis grupos, mis planes, mi perfil | fondo claro, sin escena oscura, h1 «Tus grupos», barra inferior Grupos · Planes · Perfil, el «+ Nuevo grupo» flotante | — | Home, Planes, Perfil, hoja «+» |
| **Grupo** | su gente, sus planes, el agente | escena oscura con el **ícono del grupo** (`IconoGrupo`: iniciales sobre un color propio) y el nombre grande | «‹ Tus espacios» | Pantalla del grupo, Nueva propuesta (hoja con ✕ y el nombre del grupo debajo del título) |
| **Plan** | el resultado, mi respuesta, confirmar | el nombre del grupo arriba («‹ Los del finde»), la fecha grande y UNA acción | «‹ <nombre del grupo>» | El plan y sus pestañas |

Home (Mi espacio): **solo la lista de grupos**. Sin «Tu plan»: los planes viven en la pestaña Planes. Si el servidor dice que te toca algo, UNA línea arriba («Te toca confirmar · Los del finde ›») que lleva al plan. Un «+» flotante «Nuevo grupo» abre una hoja desde abajo con «Crear un grupo» y «Unirme con un código» (desplegable), y abajo «Probar la demo». En computadora (1280) **sin scroll**: grupos a la izquierda, crear y unirme a la derecha.

Grupo: cabecera con ícono y nombre, «Invita a tu grupo» (código, Copiar, WhatsApp) en una tarjeta, «Planes» con «+ Nueva propuesta» a la derecha, la tarjeta del plan vigente con su acción, el agente compacto (lo tuyo resumido + «Que el agente proponga»), Personas, Simulación e Historial como filas. Lo mío (preferencias) vive en el agente del grupo porque son por grupo (directiva 02:17).

Scrolls (pantallas de alto a 375 × 812 y a 1280 × 800; meta de Nico: computadora sin scroll, teléfono lo mínimo). Hoy, medido en las capturas de la fase 2 (`docs/rediseno/capturas/`): grupo demo 2,5 pantallas a 375; Nueva propuesta 3 a 375 y 2 a 1280; Simulación 6 a 375. Meta: home 1 / 1; grupo ≤ 2 / 1; Nueva propuesta ≤ 2 / 1; plan ≤ 2 / 1; Mi respuesta 1 / 1; Simulación ≤ 4 / 2 (es la herramienta del demo, no la ve el jurado como usuario).

## Camino rápido (primero)

### 1. Invitado: del enlace a "respondí"

| | Toques | Pantallas |
|---|---|---|
| Hoy (visto en producción, `docs/flujo-usuario.md` §3.6) | **4**: enlace → su nombre → "Sí, soy X" → una respuesta de un toque ("Puedo los dos días" / "Solo el sábado 31 oct" / "No puedo ninguno") | ¿Quién eres? · ¿Cuándo puedes? · Respuesta guardada |
| Objetivo | **3**: enlace → su nombre → cuándo puede. La confirmación "¿Eres X?" se integra en el mismo toque cuando el nombre no está reclamado (si otra sesión ya es X, se pregunta como hoy). Piso aceptable: 4 | ¿Quién eres? · ¿Cuándo puedes? |

Después de responder, la pantalla dice una sola cosa: "Respondiste. Cuando haya un plan, lo ves acá." con el estado del grupo (N respondieron) y nada más. "Me interesa", "Contar mis gustos" y "Tomar de mi calendario" son opcionales y van abajo, chicos.

### 2. Invitado: vuelve y confirma

| | Toques |
|---|---|
| Hoy | **3**: abre la app → portada "Tu plan · Te toca confirmar" (tarjeta) → pestaña Plan → "Confirmar versión 1" |
| Objetivo | **2**: abre la app → la portada muestra el resultado y el botón "Confirmar versión 1" (o la tarjeta abre el plan con el botón arriba, a la vista sin desplazar) |

### 3. Quien organiza: del grupo al plan abierto

| | Toques | Pantallas | Campos escritos |
|---|---|---|---|
| Hoy (`docs/flujo-usuario.md` §3.1) | **21** (19 sin el tropiezo de responder después de buscar) | 5 | 7 (nombre del grupo, 5 nombres, título) |
| Objetivo | **≤ 12** | 3 | 3 (nombre del grupo, la lista pegada de una vez, título o atajo) |

Camino objetivo: Crear grupo (nombre, lista pegada, "Crear grupo": 3 toques) → **directo a Nueva propuesta** (atajo o título, "Revisar antes de crear", "Crear y abrir al grupo": 3) → responder en un toque (1) → "WhatsApp" con el enlace (1) → cuando hay respuestas, "Buscar opción compatible" (1) → "Confirmar versión 1" (1). Total: 10 toques y 3 escrituras. Lo que hoy sobra: la pantalla del grupo vacía entre crear el grupo y la propuesta, responder en el editor por franja en vez de un toque, y buscar la invitación en otra pantalla.

### 4. Quien organiza: vuelve

**2 toques**: abre la app → la portada dice qué le toca ("Ya respondieron 4: busca la opción" / "Te toca confirmar" / "Una persona se retiró: busca alternativa") → el botón.

### 5. Reparación

"Una persona se retiró" (sin nombre, enmienda 13) → el plan pasa a **En revisión** → quien organiza: "Buscar alternativa" (1 toque) → cada uno confirma la versión nueva (1 toque cada uno; nada se hereda). Si no hay alternativa: "Sin opción compatible", sin bajar el mínimo ni inventar.

## El output, a la vista

Lo que entra → lo que decide el servidor → lo que sale, en un solo bloque arriba de la pantalla del plan (S4), antes de cualquier otra cosa:

1. **Estado y resultado**: "Grupo confirmado · Sábado 31 oct, 14:00" con quiénes van (avatares con nombre) y cuántos faltan. En "Reuniendo respuestas": "4 respondieron de 6". En "En revisión": "Una persona se retiró; faltan 1 para el mínimo".
2. **Cómo salió**: la tira de cuatro pasos que ya existe (Respuestas · Opción · Confirmar · Encuentro) con el paso actual marcado, y una línea de cómo se eligió: "La opción más temprana que alcanza el mínimo" o "La que pueden más personas" (regla de la enmienda 15), siempre con lo que manda el servidor.
3. **Una acción**: el único botón primario de la pantalla, el que dice `siguiente_accion` ("Confirmar versión 1", "Buscar opción compatible", "Buscar alternativa"). Si no me toca nada, no hay botón primario: hay una frase ("Faltan 2 por confirmar. Se cierra jue 29 oct, 20:00.").

Debajo, plegado: ficha del plan, quién confirmó, historial, avisar al grupo. Lo privado nunca aparece (condiciones, preferencias, quién se retiró).

## Mapa: momento → pantalla → sección → acción primaria

| Momento | Pantalla | Sección | Acción primaria (una) |
|---|---|---|---|
| Primera vez | Portada sin sesión | S1 | "Crear un grupo" (la demo y el código, secundarias) |
| Llega por enlace | ¿Quién eres? | S1 | el nombre (lista) |
| Responder | ¿Cuándo puedes? | S5 | la respuesta de un toque |
| Armar | Crear grupo | S2 | "Crear grupo" |
| Armar | Nueva propuesta | S3 | "Crear y abrir al grupo" |
| Compartir | Pantalla del grupo | S2 | "WhatsApp" (el enlace) |
| Cerrar / Confirmar / Reparar | El plan | S4 | lo que diga `siguiente_accion` |
| Volver | Portada con sesión (= Mis planes) | S1 + S2 | la tarjeta del plan que me toca |
| Ideas | Agente | S6 | "Que el agente proponga" (quien organiza) |
| Demo | Simulación · Historial | S7 | "Cargar condiciones del caso" / "Aceptar versión N por …" |

## Objetivos de toques (resumen para medir en el ensayo)

| Tarea | Hoy | Objetivo |
|---|---|---|
| Invitado: enlace → respondí | 4 | 3 (piso 4) |
| Invitado: volver → confirmar | 3 | 2 |
| Organizador: crear grupo → plan abierto | 21 (19) | ≤ 12 |
| Organizador: volver → la acción que toca | 3 | 2 |
| Reparar tras una baja (organizador) | 2 | 2 |

Se miden con `tests/e2e/toques-invitacion.mjs` (qa-noche) y los recorridos de sinteticos; cada sección anota su cuenta en la entrega.

## Qué cambia en cada sección (resumen para los briefs; el detalle está en `inventario.md`)

- **S1 Ingreso (friccion):** una sola portada (la de sesión nueva y la de sesión con grupos se fusionan); "Tengo un código" una sola vez; ¿Quién eres? con la confirmación integrada cuando se puede; sin entrada animada.
- **S2 Grupo (frontend):** crear grupo → directo a Nueva propuesta; pantalla del grupo con el enlace arriba (es el output de quien organiza), propuestas y personas, el agente a la vista; Mis planes es la misma lista que la portada.
- **S3 Nueva propuesta (frontend):** un formulario que se lee de arriba abajo, con los valores ya puestos; la revisión como resumen corto; "Crear solo el borrador" se va.
- **S4 El plan (ux-flujo):** el bloque de resultado arriba, una acción, el resto plegado; avisos apilados → uno.
- **S5 Mi respuesta (friccion):** los botones de un toque arriba, el detalle por franja plegado, "Me interesa" opcional y chico, retiro al final.
- **S6 Agente (agente-ia):** el botón del agente arriba y las preferencias plegadas; sin pasos técnicos a la vista ("Comprobar servicio").
- **S7 Simulación e historial (frontend):** tarjetas compactas sin desborde a 320 px, "Se baja" solo con versión publicada, historial agrupado por versión.
