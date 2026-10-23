-- CRUCE · 0010 · Enmienda 2: operaciones de espacio.
-- A2 reclamo de asiento solo si no está usado (asiento_en_uso) · A3 reset_demo idempotente con generación ·
-- A4 orden de bloqueos usuario -> espacio -> intento -> miembro -> propuesta y un solo demo por usuario.

-- 1.1 create_space: nivel 1 (asesor por usuario).
create or replace function public.create_space(p_nombre text, p_tipo text, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := btrim(p_nombre);
  v_vis text := btrim(p_nombre_visible);
  v_det text;
  v_esp uuid;
  v_m uuid;
  v_cod text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if v_nombre is null or v_nombre = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if char_length(v_nombre) > 60 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_tipo is null or btrim(p_tipo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if p_tipo not in ('amigos', 'empresa') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;

  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  v_cod := cruce.generar_codigo();
  insert into cruce.espacios (nombre, tipo, demo, codigo_invitacion, creado_en)
  values (v_nombre, p_tipo, false, v_cod, cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, v_vis, 'organizador', false, cruce.ahora()) returning id into v_m;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'codigo_invitacion', v_cod, 'miembro_id', v_m),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_space', sqlstate, v_ctx);
end
$$;

-- 1.2 join_space: espacio -> miembro (llamador y asiento); revalida A2 después de bloquear.
create or replace function public.join_space(p_codigo text, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := btrim(p_nombre_visible);
  v_det text;
  v_esp uuid;
  e cruce.espacios%rowtype;
  m cruce.miembros%rowtype;
  v_m uuid;
  v_reclamo boolean := false;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_codigo is null or btrim(p_codigo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;

  select x.id into v_esp from cruce.espacios x where x.codigo_invitacion = upper(btrim(p_codigo));
  if not cruce.bloquear_espacio(v_esp) then
    return cruce.err('fuera_de_audiencia', 'codigo_inexistente', null);
  end if;
  select * into e from cruce.espacios x where x.id = v_esp;
  perform 1 from cruce.miembros x
  where x.espacio_id = e.id and (x.user_id = v_uid or lower(x.nombre) = lower(v_vis))
  order by x.id
  for update;
  perform cruce.fijar_ahora();

  -- 1. ya es miembro
  select x.id into v_m from cruce.miembros x where x.espacio_id = e.id and x.user_id = v_uid;
  if v_m is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', e.id, 'miembro_id', v_m, 'reclamo_asiento_simulado', false,
                                      'ya_era_miembro', true, 'repetido', true),
      'espacio', cruce.espacio_json(e.id, v_uid)));
  end if;

  select * into m from cruce.miembros x where x.espacio_id = e.id and lower(x.nombre) = lower(v_vis);
  if found then
    if e.demo and m.simulado then
      -- 2. reclamo: solo si el asiento no tiene condiciones, elegibilidad, aceptaciones ni retiro.
      if cruce.asiento_usado(m.id) then
        return cruce.err('asiento_en_uso', 'asiento_en_uso', null);
      end if;
      update cruce.miembros x set simulado = false, user_id = v_uid where x.id = m.id;
      v_m := m.id;
      v_reclamo := true;
    else
      -- 3. nombre en uso
      return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
    end if;
  else
    -- 4. miembro nuevo
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
    values (e.id, v_uid, v_vis, 'miembro', false, cruce.ahora()) returning id into v_m;
  end if;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', e.id, 'miembro_id', v_m, 'reclamo_asiento_simulado', v_reclamo,
                                    'ya_era_miembro', false, 'repetido', false),
    'espacio', cruce.espacio_json(e.id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('join_space', sqlstate, v_ctx);
end
$$;

-- 1.3 list_my_spaces: agrega generacion.
create or replace function public.list_my_spaces() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  return cruce.ok(jsonb_build_object('espacios', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
             'codigo_invitacion', e.codigo_invitacion, 'generacion', e.generacion,
             'mi_miembro_id', m.id, 'mi_rol', m.rol,
             'cantidad_miembros', (select count(*) from cruce.miembros x where x.espacio_id = e.id))
           order by e.creado_en desc, e.id), '[]'::jsonb)
    from cruce.miembros m join cruce.espacios e on e.id = m.espacio_id
    where m.user_id = v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('list_my_spaces', sqlstate, v_ctx);
end
$$;

-- 1.5 seed_demo_space: nivel 1 + restricción única espacios_un_demo_por_usuario_uq.
create or replace function public.seed_demo_space() returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();

  select e.id into v_esp from cruce.espacios e where e.demo and e.demo_de = v_uid;
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;

  insert into cruce.espacios (nombre, tipo, demo, demo_de, codigo_invitacion, creado_en)
  values ('Los del asado', 'amigos', true, v_uid, cruce.generar_codigo(), cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, 'Tomi', 'organizador', false, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora());

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;

-- 1.6 add_simulated_member: espacio -> miembro.
create or replace function public.add_simulated_member(p_espacio_id uuid, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := btrim(p_nombre_visible);
  v_det text;
  yo cruce.miembros%rowtype;
  v_m uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  perform cruce.bloquear_espacio(p_espacio_id);
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if not found then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  if exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and lower(m.nombre) = lower(v_vis)) then
    return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
  end if;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (p_espacio_id, null, v_vis, 'miembro', true, cruce.ahora()) returning id into v_m;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('miembro_id', v_m),
    'espacio', cruce.espacio_json(p_espacio_id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('add_simulated_member', sqlstate, v_ctx);
end
$$;

-- 1.7 reset_demo(p_espacio_id, p_intento_id): A3. La firma v1 de un parámetro se elimina
-- (un solo nombre = una sola firma).
drop function if exists public.reset_demo(uuid);

create or replace function public.reset_demo(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_params jsonb;
  v_prev jsonb;
  e cruce.espacios%rowtype;
  yo cruce.miembros%rowtype;
  v_n integer;
  v_gen bigint;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento: la repetición devuelve la respuesta original sin borrar nada nuevo
  v_params := jsonb_build_object('p_espacio_id', p_espacio_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'reset_demo', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. miembro
  select * into e from cruce.espacios x where x.id = p_espacio_id;
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if e.id is null or yo.id is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  if not e.demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;
  -- 5. propuestas del espacio, en orden de id
  perform 1 from cruce.propuestas p where p.espacio_id = e.id order by p.id for update;
  perform cruce.fijar_ahora();

  -- Intentos de esas propuestas: se borran salvo los de create_proposal, que quedan como tombstones.
  delete from cruce.intentos i
  using cruce.propuestas p
  where p.espacio_id = e.id and i.propuesta_id = p.id and i.operacion <> 'create_proposal';
  with d as (delete from cruce.propuestas p where p.espacio_id = e.id returning 1)
  select count(*) into v_n from d;

  update cruce.espacios x set ultimo_reinicio = cruce.ahora(), generacion = x.generacion + 1
  where x.id = e.id returning x.generacion into v_gen;
  insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en)
  values (e.id, 'demo_reiniciada', yo.id, cruce.ahora());

  v_res := jsonb_build_object('propuestas_eliminadas', v_n, 'generacion', v_gen, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'reset_demo', v_params, e.id, yo.id, v_gen, null,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res, 'generacion', v_gen));
  return cruce.ok(jsonb_build_object(
    'resultado', v_res,
    'generacion', v_gen,
    'espacio', cruce.espacio_json(e.id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('reset_demo', sqlstate, v_ctx);
end
$$;

revoke all on function public.reset_demo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reset_demo(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
