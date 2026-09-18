# Hosted #23 Insurance Edition Phase B

**Status:** PHASE B READY FOR PRODUCT LEADERSHIP REVIEW. #23 PASS is not declared.

**Starting SHA:** `cd463017ee6e00ff1804ba691243c38fd104a72e`  
**Implementation SHA:** `f87038fa160e935ae6b6f890a3124dd383c0b1ec`  
**Hosted frontend SHA:** `f87038fa160e935ae6b6f890a3124dd383c0b1ec`  
**Hosted API SHA:** `f87038fa160e935ae6b6f890a3124dd383c0b1ec`  
**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35405219418 SUCCESS on `f87038f`  
**Official walk:** `python3 scripts/hosted-insurance-edition-phase-b-qa.py` — **38 PASS / 0 FAIL**  
**Supplemental hosted proofs:** **99 PASS / 0 FAIL / 1 SKIP**  
**Production touched:** NO  

Frontend and API SHAs are equal on this candidate. Both include Phase B runtime and migration `20260918220000_insurance_phase_b`.

## Disposable tenants

| Scenario | Org prefix | Pack result |
| --- | --- | --- |
| NG insurer (official walk) | `d5ccd373` | `ng-insurer-core` + `ng-privacy-ndpa`; no broker/adjuster core |
| NG broker | `9ea2d884` | `ng-broker-core`; no insurer solvency/RBC pack |
| NG loss adjuster | `d34462d7` | `ng-loss-adjuster-core`; no insurer or broker-only pack |
| US non-NY (Ohio) | `0208797f` | `us-base` + NAIC model/guidance; **no** `nydfs-500` |
| US New York | `cd2a47d1` | `us-base` + `nydfs-500` recommended; human review recorded |
| NG ops (vendor/AI/reuse) | `fd63737c` | full operations + evidence reuse |

## Control / evidence reuse

One StoredObject `abc36325-d1a5-4faa-87f4-93e3b3e37a53` (malware `CLEAN`) was linked to two existing Shared Controls without a second upload. Reuse lookup `200`. No file content is stored in this evidence pack.

## Honesty retained

- Recommended ≠ applicable. NYDFS is not applied because country = US.
- NAIC Model #668 remains a model law. NAIC AI bulletin remains guidance.
- Expired license metadata → review required. Never “operating illegally.”
- Claims / underwriting / reinsurance are governance views, not processing/quoting/placement engines.
- Viewer RBAC: **SKIP** — invite created, hosted viewer session token not issued (email degraded). Org Admin and insurance.manage paths were proved. RBAC was not weakened.

## Screenshots

`docs/private-beta/hosted-ux-qa/insurance-edition/phase-b/` — overview, entities, licenses, regulatory, claims, underwriting, reinsurance, AI, configuration at 375 / 768 / 1024 / 1440 / 1920 where required, plus scenario regulatory shots.

Machine results: `results.json`.
