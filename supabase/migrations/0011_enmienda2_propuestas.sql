-- CRUCE · 0011 · Enmienda 2: operaciones de propuesta.
-- A1 reserva de cupo del imprescindible en la aceptación · A3 intento_obsoleto en create_proposal ·
-- A4 orden espacio -> intento -> miembro -> propuesta, revalidación e instante de decisión posterior al
-- bloqueo en TODAS las escrituras. Las validaciones que dependen del reloj van después de recuperar el
-- intento (un reintento exitoso no se rechaza por haber pasado el tiempo).
-- Las envolturas públicas de 0004/0005 que delegan en cruce.op_* (mark_interest, save_my_conditions,
-- accept_version, withdraw_commitment y sus simulate_*) no cambian: se reemplazan los op_*.

create or replace function cruce.generacion(p_esp uuid) returns bigint
language sql stable set search_path = '' as $$
  select e.generacion from cruce.espacios e where e.id = p_esp
$$;

create or replace function cruce.publicar_version(p_prop uuid, p_clave text) returns integer
language plpgsql volatile set search_path = '' as $$
declare
  v integer;
begin
  select coalesce(p.version_vigente, 0) + 1 into v from cruce.propuestas p where p.id = p_prop;
  insert into cruce.versiones (propuesta_id, version, franja_clave, publicada_en)
  values (p_prop, v, p_clave, cruce.ahora());
  insert into cruce.elegibles (propuesta_id, version, miembro_id)
  select p_prop, v, e from cruce.elegibles_franja(p_prop, p_clave) e;
  update cruce.propuestas p set version_vigente = v where p.id = p_prop;
  return v;
end
$$;

-- 1.8 create_proposal ---------------------------------------------------------------------------
create or replace function public.create_proposal(
  p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer,
  p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_tit text := btrim(p_titulo);
  v_el jsonb;
  v_ini timestamptz[] := array[]::timestamptz[];
  v_fin timestamptz[] := array[]::timestamptz[];
  v_i timestamptz;
  v_f timestamptz;
  v_plazo timestamptz;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_prop uuid;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  -- 2. forma (sin depender del reloj)
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_tit is null or v_tit = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if char_length(v_tit) > 80 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_franjas is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if jsonb_typeof(p_franjas) <> 'array' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if jsonb_array_length(p_franjas) <> 2 then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  for v_el in select x from jsonb_array_elements(p_franjas) x loop
    if jsonb_typeof(v_el) <> 'object' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    if v_el -> 'inicio' is null or v_el -> 'fin' is null
       or jsonb_typeof(v_el -> 'inicio') = 'null' or jsonb_typeof(v_el -> 'fin') = 'null' then
      return cruce.err('entrada_incompleta', 'campo_faltante', null);
    end if;
    if jsonb_typeof(v_el -> 'inicio') <> 'string' or jsonb_typeof(v_el -> 'fin') <> 'string' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_i := cruce.parse_hora_local(v_el ->> 'inicio');
    v_f := cruce.parse_hora_local(v_el ->> 'fin');
    if v_i is null or v_f is null then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_ini := v_ini || v_i;
    v_fin := v_fin || v_f;
  end loop;
  if v_fin[1] <= v_ini[1] or v_fin[2] <= v_ini[2] then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if p_minimo is null or p_maximo is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if not (2 <= p_minimo and 2 <= p_maximo and p_minimo <= p_maximo and p_maximo <= 20) then
    return cruce.err('entrada_incompleta', 'cupos_invalidos', null);
  end if;
  if p_plazo is null or btrim(p_plazo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_plazo := cruce.parse_hora_local(p_plazo);
  if v_plazo is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_plazo > v_ini[1] or v_plazo > v_ini[2] then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if p_zona_horaria is null or btrim(p_zona_horaria) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if p_zona_horaria <> 'America/Santiago' then
    return cruce.err('entrada_incompleta', 'zona_horaria_no_soportada', null);
  end if;
  if p_imprescindible_id is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;

  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento (A3: un intento de una generación anterior responde intento_obsoleto)
  v_params := jsonb_build_object(
    'p_espacio_id', p_espacio_id, 'p_titulo', p_titulo, 'p_franjas', p_franjas,
    'p_minimo', p_minimo, 'p_maximo', p_maximo, 'p_imprescindible_id', p_imprescindible_id,
    'p_plazo', p_plazo, 'p_zona_horaria', p_zona_horaria);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'create_proposal', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. miembro
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  -- Rangos que dependen del reloj, con el instante de decisión
  if v_ini[1] <= cruce.ahora() or v_ini[2] <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if v_plazo <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.id = p_imprescindible_id and m.espacio_id = p_espacio_id) then
    return cruce.err('entrada_incompleta', 'imprescindible_invalido', null);
  end if;

  insert into cruce.propuestas (espacio_id, titulo, organizador_id, imprescindible_id, minimo, maximo,
                                zona_horaria, plazo, estado, state_rev, creada_en)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1, cruce.ahora())
  returning id into v_prop;
  insert into cruce.franjas (propuesta_id, clave, inicio, fin)
  values (v_prop, 'A', v_ini[1], v_fin[1]), (v_prop, 'B', v_ini[2], v_fin[2]);
  perform cruce.evento(v_prop, 'propuesta_creada', v_yo, 'persona', null, null, 'borrador', null, null, 1);

  v_res := jsonb_build_object('propuesta_id', v_prop, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'create_proposal', v_params, p_espacio_id, v_yo,
                                cruce.generacion(p_espacio_id), v_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(v_prop, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_proposal', sqlstate, v_ctx);
end
$$;

-- 1.9 open_proposal ----------------------------------------------------------------------------
create or replace function public.open_proposal(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_err jsonb;
  v_rev integer;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_propuesta_id, v_esp, v_uid, null);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p.id, array['borrador', 'reuniendo_interes']);
  if v_err is not null then
    return v_err;
  end if;
  if p.estado = 'reuniendo_interes' then
    return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('repetido', true),
                                       'propuesta', cruce.vista_propuesta(p.id, v_yo)));
  end if;
  update cruce.propuestas x set estado = 'reuniendo_interes', state_rev = x.state_rev + 1
  where x.id = p.id returning x.state_rev into v_rev;
  perform cruce.evento(p.id, 'propuesta_abierta', v_yo, 'persona', null, 'borrador', 'reuniendo_interes', null, null, v_rev);
  return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('repetido', false),
                                     'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('open_proposal', sqlstate, v_ctx);
end
$$;

-- 1.10 list_proposals: vencimiento perezoso en orden de id (mismo orden que reset_demo).
create or replace function public.list_proposals(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  r record;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  perform cruce.fijar_ahora();
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  for r in select p.id from cruce.propuestas p where p.espacio_id = p_espacio_id order by p.id loop
    perform cruce.vencer(r.id);
  end loop;
  return cruce.ok(jsonb_build_object('propuestas', (
    select coalesce(jsonb_agg(cruce.resumen_propuesta(p.id, v_yo) order by p.creada_en desc, p.id), '[]'::jsonb)
    from cruce.propuestas p where p.espacio_id = p_espacio_id)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('list_proposals', sqlstate, v_ctx);
end
$$;

-- 1.11 get_proposal_state ---------------------------------------------------------------------
create or replace function public.get_proposal_state(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_yo := cruce.leer_propuesta(p_propuesta_id, v_uid);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  return cruce.ok(jsonb_build_object('propuesta', cruce.vista_propuesta(p_propuesta_id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_proposal_state', sqlstate, v_ctx);
end
$$;

-- 1.12 / 1.20 interés ---------------------------------------------------------------------------
create or replace function cruce.op_mark_interest(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_interesado boolean) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_esp uuid;
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  v_actual boolean;
  v_rep boolean;
  v_res jsonb;
begin
  if p_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_prop is null or (p_sim and p_destino is null) then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_interesado is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_prop);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_prop, v_esp, p_uid, case when p_sim then p_destino end);
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
  if cruce.es_retirado(p_prop, v_actor) then
    return cruce.err('no_autorizado', 'retirado', cruce.state_rev(p_prop));
  end if;
  v_err := cruce.chequeo_estado(p_prop, array['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  select pa.interesado into v_actual from cruce.participaciones pa
  where pa.propuesta_id = p_prop and pa.miembro_id = v_actor;
  v_rep := coalesce(v_actual, false) = p_interesado;
  if not v_rep then
    insert into cruce.participaciones (propuesta_id, miembro_id, interesado, interes_en)
    values (p_prop, v_actor, p_interesado, case when p_interesado then cruce.ahora() end)
    on conflict (propuesta_id, miembro_id) do update
      set interesado = excluded.interesado, interes_en = excluded.interes_en;
    update cruce.propuestas x set state_rev = x.state_rev + 1 where x.id = p_prop;
  end if;
  v_res := jsonb_build_object('interesado', p_interesado, 'repetido', v_rep);
  if p_sim then
    v_res := v_res || jsonb_build_object('simulado', true);
  end if;
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

-- 1.13 / 1.21 condiciones privadas ------------------------------------------------------------------
create or replace function cruce.op_save_conditions(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_disp jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_esp uuid;
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  v_det text;
  p cruce.propuestas%rowtype;
  v_norm jsonb;
  v_prev jsonb;
  v_en timestamptz;
  v_rep boolean;
  v_res jsonb;
begin
  if p_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_prop is null or (p_sim and p_destino is null) then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_disponibilidad(p_disp);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_prop);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_prop, v_esp, p_uid, case when p_sim then p_destino end);
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
  if cruce.es_retirado(p_prop, v_actor) then
    return cruce.err('no_autorizado', 'retirado', p.state_rev);
  end if;
  if p.estado in ('esperando_compromisos', 'grupo_confirmado')
     and exists (select 1 from cruce.elegibles e
                 where e.propuesta_id = p_prop and e.version = p.version_vigente and e.miembro_id = v_actor) then
    return cruce.err('no_autorizado', 'condiciones_congeladas', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p_prop, array['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  v_norm := cruce.disp_normalizada(p_disp);
  select c.disponibilidad, c.actualizadas_en into v_prev, v_en from cruce.condiciones c
  where c.propuesta_id = p_prop and c.miembro_id = v_actor;
  v_rep := v_prev is not null and v_prev = v_norm;
  if not v_rep then
    v_en := cruce.ahora();
    insert into cruce.condiciones (propuesta_id, miembro_id, disponibilidad, actualizadas_en)
    values (p_prop, v_actor, v_norm, v_en)
    on conflict (propuesta_id, miembro_id) do update
      set disponibilidad = excluded.disponibilidad, actualizadas_en = excluded.actualizadas_en;
  end if;
  v_res := jsonb_build_object('repetido', v_rep);
  if p_sim then
    v_res := v_res || jsonb_build_object('simulado', true);
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', v_res,
    'condiciones', jsonb_build_object('disponibilidad', v_norm, 'estado', cruce.condiciones_estado(v_norm),
                                      'actualizadas_en', cruce.momento(v_en)),
    'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

-- 1.14 get_my_conditions ------------------------------------------------------------------------
create or replace function public.get_my_conditions(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_disp jsonb;
  v_en timestamptz;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_yo := cruce.leer_propuesta(p_propuesta_id, v_uid);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select c.disponibilidad, c.actualizadas_en into v_disp, v_en from cruce.condiciones c
  where c.propuesta_id = p_propuesta_id and c.miembro_id = v_yo;
  return cruce.ok(jsonb_build_object(
    'condiciones', jsonb_build_object(
      'disponibilidad', cruce.disp_normalizada(v_disp),
      'estado', cruce.condiciones_estado(v_disp),
      'actualizadas_en', cruce.momento(v_en)),
    'state_rev', cruce.state_rev(p_propuesta_id)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_my_conditions', sqlstate, v_ctx);
end
$$;

-- 1.19 cancel_proposal --------------------------------------------------------------------------
create or replace function public.cancel_proposal(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_rev integer;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_propuesta_id, v_esp, v_uid, null);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  if p.estado = 'cancelado' then
    return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('repetido', true),
                                       'propuesta', cruce.vista_propuesta(p.id, v_yo)));
  end if;
  if p.estado = 'expirado' or (cruce.ahora() >= p.plazo and p.estado <> 'grupo_confirmado') then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  update cruce.propuestas x set estado = 'cancelado', state_rev = x.state_rev + 1
  where x.id = p.id returning x.state_rev into v_rev;
  perform cruce.evento(p.id, 'propuesta_cancelada', v_yo, 'persona', null, p.estado, 'cancelado',
                       p.version_vigente, p.version_vigente, v_rev);
  return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('repetido', false),
                                     'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('cancel_proposal', sqlstate, v_ctx);
end
$$;

-- 1.15 evaluate_and_publish ---------------------------------------------------------------------
create or replace function public.evaluate_and_publish(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
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
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'evaluate_and_publish', v_params);
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
  v_err := cruce.chequeo_estado(p.id, array['reuniendo_interes']);
  if v_err is not null then
    return v_err;
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is not null then
    v_ver := cruce.publicar_version(p.id, v_clave);
    update cruce.propuestas x
      set estado = 'esperando_compromisos', state_rev = x.state_rev + 1,
          ult_eval_resultado = 'opcion_publicada', ult_eval_version = v_ver, ult_eval_en = cruce.ahora()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'opcion_publicada', v_yo, 'persona', null,
                         'reuniendo_interes', 'esperando_compromisos', null, v_ver, v_rev);
    v_res := jsonb_build_object('tipo', 'opcion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  else
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = 'sin_opcion', ult_eval_version = null, ult_eval_en = cruce.ahora()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'evaluacion_sin_opcion', v_yo, 'persona', null,
                         'reuniendo_interes', 'reuniendo_interes', null, null, v_rev);
    v_res := jsonb_build_object('tipo', 'sin_opcion', 'version', null, 'franja', null, 'repetido', false);
  end if;
  perform cruce.guardar_intento(v_uid, p_intento_id, 'evaluate_and_publish', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('evaluate_and_publish', sqlstate, v_ctx);
end
$$;

-- 1.16 / 1.22 aceptar: una sola operación atómica (A1 + A4) -------------------------------------------
create or replace function cruce.op_accept(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_version integer, p_intento uuid) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_op text := case when p_sim then 'simulate_accept' else 'accept_version' end;
  v_esp uuid;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  p cruce.propuestas%rowtype;
  v_conf integer;
  v_imp boolean;
  v_imp_ret boolean;
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
  -- bloqueo nivel 2 (espacio)
  v_esp := cruce.espacio_de_propuesta(p_prop);
  perform cruce.bloquear_espacio(v_esp);
  -- 3. intento (nivel 3)
  v_params := jsonb_build_object('p_propuesta_id', p_prop, 'p_version', p_version);
  if p_sim then
    v_params := v_params || jsonb_build_object('p_miembro_id', p_destino);
  end if;
  v_prev := cruce.intento_previo(p_uid, p_intento, v_op, v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. pertenencia (niveles 4 y 5: miembro y propuesta FOR UPDATE) y 5. vencimiento perezoso
  v_yo := cruce.bloquear_actor_y_propuesta(p_prop, v_esp, p_uid, case when p_sim then p_destino end);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_prop;
  -- 6. autorización (revalidada después de bloquear)
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
  -- 7 y 8. plazo (instante de decisión) y estado
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
    perform cruce.guardar_intento(p_uid, p_intento, v_op, v_params, v_esp, v_yo, cruce.generacion(v_esp), p_prop,
                                  jsonb_build_object('tipo', 'ok', 'resultado', v_res));
    return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
  end if;
  select count(*) into v_conf from cruce.aceptaciones a
  where a.propuesta_id = p_prop and a.version = p_version and a.vigente;
  v_imp := exists (select 1 from cruce.aceptaciones a
                   where a.propuesta_id = p_prop and a.version = p_version
                     and a.miembro_id = p.imprescindible_id and a.vigente);
  v_imp_ret := cruce.es_retirado(p_prop, p.imprescindible_id);
  -- A1: mientras el imprescindible no aceptó, los demás tienen capacidad maximo - 1.
  if v_actor <> p.imprescindible_id and not v_imp and not v_imp_ret and v_conf >= p.maximo - 1 then
    return cruce.err('cupo_completo', 'reservado_imprescindible', p.state_rev);
  end if;
  if v_conf >= p.maximo then
    return cruce.err('cupo_completo', 'sin_cupo', p.state_rev);
  end if;

  -- 13. registrar
  insert into cruce.aceptaciones (propuesta_id, version, miembro_id, aceptado_en, vigente)
  values (p_prop, p_version, v_actor, cruce.ahora(), true);
  v_conf := v_conf + 1;
  v_imp := v_imp or v_actor = p.imprescindible_id;
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
  perform cruce.guardar_intento(p_uid, p_intento, v_op, v_params, v_esp, v_yo, cruce.generacion(v_esp), p_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

-- 1.17 / 1.23 retiro definitivo y regla de baja (2.2) ------------------------------------------------
create or replace function cruce.op_withdraw(p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_esp uuid;
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
  v_esp := cruce.espacio_de_propuesta(p_prop);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_prop, v_esp, p_uid, case when p_sim then p_destino end);
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
  if cruce.ahora() >= p.plazo and p.estado <> 'grupo_confirmado' then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  if p.estado not in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision') then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;

  v_ver := p.version_vigente;
  v_habia := v_ver is not null and exists (
    select 1 from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = v_ver and a.miembro_id = v_actor and a.vigente);

  insert into cruce.participaciones (propuesta_id, miembro_id, interesado, interes_en, retirado, retirado_en)
  values (p_prop, v_actor, false, null, true, cruce.ahora())
  on conflict (propuesta_id, miembro_id) do update
    set interesado = false, interes_en = null, retirado = true, retirado_en = cruce.ahora();
  update cruce.aceptaciones a set vigente = false
  where a.propuesta_id = p_prop and a.miembro_id = v_actor and a.vigente;
  insert into cruce.bajas (propuesta_id, miembro_id, en, version, habia_aceptado)
  values (p_prop, v_actor, cruce.ahora(), v_ver, v_habia);

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
    elsif cruce.ahora() < p.plazo then
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

-- 1.18 propose_repair: versión N+1 con cero aceptaciones heredadas -------------------------------------
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
  v_err := cruce.chequeo_estado(p.id, array['en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is null then
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = 'sin_alternativa', ult_eval_version = null, ult_eval_en = cruce.ahora()
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'reparacion_sin_alternativa', v_yo, 'persona', null,
                         'en_revision', 'en_revision', p.version_vigente, p.version_vigente, v_rev);
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
                       'en_revision', 'esperando_compromisos', p.version_vigente, v_ver, v_rev);
  v_res := jsonb_build_object('tipo', 'reparacion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('propose_repair', sqlstate, v_ctx);
end
$$;

-- 1.24 get_simulation_panel (agrega motivo_aceptar de A1) ----------------------------------------------
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
  v_yo := cruce.leer_propuesta(p_propuesta_id, v_uid);
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
                   'retirarme', s.sit #> '{puede,retirarme}'),
                 'motivo_aceptar', s.sit -> 'motivo_aceptar') order by m.orden), '[]'::jsonb)
        from cruce.miembros m
        cross join lateral (select cruce.situacion(p.id, m.id) as sit) s
        left join cruce.condiciones c on c.propuesta_id = p.id and c.miembro_id = m.id
        where m.espacio_id = p.espacio_id and m.simulado))));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_simulation_panel', sqlstate, v_ctx);
end
$$;

-- Helpers v1 que ya no se usan.
drop function if exists cruce.abrir_propuesta(uuid, uuid, boolean);
drop function if exists cruce.guardar_intento(uuid, uuid, text, jsonb, uuid, jsonb);

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
