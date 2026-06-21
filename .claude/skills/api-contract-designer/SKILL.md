---
name: api-contract-designer
description: Designs API contracts (endpoints, request/response schemas, error shapes) for a feature, before frontend/backend implementation begins. Use as part of step 4 of the /new-feature chain.
allowed-tools: Read, Grep, Glob, Write
---

# API Contract Designer

## Purpose

Give `frontend`, `backend`, and `testing` a single shared contract to implement and test against. "Contract" here covers both Supabase-backed domain services and the `AIProvider` method signatures.

## Triggers

- `/new-feature` command, step 4, after `domain-model-designer`.
- A feature's API surface changes (new endpoint, changed schema).

## Inputs

- The feature's domain model.
- Acceptance criteria.
- Project naming / error-shape conventions (CLAUDE.md).

## Outputs

- An API contract doc (`docs/api/<feature>.md` or in the feature folder) listing each endpoint: method, path, request schema, response schema, error responses.

## Validation Rules

- Every endpoint has a request schema (if applicable), a success response schema, and at least one error response.
- Naming/error-shape conventions are consistent across services; if none exist yet, this skill establishes them (recorded in `docs/architecture/` or CLAUDE.md).
- Every endpoint maps to at least one acceptance criterion.

## Process

1. Read the domain model and AC.
2. Draft endpoints (method, path, request/response schemas, error cases) covering each AC.
3. Check/establish naming and error-shape conventions (record them in `docs/architecture/` or CLAUDE.md).
4. Write the contract doc.
5. Hand off to `backend` (implementation), `frontend` (consumption), and `testing` (test generation).

## Examples

- Service `redactarCorreo(lead, segmento)` → `{asunto, cuerpo}` on success / `{error: "segmento_invalido"}` for an out-of-range segmento. Supabase: `GET cotizaciones?lead_id=eq.<id>` → `200 cotizaciones[]` / `404 {error: "not_found"}`.

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
