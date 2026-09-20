# #12 Wave 5 — treatment, acceptance, contract gate, activation

**Item:** Golden Journey Engagement decision path  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `1bece45cb94de832ef40b3d811977a179058f15b`  
**Implementation SHA:** `88938c263d741365578e874599156096fe5d6276`  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**Wave 4 accepted:** YES for current stage  
**Wave 5 accepted:** NO  
**Wave 6:** NOT STARTED  
**#12:** NOT PASS  
**Production:** untouched  
**main:** not merged  

## Architecture

Third Party ≠ Engagement. Every Wave 5 record is Engagement-scoped. Risk acceptance does not lower Residual Risk. Approval authority is existing RBAC capability (`risk.treat` / `risk.accept` / `approval.decide` / `engagement.activate`), not invented job-title thresholds. Self-approval is denied by default.

## Hosted walk

Staging only. See `results.json` after the walk.

1. Open Azure Hosting QA Engagement  
2. Verify Wave 4 Residual Risk  
3. Decisions tab  
4. Select Treatment  
5. Record rationale  
6. Exercise Acceptance if applicable  
7. Authorized approver decides  
8. Confirm residual unchanged  
9. Add a requirement sourced from a recorded Finding  
10. Evaluate gate and observe blockers  
11. Activation while blocked → DENY  
12. Resolve blocker → gate APPROVED  
13. Explicit activate → Engagement ACTIVE  
14. Microsoft 365 remains independent  
15. Requester / Vendor denied internal decisions  
16. Decision Brief immutable  
17. Next action: Monitoring setup pending Wave 6  
