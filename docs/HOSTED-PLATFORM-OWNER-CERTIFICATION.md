# Hosted Platform Owner + Identity certification

**Gates:** #7 Platform Owner & Support Console; #8 Identity / Admin Architecture  
**Environment:** Render staging only  
**Production deployment:** NO  
**Production DNS changed:** NO  
**Main merged:** NO  
**#9 Final Security Review:** NOT STARTED  

This document records hosted operator evidence. It does not contain passwords, TOTP secrets, recovery codes, JWTs, bootstrap tokens, or encryption keys.

## Start state

| Item | Value |
|---|---|
| Branch | `supreme-risk-transformation` |
| Starting SHA | `36a8cf8ab05b25aa5cef9c53615eb4bfe2410545` |
| Prior hosted CI | Run `34723747392` PASS on starting SHA |
| Staging frontend | https://supreme-risk-staging.onrender.com |
| Staging API | https://supreme-risk-staging-api.onrender.com |
| `APP_ENVIRONMENT` | `staging` |
| `NODE_ENV` | `production` (hosted production-like) |
| Identity migration | `20260913010000_identity_admin_support_architecture` applied |
| Production customer data | None observed (synthetic certification tenants only) |

## Staging safety correction

First MFA enrollment against live staging returned `500 ENCRYPTION_KEY is required to protect MFA secrets in production`. Fail-closed encryption worked; the staging API had no `ENCRYPTION_KEY`.

A staging-only high-entropy key was set via a single-variable Render update (not a full env replace). The API was redeployed at `36a8cf8`. Enrollment then succeeded.

Code now refuses to start in `NODE_ENV=production` when `ENCRYPTION_KEY` is missing or a known placeholder.

`ADMIN_FRONTEND_URL` and `CUSTOMER_FRONTEND_URL` were set to the staging origin only. Production hosts were not activated.

## Bootstrap

| Check | Result |
|---|---|
| Method | Existing `node dist/scripts/bootstrapPlatformOwner.js` one-off on staging API |
| Disabled bootstrap | DENIED (`Bootstrap is disabled`) |
| Invalid/short token | DENIED |
| First owner | Created (controlled `cert-owner-*@staging.supremerisk.test`) |
| Second bootstrap | DENIED (`A platform owner already exists`) |
| Default credentials | NONE |
| Secrets committed | NONE |

## Hosted admin login and MFA

`/admin/login` returned HTTP 200. The hosted `AdminLogin` chunk contains Internal admin plane, Supreme operations, STAGING, and `/admin/mfa/enroll`.

Password authentication issued an enrollment token, not a `/platform` session. Enrollment-only tokens received `403` on `/platform/overview`.

| Check | Result |
|---|---|
| TOTP secret generated | PASS |
| Invalid TOTP | DENIED `403` |
| Valid TOTP | PASS; platform session issued |
| Recovery codes | 8 |
| Secret after confirm | NONE |
| Relogin invalid TOTP | DENIED `403` |
| Relogin valid TOTP | PASS |
| Recovery code once | PASS |
| Recovery reuse | DENIED `403` |
| Customer on admin plane | `401 Invalid credentials` (no role leak) |
| Platform owner on customer plane | `401 Invalid credentials` |
| Unknown account | `401 Invalid credentials` |
| Unauthenticated `/platform` API | `401` |

MFA routes still use `mfaLimiter` (5 / 15 minutes / IP, fail-closed, skip successful). Hosted 403s were application denials; RateLimit headers were not visible through the Render edge. No limiter was removed.

## Platform console

Authenticated Platform Owner session received HTTP 200 for Overview, Organizations, Customer 360, Support tickets, Incidents, Demo leads, Provider health, Billing, Audit, Internal users, and Support sessions.

Empty or sparse states were accepted. Billing JSON contained no `sk_live` / `sk_test_` / `whsec_` values. Provider health reported Stripe `CONNECTED` and malware `CONNECTED` with pending/unscanned downloads still denied.

Customer 360 for Org A showed organization, plan, status, user count, vendor count, support history, and billing references. It did not expose password hashes or grant tenant GRC routes. Direct `/vendors` with a platform session returned `403`.

Hosted SPA routes `/platform`, `/platform/organizations`, `/platform/support`, `/platform/incidents`, `/platform/leads`, `/platform/billing`, `/platform/providers`, `/platform/audit`, `/platform/users`, and `/platform/sessions` returned HTTP 200.

## Support access

Two synthetic tenants (Org A, Org B) were created through public signup.

A `SUPPORT_ADMIN` and `SUPPORT_ANALYST` were created by signup plus owner step-up role assignment, then enrolled in MFA.

| Check | Result |
|---|---|
| Request READ_ONLY / 15 minutes / reason / ticket / scope | PASS `PENDING` |
| Pre-approval tenant snapshot | DENIED `403` |
| Customer Help & Support pending view | PASS (Supreme Support copy, reason, ticket, READ_ONLY, 15 minutes) |
| Platform owner silent approve | DENIED `400` ordinary support requires customer authorization |
| Customer APPROVE | `customerDecision=APPROVED` with approver id and timestamp |
| Start | ACTIVE, 15 minutes, no silent extension |
| Allowed READ | PASS Org A snapshot |
| WRITE `user.disable` | DENIED `403` |
| `evidence.mark_clean` | DENIED `403` |
| Org B snapshot | `404` |
| Customer REVOKE | `REVOKED` |
| Access after revoke | DENIED `403` |
| Customer DENY | `DENIED`; start DENIED; owner cannot convert denial |

Automatic expiry uses `expireIfNeeded` against `expiresAt`. A staging one-off backdated `expiresAt` on an otherwise real ACTIVE session (no production clock change). Subsequent tenant snapshot returned `403 Support session is not active`.

## Break-glass

Incident required, reason required, self-approval denied, unauthorized `SUPPORT_ANALYST` denied. A valid request set `breakGlass=true` and `postEventReviewRequired=true`, duration 15 minutes. Org A access after approval/start succeeded; Org B remained `404`. Session was terminated.

An earlier live owner elevation (15-minute window) satisfied step-up on the first break-glass approve. That is policy-correct, not a bypass. After elevations were expired, a sensitive MFA-reset call with the ordinary platform session returned `403 Step-up authentication is required`.

## Privilege and role security

Step-up elevation is 15 minutes. Sensitive role changes and MFA reset require it.

| Check | Result |
|---|---|
| Customer cannot grant platform role | `404` / assignment blocked (tenant scoped) |
| SUPPORT_ANALYST → PLATFORM_OWNER | `403` |
| SUPPORT_ADMIN → PLATFORM_OWNER | `403` |
| Self role-change / self-demotion | `403` |
| Last-owner demotion | Enforced in service; CI regression added |
| SUPPORT_ADMIN billing / internal users | `403` |

A disabled synthetic customer account received `401 Invalid credentials` with no role classification.

## MFA reset

Authorized owner MFA reset cleared the target secret, revoked refresh tokens, and required re-enrollment.

Hosted first pass: the target’s existing access JWT still called `/platform` until expiry. That is a real defect versus “no platform access until re-enrollment.” Authentication now rejects platform sessions when `mfaEnabled` is false (unless enroll-only) and when the token `iat` is before a later enrollment second. Retest on the final SHA is required for hosted confirmation.

## Audit

Platform audit contained login-adjacent platform/support events with actor ids on every row. Secret scan of the audit payload found no passwords, TOTP secrets, recovery codes, JWTs, refresh tokens, or bootstrap tokens.

`mfa.reset` was recorded but omitted from the console query (only `platform.*` / `support.*`). The console now also includes `mfa.*`.

## Portal / domain readiness

| Item | Result |
|---|---|
| Customer target | `https://app.supremerisk.com` (config-ready, DNS not activated) |
| Admin target | `https://admin.supremerisk.com` (config-ready, DNS not activated) |
| Staging origins | `https://supreme-risk-staging.onrender.com` |
| CORS allowlist | Staging origin reflected; `evil.example` received no `Access-Control-Allow-Origin` |
| Authenticated wildcard | NONE |
| Email invite customer | `{staging}/activate?token=…` |
| Email invite platform | `{staging}/admin/activate?token=…` |
| Email reset customer | `{staging}/reset-password?token=…` |
| Email reset platform | `{staging}/admin/reset-password?token=…` |
| Localhost in hosted mail | NONE |

## Regression

| Gate | Result |
|---|---|
| Stripe #3 | PARTIAL / CONDITIONALLY CLEARED — no commercial Stripe change; test-mode connected |
| Malware #4 | PASS — scanner CONNECTED; support cannot mark CLEAN; pending/unscanned downloads remain denied |
| Rate limit #5 | PASS — MFA limiter still attached, fail-closed, unchanged 5/15m |
| Backup / restore #6 | PASS — not reopened |
| Hosted CI baseline | Re-run required on the final SHA after the MFA-reset / audit / ENCRYPTION_KEY fail-fast commit |

## Database / migrations

No `prisma db push`. No destructive migration. No new schema migration. Identity migration `20260913010000_identity_admin_support_architecture` remains the latest additive migration.
