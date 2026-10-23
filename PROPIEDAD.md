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
| `docs/problema.md`, `docs/pitch*.md` | pitch-problema (sesión de Nico) | `wip/fundamentos` (vía coordinador) |
| `docs/correcciones-*.md`, `tests/e2e/**`, `tests/verificacion-altas/**` | coordinador | `wip/fundamentos` |
| `package.json`, `package-lock.json`, configuración de Vite/TS/Vitest, `.gitignore`, `.env.example` | coordinador (otros piden cambios) | `wip/fundamentos` |
| `README.md` raíz y `docs/componentes-externos.md` | coordinador (sábado) | `wip/fundamentos` |
| `.env` | nadie (local, ignorado por git) | — |

## Roles y dónde viven
- **coordinador**: sesión Claude "Hola" en la computadora A. Integra, verifica, fusiona, decide el contrato.
- **backend**: agente Claude en la computadora A (subagente de la sesión coordinadora). Único dueño de la base.
- **claude-b-interfaz**: Claude en la computadora B. Dueño de `src/`.
- **codex**: Codex en la computadora A, en su copia aislada `../codex-work` (rama `codex/revisiones`). Solo informes.
- **pitch-problema**: otra sesión Claude de Nico en la computadora A, para el texto del checkpoint y el pitch.
