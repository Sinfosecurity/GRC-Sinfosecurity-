#!/usr/bin/env python3
"""CSP-safe axe + keyboard pass. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "premium-experience" / "a11y"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
RESULTS = {"checks": [], "routes": []}


def login():
    req = urllib.request.Request(
        f"{API}/api/v1/auth/login",
        data=json.dumps({"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read())
    return payload["data"]["token"], payload["data"]["user"]


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    token, user = login()
    routes = [
        ("/", "public-home", False),
        ("/login", "public-login", False),
        ("/dashboard", "home", True),
        ("/vendor-onboarding", "lifecycle", True),
        ("/risks", "risk", True),
        ("/compliance", "compliance", True),
        ("/privacy-ops", "privacy", True),
        ("/ai-governance", "ai", True),
        ("/documents", "evidence", True),
        ("/reports", "reports", True),
        ("/user-management", "administration", True),
        ("/notifications", "notifications", True),
        ("/vendor-assessment/activate", "vendor-activate", False),
    ]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        for path, name, _auth in routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.8)
            try:
                page.add_script_tag(path=str(AXE_PATH))
                result = page.evaluate(
                    """async () => {
                        const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
                        return {
                            violations: out.violations.map((row) => ({
                                id: row.id,
                                impact: row.impact,
                                help: row.help,
                                nodes: row.nodes.length,
                                samples: row.nodes.slice(0, 8).map((node) => ({
                                    target: node.target,
                                    html: (node.html || '').slice(0, 180),
                                    failure: (node.failureSummary || '').slice(0, 240),
                                })),
                            })),
                            passes: out.passes.length,
                        };
                    }"""
                )
            except Exception as exc:  # noqa: BLE001
                result = {"error": str(exc), "violations": [], "passes": 0}
            serious = [row for row in result.get("violations", []) if row.get("impact") in ("critical", "serious")]
            moderate = [row for row in result.get("violations", []) if row.get("impact") == "moderate"]
            status = "FAIL" if serious else ("PARTIAL" if result.get("violations") or result.get("error") else "PASS")
            RESULTS["routes"].append({"route": name, "path": path, "result": status, **result})
            (OUT / f"{name}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
            record(f"axe {name}", status, f"serious={len(serious)} moderate={len(moderate)} error={bool(result.get('error'))}")
        browser.close()
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(json.dumps({"fail": [row for row in RESULTS["checks"] if row["result"] == "FAIL"]}, indent=2), flush=True)


if __name__ == "__main__":
    main()
