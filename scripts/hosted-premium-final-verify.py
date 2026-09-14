#!/usr/bin/env python3
"""Final hosted premium verification. Staging only. Does not declare Premium PASS."""

from __future__ import annotations

import json
import os
import time
import uuid
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "premium-experience" / "final-verify"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
RESULTS = {"checks": [], "routes": [], "keyboard": [], "viewports": [], "shots": [], "sha": {}, "evidence": {}}


def api(method, path, token=None, body=None, timeout=120):
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


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def login():
    status, payload = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {status}")
    return payload["data"]["token"], payload["data"]["user"]


def axe(page, name, path):
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
                    samples: row.nodes.slice(0, 4).map((node) => ({
                        target: node.target,
                        html: (node.html || '').slice(0, 160),
                        failure: (node.failureSummary || '').slice(0, 200),
                    })),
                })),
                passes: out.passes.length,
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("critical", "serious")]
    status = "FAIL" if serious else ("PARTIAL" if result["violations"] else "PASS")
    RESULTS["routes"].append({"route": name, "path": path, "result": status, **result})
    record(f"axe {name}", status, f"serious={len(serious)} total={len(result['violations'])}")
    return status


def keyboard(page, name):
    focused = []
    page.keyboard.press("Tab")
    for _ in range(10):
        focused.append(page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: '', name: '' };
                return { tag: el.tagName, name: (el.getAttribute('aria-label') || el.innerText || '').slice(0, 48) };
            }"""
        ))
        page.keyboard.press("Tab")
    trapped = len({(row["tag"], row["name"]) for row in focused}) == 1 and focused[0]["tag"] not in ("BODY", "HTML")
    skip = any("skip" in (row.get("name") or "").lower() for row in focused[:2]) or (focused and "skip" in (focused[0].get("name") or "").lower())
    RESULTS["keyboard"].append({"route": name, "trap": trapped, "first": focused[0] if focused else None, "focused": focused[:6]})
    record(f"keyboard {name}", "FAIL" if trapped else "PASS", f"trap={trapped} skipish={skip} first={focused[0] if focused else None}")


def overflow(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.3)
    wide = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    RESULTS["viewports"].append({"route": name, "width": width, "overflow": wide})
    record(f"{name}-{width}", "FAIL" if wide else "PASS", f"overflow={wide}")


def vendor_session(token):
    me = api("GET", "/api/v1/auth/me", token)[1]
    owner = ((me.get("data") or {}).get("id")) if isinstance(me, dict) else None
    stamp = str(int(time.time()))
    created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": f"Final Verify {stamp}",
        "website": f"https://final-verify-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Payroll processing",
        "businessOwnerUserId": owner,
        "businessUnit": "Finance",
        "estimatedAnnualSpend": 88000,
    })[1]
    public_id = (created.get("data") or {}).get("publicId")
    vendor_id = (created.get("data") or {}).get("id")
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
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    sent_status, sent = api("POST", f"/api/v1/vendors/{public_id}/due-diligence/send", token, {"contactEmail": f"final-verify-{stamp}@example.com"})
    activation = (sent.get("data") or {}).get("activationUrl") or sent.get("activationUrl")
    token_value = activation.split("token=", 1)[1] if activation and "token=" in activation else ""
    act_status, act = api("POST", "/api/v1/vendor-portal/activate", body={"token": token_value})
    vendor_token = (act.get("data") or {}).get("token")
    workspace = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)[1]
    assessments = (workspace.get("data") or {}).get("assessments") or []
    assessment_id = (assessments[0] or {}).get("id") if assessments else None
    detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    questions = (detail.get("data") or {}).get("questions") or []
    evidence_q = next((row for row in questions if row.get("evidenceRequired") and row.get("visible")), None)
    upload_status = None
    upload_body = {}
    if evidence_q:
        boundary = f"----SupremeBoundary{uuid.uuid4().hex}"
        parts = "\r\n".join([
            f"--{boundary}",
            'Content-Disposition: form-data; name="questionKey"',
            "",
            evidence_q["key"],
            f"--{boundary}",
            'Content-Disposition: form-data; name="file"; filename="policy.pdf"',
            "Content-Type: application/pdf",
            "",
        ]).encode() + b"\r\n%PDF-1.4 verify\r\n" + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(
            f"{API}/api/v1/vendor-portal/assessments/{assessment_id}/evidence",
            data=parts,
            headers={"Authorization": f"Bearer {vendor_token}", "Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                upload_status, upload_body = resp.status, json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            upload_status, upload_body = exc.code, json.loads(exc.read().decode() or "{}")
        detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)[1]
        questions = (detail.get("data") or {}).get("questions") or []
        evidence_q = next((row for row in questions if row.get("key") == evidence_q["key"]), evidence_q)
    status_value = (upload_body.get("data") or upload_body).get("status") if isinstance(upload_body, dict) else None
    presented = (evidence_q or {}).get("evidenceStatus")
    ready_shown = presented == "Ready" and status_value not in ("Ready",)
    RESULTS["evidence"] = {
        "publicId": public_id,
        "assessmentId": assessment_id,
        "uploadStatus": upload_status,
        "apiStatus": status_value,
        "presentedStatus": presented,
        "readyShownWithoutClean": ready_shown,
        "vendorId": vendor_id,
        "send": sent_status,
        "activate": act_status,
        "detail": detail_status,
    }
    if presented == "Ready" and status_value == "Ready":
        record("evidence-unknown-state", "PASS", f"presented={presented} api={status_value} (Ready only if backend said Ready)")
    elif presented in (None, "Unavailable", "Security status unavailable", "Scanning") or (presented and presented != "Ready"):
        record("evidence-unknown-state", "PASS", f"presented={presented} api={status_value}; Ready not shown for non-Ready")
    else:
        record("evidence-unknown-state", "FAIL", f"presented={presented} api={status_value}")
    return vendor_token, assessment_id, public_id


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
        frontend = json.loads(resp.read().decode())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": frontend.get("gitSha")}
    record("hosted-frontend", "PASS", str(frontend.get("gitSha")))
    record("hosted-api", "PASS", str(health.get("gitSha")))
    token, user = login()
    vendor_token, assessment_id, public_id = vendor_session(token)
    routes = [
        ("/", "public-home", None),
        ("/login", "public-login", None),
        ("/dashboard", "home", "customer"),
        ("/vendor-onboarding", "lifecycle-list", "customer"),
        (f"/vendor-onboarding/{public_id}", "lifecycle", "customer"),
        ("/risks", "risk", "customer"),
        ("/compliance", "compliance", "customer"),
        ("/privacy-ops", "privacy", "customer"),
        ("/ai-governance", "ai", "customer"),
        ("/documents", "evidence", "customer"),
        ("/reports", "reports", "customer"),
        ("/user-management", "administration", "customer"),
        ("/vendor-assessment", "vendor-landing", "vendor"),
        (f"/vendor-assessment/{assessment_id}", "vendor-questionnaire", "vendor"),
        ("/vendor-assessment/activate", "vendor-activate", None),
    ]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user, vendor]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                if (vendor) localStorage.setItem('vendorToken', vendor);
            }""",
            [token, user, vendor_token],
        )
        for path, name, plane in routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.8)
            axe(page, name, path)
            keyboard(page, name)
            if name in {"public-home", "home", "lifecycle", "vendor-questionnaire", "reports", "vendor-activate"}:
                for width in (375, 768, 1024, 1440, 1920):
                    overflow(page, name, width)
            elif name in {"ai", "evidence", "administration", "vendor-landing"}:
                overflow(page, name, 1440)
        browser.close()
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(json.dumps({
        "sha": RESULTS["sha"],
        "fail": [row for row in RESULTS["checks"] if row["result"] == "FAIL"],
        "evidence": RESULTS["evidence"],
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
