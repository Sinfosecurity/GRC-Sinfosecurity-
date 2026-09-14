# ADR — Supreme Third Party lifecycle closure (Phase C)

**ADR ID:** ADR-TPRM-PHASE-C-LIFECYCLE  
**Status:** ACCEPTED for #12 Automation Closure Phase C implementation  
**Date:** 2026-09-14  
**Production-ready claim:** NO  
**#12 overall:** PARTIAL / OPEN  
**Phase D polish / #19 / #20:** NOT AUTHORIZED

## Context

Phase A ends at a confirmed due-diligence plan. Phase B ends at analyst confirm / adjust / dismiss of draft findings. Product Leadership authorized Phase C to complete the remaining lifecycle on the existing Supreme Third Party product:

Analyst Review → Findings → Remediation → Risk Acceptance → Contract Review → Approval → Active → Monitoring → Reassessment → Offboarding

`docs/ADR-0001-phase-a-tprm-explainability.md` remains controlling: one residual scorer; acceptance must not auto-reduce residual.  
`docs/ADR-TPRM-VENDOR-ACCESS.md` remains controlling for the bounded `VENDOR` plane.  
`docs/ADR-IDENTITY-ADMIN-SUPPORT-ARCHITECTURE.md` remains controlling for customer and platform planes.

This ADR does not replace those decisions. It does not authorize a second TPRM product or the generic validator spec in `docs/tprm-validation-report.md`.

## Decision

1. **Orchestrate existing models.** Reuse `Vendor`, `VendorOnboarding`, `VendorIssue`, `StoredObject`, `RiskDecisionBrief`, `VendorContract`, `vendorOffboardService`, existing notifications, audit, and malware gates. Do not add a second findings, contract, or approval product.
2. **Additive onboarding fields only.** Phase C persists lifecycle state on `VendorOnboarding` (`contractChecklist`, approval, activation, reassessment cadence). No new authoritative tables.
3. **Close findings only with ready evidence.** Confirmed findings may be assigned, given a CAP and due date, validated, and closed only when remediation evidence is `CLEAN` and an analyst has validated.
4. **Risk acceptance is time-bounded and score-neutral.** Acceptance uses `RiskDecisionBrief` with `RISK_ACCEPTED`, rationale, conditions, and expiry of at most 12 months. It must not change the residual score.
5. **Contract attestation is tier- and plan-driven.** Required items (security addendum, breach, deletion/return, plus DPA/BAA/subprocessor/audit when triggered) are attested by a reviewer and recorded on `VendorContract` when one does not already exist.
6. **Approval is a human decision.** Approve, reject, or approve with conditions. The package is tier, inherent/residual, open findings, accepted risks, contract attestation, and owner. Open confirmed findings block approval.
7. **Activation is explicit.** Approved vendors move `PROPOSED → APPROVED → ACTIVE`. Supreme sets next review from tier cadence (Critical 90 / High 180 / Medium 365 / Low 730 days).
8. **Reassessment is targeted, not a duplicate product.** Recommendation uses previous answers, changed questions, expired evidence, new scope, and unresolved findings.
9. **Offboarding retains records.** Reuse `vendorOffboardService`. Evidence and history stay.
10. **Phase D polish is separate.** Functional workspace tabs are in scope. Premium visual redesign across A+B+C is not.

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Implement `docs/tprm-workflow.md` / validator spec | Different product; conflicts with accepted ADRs |
| New findings / contract / approval tables | Second TPRM product |
| Auto-reduce residual on acceptance | Conflicts with ADR-0001 |
| Vendor as tenant `User` | Conflicts with ADR-TPRM-VENDOR-ACCESS |

## Consequences

- Customer workspace continues through Active, monitoring, reassessment, and offboarding.
- #12 remains PARTIAL until Product Leadership accepts hosted Phase C evidence.
- Do not merge `main`, deploy commercial production, start #19 or #20, or declare #12 PASS from this ADR.
