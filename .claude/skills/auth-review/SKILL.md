---
name: auth-review
description: Reviews authentication flows - login, session, token issuance/refresh/expiry - for security issues. Use during /pr-review when auth-related files change, or invoked by security-auth-review.
allowed-tools: Read, Grep, Glob, Write
---

# Auth Review

## Purpose

Catch authentication weaknesses (session/token handling, credential storage) before they ship.

## Triggers

- `/pr-review` when files touching login/session/token logic change.
- `security-auth-review` invokes directly.

## Inputs

- The PR diff touching authentication code.

## Outputs

- Findings + required fixes before merge, severity-rated.

## Validation Rules

- Sessions/tokens have an expiry; refresh tokens are rotated or otherwise protected from replay.
- Passwords (if stored at all) are hashed with a strong, salted algorithm — never stored or logged in plaintext.
- No credentials, tokens, or session identifiers appear in logs or error messages.
- Auth failures return generic error messages (no "user not found" vs "wrong password" distinction that aids enumeration).

## Process

1. Read the PR diff for auth-related changes.
2. Check session/token lifecycle: issuance, expiry, refresh, revocation.
3. Check credential storage and logging.
4. Check error message specificity (enumeration risk).
5. Report findings, blocking on High/Critical.

## Examples

- "Login error returns `{error: 'user not found'}` vs `{error: 'wrong password'}` — combine into a single generic `{error: 'invalid credentials'}` to prevent user enumeration."

---
Follow CLAUDE.md: light theme + design tokens (no hardcodes), Spanish domain identifiers, GDPR-friendly, and **phase 1 makes zero external API calls**. Prefer targeted edits over full-file rewrites.
