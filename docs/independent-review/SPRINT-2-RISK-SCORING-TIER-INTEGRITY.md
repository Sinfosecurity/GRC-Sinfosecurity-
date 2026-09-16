# Sprint 2 — Authoritative Risk Scoring & Tier Integrity (C-1 / H-3)

Engineering evidence only. Product Leadership decides finding closure.

**Starting SHA:** `a158c5afe7b2e3866388a49847beb3b881c0de85`  
**Scope:** C-1 and H-3 only. H-2 and H-4–H-7 were not changed.  
**Migration:** NONE

## C-1 root cause (verified in code)

Confirmed. The reviewer’s path still held at `a158c5a`:

1. Canonical request created `Vendor.tier = MEDIUM` because the schema requires a tier before intake (`vendorOnboardingService.requestVendor`).
2. `completeIntake` wrote IR-01–IR-15 `inherentRisk` onto the vendor, marked the **intake** assessment `COMPLETED` with `overallScore = inherentRisk`, then called `explainableRiskService.recalculate()`.
3. `recalculate` fed `deterministicRiskEngine` `vendor.tier` (still MEDIUM until confirm) and took the latest `COMPLETED` assessment — the intake — as the control source. `controlMaturity = round(overallScore / 20)` turned exposure into control credit.
4. `confirmTier` wrote `Vendor.tier` but did not recalculate. Vendor-pack assessments stayed `PENDING_REVIEW`, so due-diligence answers never became the control source.
5. Default engine control effectiveness was **50** when no question scores existed, so pre-control residual was not inherent.

Placeholder tier involved: **YES**  
Intake selected as control assessment: **YES**  
Intake score used as control effectiveness: **YES**  
Due-diligence authoritative before: **NO**

## H-3 root cause (verified in code)

Hard floors existed only in `recommendTierFromIntake`. `confirmTier` accepted any `overrideTier` with a reason. Legacy `createVendor` / `updateVendor` persisted client `tier` with no floor. Register KPI read `tierDistribution.Critical` while the API returned an array.

## After pipeline

| Question | Authoritative source |
| --- | --- |
| Inherent | Canonical IR-01–IR-15 via `recommendTierFromIntake`. Engine `authoritativeInherent` — not reconstructed from placeholder MEDIUM. |
| Tier | Recommended at intake (already floor-applied) → analyst confirm/override → `Vendor.tier`. Same field for register, workspace, KPI, reports. |
| Hard floors | Privileged access, cardholder/PCI, PHI. Enforced in `vendorTierIntegrity` at persist. Ordinary below-floor write is **409**. No second approver (H-7 out of scope). |
| Control effectiveness | Completed `VENDOR`-plane or reassessment assessments only. Yes/Partial/No. N/A and Not Answered excluded. |
| Residual | Engine haircut on authoritative inherent. No eligible controls → residual = inherent (CE = 0). |
| Workbook control-gap | `workbookControlGap` only. Not residual. |
| Risk acceptance | Governance disposition. `RISK_ACCEPTED` findings still count in residual. Acceptance does not lower the score. |
| Approval residual | `residualAtApproval` copies the current `ScoreCalculation.residualRisk` at decide time. Not rewritten later. |

**Methodology version:** `supreme-risk-1.2.0`  
**Changed:** YES — pre-control default CE 50 → 0; inherent from intake; control source classified. Historical `1.1.0` rows are not rewritten.

Placeholder MEDIUM remains only **before intake** because `Vendor.tier` is required. It is not an engine input after intake writes the recommended/confirmed tier.

## Assessment purpose

| Purpose | Role |
| --- | --- |
| Intake (`onboarding.intakeAssessmentId`) | Inherent facts only. Never control credit. |
| Due diligence (`respondentPlane = VENDOR`) | Control effectiveness after analyst review marks it `COMPLETED`. |
| Reassessment (annual / triggered / incident / renewal / continuous / fourth-party) | Eligible control source when `COMPLETED`. |
| Other | Not used for residual. |

Latest COMPLETED used blindly: **NO**

Vendor submit stays `PENDING_REVIEW` and does **not** grant control credit. `promoteReviewedControlAssessments` runs when draft findings are cleared or when review finds no exceptions.

## Score writers

| Writer | After |
| --- | --- |
| `explainableRiskService.persistVendorScore` | Retained. Tenant-scoped `updateMany(id+org)`. Creates a new `ScoreCalculation`. |
| `completeIntake` | Writes intake inherent, recommended tier, then recalculate. |
| `confirmTier` | Floor-gated persist + recalculate. |
| Legacy `createVendor` / `updateVendor` | Floor-gated; recalculate on tier change. |
| Assessment complete / reviewed DD | Recalculate. |
| Finding close | Recalculate (legitimate finding change). |
| Risk accept | Does not remove finding points. |

## Tier writers

| Path | After |
| --- | --- |
| Request/create placeholder | MEDIUM until intake. Not used as inherent. |
| Intake complete | `Vendor.tier = recommendedTier` (floors already applied). |
| Analyst confirm / override | `assertTierMeetsFloor`. Below-floor **409**. Reason required for override. |
| Legacy PUT/POST | `applyHardFloorToTier`. |
| Import / bulk assign | Schema exists; no mounted import writer found. Not applicable. |
| Recovery populate | Offline seed only. |

## Tests

- `independent-review-c1-h3.scoring.test.ts`
- `vendor-tier-integrity.test.ts`
- Engine monotonicity / no fabricated CE
- Phase C residual-neutrality updated off the old hardcoded `42`
- Sprint 1 C-2/H-1 isolation still PASS
