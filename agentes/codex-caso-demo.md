# Caso demo Makana — pedido directo de Nico, 24 oct 2026

## Tocando ahora
Vacío. Integrado y publicado por el coordinador en main `018215d`; incluye Makana y participación móvil. QA del cliente publicado terminado, sin procesos propios ni escrituras a base. Se respeta congelamiento de UI11:00.

## Decisiones
- Nuevo caso «El plan que no deja a nadie afuera», siete adultos ficticios Ana/Bruno/Camila/Diego/Elena/Felipe/Gabriela.
- Demo aislada e idempotente, sin alterar registros previos. Permisos separados apagados inicialmente; pendientes no cuentan como aceptaciones. Sin mínimo artificial de cuatro en parque.

## Pedidos
- **PARA coordinador: PUBLICACIÓN VERIFICADA.** main018215d incluye ambas ramas; Vercel success y dominio sirve index-ChsMKBzK.js, participaciónJS--p-OCr1Y y CSS D5bFLaB4 HTTP200. QA visual del cliente publicado10/10 a320/375/390/430/1280 claro/oscuro,97RPC sintéticas,0errores/desbordes. No ocupé la base ni hice Auth/RPC/modelo reales. Rutas liberadas y sin cambios posteriores a congelamiento.
- PARA coordinador, Makana: leído tu registro 81b24f8: 0058 aplicada10:33, backend130/130 PASS y reversa guardada. La dependencia de base quedó resuelta por tu circuito autorizado. Para que el caso nuevo y la participación se vean, falta integrar/publicar `origin/codex/demo-makana`8194e96 y `origin/codex/participacion-visible`96ddc27. Mis pruebas posteriores serán sobre assets públicos con Auth/RPC sintéticos; no tomaré la base ni aplicaré migraciones.


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

## Integración participación
- La autorización anterior de Nico de integrar enapp para que sevea se conserva. Cambiofront independiente, sin RPCnuevas ni cambioscontracto/backend. Se entregará por ramapropia para integración delcoordinador. Makana sigue separada con migraciónposterioraactividad, salvoajustes de numbering que confirmeelcoordinador.

## Participación visible entregada
- Commit638a677, rama`codex/participacion-visible`, no se mezcló con fixtureMakana.102puras PASS(13nuevas), tsc/buildPASS,6configUI320/375/1280lightdarkPASS,82RPCsintéticas0errores/desbordes. Rolmiembro común ve mismosactos públicos; pendingnoingreso, simulacionesseparadas; versiónnueva0heredadas; getSpacepollgrupo10syplanesincambiosactualizaningresos/salidas. Revisiónindependientesinhallazgos.
- Evidencia `/Users/macair/.codex/visualizations/2026/10/24/01a16dbb-c25b-7923-80be-5d5b64310a40/participacion-visible/`; captura abierta alusuarioidentificadaMOCKLOCAL. Noautenticación/base/modeloreal, noPRporpermiso403previo, nomainpush por avisovigente10:04.
- Observación frontend/GRU: mascotaflotante cubre parcialmenteetiquetaVersión1a375 yconteoPorentrara320 en capturas; no nombres. No se tocaron sus estilos porqueotro dueñorecientementeanclóGRU. Revisar ensiúltimapublicaciónsiquierenpulido.

## Cambio de instrucción humana — móvil primero, revisión antes de publicar
- La autorización previa de integrar participación queda en espera por la instrucción más reciente de Nico. Primero se presenta una vista móvil estética, coherente con CRUCE; luego Nico y Juan deciden si se sube. Esta instrucción manda sobre cualquier texto anterior de esta ficha.

## Nueva autorización humana — publicación al terminar
- Nico: «cuando termines subilo lo acepto». Levanta la espera anterior para el refinamiento de participación. Se completa QA móvil, se entrega SHA final y se publica por el flujo coordinado; sin tocar base ni migraciones. No se requiere otra confirmación del diseño.

## Entrega móvil autorizada para publicación
- Rama `codex/participacion-visible`, SHA `96ddc27`; conserva main08aa6e2 y las autorías por merge, sin force push. Mejor jerarquía móvil, avatares/nombres/estado, superficies neutras, versión y totales a la izquierda. A320 filas compactas; a375–430 dos columnas; nombres largos completos. GRU no cubre metadatos del panel.
- Evidencia local: `/tmp/cruce-participacion-mobile-preview/` (10 configuraciones,148RPC sintéticas,0errores ydesbordes). PlusJakartaSans servida desde fixtures de fuentes públicas. No se contactó base real. Código limpio, tsc/build y105puras verdes.
- **Dependencia pendiente:** integración/publicación del coordinador para que el usuario lo vea en app. No se da por publicado por haber subido la rama.

- Actualización final: `96ddc27` agrega solo espaciado más compacto en320px y selector de anchos del arnés. Recaptura320 claro/oscuro PASS en `/tmp/cruce-participacion-mobile-preview-final-320/`. No hay más cambios pendientes; árbol limpio. Usar `96ddc27` como punta de la rama para publicar.

## Base Makana activada por el coordinador
- Leído registro81b24f8: 0058 aplicada10:33 y130/130 backend PASS en serie10:41–10:49; marcas retiradas. No ejecuté esas escrituras ni pruebas remotas desde esta sesión. Queda el cliente de Makana más participación en la próxima publicación coordinada. Nico ya autorizó subirlo al terminar.

## Cierre — publicado y mostrado al usuario
- Objetivo de código/integración cumplido: el coordinador publicó main018215d11:03; conservo commits reales638a677/8c62104/96ddc27, sin force push ni publicaciones paralelas. Makana base activada por coordinador; cliente público incorpora seed_demo_makana, demo_caso y parque ficticio.
- Verificación independiente del cliente servido: Vercel success; HTML/JS/CSS públicosHTTP200 y hashes guardados. Navegador10/10configuraciones,97RPCficticias,0errores ydesbordes; aceptación vigente, nueva versión sin herencia, cambios de integrantes y nombre largo. Esto es QA de frontend con transporte interceptado, no un ensayo de Auth/PostgREST/modelo reales.
- Evidencia durable: `/Users/macair/.codex/visualizations/2026/10/24/01a16dbb-c25b-7923-80be-5d5b64310a40/participacion-movil/publicado/` y release.json en su padre. Texto listo para presentación en `caso-demo-para-presentacion.txt`. Capturas de grupo/plan mostradas al usuario, con datos ficticios explícitos.
- Procesos cerrados, árbol de código limpio; ninguna ruta nueva reclamada. Sin cambios de src/base/función tras congelamiento.
