# Hosted #16 Supreme Compliance evidence

**Date:** 2026-09-13  
**Starting SHA:** `bde2d9e20dc50d337e3546183aab7ae4a7a1d512`  
**Implementation SHA:** `42370e22303fa18b53c92c34d08f279d7f14f4e8`  
**Hosted frontend SHA:** `42370e22303fa18b53c92c34d08f279d7f14f4e8`  
**Hosted API SHA:** `42370e22303fa18b53c92c34d08f279d7f14f4e8`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34778303631 PASS  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**Production:** NO  
**#16 PASS:** NOT DECLARED

## Discrepancies (not silently reconciled)

- Before this implementation, hosted frontend was `dbc4982` and hosted API was `6542e58` while local HEAD was `bde2d9e`. Those #15 hosted SHAs were left in place until this deploy.
- After deploy, frontend and API both report `42370e2`.
- Hosted `/health` still reports `environment: production` on the staging hostname, and `status: degraded`. Neither was changed to look healthier.

## Differentiating workflow (live Elite Claims numbers)

NYDFS `500-ref` activated as `ACT-00001`. ISO/IEC 27001 `2013-ref` activated as `ACT-00002`, then changed to `2022-ref`. Historical period `AUD-00002` remains on `2013-ref`.

After marking `A.15` applicable on `ACT-00002`:

- Requirement coverage **100%** (1/1 applicable mapped)
- Evidence coverage **0%** (0/1 current CLEAN supporting links)
- Implementation coverage **0%**
- Testing coverage **not calculated** (no implemented mapped control in the denominator)
- **0** applicable requirements remain unmapped
- **2** open gaps: control not implemented; CLEAN evidence missing
- **8** requirements still not determined

Exact remaining-work sentence from the hosted activation:

> 100% of applicable requirements are mapped. 0% already have current evidence. 0 requirements remain unmapped. 2 gaps are open.

These are live tenant counts. They are readiness/coverage, not certification.

## Verified

- Catalog has 10 reference packs (NIST CSF, 800-171, CMMC, ISO 2013-ref + 2022-ref, SOC 2, CIS, PCI DSS, HIPAA safeguards, NYDFS). Original Supreme summaries only. No official-endorsement claim.
- Activation is opt-in. Nothing was auto-activated before this walkthrough.
- Not applicable without rationale returns 400.
- Attestation submit works. Review accepts `REVIEWED` (not `APPROVED`).
- Approved exception does not change control effectiveness.
- `AUD-00002` still reports version `2013-ref` after the activation moved to `2022-ref`.
- Cross-tenant activation get is 404 with no public-id leak.
- Reports: readiness/gaps/attestations/evidence/exceptions/executive/board PDFs and board PPTX are live binaries.
- Import preview prefixes `=1+1` as `'=1+1`.
- Viewports 375–1920 on dashboard, catalog, framework, requirement, gaps, exceptions, campaign, audit, plus #12/#13/#14/#15 regression routes. No page-level horizontal overflow in the script checks.
- Residual risk on `RISK-00001` stayed **25 / Critical** after a gap link. The list endpoint exposes the score; detail is nested under `data.risk`.

## Attention queue

Hosted dashboard attention was empty. That matched the live filters: no overdue campaign, no expired exception, no unmapped/failed-test/expired-evidence gap of those sources. Open “not implemented” / “evidence missing” gaps appear on the Gaps page and in What changed, not in the attention list.

## Database-backed performance (isolated CI Postgres)

Not hosted staging. Not enterprise scale certification.

| Surface | ms |
|---|---|
| Dashboard | 57 |
| Framework detail | 158 |
| Requirements | 105 |
| Cross-framework | 15 |
| Board PDF | 86 |
| Board PPTX | 65 |

## Open after hosted walkthrough

- Campaign workspace is a submit form plus counts; it does not list each attestation for review.
- Attention does not yet queue implemented-but-not-tested controls or open high-severity findings.
- Framework detail prints a testing percent even when the metric is not calculated.
- Graph summary shows attestation and compliance-period nodes; exception nodes are created only when an exception is tied to a control or requirement.
- CLEAN file `sr-clean-evidence.txt` correctly reported 0 linked controls / requirements / programs because no explicit links exist.
