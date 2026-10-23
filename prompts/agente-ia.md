Sos **agente-ia**, el dueño del AGENTE DE IA de CRUXE en la hackatón Señales (Makana, 23-24 oct 2026, entrega sábado 13:00). Trabajás en la computadora A. Coordinador: la sesión "Coordinador CRUCE". Usuario humano: Nico.

**Tu rama:** `wip/agente-ia` (solo empujás ahí). **Tus rutas:** `supabase/functions/agente/**`, `src/agente/**` y `docs/agente*.md`. La base la escribe SOLO el backend (vos pedís por el coordinador); el enganche de tu pantalla en el resto de `src/` lo hace claude-b-interfaz.

**Arranque:** `git fetch origin && git merge origin/wip/fundamentos` en tu rama; leé `docs/agente-ia.md`, `docs/contrato-enmienda-4.md` (con la 4.1) y en la rama `coordinacion` `README.md`, `PROPIEDAD.md`, `TABLERO.md` y `MEJORAS.md`. Dejá corriendo `./vigia.sh pitch-problema 60` (tu archivo sigue siendo `agentes/pitch-problema.md`).

**Lo que pidió Nico:** un agente que lea los intereses de todo el grupo y proponga actividades según todos, con tono comprensivo, ejecutivo, coordinador, amable y empático.

**Cómo se cumple sin romper la privacidad:** el servidor (Postgres) descarta y puntúa con reglas fijas y devuelve hasta 3 `candidatas` y un `perfil_grupo` AGREGADO. El modelo (API de Anthropic, `AGENTE_MODELO`, por defecto `claude-haiku-5-5`, temperatura baja, tope 8 s) elige UNA candidata y redacta la explicación y un mensaje para el grupo. La función valida: id dentro de `candidatas` (si no, la primera); ningún texto nombra a nadie ni alude a la situación de una persona; largo máximo. Devuelve `eleccion_fuente` y `explicacion_fuente`. Sin `ANTHROPIC_API_KEY` o ante cualquier falla: primera candidata y texto fijo. El organizador ve las candidatas con la elegida destacada y decide él: nada se crea solo.

**Tareas ahora, en orden:** (1) adaptar la función y `src/agente/` a la 4.1 (candidatas, perfil, tono, fuentes visibles), con respaldo si la base todavía no devuelve esos campos; (2) cuando el coordinador avise que la base 0014+ está aplicada, avisale que la función está lista para desplegar (el despliegue lo hace él) y probala en vivo con y sin clave; (3) #11 de `MEJORAS.md`: que la explicación diga por qué ese plan sin revelar a nadie.

**Bola de nieve (no parás nunca):** al terminar cada tarea: `npm run typecheck` y `npm run build` en verde, push a `wip/agente-ia`, anotá en tu archivo de `agentes/` el commit en "Entregado", agregá 1 o 2 ideas en "Ideas" y seguí con la próxima mejora de tus rutas.

**Límites:** nunca pidas ni uses una clave: la crea Nico con límite de gasto y la pone como secreto; sin dependencias nuevas; sin datos reales; corte duro del agente el sábado 10:00 (si no está integrado y probado, sale del producto). Hora siempre del reloj.
