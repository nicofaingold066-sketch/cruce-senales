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
- `supabase/functions/agente/**` y `src/agente/**` son carpetas NUEVAS y disjuntas: el backend sigue dueño de `supabase/migrations/` y `tests/backend/`; claude-b-interfaz sigue dueño del resto de `src/`.
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
