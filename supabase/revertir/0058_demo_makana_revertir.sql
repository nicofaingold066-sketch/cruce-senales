-- Reversa de 0058 (demo Makana, archivo 20261024124500_demo_makana.sql de codex/demo-makana).
-- Restaura las 13 funciones que esa migración redefine desde el respaldo tomado ANTES de aplicarla
-- (tabla respaldo.funciones_pre_makana, creada por el coordinador 24 oct ~10:30 con pg_get_functiondef),
-- borra los demos «makana», vuelve al índice único original y quita la columna y la función nuevas.
-- Ejecutar en una sola transacción, con MIGRACION EN CURSO en la ficha del coordinador.
begin;

-- 1. Demos del caso makana (y lo que cuelga de ellos por cascada).
delete from cruce.espacios e where e.demo and e.demo_caso = 'makana';

-- 2. Función nueva de la migración.
drop function if exists public.seed_demo_makana();

-- 3. Funciones redefinidas: vuelven a su definición previa.
do $$
declare r record;
begin
  for r in select fn, def from respaldo.funciones_pre_makana where fn not like 'index:%' order by fn loop
    execute r.def;
  end loop;
end $$;

-- 4. Índice único: el original (un demo por usuario), sin la columna demo_caso.
drop index if exists cruce.espacios_un_demo_por_usuario_y_caso_uq;
alter table cruce.espacios drop column if exists demo_caso;
do $$
declare v text;
begin
  select def into v from respaldo.funciones_pre_makana where fn = 'index:espacios_un_demo_por_usuario_uq';
  if v is null then
    v := 'create unique index espacios_un_demo_por_usuario_uq on cruce.espacios (demo_de) where demo';
  end if;
  execute v;
end $$;

-- 5. Comprobación de privilegios (la versión restaurada espera 42 funciones en public).
select cruce.verificar_privilegios();

commit;
