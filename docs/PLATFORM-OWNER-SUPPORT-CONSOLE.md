# Platform Owner & Support Console

**Classification:** commercial operations
**Production-ready claim:** NO
**MFA for Platform Owner:** REQUIRED BEFORE / AS PART OF FINAL PRODUCTION SECURITY REVIEW (#8). Supreme does not currently implement MFA and this console does not fake it.

This document describes the Supreme internal operations console. It is not a customer tenant page.

## Architecture

The console lives at `/platform` in the existing authenticated app and `/api/v1/platform/*` on the API.

- Tenant identity for customer APIs is still derived from authenticated membership (`requireTenant`). Browser `organizationId` is rejected.
- Platform APIs authorize with **platform permissions**, not tenant admin roles.
- `ORGANIZATION_ADMIN`, `ADMIN`, `ASSESSOR`, `VIEWER`, and other customer roles receive `403` on every `/api/v1/platform/*` route.
- Platform staff still belong to an organization row (schema requires it). That membership is **not** used to scope other tenants.
- Existing `AuditEvent` records both tenant and platform actions. Platform actions use `platform.*` and `support.*` names.

## Platform roles

Existing `PLATFORM_ADMIN` / `SUPERADMIN` remain and map to the same permission set as `PLATFORM_OWNER`.

| Role | Purpose |
|---|---|
| `PLATFORM_OWNER` / `PLATFORM_ADMIN` / `SUPERADMIN` | Highest internal role. Directory, Customer 360, tickets, incidents, leads, billing metadata, providers, audit, internal role management, support-session approval. |
| `SUPPORT_ADMIN` | Ticket queue, operational org directory, lead assignment, support-session request. Cannot grant platform roles or approve their own access. |
| `SUPPORT_ANALYST` | Assigned tickets, session request, approved diagnostic metadata. No self-approval. |
| `BILLING_SUPPORT` | Subscription metadata only. No evidence contents. |
| `SECURITY_ADMIN` | Incidents, provider health, platform audit, session request/approve. |

Customer tenant roles never receive `platform.*` permissions.

### Approval / role-management rules

- Only a platform owner can assign or change platform staff roles.
- Self role-change and self-disable remain forbidden.
- The last active platform owner cannot be demoted.
- Support staff cannot grant `PLATFORM_OWNER`.

## Support workflow

Customers use **Help & Support** (`/help`) to submit:

- subject, category, description, suggested urgency

Server attaches safe diagnostics only: `organizationId`, `userId`, route, timestamp, request id, user agent, environment. No passwords, JWTs, evidence bodies, or Stripe secrets.

Customer-requested `P1` is recorded as `requestedPriority` and opened as `P2` until Supreme reclassifies it.

Messages are either `CUSTOMER` or `INTERNAL`. Customers never receive internal notes.

Ticket notification failures are logged and do not roll back ticket state.

**Attachments:** deferred for launch. Do not add an insecure second upload path.

**Retention:** support records persist with the tenant database. Legal retention duration requires business/legal approval and is not invented here.

## Incident workflow

`PlatformIncident` is separate from customer GRC `Incident` records.

Statuses: `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`.

`securityIncident=true` raises internal visibility. Customer communication defaults to `INTERNAL_ONLY`. Nothing is published to a public status page automatically.

## Support access model

There is no permanent god mode and no password impersonation.

1. Authorized staff request a session (organization, ticket/incident reference, reason, `READ_ONLY` default or `LIMITED_SUPPORT_WRITE`, 15/30/60 minutes).
2. A **platform owner** approves. Support analysts/admins cannot approve their own access.
3. Session is started, expires automatically, and can be revoked.
4. Active session is tenant-bound. Org B identifiers return `404`.
5. `READ_ONLY` rejects writes. `evidence.mark_clean` is denied at every access level.
6. Every request, approval, start, read, action, expiry, and revoke is audited to the actual Supreme operator.

Future customer transparency (“Supreme support accessed your organization”) can be derived from these audit events. It is not customer-visible in this release.

## Health model

States: `HEALTHY`, `DEGRADED`, `ACTION_REQUIRED`, `INCIDENT`, `UNKNOWN`.

`HEALTHY` is used only when observed positive provider/system signals exist and no incident, P1/P2, billing, or malware action signals are present. An empty signal set is `UNKNOWN`. Shared providers that are `NOT_CONFIGURED` keep health at `UNKNOWN` rather than inventing “all systems healthy.”

## Lead workflow

Public `/api/v1/demo-requests` still writes JSONL for compatibility with existing tests and staging files.

Authoritative operational storage is PostgreSQL `DemoLead` (dual-write). Existing JSONL can be imported when `DEMO_REQUEST_STORE_PATH` is set. Staging JSONL that was never imported is treated as test/ephemeral unless present on the API filesystem.

Internal notes and assignment are platform-only.

## Customer support language

Use “Submit a support request” and “We’ll review your request and follow up.” Do not claim 24/7 coverage or a contractual SLA.

## Security boundaries

- No customer tenant role can call platform APIs.
- No invisible impersonation.
- No cross-tenant support session.
- No marking infected evidence `CLEAN` from the console.
- No password, reset token, or payment-instrument exposure.
- MFA for platform owners is a #8 production security-review requirement.
