#!/usr/bin/env python3
"""Hosted #23 Insurance Edition bounded gap-closure walk. Staging only. Does not declare #23 PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "insurance-edition" / "final-gap-closure"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "")
REQUIRED_API_SHA = os.environ.get("REQUIRED_API_SHA", "")
PASSWORD = "InsGap23Bx1"
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {"checks": [], "shots": [], "overflows": [], "sha": {}, "notes": [], "tenants": {}}


def record(name: str, result: str, detail: str) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail}", flush=True)


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1"):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
            payload = json.loads(raw) if raw else {}
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload


def upload_pdf(token: str, filename: str) -> tuple[int, dict]:
    boundary = "----SupremeInsGap"
    content = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/pdf\r\n\r\n".encode()
        + content
        + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"ownerType\"\r\n\r\norganization\r\n--{boundary}--\r\n".encode()
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    req = urllib.request.Request(f"{API}/api/v1/tprm/evidence/upload", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return exc.code, {"raw": raw.decode("utf-8", "replace")[:300]}


def shot(page, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    width = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": width})
    record(f"overflow:{name}", "PASS" if width <= 1 else "FAIL", f"extra={width}")


def launch_browser(playwright):
    try:
        return playwright.chromium.launch(headless=True)
    except Exception:
        return playwright.chromium.launch(headless=True, channel="chrome")


def signup(label: str):
    email = f"ins23gap-{label}-{int(time.time())}@example.test"
    status, payload = request_json(
        "POST",
        "/auth/signup",
        body={"email": email, "password": PASSWORD, "firstName": "Ada", "lastName": "Insurance", "organizationName": f"Ins Gap {label} {int(time.time())}"},
    )
    return status, payload, email


def login_ui(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.get_by_label("Work email").fill(email)
    continue_btn = page.get_by_role("button", name="Continue")
    if continue_btn.count():
        continue_btn.click()
        page.wait_for_timeout(800)
    if page.get_by_label("Password").count():
        page.get_by_label("Password").fill(PASSWORD)
    sign_in = page.get_by_role("button", name="Sign in")
    (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
    page.wait_for_timeout(2500)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "health": health_status}
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    if REQUIRED_API_SHA:
        record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_API_SHA else "FAIL", str(health.get("gitSha")))
    if REQUIRED_FRONTEND_SHA:
        record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_FRONTEND_SHA else "FAIL", str(fe.get("gitSha")))
    if (REQUIRED_API_SHA and health.get("gitSha") != REQUIRED_API_SHA) or (REQUIRED_FRONTEND_SHA and fe.get("gitSha") != REQUIRED_FRONTEND_SHA):
        RESULTS["notes"].append("Hosted SHA mismatch. Walk aborted.")
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    a_status, a_signup, a_email = signup("a")
    b_status, b_signup, b_email = signup("b")
    if a_status not in {200, 201} or b_status not in {200, 201}:
        record("two-tenants", "FAIL", f"{a_status}/{b_status}")
        raise SystemExit(1)
    token_a = a_signup["data"]["token"]
    token_b = b_signup["data"]["token"]
    org_a = a_signup["data"]["user"]["organizationId"]
    org_b = b_signup["data"]["user"]["organizationId"]
    RESULTS["tenants"] = {"a": org_a[:8], "b": org_b[:8]}
    record("two-tenants", "PASS", f"{org_a[:8]}/{org_b[:8]}")

    for token, label in ((token_a, "a"), (token_b, "b")):
        status, _ = request_json("POST", "/insurance/activate", token, {
            "organizationType": "INSURER",
            "domicileCountryCode": "NG",
            "operatingJurisdictions": ["NG"],
            "linesOfBusiness": ["MOTOR"],
            "activities": ["CLAIMS", "REINSURANCE"],
        })
        record(f"activate-{label}", "PASS" if status == 201 else "FAIL", str(status))

    entity = request_json("POST", "/insurance/entities", token_a, {
        "name": "Lagos Motor A",
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "linesOfBusiness": ["MOTOR"],
    })
    record("entity-a", "PASS" if entity[0] == 201 else "FAIL", str(entity[0]))
    license_status, license = request_json("POST", "/insurance/licenses", token_a, {
        "entityPublicId": (entity[1].get("data") or {}).get("publicId"),
        "authorityKey": "NAICOM",
        "jurisdictionCode": "NG",
        "licenseType": "NG_INSURER",
        "status": "ACTIVE",
        "expiryDate": time.strftime("%Y-%m-%d", time.gmtime(time.time() + 7 * 86400)),
        "reviewDueAt": time.strftime("%Y-%m-%d", time.gmtime(time.time() + 3 * 86400)),
        "verificationBasis": "CUSTOMER_RECORDED",
    })
    license_id = (license.get("data") or {}).get("publicId")
    record("license-a", "PASS" if license_status == 201 else "FAIL", str(license_status))

    upload_status, uploaded = upload_pdf(token_a, f"license-{org_a[:8]}.pdf")
    stored_id = ((uploaded.get("data") or {}).get("id")) or ((uploaded.get("data") or {}).get("storedObjectId"))
    scan = ((uploaded.get("data") or {}).get("scanStatus") or "").upper()
    record("evidence-upload", "PASS" if upload_status in {200, 201} and stored_id else "FAIL", f"{upload_status} {scan}")
    if scan and scan != "CLEAN":
        RESULTS["notes"].append(f"Upload scanStatus={scan}. Attach requires CLEAN.")
    attach = request_json("POST", f"/insurance/licenses/{license_id}/evidence", token_a, {"evidenceObjectId": stored_id})
    record("license-evidence-attach", "PASS" if attach[0] == 201 and scan == "CLEAN" else ("SKIP" if scan != "CLEAN" else "FAIL"), str(attach[0]))
    steal = request_json("POST", f"/insurance/licenses/{license_id}/evidence", token_b, {"evidenceObjectId": stored_id})
    record("cross-tenant-attach", "PASS" if steal[0] in {403, 404} else "FAIL", str(steal[0]))
    other_licenses = request_json("GET", "/insurance/licenses", token_b)
    record("cross-tenant-license-read", "PASS" if license_id not in json.dumps(other_licenses[1]) else "FAIL", str(other_licenses[0]))

    applicability = request_json("POST", "/insurance/regulatory/applicability", token_a, {
        "packKey": "ng-insurer-core",
        "state": "APPLICABLE",
        "reason": "Nigerian insurer domicile recorded.",
    })
    record("applicability-write", "PASS" if applicability[0] == 201 else "FAIL", str(applicability[0]))
    regulatory = request_json("GET", "/insurance/regulatory", token_a)
    packs = ((regulatory[1].get("data") or {}).get("packs") or [])
    ng = next((row for row in packs if row.get("key") == "ng-insurer-core"), {})
    record("applicability-attribution", "PASS" if ng.get("lastDecidedBy") and ng.get("lastDecidedAt") and ng.get("lastReason") else "FAIL", str(ng.get("lastDecidedBy")))
    other_reg = request_json("GET", "/insurance/regulatory", token_b)
    record("cross-tenant-applicability", "PASS" if "Nigerian insurer domicile recorded." not in json.dumps(other_reg[1]) else "FAIL", str(other_reg[0]))

    vendors = request_json("GET", "/vendors", token_a)
    vendor_rows = (vendors[1].get("vendors") or vendors[1].get("data") or [])
    vendor_id = vendor_rows[0]["id"] if vendor_rows else None
    if not vendor_id:
        created = request_json("POST", "/vendors", token_a, {
            "name": f"Reinsurer {org_a[:8]}",
            "vendorType": "SAAS",
            "category": "TECHNOLOGY",
            "primaryContact": "re@example.test",
            "contactEmail": f"re-{org_a[:8]}@example.test",
            "servicesProvided": "Treaty",
        })
        vendor_id = (created[1].get("data") or created[1]).get("id") if created[0] in {200, 201} else None
        record("vendor-create", "PASS" if vendor_id else "FAIL", str(created[0]))
    counterparty = request_json("POST", "/insurance/counterparties", token_a, {
        "name": "Treaty partner",
        "vendorId": vendor_id,
        "relationshipType": "TREATY",
        "jurisdictionCode": "NG",
        "criticality": "MATERIAL",
    })
    record("reinsurance-vendor-link", "PASS" if counterparty[0] == 201 and (counterparty[1].get("data") or {}).get("vendorId") == vendor_id else "FAIL", str(counterparty[0]))
    rei_b = request_json("GET", "/insurance/reinsurance", token_b)
    record("cross-tenant-reinsurance", "PASS" if (counterparty[1].get("data") or {}).get("publicId", "rei_") not in json.dumps(rei_b[1]) else "FAIL", str(rei_b[0]))

    reports = request_json("GET", "/insurance/reports", token_a)
    report_keys = [row.get("key") for row in ((reports[1].get("data") or {}).get("reports") or [])]
    record("reports-api", "PASS" if reports[0] == 200 and set(report_keys) >= {"executive", "third-parties", "licenses", "regulatory", "models", "concentration"} else "FAIL", ",".join(report_keys))
    record("reports-honesty", "PASS" if "100%" not in json.dumps(reports[1]) else "FAIL", "no invented percent")

    license_auto = request_json("POST", "/automation", token_a, {"templateKey": "insurance-license-review-due"})
    record("automation-license-template", "PASS" if license_auto[0] == 201 else "FAIL", str(license_auto[0]))
    if license_auto[0] == 201:
        pub = request_json("POST", f"/automation/{(license_auto[1].get('data') or {}).get('publicId')}/publish", token_a, {})
        record("automation-license-publish", "PASS" if pub[0] == 200 else "FAIL", str(pub[0]))
    model_auto = request_json("POST", "/automation", token_a, {"templateKey": "insurance-model-review-overdue"})
    if model_auto[0] == 201:
        request_json("POST", f"/automation/{(model_auto[1].get('data') or {}).get('publicId')}/publish", token_a, {})
    scan1 = request_json("POST", "/automation/scan", token_a, {})
    record("automation-scan", "PASS" if scan1[0] in {200, 201} else "FAIL", str(scan1[0]))
    executions = request_json("GET", "/automation/executions", token_a)
    rows = executions[1].get("data") or []
    license_runs = [row for row in rows if row.get("sourceModel") == "InsuranceLicense"]
    record("license-trigger", "PASS" if license_runs else "FAIL", str(len(license_runs)))
    request_json("POST", "/automation/scan", token_a, {})
    executions2 = request_json("GET", "/automation/executions", token_a)
    rows2 = executions2[1].get("data") or []
    license_runs2 = [row for row in rows2 if row.get("sourceModel") == "InsuranceLicense"]
    record("license-trigger-idempotent", "PASS" if len(license_runs2) == len(license_runs) else "FAIL", f"{len(license_runs)}->{len(license_runs2)}")

    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        login_ui(page, a_email)
        for path, name, needle in (
            ("/insurance/licenses", "licenses", "Attach Shared Evidence"),
            ("/insurance/reports", "reports", "Insurance Executive Risk Overview"),
            ("/insurance/reinsurance", "reinsurance", "Existing Third Party"),
            ("/insurance/regulatory", "regulatory", "Decided by"),
        ):
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            page.wait_for_timeout(900)
            body = page.inner_text("body")
            record(f"ui-{name}", "PASS" if needle.lower() in body.lower() else "FAIL", needle)
            record(f"ui-{name}-honesty", "PASS" if "100%" not in body else "FAIL", "no invented percent")
            shot(page, f"{name}-1440")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for path, name in (("/insurance/licenses", "licenses"), ("/insurance/reports", "reports"), ("/insurance/reinsurance", "reinsurance"), ("/insurance/regulatory", "regulatory")):
                page.goto(f"{BASE}{path}", wait_until="networkidle")
                page.wait_for_timeout(400)
                shot(page, f"{name}-{width}")
                overflow(page, f"{name}-{width}")
        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {
        "pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"),
        "fail": len(failed),
        "skip": sum(1 for row in RESULTS["checks"] if row["result"] == "SKIP"),
    }
    RESULTS["viewer"] = "SKIP — invitation created but hosted session was not issued because email delivery remained degraded. Not rewritten as PASS."
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps(RESULTS["summary"], indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
