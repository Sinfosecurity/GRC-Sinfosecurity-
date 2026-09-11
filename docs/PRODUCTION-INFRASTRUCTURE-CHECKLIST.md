# Production infrastructure checklist

Honest status for Supreme Third Party. Values are PASS, PARTIAL, BLOCKED, or FAIL.

This sprint does not deploy production and does not merge `main`.

## Object storage

Status: **PASS** on isolated staging MinIO; production bucket still **BLOCKED**

- Staging uses S3-compatible MinIO at `127.0.0.1:9000`, bucket `supreme-risk-staging`.
- Verified upload, SHA-256 checksum, fail-closed download, delete, tenant-prefixed keys, and orphan reconcile (`scanned=1, orphansRemoved=1`).
- Signed download helper exists on `S3StorageProvider.getDownloadUrl`.
- Production S3 bucket, IAM, and retention lifecycle are not configured.

## Email

Status: **PASS** for invitation and password reset on staging SMTP; **PARTIAL** for TPRM event templates

- Staging SMTP is Mailpit (`127.0.0.1:1025`, UI `8025`).
- Invitation and forgot-password produced captured messages (`messages>=4`).
- Assessment assignment, finding, and approval event types exist on `notify()` but those product paths do not yet call `notify()`.
- Secrets were not logged.

## Stripe

Status: **BLOCKED**

- Checkout, Customer Portal, webhook signature, and entitlement routes exist.
- No Stripe test keys or webhook signing secret are present.
- Webhook without configuration returns HTTP 503. UI shows NOT_CONFIGURED.
- Frontend subscription state is not trusted.

## AI provider

Status: **PASS** as explicit `NOT_CONFIGURED` policy

- Staging unsets `OPENAI_API_KEY` / `AI_API_KEY`.
- UI and `/system/status` report `NOT_CONFIGURED`.
- Decision Brief APPROVE did not change residual risk (90 → 49 snapshot unchanged).

## Malware scanning

Status: **PASS** as fail-closed policy

- No scanner is configured. Uploads are `NOT_CONFIGURED`.
- Download of that object returned HTTP 403.
- CLEAN is never invented.
- Unit tests cover CLEAN, PENDING, INFECTED, FAILED, and NOT_CONFIGURED.

## Database

Status: **PASS** for isolated staging; production managed DB still **BLOCKED**

- Staging Postgres is `127.0.0.1:55434`, database `supreme_risk_staging`.
- Baseline → all additive migrations certified. See `docs/STAGING-MIGRATION-CERTIFICATION.md`.
- Backup/restore into `supreme_risk_restore` matched. See `docs/BACKUP-RESTORE-CERTIFICATION.md`.

## Observability

Status: **PASS** for local health truth; hosted alerting **BLOCKED**

- Structured logs and `x-request-id` remain enabled.
- `/health` reports postgres, redis, storage, email, stripe, ai, mongodb.
- Optional Mongo / Stripe / AI are `degraded` + `NOT_CONFIGURED`, not fake `up`.
- Administration → Environment shows the same provider states.
- PagerDuty/CloudWatch are not configured.

## Staging environment

Status: **PASS** for isolated local stack; public hosted URL **BLOCKED**

- UI: `http://127.0.0.1:3200` labeled **SUPREME RISK — STAGING**
- API: `http://127.0.0.1:4100`
- Isolated Postgres, Redis, MinIO, Mailpit. Not `supreme_risk_preview`.
- `VITE_ENVIRONMENT=staging`

## CI

Status: **BLOCKED — EXTERNAL**

GitHub Actions run `34653719470` failed in 5s with no job steps. Account/org billing lock prevents hosted runner startup. Workflow gates were not weakened.

## Rate limits

Status: **PASS** for policy definition.

| Category | Window | Max | Notes |
| --- | --- | --- | --- |
| General API | 15 min | 800 / IP | Enough for a full TPRM session |
| Login / signup | 15 min | 5 failures / IP | Successful logins do not count |
| Password reset | 60 min | 3 / IP | |
| Evidence upload | 60 min | 40 / user | |
| Report downloads | 60 min | 40 / user | Full pack is ~10 files |
| Health | n/a | skipped | |
