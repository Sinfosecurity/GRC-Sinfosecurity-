# Database migration rehearsal

**Database:** test/staging PostgreSQL only. Production was not contacted.
**Migration:** `20260910120000_supreme_risk_saas_foundation`
**Baseline:** `backend/prisma/baseline/pre-transformation.prisma` (schema at `5916d722`)
**Ran at:** 2026-09-10T09:43:24Z
**DATABASE_URL host:** redacted (test-only)

## Procedure

1. Create/use an empty PostgreSQL database with a test-only URL.
2. `prisma db push` the pre-transformation baseline schema (`--skip-generate`, no `migrate reset`).
3. Insert Organization, User, Vendor, and Risk rows representing existing GRC/TPRM data.
4. Apply `backend/prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql`.
5. Verify data, foreign keys, indexes, and new SaaS models.
6. Run the application test suite against the migrated database.

## Results

- Migration succeeded without `prisma migrate reset` or DROP of vendor/GRC tables.
- Existing vendor `Baseline Vendor Intact` remained intact.
- Existing GRC risk `Baseline GRC risk` remained intact.
- New Organization SaaS columns (`slug`, `status`, `plan`, `isDemo`) exist.
- New User account-status column exists.
- New models available: RefreshToken, StoredObject, AuditEvent.
- `ScanStatus` enum created.
- Foreign key `RefreshToken_userId_fkey` present.
- Index `Organization_status_idx` present.

Application test suite against this migrated database: **91 passed / 91 total** (backend Jest, including two-tenant HTTP isolation and evidence scan-policy tests).

Verification output:

```
REHEARSAL_VERIFICATION=PASS
{"vendorIntact":"Baseline Vendor Intact","riskIntact":"Baseline GRC risk","orgPlan":"STARTER","orgStatus":"TRIAL","saasModels":["RefreshToken","StoredObject","AuditEvent"]}
```

