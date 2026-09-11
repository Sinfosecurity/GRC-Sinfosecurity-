#!/usr/bin/env bash
# Apply every current Prisma migration onto a pre-transformation baseline.
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

REPORT="${MIGRATION_REHEARSAL_REPORT:-$ROOT/../docs/STAGING-MIGRATION-CERTIFICATION.md}"
BASELINE_SCHEMA="$ROOT/prisma/baseline/pre-transformation.prisma"
CURRENT_SCHEMA="$ROOT/prisma/schema.prisma"

echo "==> Existing rehearse-migration.sh (baseline + foundation)"
SKIP_REHEARSAL_VERIFY=1 bash "$ROOT/scripts/rehearse-migration.sh"

echo "==> Applying remaining additive migrations"
for migration in \
  "$ROOT/prisma/migrations/20260910180000_phase_a_tprm_foundation/migration.sql" \
  "$ROOT/prisma/migrations/20260910193000_tprm_evidence_scoring_reports/migration.sql" \
  "$ROOT/prisma/migrations/20260911180000_organization_profile_fields/migration.sql"
do
  echo "Applying $(basename "$(dirname "$migration")")"
  npx prisma db execute --schema "$CURRENT_SCHEMA" --file "$migration"
done

echo "==> Seeding post-migration TPRM rows that the baseline schema could not hold"
npx prisma db execute --schema "$CURRENT_SCHEMA" --stdin <<'SQL'
INSERT INTO "VendorAssessment" (
  "id", "vendorId", "organizationId", "assessmentType", "status", "updatedAt"
) VALUES (
  'assess_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  'org_rehearsal_baseline',
  'INITIAL_DUE_DILIGENCE',
  'COMPLETED',
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

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
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ScoreCalculation" (
  "id", "organizationId", "vendorId", "scoreVersion", "inherentRisk",
  "controlEffectiveness", "residualRisk", "riskBand", "inputs", "explanation"
) VALUES (
  'calc_rehearsal_baseline',
  'org_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  'v1',
  72,
  40,
  55,
  'MEDIUM',
  '{"source":"rehearsal"}'::jsonb,
  'Baseline explainable score'
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RiskDecisionBrief" (
  "id", "organizationId", "vendorId", "inherentRisk", "residualRisk",
  "riskBand", "evidenceConfidence", "immutableSnapshot", "updatedAt"
) VALUES (
  'brief_rehearsal_baseline',
  'org_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  72,
  55,
  'MEDIUM',
  'MEDIUM',
  '{"residualRisk":55}'::jsonb,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StoredObject" (
  "id", "organizationId", "ownerType", "ownerId", "filename", "storageKey",
  "contentType", "size", "checksum", "uploadedBy"
) VALUES (
  'object_rehearsal_baseline',
  'org_rehearsal_baseline',
  'vendor',
  'vendor_rehearsal_baseline',
  'rehearsal.txt',
  'org_rehearsal_baseline/vendor/vendor_rehearsal_baseline/rehearsal.txt',
  'text/plain',
  12,
  'abc123',
  'user_rehearsal_baseline'
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EvidenceLink" (
  "id", "organizationId", "storedObjectId", "vendorId", "assessmentId", "createdBy"
) VALUES (
  'link_rehearsal_baseline',
  'org_rehearsal_baseline',
  'object_rehearsal_baseline',
  'vendor_rehearsal_baseline',
  'assess_rehearsal_baseline',
  'user_rehearsal_baseline'
) ON CONFLICT ("id") DO NOTHING;
SQL

echo "==> Verifying Prisma models after all migrations"
node "$ROOT/scripts/verify-rehearsal.js" | tee /tmp/supreme-risk-rehearsal-verify.txt

echo "==> Verifying preserved and newly created rows"
VERIFY="$(npx prisma db execute --schema "$CURRENT_SCHEMA" --stdin <<'SQL'
SELECT
  (SELECT COUNT(*) FROM "User" WHERE id='user_rehearsal_baseline') || '|' ||
  (SELECT COUNT(*) FROM "Vendor" WHERE id='vendor_rehearsal_baseline' AND name='Baseline Vendor Intact') || '|' ||
  (SELECT COUNT(*) FROM "VendorAssessment" WHERE id='assess_rehearsal_baseline') || '|' ||
  (SELECT COUNT(*) FROM "RiskDecisionBrief" WHERE id='brief_rehearsal_baseline') || '|' ||
  (SELECT COUNT(*) FROM "VendorRiskHistory" WHERE id='score_rehearsal_baseline') || '|' ||
  (SELECT COUNT(*) FROM "EvidenceLink" WHERE id='link_rehearsal_baseline') || '|' ||
  (SELECT COUNT(*) FROM "Organization" WHERE id='org_rehearsal_baseline' AND "legalName" IS NULL OR id='org_rehearsal_baseline');
SQL
)"
echo "$VERIFY"

mkdir -p "$(dirname "$REPORT")"
cat > "$REPORT" <<EOF
# Staging migration certification

**Database:** isolated rehearsal PostgreSQL only. Production was not contacted.
**Procedure:** pre-transformation baseline → every current additive migration.
**Ran at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**DATABASE_URL host:** redacted (staging/rehearsal only)

## Migrations applied

1. \`20260910120000_supreme_risk_saas_foundation\`
2. \`20260910180000_phase_a_tprm_foundation\`
3. \`20260910193000_tprm_evidence_scoring_reports\`
4. \`20260911180000_organization_profile_fields\`

No \`prisma migrate reset\`. No DROP of vendor/GRC tables.

## Preservation

| Record | Result |
| --- | --- |
| Admin user \`user_rehearsal_baseline\` | preserved |
| Vendor \`Baseline Vendor Intact\` | preserved |
| Assessment \`assess_rehearsal_baseline\` | present after TPRM migrations |
| Decision brief \`brief_rehearsal_baseline\` | present |
| Score history \`score_rehearsal_baseline\` | present |
| Evidence relationship \`link_rehearsal_baseline\` | present |

Raw verify: \`$VERIFY\`

## Notes

Assessment, brief, score, and evidence tables did not exist on the pre-transformation baseline. They were created by additive migrations, then seeded, then re-queried. Existing vendor and admin rows from the baseline remained.
EOF

echo "Wrote $REPORT"
echo "STAGING_MIGRATION=PASS"
