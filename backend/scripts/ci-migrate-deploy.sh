#!/usr/bin/env bash
# Apply the committed Prisma migration chain to a disposable CI database.
# Never targets production, hosted staging, or recovery certification databases.
#
# This repository's first migrations are additive on a pre-transformation
# baseline. An empty database therefore requires a documented baseline
# bootstrap, then each migration SQL file, then `prisma migrate deploy`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

python3 - <<'PY'
import os, sys
from urllib.parse import urlparse

url = os.environ["DATABASE_URL"]
parsed = urlparse(url)
host = (parsed.hostname or "").lower()
name = (parsed.path or "").lstrip("/").split("?")[0].lower()
if parsed.scheme not in {"postgres", "postgresql"}:
    print("CI migrate refused: not PostgreSQL", file=sys.stderr)
    sys.exit(1)
allowed_hosts = {"127.0.0.1", "localhost", "::1", "postgres"}
if host not in allowed_hosts:
    print("CI migrate refused: host is not a disposable CI/service database", file=sys.stderr)
    sys.exit(1)
if name in {
    "supreme_risk_staging",
    "production",
    "prod",
    "supreme_risk_recovery_source",
    "supreme_risk_recovery_target",
    "supreme_risk_hosted_restore",
} or "staging" in name or "production" in name:
    print("CI migrate refused: database name is staging/production/recovery", file=sys.stderr)
    sys.exit(1)
if "test" not in name and "ci" not in name:
    print("CI migrate refused: disposable CI database name must include test or ci", file=sys.stderr)
    sys.exit(1)
print(f"CI_MIGRATE_TARGET database={name} host={host}")
PY

BASELINE="$ROOT/prisma/baseline/pre-transformation.prisma"
CURRENT="$ROOT/prisma/schema.prisma"
MIGRATIONS="$ROOT/prisma/migrations"

echo "==> Prisma validate"
npx prisma validate --schema "$CURRENT"

echo "==> Detect empty disposable database"
HAS_MIGRATIONS="$(npx prisma db execute --schema "$CURRENT" --stdin <<'SQL' 2>/dev/null || true
SELECT COUNT(*)::text AS count FROM "_prisma_migrations";
SQL
)"

if ! echo "$HAS_MIGRATIONS" | grep -Eq '(^|[^0-9])[1-9][0-9]*'; then
  echo "==> Empty migration history: bootstrap pre-transformation baseline"
  npx prisma db push --schema "$BASELINE" --skip-generate --accept-data-loss
  echo "==> Apply committed additive migration SQL, then record history"
  while IFS= read -r migration; do
    name="$(basename "$(dirname "$migration")")"
    echo "Applying $name"
    npx prisma db execute --schema "$CURRENT" --file "$migration"
    npx prisma migrate resolve --applied "$name" --schema "$CURRENT"
  done < <(find "$MIGRATIONS" -name 'migration.sql' | sort)
else
  echo "==> Migration history present; skipping baseline bootstrap"
fi

echo "==> prisma migrate deploy"
npx prisma migrate deploy --schema "$CURRENT"

echo "==> Prisma validate after deploy"
npx prisma validate --schema "$CURRENT"

echo "==> Migration status"
npx prisma migrate status --schema "$CURRENT"

echo "MIGRATION_DEPLOY=PASS"
