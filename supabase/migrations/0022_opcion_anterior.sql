-- CRUCE · 0022 · Mejora #22 (enmienda 6): opcion_anterior en EstadoPropuesta.
-- EstadoPropuesta gana `opcion_anterior`: null si no hay opción vigente o si la vigente es la versión 1;
-- si no, la opción de la versión publicada inmediatamente anterior:
--   { version, franja_clave, inicio: Momento, fin: Momento }
-- mismo formato y zona horaria que `opcion.franja` (cruce.momento: utc + local America/Santiago).
-- Es información del plan, con la misma audiencia que `opcion`: sin nombres, sin condiciones, sin
-- preferencias. Sirve para mostrar "Sábado → Domingo" tras una reparación.
-- Va en cruce.vista_propuesta, así que aparece en get_proposal_state (respuesta completa) y en toda
-- operación que devuelve `propuesta`, y entra en rev_vista (hash de la vista, 0021) sin tocar
-- get_proposal_state. Sin funciones públicas nuevas: la lista permitida sigue en 30 (A5).
-- Solo lectura: no toma bloqueos (A4 no aplica).

create or replace function cruce.opcion_anterior(p_prop uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('version', ver.version, 'franja_clave', ver.franja_clave,
                            'inicio', cruce.momento(f.inicio), 'fin', cruce.momento(f.fin))
  from cruce.propuestas p
  join cruce.versiones ver on ver.propuesta_id = p.id and ver.version < p.version_vigente
  join cruce.franjas f on f.propuesta_id = ver.propuesta_id and f.clave = ver.franja_clave
  where p.id = p_prop
  order by ver.version desc
  limit 1
$$;

-- Misma envoltura de 0012 (siguiente_accion personal) más la clave nueva, siempre presente.
create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
begin
  if v is null then
    return null;
  end if;
  v := jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
