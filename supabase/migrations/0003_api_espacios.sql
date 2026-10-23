-- CRUCE · 0003 · API de espacios (funciones RPC en public)
-- Todas: SECURITY DEFINER, search_path vacío, devuelven el sobre jsonb y nunca lanzan excepción
-- (una falla inesperada se registra sin valores y responde fallo_temporal).

create or replace function public.server_info() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ctx text;
begin
  return cruce.ok(jsonb_build_object('sesion', jsonb_build_object('autenticada', auth.uid() is not null)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('server_info', sqlstate, v_ctx);
end
$$;

-- Validación de nombre visible (1-30 tras recortar): null si es válido, o el detalle del error.
create or replace function cruce.validar_nombre_visible(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then 'campo_faltante'
    when char_length(btrim(p)) > 30 then 'formato_invalido'
    else null end
$$;
revoke all on function cruce.validar_nombre_visible(text) from public, anon, authenticated;

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

  v_cod := cruce.generar_codigo();
  insert into cruce.espacios (nombre, tipo, demo, codigo_invitacion)
  values (v_nombre, p_tipo, false, v_cod) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado)
  values (v_esp, v_uid, v_vis, 'organizador', false) returning id into v_m;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'codigo_invitacion', v_cod, 'miembro_id', v_m),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_space', sqlstate, v_ctx);
end
$$;

create or replace function public.join_space(p_codigo text, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := btrim(p_nombre_visible);
  v_det text;
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

  select * into e from cruce.espacios x where x.codigo_invitacion = upper(btrim(p_codigo)) for update;
  if not found then
    return cruce.err('fuera_de_audiencia', 'codigo_inexistente', null);
  end if;

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
      -- 2. reclamo de asiento simulado en espacio demo
      update cruce.miembros x set simulado = false, user_id = v_uid where x.id = m.id;
      v_m := m.id;
      v_reclamo := true;
    else
      -- 3. nombre en uso
      return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
    end if;
  else
    -- 4. miembro nuevo
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado)
    values (e.id, v_uid, v_vis, 'miembro', false) returning id into v_m;
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
             'codigo_invitacion', e.codigo_invitacion, 'mi_miembro_id', m.id, 'mi_rol', m.rol,
             'cantidad_miembros', (select count(*) from cruce.miembros x where x.espacio_id = e.id))
           order by e.creado_en desc, e.id), '[]'::jsonb)
    from cruce.miembros m join cruce.espacios e on e.id = m.espacio_id
    where m.user_id = v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('list_my_spaces', sqlstate, v_ctx);
end
$$;

create or replace function public.get_space(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  return cruce.ok(jsonb_build_object('espacio', cruce.espacio_json(p_espacio_id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_space', sqlstate, v_ctx);
end
$$;

-- Seed idempotente del espacio demo "Los del asado" (por sesión llamadora).
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
  perform pg_advisory_xact_lock(hashtextextended('seed:' || v_uid::text, 0));

  select e.id into v_esp
  from cruce.espacios e join cruce.miembros m on m.espacio_id = e.id
  where e.demo and m.user_id = v_uid and m.rol = 'organizador'
  order by e.creado_en, e.id limit 1;
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;

  insert into cruce.espacios (nombre, tipo, demo, codigo_invitacion)
  values ('Los del asado', 'amigos', true, cruce.generar_codigo()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado)
  values (v_esp, v_uid, 'Tomi', 'organizador', false);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado) values (v_esp, null, 'Luna', 'miembro', true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado) values (v_esp, null, 'Mati', 'miembro', true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado) values (v_esp, null, 'Caro', 'miembro', true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado) values (v_esp, null, 'Fede', 'miembro', true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado) values (v_esp, null, 'Sofi', 'miembro', true);

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;

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
  perform 1 from cruce.espacios e where e.id = p_espacio_id for update;
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if not found then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  if exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and lower(m.nombre) = lower(v_vis)) then
    return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
  end if;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado)
  values (p_espacio_id, null, v_vis, 'miembro', true) returning id into v_m;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('miembro_id', v_m),
    'espacio', cruce.espacio_json(p_espacio_id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('add_simulated_member', sqlstate, v_ctx);
end
$$;

-- Reinicio: solo organizador del espacio y solo espacios demo. No toca ningún otro espacio.
create or replace function public.reset_demo(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  e cruce.espacios%rowtype;
  yo cruce.miembros%rowtype;
  v_n integer;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.espacios x where x.id = p_espacio_id for update;
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if e.id is null or yo.id is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  if not e.demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;

  -- Bloquea las propuestas del espacio (espera a operaciones en curso) y las elimina con todo lo que cuelga.
  perform 1 from cruce.propuestas p where p.espacio_id = e.id for update;
  with d as (delete from cruce.propuestas p where p.espacio_id = e.id returning 1)
  select count(*) into v_n from d;

  update cruce.espacios x set ultimo_reinicio = now() where x.id = e.id;
  insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en) values (e.id, 'demo_reiniciada', yo.id, now());

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('propuestas_eliminadas', v_n),
    'espacio', cruce.espacio_json(e.id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('reset_demo', sqlstate, v_ctx);
end
$$;
