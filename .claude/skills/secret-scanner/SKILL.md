---
name: secret-scanner
description: Scans diffs and commit history for leaked credentials (API keys, tokens, private keys, connection strings) and blocks merge if found. Use during /pr-review, the security.yml CI workflow, or invoked by security-secrets-detection.
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Secret Scanner

## Purpose

Catch leaked credentials before they're merged or pushed to a remote.

## Triggers

- `/pr-review` command.
- `.github/workflows/security.yml` on every PR.
- `security-secrets-detection` invokes directly.

## Inputs

- The PR diff and, where feasible, recent commit history.

## Outputs

- Findings (file:line, pattern matched, secret type guess); blocks merge if any found.

## Validation Rules

- Zero secrets present in tracked files — no API keys, private keys, tokens, passwords, or connection strings.
- All `.env*` files except `.env.example` are gitignored and never committed.
- A finding blocks merge until the secret is removed/rotated and history is cleaned if needed (escalate to user for history rewrites).

## Process

1. Grep the diff for common secret patterns (AWS keys, generic API key/token shapes, private key headers, connection strings with embedded credentials) and high-entropy strings.
2. Check `.gitignore` covers `.env*` (except `.env.example`).
3. Report any findings with file:line; block merge.
4. If a secret was already committed (not just in this diff), escalate — removal requires history rewrite, which needs user confirmation.

## Examples

- "`config/db.ts:4` contains `postgres://user:p4ssw0rd@host/db` — move to an environment variable referenced via `.env`, document in `.env.example`, and rotate the credential since it was committed."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
