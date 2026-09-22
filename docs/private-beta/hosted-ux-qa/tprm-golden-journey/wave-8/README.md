# #12 Wave 8 — termination + offboarding + final disposition

**Item:** Golden Journey Engagement termination, offboarding, and final disposition  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** Wave 7 accepted `7afd0d5c08a64667f592831509338ab74cf9a7b3` / evidence `598bddfe18c851fbd62a4a6b2cf2c37414bc5baf`  
**Implementation SHA:** `037b8e98dac360e12084bb0de8b66ee666036feb`  
**Hosted API SHA:** `6b7933ef415d32f58377012344cc68ded32ea36b`  
**Hosted frontend SHA:** `037b8e98dac360e12084bb0de8b66ee666036feb`  
**Lifecycle walk SHA:** `96765c47337ae8e4761c7085e5522a33c7ab5b8d`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35681630112 PASS  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**Waves 1–7 accepted:** YES for current stage  
**Wave 8 accepted:** NO  
**#12:** NOT PASS  
**Production:** untouched  
**main:** not merged  

## Architecture

Third Party ≠ Engagement. Offboarding belongs to the Engagement. Azure Hosting QA was closed to `OFFBOARDED`. Microsoft 365 Collaboration QA remained `DUE_DILIGENCE_PLANNING` and received no Azure access, deletion, contract, monitoring, or closure tasks. Historical Cycle 1 residual remains MEDIUM 58 (`435f528c`). Wave 7 reassessment history remains. Findings were retained, not auto-closed.

Final disposition is a bounded immutable `EngagementFinalDisposition` snapshot. `RiskDecisionBrief` is not reused because it is a residual/treatment decision document, not an offboarding close record.

Vendor-level `vendorOffboardService` remains readable and is not authoritative for one Engagement. Access revocation and data deletion are tracked with **Manual verification required**. No connected IAM or erasure integration claimed an action.

## Hosted golden walk

Staging only. Authenticated API walk + UI/responsive/a11y walk. See `results.json` and `screenshots/`.

| Check | Result |
| --- | --- |
| Hosted environment | staging |
| Azure Cycle 1 residual | MEDIUM 58, `reassessmentId` null |
| Termination decision | 201 explicit authorized case |
| Case cancellation | 200, Azure returned ACTIVE |
| Duplicate active case | 409 |
| Early closure | 409 exact blocker: Business transition is incomplete |
| Requester business task | 200, business-safe confirmation only |
| Analyst self-close | 403 You do not have permission to approve final closure |
| Gate ready | READY_FOR_CLOSURE |
| Authorized lead close | Azure OFFBOARDED |
| Monitoring | RETIRED, history retained |
| Microsoft 365 | DUE_DILIGENCE_PLANNING, no Azure tasks |
| Third Party aggregate | remains in use because M365 is still live |
| Closed case immutable | 409 new Engagement required |
| Requester isolation | limited payload; GRC shell Access Denied |
| Vendor / unauth | 401 |
| Responsive 375–1920 | no overflow |
| Accessibility | headings, blocker list, visible focus |

## Defects found and fixed during implementation

1. Completed cases originally dropped dispositions because only open cases were returned. The workspace now keeps the completed case inspectable.
2. Third Party aggregation originally counted only `ACTIVE`/`OFFBOARDING` siblings. M365 in Due Diligence Planning is still live and keeps the Third Party in use.
3. Closure gate is still shown after close so the exact evaluated blockers/readiness remain reviewable.

## Honesty

No CLM, IAM orchestration, or legal workflow engine was built. Vendor remains invitation-only. Requester sees assigned business-transition tasks only. Notifications are queued, not proved delivered. Retention shows Not configured unless a recorded policy exists. Cursor does not declare Wave 8 accepted or #12 PASS.
