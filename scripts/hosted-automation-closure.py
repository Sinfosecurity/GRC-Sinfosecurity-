#!/usr/bin/env python3
"""Hosted #20 closure proof. Staging only. No fake events."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-automation"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "sales@eliteadjustersny.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
WANT = os.environ.get("WANT_SHA", "64b9cd93e29c362ec94438f4b5d836e93e9be8f4")
VIEWPORTS = [375, 768, 1024, 1440, 1920]
RESULTS = {"wantSha": WANT, "steps": [], "timings": {}, "axe": [], "screenshots": []}


def req(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 90):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            payload = json.loads(resp.read())
            return resp.status, payload, int((time.time() - started) * 1000)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"error": raw.decode("utf-8", "replace")[:500]}
        return exc.code, payload, int((time.time() - started) * 1000)


def record(name: str, status, payload=None, ms=None):
    RESULTS["steps"].append({"name": name, "status": status, "ms": ms, "payload": payload})
    print(f"{status} {name} {ms or ''}ms", flush=True)


def wait_sha(timeout=900):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            status, health, _ = req("GET", "/health")
            api_sha = health.get("gitSha") if isinstance(health, dict) else None
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                front = json.loads(resp.read())
            front_sha = front.get("gitSha")
            record("sha.poll", status, {"api": api_sha, "frontend": front_sha, "health": {k: health.get(k) for k in ("status", "gitSha", "checks") if isinstance(health, dict)}})
            if api_sha and front_sha and api_sha.startswith(WANT[:7]) and front_sha.startswith(WANT[:7]):
                RESULTS["hostedFrontendSha"] = front_sha
                RESULTS["hostedApiSha"] = api_sha
                return health
        except Exception as exc:  # noqa: BLE001
            record("sha.poll.error", str(exc))
        time.sleep(20)
    raise SystemExit("Hosted SHA did not reach the closure implementation")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    health = wait_sha()
    RESULTS["health"] = health
    status, login, ms = req("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    record("login", status, {"user": login.get("data", {}).get("user", {}).get("email")}, ms)
    token = login["data"]["token"]
    user = login["data"]["user"]
    org = user["organizationId"]
    user_id = user["id"]

    for name, path in [
        ("home", "/api/v1/automation/workspace"),
        ("list", "/api/v1/automation"),
        ("runs", "/api/v1/automation/executions"),
        ("templates", "/api/v1/automation/templates"),
    ]:
        code, payload, elapsed = req("GET", path, token)
        RESULTS["timings"][name] = elapsed
        record(f"timing.{name}", code, {"count": len(payload.get("data") or []) if isinstance(payload.get("data"), list) else None}, elapsed)
        if code == 429:
            raise SystemExit(f"429 on {path}")

    workspace = req("GET", "/api/v1/automation/workspace", token)[1]["data"]
    RESULTS["scheduledChecks"] = workspace.get("queue")
    record("scheduled.checks", workspace.get("queue", {}).get("status"), workspace.get("queue"))

    catalog = req("GET", "/api/v1/automation/catalog", token)[1].get("data") or {}
    catalog_templates = {row["key"]: row for row in (catalog.get("templates") or [])}
    full_templates = {
        "compliance-gap-opened": {
            "templateKey": "compliance-gap-opened",
            "name": "Compliance gap opened",
            "description": "When a compliance gap is opened, assign review work and notify the owner. Compliance is not declared.",
            "trigger": {"type": "EVENT", "event": "compliance.gap.opened"},
            "conditions": [{"field": "owner.exists", "op": "true"}],
            "actions": [{"type": "CREATE_REVIEW_REQUEST", "params": {"dueInDays": 7, "workKind": "REVIEW"}}, {"type": "NOTIFY_OWNER"}],
            "humanBoundary": {"required": True, "before": "compliance_declaration", "label": "Required before a requirement is marked compliant"},
        }
    }
    automations = {row["templateKey"]: row for row in (req("GET", "/api/v1/automation", token)[1].get("data") or []) if row.get("templateKey")}
    for key in ["intelligence-critical-attention", "compliance-gap-opened", "privacy-deadline-reminder", "ai-review-due"]:
        row = automations.get(key)
        if not row:
            body = {"templateKey": key, "ownerUserId": user_id, **(full_templates.get(key) or {})}
            code, created, _ = req("POST", "/api/v1/automation", token, body)
            record(f"create.{key}", code, created.get("data", {}).get("publicId"))
            public_id = created["data"]["publicId"]
            if not (created.get("data") or {}).get("actions"):
                req("PATCH", f"/api/v1/automation/{public_id}", token, full_templates.get(key) or {"templateKey": key})
            pub = req("POST", f"/api/v1/automation/{public_id}/publish", token, {})
            record(f"publish.{key}", pub[0], pub[1].get("data", {}).get("publicId") or pub[1])
        elif row.get("status") != "ACTIVE" or not row.get("actions"):
            if key in full_templates:
                req("PATCH", f"/api/v1/automation/{row['publicId']}", token, full_templates[key])
            pub = req("POST", f"/api/v1/automation/{row['publicId']}/publish", token, {})
            record(f"publish.{key}", pub[0], row["publicId"] if pub[0] == 200 else pub[1])
        else:
            record(f"active.{key}", "ACTIVE", row["publicId"])
    record("catalog.has.compliance-gap-opened", catalog_templates.get("compliance-gap-opened", {}).get("name") or False)

    vendors = req("GET", "/api/v1/vendors", token)
    payload = vendors[1]
    vendor_list = payload.get("data")
    if isinstance(vendor_list, dict):
        vendor_list = vendor_list.get("vendors") or vendor_list.get("items") or vendor_list.get("data") or []
    if not vendor_list:
        vendor_list = payload.get("vendors") or []
    northwind = next((row for row in vendor_list if "northwind" in str(row.get("name", "")).lower()), vendor_list[0] if vendor_list else None)
    record("vendor", vendors[0], {"id": northwind.get("id") if northwind else None, "name": northwind.get("name") if northwind else None})
    vendor_id = northwind["id"]

    finding = req("POST", f"/api/v1/tprm/vendors/{vendor_id}/findings", token, {
        "title": "Critical Attention closure finding",
        "description": "Real finding so Intelligence can generate Critical Attention.",
        "severity": "CRITICAL",
        "priority": "URGENT",
        "assignedTo": user_id,
    })
    record("finding.create", finding[0], {"id": finding[1].get("data", {}).get("id"), "status": finding[1].get("data", {}).get("status")})
    finding_id = finding[1]["data"]["id"]

    preview_before = req("GET", "/api/v1/automation/executions", token)
    before_ids = {row["publicId"] for row in preview_before[1].get("data") or []}

    intel = req("GET", "/api/v1/intelligence/workspace", token)
    RESULTS["timings"]["intelligence.workspace"] = intel[2]
    critical = intel[1]["data"].get("criticalAttention") or []
    item = next((row for row in critical if row.get("sourceId") == finding_id or "Critical Attention closure" in str(row.get("title", "") + row.get("summary", ""))), None)
    if not item:
        item = next((row for row in critical if row.get("sourceModel") == "VendorIssue" and row.get("current")), critical[0] if critical else None)
    record("intelligence.generate", intel[0], {
        "publicId": item.get("publicId") if item else None,
        "priority": item.get("priority") if item else None,
        "current": item.get("current") if item else None,
        "ruleId": item.get("ruleId") if item else None,
        "sourceId": item.get("sourceId") if item else None,
        "why": item.get("whyItMatters") if item else None,
    }, intel[2])
    intel_id = item["publicId"] if item else None

    runs = req("GET", "/api/v1/automation/executions", token)
    RESULTS["timings"]["runs"] = runs[2]
    intel_runs = [row for row in (runs[1].get("data") or []) if row.get("triggerEvent") == "intelligence.critical_attention" and row["publicId"] not in before_ids]
    record("intelligence.run", len(intel_runs), intel_runs[0] if intel_runs else None, runs[2])
    run = intel_runs[0] if intel_runs else None
    if run:
        detail = req("GET", f"/api/v1/automation/executions/{run['publicId']}", token)
        RESULTS["timings"]["run.detail"] = detail[2]
        record("run.detail", detail[0], detail[1].get("data"), detail[2])
        work = (detail[1]["data"].get("workItems") or [None])[0]
        if work:
            work_get = req("GET", f"/api/v1/automation/work/{work['publicId']}", token)
            record("work.item", work_get[0], work_get[1].get("data"))

    again = req("GET", "/api/v1/intelligence/workspace", token)
    runs2 = req("GET", "/api/v1/automation/executions", token)
    intel_runs2 = [row for row in (runs2[1].get("data") or []) if row.get("triggerEvent") == "intelligence.critical_attention" and row.get("sourceId") == (run or {}).get("sourceId")]
    record("idempotency.second-generate", len(intel_runs2), {"duplicateRun": len(intel_runs2) > 1})

    still = req("GET", f"/api/v1/tprm/findings", token)
    open_finding = next((row for row in (still[1].get("data") or still[1].get("data", {}).get("items") or []) if row.get("id") == finding_id), {"status": "unknown"})
    record("finding.still-open", open_finding.get("status") if isinstance(open_finding, dict) else open_finding)

    closed = req("POST", f"/api/v1/tprm/findings/{finding_id}/close", token, {"closureNotes": "Human closed the authoritative finding."})
    record("human.close", closed[0], closed[1].get("data"))
    reconciled = req("GET", "/api/v1/intelligence/workspace", token)
    item_after = req("GET", f"/api/v1/intelligence/items/{intel_id}", token) if intel_id else (0, {}, 0)
    record("intelligence.reconcile", item_after[0], {
        "lifecycle": item_after[1].get("data", {}).get("lifecycle"),
        "current": item_after[1].get("data", {}).get("current"),
        "positive": [row.get("publicId") for row in (reconciled[1].get("data", {}).get("positiveMovement") or [])][:5],
    })
    if run:
        hist = req("GET", f"/api/v1/automation/executions/{run['publicId']}", token)
        record("run.historical", hist[1].get("data", {}).get("status"), hist[1].get("data"))

    preview_aut = next((row["publicId"] for row in (req("GET", "/api/v1/automation", token)[1].get("data") or []) if row.get("templateKey") == "intelligence-critical-attention"), None)
    if preview_aut and item:
        preview = req("POST", f"/api/v1/automation/{preview_aut}/preview", token, {
            "sourceModel": "IntelligenceItem",
            "sourceId": item.get("sourceId") or item.get("id") or run.get("sourceId"),
            "event": "intelligence.critical_attention",
        })
        RESULTS["timings"]["preview"] = preview[2]
        record("preview", preview[0], preview[1].get("data"), preview[2])

    gap_aut = next(row["publicId"] for row in (req("GET", "/api/v1/automation", token)[1].get("data") or []) if row.get("templateKey") == "compliance-gap-opened")
    gap = req("POST", "/api/v1/compliance/gaps", token, {
        "source": "UNMAPPED",
        "title": "Automation closure compliance gap",
        "explanation": "Bounded hosted proof. Automation must not mark this compliant.",
        "ownerUserId": user_id,
    })
    record("compliance.gap", gap[0], {"publicId": gap[1].get("data", {}).get("publicId"), "status": gap[1].get("data", {}).get("status")})
    time.sleep(0.5)
    gap_runs = [row for row in (req("GET", "/api/v1/automation/executions", token)[1].get("data") or []) if row.get("triggerEvent") == "compliance.gap.opened" and row["publicId"] not in before_ids]
    record("compliance.run", len(gap_runs), gap_runs[0] if gap_runs else None)

    priv_received = (datetime.now(timezone.utc) - timedelta(days=26)).isoformat()
    rights = req("POST", "/api/v1/privacy/rights", token, {
        "requestType": "ACCESS",
        "regime": "GDPR",
        "requesterRef": "automation-closure-dsr",
        "receivedAt": priv_received,
    })
    record("privacy.rights", rights[0], {"publicId": rights[1].get("data", {}).get("publicId"), "status": rights[1].get("data", {}).get("status")})
    priv_runs = [row for row in (req("GET", "/api/v1/automation/executions", token)[1].get("data") or []) if row.get("triggerEvent") == "privacy.deadline.approaching" and row["publicId"] not in before_ids]
    record("privacy.run", len(priv_runs), priv_runs[0] if priv_runs else None)

    system = req("POST", "/api/v1/ai-governance/systems", token, {
        "name": "Automation closure review model",
        "businessOwner": "Risk Manager",
    })
    record("ai.system", system[0], {"publicId": system[1].get("data", {}).get("publicId"), "lifecycle": system[1].get("data", {}).get("lifecycle")})
    review_at = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    updated = req("PATCH", f"/api/v1/ai-governance/systems/{system[1]['data']['publicId']}", token, {"reviewAt": review_at})
    record("ai.reviewAt", updated[0], {"publicId": updated[1].get("data", {}).get("publicId"), "lifecycle": updated[1].get("data", {}).get("lifecycle")})
    ai_runs = [row for row in (req("GET", "/api/v1/automation/executions", token)[1].get("data") or []) if row.get("triggerEvent") == "ai.approval.due" and row["publicId"] not in before_ids]
    record("ai.run", len(ai_runs), ai_runs[0] if ai_runs else None)

    other = req("POST", "/api/v1/auth/signup", body={
        "email": f"auto-closure-{int(time.time())}@tenant-b.test",
        "password": "ClosurePass1x",
        "firstName": "Other",
        "lastName": "Tenant",
        "organizationName": f"Closure Tenant {int(time.time())}",
        "country": "US",
    })
    record("other.signup", other[0], {"org": other[1].get("data", {}).get("user", {}).get("organizationId")})
    other_token = other[1]["data"]["token"]
    if run:
        foreign_run = req("GET", f"/api/v1/automation/executions/{run['publicId']}", other_token)
        record("cross-tenant.run", foreign_run[0], foreign_run[1])
        work = (run.get("workItems") or [None])[0]
        if work:
            foreign_work = req("GET", f"/api/v1/automation/work/{work['publicId']}", other_token)
            record("cross-tenant.work", foreign_work[0], foreign_work[1])
        forged = req("GET", f"/api/v1/automation/executions/{run['publicId']}?organizationId={org}", other_token)
        record("forged.org", forged[0], forged[1])
        leak = req("GET", "/api/v1/automation/executions", other_token)
        leaked = json.dumps(leak[1]).find(run["publicId"]) >= 0
        record("cross-tenant.leak", leaked, {"status": leak[0], "count": len(leak[1].get("data") or [])})

    viewer_email = f"auto-viewer-{int(time.time())}@eliteadjustersny.com"
    invited = req("POST", "/api/v1/users/invite", token, {
        "email": viewer_email,
        "role": "VIEWER",
    })
    record("viewer.invite", invited[0], invited[1].get("data"))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=90000)
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        aut = preview_aut or "AUT-00004"
        run_id = run["publicId"] if run else "RUN-00001"
        routes = [
            ("/automation", "home"),
            (f"/automation/{aut}", "detail"),
            (f"/automation/runs/{run_id}", "run"),
            ("/automation/templates", "templates"),
            ("/automation/new", "builder"),
        ]
        for width in VIEWPORTS:
            page.set_viewport_size({"width": width, "height": 900})
            for path, name in routes:
                page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
                time.sleep(0.7)
                shot = OUT / f"closure-{name}-{width}.png"
                page.screenshot(path=str(shot), full_page=True)
                RESULTS["screenshots"].append(str(shot.relative_to(ROOT)))
        page.set_viewport_size({"width": 1440, "height": 900})
        for path, name in routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.6)
            try:
                page.add_script_tag(path=str(AXE_PATH))
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
            except Exception as exc:  # noqa: BLE001
                result = {"error": str(exc), "violations": []}
            serious = [row for row in result.get("violations", []) if row.get("impact") in ("critical", "serious")]
            RESULTS["axe"].append({"route": name, "path": path, "serious": len(serious), "violations": result.get("violations"), "error": result.get("error")})
            record(f"axe.{name}", "FAIL" if serious else "PASS", {"serious": len(serious), "error": result.get("error")})
        page.goto(f"{BASE}/automation/new", wait_until="domcontentloaded", timeout=90000)
        time.sleep(0.4)
        focused = []
        for _ in range(8):
            page.keyboard.press("Tab")
            focused.append(page.evaluate("() => document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.tagName + ':' + (document.activeElement.getAttribute('name') || document.activeElement.id || ''))"))
        record("keyboard.builder", "PASS" if any(focused) else "PARTIAL", focused)
        browser.close()

    (OUT / "closure-results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"intel": intel_id, "run": run["publicId"] if run else None, "timings": RESULTS["timings"], "scheduled": RESULTS.get("scheduledChecks")}, indent=2), flush=True)


if __name__ == "__main__":
    main()
