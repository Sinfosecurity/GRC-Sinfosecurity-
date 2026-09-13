# Governance Graph Domain Inventory

Inspected from `backend/prisma/schema.prisma` on #13 start. Do not invent duplicate objects.

| ENTITY | SOURCE MODEL | TENANT OWNERSHIP | CURRENT RELATIONSHIPS | GRAPH NODE? | GRAPH EDGE? | AUTHORITATIVE SOURCE | CURRENT PRODUCT | FUTURE PRODUCT USE |
|---|---|---|---|---|---|---|---|---|
| Organization | `Organization` | self | owns vendors, users, TPRM objects | YES — ORGANIZATION | OWNS vendors | Organization | Platform / Third Party | All products |
| Vendor | `Vendor` | `organizationId` | assessments, issues, contracts, monitoring, documents | YES — VENDOR | OWNS, ASSESSED_BY, HAS_FINDING, HAS_RISK, USES contract, CONTROLLED_BY | Vendor | Supreme Third Party | Risk, Privacy, Intelligence |
| Assessment | `VendorAssessment` | `organizationId` + `vendorId` | responses; vendor documents | YES — ASSESSMENT | VENDOR --ASSESSED_BY--> ASSESSMENT | VendorAssessment | Supreme Third Party | Compliance evidence input |
| Assessment response | `AssessmentResponse` | via assessment | question answers | NO | NO — not a governance object | AssessmentResponse | Third Party | — |
| Finding | `VendorIssue` | `organizationId` + `vendorId` | remediation fields on same row; **no assessmentId** | YES — FINDING | VENDOR --HAS_FINDING--> FINDING | VendorIssue | Supreme Third Party | Risk / Compliance findings |
| Remediation | `VendorIssue.correctiveActionPlan` | same row as finding | CAP / dates | YES — REMEDIATION only when CAP exists | FINDING --REMEDIATED_BY--> REMEDIATION | VendorIssue | Supreme Third Party | Risk |
| Evidence | `StoredObject` | `organizationId` | `EvidenceLink` optional vendor/assessment/issue/question | YES — EVIDENCE | EVIDENCE --SUPPORTED_BY--> linked target | StoredObject | Third Party | #14 reuse later |
| Evidence link | `EvidenceLink` | `organizationId` | vendorId, assessmentId, issueId, questionId | NO | YES — proven support edges only | EvidenceLink | Third Party | #14 |
| TPRM residual risk | `ScoreCalculation` | `organizationId` + `vendorId` | historical snapshots | YES — RISK | VENDOR --HAS_RISK--> RISK | ScoreCalculation | Third Party | Supreme Risk later |
| Decision brief | `RiskDecisionBrief` | `organizationId` + `vendorId` | optional `scoreCalculationId` | YES — DECISION | APPLIES_TO vendor and matching risk | RiskDecisionBrief | Third Party | All products |
| Contract | `VendorContract` | `organizationId` + `vendorId` | vendor | YES — CONTRACT | VENDOR --USES--> CONTRACT | VendorContract | Third Party | Privacy / legal later |
| Vendor risk control | `VendorRiskControl` | `organizationId` + `vendorId` | optional Control FK | YES — CONTROL when rows exist | VENDOR --CONTROLLED_BY--> CONTROL | VendorRiskControl | Third Party records only | #14 / Risk later |
| Legacy risk | `Risk` | `organizationId` | RiskControl | YES if rows exist | CONTROL --MITIGATES--> RISK when mapped | Risk | Legacy GRC, not shipped Risk product | Supreme Risk |
| Legacy control | `Control` | `organizationId` | RiskControl | YES if rows exist | MITIGATES | Control | Legacy GRC | #14 / Compliance |
| Monitoring | `VendorMonitoring` | vendor-scoped | signals | NO node in #13 taxonomy | none invented | VendorMonitoring | Third Party | Intelligence later |
| Questionnaire template | `QuestionnaireTemplate` | platform or org | sections/questions | NO — not FRAMEWORK | none | QuestionnaireTemplate | Third Party library | #14 frameworks later |
| Policy | `Policy` | `organizationId` | none to TPRM | TYPE only | none | Policy | Legacy / not Third Party v1 | Compliance |
| Incident | `Incident` | `organizationId` | none to TPRM | TYPE only | none unless rows later linked | Incident | Legacy | Risk / Intelligence |
| Framework / requirement / regulation | none as platform catalog | n/a | n/a | TYPE only | none | future platform-owned | not implemented | #14 / Compliance / Privacy / AI Gov |
| System / application / asset / data asset / AI system | none | n/a | n/a | TYPE only | none | future | not implemented | Privacy / AI Governance |
| Business unit | none | n/a | n/a | TYPE only | none | future | not implemented | Supreme Risk |

## Proven #13 edges (only)

- ORGANIZATION --OWNS--> VENDOR
- VENDOR --ASSESSED_BY--> ASSESSMENT
- VENDOR --HAS_FINDING--> FINDING
- FINDING --REMEDIATED_BY--> REMEDIATION (CAP present)
- VENDOR --HAS_RISK--> RISK (`ScoreCalculation`)
- DECISION --APPLIES_TO--> VENDOR
- DECISION --APPLIES_TO--> RISK when `scoreCalculationId` matches
- EVIDENCE --SUPPORTED_BY--> VENDOR / ASSESSMENT / FINDING from `EvidenceLink`
- VENDOR --USES--> CONTRACT
- VENDOR --CONTROLLED_BY--> CONTROL when `VendorRiskControl` exists
- CONTROL --MITIGATES--> RISK only from legacy `RiskControl`

Not created: Assessment --HAS_FINDING--> Finding (no source FK). Finding --AFFECTS--> Risk merely because they share a vendor.
