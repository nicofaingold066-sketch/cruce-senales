-- Reversa de la 0056 (fecha_local, organizador y plan para el rediseño). NO es una migración: se corre a mano solo si
-- rompe producción. Devuelve los cuerpos vigentes antes de la 0056 (leídos de la base a las 02:5x) y borra los ayudantes.
begin;
create or replace function cruce.resumen_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta(p_prop, p_yo);
begin
  return jsonb_build_object(
    'id', v -> 'id', 'titulo', v -> 'titulo', 'estado', v -> 'estado',
    'estado_etiqueta', v -> 'estado_etiqueta',
    'version', v #> '{opcion,version}',
    'confirmados', v -> 'confirmados', 'minimo', v -> 'minimo', 'maximo', v -> 'maximo',
    'plazo', v -> 'plazo', 'plazo_vencido', v -> 'plazo_vencido',
    'siguiente_accion', v -> 'siguiente_accion', 'state_rev', v -> 'state_rev',
    'actividad', v -> 'actividad',
    'mi_situacion', jsonb_build_object(
      'interesado', v #> '{mi_situacion,interesado}',
      'retirado', v #> '{mi_situacion,retirado}',
      'acepte_version', v #> '{mi_situacion,acepte_version}',
      'puede_aceptar', v #> '{mi_situacion,puede,aceptar}',
      'invitacion_agente', v #> '{mi_situacion,invitacion_agente}'));
end
$$;

create or replace function public.list_my_spaces() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  return cruce.ok(jsonb_build_object('espacios', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
             'codigo_invitacion', e.codigo_invitacion, 'generacion', e.generacion,
             'mi_miembro_id', m.id, 'mi_rol', m.rol,
             'cantidad_miembros', (select count(*) from cruce.miembros x where x.espacio_id = e.id))
           order by e.creado_en desc, e.id), '[]'::jsonb)
    from cruce.miembros m join cruce.espacios e on e.id = m.espacio_id
    where m.user_id = v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('list_my_spaces', sqlstate, v_ctx);
end
$$;

create or replace function public.preview_space_by_code(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  e cruce.espacios%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_codigo is null or cruce.normalizar_nombre(p_codigo) = '' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.espacios x where x.codigo_invitacion = upper(replace(cruce.normalizar_nombre(p_codigo), ' ', ''));
  if not found then
    return cruce.err('fuera_de_audiencia', 'codigo_inexistente', null);
  end if;
  return cruce.ok(jsonb_build_object(
    'espacio', jsonb_build_object('nombre', e.nombre, 'demo', e.demo,
                                  'proposito', e.proposito, 'familia', cruce.familia_de_proposito(e.proposito)),
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre,
               'libre', (m.pendiente or (e.demo and m.simulado and not cruce.asiento_usado(m.id)))) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('preview_space_by_code', sqlstate, v_ctx);
end
$$;

drop function cruce.plan_destacado(uuid);
drop function cruce.fecha_local_propuesta(uuid);
revoke all on function public.list_my_spaces() from public, anon, authenticated;
grant execute on function public.list_my_spaces() to authenticated;
revoke all on function public.preview_space_by_code(text) from public, anon, authenticated;
grant execute on function public.preview_space_by_code(text) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
commit;
