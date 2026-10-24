-- CRUCE · 0056 · Rediseño (pedido del coordinador, 02:5x): campos de solo lectura, aditivos. Sin RPC nuevas ni firmas (41/0).
--   * list_proposals: cada resumen suma `fecha_local` = inicio de la opción vigente, "YYYY-MM-DDTHH:MI" en
--     America/Santiago (el formato de cruce.plan_franjas), o null sin versión publicada.
--   * list_my_spaces: cada espacio suma `fecha_local` del plan destacado del espacio (abajo), o null.
--   * preview_space_by_code: suma `organizador` (nombre visible de quien organiza el espacio) y
--     `plan: {titulo, fecha_local} | null` = el plan destacado. Nada de condiciones, totales ni nombres de otros.
--   * Plan destacado de un espacio: la propuesta activa más reciente (reuniendo interés, esperando compromisos,
--     grupo confirmado o en revisión) que no esté vencida por el reloj del servidor. Los borradores, canceladas y
--     expiradas no cuentan.

create or replace function cruce.fecha_local_propuesta(p_prop uuid) returns text
language sql stable set search_path = '' as $$
  select to_char(f.inicio at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI')
  from cruce.propuestas p
  join cruce.versiones v on v.propuesta_id = p.id and v.version = p.version_vigente
  join cruce.franjas f on f.propuesta_id = v.propuesta_id and f.clave = v.franja_clave
  where p.id = p_prop
$$;

create or replace function cruce.plan_destacado(p_esp uuid) returns uuid
language sql stable set search_path = '' as $$
  select p.id
  from cruce.propuestas p
  where p.espacio_id = p_esp
    and p.estado in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision')
    and (p.estado = 'grupo_confirmado' or cruce.ahora() < p.plazo)
  order by p.creada_en desc, p.id
  limit 1
$$;

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
    -- 0056
    'fecha_local', cruce.fecha_local_propuesta(p_prop),
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
             'cantidad_miembros', (select count(*) from cruce.miembros x where x.espacio_id = e.id),
             -- 0056
             'fecha_local', cruce.fecha_local_propuesta(cruce.plan_destacado(e.id)))
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
  v_plan uuid;
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
  v_plan := cruce.plan_destacado(e.id);
  return cruce.ok(jsonb_build_object(
    'espacio', jsonb_build_object('nombre', e.nombre, 'demo', e.demo,
                                  'proposito', e.proposito, 'familia', cruce.familia_de_proposito(e.proposito)),
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre,
               'libre', (m.pendiente or (e.demo and m.simulado and not cruce.asiento_usado(m.id)))) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id),
    -- 0056
    'organizador', (select m.nombre from cruce.miembros m where m.espacio_id = e.id and m.rol = 'organizador'),
    'plan', case when v_plan is null then null
                 else jsonb_build_object('titulo', (select p.titulo from cruce.propuestas p where p.id = v_plan),
                                         'fecha_local', cruce.fecha_local_propuesta(v_plan)) end));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('preview_space_by_code', sqlstate, v_ctx);
end
$$;

revoke all on function public.list_my_spaces() from public, anon, authenticated;
grant execute on function public.list_my_spaces() to authenticated;
revoke all on function public.preview_space_by_code(text) from public, anon, authenticated;
grant execute on function public.preview_space_by_code(text) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
