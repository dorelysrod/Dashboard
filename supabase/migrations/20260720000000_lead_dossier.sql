-- Dossier del prospecto (OSINT): todo lo público reunido de sus redes/directorios
-- (eslogan, seguidores, categoría, servicios, contacto, dirección, redes, colores…).
-- jsonb para no crear 20 columnas; la UI lo lee para "saber todo del prospecto".
alter table public.leads add column if not exists dossier jsonb;
