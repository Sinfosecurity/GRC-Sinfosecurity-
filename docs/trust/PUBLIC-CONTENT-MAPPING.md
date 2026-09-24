# Public content mapping

**Status:** MAPPING ONLY — no runtime changes in Phase 1  
**Rule:** Public pages may use **SUPPORTED** claims only, and only when the publish class is SAFE_TO_PUBLISH_NOW.  
**Routes already shipped (unchanged):** `/trust` `/security` `/status` `/privacy` `/terms` `/subprocessors`

## Publish classes

| Class | Meaning |
| --- | --- |
| SAFE_TO_PUBLISH_NOW | SUPPORTED, approved, not expired, no contact/legal/production dependency |
| LEGAL_REVIEW_REQUIRED | Counsel must approve the wording or document |
| CONTACT_CONFIGURATION_REQUIRED | A real monitored destination must exist first |
| PRODUCTION_VALIDATION_REQUIRED | True only after production (or live provider) proof that does not exist today |
| DO_NOT_PUBLISH | False, unproven, certification-class, or commercially dishonest |

## Route inventory

| Route | Current runtime honesty | Phase 1 mapping role |
| --- | --- | --- |
| `/trust` | Draft capabilities; no SOC 2 / ISO / SLA / customer count | Future home for SUPPORTED capability sentences |
| `/security` | Product security as it exists; no pentest badge | Future home for SUPPORTED control sentences + customer-safe pentest summary |
| `/status` | NOT_CONFIGURED / NOT MONITORED | Must stay NOT_CONFIGURED / NOT MONITORED until a live status page is built |
| `/privacy` | Draft — pending legal review | LEGAL REVIEW REQUIRED |
| `/terms` | Draft — pending legal review | LEGAL REVIEW REQUIRED |
| `/subprocessors` | Intentionally empty production list | LEGAL REVIEW REQUIRED; staging register is internal until approved |

## Claim → route → class

| claimId | Public copy (or prohibition) | /trust | /security | /status | /privacy | /terms | /subprocessors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Tenant isolation is enforced; cross-tenant reads do not return another tenant’s records | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH (not a status metric) | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-02 | Role-based access control is enforced on the server | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-03 | Evidence download requires a CLEAN malware status (fail-closed) | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-04 | Significant actions write tenant-scoped audit events | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-05 | Hosted staging uses HTTPS | SAFE_TO_PUBLISH_NOW (say staging) | SAFE_TO_PUBLISH_NOW (say staging) | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-06 | Browser refresh uses an HttpOnly cookie on hosted HTTPS | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-07 | Isolated backup/restore of database and evidence objects was tested | SAFE_TO_PUBLISH_NOW (no SLA) | SAFE_TO_PUBLISH_NOW (no SLA) | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-08 | Rate limiting exists on authentication and API routes | SAFE_TO_PUBLISH_NOW | SAFE_TO_PUBLISH_NOW | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-09 | 2026-09-22 identified findings were remediated and two-tenant retested | SAFE_TO_PUBLISH_NOW (summary only) | SAFE_TO_PUBLISH_NOW (summary only) | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-10 | Privileged MFA is required in production configuration; staging uses an audited grace | PRODUCTION_VALIDATION_REQUIRED if stated as “MFA enforced for all customers now”; PARTIAL wording may stay internal | Internal / careful | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-11 | Live Entra / Okta / Google SSO | DO_NOT_PUBLISH as live. Approved sentence: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | Same | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-12 | Live Slack / Jira / external ratings | DO_NOT_PUBLISH as live. Approved sentence: SUPPORTED ARCHITECTURE — LIVE VALIDATION DEFERRED | Same | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-13 | SOC 2 certified / compliant | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-14 | ISO 27001 certified | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-15 | FedRAMP / HIPAA / PCI certified | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-16 | Commercially production-ready / GA | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-17 | Insurance Edition generally available / PASS | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-18 | Live public status / uptime % | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH (page must stay NOT_CONFIGURED / NOT MONITORED) | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-19 | Contractual RTO / RPO / multi-region HA | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-20 | Binding DPA / approved Privacy Notice | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED |
| C-21 | #19 accepted product module (not a certification) | SAFE_TO_PUBLISH_NOW only as “accepted product module that interprets recorded facts” | Same if needed | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-22 | Named external pentest firm attestation | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |
| C-23 | Public security mailbox is live | CONTACT_CONFIGURATION_REQUIRED | CONTACT_CONFIGURATION_REQUIRED | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH | DO_NOT_PUBLISH |

## Other public statements (not claim IDs)

| Statement | Class | Notes |
| --- | --- | --- |
| Security contact address | CONTACT_CONFIGURATION_REQUIRED | `CONTACT-READINESS.md` |
| Support contact address | CONTACT_CONFIGURATION_REQUIRED | Same |
| Production subprocessors list | LEGAL_REVIEW_REQUIRED and PRODUCTION_VALIDATION_REQUIRED | Staging register is not a production roster |
| Vulnerability disclosure with mailbox | CONTACT_CONFIGURATION_REQUIRED and LEGAL_REVIEW_REQUIRED | No bounty, no payment, no unsupported safe harbor |
| Cookie notice | LEGAL_REVIEW_REQUIRED | Document is MISSING |
| Acceptable Use Policy | LEGAL_REVIEW_REQUIRED | Document is MISSING |
| Uptime percentage | DO_NOT_PUBLISH | `/status` is NOT_CONFIGURED / NOT MONITORED |
| Live Stripe / paid billing | DO_NOT_PUBLISH | Test-mode only; commercial NO-GO |
| Production object storage validated | DO_NOT_PUBLISH | Not validated |
| Production DNS live | DO_NOT_PUBLISH | Untouched |

## /status future requirements (not built)

`/status` remains **NOT_CONFIGURED / NOT MONITORED**. Do not fake live availability monitoring. Do not invent uptime percentages.

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
