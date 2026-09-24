# Public trust content (Phase 0 draft)

**Visibility:** internal until Product Leadership approves publication.  
**Runtime:** existing `/trust` `/security` `/status` remain as already shipped. This file is the Phase 0 source of truth for later copy.  
**Environment:** facts below are for **hosted staging / private-testing**, not commercial production.

Review owner: Product Leadership / Security Admin  
Review by: 2026-12-23

---

## Security overview

Supreme is a multi-tenant governance platform. Organization data is scoped to the authenticated tenant. Cross-tenant access is denied (typically 403 or anti-enumerating 404).

**Access control.** Role-based access control is enforced on the server. Privileged actions require an authorized role. Viewer and vendor planes are isolated from requester IRA and GRC notes.

**MFA.** Privileged MFA architecture exists (TOTP). Production (`APP_ENVIRONMENT=production`) is required to enforce customer privileged MFA. Staging currently uses an audited grace so private-testing QA is not locked out. Staging login without MFA is **not** proof that production MFA is off.

**Sessions.** Browser refresh uses an HttpOnly cookie (`sr_refresh`) on hosted HTTPS. Access tokens are held in memory. This was remediated in the 2026-09-22 security work.

**Audit.** Significant actions write tenant-scoped audit events.

**Transport.** Hosted HTTPS is used on staging. TLS termination is at the host.

**Object storage.** Staging evidence uses S3-compatible MinIO with a persistent disk attached to the live object-store service. Downloads require a CLEAN malware scan. There is no local-filesystem evidence fallback.

**Malware.** Fail-closed: pending, failed, or non-CLEAN evidence is not downloadable. Support cannot mark evidence CLEAN.

**Rate limiting.** Differentiated limits on login, signup, MFA, and API. MFA limiter is fail-closed.

**Security testing.** Identified findings from 2026-09-22 security testing were remediated and two-tenant retested on staging. This is **security testing**, not a certification.

**Backup / DR.** Isolated two-tenant PostgreSQL + object restore was certified (#5 PASS). Not a production RTO/RPO or multi-region HA claim.

**Incident response.** Internal runbooks exist for platform incidents and restore. No contractual customer-notification SLA is published.

## Assurance position

Formal strength labels for this program:

| Strength | Meaning | Supreme today |
| --- | --- | --- |
| IMPLEMENTED CONTROL | Code/config exists | Tenant isolation, RBAC, fail-closed evidence, audit, rate limits |
| TESTED CONTROL | Hosted or certified test evidence | Two-tenant isolation; #5 isolated restore; #12 Evidence |
| PENETRATION TESTED | 2026-09-22 findings remediated and retested | Staging application security only; no named external firm |
| CERTIFIED / ATTESTED | Independent certification | **None.** Not SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI |

Do not upgrade IMPLEMENTED or TESTED into CERTIFIED / ATTESTED.

## Pentest summary (customer-safe)

**Date:** 2026-09-22  
**Environment:** hosted staging only  
**Performer:** not recorded as a named external audit firm. Do not invent one.  
**Scope:** application security on staging frontend and API; two-tenant isolation; public health disclosure; session cookies; webhook sink authentication; OIDC discovery request safety.  
**Not in scope:** production, Stripe provider abuse, Render shared infrastructure, real malware.

**High-level categories remediated (evidence-supported):** unsafe outbound URL fetch on identity discovery; public health information disclosure; generic 500 error leakage; refresh token no longer stored in `localStorage`; unauthenticated webhook-sink writes rejected.

**Limitations:** Staging privileged MFA remains grace. Live Entra/Okta/Google federation was not the subject of that test. Email delivery remained degraded. This summary omits payloads, IPs, secrets, and exploit steps.

**Current status:** Remediation ACCEPTED FOR CURRENT STAGE as part of #12 private-testing certification. Not a commercial certification.

## Privacy / data processing (factual, not a DPA)

Customers use Supreme to record their own governance data (users, third parties, assessments, evidence, findings, decisions, audit). For that tenant data, the customer is the decision-maker; Supreme is the service operator of the hosted application.

Supreme also stores account emails and inquiry-form fields submitted to the product.

Retention is configurable in-product for some privacy objects. Supreme does **not** auto-delete customer data from connected external systems. Deletion tasks are recorded attestations, not proof of external erasure.

No binding DPA is approved in this phase.

## #21 / #22 honesty (public)

SSO/SCIM: **SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED.** Do not imply live Entra, Okta, or Google federation.  
API / webhooks / Slack / Jira / external ratings: **SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED.**

## #23 honesty (public)

Insurance Edition is an optional configuration layer. It is **not** generally available as a certified edition. Hosted completion proof is pending. Supreme does not administer insurance policies, claims, or treaties.

## Production honesty (public)

Supreme Third Party is a **private-testing release candidate**. Commercial production is **not** authorized. Do not describe the product as production-ready or generally available for paid enterprise deployment.

## Service status (public)

Public `/status` is **Not monitored / NOT_CONFIGURED**. It is not a live status page. No uptime percentage is published.

## Security contact

**SECURITY CONTACT NOT CONFIGURED.**  
Do not publish `security@…` until Product Leadership designates a live mailbox.

## Support contact

Program go/no-go records the customer support mailbox as **USER ACTION REQUIRED**. Internal guides mention `support@sinfosecurity.com`; that address is **not confirmed as a monitored public mailbox** for this phase. Public copy: **Not configured**.

## #19 reconciliation (not a public claim)

Punch list line for #19 says PASS (2026-09-14). Program-state changelog for 2026-09-14–15 records authorization and PARTIAL hosted review and repeatedly says Cursor does not declare #19 PASS. **Recommendation C:** Product Leadership must decide. Public trust pages must not claim Intelligence certification.
