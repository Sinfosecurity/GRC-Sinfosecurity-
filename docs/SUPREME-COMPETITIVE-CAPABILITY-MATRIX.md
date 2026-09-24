# Supreme Competitive Capability Matrix

**Status:** HISTORICAL / SUPPORTING — not the #39 controlling matrix.

**Canonical #39 research:** `docs/competitive/SUPREME-COMPETITIVE-CAPABILITY-MATRIX.md`  
**Gap ownership:** `docs/competitive/COMPETITIVE-GAP-ROADMAP.md`  
**Priority memo:** `docs/competitive/PRODUCT-PRIORITY-DECISION-MEMO.md`  
**Machine-readable:** `docs/competitive/competitive-matrix.json`

This 2026-09-13 file remains evidence for #15 / #16 / #18 module capability notes. Do not treat it as the Product Leadership #39 package.

---

**Item:** #16 Supreme Compliance (extends #15 matrix); #18 Supreme AI Governance section appended  
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

## Compliance program capabilities (#16)

| Capability category | Supreme equivalent | OneTrust / ServiceNow / Archer / AuditBoard / LogicGate / MetricStream | Vanta / Drata | Current status | Evidence |
|---|---|---|---|---|---|
| Framework catalog | #14 packs + identifiers + original Supreme summaries | Broad licensed content libraries | Automated starter catalogs | Implemented as reference packs, not licensed reproductions | `controlLibrary.ts`, ADR-SUPREME-COMPLIANCE |
| Framework activation / scope | `ComplianceActivation` opt-in per version | Mature program objects | Often auto-scoped from questionnaire | Implemented. Nothing auto-activated | `/compliance/frameworks` |
| Applicability | Applicable / Not applicable / Under review / Not determined | Common | Common | Implemented. NA requires rationale and is not pass | `ComplianceRequirementState` |
| Common control mapping | Reuses `RequirementControlMapping` strengths | Crosswalk modules vary | Usually questionnaire-to-control | Implemented on #14 mappings only | Cross-framework view |
| Evidence reuse | CLEAN `EvidenceGovernanceLink` before upload | Strong in GRC suites | Strong in automated evidence | Implemented; malware fail-closed unchanged | Requirement Evidence section |
| Attestation campaigns | Period, attestors, review, overdue | Strong | Lighter | Implemented. Not a control test | `/compliance/campaigns` |
| Control testing | Reuses #14 tests | Strong | Often inferred | Implemented. Not tested is not pass | Requirement Testing section |
| Gaps / exceptions | Explicit gap + governed exception | Strong | Lighter exceptions | Implemented. Exception ≠ effective | `/compliance/gaps`, `/compliance/exceptions` |
| Readiness | Four explainable coverage metrics | Scorecards often branded “compliance” | Automated % scores | Implemented without Certified/Compliant claims | Dashboard + reports |
| Audit / assessment workspace | Internal period, requested evidence | Strong audit modules | Exam-prep checklists | Implemented as readiness, not external attestation | `/compliance/audits` |
| Integrated risk | Optional `EnterpriseRisk` link as potential impact | Native IRM | Limited | Implemented. Score not auto-changed | Requirement Related risks |
| UX | Workspace + tables, no UUID labels | Dense enterprise UX | Consumer-simple | Implemented for #16 review | `/compliance` |

Supreme can differentiate on honest readiness language, shared CLEAN evidence, and common-control reuse across programs. It does not claim content-library parity with OneTrust/Archer or automation parity with Vanta/Drata.

## Privacy operations capabilities (#17)

Conceptual benchmark only against OneTrust, TrustArc, Transcend, BigID, Securiti, ServiceNow, and Archer. This is not a claim of superiority.

| Capability category | Supreme equivalent | Market category | Current status | Evidence |
|---|---|---|---|---|
| ROPA / processing activities | `PrivacyProcessingActivity` with `PA-00001` | OneTrust / TrustArc / Archer | Implemented as operations workspace, not inventory CRUD | `/privacy-ops/activities` |
| Data mapping | Structured source → system → process → vendor → storage paths | OneTrust / BigID / Securiti | Implemented as tables and directional paths, not spaghetti visualization | `/privacy-ops/data-map` |
| DSR / DSAR | `PrivacyRightsRequest` with masked list views | OneTrust / Transcend / Securiti | Implemented. Deadlines are configured, not legal advice | `/privacy-ops/rights` |
| DPIA / PIA | Screening + assessment + decision | OneTrust / TrustArc | Implemented. Screening recommends review; never “legally required” | `/privacy-ops/dpias` |
| Vendor / processors | Privacy roles on existing `Vendor` | OneTrust / ServiceNow / Archer | Implemented. No second vendor database | `/privacy/vendors/:id` |
| Transfers / TIA | `PrivacyTransfer` + assessment | OneTrust / TrustArc | Implemented. Mechanism is recorded, not declared lawful | `/privacy-ops/transfers` |
| Retention / disposal | Rules + deletion tasks | OneTrust / BigID | Implemented. Surfaces due work; no auto-delete | `/privacy-ops/retention` |
| Privacy risk | Links to #15 `EnterpriseRisk` | ServiceNow / Archer | Implemented by reuse, not a privacy-only engine | Activity Risks section |
| Compliance integration | Links to #16 requirements / gaps | OneTrust / ServiceNow | Implemented. No second compliance engine | Graph `REQUIRED_BY` |
| Evidence reuse | #14 CLEAN evidence via shared controls | OneTrust / ServiceNow | Implemented. Presence is not proof | Control / Evidence sections |
| Governance Graph | Projected privacy nodes and edges | Limited elsewhere | Implemented as projection only | `PROCESSING_ACTIVITY`, `TRANSFERS_VIA` |
| UX | `/privacy-ops` workspaces, human IDs | Dense privacy suites | Implemented for Product Leadership review | `/privacy-ops` |

Supreme can differentiate where evidence exists: honest legal language, shared CLEAN evidence, Governance Graph impact, and reuse of Vendor / Risk / Compliance records. It does not claim cookie-consent platform parity with OneTrust or discovery-scale parity with BigID/Securiti.

## AI governance capabilities (#18)

Conceptual benchmark only against OneTrust AI Governance, ServiceNow AI Control Tower / IRM, Credo AI, Holistic AI, ModelOp, IBM watsonx.governance, and Microsoft Purview / AI governance capabilities. This is not a claim of superiority.

| Capability category | Supreme equivalent | Market category | Current status | Evidence |
|---|---|---|---|---|
| AI inventory | `AiSystem` with `AI-00001` | OneTrust / ServiceNow / ModelOp | Implemented as a register, not a spreadsheet | `/ai-governance/systems` |
| Use-case governance | Separate `AiUseCase` records | Credo AI / Holistic AI | Implemented. Same model can have different uses | `/ai-governance/use-cases/:id` |
| Model / provider reference | `AiModelProvider` recorded facts | watsonx / Purview / ModelOp | Implemented. Unknown / Not recorded if not entered | `/ai-governance/providers` |
| Human oversight | `AiOversight` + approval authority | ServiceNow / OneTrust | Implemented. AI cannot approve itself | System detail + `/ai-governance/approvals` |
| Risk assessment | Immutable `AiScoreSnapshot` `supreme-ai-1.0.0` | Credo AI / Holistic AI | Implemented as explainable factors, not a black box | Engine + score snapshots |
| Testing / evaluation | Human-recorded `AiTest` | Credo AI / Holistic AI / watsonx | Implemented. Not tested stays Not tested | `/ai-governance/testing` |
| Provider / vendor risk | Link to existing `Vendor` | ServiceNow / OneTrust | Implemented. No second vendor database | Provider `vendorId` + Third Party |
| Privacy integration | Explicit `AiPrivacyLink` to #17 | OneTrust / Purview | Implemented by reuse, not a second privacy engine | Affected + privacy links |
| Compliance integration | NIST AI RMF / ISO 42001 readiness packs on #16 | OneTrust / ServiceNow | Implemented as identifiers + Supreme summaries. No certification claim | `controlLibrary.ts` |
| Evidence reuse | #14 CLEAN links only | ServiceNow / OneTrust | Implemented. Presence is not proof | Control / evidence links |
| Graph impact | Projected AI nodes | Limited elsewhere | Implemented as projection only | `AI_SYSTEM`, `AI_USE_CASE` |
| Board reporting | Native PPTX + PDF/XLSX | ServiceNow / OneTrust | Implemented to existing Supreme board standard | `/ai-governance/reports/board.pptx` |
| UX | `/ai-governance` workspaces, human IDs | Dense IRM / AI GRC suites | Implemented for Product Leadership review | `/ai-governance` |

Supreme can differentiate where evidence exists: human authority, explainable scoring, honest regulatory language, Governance Graph impact, and reuse of Vendor / Risk / Privacy / Compliance / Evidence records. It does not claim model-ops telemetry parity with ModelOp/watsonx or legal-content parity with OneTrust.

## Supreme Intelligence capabilities (#19)

Conceptual benchmark only against OneTrust Insights / reporting, ServiceNow IRM performance analytics, Archer dashboards, AuditBoard cross-product views, and LogicGate reporting. This is not a claim of superiority.

| Capability category | Supreme equivalent | Market category | Current status | Evidence |
|---|---|---|---|---|
| Cross-domain intelligence | Derived `IntelligenceItem` from live TPRM / Risk / Control / Evidence / Compliance / Privacy / AI records | OneTrust / ServiceNow / Archer | Implemented as interpretation, not a second database | `/intelligence`, ADR-SUPREME-INTELLIGENCE |
| Explainability | Facts, derived intelligence, and optional AI narrative labeled separately | ServiceNow / Archer scorecards | Implemented. No invented percentages | Item detail + engine tests |
| Graph impact | Reuses #13 bounded impact | Limited elsewhere | Implemented from real edges only | `governanceGraphService.impact` |
| Evidence reuse | Reads `EvidenceGovernanceLink` freshness / scan; never copies file bodies | OneTrust / AuditBoard | Implemented. Expired file → one item, many affected objects | Dedup rule `evidence.unusable` |
| Human authority | Acknowledge / review only; actions stay in source products | LogicGate / ServiceNow workflows | Implemented. Acknowledge does not close findings | `/intelligence/items/:id/acknowledge` |
| Executive usability | `/intelligence/executive` + Intelligence Brief PDF | OneTrust / Archer board packs | Implemented as web + PDF. PPTX not shipped | `/intelligence/reports/brief.pdf` |
| Workflow simplicity | Review guidance, not automation | ServiceNow / LogicGate | Implemented. #20 automation is not this product | ADR automation boundary |
| External threat / news feed | Honest not configured | OneTrust / ServiceNow intel add-ons | Not configured. No simulated feed | `/intelligence/external` |

Supreme can differentiate where evidence exists: one derived plane over the Governance Graph, labeled authority, and a refusal to simulate threat intelligence. It does not claim ServiceNow Performance Analytics depth or OneTrust content-pack breadth.
