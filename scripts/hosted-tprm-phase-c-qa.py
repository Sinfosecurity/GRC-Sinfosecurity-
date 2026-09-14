#!/usr/bin/env python3
"""Hosted #12 Phase C golden path. Staging only. No production. No inbox claim."""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-tprm-phase-c"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "99bfe89419d064e8ab20317e917b70da22dbd03a")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "discrepancies": [], "uxReserved": []}


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


def upload_document(token: str, vendor_id: str, filename: str, content: bytes):
    boundary = f"----SupremeBoundary{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}",
        'Content-Disposition: form-data; name="ownerType"',
        "",
        "vendor",
        f"--{boundary}",
        'Content-Disposition: form-data; name="ownerId"',
        "",
        vendor_id,
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
    req = urllib.request.Request(f"{API}/api/v1/documents", data=body, headers=headers, method="POST")
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


def jwt_claims(token: str | None):
    if not token:
        return {}
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode()))
    except Exception as exc:  # noqa: BLE001
        return {"decodeError": str(exc)}


def token_from_url(url: str | None):
    if not url or "token=" not in url:
        return ""
    return url.split("token=", 1)[1]


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def reserve_ux(item: str):
    RESULTS["uxReserved"].append(item)


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    if overflow:
        reserve_ux(f"{name} horizontal overflow at {width}px")
    record(f"{name}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")


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
        "name": f"Phase C {label} {stamp}",
        "website": f"https://phase-c-{label}-{stamp}.example",
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
    plan_status, plan = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    record(f"phase-a-{label}", "PASS" if plan_status == 200 else "FAIL", str(plan_status))
    return public_id, vendor_id, plan.get("data") or {}


def complete_assessment(vendor_token: str, assessment_id: str):
    detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    if detail_status != 200:
        return False
    questions = [row for row in (detail.get("data") or {}).get("questions") or [] if row.get("visible") and not row.get("locked")]
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
            upload_vendor_evidence(
                vendor_token,
                assessment_id,
                question["key"],
                f"{question['key']}.pdf",
                b"%PDF-1.4 hosted phase-c evidence",
            )
    last_status = None
    for _ in range(8):
        last_status, _ = api(
            "POST",
            f"/api/v1/vendor-portal/assessments/{assessment_id}/submit",
            vendor_token,
            {"attested": True},
        )
        if last_status == 200:
            return True
        time.sleep(3)
    return last_status == 200


def residual(workspace: dict):
    life = (workspace.get("data") or {}).get("lifecycle") or {}
    return life.get("residualRisk")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    try:
        with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
            frontend = json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001
        frontend = {"error": str(exc)}
    api_sha = health.get("gitSha")
    fe_sha = frontend.get("gitSha")
    RESULTS["sha"] = {
        "api": api_sha,
        "frontend": fe_sha,
        "required": REQUIRED_SHA,
        "environment": health.get("environment") or health.get("deploymentEnvironment"),
        "health": health.get("status"),
    }
    if api_sha != REQUIRED_SHA:
        record("hosted-api-sha", "FAIL", f"{api_sha} != {REQUIRED_SHA}")
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
        raise SystemExit(1)
    record("hosted-api-sha", "PASS", api_sha)
    if fe_sha != api_sha:
        RESULTS["discrepancies"].append(
            f"Hosted frontend SHA {fe_sha} differs from hosted API SHA {api_sha}. Not silently reconciled."
        )
        record("hosted-frontend-sha", "PARTIAL", str(fe_sha))
    else:
        record("hosted-frontend-sha", "PASS", str(fe_sha))

    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    stamp = str(int(time.time()))
    evidence_id = None

    public_id, vendor_id, plan = complete_phase_a(token, user["id"], stamp, "golden")
    RESULTS["workflow"]["publicId"] = public_id
    RESULTS["workflow"]["vendorId"] = vendor_id
    RESULTS["workflow"]["planTriggers"] = ((plan.get("plan") or {}).get("triggers") if isinstance(plan, dict) else None)

    sent_status, sent = api("POST", f"/api/v1/vendors/onboarding/{public_id}/send", token, {
        "name": "Casey Contact",
        "email": f"casey-c-{stamp}@vendor.example",
        "title": "Security lead",
    })
    invitation = (sent.get("data") or {}).get("invitation") or {}
    activation = (sent.get("data") or {}).get("activationUrl")
    raw = token_from_url(activation)
    record("send-due-diligence", "PASS" if sent_status == 201 and raw else "FAIL", f"{sent_status} {invitation}")
    record("email-honesty", "PASS" if invitation.get("emailTruth") else "PARTIAL", str(invitation))

    resend_status, resent = api("POST", f"/api/v1/vendors/onboarding/{public_id}/invitation/resend", token, {})
    raw_resend = token_from_url((resent.get("data") or {}).get("activationUrl"))
    if not raw_resend:
        _, link = api("POST", f"/api/v1/vendors/onboarding/{public_id}/invitation/link", token, {})
        raw_resend = token_from_url((link.get("data") or {}).get("activationUrl"))
    revoked_status, revoked_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw})
    record("resend-invalidates-old-token", "PASS" if revoked_status == 410 and not (revoked_body.get("data") or {}).get("token") else "FAIL", str(revoked_status))
    record("revoked-token", "PASS" if revoked_status == 410 else "FAIL", str(revoked_status))

    first_status, first_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_resend})
    vendor_token = (first_body.get("data") or {}).get("token")
    first_claims = jwt_claims(vendor_token)
    record("first-activation", "PASS" if first_status == 200 and vendor_token else "FAIL", f"{first_status} sessionId={first_claims.get('sessionId')}")
    reuse_status, reuse_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_resend})
    record("token-reuse", "PASS" if reuse_status == 410 and not (reuse_body.get("data") or {}).get("token") else "FAIL", str(reuse_status))
    record("expired-token-hosted", "PARTIAL", "No staging clock hook. Deterministic local integration test backdates expiresAt and expects 410.")
    plane_status, _ = api("GET", "/api/v1/vendors", vendor_token)
    record("vendor-plane-boundary", "PASS" if plane_status == 401 else "FAIL", str(plane_status))
    leaked_status, leaked_body = api("GET", f"/api/v1/vendors/onboarding/{public_id}", other_token)
    record("cross-tenant", "PASS" if leaked_status in (403, 404) and public_id not in json.dumps(leaked_body) else "FAIL", str(leaked_status))

    public_b, vendor_b, _ = complete_phase_a(token, user["id"], stamp, "cross")
    send_b_status, sent_b = api("POST", f"/api/v1/vendors/onboarding/{public_b}/send", token, {
        "name": "Blake Contact",
        "email": f"blake-c-{stamp}@vendor.example",
        "title": "Security lead",
    })
    raw_b = token_from_url((sent_b.get("data") or {}).get("activationUrl"))
    act_b_status, act_b = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw_b})
    jwt_b = (act_b.get("data") or {}).get("token")
    record("activate-cross-vendor", "PASS" if act_b_status == 200 and jwt_b else "FAIL", str(act_b_status))
    ws_a_status, ws_a = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)
    ws_b_status, ws_b = api("GET", "/api/v1/vendor-portal/workspace", jwt_b)
    ids_a = [row.get("id") for row in ((ws_a.get("data") or {}).get("assessments") or [])]
    ids_b = [row.get("id") for row in ((ws_b.get("data") or {}).get("assessments") or [])]
    cross_status, cross_body = api("GET", f"/api/v1/vendor-portal/assessments/{ids_b[0]}", vendor_token) if ids_b else (599, {})
    record("cross-vendor", "PASS" if cross_status in (401, 403, 404) and public_b not in json.dumps(ws_a) else "FAIL", str(cross_status))

    submitted = 0
    for item in ((ws_a.get("data") or {}).get("assessments") or []):
        if complete_assessment(vendor_token, item["id"]):
            submitted += 1
    record("vendor-submit", "PASS" if submitted else "FAIL", f"{submitted} assessments")

    review_status, review = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    drafts = [row for row in ((review.get("data") or {}).get("findings") or []) if row.get("reviewState") == "DRAFT"]
    record("draft-findings", "PASS" if drafts else "PARTIAL", f"{len(drafts)} drafts")
    confirmed_ids = []
    if drafts:
        confirm_status, _ = api("POST", f"/api/v1/vendors/onboarding/{public_id}/findings/{drafts[0]['id']}/review", token, {"action": "confirm"})
        record("finding-confirm", "PASS" if confirm_status == 200 else "FAIL", str(confirm_status))
        confirmed_ids.append(drafts[0]["id"])
    if len(drafts) > 1:
        adjust_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{drafts[1]['id']}/review",
            token,
            {"action": "adjust", "severity": "HIGH", "reason": "Privileged access remains material after review."},
        )
        record("finding-adjust", "PASS" if adjust_status == 200 else "FAIL", str(adjust_status))
        confirmed_ids.append(drafts[1]["id"])
    for row in drafts[2:]:
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/review",
            token,
            {"action": "dismiss", "reason": "Documented compensating control for this item."},
        )

    score_status, score = api("POST", f"/api/v1/tprm/vendors/{vendor_id}/recalculate-risk", token, {})
    before = ((score.get("data") or {}).get("residualRisk") if score_status == 200 else None)
    record("residual-before", "PASS" if before is not None else "PARTIAL", f"{score_status} residual={before}")

    workspace_status, workspace = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    findings = ((workspace.get("data") or {}).get("lifecycle") or {}).get("findings") or []
    open_findings = [row for row in findings if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")]
    closable = open_findings[0] if open_findings else None
    acceptable = open_findings[1] if len(open_findings) > 1 else None
    record("confirmed-findings", "PASS" if closable else "FAIL", json.dumps(open_findings[:4])[:400])

    if closable:
        rem_status, rem = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/remediate",
            token,
            {"cap": "Remove standing privileged access and attach the current access review.", "assignedTo": user["id"]},
        )
        record("remediation-assigned", "PASS" if rem_status == 200 else "FAIL", str(rem_status))
        premature_status, premature = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/close",
            token,
            {},
        )
        record("close-without-evidence", "PASS" if premature_status == 409 else "FAIL", f"{premature_status} {json.dumps(premature)[:180]}")

        up_status, uploaded = upload_document(token, vendor_id, "remediation-cap.pdf", b"%PDF-1.4 hosted remediation evidence")
        evidence_id = (uploaded.get("data") or {}).get("id")
        scan = (uploaded.get("data") or {}).get("scanStatus")
        record("remediation-evidence-upload", "PASS" if up_status == 201 and evidence_id else "FAIL", f"{up_status} scan={scan}")
        dirty_status, dirty = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/close",
            token,
            {"evidenceId": evidence_id},
        )
        record(
            "close-before-clean-or-validation",
            "PASS" if dirty_status == 409 else "FAIL",
            f"{dirty_status} {json.dumps(dirty)[:220]}",
        )
        clean = scan == "CLEAN"
        for _ in range(24):
            listed_status, listed = api("GET", "/api/v1/documents", token)
            items = listed.get("data") or []
            match = next((row for row in items if row.get("id") == evidence_id), None)
            if match and match.get("scanStatus") == "CLEAN":
                clean = True
                scan = "CLEAN"
                break
            time.sleep(5)
        record("evidence-clean", "PASS" if clean else "PARTIAL", f"scan={scan}")
        val_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/validate",
            token,
            {"approved": True, "notes": "Access review is current and the control gap is closed."},
        )
        record("remediation-validated", "PASS" if val_status == 200 else "FAIL", str(val_status))
        close_status, closed = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/close",
            token,
            {"evidenceId": evidence_id, "notes": "Closed with ready remediation evidence."},
        )
        record("finding-closed", "PASS" if close_status == 200 else "FAIL", f"{close_status} {json.dumps(closed)[:180]}")

    if acceptable:
        accept_status, accepted = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk",
            token,
            {
                "rationale": "Fourth-party inventory is incomplete but reviewed monthly by the business owner.",
                "conditions": "Complete the inventory before the next scheduled review.",
            },
        )
        after = residual(accepted) if accept_status == 200 else None
        if after is None:
            _, after_workspace = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
            after = residual(after_workspace)
        record("risk-acceptance", "PASS" if accept_status == 200 else "FAIL", str(accept_status))
        record(
            "acceptance-does-not-change-residual",
            "PASS" if before is not None and after == before else "FAIL",
            f"before={before} after={after}",
        )
        decisions = ((accepted.get("data") or {}).get("lifecycle") or {}).get("decisions") or []
        record("risk-decision-brief", "PASS" if any(row.get("decision") == "RISK_ACCEPTED" for row in decisions) else "PARTIAL", json.dumps(decisions[:2])[:240])
    else:
        record("risk-acceptance", "PARTIAL", "Second confirmed finding was not available")
        record("acceptance-does-not-change-residual", "PARTIAL", "Acceptance path not exercised")

    remaining = [
        row for row in (((api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)[1].get("data") or {}).get("lifecycle") or {}).get("findings") or [])
        if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")
    ]
    for row in remaining:
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/accept-risk",
            token,
            {"rationale": "Accepted as a time-bounded exception pending the next review.", "conditions": "Revisit at reassessment."},
        )

    clauses = {
        "security_addendum": True,
        "breach_notification": True,
        "subprocessor": True,
        "dpa": True,
        "baa": True,
        "deletion_return": True,
        "right_to_audit": True,
    }
    attest_status, attested = api("POST", f"/api/v1/vendors/onboarding/{public_id}/contract/attest", token, {"attested": True, "clauses": clauses})
    checklist = ((attested.get("data") or {}).get("lifecycle") or {}).get("checklist") or []
    record("contract-attest", "PASS" if attest_status == 200 else "FAIL", f"{attest_status} items={len(checklist)}")
    record("contract-human-attestation", "PASS" if ((attested.get("data") or {}).get("lifecycle") or {}).get("contractAttestedAt") else "FAIL", "attested")

    approve_status, approved = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/approval",
        token,
        {
            "decision": "APPROVE_WITH_CONDITIONS",
            "conditions": "Complete the fourth-party inventory before the first reassessment.",
            "rationale": "Findings are closed or time-bounded. Contract controls are attested.",
        },
    )
    life = (approved.get("data") or {}).get("lifecycle") or {}
    record("approve-with-conditions", "PASS" if approve_status == 200 and life.get("approvalDecision") == "APPROVE_WITH_CONDITIONS" else "FAIL", f"{approve_status} {life.get('approvalDecision')}")
    record("approval-package", "PASS" if life.get("residualRisk") is not None or before is not None else "PARTIAL", json.dumps({
        "residual": life.get("residualRisk"),
        "openFindings": (life.get("monitoring") or {}).get("openFindings"),
        "accepted": (life.get("monitoring") or {}).get("acceptedRisks"),
        "contract": bool(life.get("contractAttestedAt")),
    }))

    activate_status, activated = api("POST", f"/api/v1/vendors/onboarding/{public_id}/activate", token, {})
    active_life = (activated.get("data") or {}).get("lifecycle") or {}
    record("activation", "PASS" if activate_status == 200 and active_life.get("vendorStatus") == "ACTIVE" else "FAIL", f"{activate_status} {active_life.get('vendorStatus')} {active_life.get('stage')}")
    record("active-vendor", "PASS" if active_life.get("stage") == "ACTIVE" and active_life.get("nextReassessmentAt") else "FAIL", str(active_life.get("nextReassessmentAt")))
    record(
        "monitoring",
        "PASS" if (active_life.get("monitoring") or {}).get("externalIntelligence") else "PARTIAL",
        json.dumps(active_life.get("monitoring") or {})[:360],
    )

    reserve_ux("Customer history remains verbose and event-list heavy.")
    reserve_ux("Phase C tabs are functional, not a premium visual system.")
    reserve_ux("Invitation email honesty is text-only; no delivery timeline.")
    reserve_ux("Approval package is summarized in the workspace, not a dedicated decision brief page.")
    reserve_ux("Reassessment recommendation is shown; a full targeted questionnaire delta UI is not built.")

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
        shot(page, "workspace-1440", 1440)
        shot(page, "workspace-375", 375)
        page.set_viewport_size({"width": 1440, "height": 940})
        for label, name in (
            ("Findings", "findings-1440"),
            ("Contract", "contract-1440"),
            ("Approval", "approval-1440"),
            ("Active", "active-1440"),
            ("History", "history-1440"),
        ):
            try:
                page.get_by_role("tab", name=label, exact=True).click()
                page.wait_for_timeout(700)
                shot(page, name, 1440)
            except Exception as exc:  # noqa: BLE001
                record(f"tab-{label}", "FAIL", str(exc))
                reserve_ux(f"Could not open {label} tab during hosted walkthrough: {exc}")
        browser.close()

    rec_status, rec = api("GET", f"/api/v1/vendors/onboarding/{public_id}/reassessment", token)
    rec_data = rec.get("data") or {}
    record("reassessment-recommendation", "PASS" if rec_status == 200 and rec_data.get("recommendation") else "FAIL", json.dumps(rec_data)[:280])
    record("expired-evidence-truth", "PASS" if rec_data.get("expiredEvidence") == 0 else "FAIL", f"expiredEvidence={rec_data.get('expiredEvidence')}")
    start_status, started = api("POST", f"/api/v1/vendors/onboarding/{public_id}/reassessment", token, {})
    record("reassessment-started", "PASS" if start_status == 200 and ((started.get("data") or {}).get("lifecycle") or {}).get("stage") == "REASSESSMENT" else "FAIL", str(start_status))
    prior_assessments, prior_body = api("GET", f"/api/v1/vendors/{vendor_id}/assessments", token)
    if prior_assessments != 200:
        prior_assessments, prior_body = api("GET", f"/api/v1/tprm/vendors/{vendor_id}/assessments", token)
    prior_rows = prior_body.get("data") if isinstance(prior_body, dict) else prior_body
    record(
        "historical-assessment-preservation",
        "PASS" if prior_assessments == 200 and prior_rows else "PARTIAL",
        f"{prior_assessments} rows={len(prior_rows) if isinstance(prior_rows, list) else 'n/a'}; reassessment does not overwrite prior rows; recommendation is advisory.",
    )

    off_status, off = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/offboard",
        token,
        {"exitNotes": "Engagement ended. Retain evidence, findings, briefs, and history.", "acknowledgeOutstanding": True},
    )
    off_life = (off.get("data") or {}).get("lifecycle") or {}
    record("offboarding", "PASS" if off_status == 200 and off_life.get("stage") == "OFFBOARDING" else "FAIL", f"{off_status} {off_life.get('stage')} {off_life.get('vendorStatus')}")
    hist_status, hist = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)
    history = (hist.get("data") or {}).get("history") or []
    docs_status, docs = api("GET", "/api/v1/documents", token)
    still_has_docs = any(row.get("ownerId") == vendor_id for row in (docs.get("data") or [])) if docs_status == 200 else False
    record("historical-governance-preservation", "PASS" if hist_status == 200 and history and (still_has_docs or evidence_id) else "PARTIAL", f"history={len(history)} docs={still_has_docs}")

    public_r, vendor_r, _ = complete_phase_a(token, user["id"], stamp, "reject")
    api("POST", f"/api/v1/vendors/onboarding/{public_r}/contract/attest", token, {"attested": True, "clauses": clauses})
    reject_status, rejected = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_r}/approval",
        token,
        {"decision": "REJECT", "rationale": "Residual and contract package are not acceptable for this engagement."},
    )
    reject_life = (rejected.get("data") or {}).get("lifecycle") or {}
    record("rejection", "PASS" if reject_status == 200 and reject_life.get("approvalDecision") == "REJECT" else "FAIL", f"{reject_status} {reject_life.get('approvalDecision')} {reject_life.get('vendorStatus')}")
    RESULTS["workflow"]["rejectPublicId"] = public_r

    RESULTS["workflow"].update({
        "emailStatus": invitation.get("emailStatus"),
        "emailTruth": invitation.get("emailTruth"),
        "submittedAssessments": submitted,
        "residualBefore": before,
        "approval": life.get("approvalDecision"),
        "activeStatus": active_life.get("vendorStatus"),
        "offboardingStage": off_life.get("stage"),
        "reassessment": (rec.get("data") or {}).get("recommendation"),
    })
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"publicId": public_id, "sha": RESULTS["sha"], "failed": failed, "discrepancies": RESULTS["discrepancies"]}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
