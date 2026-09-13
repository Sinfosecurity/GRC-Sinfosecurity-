# Supreme Competitive Capability Matrix

**Item:** #15 Supreme Risk  
**Date:** 2026-09-13  
**Honesty rule:** Competitor names identify market categories only. This document does not copy proprietary UI, help text, control content, or code. Status is Supreme’s current implementation, not a claim that Supreme is better.

| Capability category | Supreme equivalent | Supreme enhancement | Current status | Evidence |
|---|---|---|---|---|
| Enterprise risk register | `EnterpriseRisk` with `RISK-00001` IDs, canonical + custom categories | Customer IDs instead of UUIDs; leftover GRC `Risk` table is not used | Implemented | ADR-SUPREME-RISK, `/risks/register` |
| 5×5 heatmap | Live likelihood × impact cell counts | Click-through to register; empty cells stay zero | Implemented | `/erm/dashboard`, Risk Dashboard |
| Inherent / residual / target | Distinct fields + immutable snapshots | Acceptance cannot rewrite residual | Implemented | `enterpriseRiskEngine`, decision test |
| Explainable scoring | Snapshot stores inputs, version, reason, explanation | Separate from TPRM `supreme-risk-1.1.0` | Implemented | `EnterpriseRiskScoreSnapshot` |
| Risk appetite | Org / category / business-unit scopes | Not configured is visible; never faked | Implemented | `EnterpriseRiskAppetite` |
| Treatment plans | Mitigate / Accept / Transfer / Avoid / Monitor | Plan existence does not score | Implemented | `/erm/risks/:id/treatments` |
| Risk acceptance | Governed decision with expiry | Residual unchanged; expired acceptance is attention | Implemented | `/erm/risks/:id/decisions` |
| Control linkage | Links to #14 `OrganizationControl` | Effectiveness from tests, not files | Implemented | Control section + graph `MITIGATES` |
| Evidence reuse | Shows CLEAN usable links from #14 | Fail-closed malware policy unchanged | Implemented | Evidence section |
| Impact analysis | Graph neighbors + explicit relationship rows | “What is affected?” from real edges | Implemented | Relationships tab + `EntityRelationships` |
| KRIs | Manual measurements + thresholds | Status is deterministic; source stays MANUAL unless integrated | Implemented | `/erm/kris` |
| Portfolio aggregation | Counts by rating / category / appetite | Explicitly refuses summed ordinal “enterprise risk” | Implemented | Dashboard honesty + ADR |
| Import / export | CSV/XLSX preview then commit | Formula injection neutralized | Implemented | `/erm/import`, spreadsheet tests |
| Differentiating workflow | Control-test failure → affected risks, evidence, appetite, treatment, decisions | Rule-based recommended actions; no fake AI | Implemented | `/erm/impact/controls/:id` |
| OneTrust-class ERM breadth | Register + appetite + treatment + KRI + reports | Graph + shared evidence + explainable scores | Partial vs mature IRM suites | Hosted Product Leadership review required |
| ServiceNow IRM / Archer / AuditBoard / LogicGate / MetricStream workflow depth | Core ERM operating path | Simpler UX; not a CMDB or GRC suite clone | Partial | Do not claim parity |

Supreme can differentiate where evidence exists: Governance Graph impact, shared CLEAN evidence, explainable methodology versions, and a refusal to pretend acceptance lowers risk. It does not yet claim suite-wide IRM parity.
