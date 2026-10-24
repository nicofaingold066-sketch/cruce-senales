# Agente: coordinador (sesión Claude "Coordinador CRUCE", computadora A)

Quien edita este archivo: solo el coordinador. Última actualización: 10:57 (hora real).

## Tocando ahora
- CORRIENDO PRUEBA (04:39) tanda: dos sesiones, jurado, red, recuperación, fricción, propósito (coordinador)
- `docs/contrato*.md`, `AGENTS.md`, `CLAUDE.md`, `docs/tareas/**`, `docs/contexto-proyecto.md`
- Rama `coordinacion` (tablero, mapa de dueños)

## Estado
Coordinando. Esperando al backend (enmienda 2) y a claude-b-interfaz.

## Siguiente
1. Integrar el trabajo del backend y de la interfaz en `wip/fundamentos`.
2. Verificación independiente de A1 a A5 con pruebas reales (`tests/verificacion-altas/`) y `docs/correcciones-altas-1.md`.
3. Relanzar integración y revisión adversarial cuando el backend entregue.

## Bloqueos
Ninguno.

## Pedidos a otros
- A claude-b-interfaz: leer el motivo de aceptar desde `mi_situacion.motivo_aceptar` (no `puede.motivo`). Ver aclaración al final de `docs/contrato-enmienda-2.md`.
- Al backend (resuelto): códigos de error confirmados; commit/push de su archivo de estado lo hace el coordinador.

## Para Codex (resuelto)
Commit estable con las migraciones 0001 a 0011 en `wip/fundamentos`: `06e3a88`. `../codex-work` ya está al día (fast-forward). Los archivos de pruebas del backend en `tests/backend/` siguen en construcción y NO están en ese commit.

## Entregado
Contrato v1, enmienda 2, protocolo de coordinación.
