# Sprint 2 — Authoritative Risk Scoring & Tier Integrity (C-1 / H-3)

Engineering evidence only. Product Leadership decides finding closure.

**Starting SHA:** `a158c5afe7b2e3866388a49847beb3b881c0de85`  
**Implementation SHA:** `94ed9821c82df65788546210e7076a4943c1e830`  
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
| Legacy `createVendor` | Floor-gated. Client inherent/residual are not accepted. Inherent is derived only until canonical intake exists. |
| Legacy `updateVendor` | Client inherent/residual stripped. If a `VendorOnboarding` row exists, `tier` is **409** — confirm/override only. Legacy vendors without onboarding remain floor-gated. |
| Assessment complete / reviewed DD | Recalculate. |
| Finding close | Recalculate (legitimate finding change). |
| Risk accept | Does not remove finding points. |

## Tier writers

| Path | After |
| --- | --- |
| Request/create placeholder | MEDIUM until intake. Not used as inherent. |
| Intake complete | `Vendor.tier = recommendedTier` (floors already applied). |
| Analyst confirm / override | `assertTierMeetsFloor`. Below-floor **409**. Reason required for override. |
| Legacy PUT (onboarding exists) | **409** — ordinary updates cannot change the authoritative tier. |
| Legacy PUT (no onboarding) | `applyHardFloorToTier`. Below-floor **409**. |
| Import / bulk assign | Schema exists; no mounted import writer found. Not applicable. |
| Recovery populate | Offline seed only. |

Chosen placeholder approach: keep required `Vendor.tier = MEDIUM` before intake. After intake, `Vendor.tier` is the recommended (then confirmed) tier. The engine uses `authoritativeInherent` from IR-01–IR-15, never the placeholder.

Below-floor override model: **prohibited** on ordinary routes. `confirmTier` with `overrideTier` still requires a reason, but a below-floor override is **409**. No second approver (H-7 out of scope).

## Tests

- `independent-review-c1-h3.scoring.test.ts`
- `vendor-tier-integrity.test.ts`
- Engine monotonicity / no fabricated CE
- Phase C residual-neutrality updated off the old hardcoded `42`
- Sprint 1 C-2/H-1 isolation still PASS

## C-1 matrix (methodology `supreme-risk-1.2.0`)

Derived, not hardcoded: Yes → score 9/10 (CE 90); No → score 2/10 (CE 20); residual = `round(inherent × (1 − CE/140))`. Hosted pre-control values match intake inherent.

| Case | Inherent | Residual after eligible Yes/No | Tier |
| --- | ---: | ---: | --- |
| A Low / Strong | 25 | 9 | LOW |
| B Low / Weak | 25 | 21 | LOW |
| C High / Strong | 90 | 32 | CRITICAL |
| D High / Weak | 90 | 77 | CRITICAL |
| E Critical-floor / Strong | 80 | 29 | CRITICAL |
| F Critical-floor / Weak | 80 | 69 | CRITICAL |

Monotonicity: A residual ≤ B; C residual ≤ D; higher inherent does not invent control credit. E/F remain CRITICAL.

## Hosted evidence (fresh vendors, 2026-09-16)

**Expected /health SHA:** `94ed9821c82df65788546210e7076a4943c1e830`  
**Actual /health SHA:** `94ed9821c82df65788546210e7076a4943c1e830`  
**Match:** YES  
**Health:** degraded — `mongodb` and `ai` `NOT_CONFIGURED`. postgres, redis, storage, email, stripe, malware, automation up.  
**Hosted frontend `version.json`:** `94ed9821c82df65788546210e7076a4943c1e830`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35042991803 PASS on `94ed982` — backend 89 suites / 445 tests; frontend 56 files / 174 tests.

Fresh org vendors `VND-2026-0001` Low, `VND-2026-0002` High, `VND-2026-0003` Floor:

| Proof | Result |
| --- | --- |
| Different intake inherent | Low 25 / High 90 / Floor 80. Not collapsed to 43. |
| Pre-control residual | Equals inherent. CE 0. Intake is not the control source. |
| Hard floor confirm LOW | 409 |
| Confirm CRITICAL | 200. Confirmed Critical. Vendor.tier CRITICAL. |
| Legacy/client tier or forged scores | 409. High remains CRITICAL / 90 / 90. |
| Register = workspace | Low 25/25 Low; High 90/90 Critical; Floor 80/80 Critical. |
| Critical KPI | `summary.criticalVendors` 2 and `tierCounts.CRITICAL` 2 (High + Floor). |
| Score history / explanation | 200. Version `supreme-risk-1.2.0`. |
| Risk acceptance | Residual 98 with HIGH finding → accept → 98. |
| Approval brief | Generated residual 98; decide APPROVE 98; later recalc leaves brief 98. |
| Scorecard PDF | 403 on signup (advancedReporting entitlement). Structured `/tprm/.../risk-explanation` matches residual. |

## Remaining limitations

- Hosted scorecard PDF is entitlement-gated; register, workspace, and risk-explanation are the customer-facing score surfaces proved here.
- Full vendor-pack due-diligence UI journey was not re-run on staging; reviewed VENDOR-plane control selection is covered by CI.
- Import/bulk tier writer remains unmounted.
- H-2 and H-4–H-7 were not changed.

Cursor does not close C-1 or H-3. Product Leadership decides.
