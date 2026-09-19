# Supreme Enterprise Record Standard

Unnumbered Supreme UI 2.0 product standard. Not punch-list item #41.

A governed record must stand on its own. A reviewer who did not create the record must answer WHAT, WHY, SOURCE, STATE, OWNER, IMPACT, EVIDENCE, RELATIONSHIPS, NEXT ACTION, and HISTORY from the record itself.

## Honesty rules

- Unknown ≠ 0
- Missing ≠ Failed
- Open ≠ Noncompliant
- No evidence ≠ Control failed
- Expired metadata ≠ Illegal
- Accepted risk ≠ Reduced score
- AI suggestion ≠ authoritative fact
- Residual risk ≠ compliance percentage
- Missing tier ≠ Medium
- No privacy regime ≠ GDPR

## Record workspace sections

Identity, source/provenance, observed fact, why the record exists, business/risk context, related governance, owner/responsibility, one primary next action, history.

## Domain notes

| Domain | Current implementation | Known gap |
| --- | --- | --- |
| Findings | Workspace drawer with source snapshot | Hosted memoryless review still Product Leadership |
| Assessments | Review summary for a completed assessment | In-progress assessments still use the questionnaire runner |
| Evidence | Organization-owned upload allowed; detail panel | Full non-vendor linkage matrix is progressive |
| Compliance requirement | Provenance + next action | Jurisdiction is not invented when the framework definition has none |
| Decisions | Immutable snapshot on RiskDecisionBrief | Benchmark for other decisions |
| Risk | Owner resolved from ownerUserId; accept requires rationale | No invented two-person rule |
| Controls | Exact finding drill-through | Control Center not redesigned |
| Privacy | Regime selected; purpose empty | Global privacy law catalog is not complete |
| AI | Vendor linkage preferred | Non-vendor provider must be explicit |
| Insurance | Production activation defaults are empty | Dedicated domain pages remain a future decomposition |

## Insurance decomposition (not this sprint)

InsuranceOverview, InsuranceEntities, InsuranceLicenses, InsuranceRegulatory, InsuranceClaims, InsuranceUnderwriting, InsuranceReinsurance, InsuranceThirdParties, InsuranceAI, InsuranceReports, InsuranceConfiguration.

## Graph relationship matrix

| Source action | Expected nodes | Expected edges | Current | Gap |
| --- | --- | --- | --- | --- |
| Assessment-generated finding | FINDING, VENDOR, ASSESSMENT | HAS_FINDING | Created at finding create/read | None for this path |
| Manual finding | FINDING, VENDOR | HAS_FINDING | Created at create | Optional control/risk only if linked |
| Evidence upload (vendor) | STORED_OBJECT, VENDOR | SUPPORTS / RELATED | Existing linkage service | — |
| Evidence upload (organization) | STORED_OBJECT | None until linked | Honest empty graph | User must link |
| Risk accept | DECISION, RISK | GOVERNS | Existing | — |
| Insurance entity | INSURANCE_ENTITY | Recorded edges only | Phase B | Do not fabricate |

## Scale risks

- Third Parties list requests pageSize 100 and filters in the browser.
- Assessments list takes 200.
- Evidence library takes 200.
- Findings list is organization-scoped; filters are client-side after fetch.

These are flagged, not redesigned in this remediation.

## Competitive depth (honest)

| Domain | Parity | Gap | Differentiator | Deferred |
| --- | --- | --- | --- | --- |
| Findings / TPRM | Source + observed answer + next action | Live external ratings | Explainable residual + snapshot | #39 later |
| Risk / Compliance | Owner, treatment, applicability | Full regulatory content libraries | Honesty labels | #24+ |
| Evidence | Reuse + scan honesty | Cross-object ownership UX still maturing | Fail-closed malware | Integrations #22 live deferred |

Do not claim Supreme is superior.
