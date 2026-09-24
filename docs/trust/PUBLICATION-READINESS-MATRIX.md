# Publication readiness matrix

**Phase:** 2  
**Runtime:** do **not** deploy public trust pages  
**lastReviewed:** 2026-09-23  
**reviewBy:** 2026-12-23  
**Owner:** Product Leadership  
**Approver:** Product Leadership  

Publish classes (do not collapse):

| Class | May appear on a public route? |
| --- | --- |
| READY_FOR_PUBLICATION | Yes, after Product Leadership authorizes a later page update |
| LEGAL_REVIEW_REQUIRED | No |
| CONTACT_CONFIGURATION_REQUIRED | No |
| PRODUCTION_VALIDATION_REQUIRED | No |
| DO_NOT_PUBLISH | No |

Review state for recorded statuses: APPROVED (2026-09-23). None are expired. `reviewBy` = 2026-12-23. If that date passes without human re-approval, the statement is automatically **ineligible for publication** (REVIEW REQUIRED). No auto-renew. No code.

## Route posture

| Route | Current live honesty | Phase 2 publication decision |
| --- | --- | --- |
| `/trust` | Draft capabilities; no certifications | May later receive READY_FOR_PUBLICATION sentences only |
| `/security` | Product security as it exists | Same + pentest public summary |
| `/status` | NOT_CONFIGURED | Keep NOT_CONFIGURED. No uptime, incident history, live health, or “all systems operational” |
| `/privacy` | Draft | LEGAL_REVIEW_REQUIRED |
| `/terms` | Draft | LEGAL_REVIEW_REQUIRED |
| `/subprocessors` | Empty production list | LEGAL_REVIEW_REQUIRED + PRODUCTION_VALIDATION_REQUIRED for a production list |

---

## READY_FOR_PUBLICATION

Every row is SUPPORTED, APPROVED, not expired, not legally binding, not production-dependent, not contact-dependent. Environment is STAGING / PRIVATE-TESTING unless noted.

### P-01 — Tenant isolation

| Field | Value |
| --- | --- |
| claimId | C-01 |
| route | `/trust`, `/security` |
| proposed wording | In the STAGING / PRIVATE-TESTING environment, tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | none |
| owner | Security |
| approver | Product Leadership |
| evidence source | #12 two-tenant hosted proof; 2026-09-22 rem |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-02 — Server-side RBAC

| Field | Value |
| --- | --- |
| claimId | C-02 |
| route | `/trust`, `/security` |
| proposed wording | Role-based access control is enforced on the server. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | none |
| owner | Security |
| approver | Product Leadership |
| evidence source | #8 PASS |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-03 — Fail-closed malware evidence

| Field | Value |
| --- | --- |
| claimId | C-03 |
| route | `/trust`, `/security` |
| proposed wording | Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable (fail-closed). Proven on STAGING / PRIVATE-TESTING. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | none for this staging wording |
| owner | Security |
| approver | Product Leadership |
| evidence source | #3 PASS; #12 Evidence |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-04 — Tenant-scoped audit

| Field | Value |
| --- | --- |
| claimId | C-04 |
| route | `/trust`, `/security` |
| proposed wording | Significant actions write tenant-scoped audit events. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | none |
| owner | Security |
| approver | Product Leadership |
| evidence source | #8 / #12 |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-05 — HTTPS on hosted staging

| Field | Value |
| --- | --- |
| claimId | C-05 |
| route | `/trust`, `/security` |
| proposed wording | Hosted STAGING / PRIVATE-TESTING uses HTTPS. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | wording must say staging |
| owner | Security |
| approver | Product Leadership |
| evidence source | staging hosts |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-06 — HttpOnly refresh cookie

| Field | Value |
| --- | --- |
| claimId | C-06 |
| route | `/trust`, `/security` |
| proposed wording | On hosted HTTPS, the browser refresh token is stored in an HttpOnly cookie. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | none |
| owner | Security |
| approver | Product Leadership |
| evidence source | 2026-09-22 PENTEST-M3 rem |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-07 — Tested backup/restore

| Field | Value |
| --- | --- |
| claimId | C-07 |
| route | `/trust`, `/security` |
| proposed wording | Isolated restore of the tenant database and evidence objects has been tested in STAGING / PRIVATE-TESTING. RTO and RPO are not contractually defined. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | must not imply a production SLA |
| owner | Operations |
| approver | Product Leadership |
| evidence source | #5 PASS |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-08 — Rate limiting

| Field | Value |
| --- | --- |
| claimId | C-08 |
| route | `/trust`, `/security` |
| proposed wording | Rate limiting exists on authentication and API routes. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | do not publish exact limit numbers unless later approved |
| owner | Security |
| approver | Product Leadership |
| evidence source | #4 PASS |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-09 — Customer-safe pentest summary

| Field | Value |
| --- | --- |
| claimId | C-09 |
| route | `/trust`, `/security` |
| proposed wording | See `PENTEST-PUBLIC-SUMMARY.md` (STAGING / PRIVATE-TESTING; not a certification). |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | use finalized wording only |
| owner | Security |
| approver | Product Leadership |
| evidence source | pentest rem docs; `PENTEST-PUBLIC-SUMMARY.md` |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-10 — Supreme Intelligence module (not a certification)

| Field | Value |
| --- | --- |
| claimId | C-21 |
| route | `/trust` |
| proposed wording | Supreme Intelligence is an accepted product module that interprets recorded Supreme data without inventing external threat events. It is not certified AI intelligence, not an external threat feed, and not a live cyber intelligence network. |
| claim status | SUPPORTED |
| review state | APPROVED |
| publish class | READY_FOR_PUBLICATION |
| dependency | exact framing above |
| owner | Program |
| approver | Product Leadership |
| evidence source | #19 PASS 2026-09-14; `9ee8529`; CI `34914149569` |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

### P-11 / P-12 — Deferred architecture (allowed sentence only)

| Field | Value |
| --- | --- |
| claimId | C-11, C-12 |
| route | `/trust`, `/security` |
| proposed wording | Entra, Okta, Google, Slack, Jira, and external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. |
| claim status | DEFERRED |
| review state | APPROVED for this deferred status |
| publish class | READY_FOR_PUBLICATION **only** as that sentence. Live-integration marketing is DO_NOT_PUBLISH. |
| dependency | exact deferred wording |
| owner | Identity / Integrations |
| approver | Product Leadership |
| evidence source | #21 / #22 |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |

`/status` `/privacy` `/terms` `/subprocessors` for P-01–P-12: **DO_NOT_PUBLISH** (wrong surface).

---

## LEGAL_REVIEW_REQUIRED

| claimId | route | proposed wording | claim status | review state | publish class | dependency | owner | approver | evidence source | lastReviewed | reviewBy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L-PRIV | `/privacy` | Binding Privacy Notice | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | counsel approval | Privacy | Legal | LegalDraft.tsx | 2026-09-23 | 2026-12-23 |
| L-TOS | `/terms` | Binding Terms of Service | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | counsel approval | Product | Legal | LegalDraft.tsx | 2026-09-23 | 2026-12-23 |
| L-DPA | none | Binding DPA | LEGAL_REVIEW_REQUIRED | MISSING | LEGAL_REVIEW_REQUIRED | counsel-approved DPA | Privacy | Legal | LEGAL-DOCUMENT-STATUS.md | 2026-09-23 | 2026-12-23 |
| L-SUB | `/subprocessors` | Customer Subprocessor Notice | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | counsel + production list | Legal | Legal | SUBPROCESSOR-REGISTER.md | 2026-09-23 | 2026-12-23 |
| L-SECADD | none | Security Addendum | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | counsel; SUPPORTED claims only | Security | Legal | this pack | 2026-09-23 | 2026-12-23 |
| L-AUP | none | Acceptable Use Policy | LEGAL_REVIEW_REQUIRED | MISSING | LEGAL_REVIEW_REQUIRED | counsel-drafted AUP | Product | Legal | none | 2026-09-23 | 2026-12-23 |
| L-COOKIE | none | Cookie Notice | LEGAL_REVIEW_REQUIRED | MISSING | LEGAL_REVIEW_REQUIRED | counsel if cookies in scope | Privacy | Legal | none | 2026-09-23 | 2026-12-23 |
| L-VDP | `/security` | Vulnerability Disclosure Policy as approved policy | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | real channel + counsel | Security | Legal | VULNERABILITY-DISCLOSURE-POLICY.md | 2026-09-23 | 2026-12-23 |
| L-IR-SLA | `/security` | Binding incident-notification hours | NOT_SUPPORTED | APPROVED as not supported | LEGAL_REVIEW_REQUIRED (and DO_NOT_PUBLISH until a real SLA exists) | legal + operational SLA | Operations | Legal | DR runbook | 2026-09-23 | 2026-12-23 |
| C-20 | `/privacy` `/terms` | Data-processing legal conclusions / approved DPA | LEGAL_REVIEW_REQUIRED | DRAFT | LEGAL_REVIEW_REQUIRED | counsel | Legal | Legal | LegalDraft.tsx | 2026-09-23 | 2026-12-23 |

Nothing in this section becomes APPROVED without actual legal review.

---

## CONTACT_CONFIGURATION_REQUIRED

| claimId | route | proposed wording | claim status | review state | publish class | dependency | owner | approver | evidence source | lastReviewed | reviewBy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-23 | `/trust` `/security` | Public security report address | NOT_SUPPORTED | APPROVED as not configured | CONTACT_CONFIGURATION_REQUIRED | working mailbox or ticket intake; named owner; monitoring; response process | Security | Product Leadership | SECURITY-CONTACT-DECISION.md | 2026-09-23 | 2026-12-23 |
| K-VDP-CH | `/security` | Vulnerability submission channel | NOT_SUPPORTED | DRAFT | CONTACT_CONFIGURATION_REQUIRED | same as C-23 + legal VDP | Security | Product Leadership | CONTACT-READINESS.md | 2026-09-23 | 2026-12-23 |
| K-SUP-EM | `/trust` `/security` | Support email | NOT_SUPPORTED | APPROVED as not configured | CONTACT_CONFIGURATION_REQUIRED | confirmed monitored destination; do not assume support@sinfosecurity.com | Operations | Product Leadership | SUPPORT-CONTACT-DECISION.md | 2026-09-23 | 2026-12-23 |
| K-SUP-IN | `/trust` | Customer support intake | NOT_SUPPORTED | APPROVED as not configured | CONTACT_CONFIGURATION_REQUIRED | working form or mailbox | Operations | Product Leadership | SUPPORT-CONTACT-DECISION.md | 2026-09-23 | 2026-12-23 |

Honest “not configured” sentences are READY_FOR_PUBLICATION. Addresses and channels are CONTACT_CONFIGURATION_REQUIRED.

---

## PRODUCTION_VALIDATION_REQUIRED

| claimId | route | proposed wording | claim status | review state | publish class | dependency | owner | approver | evidence source | lastReviewed | reviewBy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-10 | `/trust` `/security` | Privileged MFA is enforced for all hosted users now | PARTIAL | APPROVED as partial | PRODUCTION_VALIDATION_REQUIRED | production host with MFA enforced (not staging grace) | Security | Product Leadership | staging grace; production policy | 2026-09-23 | 2026-12-23 |
| K-PROD-STORE | `/security` | Production object storage is validated | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | production object-store proof | Operations | Product Leadership | #12 persistence is staging MinIO | 2026-09-23 | 2026-12-23 |
| K-PROD-HOST | `/trust` | Production hosting is live | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | production deploy + DNS | Program | Product Leadership | #11 NO-GO | 2026-09-23 | 2026-12-23 |
| K-PROD-BAK | `/security` | Production backup program | PARTIAL | APPROVED as isolated-test only | PRODUCTION_VALIDATION_REQUIRED | production backup evidence | Operations | Product Leadership | #5 is isolated restore, not prod SLA | 2026-09-23 | 2026-12-23 |
| K-PROD-MON | `/status` | Production monitoring / live health | NOT_SUPPORTED | APPROVED as not configured | PRODUCTION_VALIDATION_REQUIRED | real health source | Operations | Product Leadership | PublicStatus.tsx | 2026-09-23 | 2026-12-23 |
| K-STRIPE | `/trust` | Live Stripe / paid billing | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | live billing authorization | Program | Product Leadership | #2 test-mode | 2026-09-23 | 2026-12-23 |
| K-DNS | `/trust` | Production DNS is live | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | production DNS change | Program | Product Leadership | program state | 2026-09-23 | 2026-12-23 |
| K-PROD-SUB | `/subprocessors` | Production subprocessors list | LEGAL_REVIEW_REQUIRED | DRAFT | PRODUCTION_VALIDATION_REQUIRED | finalized production architecture + legal | Legal | Legal | SUBPROCESSOR-PUBLICATION-READINESS.md | 2026-09-23 | 2026-12-23 |
| C-19 | `/security` | Production RTO/RPO | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | contractual RTO/RPO | Operations | Product Leadership | #5 | 2026-09-23 | 2026-12-23 |
| C-18 | `/status` | Production status / uptime % | NOT_SUPPORTED | APPROVED as not supported | PRODUCTION_VALIDATION_REQUIRED | live status page | Operations | Product Leadership | PublicStatus.tsx | 2026-09-23 | 2026-12-23 |

C-10 may be described internally as: PRODUCTION CONFIGURATION requires privileged MFA; STAGING / PRIVATE-TESTING uses an audited grace. That internal sentence is not READY_FOR_PUBLICATION as “MFA enforced today.”

---

## DO_NOT_PUBLISH

| claimId | route | proposed wording | claim status | review state | publish class | dependency | owner | approver | evidence source | lastReviewed | reviewBy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-13 | all | SOC 2 certified / compliant | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | none — false | Trust | Product Leadership | none | 2026-09-23 | 2026-12-23 |
| C-14 | all | ISO 27001 certified | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | none — false | Trust | Product Leadership | none | 2026-09-23 | 2026-12-23 |
| C-15 | all | FedRAMP / HIPAA / PCI certified | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | none — false | Trust | Product Leadership | none | 2026-09-23 | 2026-12-23 |
| C-16 | all | Commercially production-ready / GA | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | commercial GO | Program | Product Leadership | #11 NO-GO | 2026-09-23 | 2026-12-23 |
| C-17 | all | Insurance Edition GA / PASS | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | #23 PASS | Program | Product Leadership | #23 ACTIVE / NOT PASS | 2026-09-23 | 2026-12-23 |
| C-18 | `/status` | Uptime % / all systems operational / incident history / live-service health | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | real monitoring | Operations | Product Leadership | PublicStatus.tsx | 2026-09-23 | 2026-12-23 |
| C-22 | all | Named external pentest firm | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | none — no firm | Security | Product Leadership | none | 2026-09-23 | 2026-12-23 |
| K-19-BAD | `/trust` | Certified AI intelligence / external threat feed / live cyber intelligence network | NOT_SUPPORTED | APPROVED | DO_NOT_PUBLISH | none — false framing | Program | Product Leadership | #19 PASS is a product module | 2026-09-23 | 2026-12-23 |

---

## Claim expiry control

Process only. No code. No auto-renew.

1. Every public statement has `reviewBy`.
2. If today > `reviewBy` and no human re-approval exists, review state becomes REVIEW REQUIRED.
3. REVIEW REQUIRED statements are ineligible for publication even if they were READY_FOR_PUBLICATION.
4. Automation may remind. Automation must not renew, approve, or republish.

Current `reviewBy` values are 2026-12-23. None are stale as of 2026-09-23.
