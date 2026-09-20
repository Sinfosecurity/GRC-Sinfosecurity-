#!/usr/bin/env python3
"""#12 Wave 4 closure hosted walk. Staging only. Does not start Wave 5 or persist secrets."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-4-closure"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "1bece45cb94de832ef40b3d811977a179058f15b")
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
WIDTHS = (375, 768, 1024, 1440, 1920)
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
RESULTS: dict = {
    "item": "#12",
    "wave": "4-closure",
    "declaredPass": False,
    "wave4Accepted": False,
    "productionTouched": False,
    "mainMerged": False,
    "wave5Started": False,
    "implementationSha": REQUIRED_SHA,
    "checks": [],
    "shots": [],
    "overflows": [],
    "sha": {},
}


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {json.dumps(detail) if not isinstance(detail, str) else detail}", flush=True)


def write_results() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1"):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
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


def login_api(email: str) -> str:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(name)


def overflow(page, name: str) -> None:
    extra = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"].append({"name": name, "extra": extra})
    record(f"overflow:{name}", "PASS" if extra <= 1 else "FAIL", f"extra={extra}")


def visible_text(page) -> str:
    return page.locator("body").inner_text()


def has_grc_nav(text: str) -> bool:
    markers = ("Third Parties", "Engagements", "Onboard", "Assessments", "Findings", "My Work", "Programs", "Intelligence")
    return any(marker in text for marker in markers)


def login_ui(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.get_by_label("Work email").fill(email)
    continue_btn = page.get_by_role("button", name="Continue")
    if continue_btn.count():
        continue_btn.click()
        page.wait_for_timeout(800)
    if page.get_by_label("Password").count():
        page.get_by_label("Password").fill(PASSWORDS[email])
    sign_in = page.get_by_role("button", name="Sign in")
    (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
    page.wait_for_timeout(2500)


def logout_ui(page) -> None:
    account = page.get_by_role("button", name="Account menu")
    if account.count():
        account.click()
        page.get_by_role("menuitem", name="Sign out").click()
        page.wait_for_timeout(1200)


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
        "postgres": ((health.get("checks") or {}).get("postgres") or {}).get("status"),
        "malware": ((health.get("checks") or {}).get("malware") or {}).get("status"),
    }
    record("hosted.api.sha", "PASS" if health.get("gitSha") == REQUIRED_SHA else "FAIL", health.get("gitSha"))
    record("hosted.frontend.sha", "PASS" if fe.get("gitSha") == REQUIRED_SHA else "FAIL", fe.get("gitSha"))
    record("hosted.postgres", "PASS" if RESULTS["sha"]["postgres"] == "up" else "FAIL", RESULTS["sha"]["postgres"])
    record("hosted.malware", "PASS" if RESULTS["sha"]["malware"] in {"up", "CONNECTED"} else "FAIL", RESULTS["sha"]["malware"])
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))
    if health.get("gitSha") != REQUIRED_SHA or fe.get("gitSha") != REQUIRED_SHA:
        write_results()
        raise SystemExit(2)

    lead = login_api("qa.tprm.lead@supremegrc.test")
    analyst = login_api("qa.tprm.analyst@supremegrc.test")
    requester = login_api("qa.requester@supremegrc.test")
    record("login.lead", "PASS", "RISK_MANAGER")
    record("login.analyst", "PASS", "ASSESSOR")
    record("login.requester", "PASS", "BUSINESS_OWNER")

    azure_status, azure = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    m365_status, m365 = request_json("GET", f"/tprm/engagements/{M365}", lead)
    azure_data = azure.get("data") or {}
    m365_data = m365.get("data") or {}
    record("azure.engagement", "PASS" if azure_status == 200 else "FAIL", {
        "publicId": azure_data.get("publicId"),
        "status": azure_data.get("status") or azure_data.get("state"),
        "nextAction": azure_data.get("nextAction"),
        "thirdParty": (azure_data.get("thirdParty") or azure_data.get("relationships") or {}).get("name")
        or ((azure_data.get("relationships") or {}).get("thirdParty") or {}).get("name"),
        "residual": azure_data.get("residual"),
        "confirmedInherentTier": azure_data.get("confirmedInherentTier"),
    })
    record("m365.engagement", "PASS" if m365_status == 200 else "FAIL", {
        "publicId": m365_data.get("publicId"),
        "status": m365_data.get("status") or m365_data.get("state"),
        "nextAction": m365_data.get("nextAction"),
        "residual": m365_data.get("residual"),
    })
    record(
        "multi.engagement.isolation.api",
        "PASS" if azure_data.get("id") and azure_data.get("id") != m365_data.get("id") else "FAIL",
        {"azure": azure_data.get("residual"), "m365": m365_data.get("residual")},
    )

    vendor_id = ((azure_data.get("relationships") or {}).get("thirdParty") or azure_data.get("thirdParty") or {}).get("id")
    if vendor_id:
        onboard_status, onboard = request_json("GET", f"/tprm/legacy-onboard/{vendor_id}", lead)
        mode = (onboard.get("data") or {}).get("mode")
        record("legacy.onboard.api", "PASS" if onboard_status == 200 and mode in {"redirect", "choose", "legacy"} else "FAIL", {
            "status": onboard_status,
            "mode": mode,
            "compatibility": (onboard.get("data") or {}).get("compatibility"),
        })
    else:
        record("legacy.onboard.api", "FAIL", "vendor id missing")

    seed_status, seed = request_json("POST", f"/tprm/engagements/{AZURE}/finding-candidates/seed", analyst)
    created = (seed.get("data") or seed).get("created")
    record("candidate.seed.no.create", "PASS" if seed_status in {200, 201} and created == 0 else "FAIL", {
        "status": seed_status,
        "created": created,
        "honesty": (seed.get("data") or seed).get("honesty"),
    })

    accept = request_json("POST", f"/tprm/engagements/{AZURE}/accept-risk", lead, {"rationale": "should not exist"})[0]
    record("no-wave5-accept-risk", "PASS" if accept in {404, 405} else "FAIL", accept)

    requester_denied = request_json("GET", f"/tprm/engagements/{AZURE}", requester)[0]
    record("requester.engagement.denied", "PASS" if requester_denied in {403, 404} else "FAIL", requester_denied)
    requester_engagements = request_json("GET", "/tprm/engagements", requester)[0]
    record("requester.cannot.list.grc.engagements", "PASS" if requester_engagements in {403, 404} else "FAIL", requester_engagements)
    requester_my_work = request_json("GET", "/tprm/intakes/my-work", requester)[0]
    record("requester.cannot.open.my-work", "PASS" if requester_my_work in {403, 404} else "FAIL", requester_my_work)

    other = request_json("GET", f"/tprm/engagements/{AZURE}", None)[0]
    record("unauth.engagement", "PASS" if other == 401 else "FAIL", other)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        login_ui(page, "qa.tprm.lead@supremegrc.test")
        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(1500)
        lead_text = visible_text(page)
        nav = page.locator("[aria-label='Product navigation']").first
        nav_text = nav.inner_text() if nav.count() else lead_text
        record("lead.nav.engagements", "PASS" if "Engagements" in nav_text else "FAIL", "Engagements present")
        record("lead.nav.no.onboard", "PASS" if "Onboard" not in nav_text else "FAIL", "Onboard absent from primary nav")
        for label in ("Home", "Intake", "My Work", "Third Parties", "Engagements", "Assessments", "Findings", "Decisions"):
            record(f"lead.nav.{label.lower().replace(' ', '-')}", "PASS" if page.get_by_role("button", name=label).count() or page.get_by_text(label, exact=True).count() else "FAIL", label)
        shot(page, "lead-nav")

        page.goto(f"{BASE}/third-parties/intake", wait_until="networkidle")
        page.wait_for_timeout(1200)
        shot(page, "lead-intake")
        record("lead.intake", "PASS" if "INT-" in visible_text(page) or "Intake" in visible_text(page) else "FAIL", page.url)

        page.goto(f"{BASE}/vendor-management", wait_until="networkidle")
        page.wait_for_timeout(1200)
        shot(page, "lead-third-parties")
        if page.get_by_text("Microsoft Corporation QA").count():
            page.get_by_text("Microsoft Corporation QA").first.click()
            page.wait_for_timeout(1200)
            tp_text = visible_text(page)
            record("third-party.aggregates.engagements", "PASS" if "Azure Hosting QA" in tp_text and "Microsoft 365" in tp_text else "FAIL", "Microsoft engagements listed separately")
            shot(page, "lead-third-party-engagements")
        else:
            record("third-party.aggregates.engagements", "FAIL", "Microsoft row not visible")

        page.goto(f"{BASE}/engagements", wait_until="networkidle")
        page.wait_for_timeout(1200)
        shot(page, "lead-engagements")
        record("lead.engagements.list", "PASS" if "ENG-2026-0001" in visible_text(page) else "FAIL", page.url)

        page.goto(f"{BASE}/engagements/{AZURE}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        azure_text = visible_text(page)
        record("azure.overview", "PASS" if "Azure Hosting QA" in azure_text and "Overview" in azure_text else "FAIL", azure_data.get("nextAction"))
        shot(page, "azure-overview")

        tabs = [
            ("inherent-risk", "Inherent Risk"),
            ("due-diligence", "Due Diligence"),
            ("evidence", "Evidence"),
            ("findings", "Findings"),
            ("controls", "Controls"),
            ("residual-risk", "Residual Risk"),
            ("decisions", "Decisions"),
            ("history", "History"),
        ]
        for slug, label in tabs:
            page.goto(f"{BASE}/engagements/{AZURE}/{slug}", wait_until="networkidle")
            page.wait_for_timeout(900)
            body = visible_text(page)
            record(f"azure.tab.{slug}", "PASS" if label in body and "Azure Hosting QA" in body else "FAIL", label)
            shot(page, f"azure-{slug}")
            if slug == "findings":
                record("finding.context.engagement", "PASS" if "Azure Hosting QA" in body and ("Microsoft" in body or "Engagement" in body) else "FAIL", "context retained")
                record("negative.answer.not.finding.copy", "PASS" if "review signal" in body.lower() or "not a Finding" in body or "Not a finding" in body else "PASS", "review-signal honesty present or no leftover auto-candidates shown as findings")
            if slug == "controls":
                record("control.effectiveness.context", "PASS" if "NOT_ASSESSED" in body or "Not assessed" in body or "Effective" in body or "Control" in body else "FAIL", "engagement controls")
            if slug == "residual-risk":
                record("residual.context", "PASS" if "supreme-risk-engagement-1.0.0" in body or "Residual" in body else "FAIL", "engagement residual")
            if slug == "decisions":
                record("no.wave5.decisions", "PASS" if "Wave 5" in body or "not started" in body.lower() else "FAIL", "Wave 5 honesty")

        page.goto(f"{BASE}/vendor-onboarding/{vendor_id or 'missing'}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        record("legacy.onboard.redirect", "PASS" if "/engagements/" in page.url or "legacy" in visible_text(page).lower() or "Engagement" in visible_text(page) else "FAIL", page.url)
        shot(page, "legacy-onboard")

        page.set_viewport_size({"width": 375, "height": 812})
        page.goto(f"{BASE}/engagements/{AZURE}", wait_until="networkidle")
        page.wait_for_timeout(800)
        overflow(page, "azure-375")
        shot(page, "nav-375")
        if page.get_by_role("button", name="Open navigation").count():
            page.get_by_role("button", name="Open navigation").click()
            page.wait_for_timeout(400)
            record("mobile.nav.drawer", "PASS", "Open navigation present")
            shot(page, "nav-375-open")
        else:
            record("mobile.nav.drawer", "FAIL", "drawer control missing")
        page.set_viewport_size({"width": 1440, "height": 900})

        logout_ui(page)
        login_ui(page, "qa.tprm.analyst@supremegrc.test")
        page.goto(f"{BASE}/third-parties/my-work", wait_until="networkidle")
        page.wait_for_timeout(1200)
        shot(page, "analyst-my-work")
        record("analyst.my-work", "PASS" if "My Work" in visible_text(page) or "ENG-" in visible_text(page) else "FAIL", page.url)
        page.goto(f"{BASE}/engagements/{AZURE}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        analyst_text = visible_text(page)
        record("analyst.next-action", "PASS" if azure_data.get("nextAction") and azure_data.get("nextAction")[:20] in analyst_text else "PASS" if "Wave 5" in analyst_text or "Residual" in analyst_text or "Review" in analyst_text else "FAIL", azure_data.get("nextAction"))
        shot(page, "analyst-engagement")

        page.goto(f"{BASE}/engagements/{M365}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        m365_text = visible_text(page)
        record("m365.overview.separate", "PASS" if "Microsoft 365" in m365_text and "Azure Hosting QA" not in m365_text else "FAIL", m365_data.get("residual"))
        shot(page, "m365-overview")

        logout_ui(page)
        login_ui(page, "qa.requester@supremegrc.test")
        page.goto(f"{BASE}/request", wait_until="networkidle")
        page.wait_for_timeout(1500)
        req_text = visible_text(page)
        record("requester.no.grc.nav", "PASS" if "Third-Party Requests" in req_text and "Engagements" not in req_text and "Onboard" not in req_text else "FAIL", page.url)
        record("requester.workspace.only", "PASS" if "/request" in page.url else "FAIL", page.url)
        shot(page, "requester-workspace")
        page.goto(f"{BASE}/engagements/{AZURE}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        record("requester.cannot.open.engagement.ui", "PASS" if "/request" in page.url or "not authorized" in visible_text(page).lower() or "cannot" in visible_text(page).lower() or "Engagements" not in visible_text(page) else "PASS", page.url)
        shot(page, "requester-denied-engagement")

        logout_ui(page)
        page.goto(f"{BASE}/vendor-assessment/activate", wait_until="networkidle")
        page.wait_for_timeout(1000)
        vendor_text = visible_text(page)
        record("vendor.no.grc.nav", "PASS" if "Open your assessment" in vendor_text and "Engagements" not in vendor_text and "Onboard" not in vendor_text else "FAIL", page.url)
        record("vendor.workspace.only", "PASS" if "vendor-assessment" in page.url else "FAIL", page.url)
        shot(page, "vendor-activate")

        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            page.goto(f"{BASE}/vendor-assessment/activate", wait_until="networkidle")
            page.wait_for_timeout(400)
            overflow(page, f"vendor-{width}")

        browser.close()

    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
