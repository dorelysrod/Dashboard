---
description: Run the bug-report chain (ticket, RCA, security impact, regression test, fix task) for a reported bug.
argument-hint: <bug description and reproduction steps if known>
---

The user is reporting a bug: $ARGUMENTS

Run the "Bug report" chain from `CLAUDE.md` §2:

1. The owning agent (`frontend` or `backend`, based on the affected area) creates a Bug ticket (`type:bug`) with reproduction steps — ask the user for repro steps if not provided and not obvious from the codebase.
2. The same agent performs a Root Cause Analysis (RCA) and records it on the ticket.
3. If the RCA touches auth, data handling, or input validation, `security` performs a Security Impact Analysis on the ticket.
4. `testing` + `edge-case-generator` create a regression test task (`type:task`) covering the bug's scenario.
5. If the fix is structural, `architect` proposes a fix strategy; otherwise the owning agent proposes one. Either way, create a Fix task (`type:task`) linked to the bug.

Keep each agent's context minimal: pass the bug description, repro steps, and relevant file paths — not the whole conversation. Record the RCA and fix strategy on the GitHub issue itself (durable), not just in this conversation.

If the bug can't be reproduced or the report is too vague to act on, ask the user for more detail before creating tickets.
