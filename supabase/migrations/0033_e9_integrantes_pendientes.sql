-- CRUCE · 0033 · Enmienda 9, fase 2 (docs/contrato-enmienda-9.md, mejora #70): integrantes pendientes.
--   * create_space gana p_integrantes text[] default '{}' (una sola firma: se elimina la de tres parámetros).
--     Crea, además del organizador, un miembro pendiente por nombre: user_id null, simulado false,
--     pendiente true, rol 'miembro'. Tope 12 nombres (más → entrada_incompleta/formato_invalido); cada nombre
--     con las reglas de join_space (campo_faltante, formato_invalido); repetido entre ellos o igual al del
--     organizador → entrada_incompleta/nombre_en_uso. Sin p_integrantes: idéntico a 0017.
--     `resultado` suma `pendientes: [{ miembro_id, nombre }]` en el orden recibido (vacío si no hay).
--   * cruce.espacio_json (get_space y todas las respuestas con `espacio`): cada miembro suma `pendiente`.
--   * Los pendientes nunca cuentan: no tienen sesión, condiciones ni preferencias, así que no entran en
--     elegibles (salen de condiciones), interés, aceptaciones, cupos, personas_con_condiciones ni quórum.
--     simulate_* los rechaza por cruce.chequeo_simulacion (fuera del demo, espacio_no_demo por E7.3; y nunca
--     son simulados); get_simulation_panel solo lista simulados; reset_demo no los toca (no existen en el demo).
--     join_space con p_miembro_id (0032) los vuelve reales con la sesión de quien reclama.
-- Cuerpos copiados: create_space de 0017, espacio_json de 0008; solo cambian las líneas marcadas E9.

drop function if exists public.create_space(text, text, text);

create or replace function public.create_space(p_nombre text, p_tipo text, p_nombre_visible text, p_integrantes text[] default '{}') returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := cruce.normalizar_nombre(p_nombre);
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
  v_det text;
  v_esp uuid;
  v_m uuid;
  v_cod text;
  v_in text[] := coalesce(p_integrantes, array[]::text[]);
  v_int text[] := array[]::text[];
  v_x text;
  v_mid uuid;
  v_pend jsonb := '[]'::jsonb;
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
  -- E9 (fase 2): integrantes pendientes. Tope 12; mismas reglas de nombre que join_space; sin repetidos entre
  -- ellos ni con el organizador (comparación sin mayúsculas, tras normalizar).
  if cardinality(v_in) > 12 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  foreach v_x in array v_in loop
    v_det := cruce.validar_nombre_visible(v_x);
    if v_det is not null then
      return cruce.err('entrada_incompleta', v_det, null);
    end if;
    v_x := cruce.normalizar_nombre(v_x);
    if lower(v_x) = lower(v_vis) or lower(v_x) = any (select lower(y) from unnest(v_int) y) then
      return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
    end if;
    v_int := v_int || v_x;
  end loop;

  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  v_cod := cruce.generar_codigo();
  insert into cruce.espacios (nombre, tipo, demo, codigo_invitacion, creado_en)
  values (v_nombre, p_tipo, false, v_cod, cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, v_vis, 'organizador', false, cruce.ahora()) returning id into v_m;
  foreach v_x in array v_int loop
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, pendiente, creado_en)
    values (v_esp, null, v_x, 'miembro', false, true, cruce.ahora()) returning id into v_mid;
    v_pend := v_pend || jsonb_build_array(jsonb_build_object('miembro_id', v_mid, 'nombre', v_x));
  end loop;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'codigo_invitacion', v_cod, 'miembro_id', v_m, 'pendientes', v_pend),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_space', sqlstate, v_ctx);
end
$$;

create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
    'codigo_invitacion', e.codigo_invitacion,
    'generacion', e.generacion,
    'creado_en', cruce.momento(e.creado_en),
    'ultimo_reinicio', cruce.momento(e.ultimo_reinicio),
    'mi_miembro_id', yo.id, 'mi_rol', yo.rol,
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre, 'rol', m.rol, 'simulado', m.simulado,
               'pendiente', m.pendiente,
               'es_yo', coalesce(m.user_id = p_uid, false)) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id))
  from cruce.espacios e
  left join cruce.miembros yo on yo.espacio_id = e.id and yo.user_id = p_uid
  where e.id = p_espacio
$$;

revoke all on function public.create_space(text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.create_space(text, text, text, text[]) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
