# Hosted staging certification

**Branch:** `supreme-risk-transformation`  
**Host:** Render project `Supreme Risk` / environment `Staging`  
**Public URL:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Classification:** STAGING CANDIDATE  
**Not declared:** production-ready

`prisma db push` was not used. Secrets were not committed. `main` was not merged. Production was not deployed.

## Public frontend

Production Vite build. Page source has no `@vite/client` and no `/src/*.tsx` entry. SPA unknown routes render the application 404. Banner: `SUPREME RISK — STAGING`.

## Data

Hosted PostgreSQL migrations applied via baseline SQL + `prisma migrate deploy`. Hosted dump restored into `supreme_risk_restore` with matching counts. Hosted Redis is connected.

## Storage / email / alerts

Hosted MinIO on Render (not local MinIO): upload, checksum, tenant prefix, cross-tenant denial, delete, orphan reconcile, fail-closed download while malware is `NOT_CONFIGURED`.

Hosted Mailpit received invitation, password reset, assessment assigned/completed, finding assigned, CAP request, validation, finding closed, approval requested, and decision recorded. That is not an external mailbox provider.

`POST /api/v1/system/alert-test` delivered a webhook.site payload titled `SUPREME RISK — STAGING alert test`.

## External blockers

- Stripe test keys were not supplied. Live keys are rejected.
- GitHub Actions remains billing-locked. Workflows were not weakened.
