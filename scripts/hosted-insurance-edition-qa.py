#!/usr/bin/env python3
"""Hosted #23 Insurance Edition Phase A walk. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "insurance-edition"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_FRONTEND_SHA = os.environ.get("REQUIRED_FRONTEND_SHA", "6a8b0e1514172796e1f4aa9308262b2343274244")
REQUIRED_API_SHAS = {
    item
    for item in (
        os.environ.get("REQUIRED_API_SHA", "c096ecbb9f614e37e7d28ffd9d5fde7c89d065f2"),
        "c096ecbb9f614e37e7d28ffd9d5fde7c89d065f2",
        "6a8b0e1514172796e1f4aa9308262b2343274244",
    )
    if item
}
PASSWORD = "InsWalk23x1"
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


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {
        "api": health.get("gitSha"),
        "frontend": fe.get("gitSha"),
        "requiredFrontend": REQUIRED_FRONTEND_SHA,
        "requiredApi": sorted(REQUIRED_API_SHAS),
        "health": health_status,
        "note": "6a8b0e1 is frontend/CI-flake only. Insurance backend lives on c096ecb.",
    }
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    record("api-sha", "PASS" if health.get("gitSha") in REQUIRED_API_SHAS else "FAIL", str(health.get("gitSha")))
    record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_FRONTEND_SHA else "FAIL", str(fe.get("gitSha")))
    if health.get("gitSha") not in REQUIRED_API_SHAS or fe.get("gitSha") != REQUIRED_FRONTEND_SHA:
        RESULTS["notes"].append("Hosted SHA mismatch. Walk aborted so screenshots are not mixed with an older deploy.")
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(1)

    suffix = str(int(time.time()))
    email = f"ins23-admin-{suffix}@example.test"
    signup_status, signup = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": email,
            "password": PASSWORD,
            "firstName": "Ada",
            "lastName": "Insurance",
            "organizationName": f"Insurance Walk {suffix}",
        },
    )
    if signup_status not in {200, 201}:
        record("isolated-org", "FAIL", f"{signup_status}")
        raise SystemExit(1)
    token = signup["data"]["token"]
    org_id = signup["data"]["user"]["organizationId"]
    record("isolated-org", "PASS", org_id[:8])

    catalog_status, catalog = request_json("GET", "/insurance/catalog", token)
    record("catalog", "PASS" if catalog_status == 200 and "not applicable regulation" in json.dumps(catalog).lower() else "FAIL", str(catalog_status))
    record("nigeria-types", "PASS" if any(row.get("key") == "TAKAFUL_OPERATOR" for row in catalog.get("data", {}).get("organizationTypes", [])) else "FAIL", "catalog includes takaful")

    activate_status, activated = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG", "US"],
        "linesOfBusiness": ["MOTOR", "LIFE"],
        "activities": ["CLAIMS", "UNDERWRITING", "REINSURANCE"],
        "dataHandled": ["POLICYHOLDER"],
        "aiUsage": ["UNDERWRITING"],
        "thirdPartyEcosystem": ["TPA"],
        "recommendationDecisions": {"naicom-placeholder": "accepted", "nydfs-overlay": "rejected"},
    })
    record("activate", "PASS" if activate_status == 201 and activated.get("data", {}).get("version") == 1 else "FAIL", str(activate_status))
    packs = json.dumps(activated.get("data", {}).get("recommendedPacks"))
    record("honest-recommend", "PASS" if "Recommended based on your configuration" in packs and "nydfs-overlay" not in packs else "FAIL", "NYDFS not auto-applied")

    group_status, group = request_json("POST", "/insurance/entities", token, {
        "name": "Atlantic HoldCo",
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "isGroup": True,
        "linesOfBusiness": ["MOTOR"],
    })
    nigeria_status, nigeria = request_json("POST", "/insurance/entities", token, {
        "name": "Lagos Life",
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "linesOfBusiness": ["LIFE"],
        "parentEntityId": group.get("data", {}).get("id"),
    })
    us_status, united = request_json("POST", "/insurance/entities", token, {
        "name": "Ohio Casualty",
        "organizationType": "INSURER",
        "domicileCountryCode": "US",
        "domicileSubJurisdiction": "US-OTHER",
        "linesOfBusiness": ["CASUALTY"],
    })
    record("group-entity", "PASS" if group_status == 201 else "FAIL", str(group_status))
    record("nigeria-entity", "PASS" if nigeria_status == 201 else "FAIL", str(nigeria_status))
    record("us-entity", "PASS" if us_status == 201 else "FAIL", str(us_status))

    ng_lic_status, ng_lic = request_json("POST", "/insurance/licenses", token, {
        "entityPublicId": nigeria.get("data", {}).get("publicId"),
        "authorityKey": "NAICOM",
        "jurisdictionCode": "NG",
        "licenseType": "NG_INSURER",
        "reference": "placeholder-not-a-real-license",
        "status": "UNKNOWN",
    })
    us_lic_status, _ = request_json("POST", "/insurance/licenses", token, {
        "entityPublicId": united.get("data", {}).get("publicId"),
        "authorityKey": "US-STATE-DOI",
        "jurisdictionCode": "US-OTHER",
        "licenseType": "US_COA",
        "reference": "placeholder-state-hook",
        "status": "UNKNOWN",
    })
    record("nigeria-license", "PASS" if ng_lic_status == 201 and "Not a legal determination" in json.dumps(ng_lic) else "FAIL", str(ng_lic_status))
    record("us-license", "PASS" if us_lic_status == 201 else "FAIL", str(us_lic_status))

    graph_status, graph = request_json("GET", "/insurance/graph", token)
    nodes = json.dumps(graph)
    record("graph-nigeria", "PASS" if graph_status == 200 and "Lagos Life" in nodes and "NAICOM" in nodes else "FAIL", str(graph_status))
    record("graph-us", "PASS" if "Ohio Casualty" in nodes and "US-STATE-DOI" in nodes else "FAIL", "state regulator placeholder")
    record("graph-process", "PASS" if "CLAIMS" in nodes else "FAIL", "claims process node")

    revise_status, revised = request_json("POST", "/insurance/activate", token, {
        "organizationType": "INSURER",
        "domicileCountryCode": "NG",
        "operatingJurisdictions": ["NG", "US", "GB"],
        "linesOfBusiness": ["MOTOR", "LIFE", "CYBER"],
        "activities": ["CLAIMS", "UNDERWRITING"],
        "dataHandled": ["POLICYHOLDER"],
    })
    history_status, history = request_json("GET", "/insurance/configuration", token)
    versions = history.get("data", {}).get("history") or []
    record("revise", "PASS" if revise_status == 201 and revised.get("data", {}).get("version") == 2 else "FAIL", str(revise_status))
    record("history", "PASS" if history_status == 200 and any(row.get("version") == 1 and row.get("status") == "SUPERSEDED" for row in versions) else "FAIL", str(len(versions)))

    overview_status, overview = request_json("GET", "/insurance/overview", token)
    entity_count = ((overview.get("data") or {}).get("metrics") or {}).get("entities") or {}
    record("overview-live", "PASS" if overview_status == 200 and entity_count.get("value", 0) >= 3 else "FAIL", str(entity_count.get("value")))
    record("no-fake-percent", "PASS" if "100%" not in json.dumps(overview) else "FAIL", "no invented score")

    client_status, client = request_json("POST", "/developer/clients", token, {"name": "Ins read", "scopes": ["insurance:read"]})
    public_token = (client.get("data") or {}).get("token")
    pub_status, _ = request_json("GET", "/insurance/configuration", public_token, prefix="/public/v1")
    session_denied, _ = request_json("GET", "/insurance/overview", public_token)
    record("public-read", "PASS" if client_status == 201 and pub_status == 200 else "FAIL", str(pub_status))
    record("public-not-session", "PASS" if session_denied in {401, 403} else "FAIL", str(session_denied))

    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
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
        page.goto(f"{BASE}/insurance", wait_until="networkidle")
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        record("ui-honesty", "PASS" if "Recommended" in body and "not required" in body.lower() or "not applicable" in body.lower() else "FAIL", "honesty copy")
        record("ui-no-100", "PASS" if "100%" not in body else "FAIL", "no fake KPI")
        shot(page, "overview-1440")
        for path, name in (
            ("/insurance/entities", "entities"),
            ("/insurance/licenses", "licenses"),
            ("/insurance/risk", "risk"),
            ("/insurance/third-parties", "third-parties"),
            ("/insurance/ai", "ai"),
            ("/insurance/configuration", "configuration"),
        ):
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            page.wait_for_timeout(800)
            shot(page, f"{name}-1440")
            if name == "entities":
                record("ui-entities", "PASS" if "Lagos Life" in page.inner_text("body") and "Ohio Casualty" in page.inner_text("body") else "FAIL", "NG+US visible")
            if name == "configuration":
                record("ui-history", "PASS" if "SUPERSEDED" in page.inner_text("body") else "FAIL", "version 1 retained")
            if name == "risk":
                record("ui-not-second-register", "PASS" if "not a second register" in page.inner_text("body").lower() else "FAIL", "contextual risk")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(800)
        record("hard-refresh", "PASS" if "SUPERSEDED" in page.inner_text("body") else "FAIL", "history after refresh")
        shot(page, "configuration-refresh-1440")

        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for path, name in (("/insurance", "overview"), ("/insurance/entities", "entities"), ("/insurance/licenses", "licenses"), ("/insurance/configuration", "configuration")):
                page.goto(f"{BASE}{path}", wait_until="networkidle")
                page.wait_for_timeout(400)
                shot(page, f"{name}-{width}")
                overflow(page, f"{name}-{width}")
        browser.close()

    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {
        "pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"),
        "fail": len(failed),
        "org": org_id,
        "email": email,
    }
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps(RESULTS["summary"], indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
