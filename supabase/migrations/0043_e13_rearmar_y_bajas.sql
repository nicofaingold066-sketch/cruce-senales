-- CRUCE · 0043 · Enmienda 13 (b) y (c) (docs/contrato-enmienda-13.md, aprobada por Nico 20:51).
-- (b) Rearmar con lo nuevo:
--   * propose_repair se acepta también desde esperando_compromisos si la versión vigente tiene al menos un
--     "así no puedo" que vale (cruce.opiniones_efectivas). Sin eso: opcion_desactualizada/estado_no_admite.
--   * Tope: 3 versiones por propuesta. Con la versión 3 vigente: sin_alternativa/tope_versiones (también desde
--     en_revision). El organizador cierra o cancela.
--   * La versión nueva usa el motor y publicar_version de siempre: cero aceptaciones y cero opiniones (las opiniones
--     son por versión), disponibilidad actual, sin reincorporar a quien se retiró. Sin franja viable: sin_alternativa
--     como hoy (la versión vigente sigue).
--   * siguiente_accion del organizador en esperando_compromisos con opiniones_totales.asi_no_puedo no null y menos de
--     3 versiones: buscar_opcion "Algunos no pueden así: puedes rearmar con lo nuevo."
-- (a) opiniones_totales: solo para el organizador de la propuesta, {asi_no_puedo: n} con null si n < 2.
-- (c) Baja sin nombre: en la vista de cada persona, las bajas y los eventos de baja de OTRAS personas salen como
--     "Una persona" (miembro_id null), sin decir si había confirmado (habia_aceptado null). La propia, como hoy.
--     Quien se retira recibe "Gracias por avisar. No hace falta contar por qué." (mismo código de siempre).
-- Cuerpos copiados: propose_repair de 0008/0011, siguiente_accion_personal de 0040, vista_propuesta de 0041.

create or replace function public.propose_repair(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_err jsonb;
  v_clave text;
  v_ver integer;
  v_rev integer;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  perform cruce.bloquear_espacio(v_esp);
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'propose_repair', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_yo := cruce.bloquear_actor_y_propuesta(p_propuesta_id, v_esp, v_uid, null);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  -- E13 (b): también desde esperando_compromisos.
  v_err := cruce.chequeo_estado(p.id, array['en_revision', 'esperando_compromisos']);
  if v_err is not null then
    return v_err;
  end if;
  -- E13 (b): desde esperando_compromisos, solo con al menos un "así no puedo" que vale en la versión vigente.
  if p.estado = 'esperando_compromisos' and cruce.opiniones_efectivas(p.id) < 1 then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  -- E13 (b): tope de 3 versiones por propuesta.
  if coalesce(p.version_vigente, 0) >= 3 then
    perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                  cruce.generacion(v_esp), p.id,
                                  jsonb_build_object('tipo', 'error', 'codigo', 'sin_alternativa', 'detalle', 'tope_versiones'));
    return cruce.err('sin_alternativa', 'tope_versiones', p.state_rev);
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is null then
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = 'sin_alternativa', ult_eval_version = null, ult_eval_en = cruce.ahora()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'reparacion_sin_alternativa', v_yo, 'persona', null,
                         p.estado, p.estado, p.version_vigente, p.version_vigente, v_rev);
    perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                  cruce.generacion(v_esp), p.id,
                                  jsonb_build_object('tipo', 'error', 'codigo', 'sin_alternativa', 'detalle', 'sin_alternativa'));
    return cruce.err('sin_alternativa', 'sin_alternativa', v_rev);
  end if;

  v_ver := cruce.publicar_version(p.id, v_clave);
  update cruce.propuestas x
    set estado = 'esperando_compromisos', state_rev = x.state_rev + 1,
        ult_eval_resultado = 'reparacion_publicada', ult_eval_version = v_ver, ult_eval_en = cruce.ahora()
  where x.id = p.id returning x.state_rev into v_rev;
  perform cruce.evento(p.id, 'reparacion_publicada', v_yo, 'persona', null,
                       p.estado, 'esperando_compromisos', p.version_vigente, v_ver, v_rev);
  v_res := jsonb_build_object('tipo', 'reparacion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('propose_repair', sqlstate, v_ctx);
end
$$;

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
  -- E13 (c): quien se retiró: un agradecimiento, sin pedir motivo (mismo código de siempre).
  if coalesce((v #>> '{mi_situacion,retirado}')::boolean, false)
     and v_est in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision') then
    return jsonb_build_object('codigo', v_sig ->> 'codigo', 'texto', 'Gracias por avisar. No hace falta contar por qué.');
  end if;
  if coalesce((v #>> '{mi_situacion,puede,aceptar}')::boolean, false) then
    return jsonb_build_object('codigo', 'te_toca_aceptar', 'texto', 'Te toca confirmar la versión ' || v_ver || '.');
  end if;
  -- E12 (b): con una opción publicada, quien tiene condiciones incompletas queda fuera del cálculo; se le dice a él.
  if v_est in ('esperando_compromisos', 'grupo_confirmado') and v_mis_conds = 'incompletas'
     and coalesce((v #>> '{mi_situacion,puede,guardar_condiciones}')::boolean, false) then
    return jsonb_build_object('codigo', 'reunir_condiciones', 'texto', 'Tu disponibilidad está incompleta: no entraste en esta versión. Si la completas, cuenta si el plan se rearma.');
  end if;
  -- E13 (b): el organizador ve que puede rearmar cuando 2 o más dijeron "así no puedo" (y quedan versiones).
  if v_est = 'esperando_compromisos' and coalesce((v #>> '{mi_situacion,es_organizador}')::boolean, false)
     and (v #>> '{opiniones_totales,asi_no_puedo}') is not null and coalesce(v_ver::integer, 0) < 3 then
    return jsonb_build_object('codigo', 'buscar_opcion', 'texto', 'Algunos no pueden así: puedes rearmar con lo nuevo.');
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

create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
  v_n integer;
  -- E13 (c): cómo sale otra persona en una baja.
  v_anon constant jsonb := jsonb_build_object('miembro_id', null, 'nombre', 'Una persona', 'simulado', false);
begin
  if v is null then
    return null;
  end if;
  -- E13 (a): total de "así no puedo" que valen; con menos de 2, null. Se calcula antes de la siguiente acción y
  -- después se oculta a quien no organiza la propuesta.
  v_n := cruce.opiniones_efectivas(p_prop);
  v := v || jsonb_build_object('opiniones_totales', jsonb_build_object('asi_no_puedo', case when v_n >= 2 then v_n end));
  v := jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
  -- E7.2: los conteos que dejan deducir condiciones ajenas, solo para el organizador de la propuesta.
  if p_yo is distinct from (select x.organizador_id from cruce.propuestas x where x.id = p_prop) then
    v := jsonb_set(v, '{personas_con_condiciones}', 'null'::jsonb);
    if jsonb_typeof(v -> 'opcion') = 'object' then
      v := jsonb_set(v, '{opcion,cupos,pendientes}', 'null'::jsonb);
    end if;
    v := jsonb_set(v, '{opiniones_totales}', 'null'::jsonb);
  end if;
  -- E13 (c): las bajas de otras personas, sin nombre y sin decir si habían confirmado. La propia, como hoy.
  v := jsonb_set(v, '{bajas}', (
    select coalesce(jsonb_agg(case when b #>> '{miembro,miembro_id}' = p_yo::text then b
                                   else jsonb_build_object('miembro', v_anon, 'en', b -> 'en', 'version', b -> 'version',
                                                           'habia_aceptado', null) end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'bajas') with ordinality as t (b, o)));
  v := jsonb_set(v, '{historial}', (
    select coalesce(jsonb_agg(case when e ->> 'tipo' = 'baja' and (e #>> '{actor,miembro_id}') is distinct from p_yo::text
                                   then e || jsonb_build_object('actor', v_anon) else e end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'historial') with ordinality as t (e, o)));
  -- E11: la invitación del agente es de cada persona; nadie ve a quién más invitaron.
  v := jsonb_set(v, '{mi_situacion,invitacion_agente}', coalesce(
    (select jsonb_build_object('texto', i.texto) from cruce.invitaciones_agente i
     where i.propuesta_id = p_prop and i.miembro_id = p_yo), 'null'::jsonb));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

revoke all on function public.propose_repair(uuid, uuid) from public, anon, authenticated;
grant execute on function public.propose_repair(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
