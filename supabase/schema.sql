-- Grillo — esquema Postgres para Supabase
-- Ejecutar en el SQL editor de Supabase cuando el proyecto esté creado.
-- Mientras no exista, la app funciona igual con un store local en /data/db.json
-- (salvo el login real, que necesita Supabase Auth — ver README).

create extension if not exists "uuid-ossp";

create table if not exists abuelos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  fecha_nacimiento date,
  notas_generales text,
  created_at timestamptz not null default now()
);

-- rol='familiar' → auth_user_id apunta a una cuenta real de Supabase Auth
-- (login con email+contraseña). rol='abuelo' → auth_user_id queda null:
-- el abuelo no inicia sesión, su dispositivo usa un token propio (ver
-- abuelo_dispositivos) y esta fila solo existe para poder registrar quién
-- creó qué (ej. un recordatorio pedido por voz).
create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  rol text not null check (rol in ('abuelo', 'familiar')),
  relacion_con_abuelo text,
  abuelo_id uuid references abuelos(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table usuarios add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

create table if not exists recordatorios (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  tipo text not null check (tipo in ('medicamento', 'agua', 'cita', 'evento', 'otro')),
  descripcion text not null,
  hora text not null, -- "HH:MM"
  frecuencia text not null check (frecuencia in ('una_vez', 'diario', 'semanal')),
  creado_por uuid,
  activo boolean not null default true,
  ultima_notificacion timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists memorias (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  resumen text not null,
  transcripcion_original text,
  tema text,
  personas_mencionadas text[] default '{}',
  emocion_detectada text,
  fecha timestamptz not null default now(),
  embedding_id_pinecone text
);

create table if not exists conversaciones (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  fecha timestamptz not null default now(),
  transcripcion_completa jsonb not null default '[]'
);

create table if not exists alertas_emergencia (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  estado text not null check (estado in ('activa', 'resuelta')) default 'activa',
  fecha timestamptz not null default now(),
  fecha_resuelta timestamptz
);

-- Cuando Grillo nota un patrón de ánimo bajo sostenido (varios días seguidos
-- de tristeza/soledad/preocupación, no un evento aislado), le manda un aviso
-- a la familia y deja constancia acá — sirve para no repetir el mismo aviso
-- todos los días (se chequea la última fila antes de generar una nueva).
create table if not exists alertas_animo (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  fecha timestamptz not null default now(),
  resumen text not null
);

-- Token persistente por dispositivo (tablet/notebook del abuelo). Se genera
-- una vez desde la cuenta del familiar ("vincular este dispositivo") y
-- queda guardado en el navegador del abuelo — nunca vence, nunca pide login
-- de nuevo. El servidor SIEMPRE resuelve el abuelo_id a partir de este
-- token, nunca confía en un abuelo_id que mande el cliente.
create table if not exists abuelo_dispositivos (
  id uuid primary key default uuid_generate_v4(),
  abuelo_id uuid not null references abuelos(id) on delete cascade,
  token text not null unique,
  nombre_dispositivo text,
  creado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  ultimo_acceso timestamptz
);

create index if not exists idx_recordatorios_abuelo on recordatorios(abuelo_id);
create index if not exists idx_memorias_abuelo on memorias(abuelo_id);
create index if not exists idx_conversaciones_abuelo on conversaciones(abuelo_id);
create index if not exists idx_alertas_abuelo on alertas_emergencia(abuelo_id);
create index if not exists idx_alertas_animo_abuelo on alertas_animo(abuelo_id);
create index if not exists idx_dispositivos_abuelo on abuelo_dispositivos(abuelo_id);
create index if not exists idx_dispositivos_token on abuelo_dispositivos(token);
create index if not exists idx_usuarios_auth on usuarios(auth_user_id);

-- ----------------------------------------------------------------------
-- RLS: la app SIEMPRE accede desde el servidor (rutas /api/*) con la
-- service_role key, que bypassea RLS — la autorización real (quién puede
-- ver el abuelo de quién) se hace en código, en src/lib/auth/server.ts,
-- resolviendo el usuario/dispositivo antes de tocar la base.
-- Estas políticas son una segunda capa por si alguna vez se llama a
-- Supabase directo desde el cliente con la key pública (anon): un familiar
-- autenticado solo puede tocar filas de SU propio abuelo, nunca las de
-- otra familia. abuelo_dispositivos no tiene policy para authenticated:
-- los tokens de dispositivo son un secreto que solo maneja el servidor.
-- ----------------------------------------------------------------------
alter table abuelos enable row level security;
alter table usuarios enable row level security;
alter table recordatorios enable row level security;
alter table memorias enable row level security;
alter table conversaciones enable row level security;
alter table alertas_emergencia enable row level security;
alter table alertas_animo enable row level security;
alter table abuelo_dispositivos enable row level security;

drop policy if exists usuarios_propio_o_familia on usuarios;
create policy usuarios_propio_o_familia on usuarios for select to authenticated
  using (
    auth_user_id = auth.uid()
    or abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid())
  );
drop policy if exists usuarios_editar_propio on usuarios;
create policy usuarios_editar_propio on usuarios for update to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists abuelos_de_mi_familia on abuelos;
create policy abuelos_de_mi_familia on abuelos for select to authenticated
  using (id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));
drop policy if exists abuelos_editar_mi_familia on abuelos;
create policy abuelos_editar_mi_familia on abuelos for update to authenticated
  using (id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));
drop policy if exists abuelos_crear on abuelos;
create policy abuelos_crear on abuelos for insert to authenticated
  with check (true);

drop policy if exists recordatorios_mi_familia on recordatorios;
create policy recordatorios_mi_familia on recordatorios for all to authenticated
  using (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()))
  with check (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));

drop policy if exists memorias_mi_familia on memorias;
create policy memorias_mi_familia on memorias for all to authenticated
  using (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()))
  with check (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));

drop policy if exists conversaciones_mi_familia on conversaciones;
create policy conversaciones_mi_familia on conversaciones for all to authenticated
  using (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()))
  with check (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));

drop policy if exists alertas_mi_familia on alertas_emergencia;
create policy alertas_mi_familia on alertas_emergencia for all to authenticated
  using (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()))
  with check (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));

drop policy if exists alertas_animo_mi_familia on alertas_animo;
create policy alertas_animo_mi_familia on alertas_animo for all to authenticated
  using (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()))
  with check (abuelo_id in (select abuelo_id from usuarios where auth_user_id = auth.uid()));

-- Si las tablas se crean vía la dashboard/CLI de Supabase estos GRANT ya
-- vienen dados de fábrica. Si se corre este script por conexión directa
-- (Management API, como se hizo acá), hay que darlos a mano — si no,
-- service_role tira "permission denied" al pegarle a PostgREST aunque
-- tenga bypassrls, porque el GRANT de tabla es una capa previa a RLS.
grant usage on schema public to service_role, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on abuelos, usuarios, recordatorios, memorias, conversaciones, alertas_emergencia, alertas_animo to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Sin seed de datos de ejemplo a propósito: los usuarios reales (abuelo +
-- familiar) se crean desde la app a través del flujo de registro/onboarding.
