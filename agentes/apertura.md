# apertura (sesión de la noche: abrir el panorama más allá del asado)

Guía: `prompts/equipo-noche.md`. Rama: `wip/apertura`. Rutas: `docs/apertura.md`, `docs/catalogo-ampliado.md`, `src/lib/ejemplos.ts` (nuevo).

## Tocando ahora
- [19:27] Nada editándose. Próximo: ideas para abrir el panorama (ver Ideas) y atender pedidos.

## Entregado
- [19:29] `docs/apertura.md` §6 (respuestas de 30 segundos para el jurado) y `docs/catalogo-ampliado.md` (segunda tanda, borrador, no entra hoy): commit `a917b05`.
- [19:24] #95 entregado: `docs/catalogo-ampliado.md` en rama `wip/apertura`, commit `ccf168f` (8 filas `lugar-sim-06` a `13`, con SQL listo y sugerencia de zona para las 5 filas actuales). Sin código: no hay pruebas que correr.
- [19:27] #96 entregado: `docs/apertura.md` (tipos de grupos y variables, 8 escenarios, lámina de pitch, variables por investigar con enlaces). Rama `wip/apertura`, commit `0221ee4`.
- [19:27] #92 entregado: `src/lib/ejemplos.ts` + `tests/ejemplos.test.ts` (nuevo, en la raíz de `tests/` porque vitest solo incluye `tests/**`), commit `565b36f`. Resultado visto: `npx vitest run tests/ejemplos.test.ts` 5/5; `npm run typecheck` y `npm run build` en verde (19:27). Sin cambios en pantallas.

## Pedidos a otros
- backend [19:24]: Parte B de la enmienda 10. Filas exactas y SQL en `docs/catalogo-ampliado.md` (rama `wip/apertura`, commit `ccf168f`, lo leés con `git show origin/wip/apertura:docs/catalogo-ampliado.md`). Ojo: cada fila nueva lleva horario sábado Y domingo porque las candidatas filtran `dom_inicio is not null`; y hay que ampliar los check de `actividad` y de `me_gustaria` a las 13 actividades. Si algo no te cierra, contestame acá.
- front-juan [19:27]: usar `src/lib/ejemplos.ts` (rama `wip/apertura`, commit `565b36f`; para traerlo: `git fetch origin && git checkout origin/wip/apertura -- src/lib/ejemplos.ts`, o esperá al merge del coordinador). API: `ejemploPorSemilla(texto)` o `ejemploPorIndice(n)` devuelven un `Ejemplo`; `placeholderGrupo(e)`, `placeholderPlan(e)`, `ayudaGrupo(e)` dan los textos. Tres lugares que asumen asado: (1) `src/screens/CrearGrupo.tsx:55`, `placeholder="Ej.: Los del asado"` → `placeholder={placeholderGrupo(ej)}`; (2) `src/screens/NuevaPropuesta.tsx:375`, `placeholder="Ej.: Asado en casa de Tomi"` → `placeholder={placeholderPlan(ej)}`; (3) opcional, `src/screens/CrearGrupo.tsx:47`, después de «Un grupo es la gente con la que siempre dicen «nos juntamos»…» sumar `{ayudaGrupo(ej)}`. `ej` = `const ej = useMemo(() => ejemploPorSemilla(String(Date.now() / 3600000 | 0)), [])` (rota por hora) o un índice al azar guardado en `useState`. NO cambiar el caso precargado «Los del asado» (`CASO`, `NuevaPropuesta.tsx:35`), ni el botón «Probar la demo «Los del asado»»: los guiones e2e los buscan. Los placeholders no los usa ningún guion e2e (revisado).
- front-juan [19:27]: si hay otros vacíos o ayudas que dicen «asado», «parrilla» o «anfitrión» sin necesidad, avisame con archivo y línea y armo el texto.
- front-juan [19:29]: en `src/screens/NuevaPropuesta.tsx:47` (`ACTIVIDADES`) sumar atajos: Pádel (90), Juegos de mesa (180), Cerro (180), Café o brunch (120), Museo o feria (120). Íconos: reusá `juntada` o `paseo` de `Icono.tsx`. Es para que el carrusel no sea solo asado y fútbol; no cambia ningún rótulo que busquen los guiones e2e.
- ux-flujo [19:31]: hecho en `87d4a62` (rama `wip/apertura`): `src/lib/ejemplos.ts` exporta `ATAJOS` (Pádel, Tenis, Cena, Cine, Cumple, Asado en el medio, Juegos de mesa, Café o brunch, Cerro, Museo o feria, Fútbol, Juntada; con título, ícono existente y duración) y `atajosParaGrupo(nombreGrupo)`, que sube primero el atajo que nombra el grupo («Los del pádel» → Pádel) y deja «Asado» primero solo si el grupo lo nombra. Es pura y tiene prueba (7/7). La pantalla es de front-juan: ver mi pedido siguiente.
- front-juan [19:31]: reemplaza mi pedido de las 19:29 sobre los atajos. En `src/screens/NuevaPropuesta.tsx:47`, borrar la constante `ACTIVIDADES` y usar `const ACTIVIDADES = atajosParaGrupo(espacio.nombre)` (importar de `../lib/ejemplos`; cada atajo tiene `titulo`, `icono` y `min`, igual que hoy). Así un grupo «Los del pádel» ve Pádel primero y ya no se titula «Asado». Los íconos son los que ya existen en `Icono.tsx` (Pádel y Tenis usan `futbol`; si querés uno de raqueta, agregalo y cambia el `icono` en mi lista). Con el grupo de la demo («Los del asado») Asado va primero, igual que hoy; el caso precargado `CASO` no cambia.
- [19:50] backend [19:49] confirmó el pedido de catálogo: Parte B en la base, migración 0038 (`aef9c7d`), con mis filas y zonas. Cerrado por mi lado; no hay nada más que pedir.

## Ideas
(prioridad, quién lo hace)
1. P1, front-juan: ampliar los atajos de `ACTIVIDADES` de `src/screens/NuevaPropuesta.tsx:47` con los tipos de la enmienda 10 que hoy faltan: Pádel (min 90), Juegos de mesa (min 180), Cerro (min 180), Café o brunch (min 120), Museo o feria (min 120). Ya hay íconos para cena, cine, cumple, juntada y paseo en `Icono.tsx`; para los nuevos alcanza con reusar `juntada` o `paseo`. Así el carrusel muestra más que asado y fútbol.
2. P2, apertura: HECHA, `docs/apertura.md` §6 (respuestas de 30 segundos para el jurado).
3. P2, apertura: HECHA, segunda tanda de 12 actividades en `docs/catalogo-ampliado.md` (borrador, sin migración).
4. P3, front-juan: en `CrearGrupo.tsx`, elegir "tipo de juntada" (amigos del deporte, familia, estudio, etc.) solo para mostrar ejemplos cercanos al grupo. No toca el contrato (el `tipo` del espacio sigue siendo `amigos` o `empresa`).
5. P3, agente-ia: que la lámina del pitch (docs/apertura.md §3) y la cinta de juntadas entren en `docs/pitch*.md`.
6. P3, qa-noche: una búsqueda automática (grep) en `src/` de "asado" fuera del caso canónico, para que no vuelva a aparecer en textos de ayuda.
