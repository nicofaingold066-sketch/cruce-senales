-- Actividad del grupo (pedido explícito de Nico, 24 oct 2026).
-- Solo los movimientos comparten nombres. E13 en la vista del plan permanece intacta.
-- user_id es la membresía ACTIVA; usuario_original_id conserva la propiedad privada del asiento.
-- No se borran miembros, condiciones, eventos ni identidades históricas al salir.

alter table cruce.miembros add column usuario_original_id uuid;
alter table cruce.miembros add column salio_en timestamptz;
-- No actualizar filas históricas: existen CHECK NOT VALID de normalización de nombres.
-- El dueño se materializa al insertar o en la primera mutación autorizada de cada asiento.
alter table cruce.miembros drop constraint miembros_real_con_sesion;
alter table cruce.miembros add constraint miembros_real_con_sesion
  check (simulado or pendiente or user_id is not null or salio_en is not null);
alter table cruce.miembros add constraint miembros_salida_coherente
  check (salio_en is null or (user_id is null and usuario_original_id is not null
                              and not simulado and not pendiente and rol = 'miembro'));
alter table cruce.miembros add constraint miembros_sesion_propietaria
  check (user_id is null or usuario_original_id is null or usuario_original_id = user_id);
create unique index miembros_espacio_propietario_uq
  on cruce.miembros (espacio_id, usuario_original_id) where usuario_original_id is not null;

alter table cruce.eventos_espacio drop constraint eventos_espacio_tipo_check;
alter table cruce.eventos_espacio add constraint eventos_espacio_tipo_check
  check (tipo in ('demo_reiniciada', 'preferencias_simuladas', 'miembro_unido', 'miembro_salio'));
create index eventos_espacio_movimientos_idx on cruce.eventos_espacio (espacio_id, en desc, id desc)
  where tipo in ('miembro_unido', 'miembro_salio');
create index bajas_propuesta_en_idx on cruce.bajas (propuesta_id, en desc, id desc);

-- Un pendiente anotado y una persona simulada NO son ingresos reales.
-- El trigger cubre crear, reclamar y reingresar; los reintentos no cambian la fila.
create or replace function cruce.trg_propietario_miembro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.usuario_original_id is null then
    if tg_op = 'UPDATE' then
      -- Al salir NEW.user_id ya es null: el dueño de un asiento antiguo está en OLD.
      new.usuario_original_id := coalesce(old.user_id, new.user_id);
    else
      new.usuario_original_id := new.user_id;
    end if;
  end if;
  return new;
end
$$;
create trigger miembros_propietario before insert or update on cruce.miembros
  for each row execute function cruce.trg_propietario_miembro();

create or replace function cruce.trg_movimiento_miembro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null and new.rol = 'miembro' and not new.simulado and not new.pendiente then
      insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en)
      values (new.espacio_id, 'miembro_unido', new.id, cruce.ahora());
    end if;
  elsif old.user_id is null and new.user_id is not null and new.rol = 'miembro' and not new.simulado and not new.pendiente then
    insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en)
    values (new.espacio_id, 'miembro_unido', new.id, cruce.ahora());
  elsif old.user_id is not null and new.user_id is null and new.salio_en is not null then
    insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en)
    values (new.espacio_id, 'miembro_salio', new.id, new.salio_en);
  end if;
  return new;
end
$$;
create trigger miembros_movimientos after insert or update on cruce.miembros
  for each row execute function cruce.trg_movimiento_miembro();

-- Proyección pública cerrada. Nunca copiar el objeto de bajas/eventos completo.
-- No se reconstruyen ingresos antiguos: creado_en puede ser la fecha de carga de un pendiente.
create or replace function cruce.actividad_espacio(p_espacio uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.movimiento order by x.en desc, x.origen, x.id desc), '[]'::jsonb)
  from (
    select e.en, e.id, 'espacio' as origen,
           jsonb_build_object('id', 'espacio:' || e.id::text, 'tipo', e.tipo,
             'miembro', cruce.miembro_ref(e.actor_id), 'en', cruce.momento(e.en), 'plan', null) as movimiento
    from cruce.eventos_espacio e
    where e.espacio_id = p_espacio and e.tipo in ('miembro_unido', 'miembro_salio')
    union all
    select b.en, b.id, 'plan' as origen,
           jsonb_build_object('id', 'baja:' || b.id::text, 'tipo', 'baja_plan',
             'miembro', cruce.miembro_ref(b.miembro_id), 'en', cruce.momento(b.en),
             'plan', jsonb_build_object('id', p.id, 'titulo', p.titulo))
    from cruce.bajas b join cruce.propuestas p on p.id = b.propuesta_id
    where p.espacio_id = p_espacio
  ) x
$$;


create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
    'codigo_invitacion', e.codigo_invitacion,
    'generacion', e.generacion,
    'creado_en', cruce.momento(e.creado_en),
    'ultimo_reinicio', cruce.momento(e.ultimo_reinicio),
    'mi_miembro_id', yo.id, 'mi_rol', yo.rol,
    'actividad', cruce.actividad_espacio(e.id),
    -- E14
    'proposito', e.proposito, 'familia', cruce.familia_de_proposito(e.proposito),
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre, 'rol', m.rol, 'simulado', m.simulado,
               'pendiente', m.pendiente,
               'es_yo', coalesce(m.user_id = p_uid, false)) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id and m.salio_en is null))
  from cruce.espacios e
  left join cruce.miembros yo on yo.espacio_id = e.id and yo.user_id = p_uid
  where e.id = p_espacio and yo.id is not null
$$;

-- Reingresar conserva el miembro_id. No revierte bajas de ninguna propuesta.
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
  where x.espacio_id = e.id and (x.user_id = v_uid or x.usuario_original_id = v_uid or x.id = p_miembro_id or (p_miembro_id is null and lower(x.nombre) = lower(v_vis)))
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

  -- Solo la sesión propietaria puede reactivar su asiento; nunca se libera para otra persona.
  select * into m from cruce.miembros x
  where x.espacio_id = e.id and x.usuario_original_id = v_uid and x.salio_en is not null;
  if found then
    if p_miembro_id is not null and p_miembro_id <> m.id then
      return cruce.err('entrada_incompleta', 'miembro_inexistente', null);
    end if;
    update cruce.miembros x set user_id = v_uid, salio_en = null where x.id = m.id;
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', e.id, 'miembro_id', m.id,
        'reclamo_asiento_simulado', false, 'reclamo_pendiente', false,
        'ya_era_miembro', false, 'repetido', false, 'reingreso', true),
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
             'cantidad_miembros', (select count(*) from cruce.miembros x where x.espacio_id = e.id and x.salio_en is null),
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

-- El código de invitación mantiene su preview mínimo; no expone actividad ni exmiembros.
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
      from cruce.miembros m where m.espacio_id = e.id and m.salio_en is null),
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

create or replace function cruce.elegibles_franja(p_prop uuid, p_clave text) returns setof uuid
language sql stable set search_path = '' as $$
  select m.id
  from cruce.propuestas p
  join cruce.miembros m on m.espacio_id = p.espacio_id
  join cruce.condiciones c on c.propuesta_id = p.id and c.miembro_id = m.id
  where p.id = p_prop and m.salio_en is null
    and not exists (select 1 from cruce.participaciones pa
                    where pa.propuesta_id = p.id and pa.miembro_id = m.id and pa.retirado)
    and cruce.condiciones_estado(c.disponibilidad) = 'completas'
    and c.disponibilidad ->> p_clave = 'si'
$$;

-- No aceptar a un exmiembro como imprescindible de una propuesta nueva.
create or replace function public.create_proposal(
  p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer,
  p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid, p_actividad text default null,
  p_regla text default null, p_ronda_horas integer default null) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_tit text := btrim(p_titulo);
  v_el jsonb;
  v_ini timestamptz[] := array[]::timestamptz[];
  v_fin timestamptz[] := array[]::timestamptz[];
  v_etq text[] := array[]::text[];
  v_e text;
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
    -- E15 (E-d): etiqueta opcional del plan de esa franja (string; vacía = sin etiqueta; hasta 40).
    v_e := null;
    if v_el -> 'etiqueta' is not null and jsonb_typeof(v_el -> 'etiqueta') <> 'null' then
      if jsonb_typeof(v_el -> 'etiqueta') <> 'string' then
        return cruce.err('entrada_incompleta', 'formato_invalido', null);
      end if;
      v_e := nullif(btrim(v_el ->> 'etiqueta'), '');
      if char_length(v_e) > 40 then
        return cruce.err('entrada_incompleta', 'formato_invalido', null);
      end if;
    end if;
    v_etq := v_etq || v_e;
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
  -- E15: regla del motor y ronda de opiniones, opcionales.
  if p_regla is not null and p_regla not in ('temprana', 'mas_si') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_ronda_horas is not null and p_ronda_horas not in (2, 12, 24) then
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
    || case when p_actividad is not null then jsonb_build_object('p_actividad', p_actividad) else '{}'::jsonb end
    -- E15: igual, solo si vienen.
    || case when p_regla is not null then jsonb_build_object('p_regla', p_regla) else '{}'::jsonb end
    || case when p_ronda_horas is not null then jsonb_build_object('p_ronda_horas', p_ronda_horas) else '{}'::jsonb end;
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
  if not exists (select 1 from cruce.miembros m where m.id = p_imprescindible_id and m.espacio_id = p_espacio_id and m.salio_en is null) then
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
                                zona_horaria, plazo, estado, state_rev, creada_en, actividad, regla, ronda_horas)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1, cruce.ahora(), p_actividad, coalesce(p_regla, 'temprana'), p_ronda_horas)
  returning id into v_prop;
  insert into cruce.franjas (propuesta_id, clave, inicio, fin, etiqueta)
  values (v_prop, 'A', v_ini[1], v_fin[1], v_etq[1]), (v_prop, 'B', v_ini[2], v_fin[2], v_etq[2]);
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

-- Excluir exmiembros del universo del agente, manteniendo sus condiciones privadas.
create or replace function public.proponer_plan_borrador(p_espacio_id uuid, p_sabado date, p_clima jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_hoy date;
  v_sab text;
  v_dom text;
  v_rol text;
  v_yo uuid;
  v_n integer;
  v_n_otros integer;
  v_max_precio integer;
  v_techo boolean;
  v_con integer;
  v_tranq integer;
  v_fiesta integer;
  v_amb_tranq integer;
  v_con_o integer;
  v_tranq_o integer;
  v_fiesta_o integer;
  v_amb_tranq_o integer;
  v_energia text;
  v_ambiente text;
  v_energia_o text;
  v_ambiente_o text;
  v_max_marcas_o integer;
  v_clima_malo boolean;
  v_n_viaje integer;
  v_llevan integer;
  v_autos integer;
  v_modo_llevan text;
  v_m_manana integer;
  v_m_tarde integer;
  v_m_noche integer;
  -- E14
  v_prop text;
  v_fam text;
  v_posibles integer;
  v_quorum jsonb;
  c record;
  v_frases jsonb;
  v_cand jsonb;
  v_candidatas jsonb := '[]'::jsonb;
  v_primera jsonb;
  v_perfil jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_sabado is null or p_clima is null or jsonb_typeof(p_clima) <> 'object'
     or jsonb_typeof(p_clima -> 'sabado') is distinct from 'string'
     or jsonb_typeof(p_clima -> 'domingo') is distinct from 'string' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_sab := p_clima ->> 'sabado';
  v_dom := p_clima ->> 'domingo';
  if v_sab not in ('seco', 'lluvia', 'desconocido') or v_dom not in ('seco', 'lluvia', 'desconocido') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_hoy := (cruce.ahora() at time zone 'America/Santiago')::date;
  if extract(isodow from p_sabado) <> 6 or p_sabado <= v_hoy or p_sabado > v_hoy + 16 then
    return cruce.err('entrada_incompleta', 'fecha_invalida', null);
  end if;
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.salio_en is null and m.user_id = v_uid;
  if v_rol is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  -- E14: propósito del grupo y personas posibles (sin pendientes, que no cuentan para nada).
  select e.proposito into v_prop from cruce.espacios e where e.id = p_espacio_id;
  v_fam := cruce.familia_de_proposito(v_prop);
  -- 0050: una clave que es a la vez actividad y familia ("cultura") vale como familia (contrato E14 (b)): sin +3,
  -- sin frase proposito_del_grupo y sin quórum. Desde acá v_prop es solo la actividad concreta, o null.
  v_prop := case when v_prop = v_fam then null else v_prop end;
  select count(*) into v_posibles from cruce.miembros m where m.espacio_id = p_espacio_id and m.salio_en is null and not m.pendiente;

  -- Universo: miembros del espacio con preferencias (reales o simulados) que dejan usarlas al agente (E8).
  select count(*),
         min(case pr.presupuesto when 'ojala_gratis' then 0 when 'algo_barato' then 1 else 2 end),
         coalesce(bool_or(pr.lugar = 'bajo_techo'), false),
         count(*) filter (where pr.energia = 'con_todo'), count(*) filter (where pr.energia = 'algo_tranquilo'),
         count(*) filter (where pr.ambiente = 'fiesta'), count(*) filter (where pr.ambiente = 'tranquilo'),
         -- E10: viaje (solo con zona y movilidad) y momento.
         count(*) filter (where pr.zona is not null and pr.movilidad is not null),
         count(*) filter (where pr.zona is not null and pr.movilidad = 'me_llevan'),
         count(*) filter (where pr.zona is not null and pr.movilidad = 'auto_con_lugar'),
         count(*) filter (where pr.momento = 'manana'), count(*) filter (where pr.momento = 'tarde'),
         count(*) filter (where pr.momento = 'noche')
    into v_n, v_max_precio, v_techo, v_con, v_tranq, v_fiesta, v_amb_tranq,
         v_n_viaje, v_llevan, v_autos, v_m_manana, v_m_tarde, v_m_noche
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
  where pr.espacio_id = p_espacio_id and pr.usar_en_agente;
  if v_n < 2 then
    return cruce.err('entrada_incompleta', 'pocas_preferencias', null);
  end if;
  v_energia := case when v_con > v_tranq then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente := case when v_fiesta > v_amb_tranq then 'fiesta' when v_amb_tranq > v_fiesta then 'tranquilo' end;
  v_clima_malo := v_sab in ('lluvia', 'desconocido') or v_dom in ('lluvia', 'desconocido');
  -- E10, regla 1: cada auto con lugar lleva hasta 3; si alcanzan, quien necesita que lo lleven va en auto.
  v_modo_llevan := case when v_autos >= ceil(v_llevan / 3.0) then 'auto' else 'transporte_publico' end;

  -- E7.4: lo mismo sin quien llama. Con esto se calculan perfil_grupo, los umbrales (personas > 3,
  -- cuantos >= 2) y el_mas_elegido: el voto propio no puede hacer visible lo que eligió una sola persona más.
  select count(*),
         count(*) filter (where pr.energia = 'con_todo'), count(*) filter (where pr.energia = 'algo_tranquilo'),
         count(*) filter (where pr.ambiente = 'fiesta'), count(*) filter (where pr.ambiente = 'tranquilo')
    into v_n_otros, v_con_o, v_tranq_o, v_fiesta_o, v_amb_tranq_o
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
  where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo;
  v_energia_o := case when v_con_o > v_tranq_o then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente_o := case when v_fiesta_o > v_amb_tranq_o then 'fiesta' when v_amb_tranq_o > v_fiesta_o then 'tranquilo' end;
  select max(x.n) into v_max_marcas_o
  from (select a, count(*) as n
        from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
        cross join unnest(pr.me_gustaria) a
        where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo group by a) x;

  -- 1. descarte · 2. puntaje · 3. orden de elección; las 3 primeras son las candidatas.
  -- E7.1: con 3 personas o menos las marcas no pesan en el orden, y el_mas_elegido exige más de 3 personas
  -- y al menos 2 marcas. E7.4: esas personas y esas marcas son las de los demás (sin quien llama). El puntaje
  -- en sí (marcas, energía, ambiente) y los descartes siguen usando a todos los que tienen preferencias.
  -- E10: descarte por tiempo máximo de viaje, castigo por viaje largo, momento del día y desempate por equidad.
  for c in
    select k.*, (v_n_otros > 3 and k.marcas_otros >= 2 and k.marcas_otros = v_max_marcas_o) as el_mas_elegido
    from (
      select cat.*,
             case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end as precio_n,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and cat.actividad = any (pr.me_gustaria)) as marcas,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo
                and cat.actividad = any (pr.me_gustaria)) as marcas_otros,
             (cat.energia = v_energia) as suma_energia,
             coalesce(cat.ambiente = v_ambiente, false) as suma_ambiente,
             -- #54: ritmo_del_grupo compara contra la mayoría de los demás, como perfil_grupo (E7.4).
             (cat.energia = v_energia_o) as ritmo_energia,
             coalesce(cat.ambiente = v_ambiente_o, false) as ritmo_ambiente,
             ((not cat.techado and v_sab = 'seco' and v_dom = 'seco')
              or (cat.techado and (v_sab = 'lluvia' or v_dom = 'lluvia'))) as suma_clima,
             -- E10, regla 4: momento del inicio de la franja.
             2 * case when cat.sab_inicio < time '13:00' then v_m_manana
                      when cat.sab_inicio < time '19:00' then v_m_tarde
                      else v_m_noche end as suma_momento,
             v.viaje_max, v.viaje_suma, coalesce(v.lejos, false) as lejos
      from cruce.catalogo_agente cat
      left join lateral (
        select max(t.minutos) as viaje_max, sum(t.minutos) as viaje_suma,
               bool_or(pr.tiempo_max is not null and pr.tiempo_max <> '60' and t.minutos > pr.tiempo_max::int) as lejos
        from cruce.preferencias pr
        join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
        join cruce.tiempos_zona t on t.origen = pr.zona and t.destino = cat.zona
          and t.modo = case pr.movilidad when 'auto_con_lugar' then 'auto' when 'auto_sin_lugar' then 'auto'
                                         when 'me_llevan' then v_modo_llevan else pr.movilidad end
        where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.zona is not null and pr.movilidad is not null
      ) v on true
      where cat.sab_inicio is not null and cat.dom_inicio is not null
        and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
        and not (not cat.techado and v_techo and v_clima_malo)
        -- E14 (d): en un grupo con propósito, solo su familia y solo lo que alcanza con el grupo actual.
        and (v_fam = 'libre' or (cat.familia = v_fam and cat.personas_min <= v_posibles))
    ) k
    where not k.lejos
    order by 3 * (case when v_n_otros > 3 then k.marcas else 0 end)
             + k.suma_energia::int + k.suma_ambiente::int + k.suma_clima::int + k.suma_momento
             -- E14 (d): lo que el grupo vino a hacer suma como una elección más.
             + case when v_fam <> 'libre' and k.actividad = v_prop then 3 else 0 end
             - coalesce(greatest(k.viaje_max - 30, 0) / 15, 0) desc,
             coalesce(k.viaje_max, 0), coalesce(k.viaje_suma, 0), k.precio_n, k.orden
    limit 3
  loop
    v_frases := '[]'::jsonb;
    if v_n_otros > 3 then
      v_frases := v_frases || '"presupuesto_todos"'::jsonb;
    end if;
    if c.techado then
      v_frases := v_frases || '"bajo_techo"'::jsonb;
    elsif v_sab = 'seco' and v_dom = 'seco' then
      v_frases := v_frases || '"al_aire_libre_con_buen_tiempo"'::jsonb;
    end if;
    if c.el_mas_elegido then
      v_frases := v_frases || '"el_mas_elegido"'::jsonb;
    end if;
    if v_n_otros > 3 and c.ritmo_energia and c.ritmo_ambiente then
      v_frases := v_frases || '"ritmo_del_grupo"'::jsonb;
    end if;
    -- E14 (d)
    if v_fam <> 'libre' and c.actividad = v_prop then
      v_frases := v_frases || '"proposito_del_grupo"'::jsonb;
    end if;
    v_cand := jsonb_build_object(
      'id', c.id,
      'actividad', c.actividad,
      'actividad_etiqueta', c.actividad_etiqueta,
      'lugar', jsonb_build_object('id', c.id, 'nombre', c.lugar_nombre, 'simulado', true),
      'titulo', c.titulo_plantilla,
      'franjas', cruce.plan_franjas(p_sabado, c.sab_inicio, c.sab_fin, c.dom_inicio, c.dom_fin),
      'frases_grupo', v_frases,
      -- E10: un solo número, solo con 4 o más personas con zona y movilidad.
      'viaje', case when v_n_viaje >= 4 and c.viaje_max is not null
                    then jsonb_build_object('max_minutos', c.viaje_max, 'estimado', true) end,
      -- E14 (d)
      'familia', c.familia,
      'personas', jsonb_build_object('min', c.personas_min, 'max', c.personas_max));
    v_candidatas := v_candidatas || jsonb_build_array(v_cand);
  end loop;

  if jsonb_array_length(v_candidatas) = 0 then
    -- E14 (ajuste 6): en un grupo con propósito, primero si hay de la familia, después si alcanza el grupo.
    if v_fam <> 'libre' then
      if not exists (select 1 from cruce.catalogo_agente cat
                     where cat.familia = v_fam and cat.sab_inicio is not null and cat.dom_inicio is not null
                       and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                       and not (not cat.techado and v_techo and v_clima_malo)) then
        return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('tipo', 'sin_plan_compatible')));
      end if;
      if not exists (select 1 from cruce.catalogo_agente cat
                     where cat.familia = v_fam and cat.personas_min <= v_posibles
                       and cat.sab_inicio is not null and cat.dom_inicio is not null
                       and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                       and not (not cat.techado and v_techo and v_clima_malo)) then
        return cruce.ok(jsonb_build_object('resultado', jsonb_build_object(
          'tipo', 'sin_plan_compatible', 'motivo', 'faltan_personas')));
      end if;
    end if;
    -- E10: si había lugares por precio y techo pero todos quedaron lejos para alguien, se dice sin decir para quién.
    if exists (select 1 from cruce.catalogo_agente cat
               where cat.sab_inicio is not null and cat.dom_inicio is not null
                 and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                 and not (not cat.techado and v_techo and v_clima_malo)
                 and (v_fam = 'libre' or (cat.familia = v_fam and cat.personas_min <= v_posibles))) then
      return cruce.ok(jsonb_build_object('resultado', jsonb_build_object(
        'tipo', 'sin_plan_compatible', 'motivo', 'sin_lugar_cerca_para_todos')));
    end if;
    return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('tipo', 'sin_plan_compatible')));
  end if;

  -- perfil_grupo: solo agregados de los demás (E7.4: sin quien llama); con 3 personas o menos, solo la
  -- cantidad; gustos solo con cuantos >= 2 (#28); sin presupuesto_grupo (E7.4, hallazgo 7). E10: sin zona,
  -- movilidad ni momento.
  if v_n_otros <= 3 then
    v_perfil := jsonb_build_object('personas', v_n_otros);
  else
    v_perfil := jsonb_build_object(
      'personas', v_n_otros,
      'gustos', (
        select coalesce(jsonb_agg(jsonb_build_object('actividad_etiqueta', g.etiqueta, 'cuantos', g.n)
                                  order by g.n desc, g.orden), '[]'::jsonb)
        from (select cat.actividad_etiqueta as etiqueta, min(cat.orden) as orden, count(distinct pr.miembro_id) as n
              from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
              cross join unnest(pr.me_gustaria) a
              join cruce.catalogo_agente cat on cat.actividad = a
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo
              group by cat.actividad_etiqueta
              -- #28: una actividad elegida por una sola persona no sale (ni como total).
              having count(distinct pr.miembro_id) >= 2) g),
      'energia_mayoritaria', v_energia_o,
      'ambiente_mayoritario', v_ambiente_o);
  end if;

  -- E14 (d): si el propósito es una actividad concreta que quedó afuera por tamaño del grupo, se avisa (sin culpas;
  -- los dos números ya son públicos: miembros del espacio y catálogo).
  select jsonb_build_object('actividad', c2.actividad, 'etiqueta', min(c2.actividad_etiqueta),
                            'personas_min', min(c2.personas_min), 'personas_posibles', v_posibles)
    into v_quorum
  from cruce.catalogo_agente c2
  where v_fam <> 'libre' and c2.actividad = v_prop and c2.personas_min > v_posibles
  group by c2.actividad;

  v_primera := v_candidatas -> 0;
  return cruce.ok(jsonb_build_object('resultado', jsonb_build_object(
    'tipo', 'borrador',
    'actividad', v_primera -> 'actividad',
    'actividad_etiqueta', v_primera -> 'actividad_etiqueta',
    'lugar', v_primera -> 'lugar',
    'titulo', v_primera -> 'titulo',
    'franjas', v_primera -> 'franjas',
    'clima', jsonb_build_object('sabado', v_sab, 'domingo', v_dom),
    'frases_grupo', v_primera -> 'frases_grupo',
    'viaje', v_primera -> 'viaje',
    'personas_consideradas', v_n,
    'quorum', v_quorum,
    'candidatas', v_candidatas,
    'perfil_grupo', v_perfil)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('proponer_plan_borrador', sqlstate, v_ctx);
end
$$;

-- Excluir exmiembros del universo del agente, manteniendo sus condiciones privadas.
create or replace function public.agente_social_contexto(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and m.salio_en is null and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_org := cruce.organizador_de(p_espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  return cruce.ok(jsonb_build_object(
    'localidad', (select e.localidad from cruce.espacios e where e.id = p_espacio_id),
    'zona_horaria', 'America/Santiago',
    'politica', cruce.politica_agente(p_espacio_id),
    'personas_autorizadas', (select count(*) from cruce.preferencias pr
                             join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
                             where pr.espacio_id = p_espacio_id and pr.usar_en_agente),
    'destinatarios', (select count(*) from cruce.miembros m
                      where m.espacio_id = p_espacio_id and m.salio_en is null and m.recibir_invitaciones_agente and m.id <> v_org
                        -- 0055: en una demo, los simulados también cuentan; los pendientes, nunca.
                        and (m.user_id is not null
                             or (m.simulado and exists (select 1 from cruce.espacios e where e.id = m.espacio_id and e.demo))))));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('agente_social_contexto', sqlstate, v_ctx);
end
$$;

-- Excluir exmiembros del universo del agente, manteniendo sus condiciones privadas.
create or replace function cruce.plan_agente(p_esp uuid, p_sabado date, p_ref text, p_texto text, p_org uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  o cruce.opciones_agente%rowtype;
  c cruce.catalogo_agente%rowtype;
  v_franjas jsonb;
  v_max integer;
  v_plazo timestamptz;
  v_dest jsonb;
  v_plan jsonb;
  v_fam text;
begin
  select * into o from cruce.opciones_agente x where x.opcion_ref = p_ref and x.espacio_id = p_esp and x.sabado = p_sabado;
  if not found then
    return null;
  end if;
  select * into c from cruce.catalogo_agente k where k.id = o.catalogo_id;
  v_franjas := cruce.plan_franjas(p_sabado, c.sab_inicio, c.sab_fin, c.dom_inicio, c.dom_fin);
  select least(20, count(*)) into v_max from cruce.miembros m where m.espacio_id = p_esp and m.salio_en is null;
  select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_esp;
  v_plazo := cruce.parse_hora_local(v_franjas #>> '{0,inicio}') - interval '3 hours';
  select coalesce(jsonb_agg(m.id order by m.id), '[]'::jsonb) into v_dest
  from cruce.miembros m
  where m.espacio_id = p_esp and m.salio_en is null and m.recibir_invitaciones_agente and m.id <> p_org
    -- 0055: en una demo, los simulados también reciben invitaciones; los pendientes (sin sesión y no simulados) nunca.
    and (m.user_id is not null
         or (m.simulado and exists (select 1 from cruce.espacios e where e.id = m.espacio_id and e.demo)));
  -- Capacidad: el máximo cuenta a todas las personas del espacio (reales, simuladas y pendientes). Los pendientes
  -- (sin sesión) nunca son destinatarios ni suman nada: solo ocupan lugar posible.
  v_plan := jsonb_build_object(
    'espacio_id', p_esp, 'sabado', p_sabado, 'opcion_ref', p_ref, 'catalogo_id', o.catalogo_id,
    'clima', o.clima, 'titulo', c.titulo_plantilla, 'lugar', jsonb_build_object('nombre', c.lugar_nombre, 'simulado', true),
    'franjas', v_franjas,
    -- E14 (ajuste 9): con propósito, el mínimo no baja del quórum de la actividad, acotado por el máximo. 0050: en
    -- libre, como antes (el máximo cuenta pendientes y un mínimo alto podría quedar inalcanzable).
    'minimo', case when v_fam = 'libre' then least(3, greatest(v_max, 2))
                   else least(greatest(least(3, greatest(v_max, 2)), c.personas_min), greatest(v_max, 2)) end,
    'maximo', greatest(v_max, 2),
    'actividad', c.actividad,
    'imprescindible', cruce.miembro_ref(p_org),
    'plazo', to_char(v_plazo at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI'),
    'texto', p_texto, 'destinatarios', v_dest);
  return v_plan || jsonb_build_object(
    'hash', encode(sha256(convert_to(v_plan::text, 'UTF8')), 'hex'),
    'plazo_ts', v_plazo,
    -- Lo visible para quien aprueba: sin ids de destinatarios, solo cuántos.
    'visible', jsonb_build_object(
      'titulo', v_plan -> 'titulo', 'lugar', v_plan -> 'lugar', 'franjas', v_franjas, 'actividad', c.actividad,
      'minimo', v_plan -> 'minimo', 'maximo', v_plan -> 'maximo', 'plazo', v_plan -> 'plazo',
      'imprescindible', jsonb_build_object('nombre', v_plan #> '{imprescindible,nombre}'),
      'invitados', jsonb_array_length(v_dest)));
end
$$;

create or replace function cruce.intento_previo(p_uid uuid, p_intento uuid, p_op text, p_params jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  i cruce.intentos%rowtype;
  v_yo uuid;
  v_gen bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('cruce:intento:' || p_uid::text || ':' || p_intento::text, 0));
  select * into i from cruce.intentos t where t.user_id = p_uid and t.intento_id = p_intento;
  if not found then
    return null;
  end if;
  if i.espacio_id is not null and not exists (
    select 1 from cruce.miembros m where m.espacio_id = i.espacio_id and m.user_id = p_uid
  ) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if i.operacion <> p_op or i.parametros <> p_params then
    return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
  end if;
  perform cruce.fijar_ahora();
  if p_op = 'reset_demo' then
    -- Repetición del mismo reinicio: devuelve la respuesta original y no borra nada nuevo.
    return cruce.ok(jsonb_build_object(
      'resultado', (i.respuesta -> 'resultado') || '{"repetido": true}'::jsonb,
      'generacion', i.respuesta -> 'generacion',
      'espacio', cruce.espacio_json(i.espacio_id, p_uid)));
  end if;
  select e.generacion into v_gen from cruce.espacios e where e.id = i.espacio_id;
  if i.propuesta_id is null or (i.generacion is not null and v_gen is not null and i.generacion < v_gen) then
    -- Tombstone: la propuesta fue eliminada por un reinicio. Nunca se resucita.
    return cruce.err('intento_obsoleto', 'intento_obsoleto', null);
  end if;
  select m.id into v_yo
  from cruce.propuestas p join cruce.miembros m on m.espacio_id = p.espacio_id and m.user_id = p_uid
  where p.id = i.propuesta_id;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.vencer(i.propuesta_id);
  if i.respuesta ->> 'tipo' = 'error' then
    return cruce.err(i.respuesta ->> 'codigo', i.respuesta ->> 'detalle', cruce.state_rev(i.propuesta_id));
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', (i.respuesta -> 'resultado') || '{"repetido": true}'::jsonb,
    'propuesta', cruce.vista_propuesta(i.propuesta_id, v_yo)));
end
$$;

create or replace function cruce.intento_agente(p_uid uuid, p_intento uuid, p_op text, p_params jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  i cruce.intentos%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('cruce:intento:' || p_uid::text || ':' || p_intento::text, 0));
  select * into i from cruce.intentos t where t.user_id = p_uid and t.intento_id = p_intento;
  if not found then
    return null;
  end if;
  if i.espacio_id is not null and not exists (
    select 1 from cruce.miembros m where m.espacio_id = i.espacio_id and m.user_id = p_uid
  ) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if i.operacion <> p_op or i.parametros <> p_params then
    return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
  end if;
  perform cruce.fijar_ahora();
  return cruce.ok(i.respuesta || jsonb_build_object('repetido', true));
end
$$;

create or replace function cruce.mensaje(p_codigo text, p_detalle text) returns text
language sql immutable set search_path = '' as $$
  select case p_codigo || '/' || p_detalle
    when 'no_autorizado/organizador_no_puede_salir' then 'Quien organiza el grupo no puede salir todavía: primero hace falta transferir la organización.'
    when 'no_autorizado/organizador_con_planes_activos' then 'Antes de salir, cancelá los planes que organizás y siguen activos.'
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
    -- E15
    when 'opcion_desactualizada/ronda_abierta' then 'La ronda de opiniones sigue abierta. Cuando cierre vas a poder rearmar con lo nuevo.'
    when 'plazo_vencido/ronda_cerrada' then 'La ronda de opiniones ya cerró. Todavía puedes confirmar o retirarte.'
    when 'entrada_incompleta/fuera_de_proposito' then 'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'
    when 'sin_alternativa/tope_versiones' then 'Esta propuesta ya tuvo tres versiones. El organizador puede cerrarla o cancelarla.'
  end
$$;

-- Salida explícita e idempotente. El registro de intento de salida solo devuelve IDs propios,
-- nunca una vista guardada del grupo; repetirlo después de reingresar no vuelve a ejecutar la salida.
create or replace function public.leave_space(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  m cruce.miembros%rowtype;
  i cruce.intentos%rowtype;
  p record;
  v_params jsonb := jsonb_build_object('p_espacio_id', p_espacio_id);
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cruce:intento:' || v_uid::text || ':' || p_intento_id::text, 0));
  select * into i from cruce.intentos x where x.user_id = v_uid and x.intento_id = p_intento_id;
  if found then
    if i.operacion <> 'leave_space' or i.parametros <> v_params then
      return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
    end if;
    return cruce.ok(jsonb_build_object('resultado', (i.respuesta -> 'resultado') || jsonb_build_object('repetido', true)));
  end if;
  select * into m from cruce.miembros x
  where x.espacio_id = p_espacio_id and (x.user_id = v_uid or x.usuario_original_id = v_uid)
  for update;
  if not found then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if m.rol = 'organizador' then
    return cruce.err('no_autorizado', 'organizador_no_puede_salir', null);
  end if;
  perform 1 from cruce.propuestas x where x.espacio_id = p_espacio_id order by x.id for update;
  perform cruce.fijar_ahora();
  if m.salio_en is null then
    -- Primero vencer las propuestas que ya cerraron, como hacen las otras operaciones del motor.
    for p in select x.id from cruce.propuestas x where x.espacio_id = p_espacio_id order by x.id loop
      perform cruce.vencer(p.id);
    end loop;
    if exists (select 1 from cruce.propuestas x
               where x.espacio_id = p_espacio_id and x.organizador_id = m.id
                 and x.estado in ('borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision')) then
      return cruce.err('no_autorizado', 'organizador_con_planes_activos', null);
    end if;
    -- Solo hay baja pública de un plan cuando la persona ya tenía alguna participación real.
    for p in select x.id from cruce.propuestas x
             where x.espacio_id = p_espacio_id
               and x.estado in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision')
               and (x.imprescindible_id = m.id
                    or exists (select 1 from cruce.participaciones pa where pa.propuesta_id = x.id and pa.miembro_id = m.id)
                    or exists (select 1 from cruce.condiciones c where c.propuesta_id = x.id and c.miembro_id = m.id)
                    or exists (select 1 from cruce.elegibles e where e.propuesta_id = x.id and e.miembro_id = m.id))
             order by x.id loop
      v_res := cruce.op_withdraw(v_uid, p.id, null, false);
      if not coalesce((v_res ->> 'ok')::boolean, false) then
        -- EXCEPTION revierte TODO el bloque: nunca una salida parcialmente aplicada.
        raise exception 'retiro de plan rechazado' using errcode = 'PZ001';
      end if;
    end loop;
    -- Los planes sin participación y los borradores no generan una baja pública ficticia.
    -- Aun así quedan retirados: reingresar al grupo nunca reactiva estos planes anteriores.
    insert into cruce.participaciones (propuesta_id, miembro_id, interesado, retirado, retirado_en)
    select x.id, m.id, false, true, cruce.ahora() from cruce.propuestas x
    where x.espacio_id = p_espacio_id
      and x.estado in ('borrador', 'reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision')
    on conflict (propuesta_id, miembro_id) do update
      set interesado = false, interes_en = null, retirado = true,
          retirado_en = coalesce(cruce.participaciones.retirado_en, cruce.ahora());
    update cruce.preferencias x set usar_en_agente = false where x.miembro_id = m.id;
    -- Todos los controles directos y centrales existentes usan user_id: null revoca el acceso de inmediato.
    update cruce.miembros x
      set user_id = null, salio_en = cruce.ahora(), recibir_invitaciones_agente = false
      where x.id = m.id;
  end if;
  v_res := jsonb_build_object('resultado', jsonb_build_object(
    'espacio_id', p_espacio_id, 'miembro_id', m.id, 'repetido', m.salio_en is not null));
  perform cruce.guardar_intento(v_uid, p_intento_id, 'leave_space', v_params,
    p_espacio_id, m.id, cruce.generacion(p_espacio_id), null, v_res);
  return cruce.ok(v_res);
exception
  when sqlstate 'PZ001' then
    return v_res;
  when others then
    get stacked diagnostics v_ctx = pg_exception_context;
    return cruce.fallo('leave_space', sqlstate, v_ctx);
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
    'opinar_version', 'leave_space'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 42 then
    raise exception 'A5: public no tiene exactamente 42 funciones';
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

revoke all on function public.leave_space(uuid, uuid) from public, anon, authenticated;
grant execute on function public.leave_space(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
notify pgrst, 'reload schema';
