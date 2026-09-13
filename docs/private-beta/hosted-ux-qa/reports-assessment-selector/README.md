# Hosted #12 Reports assessment selector

Captured from live staging on 2026-09-13. These are not mocks.

**URL:** https://supreme-risk-staging.onrender.com/reports  
**API:** https://supreme-risk-staging-api.onrender.com  
**Frontend SHA:** `7bf040af813012e8b807cf0df861ecd932690610`  
**API SHA:** `8a3d8fc4af0ba5d868b3410641940e19921ed799`  
**Tenant:** Elite Claims (`05d7821b-cab1-44af-9f5c-1f528a2d0a0e`)  
**Vendor:** Supreme Investigation (`2afc74ad-a4e0-4a34-a2c4-40e88af5d376`)  
**Role:** Organization Admin  
**Capture date:** 2026-09-13

#12 remains **PARTIAL — PRODUCT LEADERSHIP REVIEW REQUIRED**. Cursor does not declare PASS. #15 was not started. Commercial production remains NO-GO.

The first hosted re-test after Product Leadership’s screenshot still showed the defect because **no Reports selector remediation had ever been committed**. Prior local work was reverted. Hosted frontend at that time was `ce5d01c` / API `915ac55`.

## Hosted CI

https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34767752358 — PASS on `7bf040a`  
https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34768157122 — PASS on `8a3d8fc`

## Assessment inventory (Elite Claims / Supreme Investigation)

`VendorAssessment` has no `createdBy` and no cycle field. `assignedTo` is null on every row. Cycle numbers were not invented. UUIDs are not used as labels.

**TOTAL ASSESSMENTS:** 23  
**LEGITIMATE HISTORY:** 17  
**ACCIDENTAL DUPLICATES:** 6 unused `NOT_STARTED` leftovers of a template that already had COMPLETED or IN_PROGRESS

Classification: **C — mixture**. Most lookalike rows were different questionnaires created by Assessment Center multi-select, all stored as `INITIAL_DUE_DILIGENCE`. The UI previously rendered only vendor name + raw enum.

### Cancelled (not deleted)

Unused same-template leftovers, status set to `CANCELLED` on 2026-09-13:

| assessmentId | template | reason |
|---|---|---|
| `8e1823cd-164c-43a8-820b-fc56f91e6e90` | Supreme Risk Standard Due Diligence | leftover of completed `0ee7fd1f` |
| `d8346c4d-a606-42b9-a0f4-478f04125afc` | CMMC Readiness Assessment | leftover of completed `cd14c4ad` |
| `82199221-c684-4bf2-8a22-eb6fd062caf9` | CMMC Readiness Assessment | leftover of completed `cd14c4ad` |
| `8ebc09b4-2994-40c8-b476-a607386a75ed` | CMMC Readiness Assessment | leftover of completed `cd14c4ad` |
| `2ce23392-9b67-4ed5-b150-09927d0b709b` | Inherent Risk Questionnaire | leftover of completed `7acce8cb` |
| `b5b08028-2f1d-4618-9ef9-4e8ddaa7a0a6` | Information Security Assessment | leftover of in-progress `b1a2971f` |

### Retained

All completed and in-progress rows, including SOC 2 in-progress `771ca609` and later completed `663dfd9e`. Unique unused questionnaires from the 04:32 multi-start remain `NOT_STARTED` and appear under Other assessments.

## Duplicate creation

`createAssessment` had no idempotency. Re-starts of the same vendor + type + template created extra `NOT_STARTED` rows. Server now returns 409 when an open (not COMPLETED / CANCELLED) row already exists for that tuple. Completed reassessments remain allowed. Different templates remain allowed.

## Screenshots

| File | What |
|---|---|
| `selector-1440.png` | Current assessment + collapsed history after selecting Supreme Investigation |
| `selector-history-expanded-1440.png` | Other assessments expanded |
| `reports-after-generate-1440.png` | After Executive / Scorecard / Assessment PDF generation |

## Reports generated

Executive, Vendor Scorecard, and Assessment PDFs downloaded from the hosted Elite Claims session. Assessment report used completed SOC 2 Evidence / Assurance Review (`663dfd9e`). Cross-tenant: `demo-org-001` received an empty vendor assessment list and 404 for Elite assessment/scorecard IDs.
