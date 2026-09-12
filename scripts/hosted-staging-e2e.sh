#!/usr/bin/env bash
# Public HTTPS staging E2E. Never points at localhost or production.
set -euo pipefail
export E2E_PROFILE=hosted-staging
export E2E_BASE="${E2E_BASE:-https://supreme-risk-staging.onrender.com}"
export E2E_API="${E2E_API:-https://supreme-risk-staging-api.onrender.com/api/v1}"
export E2E_BANNER="SUPREME RISK — STAGING"
export E2E_DOWNLOADS=/tmp/supreme-hosted-staging-e2e-downloads
export E2E_SCREENS=/tmp/supreme-hosted-staging-e2e-screens
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/.env.hosted-staging.local" ]]; then
  eval "$(python3 - "$ROOT/.env.hosted-staging.local" <<'PY'
import json, sys
from pathlib import Path
from urllib.parse import urlparse
raw = Path(sys.argv[1]).read_text()
data = json.loads(raw)
url = data["secrets"]["postgres"]["externalConnectionString"]
p = urlparse(url)
print(f'export E2E_PGHOST={p.hostname}')
print(f'export E2E_PGPORT={p.port or 5432}')
print(f'export E2E_PGUSER={p.username}')
print(f'export E2E_PGDATABASE={p.path.lstrip("/")}')
print(f'export PGPASSWORD={p.password}')
print("export PGSSLMODE=require")
print("export E2E_PSQL=/opt/homebrew/opt/libpq/bin/psql")
PY
)"
fi

python3 "$ROOT/scripts/production-closure-e2e.py"
