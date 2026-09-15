#!/usr/bin/env python3
"""Hosted #19 Supreme Intelligence golden journey. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-intelligence"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "sales@eliteadjustersny.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "report-proof-20260913@staging.supremerisk.test")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "ReportProof1x")
RESULTS = {
    "checks": [],
    "routes": [],
    "keyboard": [],
    "viewports": [],
    "shots": [],
    "sha": {},
    "journey": {},
    "pdf": {},
}


def api(method, path, token=None, body=None, timeout=120, raw=False):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read()
            if raw:
                return resp.status, payload, dict(resp.headers)
            return resp.status, json.loads(payload.decode()) if payload else {}
    except urllib.error.HTTPError as exc:
        payload = exc.read()
        if raw:
            return exc.code, payload, dict(exc.headers)
        try:
            parsed = json.loads(payload.decode()) if payload else {}
        except json.JSONDecodeError:
            parsed = {"raw": payload[:400].decode("utf-8", "replace")}
        return exc.code, parsed


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def unwrap(payload):
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], (dict, list)):
        return payload["data"]
    return payload


def login(email, password):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {email} {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def axe(page, name, path):
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
                passes: out.passes.length,
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("critical", "serious")]
    status = "FAIL" if serious else ("PARTIAL" if result["violations"] else "PASS")
    RESULTS["routes"].append({"route": name, "path": path, "result": status, **result})
    record(f"axe {name}", status, f"serious={len(serious)} total={len(result['violations'])}")
    return status


def keyboard(page, name):
    focused = []
    page.keyboard.press("Tab")
    for _ in range(10):
        focused.append(page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: '', name: '' };
                return { tag: el.tagName, name: (el.getAttribute('aria-label') || el.innerText || '').slice(0, 48) };
            }"""
        ))
        page.keyboard.press("Tab")
    trapped = len({(row["tag"], row["name"]) for row in focused}) == 1 and focused[0]["tag"] not in ("BODY", "HTML")
    RESULTS["keyboard"].append({"route": name, "trap": trapped, "first": focused[0] if focused else None})
    record(f"keyboard {name}", "FAIL" if trapped else "PASS", f"trap={trapped}")


def overflow(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    wide = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    RESULTS["viewports"].append({"route": name, "width": width, "overflow": wide})
    record(f"{name}-{width}", "FAIL" if wide else "PASS", f"overflow={wide}")


def seed_authoritative(token, user):
    stamp = str(int(time.time()))
    vendor_status, vendor_body = api("POST", "/api/v1/vendors", token, {
        "name": f"Northwind Claims Review {stamp}",
        "vendorType": "PROFESSIONAL_SERVICES",
        "category": "OTHER",
        "tier": "CRITICAL",
        "primaryContact": "Pat Lee",
        "contactEmail": f"northwind-{stamp}@example.test",
        "servicesProvided": "Independent claims review and AI-assisted document classification",
        "dataTypesAccessed": ["Personal data", "Claims files"],
        "geographicFootprint": ["United States"],
        "regulatoryScope": ["NYDFS"],
    })
    vendor = unwrap(vendor_body)
    record("seed-vendor", "PASS" if vendor_status == 201 and vendor.get("id") else "FAIL", f"{vendor_status} {vendor.get('id') or vendor_body}")
    if vendor_status != 201:
        return {}

    issue_status, issue_body = api("POST", f"/api/v1/vendors/{vendor['id']}/issues", token, {
        "vendorId": vendor["id"],
        "title": "MFA evidence is not current",
        "description": "Critical vendor MFA evidence supporting AUTH-01 is expired.",
        "severity": "CRITICAL",
        "category": "Security",
        "potentialImpact": "Access control evidence for a critical third party is no longer current.",
    })
    issue = unwrap(issue_body)
    record("seed-finding", "PASS" if issue_status == 201 and issue.get("id") else "FAIL", f"{issue_status} {issue.get('id') or issue_body}")

    brief_status, brief_body = api("POST", f"/api/v1/tprm/vendors/{vendor['id']}/decision-briefs", token, {})
    brief = unwrap(brief_body)
    record("seed-decision-brief", "PASS" if brief_status in (200, 201) and brief.get("id") else "PARTIAL", f"{brief_status} {brief.get('id') or brief_body}")

    return {
        "vendorId": vendor.get("id"),
        "vendorPublicId": vendor.get("publicId"),
        "vendorName": vendor.get("name"),
        "findingId": issue.get("id"),
        "findingTitle": issue.get("title"),
        "briefId": brief.get("id"),
        "owner": user.get("id"),
    }


def golden_api(token, other_token, seed):
    workspace_status, workspace_body = api("GET", "/api/v1/intelligence/workspace", token)
    workspace = unwrap(workspace_body)
    record("workspace", "PASS" if workspace_status == 200 else "FAIL", f"{workspace_status}")
    if workspace_status != 200:
        return {}

    honesty = workspace.get("honesty") or ""
    record("honesty", "PASS" if "interpret" in honesty.lower() else "FAIL", honesty[:160])
    external = workspace.get("externalIntelligence") or {}
    record("external-not-configured", "PASS" if external.get("status") == "NOT_CONFIGURED" else "FAIL", json.dumps(external)[:200])
    period = workspace.get("period") or {}
    record("period-honesty", "PASS" if "not yet established" in (period.get("label") or "").lower() or period.get("supported") is False else "PARTIAL", json.dumps(period)[:240])

    attention = list(workspace.get("criticalAttention") or []) + list(workspace.get("highAttention") or [])
    item = next((row for row in attention if "finding is open" in (row.get("title") or "").lower()), attention[0] if attention else None)
    record("priority-item", "PASS" if item else "FAIL", json.dumps(item)[:240] if item else "no attention items")
    if not item:
        RESULTS["journey"]["workspace"] = workspace
        return {"workspace": workspace}

    public_id = item["publicId"]
    detail_status, detail_body = api("GET", f"/api/v1/intelligence/items/{public_id}", token)
    detail = unwrap(detail_body)
    record("detail", "PASS" if detail_status == 200 else "FAIL", f"{detail_status} {public_id}")
    record("provenance", "PASS" if detail.get("ruleId") and detail.get("sourceProduct") else "FAIL", f"{detail.get('ruleId')} {detail.get('sourceProduct')} {detail.get('sourceId')}")
    record("why-it-matters", "PASS" if detail.get("whyItMatters") else "FAIL", (detail.get("whyItMatters") or "")[:180])
    record("next-review", "PASS" if detail.get("nextReview") or detail.get("reviewGuidance") else "FAIL", (detail.get("nextReview") or detail.get("reviewGuidance") or "")[:180])
    record("source-links", "PASS" if detail.get("links") else "FAIL", json.dumps(detail.get("links") or [])[:200])

    leaked = api("GET", f"/api/v1/intelligence/items/{public_id}", other_token)
    record("cross-tenant-item", "PASS" if leaked[0] in (403, 404) else "FAIL", f"{leaked[0]} {json.dumps(leaked[1])[:160]}")
    other_ws = api("GET", "/api/v1/intelligence/workspace", other_token)
    other_blob = json.dumps(other_ws[1])
    record("cross-tenant-workspace", "PASS" if public_id not in other_blob and (seed.get("findingTitle") or "MFA evidence") not in other_blob else "FAIL", f"{other_ws[0]} leaked={public_id in other_blob}")
    forged = api("GET", f"/api/v1/intelligence/workspace?organizationId={seed.get('owner') and '05d7821b-cab1-44af-9f5c-1f528a2d0a0e'}", other_token)
    record("forged-org", "PASS" if forged[0] in (403, 404) else "FAIL", f"{forged[0]} {json.dumps(forged[1])[:160]}")

    search = api("GET", "/api/v1/intelligence/items?priority=CRITICAL_ATTENTION&domain=THIRD_PARTY&current=true", token)
    search_rows = unwrap(search[1]) if isinstance(unwrap(search[1]), list) else []
    record("search-filter", "PASS" if search[0] == 200 and any(row.get("publicId") == public_id for row in search_rows) else "FAIL", f"{search[0]} count={len(search_rows) if isinstance(search_rows, list) else search_rows}")

    narrative = unwrap(api("GET", f"/api/v1/intelligence/items/{public_id}/narrative", token)[1])
    record("ai-narrative", "PASS" if narrative.get("status") == "NOT_CONFIGURED" and "AI-GENERATED" in (narrative.get("authority") or "") else "PARTIAL", json.dumps(narrative)[:200])
    ext = unwrap(api("GET", "/api/v1/intelligence/external", token)[1])
    record("external-endpoint", "PASS" if ext.get("status") == "NOT_CONFIGURED" else "FAIL", json.dumps(ext)[:160])

    finding_before = unwrap(api("GET", f"/api/v1/vendors/{seed['vendorId']}/issues", token)[1])
    open_before = [row for row in (finding_before if isinstance(finding_before, list) else finding_before.get("issues") or finding_before.get("data") or []) if row.get("id") == seed.get("findingId")]
    ack = api("POST", f"/api/v1/intelligence/items/{public_id}/acknowledge", token, {})
    ack_body = unwrap(ack[1])
    record("acknowledge", "PASS" if ack[0] == 200 and ack_body.get("lifecycle") == "ACKNOWLEDGED" else "FAIL", f"{ack[0]} {ack_body.get('lifecycle')}")
    finding_after = unwrap(api("GET", f"/api/v1/vendors/{seed['vendorId']}/issues", token)[1])
    open_after = [row for row in (finding_after if isinstance(finding_after, list) else finding_after.get("issues") or []) if row.get("id") == seed.get("findingId")]
    still_open = (open_after[0].get("status") if open_after else None) in (None, "OPEN") or (open_before and open_after and open_after[0].get("status") == open_before[0].get("status") and open_after[0].get("status") != "CLOSED")
    record("ack-does-not-close-finding", "PASS" if still_open else "FAIL", json.dumps(open_after[:1])[:200])

    close = api("POST", f"/api/v1/vendors/issues/{seed['findingId']}/close", token, {"closureNotes": "Replacement MFA evidence recorded in the vendor file."})
    record("close-finding", "PASS" if close[0] in (200, 201) else "FAIL", f"{close[0]} {json.dumps(close[1])[:160]}")

    reconciled_status, reconciled_body = api("GET", "/api/v1/intelligence/workspace", token)
    reconciled = unwrap(reconciled_body)
    current_open = [row for row in list(reconciled.get("criticalAttention") or []) + list(reconciled.get("highAttention") or []) if row.get("publicId") == public_id]
    positive = [row for row in (reconciled.get("positiveMovement") or []) if "closed" in (row.get("title") or "").lower()]
    historical = unwrap(api("GET", f"/api/v1/intelligence/items/{public_id}", token)[1])
    record("stale-resolved", "PASS" if reconciled_status == 200 and not current_open and historical.get("lifecycle") in ("RESOLVED_BY_SOURCE", "SUPERSEDED") and historical.get("current") is False else "FAIL", f"current={len(current_open)} lifecycle={historical.get('lifecycle')} currentFlag={historical.get('current')}")
    record("positive-movement", "PASS" if positive else "PARTIAL", json.dumps(positive[:1])[:200])
    record("history-preserved", "PASS" if historical.get("timeline") else "FAIL", json.dumps((historical.get("timeline") or [])[:3])[:240])

    pdf_status, pdf_body, pdf_headers = api("GET", "/api/v1/intelligence/reports/brief.pdf", token, raw=True)
    pdf_ok = pdf_status == 200 and pdf_body[:4] == b"%PDF" and b"Supreme" in pdf_body
    pdf_path = OUT / "Supreme-Intelligence-Brief.pdf"
    if pdf_status == 200:
        pdf_path.write_bytes(pdf_body)
    RESULTS["pdf"] = {"status": pdf_status, "bytes": len(pdf_body) if isinstance(pdf_body, (bytes, bytearray)) else 0, "contentType": pdf_headers.get("Content-Type")}
    record("intelligence-brief-pdf", "PASS" if pdf_ok else "FAIL", f"{pdf_status} bytes={RESULTS['pdf']['bytes']} type={RESULTS['pdf']['contentType']}")

    teaser = unwrap(api("GET", "/api/v1/intelligence/teaser", token)[1])
    record("home-teaser", "PASS" if isinstance(teaser, dict) else "FAIL", json.dumps(teaser)[:200] if isinstance(teaser, dict) else str(teaser)[:160])
    executive = unwrap(api("GET", "/api/v1/intelligence/executive", token)[1])
    record("executive", "PASS" if executive.get("executive") is not None else "FAIL", f"exec={len(executive.get('executive') or [])} period={((executive.get('period') or {}).get('label'))}")

    return {
        "publicId": public_id,
        "workspace": workspace,
        "detail": detail,
        "reconciled": reconciled,
        "historical": historical,
        "positive": positive,
        "teaser": teaser,
        "executive": executive,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
        frontend = json.loads(resp.read().decode())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": frontend.get("gitSha")}
    record("hosted-frontend", "PASS" if frontend.get("gitSha", "").startswith("569cf4f") else "PARTIAL", str(frontend.get("gitSha")))
    record("hosted-api", "PASS" if (health.get("gitSha") or "").startswith("569cf4f") else "PARTIAL", str(health.get("gitSha")))

    token, user = login(EMAIL, PASSWORD)
    other_token, other_user = login(OTHER_EMAIL, OTHER_PASSWORD)
    record("other-tenant", "PASS" if other_user.get("organizationId") != user.get("organizationId") else "FAIL", f"{other_user.get('organizationId')}")

    seed = seed_authoritative(token, user)
    RESULTS["journey"]["seed"] = seed
    RESULTS["journey"]["org"] = user.get("organizationId")
    RESULTS["journey"]["otherOrg"] = other_user.get("organizationId")
    golden = golden_api(token, other_token, seed)
    RESULTS["journey"].update({k: v for k, v in golden.items() if k not in {"workspace", "detail", "reconciled", "historical", "teaser", "executive"}})
    RESULTS["journey"]["item"] = {
        "publicId": golden.get("publicId"),
        "title": (golden.get("detail") or {}).get("title"),
        "lifecycleAfterClose": (golden.get("historical") or {}).get("lifecycle"),
        "affected": (golden.get("detail") or {}).get("affected"),
        "graph": (golden.get("detail") or {}).get("graph"),
        "why": (golden.get("detail") or {}).get("whyItMatters"),
    }

    public_id = golden.get("publicId")
    routes = [
        ("/dashboard", "home"),
        ("/intelligence", "intelligence-home"),
        ("/intelligence/changes", "intelligence-changes"),
        ("/intelligence/executive", "intelligence-executive"),
    ]
    if public_id:
        routes.append((f"/intelligence/{public_id}", "intelligence-detail"))

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        for path, name in routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(1.0)
            axe(page, name, path)
            keyboard(page, name)
            shot = OUT / f"{name}-1440.png"
            page.set_viewport_size({"width": 1440, "height": 940})
            page.screenshot(path=str(shot), full_page=True)
            RESULTS["shots"].append(str(shot.relative_to(ROOT)))
            if name in {"intelligence-home", "intelligence-detail", "intelligence-changes", "home"}:
                for width in (375, 768, 1024, 1440, 1920):
                    overflow(page, name, width)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    print(json.dumps({
        "sha": RESULTS["sha"],
        "fail": [row for row in RESULTS["checks"] if row["result"] == "FAIL"],
        "partial": [row for row in RESULTS["checks"] if row["result"] == "PARTIAL"],
        "item": RESULTS["journey"].get("item"),
        "seed": seed,
    }, indent=2, default=str), flush=True)


if __name__ == "__main__":
    main()
