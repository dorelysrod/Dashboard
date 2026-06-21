---
name: edge-case-generator
description: Enumerates edge and failure cases for a function, component, or API endpoint - boundary values, empty/null inputs, concurrency, network failure, permission denial - categorized for test generation. Use before writing tests, or during step 3/6 of /new-feature.
allowed-tools: Read, Grep, Glob, Write
---

# Edge Case Generator

## Purpose

Give `acceptance-criteria-generator` and the `testing-*` test-generation skills a categorized list of edge/failure cases so coverage isn't left to chance.

## Triggers

- Invoked by `testing-unit`, `testing-integration`, or `testing-e2e` before writing tests.
- `/new-feature` command, steps 3 and 6.

## Inputs

- The function/component/endpoint signature and description.

## Outputs

- A categorized list of edge/failure cases: Boundary, Empty/Null, Error/Failure, Security, Concurrency (only categories relevant to the input).

## Validation Rules

- At least one case per relevant category — not every category applies to every input (e.g. a pure math function has no "Security" category).
- Security-relevant edge cases (auth, permission, injection-shaped input) are flagged for `security` review.

## Process

1. Read the signature/description and identify input types and side effects.
2. For each relevant category, list 1+ concrete cases:
   - Boundary: min/max/zero/negative/very large.
   - Empty/Null: empty string/array, null/undefined, missing field.
   - Error/Failure: network/database failure, timeout, malformed input.
   - Security: unauthorized access, injection-shaped input, oversized payload.
   - Concurrency: simultaneous writes, race on shared resource.
3. Flag any Security-category case to `security` for review.

## Examples

- `uploadReceipt(file)` → Boundary: "0-byte file", "very large file (>10MB)"; Empty/Null: "no file provided"; Error: "upload interrupted mid-transfer"; Security: "file with executable extension renamed to .jpg".

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
