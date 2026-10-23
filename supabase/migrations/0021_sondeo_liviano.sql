-- CRUCE · 0021 · Mejora #15 (MEJORAS.md): sondeo liviano de get_proposal_state.
-- get_proposal_state(p_propuesta_id, p_desde_rev integer default null). Toda respuesta completa trae
-- `rev_vista`: un entero que resume TODO lo que ve quien consulta (la vista de la propuesta). Si el
-- cliente manda p_desde_rev igual al rev_vista actual, la respuesta es corta:
--   { ok, contrato, servidor_ahora, sin_cambios: true, state_rev, rev_vista }
-- Si no (o sin p_desde_rev), es la respuesta de siempre más sin_cambios: false y rev_vista.
-- Por qué no alcanza con state_rev: hay cambios visibles que no lo suben (guardar condiciones cambia
-- `personas_con_condiciones` y la siguiente acción del organizador; el paso del tiempo cambia
-- `plazo_vencido` y los `puede`). Comparar contra la vista completa nunca deja una pantalla vieja.
-- Mandar por error el state_rev en p_desde_rev no rompe nada: no coincide y llega la respuesta completa.
-- Se reemplaza la firma de un parámetro (una sola firma por nombre, A5); llamar sin p_desde_rev sigue igual.

drop function if exists public.get_proposal_state(uuid);

create or replace function public.get_proposal_state(p_propuesta_id uuid, p_desde_rev integer default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_vista jsonb;
  v_rev integer;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_yo := cruce.leer_propuesta(p_propuesta_id, v_uid);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_vista := cruce.vista_propuesta(p_propuesta_id, v_yo);
  v_rev := hashtext(v_vista::text);
  if p_desde_rev is not null and p_desde_rev = v_rev then
    return cruce.ok(jsonb_build_object('sin_cambios', true, 'state_rev', v_vista -> 'state_rev', 'rev_vista', v_rev));
  end if;
  return cruce.ok(jsonb_build_object('sin_cambios', false, 'rev_vista', v_rev, 'propuesta', v_vista));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_proposal_state', sqlstate, v_ctx);
end
$$;

revoke all on function public.get_proposal_state(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_proposal_state(uuid, integer) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
