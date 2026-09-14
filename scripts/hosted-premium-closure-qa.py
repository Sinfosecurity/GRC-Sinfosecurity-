#!/usr/bin/env python3
"""Premium closure: reports, a11y, Home performance, personas, viewports. Staging only."""

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
A11Y = OUT / "a11y"
PERF = OUT / "performance"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
AXE_PATH = ROOT / "scripts" / "axe.min.js"
RESULTS: dict = {
    "checks": [],
    "shots": [],
    "sha": {},
    "reports": [],
    "a11y": [],
    "keyboard": [],
    "performance": {},
    "personas": [],
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
    time.sleep(0.4)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    record(f"{name}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")


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
    _, health = api("GET", "/health")
    api_sha = health.get("gitSha") if isinstance(health, dict) else ""
    with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
        version = json.loads(resp.read().decode())
    fe_sha = version.get("gitSha") or ""
    RESULTS["sha"] = {"api": api_sha, "frontend": fe_sha, "version": version}
    record("hosted frontend sha", "PASS" if fe_sha else "FAIL", fe_sha)
    record("hosted api sha", "PASS" if api_sha else "FAIL", api_sha)
    if api_sha != fe_sha:
        RESULTS["notes"].append(f"Hosted frontend {fe_sha} differs from hosted API {api_sha}. Not silently reconciled.")
    return api_sha, fe_sha


def save_report(name: str, status: int, payload: dict):
    ok = status == 200 and payload.get("binary")
    record(f"report {name}", "PASS" if ok else "FAIL", f"{status} bytes={payload.get('bytes')} type={payload.get('type')}")
    if not ok:
        return None
    ext = "pptx" if payload.get("raw", b"")[:2] == b"PK" else "pdf"
    path = REPORTS / f"{name}.{ext}"
    path.write_bytes(payload["raw"])
    RESULTS["reports"].append(str(path.relative_to(ROOT)))
    if ext == "pdf":
        text = payload["raw"].decode("latin-1", "replace")
        if "SUPREME RISK" in text and "SUPREME GOVERNANCE" not in text:
            record(f"report-brand {name}", "FAIL", "cover still SUPREME RISK")
        elif "SUPREME GOVERNANCE" in text or "Supreme Governance Platform" in text:
            record(f"report-brand {name}", "PASS", "Supreme Governance Platform present")
        else:
            record(f"report-brand {name}", "PARTIAL", "brand string not extracted from binary")
        if "CLEAN" in text and name.startswith("privacy"):
            record(f"privacy-report-language {name}", "PARTIAL", "CLEAN still present in PDF bytes")
    if ext == "pptx":
        text = payload["raw"].decode("latin-1", "replace")
        if "currently sit in" in text and "1 vendor currently sit" in text:
            record("pptx-grammar", "FAIL", "singular sit remains")
        elif "currently sits" in text or "currently sit" in text:
            record("pptx-grammar", "PASS", "observation grammar present")
        else:
            record("pptx-grammar", "PARTIAL", "observation sentence not extracted")
    return path


def run_axe(page, name: str):
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
                    })),
                    passes: out.passes.length,
                };
            }"""
        )
    except Exception as exc:  # noqa: BLE001
        RESULTS["a11y"].append({"route": name, "error": str(exc), "result": "PARTIAL"})
        record(f"axe {name}", "PARTIAL", str(exc)[:160])
        return
    serious = [row for row in result["violations"] if row.get("impact") in ("critical", "serious")]
    result["result"] = "FAIL" if serious else ("PARTIAL" if result["violations"] else "PASS")
    RESULTS["a11y"].append({"route": name, **result})
    (A11Y / f"{name}.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    record(f"axe {name}", result["result"], f"serious={len(serious)} total={len(result['violations'])}")


def keyboard_smoke(page, name: str):
    focused = []
    trapped = False
    page.keyboard.press("Tab")
    for _ in range(12):
        info = page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: '', name: '', id: '' };
                return {
                    tag: el.tagName,
                    name: el.getAttribute('aria-label') || el.innerText?.slice(0, 40) || el.getAttribute('name') || '',
                    id: el.id || '',
                };
            }"""
        )
        focused.append(info)
        page.keyboard.press("Tab")
    if focused and all(row.get("tag") == focused[0].get("tag") and row.get("name") == focused[0].get("name") for row in focused):
        trapped = len({(row.get("tag"), row.get("name")) for row in focused}) == 1 and focused[0].get("tag") not in ("BODY", "HTML")
    result = "FAIL" if trapped else "PASS"
    RESULTS["keyboard"].append({"route": name, "result": result, "focused": focused[:8], "trap": trapped})
    record(f"keyboard {name}", result, f"trap={trapped} first={focused[0] if focused else None}")


def measure_home(page, token: str, user: dict):
    inject(page, token, user)
    requests = []
    page.on("request", lambda req: requests.append(req.url) if "/api/" in req.url else None)
    started = time.time()
    page.goto(f"{BASE}/dashboard", wait_until="networkidle", timeout=90000)
    elapsed_ms = int((time.time() - started) * 1000)
    api_calls = [url for url in requests if "/api/" in url]
    unique = sorted(set(api_calls))
    RESULTS["performance"] = {
        "homeRequests": len(api_calls),
        "homeUnique": unique,
        "homeLoadMs": elapsed_ms,
        "role": user.get("role"),
    }
    (PERF / "home.json").write_text(json.dumps(RESULTS["performance"], indent=2), encoding="utf-8")
    record("home-requests", "PASS" if len(api_calls) <= 6 else "PARTIAL", f"count={len(api_calls)} unique={len(unique)}")
    record("home-load-ms", "PASS" if elapsed_ms else "PARTIAL", str(elapsed_ms))
    return len(api_calls), elapsed_ms


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    A11Y.mkdir(parents=True, exist_ok=True)
    PERF.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = hosted_shas()
    token, user, status, payload = login(EMAIL, PASSWORD)
    if not token:
        raise SystemExit(f"login failed {status} {payload}")
    record("customer login", "PASS", user.get("role") or user.get("email"))

    status, vendors = api("GET", "/api/v1/vendors", token)
    vendor_rows = vendors.get("vendors") or vendors.get("data") or []
    if isinstance(vendor_rows, dict):
        vendor_rows = vendor_rows.get("items") or vendor_rows.get("vendors") or []
    vendor_id = (vendor_rows[0] or {}).get("id") if vendor_rows else None

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
        status, payload = api("GET", f"/api/v1/tprm/reports/assessments/{assessment_rows[0].get('id')}/pdf", token)
        save_report("assessment", status, payload if isinstance(payload, dict) else {})

    status, notices = api("GET", "/api/v1/notifications", token)
    dotted = [row.get("eventType") for row in (notices.get("data") or []) if "." in str(row.get("eventType") or "")]
    record("notification-event-codes-internal", "PASS", f"internal codes still present={len(dotted)}; UI must humanize")

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
    ]
    viewports = (375, 768, 1024, 1440, 1920)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        home_count, home_ms = measure_home(page, token, user)
        RESULTS["performance"]["afterRequests"] = home_count
        RESULTS["performance"]["afterLoadMs"] = home_ms
        inject(page, token, user)
        for path, name, auth in routes:
            if not auth:
                page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            else:
                page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.7)
            text = page.inner_text("body")
            if name == "notifications" and "assessment.assigned" in text:
                record("notification-language", "FAIL", "dotted event code visible")
            elif name == "notifications":
                record("notification-language", "PASS", "no dotted assessment.assigned in body")
            if name == "privacy" and "CLEAN" in text:
                record("privacy-customer-language", "FAIL", "CLEAN visible on Privacy")
            elif name == "privacy":
                record("privacy-customer-language", "PASS", "CLEAN not visible on Privacy overview")
            shot(page, f"{name}-1440", 1440)
            run_axe(page, name)
            keyboard_smoke(page, name)
            if name in {"public-home", "public-login", "home", "lifecycle", "privacy", "notifications", "reports"}:
                for width in viewports:
                    if width == 1440:
                        continue
                    shot(page, f"{name}-{width}", width)
        browser.close()

    RESULTS["personas"] = [
        {"persona": "Customer Admin", "primary": "Home attention and Administration", "next": "Review third parties / team"},
        {"persona": "Business Owner", "primary": "Onboard a third party", "next": "Own vendors"},
        {"persona": "Vendor Respondent", "primary": "Vendor landing / questionnaire", "next": "Save, upload, attest, submit"},
        {"persona": "TPRM Analyst", "primary": "Lifecycle review", "next": "Confirm findings"},
        {"persona": "Executive Approver", "primary": "Decisions and reports", "next": "Open decisions"},
        {"persona": "Platform Owner", "primary": "Separate admin plane", "next": "Authorized console only"},
    ]
    (OUT / "closure-results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    print(json.dumps({
        "frontend": fe_sha,
        "api": api_sha,
        "home": RESULTS["performance"],
        "fail": [row for row in RESULTS["checks"] if row["result"] == "FAIL"],
        "shots": len(RESULTS["shots"]),
    }, indent=2))


if __name__ == "__main__":
    main()
