# Mapa de dueños (un solo escritor por ruta)

Solo el coordinador edita este archivo. Si una ruta no figura acá, es del coordinador hasta que se asigne.

| Ruta (en el repo de código) | Único escritor | Rama donde empuja |
|---|---|---|
| `supabase/**` (migraciones y todo lo de base) | backend | `wip/fundamentos` (vía coordinador) / ver su archivo |
| `tests/backend/**` | backend | idem |
| `src/**` (interfaz) | claude-b-interfaz | `wip/ui-enmienda` |
| `docs/contrato.md`, `docs/contrato-enmienda-*.md` | coordinador | `wip/fundamentos` |
| `docs/contexto-proyecto.md`, `docs/caso-canonico.md`, `AGENTS.md`, `CLAUDE.md`, `docs/tareas/**` | coordinador | `wip/fundamentos` |
| `docs/revision-codex-*.md` | codex | `codex/revisiones` |
| `docs/agente*.md` | agente-ia (= sesión "Pitch y Agente IA del círculo") | `wip/fundamentos` (vía coordinador) |
| `supabase/functions/agente/social/**` (solo `contratos.ts`, `orquestador.ts`, `orquestador.test.ts`) | agente-social (sesión `01a16a31-3df5-7220-92d7-d0c8545c403b`, ficha `agentes/agente-social-codex.md`) | rama LOCAL `wip/agente-social`, sin push |
| `supabase/functions/agente/**`, `src/agente/**` (RESERVADAS: sin código hasta que Nico apruebe y pase la puerta de las 14:30) | agente-ia | `wip/agente-ia` |
| `docs/problema.md`, `docs/pitch*.md` | pitch-problema (sesión de Nico) | `wip/fundamentos` (vía coordinador) |
| `docs/correcciones-*.md`, `tests/verificacion-altas/**` | coordinador | `wip/fundamentos` |
| `tests/e2e/**` | codex (asignado por el coordinador) | `codex/revisiones` |
| `package.json`, `package-lock.json`, configuración de Vite/TS/Vitest, `.gitignore`, `.env.example` | coordinador (otros piden cambios) | `wip/fundamentos` |
| `README.md` raíz y `docs/componentes-externos.md` | coordinador (sábado) | `wip/fundamentos` |
| `.env` | nadie (local, ignorado por git) | — |

## Roles y dónde viven
- **coordinador**: sesión Claude "Coordinador CRUCE" en la computadora A. Integra, verifica, fusiona, decide el contrato.
- **backend**: agente Claude en la computadora A (subagente de la sesión coordinadora). Único dueño de la base.
- **claude-b-interfaz**: Claude en la computadora B. Dueño de `src/`.
- **codex**: Codex en la computadora A, en su copia aislada `../codex-work` (rama `codex/revisiones`). Solo informes.
- **pitch-problema**: sesión Claude "Pitch y Agente IA del círculo" en la computadora A: texto del checkpoint, guion del pitch y notas de ideas dictadas por Nico en `/Users/macair/cruse/ideas-nico/` (fuera del repo).

## Reglas de las rutas del agente
- `supabase/functions/agente/**` (salvo `social/`, que es de agente-social) y `src/agente/**` son carpetas NUEVAS y disjuntas: el backend sigue dueño de `supabase/migrations/` y `tests/backend/`; claude-b-interfaz sigue dueño del resto de `src/`.
- Cualquier tabla, función SQL o cambio de contrato que necesite el agente se pide al coordinador (no se crea por cuenta propia). Enganchar una pantalla del agente en `src/` lo hace claude-b-interfaz a pedido.
- Ningún código del agente se escribe antes de: (1) aprobación de Nico, (2) puerta de las 14:30 en verde, (3) decisión de Nico sobre modelo y gasto.

## Ramas por IA (cada una empuja SOLO a la suya)
| IA | Rama de código | Quién la fusiona |
|---|---|---|
| A: coordinador + backend (computadora A) | `wip/fundamentos` | coordinador |
| B: claude-b-interfaz (computadora B) | `wip/ui-enmienda` | coordinador |
| Codex (copia aislada `../codex-work`) | `codex/revisiones` | coordinador (solo informes) |
| Coordinación (sin código) | `coordinacion` | cada agente escribe solo su archivo de `agentes/` |
Ninguna IA empuja a la rama de otra ni a `main`. El coordinador trae las ramas a `wip/fundamentos` y, al final, `wip/fundamentos` a `main`.

## login (sesión de entrada)
- Rama `wip/login`. Rutas: `src/login/**`, más el enganche mínimo acordado con el coordinador: ruta `entrar` en `src/lib/shell.tsx`, `case 'entrar'` y redirección de primera visita en `src/App.tsx`. claude-b-interfaz no toca `src/login/**`; login no toca el resto de `src/`.
- Excepción puntual (enmienda 9): login puede agregar en `src/lib/api.ts` solo el tipo `VistaPorCodigoOk`, `previewSpaceByCode` y el tercer parámetro opcional de `joinSpace`.
- `front-juan` (Juan Morales, su cuenta): rama `wip/front-juan`, rediseño del front; no se integra sin decisión de Nico y Juan.
- Desde el rediseño (17:19): `src/` sigue siendo de claude-b-interfaz salvo `src/agente/**` (agente-ia) y `src/login/**` (login). Excepciones puntuales de login: ruta `unirse` en `PantallaRuta`, `previewSpaceByCode`/`joinSpace(p_miembro_id)`/`createSpace(integrantes)` en `src/lib/api.ts`, y la lista de integrantes en `src/screens/CrearGrupo.tsx`.

## Agente social (reparto del 23/10, 17:30 ART) — contrato PROPUESTO, no integrar hasta acordarlo
Se completa el agente existente; no se crea una segunda función HTTP, ni otro proveedor de modelos, ni otro runner.

| Pieza | Dueño | Qué hace y qué NO |
|---|---|---|
| `supabase/functions/agente/social/{contratos.ts,orquestador.ts,orquestador.test.ts}` | agente-social (`01a16a31-…`) | Tipos del contrato y orquestación pura con dependencias inyectadas (puerto backend + puerto modelo). Puede importar de `../logica.ts` sin editarlo. Sin `Deno.serve`, sin cliente Supabase propio, sin SDK ni claves de modelo. Rama local propia `wip/agente-social`. |
| `supabase/migrations/**`, `tests/backend/**` | backend | Las funciones SQL de abajo, en una enmienda nueva (10). Nada de esto existe todavía. |
| `supabase/functions/agente/{index.ts,logica.ts,…}`, `src/agente/**`, `docs/agente-ia.md` | agente-ia | Conserva handler, AI Gateway e interfaz; conecta el módulo nuevo pasando sus puertos. |
| `docs/contrato-enmienda-10.md`, este archivo | coordinador | Fija lo acordado. |

Reglas que no se negocian:
- `usar_en_agente` (E8) es permiso para USAR preferencias. NO es permiso para recibir invitaciones: eso es un opt-in aparte, apagado por defecto y revocable.
- Una invitación no es una aceptación. Cada persona sigue aceptando cada versión con `accept_version`; ni el modelo ni el orquestador la llaman nunca, ni heredan aceptaciones en reparaciones.
- El modelo solo elige y redacta entre opciones que el servidor ya validó (`opcion_ref` opacas). Al modelo no le llegan nombres, condiciones individuales ni quién tiene apagado qué.
- Por ahora todo es local: sin push, sin despliegue, sin migraciones aplicadas, sin claves nuevas.

### Funciones SQL propuestas (backend)
Todas devuelven la forma de siempre: `{ok:true, contrato, servidor_ahora, …}` o `{ok:false, error:{codigo, detalle}}` con `codigo/detalle` como en `cruce.err`. Las que escriben llevan `p_intento_id uuid` y usan `cruce.intento_previo`/`guardar_intento` (repetir devuelve lo mismo con `repetido:true`; mismo intento con otros parámetros → `entrada_incompleta/intento_reutilizado`).

| Función | Entrada | Respuesta `ok` | Quién |
|---|---|---|---|
| `agente_social_contexto` | `p_espacio_id` | `localidad`, `zona_horaria`, `politica {modo, version}`, `personas_autorizadas` (cuántas con `usar_en_agente`), `destinatarios` (cuántas con invitaciones activadas) — solo conteos | organizador |
| `agente_social_candidatos` | `p_espacio_id`, `p_sabado`, `p_clima` (`seco`/`lluvia`/`desconocido`) | `opciones[]` con `opcion_ref` opaca, actividad, franja, `cuantos` y agregados ya filtrados (reusa el motor de `proponer_plan_borrador` + E8); o `sin_plan_compatible` | organizador |
| `set_recibir_invitaciones_agente` | `p_espacio_id`, `p_recibir boolean` | `recibir_invitaciones_agente` persistido. `get_my_preferences` suma ese campo a nivel raíz (aditivo) | cada persona, solo lo suyo |
| `set_politica_agente_social` | `p_espacio_id`, `p_modo` (`aprobacion` por defecto / `autonoma`), `p_intento_id` | `politica {modo, version}` | organizador |
| `iniciar_ejecucion_agente` | `p_espacio_id`, `p_ejecucion_id uuid`, `p_oportunidad text` (p. ej. `sabado:2026-10-24`), `p_parametros_hash text` | `ejecucion {id, estado: en_curso\|borrador\|publicada\|fallida, propuesta_id?}`, `repetido`. Única por (espacio, oportunidad): un segundo id devuelve la ejecución existente, nunca dos efectos. No se guardan prompts ni textos del modelo | organizador |
| `guardar_borrador_agente` | `p_ejecucion_id`, `p_opcion_ref`, `p_texto` (ya validado por `textoValido`) | `borrador {hash, opcion_ref}`; el servidor calcula el hash | organizador |
| `aprobar_borrador_agente` | `p_ejecucion_id`, `p_borrador_hash`, `p_intento_id` | `aprobacion {hash, aprobado_en}` del hash exacto | organizador (humano, desde la interfaz) |
| `publicar_borrador_agente` | `p_ejecucion_id`, `p_borrador_hash`, `p_intento_id` | En UNA transacción: revalida política, opt-ins y aprobación (o `autonoma`), crea y abre la propuesta con los circuitos actuales, invita solo a quienes tienen invitaciones activadas y cierra la ejecución como `publicada`. Devuelve `propuesta`, `invitados` (cuántos), `repetido` | organizador |
| `cerrar_ejecucion_agente` | `p_ejecucion_id`, `p_estado` (`fallida`), `p_motivo` (código cerrado) | `ejecucion` | organizador |

Errores: se reusan `sesion_invalida/sin_sesion`, `fuera_de_audiencia/no_miembro`, `no_autorizado/no_es_organizador_espacio`, `entrada_incompleta/campo_faltante`, `entrada_incompleta/intento_reutilizado`, `fallo_temporal/reintentar`. Nuevos (solo estos, a confirmar): `no_autorizado/sin_aprobacion` (falta aprobación del hash y la política no es `autonoma`), `opcion_desactualizada/borrador_cambiado` (hash distinto al aprobado), `opcion_desactualizada/opcion_vencida` (la `opcion_ref` ya no es válida al revalidar), `sin_alternativa/sin_destinatarios` (nadie con invitaciones activadas), `entrada_incompleta/politica_invalida`. Ningún mensaje explica la restricción u opt-out de otra persona.

### Módulo TS (agente-social) — forma propuesta
- `contratos.ts`: tipos de entrada/salida de cada función de arriba y `type ErrorSocial = {codigo, detalle}`.
- `orquestador.ts`: `orquestarAgenteSocial(entrada: {espacioId, sabado, clima, ejecucionId, oportunidad}, puertos: {backend: PuertoBackendSocial, modelo: PuertoModelo})` → `{estado: 'borrador'|'publicada'|'sin_plan'|'necesita_aprobacion'|'error', ejecucion, borrador?, propuesta?, error?}`. `PuertoModelo` = `(opciones) => Promise<{opcion_ref, texto} | null>`; si devuelve algo fuera de las opciones o texto inválido, se usa `mensajeFijo`. Sin red propia.
- `orquestador.test.ts`: solo mocks (sin red, sin base, sin modelo): reintento idempotente, oportunidad repetida, hash cambiado, sin aprobación, política autónoma, sin destinatarios, opt-out que no aparece, salida del modelo ajena descartada.

Pendiente de acuerdo entre backend, agente-ia y agente-social: nombres, parámetros, respuestas y errores de arriba. Hasta entonces backend no escribe migración y agente-ia no conecta nada.
