-- CRUCE · 0035 · Enmienda 10, Parte A (docs/contrato-enmienda-10.md, mejora #85): zona, movilidad, tiempo
-- máximo de viaje y momento del día. Regla: nadie viaja demasiado y nadie queda sin forma de llegar, sin que
-- nadie sepa quién vive dónde ni quién no tiene auto.
--   * cruce.preferencias suma cuatro columnas opcionales (null = esa persona no aporta esa variable):
--     zona, movilidad, tiempo_max (texto '15'|'30'|'45'|'60') y momento.
--   * cruce.validar_preferencias acepta esas cuatro claves como opcionales (lista cerrada de valores; tipo
--     distinto o valor fuera de la lista: preferencias_invalidas). Las cinco claves de siempre siguen siendo
--     obligatorias.
--   * save_my_preferences guarda lo que venga y deja en null la clave que falte (como usar_en_agente, guardar
--     es reemplazar). Devuelve las cuatro dentro de `preferencias` (null si faltan; 0036 las saca si son null).
--     get_my_preferences igual, vía cruce.preferencias_json, solo a la propia persona.
--   * simulate_save_preferences (demo, organizador) acepta las mismas claves; si una falta, CONSERVA el valor
--     guardado (así cambiar los gustos de un simulado en vivo no borra su viaje de la semilla).
--   * Contexto privado sin personas: cruce.catalogo_agente.zona (una de las 8) y cruce.tiempos_zona (origen,
--     destino, modo, minutos) con valores ESTIMADOS y FICTICIOS: distancia aproximada entre comunas por un factor
--     de calle, a velocidades medias de auto, transporte público y bici o a pie, redondeado a 5. Misma zona: 10.
--   * proponer_plan_borrador (reglas fijas, solo filas con usar_en_agente):
--     1. minutos de cada persona con zona y movilidad hacia la zona de cada candidata (auto_* → auto;
--        transporte_publico; bici_o_pie; me_llevan → auto si los auto_con_lugar suman ceil(N_me_llevan / 3),
--        si no transporte_publico).
--     2. descarta la candidata si a alguien con tiempo_max sus minutos lo superan ('60' nunca descarta). Si
--        todas quedan fuera por viaje: sin_plan_compatible con motivo "sin_lugar_cerca_para_todos".
--     3. puntaje: resta 1 por cada 15 minutos completos de viaje máximo por encima de 30; a igualdad de puntaje,
--        menor viaje máximo y después menor suma (antes del precio y el orden de siempre).
--     4. momento: suma 2 por cada persona cuyo momento coincide con el inicio de la franja (antes de las 13
--        mañana, 13 a 19 tarde, desde las 19 noche); da_igual no suma; no descarta.
--     5. sin zona o sin movilidad: fuera del cálculo de viaje.
--     Cada candidata trae `viaje` = {max_minutos, estimado: true} solo si al menos 4 personas aportaron zona y
--     movilidad; si no, null. El `viaje` de arriba es el de la primera candidata. Nunca minutos por persona,
--     zonas, modos ni quién necesita que lo lleven. perfil_grupo no cambia.
--   * Semillas del demo: Mati, Caro, Fede y Sofi reciben zona, movilidad, tiempo y momento ficticios;
--     reset_demo los repone (llama a cruce.sembrar_preferencias_demo). Luna sigue sin semilla.
-- Sin RPC nuevas ni cambio de firma (31 authenticated, 0 anon). Cuerpos copiados de 0031 (save, get, sembrar,
-- proponer) y de 0019 (simulate); solo cambian las líneas de la enmienda 10.

-- 1. Preferencias: cuatro columnas opcionales.
alter table cruce.preferencias
  add column zona text check (zona in ('providencia', 'nunoa', 'las_condes', 'santiago_centro', 'maipu',
                                       'la_florida', 'puente_alto', 'vitacura')),
  add column movilidad text check (movilidad in ('auto_con_lugar', 'auto_sin_lugar', 'transporte_publico',
                                                 'bici_o_pie', 'me_llevan')),
  add column tiempo_max text check (tiempo_max in ('15', '30', '45', '60')),
  add column momento text check (momento in ('manana', 'tarde', 'noche', 'da_igual'));

-- 2. Catálogo: zona de cada lugar (ficticia).
alter table cruce.catalogo_agente add column zona text;
update cruce.catalogo_agente set zona = case id
  when 'lugar-sim-01' then 'nunoa'
  when 'lugar-sim-02' then 'las_condes'
  when 'lugar-sim-03' then 'nunoa'
  when 'lugar-sim-04' then 'providencia'
  when 'evento-sim-01' then 'santiago_centro'
  else 'santiago_centro' end;
alter table cruce.catalogo_agente alter column zona set not null,
  add constraint catalogo_agente_zona_check check (zona in ('providencia', 'nunoa', 'las_condes', 'santiago_centro',
                                                            'maipu', 'la_florida', 'puente_alto', 'vitacura'));

-- 3. Tiempos zona a zona: estimados y ficticios, sin API externa. Coordenadas aproximadas en km respecto del
-- centro; distancia en línea recta por 1,3 (calles); auto 8 + 1,8 min/km, transporte público 15 + 3 min/km,
-- bici o a pie 8 + 4,5 min/km; redondeado a 5. Misma zona: 10 en cualquier modo.
create table cruce.tiempos_zona (
  origen text not null,
  destino text not null,
  modo text not null check (modo in ('auto', 'transporte_publico', 'bici_o_pie')),
  minutos integer not null check (minutos > 0),
  primary key (origen, destino, modo)
);
alter table cruce.tiempos_zona enable row level security;
revoke all on table cruce.tiempos_zona from public, anon, authenticated;

insert into cruce.tiempos_zona (origen, destino, modo, minutos)
select a.zona, b.zona, m.modo,
       case when a.zona = b.zona then 10
            else (round((m.base + m.por_km * 1.3 * sqrt(power(a.x - b.x, 2) + power(a.y - b.y, 2))) / 5) * 5)::int end
from (values ('santiago_centro', 0, 0), ('providencia', 4, 1), ('nunoa', 5, -2), ('las_condes', 10, 2),
             ('vitacura', 8, 4), ('maipu', -10, -4), ('la_florida', 5, -9), ('puente_alto', 6, -17)) a (zona, x, y)
cross join (values ('santiago_centro', 0, 0), ('providencia', 4, 1), ('nunoa', 5, -2), ('las_condes', 10, 2),
                   ('vitacura', 8, 4), ('maipu', -10, -4), ('la_florida', 5, -9), ('puente_alto', 6, -17)) b (zona, x, y)
cross join (values ('auto', 8.0, 1.8), ('transporte_publico', 15.0, 3.0), ('bici_o_pie', 8.0, 4.5)) m (modo, base, por_km);

-- 4. Validación: las cinco claves de siempre obligatorias; las cuatro nuevas opcionales y de lista cerrada.
create or replace function cruce.validar_preferencias(p jsonb) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_el jsonb;
  v_vistas text[] := array[]::text[];
  v_claves text[];
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return 'formato_invalido';
  end if;
  select array_agg(k order by k) into v_claves from jsonb_object_keys(p) k;
  if not (v_claves @> array['ambiente', 'energia', 'lugar', 'me_gustaria', 'presupuesto'])
     or not (v_claves <@ array['ambiente', 'energia', 'lugar', 'me_gustaria', 'presupuesto',
                               'zona', 'movilidad', 'tiempo_max', 'momento']) then
    return 'preferencias_invalidas';
  end if;
  if jsonb_typeof(p -> 'presupuesto') <> 'string' or p ->> 'presupuesto' not in ('da_igual', 'algo_barato', 'ojala_gratis')
     or jsonb_typeof(p -> 'energia') <> 'string' or p ->> 'energia' not in ('con_todo', 'algo_tranquilo')
     or jsonb_typeof(p -> 'ambiente') <> 'string' or p ->> 'ambiente' not in ('fiesta', 'tranquilo', 'da_igual')
     or jsonb_typeof(p -> 'lugar') <> 'string' or p ->> 'lugar' not in ('da_igual', 'bajo_techo')
     or jsonb_typeof(p -> 'me_gustaria') <> 'array'
     or jsonb_array_length(p -> 'me_gustaria') not between 1 and 6 then
    return 'preferencias_invalidas';
  end if;
  -- E10: claves opcionales; si vienen, texto de la lista cerrada (tiempo_max también es texto).
  if (p ? 'zona' and (jsonb_typeof(p -> 'zona') <> 'string' or p ->> 'zona' not in
        ('providencia', 'nunoa', 'las_condes', 'santiago_centro', 'maipu', 'la_florida', 'puente_alto', 'vitacura')))
     or (p ? 'movilidad' and (jsonb_typeof(p -> 'movilidad') <> 'string' or p ->> 'movilidad' not in
        ('auto_con_lugar', 'auto_sin_lugar', 'transporte_publico', 'bici_o_pie', 'me_llevan')))
     or (p ? 'tiempo_max' and (jsonb_typeof(p -> 'tiempo_max') <> 'string' or p ->> 'tiempo_max' not in ('15', '30', '45', '60')))
     or (p ? 'momento' and (jsonb_typeof(p -> 'momento') <> 'string' or p ->> 'momento' not in
        ('manana', 'tarde', 'noche', 'da_igual'))) then
    return 'preferencias_invalidas';
  end if;
  for v_el in select x from jsonb_array_elements(p -> 'me_gustaria') x loop
    if jsonb_typeof(v_el) <> 'string'
       or not exists (select 1 from cruce.catalogo_agente c where c.actividad = v_el #>> '{}')
       or (v_el #>> '{}') = any (v_vistas) then
      return 'preferencias_invalidas';
    end if;
    v_vistas := v_vistas || (v_el #>> '{}');
  end loop;
  return null;
end
$$;

create or replace function cruce.preferencias_json(pr cruce.preferencias) returns jsonb
language sql stable set search_path = '' as $$
  select case when pr.miembro_id is null then null else jsonb_build_object(
    'presupuesto', pr.presupuesto, 'energia', pr.energia, 'ambiente', pr.ambiente, 'lugar', pr.lugar,
    'me_gustaria', to_jsonb(pr.me_gustaria),
    'zona', pr.zona, 'movilidad', pr.movilidad, 'tiempo_max', pr.tiempo_max, 'momento', pr.momento) end
$$;

-- 5. save_my_preferences: guarda las cuatro (null si faltan) y las devuelve a la propia persona.
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
      'me_gustaria', to_jsonb(v_me),
      'zona', p_preferencias ->> 'zona', 'movilidad', p_preferencias ->> 'movilidad',
      'tiempo_max', p_preferencias ->> 'tiempo_max', 'momento', p_preferencias ->> 'momento'),
    'usar_en_agente', v_usar,
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('save_my_preferences', sqlstate, v_ctx);
end
$$;

-- 6. simulate_save_preferences: las cuatro claves opcionales; si faltan, conserva lo guardado.
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
      'me_gustaria', to_jsonb(v_me),
      'zona', v_zona, 'movilidad', v_movilidad, 'tiempo_max', v_tiempo, 'momento', v_momento),
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_save_preferences', sqlstate, v_ctx);
end
$$;

-- 7. Semillas del demo: viaje y momento ficticios para los cuatro simulados.
create or replace function cruce.sembrar_preferencias_demo(p_esp uuid) returns void
language sql volatile set search_path = '' as $$
  delete from cruce.preferencias pr
  using cruce.miembros m, cruce.espacios e
  where pr.miembro_id = m.id and m.espacio_id = p_esp and e.id = m.espacio_id and e.demo and m.simulado
    and lower(m.nombre) not in ('mati', 'caro', 'fede', 'sofi');

  insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en,
                                  usar_en_agente, zona, movilidad, tiempo_max, momento)
  select m.id, m.espacio_id, s.presupuesto, s.energia, s.ambiente, s.lugar, s.me_gustaria, cruce.ahora(), true,
         s.zona, s.movilidad, s.tiempo_max, s.momento
  from cruce.miembros m
  join (values
    ('mati', 'algo_barato', 'con_todo', 'da_igual', 'da_igual', array['asado', 'futbol'], 'nunoa', 'auto_con_lugar', '45', 'tarde'),
    ('caro', 'da_igual', 'algo_tranquilo', 'tranquilo', 'bajo_techo', array['asado', 'parque'], 'providencia', 'transporte_publico', '45', 'tarde'),
    ('fede', 'da_igual', 'con_todo', 'fiesta', 'da_igual', array['futbol', 'fiesta'], 'las_condes', 'auto_sin_lugar', '60', 'noche'),
    ('sofi', 'algo_barato', 'algo_tranquilo', 'da_igual', 'da_igual', array['asado'], 'santiago_centro', 'me_llevan', '45', 'da_igual')
  ) as s (nombre, presupuesto, energia, ambiente, lugar, me_gustaria, zona, movilidad, tiempo_max, momento)
    on s.nombre = lower(m.nombre)
  join cruce.espacios e on e.id = m.espacio_id
  where m.espacio_id = p_esp and m.simulado and e.demo
  on conflict (miembro_id) do update
    set presupuesto = excluded.presupuesto, energia = excluded.energia, ambiente = excluded.ambiente,
        lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en,
        usar_en_agente = true, zona = excluded.zona, movilidad = excluded.movilidad,
        tiempo_max = excluded.tiempo_max, momento = excluded.momento;
$$;

-- Los demos existentes reciben la semilla nueva de viaje y momento (solo las cuatro columnas; los gustos que
-- se hayan cambiado en vivo no se tocan; reset_demo vuelve a todo).
update cruce.preferencias pr
set zona = s.zona, movilidad = s.movilidad, tiempo_max = s.tiempo_max, momento = s.momento
from cruce.miembros m
join cruce.espacios e on e.id = m.espacio_id and e.demo
join (values ('mati', 'nunoa', 'auto_con_lugar', '45', 'tarde'), ('caro', 'providencia', 'transporte_publico', '45', 'tarde'),
             ('fede', 'las_condes', 'auto_sin_lugar', '60', 'noche'), ('sofi', 'santiago_centro', 'me_llevan', '45', 'da_igual'))
  as s (nombre, zona, movilidad, tiempo_max, momento) on s.nombre = lower(m.nombre)
where pr.miembro_id = m.id and m.simulado and pr.zona is null;

-- 8. proponer_plan_borrador con viaje, equidad y momento.
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
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_rol is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;

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
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
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
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
  where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo;
  v_energia_o := case when v_con_o > v_tranq_o then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente_o := case when v_fiesta_o > v_amb_tranq_o then 'fiesta' when v_amb_tranq_o > v_fiesta_o then 'tranquilo' end;
  select max(x.n) into v_max_marcas_o
  from (select a, count(*) as n
        from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
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
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and cat.actividad = any (pr.me_gustaria)) as marcas,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
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
        join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
        join cruce.tiempos_zona t on t.origen = pr.zona and t.destino = cat.zona
          and t.modo = case pr.movilidad when 'auto_con_lugar' then 'auto' when 'auto_sin_lugar' then 'auto'
                                         when 'me_llevan' then v_modo_llevan else pr.movilidad end
        where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.zona is not null and pr.movilidad is not null
      ) v on true
      where cat.sab_inicio is not null and cat.dom_inicio is not null
        and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
        and not (not cat.techado and v_techo and v_clima_malo)
    ) k
    where not k.lejos
    order by 3 * (case when v_n_otros > 3 then k.marcas else 0 end)
             + k.suma_energia::int + k.suma_ambiente::int + k.suma_clima::int + k.suma_momento
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
                    then jsonb_build_object('max_minutos', c.viaje_max, 'estimado', true) end);
    v_candidatas := v_candidatas || jsonb_build_array(v_cand);
  end loop;

  if jsonb_array_length(v_candidatas) = 0 then
    -- E10: si había lugares por precio y techo pero todos quedaron lejos para alguien, se dice sin decir para quién.
    if exists (select 1 from cruce.catalogo_agente cat
               where cat.sab_inicio is not null and cat.dom_inicio is not null
                 and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                 and not (not cat.techado and v_techo and v_clima_malo)) then
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
              from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
              cross join unnest(pr.me_gustaria) a
              join cruce.catalogo_agente cat on cat.actividad = a
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo
              group by cat.actividad_etiqueta
              -- #28: una actividad elegida por una sola persona no sale (ni como total).
              having count(distinct pr.miembro_id) >= 2) g),
      'energia_mayoritaria', v_energia_o,
      'ambiente_mayoritario', v_ambiente_o);
  end if;

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
    'candidatas', v_candidatas,
    'perfil_grupo', v_perfil)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('proponer_plan_borrador', sqlstate, v_ctx);
end
$$;

revoke all on function public.save_my_preferences(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_my_preferences(uuid, jsonb) to authenticated;
revoke all on function public.simulate_save_preferences(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.simulate_save_preferences(uuid, uuid, jsonb) to authenticated;
revoke all on function public.proponer_plan_borrador(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.proponer_plan_borrador(uuid, date, jsonb) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
