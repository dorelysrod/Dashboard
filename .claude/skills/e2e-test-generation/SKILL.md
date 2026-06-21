---
name: e2e-test-generation
description: Generates end-to-end tests for primary user journeys, prioritizing the core operator journey, using accessible selectors. Use during /new-feature, or invoked by the `testing` agent.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# E2E Test Generation

## Purpose

Verify primary user journeys work end-to-end through the real UI, with the **core operator journey** (buscar → inspeccionar → cotizar/correo → seguir → aceptar → entregar → fiscal) covered first.

## Triggers

- `/new-feature` command.
- The `testing` agent invokes directly.

## Inputs

- The user journey for the feature (from the spec / `ux`).
- The relevant panel view(s).

## Outputs

- E2E test files in `tests/e2e`.

## Validation Rules

- The core operator journey has a passing e2e test.
- Tests use accessible selectors (role/label/text), not brittle CSS selectors or test-only IDs where an accessible alternative exists.
- Tests cover the full journey from entry point to the user-visible outcome.
- No test makes an external API call — the `AIProvider` is `ManualProvider` in phase 1; stub/seed the AI step.

## Process

1. Read the journey and identify entry point, steps, and expected outcome.
2. Write the e2e test driving the UI through each step using accessible selectors.
3. Assert on the user-visible outcome (not internal state).
4. Run the test if a runner is available; report pass/fail.

## Examples

- Journey "Buscar lead → agregar al pipeline" → e2e test: open Buscar, enter ciudad+rubro, submit, wait for results, click "+ Agregar al pipeline", assert the lead appears in Pipeline under etapa "nuevo".

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
