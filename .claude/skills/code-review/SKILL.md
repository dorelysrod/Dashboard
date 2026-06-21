---
name: code-review
description: Performs a project-specific code review checking adherence to this project's conventions - service layering, design tokens, Spanish identifiers, GDPR, and "phase 1 makes zero external API calls" - complementing (not replacing) the built-in /code-review. Use during /pr-review.
allowed-tools: Read, Grep, Glob
---

# Code Review (Project-Specific)

## Purpose

Catch violations of *this project's* conventions (per CLAUDE.md) that a generic code review wouldn't know to check: the service-layering rule, light-theme design tokens, Spanish domain identifiers, GDPR handling, and the phase-1 "no external API call" rule.

## Triggers

- `/pr-review` command.
- A PR-review CI workflow, if configured.

## Inputs

- The PR diff.
- `CLAUDE.md` and (when it exists) `ARCHITECTURE.md`.

## Outputs

- Review findings as PR comments, categorized by severity.

## Validation Rules

- **Layering:** the UI never calls Supabase, an external API, or an integration directly — always through a servicio de dominio, which goes through the `AIProvider` harness or an integration stub.
- **Phase 1:** no code path makes an external API call; all AI work goes through `ManualProvider`. (`AnthropicProvider` may exist but stays behind the `AI_PROVIDER` flag.)
- **Design tokens:** no hardcoded colors/spacing where a mockup token exists; light theme only.
- **Domain language:** domain identifiers are in Spanish, matching the schema (leads, etapa, cotizaciones, …).
- **GDPR:** no business data in `localStorage`; lead/cliente data handled per the security checklist.
- The PR doesn't perform unnecessary full-file rewrites where a targeted edit would do.

## Process

1. Read the PR diff and identify changed files.
2. Check each change against the validation rules above.
3. Check for unnecessary full-file rewrites vs. the prior version (large rewrites of mostly-unchanged files are a flag).
4. Post findings as PR comments; don't block on style preferences already covered by linters.

## Examples

- Flag: "This component calls the Supabase client directly — route it through a servicio de dominio per CLAUDE.md §1."
- Flag: "This adds a `fetch()` to the Anthropic API in a phase-1 path — phase 1 must make zero external API calls; go through `ManualProvider`."
- Flag: "Hardcoded `#6C5CE7` here — use the `--violet` token."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
