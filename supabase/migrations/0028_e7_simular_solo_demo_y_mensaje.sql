-- CRUCE · 0028 · Enmienda 7, punto E7.5 (ajustes de cierre):
--   * cruce.situacion: `mi_situacion.puede.simular` es false fuera de espacios demo (coherente con E7.3: el
--     servidor ya rechaza add_simulated_member y las simulate_* con espacio_no_demo), aunque en el espacio
--     queden simulados de antes. Lo ve quien llama en EstadoPropuesta.mi_situacion.
--   * cruce.mensaje: `no_autorizado / espacio_no_demo` pasa a "Esta acción solo está permitida en espacios de
--     demostración." (docs/contrato.md, línea 92), porque ahora lo devuelven la simulación y el reinicio.
-- Sin firmas nuevas (A5: la lista permitida sigue en 30). cruce.situacion: cuerpo de 0008 con la condición
-- nueva; cruce.mensaje: cuerpo de 0014 con el texto nuevo.

create or replace function cruce.situacion(p_prop uuid, p_m uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p cruce.propuestas%rowtype;
  m cruce.miembros%rowtype;
  v_int boolean := false;
  v_ret boolean := false;
  v_disp jsonb;
  v_eleg boolean;
  v_acepte boolean := false;
  v_conf integer := 0;
  v_imp_acepto boolean := false;
  v_imp_ret boolean;
  v_reservado boolean;
  v_disponibles integer;
  v_libres integer;
  v_base_aceptar boolean;
  v_aceptar boolean;
  v_hay_sim boolean;
  v_demo boolean;
  v_vencido boolean;
  v_activo boolean;
  v_con_op boolean;
  v_es_org boolean;
  v_es_org_esp boolean;
begin
  select * into p from cruce.propuestas where id = p_prop;
  select * into m from cruce.miembros where id = p_m;
  select pa.interesado, pa.retirado into v_int, v_ret
  from cruce.participaciones pa where pa.propuesta_id = p_prop and pa.miembro_id = p_m;
  v_int := coalesce(v_int, false);
  v_ret := coalesce(v_ret, false);
  select c.disponibilidad into v_disp from cruce.condiciones c
  where c.propuesta_id = p_prop and c.miembro_id = p_m;
  if p.version_vigente is not null then
    v_eleg := exists (select 1 from cruce.elegibles e
                      where e.propuesta_id = p_prop and e.version = p.version_vigente and e.miembro_id = p_m);
    v_acepte := exists (select 1 from cruce.aceptaciones a
                        where a.propuesta_id = p_prop and a.version = p.version_vigente
                          and a.miembro_id = p_m and a.vigente);
    v_imp_acepto := exists (select 1 from cruce.aceptaciones a
                            where a.propuesta_id = p_prop and a.version = p.version_vigente
                              and a.miembro_id = p.imprescindible_id and a.vigente);
    select count(*) into v_conf from cruce.aceptaciones a
    where a.propuesta_id = p_prop and a.version = p.version_vigente and a.vigente;
  end if;
  v_imp_ret := cruce.es_retirado(p_prop, p.imprescindible_id);
  v_reservado := p.version_vigente is not null and not v_imp_acepto and not v_imp_ret;
  v_disponibles := p.maximo - v_conf;
  v_libres := greatest(0, v_disponibles - case when v_reservado then 1 else 0 end);
  v_es_org := p.organizador_id = p_m;
  v_es_org_esp := m.rol = 'organizador';
  v_hay_sim := exists (select 1 from cruce.miembros x where x.espacio_id = p.espacio_id and x.simulado);
  -- E7.5: la simulación solo existe en espacios demo (E7.3); fuera del demo, puede.simular es false aunque
  -- queden simulados de antes.
  v_demo := exists (select 1 from cruce.espacios e where e.id = p.espacio_id and e.demo);
  v_vencido := cruce.ahora() >= p.plazo;
  v_activo := p.estado in ('reuniendo_interes', 'esperando_compromisos', 'grupo_confirmado', 'en_revision');
  v_con_op := p.estado in ('esperando_compromisos', 'grupo_confirmado');
  v_base_aceptar := v_con_op and coalesce(v_eleg, false) and not v_ret and not v_acepte and not v_vencido;
  v_aceptar := v_base_aceptar and case when p_m = p.imprescindible_id then v_disponibles > 0 else v_libres > 0 end;
  return jsonb_build_object(
    'miembro_id', m.id,
    'nombre', m.nombre,
    'es_organizador', v_es_org,
    'es_organizador_espacio', v_es_org_esp,
    'interesado', v_int,
    'condiciones', cruce.condiciones_estado(v_disp),
    'retirado', v_ret,
    'elegible_en_version', v_eleg,
    'acepte_version', v_acepte,
    'puede', jsonb_build_object(
      'abrir', v_es_org and p.estado = 'borrador' and not v_vencido,
      'marcar_interes', v_activo and not v_ret and not v_vencido,
      'guardar_condiciones', v_activo and not v_ret and not v_vencido and not (v_con_op and coalesce(v_eleg, false)),
      'evaluar', v_es_org and p.estado = 'reuniendo_interes' and not v_vencido,
      'aceptar', v_aceptar,
      'retirarme', not v_ret and (
                     (p.estado in ('reuniendo_interes', 'esperando_compromisos', 'en_revision') and not v_vencido)
                     or p.estado = 'grupo_confirmado'),
      'proponer_reparacion', v_es_org and p.estado = 'en_revision' and not v_vencido,
      'cancelar', v_es_org and p.estado not in ('expirado', 'cancelado'),
      'simular', v_es_org_esp and v_activo and v_hay_sim and v_demo),
    -- A1: motivo por el que `puede.aceptar` es false cuando solo queda el cupo reservado.
    'motivo_aceptar', case when v_base_aceptar and not v_aceptar and p_m <> p.imprescindible_id
                                and v_disponibles > 0 and v_reservado
                           then 'cupo_reservado' end);
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
    when 'no_autorizado/condiciones_congeladas' then 'Formas parte de la versión vigente; tu disponibilidad no puede cambiar mientras esté vigente.'
    when 'no_autorizado/espacio_no_demo' then 'Esta acción solo está permitida en espacios de demostración.'
    when 'no_autorizado/miembro_no_simulado' then 'Solo se puede simular a miembros marcados como Simulación.'
    when 'asiento_en_uso/asiento_en_uso' then 'Ese asiento ya tiene actividad simulada. Únete con otro nombre visible.'
    when 'intento_obsoleto/intento_obsoleto' then 'Esta solicitud pertenece a una demo ya reiniciada y no se puede repetir. Actualiza la pantalla.'
    when 'entrada_incompleta/preferencias_invalidas' then 'Las preferencias solo admiten las opciones de la lista.'
    when 'entrada_incompleta/fecha_invalida' then 'La fecha debe ser un sábado futuro dentro de los próximos 16 días.'
    when 'entrada_incompleta/pocas_preferencias' then 'Todavía no hay suficientes personas con preferencias cargadas.'
    when 'fallo_temporal/reintentar' then 'Falla temporal. Intenta de nuevo.'
  end
$$;

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
