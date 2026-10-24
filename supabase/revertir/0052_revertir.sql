-- Reversa de la 0052 (enmienda 15, E-d). NO es una migración: se corre a mano solo si la 0052 rompe producción.
-- Devuelve los cuerpos anteriores (0002 validar_disponibilidad y motor, 0051 create_proposal y vista base, 0042
-- op_save_conditions, 0011 get_my_conditions), borra cruce.prefieren y la columna franjas.etiqueta. Deja la 0051 intacta.
-- Las propuestas creadas con regla 'mas_si' quedan con esa regla en la columna, pero el motor vuelve a 'temprana'.
begin;
create or replace function cruce.validar_disponibilidad(p_disp jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_disp is null then 'campo_faltante'
    when jsonb_typeof(p_disp) <> 'object' then 'formato_invalido'
    when exists (
      select 1 from jsonb_each(p_disp) kv
      where kv.key not in ('A', 'B')
         or jsonb_typeof(kv.value) <> 'string'
         or (kv.value #>> '{}') not in ('si', 'no', 'pendiente')) then 'disponibilidad_invalida'
    else null end
$$;

create or replace function cruce.motor(p_prop uuid) returns text
language sql stable set search_path = '' as $$
  select f.clave
  from cruce.franjas f
  join cruce.propuestas p on p.id = f.propuesta_id
  where f.propuesta_id = p_prop
    and (select count(*) from cruce.elegibles_franja(p_prop, f.clave)) >= p.minimo
    and p.imprescindible_id in (select e from cruce.elegibles_franja(p_prop, f.clave) e)
  order by f.inicio, f.clave
  limit 1
$$;

create or replace function public.create_proposal(
  p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer,
  p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid, p_actividad text default null,
  p_regla text default null, p_ronda_horas integer default null) returns jsonb
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
  v_fam text;
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
  -- E14: la actividad es opcional; si viene, tiene que ser del catálogo (la familia se compara después de la
  -- pertenencia, para no revelar el propósito de un espacio ajeno).
  if p_actividad is not null and cruce.familia_de_actividad(p_actividad) is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  -- E15: regla del motor y ronda de opiniones, opcionales. En la 0051 solo 'temprana' (mas_si llega con la 0052).
  if p_regla is not null and p_regla not in ('temprana') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_ronda_horas is not null and p_ronda_horas not in (2, 12, 24) then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;

  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento (A3: un intento de una generación anterior responde intento_obsoleto)
  v_params := jsonb_build_object(
    'p_espacio_id', p_espacio_id, 'p_titulo', p_titulo, 'p_franjas', p_franjas,
    'p_minimo', p_minimo, 'p_maximo', p_maximo, 'p_imprescindible_id', p_imprescindible_id,
    'p_plazo', p_plazo, 'p_zona_horaria', p_zona_horaria)
    -- E14: solo si viene, para que los intentos de antes de la migración sigan valiendo.
    || case when p_actividad is not null then jsonb_build_object('p_actividad', p_actividad) else '{}'::jsonb end
    -- E15: igual, solo si vienen.
    || case when p_regla is not null then jsonb_build_object('p_regla', p_regla) else '{}'::jsonb end
    || case when p_ronda_horas is not null then jsonb_build_object('p_ronda_horas', p_ronda_horas) else '{}'::jsonb end;
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
  -- E14 (ajustes 1 y 2): en un grupo con propósito, una actividad de otra familia se rechaza; sin actividad se acepta.
  if p_actividad is not null then
    select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_espacio_id;
    if v_fam <> 'libre' and cruce.familia_de_actividad(p_actividad) <> v_fam then
      return cruce.err('entrada_incompleta', 'fuera_de_proposito', null);
    end if;
  end if;

  insert into cruce.propuestas (espacio_id, titulo, organizador_id, imprescindible_id, minimo, maximo,
                                zona_horaria, plazo, estado, state_rev, creada_en, actividad, regla, ronda_horas)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1, cruce.ahora(), p_actividad, coalesce(p_regla, 'temprana'), p_ronda_horas)
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

create or replace function cruce.op_save_conditions(p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_disp jsonb) returns jsonb
language plpgsql set search_path = '' as $$
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
                 where e.propuesta_id = p_prop and e.version = p.version_vigente and e.miembro_id = v_actor)
     -- E13 (a): quien dijo "así no puedo" (y no aceptó esa versión) puede actualizar su disponibilidad; la versión
     -- vigente no cambia (los elegibles quedan fijos), cuenta para una versión nueva.
     and not exists (select 1 from cruce.opiniones o
                     where o.propuesta_id = p_prop and o.version = p.version_vigente and o.miembro_id = v_actor
                       and not exists (select 1 from cruce.aceptaciones a
                                       where a.propuesta_id = p_prop and a.version = o.version
                                         and a.miembro_id = v_actor and a.vigente)) then
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

create or replace function cruce.vista_propuesta_base(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base_e14(p_prop, p_yo);
begin
  if v is null then
    return null;
  end if;
  return v || jsonb_build_object('ronda', cruce.ronda_json(p_prop),
                                 'regla', (select x.regla from cruce.propuestas x where x.id = p_prop));
end
$$;

drop function cruce.prefieren(uuid, text, uuid);
alter table cruce.franjas drop column etiqueta;
revoke all on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text, text, integer) to authenticated;
revoke all on function public.get_my_conditions(uuid) from public, anon, authenticated;
grant execute on function public.get_my_conditions(uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
commit;
