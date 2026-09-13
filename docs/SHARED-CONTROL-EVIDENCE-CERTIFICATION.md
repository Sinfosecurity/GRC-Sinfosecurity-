# Shared Control & Evidence Layer Certification

**Item:** #14  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `c1c9948e3cf8c761345082b1467b348582b3b1af`  
**Status:** PARTIAL — implementation exists; Product Leadership must accept the hosted experience  
**#12:** PARTIAL / OPEN IN PARALLEL  
**#13:** Product Leadership accepted  
**#15:** NOT AUTHORIZED  
**Commercial production:** NO-GO

## Principle

Evidence once. Govern everywhere.

A customer implements and tests a common control once. Mapping decides where that control contributes. A file is reusable only through an explicit, audited link. Mapping or a CLEAN file is not certification.

## Authoritative stores

| Concern | Store |
|---|---|
| Common control library | `ControlCatalogEntry` |
| Tenant control instance | `OrganizationControl` |
| Framework packs | `FrameworkDefinition` / `FrameworkVersion` / `FrameworkRequirement` |
| Mappings | `RequirementControlMapping` |
| File bytes + malware | `StoredObject` |
| TPRM upload links | `EvidenceLink` |
| Shared reuse ledger | `EvidenceGovernanceLink` |
| Control tests | `OrganizationControlTest` |
| Findings | `VendorIssue` (optional link; never auto-created) |
| Residual risk | `ScoreCalculation` (impact view does not write) |
| Graph | `GovernanceNode` / `GovernanceEdge` (projection) |

Leftover `Control` / `ComplianceFramework` tables are not this layer.

## Honesty

UI and reports may say mapped, implemented, tested, evidence available, gap, or readiness. They must not say certified, compliant, or attested because a mapping or file exists.

## Malware

Usable SUPPORTS / PARTIALLY_SUPPORTS links require `StoredObject.scanStatus = CLEAN`. Shared linking does not bypass the Evidence Vault download policy.

## Impact

Expiry, revocation, or supersession surfaces potential governance impact. Residual scores are not changed by that view.

## Local evidence (this implementation)

| Check | Result |
|---|---|
| Prisma generate / validate | PASS |
| Additive migration | PASS — `20260913180000_shared_control_evidence_layer` (no DROP/TRUNCATE) |
| Migrate deploy | PASS on local CI DB and Jest test DB |
| Backend typecheck | PASS |
| Frontend typecheck | PASS |
| Backend tests | PASS — 296 |
| Frontend tests | PASS — 128 |
| Tenant isolation / forged org / non-CLEAN usable link | PASS |
| NOT_APPLICABLE is not PASS / no invented findings | PASS |
| Impact does not write residual scores | PASS |
| Synthetic scale | ~200 extra controls + ~4,800 evidence links; list/search/coverage/impact < 15s. Not enterprise-scale certification. |

## Open for Product Leadership

- Hosted Control Center, Control Detail, Evidence Library, and Framework coverage visual acceptance
- Hosted screenshots at 375 / 768 / 1024 / 1440 / 1920 after the implementation SHA is deployed
- #12 remains PARTIAL

Do not mark #14 PASS from this file alone.
