-- M1 · Row Level Security (spec §4).
-- Single-user AHORA: el operador autenticado tiene acceso total a su dato.
-- RLS HABILITADA en todas las tablas (no se sirve dato sin política).
--
-- FASE 2 (multi-tenant · dashboard del cliente): `clientes_metricas` y las
-- métricas se restringirán por tenant. Por eso ya están separadas y con RLS.

-- M0 dejó en `config` una política solo-lectura; la sustituimos por acceso total
-- del operador (necesita escribir las 4 decisiones del §7 desde el panel).
drop policy if exists "config_select_autenticado" on config;

do $$
declare
  t text;
  tablas text[] := array[
    'leads', 'inspecciones', 'cotizaciones', 'correos', 'clientes',
    'facturas', 'horas', 'gastos', 'disponibilidad', 'clientes_metricas',
    'seguimientos', 'intake', 'config'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$
      create policy "operador_full" on %I
        for all
        to authenticated
        using (true)
        with check (true);
    $p$, t);
  end loop;
end $$;
