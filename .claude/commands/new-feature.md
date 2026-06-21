---
description: Run the full new-feature chain (Epic, Stories, Acceptance Criteria, Architecture, ADR, Tests, Security, Docs) for a new feature/product idea.
argument-hint: <feature or product idea description>
---

The user wants to start work on a new feature/product idea: $ARGUMENTS

Run the "New feature" chain from `CLAUDE.md` §2, step by step. For each step, invoke the named agent/skill with **only** the inputs it needs (the idea description, and outputs from prior steps — not this whole conversation):

1. `product-manager` + `epic-generator` → create the Epic issue.
2. `product-manager` + `user-story-generator` → create User Story issues linked to the Epic.
3. `product-manager` + `acceptance-criteria-generator` → add acceptance criteria to each story.
4. `architect` + `feature-architecture-designer`, `domain-model-designer`, `api-contract-designer` → produce the architecture proposal.
5. `architect` + `adr-generator` → record any significant decisions in `docs/adr/`.
6. `testing` (+ `testing-unit`, `testing-integration`, `testing-e2e`, `edge-case-generator`) → produce the test plan.
7. `security` (+ relevant `security-*` subagents) + `threat-modeling`, `owasp-review` → produce the security review.
8. `documentation` + `architecture-doc-generator`, `readme-generator` → produce the documentation plan/tasks.

Create Tasks (`type:task`) under each User Story for implementation work, to be closed by PRs.

After each step, write a short handoff summary (via `cost-context-compression` if the output is large) so the next step doesn't need the full output — it needs the artifact (issue number, file path, decision), not the conversation. Record any durable decisions in `docs/context/decisions/` via `cost-knowledge-base`.

If at any point the idea is too vague to proceed (e.g. no clear user/goal for the Epic), ask the user a focused clarifying question rather than guessing.
