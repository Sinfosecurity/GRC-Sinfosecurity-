# Production cutover checklist

Do not execute this checklist in the current sprint. Production deploy and `main` merge are forbidden here.

Values below are readiness, not a cutover approval.

## Before a future production window

1. Hosted Supreme CI is PASS as of SHA `93e71319e69f74bd90797583d66073a7232fc183` (#7). Later Owner Console SHAs must also be hosted-green.
1a. Platform Owner MFA is required before/as part of #8 final security review. Do not fake MFA.
2. Keep hosted staging isolated from production tenant data (`https://supreme-risk-staging.onrender.com`). Do not treat staging as a production cutover.
3. Configure Stripe **test** mode first: `sk_test_` secret, `whsec_` webhook secret, `STRIPE_PRICE_*` in the host environment only, customer portal, entitlement enforcement. Live keys are rejected by the application.
4. Repeat the same Stripe flow in live mode only after test mode is green. Hosted test-mode certification on 2026-09-12 is **PARTIAL / CONDITIONALLY CLEARED**. Remaining production-release checks: hosted `invoice.payment_failed`, hosted renewal/test-clock, browser Checkout completion (hCaptcha), and a final commercial price catalog. Do not treat staging catalog IDs as production prices.
5. Configure production Postgres with backups, point-in-time recovery, and a restore drill against a clone.
6. Configure production S3 (or equivalent) with IAM, encryption, retention, and orphan reconcile on a schedule.
7. Configure production SMTP or SendGrid. Confirm invitation, reset, assignment, finding, and approval mail.
8. Decide AI: real provider with audit, or keep `NOT_CONFIGURED`.
9. Configure ClamAV (`CLAMAV_HOST`) or keep fail-closed `NOT_CONFIGURED`. Never invent CLEAN. CONNECTED only after a controlled EICAR + clean probe succeeds.
10. Configure hosted alerting for `/health` degraded/unhealthy, webhook failures, infected evidence, and restore job failure.
11. Freeze schema. Apply migrations with the baseline-then-additive path proven in `docs/STAGING-MIGRATION-CERTIFICATION.md`.
12. Take a pre-cutover backup. Restore it into a scratch database. Compare counts.
13. Re-run the staging browser E2E against the hosted staging URL.
14. Cut DNS / ingress only after the above are PASS.
15. Organization logo/branding for customer reports remains post-launch unless implemented and certified.

## Hard rules

- Do not copy production tenant data into staging.
- Do not trust frontend subscription state.
- Do not merge `main` from this sprint.
- Do not declare PRODUCTION CANDIDATE until hosted CI, hosted staging, Stripe, backups, and a production-like E2E are green.
