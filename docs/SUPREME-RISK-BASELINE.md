# Supreme Risk — Repository Truth Baseline

**Inspected:** 2026-09-10  
**Starting branch:** `main`  
**Starting SHA:** `5916d7224ea5edef7f2b3726a452cc2261cb9b0d`  
**Transformation branch:** `supreme-risk-transformation`  
**Authority:** source code, not historical README/audit documents.

This document records the repository **before** the Supreme Risk production transformation.

---

## 1. Product identity

The codebase is a Sinfosecurity-branded GRC/TPRM platform (Express + Prisma + React/Vite).  
The workspace folder is named Supreme Risk; **no application source used that product name**.

| Layer | Observed brand |
|-------|----------------|
| Frontend title | `GRC Platform - Sinfosecurity` |
| Sidebar | Sinfosecurity / GRC Platform |
| Landing | Sinfosecurity |
| Demo emails | `@sinfosecurity.com` |

---

## 2. Architecture snapshot

| Area | Location | Classification |
|------|----------|----------------|
| Frontend | `frontend/` React 18, Vite 5, MUI 5, Redux Toolkit | MIXED — polished UI, mostly mock data |
| Backend | `backend/src/server.ts` Express + TypeScript | MIXED |
| Prisma/PostgreSQL | `backend/prisma/schema.prisma` (~1,921 lines, 44 models) | PRODUCTION-oriented schema |
| Migrations | `backend/prisma/migrations/init.sql` only | PROTOTYPE — no Prisma migration history |
| Redis | `backend/src/config/database.ts` if `REDIS_URL` | MIXED |
| Bull queues | `backend/src/config/queues.ts` | PROTOTYPE processors |
| Railway | `railway.toml` | PRODUCTION-oriented deploy config |
| Tests | Sparse Jest/Vitest | PROTOTYPE |
| CI | No GitHub Actions workflow | ABSENT |
| Stripe/billing | Not present | ABSENT |
| AWS SDK | Not in dependencies | ABSENT |

---

## 3. Authentication (P0 blocker)

Multiple competing identity systems existed:

1. `backend/src/routes/auth.routes.ts` — `DEV_MODE` mock users (`admin@sinfosecurity.com` / `demo123`, `demo` / `demo`). Production path returned **501**.
2. `backend/src/services/userService.ts` — in-memory `Map` of demo users (`user_1`, …).
3. `backend/src/services/userService.enhanced.ts` — unused in-memory users on `org_demo`.
4. `backend/src/services/ssoService.ts` / `mfaService.ts` — in-memory; SSO issued tokens for hardcoded `org_demo`.
5. `backend/prisma/seed.ts` — Prisma users, but wrote field `password` while schema requires `hashedPassword`.

JWT payload used `userId`; auth middleware looked up `decoded.id` in the in-memory store. IDs also did not match (`user-1` vs `user_1`). **The auth chain was broken even in DEV_MODE.**

`DEV_MODE` defaulted to `true` in `backend/.env.example`. `server.ts` skipped the database and logged “using mock data” when enabled. `optionalAuth` accepted `x-user-id` without a token.

---

## 4. Tenant isolation (P0 blocker)

TPRM routes already filtered Prisma queries by `req.user.organizationId`, but **auth middleware never populated `organizationId`**.

Four conflicting organization identities existed: `org-1`, `org_demo`, `demo-org-001`, and generated `org_${timestamp}` from in-memory `organizationService`.

`subdomain.middleware.ts` and `organization.routes.ts` were **not mounted**.

No composite `WHERE id = ? AND organizationId = ?` guarantee at the identity layer. No automated negative tenant tests.

---

## 5. RBAC

Three parallel role systems:

| System | Roles |
|--------|--------|
| Prisma `Role` | SUPERADMIN, ADMIN, COMPLIANCE_OFFICER, RISK_MANAGER, AUDITOR, USER |
| `userService` | ADMIN, COMPLIANCE_OFFICER, AUDITOR, VIEWER |
| `userService.enhanced` (unused) | ORG_OWNER, ORG_ADMIN, … |

Vendor routes authorized Prisma-style role names; middleware used in-memory roles. Permission checks were not the source of truth for TPRM actions.

---

## 6. Domain functionality that must be preserved

Prisma-backed TPRM services are the strongest part of the repository:

- Vendor inventory, contacts, contracts, SLA tracking
- Assessments + `AssessmentResponse` snapshots
- Issues / CAP / RCA / escalation
- Documents metadata model
- Continuous monitoring records
- Approval workflows and steps
- Risk history, appetite, concentration
- Fourth parties, BAA, ISO mappings, exit risk
- Executive / vendor reporting services

Vendor inherent scoring in `vendorManagementService.calculateInherentRisk` was **deterministic** (tier + data types + subcontractors). No `Math.random` there.

---

## 7. Prototype / mock inventory (source search)

| Pattern | Production impact |
|---------|-------------------|
| In-memory `Map` stores | Users, orgs, tasks, workflows, reports, evidence, notifications, MFA/SSO, document metadata |
| `DEV_MODE` mock login | Production auth 501; demo hashes committed |
| `org_demo` | SSO and enhanced users |
| `dev-encryption-key` | `documentStorageService` fallback |
| Fake malware scan | Always returned `CLEAN` |
| Mock file download | `Buffer.from('mock file content')` |
| Console-only integrations | Slack, Jira, ServiceNow, SIEM |
| `Math.random` | Jira/ServiceNow IDs, monitoring, AI trend, workflow assignee |
| Frontend mock vendors | `VendorManagement` seed + silent fallback |
| Frontend healthCheck | Returned `{ status: 'ok' }` when backend unreachable |
| Frontend pages | Risks, compliance, controls, incidents, policies, documents, users, org settings, analytics, tasks, workflows, BCP, AI, predictions, SOC, ISO, TISAX — hardcoded arrays |
| GRC API routes | risks/compliance/controls/incidents/policies/documents returned “Coming soon” while claiming success |
| Queue processors | TODO placeholders |
| Seed | Out of sync with schema |

---

## 8. Evidence / documents

`documentStorageService.ts`: in-memory metadata, S3/Azure log-only stubs, no AWS SDK, encryption key fallback, mock download bytes, virus scan always CLEAN.

`VendorDocument` Prisma model already had tenant, hash, and file metadata fields — unused by the prototype storage layer.

---

## 9. AI

`aiServiceConnector.ts` commented out HTTP to the Python service and returned static mock predictions with a `Math.random` trend factor. Frontend AI pages used `mockAIInsights` / `mockPredictions`.

---

## 10. Environment / secrets (names only)

Committed files (templates/examples, no live `.env` found):

- `backend/.env.example`
- `backend/env.template`
- `.env.docker`
- `.env.railway.backend`
- `.env.railway.frontend`
- `.env.railway.ai-service`
- `ai-service/.env.example`

`.gitignore` ignored `.env` and `.env.local` but **not** `.env.docker` or `.env.railway.*`.  
Example files contained placeholder-shaped values (AWS key pattern `AKIAxxxxxxxxxx`, Slack webhook URL shape, SendGrid `SG.…`). Treat any historically committed real values as **ROTATION REQUIRED** (names listed in `SECRET-ROTATION-REQUIRED.md`).

---

## 11. Database / migrations

- Schema is large and TPRM-complete.
- `Organization` had no slug, plan, trial, subscription, or demo flag.
- `User` had no account status, invitation, or password-reset fields.
- `AuditLog` existed but runtime `auditService` was in-memory and unscoped by tenant.
- Railway runs `prisma migrate deploy` against a folder that is not a valid Prisma migration history.

---

## 12. Frontend / API truthfulness

Real API usage before transformation:

- Login (`AuthContext` → `POST /auth/login`)
- Vendor list/create/statistics (with mock fallback)
- Health ping (with fake OK fallback)

Landing linked to `/login` and `/register` which did not exist. Dual auth (AuthContext vs unused Redux `authSlice`) with incompatible response shapes. No logout control in the sidebar.

---

## 13. Observability

Helmet, request IDs, Prometheus metrics, Winston, health/ready/live endpoints existed. `/health/basic` always returned 200 (intentional for Railway boot). Comprehensive `/health` checks were registered only when `DEV_MODE=false`. `DEV_MODE` started `listen()` twice.

---

## 14. Tests

Backend: health, metrics, cache, stale vendor integration (fake bearer token, no real auth).  
Frontend: AuthContext, Layout, ProtectedRoute, ErrorBoundary, api interceptor, **stale Landing test**.  
No tenant-isolation suite. No CI.

---

## 15. Transformation implication

Preserve Prisma TPRM domain services and the vendor assessment question snapshot pattern.  
Replace prototype identity, tenancy wiring, storage, scoring randomness outside the vendor engine, mock AI/integrations, frontend mock fallbacks, and incomplete migrations.

**Do not treat this baseline as complete product documentation.** It is a pre-change inventory only.
