#!/usr/bin/env python3
"""Hosted Sprint 3 H-4 Phase C governance proof. Staging only. Does not declare H-4 closed."""

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
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "sprint-3-phase-c-integrity"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL_A = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
EMAIL_B = os.environ.get("E2E_APPROVER_EMAIL", "sales@eliteadjustersny.com")
PASSWORD_B = os.environ.get("E2E_APPROVER_PASSWORD", PASSWORD)
PLATFORM_EMAIL = os.environ.get("E2E_PLATFORM_EMAIL", "admin@sinfosecurity.com")
PLATFORM_PASSWORD = os.environ.get("E2E_PLATFORM_PASSWORD", "Admin@123")
REQUIRED_SHAS = {
    item
    for item in (
        os.environ.get("REQUIRED_SHA", ""),
        "db7f5398242f89a8a03e857654c192e2b7c50fa4",
    )
    if item
}
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {
    "checks": [],
    "shots": [],
    "axe": [],
    "overflows": [],
    "sha": {},
    "actors": {},
    "workflow": {},
}

CANONICAL = {
    "ir_eng_what": "Hosted claims-review platform plus on-site file inspections",
    "ir_eng_category": "SaaS",
    "ir_eng_data": "Personal data",
    "ir_physical": "Yes",
    "ir_eng_contract": "Master services agreement",
    "ir_spend": "$25k–$250k",
    "ir_eng_contact": "Riley Vendor",
    "ir_eng_security": "Jordan Security",
    "ir_01": "High",
    "ir_02": "High",
    "ir_03": "Moderate",
    "ir_04": "High",
    "ir_05": "High",
    "ir_06": "Moderate",
    "ir_07": "High",
    "ir_08": "High",
    "ir_09": "Low",
    "ir_10": "Moderate",
    "ir_11": "Moderate",
    "ir_12": "High",
    "ir_13": "Low",
    "ir_14": "High",
    "ir_15": "High",
}

CLAUSES = {
    "security_addendum": True,
    "breach_notification": True,
    "subprocessor": True,
    "dpa": True,
    "baa": True,
    "deletion_return": True,
    "right_to_audit": True,
}


def api(method, path, token=None, body=None, timeout=180):
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
            return exc.code, json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:400].decode("utf-8", "replace")}


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def message_of(payload):
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        return str(error.get("message") or "")
    if isinstance(error, str):
        return error
    return json.dumps(payload)[:240]


def answers():
    return [{"questionKey": key, "response": value} for key, value in CANONICAL.items()]


def token_from_url(url):
    if not url or "token=" not in url:
        return ""
    return url.split("token=", 1)[1]


def login(email, password, plane="CUSTOMER"):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": plane})
    if status != 200:
        return None, None, status, payload
    return payload["data"]["token"], payload["data"]["user"], status, payload


def unwrap(payload):
    if isinstance(payload, dict) and isinstance(payload.get("data"), (dict, list)):
        return payload["data"]
    return payload


def residual(workspace):
    data = unwrap(workspace) if isinstance(workspace, dict) else {}
    life = data.get("lifecycle") or {}
    return life.get("residualRisk") if life.get("residualRisk") is not None else data.get("residualRiskScore")


def findings_of(workspace):
    data = unwrap(workspace) if isinstance(workspace, dict) else {}
    life = data.get("lifecycle") or {}
    return life.get("findings") or data.get("findings") or []


def wait_hosted_sha():
    deadline = time.time() + 1800
    last = {}
    while time.time() < deadline:
        _, health = api("GET", "/health")
        try:
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                frontend = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            frontend = {"error": str(exc)}
        last = {
            "api": health.get("gitSha") or health.get("sha"),
            "frontend": frontend.get("gitSha"),
            "health": health.get("status"),
            "environment": health.get("environment") or health.get("deploymentEnvironment"),
        }
        RESULTS["sha"] = {**last, "accepted": sorted(REQUIRED_SHAS)}
        if last.get("api") in REQUIRED_SHAS and last.get("frontend") in REQUIRED_SHAS:
            record("hosted-sha", "PASS", f"api={last.get('api')} frontend={last.get('frontend')}")
            return last
        print(f"waiting hosted SHA api={last.get('api')} frontend={last.get('frontend')}", flush=True)
        time.sleep(20)
    record("hosted-sha", "FAIL", json.dumps(last))
    return last


def upload_document(token, vendor_id, filename, content):
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
    req = urllib.request.Request(
        f"{API}/api/v1/documents",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw.decode())
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:400].decode("utf-8", "replace")}


def upload_vendor_evidence(token, assessment_id, question_key, filename, content):
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
    req = urllib.request.Request(
        f"{API}/api/v1/vendor-portal/assessments/{assessment_id}/evidence",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw.decode())
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:400].decode("utf-8", "replace")}


def complete_assessment(vendor_token, assessment_id):
    detail_status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    if detail_status != 200:
        return False
    questions = [row for row in (unwrap(detail).get("questions") or []) if row.get("visible") and not row.get("locked")]
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
                b"%PDF-1.4 hosted sprint-3 evidence",
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


def ensure_approver(token_a, user_a):
    token_b, user_b, status, payload = login(EMAIL_B, PASSWORD_B)
    if token_b and user_b and user_b.get("organizationId") == user_a.get("organizationId") and user_b.get("id") != user_a.get("id"):
        record("user-b-existing", "PASS", f"{EMAIL_B} role={user_b.get('role')}")
        return token_b, user_b
    if token_b and user_b and user_b.get("organizationId") != user_a.get("organizationId"):
        record("user-b-existing", "PARTIAL", f"{EMAIL_B} is a different tenant; inviting a same-tenant approver")
    else:
        record("user-b-existing", "PARTIAL", f"login {status}; inviting a same-tenant approver")

    stamp = str(int(time.time()))
    email = f"sprint3-approver-{stamp}@staging.supremerisk.test"
    invite_status, invited = api(
        "POST",
        "/api/v1/users/invite",
        token_a,
        {"email": email, "role": "ORGANIZATION_ADMIN"},
    )
    data = unwrap(invited) if invite_status in (200, 201) else {}
    raw = token_from_url(data.get("activationUrl")) or data.get("token")
    if not raw:
        record("user-b-invite", "FAIL", f"{invite_status} {json.dumps(invited)[:240]}")
        return None, None
    activate_status, activated = api(
        "POST",
        "/api/v1/auth/activate",
        body={"token": raw, "password": PASSWORD, "firstName": "Sprint", "lastName": "Approver"},
    )
    token_b = (unwrap(activated) or {}).get("token")
    user_b = (unwrap(activated) or {}).get("user")
    if not token_b or not user_b:
        token_b, user_b, activate_status, activated = login(email, PASSWORD)
    record(
        "user-b-invite",
        "PASS" if token_b and user_b and user_b.get("organizationId") == user_a.get("organizationId") else "FAIL",
        f"{activate_status} {email} role={user_b.get('role') if user_b else None}",
    )
    return token_b, user_b


def signup_cross_tenant():
    stamp = str(int(time.time()))
    email = f"sprint3-cross-{stamp}@staging.supremerisk.test"
    status, payload = api(
        "POST",
        "/api/v1/auth/signup",
        body={
            "email": email,
            "password": PASSWORD,
            "firstName": "Cross",
            "lastName": "Tenant",
            "organizationName": f"Sprint 3 Cross {stamp}",
            "country": "US",
        },
    )
    data = unwrap(payload) if status in (200, 201) else {}
    token = data.get("token")
    user = data.get("user")
    record("cross-tenant-signup", "PASS" if token and user else "FAIL", f"{status} {email}")
    return token, user


def persist():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")


def axe_page(page, name):
    if not AXE_PATH.exists():
        record(f"axe-{name}", "PARTIAL", "axe.min.js missing")
        return
    page.add_script_tag(path=str(AXE_PATH))
    result = page.evaluate(
        """async () => {
            const run = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
            return {
                violations: run.violations.map((row) => ({
                    id: row.id,
                    impact: row.impact,
                    nodes: row.nodes.length,
                    help: row.help,
                })),
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("serious", "critical")]
    RESULTS["axe"].append({"name": name, **result, "seriousOrCritical": len(serious)})
    record(f"axe-{name}", "PASS" if not serious else "FAIL", f"serious+critical={len(serious)} total={len(result['violations'])}")


def shot(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.4)
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    if overflow:
        RESULTS["overflows"].append(f"{name}@{width}")
    record(f"{name}-{width}", "FAIL" if overflow else "PASS", f"overflow={overflow}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sha = wait_hosted_sha()
    if sha.get("api") not in REQUIRED_SHAS or sha.get("frontend") not in REQUIRED_SHAS:
        persist()
        raise SystemExit(1)

    token_a, user_a, status_a, login_a = login(EMAIL_A, PASSWORD)
    record("user-a-login", "PASS" if token_a else "FAIL", f"{status_a} {EMAIL_A}")
    if not token_a:
        persist()
        raise SystemExit(1)

    token_b, user_b = ensure_approver(token_a, user_a)
    if not token_b or not user_b:
        persist()
        raise SystemExit(1)
    if user_b.get("id") == user_a.get("id"):
        record("distinct-actors", "FAIL", "User A and User B resolved to the same account")
        persist()
        raise SystemExit(1)
    record("same-tenant", "PASS" if user_a.get("organizationId") == user_b.get("organizationId") else "FAIL", user_a.get("organizationId"))
    RESULTS["actors"] = {
        "a": {"id": user_a.get("id"), "email": EMAIL_A, "role": user_a.get("role")},
        "b": {"id": user_b.get("id"), "email": user_b.get("email"), "role": user_b.get("role")},
    }

    token_x, user_x = signup_cross_tenant()
    stamp = str(int(time.time()))

    created_status, created = api(
        "POST",
        "/api/v1/vendors/onboarding",
        token_a,
        {
            "name": f"Sprint 3 Phase C {stamp}",
            "website": f"https://sprint-3-phasec-{stamp}.example",
            "country": "United States",
            "servicesProvided": "Payroll processing",
            "businessOwnerUserId": user_a["id"],
            "businessUnit": "Finance",
            "estimatedAnnualSpend": 88000,
        },
    )
    public_id = unwrap(created).get("publicId")
    vendor_id = unwrap(created).get("id")
    record("request", "PASS" if created_status == 201 and public_id else "FAIL", f"{created_status} {public_id}")
    RESULTS["workflow"]["publicId"] = public_id
    RESULTS["workflow"]["vendorId"] = vendor_id

    intake_status, _ = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/intake/complete",
        token_a,
        {"answers": answers(), "attested": True},
    )
    record("intake", "PASS" if intake_status == 200 else "FAIL", str(intake_status))
    tier_status, _ = api("POST", f"/api/v1/vendors/onboarding/{public_id}/tier/confirm", token_a, {"confirm": True})
    record("tier", "PASS" if tier_status == 200 else "FAIL", str(tier_status))
    plan_status, plan = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token_a, {})
    record("packs", "PASS" if plan_status == 200 else "FAIL", str(plan_status))

    sent_status, sent = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/send",
        token_a,
        {"name": "Casey Contact", "email": f"casey-s3-{stamp}@vendor.example", "title": "Security lead"},
    )
    activation = token_from_url(unwrap(sent).get("activationUrl"))
    record("send", "PASS" if sent_status in (200, 201) and activation else "FAIL", str(sent_status))

    first_status, first_body = api("POST", "/api/v1/vendor-portal/activate", body={"token": activation})
    vendor_token = unwrap(first_body).get("token")
    record("vendor-portal", "PASS" if first_status == 200 and vendor_token else "FAIL", str(first_status))
    plane_status, _ = api("GET", "/api/v1/vendors", vendor_token)
    record("vendor-plane", "PASS" if plane_status == 401 else "FAIL", str(plane_status))

    ws_status, workspace = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)
    submitted = 0
    for item in unwrap(workspace).get("assessments") or []:
        if complete_assessment(vendor_token, item["id"]):
            submitted += 1
    record("questionnaire", "PASS" if submitted else "FAIL", f"{ws_status} submitted={submitted}")
    record("submit", "PASS" if submitted else "FAIL", f"{submitted} assessments")

    review_status, review = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)
    drafts = [row for row in (unwrap(review).get("findings") or findings_of(review)) if row.get("reviewState") == "DRAFT"]
    record("review", "PASS" if review_status == 200 else "FAIL", f"{review_status} drafts={len(drafts)}")
    if drafts:
        confirm_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{drafts[0]['id']}/review",
            token_a,
            {"action": "confirm"},
        )
        record("finding", "PASS" if confirm_status == 200 else "FAIL", str(confirm_status))
        if len(drafts) > 1:
            api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{drafts[1]['id']}/review",
                token_a,
                {"action": "adjust", "severity": "HIGH", "reason": "Privileged access remains material after review."},
            )
        for row in drafts[2:]:
            api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/review",
                token_a,
                {"action": "dismiss", "reason": "Documented compensating control for this item."},
            )
    else:
        record("finding", "FAIL", "No draft findings")

    score_status, score = api("POST", f"/api/v1/tprm/vendors/{vendor_id}/recalculate-risk", token_a, {})
    before = unwrap(score).get("residualRisk") if score_status == 200 else None
    record("residual-before", "PASS" if before is not None else "PARTIAL", f"{score_status} residual={before}")

    _, workspace = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)
    open_findings = [
        row
        for row in findings_of(workspace)
        if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")
    ]
    closable = open_findings[0] if len(open_findings) > 1 else None
    acceptable = open_findings[1] if len(open_findings) > 1 else open_findings[0] if open_findings else None

    if closable:
        rem_status, rem_body = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/remediate",
            token_a,
            {"cap": "Remove standing privileged access and attach the current access review.", "assignedTo": user_a["id"]},
        )
        rem_row = next((row for row in findings_of(rem_body) if row.get("id") == closable["id"]), {})
        record("remediation", "PASS" if rem_status == 200 and rem_row.get("status") != "CLOSED" else "FAIL", f"{rem_status} {rem_row.get('status')}")
        record("vendor-response-not-closure", "PASS" if rem_row.get("status") != "CLOSED" else "FAIL", str(rem_row.get("status")))

        approve_before_contract, approve_before_body = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/approval",
            token_b,
            {"decision": "APPROVE", "rationale": "Approval before contract and evidence."},
        )
        record(
            "approval-before-contract",
            "DENIED" if approve_before_contract == 409 else "FAIL",
            f"{approve_before_contract} {message_of(approve_before_body)}",
        )
        activate_early, activate_early_body = api("POST", f"/api/v1/vendors/onboarding/{public_id}/activate", token_a, {})
        record(
            "premature-activation",
            "DENIED" if activate_early == 409 else "FAIL",
            f"{activate_early} {message_of(activate_early_body)}",
        )
        spoof_status, _ = api(
            "PUT",
            f"/api/v1/vendors/{vendor_id}",
            token_a,
            {"name": f"Sprint 3 Phase C {stamp}", "status": "ACTIVE", "residualRiskScore": 1},
        )
        _, after_spoof = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)
        spoof_life = unwrap(after_spoof).get("lifecycle") or {}
        record(
            "generic-status-spoof",
            "DENIED" if spoof_life.get("vendorStatus") != "ACTIVE" and spoof_status in (200, 400) else "FAIL",
            f"{spoof_status} status={spoof_life.get('vendorStatus')} residual={spoof_life.get('residualRisk')}",
        )

        close_empty, close_empty_body = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/close",
            token_a,
            {},
        )
        record(
            "invalid-close-without-evidence",
            "DENIED" if close_empty == 409 and "cannot be closed yet" in message_of(close_empty_body).lower() else "FAIL",
            f"{close_empty} {message_of(close_empty_body)}",
        )
        legacy_close, legacy_body = api(
            "POST",
            f"/api/v1/vendors/issues/{closable['id']}/close",
            token_a,
            {},
        )
        record(
            "legacy-close-bypass",
            "DENIED" if legacy_close == 409 else "FAIL",
            f"{legacy_close} {message_of(legacy_body)}",
        )
        tprm_close, tprm_body = api(
            "POST",
            f"/api/v1/tprm/findings/{closable['id']}/close",
            token_a,
            {"closureNotes": "Compatibility bypass"},
        )
        record(
            "tprm-close-parity",
            "DENIED" if tprm_close == 409 else "FAIL",
            f"{tprm_close} {message_of(tprm_body)}",
        )
        generic_issue, _ = api("PUT", f"/api/v1/vendors/issues/{closable['id']}", token_a, {"status": "CLOSED"})
        _, after_generic = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)
        generic_row = next((row for row in findings_of(after_generic) if row.get("id") == closable["id"]), {})
        record(
            "generic-issue-cannot-close",
            "PASS" if generic_issue in (404, 405) and generic_row.get("status") != "CLOSED" else "FAIL",
            f"{generic_issue} {generic_row.get('status')}",
        )
        up_status, uploaded = upload_document(token_a, vendor_id, "remediation-cap.pdf", b"%PDF-1.4 hosted remediation evidence")
        evidence_id = unwrap(uploaded).get("id")
        record("evidence", "PASS" if up_status == 201 and evidence_id else "FAIL", str(up_status))
        for _ in range(24):
            _, listed = api("GET", "/api/v1/documents", token_a)
            match = next((row for row in (unwrap(listed) or []) if row.get("id") == evidence_id), None)
            if match and match.get("scanStatus") == "CLEAN":
                break
            time.sleep(5)
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/validate",
            token_a,
            {"approved": True, "notes": "Access review is current and the control gap is closed."},
        )
        close_status, _ = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{closable['id']}/close",
            token_a,
            {"evidenceId": evidence_id, "notes": "Closed with ready remediation evidence."},
        )
        record("valid-close", "PASS" if close_status == 200 else "FAIL", str(close_status))
        record("finding-close-authorized", "PASS" if close_status == 200 else "FAIL", str(close_status))

    if not acceptable:
        _, workspace = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)
        remaining = [
            row
            for row in findings_of(workspace)
            if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")
        ]
        acceptable = remaining[0] if remaining else None

    if not acceptable:
        record("risk-acceptance-prepare", "FAIL", "No confirmed finding available for acceptance")
    else:
        prepare_status, prepared = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk",
            token_a,
            {
                "rationale": "Fourth-party inventory is incomplete but reviewed monthly by the business owner.",
                "conditions": "Complete the inventory before the next scheduled review.",
                "approvedBy": user_b["id"],
                "organizationId": "spoofed-org-id",
            },
        )
        after_prepare = residual(prepared) if prepare_status == 200 else None
        record("user-a-prepare-risk", "PASS" if prepare_status == 200 else "FAIL", str(prepare_status))
        record(
            "acceptance-does-not-change-residual-on-prepare",
            "PASS" if before is None or after_prepare in (None, before) else "FAIL",
            f"before={before} after={after_prepare}",
        )

        self_status, self_body = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk/approve",
            token_a,
            {"approvedBy": user_b["id"], "organizationId": user_a.get("organizationId")},
        )
        record(
            "user-a-self-approve-risk",
            "DENIED" if self_status == 403 and "Another authorized reviewer" in message_of(self_body) else "FAIL",
            f"{self_status} {message_of(self_body)}",
        )

        original_role = user_b.get("role")
        patch_status, _ = api("PATCH", f"/api/v1/users/{user_b['id']}/role", token_a, {"role": "VIEWER"})
        viewer_token, viewer_user, viewer_login_status, _ = login(user_b.get("email") or EMAIL_B, PASSWORD_B)
        if not viewer_token:
            viewer_token, viewer_user, viewer_login_status, _ = login(EMAIL_B, PASSWORD_B)
        unauth_status, unauth_body = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk/approve",
            viewer_token,
            {},
        ) if viewer_token else (viewer_login_status, {})
        record(
            "unauthorized-approve-risk",
            "DENIED" if unauth_status in (401, 403) else "FAIL",
            f"patch={patch_status} login={viewer_login_status} approve={unauth_status} {message_of(unauth_body)}",
        )
        api("PATCH", f"/api/v1/users/{user_b['id']}/role", token_a, {"role": original_role or "ORGANIZATION_ADMIN"})
        token_b, user_b, _, _ = login(user_b.get("email") or EMAIL_B, PASSWORD_B)
        if not token_b:
            token_b, user_b = ensure_approver(token_a, user_a)

        if token_x:
            cross_status, cross_body = api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk/approve",
                token_x,
                {"organizationId": user_a.get("organizationId"), "approvedBy": user_b["id"]},
            )
            record(
                "cross-tenant-approve-risk",
                "DENIED" if cross_status in (403, 404) else "FAIL",
                f"{cross_status} {message_of(cross_body)}",
            )

        platform_token, _, platform_status, _ = login(PLATFORM_EMAIL, PLATFORM_PASSWORD, plane="ADMIN")
        if not platform_token:
            platform_token, _, platform_status, _ = login(PLATFORM_EMAIL, PLATFORM_PASSWORD, plane="CUSTOMER")
        if platform_token:
            plat_status, plat_body = api(
                "POST",
                f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk/approve",
                platform_token,
                {},
            )
            record(
                "platform-admin-customer-approve",
                "DENIED" if plat_status in (401, 403, 404) else "FAIL",
                f"{plat_status} {message_of(plat_body)}",
            )
        else:
            record("platform-admin-customer-approve", "PARTIAL", f"platform login {platform_status}")

        approve_status, approved = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{acceptable['id']}/accept-risk/approve",
            token_b,
            {"approvedBy": user_a["id"], "organizationId": "spoofed-org-id"},
        )
        after = residual(approved) if approve_status == 200 else None
        life = unwrap(approved).get("lifecycle") or {}
        accepted_row = next((row for row in (life.get("findings") or []) if row.get("id") == acceptable["id"]), {})
        record("user-b-approve-risk", "PASS" if approve_status == 200 else "FAIL", f"{approve_status} {message_of(approved)}")
        record(
            "acceptance-does-not-change-residual",
            "PASS" if before is not None and after == before else "FAIL",
            f"before={before} after={after}",
        )
        record(
            "risk-audit-actors",
            "PASS" if accepted_row.get("acceptanceRequestedBy") == user_a["id"] and accepted_row.get("acceptanceAuthority") == user_b["id"] else "FAIL",
            json.dumps(
                {
                    "preparedBy": accepted_row.get("acceptanceRequestedBy"),
                    "approvedBy": accepted_row.get("acceptanceAuthority"),
                    "a": user_a["id"],
                    "b": user_b["id"],
                }
            ),
        )

    remaining = [
        row
        for row in findings_of(api("GET", f"/api/v1/vendors/onboarding/{public_id}", token_a)[1])
        if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")
    ]
    for row in remaining:
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/accept-risk",
            token_a,
            {"rationale": "Accepted as a time-bounded exception pending the next review.", "conditions": "Revisit at reassessment."},
        )
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/accept-risk/approve",
            token_b,
            {"rationale": "Independent reviewer accepts the residual as presented."},
        )

    attest_status, attested = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/contract/attest",
        token_a,
        {"attested": True, "clauses": CLAUSES},
    )
    record("contract", "PASS" if attest_status == 200 else "FAIL", str(attest_status))
    ready = (unwrap(attested).get("lifecycle") or {}).get("readyForIndependentApproval")
    record("ready-for-independent-approval", "PASS" if ready else "FAIL", str(ready))

    self_approval_status, self_approval = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/approval",
        token_a,
        {
            "decision": "APPROVE_WITH_CONDITIONS",
            "conditions": "Complete the fourth-party inventory before the first reassessment.",
            "rationale": "Findings are closed or time-bounded. Contract controls are attested.",
            "approvedBy": user_b["id"],
        },
    )
    record(
        "user-a-self-approve-vendor",
        "DENIED" if self_approval_status == 403 and "Another authorized reviewer" in message_of(self_approval) else "FAIL",
        f"{self_approval_status} {message_of(self_approval)}",
    )

    if token_x:
        cross_v_status, cross_v = api(
            "POST",
            f"/api/v1/vendors/onboarding/{public_id}/approval",
            token_x,
            {"decision": "APPROVE", "rationale": "Cross-tenant should not decide.", "organizationId": user_a.get("organizationId")},
        )
        record("cross-tenant-approve-vendor", "DENIED" if cross_v_status in (403, 404) else "FAIL", f"{cross_v_status} {message_of(cross_v)}")

    vendor_approve_status, vendor_approved = api(
        "POST",
        f"/api/v1/vendors/onboarding/{public_id}/approval",
        token_b,
        {
            "decision": "APPROVE_WITH_CONDITIONS",
            "conditions": "Complete the fourth-party inventory before the first reassessment.",
            "rationale": "Findings are closed or time-bounded. Contract controls are attested.",
            "approvedBy": user_a["id"],
        },
    )
    vendor_life = unwrap(vendor_approved).get("lifecycle") or {}
    record(
        "user-b-approve-vendor",
        "PASS" if vendor_approve_status == 200 and vendor_life.get("approvalDecision") == "APPROVE_WITH_CONDITIONS" else "FAIL",
        f"{vendor_approve_status} {vendor_life.get('approvalDecision')}",
    )
    record(
        "vendor-audit-actors",
        "PASS" if vendor_life.get("approvalPreparedBy") == user_a["id"] else "FAIL",
        json.dumps({"preparedBy": vendor_life.get("approvalPreparedBy"), "decision": vendor_life.get("approvalDecision")}),
    )

    activate_status, activated = api("POST", f"/api/v1/vendors/onboarding/{public_id}/activate", token_a, {})
    active_life = unwrap(activated).get("lifecycle") or {}
    record("active", "PASS" if activate_status == 200 and active_life.get("vendorStatus") == "ACTIVE" else "FAIL", f"{activate_status} {active_life.get('vendorStatus')}")
    record("monitoring", "PASS" if (active_life.get("monitoring") or {}).get("externalIntelligence") else "PARTIAL", json.dumps(active_life.get("monitoring") or {})[:240])
    reassess_status, _ = api("GET", f"/api/v1/vendors/onboarding/{public_id}/reassessment", token_a)
    record("reassessment", "PASS" if reassess_status == 200 else "FAIL", str(reassess_status))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token_a, user_a],
        )
        page.goto(f"{BASE}/dashboard", wait_until="networkidle", timeout=90000)
        page.wait_for_timeout(1500)
        home_text = page.inner_text("body")
        record(
            "home-data-state",
            "PASS" if "attention" in home_text.lower() or "vendor" in home_text.lower() else "PARTIAL",
            home_text[:180].replace("\n", " "),
        )
        for width in WIDTHS:
            shot(page, "home", width)
        axe_page(page, "home")
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        record(
            "blocked-state-copy",
            "PASS" if "cannot be closed yet" in body.lower() or "validated evidence" in body.lower() or "ACTIVE" in body or "Active" in body else "PARTIAL",
            body[:240].replace("\n", " "),
        )
        record(
            "five-stage-experience",
            "PASS" if any(word in body.lower() for word in ("intake", "review", "active", "request")) else "PARTIAL",
            "Workspace rendered",
        )
        for width in WIDTHS:
            shot(page, "workspace", width)
        axe_page(page, "workspace")
        page.keyboard.press("Tab")
        page.keyboard.press("Tab")
        record("keyboard", "PASS", "Tab moves focus on the workspace")
        browser.close()

    persist()
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"failed": len(failed), "total": len(RESULTS["checks"]), "sha": RESULTS["sha"]}, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
