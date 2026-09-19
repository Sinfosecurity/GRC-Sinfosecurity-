#!/usr/bin/env python3
"""#12 Wave 3 hosted golden walk. Staging only. Does not weaken invitation auth."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-3"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "680b40f0593d9c8c1e8f9339aa03322267a6f898")
PASSWORD = "Wave3Host23Cx1"
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {
    "item": "#12",
    "wave": "3",
    "declaredPass": False,
    "productionTouched": False,
    "mainMerged": False,
    "wave4Started": False,
    "checks": [],
    "shots": [],
    "overflows": [],
    "sha": {},
}


def record(name: str, result: str, detail) -> None:
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


def shot(page, name: str) -> None:
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    width = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": width})
    record(f"overflow:{name}", "PASS" if width <= 1 else "FAIL", f"extra={width}")


def login(page, email: str) -> None:
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
    SHOTS.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {
        "api": health.get("gitSha"),
        "frontend": fe.get("gitSha"),
        "required": REQUIRED_SHA,
        "implementation": "7132c7e09de66bb6a6917d70eb7f9f4958006190",
        "environment": health.get("deploymentEnvironment"),
        "postgres": (health.get("checks") or {}).get("postgres", {}).get("status"),
        "malware": (health.get("checks") or {}).get("malware", {}).get("status"),
    }
    record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_SHA else "FAIL", health.get("gitSha"))
    record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_SHA else "FAIL", fe.get("gitSha"))
    record("postgres", "PASS" if RESULTS["sha"]["postgres"] == "up" else "FAIL", RESULTS["sha"]["postgres"])
    record("malware", "PASS" if RESULTS["sha"]["malware"] == "up" else "FAIL", RESULTS["sha"]["malware"])
    if health.get("gitSha") != REQUIRED_SHA or fe.get("gitSha") != REQUIRED_SHA:
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    stamp = int(time.time())
    email = f"wave3-lead-{stamp}@example.test"
    status, payload = request_json("POST", "/auth/signup", body={
        "email": email,
        "password": PASSWORD,
        "firstName": "Lea",
        "lastName": "Lead",
        "organizationName": f"Wave3 Hosted {stamp}",
        "country": "US",
    })
    if status not in {200, 201}:
        record("signup", "FAIL", status)
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)
    token = payload["data"]["token"]
    record("signup", "PASS", payload["data"]["user"]["organizationId"][:8])

    invite_status, invite = request_json("POST", "/users/invite", token, {
        "email": f"wave3-req-{stamp}@example.test",
        "role": "BUSINESS_OWNER",
        "firstName": "Pat",
        "lastName": "Requester",
    })
    invite_data = invite.get("data") or invite
    has_token = bool(invite_data.get("token") or invite_data.get("activationToken") or invite_data.get("activationUrl"))
    record("invite.requester", "PASS" if invite_status in {200, 201} else "FAIL", {
        "status": invite_status,
        "hasToken": has_token,
    })
    if has_token:
        record("requester.only.session", "FAIL", "Invite unexpectedly returned an activation secret. Stopped rather than using it.")
    else:
        record("requester.only.session", "SKIP", "Invite token was not returned after delivery=sent. Authentication was not weakened.")
        record("hosted.golden.populated", "SKIP", "Requester-only hosted login remains blocked. CI tprm-wave3-engagement-dd.integration.test.ts is the authoritative Microsoft Azure vs Professional Services proof.")
        record("hosted.4b.copy.mark-shared", "SKIP", "Requires a requester-created Engagement. CI preserves copy-not-sent and mark-shared.")
        record("hosted.vendor.session", "SKIP", "No hosted vendor activation token was obtained. Auth was not weakened.")

    denied = {}
    for path in (
        "/tprm/requester/home",
        "/tprm/requester/iras/not-a-real-ira",
    ):
        denied[f"GET {path}"] = request_json("GET", path, token)[0]
    denied["GET due-diligence as missing"] = request_json("GET", "/tprm/engagements/missing/due-diligence", token)[0]
    record("grc.denied.requester.apis", "PASS" if all(code in {403, 404} for code in denied.values()) else "FAIL", denied)
    record("grc.cannot.create.intake", "PASS" if request_json("POST", "/tprm/intakes", token, {
        "proposedThirdPartyName": "Microsoft Corporation",
        "proposedServiceName": "Azure Hosting",
        "businessPurpose": "Should fail. Requester owns intake.",
    })[0] == 403 else "FAIL", "Wave 1 persona lock preserved")

    vendor_dd = request_json("GET", "/tprm/engagements/missing/due-diligence", "vendor-session-not-valid")
    vendor_ira = request_json("GET", "/tprm/requester/iras/not-a-real-ira")
    vendor_tier = request_json("GET", "/tprm/engagements/missing/tier-review", "vendor-session-not-valid")
    record("vendor.denied.ira.tier.dd", "PASS" if all(code in {401, 403} for code in (vendor_dd[0], vendor_ira[0], vendor_tier[0])) else "FAIL", {
        "vendorDueDiligence": vendor_dd[0],
        "unauthIra": vendor_ira[0],
        "vendorTier": vendor_tier[0],
    })

    findings = request_json("GET", "/tprm/findings", token)
    record("finding.workspace.regression", "PASS" if findings[0] in {200, 404} else "FAIL", findings[0])
    assessments = request_json("GET", "/tprm/assessments/engagements", token)
    record("assessment.center.api", "PASS" if assessments[0] == 200 else "FAIL", assessments[0])
    insurance = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG"],
        "linesOfBusiness": ["MOTOR"],
        "activities": ["CLAIMS"],
        "dataHandled": ["POLICYHOLDER"],
    })
    record("insurance.regression", "PASS" if insurance[0] in {200, 201} else "FAIL", insurance[0])
    record("wave4.not.started", "PASS", "No residual-risk or finding-generation Wave 4 APIs were invoked.")

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except Exception:
            browser = playwright.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        login(page, email)
        page.goto(f"{BASE}/assessments", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "assessments-center-1440")
        record("assessment.center.ui", "PASS" if "assessment" in page.inner_text("body").lower() else "FAIL", page.url)

        page.goto(f"{BASE}/third-parties/engagements/missing/due-diligence", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "due-diligence-empty-1440")
        record("due.diligence.route", "PASS" if "due-diligence" in page.url or "due diligence" in page.inner_text("body").lower() else "FAIL", page.url)

        page.goto(f"{BASE}/third-parties/engagements/missing/assessment-review", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "assessment-review-empty-1440")
        record("specialist.review.route", "PASS" if "review" in page.inner_text("body").lower() else "FAIL", page.url)

        page.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "vendor-activate")
        vendor_body = page.inner_text("body").lower()
        record("vendor.activate.no.ira", "PASS" if "tier review" not in vendor_body and "don't know" not in vendor_body else "FAIL", page.url)

        page.goto(f"{BASE}/request", wait_until="networkidle")
        page.wait_for_timeout(600)
        record("grc.denied.request", "PASS" if "access denied" in page.inner_text("body").lower() else "FAIL", page.url)

        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for route, name in (
                ("/third-parties/engagements/missing/due-diligence", "due-diligence"),
                ("/assessments", "assessments"),
                ("/vendor-assessment", "vendor-activate"),
                ("/third-parties/engagements/missing/assessment-review", "assessment-review"),
            ):
                page.goto(f"{BASE}{route}", wait_until="networkidle")
                page.wait_for_timeout(350)
                shot(page, f"{name}-{width}")
                overflow(page, f"{name}-{width}")
        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {
        "pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"),
        "fail": len(failed),
        "skip": sum(1 for row in RESULTS["checks"] if row["result"] == "SKIP"),
    }
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps(RESULTS["summary"], indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
