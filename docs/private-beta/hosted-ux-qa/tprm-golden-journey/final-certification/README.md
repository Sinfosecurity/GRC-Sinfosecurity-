# #12 consolidated Golden Journey certification

This is the final consolidated certification gate for `#12`. It is **not** Wave 9 and **not** a new punch-list number.

**Certification SHA:** `da9f7de77239f0a354508fe757b1f2291637f20f`  
**Hosted frontend SHA:** `da9f7de77239f0a354508fe757b1f2291637f20f`  
**Hosted API SHA:** `b5d006599e9a6a93b69d8a73500b9d0159f0229b`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35686586390 PASS  
**Environment:** staging only  
**#12 PASS:** NO  
**Commercial GO:** NO  
**Production:** untouched  
**main:** not merged  

Wave 8 ACCEPTED FOR CURRENT STAGE (`037b8e98dac360e12084bb0de8b66ee666036feb`, evidence `f168b71cd7df00aaf2a64091446af3c2f81a9390`).  
Security remediation ACCEPTED FOR CURRENT STAGE (`da9f7de77239f0a354508fe757b1f2291637f20f`, evidence `4f59f3326781d925570309f041b6971d791be40f`).

## Starting state

QA organization `supreme-grc-qa` `0e0de017-919a-4886-93d7-420b05f71f62`.

| Record | Id | Starting state | Use in this certification |
| --- | --- | --- | --- |
| Microsoft Corporation QA | `b777503b-8a35-4a4c-ad10-b0bfdd599c2b` | Shared Third Party | Reused. Not recreated. |
| Azure Hosting QA `ENG-2026-0001` | `93a259e6-81bf-4eb1-b79f-2077c6eeafda` | `OFFBOARDED` | Immutable history for Findings, CE, residual Cycle 1 MEDIUM 58, treatment/acceptance, contract gate, activation, monitoring, reassessment, termination, offboarding, final disposition. |
| Microsoft 365 Collaboration QA `ENG-2026-0002` | `eeb0ae53-0e05-4748-8434-79f28c9e564a` | `DUE_DILIGENCE_PLANNING` | Live sibling. Must not be mutated by Azure or by the new certification Engagement. |
| Certification Services `INT-2026-0006` | new | created this gate | Live hosted walk: intake → assignment → Microsoft match → new Engagement → IRA Don’t Know → clarification → human tier confirm MEDIUM → DD plan confirm. |

Azure was not restarted. Rewriting an OFFBOARDED Engagement would falsify accepted history.

## Personas

| Participant | Email | Role |
| --- | --- | --- |
| Requester | `qa.requester@supremegrc.test` | BUSINESS_OWNER |
| TPRM Lead | `qa.tprm.lead@supremegrc.test` | RISK_MANAGER |
| TPRM Analyst | `qa.tprm.analyst@supremegrc.test` | ASSESSOR |
| Vendor | `qa.vendor@supremegrc.test` | invitation-only; no User row |

## Result

Hosted API + UI: **0 FAIL**. SKIPs documented below.

If Product Leadership accepts this evidence: `#12 CONSOLIDATED GOLDEN JOURNEY CERTIFICATION — EVIDENCE RESULT PASS — READY FOR PRODUCT LEADERSHIP FINAL ACCEPTANCE`.

Cursor does **not** declare `#12` PASS.

## Reuse versus live walk

**Live on current hosted SHA**

- Requester intake `INT-2026-0006`
- Lead assignment to analyst
- Analyst Microsoft Third Party reuse
- New independent Engagement `63684046-97fc-40cb-be3c-10ba0b26748e` `READY_FOR_IRA` then IRA / tier / DD
- Don’t Know blocks tier confirmation (409)
- Human clarification and confirmed MEDIUM
- Requester / Vendor / unauthenticated denials
- Two-tenant IDOR against real Azure/M365/Microsoft ids
- Security regression
- UI navigation, Azure lifecycle tabs, M365 sibling, responsive 375–1920, requester denial, vendor activate

**Reused accepted immutable Azure history**

Vendor questionnaire completion, Shared Evidence upload bytes, specialist conclusion, Finding confirm/dismiss, Control Effectiveness rating, residual calculation, treatment/acceptance/contract/activation, monitoring signal triage, reassessment Cycle 2, termination, offboarding, and final disposition. Those records remain inspectable on Azure `OFFBOARDED`. They were not rewritten. M365 stayed `DUE_DILIGENCE_PLANNING`.

## SKIPs

| Check | Reason |
| --- | --- |
| `vendor.hosted.session` | Invitation link/copy does not return an activation secret. Vendor remains invitation-only. Auth was not weakened. Same limitation accepted in Wave 3. |
| `idor.public.vendor` | New trial Org B could not mint a public API client (401). Mass assignment and public-vendor IDOR were already hosted-proven on the accepted security remediation two-tenant walk (18/18). |

## Honesty

- Staging privileged MFA is grace, not production enforcement.
- Email verification is not a hard blocker on trial session issuance. **EXPECTED DESIGN**.
- BitSight, SecurityScorecard, Slack, Jira: **NOT_CONFIGURED**.
- Malware provider: **CONNECTED**. Download policy fail-closed. Storage: **S3 up**.
- Notifications remain queued ≠ delivered.
- No fake IAM or data-deletion automation.
- `#23` Insurance was smoke-checked only and not extended.
- Local `supreme_test` credentials are not present on this workstation. Authoritative automated suite is CI 35686586390 on `da9f7de`.

## Performance (hosted ms)

login requester 911 / lead 827 / analyst 604 · Azure engagement 1234 · M365 468 · intake create 3124 · intake queue 245 · my work 229 · requester home 293. No approved SLA exists.

## Screenshots

`screenshots/` — requester intake/home/denial, GRC home/intake/my work/engagements, Azure overview/findings/residual/decisions/evidence/controls/specialist/monitoring/reassessment/offboarding/history, M365 overview, vendor activate, responsive 375/1440/1920.
