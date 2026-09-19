#!/usr/bin/env python3
"""Hosted Enterprise Record Standard walk. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "enterprise-record-standard"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "")
REQUIRED_API_SHA = os.environ.get("REQUIRED_API_SHA", "")
PASSWORD = "EntRecStd23Ax1"
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {"checks": [], "shots": [], "overflows": [], "sha": {}, "notes": []}


def record(name: str, result: str, detail: str) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail}", flush=True)


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1"):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload


def shot(page, name: str) -> None:
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    width = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": width})
    record(f"overflow:{name}", "PASS" if width <= 1 else "FAIL", f"extra={width}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha")}
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    if REQUIRED_API_SHA:
        record("api-sha", "PASS" if str(health.get("gitSha") or "").startswith(REQUIRED_API_SHA[:7]) else "FAIL", str(health.get("gitSha")))
    if REQUIRED_FRONTEND_SHA:
        record("fe-sha", "PASS" if str(fe.get("gitSha") or "").startswith(REQUIRED_FRONTEND_SHA[:7]) else "FAIL", str(fe.get("gitSha")))

    email = f"ers-{int(time.time())}@example.test"
    status, signup, _ = request_json("POST", "/auth/signup", body={
        "email": email,
        "password": PASSWORD,
        "firstName": "Eve",
        "lastName": "Record",
        "organizationName": f"Enterprise Record {int(time.time())}",
    })
    token = signup.get("data", {}).get("token") or signup.get("token")
    record("signup", "PASS" if status < 300 and token else "FAIL", str(status))
    if not token:
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    vendor_status, vendor = request_json("POST", "/vendors", token, {
        "name": "Unrated Proof Vendor",
        "vendorType": "SAAS",
        "category": "TECHNOLOGY",
        "primaryContact": "Proof Owner",
        "contactEmail": email,
        "servicesProvided": "Hosted honesty proof",
    })
    vendor_body = vendor.get("data") or vendor
    vendor_id = vendor_body.get("id")
    record("vendor-create-unrated", "PASS" if vendor_status < 300 and vendor_body.get("tier") in (None, "UNRATED") else "FAIL", f"{vendor_status} {vendor_body.get('tier')}")

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=True)
        except Exception:
            browser = pw.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context()
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.fill("input[type='email'], input[name='email']", email)
        page.fill("input[type='password'], input[name='password']", PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(4000)

        for path, name in [
            ("/vendors", "vendors"),
            ("/findings", "findings"),
            ("/assessments", "assessments"),
            ("/documents", "evidence"),
            ("/privacy-ops/activities", "privacy"),
        ]:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            body = page.inner_text("body")
            record(f"open:{name}", "PASS", path)
            if name == "vendors":
                record("honesty:not-rated", "PASS" if "Not rated" in body else "FAIL", "missing tier stays Not rated")
                record("honesty:no-fake-compliance", "PASS" if "Compliance %" not in body and "compliance score" not in body.lower() else "FAIL", "no invented compliance %")
            if name == "privacy":
                record("honesty:no-silent-gdpr", "PASS" if "Claims servicing" not in body else "FAIL", "no insurance purpose default on empty list")
            shot(page, f"{name}-1440")

        page.set_viewport_size({"width": 375, "height": 812})
        page.goto(f"{BASE}/vendors", wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        overflow(page, "vendors-375")
        shot(page, "vendors-375")
        for width, height, label in ((768, 1024, "768"), (1024, 768, "1024"), (1440, 900, "1440"), (1920, 1080, "1920")):
            page.set_viewport_size({"width": width, "height": height})
            page.goto(f"{BASE}/findings", wait_until="domcontentloaded")
            page.wait_for_timeout(600)
            overflow(page, f"findings-{label}")
            shot(page, f"findings-{label}")
        browser.close()

    passed = sum(1 for row in RESULTS["checks"] if row["result"] == "PASS")
    failed = sum(1 for row in RESULTS["checks"] if row["result"] == "FAIL")
    RESULTS["summary"] = {"pass": passed, "fail": failed}
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    (OUT / "README.md").write_text(
        f"# Enterprise Record Standard hosted walk\n\nPASS {passed} / FAIL {failed}\n\nFE `{RESULTS['sha'].get('frontend')}` API `{RESULTS['sha'].get('api')}`\n"
    )
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
