# RBAC

Canonical roles: PLATFORM_ADMIN, ORGANIZATION_ADMIN, RISK_MANAGER, ASSESSOR, APPROVER, BUSINESS_OWNER, AUDITOR, VIEWER.

Legacy Prisma roles remain valid and are aliased:

- SUPERADMIN → PLATFORM_ADMIN
- ADMIN → ORGANIZATION_ADMIN
- COMPLIANCE_OFFICER → ASSESSOR
- USER → VIEWER

Permission catalog is in `backend/src/security/rbac.ts`. Middleware: `requirePermission(...)`.
