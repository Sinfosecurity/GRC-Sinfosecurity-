# Subprocessor publication readiness

**Status:** DRAFT / LEGAL_REVIEW_REQUIRED for any customer-facing notice  
**Owner:** Product Leadership / Legal  
**Approver:** Legal (unassigned) / Product Leadership  
**lastReviewed:** 2026-09-23  
**reviewBy:** 2026-12-23

Staging providers and production subprocessors are **separate lists**. Do not collapse them.

## Current staging / private-testing providers

These may be described internally and, after legal review, as **staging / private-testing processors only**. They are **not** a production customer subprocessor roster.

| Provider | Status | Location | Publish class for `/subprocessors` as production list |
| --- | --- | --- | --- |
| Render | IN USE (staging) | UNKNOWN / TO BE CONFIRMED | PRODUCTION_VALIDATION_REQUIRED if listed as production |
| MinIO (Render S3-compatible) | IN USE (staging) | UNKNOWN / TO BE CONFIRMED | PRODUCTION_VALIDATION_REQUIRED if listed as production |
| Render Postgres | IN USE (staging) | UNKNOWN / TO BE CONFIRMED | PRODUCTION_VALIDATION_REQUIRED if listed as production |
| GitHub | IN USE (source/CI) | UNKNOWN / TO BE CONFIRMED | Not a customer data store; do not list as a tenant-data subprocessor |
| Stripe test mode | CONFIGURED TEST-MODE / NOT LIVE | UNKNOWN / TO BE CONFIRMED | DO_NOT_PUBLISH as live billing; PRODUCTION_VALIDATION_REQUIRED for live Stripe |
| Resend | CONFIGURED / DELIVERY UNCONFIRMED | UNKNOWN / TO BE CONFIRMED | CONTACT/delivery confirmation still open; not a reliable-mail claim |
| ClamAV when connected | CONNECTED when health reports it | UNKNOWN / TO BE CONFIRMED | Fail-closed if absent |

A **staging-labeled** processor note on an internal diligence pack is LIMITED-ready. A public `/subprocessors` production list is **PRODUCTION_VALIDATION_REQUIRED** and **LEGAL_REVIEW_REQUIRED**.

## Not current subprocessors

Do not publish as live processors:

- Entra / Okta / Google — LIVE VALIDATION DEFERRED
- Slack / Jira / external ratings — LIVE VALIDATION DEFERRED
- hCaptcha — NOT DEMONSTRATED
- OpenAI / other AI completion — typically NOT_CONFIGURED
- AWS S3 — not the current staging evidence store
- Trust Center / SOC 2 / ISO tooling — not purchased

## Future production subprocessors

**PRODUCTION_VALIDATION_REQUIRED** until production architecture is finalized.

Includes at least:

- production hosting
- production object storage
- production database
- live Stripe (if authorized later)
- production email
- production malware scanner
- any CDN, DNS, or monitoring vendor actually contracted

`/subprocessors` today remains an intentionally empty production list labeled draft. That honesty is correct. Do not fill it from the staging register without legal review **and** production validation.
