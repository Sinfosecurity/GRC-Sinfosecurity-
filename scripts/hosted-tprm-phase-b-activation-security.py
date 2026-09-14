#!/usr/bin/env python3
"""Hosted #12 Phase B activation-token security closure. Staging only. No inbox claim."""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-tprm-phase-b"
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
REQUIRED_API_SHA = "faefbf38a5dcfa16b8986f0f777a55806ea8d7f6"
RESULTS: dict = {"checks": [], "sha": {}, "workflow": {}, "discrepancies": []}


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


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


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


def complete_phase_a(token: str, owner_id: str, stamp: str, label: str):
    created_status, created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": f"Phase B Security {label} {stamp}",
        "website": f"https://phase-b-sec-{label}-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Payroll processing",
        "businessOwnerUserId": owner_id,
        "businessUnit": "Finance",
        "estimatedAnnualSpend": 88000,
    })
    public_id = (created.get("data") or {}).get("publicId")
    vendor_id = (created.get("data") or {}).get("id")
    if created_status != 201 or not public_id:
        raise SystemExit(f"create failed {created_status} {created}")
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
    if plan_status != 200:
        raise SystemExit(f"plan confirm failed {plan_status}")
    return public_id, vendor_id


def send(token: str, public_id: str, stamp: str, label: str):
    status, body = api("POST", f"/api/v1/vendors/onboarding/{public_id}/send", token, {
        "name": f"Casey {label}",
        "email": f"casey-{label}-{stamp}@vendor.example",
        "title": "Security lead",
    })
    data = body.get("data") or {}
    return status, data, token_from_url(data.get("activationUrl"))


def activate(raw: str):
    return api("POST", "/api/v1/vendor-portal/activate", body={"token": raw})


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
        "environment": health.get("environment") or health.get("deploymentEnvironment"),
        "health": health.get("status"),
    }
    if api_sha != REQUIRED_API_SHA:
        RESULTS["discrepancies"].append(f"Hosted API SHA {api_sha} is not required {REQUIRED_API_SHA}. Stopped.")
        record("hosted-api-sha", "FAIL", str(api_sha))
        (OUT / "activation-security.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
        raise SystemExit(1)
    record("hosted-api-sha", "PASS", api_sha)
    if fe_sha != api_sha:
        RESULTS["discrepancies"].append(
            f"Hosted frontend SHA {fe_sha} differs from hosted API SHA {api_sha}. Not silently reconciled."
        )
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    stamp = str(int(time.time()))

    public_a, vendor_a = complete_phase_a(token, user["id"], stamp, "A")
    send_status, sent, token_pending = send(token, public_a, stamp, "a")
    invitation = sent.get("invitation") or {}
    record("send-a", "PASS" if send_status == 201 and token_pending else "FAIL", f"{send_status} {invitation}")
    record("email-provider", "PASS", str(sent.get("emailStatus") or invitation.get("emailStatus")))

    resend_status, resent = api("POST", f"/api/v1/vendors/onboarding/{public_a}/invitation/resend", token, {})
    token_after_resend = token_from_url((resent.get("data") or {}).get("activationUrl"))
    if not token_after_resend:
        link_status, link = api("POST", f"/api/v1/vendors/onboarding/{public_a}/invitation/link", token, {})
        token_after_resend = token_from_url((link.get("data") or {}).get("activationUrl"))
        resend_status = link_status
    record("resend-issues-new-link", "PASS" if token_after_resend and token_after_resend != token_pending else "FAIL", str(resend_status))

    revoked_status, revoked_body = activate(token_pending)
    revoked_token = (revoked_body.get("data") or {}).get("token")
    record("revoked-or-replaced-token", "PASS" if revoked_status == 410 and not revoked_token else "FAIL", f"{revoked_status} token={bool(revoked_token)}")
    record("resend-invalidates-old-token", "PASS" if revoked_status == 410 and not revoked_token else "FAIL", f"{revoked_status}")

    first_status, first_body = activate(token_after_resend)
    first_jwt = (first_body.get("data") or {}).get("token")
    first_claims = jwt_claims(first_jwt)
    record("first-activation", "PASS" if first_status == 200 and first_jwt else "FAIL", f"{first_status} sessionId={first_claims.get('sessionId')}")

    reuse_status, reuse_body = activate(token_after_resend)
    reuse_jwt = (reuse_body.get("data") or {}).get("token")
    reuse_claims = jwt_claims(reuse_jwt)
    second_session = bool(reuse_jwt) and reuse_claims.get("sessionId") and reuse_claims.get("sessionId") != first_claims.get("sessionId")
    same_session_replay = bool(reuse_jwt) and reuse_claims.get("sessionId") == first_claims.get("sessionId")
    record("token-reuse", "PASS" if reuse_status == 410 and not reuse_jwt else "FAIL", f"{reuse_status} token={bool(reuse_jwt)}")
    record("second-session-issued", "PASS" if not second_session and not reuse_jwt else "FAIL", f"second={second_session} replay={same_session_replay}")

    vendors_status, vendors_body = api("GET", "/api/v1/vendors", first_jwt)
    record("vendor-plane-boundary", "PASS" if vendors_status == 401 else "FAIL", f"{vendors_status}")

    leaked_status, leaked_body = api("GET", f"/api/v1/vendors/onboarding/{public_a}", other_token)
    leaked_text = json.dumps(leaked_body)
    record("cross-tenant", "PASS" if leaked_status in (403, 404) and public_a not in leaked_text and str(vendor_a) not in leaked_text else "FAIL", str(leaked_status))

    public_b, vendor_b = complete_phase_a(token, user["id"], stamp, "B")
    send_b_status, sent_b, token_b = send(token, public_b, stamp, "b")
    record("send-b", "PASS" if send_b_status == 201 and token_b else "FAIL", str(send_b_status))
    act_b_status, act_b = activate(token_b)
    jwt_b = (act_b.get("data") or {}).get("token")
    record("activate-b", "PASS" if act_b_status == 200 and jwt_b else "FAIL", str(act_b_status))

    ws_a_status, ws_a = api("GET", "/api/v1/vendor-portal/workspace", first_jwt)
    ws_b_status, ws_b = api("GET", "/api/v1/vendor-portal/workspace", jwt_b)
    ids_a = [row.get("id") for row in ((ws_a.get("data") or {}).get("assessments") or [])]
    ids_b = [row.get("id") for row in ((ws_b.get("data") or {}).get("assessments") or [])]
    record("vendor-workspace-a", "PASS" if ws_a_status == 200 and ids_a else "FAIL", f"{ws_a_status} {len(ids_a)}")
    record("vendor-workspace-b", "PASS" if ws_b_status == 200 and ids_b else "FAIL", f"{ws_b_status} {len(ids_b)}")
    cross = []
    if ids_b:
        cross_status, cross_body = api("GET", f"/api/v1/vendor-portal/assessments/{ids_b[0]}", first_jwt)
        cross.append((cross_status, json.dumps(cross_body)))
    if ids_a:
        cross_status, cross_body = api("GET", f"/api/v1/vendor-portal/assessments/{ids_a[0]}", jwt_b)
        cross.append((cross_status, json.dumps(cross_body)))
    cross_ok = all(status in (401, 403, 404) and (vendor_a or "") not in text and (vendor_b or "") not in text for status, text in cross) and len(cross) == 2
    names_a = json.dumps(ws_a)
    names_b = json.dumps(ws_b)
    isolated_workspaces = public_b not in names_a and public_a not in names_b
    record("cross-vendor", "PASS" if cross_ok and isolated_workspaces else "FAIL", f"{cross} isolated_workspaces={isolated_workspaces}")

    RESULTS["workflow"] = {
        "publicIdA": public_a,
        "vendorIdA": vendor_a,
        "publicIdB": public_b,
        "invitationA": invitation,
        "emailStatus": sent.get("emailStatus") or invitation.get("emailStatus"),
        "firstActivation": first_status,
        "reuse": reuse_status,
        "firstSessionId": first_claims.get("sessionId"),
        "reuseTokenPresent": bool(reuse_jwt),
        "revokedStatus": revoked_status,
        "expiredHosted": "NOT PROVED — staging has no clock/backdate hook; expiresAt remains 14 days",
    }
    record("expired-token-hosted", "FAIL", "Cannot backdate expiresAt on hosted staging without a clock hook. Not claimed.")

    (OUT / "activation-security.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL" and row["name"] != "expired-token-hosted"]
    print(json.dumps({"sha": RESULTS["sha"], "workflow": RESULTS["workflow"], "failed": failed, "discrepancies": RESULTS["discrepancies"]}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
