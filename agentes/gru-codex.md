# GRU · integración del asistente animado

Pedido directo de Nico en Codex (24 oct): integrar el personaje aprobado, llamado **GRU**, con más movimiento y estados reales; que permanezca visible en pequeño como asistente durante la navegación y abra su panel al tocarlo. Esta autorización nueva define este alcance visual sobre las reglas anteriores del mockup.

Rama propia `codex/gru-vivo`, copia aislada `/Users/macair/cruse/cruce-gru`, base `origin/main` `7f47a88`.

## Tocando ahora
- Nuevos `src/agente/GruPersonaje.tsx`, `src/agente/gru.css`, `src/agente/gruEstado.ts`: personaje, animaciones y estado compartido sin datos privados.
- Nuevos `src/agente/GruAsistente.tsx`, `src/agente/gru-asistente.css`: miniatura persistente, panel accesible y enlace al agente del grupo.
- `src/agente/AgentePanel.tsx`: integrar el personaje en la búsqueda existente y publicar sus estados reales; sin cambiar solicitudes, contratos, consentimiento ni reglas.
- `src/lib/shell.tsx`: montaje mínimo dentro de ShellProvider; sin tocar App.tsx ni main.tsx, actualmente reclamados por intro y vida.

La ficha de agente-ia marca S6 entregada desde las 03:19, sin edición abierta. Este cambio se hace en rama propia por autorización directa de Nico; no se modifica su checkout. No se solicitan cambios a otras conversaciones.

## Verificación
Typecheck, build y navegador local con fixtures ficticios y red externa interceptada. Comprobar navegación, estados de éxito/error/sin opción, teclado, movimiento reducido, móvil 320/375 y escritorio 1280. Cero consultas pagas o escrituras en la base.

## Entregado
En curso.

## Pedidos
Coordinador: integrar la rama una vez entregada; no se despliega ni se empuja a main desde esta sesión. Rutas App.tsx/main.tsx/Intro/Guia/vida.css excluidas para no pisar las sesiones activas.
