---
name: refactor-review
description: Reviews a proposed refactor for risk, scope, and benefit before it's undertaken, weighing it against current project priorities. Use when a tech-debt item proposes a refactor, or before `architect` approves one.
allowed-tools: Read, Grep, Glob, Write
---

# Refactor Review

## Purpose

Prevent refactors that cost more than they save, while still allowing high-value cleanups.

## Triggers

- A tech-debt item proposes a refactor.
- `architect` requests a review before approving a refactor.

## Inputs

- The proposed refactor description and affected files (`Grep`/`Glob` to estimate blast radius).
- The current milestone/priorities (M0–M6).

## Outputs

- A risk/benefit assessment with a recommendation: proceed, defer, or descope.

## Validation Rules

- Blast radius (number of files/modules touched) is stated explicitly.
- Benefit is tied to a concrete outcome (unblocks the current milestone, fixes a recurring bug class, removes a layering violation, etc.) — "cleaner code" alone is not sufficient justification.
- If recommending "proceed", scope is bounded to a stated file list.

## Process

1. Read the refactor proposal and grep for all affected usages.
2. Estimate blast radius and effort.
3. Identify the concrete benefit and whether it unblocks current-milestone work.
4. Recommend proceed (with bounded scope) / defer / descope.

## Examples

- "Refactor: extract shared form validation used in the Cotización and Intake forms. Blast radius: 2 files, ~30 min. Benefit: fixes a validation bug class flagged in `/pr-review`. Recommendation: proceed, scoped to these 2 files only."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
