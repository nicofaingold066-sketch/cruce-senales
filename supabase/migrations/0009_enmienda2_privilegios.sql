-- CRUCE · 0009 · Enmienda 2, A5: frontera de privilegios de las RPC.
-- Reemplaza la decisión de 0006 (EXECUTE para anon): sin sesión, PostgREST rechaza la llamada por
-- permisos y el cliente la trata como sesión inválida. Las sesiones anónimas de Supabase usan el rol
-- `authenticated`, así que la demo sigue funcionando.

-- 1. Defaults: ninguna función nueva del rol creador (postgres) queda ejecutable por defecto.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema cruce revoke execute on functions from public, anon, authenticated;

-- 2. Helpers privados: sin EXECUTE ni USAGE para los roles del navegador.
revoke all on all functions in schema cruce from public, anon, authenticated;
revoke usage on schema cruce from public, anon, authenticated;

-- 3. Verificación reutilizable (privada). Falla la migración si el catálogo no cumple A5.
create or replace function cruce.verificar_privilegios() returns void
language plpgsql stable set search_path = '' as $$
declare
  permitidas constant text[] := array[
    'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
    'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
    'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
    'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
    'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
    'get_simulation_panel'];
  v text;
begin
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

  if pg_catalog.has_schema_privilege('anon', 'cruce', 'USAGE')
     or pg_catalog.has_schema_privilege('authenticated', 'cruce', 'USAGE') then
    raise exception 'A5: el esquema cruce es usable desde el navegador';
  end if;
end
$$;
revoke all on function cruce.verificar_privilegios() from public, anon, authenticated;

-- 4. Entradas públicas: revocar todo a PUBLIC/anon/authenticated y conceder solo la lista permitida a authenticated.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as firma, p.proname
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.firma);
    if r.proname = any (array[
      'server_info', 'create_space', 'join_space', 'list_my_spaces', 'get_space', 'seed_demo_space',
      'add_simulated_member', 'reset_demo', 'create_proposal', 'open_proposal', 'list_proposals',
      'get_proposal_state', 'mark_interest', 'save_my_conditions', 'get_my_conditions',
      'evaluate_and_publish', 'accept_version', 'withdraw_commitment', 'propose_repair', 'cancel_proposal',
      'simulate_mark_interest', 'simulate_save_conditions', 'simulate_accept', 'simulate_withdraw',
      'get_simulation_panel']) then
      execute format('grant execute on function %s to authenticated', r.firma);
    end if;
  end loop;
end
$$;

select cruce.verificar_privilegios();
