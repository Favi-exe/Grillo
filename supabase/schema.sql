-- Grillo — esquema Postgres para Supabase
-- Ejecutar en el SQL editor de Supabase cuando el proyecto esté creado.
-- Mientras no exista, la app funciona igual con un store local en /data/db.json.

create extension if not exists "uuid-ossp";

create table if not exists abuelos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  fecha_nacimiento date,
  notas_generales text,
  created_at timestamptz not null default now()
);

create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  rol text not null check (rol in ('abuelo', 'familiar')),
  relacion_con_abuelo text,
  abuelo_id uuid references abuelos(id) on delete cascade,
  created_at timestamptz not null default now()
);

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

create index if not exists idx_recordatorios_abuelo on recordatorios(abuelo_id);
create index if not exists idx_memorias_abuelo on memorias(abuelo_id);
create index if not exists idx_conversaciones_abuelo on conversaciones(abuelo_id);
create index if not exists idx_alertas_abuelo on alertas_emergencia(abuelo_id);

-- Seed mínimo de demo (opcional, coincide con el seed local en /data/db.json)
insert into abuelos (id, nombre, fecha_nacimiento, notas_generales)
values ('11111111-1111-1111-1111-111111111111', 'Carlos', '1948-03-12',
        'Le gusta el mate, el fútbol y contar historias de su pueblo natal.')
on conflict (id) do nothing;

insert into usuarios (id, nombre, rol, relacion_con_abuelo, abuelo_id)
values
  ('22222222-2222-2222-2222-222222222222', 'Don Carlos', 'abuelo', null, '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'Ana', 'familiar', 'hija', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;
