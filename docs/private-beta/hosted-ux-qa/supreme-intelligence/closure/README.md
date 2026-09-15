# #19 final hosted closure

**Closure implementation SHA:** `9ee8529d806f17fdef6f736fb179cd8fc8e89327`  
**Prior documented implementation SHA:** `569cf4f4c6192e9710ee29d16d26172fbc516dbd`  
**Assessment typing SHA (unrelated #12 typing fix):** `e743d69726d0d7aa63dd06281caa4383d4565652`  
**Tenant:** Elite Claims  
**Date:** 2026-09-15  
**Hosted CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34914149569 PASS — 383 backend / 166 frontend on `9ee8529`  
**Status:** PARTIAL — Product Leadership final review required. Not PASS.

## SHA honesty

Hosted frontend at a11y time was `e743d69`. Hosted API during the chain/Viewer walk was still `569cf4f`. Those are not silently reconciled. The PDF footer fix lives only on `9ee8529` and is re-inspected after that API is live.

## Viewer

Used the existing identity role API. `report-proof-20260913@staging.supremerisk.test` was patched to `VIEWER`, logged in, then restored to `ORGANIZATION_ADMIN`. No production invitation token was exposed.

| Check | Result |
|---|---|
| Viewer login | 200, role VIEWER |
| Intelligence workspace | 200, 6 visible items |
| Acknowledge | 403 Insufficient permissions |
| Intelligence Brief PDF | 403 |
| Item INT-00005 | 200 (authorized source: control.read) |
| Admin restored | 200 ORGANIZATION_ADMIN; workspace still 200 |

## Multi-product chain

Created through product APIs only:

1. Existing shared control `GOV-01` Governance roles and accountability  
2. Enterprise risk `RISK-00001`  
3. `POST /erm/risks/RISK-00001/controls` — MITIGATES  
4. High finding on the existing Northwind vendor  
5. `POST /erm/risks/RISK-00001/findings`  
6. `POST /scc/controls/:id/tests` result FAIL  

Intelligence item **INT-00005** — Control failed testing.

Then `POST .../tests` result PASS. INT-00005 → `RESOLVED_BY_SOURCE`. INT-00006 — Control passed testing (positive movement). History kept.

## Graph impact on INT-00005

Source: `OrganizationControlTest` `673992e2-8674-4bfa-ba98-4e4a0ee0b6ca` (GOV-01)  
Node type: CONTROL_TEST  
Depth / limit: #13 defaults (depth 3 / 200)

Related counts from real traversal:

| Type | Count |
|---|---|
| CONTROL_TEST | 1 |
| CONTROL | 6 |
| REQUIREMENT | 10 |
| RISK | 1 |
| FINDING | 1 |

No edges were inserted outside product APIs. Catalog SATISFIED_BY edges already existed for GOV-01. MITIGATES and finding links were created by ERM link APIs. TESTED_BY was created by `recordControlTest`.

Domains: Control, Compliance (requirements), Risk, Third Party (finding). Evidence / Privacy / AI were not added because no authoritative evidence or privacy/AI links were created for this control.

## Isolation

Second tenant via signup:

- item INT-00005 → 404  
- forged organizationId → 403  
- search q=INT-00005 → no leak  
- brief PDF → 200, no Elite Claims text  
- graph summary → 200 for that tenant only  

## Performance (hosted, not enterprise-scale)

| Call | ms |
|---|---|
| workspace | 1252 |
| changes | 354 |
| detail / graph impact | included in 354–1252 window; detail fetch succeeded in the same session |
| executive | 286 |
| 8 workspace browses | all 200, no 429 |

Limiter 429 after budget is proved in CI with max=2, not by burning 180 hosted requests.

## Screenshots

Viewport and axe captures: `intelligence-*-{375,768,1024,1440,1920}.png`  
0 serious / 0 critical axe on home, changes, executive, and INT-00005 detail.
