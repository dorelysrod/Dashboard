# /tests/security

Automated security tests — e.g. authorization tests asserting one user cannot access another's resources (IDOR checks), input-validation fuzz tests for API endpoints. Complements (doesn't replace) the review-based security skills run during `/pr-review`.

## Coverage structure

- **Happy path** — authorized access succeeds
- **Edge cases** — boundary/malformed input is rejected, not silently accepted
- **Failure cases** — unauthorized access is denied (401/403), not 500 or silent success
- **Regression** — added when a `type:security-finding` is fixed, to prevent recurrence

## Conventions

- Name tests after the threat they guard against, e.g. `idor-receipt-access.test.ts`.
- A failing test here is always a Blocking finding in `/pr-review`.

Empty until the stack and first protected resources are chosen at Hour 0.
