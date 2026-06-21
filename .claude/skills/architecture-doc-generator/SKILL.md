---
name: architecture-doc-generator
description: Updates ARCHITECTURE.md and docs/architecture/ to reflect the current system design via targeted edits. Use during step 8 of /new-feature, /pr-review documentation validation, or after architect makes a structural decision.
allowed-tools: Read, Grep, Glob, Edit
---

# Architecture Doc Generator

## Purpose

Keep `ARCHITECTURE.md` and `docs/architecture/` an accurate reflection of the actual system, not a stale snapshot.

## Triggers

- `/new-feature` command, step 8.
- `/pr-review` documentation validation.
- `architect` makes a structural decision (new module/view, new layering rule, ADR accepted).

## Inputs

- The current `ARCHITECTURE.md` and `docs/architecture/`.
- The new/changed feature structure or ADR.

## Outputs

- Updated `ARCHITECTURE.md`/`docs/architecture/*` via targeted `Edit`, not full rewrite.

## Validation Rules

- Every top-level folder mentioned in `ARCHITECTURE.md` exists in the repo, and vice versa.
- No reference to a removed feature/folder remains.
- New ADRs are referenced from `ARCHITECTURE.md` if they change a documented rule.

## Process

1. Read the relevant section of `ARCHITECTURE.md`/`docs/architecture/`.
2. Diff against the actual repo structure (`Glob`) and the new decision/ADR.
3. Apply a targeted `Edit` to the affected section only.
4. If a new ADR changes a layering rule, add a one-line reference to it.

## Examples

- A new panel view (e.g. Análisis) or domain service is added → add one row to the relevant section of `ARCHITECTURE.md`, not a rewrite of the whole file.

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
