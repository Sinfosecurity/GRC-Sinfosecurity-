#!/usr/bin/env python3
"""Hosted #12 Automation Closure Phase B walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
import uuid
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


def upload_evidence(token: str, assessment_id: str, question_key: str, filename: str, content: bytes):
    boundary = f"----SupremeBoundary{uuid.uuid4().hex}"
    lines = [
        f"--{boundary}",
        f'Content-Disposition: form-data; name="questionKey"',
        "",
        question_key,
        f"--{boundary}",
        f'Content-Disposition: form-data; name="file"; filename="{filename}"',
        "Content-Type: application/pdf",
        "",
    ]
    body = "\r\n".join(lines).encode() + b"\r\n" + content + f"\r\n--{boundary}--\r\n".encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{API}/api/v1/vendor-portal/assessments/{assessment_id}/evidence",
        data=body,
        headers=headers,
        method="POST",
    )
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
    time.sleep(0.35)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    record(f"{name}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")


def complete_assessment(vendor_token: str, assessment_id: str):
    statuses = []
    detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    if detail_status != 200:
        return {"ok": False, "reason": f"detail {detail_status}", "statuses": statuses}
    questions = [row for row in (detail.get("data") or {}).get("questions") or [] if row.get("visible")]
    for question in questions:
        if question.get("locked"):
            continue
        options = question.get("options") or []
        response = next((option for option in options if str(option).lower().startswith("no")), None)
        if response is None:
            response = options[0] if options else "No"
        save_status, _ = api(
            "PATCH",
            f"/api/v1/vendor-portal/assessments/{assessment_id}/responses",
            vendor_token,
            {"questionKey": question["key"], "response": response},
        )
        if question.get("evidenceRequired"):
            up_status, up_body = upload_evidence(
                vendor_token,
                assessment_id,
                question["key"],
                f"{question['key']}.pdf",
                b"%PDF-1.4 hosted phase-b evidence",
            )
            statuses.append((question["key"], (up_body.get("data") or {}).get("status") or str(up_status)))
            if up_status not in (201, 409):
                record("evidence-upload", "FAIL", f"{question['key']} {up_status} {up_body}")
    incomplete_status, incomplete = api(
        "POST",
        f"/api/v1/vendor-portal/assessments/{assessment_id}/submit",
        vendor_token,
        {"attested": False},
    )
    record("attestation-required", "PASS" if incomplete_status == 400 else "FAIL", str(incomplete_status))
    ready = False
    last_status = None
    last_body = {}
    for _ in range(8):
        last_status, last_body = api(
            "POST",
            f"/api/v1/vendor-portal/assessments/{assessment_id}/submit",
            vendor_token,
            {"attested": True},
        )
        if last_status == 200:
            ready = True
            break
        time.sleep(4)
    record(
        f"submit-{assessment_id[:8]}",
        "PASS" if ready else "PARTIAL",
        f"{last_status} {json.dumps(last_body)[:240]} evidence={statuses[:6]}",
    )
    return {"ok": ready, "statuses": statuses, "submit": last_status, "body": last_body}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    try:
        with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
            frontend = json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001
        frontend = {"error": str(exc)}
    RESULTS["sha"] = {
        "api": health.get("gitSha"),
        "frontend": frontend.get("gitSha"),
        "apiEnvironment": health.get("environment") or health.get("deploymentEnvironment"),
        "health": health.get("status"),
    }
    if RESULTS["sha"]["api"] != RESULTS["sha"]["frontend"]:
        RESULTS["discrepancies"].append(
            f"Hosted API SHA {RESULTS['sha']['api']} differs from hosted frontend SHA {RESULTS['sha']['frontend']}. Not silently reconciled."
        )
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
    invitation = (sent.get("data") or {}).get("invitation") or {}
    record("send-due-diligence", "PASS" if sent_status == 201 else "FAIL", f"{sent_status} {invitation}")
    activation = (sent.get("data") or {}).get("activationUrl")
    record("activation-link", "PASS" if activation and "vendor-assessment/activate" in str(activation) and "localhost" not in str(activation) else "FAIL", "present" if activation else "missing")
    email_status = (sent.get("data") or {}).get("emailStatus") or invitation.get("emailStatus")
    record("email-provider-status", "PASS" if email_status else "PARTIAL", str(email_status))
    RESULTS["workflow"]["emailStatus"] = email_status
    leaked, leaked_body = api("GET", f"/api/v1/vendors/onboarding/{public_id}", other_token)
    record("tenant-isolation", "PASS" if leaked in (403, 404) and public_id not in json.dumps(leaked_body) else "FAIL", str(leaked))

    vendor_token = None
    first_assessment = None
    if activation:
        token_value = activation.split("token=")[-1]
        act_status, act = api("POST", "/api/v1/vendor-portal/activate", body={"token": token_value})
        vendor_token = (act.get("data") or {}).get("token")
        record("vendor-activate", "PASS" if act_status == 200 and vendor_token else "FAIL", str(act_status))
        reuse_status, _ = api("POST", "/api/v1/vendor-portal/activate", body={"token": token_value})
        record("activation-single-use", "PASS" if reuse_status == 410 else "FAIL", str(reuse_status))
        customer_with_vendor, _ = api("GET", "/api/v1/vendors", vendor_token)
        record("vendor-plane-boundary", "PASS" if customer_with_vendor == 401 else "FAIL", str(customer_with_vendor))
        workspace_status, workspace = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)
        record("vendor-workspace", "PASS" if workspace_status == 200 else "FAIL", str(workspace_status))
        assessments = (workspace.get("data") or {}).get("assessments") or []
        record("assigned-assessments", "PASS" if assessments else "FAIL", str(len(assessments)))
        submitted_any = False
        for item in assessments:
            result = complete_assessment(vendor_token, item["id"])
            submitted_any = submitted_any or bool(result.get("ok"))
            if not first_assessment:
                first_assessment = item["id"]
        record("vendor-submit", "PASS" if submitted_any else "PARTIAL", "at least one assessment submitted" if submitted_any else "hosted submit blocked or incomplete")
        RESULTS["workflow"] = {
            "publicId": public_id,
            "activation": bool(activation),
            "assessments": [item.get("name") for item in assessments],
            "emailStatus": email_status,
        }

    review_status, review = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    findings = (review.get("data") or {}).get("findings") or []
    draft = next((row for row in findings if row.get("reviewState") == "DRAFT"), None)
    record("analyst-review", "PASS" if review_status == 200 else "FAIL", str(review_status))
    record("draft-findings", "PASS" if draft else "PARTIAL", f"{len(findings)} findings")
    if draft:
        confirm_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{draft['id']}/review",
            token,
            {"action": "confirm"},
        )
        record("finding-confirm", "PASS" if confirm_status == 200 else "FAIL", str(confirm_status))
        remaining = [row for row in findings if row.get("id") != draft["id"] and row.get("reviewState") == "DRAFT"]
        if remaining:
            adjust_status, _ = api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{remaining[0]['id']}/review",
                token,
                {"action": "adjust", "severity": "HIGH", "reason": "Privileged access remains material."},
            )
            record("finding-adjust", "PASS" if adjust_status == 200 else "FAIL", str(adjust_status))
        if len(remaining) > 1:
            dismiss_status, _ = api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{remaining[1]['id']}/review",
                token,
                {"action": "dismiss", "reason": "Documented compensating control."},
            )
            record("finding-dismiss", "PASS" if dismiss_status == 200 else "FAIL", str(dismiss_status))

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
        page.wait_for_timeout(1000)
        for width in (375, 768, 1024, 1440, 1920):
            shot(page, f"customer-workspace-{width}", width)
        page.set_viewport_size({"width": 1440, "height": 940})
        for label, name in (("Due Diligence", "customer-due-diligence-1440"), ("Review", "analyst-review-1440"), ("History", "customer-history-1440")):
            try:
                page.get_by_role("tab", name=label, exact=True).click()
                page.wait_for_timeout(700)
                shot(page, name, 1440)
            except Exception as exc:  # noqa: BLE001
                record(f"tab-{label}", "FAIL", str(exc))
        if vendor_token:
            page2 = browser.new_page()
            page2.goto(f"{BASE}/vendor-assessment/activate", wait_until="domcontentloaded")
            page2.evaluate("token => localStorage.setItem('vendorToken', token)", vendor_token)
            page2.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
            page2.wait_for_timeout(800)
            for width in (375, 768, 1024, 1440, 1920):
                shot(page2, f"vendor-landing-{width}", width)
            if first_assessment:
                page2.goto(f"{BASE}/vendor-assessment/{first_assessment}", wait_until="networkidle")
                page2.wait_for_timeout(800)
                for width in (375, 1440):
                    shot(page2, f"vendor-questionnaire-{width}", width)
            page3 = browser.new_page()
            page3.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
            page3.wait_for_timeout(600)
            record("vendor-unauth-redirect", "PASS" if "/activate" in page3.url or "activation" in page3.content().lower() else "PARTIAL", page3.url)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"publicId": public_id, "sha": RESULTS["sha"], "failed": failed, "discrepancies": RESULTS["discrepancies"]}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
