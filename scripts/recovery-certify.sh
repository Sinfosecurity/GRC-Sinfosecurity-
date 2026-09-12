#!/usr/bin/env bash
# Isolated populated backup / restore certification.
# NEVER restores over live staging or production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL="${PSQL:-/opt/homebrew/opt/postgresql@16/bin/psql}"
PG_DUMP="${PG_DUMP:-/opt/homebrew/opt/postgresql@16/bin/pg_dump}"
PG_RESTORE="${PG_RESTORE:-/opt/homebrew/opt/postgresql@16/bin/pg_restore}"
PG_LOCAL_USER="${PG_LOCAL_USER:-supreme_staging}"
PG_LOCAL_PASS="${PG_LOCAL_PASS:-supreme_staging}"
PG_LOCAL_HOST="${PG_LOCAL_HOST:-127.0.0.1}"
PG_LOCAL_PORT="${PG_LOCAL_PORT:-55434}"
SOURCE_DB="supreme_risk_recovery_source"
TARGET_DB="supreme_risk_recovery_target"
HOSTED_RESTORE_DB="supreme_risk_hosted_restore"
FORBIDDEN_DBS="supreme_risk_staging supreme_risk_preview production prod postgres"

export RECOVERY_CONFIRM="${RECOVERY_CONFIRM:-ISOLATED_CERTIFICATION_ONLY}"
if [[ "$RECOVERY_CONFIRM" != "ISOLATED_CERTIFICATION_ONLY" ]]; then
  echo "Recovery refused: RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY is required" >&2
  exit 1
fi

for db in "$SOURCE_DB" "$TARGET_DB" "$HOSTED_RESTORE_DB"; do
  if [[ " $FORBIDDEN_DBS " == *" $db "* ]]; then
    echo "Recovery refused: $db is not an isolated recovery name" >&2
    exit 1
  fi
  if [[ "$db" != *recovery* && "$db" != *restore* && "$db" != *cert* ]]; then
    echo "Recovery refused: $db must include recovery, restore, or cert" >&2
    exit 1
  fi
done

export PGPASSWORD="$PG_LOCAL_PASS"
SOURCE_URL="postgresql://${PG_LOCAL_USER}:${PG_LOCAL_PASS}@${PG_LOCAL_HOST}:${PG_LOCAL_PORT}/${SOURCE_DB}"
TARGET_URL="postgresql://${PG_LOCAL_USER}:${PG_LOCAL_PASS}@${PG_LOCAL_HOST}:${PG_LOCAL_PORT}/${TARGET_DB}"
HOSTED_RESTORE_URL="postgresql://${PG_LOCAL_USER}:${PG_LOCAL_PASS}@${PG_LOCAL_HOST}:${PG_LOCAL_PORT}/${HOSTED_RESTORE_DB}"

CERT_RUN_ID="${CERT_RUN_ID:-BR-6-$(date -u +%Y%m%dT%H%M%SZ)}"
SOURCE_SHA="${SOURCE_SHA:-$(git -C "$ROOT" rev-parse HEAD)}"
WORK="$ROOT/backups/recovery-cert/${CERT_RUN_ID}"
SOURCE_OBJECTS="$WORK/source-objects"
OBJECT_BACKUP="$WORK/object-backup"
OBJECT_RESTORE="$WORK/object-restore"
NEGATIVE_OBJECTS="$WORK/negative-objects"
REPORT_OUT="$WORK/reports"
EVIDENCE_OUT="$ROOT/docs/evidence/BACKUP-RESTORE-CERT-6.json"
mkdir -p "$WORK" "$SOURCE_OBJECTS" "$OBJECT_RESTORE" "$REPORT_OUT" "$ROOT/docs/evidence"

ts_cli() {
  (cd "$ROOT/backend" && npx ts-node --transpile-only src/recovery/cli.ts "$@")
}

psql_admin() {
  "$PSQL" -h "$PG_LOCAL_HOST" -p "$PG_LOCAL_PORT" -U "$PG_LOCAL_USER" -d postgres "$@"
}

psql_db() {
  "$PSQL" -h "$PG_LOCAL_HOST" -p "$PG_LOCAL_PORT" -U "$PG_LOCAL_USER" -d "$1" -At -c "$2"
}

create_isolated_db() {
  local name="$1"
  if [[ "$name" == "supreme_risk_staging" ]]; then
    echo "Refusing to recreate live staging database" >&2
    exit 1
  fi
  psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${name}' AND pid <> pg_backend_pid();" >/dev/null || true
  psql_admin -c "DROP DATABASE IF EXISTS ${name};"
  psql_admin -c "CREATE DATABASE ${name} OWNER ${PG_LOCAL_USER};"
  psql_admin -c "COMMENT ON DATABASE ${name} IS 'RECOVERY / CERTIFICATION ONLY';"
}

echo "==> Assert isolated restore target"
RECOVERY_CONFIRM="$RECOVERY_CONFIRM" \
SOURCE_DATABASE_URL="$SOURCE_URL" \
RESTORE_DATABASE_URL="$TARGET_URL" \
ts_cli assert-target

echo "==> Create isolated source and target databases"
create_isolated_db "$SOURCE_DB"
create_isolated_db "$TARGET_DB"

echo "==> Push schema to isolated source"
(
  cd "$ROOT/backend"
  DATABASE_URL="$SOURCE_URL" npx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss
)

POPULATE_START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "==> Populate recovery dataset"
OBJECT_ROOT="$SOURCE_OBJECTS" \
DATABASE_URL="$SOURCE_URL" \
POPULATE_OUT="$WORK/populate.json" \
ts_cli populate

echo "==> Pre-backup manifest (write quiescence after populate)"
CERT_RUN_ID="$CERT_RUN_ID" \
SOURCE_SHA="$SOURCE_SHA" \
SOURCE_ENVIRONMENT="isolated-recovery-source" \
DATABASE_URL="$SOURCE_URL" \
MANIFEST_OUT="$WORK/pre-backup-manifest.json" \
ts_cli manifest
LAST_INCLUDED_TXN="$(psql_db "$SOURCE_DB" "SELECT id FROM \"AuditEvent\" ORDER BY timestamp DESC LIMIT 1;")"
BACKUP_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> PostgreSQL backup"
DB_BACKUP="$WORK/recovery-source.dump"
DB_BACKUP_START="$(date +%s)"
"$PG_DUMP" -h "$PG_LOCAL_HOST" -p "$PG_LOCAL_PORT" -U "$PG_LOCAL_USER" -d "$SOURCE_DB" -Fc -f "$DB_BACKUP"
DB_BACKUP_END="$(date +%s)"
if [[ ! -s "$DB_BACKUP" ]]; then
  echo "PostgreSQL backup artifact missing or empty" >&2
  exit 1
fi
"$PG_RESTORE" -l "$DB_BACKUP" > "$WORK/pg-restore-list.txt"
if [[ ! -s "$WORK/pg-restore-list.txt" ]] || ! grep -q 'Organization_pkey' "$WORK/pg-restore-list.txt"; then
  echo "Backup listing is empty or missing Organization" >&2
  exit 1
fi

echo "==> Object storage backup"
OBJECT_ROOT="$SOURCE_OBJECTS" \
OBJECT_BACKUP="$OBJECT_BACKUP" \
ts_cli backup-objects

echo "==> Restore PostgreSQL into isolated target"
DATABASE_RESTORE_START="$(date +%s)"
RECOVERY_CONFIRM="$RECOVERY_CONFIRM" \
SOURCE_DATABASE_URL="$SOURCE_URL" \
RESTORE_DATABASE_URL="$TARGET_URL" \
ts_cli assert-target
"$PG_RESTORE" -h "$PG_LOCAL_HOST" -p "$PG_LOCAL_PORT" -U "$PG_LOCAL_USER" -d "$TARGET_DB" --no-owner --no-acl "$DB_BACKUP"
DATABASE_RESTORE_END="$(date +%s)"

echo "==> Restore objects into isolated namespace"
OBJECT_BACKUP="$OBJECT_BACKUP" \
OBJECT_RESTORE="$OBJECT_RESTORE" \
ts_cli restore-objects
OBJECT_RESTORE_END="$(date +%s)"

echo "==> Post-restore manifest and reconcile"
CERT_RUN_ID="$CERT_RUN_ID" \
SOURCE_SHA="$SOURCE_SHA" \
SOURCE_ENVIRONMENT="isolated-recovery-target" \
DATABASE_URL="$TARGET_URL" \
MANIFEST_OUT="$WORK/post-restore-manifest.json" \
ts_cli manifest

EXPECTED_MANIFEST="$WORK/pre-backup-manifest.json" \
ACTUAL_MANIFEST="$WORK/post-restore-manifest.json" \
DIFF_OUT="$WORK/reconcile.json" \
ts_cli compare
RECONCILE_END="$(date +%s)"

echo "==> Post-restore verification"
EXPECTED_MANIFEST="$WORK/pre-backup-manifest.json" \
OBJECT_RESTORE="$OBJECT_RESTORE" \
DATABASE_URL="$TARGET_URL" \
VERIFY_OUT="$WORK/post-restore-verify.json" \
ts_cli post-restore

echo "==> Report regeneration"
DATABASE_URL="$TARGET_URL" \
REPORT_OUT="$REPORT_OUT" \
ts_cli reports

echo "==> Negative tests on copies (do not corrupt the recovery target)"
rm -rf "$NEGATIVE_OBJECTS"
cp -R "$OBJECT_RESTORE" "$NEGATIVE_OBJECTS"
EXPECTED_MANIFEST="$WORK/pre-backup-manifest.json" \
OBJECT_RESTORE="$NEGATIVE_OBJECTS" \
ts_cli negative-missing-object
EXPECTED_MANIFEST="$WORK/pre-backup-manifest.json" \
OBJECT_RESTORE="$OBJECT_RESTORE" \
ts_cli negative-checksum

echo "==> Restore target guard negatives"
set +e
RECOVERY_CONFIRM=NO \
RESTORE_DATABASE_URL="$TARGET_URL" \
ts_cli assert-target >/tmp/recovery-guard-confirm.txt 2>&1
CONFIRM_RC=$?
RESTORE_DATABASE_URL="postgresql://${PG_LOCAL_USER}:${PG_LOCAL_PASS}@${PG_LOCAL_HOST}:${PG_LOCAL_PORT}/supreme_risk_staging" \
RECOVERY_CONFIRM="ISOLATED_CERTIFICATION_ONLY" \
ts_cli assert-target >/tmp/recovery-guard-staging.txt 2>&1
STAGING_RC=$?
set -e
if [[ "$CONFIRM_RC" -eq 0 || "$STAGING_RC" -eq 0 ]]; then
  echo "Restore guards failed to refuse unsafe targets" >&2
  exit 1
fi

echo "==> Optional hosted source dump into isolated local restore"
HOSTED_DUMP_STATUS="SKIPPED"
HOSTED_RESTORE_STATUS="SKIPPED"
HOSTED_BUNDLE="$ROOT/.env.hosted-staging.local"
if [[ -f "$HOSTED_BUNDLE" ]]; then
  HOSTED_DUMP="$WORK/hosted-source.dump"
  set +e
  HOSTED_BUNDLE="$HOSTED_BUNDLE" HOSTED_DUMP="$HOSTED_DUMP" PG_DUMP="$PG_DUMP" node <<'NODE'
const { spawnSync } = require('child_process');
const fs = require('fs');
const bundle = JSON.parse(fs.readFileSync(process.env.HOSTED_BUNDLE, 'utf8'));
const url = bundle?.secrets?.postgres?.externalConnectionString;
if (!url || typeof url !== 'string') {
  console.log('HOSTED_DUMP=SKIPPED reason=missing-connection');
  process.exit(2);
}
const result = spawnSync(process.env.PG_DUMP, ['--dbname=' + url, '-Fc', '-f', process.env.HOSTED_DUMP], {
  env: { ...process.env, PGSSLMODE: process.env.PGSSLMODE || 'require' },
  stdio: ['ignore', 'ignore', 'ignore'],
});
if (result.status !== 0) {
  console.log('HOSTED_DUMP=FAIL');
  process.exit(result.status || 1);
}
console.log('HOSTED_DUMP=PASS');
NODE
  HOSTED_RC=$?
  set -e
  if [[ "$HOSTED_RC" -eq 0 && -s "$HOSTED_DUMP" ]]; then
    HOSTED_DUMP_STATUS="PASS"
    create_isolated_db "$HOSTED_RESTORE_DB"
    RECOVERY_CONFIRM="$RECOVERY_CONFIRM" \
    RESTORE_DATABASE_URL="$HOSTED_RESTORE_URL" \
    ts_cli assert-target
    if "$PG_RESTORE" -h "$PG_LOCAL_HOST" -p "$PG_LOCAL_PORT" -U "$PG_LOCAL_USER" -d "$HOSTED_RESTORE_DB" --no-owner --no-acl "$HOSTED_DUMP"; then
      HOSTED_RESTORE_STATUS="PASS"
    else
      HOSTED_RESTORE_STATUS="PARTIAL"
    fi
    "$PG_RESTORE" -l "$HOSTED_DUMP" | wc -l | awk '{print "HOSTED_DUMP_TOC="$1}'
  elif [[ "$HOSTED_RC" -eq 2 ]]; then
    HOSTED_DUMP_STATUS="SKIPPED"
  else
    HOSTED_DUMP_STATUS="FAIL"
  fi
fi

CONSTRAINTS="$(psql_db "$TARGET_DB" "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type IN ('FOREIGN KEY','PRIMARY KEY','UNIQUE');")"
INDEXES="$(psql_db "$TARGET_DB" "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';")"

export WORK CERT_RUN_ID SOURCE_SHA BACKUP_TIMESTAMP LAST_INCLUDED_TXN
export DATABASE_RESTORE_START DATABASE_RESTORE_END OBJECT_RESTORE_END RECONCILE_END
export CONSTRAINTS INDEXES HOSTED_DUMP_STATUS HOSTED_RESTORE_STATUS EVIDENCE_OUT
python3 - <<'PY'
import json, os, time
from pathlib import Path
work = Path(os.environ["WORK"])
pre = json.loads((work / "pre-backup-manifest.json").read_text())
post = json.loads((work / "post-restore-manifest.json").read_text())
reconcile = json.loads((work / "reconcile.json").read_text())
verify = json.loads((work / "post-restore-verify.json").read_text())
reports = json.loads((work / "reports" / "report-verification.json").read_text())
populate = json.loads((work / "populate.json").read_text())
counts = post["counts"]
tenants = {item["name"]: item for item in post["tenants"]}
def status(ok):
    return "PASS" if ok else "FAIL"
evidence = {
    "certificationId": os.environ["CERT_RUN_ID"],
    "timestamp": os.environ["BACKUP_TIMESTAMP"],
    "sourceEnvironment": "isolated-recovery-source on 127.0.0.1:55434",
    "sourceSha": os.environ["SOURCE_SHA"],
    "backupTimestamp": os.environ["BACKUP_TIMESTAMP"],
    "lastIncludedTransaction": os.environ["LAST_INCLUDED_TXN"],
    "recoveryTarget": "supreme_risk_recovery_target + isolated object namespace",
    "operator": "recovery-certify.sh",
    "liveStagingModified": "NO",
    "databaseRestoreSeconds": int(os.environ["DATABASE_RESTORE_END"]) - int(os.environ["DATABASE_RESTORE_START"]),
    "objectRestoreSeconds": int(os.environ["OBJECT_RESTORE_END"]) - int(os.environ["DATABASE_RESTORE_END"]),
    "reconcileSeconds": int(os.environ["RECONCILE_END"]) - int(os.environ["OBJECT_RESTORE_END"]),
    "totalMeasuredRtoSeconds": int(os.environ["RECONCILE_END"]) - int(os.environ["DATABASE_RESTORE_START"]),
    "constraints": int(os.environ["CONSTRAINTS"]),
    "indexes": int(os.environ["INDEXES"]),
    "hostedDump": os.environ["HOSTED_DUMP_STATUS"],
    "hostedRestoreIsolated": os.environ["HOSTED_RESTORE_STATUS"],
    "populate": populate,
    "counts": counts,
    "tenants": {
        name: {
            "id": item["id"],
            "plan": item["plan"],
            "users": len(item["users"]),
            "vendors": len(item["vendors"]),
            "assessments": len(item["assessments"]),
            "findings": len(item["findings"]),
            "briefs": len(item["briefs"]),
        }
        for name, item in tenants.items()
    },
    "reconcile": reconcile,
    "postRestore": {"passed": verify["passed"], "failed": verify["failed"], "allPassed": verify["allPassed"]},
    "reports": reports,
    "invariants": [item["id"] for item in post["invariants"] if item["ok"]],
}
Path(os.environ["EVIDENCE_OUT"]).write_text(json.dumps(evidence, indent=2) + "\n")
print("CERT_EVIDENCE_WRITTEN")
print("DB_RESTORE_SECONDS=" + str(evidence["databaseRestoreSeconds"]))
print("OBJECT_RESTORE_SECONDS=" + str(evidence["objectRestoreSeconds"]))
print("RECONCILE_SECONDS=" + str(evidence["reconcileSeconds"]))
print("TOTAL_RTO_SECONDS=" + str(evidence["totalMeasuredRtoSeconds"]))
PY

echo "CERT_RUN_ID=$CERT_RUN_ID"
echo "BACKUP_TIMESTAMP=$BACKUP_TIMESTAMP"
echo "LIVE_STAGING_MODIFIED=NO"
echo "RECOVERY_CERTIFY=PASS"
