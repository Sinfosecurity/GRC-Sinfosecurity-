# Production cutover rehearsal (#10)

**Program item:** #10 Production Cutover Rehearsal
**Branch:** `supreme-risk-transformation`
**Starting SHA:** `7945988f4b66c6bcd3f0c672183e72d3036083cf`
**Security baseline SHA:** `227dc3215783df523a3b6dc8973928e66ef43df3`
**Rehearsal date:** 2026-09-13
**Production deployed:** NO
**Production DNS changed:** NO
**Main merged:** NO
**#11 started:** NO
**Production ready:** NO

This document records an isolated/staging rehearsal of a future public launch. It is not a go-live.

#10 **EVIDENCE RESULT: PASS** means the launch procedure is documented, repeatable, and reversible. It does **not** mean Supreme is ready to serve customers.

## Position

| Item | Value |
|---|---|
| CURRENT ITEM | #10 Production Cutover Rehearsal |
| CURRENT STATUS | EVIDENCE RESULT PASS — awaiting Product Leadership acceptance |
| NEXT AUTHORIZED ITEM | #11 Production Release Checklist |
| #11 started | NO |

Prior gates: #1 PASS; #2 PARTIAL / CONDITIONALLY CLEARED; #3–#9 PASS.

## 1. Target architecture

Hosting remains **Render** unless a later ACCEPTED ADR changes it. Staging today is Oregon (`render.staging.yaml`). Production must use **paid** durable services — Render free Postgres/Redis are not acceptable.

```
INTERNET
  |
  +-- Marketing  www.supremerisk.com / apex (planned)
  +-- Customer   app.supremerisk.com          CUSTOMER PLANE
  +-- Admin      admin.supremerisk.com        INTERNAL ADMIN PLANE
  +-- API        api.supremerisk.com          (planned; not activated)
        |
        +-- Render API (NODE_ENV=production, APP_ENVIRONMENT=production)
              |
              +-- Production PostgreSQL (authoritative, private, SSL, paid backups)
              +-- Production Redis (ephemeral rate-limit/cache; private)
              +-- Production object store (private S3-compatible, tenant prefixes)
              +-- Private ClamAV
              +-- Resend/SMTP
              +-- Stripe (live only after commercial catalog is ready)
              +-- GitHub Actions (Supreme CI)
```

Trust boundaries: INTERNET, CUSTOMER PLANE, INTERNAL ADMIN PLANE, TENANT DATA, PLATFORM OPERATIONS, PRIVATE INFRASTRUCTURE, EXTERNAL PROVIDERS. See `docs/SECURITY-ARCHITECTURE.md` and ADR-IDENTITY-ADMIN-SUPPORT.

| Surface | Intended production | Current actual DNS (2026-09-13, read-only `dig`) |
|---|---|---|
| Marketing www / apex | `www.supremerisk.com` + apex redirect | **No A/CNAME/AAAA** |
| Customer app | `https://app.supremerisk.com` | **No records** |
| Admin app | `https://admin.supremerisk.com` | **No records** |
| API | `https://api.supremerisk.com` (planned) | **No records** |
| Status | `/status` on the marketing/customer host (truthful; no invented SLA) | `status.supremerisk.com` **no records** |
| Staging FE | not a production host | CNAME to Render/Cloudflare |
| Staging API | not a production host | CNAME to Render/Cloudflare |

Do not invent missing DNS. Do not change DNS in this rehearsal.

## 2. What will be deployed

- **Immutable SHA** approved at #11 — not “latest.”
- Runtime candidate currently certified: `227dc32` (contains #9 security implementation `309b763`).
- Frontend production build: Vite static SPA (customer + admin routes in one artifact; host/path-aware).
- Backend: `npx prisma migrate deploy` after baseline-on-empty, then `node dist/server.js`.
- **Never** `prisma db push` on production.

## 3. Rehearsal results

### Database (isolated `supreme_risk_cutover10_ci_test` on `127.0.0.1:55434`)

| Check | Result | Timing |
|---|---|---|
| Empty `prisma migrate deploy` alone | **FAIL as expected** — P3018 `type "Role" does not exist` | 903 ms |
| Stop rule | STOP. Do not deploy the API. Diagnose. Do not invent automatic schema rollback. | — |
| Supported path `backend/scripts/ci-migrate-deploy.sh` | **PASS** — baseline SQL + 7 additive migrations + `migrate deploy` | 17.9 s |
| `prisma db push` used for production path | NO | — |
| Constraints / indexes | 113 FKs; 278 public indexes; schema up to date | — |
| Failed-then-recovered row | First failed foundation migration marked `rolled_back`; successful apply recorded | — |

Production empty-DB initialization **must** use the CI migrate script (baseline then `migrate deploy`). Additive migrations are not automatically reversible. Recovery is **restore** or **forward-fix**, not `migrate down`.

### Platform owner bootstrap (isolated DB only)

| Check | Result |
|---|---|
| `PLATFORM_OWNER_BOOTSTRAP_ENABLED` unset/false | Denied: “Bootstrap is disabled” |
| Short token | Denied |
| First owner on empty isolated DB | Created; MFA required before `/platform` |
| Second bootstrap | Denied: “A platform owner already exists” |
| Default password in Git | NONE |
| Real production owner created | NO |

### Object storage / malware

Hosted staging (#9 closure) plus isolated recovery certify (2026-09-13):

| Check | Result |
|---|---|
| Upload + checksum | PASS |
| CLEAN download | PASS (200) |
| Non-CLEAN / PENDING download | PASS (403) |
| Cross-tenant download | PASS (404) |
| Support cannot mark CLEAN | PASS (403) |
| Scanner CONNECTED | PASS (hosted `/health/ready`) |
| Scanner-down policy | Fail-closed; CLEAN never invented |
| Isolated restore objects | 11 objects; checksums matched |

### Identity / planes (hosted staging, production-like config)

| Check | Result |
|---|---|
| Customer `/login`, register, reset, activate | Pages 200 |
| Admin `/admin/login`, `/platform` | Pages 200 |
| Customer token on `/platform` API | 403 |
| Platform token on `/vendors` without support session | 403 |
| MFA enroll-only cannot call `/platform` | 403 |
| Support access pre-approval / write / Org B / revoke | PASS (#9 hosted) |
| Break-glass Org A incident vs Org B | PASS (400) |
| Production-like portal links | Customer → `app.supremerisk.com`; admin → `admin.supremerisk.com`; localhost skipped in production |

### Email

| Check | Result |
|---|---|
| Hosted `POST /api/v1/system/alert-test` | 200; `email=DELIVERED`, `inApp=true`, `webhook=DELIVERED` |
| Sender domain verified | UNKNOWN (operator must confirm Resend domain) |
| `DEMO_INQUIRY_EMAIL` | USER ACTION REQUIRED |
| Support mailbox | USER ACTION REQUIRED |
| Security mailbox | USER ACTION REQUIRED — #9/#10/#11 launch blocker |
| Uncontrolled customer mail sent | NO |

### Stripe

Status remains **PARTIAL / CONDITIONALLY CLEARED**. Test-mode only.

| Check | Result |
|---|---|
| Safe checkout URLs (staging origin) | 200; Stripe test Checkout session created |
| Hostile `https://evil.example/steal` | 400 |
| Live charges | NO |
| Commercial catalog | NOT READY — no production price IDs |
| BUSINESS entitlements | **BLOCKED** — frontend sells Business; backend `plans.ts` has only STARTER / PROFESSIONAL / ENTERPRISE. `normalizePlan('BUSINESS')` becomes STARTER. Do not map BUSINESS to ENTERPRISE. |
| Seat/vendor allowances | Defined in backend, **not enforced** on invite/vendor-create. Public pricing cards do **not** publish those numbers as hard limits. Do not advertise them as contractual hard limits until enforced. |
| `invoice.payment_failed` hosted | Not demonstrated — ACCEPTED FOLLOW-UP / commercial gate |
| Test-clock renewal | Not demonstrated — ACCEPTED FOLLOW-UP |
| Browser Checkout + hCaptcha | Not demonstrated — ACCEPTED FOLLOW-UP |
| Public prices (verified `pricingCatalog.ts`) | Starter $599 / $5,990; Professional $1,499 / $14,990; Business $2,999 / $29,990 (demo CTA only); Enterprise custom from $59,000/year |

### Observability

| Check | Result |
|---|---|
| `/health` | 200 degraded (AI/Mongo not configured — truthful) |
| `/health/live` | 200 always |
| `/health/ready` | 200 when Postgres answers; malware included but does not fail ready |
| `/metrics` | 404 without token |
| `METRICS_TOKEN` | NOT CONFIGURED — leave 404 until a high-entropy token is set |
| Alerting | Hosted alert-test delivered |
| HSTS | Not in frontend `_headers`; expect edge/TLS terminator. PARTIAL |

**Ready gate for traffic:** customer traffic requires `/health/live` 200 and `/health/ready` 200 (Postgres up). Optional AI must not block ready. Configured Redis/storage/malware `down` should block **cutover GO** even if ready is still 200 — operators use `/health` for that.

### Backup / recovery

| Check | Result |
|---|---|
| Isolated certify `RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY` | PASS `BR-6-20260913T015841Z` |
| DB restore | 3 s |
| Object restore | 2 s |
| Reconcile | 3 s |
| Measured RTO on isolated dataset | 8 s |
| Off-site / immutable backup | **BLOCKED** — local `backups/` only |
| Production paid Postgres backups | **BLOCKED** — not created |
| Internal RPO target | ≤ 24 h (not a customer SLA) |
| Internal RTO target | ≤ 4 h once off-site automation exists (not a customer SLA) |

`scripts/staging-certify.sh` remains **UNSAFE** (drops `supreme_risk_staging`). Do not use it.

### Production frontend build (`VITE_ENVIRONMENT=production`)

| Check | Result | Timing |
|---|---|---|
| `vite build` | PASS | 15.3 s |
| `@vite/client` / react-refresh / `src/*.tsx` entry | ABSENT | — |
| Source maps | ABSENT (`sourcemap: false`) | — |
| Secret scan (`sk_`, `whsec_`, `ENCRYPTION_KEY`, `DATABASE_URL`, `JWT_SECRET`, SMTP) | PASS | — |
| Staging banner shown | NO (`environmentLabel()` is null in production). The label string remains in source as a ternary. | — |
| `robots.txt` | `Allow: /` when `VITE_ENVIRONMENT=production` | — |
| Admin noindex | **GAP** — `PageMeta` sets `index,follow` for all production paths. `admin.supremerisk.com` must be noindex/Disallow before public launch. | — |

Build artifacts were **not** committed.

### Smoke

`scripts/cutover-smoke.sh` against hosted staging: **CUTOVER_SMOKE=PASS**.

Hosted functional smoke (synthetic tenants, no production data):

| Surface | Result | Notes |
|---|---|---|
| Customer login page | PASS | 250 ms |
| Admin login page | PASS | 242 ms |
| Vendor / assessment / evidence / finding / Decision Brief / report | PASS | #9 hosted + this rehearsal |
| Support ticket | PASS | #9 |
| Billing checkout (test, safe URL) | PASS | test mode |
| Demo request | PASS | HTTP 202 `dbe2000b-…` |
| Negative smoke | PASS | metrics 404, legacy 404, uploads 404, hostile CORS, customer≠platform, Org A≠Org B, non-CLEAN denied |

### Performance (safe, not a scale cert)

Representative hosted timings (ms): HOME 292, PRICING 237, customer login 250, admin login 242, `/health` 223, `/health/ready` 359. Isolated migrate 18 s. Isolated recovery 8 s. Frontend production build 15 s.

**SCALE CERTIFICATION:** NO

### Application rollback

| Item | Value |
|---|---|
| Current live staging SHA | `227dc32` (`dep-daiv9vojo6nc73bvvrq0`) |
| Previous good staging SHA | `9a195a2` (`dep-daits1ojo6nc73bv27kg`, deactivated) |
| Live staging flipped in this rehearsal | **NO** — would interrupt the #9 certified runtime |
| Procedure | Redeploy the previous immutable SHA on Render; verify `/health/ready`; smoke; then roll forward |
| Expected time | One Render deploy cycle (typically several minutes) |

### Incident tabletops (process only)

**P1 — evidence service unavailable**

1. Declare incident (`/platform/incidents`, severity P1).
2. Assign owner (Platform Owner / Security Admin).
3. Identify storage/malware health from `/health` and `/platform/providers`.
4. Alert via `ALERT_WEBHOOK_URL` / alert-test path (rehearsed DELIVERED).
5. Customer communication: Product Leadership decision; no invented SLA.
6. Recovery: restore objects from backup if bytes lost; fail-closed downloads remain denied until CLEAN.
7. Resolve + post-event review required for break-glass.

**Security — suspected cross-tenant exposure**

1. Declare security incident; freeze related support sessions.
2. Do not use ordinary support access; break-glass only with Org-scoped incident + step-up + different approver.
3. Preserve evidence (audit, object checksums, request IDs). Do not “fix” by marking CLEAN.
4. Contain: disable implicated users; revoke sessions; rotate secrets if leaked.
5. Customer notification is a Legal/Product Leadership decision.
6. Rollback application SHA if a regression shipped; restore DB only if corruption is proven.

No tenants were breached.

## 4. Customer data / demo leads

| Question | Finding |
|---|---|
| Production customers exist? | NO |
| Staging synthetic tenants | Yes — certification only. **Do not migrate to production.** |
| Staging demo leads | Persist in staging DB/JSONL. **Do not automatically copy to production.** Decide CRM vs production at #11. |

Production must start **clean**.

## 5. Legal / trust / claims

| Item | State |
|---|---|
| Privacy / Terms / Subprocessors | Draft — pending legal review |
| Trust / Security | Truthful: not SOC 2, not ISO 27001, no invented SLA |
| Public products | Third Party available; Risk/Compliance Preview; Privacy/AI/Intelligence/Automation Roadmap |
| External pentest | NOT PERFORMED — Product Leadership decides before paid/enterprise |
| Status page | Does not invent uptime |

Draft legal pages **block public production** until Legal approves replacement content. Do not silently remove “Draft.”

## 6. Single points of failure (first launch)

| SPOF | Classification |
|---|---|
| Single API instance | Accepted launch risk if health + rollback documented |
| Single paid Postgres | Accepted if backups + restore proven; free plan is a **blocker** |
| Single ClamAV | Accepted launch risk; fail-closed |
| Single object bucket | Accepted if versioning/backup decided |
| Email provider | Accepted; degrade mail, do not fake send |
| Stripe | Commercial **blocker** until catalog/BUSINESS resolved |
| Single operator account / no mailbox | **Blocker** (security + support contacts) |

## 7. Measured window (rehearsal)

| Step | Measured / expected |
|---|---|
| Freeze SHA + CI | existing hosted CI ~ minutes |
| Isolated migrate (empty → current) | 18 s |
| Isolated backup + restore | 8 s |
| Frontend production build | 15 s |
| Hosted smoke script | 5 s |
| DNS (not executed) | minutes to 48 h depending on TTL |
| Render deploy + health | several minutes (not flipped this rehearsal) |
| Rollback to previous SHA | one deploy cycle |

Maintenance mode: **none**. First launch should use a short write-quiet window during migrate. Do not promise zero downtime.

## 8. Remaining launch blockers (for #11, not #10 failure)

1. Commercial Stripe catalog + BUSINESS entitlements (do not silently remap).
2. Designated security mailbox and support/sales recipients.
3. Paid production Postgres + Redis + private object store + off-site/immutable backups.
4. Production secrets generated in the secret store (not Git).
5. Approved legal Privacy/Terms/Subprocessors (replace Draft).
6. Production DNS/TLS created but **not** switched until GO.
7. Admin-host robots/noindex.
8. Support/legal retention schedule.
9. External pentest decision.
10. `METRICS_TOKEN` decision (404 until configured).
11. Control-plane MFA confirmation (GitHub, Render, Stripe, DNS, Resend) — UNKNOWN here.

## 9. Related documents

- `docs/PRODUCTION-CUTOVER-RUNBOOK.md`
- `docs/PRODUCTION-CONFIGURATION-MATRIX.md`
- `docs/PRODUCTION-GO-NO-GO.md`
- `docs/PRODUCTION-CUTOVER-CHECKLIST.md` (older planning; this rehearsal supersedes execution status)
- `docs/FINAL-SECURITY-REVIEW.md`
- `docs/BACKUP-RESTORE-CERTIFICATION.md`
- `docs/DISASTER-RECOVERY-RUNBOOK.md`
