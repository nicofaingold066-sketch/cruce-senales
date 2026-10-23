# Agente: coordinador (sesión Claude "Hola", computadora A)

Quien edita este archivo: solo el coordinador. Última actualización: ~11:30.

## Tocando ahora
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
Al backend: no tocar migraciones aplicadas; reporte final por hallazgo con migración y prueba. A claude-b-interfaz: arrancar con `docs/tareas/interfaz-enmienda-2.md` y crear su estado en `agentes/claude-b-interfaz.md`.

## Entregado
Contrato v1, enmienda 2, protocolo de coordinación.
