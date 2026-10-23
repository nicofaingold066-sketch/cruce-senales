-- CRUCE · 0014 · Enmienda 4 (docs/contrato-enmienda-4.md): esquema del agente del círculo.
-- cruce.preferencias (privada, por miembro y espacio) · cruce.catalogo_agente (ficticio, solo lectura) ·
-- semillas de preferencias de los simulados en seed_demo_space y reset_demo · A2 extendido (un asiento
-- simulado con preferencias está en uso) · mensajes nuevos. agente_insumos NO se crea (decisión 1).

-- 1.2 Catálogo ficticio ------------------------------------------------------------------------
create table cruce.catalogo_agente (
  id text primary key,
  orden integer not null unique,
  actividad text not null check (actividad in ('asado', 'padel', 'futbol', 'parque', 'fiesta')),
  actividad_etiqueta text not null,
  lugar_nombre text not null check (lugar_nombre like '% (Simulación)'),
  precio text not null check (precio in ('gratis', 'barato', 'medio')),
  techado boolean not null,
  energia text not null check (energia in ('con_todo', 'algo_tranquilo')),
  ambiente text not null check (ambiente in ('fiesta', 'tranquilo')),
  titulo_plantilla text not null,
  sab_inicio time, sab_fin time, dom_inicio time, dom_fin time,
  check ((sab_inicio is null) = (sab_fin is null)),
  check ((dom_inicio is null) = (dom_fin is null))
);
alter table cruce.catalogo_agente enable row level security;
revoke all on cruce.catalogo_agente from public, anon, authenticated;

insert into cruce.catalogo_agente
  (id, orden, actividad, actividad_etiqueta, lugar_nombre, precio, techado, energia, ambiente, titulo_plantilla,
   sab_inicio, sab_fin, dom_inicio, dom_fin) values
  ('lugar-sim-01', 1, 'asado', 'Asado', 'Quincho de Tomi (Simulación)', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Asado en casa de Tomi', '14:00', '17:00', '14:00', '17:00'),
  ('lugar-sim-02', 2, 'padel', 'Pádel', 'Club de pádel (Simulación)', 'medio', true, 'con_todo', 'tranquilo',
   'Pádel el fin de semana', '10:00', '12:00', '10:00', '12:00'),
  ('lugar-sim-03', 3, 'futbol', 'Fútbol', 'Cancha de barrio (Simulación)', 'barato', false, 'con_todo', 'fiesta',
   'Fútbol en la cancha', '11:00', '13:00', '11:00', '13:00'),
  ('lugar-sim-04', 4, 'parque', 'Parque', 'Parque de la comuna (Simulación)', 'gratis', false, 'algo_tranquilo', 'tranquilo',
   'Picnic en el parque', '12:00', '15:00', '12:00', '15:00'),
  ('evento-sim-01', 5, 'fiesta', 'Fiesta', 'Fiesta de un bar (Simulación)', 'medio', true, 'con_todo', 'fiesta',
   'Fiesta del sábado', '23:00', '03:00', null, null);

-- 1.1 Preferencias privadas -----------------------------------------------------------------------
create or replace function cruce.sin_repetidas(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p) = (select count(distinct x) from unnest(p) x)
$$;

create table cruce.preferencias (
  miembro_id uuid primary key references cruce.miembros (id) on delete cascade,
  espacio_id uuid not null references cruce.espacios (id) on delete cascade,
  presupuesto text not null check (presupuesto in ('da_igual', 'algo_barato', 'ojala_gratis')),
  energia text not null check (energia in ('con_todo', 'algo_tranquilo')),
  ambiente text not null check (ambiente in ('fiesta', 'tranquilo', 'da_igual')),
  lugar text not null check (lugar in ('da_igual', 'bajo_techo')),
  me_gustaria text[] not null check (
    cardinality(me_gustaria) between 1 and 6
    and me_gustaria <@ array['asado', 'padel', 'futbol', 'parque', 'fiesta']
    and cruce.sin_repetidas(me_gustaria)),
  actualizadas_en timestamptz not null
);
create index preferencias_espacio_idx on cruce.preferencias (espacio_id);
alter table cruce.preferencias enable row level security;
revoke all on cruce.preferencias from public, anon, authenticated;

-- 1.3 Semilla de preferencias (docs/agente-ia.md 7.1), solo para Mati, Caro, Fede y Sofi mientras
-- sigan simulados. Sobrescribe si ya existen. Nunca toca miembros reales ni a Luna.
create or replace function cruce.sembrar_preferencias_demo(p_esp uuid) returns void
language sql volatile set search_path = '' as $$
  insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en)
  select m.id, m.espacio_id, s.presupuesto, s.energia, s.ambiente, s.lugar, s.me_gustaria, cruce.ahora()
  from cruce.miembros m
  join (values
    ('mati', 'algo_barato', 'con_todo', 'da_igual', 'da_igual', array['asado', 'futbol']),
    ('caro', 'da_igual', 'algo_tranquilo', 'tranquilo', 'bajo_techo', array['asado', 'parque']),
    ('fede', 'da_igual', 'con_todo', 'fiesta', 'da_igual', array['futbol', 'fiesta']),
    ('sofi', 'algo_barato', 'algo_tranquilo', 'da_igual', 'da_igual', array['asado'])
  ) as s (nombre, presupuesto, energia, ambiente, lugar, me_gustaria) on s.nombre = lower(m.nombre)
  join cruce.espacios e on e.id = m.espacio_id
  where m.espacio_id = p_esp and m.simulado and e.demo
  on conflict (miembro_id) do update
    set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
        lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en
$$;

-- Demos ya existentes: reciben la semilla ahora (solo asientos todavía simulados).
select cruce.sembrar_preferencias_demo(e.id) from cruce.espacios e where e.demo;

-- A2 extendido: un asiento simulado con preferencias está en uso.
create or replace function cruce.asiento_usado(p_m uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from cruce.condiciones c where c.miembro_id = p_m)
      or exists (select 1 from cruce.elegibles e where e.miembro_id = p_m)
      or exists (select 1 from cruce.aceptaciones a where a.miembro_id = p_m)
      or exists (select 1 from cruce.participaciones pa where pa.miembro_id = p_m and pa.retirado)
      or exists (select 1 from cruce.preferencias pr where pr.miembro_id = p_m)
$$;

-- Mensajes (tabla 0.5 + enmiendas 2 y 4) -----------------------------------------------------------
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
    when 'entrada_incompleta/preferencias_invalidas' then 'Las preferencias solo admiten las opciones de la lista.'
    when 'entrada_incompleta/fecha_invalida' then 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.'
    when 'entrada_incompleta/pocas_preferencias' then 'Todavía no hay suficientes personas con preferencias cargadas.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
  end
$$;

-- seed_demo_space: igual a 0010 más la semilla de preferencias --------------------------------------
create or replace function public.seed_demo_space() returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();

  select e.id into v_esp from cruce.espacios e where e.demo and e.demo_de = v_uid;
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;

  insert into cruce.espacios (nombre, tipo, demo, demo_de, codigo_invitacion, creado_en)
  values ('Los del asado', 'amigos', true, v_uid, cruce.generar_codigo(), cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, 'Tomi', 'organizador', false, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora());
  -- Enmienda 4: preferencias semilla de los simulados (Tomi y Luna las cargan desde la app).
  perform cruce.sembrar_preferencias_demo(v_esp);

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;

-- reset_demo: igual a 0010; bloquea también los simulados (en orden de id) y recarga sus semillas --
create or replace function public.reset_demo(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_params jsonb;
  v_prev jsonb;
  e cruce.espacios%rowtype;
  yo cruce.miembros%rowtype;
  v_n integer;
  v_gen bigint;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento: la repetición devuelve la respuesta original sin borrar nada nuevo
  v_params := jsonb_build_object('p_espacio_id', p_espacio_id);
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'reset_demo', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  select * into e from cruce.espacios x where x.id = p_espacio_id;
  -- 4. miembros: el llamador y los simulados (sus preferencias semilla se recargan), en orden de id
  perform 1 from cruce.miembros m
  where m.espacio_id = p_espacio_id and (m.user_id = v_uid or m.simulado)
  order by m.id
  for update;
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if e.id is null or yo.id is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  if not e.demo then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;
  -- 5. propuestas del espacio, en orden de id
  perform 1 from cruce.propuestas p where p.espacio_id = e.id order by p.id for update;
  perform cruce.fijar_ahora();

  -- Intentos de esas propuestas: se borran salvo los de create_proposal, que quedan como tombstones.
  delete from cruce.intentos i
  using cruce.propuestas p
  where p.espacio_id = e.id and i.propuesta_id = p.id and i.operacion <> 'create_proposal';
  with d as (delete from cruce.propuestas p where p.espacio_id = e.id returning 1)
  select count(*) into v_n from d;

  -- Enmienda 4: las preferencias de los miembros reales se conservan; las semillas se recargan.
  perform cruce.sembrar_preferencias_demo(e.id);

  update cruce.espacios x set ultimo_reinicio = cruce.ahora(), generacion = x.generacion + 1
  where x.id = e.id returning x.generacion into v_gen;
  insert into cruce.eventos_espacio (espacio_id, tipo, actor_id, en)
  values (e.id, 'demo_reiniciada', yo.id, cruce.ahora());

  v_res := jsonb_build_object('propuestas_eliminadas', v_n, 'generacion', v_gen, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'reset_demo', v_params, e.id, yo.id, v_gen, null,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res, 'generacion', v_gen));
  return cruce.ok(jsonb_build_object(
    'resultado', v_res,
    'generacion', v_gen,
    'espacio', cruce.espacio_json(e.id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('reset_demo', sqlstate, v_ctx);
end
$$;

revoke all on function public.reset_demo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reset_demo(uuid, uuid) to authenticated;
revoke all on function public.seed_demo_space() from public, anon, authenticated;
grant execute on function public.seed_demo_space() to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
