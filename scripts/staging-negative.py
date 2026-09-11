#!/usr/bin/env python3
"""Negative API checks against isolated staging. Never prints secrets."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

API = os.environ.get("E2E_API", "http://127.0.0.1:4100/api/v1")
results: list[dict] = []


def record(step: str, status: str, observed: str) -> None:
    results.append({"step": step, "status": status, "observed": observed})
    print(f"[{status}] {step}: {observed}")


def request(method: str, path: str, token: str | None = None, body: dict | None = None, raw: bytes | None = None, headers: dict | None = None) -> tuple[int, bytes]:
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
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def login(email: str, password: str) -> tuple[int, str | None]:
    status, body = request("POST", "/auth/login", body={"email": email, "password": password})
    if status >= 400:
        return status, None
    payload = json.loads(body.decode())
    return status, payload["data"]["token"]


def main() -> int:
    status, admin = login("admin@sinfosecurity.com", "Admin@123")
    if not admin:
        record("NEG. LOGIN", "FAIL", f"Admin login failed HTTP {status}")
        return 1
    record("NEG. LOGIN", "PASS", "Admin authenticated against isolated staging.")

    status, assessor = login("compliance@sinfosecurity.com", "Compliance@123")
    if assessor:
        code, _ = request("GET", "/tprm/reports/executive.pdf", token=assessor, headers={"Accept": "application/pdf"})
        record("NEG. WRONG ROLE", "PASS" if code == 403 else "FAIL", f"Assessor executive PDF HTTP {code}")
    else:
        record("NEG. WRONG ROLE", "FAIL", f"Assessor login HTTP {status}")

    code, body = request("GET", "/vendors/00000000-0000-0000-0000-000000000000", token=admin)
    record("NEG. INVALID RESOURCE", "PASS" if code in {400, 404} else "FAIL", f"HTTP {code}")

    code, _ = request("GET", "/vendors", token="expired.invalid.token")
    record("NEG. EXPIRED SESSION", "PASS" if code == 401 else "FAIL", f"HTTP {code}")

    code, _ = request("POST", "/vendors", token=admin, body={"name": 123})
    record("NEG. MALFORMED PAYLOAD", "PASS" if code in {400, 422} else "FAIL", f"HTTP {code}")

    code, _ = request(
        "POST",
        "/tprm/evidence/upload",
        token=admin,
        raw=b"not-a-file",
        headers={"Content-Type": "application/octet-stream"},
    )
    record("NEG. UPLOAD POLICY", "PASS" if code in {400, 404, 415, 422} else "FAIL", f"HTTP {code}")

    code, _ = request("POST", "/billing/webhook", raw=b'{"id":"evt_replay"}', headers={"stripe-signature": "t=1,v1=deadbeef", "Content-Type": "application/json"})
    record("NEG. BILLING WEBHOOK REPLAY", "PASS" if code in {400, 503} else "FAIL", f"HTTP {code}")

    code, body = request("GET", "/system/status", token=admin)
    payload = json.loads(body.decode()) if code == 200 else {}
    ai = payload.get("data", {}).get("ai")
    malware = payload.get("data", {}).get("malware")
    record("NEG. PROVIDER FAILURE STATES", "PASS" if ai == "NOT_CONFIGURED" else "FAIL", f"HTTP {code} ai={ai} malware={malware}")

    status, _ = login("nobody-disabled@example.test", "WrongPass1x")
    record("NEG. DISABLED OR UNKNOWN USER", "PASS" if status == 401 else "FAIL", f"HTTP {status}")

    other_status, other_body = request(
        "POST",
        "/auth/signup",
        body={
            "email": f"other-admin-{os.getpid()}@example.test",
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
    code, body = request("GET", "/vendors", token=other_token)
    other_vendors = []
    if code == 200:
        payload = json.loads(body.decode())
        other_vendors = payload.get("data") or payload.get("vendors") or []
    names = [row.get("name") for row in other_vendors]
    record(
        "NEG. CROSS TENANT",
        "PASS" if "Northwind Cloud" not in names else "FAIL",
        f"signup={other_status} list={code} names={names}",
    )

    print("\n=== NEGATIVE ===")
    failed = 0
    for row in results:
        print(f"{row['status']}\t{row['step']}\t{row['observed']}")
        if row["status"] != "PASS":
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
