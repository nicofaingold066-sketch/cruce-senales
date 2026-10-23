# Revisión Codex 7 · lista inicial y variantes del jurado

23 oct 2026, America/Santiago. Objetivo cumplido: **sí**. Evidencia y salidas literales: [evidencia-53-jurado.md](../tests/e2e/evidencia-53-jurado.md).

## Resultado observado

- **#53: 10/10.** Se conserva el F1 positivo de agente-ia y se agrega F1b aparte: espacio lento/lista rápida, primera lista visible sin refresco ni sondeo y con una sola lectura de cada RPC. N1–N8 quedan intactos. La carga inicial del producto está serializada; se prueban ambas combinaciones de latencias, sin fingir concurrencia inversa donde no existe.
- **#17 navegador: 4/4, 23 comprobaciones**, dos veces completas. Interfaz local real a 375 px y backend real; dos identidades anónimas propias reutilizadas, cuatro propuestas por corrida. En la entrega: 202 RPC observadas, solo dos rechazos esperados, cero errores JS y cero llamadas al agente/modelo. Las cuatro propuestas se cancelaron por UI.
- **Typecheck, build, revisión de sintaxis del runner y diff --check: exit 0.** Sin dependencias nuevas.
- **Hallazgos nuevos del producto: ninguno en este alcance.** Dos preparaciones fallidas fueron selectores del guion y están registradas.

| Variante | Evidencia en navegador |
|---|---|
| Mínimo 5 | Publica domingo B; espera con cuatro, confirma cuando Tomi es el quinto; visible en ambos contextos. |
| Anfitrión no disponible antes de evaluar | Sin opción compatible; conserva mínimo y no expone su disponibilidad. |
| Anfitrión no disponible tras baja de Caro | Sin alternativa; conserva En revisión y v1 sin inventar una reparación. |
| Máximo 4 con cinco elegibles | Sofi es rechazada por el servidor desde una pantalla vieja; su botón desaparece en la actual. Tomi confirma último y no se supera el máximo. |

## Archivos propios

- `tests/e2e/red-controlada.mjs`: solo F1b nuevo y resumen.
- `tests/e2e/jurado-navegador.mjs`: nuevo guion reproducible; consultas de coordinación antes de usar la base, aislamiento de sesiones, acciones por UI, lecturas retenidas para el caso del cupo y cancelación de las propuestas propias.
- `tests/e2e/evidencia-53-jurado.md` y este informe.

F1 original es trabajo de agente-ia (`1b8a3d8`). Se incorporó `main` `dda21c6`; no se editaron rutas ajenas, `main`, `TABLERO.md` o `PROPIEDAD.md`. Entrega en `codex/revisiones`.

## Límites y próxima dependencia

La evidencia del navegador es contra código local y backend real con 0030 aplicada; no certifica producción ni dos teléfonos físicos. Tampoco certifica el modelo ni toda la privacidad: solo se escanean las propuestas compartidas observadas y los conteos por rol, conservando los límites de inferencia de la enmienda 7. El guard consulta coordinación, no bloquea la base.

El coordinador debe integrar la rama y ejecutar el guion contra producción si quiere certificar esa versión. Pitch/coordinador pueden actualizar las marcas pendientes de `docs/jurado-variantes.md` usando esta evidencia. No modifiqué ese documento ajeno.
