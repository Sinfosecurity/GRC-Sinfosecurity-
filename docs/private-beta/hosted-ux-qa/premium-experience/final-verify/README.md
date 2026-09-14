# Premium Platform — Final Acceptance Verification

**Hosted frontend SHA:** `842e403af4a748502bb8e974fe59d5308a0bc7bd`  
**Hosted API SHA:** `842e403af4a748502bb8e974fe59d5308a0bc7bd`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34909432591 PASS on `842e403`  
This is hosted evidence. Cursor does not declare Premium Platform PASS.

## Axe

`scripts/hosted-premium-final-verify.py` with Playwright `bypass_csp` and local `scripts/axe.min.js`. Product CSP is unchanged.

Serious/critical violations on the required routes: **0**.

Routes: `/`, `/login`, `/dashboard`, `/vendor-onboarding`, one lifecycle page (`VND-2026-0020`), `/risks`, `/compliance`, `/privacy-ops`, `/ai-governance`, `/documents`, `/reports`, `/user-management`, `/vendor-assessment`, one questionnaire, `/vendor-assessment/activate`.

Non-serious/low-impact axe findings: none recorded on these routes.

## Keyboard

No traps. Customer and public pages: first focus is **Skip to content**. Vendor activate / landing start on the invitation or search field; those routes have no product-shell skip link.

## Viewports

375 / 768 / 1024 / 1440 / 1920 on public home, Home, lifecycle, reports, vendor questionnaire, vendor activate: no horizontal overflow. 1440 also captured for AI, Evidence, Administration, vendor landing.

## Evidence unknown-state

- Live upload on `VND-2026-0021` returned API `status=Ready` because the scanner returned CLEAN. UI showed **Ready**, not CLEAN.
- Hosted Evidence Library has one FAILED object (`is_1.pdf`). Filtered view shows **Scan failed**, not Ready, not CLEAN. Shot: `evidence-library-failed-filter-1440.png`.
- Vendor questionnaire maps `unknown` / `Unavailable` to **Security status unavailable** and will not label those as Ready. Unit test: `frontend/src/pages/__tests__/VendorAssessmentQuestionnaire.test.tsx`.

## Board PPTX

LibreOffice Impress (Docker `minidocks/libreoffice`) rendered the hosted `board.pptx` to 10 unique PNGs. Not native Microsoft PowerPoint. See `../reports/pptx-lo/`.
