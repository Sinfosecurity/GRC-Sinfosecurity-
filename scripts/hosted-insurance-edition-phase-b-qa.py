#!/usr/bin/env python3
"""Hosted #23 Insurance Edition Phase B walk. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "insurance-edition" / "phase-b"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "")
REQUIRED_API_SHA = os.environ.get("REQUIRED_API_SHA", "")
PASSWORD = "InsWalk23Bx1"
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
            payload = json.loads(raw) if raw else {}
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload


def shot(page, name: str) -> None:
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
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


def signup(suffix: str, name: str):
    email = f"ins23b-{suffix}-{int(time.time())}@example.test"
    status, payload = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": email,
            "password": PASSWORD,
            "firstName": "Ada",
            "lastName": "Insurance",
            "organizationName": name,
        },
    )
    return status, payload, email


def recommend_keys(token: str, organization_type: str, country: str, sub: str | None = None):
    status, payload = request_json("POST", "/insurance/recommend", token, {
        "organizationType": organization_type,
        "domicileCountryCode": country,
        "operatingJurisdictions": [sub or country],
        "activities": ["CLAIMS"],
    })
    packs = [row.get("key") for row in ((payload.get("data") or {}).get("packs") or [])]
    return status, packs


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

    suffix = str(int(time.time()))
    ng_status, ng_signup, ng_email = signup(f"ng-{suffix}", f"NG Insurer Walk {suffix}")
    if ng_status not in {200, 201}:
        record("isolated-org", "FAIL", str(ng_status))
        raise SystemExit(1)
    token = ng_signup["data"]["token"]
    record("isolated-org", "PASS", ng_signup["data"]["user"]["organizationId"][:8])

    activate_status, _ = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG"],
        "linesOfBusiness": ["MOTOR"],
        "activities": ["CLAIMS", "UNDERWRITING", "REINSURANCE"],
        "dataHandled": ["POLICYHOLDER"],
    })
    record("activate-ng-insurer", "PASS" if activate_status == 201 else "FAIL", str(activate_status))

    _, insurer_packs = recommend_keys(token, "INSURER", "NG")
    _, broker_packs = recommend_keys(token, "BROKER", "NG")
    _, adjuster_packs = recommend_keys(token, "LOSS_ADJUSTER", "NG")
    _, ohio_packs = recommend_keys(token, "INSURER", "US", "US-OH")
    _, ny_packs = recommend_keys(token, "INSURER", "US", "US-NY")
    record("ng-insurer-pack", "PASS" if "ng-insurer-core" in insurer_packs and "ng-broker-core" not in insurer_packs else "FAIL", ",".join(insurer_packs))
    record("ng-broker-pack", "PASS" if "ng-broker-core" in broker_packs and "ng-insurer-core" not in broker_packs else "FAIL", ",".join(broker_packs))
    record("ng-adjuster-pack", "PASS" if "ng-loss-adjuster-core" in adjuster_packs and "ng-insurer-core" not in adjuster_packs else "FAIL", ",".join(adjuster_packs))
    record("us-non-ny", "PASS" if "us-base" in ohio_packs and "nydfs-500" not in ohio_packs else "FAIL", ",".join(ohio_packs))
    record("us-ny-overlay", "PASS" if "nydfs-500" in ny_packs else "FAIL", ",".join(ny_packs))

    reviewed = request_json("POST", "/insurance/regulatory/applicability", token, {
        "packKey": "nydfs-500",
        "state": "NOT_APPLICABLE",
        "reason": "Nigeria insurer scenario. New York is not recorded.",
    })
    record("applicability-review", "PASS" if reviewed[0] == 201 else "FAIL", str(reviewed[0]))

    entity = request_json("POST", "/insurance/entities", token, {
        "name": "Lagos Motor",
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "linesOfBusiness": ["MOTOR"],
    })
    record("entity", "PASS" if entity[0] == 201 else "FAIL", str(entity[0]))
    license_status, license = request_json("POST", "/insurance/licenses", token, {
        "entityPublicId": (entity[1].get("data") or {}).get("publicId"),
        "authorityKey": "NAICOM",
        "jurisdictionCode": "NG",
        "licenseType": "NG_INSURER",
        "status": "EXPIRED",
        "expiryDate": "2020-01-01",
        "verificationBasis": "CUSTOMER_RECORDED",
    })
    attention = request_json("GET", "/insurance/license-attention", token)
    message = json.dumps(attention[1])
    record("license-honesty", "PASS" if license_status == 201 and "not a finding that the entity is operating illegally" in message.lower() else "FAIL", str(license_status))

    regulatory = request_json("GET", "/insurance/regulatory", token)
    record("regulatory-provenance", "PASS" if "naicom.gov.ng" in json.dumps(regulatory[1]).lower() else "FAIL", str(regulatory[0]))
    reports = request_json("GET", "/insurance/reports", token)
    report_keys = [row.get("key") for row in ((reports[1].get("data") or {}).get("reports") or [])]
    record("reports", "PASS" if reports[0] == 200 and set(report_keys) >= {"executive", "licenses", "regulatory", "concentration"} else "FAIL", ",".join(report_keys))
    record("no-fake-percent", "PASS" if "100%" not in json.dumps(reports[1]) else "FAIL", "no invented score")

    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.get_by_label("Work email").fill(ng_email)
        continue_btn = page.get_by_role("button", name="Continue")
        if continue_btn.count():
            continue_btn.click()
            page.wait_for_timeout(800)
        if page.get_by_label("Password").count():
            page.get_by_label("Password").fill(PASSWORD)
        sign_in = page.get_by_role("button", name="Sign in")
        (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
        page.wait_for_timeout(2500)
        for path, name in (
            ("/insurance", "overview"),
            ("/insurance/entities", "entities"),
            ("/insurance/licenses", "licenses"),
            ("/insurance/regulatory", "regulatory"),
            ("/insurance/claims", "claims"),
            ("/insurance/underwriting", "underwriting"),
            ("/insurance/reinsurance", "reinsurance"),
            ("/insurance/ai", "ai"),
            ("/insurance/configuration", "configuration"),
        ):
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            page.wait_for_timeout(800)
            shot(page, f"{name}-1440")
            if name == "regulatory":
                record("ui-regulatory", "PASS" if "Recommended is not applicable" in page.inner_text("body") or "human" in page.inner_text("body").lower() else "FAIL", "applicability honesty")
            if name == "claims":
                record("ui-claims", "PASS" if "not a claims-processing system" in page.inner_text("body").lower() else "FAIL", "claims honesty")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for path, name in (("/insurance", "overview"), ("/insurance/regulatory", "regulatory"), ("/insurance/claims", "claims"), ("/insurance/configuration", "configuration")):
                page.goto(f"{BASE}{path}", wait_until="networkidle")
                page.wait_for_timeout(400)
                shot(page, f"{name}-{width}")
                overflow(page, f"{name}-{width}")
        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {"pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"), "fail": len(failed)}
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps(RESULTS["summary"], indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
