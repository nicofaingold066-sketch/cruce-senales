-- CRUCE · 0048 · Enmienda 14 (docs/contrato-enmienda-14.md, aprobada por Nico 21:55), primera parte (ajuste 3):
-- familias de actividad, propósito del grupo y actividad de la propuesta. El agente (filtro por familia, quórum) va en
-- 0049.
--   * cruce.familia_de_actividad(text) y cruce.familia_de_proposito(text): tabla fija, inmutables; null si la clave no
--     existe. 'libre' no es familia de ninguna actividad. Si una clave es actividad y familia ('cultura'), vale como familia.
--   * catalogo_agente suma familia, personas_min y personas_max (iguales para todas las filas de una actividad) y las
--     filas 15 a 17 (tenis, básquet, película en casa; ficticias). Listas cerradas de actividad y me_gustaria: 16.
--   * espacios.proposito (default 'libre'); create_space con p_proposito opcional al final (una firma: se reemplaza
--     la de 4); espacio_json y preview_space_by_code suman proposito y familia.
--   * propuestas.actividad (null o del catálogo); create_proposal con p_actividad opcional al final (una firma: se
--     reemplaza la de 9). Actividad fuera del catálogo: formato_invalido (forma). En un grupo con propósito, actividad
--     de otra familia: fuera_de_proposito, DESPUÉS de verificar la pertenencia; sin actividad, se acepta (ajuste 1).
--   * vista_propuesta y resumen_propuesta suman actividad {clave, etiqueta, familia} | null.
--   * Mensaje nuevo de entrada_incompleta/fuera_de_proposito.
-- El demo no cambia: queda 'libre'. Lista permitida 41/0.

-- 1. Familias (tabla fija).
create or replace function cruce.familia_de_actividad(p text) returns text
language sql immutable set search_path = '' as $$
  select case p
    when 'futbol' then 'deporte' when 'padel' then 'deporte' when 'tenis' then 'deporte' when 'basquet' then 'deporte'
    when 'asado' then 'comida' when 'cena' then 'comida' when 'cafe' then 'comida'
    when 'fiesta' then 'salida_noche' when 'bar' then 'salida_noche' when 'juegos_salida' then 'salida_noche'
    when 'cultura' then 'cultura' when 'cine' then 'cultura'
    when 'parque' then 'aire_libre' when 'cerro' then 'aire_libre'
    when 'juegos_casa' then 'en_casa' when 'peli_casa' then 'en_casa'
  end
$$;

create or replace function cruce.familia_de_proposito(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p = 'libre' then 'libre'
    when p in ('deporte', 'comida', 'salida_noche', 'cultura', 'aire_libre', 'en_casa') then p
    else cruce.familia_de_actividad(p) end
$$;

-- 2. Catálogo: listas a 16, filas 15 a 17, familia y personas.
alter table cruce.catalogo_agente drop constraint catalogo_agente_actividad_check;
alter table cruce.catalogo_agente add constraint catalogo_agente_actividad_check
  check (cruce.familia_de_actividad(actividad) is not null);
alter table cruce.preferencias drop constraint preferencias_me_gustaria_check;
alter table cruce.preferencias add constraint preferencias_me_gustaria_check check (
  cardinality(me_gustaria) between 1 and 6
  and me_gustaria <@ array['asado', 'padel', 'futbol', 'parque', 'fiesta',
                           'cena', 'bar', 'juegos_casa', 'cine', 'cultura', 'juegos_salida', 'cerro', 'cafe',
                           'tenis', 'basquet', 'peli_casa']
  and cruce.sin_repetidas(me_gustaria));

alter table cruce.catalogo_agente add column familia text, add column personas_min integer, add column personas_max integer;

insert into cruce.catalogo_agente
  (id, orden, actividad, actividad_etiqueta, lugar_nombre, zona, precio, techado, energia, ambiente, titulo_plantilla,
   sab_inicio, sab_fin, dom_inicio, dom_fin) values
  ('lugar-sim-15', 15, 'tenis', 'Tenis', 'Canchas de tenis del club (Simulación)', 'la_florida', 'medio', false, 'con_todo', 'tranquilo',
   'Tenis en parejas', '09:30', '11:30', '09:30', '11:30'),
  ('lugar-sim-16', 16, 'basquet', 'Básquet', 'Cancha de básquet de la plaza (Simulación)', 'santiago_centro', 'barato', false, 'con_todo', 'fiesta',
   'Básquet en la plaza', '17:00', '19:00', '17:00', '19:00'),
  ('lugar-sim-17', 17, 'peli_casa', 'Película en casa', 'Casa con proyector (Simulación)', 'las_condes', 'barato', true, 'algo_tranquilo', 'tranquilo',
   'Noche de película en casa', '20:30', '23:00', '20:00', '22:30');

update cruce.catalogo_agente c set familia = cruce.familia_de_actividad(c.actividad),
  personas_min = t.pmin, personas_max = t.pmax
from (values ('futbol', 10, 14), ('padel', 4, 4), ('tenis', 2, 4), ('basquet', 6, 10),
             ('asado', 4, 12), ('cena', 2, 8), ('cafe', 2, 6),
             ('fiesta', 6, 20), ('bar', 3, 10), ('juegos_salida', 4, 8),
             ('cultura', 2, 10), ('cine', 2, 8),
             ('parque', 2, 20), ('cerro', 2, 12),
             ('juegos_casa', 3, 8), ('peli_casa', 2, 8)) as t (actividad, pmin, pmax)
where c.actividad = t.actividad;

alter table cruce.catalogo_agente
  alter column familia set not null, alter column personas_min set not null, alter column personas_max set not null,
  add constraint catalogo_agente_familia_check check (familia = cruce.familia_de_actividad(actividad)),
  add constraint catalogo_agente_personas_check check (2 <= personas_min and personas_min <= personas_max and personas_max <= 20);

-- 3. Propósito del grupo y actividad de la propuesta.
alter table cruce.espacios add column proposito text not null default 'libre'
  check (cruce.familia_de_proposito(proposito) is not null);
alter table cruce.propuestas add column actividad text
  check (actividad is null or cruce.familia_de_actividad(actividad) is not null);

drop function public.create_space(text, text, text, text[]);
drop function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid);

-- 4. Funciones.
create or replace function public.create_space(p_nombre text, p_tipo text, p_nombre_visible text, p_integrantes text[] default '{}',
                                               p_proposito text default 'libre') returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_nombre text := cruce.normalizar_nombre(p_nombre);
  v_vis text := cruce.normalizar_nombre(p_nombre_visible);
  v_det text;
  v_esp uuid;
  v_m uuid;
  v_cod text;
  v_in text[] := coalesce(p_integrantes, array[]::text[]);
  v_int text[] := array[]::text[];
  v_x text;
  v_mid uuid;
  v_pend jsonb := '[]'::jsonb;
  -- E14: propósito del grupo; nulo o vacío vale 'libre'.
  v_prop text := coalesce(nullif(btrim(p_proposito), ''), 'libre');
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if v_nombre is null or v_nombre = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if char_length(v_nombre) > 60 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_tipo is null or btrim(p_tipo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if p_tipo not in ('amigos', 'empresa') then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  -- E14: 'libre', una familia o una actividad del catálogo.
  if cruce.familia_de_proposito(v_prop) is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  v_det := cruce.validar_nombre_visible(p_nombre_visible);
  if v_det is not null then
    return cruce.err('entrada_incompleta', v_det, null);
  end if;
  -- E9 (fase 2): integrantes pendientes. Tope 12; mismas reglas de nombre que join_space; sin repetidos entre
  -- ellos ni con el organizador (comparación sin mayúsculas, tras normalizar).
  if cardinality(v_in) > 12 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  foreach v_x in array v_in loop
    v_det := cruce.validar_nombre_visible(v_x);
    if v_det is not null then
      return cruce.err('entrada_incompleta', v_det, null);
    end if;
    v_x := cruce.normalizar_nombre(v_x);
    if lower(v_x) = lower(v_vis) or lower(v_x) = any (select lower(y) from unnest(v_int) y) then
      return cruce.err('entrada_incompleta', 'nombre_en_uso', null);
    end if;
    v_int := v_int || v_x;
  end loop;

  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  v_cod := cruce.generar_codigo();
  insert into cruce.espacios (nombre, tipo, demo, codigo_invitacion, creado_en, proposito)
  values (v_nombre, p_tipo, false, v_cod, cruce.ahora(), v_prop) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, v_vis, 'organizador', false, cruce.ahora()) returning id into v_m;
  foreach v_x in array v_int loop
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, pendiente, creado_en)
    values (v_esp, null, v_x, 'miembro', false, true, cruce.ahora()) returning id into v_mid;
    v_pend := v_pend || jsonb_build_array(jsonb_build_object('miembro_id', v_mid, 'nombre', v_x));
  end loop;

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'codigo_invitacion', v_cod, 'miembro_id', v_m, 'pendientes', v_pend),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_space', sqlstate, v_ctx);
end
$$;

create or replace function cruce.espacio_json(p_espacio uuid, p_uid uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'tipo', e.tipo, 'demo', e.demo,
    'codigo_invitacion', e.codigo_invitacion,
    'generacion', e.generacion,
    'creado_en', cruce.momento(e.creado_en),
    'ultimo_reinicio', cruce.momento(e.ultimo_reinicio),
    'mi_miembro_id', yo.id, 'mi_rol', yo.rol,
    -- E14
    'proposito', e.proposito, 'familia', cruce.familia_de_proposito(e.proposito),
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre, 'rol', m.rol, 'simulado', m.simulado,
               'pendiente', m.pendiente,
               'es_yo', coalesce(m.user_id = p_uid, false)) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id))
  from cruce.espacios e
  left join cruce.miembros yo on yo.espacio_id = e.id and yo.user_id = p_uid
  where e.id = p_espacio
$$;

create or replace function public.preview_space_by_code(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  e cruce.espacios%rowtype;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  if p_codigo is null or cruce.normalizar_nombre(p_codigo) = '' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  select * into e from cruce.espacios x where x.codigo_invitacion = upper(replace(cruce.normalizar_nombre(p_codigo), ' ', ''));
  if not found then
    return cruce.err('fuera_de_audiencia', 'codigo_inexistente', null);
  end if;
  -- E9: SOLO nombre del espacio, si es demo, y la lista de integrantes con `libre`. Sin bloqueos.
  -- libre: simulado del demo sin actividad (reclamable) o integrante pendiente que nadie reclamó.
  return cruce.ok(jsonb_build_object(
    -- E14: también el propósito (para "¿Quién eres?" y la invitación).
    'espacio', jsonb_build_object('nombre', e.nombre, 'demo', e.demo,
                                  'proposito', e.proposito, 'familia', cruce.familia_de_proposito(e.proposito)),
    'miembros', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'miembro_id', m.id, 'nombre', m.nombre,
               'libre', (m.pendiente or (e.demo and m.simulado and not cruce.asiento_usado(m.id)))) order by m.orden), '[]'::jsonb)
      from cruce.miembros m where m.espacio_id = e.id)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('preview_space_by_code', sqlstate, v_ctx);
end
$$;

create or replace function public.create_proposal(
  p_espacio_id uuid, p_titulo text, p_franjas jsonb, p_minimo integer, p_maximo integer,
  p_imprescindible_id uuid, p_plazo text, p_zona_horaria text, p_intento_id uuid, p_actividad text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_tit text := btrim(p_titulo);
  v_el jsonb;
  v_ini timestamptz[] := array[]::timestamptz[];
  v_fin timestamptz[] := array[]::timestamptz[];
  v_i timestamptz;
  v_f timestamptz;
  v_plazo timestamptz;
  v_params jsonb;
  v_prev jsonb;
  v_yo uuid;
  v_prop uuid;
  v_res jsonb;
  v_fam text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  -- 2. forma (sin depender del reloj)
  if p_espacio_id is null or p_intento_id is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_tit is null or v_tit = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if char_length(v_tit) > 80 then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if p_franjas is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if jsonb_typeof(p_franjas) <> 'array' then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if jsonb_array_length(p_franjas) <> 2 then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  for v_el in select x from jsonb_array_elements(p_franjas) x loop
    if jsonb_typeof(v_el) <> 'object' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    if v_el -> 'inicio' is null or v_el -> 'fin' is null
       or jsonb_typeof(v_el -> 'inicio') = 'null' or jsonb_typeof(v_el -> 'fin') = 'null' then
      return cruce.err('entrada_incompleta', 'campo_faltante', null);
    end if;
    if jsonb_typeof(v_el -> 'inicio') <> 'string' or jsonb_typeof(v_el -> 'fin') <> 'string' then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_i := cruce.parse_hora_local(v_el ->> 'inicio');
    v_f := cruce.parse_hora_local(v_el ->> 'fin');
    if v_i is null or v_f is null then
      return cruce.err('entrada_incompleta', 'formato_invalido', null);
    end if;
    v_ini := v_ini || v_i;
    v_fin := v_fin || v_f;
  end loop;
  if v_fin[1] <= v_ini[1] or v_fin[2] <= v_ini[2] then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if p_minimo is null or p_maximo is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if not (2 <= p_minimo and 2 <= p_maximo and p_minimo <= p_maximo and p_maximo <= 20) then
    return cruce.err('entrada_incompleta', 'cupos_invalidos', null);
  end if;
  if p_plazo is null or btrim(p_plazo) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  v_plazo := cruce.parse_hora_local(p_plazo);
  if v_plazo is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;
  if v_plazo > v_ini[1] or v_plazo > v_ini[2] then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if p_zona_horaria is null or btrim(p_zona_horaria) = '' then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  if p_zona_horaria <> 'America/Santiago' then
    return cruce.err('entrada_incompleta', 'zona_horaria_no_soportada', null);
  end if;
  if p_imprescindible_id is null then
    return cruce.err('entrada_incompleta', 'campo_faltante', null);
  end if;
  -- E14: la actividad es opcional; si viene, tiene que ser del catálogo (la familia se compara después de la
  -- pertenencia, para no revelar el propósito de un espacio ajeno).
  if p_actividad is not null and cruce.familia_de_actividad(p_actividad) is null then
    return cruce.err('entrada_incompleta', 'formato_invalido', null);
  end if;

  -- 2. espacio
  perform cruce.bloquear_espacio(p_espacio_id);
  -- 3. intento (A3: un intento de una generación anterior responde intento_obsoleto)
  v_params := jsonb_build_object(
    'p_espacio_id', p_espacio_id, 'p_titulo', p_titulo, 'p_franjas', p_franjas,
    'p_minimo', p_minimo, 'p_maximo', p_maximo, 'p_imprescindible_id', p_imprescindible_id,
    'p_plazo', p_plazo, 'p_zona_horaria', p_zona_horaria)
    -- E14: solo si viene, para que los intentos de antes de la migración sigan valiendo.
    || case when p_actividad is not null then jsonb_build_object('p_actividad', p_actividad) else '{}'::jsonb end;
  v_prev := cruce.intento_previo(v_uid, p_intento_id, 'create_proposal', v_params);
  if v_prev is not null then
    return v_prev;
  end if;
  -- 4. miembro
  select m.id into v_yo from cruce.miembros m where m.espacio_id = p_espacio_id and m.user_id = v_uid for update;
  if v_yo is null then
    return cruce.err('fuera_de_audiencia', 'no_miembro', null);
  end if;
  perform cruce.fijar_ahora();
  -- Rangos que dependen del reloj, con el instante de decisión
  if v_ini[1] <= cruce.ahora() or v_ini[2] <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'franjas_invalidas', null);
  end if;
  if v_plazo <= cruce.ahora() then
    return cruce.err('entrada_incompleta', 'plazo_invalido', null);
  end if;
  if not exists (select 1 from cruce.miembros m where m.id = p_imprescindible_id and m.espacio_id = p_espacio_id) then
    return cruce.err('entrada_incompleta', 'imprescindible_invalido', null);
  end if;
  -- E14 (ajustes 1 y 2): en un grupo con propósito, una actividad de otra familia se rechaza; sin actividad se acepta.
  if p_actividad is not null then
    select cruce.familia_de_proposito(e.proposito) into v_fam from cruce.espacios e where e.id = p_espacio_id;
    if v_fam <> 'libre' and cruce.familia_de_actividad(p_actividad) <> v_fam then
      return cruce.err('entrada_incompleta', 'fuera_de_proposito', null);
    end if;
  end if;

  insert into cruce.propuestas (espacio_id, titulo, organizador_id, imprescindible_id, minimo, maximo,
                                zona_horaria, plazo, estado, state_rev, creada_en, actividad)
  values (p_espacio_id, v_tit, v_yo, p_imprescindible_id, p_minimo, p_maximo,
          p_zona_horaria, v_plazo, 'borrador', 1, cruce.ahora(), p_actividad)
  returning id into v_prop;
  insert into cruce.franjas (propuesta_id, clave, inicio, fin)
  values (v_prop, 'A', v_ini[1], v_fin[1]), (v_prop, 'B', v_ini[2], v_fin[2]);
  perform cruce.evento(v_prop, 'propuesta_creada', v_yo, 'persona', null, null, 'borrador', null, null, 1);

  v_res := jsonb_build_object('propuesta_id', v_prop, 'repetido', false);
  perform cruce.guardar_intento(v_uid, p_intento_id, 'create_proposal', v_params, p_espacio_id, v_yo,
                                cruce.generacion(p_espacio_id), v_prop,
                                jsonb_build_object('tipo', 'ok', 'resultado', v_res));
  return cruce.ok(jsonb_build_object('resultado', v_res, 'propuesta', cruce.vista_propuesta(v_prop, v_yo)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('create_proposal', sqlstate, v_ctx);
end
$$;

create or replace function cruce.vista_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta_base(p_prop, p_yo);
  v_n integer;
  v_retirados jsonb;
  -- E13 (c): cómo sale otra persona en una baja.
  v_anon constant jsonb := jsonb_build_object('miembro_id', null, 'nombre', 'Una persona', 'simulado', false);
begin
  if v is null then
    return null;
  end if;
  -- E13 (a): total de "así no puedo" que valen; con menos de 2, null. Se calcula antes de la siguiente acción y
  -- después se oculta a quien no organiza la propuesta.
  -- 0047: lo que ve el organizador son las opiniones de los DEMÁS (sin la propia, como E7.4) dadas sobre la versión
  -- vigente; no bajan cuando alguien acepta (si bajaran, la aceptación con nombre delataría quién había opinado).
  v_n := cruce.opiniones_visibles(p_prop, p_yo);
  v := v || jsonb_build_object('opiniones_totales', jsonb_build_object('asi_no_puedo', case when v_n >= 2 then v_n end));
  v := jsonb_set(v, '{siguiente_accion}', cruce.siguiente_accion_personal(v));
  -- E7.2: los conteos que dejan deducir condiciones ajenas, solo para el organizador de la propuesta.
  if p_yo is distinct from (select x.organizador_id from cruce.propuestas x where x.id = p_prop) then
    v := jsonb_set(v, '{personas_con_condiciones}', 'null'::jsonb);
    if jsonb_typeof(v -> 'opcion') = 'object' then
      v := jsonb_set(v, '{opcion,cupos,pendientes}', 'null'::jsonb);
    end if;
    v := jsonb_set(v, '{opiniones_totales}', 'null'::jsonb);
  end if;
  -- E13 (c): las bajas de otras personas, sin nombre y sin decir si habían confirmado. La propia, como hoy.
  v := jsonb_set(v, '{bajas}', (
    select coalesce(jsonb_agg(case when b #>> '{miembro,miembro_id}' = p_yo::text then b
                                   else jsonb_build_object('miembro', v_anon, 'en', b -> 'en', 'version', b -> 'version',
                                                           'habia_aceptado', null) end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'bajas') with ordinality as t (b, o)));
  -- E13 (c): en el historial, las bajas de otras personas y las aceptaciones de quienes se retiraron, sin nombre.
  -- 0047: en el historial, para quien no es la persona: las aceptaciones de quienes se retiraron NO salen (una
  -- aceptación anónima decía que había confirmado), y la baja sale sin actor real, sin cambio de estado y sin decir
  -- si fue simulada.
  select coalesce(jsonb_agg(pa.miembro_id::text), '[]'::jsonb) into v_retirados
  from cruce.participaciones pa where pa.propuesta_id = p_prop and pa.retirado;
  v := jsonb_set(v, '{historial}', (
    select coalesce(jsonb_agg(case when e ->> 'tipo' = 'baja' and (e #>> '{actor,miembro_id}') is distinct from p_yo::text
                                   then e || jsonb_build_object('actor', v_anon, 'actor_tipo', 'persona', 'origen', 'persona',
                                                                'ejecutado_por', null, 'estado_previo', null, 'estado_nuevo', null)
                                   else e end
                              order by o), '[]'::jsonb)
    from jsonb_array_elements(v -> 'historial') with ordinality as t (e, o)
    where not (e ->> 'tipo' = 'aceptacion' and v_retirados ? (e #>> '{actor,miembro_id}')
               and (e #>> '{actor,miembro_id}') is distinct from p_yo::text)));
  -- 0047: si el imprescindible se retiró, los cupos no lo dicen a los demás (se muestran como si siguiera reservado;
  -- en en_revision o expirado nadie puede aceptar, así que no cambia ninguna regla: decide el servidor).
  if jsonb_typeof(v -> 'opcion') = 'object' and p_yo is distinct from (v #>> '{imprescindible,miembro_id}')::uuid
     and not coalesce((v #>> '{opcion,cupos,imprescindible_acepto}')::boolean, false) then
    v := jsonb_set(v, '{opcion,cupos,reservado_imprescindible}', 'true'::jsonb);
    v := jsonb_set(v, '{opcion,cupos,libres_para_otros}',
                   to_jsonb(greatest(0, (v #>> '{opcion,cupos,disponibles}')::integer - 1)));
  end if;
  -- E14: la actividad de la propuesta (null si no se eligió).
  v := v || jsonb_build_object('actividad', (
    select jsonb_build_object('clave', x.actividad, 'etiqueta',
                              (select min(c.actividad_etiqueta) from cruce.catalogo_agente c where c.actividad = x.actividad),
                              'familia', cruce.familia_de_actividad(x.actividad))
    from cruce.propuestas x where x.id = p_prop and x.actividad is not null));
  -- E11: la invitación del agente es de cada persona; nadie ve a quién más invitaron.
  v := jsonb_set(v, '{mi_situacion,invitacion_agente}', coalesce(
    (select jsonb_build_object('texto', i.texto) from cruce.invitaciones_agente i
     where i.propuesta_id = p_prop and i.miembro_id = p_yo), 'null'::jsonb));
  return v || jsonb_build_object('opcion_anterior', cruce.opcion_anterior(p_prop));
end
$$;

create or replace function cruce.resumen_propuesta(p_prop uuid, p_yo uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v jsonb := cruce.vista_propuesta(p_prop, p_yo);
begin
  return jsonb_build_object(
    'id', v -> 'id', 'titulo', v -> 'titulo', 'estado', v -> 'estado',
    'estado_etiqueta', v -> 'estado_etiqueta',
    'version', v #> '{opcion,version}',
    'confirmados', v -> 'confirmados', 'minimo', v -> 'minimo', 'maximo', v -> 'maximo',
    'plazo', v -> 'plazo', 'plazo_vencido', v -> 'plazo_vencido',
    'siguiente_accion', v -> 'siguiente_accion', 'state_rev', v -> 'state_rev',
    'actividad', v -> 'actividad',
    'mi_situacion', jsonb_build_object(
      'interesado', v #> '{mi_situacion,interesado}',
      'retirado', v #> '{mi_situacion,retirado}',
      'acepte_version', v #> '{mi_situacion,acepte_version}',
      'puede_aceptar', v #> '{mi_situacion,puede,aceptar}',
      'invitacion_agente', v #> '{mi_situacion,invitacion_agente}'));
end
$$;

create or replace function cruce.mensaje(p_codigo text, p_detalle text) returns text
language sql immutable set search_path = '' as $$
  select case p_codigo || '/' || p_detalle
    when 'sesion_invalida/sin_sesion' then 'No hay una sesión válida. Recarga la página para continuar.'
    when 'entrada_incompleta/campo_faltante' then 'Falta completar un dato obligatorio.'
    when 'entrada_incompleta/formato_invalido' then 'Un dato tiene un formato inválido.'
    when 'entrada_incompleta/franjas_invalidas' then 'Las franjas deben ser exactamente dos, futuras y con fin posterior al inicio.'
    when 'entrada_incompleta/cupos_invalidos' then 'El mínimo debe ser al menos 2 y no superar al máximo; el máximo no puede superar 20.'
    when 'entrada_incompleta/plazo_invalido' then 'El cierre de aceptación debe ser futuro y no posterior al inicio de ninguna franja.'
    when 'entrada_incompleta/zona_horaria_no_soportada' then 'Por ahora solo se admite la zona horaria America/Santiago.'
    when 'entrada_incompleta/imprescindible_invalido' then 'La persona imprescindible debe ser miembro del espacio.'
    when 'entrada_incompleta/disponibilidad_invalida' then 'La disponibilidad solo admite las franjas de la propuesta con los valores si, no o pendiente.'
    when 'entrada_incompleta/nombre_en_uso' then 'Ese nombre ya está en uso en este espacio.'
    when 'entrada_incompleta/intento_reutilizado' then 'Este identificador de intento ya se usó para otra operación.'
    when 'fuera_de_audiencia/no_miembro' then 'No perteneces a este espacio o el elemento no existe.'
    when 'fuera_de_audiencia/codigo_inexistente' then 'El código de invitación no existe.'
    when 'fuera_de_audiencia/no_elegible_en_version' then 'No formas parte de las personas que pueden aceptar esta versión.'
    when 'opcion_desactualizada/version_no_vigente' then 'Esta versión ya no está vigente. Actualiza para ver la versión actual.'
    when 'opcion_desactualizada/estado_no_admite' then 'La propuesta cambió de estado y esta acción ya no aplica. Actualiza la pantalla.'
    when 'cupo_completo/sin_cupo' then 'Ya se completaron los cupos de esta versión.'
    when 'cupo_completo/reservado_imprescindible' then 'El cupo que queda está reservado para la persona imprescindible.'
    when 'plazo_vencido/plazo_vencido' then 'El plazo de aceptación ya cerró.'
    when 'sin_alternativa/sin_alternativa' then 'Sin opción compatible: no hay alternativa con las condiciones actuales.'
    when 'no_autorizado/no_es_organizador' then 'Solo el organizador de la propuesta puede hacer esto.'
    when 'no_autorizado/no_es_organizador_espacio' then 'Solo el organizador del espacio puede hacer esto.'
    when 'no_autorizado/retirado' then 'Te retiraste de esta propuesta y ya no puedes participar en ella.'
    when 'no_autorizado/condiciones_congeladas' then 'Estás en la versión vigente. Si esta fecha no te sirve, marca «Así no puedo, pero sigo» y podrás cambiar cuándo puedes.'
    when 'no_autorizado/espacio_no_demo' then 'Esta acción solo está permitida en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'no_autorizado/miembro_ya_reclamado' then 'Ese lugar ya lo tomó otra persona.'
    when 'entrada_incompleta/miembro_inexistente' then 'Ese integrante no existe en este espacio.'
    when 'asiento_en_uso/asiento_en_uso' then 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'
    when 'intento_obsoleto/intento_obsoleto' then 'Esta solicitud pertenece a una demo ya reiniciada y no se puede repetir. Actualiza la pantalla.'
    when 'entrada_incompleta/preferencias_invalidas' then 'Las preferencias solo admiten las opciones de la lista.'
    when 'entrada_incompleta/fecha_invalida' then 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.'
    when 'entrada_incompleta/pocas_preferencias' then 'Todavía no hay suficientes personas con preferencias cargadas.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
    -- E11
    when 'no_autorizado/sin_aprobacion' then 'Este borrador necesita la aprobación del organizador antes de publicarse.'
    when 'opcion_desactualizada/borrador_cambiado' then 'El borrador cambió desde que se preparó. Revísalo de nuevo antes de aprobarlo o publicarlo.'
    when 'opcion_desactualizada/opcion_vencida' then 'Esa opción ya no está disponible para el grupo. Prepara otra.'
    when 'opcion_desactualizada/oportunidad_en_uso' then 'Ya hay una preparación en curso para ese sábado.'
    when 'opcion_desactualizada/ejecucion_cerrada' then 'Esa preparación ya se cerró.'
    when 'opcion_desactualizada/ejecucion_publicada' then 'Esa preparación ya se publicó.'
    when 'sin_alternativa/sin_destinatarios' then 'Nadie del grupo activó las invitaciones del agente.'
    when 'entrada_incompleta/politica_invalida' then 'La política solo admite aprobación o autónoma.'
    when 'entrada_incompleta/oportunidad_invalida' then 'La oportunidad debe ser un sábado futuro dentro de los próximos 16 días.'
    -- E13
    when 'entrada_incompleta/opinion_invalida' then 'Solo se puede decir "así no puedo" o retirar esa opinión.'
    when 'no_autorizado/ya_acepto' then 'Ya confirmaste esta versión. Si no puedes ir, primero retírate.'
    when 'entrada_incompleta/fuera_de_proposito' then 'Este grupo se armó para otro tipo de plan. Elige una actividad de ese tipo o crea un grupo en modo libre.'
    when 'sin_alternativa/tope_versiones' then 'Esta propuesta ya tuvo tres versiones. El organizador puede cerrarla o cancelarla.'
  end
$$;

revoke all on function public.create_space(text, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.create_space(text, text, text, text[], text) to authenticated;
revoke all on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_proposal(uuid, text, jsonb, integer, integer, uuid, text, text, uuid, text) to authenticated;
revoke all on function public.preview_space_by_code(text) from public, anon, authenticated;
grant execute on function public.preview_space_by_code(text) to authenticated;
revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
