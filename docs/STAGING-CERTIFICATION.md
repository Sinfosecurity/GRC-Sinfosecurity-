# Staging certification

**Branch:** `supreme-risk-transformation`
**Starting SHA:** `e03295f42a8d5c9fc7458b38b6da1701e5b2079f`
**Final SHA:** recorded by the certification commit on this branch
**Staging URL:** `http://127.0.0.1:3200` (isolated local stack). Public hosted URL: BLOCKED.
**Conclusion:** **DEVELOPMENT READY**

This sprint does not merge `main` and does not deploy production. It does not add Privacy, AI Governance, Intelligence, or Governance Graph features.

## Environment

| Component | Location | Isolated from production |
| --- | --- | --- |
| Application UI | `http://127.0.0.1:3200` | yes |
| API | `http://127.0.0.1:4100` | yes |
| PostgreSQL | `127.0.0.1:55434` / `supreme_risk_staging` | yes |
| Redis | `127.0.0.1:6382` | yes |
| MinIO | `127.0.0.1:9000` / bucket `supreme-risk-staging` | yes |
| Mailpit | SMTP `1025`, UI `8025` | yes |
| Preview leftover | `localhost:3100` / `:4000` / `supreme_risk_preview` | unused by staging |

UI banner: **SUPREME RISK — STAGING**. `VITE_ENVIRONMENT=staging`.

## Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | backend `tsc --noEmit`, frontend `tsc --noEmit` |
| Tests | PASS | backend Jest **140**, frontend Vitest **77** |
| Build | PASS | frontend `npm run build` |
| Hosted CI | BLOCKED — EXTERNAL | GitHub run `34653719470`, 5s, no steps. Billing lock. Workflow not weakened. |
| Staging migration | PASS | `docs/STAGING-MIGRATION-CERTIFICATION.md` |
| Backup / restore | PASS | `docs/BACKUP-RESTORE-CERTIFICATION.md` |
| Storage | PASS | MinIO upload, checksum, 403 on NOT_CONFIGURED, delete, orphan reconcile 1/1 |
| Email | PARTIAL | Invite + password reset captured in Mailpit. Assessment/finding/approval events are not wired to `notify()` |
| Stripe test mode | BLOCKED | No test keys. Webhook HTTP 503. UI NOT_CONFIGURED |
| AI | PASS | Policy `NOT_CONFIGURED`. Residual score unchanged after APPROVE |
| Malware | PASS | Fail-closed. Download HTTP 403. CLEAN not invented |
| Observability | PASS | `/health` reflects postgres/redis/storage/email/stripe/ai/mongo truth |
| Staging browser E2E | PASS | Isolated `3200`/`4100`. Core TPRM + all 10 report downloads. See notes |
| Negative tests | PASS | Cross-tenant empty list, assessor 403, 401 expired, 400 malformed, webhook 503, unknown user 401 |
| Tenant isolation | PASS | Jest tenant-isolation suites + staging other-tenant list empty |
| RBAC | PASS | Assessor denied executive PDF. Invite revoke exists. Role change to VIEWER |
| Admin | PASS | Org profile, users, roles, audit log, Environment status. Logo is post-launch |
| Secret scan | PASS | `ci-security.sh` SECRET_SCAN=PASS. No direct critical npm vulns |

## Browser E2E notes

First clean staging run on `http://127.0.0.1:3200`:

- Login showed **SUPREME RISK — STAGING**
- Add vendor, assess, complete 14 questions, residual recalc
- Evidence upload linked StoredObject + VendorDocument + EvidenceLink, scan `NOT_CONFIGURED`
- Finding + CAP + validate + close → `CLOSED`
- Explainable risk visible
- Decision Brief APPROVE, snapshot unchanged
- Decision Brief PDF downloaded (`%PDF-`, vendor in filename/bytes). FlateDecode hides some literal strings
- Executive, scorecard, assessment, findings PDF/CSV/XLSX, monitoring PDF/CSV, board PDF/PPTX all downloaded
- Legacy `/risk-management` quarantined
- Org legal name saved
- Invitation created and revoked
- Environment page shows provider states
- Billing shows NOT_CONFIGURED

A second run was polluted by leftover invitations and an assessor role change to AUDITOR. Assessor was reset to ASSESSOR. Negative API suite then passed again.

## Why this is not STAGING CANDIDATE

STAGING CANDIDATE requires Stripe test mode PASS. Stripe keys are absent, so that gate is BLOCKED. Hosted CI is also BLOCKED — EXTERNAL. There is no public hosted staging URL.

## Known issues / release blockers

1. GitHub Actions billing lock — hosted CI cannot start.
2. Stripe test keys, prices, and webhook secret are not configured.
3. No hosted (non-localhost) staging URL.
4. Assessment / finding / approval emails are not sent yet; only invite and reset were captured.
5. Organization logo/branding for customer reports is post-launch.
6. Decision Brief PDF text is FlateDecode-compressed; string search is unreliable.
7. Hosted alerting is not configured.

## Local commands

```bash
docker compose -f docker-compose.staging.yml up -d
bash scripts/staging-certify.sh
# start API 4100 and Vite 3200 with .env.staging
bash scripts/staging-e2e.sh
python3 scripts/staging-negative.py
python3 scripts/staging-provider-verify.py
```
