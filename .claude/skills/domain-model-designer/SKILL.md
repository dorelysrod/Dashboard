---
name: domain-model-designer
description: Designs the domain model (entities, fields, relationships, invariants) for a feature. Use as part of step 4 of the /new-feature chain, or whenever a feature's data model changes significantly.
allowed-tools: Read, Grep, Glob, Write
---

# Domain Model Designer

## Purpose

Define the entities, relationships, and invariants a feature needs before API contracts and implementation begin.

## Triggers

- `/new-feature` command, step 4.
- A feature's data model changes significantly (new entity, new relationship, new invariant).

## Inputs

- The feature's acceptance criteria.
- The existing Supabase schema (avoid redefining entities — the spec already defines leads, inspecciones, cotizaciones, correos, clientes, facturas, horas, gastos, disponibilidad, config).

## Outputs

- A domain model doc (entities, fields, types, relationships, invariants) in `docs/architecture/` or alongside the relevant Supabase migration.

## Validation Rules

- Every entity traces back to at least one acceptance criterion.
- No entity duplicates an existing one in the Supabase schema without justification (reuse or extend instead).
- Invariants are stated explicitly (e.g. "una cotización pertenece a exactamente un lead").

## Process

1. Read the feature's acceptance criteria.
2. Check the existing Supabase schema for relevant entities.
3. Draft entities with fields/types, relationships (1:1, 1:N, N:N), and invariants (use Spanish domain identifiers).
4. Write the model to `docs/architecture/` or the migration; extend the schema if a new concept is introduced.
5. Hand off to `api-contract-designer`.

## Examples

- Feature "cotización" → entity: `cotizaciones {id, lead_id, base_mxn, modulos[], total_mxn, total_eur, fecha_entrega, estado}`; invariant: "total_eur = total_mxn × FX_MXN_EUR (within rounding tolerance)".

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
