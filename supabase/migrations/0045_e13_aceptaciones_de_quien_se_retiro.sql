-- CRUCE · 0045 · Enmienda 13 (c), corrección: "sin decir si había confirmado" también en el historial.
-- Con 0043, la baja de otra persona salía como "Una persona", pero el evento de aceptación de esa misma persona
-- seguía con su nombre ("Caro aceptó la versión 1"); junto con "Una persona se bajó (versión 1)" y su ausencia en
-- `aceptaron`, delataba quién se fue y que había confirmado (lo encontró tests/backend/aceptacion-reparacion).
-- Ahora, para quien mira, los eventos de aceptación de personas que se retiraron de la propuesta también salen como
-- "Una persona" (la propia persona los sigue viendo con su nombre). Las aceptaciones vigentes (`opcion.aceptaron`) no
-- cambian: quien se retiró ya no está ahí. Límite que queda (declarado): quien miró la propuesta antes de la baja y
-- recuerda quién había confirmado puede deducirlo; el servidor no lo dice. Cuerpo copiado de 0043.

create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
  v_n integer;
  v_retirados jsonb;
  -- E13 (c): cómo sale otra persona en una baja.
  v_anon constant jsonb := jsonb_build_object('miembro_id', null, 'nombre', 'Una persona', 'simulado', false);
begin
  if v is null then
    return null;
  end if;
  -- E13 (a): total de "así no puedo" que valen; con menos de 2, null. Se calcula antes de la siguiente acción y
  -- después se oculta a quien no organiza la propuesta.
  v_n := cruce.opiniones_efectivas(p_prop);
  v := v || jsonb_build_object('opiniones_totales', jsonb_build_object('asi_no_puedo', case when v_n >= 2 then v_n end));
  v := jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
  -- E7.2: los conteos que dejan deducir condiciones ajenas, solo para el organizador de la propuesta.
  if p_yo is distinct from (select x.organizador_id from cruce.propuestas x where x.id = p_prop) then
    v := jsonb_set(v, '{personas_con_condiciones}', 'null'::jsonb);
    if jsonb_typeof(v -> 'opcion') = 'object' then
      v := jsonb_set(v, '{opcion,cupos,pendientes}', 'null'::jsonb);
    end if;
    v := jsonb_set(v, '{opiniones_totales}', 'null'::jsonb);
  end if;
  -- E13 (c): las bajas de otras personas, sin nombre y sin decir si habían confirmado. La propia, como hoy.
  v := jsonb_set(v, '{bajas}', (
    select coalesce(jsonb_agg(case when b #>> '{miembro,miembro_id}' = p_yo::text then b
                                   else jsonb_build_object('miembro', v_anon, 'en', b -> 'en', 'version', b -> 'version',
                                                           'habia_aceptado', null) end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'bajas') with ordinality as t (b, o)));
  -- E13 (c): en el historial, las bajas de otras personas y las aceptaciones de quienes se retiraron, sin nombre.
  select coalesce(jsonb_agg(pa.miembro_id::text), '[]'::jsonb) into v_retirados
  from cruce.participaciones pa where pa.propuesta_id = p_prop and pa.retirado;
  v := jsonb_set(v, '{historial}', (
    select coalesce(jsonb_agg(case when (e ->> 'tipo' = 'baja'
                                         or (e ->> 'tipo' = 'aceptacion' and v_retirados ? (e #>> '{actor,miembro_id}')))
                                        and (e #>> '{actor,miembro_id}') is distinct from p_yo::text
                                   then e || jsonb_build_object('actor', v_anon) else e end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'historial') with ordinality as t (e, o)));
  -- E11: la invitación del agente es de cada persona; nadie ve a quién más invitaron.
  v := jsonb_set(v, '{mi_situacion,invitacion_agente}', coalesce(
    (select jsonb_build_object('texto', i.texto) from cruce.invitaciones_agente i
     where i.propuesta_id = p_prop and i.miembro_id = p_yo), 'null'::jsonb));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
