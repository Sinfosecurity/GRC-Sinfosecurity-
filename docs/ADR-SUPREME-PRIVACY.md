# ADR: Supreme Privacy

**ADR ID:** ADR-SUPREME-PRIVACY  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #17 Supreme Privacy  
**Starting SHA:** `6aaf0253fb153867de4ff964a47bcfd8cbde79bc`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#13–#16 status:** Product Leadership accepted  
**#18 authorized:** NO

## CONTEXT

Product Leadership accepted #16 on 2026-09-13 and authorized #17. #13 stores relationship identity only. #14 owns common controls, tests, and CLEAN evidence reuse. #15 owns enterprise residual risk. #16 owns framework programs, applicability, gaps, and attestations. Leftover GRC inventory pages and the public `/privacy` legal draft are **not** this product.

Supreme Privacy is the privacy-operations product of the Supreme Governance Platform. It is not a data-inventory CRUD list, not a cookie banner, and not a law firm.

## PROBLEM

Without a dedicated privacy plane, later work will either:

1. overload Compliance with ROPA, DSR, transfer, and DPIA semantics, or
2. invent a second vendor, control, evidence, or risk database.

Both would break the accepted #13–#16 authority model and invite false legal conclusions.

## DECISION

#17 introduces a **new authoritative privacy-operations plane**. It does not replace `Vendor`, `OrganizationControl`, `StoredObject`, `EnterpriseRisk`, `ComplianceActivation`, or `GovernanceNode`.

| Concern | Authoritative store | #17 role |
|---|---|---|
| Vendor / processor identity | `Vendor` | Privacy role and links only |
| Common control / test | `OrganizationControl` | Linked, never copied |
| Evidence bytes / malware | `StoredObject` | Unchanged fail-closed CLEAN policy |
| Shared evidence reuse | `EvidenceGovernanceLink` | Explicit links; presence is not proof |
| Enterprise residual risk | `EnterpriseRisk` | Linked as potential privacy impact |
| Framework requirement | `FrameworkRequirement` + `ComplianceRequirementState` | Reused; no second compliance engine |
| Graph identity | `GovernanceNode` / `GovernanceEdge` | Projection from privacy tables |
| Processing activity / ROPA | `PrivacyProcessingActivity` | System of record |
| Purpose + recorded basis | `PrivacyPurpose` + `PrivacyLawfulBasis` | Organization assertion, not a lawful finding |
| Data / subject taxonomies | Join rows on activity | Configurable; not every category applies |
| International transfer | `PrivacyTransfer` + `PrivacyTransferAssessment` | Recorded mechanism and review |
| DPIA / PIA | `PrivacyDpia` + screening answers | Recommendation, not “legally required” |
| Rights request | `PrivacyRightsRequest` | Masked list views; need-to-know detail |
| Consent / preference | `PrivacyConsentRecord` | Manual unless a collector is configured |
| Retention / disposal | `PrivacyRetentionRule` + `PrivacyDeletionTask` | Surfaces due work; does not auto-delete |
| Notice versions | `PrivacyNoticeVersion` | Historical truth of what was in force |
| Incident linkage | `PrivacyIncidentLink` | Connects existing incident/finding records |
| History | `PrivacyHistory` | Customer-language change log |

### Product principle

Know the data. Know why it exists. Know where it flows. Know what risk it creates. Know what action is required.

A recorded legal basis is not a finding that processing is lawful. A DPIA is not a GDPR satisfaction claim. A configured deadline is not legal advice. A closed deletion task is not proof the data is gone. Consent collection remains **Not configured** until a real collector exists.

## TAXONOMIES

Data-subject categories and personal-data categories are selectable catalogs. Tenants are not forced to use every category. Selecting Health or Biometric records sensitivity metadata. It does **not** conclude that a special-category legal condition is met.

## REGIMES

Reference packs name GDPR, UK GDPR, CCPA/CPRA, US state privacy, HIPAA privacy-related obligations, GLBA privacy concepts, NY privacy/security obligations, LGPD, and Canadian privacy regimes as **citation + original Supreme summary + source URL**. No copyrighted statutory text. Applicability is recorded, never auto-declared.

## DEADLINES

Rights-request due dates are regime-specific, versioned, explainable, and overridable with rationale. The UI shows original deadline, extension, current due date, and why.

## GRAPH

New node types are projected only from authoritative rows: `PROCESSING_ACTIVITY`, `DATA_CATEGORY`, `DATA_SUBJECT_CATEGORY`, `TRANSFER`, `DPIA`, `RIGHTS_REQUEST`, `RETENTION_RULE`, `CONSENT_RECORD`. Relationships reuse canonical types (`USES`, `PROCESSES`, `SHARES_WITH`, `ASSESSED_BY`, `ASSOCIATED_WITH`, `AFFECTS`, `MITIGATES`, `COVERS`) plus `TRANSFERS_VIA` and `CONCERNS` where direction must be explicit. The graph is not a second system of record.

## RBAC

Viewer: `privacy.read` and `rightsRequest.read` without requester identity fields. Privacy manager / org admin: create and manage activities, transfers, retention, and DSRs. Approver / DPO-like: `dpia.approve` and `rightsRequest.approve`. Sensitive requester fields require `rightsRequest.manage`. Frontend hiding is not authorization.

## HONESTY

Supreme must not claim processing is GDPR compliant, a transfer is lawful, a DPIA satisfies GDPR, or a deadline is legally correct unless a versioned rule explicitly supports that statement. Use recorded basis, readiness, assessment, review required, potential privacy impact, and configured deadline.
