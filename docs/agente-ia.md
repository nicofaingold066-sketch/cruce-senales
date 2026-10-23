# El agente del círculo (CRUXE)

Dueño: agente-ia. Estado al viernes 23 oct 2026: **construido, integrado y probado sin clave de IA.** La función `agente` está desplegada en Supabase (v4, commit `05b2c46`) y la pantalla está en `wip/fundamentos`.

**En una frase:** el agente lee los gustos de todo el grupo, mira el clima y propone hasta 3 planes que le sirven a todos. Propone, pero no decide por nadie y nunca ve lo que puso cada uno.

## 1. Cómo funciona
1. **Cada integrante carga sus preferencias, en privado,** con opciones cerradas: presupuesto, energía, ambiente, si prefiere techo y qué le gustaría (asado, pádel, fútbol, parque, fiesta). No hay texto libre ni datos de salud o de dinero.
2. **El organizador toca "Que el agente proponga"** y elige el fin de semana.
3. **El servidor (Postgres) elige con reglas fijas.** Lee las preferencias de todos y descarta lo que no le sirve a alguien: precio por encima del presupuesto más bajo, o aire libre si llueve y alguien pidió techo. Después ordena por gustos, ritmo, ambiente y clima. Devuelve hasta 3 **candidatas** y un **perfil del grupo** hecho solo de totales.
4. **La IA coordina** (si hay clave). Con un carácter comprensivo, empático, amable, ejecutivo y de buen coordinador, elige una de las candidatas y escribe el porqué y un mensaje para invitar al grupo. Nunca recibe datos de una persona.
5. **El organizador decide.** Ve todas las candidatas con la recomendada destacada, puede editar el título y elige con "Usar esta opción". Eso solo precarga "Nueva propuesta". Desde ahí sigue el recorrido de siempre: condiciones, confirmación, baja y reparación. El agente **no crea, no invita y no confirma nada.**

## 2. Qué ve cada uno
| Quién | Ve | No ve nunca |
|---|---|---|
| Cada integrante | Sus propias preferencias | Las de los demás |
| Organizador | Candidatas, clima y perfil del grupo solo con totales ("Asado 4 de 5"), y nunca el presupuesto | Lo que eligió cada uno |
| Servidor (Postgres) | Todas las preferencias, para descartar y ordenar | — |
| Modelo de IA | Las candidatas sin nombres de integrantes, el clima y los totales del grupo | Nombres, ids y preferencias individuales |

Para que no se pueda adivinar quién eligió qué:
- con 3 personas o menos, el perfil del grupo trae solo la cantidad de personas;
- una actividad que eligió una sola persona no se muestra ni se le manda al modelo;
- "es lo que más eligieron" solo se dice con 4 personas o más y si la actividad la eligieron 2 o más;
- el presupuesto del grupo no sale de la función ni de la pantalla, y tampoco se le manda al modelo. La base deja de mandarlo con la enmienda 7 (E7.4); hasta entonces, la función y la pantalla lo descartan;
- el modelo no puede escribir palabras sobre presupuesto ("gratis", "barato", "económico").

Revisión completa y límites declarados: `docs/agente-revision-privacidad.md` y `docs/contrato-enmienda-7.md`.

**Límite honesto:** el plan elegido también informa algo. Si sale un plan gratis, el grupo sabe que alguien lo pidió. **No se promete ausencia total de inferencia en grupos chicos.**

## 3. Real y simulado
| Pieza | Estado |
|---|---|
| Preferencias privadas, reglas de elección, candidatas y perfil del grupo | **Real**, con datos ficticios |
| Clima | **Real** (pronóstico de Santiago de Open-Meteo, sin clave). En el espacio demo se puede elegir "Simular sol" o "Simular lluvia"; la pantalla lo rotula como clima de prueba y la función solo lo acepta si el servidor confirma que el espacio es demo |
| Elección y redacción de la IA | **Construida, sin probar con el modelo real:** falta la clave de Anthropic. Sin clave sale siempre la primera candidata con texto fijo, y la pantalla lo dice ("Texto fijo") |
| Canchas, lugares y eventos | **Simulados**, con el rótulo "Simulación": catálogo ficticio de 5 entradas |
| Compartir por WhatsApp | **Real:** un enlace `wa.me` con el mensaje y el enlace de invitación. La persona decide si lo manda |
| Búsqueda de eventos en internet, reservas, pagos | **Fuera** de este corte |

## 4. Cómo verificarlo
**En la app** (https://cruce-senales.vercel.app; evidencia en la sección 8):
1. "Probar la demo «Los del asado»" → abrir "Agente del círculo (opcional)".
2. Cargar las preferencias de Tomi y guardar: "Guardado. Nadie más ve tus preferencias."
3. Elegir "Simular sol" → "Que el agente proponga": aparecen 3 opciones (asado, fútbol y parque), el asado como "Recomendada" y el perfil del grupo sin actividades de una sola persona.
4. Elegir "Simular lluvia": queda solo el asado, porque alguien pidió techo.
5. "Usar esta opción" → "Nueva propuesta" llega con el título y las dos franjas precargados, y un aviso de que el agente no crea ni confirma nada.

**Lógica de la función, sin red, sin base y sin modelo** (14 pruebas: validación de textos, nombres fuera del catálogo, lo que recibe el modelo, filtro de mínimo 2 personas, clima simulado solo en demo, pronóstico y salida del modelo):
- `node --test "supabase/functions/agente/*.test.ts"` (Node 24, sin dependencias).

**Con pruebas automáticas, contra la base real:**
- `npx vitest run tests/backend/enmienda4.test.ts`: privacidad, semilla, candidatas, rol, presupuesto, lista permitida y reinicio.
- `npx vitest run tests/backend/enmienda5.test.ts`: preferencias simuladas para las variantes del jurado.

## 5. Dónde está
| Pieza | Ruta |
|---|---|
| Función del servidor (clima, candidatas, IA, validación) | `supabase/functions/agente/index.ts`; la lógica pura y sus pruebas en `logica.ts` y `logica.test.ts` |
| Pantalla (preferencias, propuesta, opciones, WhatsApp) | `src/agente/AgentePanel.tsx`, `src/agente/api.ts`, `src/agente/agente.css` |
| Base: tablas `cruce.preferencias` y `cruce.catalogo_agente`; RPC `save_my_preferences`, `get_my_preferences`, `proponer_plan_borrador` y `simulate_save_preferences` | `supabase/migrations/0014` a `0016`, `0019`, `0020` y `0023` (gustos de una sola persona) |
| Contrato | `docs/contrato-enmienda-4.md` (con la 4.1) y `docs/contrato-enmienda-5.md` |

## 6. Cómo se cuida la demo
- **Tiempos límite:** 10 s para la función y 8 s para el respaldo, que llama directo a la base si la función no responde.
- **Errores claros,** siempre con "Crear la propuesta a mano" y con "Reintentar" cuando sirve. Si el panel falla, el resto del espacio sigue funcionando.
- **Accesible en el teléfono:** toques de 44 px, anuncios para lector de pantalla y el foco en "Reintentar" después de un error. Probado a 375 px.
- **Validación de lo que escribe la IA:** largo máximo; sin nombres de integrantes; sin palabras que aludan a la situación de alguien ("plata", "salud", "alguien") ni a cosas que no pasaron ("confirmado", "reservado"). El id elegido tiene que estar entre las candidatas. Si algo no pasa la validación, va el texto fijo.

## 7. Lo que falta
- **Clave de Anthropic.** La crea Nico con un límite de gasto y la carga como secreto `ANTHROPIC_API_KEY` de la función. El modelo por defecto es `claude-haiku-5-5` y se cambia con `AGENTE_MODELO`. Hasta entonces, la elección y la redacción de la IA no están probadas con el modelo real.
- **Temperatura.** `claude-haiku-5-5` no acepta una temperatura distinta de la predeterminada. La repetibilidad la dan el esfuerzo bajo, la salida con esquema fijo y la lista cerrada de candidatas.
- **Corte duro:** sábado 10:00. Si algo del agente no está estable, sale de la demo y se cuenta como siguiente paso.

## 8. Evidencia en producción
**Viernes 23 oct 2026, de 14:09 a 14:11 (hora del reloj, Santiago).** App publicada en https://cruce-senales.vercel.app: `main` `614b2c8`, publicado a las 14:06 según el coordinador. Función `agente` v5, desplegada desde `487d2fc`. Navegador del panel de la app con la vista de teléfono de 375 × 812, que emula un teléfono pero no es uno físico. Sin clave de Anthropic. Datos ficticios del espacio demo "Los del asado".

| Paso | Observado |
|---|---|
| Abrir la demo y el panel "Agente del círculo" | Se ven "Mis preferencias" y "Agente del círculo", con el selector de clima de la demo |
| Cargar y guardar las preferencias de Tomi | "Guardado. Nadie más ve tus preferencias." |
| "Simular sol" → "Que el agente proponga" (14:10) | "El agente encontró 3 opciones. Recomendada: Asado en casa de Tomi." Opciones: Asado (Recomendada), Fútbol y Parque, las tres con rótulo Simulación. Clima: "Clima de prueba Simulación: sábado y domingo con sol. No es un pronóstico real." |
| Perfil del grupo | "Lo que eligió el grupo (5 personas): Asado 4 de 5 · Fútbol 2 de 5. La mayoría prefiere algo tranquilo. Ambiente tranquilo." Sin actividades de una sola persona |
| Por qué | "Le sirve al presupuesto de todos, es bajo techo por si cambia el tiempo, es lo que más eligieron (4 de 5) y va con lo que prefiere la mayoría: un plan algo tranquilo y con ambiente tranquilo." Marcado "Texto fijo" |
| "Simular lluvia" (14:11) | Una sola opción: Asado, porque alguien pidió techo |
| "Compartir por WhatsApp" (enlace revisado, no abierto) | `wa.me` con el mensaje y el enlace `#/unirse/<código>` del espacio; nueva pestaña, `noopener noreferrer`, 44 px de alto |
| "Usar esta opción" (14:11) | "Nueva propuesta" con "Asado en casa de Tomi" y las franjas sábado 31 y domingo 1 de 14:00 a 17:00, más el aviso "el agente no crea ni confirma nada" |
| Consola y diseño | Sin errores de la app ni del agente; sin desborde horizontal a 375 px |

**No probado en esta corrida:**
- La IA con clave real: no hay clave.
- Un teléfono físico.
- Crear la propuesta: para no tocar el plan confirmado que había en ese espacio demo.

### 8.1 Enmienda 7 en la base: grupos de 2 y de 5 (mejora #50)
**Viernes 23 oct 2026, 15:10 a 15:11 (hora del reloj).** Base con las migraciones 0024 a 0028 aplicadas y sin migración en curso, según `agentes/backend.md`. Función `agente` (`index.ts` y `logica.ts` de `c5b0085`) corrida en Node contra la base real, sin clave y con espacios de prueba nuevos (`t-50-…`). Resultado: 13 de 13.

| Caso | Observado |
|---|---|
| Grupo de 2 (Tere organiza y marca fiesta; Ana marca parque) | Ninguna candidata trae `el_mas_elegido`. El por qué queda "Es bajo techo por si cambia el tiempo." El perfil trae solo `{"personas":1}` (sin contar a Tere). Si Ana cambia sus gustos a fútbol, el orden de las candidatas no cambia (pádel, asado, fútbol): E7.1 |
| Demo, sin contar a Tomi | 4 personas: los simulados con semilla son Mati, Caro, Fede y Sofi; Luna no tiene semilla a propósito, por eso no son 5. Perfil "Asado 3 · Fútbol 2", con `ambiente_mayoritario` null por empate y sin `presupuesto_grupo`. Con sol simulado, 3 candidatas. Por qué: "…es lo que más eligieron (3 de 4) y va con lo que prefiere la mayoría: un plan algo tranquilo." |
| Demo: Tomi marca todo y cambia su energía y su ambiente | El perfil no cambia: su voto no cuenta (E7.4) |
| Grupo de 5 sin contar a quien pide (Luna con preferencias simuladas) | Perfil de 5: "Asado 4 · Fútbol 2 · Parque 2", ambiente tranquilo, sin `presupuesto_grupo`. Por qué: "…y es lo que más eligieron (4 de 5)." |

**Nota:** la frase del ritmo del grupo (`ritmo_del_grupo`) sale del puntaje, que cuenta a todos los que cargaron preferencias, incluido quien pide (`0026:123-124` y `148`). En el último caso, Tomi había cambiado su ambiente a "fiesta" en el paso anterior, así que el ambiente general quedó empatado y la frase no aparece. Es el diseño de la enmienda 7 y no tiene que ver con privacidad.

**Pantalla en producción, viernes 23 oct 2026, de 15:19 a 15:20 (hora del reloj).** https://cruce-senales.vercel.app, `main` `3313790` (publicado a las 15:17 según el coordinador), función v6, vista de teléfono de 375 × 812 en el navegador del panel (no un teléfono físico), sin clave.

| Paso | Observado |
|---|---|
| "Simular sol" → "Que el agente proponga" (15:19) | 3 opciones: Asado (Recomendada), Fútbol y Parque, con rótulo Simulación |
| Perfil del grupo | "Lo que eligió el grupo (4 personas): Asado 3 de 4 · Fútbol 2 de 4. La mayoría prefiere algo tranquilo." Sin Tomi (E7.4) y sin ambiente, que está empatado |
| Por qué | "…es lo que más eligieron (3 de 4) y va con lo que prefiere la mayoría: un plan algo tranquilo." Marcado "Texto fijo" |
| Respuesta de la función, leída en el navegador | `perfil_grupo` sin `presupuesto_grupo`; `clima.fuente` = simulacion; `eleccion_fuente` = regla; `explicacion_fuente` = texto_fijo. En la pantalla no aparece ningún dato de presupuesto |
| "Simular lluvia" (15:19) | Una sola opción, el asado; clima de prueba con lluvia |
| WhatsApp y "Usar esta opción" (15:19) | El enlace mide 44 px y abre en una pestaña nueva. "Nueva propuesta" llega con el título y las franjas del sábado 31 y el domingo 1 de 14:00 a 17:00, y con el aviso de que el agente no crea ni confirma nada |
| Consola y diseño | Sin errores; sin desborde horizontal |

No se probó: la IA con clave real, un teléfono físico ni crear la propuesta (para no tocar el plan confirmado de ese demo).

### 8.2 Recorrido completo en producción con dos sesiones (mejora #55)
**Viernes 23 oct 2026, de 15:36:03 a 15:36:44 (hora del reloj).** https://cruce-senales.vercel.app, `main` `7747bf6` (publicado solo según el coordinador; incluye la enmienda 7, #52, #47 y #51). Chrome sin ventana con Playwright, dos contextos separados a 375 × 812: Tomi en uno, como ventana normal, y Luna en otro, como ventana privada, sin almacenamiento compartido. Demo nueva con datos ficticios (código `JT364B3E`), sin clave de IA. Resultado: 16 de 16.

| Paso | Observado |
|---|---|
| Tomi abre la demo y crea la propuesta del caso ("Crear y abrir al grupo") | Entra como organizador; la propuesta se crea y se abre |
| Luna abre el enlace de invitación en su ventana privada y escribe "Luna" | Reclama su lugar. **La lista de propuestas aparece sola**, a 181 ms del título, sin recargar ni esperar el sondeo (#52) |
| Luna, en su teléfono | No tiene la pestaña Simulación |
| Condiciones: Tomi y Luna cargan las suyas en privado; Tomi usa el atajo para los simulados | Guardadas |
| "Buscar opción compatible" → v1 (sábado); confirman Tomi, Mati, Caro y Luna | **Grupo confirmado** en el teléfono de Luna. Luna no ve "Faltan por responder" ni "Con condiciones cargadas" (E7.2) |
| "Se baja: Caro" | **En revisión** |
| "Buscar alternativa" → v2 (domingo) | La pantalla muestra "Versión 1 · ya no vale" y "Estas confirmaciones no pasan a la versión 2". Vuelven a confirmar y queda **Grupo confirmado** en la v2, con la confirmación de Luna ("Ya confirmaste la versión 2") |
| **Navegador compartido:** en el navegador de Tomi, alguien abre el enlace y escribe "Pepe" | "Este navegador ya está en este espacio como Tomi", con "Seguir como Tomi" y "Entrar como otra persona"; la confirmación advierte que la sesión de Tomi no se recupera. Al confirmar: "Sesión activa: Pepe · miembro", sin herramientas del organizador (#47) |
| Consola y diseño | Sin errores de la app; sin desborde horizontal |

Capturas (8, de la sesión agente-ia; no están en el repo): espacio de Tomi, espacio de Luna, simulación cargada, v1 confirmada, v2, v2 confirmada, aviso del navegador compartido y Pepe dentro.

**Nota de interfaz (no es un defecto del recorrido):** con 5 confirmados y un mínimo de 4, la tarjeta dice "5 de 4 confirmaron" y la versión vigente "Confirmaron 5 de 4". Se lee raro; sugerencia para claude-b: "5 confirmaron (mínimo 4)".

**No probado en esta corrida:** un teléfono físico, la IA con clave real y la publicación automática del agente.

## Historia
Idea de Nico. Diseño de privacidad del coordinador: el servidor elige y la IA solo ve totales. Enmienda 4 (preferencias, catálogo y elección por reglas), 4.1 (candidatas, perfil del grupo y la IA como coordinadora, pedido de Nico) y 5 (preferencias simuladas). Mejoras #11, #23, #25, #26, #28, #32 y #35.
