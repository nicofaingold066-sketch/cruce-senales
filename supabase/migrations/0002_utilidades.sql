-- CRUCE · 0002 · Utilidades internas (esquema cruce, no expuesto)
-- Sobre de respuesta, mensajes, horas, vistas, motor, vencimiento perezoso e intentos.

-- Momento { utc, local } ------------------------------------------------------
create or replace function cruce.momento(t timestamptz) returns jsonb
language sql stable set search_path = '' as $$
  select case when t is null then null else jsonb_build_object(
    'utc',   to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'local', to_char(t at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI:SS')) end
$$;

-- HoraLocal "YYYY-MM-DDTHH:MM[:SS]" en America/Santiago -> timestamptz (null si es inválida)
create or replace function cruce.parse_hora_local(s text) returns timestamptz
language plpgsql stable set search_path = '' as $$
begin
  if s is null or s !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then
    return null;
  end if;
  return (replace(s, 'T', ' ')::timestamp) at time zone 'America/Santiago';
exception when others then
  return null;
end
$$;

-- Mensajes exactos (tabla 0.5 del contrato) ------------------------------------
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
    when 'plazo_vencido/plazo_vencido' then 'El plazo de aceptación ya cerró.'
    when 'sin_alternativa/sin_alternativa' then 'Sin opción compatible: no hay alternativa con las condiciones actuales.'
    when 'no_autorizado/no_es_organizador' then 'Solo el organizador de la propuesta puede hacer esto.'
    when 'no_autorizado/no_es_organizador_espacio' then 'Solo el organizador del espacio puede hacer esto.'
    when 'no_autorizado/retirado' then 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
    when 'no_autorizado/condiciones_congeladas' then 'Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente.'
    when 'no_autorizado/espacio_no_demo' then 'El reinicio solo está permitido en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
  end
$$;

-- Sobres -------------------------------------------------------------------------
create or replace function cruce.ok(p_extra jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('ok', true, 'contrato', 1, 'servidor_ahora', cruce.momento(now()))
         || coalesce(p_extra, '{}'::jsonb)
$$;

create or replace function cruce.err(p_codigo text, p_detalle text, p_state_rev integer) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ok', false, 'contrato', 1, 'servidor_ahora', cruce.momento(now()),
    'error', jsonb_build_object(
      'codigo', p_codigo, 'detalle', p_detalle,
      'mensaje', cruce.mensaje(p_codigo, p_detalle),
      'reintentable', p_codigo = 'fallo_temporal'),
    'state_rev', p_state_rev)
$$;

-- Registra una falla interna sin valores (solo sqlstate y contexto) y devuelve fallo_temporal.
create or replace function cruce.fallo(p_funcion text, p_sqlstate text, p_contexto text) returns jsonb
language plpgsql volatile set search_path = '' as $$
begin
  insert into cruce.errores_internos (funcion, sqlstate, contexto)
  values (p_funcion, p_sqlstate, left(p_contexto, 2000));
  return cruce.err('fallo_temporal', 'reintentar', null);
exception when others then
  return cruce.err('fallo_temporal', 'reintentar', null);
end
$$;

-- Código de invitación: 8 caracteres de ABCDEFGHJKMNPQRSTUVWXYZ23456789 ---------------
create or replace function cruce.generar_codigo() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea;
  r text;
  i integer;
begin
  loop
    -- bytes 0..5 de dos uuid v4 (aleatorios; se evitan los bytes de versión/variante)
    b := substr(uuid_send(gen_random_uuid()), 1, 6) || substr(uuid_send(gen_random_uuid()), 1, 2);
    r := '';
    for i in 0..7 loop
      r := r || substr(alfabeto, (get_byte(b, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from cruce.espacios e where e.codigo_invitacion = r);
  end loop;
  return r;
end
$$;

-- Referencias y objetos de respuesta ----------------------------------------------
create or replace function cruce.miembro_ref(p_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('miembro_id', m.id, 'nombre', m.nombre, 'simulado', m.simulado)
  from cruce.miembros m where m.id = p_id
$$;

create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
    'codigo_invitacion', e.codigo_invitacion,
    'creado_en', cruce.momento(e.creado_en),
    'ultimo_reinicio', cruce.momento(e.ultimo_reinicio),
    'mi_miembro_id', yo.id, 'mi_rol', yo.rol,
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre, 'rol', m.rol, 'simulado', m.simulado,
               'es_yo', coalesce(m.user_id = p_uid, false)) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id))
  from cruce.espacios e
  left join cruce.miembros yo on yo.espacio_id = e.id and yo.user_id = p_uid
  where e.id = p_espacio
$$;

-- Condiciones: normalización y estado (las franjas son siempre A y B en este corte) ---
create or replace function cruce.disp_normalizada(p_disp jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'A', coalesce(p_disp ->> 'A', 'pendiente'),
    'B', coalesce(p_disp ->> 'B', 'pendiente'))
$$;

create or replace function cruce.condiciones_estado(p_disp jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_disp is null then 'sin_cargar'
    when coalesce(p_disp ->> 'A', '') in ('si', 'no') and coalesce(p_disp ->> 'B', '') in ('si', 'no') then 'completas'
    else 'incompletas' end
$$;

-- Valida forma de Disponibilidad: null si es válida, o el detalle del error.
create or replace function cruce.validar_disponibilidad(p_disp jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_disp is null then 'campo_faltante'
    when jsonb_typeof(p_disp) <> 'object' then 'formato_invalido'
    when exists (
      select 1 from jsonb_each(p_disp) kv
      where kv.key not in ('A', 'B')
         or jsonb_typeof(kv.value) <> 'string'
         or (kv.value #>> '{}') not in ('si', 'no', 'pendiente')) then 'disponibilidad_invalida'
    else null end
$$;

-- Eventos ----------------------------------------------------------------------------
create or replace function cruce.evento(
  p_prop uuid, p_tipo text, p_actor uuid, p_actor_tipo text, p_ejecutado_por uuid,
  p_estado_previo text, p_estado_nuevo text, p_version_previa integer, p_version_nueva integer,
  p_state_rev integer) returns void
language sql volatile set search_path = '' as $$
  insert into cruce.eventos (propuesta_id, tipo, actor_id, actor_tipo, ejecutado_por, en,
                             estado_previo, estado_nuevo, version_previa, version_nueva, state_rev)
  values (p_prop, p_tipo, p_actor, p_actor_tipo, p_ejecutado_por, now(),
          p_estado_previo, p_estado_nuevo, p_version_previa, p_version_nueva, p_state_rev)
$$;

-- Vencimiento perezoso (0.6) -----------------------------------------------------------
create or replace function cruce.vencer(p_prop uuid) returns void
language plpgsql volatile set search_path = '' as $$
declare
  v_estado text;
  v_version integer;
  v_rev integer;
begin
  select p.estado, p.version_vigente into v_estado, v_version
  from cruce.propuestas p
  where p.id = p_prop and now() >= p.plazo
    and p.estado in ('borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision')
  for update;
  if not found then
    return;
  end if;
  update cruce.propuestas p set estado = 'expirado', state_rev = p.state_rev + 1
  where p.id = p_prop returning p.state_rev into v_rev;
  perform cruce.evento(p_prop, 'propuesta_expirada', null, 'sistema', null,
                       v_estado, 'expirado', v_version, v_version, v_rev);
end
$$;

-- Abre una propuesta para el usuario: (opcional) bloqueo de fila, pertenencia y vencimiento.
-- Devuelve el miembro_id del llamador o null si la propuesta no existe o no es miembro.
create or replace function cruce.abrir_propuesta(p_prop uuid, p_uid uuid, p_bloquear boolean) returns uuid
language plpgsql volatile set search_path = '' as $$
declare
  v_espacio uuid;
  v_yo uuid;
begin
  if p_bloquear then
    select p.espacio_id into v_espacio from cruce.propuestas p where p.id = p_prop for update;
  else
    select p.espacio_id into v_espacio from cruce.propuestas p where p.id = p_prop;
  end if;
  if v_espacio is null then
    return null;
  end if;
  select m.id into v_yo from cruce.miembros m where m.espacio_id = v_espacio and m.user_id = p_uid;
  if v_yo is null then
    return null;
  end if;
  perform cruce.vencer(p_prop);
  return v_yo;
end
$$;

-- Motor -------------------------------------------------------------------------------
-- Elegibles en una franja: miembro actual, no retirado, condiciones completas y "si" en la franja.
create or replace function cruce.elegibles_franja(p_prop uuid, p_clave text) returns setof uuid
language sql stable set search_path = '' as $$
  select m.id
  from cruce.propuestas p
  join cruce.miembros m on m.espacio_id = p.espacio_id
  join cruce.condiciones c on c.propuesta_id = p.id and c.miembro_id = m.id
  where p.id = p_prop
    and not exists (select 1 from cruce.participaciones pa
                    where pa.propuesta_id = p.id and pa.miembro_id = m.id and pa.retirado)
    and cruce.condiciones_estado(c.disponibilidad) = 'completas'
    and c.disponibilidad ->> p_clave = 'si'
$$;

-- Franja elegida: viable (>= mínimo y con imprescindible), la de inicio más temprano; empate por clave.
create or replace function cruce.motor(p_prop uuid) returns text
language sql stable set search_path = '' as $$
  select f.clave
  from cruce.franjas f
  join cruce.propuestas p on p.id = f.propuesta_id
  where f.propuesta_id = p_prop
    and (select count(*) from cruce.elegibles_franja(p_prop, f.clave)) >= p.minimo
    and p.imprescindible_id in (select e from cruce.elegibles_franja(p_prop, f.clave) e)
  order by f.inicio, f.clave
  limit 1
$$;

-- Publica la versión N+1 con la foto de elegibles de esa franja. Devuelve el número de versión.
create or replace function cruce.publicar_version(p_prop uuid, p_clave text) returns integer
language plpgsql volatile set search_path = '' as $$
declare
  v integer;
begin
  select coalesce(p.version_vigente, 0) + 1 into v from cruce.propuestas p where p.id = p_prop;
  insert into cruce.versiones (propuesta_id, version, franja_clave, publicada_en)
  values (p_prop, v, p_clave, now());
  insert into cruce.elegibles (propuesta_id, version, miembro_id)
  select p_prop, v, e from cruce.elegibles_franja(p_prop, p_clave) e;
  update cruce.propuestas p set version_vigente = v where p.id = p_prop;
  return v;
end
$$;

-- Situación de un miembro en una propuesta (mi_situacion y panel de simulación) -----------
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
  v_hay_sim boolean;
  v_vencido boolean;
  v_activo boolean;
  v_con_op boolean;
  v_es_org boolean;
  v_es_org_esp boolean;
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
    select count(*) into v_conf from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = p.version_vigente and a.vigente;
  end if;
  v_es_org := p.organizador_id = p_m;
  v_es_org_esp := m.rol = 'organizador';
  v_hay_sim := exists (select 1 from cruce.miembros x where x.espacio_id = p.espacio_id and x.simulado);
  v_vencido := now() >= p.plazo;
  v_activo := p.estado in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision');
  v_con_op := p.estado in ('esperando_compromisos', 'grupo_confirmado');
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
    'puede', jsonb_build_object(
      'abrir', v_es_org and p.estado = 'borrador' and not v_vencido,
      'marcar_interes', v_activo and not v_ret and not v_vencido,
      'guardar_condiciones', v_activo and not v_ret and not v_vencido and not (v_con_op and coalesce(v_eleg, false)),
      'evaluar', v_es_org and p.estado = 'reuniendo_interes' and not v_vencido,
      'aceptar', v_con_op and coalesce(v_eleg, false) and not v_ret and not v_acepte and not v_vencido
                 and (p.maximo - v_conf) > 0,
      'retirarme', not v_ret and (
                     (p.estado in ('reuniendo_interes', 'esperando_compromisos', 'en_revision') and not v_vencido)
                     or p.estado = 'grupo_confirmado'),
      'proponer_reparacion', v_es_org and p.estado = 'en_revision' and not v_vencido,
      'cancelar', v_es_org and p.estado not in ('expirado', 'cancelado'),
      'simular', v_es_org_esp and v_activo and v_hay_sim));
end
$$;

-- EstadoPropuesta (vista compartida + mi_situacion del llamador) ----------------------------
create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
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
        'pendientes', v_pend));
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
    'plazo_vencido', now() >= p.plazo,
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
    'personas_con_condiciones', (
      select count(*) from cruce.condiciones c
      where c.propuesta_id = p.id and cruce.condiciones_estado(c.disponibilidad) = 'completas'
        and not exists (select 1 from cruce.participaciones pa
                        where pa.propuesta_id = p.id and pa.miembro_id = c.miembro_id and pa.retirado)),
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

-- PropuestaResumen (list_proposals)
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
    'mi_situacion', jsonb_build_object(
      'interesado', v #> '{mi_situacion,interesado}',
      'retirado', v #> '{mi_situacion,retirado}',
      'acepte_version', v #> '{mi_situacion,acepte_version}',
      'puede_aceptar', v #> '{mi_situacion,puede,aceptar}'));
end
$$;

-- Intentos idempotentes (0.7) --------------------------------------------------------------
-- Serializa por (usuario, intento). Devuelve null si el intento es nuevo; si no, la respuesta final.
create or replace function cruce.intento_previo(p_uid uuid, p_intento uuid, p_op text, p_params jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  i cruce.intentos%rowtype;
  v_yo uuid;
  v_rev integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_uid::text || ':' || p_intento::text, 0));
  select * into i from cruce.intentos t where t.user_id = p_uid and t.intento_id = p_intento;
  if not found then
    return null;
  end if;
  if i.operacion <> p_op or i.parametros <> p_params then
    return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
  end if;
  v_yo := cruce.abrir_propuesta(i.propuesta_id, p_uid, false);
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select p.state_rev into v_rev from cruce.propuestas p where p.id = i.propuesta_id;
  if i.respuesta ->> 'tipo' = 'error' then
    return cruce.err(i.respuesta ->> 'codigo', i.respuesta ->> 'detalle', v_rev);
  end if;
  return cruce.ok(jsonb_build_object(
    'resultado', (i.respuesta -> 'resultado') || '{"repetido": true}'::jsonb,
    'propuesta', cruce.vista_propuesta(i.propuesta_id, v_yo)));
end
$$;

create or replace function cruce.guardar_intento(
  p_uid uuid, p_intento uuid, p_op text, p_params jsonb, p_prop uuid, p_respuesta jsonb) returns void
language sql volatile set search_path = '' as $$
  insert into cruce.intentos (user_id, intento_id, operacion, parametros, propuesta_id, respuesta)
  values (p_uid, p_intento, p_op, p_params, p_prop, p_respuesta)
  on conflict (user_id, intento_id) do nothing
$$;

-- Defensa en profundidad: ninguna aceptación vigente puede superar el máximo.
create or replace function cruce.trg_aceptacion_cupo() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_max integer;
  v_conf integer;
begin
  select p.maximo into v_max from cruce.propuestas p where p.id = new.propuesta_id for update;
  select count(*) into v_conf from cruce.aceptaciones a
  where a.propuesta_id = new.propuesta_id and a.version = new.version and a.vigente;
  if new.vigente and v_conf >= v_max then
    raise exception 'cupo excedido' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger aceptaciones_cupo before insert on cruce.aceptaciones
  for each row execute function cruce.trg_aceptacion_cupo();

-- Eventos inmutables.
create or replace function cruce.trg_evento_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'los eventos son inmutables' using errcode = 'P0001';
end
$$;
create trigger eventos_inmutables before update on cruce.eventos
  for each row execute function cruce.trg_evento_inmutable();
create trigger eventos_espacio_inmutables before update on cruce.eventos_espacio
  for each row execute function cruce.trg_evento_inmutable();

revoke all on all functions in schema cruce from public, anon, authenticated;
