#!/usr/bin/env python3
"""Hosted #12 Reports assessment-selector walkthrough on Elite Claims."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "reports-assessment-selector"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
VENDOR_ID = "2afc74ad-a4e0-4a34-a2c4-40e88af5d376"
ORG_ID = "05d7821b-cab1-44af-9f5c-1f528a2d0a0e"
RESULTS: dict = {"checks": [], "shots": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 90):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if raw[:4] == b"%PDF":
                return resp.status, {"pdf": True, "bytes": len(raw), "content": raw, "type": resp.headers.get("Content-Type")}
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


def shot(page, name: str):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
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
    token, user = login(EMAIL, PASSWORD)
    org = (user.get("organization") or {}).get("id") or user.get("organizationId")
    record("login-tenant", "PASS" if org == ORG_ID else "FAIL", f"{user.get('email')} org={org}")

    status, assessments = api("GET", "/api/v1/tprm/assessments", token)
    rows = (assessments.get("data") or []) if status == 200 else []
    vendor_rows = [row for row in rows if (row.get("vendorId") or (row.get("vendor") or {}).get("id")) == VENDOR_ID]
    visible = [row for row in vendor_rows if row.get("status") != "CANCELLED"]
    raw_enum = any(row.get("assessmentType") == "INITIAL_DUE_DILIGENCE" for row in visible)
    names = sorted({row.get("templateName") or "" for row in visible})
    record("api-assessments", "PASS" if status == 200 and visible else "FAIL", f"http={status} visible={len(visible)}")
    record("template-labels", "PASS" if all(row.get("templateName") for row in visible) else "FAIL", ", ".join(n for n in names if n)[:240])
    uuidish = any(__import__("re").fullmatch(r"[0-9a-fA-F-]{36}", str(row.get("templateName") or "")) for row in visible)
    record("no-uuid-labels", "FAIL" if uuidish else "PASS", "template names are not UUIDs")

    completed = next((row for row in visible if row.get("status") == "COMPLETED"), None)
    if completed:
        pdf_status, pdf = api("GET", f"/api/v1/tprm/reports/assessments/{completed['id']}/pdf", token)
        record("assessment-report-api", "PASS" if pdf_status == 200 and pdf.get("pdf") else "FAIL", f"http={pdf_status} bytes={pdf.get('bytes')}")
        if pdf.get("content"):
            (OUT / "assessment-report.pdf").write_bytes(pdf["content"])
    else:
        record("assessment-report-api", "FAIL", "no completed assessment")

    exec_status, exec_pdf = api("GET", "/api/v1/tprm/reports/executive.pdf", token)
    record("executive-report-api", "PASS" if exec_status == 200 and exec_pdf.get("pdf") else "FAIL", f"http={exec_status} bytes={exec_pdf.get('bytes')}")
    if exec_pdf.get("content"):
        (OUT / "executive-report.pdf").write_bytes(exec_pdf["content"])

    score_status, score_pdf = api("GET", f"/api/v1/tprm/reports/vendors/{VENDOR_ID}/scorecard.pdf", token)
    record("vendor-scorecard-api", "PASS" if score_status == 200 and score_pdf.get("pdf") else "FAIL", f"http={score_status} bytes={score_pdf.get('bytes')}")
    if score_pdf.get("content"):
        (OUT / "vendor-scorecard.pdf").write_bytes(score_pdf["content"])

    other_token, other_user = login(OTHER_EMAIL, OTHER_PASSWORD)
    other_org = (other_user.get("organization") or {}).get("id") or other_user.get("organizationId")
    leak_status, leak = api("GET", f"/api/v1/tprm/vendors/{VENDOR_ID}/assessments", other_token)
    leak_text = json.dumps(leak)
    leaked = ORG_ID in leak_text or any(row.get("id") == (completed or {}).get("id") for row in (leak.get("data") or []) if isinstance(row, dict))
    empty_ok = leak_status == 200 and leak.get("data") == []
    denied_ok = leak_status in (403, 404)
    record("cross-tenant", "PASS" if other_org != ORG_ID and (empty_ok or denied_ok) and not leaked else "FAIL", f"other_org={other_org} http={leak_status} leaked={leaked}")

    if visible:
        open_row = next((row for row in visible if row.get("status") in ("IN_PROGRESS", "NOT_STARTED")), None)
        if open_row:
            dup_status, dup = api(
                "POST",
                f"/api/v1/tprm/vendors/{VENDOR_ID}/assessments",
                token,
                {"assessmentType": "INITIAL_DUE_DILIGENCE", "templateId": open_row.get("templateId")},
            )
            record("duplicate-protection", "PASS" if dup_status == 409 else "FAIL", f"http={dup_status} {json.dumps(dup)[:180]}")
        else:
            record("duplicate-protection", "FAIL", "no open assessment to probe")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        inject(page, token, user)
        page.goto(f"{BASE}/reports", wait_until="networkidle")
        page.get_by_label("Vendor scope").click()
        page.get_by_role("option", name="Supreme Investigation").click()
        page.get_by_test_id("current-assessment").wait_for()
        time.sleep(0.6)
        body = page.inner_text("body")
        shot(page, "selector-1440")
        record("raw-enum-ui", "PASS" if "INITIAL_DUE_DILIGENCE" not in body else "FAIL", "no raw enum on Reports")
        record("current-ui", "PASS" if "Current assessment" in body and "Initial Due Diligence" in body else "FAIL", "current card visible")
        record("history-ui", "PASS" if "Show other assessments" in body else "FAIL", "history is available without dominating")
        record("no-flat-dropdown", "PASS" if page.locator('[aria-label="Assessment"]').count() == 0 else "FAIL", "no Assessment combobox")
        record("caption", "PASS" if "Assessment report will use" in body else "FAIL", "intended assessment caption")
        page.get_by_role("button", name="Show other assessments").click()
        unique_history = page.locator('[data-testid="history-assessment"]').count()
        record("history-count", "PASS" if unique_history >= 1 else "FAIL", f"{unique_history} historical cards")
        shot(page, "selector-history-expanded-1440")

        page.get_by_role("button", name="Generate PDF").nth(0).click()
        page.get_by_text("Downloaded").first.wait_for(timeout=60000)
        record("executive-ui", "PASS", page.get_by_text("Downloaded").first.inner_text())

        page.get_by_role("button", name="Generate PDF").nth(1).click()
        page.get_by_text("Downloaded").first.wait_for(timeout=60000)
        record("scorecard-ui", "PASS", page.get_by_text("Downloaded").first.inner_text())

        page.get_by_role("button", name="Generate PDF").nth(2).click()
        page.get_by_text("Downloaded").first.wait_for(timeout=60000)
        record("assessment-ui", "PASS", page.get_by_text("Downloaded").first.inner_text())
        shot(page, "reports-after-generate-1440")
        browser.close()

    RESULTS["frontendSha"] = "479d904bfe6a47b6d0fab712c83ba8f3c4e8138b"
    RESULTS["visibleAssessments"] = [
        {
            "assessmentId": row.get("id"),
            "assessmentType": row.get("assessmentType"),
            "status": row.get("status"),
            "templateName": row.get("templateName"),
            "templateVersion": row.get("templateVersion"),
            "createdAt": row.get("createdAt"),
            "completedAt": row.get("completedAt"),
        }
        for row in visible
    ]
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    failed = [check for check in RESULTS["checks"] if check["result"] != "PASS"]
    print(f"FAILED {len(failed)}")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
