# Shared Control & Evidence Layer Certification

**Item:** #14  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `c1c9948e3cf8c761345082b1467b348582b3b1af`  
**Implementation SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted frontend SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted API SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34760658744 PASS  
**Status:** PARTIAL / READY FOR PRODUCT LEADERSHIP REVIEW  
**#12:** PARTIAL / OPEN IN PARALLEL  
**#13:** Product Leadership accepted  
**#15:** NOT AUTHORIZED  
**Commercial production:** NO-GO

This is not #14 PASS. Product Leadership must accept the hosted experience.

## Principle

Evidence once. Govern everywhere.

A customer implements and tests a common control once. Mapping decides where that control contributes. A file is reusable only through an explicit, audited link. Mapping or a CLEAN file is not certification.

## Authoritative stores verified on staging

| Concern | Store | Hosted proof |
|---|---|---|
| Common control library | `ControlCatalogEntry` | 33 tenant controls adopted |
| Tenant control instance | `OrganizationControl` | `/api/v1/scc/controls` 200 |
| Framework packs | `FrameworkDefinition` / `FrameworkVersion` / `FrameworkRequirement` | 9 packs |
| Mappings | `RequirementControlMapping` | AUTH-01 has 8 mappings |
| File bytes + malware | `StoredObject` | CLEAN / FAILED / INFECTED / NOT_CONFIGURED present |
| Shared reuse ledger | `EvidenceGovernanceLink` | `ok.zip` linked to AUTH-01; same StoredObject reused |
| Control tests | `OrganizationControlTest` | PASS, FAIL, PARTIAL recorded |
| Findings | `VendorIssue` optional link | Created in Findings workspace, then linked; invent denied |
| Residual risk | impact view does not write | `residualScoresUnchanged=true` |
| Graph | projection | SATISFIED_BY, SUPPORTED_BY, TESTED_BY |

Leftover `Control` / `ComplianceFramework` tables are not this layer. Additive migration `20260913180000_shared_control_evidence_layer` applied via hosted `prisma migrate deploy`. No `db push`. No DROP/TRUNCATE.

## Hosted operational evidence

| Check | Result |
|---|---|
| Control Center counts, search, filters | PASS — 33 controls |
| Control Detail sections | PARTIAL — Overview / Requirements / Evidence / Testing work; Findings and History show raw IDs / `control.update` |
| Evidence reuse | PASS — same `ok.zip` StoredObject, CLEAN preserved, rationale + review + audit |
| Malware policy | PASS — FAILED, INFECTED, NOT_CONFIGURED SUPPORTS links HTTP 403 |
| Freshness | PASS — CURRENT; expiry not invented |
| Control testing | PASS — PASS + FAIL + PARTIAL; NOT_APPLICABLE cannot invent a finding or become PASS |
| Framework coverage language | PASS — coverage / readiness / mapped / implemented / tested / gap; not certified / compliant |
| Governance Graph path | PASS — Requirement → Control → Evidence; Control → Control Test |
| Evidence impact | PASS — 1 control, 8 requirements; residual unchanged |
| Reports | PASS — four PDFs, HTTP 200, tenant-correct, no certified/compliant |
| Tenant isolation | PASS — Org B 403/404, no AUTH-01 leakage; forged organizationId 403; forged sourceId 404; cross-tenant graph 404 |
| RBAC | PASS — assessor read 200, control.manage 403; viewer remains read-only in tests |
| Audit | PASS — `evidence.link` in `/api/v1/audit/logs` |
| Backup / restore participation | PASS for existing recovery scope — #14 tables are in the recovery manifest and populate path; local recovery-certification 9/9 PASS. Not a new production DR certification. |
| #12 regression | PASS as non-breakage — login API, dashboard, vendors, assessments, questionnaire, evidence, findings, monitoring, decisions, reports, team/invitations, evaluation entitlement still render. #12 remains PARTIAL. |

## Visual notes for Product Leadership

Cursor does not declare premium UI PASS.

**P0:** none observed on hosted security or tenant isolation.

**P1**

- Control Detail Findings lists raw finding UUIDs
- Control Detail Evidence lists raw user UUIDs for linked / reviewed by
- Control Detail History shows `control.update` and does not list evidence.link / control.test

**P2**

- Relationships tab is a long raw graph dump after repeated tests
- Same CLEAN file can be linked more than once
- 375 Control Detail section list consumes the first screen
- 375 Evidence Library is dense once impact and relationships render

**P3**

- “Evidence path exists” is accurate but jargon-heavy

Screenshots: `docs/private-beta/hosted-ux-qa/shared-control-evidence/`

## Local / hosted CI counts

| Check | Result |
|---|---|
| Prisma generate / validate | PASS (hosted CI) |
| Clean migration deploy | PASS (hosted CI disposable DB + staging preDeploy) |
| Backend typecheck | PASS |
| Frontend typecheck | PASS |
| Backend tests | PASS — 296 |
| Frontend tests | PASS — 128 |
| Secret scan / dependency policy | PASS |
| Frontend production build / public-build safety | PASS |

Do not mark #14 PASS from this file alone.
