# Assurance / trust claim register

**Owner:** Product Leadership  
**Rule:** Public pages may use **SUPPORTED** claims only.  
**Review cadence:** each claim has `reviewBy`. Humans approve updates. Automation may remind; it may not republish.

Claim statuses: `SUPPORTED` | `PARTIAL` | `DEFERRED` | `NOT_SUPPORTED` | `LEGAL_REVIEW_REQUIRED`  
Strength (separate from claim status): `IMPLEMENTED CONTROL` | `TESTED CONTROL` | `PENETRATION TESTED` | `CERTIFIED / ATTESTED`  
Public-facing material may use only **SUPPORTED** claims. No claim is CERTIFIED / ATTESTED.

| ID | Claim | Status | Visibility | Source | Owner | Last reviewed | Review by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Tenant isolation is enforced; cross-tenant reads do not return another tenant’s records | SUPPORTED | public | #12 two-tenant hosted proof; 2026-09-22 rem | Security | 2026-09-23 | 2026-12-23 |
| C-02 | RBAC is enforced on the server | SUPPORTED | public | #8 PASS | Security | 2026-09-23 | 2026-12-23 |
| C-03 | Evidence download requires CLEAN malware status (fail-closed) | SUPPORTED | public | #3 PASS; #12 Evidence | Security | 2026-09-23 | 2026-12-23 |
| C-04 | Significant actions are audited in-tenant | SUPPORTED | public | #8 / #12 | Security | 2026-09-23 | 2026-12-23 |
| C-05 | Hosted staging uses HTTPS | SUPPORTED | public | staging hosts | Security | 2026-09-23 | 2026-12-23 |
| C-06 | Browser refresh token is HttpOnly cookie on hosted HTTPS | SUPPORTED | public | 2026-09-22 PENTEST-M3 rem | Security | 2026-09-23 | 2026-12-23 |
| C-07 | Isolated backup/restore of PostgreSQL + evidence objects was tested | SUPPORTED | public (no SLA) | #5 PASS | Operations | 2026-09-23 | 2026-12-23 |
| C-08 | Rate limiting exists on auth and API | SUPPORTED | public | #4 PASS | Security | 2026-09-23 | 2026-12-23 |
| C-09 | 2026-09-22 identified security findings were remediated and two-tenant retested | SUPPORTED | public (summary only) | pentest rem docs | Security | 2026-09-23 | 2026-12-23 |
| C-10 | Privileged MFA is enforced in production configuration | PARTIAL | private / careful public | staging grace; production policy | Security | 2026-09-23 | 2026-12-23 |
| C-11 | Live Entra / Okta / Google SSO | DEFERRED | public as SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | #21 | Identity | 2026-09-23 | 2026-12-23 |
| C-12 | Live Slack / Jira / external ratings | DEFERRED | public as SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | #22 | Integrations | 2026-09-23 | 2026-12-23 |
| C-13 | SOC 2 certified / compliant | NOT_SUPPORTED | never public | none | Trust | 2026-09-23 | 2026-12-23 |
| C-14 | ISO 27001 certified | NOT_SUPPORTED | never public | none | Trust | 2026-09-23 | 2026-12-23 |
| C-15 | FedRAMP / HIPAA / PCI certified | NOT_SUPPORTED | never public | none | Trust | 2026-09-23 | 2026-12-23 |
| C-16 | Commercially production-ready / GA | NOT_SUPPORTED | never public | #11 NO-GO | Program | 2026-09-23 | 2026-12-23 |
| C-17 | Insurance Edition generally available / PASS | NOT_SUPPORTED | never public | #23 ACTIVE / NOT PASS | Program | 2026-09-23 | 2026-12-23 |
| C-18 | Live public status / uptime % | NOT_SUPPORTED | `/status` says NOT_CONFIGURED | PublicStatus.tsx | Operations | 2026-09-23 | 2026-12-23 |
| C-19 | Contractual RTO / RPO / multi-region HA | NOT_SUPPORTED | never public | #5 is isolated restore, not SLA | Operations | 2026-09-23 | 2026-12-23 |
| C-20 | Binding DPA / Privacy Notice | LEGAL_REVIEW_REQUIRED | draft only | LegalDraft.tsx | Legal | 2026-09-23 | 2026-12-23 |
| C-21 | Supreme Intelligence is a PASS certified product | DEFERRED | not public | #19 conflict — recommendation C | Program | 2026-09-23 | 2026-12-23 |
| C-22 | Named external pentest firm attestation | NOT_SUPPORTED | never public | no firm recorded | Security | 2026-09-23 | 2026-12-23 |
| C-23 | Public security mailbox is live | NOT_SUPPORTED | public as not configured | #9 leftover | Security | 2026-09-23 | 2026-12-23 |

Stale-claim control: if `reviewBy` passes without human re-approval, the claim becomes **PARTIAL** for public use until re-reviewed. Do not automatically claim continued compliance.
