-- CRUCE · 0042 · Enmienda 13 (a) (docs/contrato-enmienda-13.md, aprobada por Nico 20:51): opinar sobre la versión
-- sin bajarse.
--   * Tabla cruce.opiniones (propuesta, versión, miembro, opinión 'asi_no_puedo'). Privada: RLS deny-all.
--   * RPC nueva public.opinar_version(p_propuesta_id, p_version, p_opinion 'asi_no_puedo'|'retirar_opinion',
--     p_intento_id): solo un elegible de ESA versión vigente, en esperando_compromisos, no retirado y sin haberla
--     aceptado (si ya aceptó: no_autorizado/ya_acepto). Idempotente por intento. No cuenta como baja, no toca
--     participaciones, aceptaciones ni state_rev (como las condiciones: no delata nada a los demás).
--   * Una opinión "vale" mientras la persona no se retire ni acepte esa versión (cruce.opiniones_efectivas).
--   * cruce.situacion suma `mi_opinion` (null o 'asi_no_puedo'), `puede.opinar` (aditivo: el servidor decide cuándo
--     se puede) y: quien opinó vuelve a poder guardar condiciones (puede.guardar_condiciones = true) y
--     op_save_conditions se lo permite. `puede.proponer_reparacion` también es true para el organizador en
--     esperando_compromisos con 2 o más opiniones y menos de 3 versiones (los totales con 1 no se muestran).
--   * Lista permitida 40 → 41 para authenticated, 0 para anon.

create table cruce.opiniones (
  propuesta_id uuid not null references cruce.propuestas (id) on delete cascade,
  version integer not null,
  miembro_id uuid not null references cruce.miembros (id) on delete cascade,
  opinion text not null check (opinion in ('asi_no_puedo')),
  en timestamptz not null,
  primary key (propuesta_id, version, miembro_id)
);
alter table cruce.opiniones enable row level security;
revoke all on table cruce.opiniones from public, anon, authenticated;

-- Opiniones que cuentan: de la versión vigente, de personas no retiradas y que no aceptaron esa versión.
create or replace function cruce.opiniones_efectivas(p_prop uuid) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer
  from cruce.opiniones o join cruce.propuestas p on p.id = o.propuesta_id and o.version = p.version_vigente
  where o.propuesta_id = p_prop
    and not cruce.es_retirado(p_prop, o.miembro_id)
    and not exists (select 1 from cruce.aceptaciones a
                    where a.propuesta_id = p_prop and a.version = o.version and a.miembro_id = o.miembro_id and a.vigente)
$$;

create or replace function cruce.situacion(p_prop uuid, p_m uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
  m cruce.miembros%rowtype;
  v_int boolean := false;
  v_ret boolean := false;
  v_disp jsonb;
  v_eleg boolean;
  v_acepte boolean := false;
  v_conf integer := 0;
  v_imp_acepto boolean := false;
  v_imp_ret boolean;
  v_reservado boolean;
  v_disponibles integer;
  v_libres integer;
  v_base_aceptar boolean;
  v_aceptar boolean;
  v_hay_sim boolean;
  v_demo boolean;
  v_vencido boolean;
  v_activo boolean;
  v_con_op boolean;
  v_es_org boolean;
  v_es_org_esp boolean;
  v_opino boolean := false;
begin
  select * into p from cruce.propuestas where id = p_prop;
  select * into m from cruce.miembros where id = p_m;
  select pa.interesado, pa.retirado into v_int, v_ret
  from cruce.participaciones pa where pa.propuesta_id = p_prop and pa.miembro_id = p_m;
  v_int := coalesce(v_int, false);
  v_ret := coalesce(v_ret, false);
  select c.disponibilidad into v_disp from cruce.condiciones c
  where c.propuesta_id = p_prop and c.miembro_id = p_m;
  if p.version_vigente is not null then
    v_eleg := exists (select 1 from cruce.elegibles e
                      where e.propuesta_id = p_prop and e.version = p.version_vigente and e.miembro_id = p_m);
    v_acepte := exists (select 1 from cruce.aceptaciones a
                        where a.propuesta_id = p_prop and a.version = p.version_vigente
                          and a.miembro_id = p_m and a.vigente);
    v_imp_acepto := exists (select 1 from cruce.aceptaciones a
                            where a.propuesta_id = p_prop and a.version = p.version_vigente
                              and a.miembro_id = p.imprescindible_id and a.vigente);
    select count(*) into v_conf from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = p.version_vigente and a.vigente;
    -- E13 (a): dijo "así no puedo" en esta versión y no la aceptó.
    v_opino := not v_acepte and exists (select 1 from cruce.opiniones o
                                        where o.propuesta_id = p_prop and o.version = p.version_vigente and o.miembro_id = p_m);
  end if;
  v_opino := v_opino and not v_ret;
  v_imp_ret := cruce.es_retirado(p_prop, p.imprescindible_id);
  v_reservado := p.version_vigente is not null and not v_imp_acepto and not v_imp_ret;
  v_disponibles := p.maximo - v_conf;
  v_libres := greatest(0, v_disponibles - case when v_reservado then 1 else 0 end);
  v_es_org := p.organizador_id = p_m;
  v_es_org_esp := m.rol = 'organizador';
  v_hay_sim := exists (select 1 from cruce.miembros x where x.espacio_id = p.espacio_id and x.simulado);
  -- E7.5: la simulación solo existe en espacios demo (E7.3); fuera del demo, puede.simular es false aunque
  -- queden simulados de antes.
  v_demo := exists (select 1 from cruce.espacios e where e.id = p.espacio_id and e.demo);
  v_vencido := cruce.ahora() >= p.plazo;
  v_activo := p.estado in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision');
  v_con_op := p.estado in ('esperando_compromisos', 'grupo_confirmado');
  v_base_aceptar := v_con_op and coalesce(v_eleg, false) and not v_ret and not v_acepte and not v_vencido;
  v_aceptar := v_base_aceptar and case when p_m = p.imprescindible_id then v_disponibles > 0 else v_libres > 0 end;
  return jsonb_build_object(
    'miembro_id', m.id,
    'nombre', m.nombre,
    'es_organizador', v_es_org,
    'es_organizador_espacio', v_es_org_esp,
    'interesado', v_int,
    'condiciones', cruce.condiciones_estado(v_disp),
    'retirado', v_ret,
    'elegible_en_version', v_eleg,
    'acepte_version', v_acepte,
    -- E13 (a): solo la propia opinión.
    'mi_opinion', case when v_opino then 'asi_no_puedo' end,
    'puede', jsonb_build_object(
      'abrir', v_es_org and p.estado = 'borrador' and not v_vencido,
      'marcar_interes', v_activo and not v_ret and not v_vencido,
      -- E13 (a): quien dijo "así no puedo" vuelve a poder actualizar su disponibilidad (para una versión nueva).
      'guardar_condiciones', v_activo and not v_ret and not v_vencido
                             and not (v_con_op and coalesce(v_eleg, false) and not v_opino),
      'evaluar', v_es_org and p.estado = 'reuniendo_interes' and not v_vencido,
      'aceptar', v_aceptar,
      'retirarme', not v_ret and (
                     (p.estado in ('reuniendo_interes', 'esperando_compromisos', 'en_revision') and not v_vencido)
                     or p.estado = 'grupo_confirmado'),
      -- E13 (b): también desde esperando_compromisos, con 2 o más "así no puedo" (lo que el organizador ve) y
      -- menos de 3 versiones.
      'proponer_reparacion', v_es_org and not v_vencido and (
                               p.estado = 'en_revision'
                               or (p.estado = 'esperando_compromisos' and coalesce(p.version_vigente, 0) < 3
                                   and cruce.opiniones_efectivas(p_prop) >= 2)),
      'cancelar', v_es_org and p.estado not in ('expirado', 'cancelado'),
      'simular', v_es_org_esp and v_activo and v_hay_sim and v_demo,
      -- E13 (a): decir "así no puedo, pero sigo" sobre la versión vigente.
      'opinar', p.estado = 'esperando_compromisos' and coalesce(v_eleg, false) and not v_ret and not v_acepte and not v_vencido),
    -- A1: motivo por el que `puede.aceptar` es false cuando solo queda el cupo reservado.
    'motivo_aceptar', case when v_base_aceptar and not v_aceptar and p_m <> p.imprescindible_id
                                and v_disponibles > 0 and v_reservado
                           then 'cupo_reservado' end);
end
$$;

-- op_save_conditions: cuerpo de 0008/0011; solo cambia la excepción del congelamiento (E13 (a)).
create or replace function cruce.op_save_conditions(p_uid uuid, p_prop uuid, p_destino uuid, p_sim boolean, p_disp jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_esp uuid;
  v_yo uuid;
  v_actor uuid;
  v_err jsonb;
  v_det text;
  p cruce.propuestas%rowtype;
  v_norm jsonb;
  v_prev jsonb;
  v_en timestamptz;
  v_rep boolean;
  v_res jsonb;
begin
  if p_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_prop is null or (p_sim and p_destino is null) then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_disponibilidad(p_disp);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_prop);
  perform cruce.bloquear_espacio(v_esp);
  v_yo := cruce.bloquear_actor_y_propuesta(p_prop, v_esp, p_uid, case when p_sim then p_destino end);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if p_sim then
    v_err := cruce.chequeo_simulacion(p_prop, v_yo, p_destino);
    if v_err is not null then
      return v_err;
    end if;
    v_actor := p_destino;
  else
    v_actor := v_yo;
  end if;
  select * into p from cruce.propuestas x where x.id = p_prop;
  if cruce.es_retirado(p_prop, v_actor) then
    return cruce.err('no_autorizado', 'retirado', p.state_rev);
  end if;
  if p.estado in ('esperando_compromisos', 'grupo_confirmado')
     and exists (select 1 from cruce.elegibles e
                 where e.propuesta_id = p_prop and e.version = p.version_vigente and e.miembro_id = v_actor)
     -- E13 (a): quien dijo "así no puedo" (y no aceptó esa versión) puede actualizar su disponibilidad; la versión
     -- vigente no cambia (los elegibles quedan fijos), cuenta para una versión nueva.
     and not exists (select 1 from cruce.opiniones o
                     where o.propuesta_id = p_prop and o.version = p.version_vigente and o.miembro_id = v_actor
                       and not exists (select 1 from cruce.aceptaciones a
                                       where a.propuesta_id = p_prop and a.version = o.version
                                         and a.miembro_id = v_actor and a.vigente)) then
    return cruce.err('no_autorizado', 'condiciones_congeladas', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p_prop, array['reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision']);
  if v_err is not null then
    return v_err;
  end if;

  v_norm := cruce.disp_normalizada(p_disp);
  select c.disponibilidad, c.actualizadas_en into v_prev, v_en from cruce.condiciones c
  where c.propuesta_id = p_prop and c.miembro_id = v_actor;
  v_rep := v_prev is not null and v_prev = v_norm;
  if not v_rep then
    v_en := cruce.ahora();
    insert into cruce.condiciones (propuesta_id, miembro_id, disponibilidad, actualizadas_en)
    values (p_prop, v_actor, v_norm, v_en)
    on conflict (propuesta_id, miembro_id) do update
      set disponibilidad = excluded.disponibilidad, actualizadas_en = excluded.actualizadas_en;
  end if;
  v_res := jsonb_build_object('repetido', v_rep);
  if p_sim then
    v_res := v_res || jsonb_build_object('simulado', true);
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', v_res,
    'condiciones', jsonb_build_object('disponibilidad', v_norm, 'estado', cruce.condiciones_estado(v_norm),
                                      'actualizadas_en', cruce.momento(v_en)),
    'propuesta', cruce.vista_propuesta(p_prop, v_yo)));
end
$$;

-- E13 (a): RPC nueva.
create or replace function public.opinar_version(p_propuesta_id uuid, p_version integer, p_opinion text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_err jsonb;
  v_habia boolean;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null or p_version is null or p_intento_id is null or p_opinion is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_opinion not in ('asi_no_puedo', 'retirar_opinion') then
    return cruce.err('entrada_incompleta', 'opinion_invalida', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  perform cruce.bloquear_espacio(v_esp);
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id, 'p_version', p_version, 'p_opinion', p_opinion);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'opinar_version', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_yo := cruce.bloquear_actor_y_propuesta(p_propuesta_id, v_esp, v_uid, null);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if cruce.es_retirado(p.id, v_yo) then
    return cruce.err('no_autorizado', 'retirado', p.state_rev);
  end if;
  v_err := cruce.chequeo_estado(p.id, array['esperando_compromisos']);
  if v_err is not null then
    return v_err;
  end if;
  if p_version <> p.version_vigente then
    return cruce.err('opcion_desactualizada', 'version_no_vigente', p.state_rev);
  end if;
  if not exists (select 1 from cruce.elegibles e
                 where e.propuesta_id = p.id and e.version = p_version and e.miembro_id = v_yo) then
    return cruce.err('fuera_de_audiencia', 'no_elegible_en_version', p.state_rev);
  end if;
  if exists (select 1 from cruce.aceptaciones a
             where a.propuesta_id = p.id and a.version = p_version and a.miembro_id = v_yo and a.vigente) then
    return cruce.err('no_autorizado', 'ya_acepto', p.state_rev);
  end if;

  v_habia := exists (select 1 from cruce.opiniones o
                     where o.propuesta_id = p.id and o.version = p_version and o.miembro_id = v_yo);
  if p_opinion = 'asi_no_puedo' then
    insert into cruce.opiniones (propuesta_id, version, miembro_id, opinion, en)
    values (p.id, p_version, v_yo, 'asi_no_puedo', cruce.ahora())
    on conflict (propuesta_id, version, miembro_id) do nothing;
    v_res := jsonb_build_object('opinion', 'asi_no_puedo', 'repetido', v_habia);
  else
    delete from cruce.opiniones o where o.propuesta_id = p.id and o.version = p_version and o.miembro_id = v_yo;
    v_res := jsonb_build_object('opinion', null, 'repetido', not v_habia);
  end if;
  -- Sin evento ni state_rev: como las condiciones, una opinión es privada (el organizador solo ve el total con 2 o más).
  perform cruce.guardar_intento(v_uid, p_intento_id, 'opinar_version', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('opinar_version', sqlstate, v_ctx);
end
$$;

revoke all on function public.opinar_version(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.opinar_version(uuid, integer, text, uuid) to authenticated;

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
    -- E11
    when 'no_autorizado/sin_aprobacion' then 'Este borrador necesita la aprobación del organizador antes de publicarse.'
    when 'opcion_desactualizada/borrador_cambiado' then 'El borrador cambió desde que se preparó. Revísalo de nuevo antes de aprobarlo o publicarlo.'
    when 'opcion_desactualizada/opcion_vencida' then 'Esa opción ya no está disponible para el grupo. Prepara otra.'
    when 'opcion_desactualizada/oportunidad_en_uso' then 'Ya hay una preparación en curso para ese sábado.'
    when 'opcion_desactualizada/ejecucion_cerrada' then 'Esa preparación ya se cerró.'
    when 'opcion_desactualizada/ejecucion_publicada' then 'Esa preparación ya se publicó.'
    when 'sin_alternativa/sin_destinatarios' then 'Nadie del grupo activó las invitaciones del agente.'
    when 'entrada_incompleta/politica_invalida' then 'La política solo admite aprobación o autónoma.'
    when 'entrada_incompleta/oportunidad_invalida' then 'La oportunidad debe ser un sábado futuro dentro de los próximos 16 días.'
    -- E13
    when 'entrada_incompleta/opinion_invalida' then 'Solo se puede decir "así no puedo" o retirar esa opinión.'
    when 'no_autorizado/ya_acepto' then 'Ya confirmaste esta versión. Si no puedes ir, primero retírate.'
    when 'sin_alternativa/tope_versiones' then 'Esta propuesta ya tuvo tres versiones. El organizador puede cerrarla o cancelarla.'
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
    'simulate_save_preferences', 'preview_space_by_code',
    -- E11
    'agente_social_contexto', 'agente_social_candidatos', 'set_recibir_invitaciones_agente',
    'set_politica_agente_social', 'iniciar_ejecucion_agente', 'guardar_borrador_agente',
    'aprobar_borrador_agente', 'publicar_borrador_agente', 'cerrar_ejecucion_agente',
    -- E13
    'opinar_version'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 41 then
    raise exception 'A5: public no tiene exactamente 41 funciones';
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

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
