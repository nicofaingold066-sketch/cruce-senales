-- CRUCE · 0037 · Enmienda 10, Parte A, corrección (mejora #85): cruce.validar_preferencias con un objeto sin
-- claves (p. ej. save_my_preferences con solo `usar_en_agente`, que validar_preferencias_propias quita) dejaba
-- pasar la entrada: array_agg de cero claves es null y `not (null @> …)` también. La guardada fallaba después por
-- not null y respondía fallo_temporal en vez de entrada_incompleta/preferencias_invalidas (lo vio
-- tests/backend/enmienda8.test.ts, prueba 3). Ahora la lista de claves vacía es '{}'. Cuerpo copiado de 0035.

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
  -- 0037: sin claves, array_agg da null y las comparaciones de abajo también; se cuenta como lista vacía.
  select coalesce(array_agg(k order by k), '{}') into v_claves from jsonb_object_keys(p) k;
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

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
