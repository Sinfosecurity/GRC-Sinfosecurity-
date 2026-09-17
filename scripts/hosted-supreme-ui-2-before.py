#!/usr/bin/env python3
"""Capture BEFORE screenshots from current hosted staging. Does not deploy."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-ui-2" / "before"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
WIDTHS = (375, 1440)

ROUTES = [
    ("/dashboard", "home"),
    ("/vendor-management", "third-party-register"),
    ("/decision-briefs", "decision"),
    ("/documents", "evidence"),
    ("/risks", "risk"),
    ("/compliance", "compliance"),
    ("/privacy", "privacy"),
    ("/ai-governance", "ai-governance"),
    ("/intelligence", "intelligence"),
    ("/automation", "automation"),
    ("/governance-graph", "governance-graph"),
    ("/reports", "reports"),
    ("/organization-settings", "administration"),
    ("/vendor-assessment", "vendor-portal"),
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


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    status, payload = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {status} {payload}")
    token = payload["data"]["token"]
    user = payload["data"]["user"]
    shots = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 940})
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=90000)
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        workspace = None
        vendors = api("GET", "/api/v1/vendors?pageSize=5", token)
        rows = (vendors[1].get("vendors") if isinstance(vendors[1], dict) else None) or []
        if rows:
            workspace = rows[0].get("publicId") or rows[0].get("id")
        for path, name in ROUTES:
            target = f"/vendor-onboarding/{workspace}" if name == "vendor-workspace" else path
            if name == "review-decide" and workspace:
                target = f"/vendor-onboarding/{workspace}"
            page.goto(f"{BASE}{target}", wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(800)
            for width in WIDTHS:
                page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
                page.wait_for_timeout(300)
                dest = OUT / f"{name}-{width}.png"
                page.screenshot(path=str(dest), full_page=True)
                shots.append(str(dest.relative_to(ROOT)))
        if workspace:
            page.goto(f"{BASE}/vendor-onboarding/{workspace}", wait_until="networkidle", timeout=90000)
            page.wait_for_timeout(800)
            for width in WIDTHS:
                page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
                dest = OUT / f"vendor-workspace-{width}.png"
                page.screenshot(path=str(dest), full_page=True)
                shots.append(str(dest.relative_to(ROOT)))
                dest = OUT / f"review-decide-{width}.png"
                page.screenshot(path=str(dest), full_page=True)
                shots.append(str(dest.relative_to(ROOT)))
        browser.close()
    (OUT / "manifest.json").write_text(json.dumps({"capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "base": BASE, "shots": shots}, indent=2), encoding="utf-8")
    print(json.dumps({"shots": len(shots), "out": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
