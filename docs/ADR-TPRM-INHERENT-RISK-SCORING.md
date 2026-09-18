# ADR — Inherent-risk scoring (Version 3)

**ADR ID:** ADR-TPRM-INHERENT-RISK-SCORING  
**Status:** ACCEPTED — Product Leadership 2026-09-18  
**Does not replace:** ADR-0001 residual scorer  
**Does not change:** Vendor-plane invitation rules in ADR-TPRM-VENDOR-ACCESS

## Decision

Inherent risk is scored from the requester IRA (Part A facts + Part B impact) by weighted points and direct-to-tier floors. This replaces the workbook equal-weight Low=1 / Moderate=2 / High or Unknown=3 average for new engagements.

Existing engagements keep their recorded score until the next reassessment.

## Rules

- Weights: IR-01, IR-02, IR-04, IR-08 = 3; IR-03, IR-05, IR-07, IR-12, IR-15 = 2; remaining = 1.
- Points 0 / 1 / 2 from Appendix A of `docs/tprm/TPRM_Onboarding_Flow_Instructions.pdf`.
- Score = Σ(points × weight) ÷ Σ(2 × weight). Bands: <20% Low, <40% Medium, <65% High, ≥65% Critical.
- Any Don't know → no tier is shown or stored.
- Floors: personal data → Medium; personal data over 100,000 records → High; card/health/credentials/regulated or admin/network or stop-within-a-day → Critical; regulatory obligation, write-API, or material financial loss → High.
- SecurityScorecard below B (<80) or BitSight below 650 raises one tier. Apply bump, then auto-confirm.
- Auto-confirm Low only when: no unknowns, no floor, current rating ≤90 days, A8 is not Yes, no override.
- Residual risk stays ADR-0001 / workbook (Yes 0, Partial 2×w, No 4×w).
