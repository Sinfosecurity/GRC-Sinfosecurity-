# Hosted #17 Supreme Privacy evidence

**Date:** 2026-09-13  
**Starting SHA:** `6aaf0253fb153867de4ff964a47bcfd8cbde79bc`  
**Implementation SHA:** `134d12860c595603106180c35ad3a10a328917f7`  
**Base implementation SHA:** `20811dafcbb5f55899e07d5abe19357024e5d43d`  
**Operational closure SHA:** `9976e811550c09b0a1fc5961f8dabd8f4fc0b4b8`  
**Final visual closure SHA:** `6dab4ff4b116046ed46ae397cdc7a612ffdce9ef`  
**Product SHA on staging:** `1dd47b3b82f7c7481579a4e47beda5abd08cc76c`  
**Hosted frontend SHA:** `1dd47b3b82f7c7481579a4e47beda5abd08cc76c`  
**Hosted API SHA:** `1dd47b3b82f7c7481579a4e47beda5abd08cc76c`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34786063666 PASS on `6dab4ff`  
**Backend tests:** 338  
**Frontend tests:** 156  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Production:** NO  
**#17 PASS:** NOT DECLARED

## Discrepancies (not silently reconciled)

- Visual-closure product SHA `1dd47b3` is on hosted frontend and API. Branch head / CI SHA `6dab4ff` only changes the native-render script and CI LibreOffice tolerance. That hosted-vs-CI mismatch is recorded.
- Documentation after this walkthrough will be ahead of hosted `1dd47b3`.
- Hosted `/health` remains `degraded` for preexisting reasons: MongoDB `NOT_CONFIGURED`, email `DEGRADED`, AI `NOT_CONFIGURED`, high heap. Postgres, Redis, Stripe test mode, and malware CONNECTED / fail-closed downloads are unchanged.
- CI LibreOffice exported 12 pages with 1 unique image hash (`native-attempted`). Distinct visual QA used Microsoft PowerPoint on the Mac runner.
- The walkthrough cover-text regex missed `xml:space="preserve"` and recorded a false FAIL. Extracted slide XML contains `Board Risk Committee report`.

## Native Board PPTX render

`Supreme-Privacy-Board.pptx` was downloaded from hosted `/api/v1/privacy/reports/board.pptx` and rendered with Microsoft PowerPoint → PDF → PNG.

- Engine: Microsoft PowerPoint
- Pages: 12
- Unique hashes: 12
- Reconstruction: native
- Proof: `native-slides/native-render.json`
- `board-slide-1.png` … `board-slide-12.png` are copies of those native images. HTML slide cards were removed.

Cover, posture, footprint, risk, transfers, rights, DPIA, vendor, retention, evidence, decisions, and 90-day actions are present. Copy says “No trend available.” It does not invent arrows or say “You must notify.”

## Slide defects

Found on the first native empty-tenant render:

- Cover and navy headers painted without readable text (fill order)
- Word spaces collapsed in Office
- “None invented” overflowed a KPI tile
- Empty-state transfer line was a dummy fragment
- Prior visual QA used HTML reconstructions

Fixed in `1dd47b3` before hosted re-render.

Still open for Product Leadership:

- Long decision lines clip at 140 characters (GAP-00001 on slide 11)
- KPI tiles remain tightly rounded
- CI LibreOffice is not a substitute for PowerPoint visual QA

## 375 / 768 workspaces

Deletion and incident tables use compact cards below 900px. Primary fields stay visible. Secondary fields sit behind **Details**. Hosted overflow checks passed.

- Deletion 375/768: 4 cards, 4 Details buttons, no page overflow
- Incident 375/768: 2 cards, 2 Details buttons, no page overflow

## Honesty and customer language

- Recorded legal basis is not a finding that processing is lawful
- DPIA screening does not say a DPIA is legally required
- Configured DSR deadline is not legal advice
- Rights list does not show `hosted.requester@example.com`
- Cross-tenant read of `PA-00004` returned 404
- Consent collector remains **Not configured / manual**
- Legal hold close returned 400
- Incident copy does not say “You must notify”
- New deletion/incident cards use public IDs and human labels
- Vendor route still uses the Third Party UUID; assessment rows show `Assessment 1`, not that UUID

## Reports

Regenerated on Elite Claims: ROPA, Privacy Risk, DPIA, Transfers, Rights, Retention, Vendor Privacy, Executive, Board PDF, Board PPTX.

## #12–#16 regression

`regression-compliance-1440.png`, `regression-risk-1440.png`, `regression-graph-1440.png`, `regression-controls-1440.png`, `regression-reports-1440.png`, `regression-methodology-1440.png`. No breakage observed. #12 remains PARTIAL.
