# Agente: codex (revisor independiente, computadora A)

Quien edita este archivo: solo codex. Actualización: 23 oct 2026, cierre de tareas autorizadas por Nico.

## Tocando ahora
- Mejora #1: `tests/e2e/recorrido-canonico.test.ts` y evidencia (agregar exclusión de preferencias y repetir dos veces).
- Mejora #17: `tests/e2e/jurado-variantes.test.ts` y evidencia en `tests/e2e/`.

## Estado
Tareas del aviso 12:39 completadas en orden, con autorización directa de Nico.
1. `tests/e2e/recorrido-canonico.test.ts`: dos sesiones anónimas reales, demo propio, Luna reclama asiento limpio, carga atómica. Tres escenarios: golden path v1→baja→v2 con cero heredadas, sin opción inicial, sin alternativa tras baja. Dos ejecuciones consecutivas del MISMO archivo: 3/3 + 3/3; 63 RPC verificadas cada vez; 8.37 s y 73.50 s. Typecheck pasa. Salida literal en `tests/e2e/evidencia-recorrido-canonico.md`. Commit 1511b34.
2. `docs/revision-codex-4-ui.md`: 0 altas, 5 medias, 2 bajas. Revisión estática, no navegador. Prioridad: lista sin filtro de revisión/generación, doble creación mientras abre, RPC sin timeout. Commit 3718b6b.
3. `docs/revision-codex-5-readme.md`: contraste con bases oficiales v1.5, 0 altas, 4 medias, 2 bajas y propuesta compacta para el dueño de README. Commit b45c226.

Base revisada 4477919 (merge ya presente en codex/revisiones, HEAD inicial 7eb5965). No hubo cambios propios en src/, supabase/, README, configuración o main. Sin instalación de dependencias; .env local ignorado. El E2E verifica RPC, no render ni despliegue. Las pruebas cancelan propuestas propias y cierran sesión; quedan usuarios/demos ficticios de prueba. No se usaron credenciales administrativas.

## Siguiente
Aplicando prompts/codex.md por instrucción directa de Nico. #1/#10/#16 entregadas; completar #1 con control de preferencias y ejecutar #17. Vigía shell codex 60 activo.

## Bloqueos
Ninguno para la entrega. El worktree compartido de coordinación tenía un cambio ajeno sin guardar en agentes/backend.md; se publicó esta ficha desde un worktree temporal aislado sin tocarlo.

## Pedidos a otros
- coordinador: integrar 1511b34, 3718b6b y b45c226 desde codex/revisiones. La evidencia API no sustituye el navegador.
- interfaz: revisar U1–U7 en revision-codex-4-ui, primero U1/U2/U3. No se editó tu código. La corrección 08a87c3 del resumen de carga se reconoce como ya publicada en tu rama.
- coordinador: revisar R1–R6 de revision-codex-5-readme antes de la entrega (promesa de unanimidad, evidencia/estado, atribución, causa no validada). No se cambió README.

## Entregado
`codex/revisiones`, HEAD b45c226: E2E + evidencia y revisiones 4/5. Informes 1–3 previos conservados (revisión 3: a2c5d35). Ningún push a main.

## Ideas
- Probar respuestas fuera de orden y timeout desde navegador con red controlada (interfaz; U1–U4).
- Regresión de privacidad del agente con preferencias propias y ajenas, sin invocar modelos pagos (Codex/backend, cuando haya migraciones estables).
