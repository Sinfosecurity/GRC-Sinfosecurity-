# Supreme security architecture

**Classification:** internal architecture baseline for #9
**Production-ready claim:** NO
**SOC 2 / ISO certified:** NO

This document describes the **implemented** security architecture on `supreme-risk-transformation`, not a future product.

## Surfaces

| Surface | What it is | Host / path |
|---|---|---|
| Public marketing frontend | Pricing, demo, trust, legal drafts | Staging `https://supreme-risk-staging.onrender.com` (`/`, `/pricing`, `/trust`, …) |
| Customer application plane | Tenant TPRM | Target `https://app.supremerisk.com` (DNS not activated). Staging shares the Render host at `/login`, `/dashboard` |
| Internal admin plane | Platform Owner / support console | Target `https://admin.supremerisk.com` (DNS not activated). Staging `/admin/login`, `/platform` |
| Supreme Identity Plane | Password, reset, invite, MFA, sessions, audit | Same API, `plane` JWT claim |
| Backend API | Express `/api/v1` | Staging `https://supreme-risk-staging-api.onrender.com` |
| PostgreSQL | Authoritative tenant + identity data | Render staging Postgres; production not deployed |
| Redis | Rate-limit counters only | Hosted when `REDIS_URL` set |
| Object storage / MinIO / S3 | Evidence bytes | Staging S3; local disk only if explicitly allowed |
| ClamAV | Malware scan provider | Staging CONNECTED; fail-closed downloads |
| Stripe | Checkout / portal / webhooks | Test-mode on staging; #2 PARTIAL |
| Resend / SMTP | Transactional mail | Provider status truthful |
| GitHub Actions | Supreme CI / `quality` | GitHub-hosted runners |
| Render | Staging frontend + API | Not production |
| Backups / recovery | Isolated restore certification | #5 PASS; not a production SLA |
| Audit system | Tenant `AuditEvent` + platform audit | Immutable via API (no customer delete) |
| Support-access sessions | Customer-approved, time-limited | Default READ_ONLY |
| Break-glass | Incident-bound exception path | Step-up + second-party approval |
| Platform Owner Console | `/platform` operations | MFA + platform plane required |

## Trust boundaries

```
                         INTERNET
                             |
          +------------------+------------------+
          |                                     |
   CUSTOMER PLANE                      INTERNAL ADMIN PLANE
   app.supremerisk.com                 admin.supremerisk.com
          |                                     |
          +------------------+------------------+
                             |
                    SUPREME IDENTITY PLANE
                    (auth / MFA / session / audit)
                             |
                    BACKEND API AUTHORIZATION
                             |
              +--------------+--------------+
              |                             |
        TENANT DATA                 PLATFORM OPERATIONS
        (org-scoped Prisma)         (support, incidents, billing visibility)
              |                             |
              +--------------+--------------+
                             |
                  PRIVATE INFRASTRUCTURE
                  PostgreSQL · Redis · object storage · ClamAV
                             |
                  EXTERNAL PROVIDERS
                  Stripe · Resend/SMTP · GitHub · Render
```

Host is never sufficient for authorization. Frontend routing is UX only.

## Data classification (operational, not legal)

| Data | Class |
|---|---|
| Public marketing copy, pricing catalog | PUBLIC |
| Environment labels, provider CONNECTED/NOT_CONFIGURED | INTERNAL |
| Business email, user names, demo/sales leads | CONFIDENTIAL |
| Vendors, assessments, findings, CAPs, scores, decisions, tickets, incidents | CONFIDENTIAL |
| Billing customer/subscription identifiers | CONFIDENTIAL |
| Audit logs, support session metadata | CONFIDENTIAL |
| Password hashes, MFA secrets, recovery codes, session tokens | HIGHLY SENSITIVE |
| Evidence documents, SOC reports, ISO certificates, contracts | HIGHLY SENSITIVE |
| Assessment responses containing customer control evidence | HIGHLY SENSITIVE |

Do not invent statutory classifications (e.g. CUI, NHS, GDPR special category) without a legal review.

## Authentication model

Browser clients send `Authorization: Bearer` and may also receive an httpOnly `SameSite=strict` access cookie. Refresh tokens are opaque, hashed, rotated. Classic CSRF is reduced by SameSite + bearer preference. XSS remains the residual session-theft path.

## Known production infrastructure gaps (honest)

- Production DNS not activated
- Production database, off-site scheduled backups, immutability, and retention not certified
- Customer MFA not implemented (platform MFA is)
- SSO / SCIM not implemented
- No access-token denylist (short TTL + DB checks)
- `METRICS_TOKEN` required to scrape Prometheus metrics
- Legal retention schedule not approved
