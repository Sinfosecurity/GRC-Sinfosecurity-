# Assurance / trust claim register

**Owner:** Product Leadership  
**Rule:** Public pages may use **SUPPORTED** claims only.  
**Workflow:** `TRUST-CLAIM-WORKFLOW.md`  
**Review cadence:** each claim has `reviewBy`. Humans approve updates. Automation may remind later via existing #20 primitives if authorized; it may not republish.

Claim statuses: `SUPPORTED` | `PARTIAL` | `DEFERRED` | `NOT_SUPPORTED` | `LEGAL_REVIEW_REQUIRED`  
Strength (separate from claim status): `IMPLEMENTED CONTROL` | `TESTED CONTROL` | `PENETRATION TESTED` | `CERTIFIED / ATTESTED`  
Public-facing material may use only **SUPPORTED** claims. No claim is CERTIFIED / ATTESTED.

Review state for all rows below as of 2026-09-23: **APPROVED for recorded status** (not an approval to over-claim). Next human review: `reviewBy`.

---

### C-01

| Field | Value |
| --- | --- |
| claimId | C-01 |
| claim | Tenant isolation is enforced; cross-tenant reads do not return another tenant’s records |
| visibility | public |
| status | SUPPORTED |
| evidence source | #12 two-tenant hosted proof; 2026-09-22 rem |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. |
| internalNotes | Proof is private-testing / staging. Do not upgrade to commercial production isolation certification. |

### C-02

| Field | Value |
| --- | --- |
| claimId | C-02 |
| claim | RBAC is enforced on the server |
| visibility | public |
| status | SUPPORTED |
| evidence source | #8 PASS |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Role-based access control is enforced on the server. |
| internalNotes | Live IdP federation is a different claim (C-11). |

### C-03

| Field | Value |
| --- | --- |
| claimId | C-03 |
| claim | Evidence download requires CLEAN malware status (fail-closed) |
| visibility | public |
| status | SUPPORTED |
| evidence source | #3 PASS; #12 Evidence |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable. |
| internalNotes | Production object storage not validated. |

### C-04

| Field | Value |
| --- | --- |
| claimId | C-04 |
| claim | Significant actions are audited in-tenant |
| visibility | public |
| status | SUPPORTED |
| evidence source | #8 / #12 |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Significant actions write tenant-scoped audit events. |
| internalNotes | Not a SIEM product. No log-retention SLA. |

### C-05

| Field | Value |
| --- | --- |
| claimId | C-05 |
| claim | Hosted staging uses HTTPS |
| visibility | public |
| status | SUPPORTED |
| evidence source | staging hosts |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Hosted staging uses HTTPS. |
| internalNotes | Say staging. Do not imply a production TLS attestation. |

### C-06

| Field | Value |
| --- | --- |
| claimId | C-06 |
| claim | Browser refresh token is HttpOnly cookie on hosted HTTPS |
| visibility | public |
| status | SUPPORTED |
| evidence source | 2026-09-22 PENTEST-M3 rem |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Browser refresh uses an HttpOnly cookie on hosted HTTPS. |
| internalNotes | Do not describe the rem as an exploit write-up. |

### C-07

| Field | Value |
| --- | --- |
| claimId | C-07 |
| claim | Isolated backup/restore of PostgreSQL + evidence objects was tested |
| visibility | public (no SLA) |
| status | SUPPORTED |
| evidence source | #5 PASS |
| owner | Operations |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Isolated restore of the tenant database and evidence objects has been tested. RTO and RPO are not contractually defined. |
| internalNotes | C-19 covers the forbidden SLA upgrade. |

### C-08

| Field | Value |
| --- | --- |
| claimId | C-08 |
| claim | Rate limiting exists on auth and API |
| visibility | public |
| status | SUPPORTED |
| evidence source | #4 PASS |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Rate limiting exists on authentication and API routes. |
| internalNotes | Do not publish exact limit numbers unless Product Leadership later approves. |

### C-09

| Field | Value |
| --- | --- |
| claimId | C-09 |
| claim | 2026-09-22 identified security findings were remediated and two-tenant retested |
| visibility | public (summary only) |
| status | SUPPORTED |
| evidence source | pentest rem docs |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Identified findings from 2026-09-22 security testing were remediated and two-tenant retested on staging. This is security testing, not a certification. |
| internalNotes | Customer-safe categories only. No payloads, credentials, internal endpoints, QA accounts, or firm name. |

### C-10

| Field | Value |
| --- | --- |
| claimId | C-10 |
| claim | Privileged MFA is enforced in production configuration |
| visibility | private / careful public |
| status | PARTIAL |
| evidence source | staging grace; production policy |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH as “MFA enforced for all hosted users today.” Internal: production config requires privileged MFA; staging uses an audited grace. |
| internalNotes | SAFE ONLY AFTER PRODUCTION VALIDATION if stated as live enforcement on the current host. |

### C-11

| Field | Value |
| --- | --- |
| claimId | C-11 |
| claim | Live Entra / Okta / Google SSO |
| visibility | public as SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED |
| status | DEFERRED |
| evidence source | #21 |
| owner | Identity |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | SSO / SCIM: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. |
| internalNotes | Do not say live federation is validated. |

### C-12

| Field | Value |
| --- | --- |
| claimId | C-12 |
| claim | Live Slack / Jira / external ratings |
| visibility | public as SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED |
| status | DEFERRED |
| evidence source | #22 |
| owner | Integrations |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | API / webhooks / Slack / Jira / external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. |
| internalNotes | Not current subprocessors. |

### C-13

| Field | Value |
| --- | --- |
| claimId | C-13 |
| claim | SOC 2 certified / compliant |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | none |
| owner | Trust |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. If asked: Supreme is not SOC 2 certified. |
| internalNotes | “Compliant with SOC 2” is also forbidden. |

### C-14

| Field | Value |
| --- | --- |
| claimId | C-14 |
| claim | ISO 27001 certified |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | none |
| owner | Trust |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. If asked: Supreme is not ISO 27001 certified. |
| internalNotes | Phase 1 does not start an ISO program. |

### C-15

| Field | Value |
| --- | --- |
| claimId | C-15 |
| claim | FedRAMP / HIPAA / PCI certified |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | none |
| owner | Trust |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. |
| internalNotes | None of these attestations exist. |

### C-16

| Field | Value |
| --- | --- |
| claimId | C-16 |
| claim | Commercially production-ready / GA |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | #11 NO-GO |
| owner | Program |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. Honest: private-testing release candidate; commercial production NO-GO. |
| internalNotes | #12 PASS is not commercial GO. |

### C-17

| Field | Value |
| --- | --- |
| claimId | C-17 |
| claim | Insurance Edition generally available / PASS |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | #23 ACTIVE / NOT PASS |
| owner | Program |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. |
| internalNotes | Frozen `0f42cba`. Five gaps not hosted-proven. Zero-spend hold. |

### C-18

| Field | Value |
| --- | --- |
| claimId | C-18 |
| claim | Live public status / uptime % |
| visibility | `/status` says NOT_CONFIGURED |
| status | NOT_SUPPORTED |
| evidence source | PublicStatus.tsx |
| owner | Operations |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH uptime. Page must remain NOT_CONFIGURED until a real status source exists. |
| internalNotes | Future requirements in PUBLIC-CONTENT-MAPPING.md. |

### C-19

| Field | Value |
| --- | --- |
| claimId | C-19 |
| claim | Contractual RTO / RPO / multi-region HA |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | #5 is isolated restore, not SLA |
| owner | Operations |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH. |
| internalNotes | Do not upgrade C-07 into an SLA. |

### C-20

| Field | Value |
| --- | --- |
| claimId | C-20 |
| claim | Binding DPA / Privacy Notice |
| visibility | draft only |
| status | LEGAL_REVIEW_REQUIRED |
| evidence source | LegalDraft.tsx; LEGAL-DOCUMENT-STATUS.md |
| owner | Legal |
| approver | Legal (unassigned) / Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH as approved. Draft pages may say they are drafts. |
| internalNotes | Ownership table in LEGAL-DOCUMENT-STATUS.md. |

### C-21

| Field | Value |
| --- | --- |
| claimId | C-21 |
| claim | Supreme Intelligence (#19) is Product Leadership accepted as a product module (2026-09-14) |
| visibility | public only as product module, not as a certification |
| status | SUPPORTED |
| evidence source | Punch list #19 PASS; implementation `9ee8529d806f17fdef6f736fb179cd8fc8e89327`; CI `34914149569` PASS |
| owner | Program |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | Supreme Intelligence is an accepted product module that interprets recorded Supreme facts. It is not a certification and does not invent monitoring events. |
| internalNotes | Historical PARTIAL lines in SUPREME-PROGRAM-STATE.md were stale documentation and were reconciled. Hosted review records from 2026-09-14/15 are preserved as history. Do not reopen #19 engineering. Do not say “PASS certified product.” The forbidden wording “Supreme Intelligence is a PASS certified product” remains NOT_SUPPORTED. |

### C-22

| Field | Value |
| --- | --- |
| claimId | C-22 |
| claim | Named external pentest firm attestation |
| visibility | never public |
| status | NOT_SUPPORTED |
| evidence source | no firm recorded |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | DO NOT PUBLISH a firm name. |
| internalNotes | Use C-09 customer-safe summary only. |

### C-23

| Field | Value |
| --- | --- |
| claimId | C-23 |
| claim | Public security mailbox is live |
| visibility | public as not configured |
| status | NOT_SUPPORTED |
| evidence source | CONTACT-READINESS.md; #9 leftover |
| owner | Security |
| approver | Product Leadership |
| lastReviewed | 2026-09-23 |
| reviewBy | 2026-12-23 |
| publicCopy | A public security reporting address is not configured. |
| internalNotes | USER ACTION REQUIRED. Do not invent security@. |

---

Stale-claim control: if `reviewBy` passes without human re-approval, the claim becomes **REVIEW REQUIRED** and is treated as PARTIAL for public use until re-reviewed. Do not automatically claim continued compliance.
