# Production cutover checklist

Do not execute this checklist in the current sprint. Production deploy and `main` merge are forbidden here.

Values below are readiness, not a cutover approval.

## Before a future production window

1. Restore GitHub billing so hosted CI can run the full workflow to green.
2. Provision a hosted staging URL that is not localhost, still isolated from production tenant data.
3. Configure Stripe **test** mode first: secret key, webhook secret, prices, customer portal, entitlement enforcement.
4. Repeat the same Stripe flow in live mode only after test mode is green.
5. Configure production Postgres with backups, point-in-time recovery, and a restore drill against a clone.
6. Configure production S3 (or equivalent) with IAM, encryption, retention, and orphan reconcile on a schedule.
7. Configure production SMTP or SendGrid. Confirm invitation, reset, assignment, finding, and approval mail.
8. Decide AI: real provider with audit, or keep `NOT_CONFIGURED`.
9. Decide malware: real scanner, or keep fail-closed `NOT_CONFIGURED`. Never invent CLEAN.
10. Configure hosted alerting for `/health` degraded/unhealthy, webhook failures, and restore job failure.
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
