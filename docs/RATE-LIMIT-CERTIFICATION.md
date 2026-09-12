# Rate limit and Request Demo certification

Sprint: consolidated #5 — distributed rate limiting, abuse protection, and Request Demo customer experience.

This document does not contain secrets, limiter hashes, or provider credentials.

## Store

| Environment | Store | Notes |
|---|---|---|
| Hosted staging / production (REDIS_URL set) | Redis fixed window (`rl:{namespace}:{category}:`) | Required for multi-instance Render |
| Local single process / unit tests without Redis | In-memory fixed window | Same keying and 429 body |

`RATE_LIMIT_NAMESPACE` isolates counters (defaults to `test` under Jest, otherwise `default`).

## Proxy / real client IP

`trust proxy` is `1` (Render’s immediate hop only).

Limiter keys use Express `req.ip`, not the leftmost `X-Forwarded-For` value. Spoofed `X-Forwarded-For` cannot select another tenant’s bucket and cannot replace the proxy-assigned client IP on the Render path.

## Redis failure policy

Logged as `rate_limit_store_unavailable`. There is no silent downgrade.

| Category | Policy when Redis is configured but unavailable |
|---|---|
| login, login_ip, signup, password_reset, password_reset_ip, activation, demo, demo_ip, mfa, sso, strict | **Fail closed** — request is treated as over-limit (429) |
| general, report, upload, billing, admin, ai, bulk | **Fail open** — request proceeds; failure is logged and counted |

If `REDIS_URL` is unset, the process uses memory counters and logs the store mode. That is an explicit single-instance configuration, not a hidden fallback from Redis.

## Standardized 429

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

`Retry-After` and draft-7 `RateLimit-*` headers are set. Responses do not include limiter keys, IP hashes, Redis details, or thresholds.

## Inventory

| Category | Routes | Limit | Window | Keying | Store | Failure |
|---|---|---|---|---|---|---|
| general | `/api/*` except exemptions | 800 | 15 min | IP | Redis/memory | fail-open |
| login | `POST /auth/login` | 8 | 15 min | email + IP | Redis/memory | fail-closed |
| login_ip | `POST /auth/login` | 25 | 15 min | IP | Redis/memory | fail-closed |
| signup | `POST /auth/signup`, `/auth/register` | 8 | 15 min | IP | Redis/memory | fail-closed |
| password_reset | `POST /auth/forgot-password`, `/auth/reset-password` | 5 | 60 min | email + IP | Redis/memory | fail-closed |
| password_reset_ip | same | 12 | 60 min | IP | Redis/memory | fail-closed |
| activation | `POST /auth/activate` | 10 | 15 min | IP | Redis/memory | fail-closed |
| demo | `POST /demo-requests` | 8 | 15 min | email + IP | Redis/memory | fail-closed |
| demo_ip | `POST /demo-requests` | 20 | 15 min | IP | Redis/memory | fail-closed |
| report | TPRM report downloads | 40 | 60 min | org + user | Redis/memory | fail-open |
| upload | TPRM evidence upload | 40 | 60 min | org + user | Redis/memory | fail-open |
| billing | `POST /billing/checkout`, `/billing/portal` | 10 | 15 min | org + user | Redis/memory | fail-open |
| admin | invite / resend | 20 | 60 min | org + user | Redis/memory | fail-open |
| ai | `POST /ai/analyze` | 30 | 60 min | org + user | Redis/memory | fail-open |

### Not rate-limited by end-user IP rules

- `POST /api/v1/billing/webhook` — signature, event validation, and idempotency only
- `/health`, `/health/basic`, `/metrics`

Successful logins do not consume the failed-attempt login budget (`skipSuccessfulRequests`). Signup counts successes so automated account creation is bounded. Invitation single-use / expiry / revocation is unchanged; only repeated invalid activation attempts are throttled.

Org A report/upload/billing/admin/AI activity does not consume Org B’s allowance.

## Frontend 429 UX

Interactive login, signup, password reset, activation, Request Demo, QueryState, and report downloads show a customer-safe 429 message. Form values are preserved. There is no automatic retry loop.

Request Demo 429 copy: “Too many requests have been submitted. Please wait a little while and try again.”

## Request Demo — customer vs internal state

| Layer | Persistence succeeded | Email unavailable / failed |
|---|---|---|
| Customer | Success — “Request received” | Success — same copy |
| Internal JSONL / logs | request id, lead, plan, intent, source | `salesNotification` / `prospectAcknowledgement` = `NOT_CONFIGURED` or `FAILED` |

Public responses never include `delivery`, `NOT_CONFIGURED`, `FAILED`, `SENDGRID`, `RESEND`, `SMTP`, or provider names.

Internal sales mail and prospect acknowledgement reuse `deliverEmail()` in `notificationDeliveryService` (SendGrid if configured, otherwise SMTP/Resend). There is no second mail subsystem.

Sales recipient: `DEMO_INQUIRY_EMAIL`, fallback `ALERT_EMAIL_TO`. Not hard-coded.

Immediate duplicate submit (same email + company within 2 minutes) is suppressed server-side; the customer still sees success. The submit button is disabled while in flight and removed after success.

## Hosted staging result

Checked 2026-09-12 against SHA `0ced3cd3762c148998c29f97f3b3020ad191d23d`.

Hosted staging **auto-deployed** this branch:

- Frontend: https://supreme-risk-staging.onrender.com — live
- API: https://supreme-risk-staging-api.onrender.com — live
- API instances: 1
- Redis: healthy
- Malware: CONNECTED (no #4 regression)
- Stripe: test mode connected (no #3 reopening)
- Email provider: DEGRADED (configured; not customer-visible)

| Check | Hosted result |
|---|---|
| Valid login | 200 |
| General API header | `limit=800` |
| Auth abuse (unknown account) | 429 `RATE_LIMITED` + `Retry-After` |
| Spoofed `X-Forwarded-For` after lock | still 429 |
| Demo acceptance | 202, requestId, customer message only |
| Demo public body | no `delivery`, `NOT_CONFIGURED`, `FAILED`, provider names |
| Demo JS | “Request received” / no provider leak |
| Demo form abuse | 429 `RATE_LIMITED` |
| Stripe webhook burst | 400 (signature), never 429 |
| Report/upload 429 | not flooded on hosted; same store/keying certified in automated tests |
| Window recovery | certified with injected clock in automated tests (15-minute hosted wait not used) |

Dual-stack clients may occupy two IP buckets (`email+IP`). Abuse still reached 429 without header bypass. This is not a production-ready declaration.

## Operational signals

Prometheus counters (no console in this sprint):

- `supreme_rate_limit_throttles_total{category}`
- `supreme_rate_limit_store_failures_total{category,policy}`

Throttle logs include event type, request id, category, organization when authenticated, masked identity, timestamp, and result. They do not include passwords, tokens, Authorization headers, Stripe secrets, email bodies, or evidence contents.
