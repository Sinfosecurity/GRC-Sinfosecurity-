#!/usr/bin/env python3
"""Hosted #17 Supreme Privacy walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
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
        vendor_name = None
        vendor_rows = (
            vendors.get("vendors")
            or (vendors.get("data") if isinstance(vendors.get("data"), list) else None)
            or (vendors.get("data") or {}).get("vendors")
            or (vendors.get("data") or {}).get("items")
            or []
        )
        if status == 200 and vendor_rows:
            vendor_id = vendor_rows[0].get("id")
            vendor_name = vendor_rows[0].get("name")
            api("POST", f"/api/v1/privacy/activities/{activity}/parties", token, {
                "partyType": "VENDOR",
                "vendorId": vendor_id,
                "recipientName": vendor_name,
                "privacyRole": "PROCESSOR",
            })
            record("vendor link", "PASS" if vendor_id else "FAIL", f"{vendor_name} {vendor_id}")
        else:
            record("vendor link", "FAIL", f"{status} no Third Party vendor found")
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
        advice = str((dpia.get("data") or {}).get("advice") or "")
        record(
            "dpia screening",
            "PASS" if status == 201 and "not a statement that a dpia is legally required" in advice.lower() else "FAIL",
            advice,
        )
        status, rights = api("POST", "/api/v1/privacy/rights", token, {
            "activityPublicId": activity,
            "requestType": "ACCESS",
            "regime": "GDPR",
            "requesterRef": "hosted.requester@example.com",
        })
        record("rights", "PASS" if status == 201 and str((rights.get("data") or {}).get("publicId")).startswith("DSR-") else "FAIL", str((rights.get("data") or {}).get("publicId")))
        api("POST", "/api/v1/privacy/retention", token, {"activityPublicId": activity, "period": "7 years after claim close"})
        _, controls = api("GET", "/api/v1/scc/controls", token)
        control_rows = (controls.get("data") if isinstance(controls.get("data"), list) else None) or []
        tpr = next((row for row in control_rows if str(row.get("controlKey") or "").upper() == "TPR-01"), control_rows[0] if control_rows else None)
        if tpr:
            api("POST", f"/api/v1/privacy/activities/{activity}/links", token, {"targetType": "CONTROL", "targetId": tpr.get("controlKey") or tpr.get("id")})
        _, risks = api("GET", "/api/v1/erm/risks", token)
        risk_rows = (risks.get("data") if isinstance(risks.get("data"), list) else None) or []
        if risk_rows:
            api("POST", f"/api/v1/privacy/activities/{activity}/links", token, {"targetType": "RISK", "targetId": risk_rows[0].get("publicId") or risk_rows[0].get("id")})
        _, requirements = api("GET", "/api/v1/compliance/requirements", token)
        requirement_rows = (requirements.get("data") if isinstance(requirements.get("data"), list) else None) or []
        if requirement_rows:
            api("POST", f"/api/v1/privacy/activities/{activity}/links", token, {"targetType": "REQUIREMENT", "targetId": requirement_rows[0].get("publicId") or requirement_rows[0].get("id")})
        status, map_payload = api("GET", "/api/v1/privacy/data-map?dataKind=FINANCIAL", token)
        map_rows = ((map_payload.get("data") or {}).get("rows") or [])
        record("data map financial", "PASS" if status == 200 and map_rows else "PARTIAL", f"{status} rows={len(map_rows)}")
        RESULTS["workflow"] = {
            "activity": activity,
            "transfer": transfer_id,
            "dpia": (dpia.get("data") or {}).get("publicId"),
            "rights": (rights.get("data") or {}).get("publicId"),
            "vendorId": vendor_id,
            "vendorName": vendor_name,
            "control": (tpr or {}).get("controlKey") if tpr else None,
            "risk": risk_rows[0].get("publicId") if risk_rows else None,
            "requirement": requirement_rows[0].get("publicId") if requirement_rows else None,
        }
        if vendor_id:
            status, vendor_view = api("GET", f"/api/v1/privacy/vendors/{vendor_id}", token)
            RESULTS["vendorPrivacy"] = vendor_view.get("data") or {}
            record("vendor privacy", "PASS" if status == 200 and RESULTS["vendorPrivacy"].get("vendor") else "FAIL", str(status))
        status, deletion = api("POST", "/api/v1/privacy/deletions", token, {
            "activityPublicId": activity,
            "status": "REQUESTED",
            "action": "Manual deletion request",
            "systemName": "Claims platform",
            "dataKind": "FINANCIAL",
        })
        record("deletion", "PASS" if status == 201 and "not proof" in json.dumps(deletion).lower() else "FAIL", str((deletion.get("data") or {}).get("publicId")))
        status, hold = api("POST", "/api/v1/privacy/deletions", token, {
            "activityPublicId": activity,
            "status": "LEGAL_HOLD",
            "exceptionReason": "Litigation hold",
        })
        closed, _closed_payload = api("PATCH", f"/api/v1/privacy/deletions/{(hold.get('data') or {}).get('publicId')}", token, {"status": "CLOSED"})
        record("deletion legal hold", "PASS" if closed == 400 else "FAIL", str(closed))
        status, consent = api("POST", "/api/v1/privacy/consent", token, {"purpose": "Service delivery", "subjectRef": "hosted-manual", "choice": "GIVEN"})
        record("consent provider", "PASS" if status == 201 and "not configured" in json.dumps(consent).lower() else "FAIL", str((consent.get("data") or {}).get("providerStatus")))
        status, incident = api("POST", "/api/v1/privacy/incidents", token, {
            "title": "Hosted privacy notification assessment",
            "activityPublicId": activity,
            "enterpriseRiskId": risk_rows[0].get("publicId") if risk_rows else None,
            "notificationStatus": "REVIEW_REQUIRED",
        })
        record("incident", "PASS" if status == 201 and "you must notify" not in json.dumps(incident).lower() else "FAIL", str((incident.get("data") or {}).get("publicId")))
        status, affected = api("GET", f"/api/v1/privacy/affected?kind=activity&id={activity}", token)
        RESULTS["chain"] = affected.get("data") or {}
        chain = RESULTS["chain"]
        chain_ready = bool(chain.get("vendors") and chain.get("transfers") and chain.get("controls"))
        record("what is affected", "PASS" if status == 200 and chain_ready else "PARTIAL", json.dumps(chain)[:400])
    for kind in ["ropa", "risk", "dpia", "transfers", "rights", "retention", "processors", "executive", "board"]:
        status, payload = api("GET", f"/api/v1/privacy/reports/{kind}.pdf", token)
        record(f"report {kind}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if payload.get("content"):
            save_binary(f"Supreme-Privacy-{kind}.pdf", payload)
    status, pptx = api("GET", "/api/v1/privacy/reports/board.pptx", token)
    record("board pptx", "PASS" if status == 200 and pptx.get("binary") else "FAIL", str(status))
    if pptx.get("content"):
        save_binary("Supreme-Privacy-Board.pptx", pptx)
        try:
            import zipfile
            import re
            with zipfile.ZipFile(OUT / "Supreme-Privacy-Board.pptx") as zipped:
                slides = [name for name in zipped.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")]
                cover = zipped.read("ppt/slides/slide1.xml").decode("utf-8", "replace")
                texts = " ".join(re.findall(r"<a:t>([^<]*)</a:t>", cover))
                record("board pptx slides", "PASS" if len(slides) >= 8 else "FAIL", f"{len(slides)} slides")
                record("board pptx cover", "PASS" if "Board Risk Committee" in texts else "FAIL", texts[:180])
                RESULTS["boardSlides"] = []
                for name in sorted(slides, key=lambda item: int("".join(ch for ch in item if ch.isdigit()) or "0")):
                    body = zipped.read(name).decode("utf-8", "replace")
                    slide_text = " · ".join(re.findall(r"<a:t>([^<]*)</a:t>", body))
                    RESULTS["boardSlides"].append(slide_text[:400])
                    defects = []
                    if len(slide_text) < 20:
                        defects.append("empty")
                    if "undefined" in slide_text.lower():
                        defects.append("undefined text")
                    RESULTS.setdefault("boardVisualNotes", []).append({"slide": name, "defects": defects, "chars": len(slide_text)})
        except Exception as exc:
            record("board pptx slides", "FAIL", str(exc))
    for fmt in ["csv", "xlsx"]:
        status, payload = api("GET", f"/api/v1/privacy/export/{fmt}", token)
        record(f"export {fmt}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if payload.get("content"):
            save_binary(f"Supreme-Privacy-Register.{fmt}", payload)
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
            ("vendors", "/privacy-ops/vendors"),
            ("deletions", "/privacy-ops/deletions"),
            ("consent", "/privacy-ops/consent"),
            ("incidents", "/privacy-ops/incidents"),
            ("import", "/privacy-ops/import"),
        ]
        if activity:
            pages.append(("activity-detail", f"/privacy-ops/activities/{activity}"))
        if RESULTS["workflow"].get("vendorId"):
            pages.append(("vendor-detail", f"/privacy-ops/vendors/{RESULTS['workflow']['vendorId']}"))
        for name, path in pages:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            if name == "dashboard":
                copy = page.inner_text("body")
                record("dashboard copy spaces", "PASS" if "Know the data" in copy else "FAIL", copy[:160])
            if name == "rights":
                copy = page.inner_text("body")
                record("rights list mask", "PASS" if "hosted.requester@example.com" not in copy else "FAIL", copy[:200])
            if name == "activity-detail":
                copy = page.inner_text("body")
                record("humanized labels", "PASS" if "CUSTOMERS" not in copy and "SERVICE_PROVIDER" not in copy else "FAIL", copy[:220])
            for width in (375, 768, 1024, 1440, 1920):
                shot(page, f"{name}-{width}", width)
            overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            record(f"overflow {name}", "FAIL" if overflow else "PASS", path)
        for path, label in [("/compliance", "compliance"), ("/risks", "risk"), ("/governance-graph", "graph"), ("/control-center", "controls"), ("/reports", "reports"), ("/questionnaires", "methodology")]:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            shot(page, f"regression-{label}-1440", 1440)
        pptx_path = OUT / "Supreme-Privacy-Board.pptx"
        native_dir = OUT / "native-slides"
        if pptx_path.exists():
            completed = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "render-pptx-native.py"), str(pptx_path), str(native_dir)],
                capture_output=True,
                text=True,
            )
            if completed.returncode != 0:
                record("board pptx native render", "FAIL", (completed.stderr or completed.stdout)[:400])
            else:
                payload = json.loads((native_dir / "native-render.json").read_text())
                for index in range(1, payload.get("pages", 0) + 1):
                    src = native_dir / f"native-slide-{index:02d}.png"
                    if src.exists():
                        shutil.copyfile(src, OUT / f"board-slide-{index}.png")
                        RESULTS["shots"].append(str((OUT / f"board-slide-{index}.png").relative_to(ROOT)))
                html_card = OUT / "board-pptx-visual.html"
                if html_card.exists():
                    html_card.unlink()
                record(
                    "board pptx native render",
                    "PASS" if payload.get("pages") == 12 and payload.get("uniqueHashes", 0) >= 8 else "FAIL",
                    f"{payload.get('engine')} {payload.get('pages')} slides / {payload.get('uniqueHashes')} unique",
                )
        for name in ("deletions", "incidents"):
            page.goto(f"{BASE}/privacy-ops/{name}", wait_until="networkidle")
            for width in (375, 768):
                page.set_viewport_size({"width": width, "height": 812})
                time.sleep(0.4)
                cards = page.locator("[data-testid='record-card']")
                details = page.get_by_role("button", name="Details")
                overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
                record(
                    f"{name} {width} cards",
                    "PASS" if cards.count() > 0 and details.count() > 0 and not overflow else "FAIL",
                    f"cards={cards.count()} details={details.count()} overflow={overflow}",
                )
        browser.close()
    RESULTS["hostedFrontendSha"] = fe_sha
    RESULTS["hostedApiSha"] = api_sha
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps({"sha": RESULTS["sha"], "workflow": RESULTS["workflow"], "chain": RESULTS["chain"]}, indent=2))


if __name__ == "__main__":
    main()
