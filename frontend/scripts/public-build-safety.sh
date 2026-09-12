#!/usr/bin/env bash
# Fail if a production frontend build still contains development entry points.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
INDEX="$DIST/index.html"

if [[ ! -f "$INDEX" ]]; then
  echo "PUBLIC_BUILD_SAFETY=FAIL reason=missing-index"
  exit 1
fi

FAIL=0
if find "$DIST" -name '*.tsx' -print -quit | grep -q .; then
  echo "PUBLIC_BUILD_SAFETY=FAIL reason=tsx-in-dist"
  FAIL=1
fi
if grep -E '<script[^>]+(@vite/client|/src/[^"]+\.tsx|react-refresh)' "$INDEX" >/dev/null 2>&1; then
  echo "PUBLIC_BUILD_SAFETY=FAIL reason=dev-entry-in-index"
  FAIL=1
fi
if grep -E '@vite/client|/src/main\.tsx|/src/index\.tsx' "$INDEX" >/dev/null 2>&1; then
  echo "PUBLIC_BUILD_SAFETY=FAIL reason=src-entry-in-index"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
echo "PUBLIC_BUILD_SAFETY=PASS"
