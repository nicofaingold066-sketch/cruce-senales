-- CRUCE · 0041 · Enmienda 11 (BORRADOR: docs/contrato-enmienda-11-borrador.md): backend del agente social.
-- Aplicada el viernes 23 oct 2026 con el OK explícito de Nico (20:33, vía coordinador). En el mismo commit:
-- tests/backend/helpers.ts (PERMITIDAS 31 → 40, TOTAL_PERMITIDAS) y las pruebas que fijaban 31.
--
-- Resumen:
--   * Datos: miembros.recibir_invitaciones_agente (false por defecto), espacios.localidad, politicas_agente,
--     opciones_agente (referencias opacas emitidas), ejecuciones_agente (recibo), invitaciones_agente.
--   * 9 funciones públicas nuevas (31 → 40 authenticated, 0 anon). Reutilizan proponer_plan_borrador,
--     create_proposal y open_proposal: no hay un segundo motor.
--   * get_my_preferences suma `recibir_invitaciones_agente`; get_proposal_state/list_proposals suman
--     mi_situacion.invitacion_agente ({texto} o null), solo para la persona invitada.
--   * Una invitación no es interés ni asistencia: no toca participaciones, condiciones ni aceptaciones.

-- ===================== 1. Datos =====================
alter table cruce.miembros add column recibir_invitaciones_agente boolean not null default false;
alter table cruce.espacios add column localidad text not null default 'santiago' check (localidad in ('santiago'));

create table cruce.politicas_agente (
  espacio_id uuid primary key references cruce.espacios (id) on delete cascade,
  modo text not null check (modo in ('aprobacion', 'autonoma')),
  version integer not null check (version > 0),
  actualizada_por uuid references cruce.miembros (id) on delete set null,
  actualizada_en timestamptz not null
);

create table cruce.opciones_agente (
  opcion_ref text primary key,
  espacio_id uuid not null references cruce.espacios (id) on delete cascade,
  sabado date not null,
  clima jsonb not null,
  catalogo_id text not null references cruce.catalogo_agente (id),
  emitida_en timestamptz not null
);
create index opciones_agente_espacio on cruce.opciones_agente (espacio_id, emitida_en);

create table cruce.ejecuciones_agente (
  id uuid primary key,
  espacio_id uuid not null references cruce.espacios (id) on delete cascade,
  oportunidad text not null,
  sabado date not null,
  parametros_hash text not null check (char_length(parametros_hash) between 1 and 128),
  estado text not null check (estado in ('en_curso', 'borrador', 'publicada', 'fallida')),
  politica_version integer not null,
  lease_hasta timestamptz not null,
  opcion_ref text,
  texto text,
  borrador_hash text,
  -- Lo que la interfaz muestra antes de aprobar (sin destinatarios individuales): título, lugar, franjas, mínimo,
  -- máximo, plazo, imprescindible y cuántos invitados. Todo esto entra en el hash.
  plan jsonb,
  aprobado_hash text,
  aprobado_por uuid references cruce.miembros (id) on delete set null,
  aprobado_en timestamptz,
  propuesta_id uuid references cruce.propuestas (id) on delete set null,
  motivo text check (motivo in ('sin_plan', 'candidatos_rechazados', 'modelo_fallo', 'reemplazada', 'lease_vencido')),
  creada_por uuid references cruce.miembros (id) on delete set null,
  creada_en timestamptz not null,
  actualizada_en timestamptz not null
);
-- A: una sola ejecución efectiva por (espacio, oportunidad); las fallidas no ocupan la oportunidad.
create unique index ejecuciones_agente_una_por_oportunidad on cruce.ejecuciones_agente (espacio_id, oportunidad)
  where estado <> 'fallida';

create table cruce.invitaciones_agente (
  propuesta_id uuid not null references cruce.propuestas (id) on delete cascade,
  miembro_id uuid not null references cruce.miembros (id) on delete cascade,
  ejecucion_id uuid not null references cruce.ejecuciones_agente (id) on delete cascade,
  texto text not null,
  creada_en timestamptz not null,
  primary key (propuesta_id, miembro_id)
);

alter table cruce.politicas_agente enable row level security;
alter table cruce.opciones_agente enable row level security;
alter table cruce.ejecuciones_agente enable row level security;
alter table cruce.invitaciones_agente enable row level security;
revoke all on table cruce.politicas_agente, cruce.opciones_agente, cruce.ejecuciones_agente, cruce.invitaciones_agente
  from public, anon, authenticated;

-- ===================== 2. Ayudas privadas =====================
-- Organizador del espacio que llama (null si no lo es o no es miembro).
create or replace function cruce.organizador_de(p_esp uuid, p_uid uuid) returns uuid
language sql stable set search_path = '' as $$
  select m.id from cruce.miembros m where m.espacio_id = p_esp and m.user_id = p_uid and m.rol = 'organizador'
$$;

create or replace function cruce.politica_agente(p_esp uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce((select jsonb_build_object('modo', p.modo, 'version', p.version)
                   from cruce.politicas_agente p where p.espacio_id = p_esp),
                  jsonb_build_object('modo', 'aprobacion', 'version', 0))
$$;

-- Recibo canónico de una ejecución (lo único que se devuelve de ella).
create or replace function cruce.ejecucion_json(e cruce.ejecuciones_agente) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'estado', e.estado, 'oportunidad', e.oportunidad,
    'propuesta_id', e.propuesta_id,
    'borrador', case when e.borrador_hash is null then null else
      jsonb_build_object('hash', e.borrador_hash, 'opcion_ref', e.opcion_ref, 'texto', e.texto, 'plan', e.plan) end,
    'aprobacion', case when e.aprobado_hash is null then null else
      jsonb_build_object('hash', e.aprobado_hash, 'aprobado_en', cruce.momento(e.aprobado_en)) end,
    'motivo', e.motivo)
$$;

-- C: el plan exacto que se publicaría con esa opción y ese texto, con los datos ACTUALES (audiencia incluida),
-- y su hash. Devuelve null si la referencia no existe o no es de ese espacio y sábado.
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
begin
  select * into o from cruce.opciones_agente x where x.opcion_ref = p_ref and x.espacio_id = p_esp and x.sabado = p_sabado;
  if not found then
    return null;
  end if;
  select * into c from cruce.catalogo_agente k where k.id = o.catalogo_id;
  v_franjas := cruce.plan_franjas(p_sabado, c.sab_inicio, c.sab_fin, c.dom_inicio, c.dom_fin);
  select least(20, count(*)) into v_max from cruce.miembros m where m.espacio_id = p_esp;
  v_plazo := cruce.parse_hora_local(v_franjas #>> '{0,inicio}') - interval '3 hours';
  select coalesce(jsonb_agg(m.id order by m.id), '[]'::jsonb) into v_dest
  from cruce.miembros m
  where m.espacio_id = p_esp and m.recibir_invitaciones_agente and m.id <> p_org and m.user_id is not null;
  -- Capacidad: el máximo cuenta a todas las personas del espacio (reales, simuladas y pendientes). Los pendientes
  -- (sin sesión) nunca son destinatarios ni suman nada: solo ocupan lugar posible.
  v_plan := jsonb_build_object(
    'espacio_id', p_esp, 'sabado', p_sabado, 'opcion_ref', p_ref, 'catalogo_id', o.catalogo_id,
    'clima', o.clima, 'titulo', c.titulo_plantilla, 'lugar', jsonb_build_object('nombre', c.lugar_nombre, 'simulado', true),
    'franjas', v_franjas,
    'minimo', least(3, greatest(v_max, 2)), 'maximo', greatest(v_max, 2),
    'imprescindible', cruce.miembro_ref(p_org),
    'plazo', to_char(v_plazo at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI'),
    'texto', p_texto, 'destinatarios', v_dest);
  return v_plan || jsonb_build_object(
    'hash', encode(sha256(convert_to(v_plan::text, 'UTF8')), 'hex'),
    'plazo_ts', v_plazo,
    -- Lo visible para quien aprueba: sin ids de destinatarios, solo cuántos.
    'visible', jsonb_build_object(
      'titulo', v_plan -> 'titulo', 'lugar', v_plan -> 'lugar', 'franjas', v_franjas,
      'minimo', v_plan -> 'minimo', 'maximo', v_plan -> 'maximo', 'plazo', v_plan -> 'plazo',
      'imprescindible', jsonb_build_object('nombre', v_plan #> '{imprescindible,nombre}'),
      'invitados', jsonb_array_length(v_dest)));
end
$$;

-- B: repetición de una operación con p_intento_id (cruce.intentos es por usuario e intento, para TODAS las
-- operaciones: el mismo uuid en otra operación es intento_reutilizado). Devuelve null si es nuevo.
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
  if i.operacion <> p_op or i.parametros <> p_params then
    return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
  end if;
  perform cruce.fijar_ahora();
  return cruce.ok(i.respuesta || jsonb_build_object('repetido', true));
end
$$;

-- ===================== 3. Mensajes de error nuevos =====================
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
  end
$$;

-- ===================== 4. Funciones públicas =====================

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
  if not exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid) then
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
                             join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
                             where pr.espacio_id = p_espacio_id and pr.usar_en_agente),
    'destinatarios', (select count(*) from cruce.miembros m
                      where m.espacio_id = p_espacio_id and m.recibir_invitaciones_agente and m.id <> v_org
                        and m.user_id is not null)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('agente_social_contexto', sqlstate, v_ctx);
end
$$;

-- Reutiliza proponer_plan_borrador (mismas reglas, privacidad y umbrales) y emite una referencia opaca por opción.
create or replace function public.agente_social_candidatos(p_espacio_id uuid, p_sabado date, p_clima jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r jsonb;
  c jsonb;
  v_ref text;
  v_ops jsonb := '[]'::jsonb;
  v_ctx text;
begin
  r := public.proponer_plan_borrador(p_espacio_id, p_sabado, p_clima);
  if not (r ->> 'ok')::boolean then
    return r;
  end if;
  if r #>> '{resultado,tipo}' = 'sin_plan_compatible' then
    return cruce.ok(jsonb_build_object('sin_plan_compatible', true, 'motivo', r #> '{resultado,motivo}', 'opciones', '[]'::jsonb));
  end if;
  delete from cruce.opciones_agente o where o.espacio_id = p_espacio_id and o.emitida_en < cruce.ahora() - interval '24 hours';
  for c in select x from jsonb_array_elements(r #> '{resultado,candidatas}') x loop
    v_ref := 'op_' || substr(md5(gen_random_uuid()::text), 1, 20);
    insert into cruce.opciones_agente (opcion_ref, espacio_id, sabado, clima, catalogo_id, emitida_en)
    values (v_ref, p_espacio_id, p_sabado, r #> '{resultado,clima}', c ->> 'id', cruce.ahora());
    v_ops := v_ops || jsonb_build_array(jsonb_build_object(
      'opcion_ref', v_ref, 'actividad', c -> 'actividad', 'actividad_etiqueta', c -> 'actividad_etiqueta',
      'titulo', c -> 'titulo', 'franjas', c -> 'franjas', 'viaje', c -> 'viaje'));
  end loop;
  return cruce.ok(jsonb_build_object('sin_plan_compatible', false, 'opciones', v_ops));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('agente_social_candidatos', sqlstate, v_ctx);
end
$$;

create or replace function public.set_recibir_invitaciones_agente(p_espacio_id uuid, p_recibir boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_recibir is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  update cruce.miembros m set recibir_invitaciones_agente = p_recibir
  where m.espacio_id = p_espacio_id and m.user_id = v_uid
  returning m.id into v_yo;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  return cruce.ok(jsonb_build_object('recibir_invitaciones_agente', p_recibir));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('set_recibir_invitaciones_agente', sqlstate, v_ctx);
end
$$;

create or replace function public.set_politica_agente_social(p_espacio_id uuid, p_modo text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_params jsonb;
  v_prev jsonb;
  v_pol jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_modo is null or p_modo not in ('aprobacion', 'autonoma') then
    return cruce.err('entrada_incompleta', 'politica_invalida', null);
  end if;
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_params := jsonb_build_object('p_espacio_id', p_espacio_id, 'p_modo', p_modo);
  v_prev := cruce.intento_agente(v_uid, p_intento_id, 'set_politica_agente_social', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  if not exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_org := cruce.organizador_de(p_espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  -- La versión sube solo si el modo cambia.
  insert into cruce.politicas_agente (espacio_id, modo, version, actualizada_por, actualizada_en)
  values (p_espacio_id, p_modo, 1, v_org, cruce.ahora())
  on conflict (espacio_id) do update
    set modo = excluded.modo, version = cruce.politicas_agente.version + 1,
        actualizada_por = excluded.actualizada_por, actualizada_en = excluded.actualizada_en
    where cruce.politicas_agente.modo <> excluded.modo;
  v_pol := cruce.politica_agente(p_espacio_id);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'set_politica_agente_social', v_params, p_espacio_id, v_org,
                                cruce.generacion(p_espacio_id), null, jsonb_build_object('politica', v_pol));
  return cruce.ok(jsonb_build_object('politica', v_pol, 'repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('set_politica_agente_social', sqlstate, v_ctx);
end
$$;

create or replace function public.iniciar_ejecucion_agente(p_espacio_id uuid, p_ejecucion_id uuid, p_oportunidad text,
                                                           p_parametros_hash text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_sab date;
  v_hoy date;
  e cruce.ejecuciones_agente%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null or p_ejecucion_id is null or p_parametros_hash is null
     or char_length(p_parametros_hash) not between 1 and 128 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if not cruce.bloquear_espacio(p_espacio_id) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_org := cruce.organizador_de(p_espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();

  -- Mismo id: recibo (o reutilización con otros parámetros).
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if found then
    if e.espacio_id <> p_espacio_id or e.oportunidad is distinct from p_oportunidad or e.parametros_hash <> p_parametros_hash then
      return cruce.err('entrada_incompleta', 'intento_reutilizado', null);
    end if;
    return cruce.ok(jsonb_build_object('ejecucion', cruce.ejecucion_json(e), 'repetido', true, 'propia', true));
  end if;

  -- B: la oportunidad la valida el servidor (sábado futuro dentro de 16 días).
  if p_oportunidad is null or p_oportunidad !~ '^sabado:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return cruce.err('entrada_incompleta', 'oportunidad_invalida', null);
  end if;
  begin
    v_sab := substr(p_oportunidad, 8)::date;
  exception when others then
    return cruce.err('entrada_incompleta', 'oportunidad_invalida', null);
  end;
  v_hoy := (cruce.ahora() at time zone 'America/Santiago')::date;
  if extract(isodow from v_sab) <> 6 or v_sab <= v_hoy or v_sab > v_hoy + 16 then
    return cruce.err('entrada_incompleta', 'oportunidad_invalida', null);
  end if;

  -- A: lease vencido → la ejecución en curso se cierra (compare-and-swap) y la oportunidad queda libre.
  update cruce.ejecuciones_agente x set estado = 'fallida', motivo = 'lease_vencido', actualizada_en = cruce.ahora()
  where x.espacio_id = p_espacio_id and x.oportunidad = p_oportunidad and x.estado = 'en_curso' and x.lease_hasta < cruce.ahora();

  select * into e from cruce.ejecuciones_agente x
  where x.espacio_id = p_espacio_id and x.oportunidad = p_oportunidad and x.estado <> 'fallida';
  if found then
    if e.parametros_hash <> p_parametros_hash then
      return cruce.err('opcion_desactualizada', 'oportunidad_en_uso', null)
             || jsonb_build_object('ejecucion', cruce.ejecucion_json(e));
    end if;
    -- Otro id para la misma oportunidad: el recibo canónico, sin permiso para seguir.
    return cruce.ok(jsonb_build_object('ejecucion', cruce.ejecucion_json(e), 'repetido', true, 'propia', false));
  end if;

  insert into cruce.ejecuciones_agente (id, espacio_id, oportunidad, sabado, parametros_hash, estado, politica_version,
                                        lease_hasta, creada_por, creada_en, actualizada_en)
  values (p_ejecucion_id, p_espacio_id, p_oportunidad, v_sab, p_parametros_hash, 'en_curso',
          (cruce.politica_agente(p_espacio_id) ->> 'version')::integer, cruce.ahora() + interval '120 seconds',
          v_org, cruce.ahora(), cruce.ahora())
  returning * into e;
  return cruce.ok(jsonb_build_object('ejecucion', cruce.ejecucion_json(e), 'repetido', false, 'propia', true));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('iniciar_ejecucion_agente', sqlstate, v_ctx);
end
$$;

create or replace function public.guardar_borrador_agente(p_ejecucion_id uuid, p_opcion_ref text, p_texto text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  e cruce.ejecuciones_agente%rowtype;
  v_plan jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_ejecucion_id is null or p_opcion_ref is null or p_texto is null
     or char_length(btrim(p_texto)) not between 1 and 280 or p_texto ~ '[[:cntrl:]]' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if not found or not cruce.bloquear_espacio(e.espacio_id)
     or not exists (select 1 from cruce.miembros m where m.espacio_id = e.espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_org := cruce.organizador_de(e.espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id for update;
  -- B: inmutable. Lo mismo otra vez → repetido; otro contenido → rechazo, también después de publicar.
  if e.borrador_hash is not null then
    if e.opcion_ref = p_opcion_ref and e.texto = btrim(p_texto) then
      return cruce.ok(jsonb_build_object('borrador', jsonb_build_object('hash', e.borrador_hash, 'opcion_ref', e.opcion_ref,
                                                                         'plan', e.plan),
                                         'repetido', true));
    end if;
    return cruce.err('opcion_desactualizada', 'borrador_cambiado', null);
  end if;
  if e.estado <> 'en_curso' then
    return cruce.err('opcion_desactualizada', 'ejecucion_cerrada', null);
  end if;
  v_plan := cruce.plan_agente(e.espacio_id, e.sabado, p_opcion_ref, btrim(p_texto), v_org);
  if v_plan is null then
    return cruce.err('opcion_desactualizada', 'opcion_vencida', null);
  end if;
  update cruce.ejecuciones_agente x
  set estado = 'borrador', opcion_ref = p_opcion_ref, texto = btrim(p_texto), borrador_hash = v_plan ->> 'hash',
      plan = v_plan -> 'visible', actualizada_en = cruce.ahora()
  where x.id = p_ejecucion_id;
  return cruce.ok(jsonb_build_object('borrador', jsonb_build_object('hash', v_plan ->> 'hash', 'opcion_ref', p_opcion_ref,
                                                                     'plan', v_plan -> 'visible'),
                                     'repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('guardar_borrador_agente', sqlstate, v_ctx);
end
$$;

create or replace function public.aprobar_borrador_agente(p_ejecucion_id uuid, p_borrador_hash text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  e cruce.ejecuciones_agente%rowtype;
  v_plan jsonb;
  v_params jsonb;
  v_prev jsonb;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_ejecucion_id is null or p_borrador_hash is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if not found or not cruce.bloquear_espacio(e.espacio_id)
     or not exists (select 1 from cruce.miembros m where m.espacio_id = e.espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_params := jsonb_build_object('p_ejecucion_id', p_ejecucion_id, 'p_borrador_hash', p_borrador_hash);
  v_prev := cruce.intento_agente(v_uid, p_intento_id, 'aprobar_borrador_agente', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_org := cruce.organizador_de(e.espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id for update;
  if e.estado = 'publicada' then
    return cruce.err('opcion_desactualizada', 'ejecucion_publicada', null);
  end if;
  if e.estado <> 'borrador' then
    return cruce.err('opcion_desactualizada', 'ejecucion_cerrada', null);
  end if;
  -- C: se aprueba el contenido exacto, recalculado con los datos actuales (audiencia incluida).
  v_plan := cruce.plan_agente(e.espacio_id, e.sabado, e.opcion_ref, e.texto, v_org);
  if v_plan is null or e.borrador_hash <> p_borrador_hash or v_plan ->> 'hash' <> p_borrador_hash then
    return cruce.err('opcion_desactualizada', 'borrador_cambiado', null);
  end if;
  update cruce.ejecuciones_agente x
  set aprobado_hash = p_borrador_hash, aprobado_por = v_org, aprobado_en = cruce.ahora(), actualizada_en = cruce.ahora()
  where x.id = p_ejecucion_id;
  v_res := jsonb_build_object('aprobacion', jsonb_build_object('hash', p_borrador_hash, 'aprobado_en', cruce.momento(cruce.ahora())));
  perform cruce.guardar_intento(v_uid, p_intento_id, 'aprobar_borrador_agente', v_params, e.espacio_id, v_org,
                                cruce.generacion(e.espacio_id), null, v_res);
  return cruce.ok(v_res || jsonb_build_object('repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('aprobar_borrador_agente', sqlstate, v_ctx);
end
$$;

-- C y atomicidad: revalida todo y, en una sola transacción, crea y abre la propuesta (con el motor de siempre),
-- invita y cierra la ejecución como publicada. Si algo falla, no queda nada.
create or replace function public.publicar_borrador_agente(p_ejecucion_id uuid, p_borrador_hash text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  e cruce.ejecuciones_agente%rowtype;
  v_pol jsonb;
  v_plan jsonb;
  v_cands jsonb;
  v_cat text;
  r jsonb;
  v_prop uuid;
  v_inv integer;
  v_params jsonb;
  v_prev jsonb;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_ejecucion_id is null or p_borrador_hash is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if not found or not cruce.bloquear_espacio(e.espacio_id)
     or not exists (select 1 from cruce.miembros m where m.espacio_id = e.espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_params := jsonb_build_object('p_ejecucion_id', p_ejecucion_id, 'p_borrador_hash', p_borrador_hash);
  v_prev := cruce.intento_agente(v_uid, p_intento_id, 'publicar_borrador_agente', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_org := cruce.organizador_de(e.espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id for update;
  -- Respuesta perdida después del commit con OTRO intento: el recibo dice dónde quedó.
  if e.estado = 'publicada' then
    if e.borrador_hash = p_borrador_hash then
      return cruce.ok(jsonb_build_object('propuesta', jsonb_build_object('id', e.propuesta_id),
        'invitados', (select count(*) from cruce.invitaciones_agente i where i.ejecucion_id = e.id), 'repetido', true));
    end if;
    return cruce.err('opcion_desactualizada', 'ejecucion_publicada', null);
  end if;
  if e.estado <> 'borrador' then
    return cruce.err('opcion_desactualizada', 'ejecucion_cerrada', null);
  end if;
  v_plan := cruce.plan_agente(e.espacio_id, e.sabado, e.opcion_ref, e.texto, v_org);
  if v_plan is null or e.borrador_hash <> p_borrador_hash or v_plan ->> 'hash' <> p_borrador_hash then
    return cruce.err('opcion_desactualizada', 'borrador_cambiado', null);
  end if;
  -- Política vigente: aprobación del hash exacto salvo autónoma sin cambios desde que empezó la ejecución.
  v_pol := cruce.politica_agente(e.espacio_id);
  if not (v_pol ->> 'modo' = 'autonoma' and (v_pol ->> 'version')::integer = e.politica_version)
     and e.aprobado_hash is distinct from p_borrador_hash then
    return cruce.err('no_autorizado', 'sin_aprobacion', null);
  end if;
  -- La opción tiene que seguir entre las candidatas actuales (preferencias, opt-out, presupuesto, viaje, clima).
  r := public.proponer_plan_borrador(e.espacio_id, e.sabado, v_plan -> 'clima');
  v_cat := v_plan ->> 'catalogo_id';
  if not (r ->> 'ok')::boolean or r #>> '{resultado,tipo}' <> 'borrador'
     or not exists (select 1 from jsonb_array_elements(r #> '{resultado,candidatas}') x where x ->> 'id' = v_cat) then
    return cruce.err('opcion_desactualizada', 'opcion_vencida', null);
  end if;
  if (v_plan ->> 'plazo_ts')::timestamptz < cruce.ahora() + interval '1 hour' then
    return cruce.err('opcion_desactualizada', 'opcion_vencida', null);
  end if;
  if jsonb_array_length(v_plan -> 'destinatarios') = 0 then
    return cruce.err('sin_alternativa', 'sin_destinatarios', null);
  end if;

  r := public.create_proposal(e.espacio_id, v_plan ->> 'titulo', v_plan -> 'franjas', (v_plan ->> 'minimo')::integer,
                              (v_plan ->> 'maximo')::integer, v_org, v_plan ->> 'plazo', 'America/Santiago', gen_random_uuid());
  if not (r ->> 'ok')::boolean then
    raise exception 'create_proposal: %', r #>> '{error,detalle}';
  end if;
  v_prop := (r #>> '{resultado,propuesta_id}')::uuid;
  r := public.open_proposal(v_prop);
  if not (r ->> 'ok')::boolean then
    raise exception 'open_proposal: %', r #>> '{error,detalle}';
  end if;
  insert into cruce.invitaciones_agente (propuesta_id, miembro_id, ejecucion_id, texto, creada_en)
  select v_prop, (d #>> '{}')::uuid, e.id, e.texto, cruce.ahora()
  from jsonb_array_elements(v_plan -> 'destinatarios') d;
  get diagnostics v_inv = row_count;
  update cruce.ejecuciones_agente x set estado = 'publicada', propuesta_id = v_prop, actualizada_en = cruce.ahora()
  where x.id = e.id;
  v_res := jsonb_build_object('propuesta', jsonb_build_object('id', v_prop), 'invitados', v_inv);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'publicar_borrador_agente', v_params, e.espacio_id, v_org,
                                cruce.generacion(e.espacio_id), v_prop, v_res);
  return cruce.ok(v_res || jsonb_build_object('repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('publicar_borrador_agente', sqlstate, v_ctx);
end
$$;

create or replace function public.cerrar_ejecucion_agente(p_ejecucion_id uuid, p_estado text, p_motivo text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  e cruce.ejecuciones_agente%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_ejecucion_id is null or p_estado is distinct from 'fallida'
     or p_motivo is null or p_motivo not in ('sin_plan', 'candidatos_rechazados', 'modelo_fallo', 'reemplazada') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if not found or not cruce.bloquear_espacio(e.espacio_id)
     or not exists (select 1 from cruce.miembros m where m.espacio_id = e.espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if cruce.organizador_de(e.espacio_id, v_uid) is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id for update;
  if e.estado = 'publicada' then
    return cruce.err('opcion_desactualizada', 'ejecucion_publicada', null);
  end if;
  if e.estado = 'fallida' then
    return cruce.ok(jsonb_build_object('ejecucion', cruce.ejecucion_json(e), 'repetido', true));
  end if;
  update cruce.ejecuciones_agente x set estado = 'fallida', motivo = p_motivo, actualizada_en = cruce.ahora()
  where x.id = e.id returning * into e;
  return cruce.ok(jsonb_build_object('ejecucion', cruce.ejecucion_json(e), 'repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('cerrar_ejecucion_agente', sqlstate, v_ctx);
end
$$;

-- ===================== 5. Lecturas existentes (aditivo) =====================
-- get_my_preferences: `recibir_invitaciones_agente` a nivel raíz (solo el propio). Cuerpo de 0031 + 0036.
create or replace function public.get_my_preferences(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_recibir boolean;
  pr cruce.preferencias%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select m.id, m.recibir_invitaciones_agente into v_yo, v_recibir
  from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into pr from cruce.preferencias x where x.miembro_id = v_yo;
  return cruce.ok(jsonb_build_object(
    'preferencias', cruce.preferencias_json(pr),
    'usar_en_agente', coalesce(pr.usar_en_agente, true),
    -- E11: consentimiento aparte para recibir invitaciones; false por defecto.
    'recibir_invitaciones_agente', v_recibir,
    'actualizadas_en', cruce.momento(pr.actualizadas_en),
    'opciones', jsonb_build_object('actividades', (
      select jsonb_agg(jsonb_build_object('clave', a.actividad, 'etiqueta', a.etiqueta) order by a.orden)
      from (select c.actividad, min(c.actividad_etiqueta) as etiqueta, min(c.orden) as orden
            from cruce.catalogo_agente c group by c.actividad) a)),
    'personas_con_preferencias', (select count(*) from cruce.preferencias x where x.espacio_id = p_espacio_id and x.usar_en_agente)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_my_preferences', sqlstate, v_ctx);
end
$$;

-- vista_propuesta: mi_situacion.invitacion_agente solo para la persona invitada. Cuerpo de 0022/0027.
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
  -- E11: la invitación del agente es de cada persona; nadie ve a quién más invitaron.
  v := jsonb_set(v, '{mi_situacion,invitacion_agente}', coalesce(
    (select jsonb_build_object('texto', i.texto) from cruce.invitaciones_agente i
     where i.propuesta_id = p_prop and i.miembro_id = p_yo), 'null'::jsonb));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

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
      'puede_aceptar', v #> '{mi_situacion,puede,aceptar}',
      'invitacion_agente', v #> '{mi_situacion,invitacion_agente}'));
end
$$;

-- ===================== 6. Catálogo: lista permitida 40 =====================
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
    'aprobar_borrador_agente', 'publicar_borrador_agente', 'cerrar_ejecucion_agente'];
  v text;
begin
  if (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') <> 40 then
    raise exception 'A5: public no tiene exactamente 40 funciones';
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

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.agente_social_contexto(uuid)', 'public.agente_social_candidatos(uuid, date, jsonb)',
    'public.set_recibir_invitaciones_agente(uuid, boolean)', 'public.set_politica_agente_social(uuid, text, uuid)',
    'public.iniciar_ejecucion_agente(uuid, uuid, text, text)', 'public.guardar_borrador_agente(uuid, text, text)',
    'public.aprobar_borrador_agente(uuid, text, uuid)', 'public.publicar_borrador_agente(uuid, text, uuid)',
    'public.cerrar_ejecucion_agente(uuid, text, text)', 'public.get_my_preferences(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end
$$;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
