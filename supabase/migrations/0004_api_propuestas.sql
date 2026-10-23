-- CRUCE · 0004 · API de propuestas: crear, abrir, listar, estado, interés, condiciones, cancelar.

-- Helpers de validación ------------------------------------------------------------------
-- Pasos 7 y 8 del orden general. `cancelado` responde estado_no_admite (0.6), `expirado` plazo_vencido.
create or replace function cruce.chequeo_estado(p_prop uuid, p_permitidos text[]) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
begin
  select * into p from cruce.propuestas x where x.id = p_prop;
  if p.estado = 'cancelado' then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  if p.estado = 'expirado' or now() >= p.plazo then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  if not (p.estado = any (p_permitidos)) then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  return null;
end
$$;

-- Paso 6 para operaciones simulate_*: el llamador debe ser organizador del espacio y el destino un simulado.
create or replace function cruce.chequeo_simulacion(p_prop uuid, p_yo uuid, p_destino uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
begin
  select * into p from cruce.propuestas x where x.id = p_prop;
  if not exists (select 1 from cruce.miembros m where m.id = p_yo and m.rol = 'organizador') then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', p.state_rev);
  end if;
  if not exists (select 1 from cruce.miembros m
                 where m.id = p_destino and m.espacio_id = p.espacio_id and m.simulado) then
    return cruce.err('no_autorizado', 'miembro_no_simulado', p.state_rev);
  end if;
  return null;
end
$$;

create or replace function cruce.es_retirado(p_prop uuid, p_m uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from cruce.participaciones pa
                 where pa.propuesta_id = p_prop and pa.miembro_id = p_m and pa.retirado)
$$;

create or replace function cruce.state_rev(p_prop uuid) returns integer
language sql stable set search_path = '' as $$
  select p.state_rev from cruce.propuestas p where p.id = p_prop
$$;

-- 1.8 create_proposal -----------------------------------------------------------------------
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
  -- 2. forma
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
  if v_fin[1] <= v_ini[1] or v_fin[2] <= v_ini[2] or v_ini[1] <= now() or v_ini[2] <= now() then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if p_minimo is null or p_maximo is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if not (2 <= p_minimo and p_minimo <= p_maximo and p_maximo <= 20) then
    return cruce.err('entrada_incompleta', 'cupos_invalidos', null);
  end if;
  if p_plazo is null or btrim(p_plazo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_plazo := cruce.parse_hora_local(p_plazo);
  if v_plazo is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_plazo <= now() or v_plazo > v_ini[1] or v_plazo > v_ini[2] then
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

  -- 3. intento
  v_params := jsonb_build_object(
    'p_espacio_id', p_espacio_id, 'p_titulo', p_titulo, 'p_franjas', p_franjas,
    'p_minimo', p_minimo, 'p_maximo', p_maximo, 'p_imprescindible_id', p_imprescindible_id,
    'p_plazo', p_plazo, 'p_zona_horaria', p_zona_horaria);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'create_proposal', v_params);
  if v_prev is not null then
    return v_prev;
  end if;

  -- 4. pertenencia
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  -- 9. imprescindible
  if not exists (select 1 from cruce.miembros m where m.id = p_imprescindible_id and m.espacio_id = p_espacio_id) then
    return cruce.err('entrada_incompleta', 'imprescindible_invalido', null);
  end if;

  insert into cruce.propuestas (espacio_id, titulo, organizador_id, imprescindible_id, minimo, maximo,
                                zona_horaria, plazo, estado, state_rev)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1)
  returning id into v_prop;
  insert into cruce.franjas (propuesta_id, clave, inicio, fin)
  values (v_prop, 'A', v_ini[1], v_fin[1]), (v_prop, 'B', v_ini[2], v_fin[2]);
  perform cruce.evento(v_prop, 'propuesta_creada', v_yo, 'persona', null, null, 'borrador', null, null, 1);

  v_res := jsonb_build_object('propuesta_id', v_prop, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'create_proposal', v_params, v_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(v_prop, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_proposal', sqlstate, v_ctx);
end
$$;

-- 1.9 open_proposal --------------------------------------------------------------------------
create or replace function public.open_proposal(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
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
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, true);
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

-- 1.10 list_proposals ------------------------------------------------------------------------
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
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  for r in select p.id from cruce.propuestas p where p.espacio_id = p_espacio_id loop
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

-- 1.11 get_proposal_state --------------------------------------------------------------------
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
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, false);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  return cruce.ok(jsonb_build_object('propuesta', cruce.vista_propuesta(p_propuesta_id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_proposal_state', sqlstate, v_ctx);
end
$$;

-- 1.12 / 1.20 interés (real o simulado) -------------------------------------------------------
create or replace function cruce.op_mark_interest(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_interesado boolean) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
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
    values (p_prop, v_actor, p_interesado, case when p_interesado then now() end)
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

create or replace function public.mark_interest(p_propuesta_id uuid, p_interesado boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_mark_interest(auth.uid(), p_propuesta_id, null, false, p_interesado);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('mark_interest', sqlstate, v_ctx);
end
$$;

create or replace function public.simulate_mark_interest(p_propuesta_id uuid, p_miembro_id uuid, p_interesado boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_mark_interest(auth.uid(), p_propuesta_id, p_miembro_id, true, p_interesado);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_mark_interest', sqlstate, v_ctx);
end
$$;

-- 1.13 / 1.21 condiciones privadas (real o simulado) -------------------------------------------
create or replace function cruce.op_save_conditions(
  p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_disp jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
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
    v_en := now();
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

create or replace function public.save_my_conditions(p_propuesta_id uuid, p_disponibilidad jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_save_conditions(auth.uid(), p_propuesta_id, null, false, p_disponibilidad);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('save_my_conditions', sqlstate, v_ctx);
end
$$;

create or replace function public.simulate_save_conditions(p_propuesta_id uuid, p_miembro_id uuid, p_disponibilidad jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_ctx text;
begin
  return cruce.op_save_conditions(auth.uid(), p_propuesta_id, p_miembro_id, true, p_disponibilidad);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_save_conditions', sqlstate, v_ctx);
end
$$;

-- 1.14 get_my_conditions ----------------------------------------------------------------------
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
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, false);
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

-- 1.19 cancel_proposal ------------------------------------------------------------------------
create or replace function public.cancel_proposal(p_propuesta_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
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
  v_yo := cruce.abrir_propuesta(p_propuesta_id, v_uid, true);
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
  if p.estado = 'expirado' or (now() >= p.plazo and p.estado <> 'grupo_confirmado') then
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

revoke all on all functions in schema cruce from public, anon, authenticated;
