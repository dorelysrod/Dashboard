# /tests/a11y

Automated accessibility tests (axe-core, contrast, keyboard navigation), generated and owned by `testing-accessibility` — complements the manual/design-time review from `ux-accessibility`.

## Coverage structure

- **Happy path** — automated scan of each page/screen in its default state
- **Edge cases** — scans of dynamic states (modals open, forms with errors, loading states)
- **Failure cases** — N/A (these tests report violations in the app under test, not test failures of the test itself)
- **Regression** — added when an a11y bug is fixed via `/new-bug`

## Quality gate

Zero "serious" or "critical" severity violations on `demo-critical` pages before merge (see `.claude/agents/testing-accessibility.md`).

Empty until the stack is chosen at Hour 0.
