# CRUXE: reglas para agentes (Codex, Claude)

Hackatón Señales (Makana), 23-24 oct 2026. CRUXE convierte "nos juntamos" en un encuentro que ocurre: condiciones privadas, una opción compatible, confirmación de una versión del plan y reparación cuando alguien se baja.
Fuente del caso: `docs/caso-canonico.md`. Leerlo antes de cualquier cambio.

> **COORDINACIÓN OBLIGATORIA:** antes de editar cualquier archivo, leé la rama `coordinacion` de GitHub (`README.md`, `PROPIEDAD.md`, `TABLERO.md` y `agentes/`). Reclamá las rutas que vas a tocar en tu archivo de `agentes/` y empujalo ANTES de editar. Solo editás lo que es tuyo según `PROPIEDAD.md`. Detalle en la sección final de este archivo.

## Reglas que no se rompen
- Todo dato es ficticio. Nunca datos de personas reales.
- Ningún secreto en el repo, en el cliente, en capturas ni en logs. Solo la clave pública llega al navegador.
- Sin código previo propio o privado. Solo librerías abiertas y plantillas públicas. Registrar cada componente externo (nombre y enlace) en `docs/componentes-externos.md` para el README.
- Un dueño por carpeta. No tocar carpetas ajenas. Un cambio de contrato se pide al coordinador (enmiendas en `docs/contrato-enmienda-*.md`); nadie cambia un nombre o significado por su cuenta.
- No agregar dependencias sin avisar. No usar APIs facturables ni activar créditos o planes.
- No inventar: si falta un dato, preguntar o dejarlo pendiente y rotulado.
- Commits chicos con mensaje claro. No hacer push a `main` sin una prueba pasada. `main` siempre debe poder desplegarse.

## Reglas del producto
- Interés no es confirmación. El silencio nunca es asistencia.
- Las condiciones privadas nunca aparecen en respuestas compartidas, errores ni logs.
- Una confirmación corresponde a UNA versión del plan. Una versión nueva no hereda aceptaciones.
- El servidor decide cupos, plazos, elegibilidad y estado. La interfaz nunca los calcula como autoridad.
- La IA, si se usa, solo explica; nunca confirma ni cambia estados.

## Dueños
El mapa vigente y completo de quién escribe cada ruta está en la rama `coordinacion` (`PROPIEDAD.md`). Resumen: backend = `supabase/` y `tests/backend/`; interfaz (Claude B) = `src/`; coordinador = contrato, configuración general e integración; Codex = informes `docs/revision-codex-*.md`.

## Reporte al terminar un corte
Objetivo cumplido (sí/no/parcial) · archivos tocados · pruebas corridas y resultado observado · límites conocidos · próxima dependencia.

## Coordinación entre agentes (rama `coordinacion`)
Hay varios agentes en computadoras distintas. Para no pisarse, la rama `coordinacion` (sin código) es el punto de encuentro.
1. Tené a mano la rama: `git fetch origin coordinacion && git worktree add ../cruce-coord coordinacion` (o `git -C ../cruce-coord pull --rebase` si ya la tenés).
2. Antes de editar: `git -C ../cruce-coord pull --rebase`; leé `TABLERO.md`, `PROPIEDAD.md` y `agentes/*.md`.
3. Reclamá: en `agentes/<tu-nombre>.md` poné en "Tocando ahora" las rutas exactas; commit y push a `coordinacion` antes de tocar nada. Si alguien ya reclamó esa ruta, frená.
4. Solo escribís tu archivo de `agentes/`. `TABLERO.md` y `PROPIEDAD.md` son del coordinador.
5. Reportá cada ~20 minutos y al cerrar cada corte. Al terminar, vaciá "Tocando ahora" y anotá rama y commit entregados.
6. Un cambio en una ruta ajena se pide en la sección "Pedidos" de tu archivo; no se hace.
