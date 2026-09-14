#!/usr/bin/env python3
"""Hosted #12 Automation Closure Phase B walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-tprm-phase-b"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "discrepancies": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
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
    time.sleep(0.3)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    record(f"{name}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    RESULTS["sha"] = {"api": health.get("gitSha"), "version": health.get("version")}
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    stamp = str(int(time.time()))
    created_status, created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": f"Phase B Portal {stamp}",
        "website": f"https://phase-b-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Payroll processing",
        "businessOwnerUserId": user["id"],
        "businessUnit": "Finance",
        "estimatedAnnualSpend": 88000,
    })
    public_id = (created.get("data") or {}).get("publicId")
    record("phase-a-request", "PASS" if created_status == 201 else "FAIL", f"{created_status} {public_id}")
    answers = [
        {"questionKey": "ir_eng_what", "response": "Process payroll"},
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
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/intake/complete", token, {"answers": answers, "attested": True})
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/tier/confirm", token, {"confirm": True})
    plan_status, _ = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    record("phase-a-ready", "PASS" if plan_status == 200 else "FAIL", str(plan_status))
    sent_status, sent = api("POST", f"/api/v1/vendors/onboarding/{public_id}/send", token, {
        "name": "Casey Contact",
        "email": f"casey-{stamp}@vendor.example",
        "title": "Security lead",
    })
    record("send-due-diligence", "PASS" if sent_status == 201 else "FAIL", f"{sent_status} {(sent.get('data') or {}).get('invitation')}")
    activation = (sent.get("data") or {}).get("activationUrl")
    record("activation-link", "PASS" if activation and "vendor-assessment/activate" in str(activation) else "FAIL", "present" if activation else "missing")
    record("email-status", "PASS", str((sent.get("data") or {}).get("emailStatus") or (sent.get("data") or {}).get("invitation")))
    leaked, leaked_body = api("GET", f"/api/v1/vendors/onboarding/{public_id}", other_token)
    record("tenant-isolation", "PASS" if leaked in (403, 404) and public_id not in json.dumps(leaked_body) else "FAIL", str(leaked))

    vendor_token = None
    if activation:
        token_value = activation.split("token=")[-1]
        act_status, act = api("POST", "/api/v1/vendor-portal/activate", body={"token": token_value})
        vendor_token = (act.get("data") or {}).get("token")
        record("vendor-activate", "PASS" if act_status == 200 and vendor_token else "FAIL", str(act_status))
        customer_with_vendor, _ = api("GET", "/api/v1/vendors", vendor_token)
        record("vendor-plane-boundary", "PASS" if customer_with_vendor == 401 else "FAIL", str(customer_with_vendor))
        workspace_status, workspace = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)
        record("vendor-workspace", "PASS" if workspace_status == 200 else "FAIL", str(workspace_status))
        assessments = (workspace.get("data") or {}).get("assessments") or []
        if assessments:
            first = assessments[0]["id"]
            detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{first}", vendor_token)
            record("vendor-questionnaire", "PASS" if detail_status == 200 else "FAIL", str(detail_status))
            question = next((row for row in (detail.get("data") or {}).get("questions") or [] if row.get("visible")), None)
            if question:
                save_status, _ = api("PATCH", f"/api/v1/vendor-portal/assessments/{first}/responses", vendor_token, {
                    "questionKey": question["key"],
                    "response": (question.get("options") or ["Yes"])[0],
                })
                record("save-resume", "PASS" if save_status == 200 else "FAIL", str(save_status))
        RESULTS["workflow"] = {"publicId": public_id, "activation": bool(activation)}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(800)
        for width in (375, 768, 1024, 1440, 1920):
            shot(page, f"customer-workspace-{width}", width)
        if vendor_token:
            page2 = browser.new_page()
            page2.goto(f"{BASE}/vendor-assessment/activate", wait_until="domcontentloaded")
            page2.evaluate("token => localStorage.setItem('vendorToken', token)", vendor_token)
            page2.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
            page2.wait_for_timeout(800)
            for width in (375, 768, 1024, 1440, 1920):
                shot(page2, f"vendor-landing-{width}", width)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"publicId": public_id, "failed": failed}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
