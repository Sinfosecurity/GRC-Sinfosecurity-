# Premium experience hosted visual QA

**Sprint:** Supreme Governance Platform — Premium Experience & Brand Closure — Final Focused Acceptance  
**Starting SHA (user-cited for this closure):** `d9f9afcde9b276224d943fd2c8370cb7ab5e6627`  
**Hosted API at mission start:** `164dbd22f03c914d6ae2e0e96f9f2cfdcef2a7fe`  
**Product-gap closure SHA (hosted vendor re-walk):** `97d79fffcd38b59527bd1d9f926bb613766de998`  
**CI on `97d79ff`:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34906530155 PASS  

This folder is hosted proof. It is not Product Leadership acceptance. Premium Platform remains PARTIAL. #12 remains PARTIAL. #19 / #20 are not authorized.

## Descendant notes

| SHA | What changed |
|---|---|
| `d9f9afc` | PageHeader wrap; notification unread-first. Hosted API at that capture was `164dbd2`. |
| `c3eea10` | Report rebrand to Supreme Governance Platform, board PPTX grammar, notification humanization, Privacy customer language, Home work counts from `/tprm/attention`, skip-link / table keyboard a11y. |
| `97d79ff` | Download filenames stay on Supreme Governance branding. Hosted frontend and API both this SHA during the vendor re-walk. |
| Working-tree follow-up | Nav list markup, staging-banner contrast, table-header contrast, Team role labels. Not on hosted `97d79ff`. Do not claim hosted axe PASS from these local edits. |

## Vendor invitation → submit (P1)

Script: `scripts/hosted-premium-vendor-rewalk.py`  
Tenant: Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
Results: `vendor-rewalk/results.json`  
Hosted SHA: frontend and API `97d79ff`  
Golden vendor: `VND-2026-0018` assessment `262a714e-3ee0-4b3f-87c5-8752d6672128`  
Cross vendor: `VND-2026-0019`

| Check | Result |
|---|---|
| Send due diligence | PASS (201) |
| Invitation email | Recorded **Queued**. Not claimed Delivered. Inbox / spam not inspected. |
| Resend invalidates old token | PASS (410) |
| First activation | PASS (200) |
| Token reuse | PASS (410) |
| Vendor cannot call customer APIs | PASS (401) |
| Cross-tenant | PASS (404) |
| Cross-vendor | PASS (404) |
| Questionnaire load (10 questions) | PASS |
| Save / resume | PASS |
| Evidence upload | PASS (201 × 5) |
| Evidence ready / malware state | PARTIAL — API returned `scan=unknown`; customer copy is Ready / Blocked only. Not claimed CLEAN. |
| Attestation / submit | PASS (200) |
| Analyst review | PASS (200) |

Shots: `vendor-rewalk/vendor-landing-{1440,375}.png`, `vendor-questionnaire-{1440,1024,375}.png`, `vendor-rewalk/analyst-review-1440.png`. Dedicated evidence-upload and post-submit confirmation shots were not captured; those steps are API-proved.

## Reports

Regenerated from hosted API into `reports/`. Text-extracted. Every PDF checked in `closure-results.json` contains **Supreme Governance Platform**. Running header: **SUPREME GOVERNANCE**.

Board PPTX: 10 slides. OOXML grammar:

- “1 vendor currently sits in high or critical residual risk.”
- “26 critical or high findings remain open.”
- “1 remediation item is past the target date.”
- Footnote: `Supreme Governance Platform · Confidential — Board`

Native PowerPoint visual QA: PARTIAL. `reports/pptx-native/native-render.json` — AppleScript PDF export hung; no slide PNGs. HTML reconstructions are not accepted.

## Notifications and Privacy language

Hosted `/notifications` body had no raw `assessment.assigned`. Internal API still returns dotted event codes (69 recorded). UI humanizes them.

Hosted Privacy overview did not show CLEAN. Compliance / AI / Help CLEAN strings were left alone.

## Home performance

Measured on staging as ORGANIZATION_ADMIN, Playwright networkidle `/dashboard`.

| | Page API count | Load |
|---|---|---|
| Before (`d9f9afc` / `164dbd2`) | 11 | 4039 ms |
| After (`c3eea10`, still true on `97d79ff`) | 8 | 3069 ms |

Evidence: `performance/home-before.json`, `performance/home.json`. Org-admin still loads four domain dashboards plus attention, vendor statistics, and two layout calls. That is the intended role-aware reduction, not a new aggregation backend.

## Keyboard and viewports

Keyboard: no trap; skip-to-content is first focus. PASS in `closure-results.json`.

Viewports 375 / 768 / 1024 / 1440 / 1920 on changed pages: no horizontal overflow recorded.

## Accessibility

First axe inject failed product CSP (`script-src 'self'`). Audit-only Playwright `bypass_csp` plus local `scripts/axe.min.js` then found real serious issues on hosted `97d79ff` / `c3eea10`:

- Staging banner caption contrast
- Home “What needs attention” overline contrast
- Product nav `<ul>` with non-`li` children
- Unlabeled Team role selects
- Table header / sort-label contrast (especially Evidence, Reports, Notifications)

Local follow-up edits address the first four. Table sort contrast may remain. Re-run hosted axe only after those edits are deployed. Do not treat local-only a11y as hosted PASS.

## Personas this closure

| Persona | What was actually walked |
|---|---|
| Customer Admin | Elite Claims ORGANIZATION_ADMIN: Home, Administration, Reports, Privacy, Notifications |
| Vendor Respondent | Live activate → questionnaire → evidence → submit on `VND-2026-0018` |
| TPRM Analyst | Hosted analyst review 200 + `analyst-review-1440.png` |
| Executive Approver | Reports / board exports generated as org-admin. No separate executive login. |
| Business Owner | Onboard / lifecycle surfaces captured as org-admin. No dedicated business-owner session. |
| Platform Owner | Cross-tenant security used `admin@sinfosecurity.com`. Platform login page only; no full console session this run. |
| Risk / Compliance / Privacy / AI / Prospect | Regression shots and overflow checks only |

## Security regression this closure

Proven on hosted `97d79ff`: tenant isolation 404, vendor-plane 401, single-use activation 200 then 410, resend invalidates prior token 410, cross-vendor 404. Evidence fail-closed / residual neutrality were not re-invented; scan status stayed `unknown` so Ready was not claimed.

## Honest leftover

- Invitation email is Queued, not inbox-Delivered.
- Evidence scan state unknown on this walk.
- Native PPTX slide PNGs were not produced.
- Hosted axe on `97d79ff` still FAILs serious contrast / list / label issues until the follow-up SHA is deployed and re-checked.
- Home still fires 8 page APIs for org-admin.
- Cursor does not declare Premium Platform PASS.
