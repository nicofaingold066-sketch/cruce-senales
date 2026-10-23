-- CRUCE · 0036 · Enmienda 10, Parte A, corrección de forma (mejora #85): las cuatro claves nuevas de preferencias
-- (zona, movilidad, tiempo_max, momento) salen dentro de `preferencias` solo cuando tienen valor. Con 0035 salían
-- en null y cambiaban la forma de get_my_preferences, save_my_preferences y simulate_save_preferences para quien
-- no las usa (las pruebas de las enmiendas 4, 5 y 8 comparan la forma exacta). Ahora: misma forma de antes si no
-- se usan; aditivo si se usan. Cuerpos copiados de 0035; solo cambia el armado de `preferencias`.
-- Sin RPC nuevas ni cambio de firma (31 authenticated, 0 anon).

create or replace function cruce.preferencias_json(pr cruce.preferencias) returns jsonb
language sql stable set search_path = '' as $$
  select case when pr.miembro_id is null then null else jsonb_build_object(
    'presupuesto', pr.presupuesto, 'energia', pr.energia, 'ambiente', pr.ambiente, 'lugar', pr.lugar,
    'me_gustaria', to_jsonb(pr.me_gustaria))
    -- E10: las claves sin valor no salen (forma de antes para quien no las usa).
    || jsonb_strip_nulls(jsonb_build_object(
    'zona', pr.zona, 'movilidad', pr.movilidad, 'tiempo_max', pr.tiempo_max, 'momento', pr.momento)) end
$$;

create or replace function public.save_my_preferences(p_espacio_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_det text;
  v_yo uuid;
  v_me text[];
  v_prev cruce.preferencias%rowtype;
  v_rep boolean;
  v_usar boolean;
  v_en timestamptz;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_preferencias_propias(p_preferencias);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  -- A4: espacio, después miembro
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();

  -- E8: opt-out del agente. Si falta la clave, vale true (guardar sin la clave vuelve a activarlo).
  v_usar := coalesce((p_preferencias ->> 'usar_en_agente')::boolean, true);
  select array_agg(x order by o) into v_me
  from jsonb_array_elements_text(p_preferencias -> 'me_gustaria') with ordinality as t(x, o);
  select * into v_prev from cruce.preferencias pr where pr.miembro_id = v_yo;
  v_rep := found and v_prev.presupuesto = p_preferencias ->> 'presupuesto' and v_prev.energia = p_preferencias ->> 'energia'
           and v_prev.ambiente = p_preferencias ->> 'ambiente' and v_prev.lugar = p_preferencias ->> 'lugar'
           and v_prev.me_gustaria = v_me and v_prev.usar_en_agente = v_usar
           -- E10
           and v_prev.zona is not distinct from p_preferencias ->> 'zona'
           and v_prev.movilidad is not distinct from p_preferencias ->> 'movilidad'
           and v_prev.tiempo_max is not distinct from p_preferencias ->> 'tiempo_max'
           and v_prev.momento is not distinct from p_preferencias ->> 'momento';
  if v_rep then
    v_en := v_prev.actualizadas_en;
  else
    v_en := cruce.ahora();
    insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en,
                                    usar_en_agente, zona, movilidad, tiempo_max, momento)
    values (v_yo, p_espacio_id, p_preferencias ->> 'presupuesto', p_preferencias ->> 'energia',
            p_preferencias ->> 'ambiente', p_preferencias ->> 'lugar', v_me, v_en, v_usar,
            p_preferencias ->> 'zona', p_preferencias ->> 'movilidad', p_preferencias ->> 'tiempo_max',
            p_preferencias ->> 'momento')
    on conflict (miembro_id) do update
      set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
          lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en,
          usar_en_agente = excluded.usar_en_agente, zona = excluded.zona, movilidad = excluded.movilidad,
          tiempo_max = excluded.tiempo_max, momento = excluded.momento;
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('repetido', v_rep),
    'preferencias', jsonb_build_object(
      'presupuesto', p_preferencias ->> 'presupuesto', 'energia', p_preferencias ->> 'energia',
      'ambiente', p_preferencias ->> 'ambiente', 'lugar', p_preferencias ->> 'lugar',
      'me_gustaria', to_jsonb(v_me))
      || jsonb_strip_nulls(jsonb_build_object(
      'zona', p_preferencias ->> 'zona', 'movilidad', p_preferencias ->> 'movilidad',
      'tiempo_max', p_preferencias ->> 'tiempo_max', 'momento', p_preferencias ->> 'momento')),
    'usar_en_agente', v_usar,
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('save_my_preferences', sqlstate, v_ctx);
end
$$;

create or replace function public.simulate_save_preferences(p_espacio_id uuid, p_miembro_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_det text;
  v_yo uuid;
  v_rol text;
  v_demo boolean;
  v_me text[];
  v_prev cruce.preferencias%rowtype;
  v_rep boolean;
  v_en timestamptz;
  v_zona text;
  v_movilidad text;
  v_tiempo text;
  v_momento text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_miembro_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_preferencias(p_preferencias);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform 1 from cruce.miembros m
  where m.espacio_id = p_espacio_id and (m.user_id = v_uid or m.id = p_miembro_id)
  order by m.id
  for update;
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  select e.demo into v_demo from cruce.espacios e where e.id = p_espacio_id;
  if not v_demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.id = p_miembro_id and m.espacio_id = p_espacio_id and m.simulado) then
    return cruce.err('no_autorizado', 'miembro_no_simulado', null);
  end if;

  select array_agg(x order by o) into v_me
  from jsonb_array_elements_text(p_preferencias -> 'me_gustaria') with ordinality as t(x, o);
  select * into v_prev from cruce.preferencias pr where pr.miembro_id = p_miembro_id;
  -- E10: clave ausente = conserva el valor guardado (la semilla del demo no se pierde al cambiar gustos).
  v_zona := case when p_preferencias ? 'zona' then p_preferencias ->> 'zona' else v_prev.zona end;
  v_movilidad := case when p_preferencias ? 'movilidad' then p_preferencias ->> 'movilidad' else v_prev.movilidad end;
  v_tiempo := case when p_preferencias ? 'tiempo_max' then p_preferencias ->> 'tiempo_max' else v_prev.tiempo_max end;
  v_momento := case when p_preferencias ? 'momento' then p_preferencias ->> 'momento' else v_prev.momento end;
  v_rep := v_prev.miembro_id is not null and v_prev.presupuesto = p_preferencias ->> 'presupuesto' and v_prev.energia = p_preferencias ->> 'energia'
           and v_prev.ambiente = p_preferencias ->> 'ambiente' and v_prev.lugar = p_preferencias ->> 'lugar'
           and v_prev.me_gustaria = v_me
           and v_prev.zona is not distinct from v_zona and v_prev.movilidad is not distinct from v_movilidad
           and v_prev.tiempo_max is not distinct from v_tiempo and v_prev.momento is not distinct from v_momento;
  if v_rep then
    v_en := v_prev.actualizadas_en;
  else
    v_en := cruce.ahora();
    insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en,
                                    zona, movilidad, tiempo_max, momento)
    values (p_miembro_id, p_espacio_id, p_preferencias ->> 'presupuesto', p_preferencias ->> 'energia',
            p_preferencias ->> 'ambiente', p_preferencias ->> 'lugar', v_me, v_en, v_zona, v_movilidad, v_tiempo, v_momento)
    on conflict (miembro_id) do update
      set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
          lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en,
          zona = excluded.zona, movilidad = excluded.movilidad, tiempo_max = excluded.tiempo_max, momento = excluded.momento;
    insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, miembro_simulado_id, en)
    values (p_espacio_id, 'preferencias_simuladas', v_yo, p_miembro_id, v_en);
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('repetido', v_rep, 'simulado', true),
    'miembro', cruce.miembro_ref(p_miembro_id),
    'preferencias', jsonb_build_object(
      'presupuesto', p_preferencias ->> 'presupuesto', 'energia', p_preferencias ->> 'energia',
      'ambiente', p_preferencias ->> 'ambiente', 'lugar', p_preferencias ->> 'lugar',
      'me_gustaria', to_jsonb(v_me))
      || jsonb_strip_nulls(jsonb_build_object(
      'zona', v_zona, 'movilidad', v_movilidad, 'tiempo_max', v_tiempo, 'momento', v_momento)),
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_save_preferences', sqlstate, v_ctx);
end
$$;

revoke all on function public.save_my_preferences(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_my_preferences(uuid, jsonb) to authenticated;
revoke all on function public.simulate_save_preferences(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.simulate_save_preferences(uuid, uuid, jsonb) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
