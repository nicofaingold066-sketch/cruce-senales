-- CRUCE · 0013 · Enmienda 3, ajuste de texto: ya_aceptaste usa singular con X = 1
-- ("Falta 1 para el mínimo.") y plural con X > 1 ("Faltan X para el mínimo."). Sin otros cambios.
create or replace function cruce.siguiente_accion_personal(v jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_sig jsonb := v -> 'siguiente_accion';
  v_est text := v ->> 'estado';
  v_ver text := v #>> '{opcion,version}';
  v_faltan integer := coalesce((v #>> '{opcion,cupos,faltan_para_minimo}')::integer, 0);
  v_conds integer := coalesce((v ->> 'personas_con_condiciones')::integer, 0);
begin
  if coalesce((v #>> '{mi_situacion,puede,aceptar}')::boolean, false) then
    return jsonb_build_object('codigo', 'te_toca_aceptar', 'texto', 'Te toca confirmar la versión ' || v_ver || '.');
  end if;
  if v_est = 'esperando_compromisos' and coalesce((v #>> '{mi_situacion,acepte_version}')::boolean, false) then
    return jsonb_build_object('codigo', 'ya_aceptaste', 'texto',
      'Ya confirmaste la versión ' || v_ver || '. '
      || case when v_faltan = 1 then 'Falta 1 para el mínimo.'
              when v_faltan > 1 then 'Faltan ' || v_faltan || ' para el mínimo.'
              else 'Falta la aceptación de ' || (v #>> '{imprescindible,nombre}') || '.' end);
  end if;
  if v_est = 'reuniendo_interes' and coalesce((v #>> '{mi_situacion,puede,evaluar}')::boolean, false)
     and v_sig ->> 'codigo' = 'reunir_condiciones' and v_conds >= (v ->> 'minimo')::integer then
    return jsonb_build_object('codigo', 'buscar_opcion', 'texto',
      'Ya hay ' || v_conds || ' personas con condiciones. Busca una opción compatible.');
  end if;
  return v_sig;
end
$$;

revoke all on function cruce.siguiente_accion_personal(jsonb) from public, anon, authenticated;
select cruce.verificar_privilegios();
