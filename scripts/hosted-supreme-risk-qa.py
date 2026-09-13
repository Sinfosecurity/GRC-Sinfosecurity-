#!/usr/bin/env python3
"""Hosted #15 Supreme Risk walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-risk"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_SHA = os.environ.get("E2E_EXPECTED_SHA", "14ec99b4225f176c54efbc9acd2a7701f612aa3b")
VENDOR_ID = "2afc74ad-a4e0-4a34-a2c4-40e88af5d376"
RESULTS: dict = {"checks": [], "shots": [], "sha": {}}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 90):
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
                return resp.status, {"binary": True, "bytes": len(raw), "type": content_type}
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


def wait_hosted_sha():
    deadline = time.time() + 20 * 60
    while time.time() < deadline:
        try:
            health_status, health = api("GET", "/health")
            api_sha = (health.get("gitSha") or health.get("data", {}).get("gitSha") or "") if isinstance(health, dict) else ""
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                version = json.loads(resp.read().decode())
            fe_sha = version.get("gitSha") or ""
            RESULTS["sha"] = {"api": api_sha, "frontend": fe_sha, "healthStatus": health_status}
            print(f"hosted sha api={api_sha} fe={fe_sha}")
            if EXPECTED_SHA.startswith(str(api_sha)) or str(api_sha).startswith(EXPECTED_SHA[:7]):
                if EXPECTED_SHA.startswith(str(fe_sha)) or str(fe_sha).startswith(EXPECTED_SHA[:7]):
                    return api_sha, fe_sha
        except Exception as exc:
            print(f"waiting for hosted sha: {exc}")
        time.sleep(20)
    raise SystemExit(f"hosted SHA did not reach {EXPECTED_SHA}: {RESULTS['sha']}")


def seed(token: str):
    created = []
    samples = [
        {"title": "Privileged access failure", "statement": "Because of a failed privileged-access control test, there is a risk that administrator credentials are abused, resulting in unauthorized data exposure.", "category": "CYBERSECURITY", "likelihood": 5, "impact": 5},
        {"title": "Vendor concentration", "statement": "Because of dependence on one claims processor, there is a risk that a vendor outage stops operations, resulting in delayed customer service.", "category": "THIRD_PARTY", "likelihood": 4, "impact": 4},
        {"title": "Model output error", "category": "AI", "likelihood": 3, "impact": 4},
        {"title": "Records retention gap", "category": "COMPLIANCE", "likelihood": 2, "impact": 3},
    ]
    for row in samples:
        status, payload = api("POST", "/api/v1/erm/risks", token, row)
        record(f"create {row['title']}", "PASS" if status == 201 else "FAIL", f"{status} {payload.get('data', {}).get('publicId', payload)}")
        if status == 201:
            created.append(payload["data"])
    if not created:
        return created
    first = created[0]["publicId"]
    status, payload = api("POST", "/api/v1/erm/appetite", token, {"scope": "ORGANIZATION", "maxResidualRating": "MEDIUM", "statement": "Critical residual risk requires a decision."})
    record("set appetite", "PASS" if status == 201 else "FAIL", str(status))
    status, payload = api("POST", f"/api/v1/erm/risks/{first}/treatments", token, {"strategy": "MITIGATE", "notes": "Restore privileged access testing. A plan does not lower residual risk."})
    record("treatment", "PASS" if status == 201 else "FAIL", str(status))
    status, payload = api("POST", f"/api/v1/erm/risks/{first}/kris", token, {"name": "Failed privileged access reviews", "direction": "HIGHER_IS_WORSE", "warningThreshold": 1, "criticalThreshold": 3})
    record("kri create", "PASS" if status == 201 else "FAIL", str(status))
    kri_id = payload.get("data", {}).get("publicId") if status == 201 else None
    if kri_id:
        status, _ = api("POST", f"/api/v1/erm/kris/{kri_id}/measurements", token, {"value": 4})
        record("kri measure", "PASS" if status == 201 else "FAIL", str(status))
    before = created[0].get("residualScore")
    status, payload = api("POST", f"/api/v1/erm/risks/{first}/decisions", token, {"decision": "ACCEPT", "rationale": "Accepted for 30 days while treatment proceeds.", "approve": True})
    residual = payload.get("data", {}).get("residualScore")
    unchanged = payload.get("data", {}).get("residualUnchanged")
    record("acceptance residual unchanged", "PASS" if status == 201 and unchanged and residual == before else "PARTIAL" if status == 201 else "FAIL", f"{status} before={before} after={residual} unchanged={unchanged}")
    status, payload = api("POST", f"/api/v1/erm/risks/{first}/relationships", token, {"targetType": "VENDOR", "targetId": VENDOR_ID})
    record("vendor relationship", "PASS" if status == 201 else "FAIL", str(status))
    status, controls = api("GET", "/api/v1/scc/controls", token)
    control_id = None
    if status == 200:
        rows = controls.get("data") or []
        control_id = rows[0]["id"] if rows else None
    if control_id:
        status, _ = api("POST", f"/api/v1/erm/risks/{first}/controls", token, {"controlId": control_id, "rationale": "Expected to reduce privileged access abuse."})
        record("control link", "PASS" if status == 201 else "FAIL", str(status))
        status, impact = api("GET", f"/api/v1/erm/impact/controls/{control_id}", token)
        recs = impact.get("data", {}).get("recommendedActions") or []
        record("control failure impact", "PASS" if status == 200 and recs else "FAIL", f"{status} actions={len(recs)}")
    else:
        record("control link", "PARTIAL", "No organization controls available to link")
    return created


def isolation(token_a: str, bait: str):
    status, payload = api("GET", f"/api/v1/erm/risks/{bait}", token_a)
    record("cross-tenant risk get", "PASS" if status in (403, 404) else "FAIL", str(status))
    status, payload = api("GET", "/api/v1/erm/risks", token_a)
    leaked = bait in json.dumps(payload)
    record("cross-tenant risk list", "PASS" if status == 200 and not leaked else "FAIL", f"{status} leaked={leaked}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = wait_hosted_sha()
    record("hosted sha", "PASS", f"api={api_sha} frontend={fe_sha}")
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    created = seed(token)
    isolation(other_token, created[0]["publicId"] if created else "RISK-99999")
    status, dashboard = api("GET", "/api/v1/erm/dashboard", token)
    honesty = (dashboard.get("data") or {}).get("honesty", "")
    record("dashboard honesty", "PASS" if "not summed" in honesty.lower() else "FAIL", honesty[:160])
    for kind in ("profile", "top-risks", "appetite", "treatment", "board"):
        status, payload = api("GET", f"/api/v1/erm/reports/{kind}.pdf", token)
        record(f"report {kind}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
    status, payload = api("GET", "/api/v1/erm/export/csv", token)
    record("export csv", "PASS" if status == 200 else "FAIL", str(status))
    status, payload = api("POST", "/api/v1/erm/import/preview", token, {"rows": [{"title": "=CMD()", "category": "CYBERSECURITY", "likelihood": "3", "impact": "3"}]})
    title = (((payload.get("data") or {}).get("rows") or [{}])[0].get("title") or "")
    record("import neutralize", "PASS" if status == 200 and title.startswith("'") else "FAIL", title[:40])

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        inject(page, token, user)
        for path, name in (
            ("/risks", "dashboard"),
            ("/risks/register", "register"),
            (f"/risks/{created[0]['publicId']}" if created else "/risks/register", "detail"),
            ("/reports", "reports"),
            ("/control-center", "controls-regression"),
            ("/governance-graph", "graph-regression"),
            ("/reports", "reports-regression"),
        ):
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            time.sleep(0.8)
            overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            record(f"overflow {name}", "PASS" if not overflow else "FAIL", f"scrollWidth overflow={overflow}")
            for width in (375, 768, 1024, 1440, 1920):
                shot(page, f"{name}-{width}", width)
        if created:
            page.goto(f"{BASE}/risks/{created[0]['publicId']}", wait_until="networkidle")
            for label in ("Scoring", "Controls", "Treatment", "KRIs", "Decisions", "Relationships", "History"):
                page.get_by_role("main").get_by_role("button", name=label, exact=True).click()
                time.sleep(0.4)
                shot(page, f"detail-{label.lower()}-1440", 1440)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps({"out": str(OUT), "fail": [c for c in RESULTS["checks"] if c["result"] == "FAIL"]}, indent=2))


if __name__ == "__main__":
    main()
