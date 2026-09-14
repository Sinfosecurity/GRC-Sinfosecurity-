#!/usr/bin/env python3
"""Hosted #12 Automation Closure Phase A walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-tprm-onboarding"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_SHA = os.environ.get("E2E_EXPECTED_SHA", "")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "discrepancies": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:400].decode("utf-8", "replace")}
        return exc.code, parsed


def login(email: str, password: str):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {email} {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.4)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    record(f"{name}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")
    return path


def inject(page, token: str, user: dict):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }""",
        [token, user],
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = api("GET", "/health")
    RESULTS["sha"] = {"apiHealth": health.get("version") or health.get("sha") or health, "expected": EXPECTED_SHA}
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    stamp = str(int(time.time()))
    name = f"Phase A Payroll {stamp}"
    created_status, created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": name,
        "website": f"https://phase-a-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Payroll processing for employees",
        "businessOwnerUserId": user["id"],
        "businessUnit": "Finance",
        "estimatedAnnualSpend": 85000,
        "targetStartDate": "2026-11-01",
    })
    record("vendor-request", "PASS" if created_status == 201 else "FAIL", f"{created_status} {created.get('data', {}).get('publicId')}")
    public_id = created.get("data", {}).get("publicId")
    vendor_id = created.get("data", {}).get("id")
    RESULTS["workflow"]["publicId"] = public_id
    RESULTS["workflow"]["vendorId"] = vendor_id
    record("public-vendor-id", "PASS" if public_id and str(public_id).startswith("VND-") else "FAIL", str(public_id))
    dup_status, dup = api("POST", "/api/v1/vendors/onboarding/duplicates", token, {"name": name, "website": f"https://phase-a-{stamp}.example"})
    record("duplicate-detection", "PASS" if dup_status == 200 and dup.get("data") else "FAIL", f"{dup_status} matches={len(dup.get('data') or [])}")
    blocked_status, _ = api("POST", "/api/v1/vendors/onboarding", token, {"name": name, "website": f"https://phase-a-{stamp}.example", "servicesProvided": "Payroll"})
    record("duplicate-block", "PASS" if blocked_status == 409 else "FAIL", str(blocked_status))
    record("owner-assignment", "PASS" if created.get("data", {}).get("owner") else "FAIL", created.get("data", {}).get("owner") or "missing")

    answers = [
        {"questionKey": "ir_eng_what", "response": "Process payroll for the finance team"},
        {"questionKey": "ir_data", "response": "Personal data"},
        {"questionKey": "ir_volume", "response": "10,000 to 100,000"},
        {"questionKey": "ir_access", "response": "Read-write"},
        {"questionKey": "ir_onsite", "response": "No"},
        {"questionKey": "ir_geo", "response": "Same region"},
        {"questionKey": "ir_regulated", "response": "Yes"},
        {"questionKey": "ir_fourth", "response": "Yes"},
        {"questionKey": "ir_availability", "response": "Within 1 day / severe"},
        {"questionKey": "ir_spend", "response": "More than $250k"},
        {"questionKey": "ir_ai", "response": "Yes"},
    ]
    saved_status, _ = api("PATCH", f"/api/v1/vendors/onboarding/{public_id}/intake", token, {"answers": answers[:2]})
    record("intake-save", "PASS" if saved_status == 200 else "FAIL", str(saved_status))
    done_status, done = api("POST", f"/api/v1/vendors/onboarding/{public_id}/intake/complete", token, {"answers": answers, "attested": True})
    record("intake-complete", "PASS" if done_status == 200 else "FAIL", str(done_status))
    tier = (done.get("data") or {}).get("tierReview") or {}
    record("explainable-tier", "PASS" if tier.get("explanation") else "FAIL", tier.get("explanation") or "missing")
    record("hard-floor-or-factors", "PASS" if tier.get("factors") else "FAIL", f"factors={len(tier.get('factors') or [])}")
    plan = (done.get("data") or {}).get("plan") or {}
    record("privacy-trigger", "PASS" if plan.get("triggers", {}).get("privacy") else "FAIL", str(plan.get("triggers")))
    record("ai-trigger", "PASS" if plan.get("triggers", {}).get("aiGovernance") else "FAIL", str(plan.get("triggers")))
    confirm_status, confirmed = api("POST", f"/api/v1/vendors/onboarding/{public_id}/tier/confirm", token, {"confirm": True})
    record("analyst-confirm", "PASS" if confirm_status == 200 else "FAIL", str(confirm_status))
    assessments = ((confirmed.get("data") or {}).get("plan") or {}).get("assessments") or []
    record("plan-rationale", "PASS" if assessments and all(item.get("rationale") for item in assessments) else "FAIL", f"{len(assessments)} assessments")
    plan_status, ready = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    record("plan-confirm", "PASS" if plan_status == 200 and (ready.get("data") or {}).get("stage") == "Ready to send" else "FAIL", (ready.get("data") or {}).get("stage"))
    leaked_status, leaked = api("GET", f"/api/v1/vendors/onboarding/{public_id}", other_token)
    record("tenant-isolation", "PASS" if leaked_status in (403, 404) and public_id not in json.dumps(leaked) else "FAIL", str(leaked_status))
    history = (ready.get("data") or created.get("data") or {}).get("history") or (confirmed.get("data") or {}).get("history") or []
    if not history:
        _, detail = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
        history = (detail.get("data") or {}).get("history") or []
    record("history", "PASS" if any("recommended" in json.dumps(item).lower() for item in history) else "FAIL", f"{len(history)} events")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        inject(page, token, user)
        page.goto(f"{BASE}/vendor-onboarding", wait_until="networkidle")
        page.wait_for_timeout(800)
        for width in (375, 768, 1024, 1440, 1920):
            shot(page, f"request-{width}", width)
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(1000)
        for width in (375, 768, 1024, 1440, 1920):
            shot(page, f"workspace-{width}", width)
        for tab in ("Tier Review", "Assessment Plan", "History"):
            page.get_by_role("tab", name=tab).click()
            page.wait_for_timeout(400)
            shot(page, f"{tab.lower().replace(' ', '-')}-1440", 1440)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"publicId": public_id, "failed": failed}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
