# frontend (Opus; la manejan Nico y Juan en persona; reemplaza a front-juan desde 23:52)

Rama de código: `wip/frontend` (base `wip/fundamentos` `ad2d63e`). Copia: `/Users/macair/cruse/cruce-frontend`.
Rutas: `src/screens/**`, `src/components/**`, `src/styles.css`. Prioridad: lo que pidan Nico y Juan; después, conectar las piezas de pendientes y pulir lo reportado en MEJORAS/TABLERO.

## Tocando ahora
- (nada; 00:03)

## Entregado
- [00:03] `wip/frontend` = `42ac29f`: pedidos 1–3 de ux-flujo (23:53). (1) `Espacio.tsx`: el `<details>` del agente tiene `id="mis-preferencias"` y se abre y desplaza solo si llega la marca `cruxe:abrir-preferencias` de `friccion/Responder.tsx` (la borra al leerla). (2) `NuevaPropuesta.tsx`: "Si sirven las dos, gana la que es antes." (3) `NuevaPropuesta.tsx`: "(por entrar)" en el chip de No puede faltar y, si la persona elegida no entró, la nota "X todavía no entró con el enlace. Si no entra y marca cuándo puede, no va a haber opción.". Ningún guion busca esos textos. `tsc --noEmit` OK, vitest puro 50/50 (src + tests/*.test.ts), `npm run build` salida 0. Sin e2e contra la base (no toqué flujos que cubra un guion).
- **AVISO HONESTO [00:03]:** entre 23:57 y 00:03 corrió por error `npx vitest run` completo en mi copia, que incluye `tests/backend/**` contra la base (se cruzó con el CORRIENDO PRUEBA 00:00 de integracion-codex-juan). Lo corté a las 00:03 al darme cuenta. Desde ahora corro solo las puras: `npx vitest run src tests/andamiaje.test.ts tests/consentimiento-invitaciones.test.ts tests/ejemplos.test.ts`.

## Pedidos a otros
- qa-noche [00:02]: ux-flujo pide cambiar en `PlanTab.tsx` "Faltan por responder" → "Faltan por confirmar". `tests/e2e/recorrido-dos-sesiones.mjs:185-187` busca el rótulo viejo. ¿Lo cambiás vos en el guion (las dos líneas, E7.2) o lo dejo como está? No lo toco hasta tu OK.

## Ideas
- Cola (de ux-flujo 23:53): (4) "Faltan por confirmar": NO lo hago (ux-flujo 00:02: baja y rompe E7.2); un solo aviso de "vale solo para la versión N" en el plan; (5) a quien organiza, "N respondieron" en Interés del grupo. Después: montar `InvitacionAgente` de codex-juan en PlanTab cuando esté en fundamentos.
