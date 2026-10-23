-- CRUCE · 0012 · Enmienda 3 (docs/contrato-enmienda-3.md).
-- 1. siguiente_accion personal (te_toca_aceptar / ya_aceptaste / buscar_opcion), sin datos privados.
-- 2. Lista cerrada de códigos: abrir_propuesta, reunir_condiciones, buscar_opcion, sin_opcion,
--    aceptar_version, te_toca_aceptar, ya_aceptaste, grupo_confirmado, buscar_alternativa,
--    sin_alternativa, expirado, cancelado.
-- 3. simulate_load_case(p_propuesta_id, p_intento_id): carga atómica del caso canónico a los simulados.
-- El campo contrato sigue en 2.

-- 1 y 2. La vista general de 0008 queda como base; la vista pública personaliza siguiente_accion.
alter function cruce.vista_propuesta(uuid, uuid) rename to vista_propuesta_base;

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
      || case when v_faltan > 0 then 'Faltan ' || v_faltan || ' para el mínimo.'
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

create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
begin
  if v is null then
    return null;
  end if;
  return jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
end
$$;

-- 3. simulate_load_case -------------------------------------------------------------------------
create or replace function cruce.caso_canonico(p_nombre text) returns jsonb
language sql immutable set search_path = '' as $$
  select case lower(p_nombre)
    when 'luna' then '{"A": "si", "B": "si"}'::jsonb
    when 'mati' then '{"A": "si", "B": "si"}'::jsonb
    when 'caro' then '{"A": "si", "B": "no"}'::jsonb
    when 'fede' then '{"A": "no", "B": "si"}'::jsonb
    when 'sofi' then '{"A": "no", "B": "si"}'::jsonb
  end
$$;

create or replace function public.simulate_load_case(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_rol text;
  v_demo boolean;
  p cruce.propuestas%rowtype;
  v_err jsonb;
  m record;
  v_disp jsonb;
  v_actual jsonb;
  v_cargados jsonb := '[]'::jsonb;
  v_omitidos jsonb := '[]'::jsonb;
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
  -- 2. espacio
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  if not cruce.bloquear_espacio(v_esp) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  -- 3. intento
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'simulate_load_case', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. miembros: el llamador y todos los simulados del espacio, en orden de id
  perform 1 from cruce.miembros x
  where x.espacio_id = v_esp and (x.user_id = v_uid or x.simulado)
  order by x.id
  for update;
  select x.id, x.rol into v_yo, v_rol from cruce.miembros x where x.espacio_id = v_esp and x.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  -- 5. propuesta, instante de decisión y vencimiento perezoso
  perform 1 from cruce.propuestas x where x.id = p_propuesta_id for update;
  perform cruce.fijar_ahora();
  perform cruce.vencer(p_propuesta_id);
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  -- 6. autorización
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', p.state_rev);
  end if;
  select e.demo into v_demo from cruce.espacios e where e.id = v_esp;
  if not v_demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', p.state_rev);
  end if;
  -- 7 y 8. plazo y estado
  v_err := cruce.chequeo_estado(p.id, array['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  -- 9. cargar a cada simulado que pueda cambiar sus condiciones
  for m in select x.id, x.nombre from cruce.miembros x where x.espacio_id = v_esp and x.simulado order by x.orden loop
    v_disp := cruce.caso_canonico(m.nombre);
    if v_disp is null then
      v_omitidos := v_omitidos || jsonb_build_object('miembro', cruce.miembro_ref(m.id), 'motivo', 'fuera_del_caso');
    elsif cruce.es_retirado(p.id, m.id) then
      v_omitidos := v_omitidos || jsonb_build_object('miembro', cruce.miembro_ref(m.id), 'motivo', 'retirado');
    elsif p.estado in ('esperando_compromisos', 'grupo_confirmado')
          and exists (select 1 from cruce.elegibles e
                      where e.propuesta_id = p.id and e.version = p.version_vigente and e.miembro_id = m.id) then
      v_omitidos := v_omitidos || jsonb_build_object('miembro', cruce.miembro_ref(m.id), 'motivo', 'condiciones_congeladas');
    else
      select c.disponibilidad into v_actual from cruce.condiciones c
      where c.propuesta_id = p.id and c.miembro_id = m.id;
      if v_actual is distinct from cruce.disp_normalizada(v_disp) then
        insert into cruce.condiciones (propuesta_id, miembro_id, disponibilidad, actualizadas_en)
        values (p.id, m.id, cruce.disp_normalizada(v_disp), cruce.ahora())
        on conflict (propuesta_id, miembro_id) do update
          set disponibilidad = excluded.disponibilidad, actualizadas_en = excluded.actualizadas_en;
      end if;
      v_cargados := v_cargados || jsonb_build_array(cruce.miembro_ref(m.id));
    end if;
  end loop;

  -- un solo incremento de state_rev por carga
  update cruce.propuestas x set state_rev = x.state_rev + 1 where x.id = p.id returning x.state_rev into v_rev;

  v_res := jsonb_build_object('cargados', v_cargados, 'omitidos', v_omitidos, 'simulado', true, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'simulate_load_case', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_load_case', sqlstate, v_ctx);
end
$$;

revoke all on function public.simulate_load_case(uuid, uuid) from public, anon, authenticated;
grant execute on function public.simulate_load_case(uuid, uuid) to authenticated;

-- A5: la lista permitida pasa a 26 entradas.
create or replace function cruce.verificar_privilegios() returns void
language plpgsql stable set search_path = '' as $$
declare
  permitidas constant text[] := array[
    'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
    'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
    'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
    'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
    'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
    'get_simulation_panel', 'simulate_load_case'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 26 then
    raise exception 'A5: public no tiene exactamente 26 funciones';
  end if;

  select string_agg(p.proname, ', ') into v
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and not (p.proname = any (permitidas));
  if v is not null then
    raise exception 'A5: funciones fuera de la lista permitida en public: %', v;
  end if;

  select string_agg(x, ', ') into v
  from unnest(permitidas) x
  where (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = x) <> 1;
  if v is not null then
    raise exception 'A5: entradas ausentes o con más de una firma: %', v;
  end if;

  select string_agg(p.proname, ', ') into v
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE');
  if v is not null then
    raise exception 'A5: anon puede ejecutar: %', v;
  end if;

  select string_agg(p.proname, ', ') into v
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and not pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v is not null then
    raise exception 'A5: authenticated no puede ejecutar: %', v;
  end if;

  select string_agg(p.proname, ', ') into v
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (not p.prosecdef or p.proconfig is null or not ('search_path=""' = any (p.proconfig)));
  if v is not null then
    raise exception 'A5: sin SECURITY DEFINER o sin search_path vacío: %', v;
  end if;

  select string_agg(p.proname, ', ') into v
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'cruce'
    and (pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
         or pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v is not null then
    raise exception 'A5: helpers de cruce ejecutables desde el navegador: %', v;
  end if;

  if pg_catalog.has_schema_privilege('anon', 'cruce', 'USAGE')
     or pg_catalog.has_schema_privilege('authenticated', 'cruce', 'USAGE') then
    raise exception 'A5: el esquema cruce es usable desde el navegador';
  end if;
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
