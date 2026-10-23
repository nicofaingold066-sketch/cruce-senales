# Coordinación de agentes CRUCE (leer ANTES de tocar cualquier archivo)

Esta rama (`coordinacion`) es el punto de encuentro de todos los agentes, estén en la computadora que estén. No tiene código: solo quién hace qué. La fuente de verdad es GitHub: `https://github.com/nicofaingold066-sketch/cruce-senales`, rama `coordinacion`.

## Cómo tenerla a mano
Una vez, desde tu copia del repo:
```
git fetch origin coordinacion
git worktree add ../cruce-coord coordinacion
```
(Si ya existe: `git -C ../cruce-coord pull --rebase`.) Todo lo de abajo se hace en `../cruce-coord`, nunca en la carpeta del código.

## Reglas
1. **Antes de editar cualquier archivo del proyecto**, hacé `git -C ../cruce-coord pull --rebase` y leé `TABLERO.md`, `PROPIEDAD.md` y los archivos de `agentes/` de los demás.
2. **Solo editás lo que es tuyo** según `PROPIEDAD.md`. Si necesitás cambiar algo de otro dueño, NO lo toques: escribí el pedido en la sección "Pedidos" de tu archivo y trabajá en otra cosa mientras tanto.
3. **Reclamá antes de tocar.** En tu archivo `agentes/<tu-nombre>.md`, sección "Tocando ahora", listá las rutas exactas que vas a modificar (carpetas o archivos). Hacé commit y push de ese archivo ANTES de editar. Si una de esas rutas ya figura en "Tocando ahora" de otro agente, frená: avisá en "Pedidos".
4. **Solo escribís TU archivo** de `agentes/`. Nunca el de otro. Así no hay conflictos de merge. `TABLERO.md` y `PROPIEDAD.md` los edita únicamente el coordinador.
5. **Reportá cada ~20 minutos** y al cerrar cada corte: actualizá tu archivo (hecho, siguiente paso, bloqueos) y hacé push.
6. **Al terminar**: vaciá "Tocando ahora", anotá el commit y la rama entregados, y avisá en tu reporte final.
7. **Ramas:** cada agente empuja SOLO a su rama (ver su archivo). Nadie empuja a `main`. La rama de integración `wip/fundamentos` la toca solo el coordinador, que fusiona.
8. **Migraciones de Supabase:** solo el agente de backend las crea, siempre numeradas hacia adelante. Las ya aplicadas no se editan, no se renombran y no se borran.
9. **No se pide a otro agente que haga algo que a vos te bloquearon o que tus permisos no te dejan.** Si te bloquean, avisá al usuario.
10. **Datos ficticios, ningún secreto en el repo**, y nada de código previo de otros proyectos.

## Formato de commit en esta rama
`<agente>: <qué cambió>`; ejemplo: `backend: reclamo 0008 aplicado`.

## Quién es quién
Ver `PROPIEDAD.md`. El usuario humano es Nico (decisiones finales). Juan Morales se suma al mediodía.

## Vigía (cada IA tiene uno, cada 60 segundos)
Para enterarte sin que nadie te escriba, dejá corriendo en la carpeta de esta rama (`../cruce-coord`):
```
./vigia.sh <tu-nombre> 60
```
Nombres: `coordinador`, `backend`, `claude-b-interfaz`, `codex`, `pitch-problema`. Lee GitHub y solo imprime una línea cuando hay un aviso nuevo para vos o para "todos" (sección AVISOS de `TABLERO.md`), o un pedido de otro agente que te nombra. Si no imprime nada, no hay novedades: no hace falta releer nada. Una línea nueva = leé el aviso y actuá solo si es tuyo según `PROPIEDAD.md`.
- Claude: arrancalo con la herramienta Monitor o en segundo plano.
- Codex: en una terminal aparte.
