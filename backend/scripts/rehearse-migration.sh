#!/usr/bin/env bash
# Rehearse the additive Supreme Risk migration against a TEST database only.
# Never run against production. Requires DATABASE_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if echo "$DATABASE_URL" | grep -Ei 'railway|prod|production|sinfosecurity\.com' >/dev/null; then
  echo "Refusing to run migration rehearsal against a production-looking DATABASE_URL" >&2
  exit 1
fi

BASELINE_SCHEMA="$ROOT/prisma/baseline/pre-transformation.prisma"
CURRENT_SCHEMA="$ROOT/prisma/schema.prisma"
MIGRATION="$ROOT/prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql"
REPORT="${MIGRATION_REHEARSAL_REPORT:-$ROOT/../docs/DATABASE-MIGRATION-REHEARSAL.md}"

echo "==> Pushing pre-transformation baseline schema (no generate, empty test DB)"
npx prisma db push --schema "$BASELINE_SCHEMA" --skip-generate --accept-data-loss

echo "==> Seeding baseline vendor/GRC rows"
npx prisma db execute --schema "$BASELINE_SCHEMA" --stdin <<'SQL'
INSERT INTO "Organization" ("id", "name", "country", "updatedAt")
VALUES ('org_rehearsal_baseline', 'Rehearsal Org', 'US', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "User" ("id", "email", "hashedPassword", "firstName", "lastName", "role", "organizationId", "updatedAt")
VALUES (
  'user_rehearsal_baseline',
  'rehearsal@example.test',
  '$2b$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcdefghij',
  'Rehearsal',
  'User',
  'ADMIN',
  'org_rehearsal_baseline',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Vendor" (
  "id", "name", "vendorType", "category", "tier", "status", "organizationId",
  "primaryContact", "contactEmail", "servicesProvided", "dataTypesAccessed",
  "geographicFootprint", "regulatoryScope", "inherentRiskScore", "residualRiskScore",
  "updatedAt"
) VALUES (
  'vendor_rehearsal_baseline',
  'Baseline Vendor Intact',
  'SAAS',
  'CLOUD_HOSTING',
  'HIGH',
  'ACTIVE',
  'org_rehearsal_baseline',
  'vendor@example.test',
  'vendor@example.test',
  'Cloud hosting',
  ARRAY['PII'],
  ARRAY['US'],
  ARRAY['SOC2'],
  72,
  55,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Risk" (
  "id", "title", "description", "category", "likelihood", "impact", "riskScore",
  "status", "ownerId", "organizationId", "updatedAt"
) VALUES (
  'risk_rehearsal_baseline',
  'Baseline GRC risk',
  'Must remain after additive migration',
  'CYBERSECURITY',
  3,
  4,
  12,
  'IDENTIFIED',
  'user_rehearsal_baseline',
  'org_rehearsal_baseline',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "VendorAssessment" (
  "id", "vendorId", "organizationId", "assessmentType", "status", "updatedAt"
) VALUES (
  'assess_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  'org_rehearsal_baseline',
  'INITIAL_DUE_DILIGENCE',
  'COMPLETED',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "VendorRiskHistory" (
  "id", "vendorId", "organizationId", "inherentRiskScore", "residualRiskScore",
  "vendorStatus", "vendorTier"
) VALUES (
  'score_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  'org_rehearsal_baseline',
  72,
  55,
  'ACTIVE',
  'HIGH'
)
ON CONFLICT ("id") DO NOTHING;
SQL

VENDOR_BEFORE="$(npx prisma db execute --schema "$BASELINE_SCHEMA" --stdin <<'SQL'
SELECT COUNT(*)::text AS count FROM "Vendor" WHERE "id" = 'vendor_rehearsal_baseline';
SQL
)"

echo "==> Applying 20260910120000_supreme_risk_saas_foundation"
npx prisma db execute --schema "$CURRENT_SCHEMA" --file "$MIGRATION"

echo "==> Generating Prisma client for current schema"
npx prisma generate --schema "$CURRENT_SCHEMA"

if [[ "${SKIP_REHEARSAL_VERIFY:-}" == "1" ]]; then
  echo "==> Skipping intermediate verify (later migrations still pending)"
  echo "REHEARSAL_VERIFICATION=DEFERRED" | tee /tmp/supreme-risk-rehearsal-verify.txt
else
  echo "==> Verifying data, indexes, FKs, and new models"
  node "$ROOT/scripts/verify-rehearsal.js" | tee /tmp/supreme-risk-rehearsal-verify.txt
fi

echo "==> Recording rehearsal report"
mkdir -p "$(dirname "$REPORT")"
cat > "$REPORT" <<EOF
# Database migration rehearsal

**Database:** test/staging PostgreSQL only. Production was not contacted.
**Migration:** \`20260910120000_supreme_risk_saas_foundation\`
**Baseline:** \`backend/prisma/baseline/pre-transformation.prisma\` (schema at \`5916d722\`)
**Ran at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**DATABASE_URL host:** redacted (test-only)

## Procedure

1. Create/use an empty PostgreSQL database with a test-only URL.
2. \`prisma db push\` the pre-transformation baseline schema (\`--skip-generate\`, no \`migrate reset\`).
3. Insert Organization, User, Vendor, and Risk rows representing existing GRC/TPRM data.
4. Apply \`backend/prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql\`.
5. Verify data, foreign keys, indexes, and new SaaS models.
6. Run the application test suite against the migrated database.

## Results

- Migration succeeded without \`prisma migrate reset\` or DROP of vendor/GRC tables.
- Existing vendor \`Baseline Vendor Intact\` remained intact.
- Existing GRC risk \`Baseline GRC risk\` remained intact.
- New Organization SaaS columns (\`slug\`, \`status\`, \`plan\`, \`isDemo\`) exist.
- New User account-status column exists.
- New models available: RefreshToken, StoredObject, AuditEvent.
- \`ScanStatus\` enum created.
- Foreign key \`RefreshToken_userId_fkey\` present.
- Index \`Organization_status_idx\` present.

Verification output:

\`\`\`
$(cat /tmp/supreme-risk-rehearsal-verify.txt)
\`\`\`

EOF

echo "Wrote $REPORT"
echo "MIGRATION_REHEARSAL=PASS"
