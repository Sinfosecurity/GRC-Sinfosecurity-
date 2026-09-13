# ADR: Supreme Compliance

**ADR ID:** ADR-SUPREME-COMPLIANCE  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #16 Supreme Compliance  
**Starting SHA:** `bde2d9e20dc50d337e3546183aab7ae4a7a1d512`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#13 status:** Product Leadership accepted  
**#14 status:** Product Leadership accepted  
**#15 status:** Product Leadership accepted  
**#17 authorized:** NO

## CONTEXT

Product Leadership authorized #16 on 2026-09-13 after accepting #15. #14 already owns the authoritative framework catalog, common controls, mappings, tests, and CLEAN evidence reuse. #13 stores relationship identity only. #15 owns enterprise residual risk. Legacy `ComplianceFramework` / `ComplianceRequirement` tables and the quarantined `/compliance` mock are leftover GRC and are **not** this product.

Supreme Compliance is the compliance-management product of the Supreme Governance Platform. It is not a checklist, and it is not a certification engine.

## PROBLEM

Without a dedicated compliance plane, later work will either:

1. overload Control Center with program, attestation, exception, and audit-period semantics, or
2. revive leftover compliance CRUD that lacks applicability, campaigns, truthful readiness, and graph/risk integration.

Both would break the accepted #13/#14/#15 authority model and invite false “you are compliant” claims.

## DECISION

#16 introduces a **new authoritative compliance-program plane**. It does not replace `FrameworkDefinition`, `OrganizationControl`, `EvidenceGovernanceLink`, `StoredObject`, `EnterpriseRisk`, or `GovernanceNode`.

| Concern | Authoritative store | #16 role |
|---|---|---|
| Framework identity / version / requirement identifier | `FrameworkDefinition` + `FrameworkVersion` + `FrameworkRequirement` | Reused. No copyrighted standard text |
| Common control / implementation / effectiveness | `OrganizationControl` | Shown, never copied per framework |
| Mapping strength | `RequirementControlMapping` | Reused `PRIMARY` / `CONTRIBUTING` / `PARTIAL` / `RELATED` |
| Control tests | `OrganizationControlTest` | Displayed. Not an attestation |
| Evidence bytes / malware | `StoredObject` | Unchanged fail-closed CLEAN policy |
| Shared evidence reuse | `EvidenceGovernanceLink` | Offer existing CLEAN links before upload |
| Enterprise residual risk | `EnterpriseRisk` | Linked as potential impact only |
| Graph identity | `GovernanceNode` / `GovernanceEdge` | Projection from compliance tables |
| Leftover `ComplianceFramework` | Legacy tables | Not written by #16 |
| Framework activation / scope | `ComplianceActivation` | Tenant opt-in. Nothing is auto-activated |
| Requirement applicability | `ComplianceRequirementState` | Applicable / Not applicable / Under review / Not determined |
| Control attestation | `ComplianceAttestation` | Governance statement, not a test |
| Attestation campaign | `ComplianceAttestationCampaign` | Period, due dates, attestors, reviewers |
| Gap | `ComplianceGap` | Linked to findings when one already exists |
| Exception | `ComplianceException` | Time-bounded. Does not make a control effective |
| Audit / assessment period | `CompliancePeriod` + items | Internal readiness. Not an external attestation |
| History | `ComplianceHistory` | Customer-language change log |

### Product principle

Evidence once. Control once. Map everywhere. Govern everywhere.

Attestation is not a control test. Evidence presence is not compliance. Not applicable is not pass. An exception does not make a control effective. A gap does not change residual risk unless the Supreme Risk engine is invoked.

Supreme never says a tenant is ISO 27001 certified, SOC 2 compliant, or CMMC passed unless that status is independently and legitimately established outside this product.

## FRAMEWORK CATALOG

#14 packs remain the catalog. #16 may add **original Supreme summaries** and public identifiers only. Packs name NIST CSF, NIST SP 800-171, CMMC, ISO 27001, SOC 2, CIS Controls, PCI DSS, HIPAA Security Rule safeguards, and NYDFS 500 as **reference packs**, not licensed reproductions.

Presence of a pack is not endorsement by the publisher and is not certification.

Framework versions evolve. `FrameworkVersion.status` may be `ACTIVE` or `SUPERSEDED`. Historical `CompliancePeriod.frameworkVersionId` is immutable after create. Changing an activation’s current version writes `ComplianceVersionChange` and creates states for new requirements. Old periods and old states are not rewritten.

## ACTIVATION AND SCOPE

A tenant activates one framework version (optionally scoped to a business unit) with owner, start date, target date, and status. Default requirement applicability is `NOT_DETERMINED`. Requirements are never silently excluded.

`NOT_APPLICABLE` requires rationale, actor, and date. Not applicable is excluded from readiness denominators and is never counted as implemented, tested, or covered.

## READINESS

If a percentage is shown, the formula is returned with it.

| Metric | Numerator | Denominator |
|---|---|---|
| Requirement coverage | Applicable requirements with at least one active mapping | Applicable requirements |
| Control implementation coverage | Mapped applicable requirements whose mapped controls include at least one `IMPLEMENTED` control | Mapped applicable requirements |
| Testing coverage | Implemented mapped controls with a latest test of PASS, FAIL, or PARTIAL | Implemented mapped controls |
| Evidence coverage | Mapped applicable requirements with at least one CLEAN, current, SUPPORTS or PARTIALLY_SUPPORTS evidence link | Mapped applicable requirements |

`NOT_TESTED` and `NOT_APPLICABLE` tests are not PASS. Empty applicability (`NOT_DETERMINED` only) shows a truthful empty state, not 0% or 100%.

Language allowed: Readiness, Coverage, Mapped, Implemented, Tested, Evidence available, Gap.  
Language forbidden as a product claim: Certified, Compliant, Passed.

## ATTESTATION VERSUS TESTING

| Object | Meaning |
|---|---|
| Attestation | Named person states implementation for a period |
| Control test | Independent recorded test with method and result |
| Evidence | File that may support a control or requirement if CLEAN |
| Finding | Tracked issue; reused from `VendorIssue` when one already represents the gap |

Campaigns use existing `notifyUser()` only. No new spam loop.

## GAPS AND EXCEPTIONS

A gap may come from an unmapped applicable requirement, unimplemented or ineffective control, missing/expired evidence, failed test, open finding, or unresolved exception. If a `VendorIssue` already represents the issue, the gap links it instead of duplicating.

Expired exceptions appear on the attention list. Approving an exception never changes `OrganizationControl.effectivenessStatus`.

## RISK INTEGRATION

A gap or exception may link to an `EnterpriseRisk`. The UI label is **Potential risk impact**. Residual scores are not written by #16.

## GRAPH

#16 projects:

| Edge | From | To |
|---|---|---|
| `SATISFIED_BY` | Requirement | Control | already #14 |
| `SUPPORTED_BY` | Evidence | Control / Requirement | already #14 |
| `TESTED_BY` | Control | Control test | already #14 |
| `APPLIES_TO` | Exception | Requirement or Control |
| `COVERS` | Compliance period | Requirement or Control |
| `ASSOCIATED_WITH` | Gap | Finding or Risk | only when the user records that fact |
| `MITIGATES` | Control | Risk | only when #15 already recorded it |

Node types added: `EXCEPTION`, `COMPLIANCE_GAP`, `ATTESTATION`, `COMPLIANCE_PERIOD`. The graph remains a projection.

## AUTHORIZATION

| Permission | Viewer | Assessor | Approver | Risk Manager / Org Admin |
|---|---|---|---|---|
| `compliance.read` | yes | yes | yes | yes |
| `requirement.attest` | | yes | | yes |
| `exception.create` | | yes | | yes |
| `requirement.manage` | | yes | | yes |
| `attestation.review` | | | yes | yes |
| `exception.approve` | | | yes | yes |
| `framework.activate` | | | | yes |
| `compliance.manage` | | | | yes |
| `audit.manage` | | | | yes |
| `compliance.report` | | export roles | export roles | yes |

Buttons are not authorization. Routes use `requirePermission`.

## CONTENT LICENSING

Store framework name, publisher, version, requirement identifier, original Supreme summary, source URL, and mapping metadata. Do not store copyrighted control text from ISO, CIS, PCI, or similar. Do not imply official endorsement.

## CUSTOMER IDENTIFIERS

`ACT-00001`, `CRS-00001`, `CAM-00001`, `ATT-00001`, `GAP-00001`, `EXC-00001`, `AUD-00001`. Requirement labels use the public requirement key (`GV.RR`, `A.5.19`). UUIDs are not primary labels.

## IMPACT

Supreme Compliance becomes the program, applicability, attestation, gap, exception, and audit-period layer on top of #13–#15. It does not certify customers. Legacy ISO/TISAX pages remain quarantined.
