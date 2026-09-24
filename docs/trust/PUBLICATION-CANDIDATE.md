# Publication candidate (docs only — not deployed)

**Phase:** 3  
**Routes in this candidate:** `/trust` `/security` `/status`  
**Routes not in this candidate:** `/privacy` `/terms` `/subprocessors` (LEGAL REVIEW REQUIRED)  
**Rule:** Only READY_FOR_PUBLICATION claims. No runtime files. No page deploy.

Environment labels used: **STAGING / PRIVATE-TESTING**, **PRODUCTION CONFIGURATION**, **LIVE VALIDATION DEFERRED**.

---

## /trust

**Current copy (live `TrustCenter.tsx`, unchanged):**

- Kicker: Trust & Security
- Headline: Built for enterprise governance.
- Lede: Supreme isolates tenants, records decisions, and fails closed when evidence cannot be safely released. This page describes product capabilities. It does not claim SOC 2 certification, ISO certification, an uptime SLA, or a customer count.
- Cards: Tenant isolation; Role-based access; Audit logging; Encryption architecture; Evidence integrity; Immutable decision history; Fail-closed evidence policy.

**Proposed copy (candidate only):**

Kicker: Trust & Security  
Headline: Product capabilities on hosted staging / private-testing.  
Lede: This page describes controls that exist on Supreme’s STAGING / PRIVATE-TESTING environment. It does not claim SOC 2, ISO 27001, FedRAMP, HIPAA, or PCI certification. It is not a production-deployment or commercial-availability statement.

1. Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. (STAGING / PRIVATE-TESTING)
2. Role-based access control is enforced on the server.
3. Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable.
4. Significant actions write tenant-scoped audit events.
5. Hosted STAGING / PRIVATE-TESTING uses HTTPS.
6. On hosted HTTPS, the browser refresh token is stored in an HttpOnly cookie.
7. Isolated restore of the tenant database and evidence objects has been tested. RTO and RPO are not contractually defined.
8. Rate limiting exists on authentication and API routes.
9. Supreme Intelligence interprets recorded Supreme data without inventing external threat events.
10. Entra, Okta, Google, Slack, Jira, and external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED.
11. Security reporting address: not configured.
12. Customer support address: not configured.

**Dropped from current cards (not READY_FOR_PUBLICATION as standalone public claims):** encryption-at-rest architecture, checksum/tenant-prefix evidence wording beyond fail-closed CLEAN, immutable decision-history card.

| Field | Value |
| --- | --- |
| claim IDs | C-01 C-02 C-03 C-04 C-05 C-06 C-07 C-08 C-21 C-11 C-12; honest-not-configured for C-23 / support |
| evidence | #12 two-tenant; #8; #3; #5; #4; #19 PASS; #21/#22 deferred; CONTACT-READINESS |
| environment label | STAGING / PRIVATE-TESTING (C-11/C-12: LIVE VALIDATION DEFERRED) |
| publication class | READY_FOR_PUBLICATION |

---

## /security

**Current copy (live `SecurityOverview.tsx`, unchanged):**

- Headline: Product security as it exists today.
- Lede: This is a security overview of the running Supreme product. The Trust Center lists the same capabilities without implying an external certification.
- Cards: Tenant isolation; Role-based access; Evidence integrity; Decision immutability; Audit trail; What is not claimed (no SOC 2, ISO 27001, uptime SLA, or pentest badge).

**Proposed copy (candidate only):**

Kicker: Security  
Headline: Security overview — STAGING / PRIVATE-TESTING.  
Lede: This is a security overview of the hosted private-testing product. It is not a certification, not a production pentest report, and not a commercial SLA.

1. Tenant isolation: API queries are scoped to the authenticated organization. Cross-tenant reads do not return another tenant’s records. (C-01)
2. Role-based access control is enforced on the server. (C-02)
3. Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable. (C-03)
4. Significant actions write tenant-scoped audit events. (C-04)
5. Hosted STAGING / PRIVATE-TESTING uses HTTPS. Browser refresh uses an HttpOnly cookie on hosted HTTPS. (C-05, C-06)
6. Isolated restore of the tenant database and evidence objects has been tested. RTO and RPO are not contractually defined. (C-07)
7. Rate limiting exists on authentication and API routes. (C-08)
8. Pentest summary (C-09): On 2026-09-22, application security testing was performed against Supreme’s hosted staging frontend and API (private-testing environment). Areas covered included tenant isolation, public health disclosure, session-cookie handling, webhook-sink authentication, and identity-discovery request safety. Identified findings from that exercise were remediated. A two-tenant retest on staging was completed. This is security testing, not a certification, and it is not a production or commercial-assurance report.
9. Entra, Okta, Google, Slack, Jira, and external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. (C-11, C-12)
10. Security reporting address: not configured. Vulnerability disclosure remains a draft until a real channel exists. (C-23)
11. What is not claimed: SOC 2, ISO 27001, FedRAMP, HIPAA, PCI; production MFA proof; production object storage; live Stripe; production DNS; uptime; Insurance Edition PASS.

Do **not** write: Integrated with Entra / Okta / Google / Slack / Jira; SecurityScorecard or BitSight integration available.

| Field | Value |
| --- | --- |
| claim IDs | C-01 C-02 C-03 C-04 C-05 C-06 C-07 C-08 C-09 C-11 C-12; C-13–C-19 C-22 C-23 as explicit non-claims |
| evidence | same as /trust plus `PENTEST-PUBLIC-SUMMARY.md` |
| environment label | STAGING / PRIVATE-TESTING |
| publication class | READY_FOR_PUBLICATION |

---

## /status

**Current copy (live `PublicStatus.tsx`, unchanged):**

- Headline: Public status reporting is not configured.
- Lede: No external status provider is connected. Supreme does not display fabricated uptime, incident history, or an SLA meter on this page.
- Provider state: NOT_CONFIGURED

**Proposed copy (candidate only):**

Kicker: Status  
Headline: STATUS MONITORING NOT CONFIGURED  
Lede: Status monitoring is not configured. This page does not report uptime, incident history, live health, or “all systems operational.”  
State: NOT_CONFIGURED / NOT MONITORED

Forbidden on this candidate: 99.9%, any uptime percentage, all systems operational, incident history, live health indicator.

| Field | Value |
| --- | --- |
| claim IDs | C-18 as honest NOT_CONFIGURED (READY as a **No**) |
| evidence | `PublicStatus.tsx`; claim C-18 NOT_SUPPORTED for live status |
| environment label | not a monitored environment |
| publication class | READY_FOR_PUBLICATION for the not-configured sentence; DO_NOT_PUBLISH for any live-status claim |

---

## Routes that must not change in this candidate

| Route | Action |
| --- | --- |
| `/privacy` | Keep draft. LEGAL REVIEW REQUIRED. |
| `/terms` | Keep draft. LEGAL REVIEW REQUIRED. |
| `/subprocessors` | Keep empty production list. LEGAL REVIEW REQUIRED + PRODUCTION_VALIDATION_REQUIRED. |
