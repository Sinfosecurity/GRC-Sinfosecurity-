#!/usr/bin/env python3
"""Verify isolated staging storage, email, health, and orphan reconcile."""

from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("E2E_API", "http://127.0.0.1:4100/api/v1")
HEALTH = os.environ.get("STAGING_HEALTH", "http://127.0.0.1:4100/health")
MAILPIT = os.environ.get("MAILPIT_URL", "http://127.0.0.1:8025")
MINIO = os.environ.get("MINIO_URL", "http://127.0.0.1:9000")


def request(method: str, url: str, token: str | None = None, body=None, headers=None, data=None) -> tuple[int, bytes]:
    req_headers = {}
    payload = data
    if body is not None:
        payload = json.dumps(body).encode()
        req_headers["Content-Type"] = "application/json"
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def login() -> str:
    status, body = request("POST", f"{API}/auth/login", body={"email": "admin@sinfosecurity.com", "password": "Admin@123"})
    if status >= 400:
        raise SystemExit(f"login failed {status} {body[:200]!r}")
    return json.loads(body.decode())["data"]["token"]


def main() -> int:
    token = login()
    failed = 0

    def check(name: str, ok: bool, detail: str) -> None:
        nonlocal failed
        print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")
        if not ok:
            failed += 1

    status, body = request("GET", HEALTH)
    health = json.loads(body.decode()) if body else {}
    check("HEALTH", status == 200, f"HTTP {status} status={health.get('status')} checks={list((health.get('checks') or {}).keys())}")

    status, body = request("GET", f"{API}/system/status", token=token)
    sys_status = json.loads(body.decode()).get("data", {}) if status == 200 else {}
    check("SYSTEM.STATUS", status == 200, str({k: sys_status.get(k) for k in ("database", "storage", "email", "stripe", "ai", "malware", "redis")}))
    check("STORAGE.CONNECTED", sys_status.get("storage") == "CONNECTED", f"storage={sys_status.get('storage')} provider={sys_status.get('storageProvider')}")
    check("EMAIL.CONNECTED", sys_status.get("email") == "CONNECTED", f"email={sys_status.get('email')}")
    check("AI.POLICY", sys_status.get("ai") == "NOT_CONFIGURED", f"ai={sys_status.get('ai')}")
    check("STRIPE.POLICY", sys_status.get("stripe") == "NOT_CONFIGURED", f"stripe={sys_status.get('stripe')}")
    check("MALWARE.POLICY", str(sys_status.get("malware")) in {"NOT_CONFIGURED", "PENDING"}, f"malware={sys_status.get('malware')}")

    vendors = json.loads(request("GET", f"{API}/vendors", token=token)[1].decode())
    vendor_rows = vendors.get("data") or vendors.get("vendors") or []
    vendor_id = (vendor_rows[0] or {}).get("id") if vendor_rows else None
    check("VENDOR.LIST", bool(vendor_id), f"vendor_id={vendor_id}")

    if vendor_id:
        boundary = "----SupremeStagingBoundary"
        content = b"Supreme Risk staging storage checksum fixture\n"
        checksum = hashlib.sha256(content).hexdigest()
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="vendorId"\r\n\r\n{vendor_id}\r\n'
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="staging-storage.txt"\r\n'
            f"Content-Type: text/plain\r\n\r\n"
        ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
        status, resp = request(
            "POST",
            f"{API}/tprm/evidence/upload",
            token=token,
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        upload = json.loads(resp.decode()) if resp else {}
        payload = upload.get("data") or upload
        stored = payload.get("stored") or payload
        stored_id = stored.get("id")
        check("STORAGE.UPLOAD", status in {200, 201} and stored_id, f"HTTP {status} id={stored_id} checksum={stored.get('checksum')}")
        if stored.get("checksum"):
            check("STORAGE.CHECKSUM", stored.get("checksum") == checksum, f"expected {checksum} got {stored.get('checksum')}")
        if stored_id:
            status, download = request("GET", f"{API}/documents/{stored_id}/download", token=token)
            check(
                "STORAGE.UNSAFE_DOWNLOAD_BLOCKED",
                status == 403,
                f"HTTP {status} scan={stored.get('scanStatus')}",
            )
            status, deleted = request("DELETE", f"{API}/documents/{stored_id}", token=token)
            check("STORAGE.DELETE", status in {200, 204}, f"HTTP {status}")

    status, recon = request("POST", f"{API}/documents/reconcile", token=token)
    check("STORAGE.ORPHAN_RECONCILE", status == 200, recon[:200].decode("utf-8", "replace"))

    status, _ = request("POST", f"{API}/users/invite", token=token, body={"email": "staging-mail@example.test", "role": "VIEWER"})
    check("EMAIL.INVITE_API", status in {200, 201}, f"HTTP {status}")
    status, _ = request("POST", f"{API}/auth/forgot-password", body={"email": "admin@sinfosecurity.com"})
    check("EMAIL.RESET_API", status == 200, f"HTTP {status}")
    status, messages = request("GET", f"{MAILPIT}/api/v1/messages")
    mail = json.loads(messages.decode()) if status == 200 else {}
    count = mail.get("total") or mail.get("count") or len(mail.get("messages") or [])
    check("EMAIL.MAILPIT", status == 200 and count >= 1, f"HTTP {status} messages={count}")

    status, _ = request("GET", f"{MINIO}/minio/health/live")
    check("MINIO.LIVE", status == 200, f"HTTP {status}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
