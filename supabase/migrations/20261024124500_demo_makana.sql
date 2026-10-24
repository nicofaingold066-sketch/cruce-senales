-- CRUXE · 20261024124500 · Caso de demostración Makana, aditivo y aislado.
-- Conserva cada demo legacy, sus seis personajes y sus permisos. Un mismo usuario puede abrir
-- una demo por variante. No crea cuentas Auth, invitaciones externas ni datos personales.
-- Sustituye el borrador 0057 que nunca se aplicó en el proyecto remoto. Se ordena DESPUÉS de
-- 20261024115616_actividad_grupo, ya aplicada. CLI ausente: archivo preparado por instrucción
-- directa del usuario/coordinador; requiere revisión y entorno autorizado antes de activarse.
-- RPC nueva: seed_demo_makana() (43 authenticated / 0 anon). El resto conserva firmas y contrato 2.
-- Reiniciar Makana conserva sesiones, preferencias y permisos de asientos reclamados; solo restablece
-- los perfiles todavía simulados y borra planes/recibos de ESTE espacio. No inventa disponibilidades.

alter table cruce.espacios add column demo_caso text not null default 'legacy'
  check (demo_caso in ('legacy', 'makana'));
drop index cruce.espacios_un_demo_por_usuario_uq;
create unique index espacios_un_demo_por_usuario_y_caso_uq
  on cruce.espacios (demo_de, demo_caso) where demo;

-- La entrada anterior sigue encontrando únicamente su demo original.
create or replace function public.seed_demo_space() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
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

  select e.id into v_esp from cruce.espacios e where e.demo and e.demo_de = v_uid and e.demo_caso = 'legacy';
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;

  insert into cruce.espacios (nombre, tipo, demo, demo_de, codigo_invitacion, creado_en)
  values ('Los del finde', 'amigos', true, v_uid, cruce.generar_codigo(), cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, 'Tomi', 'organizador', false, cruce.ahora());
  -- 0055: en la demo, los amigos simulados nacen con las invitaciones del agente activadas (el organizador, no:
  -- lo decide él en la pantalla). Solo acá y en add_simulated_member, que también es solo demo.
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora(), true);
  perform cruce.sembrar_preferencias_demo(v_esp);

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;


create or replace function public.seed_demo_makana() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_nombre text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  select e.id into v_esp from cruce.espacios e
  where e.demo and e.demo_de = v_uid and e.demo_caso = 'makana';
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;
  insert into cruce.espacios (nombre, tipo, demo, demo_de, demo_caso, codigo_invitacion, creado_en)
  values ('El plan que no deja a nadie afuera', 'amigos', true, v_uid, 'makana', cruce.generar_codigo(), cruce.ahora())
  returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
  values (v_esp, v_uid, 'Ana', 'organizador', false, cruce.ahora(), false);
  foreach v_nombre in array array['Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Gabriela'] loop
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
    values (v_esp, null, v_nombre, 'miembro', true, cruce.ahora(), false);
  end loop;
  -- Sin filas de preferencias, condiciones, interés ni aceptaciones. Camila y Felipe pueden
  -- reclamar su asiento con join_space ANTES de que tenga actividad simulada (A2 vigente).
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_makana', sqlstate, v_ctx);
end
$$;

-- Los wrappers capturan los cuerpos VIGENTES tras actividad_grupo. Preservan movimientos,
-- pertenencia activa, salidas y reingreso con usuario_original_id/salio_en; no duplican el motor.
alter function cruce.espacio_json(uuid, uuid) rename to espacio_json_antes_makana;
create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select cruce.espacio_json_antes_makana(p_espacio, p_uid)
    || jsonb_build_object('demo_caso', case when e.demo then e.demo_caso else null end)
  from cruce.espacios e where e.id = p_espacio
$$;

alter function cruce.vista_propuesta(uuid, uuid) rename to vista_propuesta_antes_makana;
create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language sql stable set search_path = '' as $$
  select cruce.vista_propuesta_antes_makana(p_prop, p_yo)
    || jsonb_build_object('demo_caso', case when e.demo then e.demo_caso else null end)
  from cruce.propuestas p join cruce.espacios e on e.id = p.espacio_id where p.id = p_prop
$$;

alter function public.list_my_spaces() set schema cruce;
alter function cruce.list_my_spaces() rename to list_my_spaces_antes_makana;
create or replace function public.list_my_spaces() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := cruce.list_my_spaces_antes_makana();
begin
  if not coalesce((r ->> 'ok')::boolean, false) then return r; end if;
  return jsonb_set(r, '{espacios}', (
    select coalesce(jsonb_agg(x.value || jsonb_build_object(
      'demo_caso', case when e.demo then e.demo_caso else null end) order by x.ordinality), '[]'::jsonb)
    from jsonb_array_elements(r -> 'espacios') with ordinality x(value, ordinality)
    join cruce.espacios e on e.id = (x.value ->> 'id')::uuid));
end
$$;

-- El default histórico true permanece solo en legacy. Makana requiere autorización afirmativa.
alter function public.get_my_preferences(uuid) set schema cruce;
alter function cruce.get_my_preferences(uuid) rename to get_my_preferences_antes_makana;
create or replace function public.get_my_preferences(p_espacio_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := cruce.get_my_preferences_antes_makana(p_espacio_id);
begin
  if coalesce((r ->> 'ok')::boolean, false) and r -> 'preferencias' = 'null'::jsonb
     and exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo and e.demo_caso = 'makana') then
    r := jsonb_set(r, '{usar_en_agente}', 'false'::jsonb);
  end if;
  return r;
end
$$;

alter function public.save_my_preferences(uuid, jsonb) set schema cruce;
alter function cruce.save_my_preferences(uuid, jsonb) rename to save_my_preferences_antes_makana;
create or replace function public.save_my_preferences(p_espacio_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
begin
  if jsonb_typeof(p_preferencias) = 'object' and not (p_preferencias ? 'usar_en_agente')
     and exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo and e.demo_caso = 'makana') then
    p_preferencias := p_preferencias || jsonb_build_object('usar_en_agente', false);
  end if;
  return cruce.save_my_preferences_antes_makana(p_espacio_id, p_preferencias);
end
$$;

alter function public.simulate_save_preferences(uuid, uuid, jsonb) set schema cruce;
alter function cruce.simulate_save_preferences(uuid, uuid, jsonb) rename to simulate_save_preferences_antes_makana;
create or replace function public.simulate_save_preferences(p_espacio_id uuid, p_miembro_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  r jsonb := cruce.simulate_save_preferences_antes_makana(p_espacio_id, p_miembro_id, p_preferencias);
begin
  -- La función original ya validó sesión, organizador, espacio demo y destinatario simulado.
  -- Nunca interpreta la edición del organizador como consentimiento de otra persona.
  if coalesce((r ->> 'ok')::boolean, false)
     and exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo and e.demo_caso = 'makana') then
    update cruce.preferencias pr set usar_en_agente = false where pr.miembro_id = p_miembro_id and pr.espacio_id = p_espacio_id;
  end if;
  return r;
end
$$;

alter function public.add_simulated_member(uuid, text) set schema cruce;
alter function cruce.add_simulated_member(uuid, text) rename to add_simulated_member_antes_makana;
create or replace function public.add_simulated_member(p_espacio_id uuid, p_nombre_visible text) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  r jsonb := cruce.add_simulated_member_antes_makana(p_espacio_id, p_nombre_visible);
begin
  if coalesce((r ->> 'ok')::boolean, false)
     and exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo and e.demo_caso = 'makana') then
    update cruce.miembros m set recibir_invitaciones_agente = false
    where m.id = (r #>> '{resultado,miembro_id}')::uuid and m.espacio_id = p_espacio_id and m.simulado;
  end if;
  return r;
end
$$;

alter function cruce.sembrar_preferencias_demo(uuid) rename to sembrar_preferencias_demo_antes_makana;
create or replace function cruce.sembrar_preferencias_demo(p_esp uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  if exists (select 1 from cruce.espacios e where e.id = p_esp and e.demo and e.demo_caso = 'makana') then
    delete from cruce.preferencias pr using cruce.miembros m
    where pr.miembro_id = m.id and m.espacio_id = p_esp and m.simulado;
  else
    perform cruce.sembrar_preferencias_demo_antes_makana(p_esp);
  end if;
end
$$;

alter function cruce.mensaje(text, text) rename to mensaje_antes_makana;
create or replace function cruce.mensaje(p_codigo text, p_detalle text) returns text
language sql immutable set search_path = '' as $$
  select case when p_codigo = 'no_autorizado' and p_detalle = 'caso_no_disponible'
    then 'Este caso no tiene respuestas precargadas. Cada persona responde a la propuesta concreta.'
    else cruce.mensaje_antes_makana(p_codigo, p_detalle) end
$$;

alter function public.simulate_load_case(uuid, uuid) set schema cruce;
alter function cruce.simulate_load_case(uuid, uuid) rename to simulate_load_case_antes_makana;
create or replace function public.simulate_load_case(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_rol text;
  v_rev integer;
begin
  if auth.uid() is not null and p_intento_id is not null then
    select m.rol, p.state_rev into v_rol, v_rev
    from cruce.propuestas p join cruce.espacios e on e.id = p.espacio_id
    join cruce.miembros m on m.espacio_id = e.id and m.user_id = auth.uid()
    where p.id = p_propuesta_id and e.demo and e.demo_caso = 'makana';
    if found then
      if v_rol <> 'organizador' then
        return cruce.err('no_autorizado', 'no_es_organizador_espacio', v_rev);
      end if;
      return cruce.err('no_autorizado', 'caso_no_disponible', v_rev);
    end if;
  end if;
  return cruce.simulate_load_case_antes_makana(p_propuesta_id, p_intento_id);
end
$$;

alter function public.reset_demo(uuid, uuid) set schema cruce;
alter function cruce.reset_demo(uuid, uuid) rename to reset_demo_antes_makana;
create or replace function public.reset_demo(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  e cruce.espacios%rowtype;
  yo cruce.miembros%rowtype;
  v_prev jsonb;
  r jsonb;
  v_ctx text;
begin
  if v_uid is null then return cruce.err('sesion_invalida', 'sin_sesion', null); end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  perform cruce.bloquear_espacio(p_espacio_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'reset_demo', jsonb_build_object('p_espacio_id', p_espacio_id));
  if v_prev is not null then return v_prev; end if;
  select * into e from cruce.espacios x where x.id = p_espacio_id;
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if e.id is null or yo.id is null then return cruce.err('fuera_de_audiencia', 'no_miembro', null); end if;
  if yo.rol <> 'organizador' then return cruce.err('no_autorizado', 'no_es_organizador_espacio', null); end if;
  if not e.demo then return cruce.err('no_autorizado', 'espacio_no_demo', null); end if;
  if e.demo_caso <> 'makana' then
    return cruce.reset_demo_antes_makana(p_espacio_id, p_intento_id);
  end if;
  if e.demo_caso = 'makana' then
    perform 1 from cruce.miembros m where m.espacio_id = e.id and (m.user_id = v_uid or m.simulado) order by m.id for update;
    -- Todos los writers sociales bloquean primero este espacio. Se eliminan sus recibos para
    -- que la misma oportunidad pueda ejecutarse de nuevo, sin reusar una propuesta borrada.
    delete from cruce.ejecuciones_agente x where x.espacio_id = e.id;
    delete from cruce.opciones_agente x where x.espacio_id = e.id;
    update cruce.miembros m set recibir_invitaciones_agente = false where m.espacio_id = e.id and m.simulado;
  end if;
  -- Reutiliza generación, tombstones, límites del espacio, evento e idempotencia existentes.
  -- sembrar_preferencias_demo hace dispatch por variante y conserva a los asientos reclamados.
  r := cruce.reset_demo_antes_makana(p_espacio_id, p_intento_id);
  -- Un fallo del cuerpo legacy también debe revertir la limpieza de recibos de este wrapper.
  if not coalesce((r ->> 'ok')::boolean, false) then
    raise sqlstate 'P5701' using message = 'reset_demo_no_completado';
  end if;
  return r;
exception
  when sqlstate 'P5701' then
    -- Las variables conservan el sobre tipado; el bloque revierte también la limpieza previa.
    return r;
  when others then
    get stacked diagnostics v_ctx = pg_exception_context;
    return cruce.fallo('reset_demo', sqlstate, v_ctx);
end
$$;

create or replace function cruce.verificar_privilegios() returns void
language plpgsql stable set search_path = '' as $$
declare
  permitidas constant text[] := array[
    'seed_demo_makana', 'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
    'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
    'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
    'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
    'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
    'get_simulation_panel', 'simulate_load_case',
    'save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador',
    'simulate_save_preferences', 'preview_space_by_code',
    -- E11
    'agente_social_contexto', 'agente_social_candidatos', 'set_recibir_invitaciones_agente',
    'set_politica_agente_social', 'iniciar_ejecucion_agente', 'guardar_borrador_agente',
    'aprobar_borrador_agente', 'publicar_borrador_agente', 'cerrar_ejecucion_agente',
    -- E13
    'opinar_version', 'leave_space'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 43 then
    raise exception 'A5: public no tiene exactamente 43 funciones';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p where p.proname = 'agente_insumos') then
    raise exception 'A5: agente_insumos no debe existir (enmienda 4, decisión 1)';
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
  select string_agg(c.relname, ', ') into v
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'cruce' and c.relkind = 'r'
    and (not c.relrowsecurity
         or pg_catalog.has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'));
  if v is not null then
    raise exception 'A5: tablas de cruce sin RLS o con privilegios del navegador: %', v;
  end if;
  select string_agg(c.relname, ', ') into v
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
    and (pg_catalog.has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'));
  if v is not null then
    raise exception 'A5: objetos de public con privilegios del navegador: %', v;
  end if;
  select string_agg(n.nspname || ':' || d.defaclobjtype::text, ', ') into v
  from pg_catalog.pg_default_acl d join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
  where pg_catalog.pg_get_userbyid(d.defaclrole) = 'postgres' and n.nspname in ('public', 'cruce')
    and (d.defaclacl::text like '%anon=%' or d.defaclacl::text like '%authenticated=%');
  if v is not null then
    raise exception 'A5: privilegios por defecto de postgres que dan acceso al navegador: %', v;
  end if;
  if pg_catalog.has_schema_privilege('anon', 'cruce', 'USAGE')
     or pg_catalog.has_schema_privilege('authenticated', 'cruce', 'USAGE') then
    raise exception 'A5: el esquema cruce es usable desde el navegador';
  end if;
end
$$;
revoke all on function public.seed_demo_makana() from public, anon, authenticated;
grant execute on function public.seed_demo_makana() to authenticated;
revoke all on function public.list_my_spaces(), public.get_my_preferences(uuid),
  public.save_my_preferences(uuid, jsonb), public.simulate_save_preferences(uuid, uuid, jsonb),
  public.add_simulated_member(uuid, text), public.simulate_load_case(uuid, uuid), public.reset_demo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_my_spaces(), public.get_my_preferences(uuid),
  public.save_my_preferences(uuid, jsonb), public.simulate_save_preferences(uuid, uuid, jsonb),
  public.add_simulated_member(uuid, text), public.simulate_load_case(uuid, uuid), public.reset_demo(uuid, uuid)
  to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
notify pgrst, 'reload schema';
