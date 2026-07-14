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
- `20260711000000_leads_negocio_unique.sql` — índice único `leads(negocio)`
  (anti-duplicado a nivel de BD).

## ⚠️ Deshabilitar signups (paso OBLIGATORIO de setup)

La política `operador_full` da acceso **total** (`using(true) with check(true)`) a
**cualquier** usuario `authenticated`. El modelo es single-user: el único usuario
que debe existir es tú (el operador). Como la `NEXT_PUBLIC_SUPABASE_URL` y la
`anon key` están expuestas al navegador, si los signups quedan **habilitados**
(el default de Supabase) cualquiera que se registre contra tu proyecto obtiene
lectura/escritura de todo el negocio, incluidos los datos personales de los leads
(**riesgo GDPR**).

En el panel de Supabase → **Authentication → Sign In / Providers** (o
**Auth → Settings**):

1. **Desactiva "Allow new users to sign up"** (Enable signup = off).
2. Confirma que solo existe tu cuenta de operador en **Authentication → Users**;
   créala manualmente (invite) si hace falta antes de desactivar el signup.
3. Opcional (defensa en profundidad): restringir la política a tu `auth.uid()`
   concreto en vez de `to authenticated` genérico.

Verifícalo tras cada (re)provisión del proyecto; no es parte de las migraciones
(es config del proyecto hosted). Ver `security/checklist.md`.

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
