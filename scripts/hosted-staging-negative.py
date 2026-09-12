#!/usr/bin/env python3
"""Public negative checks against hosted staging. Never prints secrets."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com/api/v1")
results: list[dict] = []


def record(step: str, status: str, observed: str) -> None:
    results.append({"step": step, "status": status, "observed": observed})
    print(f"[{status}] {step}: {observed}")


def request(
    method: str,
    path: str,
    token: str | None = None,
    body: dict | None = None,
    raw: bytes | None = None,
    headers: dict | None = None,
) -> tuple[int, bytes]:
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req_headers = {"Accept": "application/json"}
    if data is not None and raw is None:
        req_headers["Content-Type"] = "application/json"
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(f"{API}{path}", data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def login(email: str, password: str) -> tuple[int, str | None]:
    status, body = request("POST", "/auth/login", body={"email": email, "password": password})
    if status >= 400:
        return status, None
    payload = json.loads(body.decode())
    return status, payload["data"]["token"]


def json_data(body: bytes) -> dict:
    try:
        payload = json.loads(body.decode())
    except Exception:
        return {}
    data = payload.get("data")
    return data if isinstance(data, dict) else payload


def first_id(payload: object, *keys: str) -> str | None:
    if isinstance(payload, dict):
        for key in keys:
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
        items = payload.get("data") or payload.get("items") or payload.get("vendors")
        if isinstance(items, list) and items:
            return first_id(items[0], *keys)
        return payload.get("id") if isinstance(payload.get("id"), str) else None
    if isinstance(payload, list) and payload:
        return first_id(payload[0], *keys)
    return None


def main() -> int:
    status, admin = login("admin@sinfosecurity.com", "Admin@123")
    if not admin:
        record("NEG. LOGIN", "FAIL", f"Admin login failed HTTP {status}")
        return 1
    record("NEG. LOGIN", "PASS", "Admin authenticated against hosted staging.")

    status, assessor = login("compliance@sinfosecurity.com", "Compliance@123")
    if assessor:
        code, _ = request("GET", "/tprm/reports/executive.pdf", token=assessor, headers={"Accept": "application/pdf"})
        record("NEG. WRONG ROLE", "PASS" if code == 403 else "FAIL", f"Assessor executive PDF HTTP {code}")
    else:
        record("NEG. WRONG ROLE", "FAIL", f"Assessor login HTTP {status}")

    code, _ = request("GET", "/vendors/00000000-0000-0000-0000-000000000000", token=admin)
    record("NEG. INVALID RESOURCE", "PASS" if code in {400, 404} else "FAIL", f"HTTP {code}")

    code, _ = request("GET", "/vendors", token="expired.invalid.token")
    record("NEG. EXPIRED SESSION", "PASS" if code == 401 else "FAIL", f"HTTP {code}")

    code, _ = request("POST", "/vendors", token=admin, body={"name": 123})
    record("NEG. MALFORMED PAYLOAD", "PASS" if code in {400, 422} else "FAIL", f"HTTP {code}")

    code, _ = request(
        "POST",
        "/tprm/evidence/upload",
        token=admin,
        raw=b"MZ\x90\x00not-a-safe-evidence-file",
        headers={"Content-Type": "application/octet-stream"},
    )
    record("NEG. UNSAFE EVIDENCE", "PASS" if code in {400, 403, 404, 415, 422} else "FAIL", f"HTTP {code}")

    code, _ = request(
        "POST",
        "/billing/webhook",
        raw=b'{"id":"evt_replay"}',
        headers={"stripe-signature": "t=1,v1=deadbeef", "Content-Type": "application/json"},
    )
    record("NEG. INVALID STRIPE WEBHOOK", "PASS" if code in {400, 401, 403, 503} else "FAIL", f"HTTP {code}")

    code, vendors_body = request("GET", "/vendors", token=admin)
    vendors = json.loads(vendors_body.decode()).get("data") if code == 200 else []
    if not isinstance(vendors, list):
        vendors = []
    vendor_id = first_id(vendors) or "demo-vendor-cloud-001"
    record("NEG. NORMAL USAGE", "PASS" if code == 200 else "FAIL", f"Authenticated vendor list HTTP {code}")

    other_email = f"other-admin-{os.getpid()}-{int(time.time())}@example.test"
    other_status, other_body = request(
        "POST",
        "/auth/signup",
        body={
            "email": other_email,
            "password": "OtherPass1x",
            "firstName": "Other",
            "lastName": "Tenant",
            "organizationName": f"Other Tenant {os.getpid()}",
            "country": "US",
        },
    )
    other_token = None
    if other_status < 400:
        other_token = json.loads(other_body.decode())["data"]["token"]
    isolation_ok = True
    isolation_notes = [f"signup={other_status}"]
    if not other_token:
        isolation_ok = False
        isolation_notes.append("other tenant token missing")
    else:
        probes = [
            ("vendor", "GET", f"/vendors/{vendor_id}"),
            ("assessment", "GET", f"/tprm/vendors/{vendor_id}/assessments"),
            ("evidence", "GET", "/tprm/evidence"),
            ("finding", "GET", "/tprm/findings"),
            ("brief", "GET", "/tprm/decision-briefs"),
            ("report", "GET", f"/tprm/reports/vendors/{vendor_id}/scorecard.pdf"),
        ]
        for label, method, path in probes:
            probe_code, probe_body = request(method, path, token=other_token)
            leaked = False
            if probe_code == 200:
                text = probe_body.decode("utf-8", errors="replace")
                leaked = "Northwind" in text or vendor_id in text
            allowed = probe_code in {200, 403, 404}
            isolation_ok = isolation_ok and allowed and not leaked
            isolation_notes.append(f"{label}={probe_code} leaked={leaked}")
    record("NEG. TENANT ISOLATION", "PASS" if isolation_ok else "FAIL", " ".join(isolation_notes))

    invite_email = f"revoked-{os.getpid()}@example.test"
    invite_code, invite_body = request("POST", "/users/invite", token=admin, body={"email": invite_email, "role": "VIEWER"})
    invite_data = json_data(invite_body)
    invitation = invite_data.get("invitation") if isinstance(invite_data.get("invitation"), dict) else invite_data
    invitation_id = invitation.get("id") if isinstance(invitation, dict) else None
    invite_token = invite_data.get("token")
    if invite_code < 400 and invitation_id:
        revoke_code, _ = request("POST", f"/users/invitations/{invitation_id}/revoke", token=admin)
        activate_code, _ = request(
            "POST",
            "/auth/activate",
            body={"token": invite_token or "revoked-token", "password": "RevokedPass1x", "firstName": "Revoked", "lastName": "User"},
        )
        record(
            "NEG. REVOKED INVITATION",
            "PASS" if revoke_code < 400 and activate_code in {400, 401, 403, 404, 410, 422} else "FAIL",
            f"invite={invite_code} revoke={revoke_code} activate={activate_code}",
        )
    else:
        record("NEG. REVOKED INVITATION", "FAIL", f"invite HTTP {invite_code}")

    disable_email = f"disable-{os.getpid()}@example.test"
    disable_code, disable_body = request("POST", "/users/invite", token=admin, body={"email": disable_email, "role": "VIEWER"})
    disable_data = json_data(disable_body)
    disable_token = disable_data.get("token")
    if disable_code < 400 and disable_token:
        activate_code, activate_body = request(
            "POST",
            "/auth/activate",
            body={"token": disable_token, "password": "DisablePass1x", "firstName": "Temp", "lastName": "User"},
        )
        activated = json_data(activate_body)
        user_id = (activated.get("user") or {}).get("id") if isinstance(activated.get("user"), dict) else activated.get("id")
        if activate_code < 400 and user_id:
            status_code, _ = request("PATCH", f"/users/{user_id}/status", token=admin, body={"status": "DISABLED"})
            login_code, _ = login(disable_email, "DisablePass1x")
            record(
                "NEG. DISABLED USER",
                "PASS" if status_code < 400 and login_code in {401, 403} else "FAIL",
                f"activate={activate_code} disable={status_code} login={login_code}",
            )
        else:
            record("NEG. DISABLED USER", "FAIL", f"activate HTTP {activate_code}")
    else:
        record("NEG. DISABLED USER", "FAIL", f"invite HTTP {disable_code}")

    limited = False
    last = None
    for _ in range(6):
        last, _ = request("POST", "/auth/login", body={"email": "abuse-rate-limit@example.test", "password": "WrongPass1x"})
        if last == 429:
            limited = True
            break
    record("NEG. ABUSIVE USAGE", "PASS" if limited else "FAIL", f"failed-login HTTP {last}")

    print("\n=== HOSTED NEGATIVE ===")
    failed = 0
    for row in results:
        print(f"{row['status']}\t{row['step']}\t{row['observed']}")
        if row["status"] != "PASS":
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
