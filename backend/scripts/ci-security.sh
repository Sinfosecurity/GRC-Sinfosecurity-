#!/usr/bin/env bash
# Security quality checks for CI. Never prints secret values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FAIL=0

echo "==> Prisma schema validate"
(cd backend && npx prisma validate)

echo "==> Migration file present and non-destructive"
MIGRATION="backend/prisma/migrations/20260910120000_supreme_risk_saas_foundation/migration.sql"
if [[ ! -f "$MIGRATION" ]]; then
  echo "Missing $MIGRATION"
  FAIL=1
fi
if grep -Ei 'drop table|truncate |prisma migrate reset' "$MIGRATION" >/dev/null; then
  echo "Migration contains destructive SQL"
  FAIL=1
fi
if ! grep -q 'CREATE TABLE IF NOT EXISTS "RefreshToken"' "$MIGRATION"; then
  echo "Migration is missing RefreshToken"
  FAIL=1
fi

echo "==> Secret pattern scan (paths and rule names only)"
python3 - <<'PY'
from pathlib import Path
import re, sys
root = Path(".")
skip_parts = {".git", "node_modules", "dist", "coverage", "build", ".next"}
rules = {
    "pem_private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws_access_key": re.compile(r"AKIA(?!X{6})[0-9A-Z]{16}"),
    "generic_secret_assignment": re.compile(
        r"(api[_-]?key|secret|token|password)\s*[:=]\s*['\"](?!test-|mock_|changeme|placeholder)[^'\"]{16,}['\"]",
        re.I,
    ),
    "stripe_live": re.compile(r"sk_live_[0-9a-zA-Z]{10,}"),
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
print(f"files_with_findings=0")
PY

echo "==> Dependency audit (critical on direct production dependencies)"
python3 - <<'PY'
import json, subprocess, sys
from pathlib import Path

def direct_critical(pkg_dir):
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
    critical_direct = []
    critical_transitive = []
    for name, meta in vulns.items():
        severity = (meta.get("severity") or "").lower()
        if severity != "critical":
            continue
        if name in direct:
            critical_direct.append(name)
        else:
            critical_transitive.append(name)
    print(f"{pkg_dir}: direct_critical={critical_direct or 'none'} transitive_critical={critical_transitive or 'none'}")
    if critical_direct:
        print("DIRECT_CRITICAL=FAIL")
        return 1
    return 0

failed = 0
failed += direct_critical("backend")
failed += direct_critical("frontend")
sys.exit(failed)
PY

if [[ "$FAIL" -ne 0 ]]; then
  echo "SECURITY_CHECKS=FAIL"
  exit 1
fi
echo "SECURITY_CHECKS=PASS"
