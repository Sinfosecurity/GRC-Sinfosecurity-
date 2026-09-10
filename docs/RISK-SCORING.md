# Risk scoring

Implementation: `backend/src/services/deterministicRiskEngine.ts`  
Version: `supreme-risk-1.0.0`

Inputs: question scores/weights, control maturity, vendor criticality, data sensitivity, regulatory scope, subcontractors, open findings, monitoring events, compensating controls, risk acceptance.

Outputs: inherent risk, control effectiveness, residual risk, risk band, explanation, inputs used, timestamp, score version.

Identical inputs produce identical numeric results. `Math.random` is not used.

Persisted on assessment completion as `ScoreCalculation` and vendor inherent/residual fields.
