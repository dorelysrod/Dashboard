---
name: adr-generator
description: Generates an Architecture Decision Record from docs/adr/0000-template.md for a significant architectural decision. Use as step 5 of the /new-feature chain, or any time a stack, pattern, or major trade-off decision is made.
allowed-tools: Read, Write, Edit
---

# ADR Generator

## Purpose

Capture significant architectural decisions durably, so they don't have to be re-derived or re-argued later.

## Triggers

- `/new-feature` command, step 5, after `domain-model-designer`/`api-contract-designer`.
- Any agent makes a significant architectural decision (stack choice, pattern choice, major trade-off).

## Inputs

- The decision context, options considered, and the chosen option's rationale.
- `docs/adr/0000-template.md`.

## Outputs

- A new `docs/adr/NNNN-<short-title>.md` following the template.
- A one-line entry in the ADR index (`docs/adr/README.md`).

## Validation Rules

- Numbered sequentially (next available `NNNN`).
- Every section of the template is filled (Status, Context, Decision, Alternatives, Consequences, Security & Architecture review) — no empty sections.
- Status starts as "Proposed" unless `architect` has already approved, then "Accepted".

## Process

1. Read `docs/adr/0000-template.md` and the next available ADR number.
2. Fill Context, Decision, Alternatives (table), Consequences, Security & Architecture review.
3. Write `docs/adr/NNNN-<short-title>.md`.
4. Add a one-line entry in the ADR index (`docs/adr/README.md`) referencing the new ADR.

## Examples

- Decision: "Put AI generation behind an `AIProvider` harness (Manual in phase 1, Anthropic in phase 2) instead of calling the API directly" → `docs/adr/0001-aiprovider-harness.md`, alternatives table comparing direct API calls vs. the harness, consequence: "phase 1 makes zero external API calls; phase 2 activates by flipping `AI_PROVIDER`".

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
