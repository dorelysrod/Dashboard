# Security Checklist

Run before `/deploy-check` (production) and `/demo-prep`. Each item maps to a skill/subagent that can verify it.

## Pre-Deploy (Production)

- [ ] `secret-scanner` — no secrets in tracked files
- [ ] `dependency-risk-review` — no unresolved Critical/High CVEs
- [ ] `owasp-review` — no unresolved Blocking findings on changed code
- [ ] `auth-review` — session/token expiry configured for Production
- [ ] `authorization-review` — no known IDOR/privilege-escalation findings open
- [ ] `api-security-review` — rate limiting enabled on sensitive endpoints
- [ ] `supply-chain-review` — GitHub Actions pinned, lockfiles committed
- [ ] Environment variables validated by `devops-infrastructure` (`/config/.env.example` matches the Production environment)

## Pre-Demo

- [ ] No real user data / PII used in the demo environment
- [ ] Demo environment uses a separate database/account from any real users
- [ ] `prompt-injection-review` — any live LLM-facing input in the demo is bounded (no open text field that could embarrass the team if misused)
