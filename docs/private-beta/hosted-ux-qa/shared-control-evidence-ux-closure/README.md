# Hosted #14 UX closure QA

Captured from live staging on 2026-09-13. These are not mocks.

**URL:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Frontend SHA:** `ce5d01cbb01fe1e96becc03eb3baf308a280c8e9`  
**API SHA:** `915ac55049bf68f335ea8ef4a08db87a513a5fce`  
**Tenant:** `demo-org-001`  
**Role:** Organization Admin  
**Capture date:** 2026-09-13

#14 remains **PARTIAL — READY FOR PRODUCT LEADERSHIP FINAL REVIEW**. Cursor does not declare PASS. #12 remains PARTIAL. #15 was not started.

The frontend SHA is the UX closure commit. The API SHA is the documented descendant that keeps the synthetic scale fixture unique under the new active-link index. Customer-facing #14 UX is identical on both.

## Hosted CI

https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34763715915 — PASS on `915ac55`  
Earlier run https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34763245403 — FAIL on `ce5d01c` because the synthetic scale fixture still inserted duplicate active links. The fixture was corrected; uniqueness tests were not weakened.

## Migration

Staging pre-deploy applied `20260913193000_active_evidence_link_uniqueness` at 2026-09-13 14:39:21 UTC. No `db push`.

## Screenshots

### Control Detail

| File | Viewport |
|---|---|
| `control-detail-overview-{375,768,1440,1920}.png` | Overview |
| `control-detail-evidence-{375,768,1440,1920}.png` | Evidence |
| `control-detail-testing-{375,768,1440,1920}.png` | Testing |
| `control-detail-findings-{375,768,1440,1920}.png` | Findings |
| `control-detail-relationships-{375,768,1440,1920}.png` | Relationships |
| `control-detail-history-{375,768,1440,1920}.png` | History |

### Other #14 surfaces

| File | Viewport |
|---|---|
| `evidence-library-{375,768,1440,1920}.png` | Evidence Library |
| `duplicate-link-{375,768,1440,1920}.png` | Customer already-linked state |
| `framework-coverage-{375,768,1440,1920}.png` | Framework Coverage |

### #12 non-breakage (1440)

`regression-dashboard-1440.png`, `regression-vendors-1440.png`, `regression-assessments-1440.png`, `regression-questionnaire-1440.png`, `regression-evidence-1440.png`, `regression-findings-1440.png`, `regression-monitoring-1440.png`, `regression-decisions-1440.png`, `regression-reports-1440.png`, `regression-team-1440.png`
