#!/usr/bin/env bash
set -euo pipefail
export E2E_PROFILE=staging
export E2E_BASE="${E2E_BASE:-http://127.0.0.1:3200}"
export E2E_API="${E2E_API:-http://127.0.0.1:4100/api/v1}"
export E2E_BANNER="SUPREME RISK — STAGING"
export E2E_PGHOST=127.0.0.1
export E2E_PGPORT=55434
export E2E_PGUSER=supreme_staging
export E2E_PGDATABASE=supreme_risk_staging
export PGPASSWORD=supreme_staging
export E2E_DOWNLOADS=/tmp/supreme-staging-e2e-downloads
export E2E_SCREENS=/tmp/supreme-staging-e2e-screens
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/production-closure-e2e.py"
