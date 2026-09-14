# Hosted #12 Phase C golden-path evidence

**Date:** 2026-09-14  
**Item:** #12 Supreme Third Party — Phase C Hosted Certification  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Production:** NO  
**#12 PASS:** NOT DECLARED  
**Phase D polish / #19 / #20:** NOT AUTHORIZED

This extends the existing Supreme Third Party product. It is not a second TPRM application.

## SHAs

| | SHA |
|---|---|
| Phase C starting | `ccf346ad3c5b646ec3c7a1e3d89fb471eef600f1` |
| Phase C implementation | `7810ac7ab08a5feb1b8ba072b45bbd2a40a3414c` |
| Certification / stability descendant | `99bfe89419d064e8ab20317e917b70da22dbd03a` |
| Hosted API at walkthrough | `99bfe89419d064e8ab20317e917b70da22dbd03a` |
| Hosted frontend at walkthrough | `7810ac7ab08a5feb1b8ba072b45bbd2a40a3414c` |

Frontend SHA differs from API SHA. Not silently reconciled. The descendant changed backend reassessment expiry math and the hosted walkthrough script only. Frontend source did not change after `7810ac7`.

**CI on `99bfe89`:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34806881048 PASS  
**Prior CI on implementation `7810ac7`:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34806035973 PASS  
**Backend tests:** 371  
**Frontend tests:** 163  

## Vendors

| Public ID | Role |
|---|---|
| `VND-2026-0011` | Golden path: Request → Active → reassessment → offboarding |
| `VND-2026-0012` | Cross-vendor isolation |
| `VND-2026-0013` | Human reject |
| `VND-2026-0009` | Earlier `7810ac7` walkthrough (same product path; reassessment expiry later corrected) |

## Golden path (`VND-2026-0011`)

Phase A was repeated through Ready to send. Due diligence was sent to Casey Contact. Invitation **Pending**, email **Queued**, with explicit copy that queued is not inbox delivery.

Resend rotated the link. The prior token returned **410** with no session. First activation returned **200** (`sessionId=d9dd6c10-5533-4f22-a724-67f209e8e9f1`). Reuse returned **410** with no JWT. Vendor JWT → `GET /api/v1/vendors` returned **401**. Other tenant GET returned **404**. Vendor A session reading vendor B assessment returned **404**.

The vendor submitted all six assigned assessments. Analyst review produced 36 draft findings. One was confirmed, one adjusted to High, remaining drafts dismissed.

Residual was recalculated at **58** before acceptance. One High finding was assigned a CAP and owner, then:

- close without evidence → **409**
- remediation evidence uploaded (`scan=CLEAN`)
- close before validation → **409** (`An analyst must validate remediation before close.`)
- validate → 200
- close with ready evidence → 200

The second confirmed finding was accepted on `RiskDecisionBrief` `9db93a65-16c2-4d80-866c-a15518ae14f6` (`RISK_ACCEPTED`, conditions, next review `2027-05-24`). Residual remained **58**.

Contract checklist (7 items from tier/plan: security addendum, breach, subprocessor, DPA, BAA, deletion/return, right to audit) was human-attested. Approval was **APPROVE_WITH_CONDITIONS**. Vendor status became **ACTIVE**. Next reassessment `2027-05-24`. Monitoring reported residual 58, 0 open findings, 1 accepted risk, and **Only shown when a monitoring provider is connected.**

Reassessment recommended **Full reassessment** because privacy and AI governance are in scope (`expiredEvidence=0`, `previousAnswersEligible=true`). Starting reassessment set stage `REASSESSMENT` and left **7** prior assessment rows. Offboarding set stage/status `OFFBOARDING` and retained 50 history events plus stored objects.

`VND-2026-0013` recorded human **REJECT** / vendor **REJECTED**.

Expired tokens were **not** hosted-proved. The integration test backdates `expiresAt` and expects 410. No staging clock hook was added.

## Screenshots

| File | What it shows |
|---|---|
| `workspace-1440.png` / `workspace-375.png` | Customer onboarding workspace after activation |
| `findings-1440.png` | Confirmed findings / remediation / acceptance |
| `contract-1440.png` | Tier/plan contract checklist and attestation |
| `approval-1440.png` | Human approval package |
| `active-1440.png` | Active monitoring, residual, honest external-intel copy, offboarding |
| `history-1440.png` | Retained onboarding history |
| `results.json` | Machine log |

## Honesty

- Queued is not Delivered. Inbox receipt was not observed.
- Expired invitation tokens are integration-tested, not hosted-proved.
- Reassessment is a new governed stage plus a recommendation. It does not mint a second questionnaire product or a targeted delta UI.
- Plain **APPROVE** (without conditions) was not hosted on a separate vendor. The hosted human decision was **APPROVE_WITH_CONDITIONS**.
- External monitoring providers are not connected. The UI says so.
- Frontend `7810ac7` / API `99bfe89` split is documented, not reconciled.
