# Caso demo Makana — pedido directo de Nico, 24 oct 2026

## Tocando ahora
- Pedido humano: «que este sea el caso demo, cambiemos lo del asado por este ejemplo», con especificación de siete compañeros ficticios y parque. Preparación en rama aislada `codex/demo-makana`, copia `/Users/macair/cruse/cruce-demo-makana`.
- Rutas puntuales: nuevo `src/lib/casoDemo.ts`; `src/screens/{Inicio,NuevaPropuesta,SimulacionTab}.tsx`; `src/lib/{api,types}.ts` solo selector del caso; nueva migración de fixture y sus pruebas específicas, sin cambiar migraciones aplicadas; `docs/demo-makana.md`.
- No hay rutas coincidentes activas según fichas leídas 08:53. Esta preparación responde al pedido nuevo de Nico; se conserva el diseño y los cambios de otras sesiones. No integrar main ni publicar.
- SOLO trabajo y comprobaciones LOCALES: sin SQL remoto, sesiones remotas, migraciones aplicadas, modelos ni despliegues. No tomo la base; sigue con el coordinador.

## Decisiones
- Nuevo caso «El plan que no deja a nadie afuera», siete adultos ficticios Ana/Bruno/Camila/Diego/Elena/Felipe/Gabriela.
- Demo aislada e idempotente, sin alterar registros previos. Permisos separados apagados inicialmente; pendientes no cuentan como aceptaciones. Sin mínimo artificial de cuatro en parque.

## Pedidos
- Coordinador: entregaremos rama comprobada para revisión e integración. La activación de la migración/fixture en Supabase queda con Nicolás y el coordinador; no hago despliegues paralelos. Si hay nuevas asignaciones coincidentes, anotarlas antes de integrar.

## Entregado
- En preparación.
