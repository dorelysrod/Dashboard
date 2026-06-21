---
name: authorization-review
description: Reviews access-control and permission logic - who can do what to which resource - including IDOR checks. Use during /pr-review when authorization-related files change, or invoked by security-authorization-review.
allowed-tools: Read, Grep, Glob, Write
---

# Authorization Review

## Purpose

Ensure access-control decisions are enforced server-side and resource ownership is checked, preventing IDOR and privilege escalation.

## Triggers

- `/pr-review` when files touching permission/access-control logic change.
- `security-authorization-review` invokes directly.

## Inputs

- The PR diff touching authorization code.

## Outputs

- Findings + required fixes before merge, severity-rated.

## Validation Rules

- Every protected action checks authorization server-side — UI hiding/disabling is not sufficient.
- Endpoints that take a resource ID verify the requesting user owns/can-access that specific resource (no IDOR).
- Role/permission checks fail closed (deny by default) on error or missing data.

## Process

1. Read the PR diff for new/changed endpoints or actions.
2. For each, identify what resource it acts on and what permission is required.
3. Verify the check happens server-side and is scoped to the specific resource (not just "is logged in").
4. Verify failure modes default to deny.

## Examples

- "`GET /receipts/:id` fetches the receipt by ID without checking `receipt.userId === currentUser.id` — any logged-in user can read any receipt by guessing IDs (IDOR). Add an ownership check."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
