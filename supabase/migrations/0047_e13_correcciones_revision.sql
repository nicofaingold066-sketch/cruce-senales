-- CRUCE · 0047 · Enmienda 13, correcciones de la revisión adversarial (solo lectura, 16 agentes, 21:44):
--   1. Historial (13 (c) "sin decir si había confirmado"): para quien no es la persona, las aceptaciones de quienes se
--      retiraron ya NO salen (con 0045 salían como "Una persona aceptó", lo que decía que había confirmado), y el evento
--      de baja sale sin cambio de estado (grupo_confirmado → en_revision delataba la aceptación), sin actor_tipo de
--      simulación ni ejecutado_por.
--   2. opiniones_totales: el organizador ve las opiniones de los DEMÁS (sin la propia, como E7.4), dadas sobre la
--      versión vigente y que no bajan cuando alguien acepta (si bajaran, la aceptación, que es pública y con nombre,
--      delataba quién había opinado). Las que valen para el servidor (cruce.opiniones_efectivas) no cambian.
--   3. Con la versión 3 en en_revision, puede.proponer_reparacion es false y siguiente_accion dice el tope con el código
--      existente sin_alternativa (antes ofrecía buscar alternativa y siempre fallaba con tope_versiones).
--   4. Si el imprescindible se retiró, los cupos ya no lo delatan a los demás (reservado_imprescindible true).
--   5. Un rearmado sin alternativa desde esperando_compromisos ya no marca la última evaluación como sin_alternativa.
-- Sin RPC nuevas ni cambio de firmas (41/0). Cuerpos copiados de 0042, 0043 y 0045.

-- Opiniones que ve quien consulta: las de los demás, sobre la versión vigente, sin las de quienes se retiraron.
create or replace function cruce.opiniones_visibles(p_prop uuid, p_yo uuid) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer
  from cruce.opiniones o join cruce.propuestas p on p.id = o.propuesta_id and o.version = p.version_vigente
  where o.propuesta_id = p_prop
    and o.miembro_id is distinct from p_yo
    and not cruce.es_retirado(p_prop, o.miembro_id)
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
  -- 0047: lo que ve el organizador son las opiniones de los DEMÁS (sin la propia, como E7.4) dadas sobre la versión
  -- vigente; no bajan cuando alguien acepta (si bajaran, la aceptación con nombre delataría quién había opinado).
  v_n := cruce.opiniones_visibles(p_prop, p_yo);
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
  -- 0047: en el historial, para quien no es la persona: las aceptaciones de quienes se retiraron NO salen (una
  -- aceptación anónima decía que había confirmado), y la baja sale sin actor real, sin cambio de estado y sin decir
  -- si fue simulada.
  select coalesce(jsonb_agg(pa.miembro_id::text), '[]'::jsonb) into v_retirados
  from cruce.participaciones pa where pa.propuesta_id = p_prop and pa.retirado;
  v := jsonb_set(v, '{historial}', (
    select coalesce(jsonb_agg(case when e ->> 'tipo' = 'baja' and (e #>> '{actor,miembro_id}') is distinct from p_yo::text
                                   then e || jsonb_build_object('actor', v_anon, 'actor_tipo', 'persona', 'origen', 'persona',
                                                                'ejecutado_por', null, 'estado_previo', null, 'estado_nuevo', null)
                                   else e end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'historial') with ordinality as t (e, o)
    where not (e ->> 'tipo' = 'aceptacion' and v_retirados ? (e #>> '{actor,miembro_id}')
               and (e #>> '{actor,miembro_id}') is distinct from p_yo::text)));
  -- 0047: si el imprescindible se retiró, los cupos no lo dicen a los demás (se muestran como si siguiera reservado;
  -- en en_revision o expirado nadie puede aceptar, así que no cambia ninguna regla: decide el servidor).
  if jsonb_typeof(v -> 'opcion') = 'object' and p_yo is distinct from (v #>> '{imprescindible,miembro_id}')::uuid
     and not coalesce((v #>> '{opcion,cupos,imprescindible_acepto}')::boolean, false) then
    v := jsonb_set(v, '{opcion,cupos,reservado_imprescindible}', 'true'::jsonb);
    v := jsonb_set(v, '{opcion,cupos,libres_para_otros}',
                   to_jsonb(greatest(0, (v #>> '{opcion,cupos,disponibles}')::integer - 1)));
  end if;
  -- E11: la invitación del agente es de cada persona; nadie ve a quién más invitaron.
  v := jsonb_set(v, '{mi_situacion,invitacion_agente}', coalesce(
    (select jsonb_build_object('texto', i.texto) from cruce.invitaciones_agente i
     where i.propuesta_id = p_prop and i.miembro_id = p_yo), 'null'::jsonb));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
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

revoke all on function public.propose_repair(uuid, uuid) from public, anon, authenticated;
grant execute on function public.propose_repair(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
