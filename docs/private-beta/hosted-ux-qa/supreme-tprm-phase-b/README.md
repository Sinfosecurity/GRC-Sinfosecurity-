# Hosted #12 Automation Closure Phase B evidence

**Date:** 2026-09-13  
**Item:** #12 Supreme Third Party — Automation Closure Phase B  
**Purpose:** Ready to send → Vendor contact → Secure invitation → Vendor portal → Questionnaire → Evidence → Save/resume → Submit → Analyst review → Draft findings  
**Starting SHA:** `e889bd5167bc1598854a65cfc935026615b1cef4`  
**Implementation SHA:** recorded on the documentation commit that includes this folder  
**Hosted frontend SHA at walkthrough:** `2ebb32564a8bd861ee1b8f3e17e65f05227e587f`  
**Hosted API SHA at walkthrough:** `a5dc8e22c59c6eb99f8f47155ee28c78b4033112`  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34800714986 PASS on `a5dc8e2`  
**Backend tests:** 369  
**Frontend tests:** 163  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Walkthrough vendor:** `VND-2026-0006`  
**Production:** NO  
**#12 PASS:** NOT DECLARED  
**Phase C / #19 / #20:** NOT AUTHORIZED

This extends the existing Supreme Third Party product. It is not a second TPRM application.

Vendor respondents are not organization users. Access uses the bounded `VENDOR` plane in `docs/ADR-TPRM-VENDOR-ACCESS.md`.

## Walkthrough (staging)

Phase A was repeated on a new vendor through Ready to send. The analyst sent due diligence to Casey Contact. Supreme created six assigned vendor assessments, generated an activation URL on the staging frontend, and recorded invitation **Pending** with email **Queued**.

The vendor activated bounded access. Customer `/api/v1/vendors` with the vendor session returned 401. Cross-tenant GET of `VND-2026-0006` as `admin@sinfosecurity.com` returned 404 with no public ID in the body.

The vendor answered assigned questionnaires, uploaded evidence, attested, and submitted all six assessments. Hosted scan status for uploaded files was **Ready**. Submit without attestation returned 400. Submit with attestation moved assessments to review and created draft findings (36 total). The analyst confirmed one, adjusted one to High, and dismissed one.

The vendor portal shows only Elite Claims, this vendor, due date, progress, and assigned assessments. No customer sidebar, billing, or platform console.

## Screenshots

| File | What it shows |
|---|---|
| `customer-workspace-375.png` … `customer-workspace-1920.png` | Onboarding workspace after send/submit; Due Diligence stage; no page-level overflow |
| `customer-due-diligence-1440.png` | Invitation Completed, email Queued, six submitted assessments |
| `analyst-review-375.png` / `analyst-review-1440.png` | Exception-focused review with real counts and Confirm / Adjust / Dismiss |
| `customer-history-1440.png` | Customer-language history through send, vendor start, submit, and finding actions |
| `vendor-landing-375.png` … `vendor-landing-1920.png` | Bounded vendor landing; no customer navigation |
| `vendor-questionnaire-375.png` / `vendor-questionnaire-1440.png` | Focused question, evidence required, file status Ready, submitted |
| `results.json` | Automated check log |

No page-level horizontal overflow at 375, 768, 1024, 1440, or 1920 on the captured pages.

## Honesty notes (not silently reconciled)

- Hosted frontend SHA `2ebb325` is not the hosted API SHA `a5dc8e2`. Frontend after `2ebb325` did not change. The later commits are backend CI/stability only.
- Hosted `/health` remains `degraded` for preexisting reasons: MongoDB `NOT_CONFIGURED`, memory pressure, AI `NOT_CONFIGURED`. Postgres, Redis, Stripe test mode, email connected, and malware CONNECTED / fail-closed downloads are unchanged.
- Invitation email status was **Queued** (provider accepted). That is not provider Delivered and not human inbox receipt. The recipient was `casey-*@vendor.example`, not a controlled human inbox.
- On hosted API `a5dc8e2`, reusing the same activation token still returned 200 and minted another session. The follow-up commit rejects non-pending tokens with 410. That hosted reuse gap is not silently marked PASS.
- Customer history is in customer language but is more verbose than the target “five-line” timeline (one row per assessment submit and draft-finding batch).
- Clarification loop exists in API/ADR form and was not exercised on this hosted vendor.
- SLA reminders exist as a Phase-B scan against existing notification infrastructure. This walkthrough did not wait for an overdue clock.
- Evidence reuse of a vendor’s own CLEAN file is implemented. This walkthrough uploaded per question and did not prove reuse in the browser.
- #13 Governance Graph and #14 Shared Controls were not re-walked in the browser this sprint. CI included the existing suites. Do not treat that as a new hosted #13/#14 certification.
- Phase C remediation / risk acceptance was not implemented.

## Status

**#12:** PARTIAL — PRODUCT LEADERSHIP REVIEW REQUIRED  
**PHASE B:** PARTIAL — PRODUCT LEADERSHIP REVIEW REQUIRED  
**COMMERCIAL PRODUCTION:** NO-GO  
**MAIN MERGED:** NO  
**PRODUCTION DEPLOYED:** NO
