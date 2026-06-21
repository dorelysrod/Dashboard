---
description: Run the full PR review chain (architecture, security, code, duplication, test coverage, docs) against a pull request.
argument-hint: [PR number — defaults to the current branch's PR if omitted]
---

Run the "PR opened" review chain from `CLAUDE.md` §2 against PR $ARGUMENTS (if no number is given, find the PR for the current branch via `gh pr view`).

Fetch the PR diff once (`gh pr diff`) and pass only the relevant portion of it to each reviewer below — don't re-fetch per step:

| Review | Owner |
|---|---|
| Architecture review | `architect` |
| Security review | `security` + relevant `security-*` subagents (run `owasp-review`, `secret-scanner`, and any subagent whose area the diff touches — e.g. `security-auth-review` only if auth files changed) |
| Code review | `code-review` skill |
| Duplication detection | `duplication-detection` skill |
| Test coverage review | `testing` |
| Documentation validation | `documentation` |

Consolidate all findings into a single PR comment (via `gh pr comment`), grouped by severity (Blocking / Should Fix / Nice to Have), rather than one comment per reviewer. Note: this also runs automatically via `.github/workflows/claude-pr-review.yml` on PR open — when run manually, mention if findings differ from the automated run already posted.
