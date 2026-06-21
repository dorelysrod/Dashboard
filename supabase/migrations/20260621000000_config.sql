-- M0 — tabla `config`: configuración de negocio editable (dato único en Supabase).
-- Pares clave/valor: tipo de cambio MXN→€, flag AI_PROVIDER, etc.
-- Identificadores de dominio en español (CLAUDE.md §1).

create table if not exists public.config (
  clave           text primary key,
  valor           text not null,
  descripcion     text,
  actualizado_en  timestamptz not null default now()
);

comment on table public.config is 'Configuración de negocio editable (clave/valor).';

-- RLS: el panel lo opera una sola persona autenticada. Lectura para usuarios
-- autenticados; escritura solo server-side (service role, que omite RLS).
alter table public.config enable row level security;

drop policy if exists "config_select_autenticado" on public.config;
create policy "config_select_autenticado"
  on public.config
  for select
  to authenticated
  using (true);

-- Seed mínimo de configuración (valores por defecto; editables después).
insert into public.config (clave, valor, descripcion) values
  ('FX_MXN_EUR', '0.05', 'Tipo de cambio MXN→€ usado por el motor fiscal.'),
  ('AI_PROVIDER', 'manual', 'Adaptador IA activo: manual (fase 1) | anthropic (fase 2).')
on conflict (clave) do nothing;
