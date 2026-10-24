-- CRUXE · 0062 · Caso canónico Makana ajustado para que el relato del pitch sea exacto (aplicada 24 oct 11:40):
-- mínimo 4 y Joaco «no puede faltar» → v1 sábado (Bastián, Nacho, Charlie, Joaco); Joaco se baja → En revisión →
-- v2 domingo (Bastián, Nacho, Kai, Carlos). Para eso Kai (y su alias viejo Diego) pasan a «solo domingo».
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
    when 'joaco' then '{"A": "si", "B": "si"}'::jsonb
    when 'felipe' then '{"A": "si", "B": "si"}'::jsonb
    when 'charlie' then '{"A": "si", "B": "no"}'::jsonb
    when 'elena' then '{"A": "si", "B": "no"}'::jsonb
    when 'kai' then '{"A": "no", "B": "si"}'::jsonb
    when 'diego' then '{"A": "no", "B": "si"}'::jsonb
    when 'carlos' then '{"A": "no", "B": "si"}'::jsonb
    when 'camila' then '{"A": "no", "B": "si"}'::jsonb
  end
$$;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
