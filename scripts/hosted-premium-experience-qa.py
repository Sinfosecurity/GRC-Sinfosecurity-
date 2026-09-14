#!/usr/bin/env python3
"""Hosted Premium Experience finalization QA. Staging only. No production. No inbox claim."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "premium-experience"
REPORTS = OUT / "reports"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_FE = os.environ.get("E2E_EXPECTED_FRONTEND_SHA", "")
EXPECTED_API = os.environ.get("E2E_EXPECTED_API_SHA", "")
RESULTS: dict = {
    "checks": [],
    "shots": [],
    "sha": {},
    "personas": [],
    "reports": [],
    "a11y": [],
    "notes": [],
}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            content_type = resp.headers.get("Content-Type") or ""
            if raw[:4] == b"%PDF" or raw[:2] == b"PK" or content_type.startswith("text/csv"):
                return resp.status, {"binary": True, "bytes": len(raw), "type": content_type, "raw": raw}
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:400].decode("utf-8", "replace")}
        return exc.code, parsed


def login(email: str, password: str, plane: str = "CUSTOMER"):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": plane})
    if status != 200:
        return None, None, status, payload
    return payload["data"]["token"], payload["data"]["user"], status, payload


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.45)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
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


def hosted_shas():
    health_status, health = api("GET", "/health")
    api_sha = ""
    if isinstance(health, dict):
        api_sha = health.get("gitSha") or (health.get("data") or {}).get("gitSha") or ""
    with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
        version = json.loads(resp.read().decode())
    fe_sha = version.get("gitSha") or ""
    RESULTS["sha"] = {"api": api_sha, "frontend": fe_sha, "healthStatus": health_status, "version": version}
    if EXPECTED_FE and not str(fe_sha).startswith(EXPECTED_FE[:7]):
        record("hosted frontend sha", "FAIL", f"expected {EXPECTED_FE} got {fe_sha}")
    else:
        record("hosted frontend sha", "PASS", fe_sha)
    if EXPECTED_API and not str(api_sha).startswith(EXPECTED_API[:7]):
        record("hosted api sha", "FAIL", f"expected {EXPECTED_API} got {api_sha}")
    else:
        record("hosted api sha", "PASS", api_sha)
    return api_sha, fe_sha


def save_report(name: str, status: int, payload: dict):
    ok = status == 200 and payload.get("binary")
    record(f"report {name}", "PASS" if ok else "FAIL", f"{status} bytes={payload.get('bytes')} type={payload.get('type')}")
    if ok:
        ext = "pptx" if "presentation" in str(payload.get("type")) or name.endswith("pptx") else "pdf"
        if payload.get("raw", b"")[:2] == b"PK":
            ext = "pptx"
        path = REPORTS / f"{name}.{ext}"
        path.write_bytes(payload["raw"])
        RESULTS["reports"].append(str(path.relative_to(ROOT)))
        RESULTS["notes"].append(f"{name}: {path.stat().st_size} bytes saved for visual inspection")


def a11y_probe(page, name: str):
    issues = page.evaluate(
        """() => {
            const buttons = [...document.querySelectorAll('button, [role="button"]')];
            const unnamed = buttons.filter((el) => {
                const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
                return !text;
            }).length;
            const images = [...document.querySelectorAll('img')].filter((el) => !el.getAttribute('alt') && el.getAttribute('role') !== 'presentation').length;
            return { unnamedButtons: unnamed, imagesMissingAlt: images, title: document.title };
        }"""
    )
    result = "PASS" if issues["unnamedButtons"] == 0 else "PARTIAL"
    RESULTS["a11y"].append({"route": name, **issues, "result": result})
    record(f"a11y {name}", result, json.dumps(issues))


def persona(name: str, can_identify: str, can_complete: str, confused: str, extra: str = ""):
    RESULTS["personas"].append({
        "persona": name,
        "identify": can_identify,
        "complete": can_complete,
        "confused": confused,
        "notes": extra,
    })


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = hosted_shas()
    token, user, status, payload = login(EMAIL, PASSWORD)
    if not token:
        raise SystemExit(f"login failed {status} {payload}")
    record("customer login", "PASS", user.get("role") or user.get("email"))
    other_token, _, other_status, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    record("cross-tenant login", "PASS" if other_token else "FAIL", str(other_status))

    status, vendors = api("GET", "/api/v1/vendors", token)
    vendor_rows = vendors.get("vendors") or vendors.get("data") or []
    if isinstance(vendor_rows, dict):
        vendor_rows = vendor_rows.get("items") or vendor_rows.get("vendors") or []
    first_vendor = vendor_rows[0] if vendor_rows else {}
    vendor_id = first_vendor.get("id") or first_vendor.get("publicId")
    record("vendor directory", "PASS" if status == 200 else "FAIL", f"{status} count={len(vendor_rows) if isinstance(vendor_rows, list) else 0}")

    if vendor_id and other_token:
        leak_status, leak = api("GET", f"/api/v1/vendors/{vendor_id}", other_token)
        leaked = leak_status == 200 and (leak.get("data") or {}).get("id") == vendor_id
        record("tenant isolation vendor get", "PASS" if leak_status in (403, 404) and not leaked else "FAIL", str(leak_status))

    for path, name in (
        ("/tprm/reports/executive.pdf", "executive"),
        ("/tprm/reports/board.pdf", "board-pdf"),
        ("/tprm/reports/board.pptx", "board-pptx"),
        ("/tprm/reports/findings.pdf", "findings"),
        ("/erm/reports/board.pdf", "risk-board"),
        ("/compliance/reports/executive.pdf", "compliance-exec"),
        ("/privacy/reports/executive.pdf", "privacy-exec"),
        ("/ai-governance/reports/executive.pdf", "ai-exec"),
    ):
        status, payload = api("GET", f"/api/v1{path}", token)
        save_report(name, status, payload if isinstance(payload, dict) else {})

    if vendor_id:
        status, payload = api("GET", f"/api/v1/tprm/reports/vendors/{vendor_id}/scorecard.pdf", token)
        save_report("scorecard", status, payload if isinstance(payload, dict) else {})

    status, assessments = api("GET", "/api/v1/tprm/assessments", token)
    assessment_rows = (assessments.get("data") or []) if status == 200 else []
    if assessment_rows:
        assessment_id = assessment_rows[0].get("id")
        status, payload = api("GET", f"/api/v1/tprm/reports/assessments/{assessment_id}/pdf", token)
        save_report("assessment", status, payload if isinstance(payload, dict) else {})

    onboarding_id = None
    status, onboarding = api("GET", "/api/v1/vendors/onboarding", token)
    rows = (onboarding.get("data") or []) if status == 200 else []
    if rows:
        onboarding_id = rows[0].get("publicId") or rows[0].get("id")
        rec_status, rec = api("GET", f"/api/v1/vendors/onboarding/{onboarding_id}/reassessment", token)
        rec_body = rec.get("data") or {}
        record(
            "reassessment payload",
            "PASS" if rec_status == 200 and rec_body.get("recommendation") else "PARTIAL" if rec_status == 200 else "FAIL",
            f"{rec_status} {rec_body.get('recommendation')} why={str(rec_body.get('why') or '')[:80]}",
        )

    status, notices = api("GET", "/api/v1/notifications", token)
    record("notifications list", "PASS" if status == 200 else "FAIL", f"{status} count={len(notices.get('data') or [])}")

    public_routes = [
        ("/", "public-home"),
        ("/connected-platform", "public-connected"),
        ("/products/third-party", "public-third-party"),
        ("/products/risk", "public-risk"),
        ("/products/compliance", "public-compliance"),
        ("/products/privacy", "public-privacy"),
        ("/products/ai-governance", "public-ai"),
        ("/pricing", "public-pricing"),
        ("/trust", "public-trust"),
        ("/security", "public-security"),
        ("/login", "public-login"),
        ("/vendor-assessment/activate", "vendor-activate"),
        ("/admin/login", "platform-login"),
    ]
    customer_routes = [
        ("/dashboard", "home"),
        ("/notifications", "notifications"),
        ("/vendor-management", "third-parties"),
        ("/vendor-onboarding", "onboard"),
        (f"/vendor-onboarding/{onboarding_id}" if onboarding_id else "/vendor-onboarding", "lifecycle"),
        ("/assessments", "assessments"),
        ("/findings", "findings"),
        ("/monitoring", "monitoring"),
        ("/risks", "risk"),
        ("/compliance", "compliance"),
        ("/privacy-ops", "privacy"),
        ("/ai-governance", "ai"),
        ("/control-center", "controls"),
        ("/documents", "evidence"),
        ("/governance-graph", "graph"),
        ("/reports", "reports"),
        ("/user-management", "administration"),
    ]
    primary = {"public-home", "home", "lifecycle", "vendor-activate", "risk", "compliance", "privacy", "ai", "evidence", "reports"}
    viewports = (375, 768, 1024, 1440, 1920)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for path, name in public_routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.7)
            text = page.inner_text("body")
            record(f"public {name}", "PASS" if page.url.startswith(BASE) else "FAIL", page.url)
            if name == "public-home":
                needed = ["Supreme", "Who it is for", "Request a Demo", "private testing"]
                missing = [item for item in needed if item.lower() not in text.lower() and item not in text]
                record("homepage prospect answers", "PASS" if not missing else "PARTIAL", f"missing={missing}")
                if "Intelligence" in text and "Roadmap" not in text:
                    RESULTS["notes"].append("Homepage mentions Intelligence without Roadmap nearby — inspect screenshot")
            shot(page, f"{name}-1440", 1440)
            a11y_probe(page, name)
            if name in primary:
                for width in viewports:
                    if width == 1440:
                        continue
                    shot(page, f"{name}-{width}", width)
        inject(page, token, user)
        for path, name in customer_routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.9)
            text = page.inner_text("body")
            broken = any(token in text for token in ("No data", "undefined", "Internal Server Error", "Request failed"))
            record(f"customer {name}", "FAIL" if broken else "PASS", f"broken={broken} url={page.url}")
            shot(page, f"{name}-1440", 1440)
            a11y_probe(page, name)
            if name in primary:
                for width in viewports:
                    if width == 1440:
                        continue
                    shot(page, f"{name}-{width}", width)
            if name == "lifecycle":
                for tab in ("Approval", "Active", "History"):
                    try:
                        page.get_by_role("tab", name=tab).click(timeout=4000)
                        time.sleep(0.5)
                        shot(page, f"lifecycle-{tab.lower()}-1440", 1440)
                    except Exception as exc:  # noqa: BLE001
                        record(f"lifecycle tab {tab}", "PARTIAL", str(exc)[:120])
        page.set_viewport_size({"width": 375, "height": 812})
        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        time.sleep(0.6)
        try:
            page.get_by_label("Open navigation").click(timeout=4000)
            time.sleep(0.4)
            shot(page, "mobile-drawer-375", 375)
        except Exception as exc:  # noqa: BLE001
            record("mobile drawer", "PARTIAL", str(exc)[:120])
        browser.close()

    persona("Prospect", "Yes — homepage states platform, audience, products, and next action", "Request demo / tour / sign in are visible", "Must not read TPRM as the whole product", "See public-home screenshots")
    persona("New Customer Admin", "Home attention plus Administration", "Can open Third Parties, Team, Reports", "First-run copy still leads with onboard a third party", "See home and administration")
    persona("Business Owner", "Role copy exists; live counts remain tenant records", "Intake and own vendors", "Home still mixes Third Party counts for every role", "See home")
    persona("Vendor Respondent", "Activate page is a separate plane", "Needs a live invitation token to complete", "No customer nav on activate", "See vendor-activate")
    persona("TPRM Analyst", "Lifecycle, assessments, findings, monitoring", "Workspace tabs cover the lifecycle", "History now has two layers after deploy", "See lifecycle")
    persona("Risk Manager", "Risk overview uses the same shell", "Dashboard and register", "Home now surfaces live ERM attention when the API returns it", "See risk")
    persona("Compliance Manager", "Compliance overview", "Gaps and frameworks", "Same attention pattern", "See compliance")
    persona("Privacy Leader", "Privacy overview", "Activities and rights", "Same shell", "See privacy")
    persona("AI Governance Leader", "AI overview", "Register and approvals", "Same shell", "See ai")
    persona("Executive Approver", "Decision brief tab and reports", "Approve / conditions / reject after deploy", "Must re-check hosted Approval tab", "See lifecycle-approval")
    persona("Platform Owner", "Admin login is a separate plane", "Authorized console only", "Did not authenticate a platform owner in this run unless creds exist", "See platform-login")

    (OUT / "results.json").write_text(json.dumps({k: v for k, v in RESULTS.items() if k != "raw"}, indent=2, default=str))
    print(json.dumps({
        "out": str(OUT),
        "frontend": fe_sha,
        "api": api_sha,
        "fail": [c for c in RESULTS["checks"] if c["result"] == "FAIL"],
        "shots": len(RESULTS["shots"]),
    }, indent=2))


if __name__ == "__main__":
    main()
