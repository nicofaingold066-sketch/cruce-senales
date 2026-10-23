-- CRUCE · 0008 · Enmienda 2 (docs/contrato-enmienda-2.md): esquema y utilidades.
-- A1 reserva de cupo del imprescindible · A3 generación y tombstones de intentos · A4 instante de
-- decisión posterior a los bloqueos y vencimiento con revalidación · contrato: 2 en todos los sobres.

-- A3: generación del espacio (sube con cada reinicio real) -----------------------------------------
alter table cruce.espacios add column generacion bigint not null default 1;
alter table cruce.espacios add constraint espacios_generacion_positiva check (generacion >= 1);

-- A4: un solo espacio demo por usuario. demo_de es el id de Auth del creador; nunca sale hacia afuera.
alter table cruce.espacios add column demo_de uuid;
-- Datos existentes (espacios de prueba): el dueño del demo es su organizador.
update cruce.espacios e set demo_de = m.user_id
from cruce.miembros m
where e.demo and m.espacio_id = e.id and m.rol = 'organizador';
alter table cruce.espacios add constraint espacios_demo_de check (demo = (demo_de is not null));
create unique index espacios_un_demo_por_usuario_uq on cruce.espacios (demo_de) where demo;

-- A3: intentos como tombstones. Al borrar una propuesta, el intento de create_proposal queda con
-- propuesta_id NULL y conserva la generación del espacio en que se creó.
alter table cruce.intentos add column espacio_id uuid references cruce.espacios (id) on delete cascade;
alter table cruce.intentos add column miembro_id uuid references cruce.miembros (id) on delete cascade;
alter table cruce.intentos add column generacion bigint;
-- Datos existentes: completar espacio, miembro y generación desde la propuesta del intento.
update cruce.intentos i set espacio_id = p.espacio_id, miembro_id = m.id, generacion = e.generacion
from cruce.propuestas p
join cruce.espacios e on e.id = p.espacio_id
join cruce.miembros m on m.espacio_id = p.espacio_id
where p.id = i.propuesta_id and m.user_id = i.user_id;
alter table cruce.intentos drop constraint intentos_propuesta_id_fkey;
alter table cruce.intentos add constraint intentos_propuesta_id_fkey
  foreign key (propuesta_id) references cruce.propuestas (id) on delete set null;
create index intentos_espacio_idx on cruce.intentos (espacio_id);
-- A4 paso 3: restricción única (miembro, operación, intento). La clave primaria (usuario, intento)
-- de 0.7 es más estricta y se conserva (permite detectar intento_reutilizado entre operaciones).
create unique index intentos_miembro_operacion_intento_uq on cruce.intentos (miembro_id, operacion, intento_id);

-- A4: instante de decisión del servidor, fijado DESPUÉS de adquirir los bloqueos ----------------------
create or replace function cruce.fijar_ahora() returns timestamptz
language sql volatile set search_path = '' as $$
  select to_timestamp(set_config('cruce.ahora', extract(epoch from clock_timestamp())::text, true)::double precision)
$$;

create or replace function cruce.ahora() returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(to_timestamp(nullif(current_setting('cruce.ahora', true), '')::double precision), now())
$$;

-- Mensajes (tabla 0.5 + enmienda 2) -------------------------------------------------------------
-- Los tres textos nuevos no están fijados por la enmienda: quedan PENDIENTES de confirmación del coordinador.
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
    when 'no_autorizado/espacio_no_demo' then 'El reinicio solo está permitido en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'asiento_en_uso/asiento_en_uso' then 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'
    when 'intento_obsoleto/intento_obsoleto' then 'Esta solicitud pertenece a una demo ya reiniciada y no se puede repetir. Actualiza la pantalla.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
  end
$$;

-- Sobres con contrato 2 y servidor_ahora = instante de decisión ------------------------------------
create or replace function cruce.ok(p_extra jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('ok', true, 'contrato', 2, 'servidor_ahora', cruce.momento(cruce.ahora()))
         || coalesce(p_extra, '{}'::jsonb)
$$;

create or replace function cruce.err(p_codigo text, p_detalle text, p_state_rev integer) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ok', false, 'contrato', 2, 'servidor_ahora', cruce.momento(cruce.ahora()),
    'error', jsonb_build_object(
      'codigo', p_codigo, 'detalle', p_detalle,
      'mensaje', cruce.mensaje(p_codigo, p_detalle),
      'reintentable', p_codigo = 'fallo_temporal'),
    'state_rev', p_state_rev)
$$;

-- Espacio con generación ----------------------------------------------------------------------
create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
    'codigo_invitacion', e.codigo_invitacion,
    'generacion', e.generacion,
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

create or replace function cruce.evento(
  p_prop uuid, p_tipo text, p_actor uuid, p_actor_tipo text, p_ejecutado_por uuid,
  p_estado_previo text, p_estado_nuevo text, p_version_previa integer, p_version_nueva integer,
  p_state_rev integer) returns void
language sql volatile set search_path = '' as $$
  insert into cruce.eventos (propuesta_id, tipo, actor_id, actor_tipo, ejecutado_por, en,
                             estado_previo, estado_nuevo, version_previa, version_nueva, state_rev)
  values (p_prop, p_tipo, p_actor, p_actor_tipo, p_ejecutado_por, cruce.ahora(),
          p_estado_previo, p_estado_nuevo, p_version_previa, p_version_nueva, p_state_rev)
$$;

-- A4: vencimiento perezoso. Primero comprueba sin bloqueo; solo si hay que vencer, bloquea la
-- propuesta, vuelve a fijar el instante y revalida antes de escribir.
create or replace function cruce.vencer(p_prop uuid) returns void
language plpgsql volatile set search_path = '' as $$
declare
  v_estado text;
  v_version integer;
  v_rev integer;
begin
  if not exists (select 1 from cruce.propuestas p
                 where p.id = p_prop and cruce.ahora() >= p.plazo
                   and p.estado in ('borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision')) then
    return;
  end if;
  perform 1 from cruce.propuestas p where p.id = p_prop for update;
  perform cruce.fijar_ahora();
  select p.estado, p.version_vigente into v_estado, v_version
  from cruce.propuestas p
  where p.id = p_prop and cruce.ahora() >= p.plazo
    and p.estado in ('borrador', 'reuniendo_interes', 'esperando_compromisos', 'en_revision');
  if not found then
    return;
  end if;
  update cruce.propuestas p set estado = 'expirado', state_rev = p.state_rev + 1
  where p.id = p_prop returning p.state_rev into v_rev;
  perform cruce.evento(p_prop, 'propuesta_expirada', null, 'sistema', null,
                       v_estado, 'expirado', v_version, v_version, v_rev);
end
$$;

-- A4: orden único de bloqueos -------------------------------------------------------------------
-- 1 usuario (asesor, solo seed/create_space) -> 2 espacio -> 3 intento -> 4 miembro -> 5 propuesta.
create or replace function cruce.espacio_de_propuesta(p_prop uuid) returns uuid
language sql stable set search_path = '' as $$
  select p.espacio_id from cruce.propuestas p where p.id = p_prop
$$;

-- Nivel 1
create or replace function cruce.bloquear_usuario(p_uid uuid) returns void
language sql volatile set search_path = '' as $$
  select pg_advisory_xact_lock(hashtextextended('cruce:usuario:' || p_uid::text, 0))
$$;

-- Nivel 2
create or replace function cruce.bloquear_espacio(p_esp uuid) returns boolean
language plpgsql volatile set search_path = '' as $$
begin
  if p_esp is null then
    return false;
  end if;
  perform 1 from cruce.espacios e where e.id = p_esp for update;
  return found;
end
$$;

-- Niveles 4 y 5, luego instante de decisión y vencimiento. Devuelve el miembro del llamador o null
-- (no es miembro, o la propuesta ya no existe en ese espacio: se revalida después de bloquear).
create or replace function cruce.bloquear_actor_y_propuesta(p_prop uuid, p_esp uuid, p_uid uuid, p_destino uuid)
returns uuid
language plpgsql volatile set search_path = '' as $$
declare
  v_yo uuid;
begin
  if p_esp is null then
    return null;
  end if;
  perform 1 from cruce.miembros m
  where m.espacio_id = p_esp and (m.user_id = p_uid or m.id = p_destino)
  order by m.id
  for update;
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_esp and m.user_id = p_uid;
  if v_yo is null then
    return null;
  end if;
  perform 1 from cruce.propuestas p where p.id = p_prop and p.espacio_id = p_esp for update;
  if not found then
    return null;
  end if;
  perform cruce.fijar_ahora();
  perform cruce.vencer(p_prop);
  return v_yo;
end
$$;

-- Lecturas: sin bloqueos previos (vencer bloquea solo si hace falta).
create or replace function cruce.leer_propuesta(p_prop uuid, p_uid uuid) returns uuid
language plpgsql volatile set search_path = '' as $$
declare
  v_yo uuid;
begin
  perform cruce.fijar_ahora();
  select m.id into v_yo
  from cruce.propuestas p join cruce.miembros m on m.espacio_id = p.espacio_id and m.user_id = p_uid
  where p.id = p_prop;
  if v_yo is null then
    return null;
  end if;
  perform cruce.vencer(p_prop);
  return v_yo;
end
$$;

create or replace function cruce.chequeo_estado(p_prop uuid, p_permitidos text[]) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
begin
  select * into p from cruce.propuestas x where x.id = p_prop;
  if p.estado = 'cancelado' then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  if p.estado = 'expirado' or cruce.ahora() >= p.plazo then
    return cruce.err('plazo_vencido', 'plazo_vencido', p.state_rev);
  end if;
  if not (p.estado = any (p_permitidos)) then
    return cruce.err('opcion_desactualizada', 'estado_no_admite', p.state_rev);
  end if;
  return null;
end
$$;

-- A2: un asiento simulado está usado si tiene condiciones, elegibilidad en alguna versión, alguna
-- aceptación (vigente o histórica) o un retiro registrado (extensión restrictiva: ver notas).
create or replace function cruce.asiento_usado(p_m uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from cruce.condiciones c where c.miembro_id = p_m)
      or exists (select 1 from cruce.elegibles e where e.miembro_id = p_m)
      or exists (select 1 from cruce.aceptaciones a where a.miembro_id = p_m)
      or exists (select 1 from cruce.participaciones pa where pa.miembro_id = p_m and pa.retirado)
$$;

-- A3/A4: intentos ----------------------------------------------------------------------------
-- Nivel 3. Serializa por (usuario, intento). Devuelve null si el intento es nuevo; si no, la respuesta final.
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

create or replace function cruce.guardar_intento(
  p_uid uuid, p_intento uuid, p_op text, p_params jsonb, p_esp uuid, p_miembro uuid, p_gen bigint,
  p_prop uuid, p_respuesta jsonb) returns void
language sql volatile set search_path = '' as $$
  insert into cruce.intentos (user_id, intento_id, operacion, parametros, espacio_id, miembro_id, generacion,
                              propuesta_id, respuesta, creado_en)
  values (p_uid, p_intento, p_op, p_params, p_esp, p_miembro, p_gen, p_prop, p_respuesta, cruce.ahora())
$$;

-- A1: situación con reserva de cupo del imprescindible -------------------------------------------
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
    v_imp_acepto := exists (select 1 from cruce.aceptaciones a
                            where a.propuesta_id = p_prop and a.version = p.version_vigente
                              and a.miembro_id = p.imprescindible_id and a.vigente);
    select count(*) into v_conf from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = p.version_vigente and a.vigente;
  end if;
  v_imp_ret := cruce.es_retirado(p_prop, p.imprescindible_id);
  v_reservado := p.version_vigente is not null and not v_imp_acepto and not v_imp_ret;
  v_disponibles := p.maximo - v_conf;
  v_libres := greatest(0, v_disponibles - case when v_reservado then 1 else 0 end);
  v_es_org := p.organizador_id = p_m;
  v_es_org_esp := m.rol = 'organizador';
  v_hay_sim := exists (select 1 from cruce.miembros x where x.espacio_id = p.espacio_id and x.simulado);
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
    'puede', jsonb_build_object(
      'abrir', v_es_org and p.estado = 'borrador' and not v_vencido,
      'marcar_interes', v_activo and not v_ret and not v_vencido,
      'guardar_condiciones', v_activo and not v_ret and not v_vencido and not (v_con_op and coalesce(v_eleg, false)),
      'evaluar', v_es_org and p.estado = 'reuniendo_interes' and not v_vencido,
      'aceptar', v_aceptar,
      'retirarme', not v_ret and (
                     (p.estado in ('reuniendo_interes', 'esperando_compromisos', 'en_revision') and not v_vencido)
                     or p.estado = 'grupo_confirmado'),
      'proponer_reparacion', v_es_org and p.estado = 'en_revision' and not v_vencido,
      'cancelar', v_es_org and p.estado not in ('expirado', 'cancelado'),
      'simular', v_es_org_esp and v_activo and v_hay_sim),
    -- A1: motivo por el que `puede.aceptar` es false cuando solo queda el cupo reservado.
    'motivo_aceptar', case when v_base_aceptar and not v_aceptar and p_m <> p.imprescindible_id
                                and v_disponibles > 0 and v_reservado
                           then 'cupo_reservado' end);
end
$$;

-- A1: EstadoPropuesta con cupos.reservado_imprescindible y cupos.libres_para_otros ---------------------
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

-- A1, defensa en profundidad: ninguna aceptación supera el máximo ni ocupa el cupo reservado.
create or replace function cruce.trg_aceptacion_cupo() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_max integer;
  v_imp uuid;
  v_conf integer;
  v_imp_ok boolean;
begin
  select p.maximo, p.imprescindible_id into v_max, v_imp
  from cruce.propuestas p where p.id = new.propuesta_id for update;
  select count(*) into v_conf from cruce.aceptaciones a
  where a.propuesta_id = new.propuesta_id and a.version = new.version and a.vigente;
  v_imp_ok := exists (select 1 from cruce.aceptaciones a
                      where a.propuesta_id = new.propuesta_id and a.version = new.version
                        and a.miembro_id = v_imp and a.vigente)
              or cruce.es_retirado(new.propuesta_id, v_imp);
  if new.vigente and (v_conf >= v_max or (new.miembro_id <> v_imp and not v_imp_ok and v_conf >= v_max - 1)) then
    raise exception 'cupo excedido' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
