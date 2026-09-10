# Tenant isolation

Every tenant-owned query must include `organizationId` from `req.user`.

Helpers:

- `tenantById(id, organizationId)`
- `tenantWhere(organizationId, extra)`
- `rejectClientTenantOverride`

Vendor, assessment, document, finding, approval, report, user, and export routes use these constraints.

Cross-tenant access must return 404, not 403 with existence leakage, when a record is not in the caller’s organization.

Automated tests live in `backend/src/__tests__/tenant-isolation*.test.ts`.
