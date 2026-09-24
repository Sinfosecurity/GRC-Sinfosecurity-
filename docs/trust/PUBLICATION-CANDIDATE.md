# Publication candidate (docs only — not deployed)

**Phase:** 3  
**Routes in this candidate:** `/trust` `/security` `/status`  
**Routes referenced only:** `/privacy` `/terms` `/subprocessors` — LEGAL_REVIEW_REQUIRED  
**Rule:** Every sentence maps to a claimId on the allowlist. No orphan copy. No runtime files. No page deploy.

---

## Claim allowlist

Only these IDs may appear as positive or honest-negative public sentences in this candidate.

| claimId | Allowed sentence role |
| --- | --- |
| C-01 | Tenant isolation — STAGING / PRIVATE-TESTING |
| C-02 | Server-side RBAC |
| C-03 | Fail-closed malware / evidence download |
| C-04 | Tenant-scoped audit |
| C-05 | Hosted staging HTTPS |
| C-06 | HttpOnly refresh cookie on hosted HTTPS |
| C-07 | Tested isolated backup/restore; no contractual RTO/RPO |
| C-08 | Auth/API rate limiting |
| C-09 | Customer-safe pentest / security-testing summary |
| C-11 | Exact: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED |
| C-12 | Exact: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED |
| C-18 | STATUS MONITORING NOT CONFIGURED |
| C-21 | Supreme Intelligence interprets recorded Supreme data without inventing external threat events. |
| C-23 | Security reporting address: not configured. |
| K-SUP | Customer support address: not configured. |
| C-13 C-14 C-15 C-16 C-17 C-19 C-22 | Honest **non-claims** only (“not certified / not GA / no firm / no SLA”) |

C-10 may appear on `/security` only as an **Authentication limitation** (staging grace; PRODUCTION CONFIGURATION requires privileged MFA). It is not a READY positive claim.

---

## Claim denylist

These statements are prohibited from publication.

- SOC 2 certified
- SOC 2 compliant
- ISO 27001 certified
- FedRAMP authorized
- HIPAA certified
- PCI certified
- production ready
- commercially live
- live Stripe
- production uptime
- production RTO/RPO
- live Entra
- live Okta
- live Google federation
- live Slack
- live Jira
- live SecurityScorecard
- live BitSight
- Insurance Edition PASS
- Insurance Edition GA
- working security mailbox
- working support mailbox
- live status monitoring
- All systems operational
- Integrated with Entra / Okta / Google / Slack / Jira
- SecurityScorecard integration available
- BitSight integration available

---

## Route manifest

| route | claimIds | exact candidate sections | blocked sections | environment labels | legal dependency | contact dependency | production dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/trust` | C-01 C-02 C-03 C-04 C-05 C-06 C-07 C-08 C-09 C-11 C-12 C-21 C-23 K-SUP | lede; isolation; RBAC; malware; audit; HTTPS; cookie; restore; rate limits; pentest; Intelligence; deferred architecture; contacts not configured | encryption-at-rest; decision immutability card; addresses; certifications; GA | STAGING / PRIVATE-TESTING; LIVE VALIDATION DEFERRED | none for this candidate | addresses CONTACT_CONFIGURATION_REQUIRED; honest “not configured” is allowed | none for this candidate |
| `/security` | C-01 C-02 C-03 C-04 C-05 C-06 C-07 C-08 C-09 C-10-limitation C-11 C-12 C-23 | Access Control; Authentication (limitation); Session Security; Evidence Security; Malware Controls; Audit; Rate Limiting; Backup / DR; Vulnerability / Security Testing; Pentest Summary; deferred architecture; mailbox not configured | certification; production assurance; firm attestation; production SLA; working mailbox | STAGING / PRIVATE-TESTING; PRODUCTION CONFIGURATION (MFA limitation only); LIVE VALIDATION DEFERRED | VDP remains draft | C-23 address blocked | C-10 production MFA blocked as a positive claim |
| `/status` | C-18 | STATUS MONITORING NOT CONFIGURED | All systems operational; uptime %; incident history; live health; production monitoring; availability SLA | not monitored | none | none | live status PRODUCTION_VALIDATION_REQUIRED |
| `/privacy` | C-20 | status reference only | approved Privacy Notice | n/a | LEGAL_REVIEW_REQUIRED | none | none |
| `/terms` | C-20 | status reference only | approved Terms | n/a | LEGAL_REVIEW_REQUIRED | none | none |
| `/subprocessors` | K-PROD-SUB | status reference only | production roster | n/a | LEGAL_REVIEW_REQUIRED | none | PRODUCTION_VALIDATION_REQUIRED |

---

## /trust

**Current copy (live `TrustCenter.tsx`, unchanged):** Trust & Security / Built for enterprise governance. Capability cards including encryption architecture and decision immutability. Explicitly no SOC 2, ISO, SLA, or customer count.

**Proposed copy (every sentence → claimId):**

Headline: Product capabilities on hosted STAGING / PRIVATE-TESTING.  
Lede: This page describes controls that exist on Supreme’s STAGING / PRIVATE-TESTING environment. It does not claim SOC 2 certification, SOC 2 compliance, ISO 27001, FedRAMP, HIPAA, or PCI certification. It is not a production-ready or commercially live statement. `[C-13 C-14 C-15 C-16]`

1. Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. STAGING / PRIVATE-TESTING. `[C-01]`
2. Role-based access control is enforced on the server. `[C-02]`
3. Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable. `[C-03]`
4. Significant actions write tenant-scoped audit events. `[C-04]`
5. Hosted STAGING / PRIVATE-TESTING uses HTTPS. `[C-05]`
6. On hosted HTTPS, the browser refresh token is stored in an HttpOnly cookie. `[C-06]`
7. Isolated restore of the tenant database and evidence objects has been tested. RTO and RPO are not contractually defined. `[C-07]`
8. Rate limiting exists on authentication and API routes. `[C-08]`
9. On 2026-09-22, application security testing was performed against the hosted staging frontend and API. Identified findings were remediated and a two-tenant retest on staging was completed. This is security testing, not a certification. `[C-09]`
10. Supreme Intelligence interprets recorded Supreme data without inventing external threat events. `[C-21]`
11. Entra, Okta, Google, Slack, Jira, and external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. `[C-11 C-12]`
12. Security reporting address: not configured. `[C-23]`
13. Customer support address: not configured. `[K-SUP]`

---

## /security

**Current copy (live `SecurityOverview.tsx`, unchanged):** Product security as it exists today. Cards for isolation, RBAC, evidence, decision immutability, audit, and “what is not claimed.”

**Proposed copy (section → claimId):**

Headline: Security overview — STAGING / PRIVATE-TESTING.  
Lede: This is a security overview of the hosted private-testing product. It is not a certification, not a production pentest report, and not a commercial SLA. `[C-13 C-16 C-22]`

**Access Control.** Tenant isolation is enforced. Cross-tenant reads do not return another tenant’s records. Role-based access control is enforced on the server. `[C-01 C-02]`

**Authentication.** Password authentication exists. Privileged MFA is required in PRODUCTION CONFIGURATION. STAGING / PRIVATE-TESTING currently uses an audited grace. This is not production MFA proof. `[C-10 limitation]`

**Session Security.** Hosted STAGING / PRIVATE-TESTING uses HTTPS. On hosted HTTPS, the browser refresh token is stored in an HttpOnly cookie. `[C-05 C-06]`

**Evidence Security.** Evidence download requires a CLEAN malware status. Non-CLEAN files are not downloadable. `[C-03]`

**Malware Controls.** Uploads are scanned. Download is fail-closed unless the scan is CLEAN. `[C-03]`

**Audit.** Significant actions write tenant-scoped audit events. `[C-04]`

**Rate Limiting.** Rate limiting exists on authentication and API routes. `[C-08]`

**Backup / DR.** Isolated restore of the tenant database and evidence objects has been tested. RTO and RPO are not contractually defined. `[C-07]`

**Vulnerability / Security Testing.** Identified 2026-09-22 findings were remediated and two-tenant retested on staging. This is not a certified vulnerability-management attestation. `[C-09]`

**Pentest Summary.** On 2026-09-22, application security testing was performed against Supreme’s hosted staging frontend and API (private-testing environment). Areas covered included tenant isolation, public health disclosure, session-cookie handling, webhook-sink authentication, and identity-discovery request safety. Identified findings from that exercise were remediated. A two-tenant retest on staging was completed. This is security testing, not a certification, and it is not a production or commercial-assurance report. `[C-09]`

**Deferred architecture.** Entra, Okta, Google, Slack, Jira, and external ratings: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED. `[C-11 C-12]`

**Security contact.** Security reporting address: not configured. `[C-23]`

No working security mailbox. No production SLA. No external-firm attestation.

---

## /status

**Current copy (live `PublicStatus.tsx`, unchanged):** Public status reporting is not configured. Provider state NOT_CONFIGURED.

**Proposed copy:**

Headline: STATUS MONITORING NOT CONFIGURED  
Lede: Live public status monitoring is not configured. This page does not report uptime, incident history, live service health, production monitoring, an availability SLA, or “All systems operational.” `[C-18]`  
State: NOT_CONFIGURED / NOT MONITORED
