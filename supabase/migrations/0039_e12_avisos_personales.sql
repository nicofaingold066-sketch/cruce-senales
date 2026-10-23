-- CRUCE · 0039 · Enmienda 12 (docs/contrato-enmienda-12.md): avisos personales de "siguiente acción".
-- Sin códigos nuevos, sin RPC nuevas, sin campos nuevos: solo cambia cuándo se muestra `reunir_condiciones` y su
-- texto, y solo a la persona a la que le toca (siguiente_accion ya es personal desde la enmienda 3).
--   (a) reuniendo_interes, quien consulta es el organizador de la propuesta, es el imprescindible y no tiene
--       condiciones completas: `reunir_condiciones` con "Primero marca tu disponibilidad: eres quien no puede
--       faltar." en lugar de `buscar_opcion` (y del texto general). Si la última evaluación fue sin_opcion, el
--       código sigue siendo `sin_opcion` como antes.
--   (b) opción publicada (esperando_compromisos o grupo_confirmado) y quien consulta tiene condiciones
--       incompletas y todavía puede guardarlas: `reunir_condiciones` con "Completa tu disponibilidad para poder
--       entrar en la opción.". No cambia elegibilidad, cupos ni conteos.
-- Las demás personas no ven ningún cambio. Cuerpo copiado de 0012/0013 (cruce.siguiente_accion_personal);
-- solo se agregan los dos casos.

create or replace function cruce.siguiente_accion_personal(v jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_sig jsonb := v -> 'siguiente_accion';
  v_est text := v ->> 'estado';
  v_ver text := v #>> '{opcion,version}';
  v_faltan integer := coalesce((v #>> '{opcion,cupos,faltan_para_minimo}')::integer, 0);
  v_conds integer := coalesce((v ->> 'personas_con_condiciones')::integer, 0);
  v_mis_conds text := v #>> '{mi_situacion,condiciones}';
begin
  if coalesce((v #>> '{mi_situacion,puede,aceptar}')::boolean, false) then
    return jsonb_build_object('codigo', 'te_toca_aceptar', 'texto', 'Te toca confirmar la versión ' || v_ver || '.');
  end if;
  -- E12 (b): con una opción publicada, quien tiene condiciones incompletas queda fuera del cálculo; se le dice a él.
  if v_est in ('esperando_compromisos', 'grupo_confirmado') and v_mis_conds = 'incompletas'
     and coalesce((v #>> '{mi_situacion,puede,guardar_condiciones}')::boolean, false) then
    return jsonb_build_object('codigo', 'reunir_condiciones', 'texto', 'Completa tu disponibilidad para poder entrar en la opción.');
  end if;
  if v_est = 'esperando_compromisos' and coalesce((v #>> '{mi_situacion,acepte_version}')::boolean, false) then
    return jsonb_build_object('codigo', 'ya_aceptaste', 'texto',
      'Ya confirmaste la versión ' || v_ver || '. '
      || case when v_faltan = 1 then 'Falta 1 para el mínimo.'
              when v_faltan > 1 then 'Faltan ' || v_faltan || ' para el mínimo.'
              else 'Falta la aceptación de ' || (v #>> '{imprescindible,nombre}') || '.' end);
  end if;
  -- E12 (a): el organizador que es el imprescindible marca primero su disponibilidad.
  if v_est = 'reuniendo_interes' and v_sig ->> 'codigo' = 'reunir_condiciones'
     and coalesce((v #>> '{mi_situacion,es_organizador}')::boolean, false)
     and (v #>> '{mi_situacion,miembro_id}') = (v #>> '{imprescindible,miembro_id}')
     and v_mis_conds is distinct from 'completas' then
    return jsonb_build_object('codigo', 'reunir_condiciones', 'texto', 'Primero marca tu disponibilidad: eres quien no puede faltar.');
  end if;
  if v_est = 'reuniendo_interes' and coalesce((v #>> '{mi_situacion,puede,evaluar}')::boolean, false)
     and v_sig ->> 'codigo' = 'reunir_condiciones' and v_conds >= (v ->> 'minimo')::integer then
    return jsonb_build_object('codigo', 'buscar_opcion', 'texto',
      'Ya hay ' || v_conds || ' personas con condiciones. Busca una opción compatible.');
  end if;
  return v_sig;
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
