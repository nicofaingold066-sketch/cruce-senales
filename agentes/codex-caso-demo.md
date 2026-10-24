# Caso demo Makana — pedido directo de Nico, 24 oct 2026

## Tocando ahora
Vacío. Compatibilidad con main74b5cbe terminada y comprobada solo localmente. Sin procesos propios ni turno de base. Activación remota pendiente de acceso y circuito del coordinador.


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

## Entregado final
- Rama remota `codex/demo-makana`, commit `ce3b9f1`; incluye main `8fba205` sin perder sus commits ni autorías. Árbol limpio. Código, semilla0057 y guion; fuente canónica selecciona el nuevo caso y conserva el anterior para regresiones.
- 89 pruebas puras PASS; typecheck/build PASS; 6 HTTP soloSupabaselocal omitidas, no contadas. Browser mock103RPC4anchosPASS. Ensayo integrado Authsimulado+PostgreSQLreal110RPC11fasesUI PASS, repetido tras main8fba205. Mig57/upgradelegacy/roles/consentprivacidad/resetfallo PASS. Revisión independiente sin hallazgos. Sin modelo/clima real.
- Evidencia durable: `/Users/macair/.codex/visualizations/2026/10/24/01a16dbb-c25b-7923-80be-5d5b64310a40/demo-makana/`. Todos los servidores y navegadores propios cerrados; 0 errores en221RPC bridge acumuladas.
- Activación pendiente: pregunta de autorización específica presentada al humano. Supabase permiso denegado; Vercel scope403 y autorización equipo404; GitHub createPR403 (noPR creada). Push propia rama sí permitido. No se buscó saltar accesos ni se subió cliente roto a main.
- PARA coordinador/Nicolás: integrar SOLO después de aplicar0057 por circuito autorizado; luego publicar cliente y ensayar3sesiones enentorno real. El usuario pidió explícitamente que se veaenapp; falta este paso remoto y no se presenta como cumplido.

## Hallazgo de compatibilidad al retomar
- mainb287d40 trae actividad y leave_space, DBcatálogo42 sin Makana. La0057anterior42 no se debe aplicar; se prepara migración posterior aactividad con43/0 y wrappers que preservan actividad. Se repetirán fresh/upgrade y ensayo3perfiles enlocal. Conexiónhabilitada delplugin no implica acceso alproyecto.

## Entrega V2 — reemplaza instrucciones de 0057
- NO aplicar0057: no fue aplicada y se reemplazó por `20261024124500_demo_makana.sql`, DESPUÉS de actividad del grupo. Rama remota `codex/demo-makana`: bbb31ed (backendcompatible), cierre documentado en últimoHEAD.
- Validado fresh58 yupgrade57actual→58:43/0, privacidad, actividad, propietarios/salidas/reingreso yreset aislado; SQLsin errores. Ensayo3contextosSQLreal110RPC/11fases UI PASS; mock4anchos103RPC PASS; typecheck/build PASS,89puras PASS y7HTTPomitidas (no contadas). Detectado y resuelto duplicado de mínimo trasmerge, conservando límites catálogo.
- EvidenciaV2 durable en `/Users/macair/.codex/visualizations/2026/10/24/01a16dbb-c25b-7923-80be-5d5b64310a40/demo-makana/compatibilidad-actividad/`. Todos los bridge/Vite/browser cerrados.
- Acceso revalidado por pedidoexpreso humano: pluginhabilitado y cuenta confirmada por usuario; conector solo muestra org `juanmorales10's projects`, list_projects vacío yget_projectCRUCE deniega. Refcontrastado con.env yJS PÚBLICOweb: `tjkfdnvzsikncjbskufm` correcto. Ninguna migración ni escritura remota.
- PARA coordinador: nueva migracióncompatible lista enrama; el usuario quiere integración visible. Mantengo orden activaciónbaseautorizada→cliente→ensayoreal, respetando tu turno y el aviso «Nadie más aplica migraciones». No se pide a otro agente saltar acceso denegado.
