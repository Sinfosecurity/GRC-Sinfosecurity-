#!/usr/bin/env python3
"""Premium closure vendor portal re-walk. Staging only. No inbox Delivered claim."""

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
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "premium-experience" / "vendor-rewalk"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "email": {}, "notes": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:400].decode("utf-8", "replace")}
        return exc.code, parsed


def upload_vendor_evidence(token: str, assessment_id: str, question_key: str, filename: str, content: bytes):
    boundary = f"----SupremeBoundary{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}",
        'Content-Disposition: form-data; name="questionKey"',
        "",
        question_key,
        f"--{boundary}",
        f'Content-Disposition: form-data; name="file"; filename="{filename}"',
        "Content-Type: application/pdf",
        "",
    ]
    body = "\r\n".join(parts).encode() + b"\r\n" + content + f"\r\n--{boundary}--\r\n".encode()
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
        with urllib.request.urlopen(req, timeout=180) as resp:
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


def token_from_url(url: str | None):
    if not url or "token=" not in url:
        return ""
    return url.split("token=", 1)[1]


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))


def intake_answers():
    return [
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


def complete_phase_a(token: str, owner_id: str, stamp: str, label: str):
    created_status, created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": f"Premium Vendor {label} {stamp}",
        "website": f"https://premium-{label}-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Payroll processing",
        "businessOwnerUserId": owner_id,
        "businessUnit": "Finance",
        "estimatedAnnualSpend": 88000,
    })
    public_id = (created.get("data") or {}).get("publicId")
    vendor_id = (created.get("data") or {}).get("id")
    record(f"request-{label}", "PASS" if created_status == 201 and public_id else "FAIL", f"{created_status} {public_id}")
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/intake/complete", token, {"answers": intake_answers(), "attested": True})
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/tier/confirm", token, {"confirm": True})
    plan_status, _ = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    record(f"phase-a-{label}", "PASS" if plan_status == 200 else "FAIL", str(plan_status))
    return public_id, vendor_id


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
        "environment": health.get("environment") or health.get("deploymentEnvironment"),
    }
    record("hosted-api-sha", "PASS" if RESULTS["sha"]["api"] else "FAIL", str(RESULTS["sha"]["api"]))
    record("hosted-frontend-sha", "PASS" if RESULTS["sha"]["frontend"] else "PARTIAL", str(RESULTS["sha"]["frontend"]))
    if RESULTS["sha"]["api"] != RESULTS["sha"]["frontend"]:
        RESULTS["notes"].append(
            f"Hosted frontend {RESULTS['sha']['frontend']} differs from hosted API {RESULTS['sha']['api']}. Not silently reconciled."
        )

    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    stamp = str(int(time.time()))
    public_id, vendor_id = complete_phase_a(token, user["id"], stamp, "golden")
    RESULTS["workflow"]["publicId"] = public_id
    RESULTS["workflow"]["vendorId"] = vendor_id

    sent_status, sent = api("POST", f"/api/v1/vendors/onboarding/{public_id}/send", token, {
        "name": "Casey Contact",
        "email": f"casey-premium-{stamp}@vendor.example",
        "title": "Security lead",
    })
    invitation = (sent.get("data") or {}).get("invitation") or {}
    activation = (sent.get("data") or {}).get("activationUrl")
    raw = token_from_url(activation)
    record("send-due-diligence", "PASS" if sent_status == 201 and raw else "FAIL", f"{sent_status}")
    RESULTS["email"] = {
        "providerAccepted": invitation.get("emailStatus") in ("sent", "delivered", "accepted"),
        "providerStatus": invitation.get("emailStatus"),
        "emailTruth": invitation.get("emailTruth"),
        "humanInbox": False,
        "spam": "not inspected",
        "note": "Do not claim Delivered from Queued.",
    }
    email_status = str(invitation.get("emailStatus") or "").lower()
    if email_status in ("queued", "accepted"):
        record("email-honesty", "PASS", f"Recorded as {email_status}; not claimed Delivered")
    elif email_status in ("delivered",):
        record("email-honesty", "PARTIAL", "API reported delivered; human inbox not separately confirmed")
    else:
        record("email-honesty", "PARTIAL", str(invitation))

    resend_status, resent = api("POST", f"/api/v1/vendors/onboarding/{public_id}/invitation/resend", token, {})
    raw_resend = token_from_url((resent.get("data") or {}).get("activationUrl"))
    if not raw_resend:
        _, link = api("POST", f"/api/v1/vendors/onboarding/{public_id}/invitation/link", token, {})
        raw_resend = token_from_url((link.get("data") or {}).get("activationUrl"))
    revoked_status, revoked_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw})
    record("resend-invalidates-old-token", "PASS" if revoked_status == 410 and not (revoked_body.get("data") or {}).get("token") else "FAIL", str(revoked_status))

    first_status, first_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_resend})
    vendor_token = (first_body.get("data") or {}).get("token")
    record("first-activation", "PASS" if first_status == 200 and vendor_token else "FAIL", str(first_status))
    reuse_status, reuse_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_resend})
    record("token-reuse", "PASS" if reuse_status == 410 and not (reuse_body.get("data") or {}).get("token") else "FAIL", str(reuse_status))
    plane_status, _ = api("GET", "/api/v1/vendors", vendor_token)
    record("vendor-plane-boundary", "PASS" if plane_status == 401 else "FAIL", str(plane_status))
    leaked_status, leaked_body = api("GET", f"/api/v1/vendors/onboarding/{public_id}", other_token)
    record("cross-tenant", "PASS" if leaked_status in (403, 404) and public_id not in json.dumps(leaked_body) else "FAIL", str(leaked_status))

    public_b, _ = complete_phase_a(token, user["id"], stamp, "cross")
    _, sent_b = api("POST", f"/api/v1/vendors/onboarding/{public_b}/send", token, {
        "name": "Blake Contact",
        "email": f"blake-premium-{stamp}@vendor.example",
        "title": "Security lead",
    })
    raw_b = token_from_url((sent_b.get("data") or {}).get("activationUrl"))
    act_b_status, act_b = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_b})
    jwt_b = (act_b.get("data") or {}).get("token")
    record("activate-cross-vendor", "PASS" if act_b_status == 200 and jwt_b else "FAIL", str(act_b_status))
    _, ws_a = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)
    ids_b = [row.get("id") for row in ((ws_a.get("data") or {}).get("assessments") or [])]
    _, ws_b = api("GET", "/api/v1/vendor-portal/workspace", jwt_b)
    ids_other = [row.get("id") for row in ((ws_b.get("data") or {}).get("assessments") or [])]
    cross_status, _ = api("GET", f"/api/v1/vendor-portal/assessments/{ids_other[0]}", vendor_token) if ids_other else (599, {})
    record("cross-vendor", "PASS" if cross_status in (401, 403, 404) and public_b not in json.dumps(ws_a) else "FAIL", str(cross_status))

    assessments = ((ws_a.get("data") or {}).get("assessments") or [])
    assessment_id = assessments[0]["id"] if assessments else None
    record("vendor-landing", "PASS" if assessment_id else "FAIL", f"assessments={len(assessments)}")
    if not assessment_id:
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
        raise SystemExit(1)

    detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    questions = [row for row in (detail.get("data") or {}).get("questions") or [] if row.get("visible") and not row.get("locked")]
    record("questionnaire-load", "PASS" if detail_status == 200 and questions else "FAIL", f"{detail_status} questions={len(questions)}")

    first_q = questions[0]
    first_options = first_q.get("options") or []
    first_response = next((option for option in first_options if str(option).lower().startswith("no")), first_options[0] if first_options else "No")
    save_status, _ = api(
        "PATCH",
        f"/api/v1/vendor-portal/assessments/{assessment_id}/responses",
        vendor_token,
        {"questionKey": first_q["key"], "response": first_response},
    )
    resume_status, resumed = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    saved = next((row for row in ((resumed.get("data") or {}).get("questions") or []) if row.get("key") == first_q["key"]), {})
    record("save-resume", "PASS" if save_status == 200 and resume_status == 200 and saved.get("response") == first_response else "FAIL", f"{save_status}/{resume_status}")

    evidence_ready = False
    evidence_state = "none"
    for question in questions:
        options = question.get("options") or []
        response = next((option for option in options if str(option).lower().startswith("no")), None)
        if response is None:
            response = options[0] if options else "No"
        api(
            "PATCH",
            f"/api/v1/vendor-portal/assessments/{assessment_id}/responses",
            vendor_token,
            {"questionKey": question["key"], "response": response},
        )
        if question.get("evidenceRequired"):
            up_status, uploaded = upload_vendor_evidence(
                vendor_token,
                assessment_id,
                question["key"],
                f"{question['key']}.pdf",
                b"%PDF-1.4 premium vendor evidence",
            )
            payload = uploaded.get("data") or uploaded
            evidence_state = (
                payload.get("scanStatus")
                or (payload.get("storedObject") or {}).get("scanStatus")
                or (payload.get("evidence") or {}).get("scanStatus")
                or "unknown"
            )
            record("evidence-upload", "PASS" if up_status in (200, 201) else "FAIL", f"{up_status} scan={evidence_state}")
            for _ in range(4):
                _, again = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
                blob = json.dumps(again)
                if '"scanStatus":"CLEAN"' in blob or '"scanStatus": "CLEAN"' in blob:
                    evidence_ready = True
                    evidence_state = "CLEAN"
                    break
                if any(token in blob for token in ('"INFECTED"', '"FAILED"', '"QUARANTINED"')):
                    evidence_state = "blocked"
                    break
                time.sleep(3)
            record(
                "evidence-ready-state",
                "PASS" if evidence_ready else "PARTIAL",
                f"internal scan={evidence_state}; customer language Ready/Blocked only",
            )

    last_status = None
    for _ in range(8):
        last_status, submit = api(
            "POST",
            f"/api/v1/vendor-portal/assessments/{assessment_id}/submit",
            vendor_token,
            {"attested": True},
        )
        if last_status == 200:
            break
        time.sleep(3)
    record("attestation-submit", "PASS" if last_status == 200 else "FAIL", str(last_status))

    review_status, review = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    drafts = [row for row in ((review.get("data") or {}).get("findings") or []) if row.get("reviewState") == "DRAFT"]
    if drafts:
        confirm_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{drafts[0]['id']}/review",
            token,
            {"action": "confirm"},
        )
        record("analyst-review", "PASS" if confirm_status == 200 else "FAIL", str(confirm_status))
    else:
        record("analyst-review", "PARTIAL" if review_status == 200 else "FAIL", f"{review_status} drafts={len(drafts)}")

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
        page.wait_for_timeout(800)
        shot(page, "analyst-review-1440", 1440)
        page.goto(f"{BASE}/vendor-assessment", wait_until="domcontentloaded")
        page.evaluate(
            """(token) => {
                localStorage.setItem('vendorToken', token);
                localStorage.setItem('token', token);
            }""",
            vendor_token,
        )
        page.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "vendor-landing-1440", 1440)
        shot(page, "vendor-landing-375", 375)
        if assessment_id:
            page.goto(f"{BASE}/vendor-assessment/{assessment_id}", wait_until="networkidle")
            page.wait_for_timeout(800)
            shot(page, "vendor-questionnaire-1440", 1440)
            shot(page, "vendor-questionnaire-1024", 1024)
            shot(page, "vendor-questionnaire-375", 375)
        browser.close()

    RESULTS["workflow"].update({
        "assessmentId": assessment_id,
        "submitted": last_status == 200,
        "evidenceReady": evidence_ready,
        "idsA": ids_b,
    })
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    fails = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"out": str(OUT), "fail": fails, "email": RESULTS["email"]}, indent=2))
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
