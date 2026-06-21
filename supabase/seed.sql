-- M1 · Datos sembrados (spec §4) — corre tras las migraciones en `supabase db reset`.
-- ⚠️ DATOS DEMO (nombres ficticios): el repo es PÚBLICO (GDPR). Los datos reales
-- de prospectos van solo a Supabase en tu entorno, nunca al repo. Edita aquí solo
-- con datos ficticios. UUIDs fijos para enlazar filas hijas de forma determinista.

-- ── config: las 4 decisiones (§7). Re-tipa las filas de M0 y añade PRECIOS/FISCAL ──
insert into config (clave, valor) values
  ('FX_MXN_EUR', '0.05'::jsonb),
  ('AI_PROVIDER', '"manual"'::jsonb),
  ('PRECIOS', '{
      "base_mxn": 14900,
      "modulos": {"agenda":0,"recordatorios":0,"bilingue":0,"seo":0,"galeria":0,"whatsapp":0,"cms":0},
      "suscripcion_mxn": 0,
      "mantenimiento_mxn": 0
   }'::jsonb),
  ('FISCAL', '{
      "tipo_marginal": 0.37,
      "mkb_vrijstelling": 0.127,
      "zvw": 0.0485,
      "apartar_pct": 0.40,
      "kor": false
   }'::jsonb)
on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();

-- ── disponibilidad por día (horas reales de trabajo; del mockup) ──────────────
insert into disponibilidad (dia, horas) values
  ('LU', 0), ('MA', 4), ('MI', 0), ('JU', 4), ('VI', 0), ('SA', 6), ('DO', 0)
on conflict (dia) do update set horas = excluded.horas;

-- ── leads (demo) ─────────────────────────────────────────────────────────────
insert into leads (id, negocio, ciudad, estado, rubro, rating, resenas, sitio_web,
                   tecnologia, segmento, tier, etapa, valor_eur, esfuerzo_dias)
values
  ('00000000-0000-0000-0000-000000000001', 'Dra. Valeria Núñez', 'CDMX', 'CDMX',
   'Medicina estética', 5.0, 60, 'wix', 'Wix', 1, 'B', 'enviado', 745, 9),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Mateo Ríos', 'Tijuana', 'Baja California',
   'Medicina estética', 5.0, 40, 'wordpress', 'WordPress', 1, 'B', 'en_desarrollo', 900, 10),
  ('00000000-0000-0000-0000-000000000003', 'Clínica Lumina', 'CDMX', 'CDMX',
   'Medicina estética', 5.0, 30, null, 'Instagram / Linktree', 2, 'B', 'enviado', 745, 6),
  ('00000000-0000-0000-0000-000000000004', 'Clínica Aurora Facial', 'Cancún', 'Quintana Roo',
   'Medicina estética', 4.9, 709, 'wordpress', 'WordPress + Elementor', 1, 'A', 'abierto', 1400, 16),
  ('00000000-0000-0000-0000-000000000005', 'Dra. Renata Vidal', 'Monterrey', 'Nuevo León',
   'Medicina estética', 5.0, 75, null, 'Por inspeccionar', 2, 'B', 'inspeccionado', 800, 8)
on conflict (id) do nothing;

-- ── inspecciones ─────────────────────────────────────────────────────────────
insert into inspecciones (lead_id, tecnologia, hosting, mejoras, segmento, recomendacion)
values
  ('00000000-0000-0000-0000-000000000001', 'Wix', 'Wix',
   array['Sin agenda', 'Home = feed de IG', 'Sin inglés'], 1,
   'Plantilla Wix lenta. Rehacer en React/Next: mejor SEO y conversión.'),
  ('00000000-0000-0000-0000-000000000002', 'WordPress', 'cPanel',
   array['Sitio no refleja inglés', 'Reservas por teléfono'], 1,
   'WP lento; quiere autogestión. Headless con CMS o React + módulo editable.'),
  ('00000000-0000-0000-0000-000000000004', 'WordPress + Elementor', 'Hosting compartido',
   array['Ya posiciona', 'Rediseño de conversión'], 1,
   'Ya posiciona. Rediseño de conversión + bilingüe + dashboard. Pitch de upgrade.');

-- ── cotizaciones (total_eur = total_mxn * 0.05) ──────────────────────────────
insert into cotizaciones (lead_id, base_mxn, modulos, total_mxn, total_eur, estado)
values
  ('00000000-0000-0000-0000-000000000001', 14900, array['Agenda','Recordatorios','Bilingüe'], 14900, 745, 'enviada'),
  ('00000000-0000-0000-0000-000000000002', 14900, array['Agenda','Bilingüe','SEO'], 18000, 900, 'aceptada'),
  ('00000000-0000-0000-0000-000000000003', 14900, array[]::text[], 14900, 745, 'enviada'),
  ('00000000-0000-0000-0000-000000000004', 14900, array['Bilingüe','SEO','Galería','Dashboard'], 28000, 1400, 'enviada');

-- ── correos (tracking) ───────────────────────────────────────────────────────
insert into correos (lead_id, asunto, aperturas, clics, vio_cotizacion, enviado_at)
values
  ('00000000-0000-0000-0000-000000000001', '3 cosas que su web está dejando ir', 3, 1, true,  now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000000002', 'Una web que convierta sus pacientes de EE.UU.', 5, 2, true, now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000000003', 'Una web propia (más allá de Instagram)', 0, 0, false, now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000004', 'Más pacientes internacionales para su clínica', 2, 1, true, now() - interval '5 days');

-- ── clientes + facturas (lead aceptado en desarrollo) ────────────────────────
insert into clientes (id, lead_id, nombre, suscripcion_activa)
values ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Dr. Mateo Ríos', true)
on conflict (id) do nothing;

insert into facturas (cliente_id, concepto, mxn, tipo_cambio, eur, tipo, estado, fecha)
values
  ('a0000000-0000-0000-0000-000000000002', 'Build + agenda + bilingüe', 18150, 0.0497, 902, 'build', 'pendiente', current_date),
  ('a0000000-0000-0000-0000-000000000002', 'Dashboard métricas (mes)', 900, 0.0500, 45, 'suscripcion', 'pagada', current_date);

-- ── horas (proceso del proyecto activo) ──────────────────────────────────────
insert into horas (lead_id, paso, estimado_h, real_h, dificultad)
values
  ('00000000-0000-0000-0000-000000000002', 'Diseño base (plantilla)', 4, 4, 'facil'),
  ('00000000-0000-0000-0000-000000000002', 'Contenido (textos/fotos)', 8, 12, 'media'),
  ('00000000-0000-0000-0000-000000000002', 'Desarrollo + módulos', 16, null, 'dificil');

-- ── gastos (BTW recuperable) ─────────────────────────────────────────────────
insert into gastos (concepto, eur, btw_eur, fecha)
values
  ('Hosting/dominio', 120, 25, current_date - 20),
  ('Herramientas/software', 300, 63, current_date - 10);
