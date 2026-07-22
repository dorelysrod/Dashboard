-- Tracking de vistas del portal de propuestas (/p/[numero]).
-- Señal de intención de compra: cuándo y cuántas veces el prospecto abrió su
-- maqueta (tras pasar el candado email+código). GDPR: NO se guarda IP ni email,
-- solo el número público de la propuesta y el timestamp.

create table if not exists public.maqueta_vistas (
  id bigint generated always as identity primary key,
  numero integer not null,
  vista_at timestamptz not null default now()
);

create index if not exists maqueta_vistas_numero_idx on public.maqueta_vistas (numero);

-- Solo el service role (portal público + panel, ambos server-side) escribe/lee.
-- Sin políticas públicas: RLS activo bloquea el acceso anónimo directo.
alter table public.maqueta_vistas enable row level security;
