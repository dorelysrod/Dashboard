-- M1 · Esquema del dominio (spec §4). Un solo registro lead → cliente recorre
-- todo. Identificadores en español. Postgres/Supabase. RLS en 20260621020000.
-- `config` ya existe (migración M0 20260621000000); aquí solo se migra a jsonb.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type etapa_lead as enum (
  'nuevo', 'inspeccionado', 'cotizado', 'enviado', 'abierto',
  'aceptado', 'en_desarrollo', 'entregado', 'descartado'
);
create type tier_lead as enum ('A', 'B', 'C');
create type estado_cotizacion as enum ('borrador', 'enviada', 'aceptada', 'rechazada');
create type tipo_factura as enum ('build', 'suscripcion');
create type estado_factura as enum ('pendiente', 'pagada');
create type dificultad_paso as enum ('facil', 'media', 'dificil');
create type dia_semana as enum ('LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO');

-- ── leads ────────────────────────────────────────────────────────────────────
create table leads (
  id            uuid primary key default gen_random_uuid(),
  negocio       text not null,
  ciudad        text,
  estado        text,                 -- estado/provincia (no confundir con etapa)
  rubro         text,
  rating        numeric(2,1),
  resenas       integer,
  telefono      text,
  sitio_web     text,
  tecnologia    text,
  segmento      smallint check (segmento between 1 and 4),
  tier          tier_lead,
  etapa         etapa_lead not null default 'nuevo',
  valor_eur     numeric(10,2),
  esfuerzo_dias numeric(5,1),
  razon_perdida text,
  llamada_at    timestamptz,          -- TU agenda: llamada agendada con el lead (§A)
  created_at    timestamptz not null default now()
);
create index leads_etapa_idx on leads (etapa);
create index leads_segmento_idx on leads (segmento);

-- ── inspecciones ─────────────────────────────────────────────────────────────
create table inspecciones (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads (id) on delete cascade,
  tecnologia    text,
  hosting       text,
  mejoras       text[] not null default '{}',
  segmento      smallint check (segmento between 1 and 4),
  recomendacion text,
  raw           text,                 -- salida cruda del harness IA
  created_at    timestamptz not null default now()
);
create index inspecciones_lead_idx on inspecciones (lead_id);

-- ── cotizaciones ─────────────────────────────────────────────────────────────
create table cotizaciones (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads (id) on delete cascade,
  base_mxn      numeric(12,2),
  modulos       text[] not null default '{}',
  total_mxn     numeric(12,2),
  total_eur     numeric(12,2),
  fecha_entrega date,
  estado        estado_cotizacion not null default 'borrador',
  created_at    timestamptz not null default now()
);
create index cotizaciones_lead_idx on cotizaciones (lead_id);

-- ── correos ──────────────────────────────────────────────────────────────────
create table correos (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references leads (id) on delete cascade,
  asunto         text,
  cuerpo         text,
  enviado_at     timestamptz,
  aperturas      integer not null default 0,
  clics          integer not null default 0,
  vio_cotizacion boolean not null default false,
  created_at     timestamptz not null default now()
);
create index correos_lead_idx on correos (lead_id);

-- ── clientes (un lead aceptado) ──────────────────────────────────────────────
create table clientes (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references leads (id) on delete cascade,
  nombre             text,
  datos_factura      jsonb,
  suscripcion_activa boolean not null default false,
  created_at         timestamptz not null default now()
);
create index clientes_lead_idx on clientes (lead_id);

-- ── facturas ─────────────────────────────────────────────────────────────────
create table facturas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  concepto    text,
  mxn         numeric(12,2),
  tipo_cambio numeric(8,4),
  eur         numeric(12,2),
  tipo        tipo_factura not null,
  estado      estado_factura not null default 'pendiente',
  fecha       date,
  created_at  timestamptz not null default now()
);
create index facturas_cliente_idx on facturas (cliente_id);

-- ── horas (proceso · estimado vs real) ───────────────────────────────────────
create table horas (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads (id) on delete cascade,
  paso       text,
  estimado_h numeric(6,2),
  real_h     numeric(6,2),
  dificultad dificultad_paso,
  created_at timestamptz not null default now()
);
create index horas_lead_idx on horas (lead_id);

-- ── gastos (fiscal · BTW recuperable) ────────────────────────────────────────
create table gastos (
  id         uuid primary key default gen_random_uuid(),
  concepto   text,
  eur        numeric(12,2),
  btw_eur    numeric(12,2),
  fecha      date,
  created_at timestamptz not null default now()
);

-- ── disponibilidad (capacidad por día; busy/free real lo da tu calendario) ───
create table disponibilidad (
  dia   dia_semana primary key,
  horas numeric(4,1) not null default 0
);

-- ── clientes_metricas (FASE 2 · multi-tenant, dashboard del cliente) ─────────
-- En fase 1 vacía; RLS por tenant se aplica en fase 2.
create table clientes_metricas (
  cliente_id      uuid primary key references clientes (id) on delete cascade,
  ga4_property_id text,
  gsc_site_url    text,
  gbp_location_id text,
  timezone        text not null default 'Europe/Amsterdam'
);

-- ── FASE 3 (creadas listas, SIN lógica en fase 1) ────────────────────────────
-- Secuencias de seguimiento (§11.A). Solo estructura; el drip lo maneja Brevo en fase 2+.
create table seguimientos (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  intento      smallint not null default 1,
  programado_at timestamptz,
  enviado_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index seguimientos_lead_idx on seguimientos (lead_id);

-- Portal de intake (§11.B). `completado_at` arranca el reloj de Entregas.
create table intake (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads (id) on delete cascade,
  token        text not null unique,
  completado_at timestamptz,
  datos        jsonb,                 -- accesos/contenido (archivos → Storage, fase 3)
  created_at   timestamptz not null default now()
);
create index intake_lead_idx on intake (lead_id);

-- ── config (§7): migrar de text (M0) a jsonb para alojar objetos (PRECIOS/FISCAL) ─
alter table config alter column valor type jsonb using to_jsonb(valor);
-- El seed (supabase/seed.sql) re-tipa los valores existentes y añade PRECIOS/FISCAL.
