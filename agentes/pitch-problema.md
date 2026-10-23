# Agente: agente-ia (antes pitch-problema; sesión "Pitch y Agente IA del círculo", computadora A)

Quien edita este archivo: solo esta sesión. Última actualización: 12:49.

## Tocando ahora
- Mejora #11 (explicación del agente) + pedido de Nico: agente coordinador y empático que propone según los intereses de todo el grupo.
- `supabase/functions/agente/**`, `src/agente/**`, `docs/agente*.md`
Rama de código: `wip/agente-ia`. Copia de trabajo: `/Users/macair/cruse/cruce-agente`. Mi copia de `coordinacion`: `/Users/macair/cruse/cruce-coord-agente`.

## Estado
- Enmienda 4 aprobada por el coordinador (`docs/contrato-enmienda-4.md`, 05df745); sin `agente_insumos`. Backend implementando (0014+).
- `wip/agente-ia` commit `c404e3d`: función del servidor `supabase/functions/agente/index.ts` y pantalla `src/agente/` (`AgentePanel`, `api.ts`). Typecheck y build en verde. La función no se probó en vivo: falta la base (0014+) y el despliegue, que hace el coordinador. Sintaxis verificada con `node --check`; no hay Deno local para chequear tipos.
- Sin clave: la función devuelve texto fijo. Si la función no está publicada, la pantalla llama directo a `proponer_plan_borrador` con clima desconocido.

## Siguiente
Cuando el backend publique 0014+: probar la pantalla en vivo contra la base y pedir el despliegue de la función.

## Bloqueos
- Las tablas y RPC del agente las escribe el backend después de que el coordinador apruebe la enmienda 4.
- Clave de Anthropic: la crea y la pone Nico.

## Pedidos a otros
- **[12:49] coordinador (URGENTE, antes de que el backend cierre 0014):** Nico pidió que el agente "lea los intereses de todos los integrantes y proponga según todos", con un tono comprensivo, ejecutivo, coordinador, amable y empático. Propongo una ampliación chica de `proponer_plan_borrador` (enmienda 4.1, solo agrega campos): (a) `candidatas`: hasta 3 entradas del catálogo que pasaron el descarte, ordenadas por el puntaje fijo, cada una con `id`, `actividad_etiqueta`, `lugar`, `titulo`, `franjas` y `frases_grupo` (la primera es la elección de hoy); (b) `perfil_grupo`, agregado y no identificable: `personas`, `gustos` (`[{actividad_etiqueta, cuantos}]`), `energia_mayoritaria`, `ambiente_mayoritario` (o null) y `presupuesto_grupo` (`cualquiera`|`moderado`|`bajo`, el más restrictivo, que el plan ya revela). Con `personas <= 3` se omiten `gustos`, `energia_mayoritaria`, `ambiente_mayoritario` y `presupuesto_grupo`. El modelo elige UNA de las `candidatas` (la función valida que el id esté en la lista; si no, usa la primera) y redacta la explicación y un mensaje para el grupo. Sigue sin ver datos de una persona y sin confirmar nada. Si no lo aprobás, la función sigue funcionando con `resultado` como hoy.
- **[12:46] coordinador:** función `supabase/functions/agente/` lista para desplegar (rama `wip/agente-ia`, `c404e3d`). Usa los secretos automáticos `SUPABASE_URL` y `SUPABASE_ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`); opcionales `ANTHROPIC_API_KEY` (lo pone Nico) y `AGENTE_MODELO`. Deja verify_jwt activado.
- **[12:46] claude-b-interfaz (vía coordinador):** enganchar `AgentePanel` de `src/agente/AgentePanel.tsx` en la pantalla del espacio: `<AgentePanel espacioId={espacio.id} esOrganizador={espacio.mi_rol === 'organizador'} soloLectura={soloLectura} />`. En `NuevaPropuesta`, al precargar, llamar a `tomarBorradorAgente(espacioId)` de `src/agente/api.ts`: si devuelve algo, usar su `titulo` y sus `franjas[0]`/`franjas[1]` (inicio y fin en HoraLocal) en vez de los del caso.

## Entregado
- `docs/agente-ia.md`, `docs/pitch.md`, `docs/checkpoint-1.md`, `docs/jurado-variantes.md` (integrados por el coordinador).
- Pendiente el sábado: pasar CRUCE → CRUXE en `pitch.md`, `checkpoint-1.md`, `problema.md` y `readme-borrador.md`.
