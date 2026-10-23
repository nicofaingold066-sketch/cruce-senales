-- CRUCE · 0015 · Enmienda 4: operaciones públicas del agente del círculo.
-- save_my_preferences · get_my_preferences · proponer_plan_borrador (regla fija de la sección 4, sin IA,
-- no escribe nada) · lista permitida de A5 a 29. Ninguna toca propuestas ni state_rev.

-- Validación de preferencias: null si son válidas; si no, el detalle del error.
create or replace function cruce.validar_preferencias(p jsonb) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_el jsonb;
  v_vistas text[] := array[]::text[];
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return 'formato_invalido';
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(p) k)
     is distinct from array['ambiente', 'energia', 'lugar', 'me_gustaria', 'presupuesto'] then
    return 'preferencias_invalidas';
  end if;
  if jsonb_typeof(p -> 'presupuesto') <> 'string' or p ->> 'presupuesto' not in ('da_igual', 'algo_barato', 'ojala_gratis')
     or jsonb_typeof(p -> 'energia') <> 'string' or p ->> 'energia' not in ('con_todo', 'algo_tranquilo')
     or jsonb_typeof(p -> 'ambiente') <> 'string' or p ->> 'ambiente' not in ('fiesta', 'tranquilo', 'da_igual')
     or jsonb_typeof(p -> 'lugar') <> 'string' or p ->> 'lugar' not in ('da_igual', 'bajo_techo')
     or jsonb_typeof(p -> 'me_gustaria') <> 'array'
     or jsonb_array_length(p -> 'me_gustaria') not between 1 and 6 then
    return 'preferencias_invalidas';
  end if;
  for v_el in select x from jsonb_array_elements(p -> 'me_gustaria') x loop
    if jsonb_typeof(v_el) <> 'string'
       or not exists (select 1 from cruce.catalogo_agente c where c.actividad = v_el #>> '{}')
       or (v_el #>> '{}') = any (v_vistas) then
      return 'preferencias_invalidas';
    end if;
    v_vistas := v_vistas || (v_el #>> '{}');
  end loop;
  return null;
end
$$;

create or replace function cruce.preferencias_json(pr cruce.preferencias) returns jsonb
language sql stable set search_path = '' as $$
  select case when pr.miembro_id is null then null else jsonb_build_object(
    'presupuesto', pr.presupuesto, 'energia', pr.energia, 'ambiente', pr.ambiente, 'lugar', pr.lugar,
    'me_gustaria', to_jsonb(pr.me_gustaria)) end
$$;

-- 2. save_my_preferences -----------------------------------------------------------------------
create or replace function public.save_my_preferences(p_espacio_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_det text;
  v_yo uuid;
  v_me text[];
  v_prev cruce.preferencias%rowtype;
  v_rep boolean;
  v_en timestamptz;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_preferencias(p_preferencias);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  -- A4: espacio, después miembro
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();

  select array_agg(x order by o) into v_me
  from jsonb_array_elements_text(p_preferencias -> 'me_gustaria') with ordinality as t(x, o);
  select * into v_prev from cruce.preferencias pr where pr.miembro_id = v_yo;
  v_rep := found and v_prev.presupuesto = p_preferencias ->> 'presupuesto' and v_prev.energia = p_preferencias ->> 'energia'
           and v_prev.ambiente = p_preferencias ->> 'ambiente' and v_prev.lugar = p_preferencias ->> 'lugar'
           and v_prev.me_gustaria = v_me;
  if v_rep then
    v_en := v_prev.actualizadas_en;
  else
    v_en := cruce.ahora();
    insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en)
    values (v_yo, p_espacio_id, p_preferencias ->> 'presupuesto', p_preferencias ->> 'energia',
            p_preferencias ->> 'ambiente', p_preferencias ->> 'lugar', v_me, v_en)
    on conflict (miembro_id) do update
      set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
          lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en;
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('repetido', v_rep),
    'preferencias', jsonb_build_object(
      'presupuesto', p_preferencias ->> 'presupuesto', 'energia', p_preferencias ->> 'energia',
      'ambiente', p_preferencias ->> 'ambiente', 'lugar', p_preferencias ->> 'lugar',
      'me_gustaria', to_jsonb(v_me)),
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('save_my_preferences', sqlstate, v_ctx);
end
$$;

-- 3. get_my_preferences ------------------------------------------------------------------------
create or replace function public.get_my_preferences(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  pr cruce.preferencias%rowtype;
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
  select * into pr from cruce.preferencias x where x.miembro_id = v_yo;
  return cruce.ok(jsonb_build_object(
    'preferencias', cruce.preferencias_json(pr),
    'actualizadas_en', cruce.momento(pr.actualizadas_en),
    'opciones', jsonb_build_object('actividades', (
      select jsonb_agg(jsonb_build_object('clave', a.actividad, 'etiqueta', a.etiqueta) order by a.orden)
      from (select c.actividad, min(c.actividad_etiqueta) as etiqueta, min(c.orden) as orden
            from cruce.catalogo_agente c group by c.actividad) a)),
    'personas_con_preferencias', (select count(*) from cruce.preferencias x where x.espacio_id = p_espacio_id)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_my_preferences', sqlstate, v_ctx);
end
$$;

-- 4. proponer_plan_borrador: reglas fijas, solo lectura -------------------------------------------
create or replace function public.proponer_plan_borrador(p_espacio_id uuid, p_sabado date, p_clima jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date;
  v_sab text;
  v_dom text;
  v_rol text;
  v_n integer;
  v_max_precio integer;
  v_techo boolean;
  v_con integer;
  v_tranq integer;
  v_fiesta integer;
  v_amb_tranq integer;
  v_energia text;
  v_ambiente text;
  v_max_marcas integer;
  v_clima_malo boolean;
  c record;
  v_frases jsonb := '[]'::jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  -- 2. forma
  if p_espacio_id is null or p_sabado is null or p_clima is null or jsonb_typeof(p_clima) <> 'object'
     or jsonb_typeof(p_clima -> 'sabado') is distinct from 'string'
     or jsonb_typeof(p_clima -> 'domingo') is distinct from 'string' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_sab := p_clima ->> 'sabado';
  v_dom := p_clima ->> 'domingo';
  if v_sab not in ('seco', 'lluvia', 'desconocido') or v_dom not in ('seco', 'lluvia', 'desconocido') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_hoy := (cruce.ahora() at time zone 'America/Santiago')::date;
  if extract(isodow from p_sabado) <> 6 or p_sabado <= v_hoy or p_sabado > v_hoy + 16 then
    return cruce.err('entrada_incompleta', 'fecha_invalida', null);
  end if;
  -- 4. pertenencia y 6. autorización
  select m.rol into v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_rol is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;

  -- Universo: miembros del espacio con preferencias (reales o simulados).
  select count(*),
         min(case pr.presupuesto when 'ojala_gratis' then 0 when 'algo_barato' then 1 else 2 end),
         coalesce(bool_or(pr.lugar = 'bajo_techo'), false),
         count(*) filter (where pr.energia = 'con_todo'), count(*) filter (where pr.energia = 'algo_tranquilo'),
         count(*) filter (where pr.ambiente = 'fiesta'), count(*) filter (where pr.ambiente = 'tranquilo')
    into v_n, v_max_precio, v_techo, v_con, v_tranq, v_fiesta, v_amb_tranq
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
  where pr.espacio_id = p_espacio_id;
  if v_n < 2 then
    return cruce.err('entrada_incompleta', 'pocas_preferencias', null);
  end if;
  v_energia := case when v_con > v_tranq then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente := case when v_fiesta > v_amb_tranq then 'fiesta' when v_amb_tranq > v_fiesta then 'tranquilo' end;
  v_clima_malo := v_sab in ('lluvia', 'desconocido') or v_dom in ('lluvia', 'desconocido');
  select max(x.n) into v_max_marcas
  from (select a, count(*) as n
        from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
        cross join unnest(pr.me_gustaria) a
        where pr.espacio_id = p_espacio_id group by a) x;

  -- 1. descarte · 2. puntaje · 3. elección
  select k.*,
         (k.marcas = v_max_marcas) as el_mas_elegido
    into c
  from (
    select cat.*,
           case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end as precio_n,
           (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
            where pr.espacio_id = p_espacio_id and cat.actividad = any (pr.me_gustaria)) as marcas,
           (cat.energia = v_energia) as suma_energia,
           coalesce(cat.ambiente = v_ambiente, false) as suma_ambiente,
           ((not cat.techado and v_sab = 'seco' and v_dom = 'seco')
            or (cat.techado and (v_sab = 'lluvia' or v_dom = 'lluvia'))) as suma_clima
    from cruce.catalogo_agente cat
    where cat.sab_inicio is not null and cat.dom_inicio is not null
      and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
      and not (not cat.techado and v_techo and v_clima_malo)
  ) k
  order by 3 * k.marcas + k.suma_energia::int + k.suma_ambiente::int + k.suma_clima::int desc, k.precio_n, k.orden
  limit 1;

  if not found then
    return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('tipo', 'sin_plan_compatible')));
  end if;

  if v_n > 3 then
    v_frases := v_frases || '"presupuesto_todos"'::jsonb;
  end if;
  if c.techado then
    v_frases := v_frases || '"bajo_techo"'::jsonb;
  elsif v_sab = 'seco' and v_dom = 'seco' then
    v_frases := v_frases || '"al_aire_libre_con_buen_tiempo"'::jsonb;
  end if;
  if c.el_mas_elegido then
    v_frases := v_frases || '"el_mas_elegido"'::jsonb;
  end if;
  if v_n > 3 and c.suma_energia and c.suma_ambiente then
    v_frases := v_frases || '"ritmo_del_grupo"'::jsonb;
  end if;

  return cruce.ok(jsonb_build_object('resultado', jsonb_build_object(
    'tipo', 'borrador',
    'actividad', c.actividad,
    'actividad_etiqueta', c.actividad_etiqueta,
    'lugar', jsonb_build_object('id', c.id, 'nombre', c.lugar_nombre, 'simulado', true),
    'titulo', c.titulo_plantilla,
    'franjas', jsonb_build_array(
      jsonb_build_object(
        'inicio', to_char(p_sabado + c.sab_inicio, 'YYYY-MM-DD"T"HH24:MI'),
        'fin', to_char((p_sabado + case when c.sab_fin <= c.sab_inicio then 1 else 0 end) + c.sab_fin, 'YYYY-MM-DD"T"HH24:MI')),
      jsonb_build_object(
        'inicio', to_char((p_sabado + 1) + c.dom_inicio, 'YYYY-MM-DD"T"HH24:MI'),
        'fin', to_char((p_sabado + 1 + case when c.dom_fin <= c.dom_inicio then 1 else 0 end) + c.dom_fin, 'YYYY-MM-DD"T"HH24:MI'))),
    'clima', jsonb_build_object('sabado', v_sab, 'domingo', v_dom),
    'frases_grupo', v_frases,
    'personas_consideradas', v_n)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('proponer_plan_borrador', sqlstate, v_ctx);
end
$$;

revoke all on function public.save_my_preferences(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.get_my_preferences(uuid) from public, anon, authenticated;
revoke all on function public.proponer_plan_borrador(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.save_my_preferences(uuid, jsonb) to authenticated;
grant execute on function public.get_my_preferences(uuid) to authenticated;
grant execute on function public.proponer_plan_borrador(uuid, date, jsonb) to authenticated;

-- 5. A5: la lista permitida pasa a 29 entradas; agente_insumos no existe en ningún esquema.
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
    'save_my_preferences', 'get_my_preferences', 'proponer_plan_borrador'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 29 then
    raise exception 'A5: public no tiene exactamente 29 funciones';
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
  if pg_catalog.has_schema_privilege('anon', 'cruce', 'USAGE')
     or pg_catalog.has_schema_privilege('authenticated', 'cruce', 'USAGE') then
    raise exception 'A5: el esquema cruce es usable desde el navegador';
  end if;
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
