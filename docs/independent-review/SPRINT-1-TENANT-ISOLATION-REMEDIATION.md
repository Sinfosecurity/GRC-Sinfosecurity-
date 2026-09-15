# Sprint 1 — Tenant Isolation Closure (C-2 / H-1)

Engineering evidence only. Product Leadership decides finding closure.

**Starting SHA:** `a051d04268b58bf57f83d9b53b4b8c62bf284ff5`  
**Scope:** C-2 and H-1 only. C-1 and H-2–H-7 were not changed.  
**Migration:** NONE. No schema redesign. Composite tenant FKs remain a follow-up.

## Invariant

No tenant-owned child may reference or expose a parent that has not first been proven to belong to the authenticated organization. Organization identity comes from the session, never from body/query.

## Helpers

`backend/src/security/tenantOwnership.ts`

- `requireVendorForOrganization`
- `requireAssessmentForOrganization` (optional vendor consistency → 409 same-tenant mismatch, 404 cross-tenant)
- `requireContractForOrganization`
- `requireAppetiteBreachForOrganization`
- `requireBusinessUnitForOrganization`
- `omitForeignParent` for include leakage

Cross-tenant lookup: **404** with no foreign name, public ID, or organization name.

## Historical malformed data

**NOT CHECKED** against hosted staging. No repair executed.

Read-only query if Product Leadership authorizes a staging inspection:

```sql
SELECT 'VendorAssessment' AS model, a.id, a."organizationId" AS child_org, v."organizationId" AS parent_org
FROM "VendorAssessment" a
JOIN "Vendor" v ON v.id = a."vendorId"
WHERE a."organizationId" <> v."organizationId";

SELECT 'VendorIssue' AS model, i.id, i."organizationId" AS child_org, v."organizationId" AS parent_org
FROM "VendorIssue" i
JOIN "Vendor" v ON v.id = i."vendorId"
WHERE i."organizationId" <> v."organizationId";
```

## Schema follow-up

Application guards are in place. Composite FKs `(organizationId, vendorId)` were not added in this sprint.

## Planes

- Customer `/api/v1/monitoring/dashboard` and `/business`: tenant-scoped counts.
- Root `/metrics`: still `METRICS_TOKEN` only (platform/ops). Not a customer-plane path.
