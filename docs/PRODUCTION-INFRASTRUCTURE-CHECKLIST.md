# Production infrastructure checklist

Honest status for Supreme Third Party. Values are PASS, PARTIAL, BLOCKED, or FAIL.

This sprint does not deploy production and does not merge `main`.

## Object storage

Status: **PARTIAL**

- Local disk provider is used when S3 is not configured and `NODE_ENV` is not production.
- S3-compatible upload, download, delete, and tenant-prefixed keys exist in `S3StorageProvider`.
- Signed/download access is gated by malware scan policy.
- Production S3 bucket, IAM, and retention lifecycle are **not configured in this environment**.
- Tenant isolation of stored objects is covered by backend tests.

## Email

Status: **PARTIAL**

- Invitation and password-reset events call `notify()`.
- Delivery is CONNECTED only when `SENDGRID_API_KEY` or SMTP settings are present.
- Without credentials the API returns `NOT_CONFIGURED` and does not pretend mail was sent.
- Assessment assignment, finding, and approval emails use the same provider gate.

## Stripe

Status: **PARTIAL**

- Checkout, Customer Portal, webhook, and entitlement routes exist.
- Live/staging Stripe keys and webhook signing secret are not present in this workspace.
- UI shows NOT_CONFIGURED instead of fake subscription success.

## AI provider

Status: **PARTIAL**

- `/ai/status` and `/ai/analyze` use a real provider only when `OPENAI_API_KEY` or `AI_API_KEY` is set.
- Unavailable: `NOT_CONFIGURED`. Provider failure: `ERROR`.
- AI output does not write the authoritative residual risk score.

## Malware scanning

Status: **PARTIAL**

- Uploads are stored as `PENDING` only when `MALWARE_SCAN_PROVIDER` or `CLAMAV_HOST` is set.
- Otherwise scan status is `NOT_CONFIGURED`.
- Downloads of non-CLEAN objects are blocked unless an explicit deployment policy allows that state.
- CLEAN is never invented.

## Database

Status: **PARTIAL**

- PostgreSQL is required. Prisma migrations are rehearsed in CI.
- Connection pooling and readiness exist for the Node process.
- Managed backups, restore drills, and production pooling (PgBouncer/RDS) are an external operations concern.

## Observability

Status: **PARTIAL**

- Structured logs via the backend logger.
- Health routes exist (`/health`, readiness, DB).
- Storage/provider health is exposed as status payloads, not fake CONNECTED.
- Hosted alerting (PagerDuty/CloudWatch/etc.) is not configured here.

## Staging environment

Status: **BLOCKED**

- Banner and `VITE_ENVIRONMENT=staging` label: **SUPREME RISK — STAGING**.
- Isolated staging host, database, bucket, Stripe, and email credentials are not deployed in this sprint.
- Production deploy is forbidden by sprint rules.

## CI

Status: **BLOCKED** (external) unless GitHub Actions runners are billed and green.

Required gates in `.github/workflows/ci.yml` (no `continue-on-error`):

- backend install
- frontend install
- Prisma generate
- Prisma validate / secret scan (`ci-security.sh`)
- backend typecheck
- frontend typecheck
- backend tests
- frontend tests
- frontend production build
- migration rehearsal
- tenant isolation tests (in backend Jest)
- security/dependency checks

## Rate limits

Status: **PASS** for policy definition; browser certification is recorded in the sprint report.

| Category | Window | Max | Notes |
| --- | --- | --- | --- |
| General API | 15 min | 800 / IP | Enough for a full TPRM session |
| Login / signup | 15 min | 5 failures / IP | Successful logins do not count |
| Password reset | 60 min | 3 / IP | |
| Evidence upload | 60 min | 40 / user | |
| Report downloads | 60 min | 40 / user | Full pack is ~10 files |
| Health | n/a | skipped | |

`DEV_MODE=true` no longer bypasses the general limiter. Tests skip unless `RATE_LIMIT_ENFORCE=true`.
