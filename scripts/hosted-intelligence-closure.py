#!/usr/bin/env python3
"""#19 final hosted closure. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-intelligence" / "closure"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "sales@eliteadjustersny.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
VIEWER_EMAIL = os.environ.get("E2E_VIEWER_EMAIL", "report-proof-20260913@staging.supremerisk.test")
VIEWER_PASSWORD = os.environ.get("E2E_VIEWER_PASSWORD", "ReportProof1x")
RESULTS = {"checks": [], "timings": {}, "chain": {}, "viewer": {}, "isolation": {}, "sha": {}, "shots": [], "routes": []}


def api(method, path, token=None, body=None, timeout=120, raw=False):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    started = time.perf_counter()
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read()
            elapsed = round((time.perf_counter() - started) * 1000)
            if raw:
                return resp.status, payload, elapsed
            return resp.status, json.loads(payload.decode()) if payload else {}, elapsed
    except urllib.error.HTTPError as exc:
        payload = exc.read()
        elapsed = round((time.perf_counter() - started) * 1000)
        if raw:
            return exc.code, payload, elapsed
        try:
            parsed = json.loads(payload.decode()) if payload else {}
        except json.JSONDecodeError:
            parsed = {"raw": payload[:300].decode("utf-8", "replace")}
        return exc.code, parsed, elapsed


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def unwrap(payload):
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def login(email, password):
    status, payload, _ = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {email} {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def seed_chain(token, user):
    controls_status, controls_body, _ = api("GET", "/api/v1/scc/controls", token)
    controls = unwrap(controls_body)
    if isinstance(controls, dict):
        controls = controls.get("items") or controls.get("controls") or controls.get("rows") or []
    control = next((row for row in controls if row.get("id") and row.get("controlKey")), None)
    record("list-controls", "PASS" if controls_status == 200 and control else "FAIL", f"{controls_status} count={len(controls) if isinstance(controls, list) else controls}")
    if not control:
        return {}

    risk_status, risk_body, _ = api("POST", "/api/v1/erm/risks", token, {
        "title": "Failed control test can leave mapped requirements unsupported",
        "statement": "If a mapped control fails testing, residual exposure and compliance mappings need human review.",
        "description": "Authoritative risk created for Intelligence graph-impact closure. Not an accepted risk.",
        "category": "COMPLIANCE",
        "likelihood": 4,
        "impact": 4,
        "ownerUserId": user.get("id") or user.get("userId"),
        "source": "Control testing",
    })
    risk = unwrap(risk_body)
    record("create-risk", "PASS" if risk_status == 201 and risk.get("publicId") else "FAIL", f"{risk_status} {risk.get('publicId') or risk_body}")

    link_status, link_body, _ = api("POST", f"/api/v1/erm/risks/{risk.get('publicId')}/controls", token, {
        "controlId": control["id"],
        "rationale": "This control is expected to reduce the recorded compliance exposure.",
    })
    record("link-risk-control", "PASS" if link_status in (200, 201) else "FAIL", f"{link_status} {json.dumps(unwrap(link_body))[:180]}")

    vendors_status, vendors_body, _ = api("GET", "/api/v1/vendors?limit=5", token)
    vendors = unwrap(vendors_body)
    if isinstance(vendors, dict):
        vendors = vendors.get("vendors") or vendors.get("data") or []
    vendor = next((row for row in (vendors or []) if row.get("id")), None)
    finding_id = None
    if vendor:
        issue_status, issue_body, _ = api("POST", f"/api/v1/vendors/{vendor['id']}/issues", token, {
            "vendorId": vendor["id"],
            "title": "Mapped control failed testing",
            "description": "The vendor-related control test failed and is linked to the enterprise risk.",
            "severity": "HIGH",
            "category": "Security",
        })
        issue = unwrap(issue_body)
        record("create-finding", "PASS" if issue_status == 201 and issue.get("id") else "PARTIAL", f"{issue_status} {issue.get('id') or issue_body}")
        finding_id = issue.get("id")
    find_status, find_body = 400, {}
    if finding_id and risk.get("publicId"):
        find_status, find_body, _ = api("POST", f"/api/v1/erm/risks/{risk.get('publicId')}/findings", token, {"findingId": finding_id})
    record("link-risk-finding", "PASS" if find_status in (200, 201) else "PARTIAL", f"{find_status} {json.dumps(unwrap(find_body))[:180]}")

    fail_status, fail_body, _ = api("POST", f"/api/v1/scc/controls/{control['id']}/tests", token, {
        "method": "INSPECTION",
        "result": "FAIL",
        "procedure": "Inspect recorded operating effectiveness for the mapped control.",
        "notes": "Latest test failed. Intelligence should surface this as a material change.",
    })
    test = unwrap(fail_body)
    record("control-test-fail", "PASS" if fail_status == 201 and test.get("id") else "FAIL", f"{fail_status} {test.get('id') or fail_body}")
    return {
        "controlId": control.get("id"),
        "controlKey": control.get("controlKey"),
        "controlTitle": control.get("title"),
        "riskPublicId": risk.get("publicId"),
        "riskId": risk.get("id"),
        "testId": test.get("id"),
        "findingId": finding_id if find_status in (200, 201) else None,
    }


def inspect_intelligence(token, seed):
    ws_status, ws_body, ws_ms = api("GET", "/api/v1/intelligence/workspace", token)
    RESULTS["timings"]["workspaceMs"] = ws_ms
    workspace = unwrap(ws_body)
    record("workspace", "PASS" if ws_status == 200 else "FAIL", f"{ws_status} {ws_ms}ms")
    current = list(workspace.get("criticalAttention") or []) + list(workspace.get("highAttention") or []) + list(workspace.get("whatChanged") or [])
    item = next((row for row in current if row.get("ruleId") == "control.test_failed" and seed.get("controlKey") in ((row.get("title") or "") + (row.get("summary") or "") + json.dumps(row))), None)
    if not item:
        item = next((row for row in current if "failed testing" in (row.get("title") or "").lower()), current[0] if current else None)
    record("material-change-item", "PASS" if item and "fail" in (item.get("title") or "").lower() else "FAIL", json.dumps(item)[:260] if item else "none")
    if not item:
        return {}, workspace

    public_id = item["publicId"]
    detail_status, detail_body, detail_ms = api("GET", f"/api/v1/intelligence/items/{public_id}", token)
    RESULTS["timings"]["detailMs"] = detail_ms
    detail = unwrap(detail_body)
    graph = detail.get("graph") or {}
    human = graph.get("human") or []
    record("graph-impact", "PASS" if human or (graph.get("relatedCounts") or {}) else "FAIL", json.dumps(graph)[:400])
    record("why-it-matters", "PASS" if detail.get("whyItMatters") else "FAIL", (detail.get("whyItMatters") or "")[:180])
    record("provenance", "PASS" if detail.get("ruleId") and detail.get("sourceProduct") and detail.get("sourceId") else "FAIL", f"{detail.get('sourceProduct')} {detail.get('sourceModel')} {detail.get('sourcePublicId')} {detail.get('ruleVersion')}")
    record("source-links", "PASS" if detail.get("links") else "FAIL", json.dumps(detail.get("links") or [])[:200])
    record("next-review", "PASS" if "review" in ((detail.get("nextReview") or detail.get("reviewGuidance") or "").lower()) else "FAIL", (detail.get("nextReview") or detail.get("reviewGuidance") or "")[:180])

    ch_status, _, ch_ms = api("GET", "/api/v1/intelligence/items?current=all", token)
    RESULTS["timings"]["changesMs"] = ch_ms
    record("changes", "PASS" if ch_status == 200 else "FAIL", f"{ch_status} {ch_ms}ms")
    ex_status, _, ex_ms = api("GET", "/api/v1/intelligence/executive", token)
    RESULTS["timings"]["executiveMs"] = ex_ms
    record("executive", "PASS" if ex_status == 200 else "FAIL", f"{ex_status} {ex_ms}ms")
    RESULTS["timings"]["graphImpactMs"] = detail_ms
    RESULTS["chain"]["item"] = {
        "publicId": public_id,
        "title": detail.get("title"),
        "why": detail.get("whyItMatters"),
        "facts": detail.get("facts"),
        "affected": detail.get("affected"),
        "graph": graph,
        "provenance": {
            "sourceProduct": detail.get("sourceProduct"),
            "sourceModel": detail.get("sourceModel"),
            "sourceId": detail.get("sourceId"),
            "sourcePublicId": detail.get("sourcePublicId"),
            "ruleId": detail.get("ruleId"),
            "ruleVersion": detail.get("ruleVersion"),
            "sourceTimestamp": detail.get("sourceTimestamp"),
        },
        "links": detail.get("links"),
        "nextReview": detail.get("nextReview") or detail.get("reviewGuidance"),
    }
    return {"publicId": public_id, "detail": detail}, workspace


def resolve_and_positive(token, seed, public_id):
    pass_status, pass_body, _ = api("POST", f"/api/v1/scc/controls/{seed['controlId']}/tests", token, {
        "method": "INSPECTION",
        "result": "PASS",
        "procedure": "Re-inspect after the recorded deficiency was addressed.",
        "notes": "Latest test passed. Intelligence should resolve the failed-test item.",
    })
    record("control-test-pass", "PASS" if pass_status == 201 else "FAIL", f"{pass_status} {unwrap(pass_body).get('id') if isinstance(unwrap(pass_body), dict) else pass_body}")
    ws_status, ws_body, _ = api("GET", "/api/v1/intelligence/workspace", token)
    workspace = unwrap(ws_body)
    current_fail = [row for row in list(workspace.get("highAttention") or []) + list(workspace.get("criticalAttention") or []) if row.get("publicId") == public_id]
    positive = [row for row in (workspace.get("positiveMovement") or []) if "passed testing" in (row.get("title") or "").lower()]
    historical = unwrap(api("GET", f"/api/v1/intelligence/items/{public_id}", token)[1])
    record("stale-resolved", "PASS" if not current_fail and historical.get("lifecycle") in ("RESOLVED_BY_SOURCE", "SUPERSEDED") and historical.get("current") is False else "FAIL", f"current={len(current_fail)} lifecycle={historical.get('lifecycle')}")
    record("positive-movement", "PASS" if positive else "PARTIAL", json.dumps(positive[:1])[:220])
    record("history-preserved", "PASS" if historical.get("timeline") else "FAIL", json.dumps((historical.get("timeline") or [])[:4])[:240])
    return historical, positive


def viewer_walk(admin_token, item_public_id):
    users = unwrap(api("GET", "/api/v1/users", admin_token)[1])
    rows = users if isinstance(users, list) else []
    viewer = next((row for row in rows if (row.get("email") or "").lower() == VIEWER_EMAIL.lower()), None)
    record("find-viewer-user", "PASS" if viewer else "FAIL", json.dumps({"id": (viewer or {}).get("id"), "role": (viewer or {}).get("role")}))
    if not viewer:
        return
    original = viewer.get("role")
    patch = api("PATCH", f"/api/v1/users/{viewer['id']}/role", admin_token, {"role": "VIEWER"})
    record("assign-viewer-role", "PASS" if patch[0] == 200 else "FAIL", f"{patch[0]} {unwrap(patch[1]).get('role') if isinstance(unwrap(patch[1]), dict) else patch[1]}")
    try:
        token, user = login(VIEWER_EMAIL, VIEWER_PASSWORD)
        record("viewer-login", "PASS" if user.get("role") == "VIEWER" else "FAIL", f"{user.get('role')} {user.get('email')}")
        ws_status, ws_body, _ = api("GET", "/api/v1/intelligence/workspace", token)
        workspace = unwrap(ws_body)
        visible = list(workspace.get("criticalAttention") or []) + list(workspace.get("highAttention") or []) + list(workspace.get("whatChanged") or []) + list(workspace.get("positiveMovement") or [])
        record("viewer-read", "PASS" if ws_status == 200 else "FAIL", f"{ws_status} visible={len(visible)}")
        ack = api("POST", f"/api/v1/intelligence/items/{item_public_id}/acknowledge", token, {})
        record("viewer-ack-deny", "PASS" if ack[0] in (401, 403) else "FAIL", f"{ack[0]} {json.dumps(ack[1])[:160]}")
        pdf = api("GET", "/api/v1/intelligence/reports/brief.pdf", token, raw=True)
        record("viewer-report-deny", "PASS" if pdf[0] in (401, 403) else "FAIL", f"{pdf[0]}")
        detail = api("GET", f"/api/v1/intelligence/items/{item_public_id}", token)
        record("viewer-item", "PASS" if detail[0] in (200, 404) else "FAIL", f"{detail[0]}")
        RESULTS["viewer"] = {
            "role": user.get("role"),
            "email": user.get("email"),
            "visibleCount": len(visible),
            "ack": ack[0],
            "report": pdf[0],
            "item": detail[0],
            "permissions": "READ_PORTFOLIO / intelligence.read; no intelligence.acknowledge or intelligence.report",
        }
    finally:
        restore = api("PATCH", f"/api/v1/users/{viewer['id']}/role", admin_token, {"role": original or "ORGANIZATION_ADMIN"})
        record("restore-admin-role", "PASS" if restore[0] == 200 else "FAIL", f"{restore[0]} {unwrap(restore[1]).get('role') if isinstance(unwrap(restore[1]), dict) else restore[1]}")
    admin_ws = api("GET", "/api/v1/intelligence/workspace", admin_token)
    record("admin-still-functional", "PASS" if admin_ws[0] == 200 else "FAIL", f"{admin_ws[0]}")


def isolation(item_public_id):
    stamp = str(int(time.time()))
    signup = api("POST", "/api/v1/auth/signup", body={
        "email": f"intel-iso-{stamp}@tenant-iso.example",
        "password": "IntelPass1x",
        "firstName": "Iso",
        "lastName": "Tenant",
        "organizationName": f"Intel Iso {stamp}",
        "country": "US",
    })
    record("iso-signup", "PASS" if signup[0] == 201 else "FAIL", f"{signup[0]}")
    if signup[0] != 201:
        return
    token = signup[1]["data"]["token"]
    leaked = api("GET", f"/api/v1/intelligence/items/{item_public_id}", token)
    record("cross-tenant-item", "PASS" if leaked[0] in (403, 404) else "FAIL", f"{leaked[0]}")
    forged = api("GET", "/api/v1/intelligence/workspace?organizationId=05d7821b-cab1-44af-9f5c-1f528a2d0a0e", token)
    record("forged-org", "PASS" if forged[0] in (403, 404) else "FAIL", f"{forged[0]}")
    search = api("GET", f"/api/v1/intelligence/items?q={item_public_id}", token)
    blob = json.dumps(search[1])
    record("search-isolation", "PASS" if item_public_id not in blob else "FAIL", f"{search[0]} leaked={item_public_id in blob}")
    pdf = api("GET", "/api/v1/intelligence/reports/brief.pdf", token, raw=True)
    text = pdf[1].decode("latin-1", "replace") if isinstance(pdf[1], (bytes, bytearray)) else ""
    record("brief-isolation", "PASS" if pdf[0] == 200 and "Elite Claims" not in text and item_public_id not in text else "FAIL", f"{pdf[0]} elite={'Elite Claims' in text}")
    graph = api("GET", "/api/v1/governance/summary", token)
    record("graph-isolation", "PASS" if graph[0] == 200 else "FAIL", f"{graph[0]} nodes={(unwrap(graph[1]) or {}).get('nodeCount')}")
    RESULTS["isolation"] = {"item": leaked[0], "forged": forged[0], "search": search[0], "brief": pdf[0]}


def browsing_no_429(token):
    codes = []
    for _ in range(8):
        status, _, _ = api("GET", "/api/v1/intelligence/workspace", token)
        codes.append(status)
    record("normal-browsing-429", "PASS" if 429 not in codes else "FAIL", f"{codes}")


def axe(page, name, path):
    page.add_script_tag(path=str(AXE_PATH))
    result = page.evaluate(
        """async () => {
            const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
            return { violations: out.violations.map((row) => ({ id: row.id, impact: row.impact, nodes: row.nodes.length })) };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("critical", "serious")]
    status = "FAIL" if serious else ("PARTIAL" if result["violations"] else "PASS")
    RESULTS["routes"].append({"route": name, "path": path, "result": status, **result})
    record(f"axe {name}", status, f"serious={len(serious)} total={len(result['violations'])}")


def overflow(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.3)
    wide = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    record(f"{name}-{width}", "FAIL" if wide else "PASS", f"overflow={wide}")


def ui(token, user, public_id):
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
        routes = [("/intelligence", "intelligence-home"), ("/intelligence/changes", "intelligence-changes"), ("/intelligence/executive", "intelligence-executive")]
        if public_id:
            routes.append((f"/intelligence/{public_id}", "intelligence-detail"))
        for path, name in routes:
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(1.0)
            axe(page, name, path)
            page.keyboard.press("Tab")
            for width in (375, 768, 1024, 1440, 1920):
                overflow(page, name, width)
        browser.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health, _ = api("GET", "/health")
    with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
        frontend = json.loads(resp.read().decode())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": frontend.get("gitSha")}
    record("hosted-api", "PASS", str(health.get("gitSha")))
    record("hosted-frontend", "PASS", str(frontend.get("gitSha")))
    token, user = login(EMAIL, PASSWORD)
    seed = seed_chain(token, user)
    RESULTS["chain"]["seed"] = seed
    intel, _ = inspect_intelligence(token, seed)
    public_id = intel.get("publicId")
    if public_id and seed.get("controlId"):
        resolve_and_positive(token, seed, public_id)
        viewer_walk(token, public_id)
        isolation(public_id)
    browsing_no_429(token)
    admin_again, admin_user = login(EMAIL, PASSWORD)
    pdf_status, pdf_body, _ = api("GET", "/api/v1/intelligence/reports/brief.pdf", admin_again, raw=True)
    pdf_path = OUT / "Supreme-Intelligence-Brief.pdf"
    if pdf_status == 200 and isinstance(pdf_body, (bytes, bytearray)):
        pdf_path.write_bytes(pdf_body)
        import fitz
        doc = fitz.open(pdf_path)
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            dest = OUT / f"brief-p{i + 1}.png"
            pix.save(str(dest))
            RESULTS["shots"].append(str(dest.relative_to(ROOT)))
        record("pdf-pages", "PASS" if doc.page_count == 1 else "PARTIAL", f"pages={doc.page_count}")
        text = "\n".join(page.get_text() for page in doc)
        record("pdf-brand", "PASS" if "SUPREME GOVERNANCE PLATFORM" in text and "Supreme Risk" not in text.replace("Supreme Intelligence", "") else "FAIL", text[:180])
    else:
        record("pdf", "FAIL", f"{pdf_status}")
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    ui(admin_again, admin_user, public_id)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    print(json.dumps({
        "sha": RESULTS["sha"],
        "fail": [row for row in RESULTS["checks"] if row["result"] == "FAIL"],
        "partial": [row for row in RESULTS["checks"] if row["result"] == "PARTIAL"],
        "timings": RESULTS["timings"],
        "chain": RESULTS["chain"].get("item"),
        "viewer": RESULTS["viewer"],
    }, indent=2, default=str), flush=True)


if __name__ == "__main__":
    main()
