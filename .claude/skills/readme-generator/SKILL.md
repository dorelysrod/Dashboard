---
name: readme-generator
description: Updates module-level and root README files to reflect actual contents and usage via targeted edits. Use during /new-feature, when a new module/view is created, or when README drift is detected.
allowed-tools: Read, Grep, Glob, Edit
---

# README Generator

## Purpose

Keep README files (root and per-module) accurate and useful, following the root README's existing structure conventions.

## Triggers

- `/new-feature` command.
- A new module/view is created.
- README drift detected (e.g. during `/pr-review`).

## Inputs

- The module's actual contents.
- The root `README.md`'s structure conventions.

## Outputs

- Updated `README.md` (root or module-level) via targeted `Edit`.

## Validation Rules

- README reflects actual contents/usage — no instructions for commands/scripts that don't exist.
- Module READMEs follow the same section structure as the root README's conventions.
- The root README's structure/document map stays in sync with actual top-level folders.

## Process

1. Read the existing README and the actual folder contents.
2. Identify drift (missing sections, stale references, new files not mentioned).
3. Apply targeted edits to close the gap.

## Examples

- A new panel view module is added → add a row for it to the root README's structure tree if the tree lists views/modules individually; otherwise no root change needed.

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
