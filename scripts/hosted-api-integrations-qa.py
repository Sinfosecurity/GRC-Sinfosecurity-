#!/usr/bin/env python3
"""Hosted #22 API / webhooks / integrations walk. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "api-integrations"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "")
RESULTS: dict = {"checks": [], "shots": [], "axe": [], "sha": {}, "notes": []}
WIDTHS = (375, 768, 1024, 1440, 1920)


def record(name: str, result: str, detail: str) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail}", flush=True)


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1", extra_headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            if not raw:
                return resp.status, {}, dict(resp.headers)
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {"raw": raw.decode("utf-8", "replace")[:500]}
            return resp.status, payload, dict(resp.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload, dict(exc.headers)


def login(email: str, password: str):
    status, payload, _ = request_json("POST", "/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise RuntimeError(f"login failed {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def shot(page, name: str) -> None:
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(name)


def axe(page, name: str) -> None:
    if not AXE_PATH.exists():
        RESULTS["axe"].append({"name": name, "skipped": True})
        return
    try:
        page.add_script_tag(path=str(AXE_PATH))
    except Exception as exc:
        RESULTS["axe"].append({"name": name, "skipped": True, "reason": str(exc)[:180]})
        record(f"axe:{name}", "SKIP", "CSP blocked inline axe")
        return
    result = page.evaluate(
        """async () => {
            const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
            return {
                violations: out.violations.map((row) => ({
                    id: row.id,
                    impact: row.impact,
                    help: row.help,
                    nodes: row.nodes.length,
                })),
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in {"serious", "critical"}]
    RESULTS["axe"].append({"name": name, **result, "serious": len(serious)})
    record(f"axe:{name}", "PASS" if not serious else "FAIL", f"serious/critical={len(serious)}")


def launch_browser(playwright):
    try:
        return playwright.chromium.launch(headless=True)
    except Exception:
        return playwright.chromium.launch(headless=True, channel="chrome")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health, _ = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "required": REQUIRED_SHA, "health": health_status}
    record("api-health", "PASS" if health_status == 200 else "FAIL", str(health_status))
    if REQUIRED_SHA:
        record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_SHA else "FAIL", str(health.get("gitSha")))
        record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_SHA else "FAIL", str(fe.get("gitSha")))

    docs_status, _, _ = request_json("GET", "/docs", prefix="/public/v1")
    spec_status, spec, _ = request_json("GET", "/openapi.json", prefix="/public/v1")
    record("public-docs", "PASS" if docs_status == 200 else "FAIL", str(docs_status))
    record("public-openapi", "PASS" if spec_status == 200 and "/vendors" in json.dumps(spec) and "/platform" not in json.dumps(spec) else "FAIL", str(spec_status))

    suffix = str(int(time.time()))
    signup_status, signup, _ = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": f"api22-admin-{suffix}@example.test",
            "password": "ApiWalk22x1",
            "firstName": "Ada",
            "lastName": "Api",
            "organizationName": f"API Walk {suffix}",
        },
    )
    if signup_status not in {200, 201}:
        record("isolated-org", "FAIL", f"{signup_status}")
        raise SystemExit(1)
    walk_token = signup["data"]["token"]
    walk_org = signup["data"]["user"]["organizationId"]
    record("isolated-org", "PASS", walk_org[:8])

    other_status, other, _ = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": f"api22-other-{suffix}@example.test",
            "password": "ApiWalk22x1",
            "firstName": "Bea",
            "lastName": "Api",
            "organizationName": f"API Other {suffix}",
        },
    )
    other_token = other["data"]["token"] if other_status in {200, 201} else None
    record("second-org", "PASS" if other_token else "FAIL", str(other_status))

    created_status, created, _ = request_json("POST", "/developer/clients", walk_token, {"name": "Walk reader", "scopes": ["vendors:read"]})
    writer_status, writer, _ = request_json("POST", "/developer/clients", walk_token, {"name": "Walk writer", "scopes": ["vendors:read", "vendors:write"]})
    record("api-client-create", "PASS" if created_status == 201 and created.get("data", {}).get("token", "").startswith("srk_") else "FAIL", str(created_status))
    listed_status, listed, _ = request_json("GET", "/developer/clients", walk_token)
    listed_blob = json.dumps(listed)
    record("secret-not-relisted", "PASS" if created.get("data", {}).get("token") not in listed_blob else "FAIL", str(listed_status))

    reader = created["data"]["token"]
    writer_token = writer["data"]["token"]
    denied_status, _, _ = request_json("POST", "/vendors", reader, {"name": f"Denied {suffix}"}, prefix="/public/v1")
    record("missing-scope-403", "PASS" if denied_status == 403 else "FAIL", str(denied_status))

    vendor_status, vendor, _ = request_json(
        "POST",
        "/vendors",
        writer_token,
        {"name": f"Public Vendor {suffix}", "contactEmail": f"vendor-{suffix}@example.test", "primaryContact": "Pat", "servicesProvided": "API walk"},
        prefix="/public/v1",
        extra_headers={"Idempotency-Key": f"walk-{suffix}"},
    )
    record("vendor-create-201", "PASS" if vendor_status == 201 else "FAIL", str(vendor_status))
    retry_status, retry, _ = request_json(
        "POST",
        "/vendors",
        writer_token,
        {"name": f"Public Vendor {suffix} again"},
        prefix="/public/v1",
        extra_headers={"Idempotency-Key": f"walk-{suffix}"},
    )
    record("idempotency", "PASS" if retry_status == 201 and retry.get("data", {}).get("id") == vendor.get("data", {}).get("id") else "FAIL", str(retry_status))

    if other_token:
        other_client_status, other_client, _ = request_json("POST", "/developer/clients", other_token, {"name": "Other reader", "scopes": ["vendors:read"]})
        cross_status, _, _ = request_json("GET", f"/vendors/{vendor.get('data', {}).get('id')}", other_client.get("data", {}).get("token"), prefix="/public/v1")
        record("cross-tenant-404", "PASS" if other_client_status == 201 and cross_status == 404 else "FAIL", str(cross_status))

    request_json("POST", f"/developer/clients/{created['data']['id']}/revoke", walk_token, {})
    revoked_status, _, _ = request_json("GET", "/vendors", reader, prefix="/public/v1")
    record("revoked-401", "PASS" if revoked_status == 401 else "FAIL", str(revoked_status))

    overview_status, overview, _ = request_json("GET", "/developer/overview", walk_token)
    sink = (overview.get("data") or {}).get("sinkUrl") or f"{API}/public/v1/webhook-sink/{walk_org[:8]}"
    record("overview", "PASS" if overview_status == 200 else "FAIL", str(overview_status))

    hook_status, hook, _ = request_json("POST", "/developer/webhooks", walk_token, {
        "name": "Staging sink",
        "url": sink,
        "events": ["third_party.created", "third_party.updated"],
    })
    record("webhook-create", "PASS" if hook_status == 201 and str(hook.get("data", {}).get("secret", "")).startswith("whsec_") else "FAIL", str(hook_status))
    hook_id = hook.get("data", {}).get("id")
    listed_hooks_status, listed_hooks, _ = request_json("GET", "/developer/webhooks", walk_token)
    record("webhook-secret-not-relisted", "PASS" if hook.get("data", {}).get("secret") not in json.dumps(listed_hooks) else "FAIL", str(listed_hooks_status))

    vendor2_status, vendor2, _ = request_json(
        "POST",
        "/vendors",
        writer_token,
        {"name": f"Webhook Vendor {suffix}", "contactEmail": f"hook-{suffix}@example.test", "primaryContact": "Pat", "servicesProvided": "Webhook walk"},
        prefix="/public/v1",
    )
    time.sleep(2)
    deliveries_status, deliveries, _ = request_json("GET", f"/developer/webhooks/{hook_id}/deliveries", walk_token)
    items = deliveries.get("data") or []
    first = next((row for row in items if row.get("eventType") == "third_party.created"), None)
    record("webhook-delivery", "PASS" if vendor2_status == 201 and first and first.get("status") in {"DELIVERED", "FAILED"} else "FAIL", f"{deliveries_status} {first}")
    event_id = first.get("eventId") if first else None

    fail_url = sink + ("&" if "?" in sink else "?") + "failOnce=1"
    request_json("PATCH", f"/developer/webhooks/{hook_id}", walk_token, {"url": fail_url})
    request_json(
        "POST",
        "/vendors",
        writer_token,
        {"name": f"Fail Vendor {suffix}", "contactEmail": f"fail-{suffix}@example.test", "primaryContact": "Pat", "servicesProvided": "Fail walk"},
        prefix="/public/v1",
    )
    time.sleep(2)
    failed_status, failed_list, _ = request_json("GET", f"/developer/webhooks/{hook_id}/deliveries", walk_token)
    failed = next((row for row in (failed_list.get("data") or []) if row.get("status") in {"FAILED", "DEAD"}), None)
    record("webhook-forced-failure", "PASS" if failed else "FAIL", str(failed_status))
    if failed:
        request_json("PATCH", f"/developer/webhooks/{hook_id}", walk_token, {"url": sink.split("?")[0]})
        retry_del_status, retry_del, _ = request_json("POST", f"/developer/webhooks/{hook_id}/deliveries/{failed['id']}/retry", walk_token, {})
        record("webhook-retry-same-event", "PASS" if retry_del.get("data", {}).get("eventId") == failed.get("eventId") else "FAIL", str(retry_del_status))

    request_json("PATCH", f"/developer/webhooks/{hook_id}", walk_token, {"enabled": False})
    before = len((request_json("GET", f"/developer/webhooks/{hook_id}/deliveries", walk_token)[1].get("data") or []))
    request_json(
        "POST",
        "/vendors",
        writer_token,
        {"name": f"Disabled Vendor {suffix}", "contactEmail": f"off-{suffix}@example.test", "primaryContact": "Pat", "servicesProvided": "Disabled walk"},
        prefix="/public/v1",
    )
    time.sleep(1)
    after = len((request_json("GET", f"/developer/webhooks/{hook_id}/deliveries", walk_token)[1].get("data") or []))
    record("webhook-disabled-no-delivery", "PASS" if after == before else "FAIL", f"{before}->{after}")
    record("stable-event-id", "PASS" if event_id else "FAIL", str(event_id))

    integrations_status, integrations, _ = request_json("GET", "/developer/integrations", walk_token)
    rows = integrations.get("data") or []
    slack = next((row for row in rows if row.get("id") == "slack"), {})
    siem = next((row for row in rows if row.get("id") == "siem"), {})
    record("slack-not-configured", "PASS" if slack.get("status", {}).get("key") == "not_configured" else "FAIL", str(slack.get("status")))
    record("siem-coming-later", "PASS" if siem.get("comingLater") else "FAIL", str(siem.get("status")))
    test_status, _, _ = request_json("POST", "/developer/integrations/slack/test", walk_token, {})
    record("slack-test-without-config", "PASS" if test_status in {400, 409} else "FAIL", str(test_status))
    RESULTS["notes"].append("LIVE PROVIDER TEST: NOT TESTED — no Slack or Jira staging credentials were supplied.")

    session_status, _, _ = request_json("GET", "/developer/overview", writer_token)
    record("public-token-session-denied", "PASS" if session_status in {401, 403} else "FAIL", str(session_status))
    invite_status, invite, _ = request_json("POST", "/users/invite", walk_token, {"email": f"api22-viewer-{suffix}@example.test", "role": "VIEWER"})
    activation = (invite.get("data") or {}).get("token") or ""
    url = (invite.get("data") or {}).get("activationUrl") or ""
    if "token=" in url and not activation:
        activation = url.split("token=", 1)[1].split("&", 1)[0]
    if invite_status in {200, 201} and activation:
        act_status, activated, _ = request_json(
            "POST",
            "/auth/activate",
            body={"token": activation, "password": "ApiWalk22x1", "firstName": "Vic", "lastName": "Viewer"},
        )
        viewer_token = (activated.get("data") or {}).get("token")
        viewer_status, _, _ = request_json("GET", "/developer/overview", viewer_token)
        record("viewer-admin-denied", "PASS" if act_status in {200, 201} and viewer_status == 403 else "FAIL", f"activate={act_status} developer={viewer_status}")
    else:
        record("viewer-admin-denied", "SKIP", f"invite={invite_status} no activation token")

    activity_status, activity, _ = request_json("GET", "/developer/activity", walk_token)
    actions = {row.get("action") for row in (activity.get("data") or [])}
    record("audit-api-client", "PASS" if "api.client.created" in actions else "FAIL", str(activity_status))
    record("audit-webhook", "PASS" if "webhook.endpoint.created" in actions else "FAIL", ",".join(sorted(actions)))

    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.get_by_label("Work email").fill(EMAIL)
        continue_btn = page.get_by_role("button", name="Continue")
        if continue_btn.count():
            continue_btn.click()
            page.wait_for_timeout(800)
        if page.get_by_label("Password").count():
            page.get_by_label("Password").fill(PASSWORD)
        sign_in = page.get_by_role("button", name="Sign in")
        (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
        page.wait_for_url("**/dashboard", timeout=45000)
        page.goto(f"{BASE}/integrations", wait_until="networkidle")
        page.wait_for_timeout(1500)
        heading = page.get_by_role("heading", name="API & Integrations")
        record("ui-heading", "PASS" if heading.count() else "FAIL", heading.inner_text() if heading.count() else "missing")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900})
            page.wait_for_timeout(300)
            shot(page, f"overview-{width}")
        axe(page, "overview")
        for label, name in (("API Clients", "clients"), ("Webhooks", "webhooks"), ("Integrations", "integrations"), ("Activity", "activity")):
            page.get_by_role("tab", name=label).click()
            page.wait_for_timeout(400)
            shot(page, f"{name}-1440")
        page.get_by_role("tab", name="Integrations").click()
        page.wait_for_timeout(400)
        body = page.locator("body").inner_text()
        record("ui-coming-later", "PASS" if "Coming later" in body else "FAIL", "SIEM/risk providers")
        record("ui-no-test-until-configured", "PASS" if page.get_by_role("button", name="Test connection").count() == 0 else "FAIL", "not-configured cards")
        record("ui-no-connected-without-test", "PASS" if "Status: Connected" not in body else "FAIL", "proof tenant cards")
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
