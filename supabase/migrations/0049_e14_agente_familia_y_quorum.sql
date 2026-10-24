-- CRUCE · 0049 · Enmienda 14, segunda parte (ajuste 3): el agente con propósito, familia y quórum.
--   * proponer_plan_borrador (misma firma): en un grupo con propósito, solo candidatas de su familia y que alcancen
--     con las personas posibles (miembros no pendientes); +3 a la actividad concreta del propósito y frase
--     proposito_del_grupo; cada candidata suma familia y personas {min, max}; la raíz suma quorum (la actividad del
--     propósito quedó afuera por tamaño) o null. Sin candidatas: sin la familia → sin_plan_compatible; sin quórum →
--     motivo faltan_personas; con quórum pero lejos → sin_lugar_cerca_para_todos (ajuste 6). En 'libre', como hoy.
--   * get_my_preferences: opciones.actividades solo de la familia (en libre, las 16) y cada ítem suma familia.
--   * save_my_preferences y simulate_save_preferences: una marca fuera de la familia → fuera_de_proposito.
--   * Agente social: plan_agente suma la actividad (entra en el hash) y el mínimo no baja de personas_min (ajuste 9);
--     publicar_borrador_agente la pasa a create_proposal; agente_social_candidatos pasa familia y personas.
-- Sin RPC nuevas ni cambio de firmas (41/0).

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
  select m.id, m.rol into v_yo, v_rol from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_rol is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  if v_rol <> 'organizador' then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  -- E14: propósito del grupo y personas posibles (sin pendientes, que no cuentan para nada).
  select e.proposito into v_prop from cruce.espacios e where e.id = p_espacio_id;
  v_fam := cruce.familia_de_proposito(v_prop);
  select count(*) into v_posibles from cruce.miembros m where m.espacio_id = p_espacio_id and not m.pendiente;

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
        -- E14 (d): en un grupo con propósito, solo su familia y solo lo que alcanza con el grupo actual.
        and (v_fam = 'libre' or (cat.familia = v_fam and cat.personas_min <= v_posibles))
    ) k
    where not k.lejos
    order by 3 * (case when v_n_otros > 3 then k.marcas else 0 end)
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

create or replace function public.get_my_preferences(p_espacio_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_yo uuid;
  v_recibir boolean;
  v_fam text;
  pr cruce.preferencias%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_espacio_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select m.id, m.recibir_invitaciones_agente into v_yo, v_recibir
  from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  select * into pr from cruce.preferencias x where x.miembro_id = v_yo;
  -- E14 (e): en un grupo con propósito, solo las actividades de su familia.
  select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_espacio_id;
  return cruce.ok(jsonb_build_object(
    'preferencias', cruce.preferencias_json(pr),
    'usar_en_agente', coalesce(pr.usar_en_agente, true),
    -- E11: consentimiento aparte para recibir invitaciones; false por defecto.
    'recibir_invitaciones_agente', v_recibir,
    'actualizadas_en', cruce.momento(pr.actualizadas_en),
    'opciones', jsonb_build_object('actividades', (
      select jsonb_agg(jsonb_build_object('clave', a.actividad, 'etiqueta', a.etiqueta, 'familia', a.familia) order by a.orden)
      from (select c.actividad, min(c.actividad_etiqueta) as etiqueta, min(c.orden) as orden, min(c.familia) as familia
            from cruce.catalogo_agente c where v_fam = 'libre' or c.familia = v_fam group by c.actividad) a)),
    'personas_con_preferencias', (select count(*) from cruce.preferencias x where x.espacio_id = p_espacio_id and x.usar_en_agente)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('get_my_preferences', sqlstate, v_ctx);
end
$$;

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
  -- E14 (e): en un grupo con propósito, "Me gustaría" solo dentro de su familia.
  if exists (select 1 from cruce.espacios e, jsonb_array_elements_text(p_preferencias -> 'me_gustaria') a
             where e.id = p_espacio_id and cruce.familia_de_proposito(e.proposito) <> 'libre'
               and cruce.familia_de_actividad(a) <> cruce.familia_de_proposito(e.proposito)) then
    return cruce.err('entrada_incompleta', 'fuera_de_proposito', null);
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
      'me_gustaria', to_jsonb(v_me))
      || jsonb_strip_nulls(jsonb_build_object(
      'zona', p_preferencias ->> 'zona', 'movilidad', p_preferencias ->> 'movilidad',
      'tiempo_max', p_preferencias ->> 'tiempo_max', 'momento', p_preferencias ->> 'momento')),
    'usar_en_agente', v_usar,
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('save_my_preferences', sqlstate, v_ctx);
end
$$;

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
  -- E14 (e): en un grupo con propósito, "Me gustaría" solo dentro de su familia.
  if exists (select 1 from cruce.espacios e, jsonb_array_elements_text(p_preferencias -> 'me_gustaria') a
             where e.id = p_espacio_id and cruce.familia_de_proposito(e.proposito) <> 'libre'
               and cruce.familia_de_actividad(a) <> cruce.familia_de_proposito(e.proposito)) then
    return cruce.err('entrada_incompleta', 'fuera_de_proposito', null);
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
      'me_gustaria', to_jsonb(v_me))
      || jsonb_strip_nulls(jsonb_build_object(
      'zona', v_zona, 'movilidad', v_movilidad, 'tiempo_max', v_tiempo, 'momento', v_momento)),
    'actualizadas_en', cruce.momento(v_en)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('simulate_save_preferences', sqlstate, v_ctx);
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
begin
  select * into o from cruce.opciones_agente x where x.opcion_ref = p_ref and x.espacio_id = p_esp and x.sabado = p_sabado;
  if not found then
    return null;
  end if;
  select * into c from cruce.catalogo_agente k where k.id = o.catalogo_id;
  v_franjas := cruce.plan_franjas(p_sabado, c.sab_inicio, c.sab_fin, c.dom_inicio, c.dom_fin);
  select least(20, count(*)) into v_max from cruce.miembros m where m.espacio_id = p_esp;
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
    -- E14 (ajuste 9): el mínimo no baja del quórum de la actividad, acotado por el máximo.
    'minimo', least(greatest(least(3, greatest(v_max, 2)), c.personas_min), greatest(v_max, 2)), 'maximo', greatest(v_max, 2),
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

create or replace function public.publicar_borrador_agente(p_ejecucion_id uuid, p_borrador_hash text, p_intento_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  e cruce.ejecuciones_agente%rowtype;
  v_pol jsonb;
  v_plan jsonb;
  v_cands jsonb;
  v_cat text;
  r jsonb;
  v_prop uuid;
  v_inv integer;
  v_params jsonb;
  v_prev jsonb;
  v_res jsonb;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_ejecucion_id is null or p_borrador_hash is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id;
  if not found or not cruce.bloquear_espacio(e.espacio_id)
     or not exists (select 1 from cruce.miembros m where m.espacio_id = e.espacio_id and m.user_id = v_uid) then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  v_params := jsonb_build_object('p_ejecucion_id', p_ejecucion_id, 'p_borrador_hash', p_borrador_hash);
  v_prev := cruce.intento_agente(v_uid, p_intento_id, 'publicar_borrador_agente', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  v_org := cruce.organizador_de(e.espacio_id, v_uid);
  if v_org is null then
    return cruce.err('no_autorizado', 'no_es_organizador_espacio', null);
  end if;
  perform cruce.fijar_ahora();
  select * into e from cruce.ejecuciones_agente x where x.id = p_ejecucion_id for update;
  -- Respuesta perdida después del commit con OTRO intento: el recibo dice dónde quedó.
  if e.estado = 'publicada' then
    if e.borrador_hash = p_borrador_hash then
      return cruce.ok(jsonb_build_object('propuesta', jsonb_build_object('id', e.propuesta_id),
        'invitados', (select count(*) from cruce.invitaciones_agente i where i.ejecucion_id = e.id), 'repetido', true));
    end if;
    return cruce.err('opcion_desactualizada', 'ejecucion_publicada', null);
  end if;
  if e.estado <> 'borrador' then
    return cruce.err('opcion_desactualizada', 'ejecucion_cerrada', null);
  end if;
  v_plan := cruce.plan_agente(e.espacio_id, e.sabado, e.opcion_ref, e.texto, v_org);
  if v_plan is null or e.borrador_hash <> p_borrador_hash or v_plan ->> 'hash' <> p_borrador_hash then
    return cruce.err('opcion_desactualizada', 'borrador_cambiado', null);
  end if;
  -- Política vigente: aprobación del hash exacto salvo autónoma sin cambios desde que empezó la ejecución.
  v_pol := cruce.politica_agente(e.espacio_id);
  if not (v_pol ->> 'modo' = 'autonoma' and (v_pol ->> 'version')::integer = e.politica_version)
     and e.aprobado_hash is distinct from p_borrador_hash then
    return cruce.err('no_autorizado', 'sin_aprobacion', null);
  end if;
  -- La opción tiene que seguir entre las candidatas actuales (preferencias, opt-out, presupuesto, viaje, clima).
  r := public.proponer_plan_borrador(e.espacio_id, e.sabado, v_plan -> 'clima');
  v_cat := v_plan ->> 'catalogo_id';
  if not (r ->> 'ok')::boolean or r #>> '{resultado,tipo}' <> 'borrador'
     or not exists (select 1 from jsonb_array_elements(r #> '{resultado,candidatas}') x where x ->> 'id' = v_cat) then
    return cruce.err('opcion_desactualizada', 'opcion_vencida', null);
  end if;
  if (v_plan ->> 'plazo_ts')::timestamptz < cruce.ahora() + interval '1 hour' then
    return cruce.err('opcion_desactualizada', 'opcion_vencida', null);
  end if;
  if jsonb_array_length(v_plan -> 'destinatarios') = 0 then
    return cruce.err('sin_alternativa', 'sin_destinatarios', null);
  end if;

  r := public.create_proposal(e.espacio_id, v_plan ->> 'titulo', v_plan -> 'franjas', (v_plan ->> 'minimo')::integer,
                              (v_plan ->> 'maximo')::integer, v_org, v_plan ->> 'plazo', 'America/Santiago', gen_random_uuid(),
                              v_plan ->> 'actividad');
  if not (r ->> 'ok')::boolean then
    raise exception 'create_proposal: %', r #>> '{error,detalle}';
  end if;
  v_prop := (r #>> '{resultado,propuesta_id}')::uuid;
  r := public.open_proposal(v_prop);
  if not (r ->> 'ok')::boolean then
    raise exception 'open_proposal: %', r #>> '{error,detalle}';
  end if;
  insert into cruce.invitaciones_agente (propuesta_id, miembro_id, ejecucion_id, texto, creada_en)
  select v_prop, (d #>> '{}')::uuid, e.id, e.texto, cruce.ahora()
  from jsonb_array_elements(v_plan -> 'destinatarios') d;
  get diagnostics v_inv = row_count;
  update cruce.ejecuciones_agente x set estado = 'publicada', propuesta_id = v_prop, actualizada_en = cruce.ahora()
  where x.id = e.id;
  v_res := jsonb_build_object('propuesta', jsonb_build_object('id', v_prop), 'invitados', v_inv);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'publicar_borrador_agente', v_params, e.espacio_id, v_org,
                                cruce.generacion(e.espacio_id), v_prop, v_res);
  return cruce.ok(v_res || jsonb_build_object('repetido', false));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('publicar_borrador_agente', sqlstate, v_ctx);
end
$$;

create or replace function public.agente_social_candidatos(p_espacio_id uuid, p_sabado date, p_clima jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r jsonb;
  c jsonb;
  v_ref text;
  v_ops jsonb := '[]'::jsonb;
  v_ctx text;
begin
  r := public.proponer_plan_borrador(p_espacio_id, p_sabado, p_clima);
  if not (r ->> 'ok')::boolean then
    return r;
  end if;
  if r #>> '{resultado,tipo}' = 'sin_plan_compatible' then
    return cruce.ok(jsonb_build_object('sin_plan_compatible', true, 'motivo', r #> '{resultado,motivo}', 'opciones', '[]'::jsonb));
  end if;
  delete from cruce.opciones_agente o where o.espacio_id = p_espacio_id and o.emitida_en < cruce.ahora() - interval '24 hours';
  for c in select x from jsonb_array_elements(r #> '{resultado,candidatas}') x loop
    v_ref := 'op_' || substr(md5(gen_random_uuid()::text), 1, 20);
    insert into cruce.opciones_agente (opcion_ref, espacio_id, sabado, clima, catalogo_id, emitida_en)
    values (v_ref, p_espacio_id, p_sabado, r #> '{resultado,clima}', c ->> 'id', cruce.ahora());
    v_ops := v_ops || jsonb_build_array(jsonb_build_object(
      'opcion_ref', v_ref, 'actividad', c -> 'actividad', 'actividad_etiqueta', c -> 'actividad_etiqueta',
      'titulo', c -> 'titulo', 'franjas', c -> 'franjas', 'viaje', c -> 'viaje',
      'familia', c -> 'familia', 'personas', c -> 'personas'));
  end loop;
  return cruce.ok(jsonb_build_object('sin_plan_compatible', false, 'opciones', v_ops));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('agente_social_candidatos', sqlstate, v_ctx);
end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
