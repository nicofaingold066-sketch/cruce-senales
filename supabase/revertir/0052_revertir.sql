-- Reversa de la 0052 (enmienda 15, E-c). NO es una migración: se corre a mano solo si la 0052 rompe producción.
-- Devuelve los cuerpos anteriores (0011 publicar_version, 0042 opinar_version, 0047 propose_repair y situacion,
-- 0048 create_proposal y mensaje, 0050 siguiente_accion_personal), la vista base de 0029 y borra columnas y ayudantes.
begin;
drop function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text, text, integer);
create or replace function public.create_proposal(
  p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer,
  p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid, p_actividad text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_tit text := btrim(p_titulo);
  v_el jsonb;
  v_ini timestamptz[] := array[]::timestamptz[];
  v_fin timestamptz[] := array[]::timestamptz[];
  v_i timestamptz;
  v_f timestamptz;
  v_plazo timestamptz;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_prop uuid;
  v_res jsonb;
  v_fam text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  -- 2. forma (sin depender del reloj)
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_tit is null or v_tit = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if char_length(v_tit) > 80 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_franjas is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if jsonb_typeof(p_franjas) <> 'array' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if jsonb_array_length(p_franjas) <> 2 then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  for v_el in select x from jsonb_array_elements(p_franjas) x loop
    if jsonb_typeof(v_el) <> 'object' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    if v_el -> 'inicio' is null or v_el -> 'fin' is null
       or jsonb_typeof(v_el -> 'inicio') = 'null' or jsonb_typeof(v_el -> 'fin') = 'null' then
      return cruce.err('entrada_incompleta', 'campo_faltante', null);
    end if;
    if jsonb_typeof(v_el -> 'inicio') <> 'string' or jsonb_typeof(v_el -> 'fin') <> 'string' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_i := cruce.parse_hora_local(v_el ->> 'inicio');
    v_f := cruce.parse_hora_local(v_el ->> 'fin');
    if v_i is null or v_f is null then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_ini := v_ini || v_i;
    v_fin := v_fin || v_f;
  end loop;
  if v_fin[1] <= v_ini[1] or v_fin[2] <= v_ini[2] then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if p_minimo is null or p_maximo is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if not (2 <= p_minimo and 2 <= p_maximo and p_minimo <= p_maximo and p_maximo <= 20) then
    return cruce.err('entrada_incompleta', 'cupos_invalidos', null);
  end if;
  if p_plazo is null or btrim(p_plazo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_plazo := cruce.parse_hora_local(p_plazo);
  if v_plazo is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_plazo > v_ini[1] or v_plazo > v_ini[2] then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if p_zona_horaria is null or btrim(p_zona_horaria) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if p_zona_horaria <> 'America/Santiago' then
    return cruce.err('entrada_incompleta', 'zona_horaria_no_soportada', null);
  end if;
  if p_imprescindible_id is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  -- E14: la actividad es opcional; si viene, tiene que ser del catálogo (la familia se compara después de la
  -- pertenencia, para no revelar el propósito de un espacio ajeno).
  if p_actividad is not null and cruce.familia_de_actividad(p_actividad) is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;

  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento (A3: un intento de una generación anterior responde intento_obsoleto)
  v_params := jsonb_build_object(
    'p_espacio_id', p_espacio_id, 'p_titulo', p_titulo, 'p_franjas', p_franjas,
    'p_minimo', p_minimo, 'p_maximo', p_maximo, 'p_imprescindible_id', p_imprescindible_id,
    'p_plazo', p_plazo, 'p_zona_horaria', p_zona_horaria)
    -- E14: solo si viene, para que los intentos de antes de la migración sigan valiendo.
    || case when p_actividad is not null then jsonb_build_object('p_actividad', p_actividad) else '{}'::jsonb end;
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'create_proposal', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. miembro
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  -- Rangos que dependen del reloj, con el instante de decisión
  if v_ini[1] <= cruce.ahora() or v_ini[2] <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if v_plazo <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.id = p_imprescindible_id and m.espacio_id = p_espacio_id) then
    return cruce.err('entrada_incompleta', 'imprescindible_invalido', null);
  end if;
  -- E14 (ajustes 1 y 2): en un grupo con propósito, una actividad de otra familia se rechaza; sin actividad se acepta.
  if p_actividad is not null then
    select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_espacio_id;
    if v_fam <> 'libre' and cruce.familia_de_actividad(p_actividad) <> v_fam then
      return cruce.err('entrada_incompleta', 'fuera_de_proposito', null);
    end if;
  end if;

  insert into cruce.propuestas (espacio_id, titulo, organizador_id, imprescindible_id, minimo, maximo,
                                zona_horaria, plazo, estado, state_rev, creada_en, actividad)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1, cruce.ahora(), p_actividad)
  returning id into v_prop;
  insert into cruce.franjas (propuesta_id, clave, inicio, fin)
  values (v_prop, 'A', v_ini[1], v_fin[1]), (v_prop, 'B', v_ini[2], v_fin[2]);
  perform cruce.evento(v_prop, 'propuesta_creada', v_yo, 'persona', null, null, 'borrador', null, null, 1);

  v_res := jsonb_build_object('propuesta_id', v_prop, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'create_proposal', v_params, p_espacio_id, v_yo,
                                cruce.generacion(p_espacio_id), v_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(v_prop, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_proposal', sqlstate, v_ctx);
end
$$;

revoke all on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text) to authenticated;
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

create or replace function public.propose_repair(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  p cruce.propuestas%rowtype;
  v_err jsonb;
  v_clave text;
  v_ver integer;
  v_rev integer;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_propuesta_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_esp := cruce.espacio_de_propuesta(p_propuesta_id);
  perform cruce.bloquear_espacio(v_esp);
  v_params := jsonb_build_object('p_propuesta_id', p_propuesta_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'propose_repair', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_yo := cruce.bloquear_actor_y_propuesta(p_propuesta_id, v_esp, v_uid, null);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into p from cruce.propuestas x where x.id = p_propuesta_id;
  if p.organizador_id <> v_yo then
    return cruce.err('no_autorizado', 'no_es_organizador', p.state_rev);
  end if;
  -- E13 (b): también desde esperando_compromisos.
  v_err := cruce.chequeo_estado(p.id, array['en_revision', 'esperando_compromisos']);
  if v_err is not null then
    return v_err;
  end if;
  -- E13 (b): desde esperando_compromisos, solo con al menos un "así no puedo" que vale en la versión vigente.
  if p.estado = 'esperando_compromisos' and cruce.opiniones_efectivas(p.id) < 1 then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  -- E13 (b): tope de 3 versiones por propuesta.
  if coalesce(p.version_vigente, 0) >= 3 then
    perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                  cruce.generacion(v_esp), p.id,
                                  jsonb_build_object('tipo', 'error', 'codigo', 'sin_alternativa', 'detalle', 'tope_versiones'));
    return cruce.err('sin_alternativa', 'tope_versiones', p.state_rev);
  end if;

  v_clave := cruce.motor(p.id);
  if v_clave is null then
    -- 0047: desde esperando_compromisos la versión vigente sigue; no se marca la última evaluación como
    -- sin_alternativa (si no, una baja posterior heredaba ese texto en en_revision).
    update cruce.propuestas x
      set state_rev = x.state_rev + 1,
          ult_eval_resultado = case when p.estado = 'en_revision' then 'sin_alternativa' else x.ult_eval_resultado end,
          ult_eval_version = case when p.estado = 'en_revision' then null else x.ult_eval_version end,
          ult_eval_en = case when p.estado = 'en_revision' then cruce.ahora() else x.ult_eval_en end
    where x.id = p.id returning x.state_rev into v_rev;
    perform cruce.evento(p.id, 'reparacion_sin_alternativa', v_yo, 'persona', null,
                         p.estado, p.estado, p.version_vigente, p.version_vigente, v_rev);
    perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                  cruce.generacion(v_esp), p.id,
                                  jsonb_build_object('tipo', 'error', 'codigo', 'sin_alternativa', 'detalle', 'sin_alternativa'));
    return cruce.err('sin_alternativa', 'sin_alternativa', v_rev);
  end if;

  v_ver := cruce.publicar_version(p.id, v_clave);
  update cruce.propuestas x
    set estado = 'esperando_compromisos', state_rev = x.state_rev + 1,
        ult_eval_resultado = 'reparacion_publicada', ult_eval_version = v_ver, ult_eval_en = cruce.ahora()
  where x.id = p.id returning x.state_rev into v_rev;
  perform cruce.evento(p.id, 'reparacion_publicada', v_yo, 'persona', null,
                       p.estado, 'esperando_compromisos', p.version_vigente, v_ver, v_rev);
  v_res := jsonb_build_object('tipo', 'reparacion_publicada', 'version', v_ver, 'franja', v_clave, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'propose_repair', v_params, v_esp, v_yo,
                                cruce.generacion(v_esp), p.id, jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(p.id, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('propose_repair', sqlstate, v_ctx);
end
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
      -- 0047: nunca con la versión 3 (el servidor responde tope_versiones); en esperando_compromisos, con 2 o más
      -- opiniones de los demás (lo que ve el organizador) y al menos una que valga (lo que exige el servidor).
      'proponer_reparacion', v_es_org and not v_vencido and coalesce(p.version_vigente, 0) < 3 and (
                               p.estado = 'en_revision'
                               or (p.estado = 'esperando_compromisos'
                                   and cruce.opiniones_visibles(p_prop, p_m) >= 2 and cruce.opiniones_efectivas(p_prop) >= 1)),
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

create or replace function cruce.siguiente_accion_personal(v jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_sig jsonb := v -> 'siguiente_accion';
  v_est text := v ->> 'estado';
  v_ver text := v #>> '{opcion,version}';
  v_faltan integer := coalesce((v #>> '{opcion,cupos,faltan_para_minimo}')::integer, 0);
  v_conds integer := coalesce((v ->> 'personas_con_condiciones')::integer, 0);
  v_mis_conds text := v #>> '{mi_situacion,condiciones}';
begin
  -- E13 (c): quien se retiró: un agradecimiento, sin pedir motivo (mismo código de siempre).
  if coalesce((v #>> '{mi_situacion,retirado}')::boolean, false)
     and v_est in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision') then
    return jsonb_build_object('codigo', v_sig ->> 'codigo', 'texto', 'Gracias por avisar. No hace falta contar por qué.');
  end if;
  -- 0047: en revisión con la versión 3 ya no se puede rearmar (tope): se dice, sin culpar a las condiciones.
  if v_est = 'en_revision' and v_sig ->> 'codigo' = 'buscar_alternativa' and coalesce(v_ver::integer, 0) >= 3 then
    return jsonb_build_object('codigo', 'sin_alternativa', 'texto', 'Esta propuesta ya tuvo tres versiones. El organizador puede cancelarla.');
  end if;
  -- 0050 (revisión E14, privacidad): con el mínimo cumplido, "perdió al anfitrión" delata quién se fue. A quien no
  -- organiza se le dice solo que la versión ya no alcanza; el organizador sigue viendo la causa.
  if v_est = 'en_revision' and v_sig ->> 'codigo' = 'buscar_alternativa'
     and not coalesce((v #>> '{mi_situacion,es_organizador}')::boolean, false) then
    return jsonb_build_object('codigo', 'buscar_alternativa', 'texto', 'La versión ' || v_ver || ' ya no reúne lo necesario para juntarse.');
  end if;
  if coalesce((v #>> '{mi_situacion,puede,aceptar}')::boolean, false) then
    return jsonb_build_object('codigo', 'te_toca_aceptar', 'texto', 'Te toca confirmar la versión ' || v_ver || '.');
  end if;
  -- E12 (b): con una opción publicada, quien tiene condiciones incompletas queda fuera del cálculo; se le dice a él.
  if v_est in ('esperando_compromisos', 'grupo_confirmado') and v_mis_conds = 'incompletas'
     and coalesce((v #>> '{mi_situacion,puede,guardar_condiciones}')::boolean, false) then
    return jsonb_build_object('codigo', 'reunir_condiciones', 'texto', 'Tu disponibilidad está incompleta: no entraste en esta versión. Si la completas, cuenta si el plan se rearma.');
  end if;
  -- E13 (b): el organizador ve que puede rearmar cuando 2 o más dijeron "así no puedo" (y quedan versiones).
  if v_est = 'esperando_compromisos' and coalesce((v #>> '{mi_situacion,es_organizador}')::boolean, false)
     and (v #>> '{opiniones_totales,asi_no_puedo}') is not null and coalesce(v_ver::integer, 0) < 3 then
    return jsonb_build_object('codigo', 'buscar_opcion', 'texto', 'Algunos no pueden así: puedes rearmar con lo nuevo.');
  end if;
  if v_est = 'esperando_compromisos' and coalesce((v #>> '{mi_situacion,acepte_version}')::boolean, false) then
    return jsonb_build_object('codigo', 'ya_aceptaste', 'texto',
      'Ya confirmaste la versión ' || v_ver || '. '
      || case when v_faltan = 1 then 'Falta 1 para el mínimo.'
              when v_faltan > 1 then 'Faltan ' || v_faltan || ' para el mínimo.'
              else 'Falta la aceptación de ' || (v #>> '{imprescindible,nombre}') || '.' end);
  end if;
  -- E12 (a): el organizador que es el imprescindible marca primero su disponibilidad.
  if v_est = 'reuniendo_interes' and v_sig ->> 'codigo' = 'reunir_condiciones'
     and coalesce((v #>> '{mi_situacion,es_organizador}')::boolean, false)
     and (v #>> '{mi_situacion,miembro_id}') = (v #>> '{imprescindible,miembro_id}')
     and v_mis_conds is distinct from 'completas' then
    return jsonb_build_object('codigo', 'reunir_condiciones', 'texto', 'Primero marca tu disponibilidad: eres quien no puede faltar.');
  end if;
  if v_est = 'reuniendo_interes' and coalesce((v #>> '{mi_situacion,puede,evaluar}')::boolean, false)
     and v_sig ->> 'codigo' = 'reunir_condiciones' and v_conds >= (v ->> 'minimo')::integer then
    return jsonb_build_object('codigo', 'buscar_opcion', 'texto',
      'Ya hay ' || v_conds || ' personas con condiciones. Busca una opción compatible.');
  end if;
  return v_sig;
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
    when 'no_autorizado/condiciones_congeladas' then 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.'
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
    when 'entrada_incompleta/fuera_de_proposito' then 'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'
    when 'sin_alternativa/tope_versiones' then 'Esta propuesta ya tuvo tres versiones. El organizador puede cerrarla o cancelarla.'
  end
$$;

create or replace function cruce.publicar_version(p_prop uuid, p_clave text) returns integer
language plpgsql volatile set search_path = '' as $$
declare
  v integer;
begin
  select coalesce(p.version_vigente, 0) + 1 into v from cruce.propuestas p where p.id = p_prop;
  insert into cruce.versiones (propuesta_id, version, franja_clave, publicada_en)
  values (p_prop, v, p_clave, cruce.ahora());
  insert into cruce.elegibles (propuesta_id, version, miembro_id)
  select p_prop, v, e from cruce.elegibles_franja(p_prop, p_clave) e;
  update cruce.propuestas p set version_vigente = v where p.id = p_prop;
  return v;
end
$$;

drop function cruce.vista_propuesta_base(uuid, uuid);
alter function cruce.vista_propuesta_base_e14(uuid, uuid) rename to vista_propuesta_base;
drop function cruce.ronda_cerrada(uuid);
drop function cruce.ronda_abierta(uuid);
drop function cruce.ronda_json(uuid);
alter table cruce.versiones drop column ronda_cierra;
alter table cruce.propuestas drop column regla;
alter table cruce.propuestas drop column ronda_horas;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
commit;
