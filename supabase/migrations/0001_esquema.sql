-- CRUCE · 0001 · Esquema privado
-- Las tablas viven en el esquema `cruce`, que NO está expuesto por la API de datos.
-- RLS activado en todas, sin políticas, y sin privilegios para anon/authenticated:
-- todo acceso pasa por las funciones RPC de `public` (SECURITY DEFINER).

create schema if not exists cruce;
revoke all on schema cruce from public;
revoke all on schema cruce from anon, authenticated;

-- Espacios -----------------------------------------------------------------
create table cruce.espacios (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (char_length(nombre) between 1 and 60),
  tipo              text not null check (tipo in ('amigos', 'empresa')),
  demo              boolean not null default false,
  codigo_invitacion text not null unique
                    check (codigo_invitacion ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  creado_en         timestamptz not null default now(),
  ultimo_reinicio   timestamptz
);

-- Miembros: user_id es el id de Auth (nunca sale hacia afuera).
create table cruce.miembros (
  id         uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references cruce.espacios (id) on delete cascade,
  user_id    uuid,
  nombre     text not null check (char_length(nombre) between 1 and 30 and nombre = btrim(nombre)),
  rol        text not null check (rol in ('organizador', 'miembro')),
  simulado   boolean not null default false,
  creado_en  timestamptz not null default now(),
  orden      bigint generated always as identity,
  constraint miembros_simulado_sin_sesion check (not (simulado and user_id is not null)),
  constraint miembros_real_con_sesion check (simulado or user_id is not null)
);
create unique index miembros_espacio_user_uq on cruce.miembros (espacio_id, user_id) where user_id is not null;
create unique index miembros_espacio_nombre_uq on cruce.miembros (espacio_id, lower(nombre));
create unique index miembros_un_organizador_uq on cruce.miembros (espacio_id) where rol = 'organizador';
create index miembros_user_idx on cruce.miembros (user_id) where user_id is not null;

-- Propuestas -----------------------------------------------------------------
create table cruce.propuestas (
  id                 uuid primary key default gen_random_uuid(),
  espacio_id         uuid not null references cruce.espacios (id) on delete cascade,
  titulo             text not null check (char_length(titulo) between 1 and 80),
  organizador_id     uuid not null references cruce.miembros (id),
  imprescindible_id  uuid not null references cruce.miembros (id),
  minimo             integer not null,
  maximo             integer not null,
  zona_horaria       text not null check (zona_horaria = 'America/Santiago'),
  plazo              timestamptz not null,
  estado             text not null default 'borrador' check (estado in (
                       'borrador', 'reuniendo_interes', 'esperando_compromisos',
                       'grupo_confirmado', 'en_revision', 'expirado', 'cancelado')),
  state_rev          integer not null default 1 check (state_rev >= 1),
  version_vigente    integer check (version_vigente >= 1),
  ult_eval_resultado text check (ult_eval_resultado in (
                       'opcion_publicada', 'sin_opcion', 'reparacion_publicada', 'sin_alternativa')),
  ult_eval_version   integer,
  ult_eval_en        timestamptz,
  creada_en          timestamptz not null default now(),
  constraint propuestas_cupos check (2 <= minimo and minimo <= maximo and maximo <= 20)
);
create index propuestas_espacio_idx on cruce.propuestas (espacio_id, creada_en desc);
create index propuestas_organizador_idx on cruce.propuestas (organizador_id);
create index propuestas_imprescindible_idx on cruce.propuestas (imprescindible_id);

create table cruce.franjas (
  propuesta_id uuid not null references cruce.propuestas (id) on delete cascade,
  clave        text not null check (clave in ('A', 'B')),
  inicio       timestamptz not null,
  fin          timestamptz not null,
  primary key (propuesta_id, clave),
  constraint franjas_fin_posterior check (fin > inicio)
);

-- Condiciones privadas: solo las lee el propio miembro (o el organizador si es simulado).
create table cruce.condiciones (
  propuesta_id    uuid not null references cruce.propuestas (id) on delete cascade,
  miembro_id      uuid not null references cruce.miembros (id) on delete cascade,
  disponibilidad  jsonb not null,
  actualizadas_en timestamptz not null default now(),
  primary key (propuesta_id, miembro_id)
);
create index condiciones_miembro_idx on cruce.condiciones (miembro_id);

-- Interés y retiro por persona y propuesta.
create table cruce.participaciones (
  propuesta_id uuid not null references cruce.propuestas (id) on delete cascade,
  miembro_id   uuid not null references cruce.miembros (id) on delete cascade,
  interesado   boolean not null default false,
  interes_en   timestamptz,
  retirado     boolean not null default false,
  retirado_en  timestamptz,
  primary key (propuesta_id, miembro_id)
);
create index participaciones_miembro_idx on cruce.participaciones (miembro_id);

create table cruce.bajas (
  id             bigint generated always as identity primary key,
  propuesta_id   uuid not null references cruce.propuestas (id) on delete cascade,
  miembro_id     uuid not null references cruce.miembros (id) on delete cascade,
  en             timestamptz not null default now(),
  version        integer,
  habia_aceptado boolean not null,
  constraint bajas_una_por_persona unique (propuesta_id, miembro_id)
);
create index bajas_miembro_idx on cruce.bajas (miembro_id);

-- Versiones de la opción y foto de elegibles de cada versión.
create table cruce.versiones (
  propuesta_id uuid not null references cruce.propuestas (id) on delete cascade,
  version      integer not null check (version >= 1),
  franja_clave text not null,
  publicada_en timestamptz not null default now(),
  primary key (propuesta_id, version),
  foreign key (propuesta_id, franja_clave) references cruce.franjas (propuesta_id, clave) on delete cascade
);
create index versiones_franja_idx on cruce.versiones (propuesta_id, franja_clave);

create table cruce.elegibles (
  propuesta_id uuid not null,
  version      integer not null,
  miembro_id   uuid not null references cruce.miembros (id) on delete cascade,
  primary key (propuesta_id, version, miembro_id),
  foreign key (propuesta_id, version) references cruce.versiones (propuesta_id, version) on delete cascade
);
create index elegibles_miembro_idx on cruce.elegibles (miembro_id);

-- Aceptaciones: solo puede existir para alguien de la foto de elegibles de esa versión.
create table cruce.aceptaciones (
  id           bigint generated always as identity primary key,
  propuesta_id uuid not null,
  version      integer not null,
  miembro_id   uuid not null,
  aceptado_en  timestamptz not null default now(),
  vigente      boolean not null default true,
  constraint aceptaciones_una_por_version unique (propuesta_id, version, miembro_id),
  foreign key (propuesta_id, version, miembro_id)
    references cruce.elegibles (propuesta_id, version, miembro_id) on delete cascade
);
create index aceptaciones_miembro_idx on cruce.aceptaciones (miembro_id);

-- Registro de cambios (inmutable).
create table cruce.eventos (
  id             bigint generated always as identity primary key,
  propuesta_id   uuid not null references cruce.propuestas (id) on delete cascade,
  tipo           text not null check (tipo in (
                   'propuesta_creada', 'propuesta_abierta', 'opcion_publicada', 'evaluacion_sin_opcion',
                   'aceptacion', 'baja', 'reparacion_publicada', 'reparacion_sin_alternativa',
                   'propuesta_cancelada', 'propuesta_expirada')),
  actor_id       uuid references cruce.miembros (id) on delete cascade,
  actor_tipo     text not null check (actor_tipo in ('persona', 'simulacion', 'sistema')),
  ejecutado_por  uuid references cruce.miembros (id) on delete cascade,
  en             timestamptz not null default now(),
  estado_previo  text,
  estado_nuevo   text,
  version_previa integer,
  version_nueva  integer,
  state_rev      integer not null
);
create index eventos_propuesta_idx on cruce.eventos (propuesta_id, id);
create index eventos_actor_idx on cruce.eventos (actor_id);
create index eventos_ejecutado_por_idx on cruce.eventos (ejecutado_por);

create table cruce.eventos_espacio (
  id         bigint generated always as identity primary key,
  espacio_id uuid not null references cruce.espacios (id) on delete cascade,
  tipo       text not null check (tipo in ('demo_reiniciada')),
  actor_id   uuid references cruce.miembros (id) on delete cascade,
  en         timestamptz not null default now()
);
create index eventos_espacio_espacio_idx on cruce.eventos_espacio (espacio_id);
create index eventos_espacio_actor_idx on cruce.eventos_espacio (actor_id);

-- Intentos idempotentes: clave (usuario real, intento).
create table cruce.intentos (
  user_id      uuid not null,
  intento_id   uuid not null,
  operacion    text not null,
  parametros   jsonb not null,
  propuesta_id uuid references cruce.propuestas (id) on delete cascade,
  respuesta    jsonb not null,
  creado_en    timestamptz not null default now(),
  primary key (user_id, intento_id)
);
create index intentos_propuesta_idx on cruce.intentos (propuesta_id);

-- Fallas internas: solo sqlstate y contexto (nombre de función y línea), nunca valores.
create table cruce.errores_internos (
  id       bigint generated always as identity primary key,
  en       timestamptz not null default now(),
  funcion  text not null,
  sqlstate text,
  contexto text
);

-- Seguridad: RLS en todo y ningún privilegio para los roles del navegador.
alter table cruce.espacios         enable row level security;
alter table cruce.miembros         enable row level security;
alter table cruce.propuestas       enable row level security;
alter table cruce.franjas          enable row level security;
alter table cruce.condiciones      enable row level security;
alter table cruce.participaciones  enable row level security;
alter table cruce.bajas            enable row level security;
alter table cruce.versiones        enable row level security;
alter table cruce.elegibles        enable row level security;
alter table cruce.aceptaciones     enable row level security;
alter table cruce.eventos          enable row level security;
alter table cruce.eventos_espacio  enable row level security;
alter table cruce.intentos         enable row level security;
alter table cruce.errores_internos enable row level security;

revoke all on all tables in schema cruce from public, anon, authenticated;
revoke all on all sequences in schema cruce from public, anon, authenticated;
alter default privileges in schema cruce revoke all on tables from public, anon, authenticated;
alter default privileges in schema cruce revoke all on sequences from public, anon, authenticated;
alter default privileges in schema cruce revoke execute on functions from public, anon, authenticated;
