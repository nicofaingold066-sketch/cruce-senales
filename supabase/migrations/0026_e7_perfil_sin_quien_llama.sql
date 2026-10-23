-- CRUCE · 0026 · Enmienda 7, punto E7.4 (hallazgos 4 y 7 de docs/agente-revision-privacidad.md):
-- el perfil del grupo no cuenta a quien lo pide.
-- proponer_plan_borrador:
--   * perfil_grupo se calcula sobre los miembros con preferencias distintos de quien llama: `personas`, los
--     umbrales (personas > 3 para mostrar más que la cantidad, cuantos >= 2 en gustos) y los totales de
--     gustos, energía y ambiente. Así el voto propio no hace visible una actividad que eligió una sola
--     persona más, y marcar todo o alternar la energía propia no cambia el perfil.
--   * Los mismos "demás" fijan los otros umbrales del plan: el orden por marcas (E7.1: con 3 o menos, sin
--     marcas), presupuesto_todos, ritmo_del_grupo y el_mas_elegido (más de 3 y la actividad elegida por 2 o
--     más de los demás, y la más elegida entre ellos).
--   * presupuesto_grupo sale de perfil_grupo: el servidor ya descarta por presupuesto.
-- Sin cambios: el puntaje (marcas, energía y ambiente de todos los que tienen preferencias, quien llama
-- incluido: el plan es para todo el grupo), los descartes por precio y techo, `personas_consideradas`
-- (todos), `pocas_preferencias` (menos de 2 en total) y el resto de la respuesta.
-- Se reemplaza la misma firma (A5: la lista permitida sigue en 30). Cuerpo copiado de 0024.

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

  -- Universo: miembros del espacio con preferencias (reales o simulados).
  select count(*),
         min(case pr.presupuesto when 'ojala_gratis' then 0 when 'algo_barato' then 1 else 2 end),
         coalesce(bool_or(pr.lugar = 'bajo_techo'), false),
         count(*) filter (where pr.energia = 'con_todo'), count(*) filter (where pr.energia = 'algo_tranquilo'),
         count(*) filter (where pr.ambiente = 'fiesta'), count(*) filter (where pr.ambiente = 'tranquilo')
    into v_n, v_max_precio, v_techo, v_con, v_tranq, v_fiesta, v_amb_tranq
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
  where pr.espacio_id = p_espacio_id;
  if v_n < 2 then
    return cruce.err('entrada_incompleta', 'pocas_preferencias', null);
  end if;
  v_energia := case when v_con > v_tranq then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente := case when v_fiesta > v_amb_tranq then 'fiesta' when v_amb_tranq > v_fiesta then 'tranquilo' end;
  v_clima_malo := v_sab in ('lluvia', 'desconocido') or v_dom in ('lluvia', 'desconocido');

  -- E7.4: lo mismo sin quien llama. Con esto se calculan perfil_grupo, los umbrales (personas > 3,
  -- cuantos >= 2) y el_mas_elegido: el voto propio no puede hacer visible lo que eligió una sola persona más.
  select count(*),
         count(*) filter (where pr.energia = 'con_todo'), count(*) filter (where pr.energia = 'algo_tranquilo'),
         count(*) filter (where pr.ambiente = 'fiesta'), count(*) filter (where pr.ambiente = 'tranquilo')
    into v_n_otros, v_con_o, v_tranq_o, v_fiesta_o, v_amb_tranq_o
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
  where pr.espacio_id = p_espacio_id and pr.miembro_id <> v_yo;
  v_energia_o := case when v_con_o > v_tranq_o then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente_o := case when v_fiesta_o > v_amb_tranq_o then 'fiesta' when v_amb_tranq_o > v_fiesta_o then 'tranquilo' end;
  select max(x.n) into v_max_marcas_o
  from (select a, count(*) as n
        from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
        cross join unnest(pr.me_gustaria) a
        where pr.espacio_id = p_espacio_id and pr.miembro_id <> v_yo group by a) x;

  -- 1. descarte · 2. puntaje · 3. orden de elección; las 3 primeras son las candidatas.
  -- E7.1: con 3 personas o menos las marcas no pesan en el orden, y el_mas_elegido exige más de 3 personas
  -- y al menos 2 marcas. E7.4: esas personas y esas marcas son las de los demás (sin quien llama). El puntaje
  -- en sí (marcas, energía, ambiente) y los descartes siguen usando a todos los que tienen preferencias.
  for c in
    select k.*, (v_n_otros > 3 and k.marcas_otros >= 2 and k.marcas_otros = v_max_marcas_o) as el_mas_elegido
    from (
      select cat.*,
             case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end as precio_n,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
              where pr.espacio_id = p_espacio_id and cat.actividad = any (pr.me_gustaria)) as marcas,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id
              where pr.espacio_id = p_espacio_id and pr.miembro_id <> v_yo
                and cat.actividad = any (pr.me_gustaria)) as marcas_otros,
             (cat.energia = v_energia) as suma_energia,
             coalesce(cat.ambiente = v_ambiente, false) as suma_ambiente,
             ((not cat.techado and v_sab = 'seco' and v_dom = 'seco')
              or (cat.techado and (v_sab = 'lluvia' or v_dom = 'lluvia'))) as suma_clima
      from cruce.catalogo_agente cat
      where cat.sab_inicio is not null and cat.dom_inicio is not null
        and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
        and not (not cat.techado and v_techo and v_clima_malo)
    ) k
    order by 3 * (case when v_n_otros > 3 then k.marcas else 0 end)
             + k.suma_energia::int + k.suma_ambiente::int + k.suma_clima::int desc, k.precio_n, k.orden
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
    if v_n_otros > 3 and c.suma_energia and c.suma_ambiente then
      v_frases := v_frases || '"ritmo_del_grupo"'::jsonb;
    end if;
    v_cand := jsonb_build_object(
      'id', c.id,
      'actividad', c.actividad,
      'actividad_etiqueta', c.actividad_etiqueta,
      'lugar', jsonb_build_object('id', c.id, 'nombre', c.lugar_nombre, 'simulado', true),
      'titulo', c.titulo_plantilla,
      'franjas', cruce.plan_franjas(p_sabado, c.sab_inicio, c.sab_fin, c.dom_inicio, c.dom_fin),
      'frases_grupo', v_frases);
    v_candidatas := v_candidatas || jsonb_build_array(v_cand);
  end loop;

  if jsonb_array_length(v_candidatas) = 0 then
    return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('tipo', 'sin_plan_compatible')));
  end if;

  -- perfil_grupo: solo agregados de los demás (E7.4: sin quien llama); con 3 personas o menos, solo la
  -- cantidad; gustos solo con cuantos >= 2 (#28); sin presupuesto_grupo (E7.4, hallazgo 7).
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
              where pr.espacio_id = p_espacio_id and pr.miembro_id <> v_yo
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
    'personas_consideradas', v_n,
    'candidatas', v_candidatas,
    'perfil_grupo', v_perfil)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('proponer_plan_borrador', sqlstate, v_ctx);
end
$$;

revoke all on function public.proponer_plan_borrador(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.proponer_plan_borrador(uuid, date, jsonb) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
