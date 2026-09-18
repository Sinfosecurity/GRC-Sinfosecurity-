# Insurance Edition Blueprint

Authoritative #23 design. Insurance Edition is a **configurable industry layer** on Supreme. It is not a separate application, tenant model, risk engine, control engine, evidence store, TPRM engine, Privacy module, AI Governance module, Intelligence engine, Automation engine, or API framework.

**Status:** PHASE B READY FOR PRODUCT LEADERSHIP REVIEW only after hosted staging proof. Not #23 PASS. #27 and #30 are not started as independent items. Nigeria and the United States exist only as first #23 reference jurisdictions.

## Architecture (unchanged)

```
SUPREME CORE
→ INSURANCE GLOBAL CORE
→ ORGANIZATION TYPE
→ ENTITY / GROUP
→ LINE OF BUSINESS
→ COUNTRY / JURISDICTION
→ REGULATORY PACKS
→ RISK / CONTROL / ASSESSMENT PACKS
→ MONITORING / INTELLIGENCE
→ REPORTING / EXAM READINESS
```

No second codebase.

## Reuse

| Capability | Source | Insurance use |
| --- | --- | --- |
| Third Party | #12 | Same Vendor record + `InsuranceVendorClassification` |
| Governance Graph | #13 | Same graph. Insurance projects entity, license, regulator, LOB, process, vendor, and AI nodes |
| Shared Control / Evidence | #14 | `INS-*` extensions + shared evidence categories. One object can support insurance + compliance + risk + TPRM |
| Risk | #15 | `Insurance / *` custom categories. No second register |
| Compliance | #16 | Versioned packs + human applicability. Historical assessments are not mutated |
| Privacy | #17 | Insurance data categories as context. No forked Privacy module |
| AI Governance | #18 | `InsuranceAiContext` on existing `AiSystem` |
| Intelligence | #19 | Insurance signals from recorded data only |
| Automation | #20 | Insurance templates. Humans remain accountable |
| Identity | #21 | Existing RBAC. Live IdP deferred |
| API / Integrations | #22 | Read-only `/public/v1/insurance/*`. Live Slack/Jira deferred |

## Honesty

- Recommended ≠ applicable. Applicable is a human decision with who / when / why.
- Configured pack ≠ compliant.
- Unknown ≠ 0. Loading ≠ 0. Not calculated ≠ 0%.
- Expired license **record** ≠ “operating illegally.” Attention copy: “Recorded license expiry has passed — review required.”
- Customer-recorded license ≠ registry-verified. External verification is later unless implemented.
- NAIC model law ≠ binding law in every state.
- Don't know cannot create a fabricated IRA tier.
- A pack version change does not silently mark controls noncompliant.

## Source / provenance model

Every Phase B regulatory requirement stores: regulator, jurisdiction, instrument, official title, source/reference, source URL, publication/effective dates when available, version, identifier, controlled summary, applicability notes, organization types, control mappings, evidence mappings, superseded flag, review date, and kind:

`AUTHORITATIVE_REQUIREMENT` | `GUIDANCE_SUPERVISORY_EXPECTATION` | `INDUSTRY_PRACTICE` | `SUPREME_CONTROL` | `SUPREME_PRODUCT_RECOMMENDATION`

Catalog: `backend/src/insurance/regulatoryCatalog.ts`.

## Nigeria — first authoritative reference market

Primary sources used:

- Nigerian Insurance Industry Reform Act 2025 (NIIRA), NAICOM publication: https://naicom.gov.ng/wp-content/uploads/2025/08/NIIRA-2025.pdf
- Nigeria Data Protection Act 2023 / NDPC resources: https://ndpc.gov.ng/resources/

Entity-specific packs:

| Pack | Types | Does not inherit |
| --- | --- | --- |
| `ng-insurer-core` | Insurer, reinsurer, microinsurance, takaful | Broker remittance / loss-adjuster duties |
| `ng-broker-core` | Broker, agent/intermediary | Insurer solvency / RBC |
| `ng-loss-adjuster-core` | Loss adjuster | Insurer capital or broker duties |
| `ng-privacy-ndpa` | Any NG data processing | Not an insurance-license substitute |

Recorded NIIRA citations include ss.5(1), 7(j), 15(1)–(2), 39(1), 43, 44(1), 48(1), 51. Supreme does **not** compute RBC formulas or invent naira thresholds.

Domains not forced: where current authority was not cited, the pack leaves a gap rather than inventing an obligation.

## United States — base + state overlay

- `us-base`: state-supervised licensing architecture. NAIC is not the licensing supervisor.
- `naic-data-security-model` (#668): model law. Enforceable only where adopted.
- `naic-ai-bulletin` (2023-12-04): guidance / model bulletin. Not a model law.
- `nydfs-500`: 23 NYCRR 500 second amendment (effective 2023-11-01). Recommended only when `US-NY` is a recorded domicile or operating jurisdiction **and** a human confirms applicability.

Sources:

- https://content.naic.org/sites/default/files/model-law-668.pdf
- https://content.naic.org/article/naic-members-approve-model-bulletin-use-ai-insurers
- https://www.dfs.ny.gov/industry_guidance/cybersecurity
- https://www.dfs.ny.gov/system/files/documents/2023/11/rf_fs_part500_amend2_20231101_alt.pdf

## Future jurisdictions

UK, EU, UAE, Saudi Arabia, South Africa, Kenya, Ghana, Singapore, and Australia remain catalog-ready. Phase B does not hard-code them as packs.

## Insurance operations

Claims, underwriting/pricing, delegated authority, and reinsurance/counterparty workspaces are **governance views**. They are not claims processing, quoting/rating, or treaty administration.

Vendor classification and AI context attach to existing Vendor / AI system records.

## IRA overlay

`ins1`–`ins14` remain overlay-only. Metadata records business meaning, pack trigger, possible floor, Don't know behavior, and country/org-type variation. Don't know never fabricates a tier.

## Reports (initial set)

1. Insurance Executive Risk Overview
2. Insurance Third-Party Oversight
3. License & Authorization Register
4. Regulatory Readiness (requirement–control–evidence, no invented %)
5. Insurance AI / Model Inventory
6. Critical Service / Concentration (counts, not invented exposure %)

## Exam / regulator readiness

Deferred inside #23. A new exam subsystem would duplicate existing audit/assessment primitives.

## Competitive benchmark (#39 evidence, Insurance Edition)

Compared on configuration, TPRM reuse, control/evidence reuse, regulatory packs, AI governance, graph, concentration, automation, regulatory change, multi-entity, and global jurisdiction handling.

| Capability | Supreme Phase B | Typical GRC suites (OneTrust, ProcessUnity, ServiceNow IRM, Archer, MetricStream, AuditBoard, LogicGate) |
| --- | --- | --- |
| Insurance as edition, not fork | Implemented as configuration on shared engines | Often a vertical module or services overlay; varies by vendor |
| Authoritative NG + US/NY provenance | Requirement records cite official instruments | US-centric content common; Nigeria NIIRA 2025 packs are uncommon |
| Human applicability | Required; Not applicable needs a reason | Often pack-on/off without audited legal-non-determination |
| TPRM / control / evidence reuse | Same Vendor, Shared Controls, StoredObject | Frequently duplicated questionnaires per module |
| Graph / concentration | Relationship counts on the existing graph | Dependency views exist; insurance-specific reinsurer/TPA concentration varies |
| License honesty | Expired record ≠ illegal operation | Register tools often imply legal status |

Supreme is **not** declared superior. This table records what Phase B implemented versus typical market patterns. Competitor product claims were not independently recertified in this gate.

## Authorization

- Viewer: `insurance.read`
- Risk / Compliance / Analyst with manage: `insurance.manage` for working records
- Organization Admin: activate / revise (`organization.manage`)
- No “Insurance Admin” bypass
- Public API: `insurance:read` GET only, including `/regulatory-packs` and `/models`. No public regulatory writes.

## Phase B out of scope

#24–#38 and #40. #27 and #30 as independent roadmap items. Live IdP. Live Slack/Jira. External license-registry verification. RBC calculation. Claims/rating/treaty engines. Exam workspace. Production deploy. Commercial GO.
