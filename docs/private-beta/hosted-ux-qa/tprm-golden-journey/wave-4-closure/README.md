# #12 Wave 4 closure — navigation + workflow consistency

**Item:** Golden Journey Engagement operating center  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `54c896d4136de2885f03bb768339ba71699adf95`  
**Status:** IMPLEMENTED — WAVE 4 CLOSURE READY FOR PRODUCT LEADERSHIP REVIEW  
**Wave 4 accepted:** NO  
**#12:** NOT PASS  
**Wave 5:** NOT STARTED  
**Production:** untouched  
**main:** not merged  

Implementation SHA, hosted SHAs, and CI run are recorded in `results.json` after hosted CI and the staging walk.

## What changed

The GRC Work navigation is now:

Home · Intake · My Work · Third Parties · Engagements · Assessments · Findings · Decisions

`Onboard` is no longer a primary Golden Journey destination. `/engagements` lists Golden Journey Engagements. Opening an Engagement opens a tabbed operating center:

Overview · Inherent Risk · Due Diligence · Evidence · Findings · Controls · Residual Risk · Decisions · History

Legacy `/vendor-onboarding/:id` deep links resolve to the corresponding Engagement when one exists. If none exists, the historical onboarding workspace remains read-compatible. An Engagement is not manufactured to satisfy navigation.

## Defects closed

| Defect | Correction |
| --- | --- |
| Primary nav still said Onboard | Replaced with Engagements. Routes audited. Not a rename. |
| Negative answer auto-created Finding Candidates | Seed now returns review signals only. A candidate requires specialist judgment. |
| Compensating-control retry duplicated a row | Request `idempotencyKey` + unique `(organizationId, engagementId, idempotencyKey)`. |
| Specialist copy said review complete while state was VENDOR_SUBMITTED | Next-action copy derives from authoritative Engagement status. Completing all specialist reviews advances to FINDING_REVIEW. |

## Compatibility

See `COMPATIBILITY.md`.

## Hosted walk

Staging only. Walk A–F is recorded in `results.json` after deploy.

Do not start Wave 5. Do not merge `main`. Do not deploy production.
