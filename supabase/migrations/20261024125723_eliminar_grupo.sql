-- Eliminar un grupo: pedido explícito de Nico, 24 oct 2026.
-- Solo quien organiza el espacio puede borrarlo, incluidos sus planes y datos privados.
-- El recibo propio no conserva nombres ni referencias al espacio: debe sobrevivir a las cascadas.

create or replace function public.delete_space(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_existe boolean;
  v_params jsonb := jsonb_build_object('p_espacio_id', p_espacio_id);
  i cruce.intentos%rowtype;
  yo cruce.miembros%rowtype;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;

  -- A4: espacio -> intento -> miembros -> propuestas. Si otra solicitud ya borró el
  -- espacio mientras esperábamos, todavía hay que consultar nuestro recibo de éxito.
  v_existe := cruce.bloquear_espacio(p_espacio_id);
  perform pg_advisory_xact_lock(hashtextextended('cruce:intento:' || v_uid::text || ':' || p_intento_id::text, 0));
  select * into i from cruce.intentos x where x.user_id = v_uid and x.intento_id = p_intento_id;
  if found then
    if i.operacion <> 'delete_space' or i.parametros <> v_params then
      return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
    end if;
    return cruce.ok(jsonb_build_object(
      'resultado', (i.respuesta -> 'resultado') || jsonb_build_object('repetido', true)));
  end if;
  if not v_existe then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;

  -- usuario_original_id pertenece también a exmiembros: nunca autoriza esta operación.
  select * into yo from cruce.miembros m
  where m.espacio_id = p_espacio_id and m.user_id = v_uid and m.salio_en is null;
  if not found then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform 1 from cruce.miembros m where m.espacio_id = p_espacio_id order by m.id for update;
  perform 1 from cruce.propuestas p where p.espacio_id = p_espacio_id order by p.id for update;
  perform cruce.fijar_ahora();

  -- Primero los planes: organizador_id e imprescindible_id referencian miembros sin
  -- cascada. Las demás dependencias del grupo ya tienen ON DELETE CASCADE/SET NULL.
  delete from cruce.propuestas p where p.espacio_id = p_espacio_id;
  delete from cruce.espacios e where e.id = p_espacio_id;

  v_res := jsonb_build_object('resultado', jsonb_build_object(
    'espacio_id', p_espacio_id, 'eliminado', true, 'repetido', false));
  -- Si este INSERT falla, EXCEPTION revierte también ambos DELETE: nunca un borrado parcial.
  -- No usar intento_previo: necesita membresía/propuesta, que dejaron de existir.
  perform cruce.guardar_intento(v_uid, p_intento_id, 'delete_space', v_params,
    null, null, null, null, v_res);
  return cruce.ok(v_res);
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('delete_space', sqlstate, v_ctx);
end
$$;

-- Lista pública cerrada: se suma solo delete_space; se conserva todo el hardening de A5.
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
    'simulate_save_preferences', 'preview_space_by_code',
    -- E11
    'agente_social_contexto', 'agente_social_candidatos', 'set_recibir_invitaciones_agente',
    'set_politica_agente_social', 'iniciar_ejecucion_agente', 'guardar_borrador_agente',
    'aprobar_borrador_agente', 'publicar_borrador_agente', 'cerrar_ejecucion_agente',
    -- E13
    'opinar_version', 'leave_space', 'delete_space'];
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

revoke all on function public.delete_space(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_space(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
notify pgrst, 'reload schema';
