---
name: integration-test-generation
description: Generates integration tests for domain services + data-layer (Supabase) interactions, covering success and at least one error response per service. Use during /new-feature, /pr-review, or invoked by the `testing` agent.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Integration Test Generation

## Purpose

Verify that domain services and their data-layer (Supabase) interactions behave correctly end-to-end at the integration level (no UI).

## Triggers

- `/new-feature` command.
- `/pr-review` for changed services/endpoints.
- The `testing` agent invokes directly.

## Inputs

- The service/API contract (`api-contract-designer` output).
- The implemented service and its data layer.

## Outputs

- Integration test files in `tests/integration`.

## Validation Rules

- Every service has at least one success-path test and one error-response test.
- Tests exercise the real data layer (a test Supabase/Postgres), not mocks, where the stack supports it.
- The `AIProvider` is tested through `ManualProvider` (no external API call); cover the parse path for malformed/empty pasted responses.
- A service that touches Supabase has its authorization/RLS path exercised.

## Process

1. Read the contract for the service(s) under test.
2. Set up any required test data/fixtures (seeded leads, etc.).
3. Write tests for the success response and at least one documented error response.
4. For flows mediated by a shared domain service, write a test that exercises the full path.

## Examples

- `armarCotizacion(lead, modulos)` → "returns lineas + total_mxn/total_eur for a valid lead" (success), "rejects with `modulo_desconocido` for an unknown módulo" (error).

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
