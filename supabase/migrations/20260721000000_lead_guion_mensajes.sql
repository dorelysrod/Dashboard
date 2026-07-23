-- Cache de venta en la base (evita re-llamar la suscripción): guion de venta y
-- mensajes por canal (WhatsApp/DM/correo). Se generan UNA vez por lead y se leen
-- desde aquí. Aplicado vía pooler.
alter table public.leads add column if not exists guion jsonb;
alter table public.leads add column if not exists mensajes jsonb;
