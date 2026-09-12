# Staging certification

**Branch:** `supreme-risk-transformation`
**Starting SHA:** `ee25ffa04f87c5086ac731ecc4b20c13b3cc6c76`
**Final SHA:** recorded by the certification commit on this branch
**Public staging URL:** none. Isolated local stack only: `http://127.0.0.1:3200`
**Conclusion:** **DEVELOPMENT READY**

This sprint does not merge `main` and does not deploy production. It does not add Privacy, AI Governance, Intelligence, or Governance Graph features. Marketing was not redesigned.

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

UI banner: **SUPREME RISK — STAGING**. `VITE_ENVIRONMENT=staging`. `GET /api/v1/system/status` reports `environment: staging`.

A Cloudflare quick tunnel attached to the preview stack on port 3100 is not staging and is not used as a public staging URL.

## Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | backend `tsc --noEmit`, frontend `tsc --noEmit` |
| Tests | PASS | backend Jest **153**, frontend Vitest **87** |
| Build | PASS | frontend `npm run build` |
| Hosted CI | BLOCKED — EXTERNAL | GitHub run `34674812047`, 4s. Annotation: account locked due to a billing issue. Workflow not weakened. |
| Public hosted staging | BLOCKED | No Supreme Risk staging service exists. Render account has unrelated production apps only. Fly/Railway CLIs are absent. Localhost is not accepted. |
| Staging migration (local) | PASS | `docs/STAGING-MIGRATION-CERTIFICATION.md` |
| Hosted migration | BLOCKED | No hosted staging database |
| Backup / restore (local) | PASS | `docs/BACKUP-RESTORE-CERTIFICATION.md` |
| Hosted backup / restore | BLOCKED | No hosted staging database |
| Storage | PARTIAL | Isolated MinIO is S3-compatible and previously certified. Not a hosted object store. Local filesystem is not used. |
| Email / notifications | PASS | Invite, reset, assessment, finding, CAP, validation, close, approval, and alert messages captured in Mailpit |
| Stripe test mode | BLOCKED | No `sk_test_` or `whsec_` credentials. Live keys are rejected. Required config is documented below. |
| AI | PASS | Policy `NOT_CONFIGURED`. Residual score is not mutated by AI. |
| Malware | PASS | Fail-closed. Scanner `NOT_CONFIGURED`. CLEAN is not invented. |
| Observability | PASS | `/health`, `/health/ready`, `/health/live`, `x-request-id`, `/api/v1/system/status` |
| Hosted alerting | BLOCKED | Real alert received on isolated Mailpit only. No hosted pager/webhook recipient. |
| Public browser E2E | BLOCKED | No public URL. Local isolated E2E remains in `docs/STAGING-E2E-CERTIFICATION.md` |
| Negative tests | PASS | Local isolated API suite. Public negative suite not run. |
| Tenant isolation | PASS | Jest tenant-isolation suites |
| RBAC | PASS | Assessor denied executive PDF. Invite revoke exists. |
| Legal / trust routes | PASS | `/privacy` `/terms` `/security` `/subprocessors` `/status` `/trust` HTTP 200 on isolated UI |
| Performance smoke | PASS | Local isolated timings only. Not a scale certification. |
| Secret scan | PASS | Prior `ci-security.sh` SECRET_SCAN=PASS. No new secrets committed. |

## Stripe configuration required (not present)

Do not fabricate billing success. To move Stripe from BLOCKED to PASS, supply **test mode only**:

- `STRIPE_SECRET_KEY=sk_test_...` — live `sk_live_` / `rk_live_` keys are rejected (`billingStatus() === 'ERROR'`)
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_ENTERPRISE`
- Stripe Customer Portal enabled in the test dashboard
- Webhook endpoint pointing at the hosted API `/api/v1/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

Backend subscription state is authoritative. Entitlement middleware no-ops when billing is `NOT_CONFIGURED` and enforces standing + plan features when Stripe test mode is `CONNECTED`.

## Notification evidence (isolated staging, 2026-09-12)

Mailpit subjects after the workflow:

- Assessment assigned
- Assessment completed
- Finding assigned
- Corrective action requested
- Remediation validated
- Finding closed
- Approval requested
- Decision recorded
- SUPREME RISK — STAGING alert test
- prior invitation / password-reset messages

`POST /api/v1/system/alert-test` returned `{ email: "DELIVERED", inApp: true, webhook: "NOT_CONFIGURED" }`.

`GET /api/v1/notifications` included `assessment.assigned`, `finding.assigned`, `remediation.requested`, `remediation.validation_requested`, `finding.closed`, `approval.requested`, `approval.decision`, `ops.alert`.

Unit tests cover `DELIVERED`, `NOT_CONFIGURED`, and `FAILED` without failing the business record.

## Why this is not STAGING CANDIDATE

STAGING CANDIDATE requires a public hosted staging URL, hosted migrations, hosted backup/restore, hosted object storage, hosted alerting, public browser E2E, and hosted CI. Those remain BLOCKED. Stripe test credentials were not supplied.

Local isolated certification improved (notifications, entitlements, live-key rejection, alert-test path) but does not substitute for hosted gates.

## Known issues / release blockers

1. GitHub Actions billing lock — hosted CI cannot start (`34674812047`).
2. Stripe test keys, prices, and webhook secret are not configured.
3. No hosted (non-localhost) staging URL, database, Redis, or object store.
4. Hosted alerting recipient is not configured. Isolated Mailpit received a real test alert.
5. Organization logo/branding for customer reports is post-launch.
6. Decision Brief PDF text is FlateDecode-compressed; string search is unreliable.
7. No malware scanner host; fail-closed `NOT_CONFIGURED` remains in force.
8. AI remains `NOT_CONFIGURED` by policy.

## Local commands

```bash
docker compose -f docker-compose.staging.yml up -d
bash scripts/staging-certify.sh
# start API 4100 and Vite 3200 with .env.staging
bash scripts/staging-e2e.sh
python3 scripts/staging-negative.py
python3 scripts/staging-provider-verify.py
```
