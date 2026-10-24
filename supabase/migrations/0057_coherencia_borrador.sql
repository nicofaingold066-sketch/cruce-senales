-- CRUCE · 0057 · Coherencia del borrador del agente (pedido de Nico vía coordinador, 24 oct 09:4x; auditoría
-- docs/auditoria-agente.md §2b: 4 de 7 casos daban una propuesta incoherente). Solo cambia el orden y el filtro
-- de candidatas de proponer_plan_borrador. Misma firma, mismos campos, mismos textos y mismos descartes
-- (presupuesto, techo, viaje, familia). Parte de la versión vigente (20261024115616_actividad_grupo: 0050 + salio_en).
--   (a) Grupo sin propósito: tamaño = miembros activos no pendientes (v_posibles). Primero lo que entra
--       (personas_min <= tamaño <= personas_max); lo que tiene cupo menor al grupo se descarta si hay algo que entra;
--       lo que pide más personas que el grupo va al final.
--   (b) Las marcas de «Me gustaría» suman 3 por persona con cualquier tamaño (antes, 0 con 4 personas o menos, E7.1).
--       El perfil_grupo y la frase el_mas_elegido siguen con sus umbrales de siempre.
--   (c) Lo que alguien marcó va antes que lo que nadie marcó; en un grupo con propósito, su actividad cuenta como marcada.
-- Reversa: supabase/revertir/0057_coherencia_borrador.sql.

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
  -- E14
  v_prop text;
  v_fam text;
  v_posibles integer;
  v_quorum jsonb;
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
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.salio_en is null and m.user_id = v_uid;
  if v_rol is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  -- E14: propósito del grupo y personas posibles (sin pendientes, que no cuentan para nada).
  select e.proposito into v_prop from cruce.espacios e where e.id = p_espacio_id;
  v_fam := cruce.familia_de_proposito(v_prop);
  -- 0050: una clave que es a la vez actividad y familia ("cultura") vale como familia (contrato E14 (b)): sin +3,
  -- sin frase proposito_del_grupo y sin quórum. Desde acá v_prop es solo la actividad concreta, o null.
  v_prop := case when v_prop = v_fam then null else v_prop end;
  select count(*) into v_posibles from cruce.miembros m where m.espacio_id = p_espacio_id and m.salio_en is null and not m.pendiente;

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
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
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
  from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
  where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo;
  v_energia_o := case when v_con_o > v_tranq_o then 'con_todo' else 'algo_tranquilo' end;
  v_ambiente_o := case when v_fiesta_o > v_amb_tranq_o then 'fiesta' when v_amb_tranq_o > v_fiesta_o then 'tranquilo' end;
  select max(x.n) into v_max_marcas_o
  from (select a, count(*) as n
        from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
        cross join unnest(pr.me_gustaria) a
        where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo group by a) x;

  -- 1. descarte · 2. puntaje · 3. orden de elección; las 3 primeras son las candidatas.
  -- E7.1: el_mas_elegido exige más de 3 personas y al menos 2 marcas (desde la 0057 las marcas sí pesan en el
  -- orden con cualquier tamaño de grupo). E7.4: esas personas y esas marcas son las de los demás (sin quien llama). El puntaje
  -- en sí (marcas, energía, ambiente) y los descartes siguen usando a todos los que tienen preferencias.
  -- E10: descarte por tiempo máximo de viaje, castigo por viaje largo, momento del día y desempate por equidad.
  -- 0057 (coherencia): (a) en grupos sin propósito, primero lo que entra con el tamaño del grupo; una opción con
  -- cupo menor al grupo sale si hay otra que entra, y una que pide más personas que el grupo va al final; (b) las
  -- marcas pesan con cualquier tamaño de grupo; (c) lo que alguien marcó va antes que lo que nadie marcó (en un
  -- grupo con propósito, su actividad cuenta como marcada). Descartes, frases y perfil_grupo no cambian.
  for c in
    select k.*, (v_n_otros > 3 and k.marcas_otros >= 2 and k.marcas_otros = v_max_marcas_o) as el_mas_elegido
    from (
     select k1.*, bool_or(k1.tamano = 0) over () as hay_que_entra
     from (
      select k0.*,
             case when v_fam <> 'libre' then 0
                  when k0.personas_min <= v_posibles and k0.personas_max >= v_posibles then 0
                  when k0.personas_max < v_posibles then 1
                  else 2 end as tamano,
             (k0.marcas > 0 or (v_fam <> 'libre' and k0.actividad = v_prop)) as pedida
      from (
      select cat.*,
             case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end as precio_n,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and cat.actividad = any (pr.me_gustaria)) as marcas,
             (select count(*) from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
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
        join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
        join cruce.tiempos_zona t on t.origen = pr.zona and t.destino = cat.zona
          and t.modo = case pr.movilidad when 'auto_con_lugar' then 'auto' when 'auto_sin_lugar' then 'auto'
                                         when 'me_llevan' then v_modo_llevan else pr.movilidad end
        where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.zona is not null and pr.movilidad is not null
      ) v on true
      where cat.sab_inicio is not null and cat.dom_inicio is not null
        and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
        and not (not cat.techado and v_techo and v_clima_malo)
        -- E14 (d): en un grupo con propósito, solo su familia y solo lo que alcanza con el grupo actual.
        and (v_fam = 'libre' or (cat.familia = v_fam and cat.personas_min <= v_posibles))
      ) k0
      where not k0.lejos
     ) k1
    ) k
    where not (k.tamano = 1 and k.hay_que_entra)
    order by k.tamano, k.pedida desc,
             3 * k.marcas
             + k.suma_energia::int + k.suma_ambiente::int + k.suma_clima::int + k.suma_momento
             -- E14 (d): lo que el grupo vino a hacer suma como una elección más.
             + case when v_fam <> 'libre' and k.actividad = v_prop then 3 else 0 end
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
    -- E14 (d)
    if v_fam <> 'libre' and c.actividad = v_prop then
      v_frases := v_frases || '"proposito_del_grupo"'::jsonb;
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
                    then jsonb_build_object('max_minutos', c.viaje_max, 'estimado', true) end,
      -- E14 (d)
      'familia', c.familia,
      'personas', jsonb_build_object('min', c.personas_min, 'max', c.personas_max));
    v_candidatas := v_candidatas || jsonb_build_array(v_cand);
  end loop;

  if jsonb_array_length(v_candidatas) = 0 then
    -- E14 (ajuste 6): en un grupo con propósito, primero si hay de la familia, después si alcanza el grupo.
    if v_fam <> 'libre' then
      if not exists (select 1 from cruce.catalogo_agente cat
                     where cat.familia = v_fam and cat.sab_inicio is not null and cat.dom_inicio is not null
                       and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                       and not (not cat.techado and v_techo and v_clima_malo)) then
        return cruce.ok(jsonb_build_object('resultado', jsonb_build_object('tipo', 'sin_plan_compatible')));
      end if;
      if not exists (select 1 from cruce.catalogo_agente cat
                     where cat.familia = v_fam and cat.personas_min <= v_posibles
                       and cat.sab_inicio is not null and cat.dom_inicio is not null
                       and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                       and not (not cat.techado and v_techo and v_clima_malo)) then
        return cruce.ok(jsonb_build_object('resultado', jsonb_build_object(
          'tipo', 'sin_plan_compatible', 'motivo', 'faltan_personas')));
      end if;
    end if;
    -- E10: si había lugares por precio y techo pero todos quedaron lejos para alguien, se dice sin decir para quién.
    if exists (select 1 from cruce.catalogo_agente cat
               where cat.sab_inicio is not null and cat.dom_inicio is not null
                 and case cat.precio when 'gratis' then 0 when 'barato' then 1 else 2 end <= v_max_precio
                 and not (not cat.techado and v_techo and v_clima_malo)
                 and (v_fam = 'libre' or (cat.familia = v_fam and cat.personas_min <= v_posibles))) then
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
              from cruce.preferencias pr join cruce.miembros m on m.id = pr.miembro_id and m.espacio_id = p_espacio_id and m.salio_en is null
              cross join unnest(pr.me_gustaria) a
              join cruce.catalogo_agente cat on cat.actividad = a
              where pr.espacio_id = p_espacio_id and pr.usar_en_agente and pr.miembro_id <> v_yo
              group by cat.actividad_etiqueta
              -- #28: una actividad elegida por una sola persona no sale (ni como total).
              having count(distinct pr.miembro_id) >= 2) g),
      'energia_mayoritaria', v_energia_o,
      'ambiente_mayoritario', v_ambiente_o);
  end if;

  -- E14 (d): si el propósito es una actividad concreta que quedó afuera por tamaño del grupo, se avisa (sin culpas;
  -- los dos números ya son públicos: miembros del espacio y catálogo).
  select jsonb_build_object('actividad', c2.actividad, 'etiqueta', min(c2.actividad_etiqueta),
                            'personas_min', min(c2.personas_min), 'personas_posibles', v_posibles)
    into v_quorum
  from cruce.catalogo_agente c2
  where v_fam <> 'libre' and c2.actividad = v_prop and c2.personas_min > v_posibles
  group by c2.actividad;

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
    'quorum', v_quorum,
    'candidatas', v_candidatas,
    'perfil_grupo', v_perfil)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('proponer_plan_borrador', sqlstate, v_ctx);
end
$$;

