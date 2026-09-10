# Supreme Risk architecture

Implemented as a modular Express + Prisma + React monolith.

```
Organization → Vendor → Inherent risk → Assessment/evidence → Deterministic score
        → Approval → Monitoring → Findings/remediation → Residual risk → Reports
```

AI explains and recommends. It does not own scores.

## Runtime

- Frontend: Vite/React, Axios client in `frontend/src/services/api.ts`
- Backend: `backend/src/server.ts`
- Identity: Prisma `User` / `Organization` via `authService`
- Authorization: `security/rbac.ts` + `requirePermission`
- Tenancy: `req.user.organizationId` from membership; queries use `id + organizationId`
- Storage: `objectStorageService` (S3 if configured, local disk only when explicitly allowed)
- Billing: Stripe Checkout/Portal/webhooks when keys exist
- Jobs: existing Bull queues (processors remain placeholders unless configured)

## What is not claimed

External providers without credentials return `NOT_CONFIGURED`. That includes Stripe, OpenAI, Slack, Jira, ServiceNow, SIEM, malware scanning, and email.
