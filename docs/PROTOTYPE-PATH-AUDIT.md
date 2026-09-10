# Prototype path audit

Certification pass: obsolete production implementations were inspected. Test mocks may remain inside test code. Working TPRM/GRC domain services were not removed.

Production entrypoint is `backend/src/server.ts` (`npm start` → `dist/server.js`).

| Path | Disposition | Notes |
| --- | --- | --- |
| `backend/src/server-simple.ts` | UNREACHABLE FROM PRODUCTION | Quarantined. Throws if started as the process entrypoint. Mock login token and demo-mode APIs. |
| `backend/src/services/userService.ts` | UNREACHABLE FROM PRODUCTION | In-memory user map. Production user routes use `identityUserService`. |
| `backend/src/services/userService.enhanced.ts` | UNREACHABLE FROM PRODUCTION | In-memory users/invites. Not imported by `server.ts`. |
| `backend/src/services/organizationService.ts` | UNREACHABLE FROM PRODUCTION | In-memory tenant map. Production orgs are Prisma. |
| `backend/src/routes/organization.routes.ts` | UNREACHABLE FROM PRODUCTION | Not mounted. Production org APIs: `organization.saas.routes.ts`. |
| `backend/src/routes/auth.enhanced.routes.ts` | UNREACHABLE FROM PRODUCTION | Unmounted from `server.ts`. In-memory SSO/MFA. Production auth: `auth.routes.ts`. |
| `backend/src/services/mfaService.ts` | UNREACHABLE FROM PRODUCTION | Only referenced by unmounted enhanced auth routes. |
| `backend/src/services/ssoService.ts` | UNREACHABLE FROM PRODUCTION | Only referenced by unmounted enhanced auth routes. |
| `backend/src/middleware/subdomain.middleware.ts` | UNREACHABLE FROM PRODUCTION | Not mounted on `server.ts`. |
| `backend/src/routes/monitoring.test.routes.ts` | UNREACHABLE FROM PRODUCTION | Unmounted. Sentry/test-error harness. |
| `backend/src/routes/evidence.routes.ts` | UNREACHABLE FROM PRODUCTION | In-memory evidence collection. Not mounted. Production evidence: `evidence.storage.routes.ts` via `document.routes.ts`. |
| `backend/src/services/evidenceCollectionService.ts` | UNREACHABLE FROM PRODUCTION | In-memory evidence IDs (`Math.random`). Only used by unmounted `evidence.routes.ts`. |
| `backend/src/services/documentStorageService.ts` | REQUIRED | Thin alias of `objectStorageService`. Does not fake CLEAN or return mock bytes. |
| `backend/src/services/objectStorageService.ts` | REQUIRED | Tenant-scoped object metadata + download scan policy. |
| `backend/src/services/authService.ts` | REQUIRED | Prisma users, bcrypt, JWT. |
| `backend/src/services/identityUserService.ts` | REQUIRED | Prisma user directory. |
| `backend/src/ai/aiProvider.ts` | REQUIRED | Returns `NOT_CONFIGURED` without keys. No mock predictions. |
| `backend/src/services/aiServiceConnector.ts` | REQUIRED | Legacy connector; AI HTTP routes use `aiProvider`. |
| `backend/src/services/aiVendorIntelligence.ts` | UNREACHABLE FROM PRODUCTION | Not mounted on `server.ts`. |
| `backend/src/services/predictiveAnalyticsService.ts` | UNREACHABLE FROM PRODUCTION | `Math.random` accuracy. Not imported by `server.ts`. |
| `backend/src/services/deterministicRiskEngine.ts` | REQUIRED | Versioned vendor scoring. Replaces ad-hoc random scores for TPRM. |
| `backend/src/services/monitoringService.ts` | UNREACHABLE FROM PRODUCTION as a live control feed | In-memory `Math.random` compliance scores. Not imported by `server.ts`. Distinct from `utils/monitoring.ts` Prometheus helpers. |
| `backend/src/services/continuousMonitoringService.ts` | REQUIRED | Still imported by mounted `monitoring.routes.ts`. In-memory checks, not an external telemetry feed. Does not write vendor residual scores. |
| `backend/src/utils/monitoring.ts` | REQUIRED | Process metrics for `/metrics`. |
| `backend/src/services/workflowEngine.ts` | REQUIRED | Mounted `workflow.routes.ts` GRC workflows (in-memory engine). Separate from Prisma `vendorApprovalWorkflow`. |
| `backend/src/services/auditService.ts` | REQUIRED | In-memory audit helper used by some GRC services. Immutable tenant audit is `auditEventService` / `AuditEvent`. |
| `backend/src/integrations/*Integration.ts` | REQUIRED | Real HTTP or `NOT_CONFIGURED`. No fake success. |
| `backend/src/__tests__/*` | TEST-ONLY | Includes helper-only tenant tests plus PostgreSQL two-tenant HTTP tests. |
| `backend/src/tests/setup.ts` | TEST-ONLY | Jest env and logger mock. |
| `frontend` mock vendor fallback | REMOVED | `VendorManagement` no longer seeds mock vendors when the API is empty. |

## Production auth paths

Mounted: `POST/GET /api/v1/auth/*` from `auth.routes.ts` (register, signup, login, refresh, logout, me, password reset, invite).

Not mounted: enhanced SSO/MFA, `server-simple` demo login.

## Math.random

Remaining `Math.random` uses are ID/jitter in unreachable or non-scoring helpers, MFA numeric codes in the quarantined MFA service, and in-memory monitoring prototypes. Vendor residual/inherent scoring used in TPRM create/update goes through `deterministicRiskEngine`.
