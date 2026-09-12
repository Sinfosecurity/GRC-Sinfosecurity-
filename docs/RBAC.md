# RBAC

Canonical tenant roles: PLATFORM_ADMIN, ORGANIZATION_ADMIN, RISK_MANAGER, ASSESSOR, APPROVER, BUSINESS_OWNER, AUDITOR, VIEWER.

Platform operations roles: PLATFORM_OWNER, SUPPORT_ADMIN, SUPPORT_ANALYST, BILLING_SUPPORT, SECURITY_ADMIN.

Legacy Prisma roles remain valid and are aliased:

- SUPERADMIN → PLATFORM_ADMIN
- ADMIN → ORGANIZATION_ADMIN
- COMPLIANCE_OFFICER → ASSESSOR
- USER → VIEWER

`platform.*` permissions are never granted to customer tenant roles. See `docs/PLATFORM-OWNER-SUPPORT-CONSOLE.md`.

Permission catalog is in `backend/src/security/rbac.ts`. Middleware: `requirePermission(...)` and `requirePlatformPermission(...)`.
