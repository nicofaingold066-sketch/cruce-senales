-- CRUCE · 0017 · Mejora #12 (MEJORAS.md): nombres con tabulador, espacio no separable u otros espacios
-- Unicode al inicio o al final esquivaban `nombre_en_uso` (btrim solo quita el espacio común) y permitían
-- dos "Luna" en el mismo espacio. Ahora todo nombre (visible y de espacio) y el código de invitación pasan
-- por cruce.normalizar_nombre: forma NFC, sin caracteres de ancho cero, cualquier espacio o control → un
-- espacio, espacios repetidos colapsados y recorte. Las filas viejas no se tocan (son datos de prueba que
-- ya colisionarían); la restricción nueva vale para filas nuevas (NOT VALID).

create or replace function cruce.normalizar_nombre(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
           regexp_replace(normalize(p, NFC), '[\u200B-\u200D\u2060\uFEFF]', '', 'g'),
           '[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\x01-\x1F\x7F]+', ' ', 'g'))
$$;

create or replace function cruce.validar_nombre_visible(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null or cruce.normalizar_nombre(p) = '' then 'campo_faltante'
    when char_length(cruce.normalizar_nombre(p)) > 30 then 'formato_invalido'
    else null end
$$;

alter table cruce.miembros add constraint miembros_nombre_normalizado
  check (nombre = cruce.normalizar_nombre(nombre)) not valid;
alter table cruce.espacios add constraint espacios_nombre_normalizado
  check (nombre = cruce.normalizar_nombre(nombre)) not valid;

-- create_space, join_space y add_simulated_member: iguales a 0010 salvo la normalización.
create or replace function public.create_space(p_nombre text, p_tipo text, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := cruce.normalizar_nombre(p_nombre);
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
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

create or replace function public.join_space(p_codigo text, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
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
  if p_codigo is null or cruce.normalizar_nombre(p_codigo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;

  select x.id into v_esp from cruce.espacios x where x.codigo_invitacion = upper(replace(cruce.normalizar_nombre(p_codigo), ' ', ''));
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

create or replace function public.add_simulated_member(p_espacio_id uuid, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
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

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
