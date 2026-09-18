#!/usr/bin/env python3
"""Hosted Finding Workspace Context Closure walk. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "finding-workspace"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "")
REQUIRED_API_SHA = os.environ.get("REQUIRED_API_SHA", "")
PASSWORD = "FindWalk23Cx1"
WIDTHS = (375, 768, 1440, 1920)
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
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    width = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": width})
    record(f"overflow:{name}", "PASS" if width <= 1 else "FAIL", f"extra={width}")


def signup():
    email = f"find-ws-{int(time.time())}@example.test"
    status, payload = request_json("POST", "/auth/signup", body={
        "email": email,
        "password": PASSWORD,
        "firstName": "Fay",
        "lastName": "Finding",
        "organizationName": f"Finding Workspace {int(time.time())}",
    })
    return status, payload, email


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha")}
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    if REQUIRED_API_SHA:
        record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_API_SHA else "FAIL", str(health.get("gitSha")))
    if REQUIRED_FRONTEND_SHA:
        record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_FRONTEND_SHA else "FAIL", str(fe.get("gitSha")))
    if (REQUIRED_API_SHA and health.get("gitSha") != REQUIRED_API_SHA) or (REQUIRED_FRONTEND_SHA and fe.get("gitSha") != REQUIRED_FRONTEND_SHA):
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    status, payload, email = signup()
    if status not in {200, 201}:
        record("org", "FAIL", str(status))
        raise SystemExit(1)
    token = payload["data"]["token"]
    record("org", "PASS", payload["data"]["user"]["organizationId"][:8])

    vendor = request_json("POST", "/vendors", token, {
        "name": "Acme Findings",
        "vendorType": "SAAS",
        "category": "CLOUD_HOSTING",
        "tier": "HIGH",
        "primaryContact": "Pat Lee",
        "contactEmail": f"acme-find-{int(time.time())}@example.test",
        "servicesProvided": "Cloud operations",
    })
    vendor_payload = vendor[1].get("data") if isinstance(vendor[1].get("data"), dict) else vendor[1]
    vendor_id = vendor_payload.get("id")
    record("vendor", "PASS" if vendor[0] in {200, 201} and vendor_id else "FAIL", str(vendor[0]))

    privacy = request_json("POST", f"/tprm/vendors/{vendor_id}/findings", token, {
        "title": "Response needs review: Is a personal-data breach notification process defined?",
        "description": "No. Privacy control expects a documented breach-notification process.",
        "severity": "HIGH",
        "category": "Privacy",
        "source": "INTERNAL_ASSESSMENT",
        "responsibility": "VENDOR",
    })
    privacy_id = (privacy[1].get("data") or {}).get("id")
    record("privacy-finding", "PASS" if privacy[0] == 201 else "FAIL", str(privacy[0]))
    workspace = request_json("GET", f"/tprm/findings/{privacy_id}/workspace", token)
    body = json.dumps(workspace[1]).lower()
    record("privacy-workspace", "PASS" if workspace[0] == 200 and "no" in body and "privacy" in body else "FAIL", str(workspace[0]))
    record("no-fake-percent", "PASS" if "100%" not in body else "FAIL", "honesty")

    manual = request_json("POST", f"/tprm/vendors/{vendor_id}/findings", token, {
        "title": "Privileged access review not recorded",
        "description": "Quarterly access review is not recorded for privileged accounts.",
        "severity": "MEDIUM",
        "source": "OTHER",
        "responsibility": "INTERNAL",
    })
    manual_id = (manual[1].get("data") or {}).get("id")
    manual_ws = request_json("GET", f"/tprm/findings/{manual_id}/workspace", token)
    record("manual-finding", "PASS" if manual[0] == 201 and "manual finding" in json.dumps(manual_ws[1]).lower() else "FAIL", str(manual[0]))

    plan = request_json("POST", f"/tprm/findings/{manual_id}/cap", token, {
        "correctiveActionPlan": "Schedule the next privileged access review and attach the register.",
        "targetRemediationDate": "2030-01-15T00:00:00.000Z",
    })
    refreshed = request_json("GET", f"/tprm/findings/{manual_id}/workspace", token)
    record("plan-persist", "PASS" if plan[0] == 200 and "schedule the next privileged" in json.dumps(refreshed[1]).lower() else "FAIL", str(plan[0]))

    insurance = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG"],
        "linesOfBusiness": ["MOTOR"],
        "activities": ["CLAIMS"],
        "dataHandled": ["POLICYHOLDER"],
    })
    if insurance[0] in {200, 201} and vendor_id:
        request_json("POST", "/insurance/vendors", token, {"vendorId": vendor_id, "serviceCategory": "TPA", "jurisdictionCode": "NG", "criticality": "HIGH"})
    ins_finding = request_json("POST", f"/tprm/vendors/{vendor_id}/findings", token, {
        "title": "Claims TPA authority limits not recorded",
        "description": "Delegated claims authority limits are not recorded for this TPA.",
        "severity": "HIGH",
        "category": "Insurance",
        "responsibility": "SHARED",
    })
    ins_ws = request_json("GET", f"/tprm/findings/{ins_finding[1].get('data', {}).get('id')}/workspace", token) if ins_finding[0] == 201 else (0, {})
    record("insurance-finding", "PASS" if ins_finding[0] == 201 and ins_ws[0] == 200 else "SKIP" if insurance[0] not in {200, 201} else "FAIL", str(ins_finding[0]))

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except Exception:
            browser = playwright.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.get_by_label("Work email").fill(email)
        continue_btn = page.get_by_role("button", name="Continue")
        if continue_btn.count():
            continue_btn.click()
            page.wait_for_timeout(800)
        if page.get_by_label("Password").count():
            page.get_by_label("Password").fill(PASSWORD)
        sign_in = page.get_by_role("button", name="Sign in")
        (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
        page.wait_for_timeout(2500)
        page.goto(f"{BASE}/findings", wait_until="networkidle")
        page.wait_for_timeout(1000)
        shot(page, "register-1440")
        record("list-distinguishable", "PASS" if "breach notification" in page.inner_text("body").lower() or "access review" in page.inner_text("body").lower() else "FAIL", "titles")
        page.get_by_text("Privileged access review not recorded").first.click()
        page.wait_for_timeout(1200)
        shot(page, "manual-drawer-1440")
        body = page.inner_text("body").lower()
        record("drawer-source", "PASS" if "manual finding" in body else "FAIL", "source visible")
        record("drawer-observed", "PASS" if "quarterly access review" in body else "FAIL", "observed visible")
        record("drawer-next", "PASS" if "await remediation" in body or "record remediation" in body else "FAIL", "next action")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        if page.get_by_text("Privacy").count():
            page.get_by_text("Privacy").first.click()
            page.wait_for_timeout(800)
            shot(page, "privacy-drawer-1440")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            page.goto(f"{BASE}/findings", wait_until="networkidle")
            page.wait_for_timeout(400)
            shot(page, f"register-{width}")
            overflow(page, f"register-{width}")
        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {"pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"), "fail": len(failed), "skip": sum(1 for row in RESULTS["checks"] if row["result"] == "SKIP")}
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps(RESULTS["summary"], indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
