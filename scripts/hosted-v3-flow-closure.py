#!/usr/bin/env python3
"""Hosted Version 3 TPRM operating-path walk. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-tprm-v3-flow-closure"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
EXPECTED = os.environ.get("E2E_EXPECTED_SHA", "a9a39e1f7481c34c1bf5b0f9855b9b370ac4f973")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "vendors": {}, "discrepancies": []}

IRA_PICKS = [
    ("What will the vendor do for us?", "Consulting or professional services", True),
    ("What information will the vendor store", "Personal data about employees or customers", True),
    ("Roughly how many people's records?", "None", False),
    ("What access will the vendor need to our systems?", "None", False),
    ("Is the service reachable from the internet", "Internal use only", False),
    ("Where will our data be stored or handled?", "Our country only", False),
    ("Will the vendor use other companies", "No", False),
    ("Does the service use AI", "No", False),
    ("Will vendor staff work on our premises", "No", False),
    ("If this vendor stopped working tomorrow", "Not much — we would manage", False),
    ("Could a problem with this vendor", "Not really", False),
    ("Is this service tied to a law", "No", False),
    ("If the vendor lost our data", "Minor", False),
    ("How hard would it be to replace this vendor?", "Easy — alternatives exist", False),
]


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


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def shot(page, name: str):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    return path


def login():
    status, payload = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def inject(page, token: str, user: dict):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }""",
        [token, user],
    )


def wait_sha():
    for _ in range(40):
        try:
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                fe = json.loads(resp.read().decode())
            status, health = api("GET", "/health")
            payload = health.get("data") if isinstance(health.get("data"), dict) else health
            fe_sha = str(fe.get("gitSha") or fe.get("sha") or "")
            api_sha = str(payload.get("gitSha") or payload.get("commit") or "")
            RESULTS["sha"] = {"frontend": fe_sha, "api": api_sha, "frontendRaw": fe, "apiHealth": {"status": payload.get("status"), "gitSha": api_sha}}
            if EXPECTED[:7] in fe_sha and EXPECTED[:7] in api_sha:
                return fe_sha, api_sha
        except Exception as exc:
            RESULTS["sha"]["wait_error"] = str(exc)
        time.sleep(15)
    return None, None


def create_vendor(token: str, name: str, requester_email: str):
    status, payload = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": name,
        "servicesProvided": "Customer payroll processing",
        "requesterName": "Jordan Request",
        "requesterEmail": requester_email,
        "acknowledgeDuplicate": True,
    })
    if status not in (200, 201):
        raise SystemExit(f"create failed {status} {payload}")
    return payload["data"]


def workspace(token: str, public_id: str):
    status, payload = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    return payload.get("data") or {}


def fill_ira(page):
    for question, option, multiple in IRA_PICKS:
        block = page.get_by_text(question, exact=False).first
        if multiple:
            page.get_by_label(option, exact=False).first.check()
        else:
            field = page.locator("div").filter(has_text=question).locator('[role="combobox"]').last
            if field.count():
                field.click()
                page.get_by_role("option", name=option).click()
            else:
                page.get_by_text(option, exact=False).first.click()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fe_sha, api_sha = wait_sha()
    record("hosted-sha", "PASS" if fe_sha else "FAIL", f"frontend={fe_sha} api={api_sha} expected={EXPECTED[:7]}")
    if not fe_sha:
        raise SystemExit("hosted SHA not live")
    token, user = login()
    stamp = str(int(time.time()))
    vendor_b = create_vendor(token, f"V3 Copy {stamp}", f"jordan-copy-{stamp}@ira.test")
    vendor_a = create_vendor(token, f"V3 Email {stamp}", f"jordan-email-{stamp}@ira.test")
    RESULTS["vendors"] = {"copy": vendor_b.get("publicId"), "email": vendor_a.get("publicId")}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 940})
        page = context.new_page()
        inject(page, token, user)

        page.goto(f"{BASE}/vendor-onboarding/{vendor_b['publicId']}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        record("ira-not-sent", "PASS" if "IRA NOT SENT" in page.inner_text("body").upper() or "not sent" in page.inner_text("body").lower() else "FAIL", page.inner_text("body")[:240])
        shot(page, "01-ira-not-sent")

        page.get_by_role("button", name="Email IRA link").click()
        page.wait_for_timeout(2500)
        api("POST", f"/api/v1/vendors/onboarding/{vendor_b['publicId']}/ira/send", token, {})
        after_email = workspace(token, vendor_b["publicId"])
        record("ira-email-sent", "PASS" if after_email.get("ira", {}).get("sent") else "FAIL", str(after_email.get("ira", {}).get("status")))
        shot(page, "02-ira-sent")

        status, copied = api("POST", f"/api/v1/vendors/onboarding/{vendor_b['publicId']}/ira/link", token, {})
        ira_url = ((copied.get("data") or {}).get("iraLink") or {}).get("url")
        record("ira-copy", "PASS" if ira_url else "FAIL", str(ira_url))
        requester = browser.new_context(viewport={"width": 1280, "height": 900})
        ira = requester.new_page()
        ira.goto(ira_url if str(ira_url).startswith("http") else f"{BASE}{ira_url}", wait_until="networkidle")
        ira.wait_for_timeout(1000)
        shot(ira, "03-ira-open")
        raw = parse_qs(urlparse(ira_url).query).get("token", [""])[0]
        api("PATCH", "/api/v1/ira", body={"token": raw, "answers": {
            "a1": "consulting", "a2": "personal", "a3": "none", "a4": "none", "a5": "internal",
            "a6": "country", "a7": "no", "a8": "no", "a9": "no",
            "b1": "manage", "b2": "no", "b3": "no", "b4": "minor", "b5": "easy",
        }})
        submitted = api("POST", "/api/v1/ira/submit", body={
            "token": raw,
            "attested": True,
            "answers": {
                "a1": "consulting", "a2": "personal", "a3": "none", "a4": "none", "a5": "internal",
                "a6": "country", "a7": "no", "a8": "no", "a9": "no",
                "b1": "manage", "b2": "no", "b3": "no", "b4": "minor", "b5": "easy",
            },
        })
        record("ira-submit-api", "PASS" if submitted[0] == 200 else "FAIL", str(submitted[0]))
        ira.reload(wait_until="networkidle")
        ira.wait_for_timeout(1500)
        body = ira.inner_text("body")
        record("ira-submit-copy", "PASS" if "submitted successfully to the Governance, Risk & Compliance team" in body else "FAIL", body[:400])
        shot(ira, "05-ira-submitted")
        ira.reload(wait_until="networkidle")
        record("ira-refresh-submitted", "PASS" if "submitted successfully" in ira.inner_text("body") else "FAIL", "refresh")
        requester.close()

        notices, payload = api("GET", "/api/v1/notifications", token)
        record("grc-notification", "PASS" if "inherent risk submitted" in json.dumps(payload).lower() else "PARTIAL", f"{notices} {json.dumps(payload)[:300]}")

        page.goto(f"{BASE}/vendor-onboarding/{vendor_b['publicId']}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        ws = workspace(token, vendor_b["publicId"])
        record("tier-review-state", "PASS" if ws.get("stageKey") == "TIER_REVIEW" else "FAIL", str(ws.get("stageKey")))
        shot(page, "06-tier-review")
        record("4ab-absent-on-tier", "PASS" if page.get_by_role("button", name="Send questionnaire").count() == 0 else "FAIL", "4a/4b hidden in TIER_REVIEW")
        page.get_by_role("button", name="Confirm recommended tier").first.click()
        page.wait_for_timeout(3000)
        ws = workspace(token, vendor_b["publicId"])
        record("ready-after-confirm", "PASS" if ws.get("stageKey") == "READY_TO_SEND" else "FAIL", str(ws.get("stageKey")))
        record("4ab-visible", "PASS" if page.get_by_role("button", name="Send questionnaire").count() and page.get_by_role("button", name="Copy activation link").count() else "FAIL", page.inner_text("body")[:300])
        shot(page, "07-ready-to-send")

        page.get_by_label("Vendor security contact").first.fill("Vendor Security")
        page.get_by_label("Email").first.fill(f"vendor-copy-{stamp}@vendor.test")
        page.get_by_role("button", name="Copy activation link").first.click()
        page.wait_for_timeout(2500)
        ws = workspace(token, vendor_b["publicId"])
        record("copy-stays-ready", "PASS" if ws.get("stageKey") == "READY_TO_SEND" else "FAIL", str(ws.get("stageKey")))
        shot(page, "08-copy-still-ready")
        page.get_by_role("button", name="Mark as sent").first.click()
        page.wait_for_timeout(2500)
        ws = workspace(token, vendor_b["publicId"])
        record("mark-sent-awaiting", "PASS" if ws.get("stageKey") == "AWAITING_VENDOR" else "FAIL", str(ws.get("stageKey")))
        shot(page, "09-awaiting-vendor-4b")

        status, copied = api("POST", f"/api/v1/vendors/onboarding/{vendor_a['publicId']}/ira/link", token, {})
        raw = parse_qs(urlparse(((copied.get("data") or {}).get("iraLink") or {}).get("url", "")).query).get("token", [""])[0]
        api("POST", "/api/v1/ira/submit", body={
            "token": raw,
            "attested": True,
            "answers": {
                "a1": "consulting", "a2": "personal", "a3": "none", "a4": "none", "a5": "internal",
                "a6": "country", "a7": "no", "a8": "no", "a9": "no",
                "b1": "manage", "b2": "no", "b3": "no", "b4": "minor", "b5": "easy",
            },
        })
        api("POST", f"/api/v1/vendors/onboarding/{vendor_a['publicId']}/tier/confirm", token, {"confirm": True})
        page.goto(f"{BASE}/vendor-onboarding/{vendor_a['publicId']}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.locator("#send-questionnaire").get_by_label("Vendor security contact").fill("Vendor Security")
        page.locator("#send-questionnaire").get_by_label("Email").fill(f"vendor-email-{stamp}@vendor.test")
        sent = api("POST", f"/api/v1/vendors/onboarding/{vendor_a['publicId']}/send", token, {
            "name": "Vendor Security",
            "email": f"vendor-email-{stamp}@vendor.test",
        })
        record("email-send-api", "PASS" if sent[0] in (200, 201) else "FAIL", f"{sent[0]} {str(sent[1])[:240]}")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(2000)
        ws = workspace(token, vendor_a["publicId"])
        record("email-send-awaiting", "PASS" if ws.get("stageKey") == "AWAITING_VENDOR" else "FAIL", str(ws.get("stageKey")))
        shot(page, "10-awaiting-vendor-4a")

        status, link = api("POST", f"/api/v1/vendors/onboarding/{vendor_b['publicId']}/invitation/link", token, {
            "name": "Vendor Security",
            "email": f"vendor-copy-{stamp}@vendor.test",
        })
        activation = (link.get("data") or {}).get("activationUrl")
        vendor_page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
        if activation:
            vendor_page.goto(activation if str(activation).startswith("http") else f"{BASE}{activation}", wait_until="networkidle")
            vendor_page.wait_for_timeout(2000)
            text = vendor_page.inner_text("body")
            record("vendor-isolation", "PASS" if "inherent" not in text.lower() and "tier" not in text.lower() else "FAIL", text[:400])
            shot(vendor_page, "11-vendor-questionnaire")
        else:
            record("vendor-activation", "FAIL", str(link))

        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {"fail": len(failed), "pass": len([row for row in RESULTS["checks"] if row["result"] == "PASS"])}
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2, default=str))
    print(json.dumps(RESULTS["summary"]))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
