# Public content mapping

**Status:** MAPPING ONLY — no runtime changes in Phase 1  
**Rule:** Public pages may use **SUPPORTED** claims only, and only when the publish class is SAFE TO PUBLISH NOW.  
**Routes already shipped (unchanged):** `/trust` `/security` `/status` `/privacy` `/terms` `/subprocessors`

## Publish classes

| Class | Meaning |
| --- | --- |
| SAFE TO PUBLISH NOW | SUPPORTED, approved, not expired, no contact/legal/production dependency |
| SAFE ONLY AFTER LEGAL REVIEW | Counsel must approve the wording or document |
| SAFE ONLY AFTER CONTACT CONFIGURATION | A real monitored destination must exist first |
| SAFE ONLY AFTER PRODUCTION VALIDATION | True only after production (or live provider) proof that does not exist today |
| DO NOT PUBLISH | False, unproven, certification-class, or commercially dishonest |

## Route inventory

| Route | Current runtime honesty | Phase 1 mapping role |
| --- | --- | --- |
| `/trust` | Draft capabilities; no SOC 2 / ISO / SLA / customer count | Future home for SUPPORTED capability sentences |
| `/security` | Product security as it exists; no pentest badge | Future home for SUPPORTED control sentences + customer-safe pentest summary |
| `/status` | NOT_CONFIGURED; not live monitoring | Must stay NOT_CONFIGURED until a live status page is built |
| `/privacy` | Draft — pending legal review | LEGAL REVIEW REQUIRED |
| `/terms` | Draft — pending legal review | LEGAL REVIEW REQUIRED |
| `/subprocessors` | Intentionally empty production list | LEGAL REVIEW REQUIRED; staging register is internal until approved |

## Claim → route → class

| claimId | Public copy (or prohibition) | /trust | /security | /status | /privacy | /terms | /subprocessors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Tenant isolation is enforced; cross-tenant reads do not return another tenant’s records | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH (not a status metric) | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-02 | Role-based access control is enforced on the server | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-03 | Evidence download requires a CLEAN malware status (fail-closed) | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-04 | Significant actions write tenant-scoped audit events | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-05 | Hosted staging uses HTTPS | SAFE TO PUBLISH NOW (say staging) | SAFE TO PUBLISH NOW (say staging) | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-06 | Browser refresh uses an HttpOnly cookie on hosted HTTPS | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-07 | Isolated backup/restore of database and evidence objects was tested | SAFE TO PUBLISH NOW (no SLA) | SAFE TO PUBLISH NOW (no SLA) | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-08 | Rate limiting exists on authentication and API routes | SAFE TO PUBLISH NOW | SAFE TO PUBLISH NOW | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-09 | 2026-09-22 identified findings were remediated and two-tenant retested | SAFE TO PUBLISH NOW (summary only) | SAFE TO PUBLISH NOW (summary only) | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-10 | Privileged MFA is required in production configuration; staging uses an audited grace | SAFE ONLY AFTER PRODUCTION VALIDATION if stated as “MFA enforced for all customers now”; PARTIAL wording may stay internal | Internal / careful | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-11 | Live Entra / Okta / Google SSO | DO NOT PUBLISH as live. Approved sentence: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | Same | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-12 | Live Slack / Jira / external ratings | DO NOT PUBLISH as live. Approved sentence: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | Same | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-13 | SOC 2 certified / compliant | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-14 | ISO 27001 certified | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-15 | FedRAMP / HIPAA / PCI certified | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-16 | Commercially production-ready / GA | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-17 | Insurance Edition generally available / PASS | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-18 | Live public status / uptime % | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH (page must stay NOT_CONFIGURED) | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-19 | Contractual RTO / RPO / multi-region HA | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-20 | Binding DPA / approved Privacy Notice | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | SAFE ONLY AFTER LEGAL REVIEW | SAFE ONLY AFTER LEGAL REVIEW | SAFE ONLY AFTER LEGAL REVIEW |
| C-21 | #19 accepted product module (not a certification) | SAFE TO PUBLISH NOW only as “accepted product module that interprets recorded facts” | Same if needed | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-22 | Named external pentest firm attestation | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |
| C-23 | Public security mailbox is live | SAFE ONLY AFTER CONTACT CONFIGURATION | SAFE ONLY AFTER CONTACT CONFIGURATION | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH | DO NOT PUBLISH |

## Other public statements (not claim IDs)

| Statement | Class | Notes |
| --- | --- | --- |
| Security contact address | SAFE ONLY AFTER CONTACT CONFIGURATION | `CONTACT-READINESS.md` |
| Support contact address | SAFE ONLY AFTER CONTACT CONFIGURATION | Same |
| Production subprocessors list | SAFE ONLY AFTER LEGAL REVIEW and SAFE ONLY AFTER PRODUCTION VALIDATION | Staging register is not a production roster |
| Vulnerability disclosure with mailbox | SAFE ONLY AFTER CONTACT CONFIGURATION and SAFE ONLY AFTER LEGAL REVIEW | No bounty, no payment, no unsupported safe harbor |
| Cookie notice | SAFE ONLY AFTER LEGAL REVIEW | Document is MISSING |
| Acceptable Use Policy | SAFE ONLY AFTER LEGAL REVIEW | Document is MISSING |
| Uptime percentage | DO NOT PUBLISH | `/status` is NOT_CONFIGURED |
| Live Stripe / paid billing | DO NOT PUBLISH | Test-mode only; commercial NO-GO |
| Production object storage validated | DO NOT PUBLISH | Not validated |
| Production DNS live | DO NOT PUBLISH | Untouched |

## /status future requirements (not built)

`/status` remains **NOT_CONFIGURED**. Do not fake live availability monitoring. Do not publish uptime percentages.

A future live status page, if later authorized, must have:

| Requirement | Purpose |
| --- | --- |
| Service health source | Real check of named public services — not a static “all systems operational” |
| Incident state | Human-declared incident, not inferred marketing copy |
| Maintenance state | Scheduled maintenance window |
| Degraded state | Distinct from outage |
| Outage state | Distinct from degraded |
| Human incident control | A person can set and clear state; automation must not invent incidents |

Until those exist, the honest page is: **not configured / not monitored**.

## Runtime

No frontend or backend change is required for Phase 1. Existing routes already refuse certification claims and mark `/status` NOT_CONFIGURED. This mapping governs later copy updates if Product Leadership authorizes them.
