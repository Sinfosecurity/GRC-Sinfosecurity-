#!/usr/bin/env python3
"""Hosted #17 Supreme Privacy walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-privacy"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_SHA = os.environ.get("E2E_EXPECTED_SHA", "")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "chain": {}, "discrepancies": []}


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
                return resp.status, {"binary": True, "bytes": len(raw), "type": content_type, "content": raw}
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
    time.sleep(0.5)
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


def sha_match(actual: str, expected: str) -> bool:
    if not actual or not expected:
        return False
    return expected.startswith(str(actual)) or str(actual).startswith(expected[:7])


def wait_hosted_sha():
    deadline = time.time() + 25 * 60
    last = {}
    while time.time() < deadline:
        try:
            health_status, health = api("GET", "/health")
            api_sha = ""
            if isinstance(health, dict):
                api_sha = health.get("gitSha") or (health.get("data") or {}).get("gitSha") or ""
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                version = json.loads(resp.read().decode())
            fe_sha = version.get("gitSha") or ""
            last = {"api": api_sha, "frontend": fe_sha, "healthStatus": health_status, "health": health}
            RESULTS["sha"] = last
            print(f"hosted sha api={api_sha} fe={fe_sha}")
            if not EXPECTED_SHA or (sha_match(str(api_sha), EXPECTED_SHA) and sha_match(str(fe_sha), EXPECTED_SHA)):
                return api_sha, fe_sha
            if api_sha and fe_sha and str(api_sha)[:7] != str(fe_sha)[:7]:
                RESULTS["discrepancies"] = [
                    f"Frontend SHA {fe_sha} does not match API SHA {api_sha}. Not silently reconciled."
                ]
        except Exception as exc:
            print(f"waiting for hosted sha: {exc}")
        time.sleep(20)
    RESULTS["sha"] = last
    RESULTS["discrepancies"].append(f"Timed out waiting for {EXPECTED_SHA}: {last}")
    return last.get("api", ""), last.get("frontend", "")


def save_binary(name: str, payload: dict):
    content = payload.get("content")
    if not content:
        return
    path = OUT / name
    path.write_bytes(content)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))


def seed(token: str):
    status, dash = api("GET", "/api/v1/privacy/dashboard", token)
    record("dashboard", "PASS" if status == 200 else "FAIL", str(status))
    honesty = (dash.get("data") or {}).get("honesty") or ""
    record("honesty", "PASS" if "not a finding that processing is lawful" in honesty.lower() else "FAIL", honesty[:180])
    status, created = api("POST", "/api/v1/privacy/activities", token, {
        "name": "Claims servicing",
        "businessProcess": "Claims",
        "jurisdictions": ["US-NY", "IE"],
        "sourceOfData": "Policyholders",
        "status": "ACTIVE",
        "riskLevel": "High",
    })
    activity = (created.get("data") or {}).get("publicId")
    record("create activity", "PASS" if status == 201 and str(activity).startswith("PA-") else "FAIL", f"{status} {activity}")
    if activity:
        api("POST", f"/api/v1/privacy/activities/{activity}/purposes", token, {"name": "Service delivery"})
        api("POST", f"/api/v1/privacy/activities/{activity}/basis", token, {
            "purposeName": "Service delivery",
            "basisType": "CONTRACT",
            "rationale": "Needed to service claims",
            "regime": "GDPR",
        })
        api("POST", f"/api/v1/privacy/activities/{activity}/data", token, {"kind": "FINANCIAL", "label": "Financial"})
        api("POST", f"/api/v1/privacy/activities/{activity}/subjects", token, {"kind": "CUSTOMERS"})
        api("POST", f"/api/v1/privacy/activities/{activity}/parties", token, {"partyType": "SYSTEM", "systemName": "Claims platform"})
        status, vendors = api("GET", "/api/v1/vendors", token)
        vendor_id = None
        vendor_rows = vendors.get("data") if isinstance(vendors.get("data"), list) else (vendors.get("data") or {}).get("items") or []
        if status == 200 and vendor_rows:
            vendor_id = vendor_rows[0].get("id")
            api("POST", f"/api/v1/privacy/activities/{activity}/parties", token, {
                "partyType": "VENDOR",
                "vendorId": vendor_id,
                "recipientName": vendor_rows[0].get("name"),
                "privacyRole": "PROCESSOR",
            })
        status, transfer = api("POST", "/api/v1/privacy/transfers", token, {
            "activityPublicId": activity,
            "sourceJurisdiction": "US-NY",
            "destinationJurisdiction": "IE",
            "mechanism": "SCC",
            "vendorId": vendor_id,
        })
        transfer_id = (transfer.get("data") or {}).get("publicId")
        record("transfer", "PASS" if status == 201 and str(transfer_id).startswith("XFR-") else "FAIL", f"{status} {transfer_id}")
        if transfer_id:
            api("POST", f"/api/v1/privacy/transfers/{transfer_id}/assessments", token, {"decision": "Assessment recorded. This is not a lawfulness finding."})
        status, dpia = api("POST", "/api/v1/privacy/dpias", token, {
            "activityPublicId": activity,
            "title": "Claims privacy review",
            "screening": [{"key": "sensitive_data", "answer": True}, {"key": "cross_border", "answer": True}],
        })
        record("dpia screening", "PASS" if status == 201 and "legally required" not in json.dumps(dpia).lower() else "FAIL", str((dpia.get("data") or {}).get("advice")))
        status, rights = api("POST", "/api/v1/privacy/rights", token, {
            "activityPublicId": activity,
            "requestType": "ACCESS",
            "regime": "GDPR",
            "requesterRef": "hosted.requester@example.com",
        })
        record("rights", "PASS" if status == 201 and str((rights.get("data") or {}).get("publicId")).startswith("DSR-") else "FAIL", str((rights.get("data") or {}).get("publicId")))
        api("POST", "/api/v1/privacy/retention", token, {"activityPublicId": activity, "period": "7 years after claim close"})
        status, map_payload = api("GET", "/api/v1/privacy/data-map?dataKind=FINANCIAL", token)
        record("data map financial", "PASS" if status == 200 and (map_payload.get("data") or {}).get("rows") else "PARTIAL", f"{status} rows={len((map_payload.get("data") or {}).get("rows") or [])}")
        RESULTS["workflow"] = {
            "activity": activity,
            "transfer": transfer_id,
            "dpia": (dpia.get("data") or {}).get("publicId"),
            "rights": (rights.get("data") or {}).get("publicId"),
            "vendorId": vendor_id,
        }
        status, affected = api("GET", f"/api/v1/privacy/affected?kind=activity&id={activity}", token)
        RESULTS["chain"] = affected.get("data") or {}
        record("what is affected", "PASS" if status == 200 else "FAIL", json.dumps(RESULTS["chain"])[:300])
    for kind in ["ropa", "executive", "board"]:
        status, payload = api("GET", f"/api/v1/privacy/reports/{kind}.pdf", token)
        record(f"report {kind}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if payload.get("content"):
            save_binary(f"Supreme-Privacy-{kind}.pdf", payload)
    status, pptx = api("GET", "/api/v1/privacy/reports/board.pptx", token)
    record("board pptx", "PASS" if status == 200 and pptx.get("binary") else "FAIL", str(status))
    if pptx.get("content"):
        save_binary("Supreme-Privacy-Board.pptx", pptx)
    return RESULTS["workflow"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = wait_hosted_sha()
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    seed(token)
    activity = RESULTS["workflow"].get("activity")
    if activity:
        leaked, _ = api("GET", f"/api/v1/privacy/activities/{activity}", other_token)
        record("cross-tenant activity", "PASS" if leaked in (403, 404) else "FAIL", str(leaked))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        inject(page, token, user)
        pages = [
            ("dashboard", "/privacy-ops"),
            ("activities", "/privacy-ops/activities"),
            ("data-map", "/privacy-ops/data-map"),
            ("transfers", "/privacy-ops/transfers"),
            ("dpias", "/privacy-ops/dpias"),
            ("rights", "/privacy-ops/rights"),
            ("retention", "/privacy-ops/retention"),
        ]
        if activity:
            pages.append(("activity-detail", f"/privacy-ops/activities/{activity}"))
        for name, path in pages:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            for width in (375, 768, 1024, 1440, 1920):
                shot(page, f"{name}-{width}", width)
            overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            record(f"overflow {name}", "FAIL" if overflow else "PASS", path)
        for path, label in [("/compliance", "compliance"), ("/risks", "risk"), ("/governance-graph", "graph"), ("/control-center", "controls")]:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            shot(page, f"regression-{label}-1440", 1440)
        browser.close()
    RESULTS["hostedFrontendSha"] = fe_sha
    RESULTS["hostedApiSha"] = api_sha
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps({"sha": RESULTS["sha"], "workflow": RESULTS["workflow"], "chain": RESULTS["chain"]}, indent=2))


if __name__ == "__main__":
    main()
