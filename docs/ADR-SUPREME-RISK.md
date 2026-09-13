# ADR: Supreme Risk (Enterprise Risk Management)

**ADR ID:** ADR-SUPREME-RISK  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #15 Supreme Risk  
**Starting SHA:** `6bba23a2c85eea877441c16190a12f9be8402d58`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#13 status:** Product Leadership accepted  
**#14 status:** Product Leadership accepted  
**#16 authorized:** NO

## CONTEXT

Product Leadership authorized #15 on 2026-09-13. Supreme Third Party already has a deterministic vendor residual-risk engine (`ScoreCalculation`, `supreme-risk-1.1.0`). #13 stores relationship identity only. #14 owns common controls, tests, and CLEAN evidence reuse. Legacy `Risk`, `RiskAssessment`, `RiskControl`, `RiskAppetite`, and the quarantined `/risk-management` page are leftover GRC and are **not** this product.

Supreme Risk is the enterprise risk-management product of the Supreme Governance Platform. It is not a vendor score, and it is not a CRUD register.

## PROBLEM

Without a dedicated enterprise-risk plane, later work will either:

1. overload the TPRM formula with unrelated likelihood × impact concepts, or
2. revive leftover `Risk` rows that lack appetite, treatment, KRI, history, and graph integration.

Both would break explainability and the accepted #13/#14 authority model.

## DECISION

#15 introduces a **new authoritative enterprise-risk plane**. It does not replace `ScoreCalculation`, `RiskDecisionBrief`, `OrganizationControl`, `StoredObject`, or `GovernanceNode`.

| Concern | Authoritative store | #15 role |
|---|---|---|
| Vendor residual risk | `ScoreCalculation` + TPRM engine | Unchanged. Do not feed ERM scores into vendor residual |
| Vendor decisions | `RiskDecisionBrief` | Unchanged TPRM decisions |
| Common controls / tests | `OrganizationControl` / `OrganizationControlTest` | Linked, never copied |
| Evidence bytes / malware | `StoredObject` | Unchanged fail-closed CLEAN policy |
| Shared evidence reuse | `EvidenceGovernanceLink` | Shown through control links; not inferred |
| Graph identity | `GovernanceNode` / `GovernanceEdge` | Projection from ERM tables |
| Leftover `Risk` / `RiskAppetite` | Legacy tables | Not written by #15 |
| Enterprise risk | `EnterpriseRisk` | System of record |
| Enterprise methodology | `EnterpriseRiskMethodology` | Versioned 5×5 + dimension roll-up |
| Score history | `EnterpriseRiskScoreSnapshot` | Immutable calculation records |
| Appetite | `EnterpriseRiskAppetite` | Org / category / business unit |
| Treatment | `EnterpriseRiskTreatment` + actions | Plan only; not a score input |
| Acceptance / decisions | `EnterpriseRiskDecision` | Governance decision, not a scoring factor |
| KRIs | `EnterpriseRiskKri` + measurements | Deterministic threshold status |
| Events / history | `EnterpriseRiskEvent` / `EnterpriseRiskHistory` | Customer-language change log |

### Product principle

Know what matters. See what it affects. Act on what needs attention.

Acceptance never lowers residual risk. A treatment plan never lowers residual risk. Evidence never proves control effectiveness. Graph rows never become the system of record.

## RISK TAXONOMY

Canonical categories (reporting keys):

Strategic, Operational, Financial, Cybersecurity, Technology, Third Party, Privacy, Compliance, AI, Business Continuity, Reputational, Legal / Regulatory, People, Physical / Environmental.

Tenants may add custom categories (`EnterpriseRiskCustomCategory`). Canonical keys remain for portfolio reporting. Custom categories map to a canonical parent for aggregation.

Customer identifier is `RISK-00001` (per-tenant sequential). UUIDs are not the primary customer ID.

Structured statement guidance (optional, not forced):

Because of [CAUSE], there is a risk that [EVENT], resulting in [IMPACT].

## LIFECYCLE

`DRAFT` → `IDENTIFIED` → `ASSESSED` → `TREATING` | `MONITORING` | `ACCEPTED` → `CLOSED` → `ARCHIVED`

`ACCEPTED` is a decision state. Residual score and rating stay as last calculated.

## OWNERSHIP

`ownerUserId` is the risk owner. `executiveOwnerUserId` is optional. Both must belong to the same tenant. Risks without owners appear on the attention list. Business units are tenant-scoped (`BusinessUnit`).

## SCORING

Enterprise scoring is a **distinct methodology** from TPRM `supreme-risk-1.1.0`.

- Default: defensible 5×5 likelihood × impact lookup. Score = 1–25. Rating bands: Low 1–6, Medium 7–12, High 13–19, Critical 20–25.
- Inherent = matrix(inherent likelihood, inherent impact).
- Control effectiveness is derived only from linked `OrganizationControl.effectivenessStatus`. Evidence presence does not change it.
- Residual impact = max(1, inherent impact − control reduction). Residual likelihood is unchanged unless the methodology version documents otherwise. Default: likelihood unchanged; effectiveness reduces impact notches (EFFECTIVE −1 each, cap 2; PARTIALLY_EFFECTIVE counts as half, floored).
- Target risk is an explicit target likelihood/impact, not a calculated promise.
- Every snapshot stores score, rating, inputs, methodology version, calculation date, and reason.
- Changing methodology publishes a new version. Prior snapshots stay reproducible and are not rewritten.

TPRM vendor scoring remains on `deterministicRiskEngine.ts`.

## MULTI-DIMENSIONAL IMPACT

Optional dimensions: Financial, Operational, Regulatory, Customer, Reputational, Safety, Privacy, Cybersecurity.

Roll-up: **highest configured dimension rating becomes suggested overall impact**. The user may override overall impact. There is no fake precision (no currency loss invented from a 1–5 rating).

## APPETITE AND TOLERANCE

Scopes: organization, category, optional business unit. More specific scope wins.

Statuses: `WITHIN_APPETITE`, `NEAR_TOLERANCE` (equal to configured maximum), `OUTSIDE_APPETITE`, `NOT_CONFIGURED`.

Unconfigured appetite is shown as Not configured. It is never faked.

## TREATMENT

Strategies: Mitigate, Accept, Transfer, Avoid, Monitor.

Plans have owner, actions, due date, status, priority, linked controls/findings/remediation, expected target risk, and approval. Existence of a plan does not change residual risk.

## RISK ACCEPTANCE / DECISIONS

`EnterpriseRiskDecision` captures decision, maker, authority, rationale, conditions, approval date, expiry, and optional evidence object IDs.

Expired acceptance creates attention (`ACCEPTANCE_EXPIRED`) without rewriting historical scores.

## CONTROLS AND EVIDENCE

Links are explicit (`EnterpriseRiskControlLink`). The detail workspace shows implementation, effectiveness, last test, usable CLEAN evidence count, findings, remediation, and freshness from #14. Effectiveness is never inferred from a file.

## GOVERNANCE GRAPH

`EnterpriseRisk` registers as `RISK` with `sourceModel = EnterpriseRisk` (distinct from TPRM `ScoreCalculation` RISK nodes).

Additional node types: `KRI`, `TREATMENT`.

Additional relationship types (additive, controlled):

- `ASSOCIATED_WITH` — risk ↔ vendor / fourth party
- `INCREASES_EXPOSURE_TO` — finding → risk
- `ADDRESSES` — treatment → risk
- `GOVERNS` — decision → risk

Existing types reused: `AFFECTS` (system, business unit, data), `MITIGATES` (control → risk), `HAS_FINDING`, `GOVERNED_BY` remains valid as the inverse reading of `GOVERNS`.

Graph remains identity/provenance/index. No payload copy.

## AGGREGATION

Portfolio views group by category, business unit, owner, rating, appetite, and trend.

Supreme does **not** sum ordinal 1–25 scores into an “enterprise risk number.” Dashboard metrics are counts, heatmap cell counts, and category/business-unit counts by residual rating. That is the aggregation methodology.

## HISTORY AND EVENTS

Customer language only: Risk reassessed, Owner changed, Treatment approved, Risk accepted, KRI threshold exceeded, Control linked, Appetite changed, Review due.

Events (finding, incident, control failure, KRI breach, regulatory change) may trigger review. They do not silently recalculate.

## AUTHORIZATION

| Permission | Typical roles |
|---|---|
| `risk.read` | Viewer and above |
| `risk.create` | Assessor, Risk Manager, Admin |
| `risk.manage` | Risk Manager, Admin (update/archive) |
| `risk.score` | Risk Manager, Admin |
| `risk.treat` | Assessor, Risk Manager, Admin |
| `risk.accept` | Approver, Risk Manager, Admin |
| `risk.approve` | Approver, Risk Manager, Admin |
| `risk.delete` | Admin (archive) |
| `risk.methodology.manage` | Admin, Risk Manager |
| `risk.appetite.manage` | Admin, Risk Manager |
| `kri.read` | Viewer and above |
| `kri.manage` | Risk Manager, Admin |

Frontend hiding is not authorization. Platform staff stay off tenant content except Support Access.

## TENANT ISOLATION

Every query and write is `organizationId` from authenticated membership. Cross-tenant public IDs, control links, KRIs, treatments, decisions, reports, import/export, and graph edges return 403/404 with no metadata leak.

## AUDIT

`recordAudit` on create, update, score, treatment, control link/unlink, KRI, acceptance, decision, archive, methodology, and appetite. Actor, tenant, time, public ID, and reason. No secrets.

## REPORTS AND IMPORT

Reports reuse the existing PDF/XLSX design system and live tenant rows. Import is tenant-scoped CSV/XLSX with validation preview, duplicate public-ID handling, and spreadsheet formula-injection neutralization (`=`, `+`, `-`, `@` prefixed). No uncontrolled mass write: preview then confirm.

## CONSEQUENCES

- #12 TPRM, Reports, assessments, and scoring methodology stay intact.
- #13 explorer gains EnterpriseRisk / KRI / TREATMENT nodes when those records exist.
- #14 Control Center remains the control system of record.
- #16 Supreme Compliance is not started.
- Leftover `/risk-management` remains quarantined.
