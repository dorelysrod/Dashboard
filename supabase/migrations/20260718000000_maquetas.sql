-- Fase 2 — tabla `maquetas`: landings generadas por negocio (feature "maqueta").
-- Cada maqueta es un HTML self-contained servido en /maqueta/[token]. El acceso
-- del CLIENTE es por TOKEN de capacidad opaco + expiración (sin URL directa por
-- id, sin login). El panel (operador autenticado) las crea y lista.
-- Identificadores de dominio en español (CLAUDE.md §1).

create table if not exists public.maquetas (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.leads (id) on delete cascade,
  token       text not null unique,
  titulo      text,
  html        text not null,
  -- 'nueva' (sin sitio previo) | 'redisenio' (rediseño del sitio existente).
  origen      text not null default 'nueva',
  url_fuente  text,
  expira_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists maquetas_lead_idx on public.maquetas (lead_id);
create index if not exists maquetas_token_idx on public.maquetas (token);

comment on table public.maquetas is 'Landings generadas por negocio; acceso por token de capacidad + expiración.';

-- RLS: el panel lo opera una sola persona autenticada (select/insert). La vista
-- pública /maqueta/[token] NO usa este cliente: lee con service role (que omite
-- RLS) filtrando por token + expira_at, así el cliente sin login puede verla sin
-- exponer el resto de la tabla.
alter table public.maquetas enable row level security;

drop policy if exists "maquetas_select_autenticado" on public.maquetas;
create policy "maquetas_select_autenticado"
  on public.maquetas
  for select
  to authenticated
  using (true);

drop policy if exists "maquetas_insert_autenticado" on public.maquetas;
create policy "maquetas_insert_autenticado"
  on public.maquetas
  for insert
  to authenticated
  with check (true);
