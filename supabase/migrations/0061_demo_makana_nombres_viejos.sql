-- CRUXE · 0061 · Las demos Makana sembradas antes de 0059 (Ana, Bruno, Camila, Diego, Elena, Felipe, Gabriela)
-- también quedan cargadas: mismos gustos y mismo caso canónico que sus equivalentes nuevos
-- (Bruno→Nacho, Camila→Carlos, Diego→Kai, Elena→Charlie, Felipe→Joaco, Gabriela→Pía).
-- Aplicada 24 oct 11:29 junto con la siembra de gustos en todas las demos Makana existentes.
-- Cuerpos: ver 0060 (misma estructura; se agregan los alias viejos en caso_canonico y en la tabla de gustos).
create or replace function cruce.caso_canonico(p_nombre text) returns jsonb
language sql immutable set search_path = '' as $$
  select case lower(p_nombre)
    when 'luna' then '{"A": "si", "B": "si"}'::jsonb
    when 'mati' then '{"A": "si", "B": "si"}'::jsonb
    when 'caro' then '{"A": "si", "B": "no"}'::jsonb
    when 'fede' then '{"A": "no", "B": "si"}'::jsonb
    when 'sofi' then '{"A": "no", "B": "si"}'::jsonb
    when 'nacho' then '{"A": "si", "B": "si"}'::jsonb
    when 'bruno' then '{"A": "si", "B": "si"}'::jsonb
    when 'kai' then '{"A": "si", "B": "si"}'::jsonb
    when 'diego' then '{"A": "si", "B": "si"}'::jsonb
    when 'joaco' then '{"A": "si", "B": "si"}'::jsonb
    when 'felipe' then '{"A": "si", "B": "si"}'::jsonb
    when 'charlie' then '{"A": "si", "B": "no"}'::jsonb
    when 'elena' then '{"A": "si", "B": "no"}'::jsonb
    when 'carlos' then '{"A": "no", "B": "si"}'::jsonb
    when 'camila' then '{"A": "no", "B": "si"}'::jsonb
  end
$$;

create or replace function cruce.sembrar_preferencias_makana(p_esp uuid) returns void
language sql set search_path = '' as $$
  delete from cruce.preferencias pr
  using cruce.miembros m, cruce.espacios e
  where pr.miembro_id = m.id and m.espacio_id = p_esp and e.id = m.espacio_id and e.demo and m.simulado
    and lower(m.nombre) not in ('nacho', 'carlos', 'kai', 'charlie', 'joaco', 'pia', 'pía',
                                'bruno', 'camila', 'diego', 'elena', 'felipe', 'gabriela');

  insert into cruce.preferencias (miembro_id, espacio_id, presupuesto, energia, ambiente, lugar, me_gustaria, actualizadas_en,
                                  usar_en_agente, zona, movilidad, tiempo_max, momento)
  select m.id, m.espacio_id, s.presupuesto, s.energia, s.ambiente, s.lugar, s.me_gustaria, cruce.ahora(), true,
         s.zona, s.movilidad, s.tiempo_max, s.momento
  from cruce.miembros m
  join (values
    ('nacho',    'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'auto_con_lugar',     '45', 'tarde'),
    ('bruno',    'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'auto_con_lugar',     '45', 'tarde'),
    ('carlos',   'ojala_gratis', 'con_todo',       'da_igual',  'da_igual', array['padel', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('camila',   'ojala_gratis', 'con_todo',       'da_igual',  'da_igual', array['padel', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('kai',      'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'me_llevan',          '30', 'tarde'),
    ('diego',    'da_igual',     'con_todo',       'da_igual',  'da_igual', array['padel', 'asado'],  'providencia',     'me_llevan',          '30', 'tarde'),
    ('charlie',  'da_igual',     'algo_tranquilo', 'tranquilo', 'da_igual', array['asado', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('elena',    'da_igual',     'algo_tranquilo', 'tranquilo', 'da_igual', array['asado', 'parque'], 'nunoa',           'transporte_publico', '45', 'tarde'),
    ('joaco',    'algo_barato',  'con_todo',       'da_igual',  'da_igual', array['padel', 'futbol'], 'santiago_centro', 'auto_sin_lugar',     '60', 'tarde'),
    ('felipe',   'algo_barato',  'con_todo',       'da_igual',  'da_igual', array['padel', 'futbol'], 'santiago_centro', 'auto_sin_lugar',     '60', 'tarde'),
    ('pia',      'da_igual',     'algo_tranquilo', 'da_igual',  'da_igual', array['asado', 'parque'], 'las_condes',      'me_llevan',          '45', 'da_igual'),
    ('pía',      'da_igual',     'algo_tranquilo', 'da_igual',  'da_igual', array['asado', 'parque'], 'las_condes',      'me_llevan',          '45', 'da_igual'),
    ('gabriela', 'da_igual',     'algo_tranquilo', 'da_igual',  'da_igual', array['asado', 'parque'], 'las_condes',      'me_llevan',          '45', 'da_igual')
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
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.sembrar_preferencias_makana(e.id) from cruce.espacios e where e.demo and e.demo_caso = 'makana';
select cruce.verificar_privilegios();
