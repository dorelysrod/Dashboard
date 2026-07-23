-- Facturación Venezuela (persona natural con RIF) — aditivo, no toca lo existente.
-- Facturas emitidas bajo régimen venezolano: base imponible en Bs, IVA
-- discriminado, IGTF si el pago es en divisas, y equivalente USD a tasa BCV.
-- La declaración (ISLR/IVA) se CALCULA desde estas filas + config.FISCAL_VE.

create table if not exists facturas_ve (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references clientes (id) on delete set null,
  numero            integer not null,
  numero_control    text not null,
  fecha             date not null default current_date,
  cliente_nombre    text not null,
  cliente_rif       text,
  cliente_domicilio text,
  concepto          text not null,
  moneda            text not null default 'USD' check (moneda in ('USD', 'VES')),
  monto             numeric(14,2) not null,   -- en `moneda`
  tasa_bcv          numeric(14,4) not null,   -- Bs por USD del día de emisión
  base_bs           numeric(14,2) not null,
  iva_pct           numeric(6,4)  not null default 0.16,
  iva_bs            numeric(14,2) not null,
  igtf_pct          numeric(6,4)  not null default 0,
  igtf_bs           numeric(14,2) not null default 0,
  total_bs          numeric(14,2) not null,
  total_usd         numeric(14,2) not null,
  estado            estado_factura not null default 'pendiente',
  created_at        timestamptz not null default now()
);

create unique index if not exists facturas_ve_numero_idx on facturas_ve (numero);
create index if not exists facturas_ve_fecha_idx on facturas_ve (fecha);

alter table facturas_ve enable row level security;
drop policy if exists "operador_full" on facturas_ve;
create policy "operador_full" on facturas_ve
  for all
  to authenticated
  using (true)
  with check (true);

-- Parámetros del régimen VE (editables desde el panel). `valor` es jsonb.
insert into config (clave, valor, descripcion) values
  (
    'FISCAL_VE',
    '{"nombre": "", "rif": "", "domicilio": "", "ut_bs": 9, "tasa_bcv": 0, "iva_pct": 0.16, "igtf_pct": 0.03, "cargas_familiares": 0}'::jsonb,
    'Régimen fiscal Venezuela (persona natural con RIF): datos del emisor, valor UT, tasa BCV, alícuotas.'
  )
on conflict (clave) do nothing;
