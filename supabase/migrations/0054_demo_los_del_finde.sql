-- CRUCE · 0054 · La demo pasa a llamarse "Los del finde" (pedido de Nico 01:51, vía coordinador). Solo el nombre:
-- personas, preferencias, catálogo y cupos no cambian. seed_demo_space (cuerpo vigente en la base, el de 0014) siembra
-- con el nombre nuevo, y los espacios demo que ya existen con el nombre viejo se renombran (datos ficticios), así la
-- demo que ya está abierta cambia sola. Sin RPC nuevas ni firmas (41/0).
create or replace function public.seed_demo_space() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s' as $$
declare
  v_uid uuid := auth.uid();
  v_esp uuid;
  v_ctx text;
begin
  if v_uid is null then
    return cruce.err('sesion_invalida', 'sin_sesion', null);
  end if;
  perform cruce.bloquear_usuario(v_uid);
  perform cruce.fijar_ahora();

  select e.id into v_esp from cruce.espacios e where e.demo and e.demo_de = v_uid;
  if v_esp is not null then
    return cruce.ok(jsonb_build_object(
      'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', false, 'repetido', true),
      'espacio', cruce.espacio_json(v_esp, v_uid)));
  end if;

  insert into cruce.espacios (nombre, tipo, demo, demo_de, codigo_invitacion, creado_en)
  values ('Los del finde', 'amigos', true, v_uid, cruce.generar_codigo(), cruce.ahora()) returning id into v_esp;
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en)
  values (v_esp, v_uid, 'Tomi', 'organizador', false, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Luna', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Mati', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Caro', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Fede', 'miembro', true, cruce.ahora());
  insert into cruce.miembros (espacio_id, user_id, nombre, rol, simulado, creado_en) values (v_esp, null, 'Sofi', 'miembro', true, cruce.ahora());
  perform cruce.sembrar_preferencias_demo(v_esp);

  return cruce.ok(jsonb_build_object(
    'resultado', jsonb_build_object('espacio_id', v_esp, 'creado', true, 'repetido', false),
    'espacio', cruce.espacio_json(v_esp, v_uid)));
exception when others then
  get stacked diagnostics v_ctx = pg_exception_context;
  return cruce.fallo('seed_demo_space', sqlstate, v_ctx);
end
$$;

revoke all on function public.seed_demo_space() from public, anon, authenticated;
grant execute on function public.seed_demo_space() to authenticated;

update cruce.espacios set nombre = 'Los del finde' where demo and nombre = 'Los del asado';

revoke all on all functions in schema cruce from public, anon, authenticated;
select cruce.verificar_privilegios();
