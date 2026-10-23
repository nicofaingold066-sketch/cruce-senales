-- CRUCE · 0032 · Enmienda 9, fase 1 (docs/contrato-enmienda-9.md, mejora #70): entrada por lista de integrantes.
--   * cruce.miembros.pendiente boolean not null default false: integrante cargado por el organizador que todavía
--     nadie reclamó (fase 2 los crea; en fase 1 solo existe el estado, para que `libre` y el reclamo ya lo
--     contemplen). Las filas existentes quedan en false.
--   * preview_space_by_code(p_codigo): pública para authenticated sin ser miembro. Devuelve SOLO
--     { espacio: { nombre, demo }, miembros: [{ miembro_id, nombre, libre }] }. libre = pendiente sin reclamar, o
--     simulado del demo sin actividad. Errores: entrada_incompleta/formato_invalido (código vacío),
--     fuera_de_audiencia/codigo_inexistente. STABLE, sin bloqueos. La lista permitida pasa de 30 a 31.
--   * join_space gana p_miembro_id uuid default null (una sola firma: se elimina la de dos parámetros).
--     Con p_miembro_id: reclama ESE integrante (pendiente, o simulado del demo sin actividad) y la sesión queda
--     ligada a él con el mismo miembro_id; p_nombre_visible se ignora. Errores nuevos:
--     entrada_incompleta/miembro_inexistente y no_autorizado/miembro_ya_reclamado (el lugar es de otra persona
--     real, o es un simulado fuera del demo). Un simulado del demo con actividad sigue dando asiento_en_uso.
--     Sin p_miembro_id: idéntico a 0017. Bloqueos: espacio, después miembros (A4): dos reclamos concurrentes del
--     mismo lugar, uno gana y el otro recibe miembro_ya_reclamado (o ya_era_miembro si es la misma sesión).
--     `resultado` suma la clave `reclamo_pendiente` (booleano), siempre presente.
--   * cruce.mensaje: dos textos nuevos. cruce.verificar_privilegios: lista de 31.
-- Cuerpos copiados: join_space de 0017, mensaje de 0028, verificar_privilegios de 0019.

alter table cruce.miembros add column pendiente boolean not null default false;

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
  -- E9: SOLO nombre del espacio, si es demo, y la lista de integrantes con `libre`. Sin bloqueos.
  -- libre: simulado del demo sin actividad (reclamable) o integrante pendiente que nadie reclamó.
  return cruce.ok(jsonb_build_object(
    'espacio', jsonb_build_object('nombre', e.nombre, 'demo', e.demo),
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

drop function if exists public.join_space(text, text);

create or replace function public.join_space(p_codigo text, p_nombre_visible text, p_miembro_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
  v_det text;
  v_esp uuid;
  e cruce.espacios%rowtype;
  m cruce.miembros%rowtype;
  v_m uuid;
  v_reclamo boolean := false;
  v_pendiente boolean := false;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_codigo is null or cruce.normalizar_nombre(p_codigo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  -- E9: con p_miembro_id el nombre visible se ignora (se usa el del integrante elegido).
  if p_miembro_id is null then
    v_det := cruce.validar_nombre_visible(p_nombre_visible);
    if v_det is not null then
      return cruce.err('entrada_incompleta', v_det, null);
    end if;
  end if;

  select x.id into v_esp from cruce.espacios x where x.codigo_invitacion = upper(replace(cruce.normalizar_nombre(p_codigo), ' ', ''));
  if not cruce.bloquear_espacio(v_esp) then
    return cruce.err('fuera_de_audiencia', 'codigo_inexistente', null);
  end if;
  select * into e from cruce.espacios x where x.id = v_esp;
  -- A4: espacio, después miembros (los que pueden chocar: el propio, el del nombre y el elegido).
  perform 1 from cruce.miembros x
  where x.espacio_id = e.id and (x.user_id = v_uid or x.id = p_miembro_id or (p_miembro_id is null and lower(x.nombre) = lower(v_vis)))
  order by x.id
  for update;
  perform cruce.fijar_ahora();

  select x.id into v_m from cruce.miembros x where x.espacio_id = e.id and x.user_id = v_uid;
  if v_m is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', e.id, 'miembro_id', v_m, 'reclamo_asiento_simulado', false,
                                      'reclamo_pendiente', false, 'ya_era_miembro', true, 'repetido', true),
      'espacio', cruce.espacio_json(e.id, v_uid)));
  end if;

  if p_miembro_id is not null then
    -- E9: reclamo por integrante elegido de la lista.
    select * into m from cruce.miembros x where x.id = p_miembro_id and x.espacio_id = e.id;
    if not found then
      return cruce.err('entrada_incompleta', 'miembro_inexistente', null);
    end if;
    if m.pendiente then
      update cruce.miembros x set pendiente = false, user_id = v_uid where x.id = m.id;
      v_m := m.id;
      v_pendiente := true;
    elsif e.demo and m.simulado then
      if cruce.asiento_usado(m.id) then
        return cruce.err('asiento_en_uso', 'asiento_en_uso', null);
      end if;
      update cruce.miembros x set simulado = false, user_id = v_uid where x.id = m.id;
      v_m := m.id;
      v_reclamo := true;
    else
      return cruce.err('no_autorizado', 'miembro_ya_reclamado', null);
    end if;
  else
    select * into m from cruce.miembros x where x.espacio_id = e.id and lower(x.nombre) = lower(v_vis);
    if found then
      if e.demo and m.simulado then
        if cruce.asiento_usado(m.id) then
          return cruce.err('asiento_en_uso', 'asiento_en_uso', null);
        end if;
        update cruce.miembros x set simulado = false, user_id = v_uid where x.id = m.id;
        v_m := m.id;
        v_reclamo := true;
      else
        return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
      end if;
    else
      insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
      values (e.id, v_uid, v_vis, 'miembro', false, cruce.ahora()) returning id into v_m;
    end if;
  end if;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', e.id, 'miembro_id', v_m, 'reclamo_asiento_simulado', v_reclamo,
                                    'reclamo_pendiente', v_pendiente, 'ya_era_miembro', false, 'repetido', false),
    'espacio', cruce.espacio_json(e.id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('join_space', sqlstate, v_ctx);
end
$$;

create or replace function cruce.mensaje(p_codigo text, p_detalle text) returns text
language sql immutable set search_path = '' as $$
  select case p_codigo || '/' || p_detalle
    when 'sesion_invalida/sin_sesion' then 'No hay una sesión válida. Recarga la página para continuar.'
    when 'entrada_incompleta/campo_faltante' then 'Falta completar un dato obligatorio.'
    when 'entrada_incompleta/formato_invalido' then 'Un dato tiene un formato inválido.'
    when 'entrada_incompleta/franjas_invalidas' then 'Las franjas deben ser exactamente dos, futuras y con fin posterior al inicio.'
    when 'entrada_incompleta/cupos_invalidos' then 'El mínimo debe ser al menos 2 y no superar al máximo; el máximo no puede superar 20.'
    when 'entrada_incompleta/plazo_invalido' then 'El cierre de aceptación debe ser futuro y no posterior al inicio de ninguna franja.'
    when 'entrada_incompleta/zona_horaria_no_soportada' then 'Por ahora solo se admite la zona horaria America/Santiago.'
    when 'entrada_incompleta/imprescindible_invalido' then 'La persona imprescindible debe ser miembro del espacio.'
    when 'entrada_incompleta/disponibilidad_invalida' then 'La disponibilidad solo admite las franjas de la propuesta con los valores si, no o pendiente.'
    when 'entrada_incompleta/nombre_en_uso' then 'Ese nombre ya está en uso en este espacio.'
    when 'entrada_incompleta/intento_reutilizado' then 'Este identificador de intento ya se usó para otra operación.'
    when 'fuera_de_audiencia/no_miembro' then 'No perteneces a este espacio o el elemento no existe.'
    when 'fuera_de_audiencia/codigo_inexistente' then 'El código de invitación no existe.'
    when 'fuera_de_audiencia/no_elegible_en_version' then 'No formas parte de las personas que pueden aceptar esta versión.'
    when 'opcion_desactualizada/version_no_vigente' then 'Esta versión ya no está vigente. Actualiza para ver la versión actual.'
    when 'opcion_desactualizada/estado_no_admite' then 'La propuesta cambió de estado y esta acción ya no aplica. Actualiza la pantalla.'
    when 'cupo_completo/sin_cupo' then 'Ya se completaron los cupos de esta versión.'
    when 'cupo_completo/reservado_imprescindible' then 'El cupo que queda está reservado para la persona imprescindible.'
    when 'plazo_vencido/plazo_vencido' then 'El plazo de aceptación ya cerró.'
    when 'sin_alternativa/sin_alternativa' then 'Sin opción compatible: no hay alternativa con las condiciones actuales.'
    when 'no_autorizado/no_es_organizador' then 'Solo el organizador de la propuesta puede hacer esto.'
    when 'no_autorizado/no_es_organizador_espacio' then 'Solo el organizador del espacio puede hacer esto.'
    when 'no_autorizado/retirado' then 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
    when 'no_autorizado/condiciones_congeladas' then 'Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente.'
    when 'no_autorizado/espacio_no_demo' then 'Esta acción solo está permitida en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'no_autorizado/miembro_ya_reclamado' then 'Ese lugar ya lo tomó otra persona.'
    when 'entrada_incompleta/miembro_inexistente' then 'Ese integrante no existe en este espacio.'
    when 'asiento_en_uso/asiento_en_uso' then 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'
    when 'intento_obsoleto/intento_obsoleto' then 'Esta solicitud pertenece a una demo ya reiniciada y no se puede repetir. Actualiza la pantalla.'
    when 'entrada_incompleta/preferencias_invalidas' then 'Las preferencias solo admiten las opciones de la lista.'
    when 'entrada_incompleta/fecha_invalida' then 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.'
    when 'entrada_incompleta/pocas_preferencias' then 'Todavía no hay suficientes personas con preferencias cargadas.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
  end
$$;

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
    'simulate_save_preferences', 'preview_space_by_code'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 31 then
    raise exception 'A5: public no tiene exactamente 31 funciones';
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

revoke all on function public.preview_space_by_code(text) from public, anon, authenticated;
grant execute on function public.preview_space_by_code(text) to authenticated;
revoke all on function public.join_space(text, text, uuid) from public, anon, authenticated;
grant execute on function public.join_space(text, text, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
