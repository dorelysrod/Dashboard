-- T-009: indexes for the pipeline's hot queries. Without them every /pipeline
-- request runs two full scans + sort on leads (count + data page), and the
-- invoices view sorts facturas in memory.
--
-- Matches aplicarOrdenLeads (lib/data/leads.ts): the 'calificados' query
-- filters rating >= X and orders rating DESC NULLS LAST, resenas DESC NULLS
-- LAST, created_at ASC. Direction and NULLS treatment must mirror the query
-- exactly (PostgreSQL defaults DESC to NULLS FIRST, which would not match);
-- created_at as the tertiary key lets the index satisfy the whole ORDER BY,
-- so paginated top-N reads need no sort step.
create index if not exists leads_rating_resenas_idx
  on leads (rating desc nulls last, resenas desc nulls last, created_at);

-- Default pipeline order (ORDER BY created_at ASC) and its paginated ranges.
create index if not exists leads_created_at_idx on leads (created_at);

-- obtenerFacturas orders by fecha DESC; an asc btree is scanned backwards.
create index if not exists facturas_fecha_idx on facturas (fecha);

-- Verification (run where a live DB is available, e.g. supabase db + psql):
--   explain (analyze) select id from leads
--     where rating >= 4.5
--     order by rating desc nulls last, resenas desc nulls last, created_at
--     limit 25;
-- Expect: Index Scan using leads_rating_resenas_idx, no Sort node.
--
-- Note on count: 'exact' count (leads.ts) stays deliberately: PostgREST's
-- planned/estimated counts come from planner estimates and are unreliable for
-- filtered queries, which would break acotarPagina/pagination totals. At this
-- product's scale (dozens-hundreds of leads, single operator) exact is O(n)
-- over a now index-assisted scan and remains the correct trade-off. Revisit
-- only if leads grows past ~100k rows.
