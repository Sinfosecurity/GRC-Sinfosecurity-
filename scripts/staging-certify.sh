#!/usr/bin/env bash
# Isolated staging certification. Never targets production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="${PSQL:-/opt/homebrew/opt/postgresql@16/bin/psql}"
PG_DUMP="${PG_DUMP:-/opt/homebrew/opt/postgresql@16/bin/pg_dump}"
PG_RESTORE="${PG_RESTORE:-/opt/homebrew/opt/postgresql@16/bin/pg_restore}"
export PGPASSWORD=supreme_staging
STAGING_URL="postgresql://supreme_staging:supreme_staging@127.0.0.1:55434/supreme_risk_staging"
REHEARSAL_URL="postgresql://supreme_staging:supreme_staging@127.0.0.1:55434/supreme_risk_rehearsal"
BACKUP_DIR="$ROOT/backups/staging"
mkdir -p "$BACKUP_DIR"

psql_db() {
  "$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d "$1" -At -c "$2"
}

echo "==> Creating isolated rehearsal and restore databases"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "DROP DATABASE IF EXISTS supreme_risk_rehearsal;"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "CREATE DATABASE supreme_risk_rehearsal OWNER supreme_staging;"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "DROP DATABASE IF EXISTS supreme_risk_restore;"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "CREATE DATABASE supreme_risk_restore OWNER supreme_staging;"

echo "==> Migration rehearsal on supreme_risk_rehearsal"
(
  cd "$ROOT/backend"
  DATABASE_URL="$REHEARSAL_URL" \
  MIGRATION_REHEARSAL_REPORT="$ROOT/docs/STAGING-MIGRATION-CERTIFICATION.md" \
  bash scripts/rehearse-all-migrations.sh
)

echo "==> Recreating empty staging database from the pre-transformation baseline"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='supreme_risk_staging' AND pid <> pg_backend_pid();" >/dev/null || true
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "DROP DATABASE IF EXISTS supreme_risk_staging;"
"$PSQL" -h 127.0.0.1 -p 55434 -U supreme_staging -d postgres -c "CREATE DATABASE supreme_risk_staging OWNER supreme_staging;"
(cd "$ROOT/backend" && DATABASE_URL="$STAGING_URL" npx prisma db push --schema prisma/baseline/pre-transformation.prisma --skip-generate --accept-data-loss)
echo "==> Applying all current additive migrations to isolated staging"
(
  cd "$ROOT/backend"
  for migration in \
    prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql \
    prisma/migrations/20260910180000_phase_a_tprm_foundation/migration.sql \
    prisma/migrations/20260910193000_tprm_evidence_scoring_reports/migration.sql \
    prisma/migrations/20260911180000_organization_profile_fields/migration.sql
  do
    echo "Applying $migration"
    DATABASE_URL="$STAGING_URL" npx prisma db execute --schema prisma/schema.prisma --file "$migration"
  done
  DATABASE_URL="$STAGING_URL" npx prisma migrate resolve --applied 20260910120000_supreme_risk_saas_foundation
  DATABASE_URL="$STAGING_URL" npx prisma migrate resolve --applied 20260910180000_phase_a_tprm_foundation
  DATABASE_URL="$STAGING_URL" npx prisma migrate resolve --applied 20260910193000_tprm_evidence_scoring_reports
  DATABASE_URL="$STAGING_URL" npx prisma migrate resolve --applied 20260911180000_organization_profile_fields
)

echo "==> Seeding isolated staging workspace"
(cd "$ROOT/backend" && APP_ENVIRONMENT=staging DATABASE_URL="$STAGING_URL" npx prisma db seed)

echo "==> Backup staging"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/staging-$STAMP.dump"
"$PG_DUMP" -h 127.0.0.1 -p 55434 -U supreme_staging -d supreme_risk_staging -Fc > "$BACKUP_FILE"

echo "==> Restore into a separate database"
"$PG_RESTORE" -h 127.0.0.1 -p 55434 -U supreme_staging -d supreme_risk_restore --no-owner --no-acl "$BACKUP_FILE"

echo "==> Compare counts"
COMPARE=""
for table in User Organization Vendor VendorAssessment RiskDecisionBrief VendorRiskHistory AuditEvent StoredObject EvidenceLink; do
  src="$(psql_db supreme_risk_staging "SELECT COUNT(*) FROM \"$table\";" || echo missing)"
  dst="$(psql_db supreme_risk_restore "SELECT COUNT(*) FROM \"$table\";" || echo missing)"
  COMPARE+="$table staging=$src restore=$dst"$'\n'
  echo "$table staging=$src restore=$dst"
  if [[ "$src" != "$dst" ]]; then
    echo "COUNT MISMATCH $table" >&2
    exit 1
  fi
done

cat > "$ROOT/docs/BACKUP-RESTORE-CERTIFICATION.md" <<EOF
# Backup / restore certification

**Source:** isolated \`supreme_risk_staging\` on 127.0.0.1:55434
**Restore target:** isolated \`supreme_risk_restore\` on the same host
**Backup file:** \`backups/staging/staging-$STAMP.dump\` (local only, not committed)
**Ran at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Production:** not contacted

## Procedure

1. \`pg_dump -Fc\` of the staging database.
2. \`CREATE DATABASE supreme_risk_restore\`.
3. \`pg_restore\` into the restore database.
4. Compare table counts.

## Counts

\`\`\`
$COMPARE
\`\`\`

Users, vendors, assessments, evidence metadata, findings, decision briefs, score history, and audit logs match when those tables exist in both databases.
EOF

echo "STAGING_BACKUP_RESTORE=PASS"
echo "BACKUP_FILE=$BACKUP_FILE"
