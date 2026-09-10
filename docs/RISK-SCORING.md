# Risk scoring

Implementation: `backend/src/services/deterministicRiskEngine.ts`  
Version: `supreme-risk-1.0.0`

Inputs: question scores/weights, control maturity, vendor criticality, data sensitivity, regulatory scope, subcontractors, open findings, monitoring events, compensating controls, risk acceptance.

Outputs: inherent risk, control effectiveness, residual risk, risk band, explanation, **named factors**, inputs used, timestamp, score version.

Identical inputs produce identical numeric results. `Math.random` is not used.

Factors are grouped as inherent, control, and residual adjustments. They explain the score; they do not change the formula.

Persisted on assessment completion and vendor recalculation as `ScoreCalculation` (including `factors`) and vendor inherent/residual fields.

Read API: `GET /api/v1/tprm/vendors/:id/risk-explanation`  
History: `GET /api/v1/tprm/vendors/:id/score-history`
