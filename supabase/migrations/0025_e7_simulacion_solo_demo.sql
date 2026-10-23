-- CRUCE · 0025 · Enmienda 7, punto E7.3 (hallazgos 2 y 3 de docs/agente-revision-privacidad.md):
-- simulación solo en espacios demo.
--   * add_simulated_member: no_autorizado / espacio_no_demo si el espacio no es demo (después de sesión,
--     formato, nombre, membresía y rol de organizador, como reset_demo; antes de nombre_en_uso).
--   * simulate_mark_interest, simulate_save_conditions, simulate_accept y simulate_withdraw pasan por
--     cruce.chequeo_simulacion: ahí se agrega el mismo rechazo, después del rol de organizador y antes de
--     miembro_no_simulado (el mismo orden que ya tienen simulate_load_case y simulate_save_preferences,
--     que ya rechazaban fuera del demo y no cambian).
-- Los simulados que ya existen en espacios no demo no se borran: quedan, pero no se pueden operar.
-- Sin firmas nuevas (A5: la lista permitida sigue en 30). Cuerpos copiados de la base vigente
-- (add_simulated_member de 0017; chequeo_simulacion de 0011).

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
  -- E7.3: solo en espacios demo.
  if not exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo) then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
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

create or replace function cruce.chequeo_simulacion(p_prop uuid, p_yo uuid, p_destino uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
begin
  select * into p from cruce.propuestas x where x.id = p_prop;
  if not exists (select 1 from cruce.miembros m where m.id = p_yo and m.rol = 'organizador') then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', p.state_rev);
  end if;
  -- E7.3: solo en espacios demo.
  if not exists (select 1 from cruce.espacios e where e.id = p.espacio_id and e.demo) then
    return cruce.err('no_autorizado', 'espacio_no_demo', p.state_rev);
  end if;
  if not exists (select 1 from cruce.miembros m
                 where m.id = p_destino and m.espacio_id = p.espacio_id and m.simulado) then
    return cruce.err('no_autorizado', 'miembro_no_simulado', p.state_rev);
  end if;
  return null;
end
$$;

revoke all on function public.add_simulated_member(uuid, text) from public, anon, authenticated;
grant execute on function public.add_simulated_member(uuid, text) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
