-- Nicho comercial del lead (estudio de nichos jul 2026).
-- Ranking A del estudio (turismo dental, jardines/venues de bodas, tour
-- operadores) + el nicho base con el que arrancó el negocio (medicina estética).
-- Los leads existentes son todos de estética → default en la columna.

create type nicho_lead as enum (
  'estetica',
  'turismo_dental',
  'bodas_venues',
  'tour_operadores'
);

alter table leads
  add column nicho nicho_lead not null default 'estetica';

-- El pipeline filtra por nicho (chips) → índice como el de etapa.
create index leads_nicho_idx on leads (nicho);
