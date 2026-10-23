-- CRUCE · 0019 · Enmienda 5 (docs/contrato-enmienda-5.md): preferencias simuladas en vivo.
-- simulate_save_preferences(p_espacio_id, p_miembro_id, p_preferencias): solo el organizador del espacio,
-- solo en demo, solo sobre miembros que siguen simulados; mismas validaciones que save_my_preferences;
-- idempotente por contenido; no toca propuestas ni state_rev. Bloqueos A4: espacio, después miembros
-- (llamador y simulado, en orden de id). Deja un evento de espacio "preferencias_simuladas" con quién lo
-- hizo y sobre qué asiento, sin el contenido. reset_demo ya restituye la semilla (0014). A5 pasa a 30.

-- Historial del espacio: el evento nuevo registra el asiento simulado afectado (nunca el contenido).
alter table cruce.eventos_espacio add column miembro_simulado_id uuid references cruce.miembros (id) on delete cascade;
alter table cruce.eventos_espacio drop constraint eventos_espacio_tipo_check;
alter table cruce.eventos_espacio add constraint eventos_espacio_tipo_check
  check (tipo in ('demo_reiniciada', 'preferencias_simuladas'));
alter table cruce.eventos_espacio add constraint eventos_espacio_simulado_check
  check ((tipo = 'preferencias_simuladas') = (miembro_simulado_id is not null));
create index eventos_espacio_simulado_idx on cruce.eventos_espacio (miembro_simulado_id);

create or replace function public.simulate_save_preferences(p_espacio_id uuid, p_miembro_id uuid, p_preferencias jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_det text;
  v_yo uuid;
  v_rol text;
  v_demo boolean;
  v_me text[];
  v_prev cruce.preferencias%rowtype;
  v_rep boolean;
  v_en timestamptz;
  v_ctx text;
begin
  -- 1. sesión · 2. forma
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_miembro_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_preferencias(p_preferencias);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  -- A4: espacio, después miembros (llamador y asiento simulado) en orden de id
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform 1 from cruce.miembros m
  where m.espacio_id = p_espacio_id and (m.user_id = v_uid or m.id = p_miembro_id)
  order by m.id
  for update;
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  -- 6. autorización, revalidada con los bloqueos tomados
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  select e.demo into v_demo from cruce.espacios e where e.id = p_espacio_id;
  if not v_demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.id = p_miembro_id and m.espacio_id = p_espacio_id and m.simulado) then
    return cruce.err('no_autorizado', 'miembro_no_simulado', null);
  end if;

  select array_agg(x order by o) into v_me
  from jsonb_array_elements_text(p_preferencias -> 'me_gustaria') with ordinality as t(x, o);
  select * into v_prev from cruce.preferencias pr where pr.miembro_id = p_miembro_id;
  v_rep := found and v_prev.presupuesto = p_preferencias ->> 'presupuesto' and v_prev.energia = p_preferencias ->> 'energia'
           and v_prev.ambiente = p_preferencias ->> 'ambiente' and v_prev.lugar = p_preferencias ->> 'lugar'
           and v_prev.me_gustaria = v_me;
  if v_rep then
    v_en := v_prev.actualizadas_en;
  else
    v_en := cruce.ahora();
    insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en)
    values (p_miembro_id, p_espacio_id, p_preferencias ->> 'presupuesto', p_preferencias ->> 'energia',
            p_preferencias ->> 'ambiente', p_preferencias ->> 'lugar', v_me, v_en)
    on conflict (miembro_id) do update
      set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
          lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en;
    insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, miembro_simulado_id, en)
    values (p_espacio_id, 'preferencias_simuladas', v_yo, p_miembro_id, v_en);
  end if;
  -- Respuesta privada del organizador: eco de lo que él mismo cargó para ese asiento simulado.
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('repetido', v_rep, 'simulado', true),
    'miembro', cruce.miembro_ref(p_miembro_id),
    'preferencias', jsonb_build_object(
      'presupuesto', p_preferencias ->> 'presupuesto', 'energia', p_preferencias ->> 'energia',
      'ambiente', p_preferencias ->> 'ambiente', 'lugar', p_preferencias ->> 'lugar',
      'me_gustaria', to_jsonb(v_me)),
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_save_preferences', sqlstate, v_ctx);
end
$$;

revoke all on function public.simulate_save_preferences(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.simulate_save_preferences(uuid, uuid, jsonb) to authenticated;

-- A5: la lista permitida pasa a 30 entradas.
create or replace function cruce.verificar_privilegios() returns void
language plpgsql stable set search_path = '' as $$
declare
  permitidas constant text[] := array[
    'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
    'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
    'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
    'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
    'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
    'get_simulation_panel', 'simulate_load_case',
    'save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador',
    'simulate_save_preferences'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 30 then
    raise exception 'A5: public no tiene exactamente 30 funciones';
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
  -- Mejora #13: nada en public (tablas, vistas, secuencias) con privilegios del navegador.
  select string_agg(c.relname, ', ') into v
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
    and (pg_catalog.has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'));
  if v is not null then
    raise exception 'A5: objetos de public con privilegios del navegador: %', v;
  end if;
  -- Mejora #13: los privilegios por defecto de postgres en public y cruce no dan nada al navegador.
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

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
