-- Reversa de la 0055 (simulados de la demo reciben invitaciones). NO es una migración: se corre a mano solo si rompe
-- producción. Devuelve seed_demo_space (0054), add_simulated_member (0025), agente_social_contexto (0041) y
-- cruce.plan_agente (0050), y apaga el permiso de los simulados (ellos no pueden encenderlo solos: todo true vino de la 0055).
begin;
create or replace function public.seed_demo_space() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
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
  values ('Los del finde', 'amigos', true, v_uid, cruce.generar_codigo(), cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, 'Tomi', 'organizador', false, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora());
  perform cruce.sembrar_preferencias_demo(v_esp);

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;

create or replace function public.add_simulated_member(p_espacio_id uuid, p_nombre_visible text) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
  v_det text;
  yo cruce.miembros%rowtype;
  v_m uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  perform cruce.bloquear_espacio(p_espacio_id);
  select * into yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if not found then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  if yo.rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  -- E7.3: solo en espacios demo.
  if not exists (select 1 from cruce.espacios e where e.id = p_espacio_id and e.demo) then
    return cruce.err('no_autorizado', 'espacio_no_demo', null);
  end if;
  if exists (select 1 from cruce.miembros m where m.espacio_id = p_espacio_id and lower(m.nombre) = lower(v_vis)) then
    return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
  end if;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (p_espacio_id, null, v_vis, 'miembro', true, cruce.ahora()) returning id into v_m;
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('miembro_id', v_m),
    'espacio', cruce.espacio_json(p_espacio_id, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('add_simulated_member', sqlstate, v_ctx);
end
$$;

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
  select least(20, count(*)) into v_max from cruce.miembros m where m.espacio_id = p_esp;
  select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_esp;
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

update cruce.miembros m set recibir_invitaciones_agente = false
from cruce.espacios e
where e.id = m.espacio_id and e.demo and m.simulado and m.recibir_invitaciones_agente;

revoke all on function public.seed_demo_space() from public, anon, authenticated;
grant execute on function public.seed_demo_space() to authenticated;
revoke all on function public.add_simulated_member(uuid, text) from public, anon, authenticated;
grant execute on function public.add_simulated_member(uuid, text) to authenticated;
revoke all on function public.agente_social_contexto(uuid) from public, anon, authenticated;
grant execute on function public.agente_social_contexto(uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
commit;
