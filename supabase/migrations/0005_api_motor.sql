-- CRUCE · 0005 · Motor: evaluar, aceptar, retirarse, reparar, simulación.

-- 1.15 evaluate_and_publish ---------------------------------------------------------------------
create or replace function public.evaluate_and_publish(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
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
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'evaluate_and_publish', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, true);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p.id, array['reuniendo_interes']);
  if v_err is not null then
    return v_err;
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is not null then
    v_ver := cruce.publicar_version(p.id, v_clave);
    update cruce.propuestas x
      set estado = 'esperando_compromisos', state_rev = x.state_rev + 1,
          ult_eval_resultado = 'opcion_publicada', ult_eval_version = v_ver, ult_eval_en = now()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'opcion_publicada', v_yo, 'persona', null,
                         'reuniendo_interes', 'esperando_compromisos', null, v_ver, v_rev);
    v_res := jsonb_build_object('tipo', 'opcion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  else
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = 'sin_opcion', ult_eval_version = null, ult_eval_en = now()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'evaluacion_sin_opcion', v_yo, 'persona', null,
                         'reuniendo_interes', 'reuniendo_interes', null, null, v_rev);
    v_res := jsonb_build_object('tipo', 'sin_opcion', 'version', null, 'franja', null, 'repetido', false);
  end if;
  perform cruce.guardar_intento(v_uid, p_intento_id, 'evaluate_and_publish', v_params, p.id,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('evaluate_and_publish', sqlstate, v_ctx);
end
$$;

-- 1.16 / 1.22 aceptar (operación atómica, serializada por propuesta) ------------------------------
create or replace function cruce.op_accept(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_version integer, p_intento uuid) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_op text := case when p_sim then 'simulate_accept' else 'accept_version' end;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  p cruce.propuestas%rowtype;
  v_conf integer;
  v_imp boolean;
  v_nuevo text;
  v_rev integer;
  v_res jsonb;
begin
  -- 1. sesión
  if p_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  -- 2. forma
  if p_prop is null or p_intento is null or (p_sim and p_destino is null)
     or p_version is null or p_version < 1 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  -- 3. intento
  v_params := jsonb_build_object('p_propuesta_id', p_prop, 'p_version', p_version);
  if p_sim then
    v_params := v_params || jsonb_build_object('p_miembro_id', p_destino);
  end if;
  v_prev := cruce.intento_previo(p_uid, p_intento, v_op, v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. pertenencia (con bloqueo de fila de la propuesta) y 5. vencimiento perezoso
  v_yo := cruce.abrir_propuesta(p_prop, p_uid, true);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_prop;
  -- 6. autorización
  if p_sim then
    v_err := cruce.chequeo_simulacion(p_prop, v_yo, p_destino);
    if v_err is not null then
      return v_err;
    end if;
    v_actor := p_destino;
  else
    v_actor := v_yo;
  end if;
  if cruce.es_retirado(p_prop, v_actor) then
    return cruce.err('no_autorizado', 'retirado', p.state_rev);
  end if;
  -- 7 y 8. plazo y estado
  v_err := cruce.chequeo_estado(p_prop, array['esperando_compromisos', 'grupo_confirmado']);
  if v_err is not null then
    return v_err;
  end if;
  if p_version <> p.version_vigente then
    return cruce.err('opcion_desactualizada', 'version_no_vigente', p.state_rev);
  end if;
  -- 9. propias de la operación
  if not exists (select 1 from cruce.elegibles e
                 where e.propuesta_id = p_prop and e.version = p_version and e.miembro_id = v_actor) then
    return cruce.err('fuera_de_audiencia', 'no_elegible_en_version', p.state_rev);
  end if;
  if exists (select 1 from cruce.aceptaciones a
             where a.propuesta_id = p_prop and a.version = p_version and a.miembro_id = v_actor and a.vigente) then
    v_res := jsonb_build_object('version', p_version, 'repetido', true,
                                'grupo_confirmado', p.estado = 'grupo_confirmado');
    if p_sim then
      v_res := v_res || jsonb_build_object('simulado', true);
    end if;
    perform cruce.guardar_intento(p_uid, p_intento, v_op, v_params, p_prop,
                                  jsonb_build_object('tipo', 'ok', 'resultado', v_res));
    return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
  end if;
  select count(*) into v_conf from cruce.aceptaciones a
  where a.propuesta_id = p_prop and a.version = p_version and a.vigente;
  if v_conf >= p.maximo then
    return cruce.err('cupo_completo', 'sin_cupo', p.state_rev);
  end if;

  -- 13. registrar
  insert into cruce.aceptaciones (propuesta_id, version, miembro_id, aceptado_en, vigente)
  values (p_prop, p_version, v_actor, now(), true);
  v_conf := v_conf + 1;
  v_imp := exists (select 1 from cruce.aceptaciones a
                   where a.propuesta_id = p_prop and a.version = p_version
                     and a.miembro_id = p.imprescindible_id and a.vigente);
  v_nuevo := case when p.estado = 'esperando_compromisos' and v_conf >= p.minimo and v_imp
                  then 'grupo_confirmado' else p.estado end;
  update cruce.propuestas x set estado = v_nuevo, state_rev = x.state_rev + 1
  where x.id = p_prop returning x.state_rev into v_rev;
  perform cruce.evento(p_prop, 'aceptacion', v_actor,
                       case when p_sim then 'simulacion' else 'persona' end,
                       case when p_sim then v_yo end,
                       p.estado, v_nuevo, p_version, p_version, v_rev);
  v_res := jsonb_build_object('version', p_version, 'repetido', false, 'grupo_confirmado', v_nuevo = 'grupo_confirmado');
  if p_sim then
    v_res := v_res || jsonb_build_object('simulado', true);
  end if;
  perform cruce.guardar_intento(p_uid, p_intento, v_op, v_params, p_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

create or replace function public.accept_version(p_propuesta_id uuid, p_version integer, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_accept(auth.uid(), p_propuesta_id, null, false, p_version, p_intento_id);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('accept_version', sqlstate, v_ctx);
end
$$;

create or replace function public.simulate_accept(p_propuesta_id uuid, p_miembro_id uuid, p_version integer, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_accept(auth.uid(), p_propuesta_id, p_miembro_id, true, p_version, p_intento_id);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_accept', sqlstate, v_ctx);
end
$$;

-- 1.17 / 1.23 retiro definitivo y regla de baja (2.2) ---------------------------------------------
create or replace function cruce.op_withdraw(p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  p cruce.propuestas%rowtype;
  v_ver integer;
  v_habia boolean;
  v_pot integer;
  v_conf integer;
  v_imp_ret boolean;
  v_imp_ok boolean;
  v_nuevo text;
  v_efecto text;
  v_rev integer;
  v_res jsonb;
begin
  if p_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_prop is null or (p_sim and p_destino is null) then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_yo := cruce.abrir_propuesta(p_prop, p_uid, true);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if p_sim then
    v_err := cruce.chequeo_simulacion(p_prop, v_yo, p_destino);
    if v_err is not null then
      return v_err;
    end if;
    v_actor := p_destino;
  else
    v_actor := v_yo;
  end if;
  select * into p from cruce.propuestas x where x.id = p_prop;
  if p.estado = 'cancelado' then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  if p.estado = 'expirado' then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  if cruce.es_retirado(p_prop, v_actor) then
    v_res := jsonb_build_object('repetido', true, 'efecto', 'sin_cambio_de_estado');
    if p_sim then
      v_res := v_res || jsonb_build_object('simulado', true);
    end if;
    return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
  end if;
  if now() >= p.plazo and p.estado <> 'grupo_confirmado' then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  if p.estado not in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision') then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;

  v_ver := p.version_vigente;
  v_habia := v_ver is not null and exists (
    select 1 from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = v_ver and a.miembro_id = v_actor and a.vigente);

  -- Registrar el retiro: pierde interés y aceptaciones vigentes, nunca vuelve a ser elegible.
  insert into cruce.participaciones (propuesta_id, miembro_id, interesado, interes_en, retirado, retirado_en)
  values (p_prop, v_actor, false, null, true, now())
  on conflict (propuesta_id, miembro_id) do update
    set interesado = false, interes_en = null, retirado = true, retirado_en = now();
  update cruce.aceptaciones a set vigente = false
  where a.propuesta_id = p_prop and a.miembro_id = v_actor and a.vigente;
  insert into cruce.bajas (propuesta_id, miembro_id, en, version, habia_aceptado)
  values (p_prop, v_actor, now(), v_ver, v_habia);

  -- Regla de baja
  v_nuevo := p.estado;
  v_efecto := 'sin_cambio_de_estado';
  if p.estado = 'esperando_compromisos' then
    select count(*) into v_pot from cruce.elegibles e
    where e.propuesta_id = p_prop and e.version = v_ver
      and not cruce.es_retirado(p_prop, e.miembro_id);
    v_imp_ret := cruce.es_retirado(p_prop, p.imprescindible_id);
    if v_pot < p.minimo or v_imp_ret then
      v_nuevo := 'en_revision';
      v_efecto := 'pasa_a_revision';
    end if;
  elsif p.estado = 'grupo_confirmado' and v_habia then
    select count(*) into v_conf from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = v_ver and a.vigente;
    v_imp_ok := exists (select 1 from cruce.aceptaciones a
                        where a.propuesta_id = p_prop and a.version = v_ver
                          and a.miembro_id = p.imprescindible_id and a.vigente);
    if v_conf >= p.minimo and v_imp_ok then
      v_efecto := 'acuerdo_conservado';
    elsif now() < p.plazo then
      v_nuevo := 'en_revision';
      v_efecto := 'pasa_a_revision';
    else
      v_nuevo := 'expirado';
      v_efecto := 'expirado';
    end if;
  end if;

  update cruce.propuestas x set estado = v_nuevo, state_rev = x.state_rev + 1
  where x.id = p_prop returning x.state_rev into v_rev;
  perform cruce.evento(p_prop, 'baja', v_actor,
                       case when p_sim then 'simulacion' else 'persona' end,
                       case when p_sim then v_yo end,
                       p.estado, v_nuevo, v_ver, v_ver, v_rev);
  v_res := jsonb_build_object('repetido', false, 'efecto', v_efecto);
  if p_sim then
    v_res := v_res || jsonb_build_object('simulado', true);
  end if;
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

create or replace function public.withdraw_commitment(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_withdraw(auth.uid(), p_propuesta_id, null, false);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('withdraw_commitment', sqlstate, v_ctx);
end
$$;

create or replace function public.simulate_withdraw(p_propuesta_id uuid, p_miembro_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_withdraw(auth.uid(), p_propuesta_id, p_miembro_id, true);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_withdraw', sqlstate, v_ctx);
end
$$;

-- 1.18 propose_repair: versión N+1 con cero aceptaciones heredadas ---------------------------------
create or replace function public.propose_repair(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
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
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'propose_repair', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, true);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p.id, array['en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is null then
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = 'sin_alternativa', ult_eval_version = null, ult_eval_en = now()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'reparacion_sin_alternativa', v_yo, 'persona', null,
                         'en_revision', 'en_revision', p.version_vigente, p.version_vigente, v_rev);
    perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, p.id,
                                  jsonb_build_object('tipo', 'error', 'codigo', 'sin_alternativa', 'detalle', 'sin_alternativa'));
    return cruce.err('sin_alternativa', 'sin_alternativa', v_rev);
  end if;

  v_ver := cruce.publicar_version(p.id, v_clave);
  update cruce.propuestas x
    set estado = 'esperando_compromisos', state_rev = x.state_rev + 1,
        ult_eval_resultado = 'reparacion_publicada', ult_eval_version = v_ver, ult_eval_en = now()
  where x.id = p.id returning x.state_rev into v_rev;
  perform cruce.evento(p.id, 'reparacion_publicada', v_yo, 'persona', null,
                       'en_revision', 'esperando_compromisos', p.version_vigente, v_ver, v_rev);
  v_res := jsonb_build_object('tipo', 'reparacion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, p.id,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('propose_repair', sqlstate, v_ctx);
end
$$;

-- 1.24 get_simulation_panel: única vista de condiciones ajenas, solo de simulados y solo para el organizador del espacio.
create or replace function public.get_simulation_panel(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, false);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if not exists (select 1 from cruce.miembros m where m.id = v_yo and m.rol = 'organizador') then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', p.state_rev);
  end if;
  return cruce.ok(jsonb_build_object(
    'state_rev', p.state_rev,
    'simulacion', jsonb_build_object(
      'rotulo', 'Simulación',
      'miembros', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'miembro', cruce.miembro_ref(m.id),
                 'interesado', s.sit -> 'interesado',
                 'condiciones', jsonb_build_object(
                   'disponibilidad', cruce.disp_normalizada(c.disponibilidad),
                   'estado', cruce.condiciones_estado(c.disponibilidad)),
                 'retirado', s.sit -> 'retirado',
                 'elegible_en_version', s.sit -> 'elegible_en_version',
                 'acepte_version', s.sit -> 'acepte_version',
                 'puede', jsonb_build_object(
                   'marcar_interes', s.sit #> '{puede,marcar_interes}',
                   'guardar_condiciones', s.sit #> '{puede,guardar_condiciones}',
                   'aceptar', s.sit #> '{puede,aceptar}',
                   'retirarme', s.sit #> '{puede,retirarme}')) order by m.orden), '[]'::jsonb)
        from cruce.miembros m
        cross join lateral (select cruce.situacion(p.id, m.id) as sit) s
        left join cruce.condiciones c on c.propuesta_id = p.id and c.miembro_id = m.id
        where m.espacio_id = p.espacio_id and m.simulado))));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_simulation_panel', sqlstate, v_ctx);
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
