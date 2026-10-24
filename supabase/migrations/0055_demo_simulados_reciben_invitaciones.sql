-- CRUCE · 0055 · En las demos, los amigos simulados reciben invitaciones del agente (decisión del coordinador en nombre
-- de Nico, 02:0x): sin esto, "Preparar borrador social" en una demo nueva termina en "No hay un plan disponible"
-- (nadie aceptó invitaciones) y el agente social no se puede mostrar con un solo teléfono.
--   * seed_demo_space y add_simulated_member (las dos solo crean simulados en espacios demo, E7.3): el simulado nace con
--     recibir_invitaciones_agente = true. El organizador no cambia: su permiso lo da él en la pantalla.
--   * cruce.plan_agente (destinatarios e `invitados` del plan, entran en el hash) y agente_social_contexto
--     (`destinatarios`): además de las personas reales con sesión, cuentan los simulados de espacios demo. Los
--     pendientes (sin sesión y no simulados) siguen sin ser destinatarios. Fuera de las demos no cambia nada.
--   * UPDATE de las demos existentes con el mismo criterio (simulados de espacios demo; datos ficticios).
--   * Un borrador del agente preparado antes en una demo da borrador_cambiado al publicar (cambian los destinatarios):
--     se rehace. Sin RPC nuevas ni firmas (41/0). Cuerpos de 0054 (seed), 0025 (add_simulated_member), 0041
--     (agente_social_contexto) y 0050 (plan_agente), con los cambios marcados "0055".

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
  -- 0055: en la demo, los amigos simulados nacen con las invitaciones del agente activadas (el organizador, no:
  -- lo decide él en la pantalla). Solo acá y en add_simulated_member, que también es solo demo.
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora(), true);
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora(), true);
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
  -- 0055: en la demo (esta función solo corre en demos, E7.3) un simulado nace con las invitaciones del agente activadas.
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
  values (p_espacio_id, null, v_vis, 'miembro', true, cruce.ahora(), true) returning id into v_m;
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
                        -- 0055: en una demo, los simulados también cuentan; los pendientes, nunca.
                        and (m.user_id is not null
                             or (m.simulado and exists (select 1 from cruce.espacios e where e.id = m.espacio_id and e.demo))))));
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
  where m.espacio_id = p_esp and m.recibir_invitaciones_agente and m.id <> p_org
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

update cruce.miembros m set recibir_invitaciones_agente = true
from cruce.espacios e
where e.id = m.espacio_id and e.demo and m.simulado and not m.recibir_invitaciones_agente;

revoke all on function public.seed_demo_space() from public, anon, authenticated;
grant execute on function public.seed_demo_space() to authenticated;
revoke all on function public.add_simulated_member(uuid, text) from public, anon, authenticated;
grant execute on function public.add_simulated_member(uuid, text) to authenticated;
revoke all on function public.agente_social_contexto(uuid) from public, anon, authenticated;
grant execute on function public.agente_social_contexto(uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
