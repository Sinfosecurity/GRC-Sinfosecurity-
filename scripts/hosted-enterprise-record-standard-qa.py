#!/usr/bin/env python3
"""Hosted Enterprise Record Standard walk. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "enterprise-record-standard"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "")
REQUIRED_API_SHA = os.environ.get("REQUIRED_API_SHA", "")
PASSWORD = "EntRecStd23Ax1"
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {"checks": [], "shots": [], "overflows": [], "sha": {}, "notes": []}


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
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload


def payload(body: dict) -> dict:
    data = body.get("data")
    return data if isinstance(data, dict) else body


def shot(page, name: str) -> None:
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    width = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": width})
    record(f"overflow:{name}", "PASS" if width <= 1 else "FAIL", f"extra={width}")


def login(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    email_box = page.get_by_label("Work email")
    if email_box.count():
        email_box.fill(email)
    else:
        page.fill("input[type='email'], input[name='email']", email)
    continue_btn = page.get_by_role("button", name="Continue")
    if continue_btn.count():
        continue_btn.click()
        page.wait_for_timeout(800)
    password_box = page.get_by_label("Password")
    if password_box.count():
        password_box.fill(PASSWORD)
    else:
        page.fill("input[type='password'], input[name='password']", PASSWORD)
    sign_in = page.get_by_role("button", name="Sign in")
    (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
    page.wait_for_timeout(2500)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha")}
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    if REQUIRED_API_SHA:
        record(
            "api-sha",
            "PASS" if str(health.get("gitSha") or "") == REQUIRED_API_SHA else "FAIL",
            str(health.get("gitSha")),
        )
    if REQUIRED_FRONTEND_SHA:
        record(
            "fe-sha",
            "PASS" if str(fe.get("gitSha") or "") == REQUIRED_FRONTEND_SHA else "FAIL",
            str(fe.get("gitSha")),
        )
    if (REQUIRED_API_SHA and health.get("gitSha") != REQUIRED_API_SHA) or (
        REQUIRED_FRONTEND_SHA and fe.get("gitSha") != REQUIRED_FRONTEND_SHA
    ):
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    email = f"ers-{int(time.time())}@example.test"
    status, signup = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": email,
            "password": PASSWORD,
            "firstName": "Eve",
            "lastName": "Record",
            "organizationName": f"Enterprise Record {int(time.time())}",
        },
    )
    token = payload(signup).get("token")
    record("signup", "PASS" if status < 300 and token else "FAIL", str(status))
    if not token:
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    vendor_status, vendor = request_json(
        "POST",
        "/vendors",
        token,
        {
            "name": "Unrated Proof Vendor",
            "vendorType": "SAAS",
            "category": "TECHNOLOGY",
            "primaryContact": "Proof Owner",
            "contactEmail": email,
            "servicesProvided": "Hosted honesty proof",
        },
    )
    vendor_body = payload(vendor)
    vendor_id = vendor_body.get("id")
    record(
        "vendor-create-unrated",
        "PASS" if vendor_status < 300 and vendor_body.get("tier") in (None, "UNRATED") else "FAIL",
        f"{vendor_status} {vendor_body.get('tier')}",
    )
    record(
        "vendor-no-fake-compliance",
        "PASS" if vendor_body.get("complianceScore") in (None, "") else "FAIL",
        str(vendor_body.get("complianceScore")),
    )

    finding_status, finding = request_json(
        "POST",
        f"/tprm/vendors/{vendor_id}/findings",
        token,
        {
            "title": "Privacy — Breach notification process not demonstrated",
            "description": "No. The submitted answer did not demonstrate a breach-notification process.",
            "severity": "HIGH",
            "category": "Privacy",
            "source": "INTERNAL_ASSESSMENT",
            "responsibility": "VENDOR",
        },
    )
    finding_id = payload(finding).get("id")
    record("finding-create", "PASS" if finding_status == 201 and finding_id else "FAIL", str(finding_status))
    workspace_status, workspace = request_json("GET", f"/tprm/findings/{finding_id}/workspace", token)
    workspace_text = json.dumps(workspace).lower()
    record("finding-workspace", "PASS" if workspace_status == 200 else "FAIL", str(workspace_status))
    record(
        "finding-no-evidence-honesty",
        "PASS" if "no supporting evidence is currently attached" in workspace_text and "control failed" not in workspace_text else "FAIL",
        "missing evidence is not control failed",
    )
    record(
        "finding-source-present",
        "PASS" if "source" in workspace_text and ("assessment" in workspace_text or "internal" in workspace_text) else "FAIL",
        "source snapshot",
    )

    activity_status, activity = request_json(
        "POST",
        "/privacy/activities",
        token,
        {
            "name": "Customer support transcript review",
            "description": "Support tickets reviewed for quality. Not an insurance claims process.",
            "jurisdictions": ["US-NY"],
        },
    )
    activity_id = payload(activity).get("publicId")
    record("privacy-activity-create", "PASS" if activity_status < 300 and activity_id else "FAIL", str(activity_status))
    if activity_id:
        request_json("POST", f"/privacy/activities/{activity_id}/purposes", token, {"name": "Quality review"})
        basis_status, basis = request_json(
            "POST",
            f"/privacy/activities/{activity_id}/basis",
            token,
            {
                "purposeName": "Quality review",
                "basisType": "LEGITIMATE_INTERESTS",
                "rationale": "Quality review of support tickets. Regime left undetermined.",
            },
        )
        recorded_regimes = [
            str(basis_row.get("regime") or "")
            for purpose in (payload(basis).get("purposes") or [])
            for basis_row in (purpose.get("bases") or [])
        ]
        record(
            "privacy-no-silent-gdpr",
            "PASS" if basis_status < 300 and recorded_regimes and all(regime not in {"GDPR", ""} for regime in recorded_regimes) else "FAIL",
            f"{basis_status} regimes={recorded_regimes}",
        )

    pages = [
        ("/vendor-management", "vendors"),
        ("/findings", "findings"),
        ("/assessments", "assessments"),
        ("/documents", "evidence"),
        ("/compliance", "compliance"),
        ("/decision-briefs", "decisions"),
        ("/risks", "risks"),
        ("/control-center", "controls"),
        ("/privacy-ops/activities", "privacy"),
        ("/ai-governance", "ai"),
    ]

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=True)
        except Exception:
            browser = pw.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        login(page, email)

        for path, name in pages:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            body = page.inner_text("body")
            record(f"open:{name}", "PASS" if body else "FAIL", path)
            if name == "vendors":
                record("honesty:not-rated", "PASS" if "Not rated" in body else "FAIL", "missing tier stays Not rated")
                lowered = body.lower()
                record(
                    "honesty:no-fake-compliance",
                    "PASS" if "compliance %" not in lowered and "compliance score" not in lowered else "FAIL",
                    "no invented compliance %",
                )
            if name == "findings":
                record(
                    "findings:distinguishable-title",
                    "PASS" if "breach notification" in body.lower() else "FAIL",
                    "generated title visible",
                )
            if name == "privacy":
                record(
                    "honesty:no-insurance-purpose-default",
                    "PASS" if "Claims servicing" not in body else "FAIL",
                    "no insurance purpose default on generic privacy",
                )
            shot(page, f"{name}-1440")

        if page.get_by_text("Privacy — Breach notification process not demonstrated").count():
            page.goto(f"{BASE}/findings", wait_until="domcontentloaded")
            page.wait_for_timeout(1000)
            page.get_by_text("Privacy — Breach notification process not demonstrated").first.click()
            page.wait_for_timeout(1200)
            drawer = page.inner_text("body").lower()
            record(
                "finding-drawer-memoryless",
                "PASS" if "no supporting evidence" in drawer or "source" in drawer else "FAIL",
                "drawer stands alone",
            )
            shot(page, "finding-drawer-1440")

        if activity_id:
            page.goto(f"{BASE}/privacy-ops/activities/{activity_id}", wait_until="domcontentloaded")
            page.wait_for_timeout(1200)
            privacy_body = page.inner_text("body")
            record(
                "privacy-detail-no-gdpr-default",
                "PASS" if "Not determined" in privacy_body or "NOT_DETERMINED" in privacy_body else "FAIL",
                "regime visible",
            )
            record(
                "privacy-detail-no-claims-default",
                "PASS" if "Claims servicing" not in privacy_body else "FAIL",
                "purpose is not insurance default",
            )
            shot(page, "privacy-detail-1440")

        for width in WIDTHS:
            height = 812 if width == 375 else 900 if width < 1440 else 1080 if width == 1920 else 900
            page.set_viewport_size({"width": width, "height": height})
            for path, name in (("/vendor-management", "vendors"), ("/findings", "findings")):
                page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
                page.wait_for_timeout(600)
                overflow(page, f"{name}-{width}")
                shot(page, f"{name}-{width}")
        browser.close()

    passed = sum(1 for row in RESULTS["checks"] if row["result"] == "PASS")
    failed = sum(1 for row in RESULTS["checks"] if row["result"] == "FAIL")
    RESULTS["summary"] = {"pass": passed, "fail": failed}
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    (OUT / "README.md").write_text(
        f"# Enterprise Record Standard hosted walk\n\nPASS {passed} / FAIL {failed}\n\nFE `{RESULTS['sha'].get('frontend')}` API `{RESULTS['sha'].get('api')}`\n"
    )
    print(json.dumps(RESULTS["summary"], indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
