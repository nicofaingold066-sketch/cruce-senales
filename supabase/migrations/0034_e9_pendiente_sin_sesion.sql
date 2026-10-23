-- CRUCE · 0034 · Enmienda 9, fase 2, corrección: los integrantes pendientes no tienen sesión.
-- 0033 creó los pendientes con user_id null y simulado false, pero la restricción miembros_real_con_sesion
-- (0001: `simulado or user_id is not null`) los rechazaba con 23514, y create_space con p_integrantes
-- respondía fallo_temporal. Se reemplaza por la regla de tres estados disjuntos:
--   * real: user_id no nulo, simulado false, pendiente false;
--   * simulado: user_id nulo, simulado true, pendiente false;
--   * pendiente: user_id nulo, simulado false, pendiente true.
-- Las filas existentes cumplen (ninguna es pendiente). Sin cambios de funciones ni de catálogo (31/0).

alter table cruce.miembros drop constraint miembros_real_con_sesion;
alter table cruce.miembros add constraint miembros_real_con_sesion
  check (simulado or pendiente or user_id is not null);
alter table cruce.miembros add constraint miembros_pendiente_sin_sesion
  check (not (pendiente and (simulado or user_id is not null)));

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
