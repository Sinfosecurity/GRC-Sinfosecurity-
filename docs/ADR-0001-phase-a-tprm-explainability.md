# ADR-0001 Phase A TPRM explainability

Status: accepted  
Date: 2026-09-10

## Decision

Keep the existing deterministic vendor risk function as the only authoritative scorer. Add a structured `factors[]` payload that explains the same numbers. Persist factors on `ScoreCalculation`. Introduce `RiskDecisionBrief` as an auditable human decision record. AI may summarize; AI never writes residual risk.

## Why

Supreme Risk differentiates on explainable third-party decisions. Rebuilding GRC from scratch would destroy a working TPRM domain model. A modular-monolith `/api/v1/tprm` surface can grow without isolating duplicate vendor records.

## Consequences

- Historical numeric scores for `supreme-risk-1.0.0` remain stored as written. New calculations use `supreme-risk-1.1.0`, which does not treat risk acceptance as a score input.
- Org-admin methodology editing is NEXT, not CURRENT.
- Decision briefs that are `DECIDED` are immutable; a new draft supersedes older drafts.
