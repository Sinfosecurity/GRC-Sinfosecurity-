# #12 Wave 4 hosted evidence

**Item:** Findings + control effectiveness + Engagement residual risk  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `627dfbcc3459ab4b718aaef25acbc9a0fbbcd9a8`  
**Wave 3 implementation:** `7132c7e09de66bb6a6917d70eb7f9f4958006190`  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**#12:** NOT PASS  
**Wave 5:** NOT STARTED  
**Production:** untouched  
**main:** not merged  

## Local / CI proofs

Candidate is not a finding until confirmed. Dismissal preserves history and does not count as open residual input. Confirmed findings are Engagement-owned. Two Microsoft engagements receive different CE judgments and different residual records. Unconfirmed inherent tier blocks residual. N/A requires rationale. NOT_ASSESSED does not become Effective. Closed findings exit the open-finding input after recalculation. Residual history is append-only. Requester and vendor sessions cannot read internal residual risk. Cross-tenant deny. Legacy Vendor residual is not written. No Accept Risk path for Golden Journey Engagement findings. No contract gate. No Engagement ACTIVE.

## Hosted golden walk

Recorded after staging deploy of the Wave 4 implementation SHA. Populated requester/vendor browser checks remain SKIP unless invitation-token policy changes. Authentication is not weakened.

| Check | Result |
| --- | --- |
| Candidate ≠ finding | **PASS** in CI |
| Confirm / dismiss | **PASS** in CI |
| Multi-engagement isolation | **PASS** in CI |
| Residual drill-down | **PASS** in frontend tests |
| Requester denial | **PASS** in CI |
| Vendor denial | **PASS** in CI |
| Wave 5 not started | **PASS** in CI |
| Hosted populated vendor walk | **SKIP** pending invitation token |
| Hosted requester residual denial | **SKIP** pending populated requester login |

## Confirmations

#12 NOT PASS. Wave 1 accepted. Wave 2 accepted. Wave 3 accepted. Wave 4 only implemented. Wave 5 not started. Third Party ≠ Engagement. Findings belong to Engagement context. Question ≠ Finding. Answer ≠ Finding. Control effectiveness is human-governed. Shared Controls reused. Shared Evidence reused. Residual risk belongs to Engagement. Confirmed Wave 2 inherent tier is the inherent source. Residual risk is deterministic and explainable. Legacy Vendor risk remains compatibility-only. No new risk acceptance. No contract gate. No Engagement ACTIVE transition. Requester/GRC/Vendor isolation preserved. #23 preserved. `main` not merged. Production untouched. Commercial GO not declared.
