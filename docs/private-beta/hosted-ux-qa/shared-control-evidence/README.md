# Hosted Shared Control & Evidence QA

Captured from live staging on 2026-09-13. These are not mocks.

**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Frontend SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**API SHA:** `a743c8a00910fac77d9046a27c2f0eb36d13abd2`  
**Tenant:** `demo-org-001`  
**Role:** Organization Admin  
**Date:** 2026-09-13

#14 remains PARTIAL until Product Leadership accepts the hosted experience. Cursor cannot declare visual PASS. #15 was not started.

## Hosted CI

https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34760658744 — PASS on `a743c8a`

## Screenshots

| File | What it shows |
|---|---|
| `control-center-375.png` | Control Center, mobile |
| `control-center-768.png` | Control Center, tablet |
| `control-center-1024.png` | Control Center, small laptop |
| `control-center-1440.png` | Control Center, AUTH-01 search |
| `control-center-1920.png` | Control Center, wide desktop |
| `control-detail-overview-1440.png` | AUTH-01 Overview |
| `control-detail-requirements-1440.png` | Mapped requirements |
| `control-detail-evidence-1440.png` | Evidence reuse and CLEAN links |
| `control-detail-testing-1440.png` | PASS / FAIL / PARTIAL tests |
| `control-detail-findings-1440.png` | Linked findings (raw IDs — P1) |
| `control-detail-risks-1440.png` | Residual-score honesty |
| `control-detail-relationships-1440.png` | Graph relationships for the control |
| `control-detail-history-1440.png` | History (`control.update` only — P1) |
| `control-detail-375.png` | Control Detail History, mobile |
| `control-detail-768.png` | Control Detail, tablet |
| `evidence-library-1440.png` | Evidence Library |
| `evidence-reuse-1440.png` | Use existing evidence + impact |
| `evidence-library-1024.png` | Evidence Library, small laptop |
| `evidence-library-375.png` | Evidence Library, mobile |
| `framework-coverage-1440.png` | CIS Controls coverage |
| `framework-coverage-1024.png` | Framework coverage, small laptop |
| `framework-coverage-375.png` | Framework coverage, mobile |
| `graph-controls-1440.png` | AUTH-01 Requirement → Control → Evidence |
| `graph-controls-375.png` | Graph, mobile |
| `reports-controls-1440.png` | #14 reports in catalog |
| `regression-*.png` | #12 surfaces after #14 deploy |

## Reports

HTTP 200 PDFs generated for this tenant: `control-coverage.pdf`, `evidence-coverage.pdf`, `framework-readiness.pdf`, `control-testing.pdf`.
