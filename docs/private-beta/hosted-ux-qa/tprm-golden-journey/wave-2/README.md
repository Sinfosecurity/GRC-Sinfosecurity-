# #12 Wave 2 — Engagement IRA + Tier Review + requester clarification

Starting SHA `83d1f442298bf95cb0ea6c1fdde7aed2e7cea63f`  
Implementation SHA `c47020a86feeb0b5b67bc408671159e68d8f2c26`  
Wave 1 accepted for current stage. Wave 3 not started. This is **not** a #12 PASS.

Local railway-cleanup `3e41f2b` remains on `housekeeping/railway-cleanup` and is **not** in this lineage.

## Remote / CI

Remote `supreme-risk-transformation` `c47020a86feeb0b5b67bc408671159e68d8f2c26`  
CI https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35434076672 PASS on `c47020a`  
Backend 106 suites / 534 tests. Frontend 76 files / 243 tests. Typecheck, migration deploy, production build, and public-build-safety passed.

## Hosted runtime

Frontend `https://supreme-risk-staging.onrender.com/version.json` `c47020a86feeb0b5b67bc408671159e68d8f2c26`  
API `https://supreme-risk-staging-api.onrender.com/health` `c47020a86feeb0b5b67bc408671159e68d8f2c26`  
Staging only. Production untouched.

## Local / CI proofs

Engagement creates a dedicated `EngagementIra`. Two Microsoft engagements have separate IRA ids.  
Requester can open/submit own IRA; other requester 404; GRC 403 on requester IRA APIs; vendor 401/403.  
Version 3 Don't Know blocks confirm. Clarification is question-specific. Original INITIAL answers stay immutable. Recalculation preserves the previous snapshot. Confirm preserves the recommendation. Override requires rationale and keeps the original recommendation. Cross-tenant denied. Audit events recorded. Wave 3 `wave3Started=false`.

## Hosted golden walk

| Check | Result |
| --- | --- |
| Hosted SHA | **PASS.** Frontend and API both `c47020a`. |
| Requester-only hosted login | **SKIP.** Invite `delivery=sent` still does not return an activation token. Activation secrets were not taken from email and were not weakened. |
| Requester IRA / clarification UI | **SKIP.** No requester-only session safely available. CI remains the authoritative loop. |
| Populated Tier Review / confirm / override | **SKIP.** Same invitation-token limitation. GRC cannot create intakes. |
| GRC denied Requester Workspace | **PASS.** `/request` → Access Denied. Requester APIs 403. |
| GRC cannot create intake | **PASS.** `POST /tprm/intakes` 403. Wave 1 persona lock preserved. |
| Vendor cannot see IRA | **PASS.** Vendor/unauthenticated IRA and Tier Review 401. Browser `/vendor-assessment` remains the invitation-code activate page. |
| No workspace switcher | **PASS.** GRC nav is Home / Third Parties / Intake / My Work / Onboard / Assessments / Findings / Decisions. |
| Wave 3 not started | **PASS.** Due-diligence scoping was not invoked. |
| #23 Insurance | **PASS.** `POST /insurance/activate` 201. |
| Finding Workspace | **PASS.** Findings list 200. |

Automation-browser webfonts add combining marks. Use `results.json` as the text source of truth.

## Responsive

GRC Intake and empty Tier Review route: 375 / 768 / 1024 / 1440 / 1920, no horizontal overflow.  
Requester IRA / clarification / Actions Required populated screens: **SKIP** (no requester-only session).

## Confirmations

#12 NOT PASS. Wave 1 accepted for current stage. Wave 2 implemented only. Wave 3 not started. Requester/GRC/Vendor persona isolation preserved. IRA belongs to Engagement. Vendor cannot see IRA. Version 3 deterministic scoring preserved. Original IRA answers are immutable. Clarification history preserved. Tier override requires rationale. #23 preserved. `main` not merged. Production untouched. Commercial GO not declared.
