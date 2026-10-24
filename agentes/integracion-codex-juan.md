# Integración Codex — Juan Morales

## Tocando ahora
- Consentimiento E11: `src/agente/api.ts`, `src/agente/AgentePanel.tsx`, `src/agente/ConsentimientoInvitaciones.tsx`, `tests/consentimiento-invitaciones.test.ts`.
- Rama dedicada `codex/e11-consentimiento-invitaciones`, base `main a5381ad`. Juan autorizó explícitamente asumir esta integración sin depender de cesión del coordinador. No se modifican worktrees ni fichas ajenos.
- Verificación solo local y con mocks. Sin SQL, migraciones, modelo o pruebas DB. No publicar a main durante el turno de producción vigente.
- Siguiente corte delegado a agente-social: SOLO `supabase/functions/agente/social/{contratos.ts,orquestador.ts,orquestador.test.ts}`, rama nueva `codex/e11-orquestador` y worktree aislado. Adaptación pura E11; no handler, UI, SQL o reparación automática. Juan sustituyó expresamente la dependencia organizativa del reparto antiguo; no se sustituyen controles de acceso.

## Entregado
- Tanda UX en `main a5381ad`: cuatro commits de Juan Morales, sin squash. Tipos/build y QA aplicada verdes. Vercel success y assets públicos verificados. No certifica E2E ni Figma.
- Consentimiento E11: rama remota `codex/e11-consentimiento-invitaciones`, HEAD `816d540` reconciliado con `main 140cdaf`. 18 pruebas de contrato sin red, tipos/build PASS; QA UI con cliente y componentes reales sobre RPC simuladas 22/22, consola limpia. No DB ni inferencia. Pendiente integrar cuando se retire la pausa/migración; el control se deshabilita si falta el booleano E11.

## Pedidos a otros
- agente-ia: esta unidad toma únicamente consentimiento de invitaciones en las rutas arriba, separado de E8. No encontré una copia local accesible ni implementación publicada E11 en su rama (593dc5f). Avisar si ya existe trabajo local para no duplicarlo.
- QA UX: verifica el commit aplicado con datos ficticios, sin base ni modelo. No modifica fuentes de esta rama.
- backend: para la adaptación E11/E14 necesitamos el puente FINAL de 0049: forma exacta de `plan.actividad`, `quorum` raíz y metadatos de candidata, firmas y momento en que quedan aplicadas/compatibles. No asumimos `plan.quorum` ni calculamos mínimo en cliente. Responder con contrato/commit entregado; no requiere ejecutar SQL para nosotros.
- coordinador: consentimiento listo en la rama arriba. Esperamos el retiro de MIGRACION EN CURSO 0048/0049 y del humo de producción para integrar sin interrumpir operaciones. No pedimos transferir autoridad de publicación ni realizar pruebas concurrentes.
- agente-ia: conservar al integrar #108 los campos/operaciones del consentimiento E11 de nuestra rama; sus cambios de timeout/reintento y el trabajo E14 son distintos. Reconciliamos por main sin sobrescribir sus commits.

## Límites
- E11 definitiva ya reportada aplicada como 0041; el frontend falla cerrado si no recibe el booleano del contrato.
- 0047 terminó; última lectura: 0048 en MIGRACION EN CURSO y humo de producción del coordinador 22:00. Se conserva la pausa de operaciones remotas.
- Sin autonomía, aprobación, publicación o reparación automática en esta unidad.
