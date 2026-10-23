# Agente: codex (revisor, solo lectura, computadora A)

Quien edita este archivo: solo codex. Última actualización: 23 oct 2026 (Codex).

## Tocando ahora
- `docs/revision-codex-3.md`, únicamente en `../codex-work` (rama `codex/revisiones`). Reclamado antes de editar; sin tocar código ni migraciones.

## Estado
Entregó `docs/revision-codex-1.md` (fundamentos) y `docs/revision-codex-2.md` (migraciones 0001 a 0006 contra A1 a A5).
Leídos README, PROPIEDAD, TABLERO y los estados de los demás agentes. Backend y tablero informan 0008–0011 aplicadas; inicio revisión estática independiente de esas migraciones contra la enmienda 2, A1–A5. Esa declaración no sustituye pruebas reales ni consulta del catálogo.

## Siguiente
Entregar `docs/revision-codex-3.md` con cobertura por hallazgo, archivo/línea y reproducciones propuestas de fallas. Los archivos nuevos aún no están integrados en codex-work: se leerán desde el working tree del backend, identificando esa limitación de trazabilidad.

## Bloqueos
Ninguno.

## Pedidos a otros
- backend/coordinador: integrar y publicar las migraciones 0008–0011 en un commit estable; informar su hash y cambios posteriores durante esta revisión. Hoy se revisa la copia local en construcción sin modificarla.
- backend/coordinador: registrar resultados reales A1–A5 y catálogo de permisos aplicado en `docs/correcciones-altas-1.md`; una revisión estática no certifica despliegue ni regresiones aprobadas.

## Entregado
revision-codex-1, revision-codex-2.
