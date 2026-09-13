# #12 Risk Scoring Methodology workspace

**Item:** #12 parallel UX remediation  
**Branch:** `supreme-risk-transformation`  
**Status:** PARTIAL / PRODUCT LEADERSHIP REVIEW REQUIRED  
**#14:** unchanged by this work; remains PARTIAL  
**#15:** NOT AUTHORIZED  
**Commercial production:** NO-GO

This is not #12 PASS.

## Product record

| Field | Value |
|---|---|
| RAW JSON SCORING EDITOR | REMOVED |
| RISK METHODOLOGY WORKSPACE | IMPLEMENTED |
| HOSTED PRODUCT LEADERSHIP ACCEPTANCE | PENDING |

The customer-facing raw JSON “Advanced scoring weights” editor is gone. Assessment Library now hosts a governed **Risk Scoring Methodology** workspace.

## Preserved

- `deterministicRiskEngine` formula and `supreme-risk-1.1.0` engine version
- Default weights and residual rating bands (Critical ≥80, High ≥60, Medium ≥40, Low below 40)
- `ScoreCalculation` historical records
- Immutable published `ScoringMethodology` rows
- Existing `PUT /tprm/scoring-methodology` publish contract
- Additive only: `POST /tprm/scoring-methodology/draft` (audit) and `POST /tprm/scoring-methodology/preview` (no writes)

## Customer workspace

- Engine version, active version, draft status, and Supreme-default difference
- Risk rating thresholds shown as the engine bands (not independently moved)
- Risk factors: criticality, data sensitivity, regulatory exposure, fourth-party dependency, findings by severity, monitoring events, compensating controls
- Each factor shows a label, current weighting, effect on risk, and customer-safe explanation
- Save draft, discard draft, restore Supreme default (draft only), load previous version as a new draft, preview, publish
- Publish requires name + rationale and a confirmation that historical scores are not rewritten

## Preview

Preview recalculates residual **bands** for current tenant vendors with the draft weights using the same inputs as a live recalculation. It does not call `persistVendorScore` and does not write `ScoreCalculation` or vendor residual fields.

## Authorization

`GET` requires `risk.read`. Draft, preview, and publish require `questionnaire.manage`. Assessor and Viewer do not receive that permission.

## Audit

| Action | Event |
|---|---|
| Draft saved | `scoring_methodology.draft_update` |
| Supreme default restored to draft | `scoring_methodology.draft_restore_default` |
| Historical version loaded as draft | `scoring_methodology.draft_load_version` |
| Draft discarded | `scoring_methodology.draft_discard` |
| Methodology published | `scoring_methodology.publish` |

Actor, organization, version, and timestamp are recorded. No secrets.

## Do not

Do not mark #12 PASS from this file. Do not change #14 to PASS. Do not start #15. Do not merge `main` or deploy commercial production.
