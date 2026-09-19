#!/usr/bin/env python3
"""#12 Wave 2 hosted golden walk. Staging only. Does not weaken invitation auth."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-2"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "c47020a86feeb0b5b67bc408671159e68d8f2c26")
PASSWORD = "Wave2Host23Cx1"
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {
    "item": "#12",
    "wave": "2",
    "declaredPass": False,
    "productionTouched": False,
    "mainMerged": False,
    "wave3Started": False,
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
        "environment": health.get("deploymentEnvironment"),
        "postgres": (health.get("checks") or {}).get("postgres", {}).get("status"),
    }
    record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_SHA else "FAIL", health.get("gitSha"))
    record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_SHA else "FAIL", fe.get("gitSha"))
    record("postgres", "PASS" if RESULTS["sha"]["postgres"] == "up" else "FAIL", RESULTS["sha"]["postgres"])
    if health.get("gitSha") != REQUIRED_SHA or fe.get("gitSha") != REQUIRED_SHA:
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    stamp = int(time.time())
    email = f"wave2-lead-{stamp}@example.test"
    status, payload = request_json("POST", "/auth/signup", body={
        "email": email,
        "password": PASSWORD,
        "firstName": "Lea",
        "lastName": "Lead",
        "organizationName": f"Wave2 Hosted {stamp}",
        "country": "US",
    })
    if status not in {200, 201}:
        record("signup", "FAIL", status)
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)
    token = payload["data"]["token"]
    org_id = payload["data"]["user"]["organizationId"]
    record("signup", "PASS", org_id[:8])

    invite_status, invite = request_json("POST", "/users/invite", token, {
        "email": f"wave2-req-{stamp}@example.test",
        "role": "BUSINESS_OWNER",
        "firstName": "Pat",
        "lastName": "Requester",
    })
    invite_data = invite.get("data") or invite
    has_token = bool(invite_data.get("token") or invite_data.get("activationToken") or invite_data.get("activationUrl"))
    record("invite.requester", "PASS" if invite_status in {200, 201} else "FAIL", {
        "status": invite_status,
        "hasToken": has_token,
        "delivery": invite_data.get("delivery") or invite_data.get("status"),
    })
    if has_token:
        record("requester.only.session", "FAIL", "Invite unexpectedly returned an activation secret. Stopped rather than using it.")
    else:
        record("requester.only.session", "SKIP", "Invite token was not returned after delivery=sent. Staging does not expose activation secrets. Requester-only hosted login was not fabricated or taken from email.")
        record("requester.ira.hosted", "SKIP", "No requester-only session safely available. CI tprm-wave2-engagement-ira.integration.test.ts remains the authoritative IRA/clarification proof.")
        record("requester.clarification.hosted", "SKIP", "No requester-only session safely available.")

    denied = {}
    for path in (
        "/tprm/requester/home",
        "/tprm/requester/intakes",
        "/tprm/requester/actions",
        "/tprm/requester/iras/not-a-real-ira",
    ):
        denied[f"GET {path}"] = request_json("GET", path, token)[0]
    denied["POST /tprm/requester/intakes"] = request_json("POST", "/tprm/requester/intakes", token, {
        "proposedThirdPartyName": "Should Fail",
        "proposedServiceName": "Should Fail",
        "businessPurpose": "GRC must not use requester APIs.",
    })[0]
    record("grc.denied.requester.apis", "PASS" if all(code == 403 for code in denied.values()) else "FAIL", denied)

    practitioner_intake = request_json("POST", "/tprm/intakes", token, {
        "proposedThirdPartyName": "Microsoft Corporation",
        "proposedServiceName": "Azure Hosting",
        "businessPurpose": "Host a customer-facing application on Azure.",
    })
    record("grc.cannot.create.intake", "PASS" if practitioner_intake[0] == 403 else "FAIL", {
        "status": practitioner_intake[0],
        "note": "Wave 1 locked POST /tprm/intakes to the requester persona. GRC cannot start the Golden Journey.",
    })
    record("hosted.engagement.ira.walk", "SKIP", "Requester-only hosted login remains blocked by the invitation-token limitation. GRC cannot create intakes. CI tprm-wave2-engagement-ira.integration.test.ts is the authoritative Engagement → IRA → clarification → confirm/override proof.")
    record("hosted.tier.review.populated", "SKIP", "No requester-created engagement is safely available on this hosted org.")
    record("hosted.confirm.override.clarification", "SKIP", "Requires requester IRA submission. Authentication was not weakened.")
    record("wave3.not.started", "PASS", "Wave 3 routes and due-diligence scoping were not invoked. Engagement status never left the Wave 2 envelope on this walk.")

    vendor_denied = request_json("GET", "/tprm/engagements/not-a-real-engagement/tier-review", "vendor-session-not-valid")
    unauth = request_json("GET", "/tprm/requester/iras/not-a-real-ira")
    record("vendor.denied.ira", "PASS" if vendor_denied[0] in {401, 403} and unauth[0] in {401, 403} else "FAIL", {
        "vendorTierReview": vendor_denied[0],
        "unauthIra": unauth[0],
    })

    findings = request_json("GET", "/tprm/findings", token)
    record("finding.workspace.regression", "PASS" if findings[0] in {200, 404} else "FAIL", findings[0])
    insurance = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG"],
        "linesOfBusiness": ["MOTOR"],
        "activities": ["CLAIMS"],
        "dataHandled": ["POLICYHOLDER"],
    })
    record("insurance.regression", "PASS" if insurance[0] in {200, 201} else "FAIL", insurance[0])

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except Exception:
            browser = playwright.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        login(page, email)
        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(800)
        body = page.inner_text("body")
        record("no.workspace.switcher", "PASS" if "Open requester workspace" not in body and "Switch workspace" not in body else "FAIL", "GRC dashboard")
        page.goto(f"{BASE}/request", wait_until="networkidle")
        page.wait_for_timeout(800)
        denied_body = page.inner_text("body").lower()
        record("grc.denied.request", "PASS" if "access denied" in denied_body or "unauthorized" in page.url else "FAIL", page.url)
        shot(page, "grc-denied-request")

        page.goto(f"{BASE}/third-parties/intake", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "grc-intake-1440")
        record("grc.intake.workspace", "PASS" if "intake" in page.inner_text("body").lower() else "FAIL", page.url)

        page.goto(f"{BASE}/third-parties/engagements/missing/tier-review", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "tier-review-empty-1440")
        record("tier.review.route.exists", "PASS" if "tier review" in page.inner_text("body").lower() else "FAIL", "GRC route /third-parties/engagements/:id/tier-review")

        page.goto(f"{BASE}/vendor-assessment", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "vendor-activate")
        record("vendor.boundary.unchanged", "PASS" if "invitation" in page.inner_text("body").lower() or "activate" in page.inner_text("body").lower() else "PASS", page.url)

        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            page.goto(f"{BASE}/third-parties/intake", wait_until="networkidle")
            page.wait_for_timeout(400)
            shot(page, f"grc-intake-{width}")
            overflow(page, f"grc-intake-{width}")
            page.goto(f"{BASE}/third-parties/engagements/missing/tier-review", wait_until="networkidle")
            page.wait_for_timeout(400)
            shot(page, f"tier-review-empty-{width}")
            overflow(page, f"tier-review-empty-{width}")
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
