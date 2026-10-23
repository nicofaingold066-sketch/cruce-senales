# Equipo de la noche (vie 23 oct 19:30 → sáb 24 oct 09:00): reglas comunes

Lo escribió el coordinador por pedido de Nico. Cada sesión del equipo lo lee completo antes de empezar y vuelve a leerlo si duda. Nico y Juan no están: nadie te va a contestar hasta la mañana. Trabajás solo, en equipo con las demás sesiones, a través de GitHub.

## Qué es CRUXE (leer `AGENTS.md` y `docs/caso-canonico.md` del repo)
Hackatón Señales (Makana), caso 06 social. Un grupo de amigos cierra un plan: cada uno marca en privado disponibilidad y condiciones, el servidor propone UNA opción, cada persona confirma ESA versión, si alguien se baja el plan se rearma. Hay un agente opcional que propone planes con preferencias privadas y clima. Producción: https://cruce-senales.vercel.app. Entrega: sábado 24 a las 13:00 (último commit de `main`).

## Feedback del jurado que guía la noche (dicho por Nico)
1. **Eliminar la fricción entre el producto y el usuario.** Basta convencer a UNO del grupo: el organizador crea el grupo con los nombres y manda el enlace; los demás tocan su nombre y responden. Sin inicio de sesión obligatorio (la sesión es anónima); una cuenta para guardar juntadas es opcional y queda para después.
2. **Abrir el panorama:** no solo asados; todo tipo de actividades de un grupo de amigos.
3. **Flujo completo de información y de usuario**: desde que entra el input hasta que sale el output, cómo actúa la gente.
4. **Front y back se adaptan entre sí.** Juan sigue trabajando las pantallas esta noche desde su compu. Si el back agrega algo, el front lo adapta; si Juan pide un botón o un dato, lo armamos nosotros.

## Equipo
| Sesión (nombre en la vigía) | Modelo | Copia de trabajo | Rama | Escribe en |
|---|---|---|---|---|
| backend | Opus | `/Users/macair/cruse/cruce-backend` | `wip/backend` | `supabase/**`, `tests/backend/**`, `src/lib/api.ts`, `src/lib/types.ts` |
| friccion | Opus | `/Users/macair/cruse/cruce-friccion` | `wip/friccion` | `src/login/**`, `src/App.tsx`, `src/lib/shell.tsx`, archivos NUEVOS en `src/friccion/**` |
| ux-flujo | Opus | `/Users/macair/cruse/cruce-ux` | `wip/ux` | `docs/flujo-usuario.md`, `docs/front-back-puente.md`, archivos NUEVOS en `src/componentes-nuevos/**` |
| apertura | Sonnet | `/Users/macair/cruse/cruce-apertura` | `wip/apertura` | `docs/apertura.md`, `docs/catalogo-ampliado.md`, `src/lib/ejemplos.ts` (nuevo) |
| qa-noche | Sonnet | `/Users/macair/cruse/cruce-qa` | `wip/qa` | `tests/e2e/**`, `docs/qa-noche.md` |
| sinteticos | Sonnet | `/Users/macair/cruse/cruce-sinteticos` | `wip/sinteticos` | `tests/sinteticos/**`, `docs/usuarios-sinteticos.md` |
| rincones | Sonnet | `/Users/macair/cruse/cruce-rincones` | `wip/rincones` | `tests/rincones/**`, `docs/rincones.md` |
| psico | Sonnet | `/Users/macair/cruse/cruce-psico` | `wip/psico` | `docs/psicologia-grupo.md`, `docs/psicologia-fuentes.md` |
| front-juan (Juan, otra compu) | — | — | `wip/front-juan` | `src/screens/**`, `src/components/**`, `src/styles.css` |
| agente-ia (sesión "Pitch y Agente IA del círculo") | — | — | `wip/agente-ia` | `src/agente/**`, `supabase/functions/agente/**`, `docs/agente*.md`, `docs/pitch*.md` |
| coordinador | Opus | `/Users/macair/cruse/cruce-senales` | `wip/fundamentos` → `main` | contrato, integración, publicación |

**Una ruta, un escritor.** Si necesitás un cambio en una ruta ajena, NO lo hagas: pedilo (ver "Cómo pedir"). Los archivos NUEVOS que crees en tus carpetas son tuyos; quien los conecta a una pantalla es el dueño de la pantalla.

## Cómo trabajás (ciclo)
1. Hora real SIEMPRE con `TZ=America/Santiago date`. Nunca estimes horas.
2. Coordinación: tu copia es `/Users/macair/cruse/cruce-coord-<tu-sesión>` (sin rama, apunta a `origin/coordinacion`). Antes de escribir: `git -C <copia> fetch -q origin && git -C <copia> checkout -q --detach origin/coordinacion`. Escribís SOLO `agentes/<tu-nombre>.md` y empujás con `git -C <copia> push origin HEAD:coordinacion` (si rechaza: fetch, `git rebase origin/coordinacion`, y otra vez). Leé `TABLERO.md` (avisos), `MEJORAS.md` (lista viva) y `agentes/*.md`.
3. Tu ficha `agentes/<tu-nombre>.md` tiene estas secciones exactas: `## Tocando ahora` (rutas exactas que estás editando), `## Entregado` (rama, commit, qué pruebas pasaron), `## Pedidos a otros` (una línea por pedido, nombrando al destinatario), `## Ideas` (mejoras que proponés, con prioridad). Reclamá en "Tocando ahora" ANTES de editar.
4. Código: en tu copia de trabajo y tu rama. Antes de empezar cada tarea: `git fetch -q origin && git merge -q origin/wip/fundamentos` (trae lo publicado). Commits chicos, mensaje claro en español, y al final del mensaje: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (o `Claude Sonnet 5.5` si sos Sonnet). Empujás SOLO `git push origin wip/<tu-rama>`. **Nunca a `main` ni a `wip/fundamentos`**: integra y publica el coordinador.
5. Antes de entregar: `npm run typecheck` y `npm run build` en verde, y las pruebas de lo que tocaste. Las e2e se corren contra un build propio: `npx vite build && npx vite preview --port <tu-puerto>` (backend 4181, friccion 4182, ux 4183, apertura 4184, qa 4185, sinteticos 4186, rincones 4187) y `node tests/e2e/recorrido-dos-sesiones.mjs http://localhost:<puerto>`. Escribí en "Entregado" el commit y los resultados que viste, con la hora del reloj.
6. Al terminar una tarea, tomá la siguiente: primero la de mayor prioridad libre en `MEJORAS.md` que sea de tus rutas; si no hay, proponé una en "Ideas" y hacela si es de tus rutas. Seguí hasta las **08:30 del sábado**.
7. **Vigía**: dejá corriendo con la herramienta Monitor (cargala con ToolSearch) `cd /Users/macair/cruse/cruce-coord && ./vigia.sh <tu-nombre> 60`, con timeout máximo, y re-armala cada vez que expire. Te avisa de avisos del coordinador para vos y de pedidos que te nombran.
8. **Ciclo propio**: programá con CronCreate (cargala con ToolSearch) un recordatorio cada 30 minutos (usá el minuto que te tocó en tu brief) con el texto `CICLO <tu-nombre>: hora real, leer coordinación y pedidos para mí, seguir con mi tarea o tomar la siguiente; ficha al día; parar a las 08:30 del sábado 24`. A las 08:30 borralo.

## Cómo pedir y cómo responder (front ↔ back)
- Para pedir: una línea en `## Pedidos a otros` de TU ficha que empiece con el nombre del destinatario, la hora del reloj y qué necesitás, con archivo y forma exacta. Ejemplo: `- front-juan [21:05]: en Planes.tsx, botón "Recordar a quien falta" que use <RecordarFaltan/> de src/componentes-nuevos/RecordarFaltan.tsx (props: espacioId, codigo).`
- Cuando el back o una sesión agrega algo que el front puede usar, lo anuncia igual: `- front-juan [hh:mm]: nuevo <qué>, en <archivo/función>, cómo se usa.` Juan lo ve con su vigía y lo conecta.
- Cuando te piden algo de tus rutas: hacelo si respeta el contrato y la privacidad, y contestá en tu ficha (`- <quien> [hh:mm]: hecho en <commit>` o `no, porque…`). Si cambia el contrato (RPC, campos, significado), pedíselo al coordinador; no lo inventes.

## Reglas que no se rompen
- Todo dato es ficticio. Nunca datos de personas reales.
- Ningún secreto en el repo, el cliente, logs, capturas ni mensajes. Solo la clave pública llega al navegador. Nunca `service_role` ni `sb_secret`. Nunca commitees `.env`. Nunca imprimas el valor de una clave.
- Base: SOLO el proyecto Supabase `tjkfdnvzsikncjbskufm`. **Nunca** toques el proyecto `twsqdwzppayrznjzbzjd`.
- No uses `gh` ni el conector de Vercel (son de otra persona, Marcos). Solo `git` con el remoto `origin`.
- Sin APIs facturables ni claves nuevas. Sin dependencias nuevas sin pedírselo al coordinador.
- No borres datos de prueba de la base.
- Migraciones: solo backend, de a una, avisando `MIGRACION EN CURSO` en su ficha antes y sacándolo al terminar. Mientras diga eso, NADIE corre suites ni e2e contra la base. Después de las 12:00 del sábado, ninguna migración.
- Reglas del producto: interés no es confirmación; el silencio nunca es asistencia; condiciones y preferencias privadas nunca aparecen en respuestas compartidas, errores ni logs; una confirmación vale para UNA versión; el servidor decide cupos, plazos, elegibilidad y estado; la IA solo explica, nunca confirma ni cambia estados.
- No rompas los rótulos que buscan los guiones de `tests/e2e/` (por ejemplo "Unirme", "Tu nombre en el espacio", "No estoy en la lista", "Simulación", "Aceptar versión 1 por Sofi"). Si tenés que cambiar uno, pedíselo a qa-noche antes.
- Sábado 11:00: se congela la interfaz. 12:00: no hay migraciones. El coordinador hace el último push entre 12:15 y 12:45.

## Si algo sale mal
Si una prueba falla y no es tuya, avisá al dueño en "Pedidos a otros" y seguí con otra cosa. Si no podés seguir, escribí por qué en tu ficha y pasá a la siguiente mejora. Nunca fuerces un push, nunca reescribas historia (`push --force`, `reset --hard` sobre trabajo ajeno).
