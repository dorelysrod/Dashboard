# Supabase — esquema y datos (M1)

Dato único del panel (Postgres + Auth + RLS). Spec §4.

## Migraciones (orden lexical)

- `20260621000000_config.sql` — M0: tabla `config`.
- `20260621010000_schema.sql` — M1: enums + tablas del dominio (`leads`,
  `inspecciones`, `cotizaciones`, `correos`, `clientes`, `facturas`, `horas`,
  `gastos`, `disponibilidad`, `clientes_metricas`, y Fase 3 `seguimientos`,
  `intake`). Migra `config.valor` a `jsonb`.
- `20260621020000_rls.sql` — M1: RLS habilitada + política `operador_full`
  (single-user) en todas las tablas.

## Validar el SQL

```bash
supabase db reset   # aplica migraciones + corre seed.sql
```

> Requiere Supabase CLI + Docker. Si no los tienes, el SQL queda validado por
> inspección; corre `db reset` al disponer de entorno para confirmarlo.

## Seed

`seed.sql` siembra **datos DEMO (nombres ficticios)** — el repo es **público**
(GDPR). Los datos reales de prospectos viven solo en tu Supabase, **nunca** en el
repo. Edita el seed solo con datos ficticios.

## Notas

- `leads.llamada_at` = **tu** agenda (Calendly/Google, fase 2), no el Cal.com del
  sitio del cliente. Ver spec §8.
- `clientes_metricas` y `seguimientos`/`intake` quedan listas para Fase 2/3, sin
  lógica en fase 1.
