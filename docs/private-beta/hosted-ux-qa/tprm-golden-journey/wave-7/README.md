# #12 Wave 7 — periodic + event-driven reassessment

**Item:** Golden Journey Engagement reassessment  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** Wave 6 accepted `2d8fe29a8e5ece972e0d2020ee25c474a2ecde91` / evidence `7f8127893d142d0d52221c9b7dbd21d830f07d4b`  
**Implementation SHA:** `7afd0d5c08a64667f592831509338ab74cf9a7b3`  
**Hosted SHA:** API and frontend `7afd0d5c08a64667f592831509338ab74cf9a7b3`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35674087083 PASS  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**Waves 1–6 accepted:** YES for current stage  
**Wave 7 accepted:** NO  
**Wave 8:** NOT STARTED  
**#12:** NOT PASS  
**Production:** untouched  
**main:** not merged  

## Architecture

Third Party ≠ Engagement. Reassessment belongs to the Engagement and is a new versioned cycle. Cycle 1 historical residual remains inspectable. Cycle 2 writes a new residual row and never rewrites MEDIUM 58. Old acceptance does not automatically apply. One active cycle per Engagement. Azure reassessment does not reassess Microsoft 365. The Engagement stays ACTIVE. Vendor refresh is invitation-only and is not a full questionnaire resend. Signal ≠ Finding. Question ≠ Finding. Specialist authority remains human. Version 3 IRA methodology is reused. No new scoring mathematics. Wave 8 termination/offboarding is not started.

## Hosted golden walk

Staging only. Authenticated API walk + UI/responsive/a11y walk. See `results.json` and `screenshots/`.

| Check | Result |
| --- | --- |
| Hosted environment | staging |
| Azure Cycle 1 residual before | MEDIUM 58 |
| Targeted reassessment started | 201 |
| Delta dispositions | REUSE and REFRESH present; UI also exposes NEW and NOT REQUIRED |
| Azure still ACTIVE during cycle | PASS |
| Historical residual unchanged | MEDIUM 58, `reassessmentId` null on Cycle 1 |
| New residual does not rewrite 58 | PASS |
| Azure ACTIVE after new residual | PASS |
| Microsoft 365 not reassessed | no active cycle |
| Requester cannot start | 403 |
| Requester business context | API limited payload; GRC shell Access Denied; Actions Required collects the update |
| Unauthenticated | 401 |
| Wave 8 start blocked | 409 |
| Decision CONTINUE_MONITORING | PASS |
| Returned to monitoring | Azure ACTIVE, no open cycle, `wave8Started=false` |
| Responsive 375–1920 | no overflow |
| Accessibility | labelled controls, headings, visible focus |

## Defects found and fixed during implementation

1. Residual confirmation on an already-ACTIVE Engagement no longer demotes the Engagement to Treatment Review.
2. Any `startWave8` flag is rejected. Termination recommended is recorded only.
3. Wave 6 next-action assertion now points at Start reassessment because Wave 7 exists.
4. Requester business-context update lives in Requester Workspace, not the GRC shell.

## Wave 8 honesty

CONTINUE MONITORING, FURTHER TREATMENT REQUIRED, and TERMINATION RECOMMENDED can be recorded. Termination, offboarding, access revocation, data return/deletion, contract termination, and final vendor disposition are not implemented.
