# Supreme Identity, Customer Plane, Internal Admin Plane & Support Access Architecture

**ADR ID:** ADR-IDENTITY-ADMIN-SUPPORT  
**Status:** ACCEPTED  
**Date:** 2026-09-12  
**Starting SHA:** `d957054de0ad5d0497251f36afe1a7bc6542d648`  
**Production-ready claim:** NO  
**#8 Final Security Review:** NOT STARTED

## Context

Supreme is approaching commercial launch. The Platform Owner & Support Console already exists at `/platform` with platform RBAC, support tickets, incidents, demo leads, and time-limited support sessions. Privileged MFA, portal separation, customer-approved tenant access, break-glass, and step-up elevation were not implemented. Continuing to redesign authentication, administration, SSO, or support access after #8 would create avoidable security debt.

Enterprise GRC / TPRM / SaaS operators (OneTrust, ServiceNow, Drata, Vanta, LogicGate, AuditBoard, Archer) separate customer workspaces from internal operations, keep one identity system, and treat support access as an explicit, time-limited, audited grant.

## Decision

Supreme adopts one identity plane and two authorization/security planes.

```
                 SUPREME IDENTITY PLANE
         Authentication • MFA • SSO • Sessions
            Authorization • Audit • Identity
                           |
              +------------+------------+
              |                         |
       CUSTOMER PLANE             INTERNAL ADMIN PLANE
              |                         |
  app.supremerisk.com          admin.supremerisk.com
              |                         |
        Tenant RBAC                Platform RBAC
              |                         |
   ORG_ADMIN / ASSESSOR / …    PLATFORM_OWNER / SUPPORT_*
                                        |
                           Controlled Support Access
                                        |
                              Customer Tenant
                              READ_ONLY by default
                              Customer-approved normally
                              Time-limited
                              Fully audited
                              Break-glass by exception
```

1. **One identity plane.** Customer and internal users authenticate through the same password, reset, invitation, session, MFA, disablement, and audit services. There is no second password database or second MFA stack.
2. **Two security planes.** Customer plane (`CUSTOMER`) is tenant governance. Internal admin plane (`PLATFORM`) is Supreme operations. Authorization context is a server-issued session claim, not a browser field.
3. **Domain separation is defense-in-depth.** Production targets are `https://app.supremerisk.com` and `https://admin.supremerisk.com`. DNS is not changed in this sprint. Staging may keep one Render hostname; the app is host- and path-aware (`/login` vs `/admin/login`). Host is never sufficient for authorization.
4. **Tenant RBAC and platform RBAC stay distinct.** Knowing the admin URL never grants `platform.*` permissions.
5. **Server authorization is authoritative.** Frontend route hiding is UX only.
6. **Support access to confidential tenant content requires a SupportAccessSession.** Default `READ_ONLY`, max 60 minutes, customer-approved for ordinary access, break-glass only with incident + step-up + owner/security approval.
7. **No master password, hidden impersonation, or permanent god mode.**

### Dual-context users

A user currently has one `User.role`. Privileges are not silently combined.

- Customer-role login on the customer portal enters `/dashboard`.
- Platform-role login on the admin portal enters `/platform` after MFA.
- A customer role on the admin portal is denied with a generic authentication error.
- A platform role on the customer portal is denied with a generic authentication error.
- Platform staff do not receive automatic customer-tenant content access through their home `organizationId`. Tenant content requires an active support session.

Future dual membership (same person as both a customer admin and a Supreme operator) requires an explicit context switch and is an extension point, not current behavior.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **A. Completely separate customer/admin identity systems** | Duplicates password, reset, invitation, session, and MFA lifecycle. Doubles attack surface and recovery complexity. |
| **B. Permanent Supreme support god mode** | Violates least privilege and customer trust. Invisible standing access cannot be audited as a grant. |
| **C. Customer support via password impersonation** | Destroys attribution. Support actions would appear as customer actions. Tokens/passwords must never be shared or minted untracked. |
| **D. Unrestricted permanent admin elevation** | Privileged operations (owner grant, MFA reset, break-glass, org disable) must be step-up controlled and time-bounded. |
| **E. Purely frontend admin-route protection** | Browser hiding is not authorization. Direct API calls must fail without platform permission and a platform-plane MFA session. |

## Security consequences

- Platform APIs require: authenticated identity + platform role + `plane=PLATFORM` + completed MFA. Enrollment-only tokens cannot call `/api/v1/platform/*`.
- Customer APIs derive tenant from membership. Platform staff cannot use `requireTenant` to read their home org as if they were a customer.
- Public auth errors stay generic (`Invalid credentials`) so emails cannot be classified as platform owner vs customer admin.
- MFA secrets are encrypted at rest. Recovery codes are hashed, single-use. Secrets are returned only during enrollment start, never after confirm.
- Audit records actor identity for every platform login, MFA, elevation, support request/approval/deny/revoke, session start, and break-glass event. Passwords, TOTP secrets, recovery codes, JWTs, and reset/invite tokens are scrubbed.
- CORS is an explicit origin allowlist. No wildcard authenticated CORS.

## Implementation consequences

- Reuse `/platform`, platform roles, tickets, Customer 360, provider health, incidents, demo leads, `SupportAccessSession`, and `AuditEvent`.
- Quarantined in-memory `mfaService` / `auth.enhanced.routes` remain unused. Real TOTP is persisted.
- Same frontend codebase; portal UX differs by host or `/admin/*` path.
- Additive Prisma migration only. `User.role` is not destructively split. Session `plane` is a JWT claim, not a second role column.
- Existing #3–#7 certifications must not regress.

## Migration strategy

1. Write this ADR (accepted).
2. Add additive schema for MFA recovery codes, auth challenges, privilege elevation, and customer/break-glass support fields.
3. Issue plane-aware sessions from the existing `authService`.
4. Require MFA for platform roles before `/platform` or platform APIs.
5. Move ordinary support approval to the customer org admin; keep internal approval for break-glass only.
6. Bootstrap the first Platform Owner via an environment-gated one-time CLI. No default password.
7. Staging remains a single hostname until production DNS is cut over later.

Empty-database hosted CI continues to apply each committed `migration.sql`. No `prisma db push`.

## Future SSO / SCIM strategy

**Not implemented. Not advertised as available.** Public pricing continues to show SSO/SCIM as Coming Soon.

Extension points (no speculative tables in this sprint):

| Concern | Future representation |
|---|---|
| Identity provider | Org-scoped IdP record (SAML 2.0 / OIDC) |
| External subject | Stable IdP subject bound to `User` |
| Authentication method | `password` / `saml` / `oidc` / `passkey` on the session |
| Organization mapping | Verified domain → tenant |
| Group / role mapping | IdP group → tenant or platform role |
| SSO enforcement | Optional per-tenant “SSO required” |
| SCIM | Provision/deprovision against the same `User` row |
| JIT | Create user on first successful IdP assertion |

**Internal target:** Supreme staff authenticate to `admin.supremerisk.com` through the corporate IdP with IdP-enforced MFA. Local privileged passwords become recovery-only. This is target state, not current implementation.

**Customer enterprise target:** each customer configures their own Entra ID / Okta / Google Workspace IdP. Not available yet.

WebAuthn/passkeys and hardware keys are future MFA methods behind the same enroll/verify/reset interface.

## Support access model

Normal platform console access is **metadata only** (org name, plan, billing status, tickets, provider health, scan status, counts). It does not authorize reading confidential tenant content.

Ordinary confidential access:

1. Support requests a session (org, ticket/incident, reason, scope, `READ_ONLY` default or `LIMITED_SUPPORT_WRITE`, 15/30/60 minutes).
2. Customer `ORGANIZATION_ADMIN` (or `ADMIN`) **APPROVE** / **DENY**.
3. Support starts the session. It expires automatically. Customer or platform owner may **REVOKE**.
4. Org B identifiers return 404. `evidence.mark_clean` is always denied.
5. Actions are audited as the Supreme operator, never as the customer.

Denial is terminal. It is never converted into internal approval.

## Break-glass model

Used only when customer authorization is impossible and emergency access is necessary (suspected cross-tenant exposure, critical security incident, material data corruption, platform emergency).

Required: active `PlatformIncident` reference, documented reason, tenant, scope, duration ≤ 15 minutes, recent step-up MFA, approval by `PLATFORM_OWNER` or `SECURITY_ADMIN`. The requester cannot approve themselves. `postEventReviewRequired=true`. Enhanced audit. Future customer notification is possible from these events; investigation details are not published automatically.

## Session model

Reviewed against current defaults (`JWT_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`, HTTP-only `token` cookie, rotatable refresh tokens, DB user reload on each request, disabled users rejected).

| | Customer plane | Platform plane |
|---|---|---|
| Access token | 15 minutes (`JWT_EXPIRES_IN`) | 10 minutes (`PLATFORM_JWT_EXPIRES_IN`, default `10m`) |
| Refresh token | 7 days | 8 hours (`PLATFORM_JWT_REFRESH_EXPIRES_IN`, default `8h`) |
| Idle | No separate idle clock. Access expiry plus refresh is the working session. | Same, with shorter refresh. |
| Absolute | Refresh lifetime | Refresh lifetime (8h) |
| Logout | Revoke presented refresh token; clear cookie | Same |
| Revocation | Refresh rows `revokedAt`; access tokens die at expiry (no server-side access denylist) | Same, plus MFA reset revokes outstanding refresh tokens |
| Disabled user | Authenticate and refresh fail with generic 401 | Same |

Session claims include `plane` (`CUSTOMER` \| `PLATFORM`), `mfa` (boolean), and `enroll` (restricted enrollment). Elevation is stored server-side (`PrivilegeElevation`), not as a durable client claim.

## MFA model

Real TOTP (RFC 6238, SHA-1, 6 digits, 30s, ±1 window) for all platform roles:

`PLATFORM_OWNER`, `PLATFORM_ADMIN`, `SUPERADMIN`, `SECURITY_ADMIN`, `SUPPORT_ADMIN`, `SUPPORT_ANALYST`, `BILLING_SUPPORT`.

Password success without enrollment issues a restricted enrollment token. Password success with enrollment issues an MFA challenge token. Neither is a console session. Recovery uses hashed single-use codes. Administrative MFA reset requires platform owner + step-up and is audited. There is no “disable MFA because I forgot my phone” self-service path.

**MFA is not claimed for customer users in this sprint.** Customer MFA may come later or via their IdP.

In-memory quarantined MFA is not this control.

## Audit model

Existing `AuditEvent` remains the single production audit store. Platform and tenant events share the table; scope differs by `organizationId` and `action` prefix (`auth.*`, `mfa.*`, `platform.*`, `support.*`). Sensitive keys continue to be scrubbed.

## Domain model

| | Production target | This sprint |
|---|---|---|
| Customer | `https://app.supremerisk.com` | Config-ready. Staging stays `https://supreme-risk-staging.onrender.com`. |
| Internal | `https://admin.supremerisk.com` | Config-ready. Same staging host uses `/admin/login`. |
| DNS | — | **Not changed.** |
| Console route | `https://admin.supremerisk.com/platform` | `/platform` behind the admin portal. |

Email links: customer invitation/reset → customer origin; platform invitation/reset → admin origin. Hosted mail never uses localhost.

## Platform Owner bootstrap

First owner is created only by an intentional CLI (`backend` `platform:bootstrap-owner`) when:

- `PLATFORM_OWNER_BOOTSTRAP_ENABLED=true`
- `PLATFORM_OWNER_BOOTSTRAP_TOKEN` matches a high-entropy env token
- zero active platform owners exist

A random password is printed once to stdout and is never committed. Bootstrap refuses to run after an owner exists. No `admin/admin` seed.

## Implementation-gap table (audit of `d957054`)

| ADR requirement | Current state | Keep | Change | Add | Defer |
|---|---|---|---|---|---|
| One identity plane | `authService` + Prisma `User` already shared | Yes | Portal/plane claims on same service | — | Separate IdP |
| Two security planes | Platform RBAC exists; login always customer `/dashboard` | Roles, `/platform` | Login routing, JWT `plane` | Admin login UX | Separate apps |
| Domain separation | Single staging host | Same codebase | CORS/email/host awareness | `ADMIN_FRONTEND_URL` / `CUSTOMER_FRONTEND_URL` | Production DNS |
| Server platform auth | `/api/v1/platform/*` already 403 for tenant roles | Yes | Also require platform plane + MFA | — | — |
| Role-aware routing | Unconditional `/dashboard` | — | Destination by plane | `/admin/login` | Dual-context switcher |
| Privileged MFA | Fields `mfaEnabled` / `mfaSecretEnc` unused; in-memory MFA quarantined | Fields | — | Persisted TOTP, recovery, rate limits | WebAuthn, customer MFA, IdP MFA |
| Session policy | 15m / 7d for everyone | Customer defaults | Shorter platform refresh | Documented policy | Access-token denylist |
| Session context | JWT has role + org only | DB reload | `plane`, `mfa`, `enroll` | Elevation table | Multi-org membership |
| Step-up | None | — | — | 15-minute elevation for owner grant, role change, MFA reset, break-glass | Org disable API if added later |
| Support metadata vs content | Console is metadata; sessions exist | Session model | Approval path | Customer APPROVE/DENY/REVOKE UX | Customer history UI polish |
| Customer approval | Platform owner approves | Request/start/expire/audit | Owner no longer approves ordinary access | Customer Help & Support actions | — |
| Break-glass | Absent | — | — | Incident + step-up + owner/security | Public status page |
| No master password | None today | Keep none | — | — | — |
| Platform role on `User.role` | Works; one role per user | Keep (no destructive split) | — | Document extension | Membership table |
| SSO / SCIM | Coming Soon (truthful) | Marketing copy | — | ADR extension points | SAML/OIDC/SCIM build |
| First owner bootstrap | Manual DB role update | — | — | Gated CLI | — |
| Hosted operator walkthrough | Console PARTIAL | Tests + CI | — | Staging bootstrap + MFA walkthrough | Full PASS if walkthrough impossible |

## MFA for Platform Owner (production)

MFA for privileged internal access is implemented in this architecture lock. #8 Final Security Review is still required before production and is **not** started here.
