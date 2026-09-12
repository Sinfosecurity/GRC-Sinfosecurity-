#!/usr/bin/env bash
# Security quality checks for CI. Never prints secret values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0

echo "==> Prisma schema validate"
(cd backend && npx prisma validate)

echo "==> Migration safety (all committed migrations)"
MIGRATION_DIR="backend/prisma/migrations"
if [[ ! -d "$MIGRATION_DIR" ]]; then
  echo "Missing $MIGRATION_DIR"
  FAIL=1
fi
FOUND_MIGRATIONS=0
while IFS= read -r migration; do
  FOUND_MIGRATIONS=$((FOUND_MIGRATIONS + 1))
  if grep -Ei 'drop[[:space:]]+database|prisma migrate reset|truncate[[:space:]]+(table|[[:alnum:]_"]+)|drop[[:space:]]+table' "$migration" >/dev/null; then
    echo "MIGRATION_SAFETY=FAIL file=$(basename "$(dirname "$migration")")"
    FAIL=1
  fi
done < <(find "$MIGRATION_DIR" -name 'migration.sql' | sort)
if [[ "$FOUND_MIGRATIONS" -lt 5 ]]; then
  echo "Expected at least 5 committed migrations, found $FOUND_MIGRATIONS"
  FAIL=1
fi
FOUNDATION="backend/prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql"
if [[ -f "$FOUNDATION" ]] && ! grep -q 'CREATE TABLE IF NOT EXISTS "RefreshToken"' "$FOUNDATION"; then
  echo "Foundation migration is missing RefreshToken"
  FAIL=1
fi
if [[ "$FAIL" -eq 0 ]]; then
  echo "MIGRATION_SAFETY=PASS files=$FOUND_MIGRATIONS"
fi

echo "==> Secret pattern scan (paths and rule names only)"
python3 - <<'PY'
from pathlib import Path
import re, sys
root = Path(".")
skip_parts = {".git", "node_modules", "dist", "coverage", "build", ".next", "backups"}
rules = {
    "pem_private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws_access_key": re.compile(r"AKIA(?!X{6})[0-9A-Z]{16}"),
    "generic_secret_assignment": re.compile(
        r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"](?!test-|mock_|changeme|placeholder|ISOLATED_)[^'\"]{16,}['\"]",
        re.I,
    ),
    "stripe_live": re.compile(r"sk_live_[0-9a-zA-Z]{10,}"),
    "stripe_test": re.compile(r"sk_test_(?!placeholder|example)[0-9a-zA-Z]{16,}"),
    "stripe_webhook": re.compile(r"whsec_[0-9a-zA-Z]{16,}"),
    "resend_key": re.compile(r"\bre_[0-9a-zA-Z]{20,}"),
    "database_url_creds": re.compile(
        r"(DATABASE_URL|POSTGRES(?:QL)?_URL|RESTORE_DATABASE_URL)\s*[:=]\s*['\"]postgres(?:ql)?://(?![\$\{])[^:\s/'\"']+:(?![\$\{])[^@\s'\"]+@"
    ),
}
skip_files = {"backend/src/tests/setup.ts", "backend/src/tests/env.ts"}
allow = {
    "backend/src/config/env.ts",
    "backend/scripts/ci-security.sh",
    "backend/scripts/scan-secrets.py",
}
hits = []
for path in root.rglob("*"):
    if not path.is_file():
        continue
    if any(part in skip_parts for part in path.parts):
        continue
    if path.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".env", ".md", ".sh", ".sql", ".prisma"} and path.name not in {".env", ".env.example"}:
        continue
    rel = str(path).replace("\\", "/")
    if rel in skip_files or "/__tests__/" in rel or rel.endswith(".test.ts") or rel.endswith(".test.tsx"):
        continue
    try:
        text = path.read_text(errors="ignore")
    except Exception:
        continue
    for name, pattern in rules.items():
        for i, line in enumerate(text.splitlines(), 1):
            if pattern.search(line):
                if "example" in rel.lower() or rel.endswith(".md"):
                    continue
                if rel in allow:
                    continue
                hits.append(f"{rel}:{i}:{name}")
if hits:
    print("SECRET_SCAN=FAIL")
    for hit in hits[:50]:
        print(hit)
    sys.exit(1)
print("SECRET_SCAN=PASS")
print("files_with_findings=0")
PY

echo "==> Dependency audit (critical on direct production dependencies)"
python3 - <<'PY'
import json, subprocess, sys
from pathlib import Path

def classify(pkg_dir):
    pkg = json.loads((Path(pkg_dir) / "package.json").read_text())
    direct = set((pkg.get("dependencies") or {}).keys())
    proc = subprocess.run(
        ["npm", "audit", "--json", "--omit=dev"],
        cwd=pkg_dir,
        capture_output=True,
        text=True,
    )
    try:
        data = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        print(f"{pkg_dir}: npm audit json parse failed")
        return 1
    vulns = data.get("vulnerabilities") or {}
    buckets = {
        "direct_critical": [],
        "direct_high": [],
        "transitive_critical": [],
        "transitive_high": [],
    }
    for name, meta in vulns.items():
        severity = (meta.get("severity") or "").lower()
        if severity not in {"critical", "high"}:
            continue
        key = ("direct_" if name in direct else "transitive_") + severity
        buckets[key].append(name)
    print(
        f"{pkg_dir}: "
        f"direct_critical={buckets['direct_critical'] or 'none'} "
        f"direct_high={buckets['direct_high'] or 'none'} "
        f"transitive_critical={buckets['transitive_critical'] or 'none'} "
        f"transitive_high={buckets['transitive_high'] or 'none'}"
    )
    if buckets["direct_critical"]:
        print("DIRECT_CRITICAL=FAIL")
        return 1
    return 0

failed = 0
failed += classify("backend")
failed += classify("frontend")
sys.exit(failed)
PY

if [[ "$FAIL" -ne 0 ]]; then
  echo "SECURITY_CHECKS=FAIL"
  exit 1
fi
echo "SECURITY_CHECKS=PASS"
