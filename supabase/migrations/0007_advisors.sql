-- CRUCE · 0007 · Ajustes tras get_advisors (security + performance)
--
-- performance / unused_index: aceptaciones_miembro_idx no cubre ninguna clave foránea
-- (aceptaciones referencia a elegibles por la clave compuesta, cubierta por la restricción única
-- aceptaciones_una_por_version) y ninguna consulta filtra solo por miembro_id. Se elimina.
drop index if exists cruce.aceptaciones_miembro_idx;

-- Hallazgos revisados y aceptados a propósito (sin cambios):
-- * rls_enabled_no_policy (INFO, 14 tablas de `cruce`): denegar todo es el diseño. El esquema `cruce`
--   no está expuesto y anon/authenticated no tienen privilegios; el acceso es solo vía RPC.
-- * authenticated_security_definer_function_executable (WARN, 25): la API del contrato son funciones
--   SECURITY DEFINER con search_path vacío que toman el actor de auth.uid().
-- * anon_security_definer_function_executable (WARN, 25): el contrato 0.1 exige que anon pueda
--   ejecutarlas para responder `sesion_invalida` sin sesión (prueba C0). Cada función corta en el
--   primer paso si auth.uid() es nulo, sin leer ni escribir datos.
-- * auth_leaked_password_protection (WARN): ajuste de Auth, no de la base; no hay contraseñas
--   (solo sesiones anónimas). Decisión humana.
