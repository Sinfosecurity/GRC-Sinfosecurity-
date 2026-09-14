# ADR: Supreme AI Governance

**ADR ID:** ADR-SUPREME-AI-GOVERNANCE  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #18 Supreme AI Governance  
**Starting SHA:** `17c87d5ecf65b34de6233d7d35967b0e854a77c0`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#13–#17 status:** Product Leadership accepted  
**#19 authorized:** NO

## CONTEXT

Product Leadership accepted #17 on 2026-09-13 and authorized #18. #13 stores relationship identity only. #14 owns common controls, tests, and CLEAN evidence reuse. #15 owns enterprise residual risk. #16 owns framework programs. #17 owns privacy operations. Leftover `/ai-insights` is TPRM assistance (`aiProvider` NOT_CONFIGURED). Quarantined Predictive Analytics is **not** this product.

Supreme AI Governance is the AI-governance product of the Supreme Governance Platform. It is not a generic inventory spreadsheet, not a fake model-risk score generator, not a chatbot wrapper, and not a compliance claim engine.

## PROBLEM

Without a dedicated AI-governance plane, later work will either:

1. overload Third Party or Risk with model/use-case semantics, or
2. invent a second vendor, control, evidence, privacy, or risk database.

Both would break the accepted #13–#17 authority model and invite false legal or model-performance claims.

## DECISION

#18 introduces a **new authoritative AI-governance plane**. It does not replace `Vendor`, `OrganizationControl`, `StoredObject`, `EnterpriseRisk`, `ComplianceActivation`, `PrivacyProcessingActivity`, or `GovernanceNode`.

| Concern | Authoritative store | #18 role |
|---|---|---|
| Vendor / provider identity | `Vendor` | Link only. No second vendor database |
| Common control / test | `OrganizationControl` | Linked, never copied |
| Evidence bytes / malware | `StoredObject` | Unchanged fail-closed CLEAN policy |
| Shared evidence reuse | `EvidenceGovernanceLink` | Explicit links; presence is not proof |
| Enterprise residual risk | `EnterpriseRisk` | Linked as potential AI impact |
| Framework requirement | `FrameworkRequirement` + `ComplianceRequirementState` | NIST AI RMF / ISO 42001 readiness packs reused |
| Privacy operations | `PrivacyProcessingActivity` | Linked; no second privacy engine |
| Graph identity | `GovernanceNode` / `GovernanceEdge` | Projection from AI tables |
| AI system | `AiSystem` | System of record. Public ID `AI-00001` |
| AI use case | `AiUseCase` | Separate from system. One system may have many uses |
| Model / provider reference | `AiModelProvider` + `AiSystemModel` | Recorded facts only. Unknown / Not recorded otherwise |
| Human oversight | `AiOversight` | Required for material uses |
| AI risk instance | `AiRisk` | Taxonomy selection; not every risk applies |
| Explainable score | `AiScoreSnapshot` | Immutable. Methodology `supreme-ai-1.0.0` |
| Assessment / AIA | `AiAssessment` + screening | Recommendation, not a legal determination |
| Evaluation / testing | `AiTest` | Human-recorded results only |
| Approval / restriction | `AiApproval` | Only path to Approved / Production / Restricted / Retired |
| Exception | `AiException` | Time-bounded. Expired exceptions need attention |
| Incident / issue | `AiIncident` | Human-authoritative closure |
| Change / version | `AiChange` | Model, prompt, data, autonomy, use-case changes |
| Regulatory applicability | `AiRegulatoryReview` | Organization classification. Never auto “EU AI Act High-Risk” |
| History | `AiHistory` | Customer-language change log |

### Product principle

Inventory the AI. Understand the use. Govern the risk. Preserve human authority.

A recorded system is not an approval. A recorded provider is not a performance claim. A screening result is not a legal prohibition. Organization classification is not a statutory finding. Monitoring remains **Manual / Not configured** until a real telemetry source exists. AI must not approve itself.

## LIFECYCLE

`Proposed`, `In review`, `Pilot`, `Approved`, `Production`, `Restricted`, `Suspended`, `Retired`.

`Approved` and `Production` require a recorded human `AiApproval`. Creating a row leaves the system in `Proposed` or `In review`.

## RISK SCORING

Deterministic methodology `supreme-ai-1.0.0`. Inputs, calculation, rating, date, and rationale are stored on `AiScoreSnapshot`. Historical snapshots are never rewritten when methodology changes.

## IMPACT CLASSIFICATION

Human-reviewed: Minimal / Limited / Elevated / High. Preferred copy: **Organization classification**, **Potential regulatory classification**, **Review required**. Do not automatically claim “EU AI Act High-Risk.”

## GRAPH

Projected node types: `AI_SYSTEM`, `AI_USE_CASE`, `AI_MODEL`, `AI_PROVIDER`, `AI_TEST`, `AI_ASSESSMENT`, plus reused `INCIDENT`, `DECISION`, `VENDOR`, `RISK`, `CONTROL`, `EVIDENCE`, `PROCESSING_ACTIVITY`, `REQUIREMENT`.

Relationships reuse canonical types (`USES`, `ASSOCIATED_WITH`, `PROCESSES`, `AFFECTS`, `MITIGATES`, `ASSESSED_BY`, `TESTED_BY`, `GOVERNS`, `PROVIDES_SERVICE_TO`, `REQUIRED_BY`). The graph is not a second system of record.

## RBAC

Viewer: `ai.read`. Manager: `ai.create`, `ai.manage`, `ai.assess`, `ai.test`. Approver: `ai.approve`, `ai.restrict`, `ai.retire`. Regulatory: `ai.regulatoryReview`. Reports: `ai.report`. Frontend hiding is not authorization.

## HONESTY

Do not invent provider status, model performance, bias results, drift, telemetry, legal applicability, certification, or AI scores. Do not let AI self-approve. Use **Not configured**, **Not tested**, **Review required**, **Organization classification**, **Potential applicability**, **Recorded determination**, **Human approval required**.
