-- CRUCE · 0006 · Permisos de la API
-- Se revoca EXECUTE a PUBLIC en todo. Las 25 funciones del contrato se conceden a `anon` y
-- `authenticated` porque el contrato 0.1 lo exige: sin sesión deben responder `sesion_invalida`
-- (C0) en vez de un error de permiso. Cada función valida auth.uid() como primer paso.
-- Las funciones internas del esquema `cruce` no se conceden a nadie.

revoke all on all functions in schema cruce from public, anon, authenticated;
revoke usage on schema cruce from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.server_info()',
    'public.create_space(text, text, text)',
    'public.join_space(text, text)',
    'public.list_my_spaces()',
    'public.get_space(uuid)',
    'public.seed_demo_space()',
    'public.add_simulated_member(uuid, text)',
    'public.reset_demo(uuid)',
    'public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid)',
    'public.open_proposal(uuid)',
    'public.list_proposals(uuid)',
    'public.get_proposal_state(uuid)',
    'public.mark_interest(uuid, boolean)',
    'public.save_my_conditions(uuid, jsonb)',
    'public.get_my_conditions(uuid)',
    'public.evaluate_and_publish(uuid, uuid)',
    'public.accept_version(uuid, integer, uuid)',
    'public.withdraw_commitment(uuid)',
    'public.propose_repair(uuid, uuid)',
    'public.cancel_proposal(uuid)',
    'public.simulate_mark_interest(uuid, uuid, boolean)',
    'public.simulate_save_conditions(uuid, uuid, jsonb)',
    'public.simulate_accept(uuid, uuid, integer, uuid)',
    'public.simulate_withdraw(uuid, uuid)',
    'public.get_simulation_panel(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end
$$;
