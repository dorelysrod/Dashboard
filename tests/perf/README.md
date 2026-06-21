# /tests/perf

Performance budgets and checks, owned by `testing-performance`. Prioritizes `demo-critical` pages/endpoints.

## Coverage structure

- **Budgets** — one entry per `demo-critical` page/endpoint: target load/response time, bundle size
- **Happy path** — measure under normal load
- **Edge cases** — measure with realistic "worst case" data sizes (e.g. largest expected list/image)
- **Regression** — re-run budgets on every PR touching a `demo-critical` path; fail if regression exceeds the threshold (default 20%, see `.claude/agents/testing-performance.md`)

## Format

One file per budget: `<page-or-endpoint>.budget.md` with target metric, last measured value, and date.

Empty until the stack and first `demo-critical` paths are chosen at Hour 0.
