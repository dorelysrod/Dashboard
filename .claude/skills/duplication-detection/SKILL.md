---
name: duplication-detection
description: Detects duplicated logic or UI components across the codebase and recommends extraction to a shared module only on a genuine 2nd+ occurrence. Use during /pr-review, and by `ux` for UI pattern duplication.
allowed-tools: Read, Grep, Glob, Bash
---

# Duplication Detection

## Purpose

Keep the codebase DRY without over-engineering — extract to a shared module only when duplication is real and recurring.

## Triggers

- `/pr-review` command.
- `ux` flags a repeated UI pattern.

## Inputs

- The PR diff.
- The existing codebase, for similar implementations.

## Outputs

- Duplication findings with file references, plus an extraction recommendation when warranted.

## Validation Rules

- Only recommends extraction on a genuine 2nd (or later) occurrence — shared code is earned, not assumed.
- Distinguishes incidental similarity (two things that happen to look alike now but may diverge) from true duplication (same logic, same reason to change).

## Process

1. Identify new logic/components in the PR diff.
2. Grep the codebase for similar existing implementations.
3. If a 2nd+ occurrence of the same logic/pattern is found, recommend extraction to a shared module (e.g. a `lib/`/`components/` location) with a proposed interface.
4. If only incidental similarity, note it but don't recommend extraction.

## Examples

- "The new drag-and-drop logic here duplicates the one already in the intake uploader almost exactly. Recommend extracting a `useDropzone` hook to a shared module."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
