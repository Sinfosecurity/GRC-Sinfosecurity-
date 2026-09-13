# Shared Control & Evidence Layer Certification

**Item:** #14  
**Branch:** `supreme-risk-transformation`  
**Starting SHA:** `c1c9948e3cf8c761345082b1467b348582b3b1af`  
**Implementation SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted frontend SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted API SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Hosted CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34760658744 PASS  
**Status:** PARTIAL — TECHNICALLY STRONG, UX CLOSURE REQUIRED  
**#12:** PARTIAL / OPEN IN PARALLEL  
**#13:** Product Leadership accepted  
**#15:** NOT AUTHORIZED  
**Commercial production:** NO-GO

This is not #14 PASS. Product Leadership provisionally accepted the architecture on `a743c8a` and required customer-facing UX closure before PASS.

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
| Control Detail sections | PARTIAL — Overview / Requirements / Evidence / Testing work on hosted `a743c8a`; UX remediations replace raw IDs / `control.update` in this commit and need hosted re-proof |
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

Cursor does not declare premium UI PASS. Hosted screenshots below remain the `a743c8a` walkthrough. UX remediations below are in this commit and still require hosted re-review.

**Product Leadership closure items (2026-09-13)**

| Item | Working-tree remediation | Hosted re-proof |
|---|---|---|
| Raw UUIDs on Findings / Evidence | Control detail now shows person names and finding titles; IDs stay in the API only | Required |
| History codes such as `control.update` | API returns `label` / `actorName`; History shows “Control updated” and includes evidence / test events | Required |
| Relationships as a raw graph dump | Grouped Requirements / Evidence / Tests / Findings / Risks workspace; graph codes hidden | Required |
| Duplicate CLEAN evidence links | Application 409 for the same active file/target/relationship; additive partial unique index | Required |
| Cramped 375 Control Detail / Evidence Library | Horizontal section chips; vendor graph hidden on xs; compact reuse fields | Required |
| “Evidence path exists” | Replaced with “Mapped and implemented”; Gap retained | Required |

**P0:** none observed on hosted security or tenant isolation.

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
