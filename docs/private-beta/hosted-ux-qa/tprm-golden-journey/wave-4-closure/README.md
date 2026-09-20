# #12 Wave 4 closure — navigation + workflow consistency

**Item:** Golden Journey Engagement operating center  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `54c896d4136de2885f03bb768339ba71699adf95`  
**Implementation SHA:** `1bece45cb94de832ef40b3d811977a179058f15b`  
**Hosted frontend SHA:** `1bece45cb94de832ef40b3d811977a179058f15b`  
**Hosted API SHA:** `1bece45cb94de832ef40b3d811977a179058f15b`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35476657309 PASS  
**Status:** IMPLEMENTED — WAVE 4 CLOSURE READY FOR PRODUCT LEADERSHIP REVIEW  
**Wave 4 accepted:** NO  
**#12:** NOT PASS  
**Wave 5:** NOT STARTED  
**Production:** untouched  
**main:** not merged  

## What changed

The GRC Work navigation is now:

Home · Intake · My Work · Third Parties · Engagements · Assessments · Findings · Decisions

`Onboard` is no longer a primary Golden Journey destination. `/engagements` lists Golden Journey Engagements. Opening an Engagement opens a tabbed operating center:

Overview · Inherent Risk · Due Diligence · Evidence · Findings · Controls · Residual Risk · Decisions · History

Legacy `/vendor-onboarding/:id` deep links resolve to the corresponding Engagement when one exists. If more than one exists, the user chooses. If none exists, the historical onboarding workspace remains read-compatible. An Engagement is not manufactured to satisfy navigation.

## Defects closed

| Defect | Correction |
| --- | --- |
| Primary nav still said Onboard | Replaced with Engagements. Routes audited. Not a rename. |
| Negative answer auto-created Finding Candidates | Seed now returns review signals only. A candidate requires specialist judgment. Hosted Azure leftover drafts are classified as review signals (`created: 0`). |
| Compensating-control retry duplicated a row | Request `idempotencyKey` + unique `(organizationId, engagementId, idempotencyKey)`. |
| Specialist copy said review complete while state was VENDOR_SUBMITTED | Next-action copy derives from authoritative Engagement status. Completing all specialist reviews advances to FINDING_REVIEW. |

## Hosted walk A–F

Staging only. See `results.json`.

| Walk | Result |
| --- | --- |
| A. TPRM Lead navigation | **PASS.** New Work nav. No primary Onboard. Intake, Third Parties, Engagements open. |
| B. TPRM Analyst | **PASS.** Analyst login. Same GRC Work nav. Assigned Azure Engagement next action is residual review. Wave 5 not started. |
| C. Azure Hosting QA | **PASS.** All nine workspace tabs. Overview answers WHAT/WHY/SOURCE/STATE/OWNER/IMPACT/EVIDENCE/RELATIONSHIPS/NEXT ACTION/HISTORY. Residual MEDIUM. |
| D. Microsoft 365 Collaboration QA | **PASS.** Separate context. Residual Not calculated. Next action Confirm Due-Diligence Plan. |
| E. Requester | **PASS.** Requester Workspace only. `/engagements/:id` → `/unauthorized`. GRC list APIs 403. |
| F. Vendor | **PASS.** Activate workspace only. No GRC nav. Invitation-only. No Vendor User. |

## Compatibility

See `COMPATIBILITY.md`.

Do not start Wave 5. Do not merge `main`. Do not deploy production.
