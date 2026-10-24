# Actividad del grupo — pedido directo de Nico

## Objetivo autorizado
Nico aprobó la variante «A la vista» y pidió implementarla dentro del grupo, visible a todos los miembros: quién se unió, quién salió y quién se bajó de un plan. Esta autorización actual sustituye H14/E13 únicamente en la identidad pública de estos movimientos; motivos, condiciones, opiniones y preferencias siguen privados.

## Tocando ahora
Vacío. Implementación, integración y publicación completadas; sin procesos contra la base.

## Pedidos
- Coordinador: integrar esta función tras su revisión. La actividad muestra nombres por el pedido explícito actual de Nico. No hace públicos motivos, preferencias, opiniones, ni si alguien había confirmado antes de retirarse.

## Estado
Nico autorizó además integrar y publicar en producción al terminar (mensaje de esta sesión). Front integrado y 62 pruebas puras + tipos/build en verde. Migración en construcción, todavía no aplicada. Se verifican SQL y roles en PostgreSQL aislado PGlite fuera del repositorio; las 56 migraciones base aplican sin modificaciones.

Acceso de publicación: el conector Supabase de esta sesión lista cero proyectos y rechaza el proyecto CRUXE por permisos; Nico inició sesión en el panel de Supabase y confirmó la conexión; acceso al SQL Editor del proyecto de producción verificado. Se inspeccionan metadatos antes de aplicar. Migración aplicada por SQL Editor en transacción; catálogo real 42 RPC autenticadas/0 sin sesión. Primera tentativa revertida por validación histórica; corregida y aplicada sin reescribir filas antiguas. Vercel se publicará por la integración Git existente tras la verificación de backend.

## Entregado y verificado
- Rama `codex/actividad-grupo`; integrado en `main` hasta `b287d40aa6696be55c4b666f1cc67e9813a803b0`, sin sobrescribir trabajo de otras sesiones. Push directo autorizado por Nico; el conector GitHub rechazó crear PR por permisos de integración.
- Producción: https://cruce-senales.vercel.app — despliegue Vercel `7hgcCrYmDiEdNJrLHTPRM1YmHV49`, estado completado. Sirve `index-CvMCUKls.js`.
- Migración `20261024115616_actividad_grupo` instalada por el SQL Editor autenticado por Nico; hash `7db1f026e0c8a85d31f33906285fc738c1f16e9ea2053c7af25afaee13ec9ddd`. La primera tentativa se revirtió completa por un nombre histórico inválido. La versión final aplica sin reescribir filas antiguas ni relajar sus validaciones.
- Backend real: 6/6 pruebas de actividad, 6/6 E13 tras recuperarse una interrupción de conexión, 9/9 E2/privilegios. Tipos, build y 62 pruebas puras en verde. Local: rollback forzado del segundo retiro y regresión de datos históricos, en verde.
- Catálogo real: 42 RPC autenticadas, 0 sin sesión, 0 helpers expuestos y 0 tablas sin RLS. Security Advisor actualizado: 0 errores, 43 warnings y 22 sugerencias; se conserva el patrón de RPC SECURITY DEFINER y tablas deny-all documentado por backend. No cambios de credenciales ni servicios pagos.
- Navegador de producción, integrante sin rol organizador, grupo ficticio: tres movimientos con nombres correctos, historial desplegable, enlace al plan correcto, texto de privacidad actualizado, salida con confirmación que elimina el grupo de su lista y reingreso con la misma sesión que conserva el historial y no reactiva la participación del plan. Vista local a 320/375/1280, claro/oscuro, contraste mínimo4,70:1, teclado y movimiento reducido verificados.
- Captura del resultado: `/Users/macair/.codex/visualizations/2026/10/24/01a16db3-ad22-7d63-ac71-ce6af715d0f1/actividad-produccion.png`.
- Archivos: nuevos `src/actividad-grupo/**`, montaje en Espacio, API/tipos aditivos, migración nueva, suite backend y expectativas ACL42, textos de privacidad en QueGuarda/Perfil/Resultado, `docs/actividad-grupo.md`.
- Límites: ingresos/salidas empiezan con esta versión, sin inventar fechas anteriores; las bajas de planes existentes sí se proyectan. Organizador del grupo no sale sin transferencia (todavía no implementada); quien organiza un plan activo debe cancelarlo primero. Nombres históricos inválidos requieren reparación separada y no se modifican aquí.
