-- CRUXE · 0059 · La demo Makana cambia los nombres de sus siete personas (pedido de Nico, 24 oct 11:20):
-- Ana→Bastián (organiza), Bruno→Nacho, Camila→Carlos, Diego→Kai, Elena→Charlie, Felipe→Joaco, Gabriela→Pía.
-- Solo cambia seed_demo_makana (0058). Las demos ya sembradas conservan sus nombres: para ver los nuevos hay que
-- abrir la demo desde una sesión nueva. Reversa: volver a aplicar la función de 20261024124500_demo_makana.sql.

create or replace function public.seed_demo_makana() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_nombre text;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();
  select e.id into v_esp from cruce.espacios e
  where e.demo and e.demo_de = v_uid and e.demo_caso = 'makana';
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;
  insert into cruce.espacios (nombre, tipo, demo, demo_de, demo_caso, codigo_invitacion, creado_en)
  values ('El plan que no deja a nadie afuera', 'amigos', true, v_uid, 'makana', cruce.generar_codigo(), cruce.ahora())
  returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
  values (v_esp, v_uid, 'Bastián', 'organizador', false, cruce.ahora(), false);
  foreach v_nombre in array array['Nacho', 'Carlos', 'Kai', 'Charlie', 'Joaco', 'Pía'] loop
    insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en, recibir_invitaciones_agente)
    values (v_esp, null, v_nombre, 'miembro', true, cruce.ahora(), false);
  end loop;
  -- Sin filas de preferencias, condiciones, interés ni aceptaciones. Carlos y Joaco pueden
  -- reclamar su asiento con join_space ANTES de que tenga actividad simulada (A2 vigente).
  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_makana', sqlstate, v_ctx);
end
$$;
revoke all on function public.seed_demo_makana() from public, anon, authenticated;
grant execute on function public.seed_demo_makana() to authenticated;
select cruce.verificar_privilegios();
notify pgrst, 'reload schema';
