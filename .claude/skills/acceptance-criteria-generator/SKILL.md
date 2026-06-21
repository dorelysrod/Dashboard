---
name: acceptance-criteria-generator
description: Generates Given/When/Then acceptance criteria for a User Story, covering happy path and edge/failure cases. Use as step 3 of the /new-feature chain, or whenever a story lacks acceptance criteria before moving to "Ready".
allowed-tools: Read, Write, Bash
---

# Acceptance Criteria Generator

## Purpose

Give every User Story concrete, testable acceptance criteria before implementation starts.

## Triggers

- Immediately after `user-story-generator` completes.
- `/new-feature` command, step 3.
- A story is moved toward "Ready" status without acceptance criteria.

## Inputs

- The User Story issue ("As a / I want / So that").
- `edge-case-generator` output (when available) for edge/failure case coverage.

## Outputs

- Acceptance criteria appended to the story issue body or as a comment, in Given/When/Then format.

## Validation Rules

- At least one happy-path criterion.
- At least one edge-case and one failure-case criterion (or an explicit "N/A — reason" note).
- Each criterion is specific enough for `testing-*` subagents to write a test against it directly.

## Process

1. Read the story's "I want / So that".
2. Draft the primary happy-path Given/When/Then.
3. Pull from `edge-case-generator` (or derive directly) for edge/failure criteria.
4. Append to the issue: `gh issue comment <number> --body "..."`.
5. Mark the story Ready (Project Status field) once criteria exist.

## Examples

- Story: "As a user, I want to upload a photo of a receipt..." → AC: "Given a clear photo of a printed receipt, when the user uploads it, then an itemized list with names and prices is shown within 10 seconds." / "Given a blurry or non-receipt image, when uploaded, then the user sees an error explaining the image couldn't be read."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
