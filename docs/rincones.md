# Rincones de CRUXE: inventario, veredictos y pedidos

Sesión `rincones` (equipo de la noche). Qué se revisa: cada pantalla, estado, pestaña, mensaje y botón, en 320, 375, 768 y 1280 px, en el demo y en un grupo real nuevo.
Última actualización: sábado 24 oct, 00:45 (build = `main` 40ffb66) (corrida 4 sobre `main` = `wip/fundamentos` = `3ace04e`: `f0`–`f2` corridas; en pausa automática desde 21:01 por la migración de la enmienda 13) (reloj de Santiago). Build revisado: `main` = `61e7da6` (sin cambios de `src/` desde entonces), contra la base real, con el build propio en `localhost:4187`.

## Resumen (se rehace a las 08:00)
Todavía en curso: 130 de ~140 rincones recorridos. Hasta ahora: **ROTO 0**, **OBSERVADO 16**, de los cuales **2 ya APROBADOS** en `main` 3ace04e (O-06 y O-08, corrida 4 `f0` 20:55) y 3 por confirmar en la misma corrida (O-02, O-12b, O-13) (ninguno impide completar el recorrido canónico), el resto APROBADO.
Los que más importan para la demo hasta ahora (todos OBSERVADOS, de forma, no de función):
1. **O-01** Cabecera a 320 px: el avatar de la sesión tapa el chip "Datos ficticios" en TODAS las pantallas con nombre.
2. **O-02** Entrada por enlace en un navegador que ya es miembro: "¿Quién eres?" lo muestra "no disponible" y dice "Ya no queda ningún nombre libre", sin "Seguir como X".
3. **O-03** Con teclado, el foco puede quedar bajo la barra inferior (portada con plan, tarjetas al pie).
4. **O-04** Portada con nombre: "Tengo un código de invitación" y el formulario "Unirme con un código" están los dos a la vista (duplicado).
5. **O-05** "confirmación(es)" en la tarjeta de versión en revisión ("Conserva 1 confirmación(es) de 2").

## Cómo se revisa
- Guiones Playwright en `tests/rincones/` (`f0` a `f6`, biblioteca `lib.mjs`). Cada guion crea su propio grupo ("Rincones hh:mm") con 4 a 5 sesiones anónimas distintas (una por persona) y su propio demo. No toca el demo de otros ni lo reinicia.
- Cada rincón se captura en 320/375/768/1280 (inicio y página entera) en `/Users/macair/cruse/rincones-capturas/<corrida>/<id>-<ancho>.png` (fuera del repo, por peso).
- Auditoría automática en cada rincón y ancho: desborde horizontal, controles sin nombre accesible, texto cortado, contraste aproximado, fuente < 11 px, objetivos táctiles < 36 px, cabecera encimada, último control tapado por la barra fija, errores de consola/página/red, y foco con Tab (anillo visible y no tapado). Ver `lib.mjs`.
- Columna "Rev.": `ojo` = miré la captura (375 como mínimo); `auto` = solo auditoría automática y lectura del texto.
- Veredicto: APROBADO, OBSERVADO (funciona pero confunde, se corta, texto raro, contraste o foco), ROTO (no anda, error JS, botón sin efecto, texto encimado).

## Observaciones (O-xx) y a quién se piden
| Id | Veredicto | Dónde | Paso exacto | Captura | Dueño |
|---|---|---|---|---|---|
| O-01 | OBSERVADO | Cabecera, todas las pantallas con sesión nombrada, **320 px** | Entrar con un nombre y abrir cualquier pantalla a 320 px: el avatar ("RO") se superpone 26 px sobre "Datos ficticios" y lo corta | `202610231931/R25-320.png` | front-juan |
| O-02 | OBSERVADO | `#/unirse/<código>` en un navegador que ya es miembro | Entrar como Dani por el enlace; volver a abrir el mismo enlace: lista con todos "no disponible", "Ya no queda ningún nombre libre en la lista"; no hay "Seguir como Dani" | `202610231950/R123-375.png` | friccion — **CORREGIDO en `wip/friccion` (20:03, verificado con un miembro que entró por formulario: "Seguir como Mica"); pendiente de integrar a `main`** |
| O-03 | OBSERVADO | Foco con teclado, portada con plan y tarjetas al pie (375) | Tab hasta "Tengo un código de invitación" o la tarjeta del plan: el foco queda bajo `.nav-inferior` (falta `scroll-padding-bottom`) | `202610231944/R80-375.png` | front-juan |
| O-04 | OBSERVADO | Portada con nombre | "Tengo un código de invitación" (tarjeta) y "Unirme con un código" (formulario) aparecen a la vez, repetidos | `202610231944/R80-375.png` | front-juan |
| O-05 | OBSERVADO | Plan en revisión, tarjeta "Versión 1 (en revisión, no confirmada)" | Texto "Conserva 1 confirmación(es) de 2 necesarias" | `202610231941/R63-375.png` | front-juan |
| O-06 | OBSERVADO | `#/e/<id que no es uuid>` | Pantalla "Falla temporal. Intenta de nuevo. Reintentar" (el servidor responde 400); reintentar nunca va a andar. Un id mal escrito no es una falla temporal | `202610231928/R07b-375.png` | friccion — **CORREGIDO en `wip/friccion` `05e148d`/`dc26ba4` (20:00): "Este enlace no lleva a ningún grupo". **APROBADO en `main` 3ace04e (corrida 4, `f0`, 20:55)** |
| O-07 | OBSERVADO (leve) | Avatares con iniciales (todas las pantallas) | Texto de 10,4 px y contraste 3,0–3,6:1 en "AN", "BE", "CA" | `202610231931/R25-375.png` | front-juan |
| O-08 | OBSERVADO (leve) | `#/unirse/<código inexistente>` | El título dice "Te invitaron a un plan · Elige tu nombre" aunque el código no existe; el error está arriba y el resto sigue como si sirviera | `202610231928/R04-375.png` | friccion — **CORREGIDO en `wip/friccion` `05e148d`: "Esta invitación no existe". **APROBADO en `main` 3ace04e (corrida 4, `f0`, 20:55)** |
| O-09 | OBSERVADO (leve) | Propuesta cancelada | "Cancelado" dos veces seguidas (tarjeta de estado y aviso) | `202610231944/R89-375.png` | front-juan |
| O-10 | OBSERVADO | Nueva propuesta, "No puede faltar" | Con integrantes que todavía no entraron ("por entrar"), la lista los ofrece igual que a los demás y no avisa que, si el elegido no entra, no se puede publicar una opción (R141/R143/R144) | `202610231956/R141-375.png` | front-juan |
| O-11 | OBSERVADO | Agente del círculo, resultado en un grupo real | Voseo ("Elegís vos", "completás") en una app que tutea; la opción "Asado · Quincho de Tomi" y los lugares marcados "SIMULACIÓN" aparecen en un grupo que no es el demo | `202610231958/R154-375.png` | agente-ia |
| O-12 | OBSERVADO (leve) | Avisos repetidos | (a) Sin red en un plan: banner global + banner "Sin conexión" del plan + error del botón (R161); (b) contrato incompatible: "Versión incompatible" arriba y "No se pudo completar · Versión incompatible" debajo (R170); (c) "Hoy paso" aparece deshabilitado sin explicación mientras no se marque "Me interesa" (R162) | `202610232002/R161-375.png`, `202610232004/R170-375.png` | front-juan (a, c) / friccion (b) |
| O-13 | OBSERVADO (leve) | Falla al iniciar la sesión anónima | El texto dice "el inicio de sesión anónimo puede estar deshabilitado en el proyecto": lenguaje técnico para una persona que solo abrió el enlace (R173) | `202610232004/R173-375.png` | friccion |
| O-14 | OBSERVADO | Demo, pestaña Simulación a **320 px** | (a) La pestaña "Simulación" se sale de la pantalla (262–360 de 320); (b) en cada persona simulada la etiqueta "SIMULACIÓN" queda tapada por la insignia "Sin versión publicada" ("SIMUL…") | `202610231946/R104-320.png` | front-juan |
| O-16 | OBSERVADO (decisión) | Chip "Datos ficticios" del encabezado | Aparece en TODAS las pantallas, también en un grupo real con personas de verdad (`App.tsx:85`, fricción 19 de `docs/flujo-usuario.md`); un grupo real podría leerlo como "esto no vale". Y a 320 px lo pisa el avatar (O-01) | `202610231931/R25-320.png` | **Decidido (21:10, ux-flujo `603678e`, tabla #102 H3): el chip se queda.** Cerrado como aceptado; lo único que sigue abierto es O-01 (a 320 px lo pisa el avatar) |

## Accesibilidad a fondo (método, `tests/rincones/a11y.mjs`; se aplica a la demo en `f12`)
Rincones de la demo en el orden del jurado, en 320, 375 y 1280 px. Por rincón:
- **Lector de pantalla:** se guarda el árbol accesible (`<id>-aria.yml`: lo que un lector anuncia) y se revisa `lang`, `<title>`, un solo `h1` y sin saltos de nivel, regiones, nombre accesible de cada control, etiquetas de campos (no solo placeholder), grupos de opciones con nombre, pestañas con panel real, nada enfocable dentro de `aria-hidden`, imágenes con nombre, ids repetidos.
- **Anuncios:** tras cada acción ("Guardado…", "Te toca confirmar…", "Respuesta guardada") se comprueba que el texto esté en una región viva (`aria-live`, `status`, `alert`) o reciba el foco; si no, el lector se queda mudo.
- **Teclado:** recorrido completo con Tab: primera parada "Saltar al contenido", indicador visible en cada parada (se compara el estilo con y sin foco), que lo enfocado no quede bajo la barra superior ni la inferior, y dónde queda el foco al cambiar de pantalla.
- **Contraste:** medido sobre los píxeles de la captura (vale con degradés y transparencias): 4,5:1, o 3:1 en texto grande; placeholders incluidos.
- **Tamaño de objetivo:** 24×24 (WCAG 2.5.8) con la excepción de espaciado.
- **320 px y espaciado (WCAG 1.4.12):** texto que se corta al forzar interlineado 1,5, letras 0,12 em y palabras 0,16 em.
- **Movimiento reducido:** con `prefers-reduced-motion` la entrada, la órbita y el confeti deben quedarse quietos.
Autoprueba del módulo: `node tests/rincones/prueba-a11y/correr.mjs` (página local con fallas sembradas; las detecta todas, sin tocar la base).

## Inventario de rincones
(Estado: A = APROBADO, O = OBSERVADO, R = ROTO, — = pendiente de recorrer.)

### Sin grupo (`f0`, corrida 19:28)
| Id | Rincón | Ruta | Rev. | Estado | Nota |
|---|---|---|---|---|---|
| R00 | Entrada animada (Intro) | `#/` primera visita | ojo | A | 2,9 s, se salta con un toque |
| R01 | Portada, sesión anónima nueva, sin nombre | `#/` | ojo | A | |
| R02 | Portada: nombre vacío o de 60 caracteres | `#/` | auto | A | Entrar deshabilitado; el campo corta en 30 |
| R03 | Portada: código inexistente | `#/` | ojo | A | "El código de invitación no existe", campo en rojo |
| R04 | Enlace con código inexistente | `#/unirse/ZZZZ9999` | ojo | **A desde 20:55** (O-08 corregido por friccion) | "Esta invitación no existe. Revisa que el enlace esté completo o pide uno nuevo…" |
| R05 | Enlace mal copiado (`%`, 2 caracteres) | `#/unirse/%` | auto | A | Aviso "Ese enlace de invitación no es válido" y portada |
| R06 | Ruta desconocida | `#/cosa-rara/x/y` | auto | A | Cae en la portada |
| R07 | Espacio inexistente (uuid válido) | `#/e/0000…` | ojo | A | "No perteneces a este espacio o el elemento no existe" + "Volver a tus espacios" |
| R07b | Espacio con id que no es uuid | `#/e/no-es-uuid` | ojo | **A desde 20:55** (O-06 corregido por friccion) | "Este enlace no lleva a ningún grupo… Ir a tus espacios" |
| R08 | Propuesta inexistente | `#/e/<uuid>/p/<uuid>` | auto | A | |
| R09 | Nueva propuesta en espacio inexistente | `#/e/<uuid>/nueva` | auto | A | |
| R10 | Planes sin grupos | `#/planes` | auto | A | "Todavía no hay planes" |
| R11 | Perfil sin nombre | `#/perfil` | ojo | A | |
| R12 | Crear grupo, sin nombre local | `#/crear` | auto | A | |
| R13 | `#/entrar` | `#/entrar` | auto | A | Muestra la portada |
| R14 | Portada sin conexión | `#/` offline | ojo | A | Aviso "Sin conexión"; el nombre se guarda local; el aviso desaparece al volver la red |

### Organizador, grupo nuevo (`f1`, 19:31)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R20 | Portada con nombre y sin grupos | auto | O (O-03) |
| R21 | Planes vacío con nombre | auto | A |
| R22 | Perfil con nombre, sin grupos | auto | A |
| R23 | Crear grupo: precargado con el nombre local; "Crear grupo" deshabilitado sin nombre | auto | A |
| R24 | Crear grupo con 3 integrantes; duplicado ("Ana") se ignora con aviso; nombre propio se rechaza con aviso | auto | A |
| R25 | Espacio recién creado (aviso, código, 4 personas "por entrar", sin propuestas) | ojo | A (O-01 a 320) |
| R26 | Código tras "Copiar" ("¡Listo!", "Copiado.") | auto | A |
| R27 | Agente del círculo abierto, organizador sin preferencias | auto | A |
| R30 | Nueva propuesta, paso 1 | ojo | A |
| R31 | Nueva propuesta: revisar sin título (error arriba, campo en rojo) | ojo | A |
| R32 | Nueva propuesta, paso 2 (revisar y crear) | auto | A |
| R33 | Propuesta en BORRADOR, pestaña Plan | auto | A |
| R34 | Borrador, Mi respuesta (aún no se puede responder) | auto | A |
| R35 | Borrador, Historial | auto | A |
| R36 | Propuesta abierta, una sola persona | auto | A |

### Invitados y propuesta de punta a punta (`f2` 19:33, `f3` 19:36, `f3b` 19:41)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R40 | Invitación: "¿Quién eres?" con la lista del organizador | auto | A |
| R41 | Invitación: "¿Eres Ana?" | auto | A |
| R42 | Espacio visto por una invitada | auto | A |
| R43 | Propuesta abierta, vista de invitada | auto | A |
| R44 | Mi respuesta sin marcar (todo Pendiente) | auto | A |
| R45 | Solo franja A guardada ("Incompletas") | auto | A |
| R46 | A sí, B no, guardado | ojo | A |
| R47 | "Me interesa" marcado | auto | A |
| R49 | Plan con condiciones de todos: "Busca una opción compatible" | auto | A |
| R50 | Opción v1 publicada (organizador, "Te toca confirmar") | ojo | A |
| R51 | v1: Ana (elegible) | auto | A |
| R52 | v1: Beto (no elegible), "Falta la aceptación de…" | auto | A |
| R53/R54 | v1: Mi respuesta de Beto; Historial con la versión | auto | A |
| R55 | Ana confirmó v1 ("Falta 1 para el mínimo") | auto | A |
| R56 | GRUPO CONFIRMADO v1, organizador (¡Se juntan!, Calendario, WhatsApp) | ojo | A |
| R57/R58 | Confirmado v1: Ana; Caro (no entró en v1) | auto | A |
| R59 | Botón Calendario descarga `cruxe-plan.ics` | auto | A |
| R60/R61 | Mi respuesta de Ana confirmada; "¿Retirarte definitivamente?" con "Sí, no voy" / "Volver" (Volver restituye el botón) | auto | A |
| R62 | Tras bajarse: Ana ve "En revisión" | auto | A |
| R63 | EN REVISIÓN, organizador (Buscar alternativa) | ojo | O (O-05) |
| R64 | EN REVISIÓN, otro miembro | auto | A |
| R65 | v2 publicada: comparación "versión 1 → versión 2", sin confirmaciones heredadas | ojo | A |
| R66 | v2: Beto (ahora elegible) | auto | A |
| R67 | v2: Ana (se bajó; no puede volver, "Quien se baja no vuelve a ser elegible") | auto | A |
| R68–R70 | v2 confirmada por Beto, Caro y el organizador; GRUPO CONFIRMADO v2 (3 se juntan) | auto | A |

### Listas, sin opción, cancelada (`f4`, 19:44)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R80 | Portada con grupo y "Tu plan" | ojo | O (O-03, O-04) |
| R81 | Planes con un plan confirmado | auto | A |
| R82 | Perfil con un grupo | auto | A |
| R83 | Espacio con la lista de propuestas ("Cargando propuestas…" durante ~3 s al entrar) | auto | A |
| R84 | Segunda propuesta recién abierta | auto | A |
| R85 | Organizador cargó "No puedo" en todo | auto | A |
| R87 | SIN OPCIÓN compatible ("Volver a buscar opción", motivo sin revelar condiciones) | ojo | A |
| R88 | Confirmación de "Cancelar propuesta" | auto | A |
| R89 | Propuesta CANCELADA, organizador | ojo | A (O-09) |
| R90/R91 | Cancelada vista de invitada; Planes de invitada | auto | A |
| R92 | Espacio con propuesta confirmada y propuesta cancelada | auto | A |

### Demo "Los del asado" (`f5` 19:46, `f5b` 19:49; sesión propia, sin reset)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R100 | Demo recién abierto (Tomi organiza, 5 simulados) | ojo | A |
| R101 | Herramientas del organizador | auto | A |
| R102 | Nueva propuesta precargada con el caso | auto | A |
| R103 | Propuesta abierta | auto | A |
| R104/R105 | Pestaña Simulación; tras "Cargar condiciones del caso" ("Ya hay 5 personas con condiciones") | ojo | A en 375/768/1280; O (O-14) en 320 |
| R106/R107 | Tomi carga condiciones; v1 publicada (0/4) | auto | A |
| R108 | Simulación tras "Aceptar versión 1 por…" (3/4) | ojo | A |
| R109a | "¿Dar de baja a Luna?" pide confirmación | auto | A |
| R109 | Baja simulada de una confirmada: "En revisión" | auto | A |
| R110/R111 | Segunda baja; "Buscar alternativa" sin resultado: "Sin opción compatible: no hay alternativa. El organizador puede cancelar" | auto | A |
| R112 | Historial con acciones marcadas "Simulación" | auto | A |
| R113 | Agente del círculo abierto, sin llamarlo | auto | A |

### Variantes de entrada (`f6`, 19:50)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R120 | "No estoy en la lista": todos los nombres "no disponible" | ojo | A |
| R121 | Nombre en uso ("Ese nombre ya está en uso en este espacio.", campo en rojo) | ojo | A |
| R122 | Espacio de quien entró escribiendo su nombre | auto | A |
| R123 | Enlace abierto por un navegador que YA es miembro | ojo | O (O-02) |
| R125 | Perfil: guardar nombre nuevo | auto | A |
| R126 | Espacio visto por un invitado con propuesta confirmada y cancelada | auto | A |
| R127 | Invitación al demo (personas simuladas con actividad → "no disponible") | auto | A |

### Grupo B con integrantes pendientes y agente (`f7` 19:56, `f8` 19:58)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R140 | Grupo B: 3 personas, 2 "por entrar" | auto | A |
| R141 | Nueva propuesta: imprescindible pendiente (Zoe) elegida | ojo | O (O-10) |
| R142 | Nueva propuesta: cierre con "Elegir" | auto | A |
| R143/R144 | Paso 2 y propuesta con imprescindible que aún no entró | auto | O (O-10) |
| R145/R146 | Invitación al grupo B (Zoe y Lalo libres) y Zoe dentro | auto | A |
| R150/R151 | Agente: preferencias de una invitada, guardadas ("Guardado. Nadie más ve tus preferencias.") | auto | A |
| R152 | Agente: preferencias del organizador, botón "Que el agente proponga" | auto | A |
| R153 | "El agente está pensando…" | auto | A |
| R154 | Agente: 3 opciones, recomendada, título editable, mensaje para el grupo, "Usar esta opción" (una sola llamada) | ojo | O (O-11) |
| R155 | Nueva propuesta precargada desde el agente ("Borrador del agente") | auto | A |

### Sin red, fallas y límites (`f9` 20:02, `f10` 20:04; la falla se inyecta en el navegador, no en la base)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R160 | Mi respuesta con la red cortada (banner global) | auto | A |
| R161 | Guardar condiciones SIN red: "Sin conexión con el servidor. La acción no quedó registrada. Lo que escribiste se conserva", botón y "Descartar cambios" | ojo | A (O-12) |
| R162 | Vuelve la red: reintentar guarda ("Completas", "Guardado") | ojo | A (O-12c) |
| R164/R165 | Nueva propuesta con título de 100+ caracteres (se corta a 80) y cupos cambiados | auto | A |
| R166 | Perfil: "Entrar como otra persona" | auto | A |
| R170 | Contrato incompatible: "Recargar la aplicación", acciones bloqueadas | ojo | A (O-12b) |
| R171 | 500 al abrir un espacio: "Falla temporal. Intenta de nuevo." + Reintentar (sana al reintentar) | auto | A |
| R172 | Respuesta lenta: "Cargando el espacio…" con esqueleto | auto | A |
| R173 | No se pudo iniciar la sesión anónima: Reintentar | ojo | O (O-13) |

### Respuesta en un paso (#88) y chip Datos ficticios (`f11` 20:43 sobre `main` 7f2423e; se repite en la corrida 4 sobre 3ace04e)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R200 | Invitación con la lista de integrantes y una propuesta ya abierta | auto | A |
| R201 | "¿Cuándo puedes?" en un paso: "Puedo los dos días", "Solo el sábado 31 oct", "Solo el domingo 1 nov", "No puedo ninguno", "Todavía no sé: ver el plan"; dice que es privado y que responder no es confirmar | ojo | A |
| R202 | Tras tocar una opción: "Respuesta guardada", "¿Avisar al grupo que te interesa?" (opcional), "Ver el plan", "Cambiar mi respuesta", "Contar mis gustos y presupuesto" | ojo | A (320 y 375 bien) |
| R203 | Calendario simulado "Tomar de mi calendario (Simulación)" en Responder (solo demo) | — | pendiente (`f12`) |
| R230 | Chip "Datos ficticios" en el encabezado | ojo | A como producto (O-16 decidido: se queda); O-01 sigue a 320 px |

### Por llegar: enmienda 13, modalidad de la invitación y "¿Qué guarda CRUXE de mí?" (filas reservadas; se recorren cuando estén en `main`)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R240 | Mi respuesta: "Así no puedo, pero sigo" junto a confirmar (opinar sin bajarse, E13-a); después puede volver a cargar disponibilidad y confirmar | auto (banco sin base) | **componente A** (`AsiNoPuedo`, banco `enmienda13.html`, 320/375: marca, "Guardado.", el lector anuncia "Marcaste…" por foco, llama a `opinar` con el intento); **sin conectar** a Mi respuesta en `main` 140cdaf (lo conecta front-juan); falta recorrerlo con la base |
| R241 | Plan del organizador: "Rearmar con lo nuevo" desde esperando compromisos ("Algunos no pueden así…"), versión N+1 sin aceptaciones; tope de 3 versiones | — | pendiente |
| R242 | Baja sin nombre en historial, eventos y "siguiente acción" de otros ("Una persona se retiró"); a quien se retira: "Gracias por avisar. No hace falta contar por qué." | — | pendiente |
| R243 | Agente: "Parrilla del parque (Simulación)" como candidata de asado en lugar neutro | — | pendiente |
| R244 | Invitación con modalidad (quién viene: solo el grupo / con parejas / abierta): `CampoQuienViene` en el banco (4 opciones, el título del grupo lleva "· solo el grupo" / "· con parejas" / "· abierta" y la invitación dice la regla); `QuienEres` ya la usa para mostrar el nombre sin el sufijo | auto (banco) | componente A; falta ver la pantalla de crear grupo con el campo |
| R245 | Plegable "¿Qué guarda CRUXE de mí?" en "¿Quién eres?" y "¿Cuándo puedes?" (ya en `main` 140cdaf: `QuienEres.tsx` y `Responder.tsx`) | — | por recorrer en la corrida 4b/5 |
| R246 | Calendario `.ics` con dos recordatorios (víspera y 2 h antes) y líneas plegadas a 75 octetos (`compartir.ts`): abrirlo en un calendario real | — | pendiente (solo se puede mirar el archivo) |

### Piezas de ux-flujo, galería sin red ni base (`galeria-ux.mjs` sobre `wip/ux` 3013850, 21:27; build propio en 4199)
26 casos de `AvisoParaMi`, `RecordarFaltan` (4 motivos), `RearmarConLoNuevo` (con tope y errores), `AyudaRetiro` (4 momentos) y `BuscarLugar`, en 320 y 375 px, con auditoría visual y de accesibilidad. Texto completo de cada caso y de cada enlace en `galeria-texto.md` de la carpeta de capturas.
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| G01 | `AvisoParaMi` (9 casos): tono sin nombres ("Una persona se retiró"), "Esta versión no te incluye", "Si no llegan 4, nadie queda comprometido", "Así no puedes, pero sigues", "Gracias por avisar. No hace falta contar por qué." | ojo (320 y 375) | A |
| G02 | `RecordarFaltan` (4 motivos): mensaje al grupo sin nombres ni cantidades; enlaces `wa.me` con `rel="noopener noreferrer"`; "Copiar mensaje" | ojo | A |
| G03 | `RearmarConLoNuevo`: 2 y 3 "así no puedo", tope ("Ya van tres versiones"), 1 persona no dibuja nada (no delata), sin otra fecha, cambiaron las respuestas | ojo | A |
| G04 | `AyudaRetiro` (4 momentos): textos distintos antes de la opción, con y sin enmienda 13, ya confirmó ("sin decir quién") | ojo | A |
| G05 | `BuscarLugar`: abre Google Maps con el nombre del plan, "CRUXE no sabe desde dónde sales"; en el demo no dibuja nada | ojo | A |
Observaciones (ninguna rompe nada): (1) el caso "Organizador a menos de 36 h del cierre, con pendientes" sale vacío hoy porque el cierre fijo de la galería está a 7 días; para verlo hay que acercar la fecha (es un límite de la galería, no del componente); (2) `RearmarConLoNuevo` usa el id fijo `rearmar-titulo`: si dos aparecieran a la vez se repetiría (en la app hay uno solo; con `useId` quedaría a salvo); (3) los botones de estas piezas miden 52 px de alto en teléfono: bien para el pulgar. Accesibilidad: sin otras fallas (la galería no tiene `<main>` ni cabecera porque es una página de prueba).

### Enmienda 14: propósito del grupo (la última función nueva; filas reservadas, se recorren cuando esté en `main`)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R250 | Crear grupo: elegir el propósito (libre, una familia o una actividad); el valor por defecto es "libre" | — | pendiente |
| R251 | Nueva propuesta en un grupo con propósito: solo actividades de esa familia; qué pasa al elegir otra ("Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.") | — | pendiente |
| R252 | Grupo en modo libre: igual que hoy (cualquier propuesta) y el demo "Los del asado" sigue libre | — | pendiente |
| R253 | "¿Quién eres?" e invitación muestran el propósito del grupo (`preview_space_by_code`) | — | pendiente |
| R254 | Agente restringido a la familia del grupo y "propón parecidas" cuando no hay quórum | — | pendiente |
| R255 | Regresión de mis guiones: `f1`, `f4`, `f7` y `f11` crean propuestas sin actividad; en un grupo con propósito fallarían ("campo_faltante"). Los grupos de rincones se crean en modo libre salvo `f13` | — | adaptar al llegar |

Observación del banco de friccion (O-17, leve, a friccion): tras marcar "Así no puedo", el botón de deshacer dice "Ya no: puedo así", que se lee como doble negación; algo como "Ya puedo así" o "Volver a «puedo»" se entiende de una.

### Agente social (enmienda 11, `main` 40ffb66; se recorre cuando haya turno: `f8` y las pruebas reales de agente-ia)
| Id | Rincón | Rev. | Estado |
|---|---|---|---|
| R410 | Panel del agente: "Invitaciones del agente" (casilla de permiso, "Guardar", "Comprobar permiso de invitaciones") | — | pendiente |
| R411 | `AgenteSocial`: revisión humana del borrador exacto antes de invitar (aprobar o descartar) | — | pendiente |
| R412 | `InvitacionAgente`: invitación personal del agente que recibe una persona | — | pendiente |
| R413 | El agente social con el permiso apagado o sin conexión: mensajes y que no invite a nadie | — | pendiente |

## Pendiente de recorrer
"Entrar como otra persona" confirmado, reclamar un lugar simulado libre del demo, "Hoy paso" ya marcado, plazo vencido (expirado), cierre elegido a mano con fecha pasada, y los cuatro anchos de cada rincón mirados a ojo (hoy `auto` en varios). Se repite lo afectado tras cada publicación en `main`.
