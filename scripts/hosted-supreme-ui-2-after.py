#!/usr/bin/env python3
"""Capture AFTER screenshots and two-user approval UX from hosted staging. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-ui-2" / "after"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL_A = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
EMAIL_B = os.environ.get("E2E_APPROVER_EMAIL", "sales@eliteadjustersny.com")
PASSWORD_B = os.environ.get("E2E_APPROVER_PASSWORD", PASSWORD)
WIDTHS = (375, 1440)
RESULTS: dict = {"shots": [], "checks": [], "sha": {}}

ROUTES = [
    ("/dashboard", "home"),
    ("/vendor-management", "third-party-register"),
    ("/decision-briefs", "decision"),
    ("/documents", "evidence"),
    ("/risks", "risk"),
    ("/compliance", "compliance"),
    ("/privacy-ops", "privacy"),
    ("/ai-governance", "ai-governance"),
    ("/intelligence", "intelligence"),
    ("/automation", "automation"),
    ("/governance-graph", "governance-graph"),
    ("/reports", "reports"),
    ("/organization-settings", "administration"),
    ("/vendor-assessment/activate", "vendor-portal"),
]


def api(method, path, token=None, body=None):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            return err.code, json.loads(raw)
        except Exception:
            return err.code, {"error": raw}


def record(name, status, detail=""):
    RESULTS["checks"].append({"name": name, "status": status, "detail": detail})
    print(f"{status} {name} {detail}")


def login(email, password):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        return None, None, status
    return payload["data"]["token"], payload["data"]["user"], status


def inject(page, token, user):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=90000)
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }""",
        [token, user],
    )


def shot(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    dest = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(dest), full_page=True)
    RESULTS["shots"].append(str(dest.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    record(f"{name}-{width}", "FAIL" if overflow else "PASS", f"overflow={overflow}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    status, health = api("GET", "/api/v1/health")
    RESULTS["sha"] = (health or {}).get("data") or health or {}
    token_a, user_a, login_a = login(EMAIL_A, PASSWORD)
    record("user-a-login", "PASS" if token_a else "FAIL", str(login_a))
    if not token_a:
        raise SystemExit(1)
    token_b, user_b, login_b = login(EMAIL_B, PASSWORD_B)
    record("user-b-login", "PASS" if token_b else "FAIL", str(login_b))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 940})
        inject(page, token_a, user_a)
        vendors = api("GET", "/api/v1/vendors?pageSize=8", token_a)
        rows = (vendors[1].get("vendors") if isinstance(vendors[1], dict) else None) or []
        workspace = rows[0].get("publicId") or rows[0].get("id") if rows else None
        for path, name in ROUTES:
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(700)
            for width in WIDTHS:
                shot(page, name, width)
        if workspace:
            page.goto(f"{BASE}/vendor-onboarding/{workspace}", wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(800)
            body = page.inner_text("body")
            record("workspace-copy", "PASS" if "waiting for approval" in body.lower() or "ready for independent approval" in body.lower() or "third" in body.lower() else "PARTIAL", body[:180].replace("\n", " "))
            for width in WIDTHS:
                shot(page, "vendor-workspace", width)
                shot(page, "review-decide", width)
        if token_b and user_b:
            inject(page, token_b, user_b)
            page.goto(f"{BASE}/dashboard", wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(800)
            body = page.inner_text("body")
            record("user-b-attention", "PASS" if "attention" in body.lower() or "decision" in body.lower() else "PARTIAL", body[:180].replace("\n", " "))
            shot(page, "approver-home", 1440)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(json.dumps({"shots": len(RESULTS["shots"]), "out": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
