-- CRUXE · 0060 · La demo Makana nace cargada (pedido de Nico, 24 oct 11:25): los seis amigos simulados traen
-- gustos coherentes (pádel y comida, poca discrepancia) con usar_en_agente = true y reciben invitaciones del agente,
-- y el atajo «Cargar las respuestas» de la Simulación vuelve a funcionar para ellos (caso canónico Makana).
-- Caso: franja A = sábado, B = domingo. Nacho, Kai y Joaco pueden los dos días; Charlie solo el sábado; Carlos solo
-- el domingo; Pía no responde (queda fuera del caso). Joaco es quien confirma la v1 y se baja en la demo en vivo.
-- Las demos Makana ya sembradas toman los gustos nuevos al tocar «Reiniciar demo» (reset_demo → sembrar).
-- Reversa: volver a aplicar las funciones de 20261024124500_demo_makana.sql (wrappers) y la caso_canonico de 0028.

-- 1. Caso canónico: suma los nombres de Makana (los de «Los del finde» siguen igual).
create or replace function cruce.caso_canonico(p_nombre text) returns jsonb
language sql immutable set search_path = '' as $$
  select case lower(p_nombre)
    when 'luna' then '{"A": "si", "B": "si"}'::jsonb
    when 'mati' then '{"A": "si", "B": "si"}'::jsonb
    when 'caro' then '{"A": "si", "B": "no"}'::jsonb
    when 'fede' then '{"A": "no", "B": "si"}'::jsonb
    when 'sofi' then '{"A": "no", "B": "si"}'::jsonb
    -- Makana (0060)
    when 'nacho' then '{"A": "si", "B": "si"}'::jsonb
    when 'kai' then '{"A": "si", "B": "si"}'::jsonb
    when 'joaco' then '{"A": "si", "B": "si"}'::jsonb
    when 'charlie' then '{"A": "si", "B": "no"}'::jsonb
    when 'carlos' then '{"A": "no", "B": "si"}'::jsonb
  end
$$;

-- 2. Gustos de los seis amigos simulados de Makana (coherentes: pádel + comida; todos usables por el agente).
create or replace function cruce.sembrar_preferencias_makana(p_esp uuid) returns void
language sql set search_path = '' as $$
  delete from cruce.preferencias pr
  using cruce.miembros m, cruce.espacios e
  where pr.miembro_id = m.id and m.espacio_id = p_esp and e.id = m.espacio_id and e.demo and m.simulado
    and lower(m.nombre) not in ('nacho', 'carlos', 'kai', 'charlie', 'joaco', 'pia', 'pía');

  insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en,
                                  usar_en_agente, zona, movilidad, tiempo_max, momento)
  select m.id, m.espacio_id, s.presupuesto, s.energia, s.ambiente, s.lugar, s.me_gustaria, cruce.ahora(), true,
         s.zona, s.movilidad, s.tiempo_max, s.momento
  from cruce.miembros m
  join (values
    ('nacho',   'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'auto_con_lugar',     '45', 'tarde'),
    ('carlos',  'ojala_gratis', 'con_todo',       'da_igual',  'da_igual', array['padel', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('kai',     'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'me_llevan',          '30', 'tarde'),
    ('charlie', 'da_igual',     'algo_tranquilo', 'tranquilo', 'da_igual', array['asado', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('joaco',   'algo_barato',  'con_todo',       'da_igual',  'da_igual', array['padel', 'futbol'], 'santiago_centro', 'auto_sin_lugar',     '60', 'tarde'),
    ('pia',     'da_igual',     'algo_tranquilo', 'da_igual',  'da_igual', array['asado', 'parque'], 'las_condes',      'me_llevan',          '45', 'da_igual'),
    ('pía',     'da_igual',     'algo_tranquilo', 'da_igual',  'da_igual', array['asado', 'parque'], 'las_condes',      'me_llevan',          '45', 'da_igual')
  ) as s (nombre, presupuesto, energia, ambiente, lugar, me_gustaria, zona, movilidad, tiempo_max, momento)
    on s.nombre = lower(m.nombre)
  join cruce.espacios e on e.id = m.espacio_id
  where m.espacio_id = p_esp and m.simulado and e.demo and e.demo_caso = 'makana'
  on conflict (miembro_id) do update
    set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
        lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en,
        usar_en_agente = true, zona = excluded.zona, movilidad = excluded.movilidad,
        tiempo_max = excluded.tiempo_max, momento = excluded.momento;

  update cruce.miembros m set recibir_invitaciones_agente = true
  where m.espacio_id = p_esp and m.simulado;
$$;

-- 3. El despachador por variante siembra Makana en vez de borrar.
create or replace function cruce.sembrar_preferencias_demo(p_esp uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  if exists (select 1 from cruce.espacios e where e.id = p_esp and e.demo and e.demo_caso = 'makana') then
    perform cruce.sembrar_preferencias_makana(p_esp);
  else
    perform cruce.sembrar_preferencias_demo_antes_makana(p_esp);
  end if;
end
$$;

-- 4. La semilla: miembros con invitaciones activadas y gustos cargados desde el primer momento.
create or replace function public.seed_demo_makana() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_nombre text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  select e.id into v_esp from cruce.espacios e
  where e.demo and e.demo_de = v_uid and e.demo_caso = 'makana';
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;
  insert into cruce.espacios (nombre, tipo, demo, demo_de, demo_caso, codigo_invitacion, creado_en)
  values ('El plan que no deja a nadie afuera', 'amigos', true, v_uid, 'makana', cruce.generar_codigo(), cruce.ahora())
  returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
  values (v_esp, v_uid, 'Bastián', 'organizador', false, cruce.ahora(), false);
  foreach v_nombre in array array['Nacho', 'Carlos', 'Kai', 'Charlie', 'Joaco', 'Pía'] loop
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
    values (v_esp, null, v_nombre, 'miembro', true, cruce.ahora(), true);
  end loop;
  perform cruce.sembrar_preferencias_makana(v_esp);
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_makana', sqlstate, v_ctx);
end
$$;

-- 5. Los wrappers de 0058 que apagaban el agente en Makana pasan a ser transparentes (misma firma, mismo contrato).
create or replace function public.get_my_preferences(p_espacio_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return cruce.get_my_preferences_antes_makana(p_espacio_id);
end
$$;

create or replace function public.save_my_preferences(p_espacio_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
begin
  return cruce.save_my_preferences_antes_makana(p_espacio_id, p_preferencias);
end
$$;

create or replace function public.simulate_save_preferences(p_espacio_id uuid, p_miembro_id uuid, p_preferencias jsonb) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
begin
  return cruce.simulate_save_preferences_antes_makana(p_espacio_id, p_miembro_id, p_preferencias);
end
$$;

create or replace function public.add_simulated_member(p_espacio_id uuid, p_nombre_visible text) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
begin
  return cruce.add_simulated_member_antes_makana(p_espacio_id, p_nombre_visible);
end
$$;

-- «Cargar las respuestas» vuelve a funcionar en Makana (el caso canónico ya conoce a los seis).
create or replace function public.simulate_load_case(p_propuesta_id uuid, p_intento_id uuid) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
begin
  return cruce.simulate_load_case_antes_makana(p_propuesta_id, p_intento_id);
end
$$;

-- Reiniciar la demo Makana: limpia recibos del agente, vuelve a activar invitaciones y siembra (vía el legacy).
create or replace function public.reset_demo(p_espacio_id uuid, p_intento_id uuid) returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_makana boolean;
begin
  if v_uid is not null and p_espacio_id is not null then
    select true into v_makana from cruce.espacios e
    join cruce.miembros m on m.espacio_id = e.id and m.user_id = v_uid and m.rol = 'organizador'
    where e.id = p_espacio_id and e.demo and e.demo_caso = 'makana';
    if coalesce(v_makana, false) then
      delete from cruce.ejecuciones_agente x where x.espacio_id = p_espacio_id;
      delete from cruce.opciones_agente x where x.espacio_id = p_espacio_id;
    end if;
  end if;
  return cruce.reset_demo_antes_makana(p_espacio_id, p_intento_id);
end
$$;

revoke all on function public.seed_demo_makana() from public, anon, authenticated;
grant execute on function public.seed_demo_makana() to authenticated;
revoke all on function public.get_my_preferences(uuid), public.save_my_preferences(uuid, jsonb),
  public.simulate_save_preferences(uuid, uuid, jsonb), public.add_simulated_member(uuid, text),
  public.simulate_load_case(uuid, uuid), public.reset_demo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_my_preferences(uuid), public.save_my_preferences(uuid, jsonb),
  public.simulate_save_preferences(uuid, uuid, jsonb), public.add_simulated_member(uuid, text),
  public.simulate_load_case(uuid, uuid), public.reset_demo(uuid, uuid) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
notify pgrst, 'reload schema';
