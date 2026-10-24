# Caso demo Makana — pedido directo de Nico, 24 oct 2026

## Tocando ahora
- Pedido humano: «que este sea el caso demo, cambiemos lo del asado por este ejemplo», con especificación de siete compañeros ficticios y parque. Preparación en rama aislada `codex/demo-makana`, copia `/Users/macair/cruse/cruce-demo-makana`.
- Rutas puntuales: nuevo `src/lib/casoDemo.ts`; `src/screens/{Inicio,NuevaPropuesta,SimulacionTab}.tsx`; `src/lib/{api,types}.ts` solo selector del caso; nueva `supabase/migrations/0057_demo_makana.sql` y `tests/backend/demo-makana.test.ts` y alineación del catálogo de 42 RPC en `tests/backend/{helpers,enmienda2.test,enmienda13.test}.ts`, sin cambiar migraciones aplicadas; `tests/e2e/demo-makana-local.mjs`; `src/components/Guia.tsx` solo textos/personajes del caso; fix mínimo del header en reglas existentes `.barra-identidad` y `.barra-rol` de `src/styles.css`, más especificidad de `.vista-s3.s3-centrada > .escena` en `src/estilo/seccion-s3.css` (desborde375 y título negro en cabeceraoscura, evidencias /tmp/cruce-demo-ui-qa); `docs/demo-makana.md` y `docs/caso-canonico.md` solo selector del nuevo caso y rotulado del caso anterior como legacy.
- No hay rutas coincidentes activas según fichas leídas 08:53. Esta preparación responde al pedido nuevo de Nico; se conserva el diseño y los cambios de otras sesiones. No integrar main ni publicar.
- SOLO trabajo y comprobaciones LOCALES: sin SQL remoto, sesiones remotas, migraciones aplicadas, modelos ni despliegues. No tomo la base; sigue con el coordinador.

- Nuevo pedido humano 09:00 aprox: «cuando termines todo integra los cambios en la app así se ve». Integro por el flujo coordinado tras comprobaciones; no borro datos existentes.

## Decisiones
- Nuevo caso «El plan que no deja a nadie afuera», siete adultos ficticios Ana/Bruno/Camila/Diego/Elena/Felipe/Gabriela.
- Demo aislada e idempotente, sin alterar registros previos. Permisos separados apagados inicialmente; pendientes no cuentan como aceptaciones. Sin mínimo artificial de cuatro en parque.

## Pedidos
- Coordinador: entregaremos rama comprobada para revisión e integración. La activación de la migración/fixture en Supabase queda con Nicolás y el coordinador; no hago despliegues paralelos. Si hay nuevas asignaciones coincidentes, anotarlas antes de integrar.

## Entregado
- En preparación.

## Comprobación local 08:59
- PostgreSQL PGlite: migraciones 0001..0057, roles42/0/helpers0, idempotencia, aislamiento, consentimiento y privacidad. Golden path v1A Ana+Felipe2 → baja1/revisión → v2B0 → Ana+Camila2; Gabriela pendiente. Ciclo social SIN modelo + reset + misma oportunidad repetible: PASS; errores internos0. NO acredita despliegue.

## Activación remota
- Conector Supabase `list_projects` devuelve vacío y `get_project(tjkfdnvzsikncjbskufm)` rechaza permiso. No intento saltar acceso. Vercel requiere autorización de equipo. No se aplicó 0057 ni se publicó cliente que dependa de ella.
- Coordinador/Nicolás: el usuario pide integrar y verlo. Entrego rama; activar 0057 requiere acceso y aprobación específica de producción según su texto. Mantener orden base→cliente.

## Entrega preparada
- Rama remota `codex/demo-makana`: bb124ff (UI+guion), b5ecc20 (backend0057+tests), 8b9bb14 (defectosvisual). Conservados commits de otras sesiones vía merge origin/main. PR no pudo crearse: integración GitHub devuelve403; rama sí subida.
- Ensayo integrado LOCAL: app→SDK→HTTP→PostgreSQL/PGlite, Authsimulado; 3perfiles,11fases UI,110RPCreales,0errores. v2domingo0confirmaciones y reconfirmaciónPASS. Sinmodelo/clima ni Supabase remoto.
