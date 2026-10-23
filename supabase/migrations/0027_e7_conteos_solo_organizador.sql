-- CRUCE · 0027 · Enmienda 7, punto E7.2 (hallazgos 1 y 3 de docs/agente-revision-privacidad.md):
-- los conteos de la propuesta solo los ve el organizador.
--   * EstadoPropuesta (cruce.vista_propuesta, que arman get_proposal_state y todas las operaciones que
--     devuelven `propuesta`): `opcion.cupos.pendientes` y `personas_con_condiciones` van en null cuando
--     quien llama (p_yo) no es el organizador de la propuesta. El organizador los sigue viendo.
--     Depende de quién llama, no de la operación: la respuesta de un simulate_* (que solo puede pedir el
--     organizador del espacio) o de un accept_version de un miembro común se arma con el mismo p_yo.
--   * `personas_con_condiciones` no descuenta a quienes se bajaron (cruce.vista_propuesta_base).
--   * Entra en rev_vista sin tocar get_proposal_state: rev_vista es el hash de esta misma vista por persona,
--     así que el sondeo de un miembro común ya no cambia cuando alguien guarda condiciones.
--   * Lo demás (aceptaciones, mínimo, máximo, disponibles, libres, bajas con nombre) sigue igual para todos.
--     siguiente_accion se calcula antes de ocultar (solo el organizador recibe "buscar_opcion", que usa el
--     conteo); list_proposals (PropuestaResumen) no trae ninguno de los dos campos.
-- Sin firmas nuevas (A5: la lista permitida sigue en 30). vista_propuesta_base: cuerpo de 0008 (renombrada
-- en 0012) con un único cambio, el conteo de condiciones. vista_propuesta: envoltura de 0022 más el null.

create or replace function cruce.vista_propuesta_base(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
  v_opcion jsonb := null;
  v_franja jsonb;
  v_pub timestamptz;
  v_aceptaron jsonb;
  v_conf integer := 0;
  v_pend integer := 0;
  v_imp_acepto boolean := false;
  v_imp_ret boolean;
  v_reservado boolean;
  v_imp_nombre text;
  v_sig jsonb;
  v_ult jsonb := null;
  v_estado_etq text;
begin
  select * into p from cruce.propuestas where id = p_prop;
  if not found then
    return null;
  end if;

  if p.version_vigente is not null then
    select jsonb_build_object('clave', f.clave, 'inicio', cruce.momento(f.inicio), 'fin', cruce.momento(f.fin)),
           ver.publicada_en
      into v_franja, v_pub
    from cruce.versiones ver
    join cruce.franjas f on f.propuesta_id = ver.propuesta_id and f.clave = ver.franja_clave
    where ver.propuesta_id = p.id and ver.version = p.version_vigente;

    select coalesce(jsonb_agg(jsonb_build_object(
             'miembro', cruce.miembro_ref(a.miembro_id),
             'aceptado_en', cruce.momento(a.aceptado_en)) order by a.aceptado_en, a.id), '[]'::jsonb),
           count(*)
      into v_aceptaron, v_conf
    from cruce.aceptaciones a
    where a.propuesta_id = p.id and a.version = p.version_vigente and a.vigente;

    v_imp_acepto := exists (select 1 from cruce.aceptaciones a
                            where a.propuesta_id = p.id and a.version = p.version_vigente
                              and a.miembro_id = p.imprescindible_id and a.vigente);
    v_imp_ret := cruce.es_retirado(p.id, p.imprescindible_id);
    v_reservado := not v_imp_acepto and not v_imp_ret;

    select count(*) into v_pend
    from cruce.elegibles e
    where e.propuesta_id = p.id and e.version = p.version_vigente
      and not exists (select 1 from cruce.participaciones pa
                      where pa.propuesta_id = p.id and pa.miembro_id = e.miembro_id and pa.retirado)
      and not exists (select 1 from cruce.aceptaciones a
                      where a.propuesta_id = p.id and a.version = p.version_vigente
                        and a.miembro_id = e.miembro_id and a.vigente);

    v_opcion := jsonb_build_object(
      'version', p.version_vigente,
      'franja', v_franja,
      'publicada_en', cruce.momento(v_pub),
      'aceptaron', v_aceptaron,
      'cupos', jsonb_build_object(
        'minimo', p.minimo, 'maximo', p.maximo, 'confirmados', v_conf,
        'disponibles', p.maximo - v_conf,
        'faltan_para_minimo', greatest(0, p.minimo - v_conf),
        'imprescindible_acepto', v_imp_acepto,
        'pendientes', v_pend,
        'reservado_imprescindible', v_reservado,
        'libres_para_otros', greatest(0, p.maximo - v_conf - case when v_reservado then 1 else 0 end)));
  end if;

  if p.ult_eval_resultado is not null then
    v_ult := jsonb_build_object('resultado', p.ult_eval_resultado, 'version', p.ult_eval_version,
                                'en', cruce.momento(p.ult_eval_en));
  end if;

  select m.nombre into v_imp_nombre from cruce.miembros m where m.id = p.imprescindible_id;

  v_sig := case
    when p.estado = 'borrador' then
      jsonb_build_object('codigo', 'abrir_propuesta', 'texto', 'El organizador debe abrir la propuesta.')
    when p.estado = 'reuniendo_interes' and p.ult_eval_resultado = 'sin_opcion' then
      jsonb_build_object('codigo', 'sin_opcion', 'texto',
        'Sin opción compatible con las condiciones actuales. Se puede esperar más disponibilidad o cancelar.')
    when p.estado = 'reuniendo_interes' then
      jsonb_build_object('codigo', 'reunir_condiciones', 'texto',
        'Cada persona marca su disponibilidad en privado. Luego el organizador busca una opción.')
    when p.estado = 'esperando_compromisos' then
      jsonb_build_object('codigo', 'aceptar_version', 'texto',
        'Versión ' || p.version_vigente || ': confirmaron ' || v_conf || ' de ' || p.minimo || ' necesarias.'
        || case when v_imp_acepto then '' else ' Falta la aceptación de ' || v_imp_nombre || '.' end)
    when p.estado = 'grupo_confirmado' then
      jsonb_build_object('codigo', 'grupo_confirmado', 'texto',
        'Grupo confirmado en la versión ' || p.version_vigente || '. Cupos disponibles: ' || (p.maximo - v_conf) || '.')
    when p.estado = 'en_revision' and p.ult_eval_resultado = 'sin_alternativa' then
      jsonb_build_object('codigo', 'sin_alternativa', 'texto',
        'Sin opción compatible: no hay alternativa con las condiciones actuales. El organizador puede cancelar.')
    when p.estado = 'en_revision' then
      jsonb_build_object('codigo', 'buscar_alternativa', 'texto',
        'Hubo una baja y el plan ya no cumple el mínimo o la presencia del anfitrión. El organizador debe buscar una alternativa.')
    when p.estado = 'expirado' then
      jsonb_build_object('codigo', 'expirado', 'texto', 'Venció el plazo sin grupo confirmado.')
    else
      jsonb_build_object('codigo', 'cancelado', 'texto', 'El organizador canceló la propuesta.')
  end;

  v_estado_etq := case p.estado
    when 'borrador' then 'Borrador'
    when 'reuniendo_interes' then 'Reuniendo interés'
    when 'esperando_compromisos' then 'Esperando compromisos'
    when 'grupo_confirmado' then 'Grupo confirmado'
    when 'en_revision' then 'En revisión'
    when 'expirado' then 'Expirado'
    when 'cancelado' then 'Cancelado' end;

  return jsonb_build_object(
    'id', p.id,
    'espacio_id', p.espacio_id,
    'titulo', p.titulo,
    'organizador', cruce.miembro_ref(p.organizador_id),
    'imprescindible', cruce.miembro_ref(p.imprescindible_id),
    'minimo', p.minimo,
    'maximo', p.maximo,
    'zona_horaria', p.zona_horaria,
    'franjas', (select jsonb_agg(jsonb_build_object('clave', f.clave, 'inicio', cruce.momento(f.inicio),
                                                    'fin', cruce.momento(f.fin)) order by f.clave)
                from cruce.franjas f where f.propuesta_id = p.id),
    'plazo', cruce.momento(p.plazo),
    'plazo_vencido', cruce.ahora() >= p.plazo,
    'creada_en', cruce.momento(p.creada_en),
    'estado', p.estado,
    'estado_etiqueta', v_estado_etq,
    'state_rev', p.state_rev,
    'confirmados', v_conf,
    'opcion', v_opcion,
    'ultima_evaluacion', v_ult,
    'interesados', (
      select jsonb_build_object('cantidad', count(*),
               'miembros', coalesce(jsonb_agg(cruce.miembro_ref(pa.miembro_id) order by pa.interes_en, m.orden), '[]'::jsonb))
      from cruce.participaciones pa join cruce.miembros m on m.id = pa.miembro_id
      where pa.propuesta_id = p.id and pa.interesado and not pa.retirado),
    -- E7.2: no descuenta a quienes se bajaron (una baja no cambia este número). Solo lo ve el organizador
    -- de la propuesta: cruce.vista_propuesta lo pone en null para los demás.
    'personas_con_condiciones', (
      select count(*) from cruce.condiciones c
      where c.propuesta_id = p.id and cruce.condiciones_estado(c.disponibilidad) = 'completas'),
    'bajas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro', cruce.miembro_ref(b.miembro_id), 'en', cruce.momento(b.en),
               'version', b.version, 'habia_aceptado', b.habia_aceptado) order by b.en, b.id), '[]'::jsonb)
      from cruce.bajas b where b.propuesta_id = p.id),
    'siguiente_accion', v_sig,
    'mi_situacion', cruce.situacion(p.id, p_yo),
    'historial', (
      select coalesce(jsonb_agg(x.j order by x.id), '[]'::jsonb)
      from (select ev.id, jsonb_build_object(
                     'tipo', ev.tipo,
                     'actor', cruce.miembro_ref(ev.actor_id),
                     'actor_tipo', ev.actor_tipo,
                     -- A2: origen guardado del evento; no se recalcula si el asiento se reclama después.
                     'origen', ev.actor_tipo,
                     'ejecutado_por', cruce.miembro_ref(ev.ejecutado_por),
                     'en', cruce.momento(ev.en),
                     'estado_previo', ev.estado_previo,
                     'estado_nuevo', ev.estado_nuevo,
                     'version_previa', ev.version_previa,
                     'version_nueva', ev.version_nueva,
                     'state_rev', ev.state_rev) as j
            from cruce.eventos ev where ev.propuesta_id = p.id
            order by ev.id desc limit 50) x));
end
$$;

create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
begin
  if v is null then
    return null;
  end if;
  v := jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
  -- E7.2: los conteos que dejan deducir condiciones ajenas, solo para el organizador de la propuesta.
  if p_yo is distinct from (select x.organizador_id from cruce.propuestas x where x.id = p_prop) then
    v := jsonb_set(v, '{personas_con_condiciones}', 'null'::jsonb);
    if jsonb_typeof(v -> 'opcion') = 'object' then
      v := jsonb_set(v, '{opcion,cupos,pendientes}', 'null'::jsonb);
    end if;
  end if;
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
