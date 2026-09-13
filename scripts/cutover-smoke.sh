#!/usr/bin/env bash
# Safe production-cutover smoke. Synthetic/public checks only. No secrets.
# Default target is hosted staging. Never point this at a customer-facing
# production host unless Product Leadership has authorized a real cutover.
set -euo pipefail

FE="${CUTOVER_FRONTEND_URL:-https://supreme-risk-staging.onrender.com}"
API="${CUTOVER_API_URL:-https://supreme-risk-staging-api.onrender.com}"
FAIL=0

check() {
  local name="$1" expected="$2" url="$3"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "$url" || echo 000)"
  if [[ "$code" == "$expected" ]]; then
    echo "PASS $name $code"
  else
    echo "FAIL $name expected=$expected got=$code $url"
    FAIL=1
  fi
}

echo "CUTOVER_SMOKE frontend=$FE api=$API"

check HOME 200 "$FE/"
check PRICING 200 "$FE/pricing"
check CUSTOMER_LOGIN 200 "$FE/login"
check REGISTER 200 "$FE/register"
check ADMIN_LOGIN 200 "$FE/admin/login"
check PLATFORM 200 "$FE/platform"
check STATUS 200 "$FE/status"
check TRUST 200 "$FE/trust"
check HEALTH 200 "$API/health"
check LIVE 200 "$API/health/live"
check READY 200 "$API/health/ready"
check METRICS_UNAUTH 404 "$API/metrics"
check LEGACY_TASKS 404 "$API/api/v1/tasks"
check LEGACY_WORKFLOWS 404 "$API/api/v1/workflows"
check LEGACY_REPORTS 404 "$API/api/v1/reports"
check STATIC_UPLOADS 404 "$API/uploads/test.pdf"

ORIGIN="$(curl -sS -D - -o /dev/null --max-time 25 -H 'Origin: https://evil.example' "$API/health" | awk 'tolower($1)=="access-control-allow-origin:" {print $2}' | tr -d '\r')"
if [[ -z "$ORIGIN" || "$ORIGIN" != "https://evil.example" ]]; then
  echo "PASS CORS_HOSTILE"
else
  echo "FAIL CORS_HOSTILE reflected $ORIGIN"
  FAIL=1
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "CUTOVER_SMOKE=PASS"
  exit 0
fi
echo "CUTOVER_SMOKE=FAIL"
exit 1
