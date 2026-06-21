---
name: unit-test-generation
description: Generates unit tests for new or changed functions/components covering happy path, edge cases, and failure cases. Use during step 6 of /new-feature, when /pr-review finds coverage gaps, or invoked by testing-unit.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Unit Test Generation

## Purpose

Ensure every new or changed pure function/component has deterministic unit tests covering happy path, edge cases, and failure cases.

## Triggers

- `/new-feature` command, step 6.
- `/pr-review` finds a coverage gap.
- `testing-unit` invokes directly.

## Inputs

- The new/changed function or component.
- `edge-case-generator` output for that function/component.

## Outputs

- Unit test files following the stack's conventions (e.g. `*.test.ts`, `test_*.py`), placed alongside the code or in `/tests/unit`.

## Validation Rules

- Covers the happy path, at least one edge case, and at least one failure case.
- Tests are deterministic — no reliance on real time/network/randomness without mocking.
- Test names describe behavior, not implementation ("returns empty list when no items match", not "test1").

## Process

1. Read the function/component signature and behavior.
2. Run/request `edge-case-generator` if edge cases aren't already known.
3. Write tests for happy path + edge cases + failure cases, following the stack's existing test conventions (check an existing test file for style).
4. Place the test file per stack convention; run it if possible to confirm it executes (not necessarily passes, if TDD).

## Examples

- Function `categorizeLineItem(item)` → tests: "categorizes a known merchant correctly" (happy), "returns 'uncategorized' for unknown merchant" (edge), "throws on null item" (failure).

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
