# Tarea para el Claude de la otra computadora: interfaz, enmienda 2

Rol: Operador 3 (interfaz) de CRUCE, hackatón Señales. Dueño de `src/`. Esta tarea es solo de interfaz.

## Paso 0: preparar la copia de trabajo
```
git clone https://github.com/nicofaingold066-sketch/cruce-senales.git
cd cruce-senales
git switch -c wip/ui-enmienda origin/wip/fundamentos
npm ci
```
Para esta tarea NO hace falta `.env` ni acceso a Supabase: el typecheck y el build no lo necesitan. Si falta alguna dependencia, avisá; no agregues ninguna.

## Coordinación (obligatoria, antes de seguir editando)
Hay otros agentes trabajando a la vez. Leé la rama `coordinacion` de GitHub (`README.md`, `PROPIEDAD.md`, `TABLERO.md`, `agentes/`):
`git fetch origin coordinacion && git worktree add ../cruce-coord coordinacion`.
Editá solo `agentes/claude-b-interfaz.md` en esa rama: anotá en "Tocando ahora" las rutas de `src/` que modificás, tu estado y tus pedidos, y empujá a `coordinacion` cada ~20 minutos y al cerrar cada corte. Tus cambios de código siguen yendo a `wip/ui-enmienda`.

## Leer antes de cambiar nada
`AGENTS.md`, `docs/contexto-proyecto.md`, `docs/contrato.md` y `docs/contrato-enmienda-2.md` (la enmienda prevalece sobre el contrato v1).

## Objetivo
Sincronizar `src/` con la enmienda 2:
1. El campo `contrato` de los envoltorios pasa a 2.
2. `reset_demo` recibe `p_intento_id`: generá un uuid por acción y reutilizalo en los reintentos.
3. `get_space` y `list_my_spaces` devuelven `generacion`.
4. `cupos` trae `reservado_imprescindible` y `libres_para_otros`, y `puede.aceptar` puede ser `false` con `motivo: "cupo_reservado"`: mostrá un texto claro ("el último cupo está reservado para el anfitrión") sin calcular nada en el cliente.
5. Errores nuevos: `asiento_en_uso` (sugerí entrar con otro nombre) e `intento_obsoleto` (explicá que esa acción es de una versión anterior de la demo y refrescá).
6. `cupo_completo` con `detalle: "reservado_imprescindible"`.
7. Distinguí "sin conexión detectada antes de enviar" de "no pudimos confirmar el resultado después de enviar": en el segundo caso refrescá el estado y conservá el intento original para reintentar.

## Límites
- No edites `supabase/`, `tests/`, `package.json`, `package-lock.json` ni `docs/`.
- Sin dependencias nuevas. Sin datos reales. Sin secretos.
- No hagas push a `main` ni merges.
- Los componentes que escribas son solo de esta rama.

## Verificación
`npm run typecheck` y `npm run build` deben pasar. Si el backend aún no tiene una función, no uses mocks en el código final: dejá la llamada lista y reportalo.

## Entrega
1. Commits chicos en la rama `wip/ui-enmienda`, con tu usuario de GitHub.
2. `git push -u origin wip/ui-enmienda`. Si el push es rechazado por permisos, no insistas: avisale al usuario (puede faltar aceptar la invitación al repo).
3. Reporte final: qué cambió por cada punto (1 a 7), archivos tocados y resultado del typecheck y del build.
