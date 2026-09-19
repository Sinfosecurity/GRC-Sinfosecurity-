# #12 Wave 3 hosted evidence

**Item:** Engagement due diligence + vendor assessment + evidence + specialist review  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `68c327dfecbf23fac67a159d3afa724f246e615d`  
**Implementation SHA:** `7132c7e09de66bb6a6917d70eb7f9f4958006190`  
**Evidence / hosted SHA:** `680b40f0593d9c8c1e8f9339aa03322267a6f898`  
**Wave 2 implementation:** `c47020a86feeb0b5b67bc408671159e68d8f2c26`  
**Status:** IMPLEMENTED — READY FOR PRODUCT LEADERSHIP REVIEW  
**#12:** NOT PASS  
**Wave 4:** NOT STARTED  
**Production:** untouched  
**main:** not merged  

## Remote / CI

CI https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35442535799 PASS on `680b40f`  
Backend typecheck, full tests, Prisma validate, migration deploy, frontend typecheck, frontend tests, production build, public-build safety, and secret scan passed.

## Hosted runtime

Frontend `https://supreme-risk-staging.onrender.com/version.json` `680b40f0593d9c8c1e8f9339aa03322267a6f898`  
API `https://supreme-risk-staging-api.onrender.com/health` `680b40f0593d9c8c1e8f9339aa03322267a6f898`  
Postgres up. Malware CONNECTED. Staging only. Production untouched.

## Local / CI proofs

Confirmed tier generates an Engagement-owned plan. Unconfirmed tier cannot generate or send. Two Microsoft engagements receive different packs, assessment IDs, and due dates on one Third Party master. Pack exclusion requires rationale. Catalog is pinned on send. 4a email queues. 4b copy does not mark sent. Mark as sent moves the Engagement to `AWAITING_VENDOR`. Vendor activation is engagement-scoped. Vendor cannot see IRA or Tier Review. Wave 3 submit does not create authoritative findings and does not recalculate residual risk. Specialist review completes without Wave 4.

## Hosted golden walk

| Check | Result |
| --- | --- |
| Hosted SHA | **PASS.** Frontend and API both `680b40f`. |
| Postgres / malware | **PASS.** |
| Populated Microsoft Azure walk | **SKIP.** Invite `delivery=sent` still does not return an activation token. CI remains the authoritative populated proof. |
| 4B copy / mark shared | **SKIP.** Same invitation-token limitation. |
| Hosted vendor session | **SKIP.** No hosted vendor token obtained. Auth was not weakened. |
| GRC denied Requester Workspace | **PASS.** `/request` → unauthorized. Requester APIs 403. |
| GRC cannot create intake | **PASS.** `POST /tprm/intakes` 403. |
| Vendor cannot see IRA / Tier / DD | **PASS.** 401. |
| Assessment Center / DD / Review routes | **PASS.** |
| Wave 4 not started | **PASS.** |
| #23 Insurance | **PASS.** `POST /insurance/activate` 201. |
| Finding Workspace | **PASS.** Findings list 200. |

Responsive: Due-Diligence Plan, Assessments, Vendor activate, Specialist Review at 375 / 768 / 1024 / 1440 / 1920, no horizontal overflow.

## Confirmations

#12 NOT PASS. Wave 1 accepted. Wave 2 accepted. Wave 3 only implemented. Wave 4 not started. Third Party ≠ Engagement. Assessment belongs to Engagement. Requester cannot see vendor workspace. Vendor cannot see requester IRA or Tier Review. Evidence uses Shared Evidence. Malware policy unchanged. No authoritative Findings in Wave 3. No residual risk in Wave 3. #23 preserved. `main` not merged. Production untouched. Commercial GO not declared.
