---
name: anti-pattern-detection
description: Detects known anti-patterns (god objects/components, prop drilling, leaky abstractions, magic numbers, deeply nested conditionals) in new or changed code, stack-aware. Use during /pr-review.
allowed-tools: Read, Grep, Glob, Bash
---

# Anti-Pattern Detection

## Purpose

Catch structural anti-patterns early, before they compound across a fast-moving codebase.

## Triggers

- `/pr-review` command.

## Inputs

- The PR diff.
- The project stack (Next 15 + React 19 + TS + Tailwind + Supabase, per CLAUDE.md), so checks are stack-appropriate.

## Outputs

- A findings list with file:line references and the anti-pattern name.

## Validation Rules

- Findings must be stack-appropriate — don't flag patterns that are idiomatic for the chosen framework (e.g. don't flag React context usage as "global state anti-pattern" if it's the project's chosen state strategy).
- Each finding includes a concrete suggested fix, not just a label.

## Process

1. The stack is fixed (Next 15 + React 19 + TS + Tailwind + Supabase — see CLAUDE.md).
2. Scan changed files for: god objects/components (very large files/components doing too much), prop drilling (>2 levels), magic numbers/strings without named constants, deeply nested conditionals (>3 levels).
3. Cross-check each candidate against the project conventions in CLAUDE.md before flagging.
4. Report findings with file:line and suggested fix.

## Examples

- "`features/dashboard/Dashboard.tsx:1-420` — single component handles data fetching, state, and 5 distinct UI sections. Suggest splitting into `DashboardData` (fetching/state) + per-section presentational components."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
