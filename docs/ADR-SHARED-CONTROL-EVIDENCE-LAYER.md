# ADR: Shared Control & Evidence Layer

**ADR ID:** ADR-SHARED-CONTROL-EVIDENCE-LAYER  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #14 Shared Control & Evidence Layer  
**Starting SHA:** `c1c9948e3cf8c761345082b1467b348582b3b1af`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#13 status:** Product Leadership accepted  
**#15 authorized:** NO

## CONTEXT

Product Leadership authorized #14 on 2026-09-13 after accepting #13. Supreme Third Party already stores uploaded files as `StoredObject`, optional TPRM catalog rows as `VendorDocument`, and linkage as `EvidenceLink`. The Governance Graph stores identity references only. Legacy `Control` / `ComplianceFramework` / `ComplianceRequirement` tables exist from pre-TPRM GRC and are not a shipped product.

The required customer outcome is **evidence once, govern everywhere**: implement and test a common control once; map it to many framework requirements; reuse CLEAN evidence with an explicit, auditable rationale.

## PROBLEM

Without a shared layer, later products (Risk, Compliance, Privacy, AI Governance) will copy evidence and invent parallel control catalogs. The leftover `Control` model cannot be that layer: it stores numeric effectiveness (1–5), uses `vendor.*` permissions, and is served by a quarantined mock UI.

## DECISION

#14 introduces a **new authoritative common-control plane** and **extends** the existing evidence vault. It does not replace `StoredObject`, malware policy, `VendorIssue`, `ScoreCalculation`, or `RiskDecisionBrief`.

| Concern | Authoritative store | #14 role |
|---|---|---|
| File bytes + malware status | `StoredObject` | Unchanged. Only CLEAN is usable/downloadable |
| TPRM vendor file catalog | `VendorDocument` | Remains TPRM UI metadata; not the reuse ledger |
| TPRM upload links | `EvidenceLink` | Remains vendor/assessment/finding/question links |
| Shared evidence reuse | `EvidenceGovernanceLink` | Explicit SUPPORTS / PARTIAL / CONTRADICTS / SUPERSEDES / REPLACES / RELATED_TO |
| Common control catalog | `ControlCatalogEntry` | Platform-owned original Supreme wording |
| Tenant control instance | `OrganizationControl` | Tenant implementation + effectiveness statuses |
| Framework packs | `FrameworkDefinition` + `FrameworkVersion` + `FrameworkRequirement` | Identifiers + original Supreme summaries only |
| Mapping | `RequirementControlMapping` | Strength, provenance, authority, version, review |
| Control tests | `OrganizationControlTest` | Explicit PASS/FAIL/PARTIAL/NOT_TESTED/NOT_APPLICABLE |
| Findings | `VendorIssue` | Optional link from a test; never auto-created |
| Residual risk | `ScoreCalculation` | Impact view never writes scores |
| Relationships | `GovernanceNode` / `GovernanceEdge` | Projection from the tables above |

### What is not a source of truth

- Legacy `Control`, `ControlTest`, `ComplianceFramework`, `ComplianceRequirement`, `ComplianceControl`, `VendorRiskControl`, `VendorISOControlMapping`
- Governance graph labels/JSON
- Marketing `/frameworks` pages
- Quarantined Controls Management mock data

Those leftover tables stay in the schema for migration safety and are not written by #14.

## CONTROL MODEL

`OrganizationControl` is tenant-scoped and unique on `(organizationId, controlKey)`.

Implementation status and effectiveness status are separate enums. There are no effectiveness percentages.

Implementation: `NOT_IMPLEMENTED`, `PLANNED`, `IMPLEMENTED`.  
Effectiveness: `NOT_TESTED`, `EFFECTIVE`, `PARTIALLY_EFFECTIVE`, `INEFFECTIVE`.  
Lifecycle: `ACTIVE`, `ARCHIVED`.

Catalog entries are platform-owned (`ControlCatalogEntry.controlKey` unique). First Control Center read adopts missing catalog keys into the tenant without overwriting tenant edits.

## FRAMEWORK MODEL

Framework packs store a reference identifier, an original Supreme summary, and an optional source URL. They do **not** store copyrighted standard text. Presence of a pack is not certification, attestation, or compliance.

Mappings record `PRIMARY` / `CONTRIBUTING` / `PARTIAL` / `RELATED` — not confidence percentages. Historical mappings keep `validFrom` / `validTo` / `version` so later catalog edits do not silently rewrite past reports.

## EVIDENCE REUSE

One `StoredObject` may have many `EvidenceGovernanceLink` rows. Linking is never implied by a framework mapping. A document that supports Control A does not automatically support every requirement mapped to Control A.

Usable SUPPORTS / PARTIALLY_SUPPORTS links require `StoredObject.scanStatus = CLEAN`. Non-CLEAN objects remain fail-closed for download and cannot be treated as usable evidence.

Freshness is stored explicitly (`CURRENT`, `UNDER_REVIEW`, `SUPERSEDED`, `REVOKED`) and may be displayed as `EXPIRING` / `EXPIRED` only when `expiresAt` exists. Dates are never invented.

AI-suggested links, if ever created, stay `SUGGESTED` until a human reviews them. #14 does not enable fake AI.

## IMPACT

When evidence is expired, revoked, superseded, or otherwise unusable, Supreme shows **potential governance impact** (controls, requirements, vendors, assessments, findings, risks that reference the object). Residual scores are not recalculated unless the existing risk engine is invoked by an authorized TPRM workflow.

## GRAPH

#14 backfills `CONTROL`, `FRAMEWORK`, `REQUIREMENT`, and `CONTROL_TEST` nodes from the new tables. Canonical edges include:

- REQUIREMENT `--SATISFIED_BY-->` CONTROL
- CONTROL `--SUPPORTED_BY-->` EVIDENCE (stored as EVIDENCE `--SUPPORTED_BY-->` CONTROL to match #13 direction)
- CONTROL `--TESTED_BY-->` CONTROL_TEST
- CONTROL_TEST `--HAS_FINDING-->` FINDING (only if the tester linked a finding)
- CONTROL `--MITIGATES-->` RISK (only when a user records that fact)
- CONTROL `--APPLIES_TO-->` VENDOR (only when a user records that fact)

The graph remains a projection. Business facts live in the tables above.

## AUTHORIZATION

New permissions: `control.read`, `control.manage`, `control.test`, `control.approve`, `evidence.link`, `evidence.review`, `framework.read`, `framework.manage`.

Viewer remains read-only. Platform staff stay off tenant content except through Support Access.

## HONESTY

The UI and reports may say mapped, implemented, tested, evidence available, gap, or readiness. They must not say certified, compliant, or attested because a mapping or file exists.

## CONSEQUENCES

- #12 TPRM flows keep using `/documents` and `tprm/evidence/upload`.
- #13 explorer gains control/requirement/framework nodes when those records exist.
- #15 Supreme Risk is not started.
