# Insurance Edition Blueprint

Authoritative #23 Phase A design. Insurance Edition is a **configurable industry layer** on Supreme. It is not a separate application, tenant model, risk engine, control engine, evidence store, TPRM engine, or API framework.

**Status:** GLOBAL FOUNDATION READY FOR PRODUCT LEADERSHIP REVIEW. Not #23 PASS.

## Reuse

| Capability | Source | Insurance use |
| --- | --- | --- |
| Third Party | #12 | Vendor records + insurance service classification |
| Governance Graph | #13 | Same graph; added node types only |
| Shared Control / Evidence | #14 | Insurance control extensions + evidence categories |
| Risk | #15 | Custom categories on Enterprise Risk. No second register |
| Compliance | #16 | Pack metadata only. No fabricated requirements |
| Privacy | #17 | Contextual, not forked |
| AI Governance | #18 | `InsuranceAiContext` on existing AI systems |
| Intelligence | #19 | Unchanged |
| Automation | #20 | Unchanged |
| Identity | #21 | Existing RBAC |
| API / Integrations | #22 | Read-only `/public/v1/insurance/*` |

## Configuration

`OrganizationEditionConfig` is versioned. Activate / revise creates a new version and supersedes the previous. Historical snapshots remain.

Fields: industry edition, organization type, domicile, operating jurisdictions, lines of business, activities, data handled, AI usage, third-party ecosystem, recommended packs, enabled packs, recommendation decisions, effective dates.

Honesty: **Recommended ≠ applicable. Configured pack ≠ compliant. Unknown ≠ 0. Expired license record ≠ legally unlicensed.**

## Global catalogs

Organization types, lines of business, activities, countries, authorities, pack metadata, risk taxonomy, vendor service categories, and evidence categories live in `backend/src/insurance/catalog.ts`.

Nigeria and the United States are the first two **reference markets**. The catalog also lists UK, EU, UAE, Saudi Arabia, South Africa, Kenya, Ghana, Canada, Singapore, Australia, and Other. Types are not assumed to apply in every country.

## Nigeria reference

- Authority metadata: NAICOM (public supervisor name only)
- Applicable type subset includes insurer, reinsurer, broker, loss adjuster, agent/intermediary, microinsurance, takaful, insurtech
- `naicom-placeholder` pack is metadata only. No invented obligations

## United States reference

- Insurance is state-supervised. Domicile state and operating states are recorded separately
- `US-STATE-DOI` is a generic state-regulator placeholder
- NAIC is a coordination placeholder, not automatically applicable
- NYDFS is an **optional overlay**. Not applied to all U.S. insurers

## Multi-entity groups

`InsuranceEntity.parentEntityId` models Group → regulated entity. Systems, vendors, evidence, and controls remain shared Supreme records. Licenses, risk ownership, and regulatory applicability stay entity-scoped.

## License register

Generic metadata: entity, authority, jurisdiction, type hook, reference, classes, status, dates, restrictions, owner, notes. Country packs define real license categories later. Phase A does not invent licenses.

## IRA overlay

Insurance questions are appended only when the edition is active. Baseline #12 weights are unchanged. Overlay answers add floors only.

## Graph

Same `GovernanceNode` / `GovernanceEdge` store. New node types: `INSURANCE_ENTITY`, `INSURANCE_LICENSE`, `JURISDICTION`, `REGULATOR`, `LINE_OF_BUSINESS`, `PRODUCT`, `BUSINESS_PROCESS`, `CRITICAL_SERVICE`.

## Authorization

- Viewer: `insurance.read`
- Risk / Compliance: `insurance.manage` for working records
- Organization Admin: activate / revise edition (`organization.manage`)
- Graph: configured claims, underwriting, pricing, policy administration, and reinsurance activities project as `BUSINESS_PROCESS` / `CRITICAL_SERVICE` nodes. Governance only. Not transactional engines.
- Public API token: `insurance:read` GET only. Not a human session

## Phase A out of scope

Detailed NAICOM / NAIC / NYDFS requirements, claims processing, rating engines, reinsurance accounting, and #24–#38 / #40 work.
