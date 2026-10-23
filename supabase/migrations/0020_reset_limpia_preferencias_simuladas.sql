-- CRUCE · 0020 · Enmienda 5: reset_demo deshace TODO cambio en vivo de preferencias simuladas.
-- Antes, la semilla solo sobrescribía a Mati, Caro, Fede y Sofi. Si el organizador cargaba preferencias en
-- vivo a otro asiento simulado (Luna o uno agregado), quedaban después del reinicio y ese asiento seguía
-- "en uso" (A2): Luna no se podía reclamar en la demo siguiente. Ahora el reinicio borra las preferencias
-- de los simulados que no tienen semilla y recarga las semillas. Nunca toca a miembros reales.
create or replace function cruce.sembrar_preferencias_demo(p_esp uuid) returns void
language sql volatile set search_path = '' as $$
  delete from cruce.preferencias pr
  using cruce.miembros m, cruce.espacios e
  where pr.miembro_id = m.id and m.espacio_id = p_esp and e.id = m.espacio_id and e.demo and m.simulado
    and lower(m.nombre) not in ('mati', 'caro', 'fede', 'sofi');

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
        lugar = excluded.lugar, me_gustaria = excluded.me_gustaria, actualizadas_en = excluded.actualizadas_en;
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
