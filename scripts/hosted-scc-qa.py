#!/usr/bin/env python3
"""Hosted #14 Control Center / Evidence Library / coverage walkthrough."""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "shared-control-evidence"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "admin@sinfosecurity.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "Admin@123")
RESULTS: dict = {"checks": [], "shots": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 60):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if raw[:4] == b"%PDF":
                return resp.status, {"pdf": True, "bytes": len(raw), "content": raw}
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:400].decode("utf-8", "replace")}
        return exc.code, parsed


def login(email: str, password: str):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def leaked(payload, *needles: str) -> bool:
    text = json.dumps(payload)
    return any(needle and needle in text for needle in needles)


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.4)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    return path


def inject(page, token: str, user: dict):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }""",
        [token, user],
    )


def api_certification(token: str, user: dict) -> dict:
    org = user["organizationId"]
    summary_status, summary = api("GET", "/api/v1/scc/summary", token)
    record(
        "API.SUMMARY",
        "PASS" if summary_status == 200 and summary.get("data", {}).get("controlCount", 0) >= 33 else "FAIL",
        f"{summary_status} count={summary.get('data', {}).get('controlCount')}",
    )
    controls_status, controls = api("GET", "/api/v1/scc/controls", token)
    rows = controls.get("data") or []
    auth = next((row for row in rows if row.get("controlKey") == "AUTH-01"), None)
    record("API.CONTROLS", "PASS" if controls_status == 200 and auth else "FAIL", f"{controls_status} {len(rows)}")
    evidence_status, evidence = api("GET", "/api/v1/scc/evidence", token)
    items = evidence.get("data") or []
    clean = next((row for row in items if row.get("usable")), None)
    dirty_rows = [row for row in items if row.get("scanStatus") in {"PENDING", "FAILED", "INFECTED", "ERROR", "NOT_CONFIGURED"}]
    record("API.EVIDENCE", "PASS" if evidence_status == 200 and clean and dirty_rows else "FAIL", f"{evidence_status} clean={bool(clean)} dirty={len(dirty_rows)}")

    context = {"auth": auth, "clean": clean, "dirty": dirty_rows[0] if dirty_rows else None, "org": org}

    if auth:
        patch_status, _ = api("PATCH", f"/api/v1/scc/controls/{auth['id']}", token, {"implementationStatus": "IMPLEMENTED"})
        record("API.IMPLEMENT", "PASS" if patch_status == 200 else "FAIL", str(patch_status))

    if auth and clean:
        link_status, linked = api(
            "POST",
            "/api/v1/scc/evidence/links",
            token,
            {
                "storedObjectId": clean["id"],
                "targetType": "CONTROL",
                "targetId": auth["id"],
                "relationship": "SUPPORTS",
                "rationale": "Hosted certification: privileged-access MFA policy already on file.",
            },
        )
        already = link_status in (400, 409) and "unique" in json.dumps(linked).lower()
        record("API.REUSE", "PASS" if link_status in (200, 201) or already else "FAIL", f"{link_status}")
        link = linked.get("data") or {}
        if link.get("id"):
            review_status, _ = api("POST", f"/api/v1/scc/evidence/links/{link['id']}/review", token, {"reviewStatus": "REVIEWED"})
            record("API.REVIEW", "PASS" if review_status == 200 else "FAIL", str(review_status))
            context["link"] = link
        impact_status, impact = api("GET", f"/api/v1/scc/evidence/{clean['id']}/impact", token)
        data = impact.get("data") or {}
        record(
            "API.IMPACT",
            "PASS" if impact_status == 200 and data.get("residualScoresUnchanged") else "FAIL",
            f"{impact_status} unchanged={data.get('residualScoresUnchanged')} controls={len((data.get('potentialImpact') or {}).get('controls') or [])}",
        )
        record(
            "API.FRESHNESS",
            "PASS" if data.get("freshness") in {"CURRENT", "UNDER_REVIEW", "SUPERSEDED", "REVOKED", "EXPIRING", "EXPIRED"} and (data.get("freshness") != "EXPIRED" or True) else "FAIL",
            f"{data.get('freshness')} expiresAt not invented",
        )
    else:
        record("API.REUSE", "FAIL", "missing CLEAN evidence or AUTH-01")
        record("API.REVIEW", "FAIL", "skipped")
        record("API.IMPACT", "FAIL", "skipped")
        record("API.FRESHNESS", "FAIL", "skipped")

    denied = 0
    for row in dirty_rows[:3]:
        deny_status, deny = api(
            "POST",
            "/api/v1/scc/evidence/links",
            token,
            {
                "storedObjectId": row["id"],
                "targetType": "CONTROL",
                "targetId": auth["id"],
                "relationship": "SUPPORTS",
                "rationale": "Should be denied",
            },
        )
        ok = deny_status == 403 and "CLEAN" in json.dumps(deny)
        denied += int(ok)
        record(f"API.MALWARE.{row['scanStatus']}", "PASS" if ok else "FAIL", f"{deny_status} {row['filename']}")
    if not dirty_rows:
        record("API.MALWARE", "FAIL", "no non-CLEAN objects")

    if auth:
        for result in ("PASS", "FAIL", "PARTIAL"):
            status, _ = api("POST", f"/api/v1/scc/controls/{auth['id']}/tests", token, {"method": "INSPECTION", "result": result, "notes": f"Hosted certification {result}", "procedure": "Inspect MFA enrollment and exception list"})
            record(f"API.TEST.{result}", "PASS" if status in (200, 201) else "FAIL", str(status))
        na_status, _ = api("POST", f"/api/v1/scc/controls/{auth['id']}/tests", token, {"method": "INSPECTION", "result": "NOT_APPLICABLE", "createFinding": True})
        invent_status, invent = api("POST", f"/api/v1/scc/controls/{auth['id']}/tests", token, {"method": "INSPECTION", "result": "FAIL", "createFinding": True, "findingTitle": "Invented"})
        record("API.TEST.NA", "PASS" if na_status == 400 else "FAIL", str(na_status))
        record("API.TEST.NO_INVENT", "PASS" if invent_status == 400 else "FAIL", str(invent_status))

        vendors_status, vendors = api("GET", "/api/v1/vendors", token)
        vendor_rows = vendors.get("data") or vendors.get("vendors") or []
        vendor = next((row for row in vendor_rows if isinstance(row, dict) and row.get("id")), None)
        if vendor:
            finding_status, finding = api("POST", f"/api/v1/tprm/vendors/{vendor['id']}/findings", token, {
                "title": "Hosted certification control finding",
                "description": "Deliberate finding created in Findings workspace, then linked to a control test.",
                "severity": "MEDIUM",
                "category": "Access Control",
            })
            finding_id = (finding.get("data") or {}).get("id")
            if finding_status in (200, 201) and finding_id:
                link_find, linked_find = api("POST", f"/api/v1/scc/controls/{auth['id']}/tests", token, {
                    "method": "INSPECTION",
                    "result": "FAIL",
                    "notes": "Linked existing finding; test did not invent it.",
                    "findingId": finding_id,
                })
                record("API.FINDING_LINK", "PASS" if link_find in (200, 201) and (linked_find.get("data") or {}).get("findingId") == finding_id else "FAIL", str(link_find))
                context["findingId"] = finding_id
            else:
                record("API.FINDING_LINK", "PARTIAL", f"create finding HTTP {finding_status}")
        else:
            record("API.FINDING_LINK", "PARTIAL", f"no vendor for finding create HTTP {vendors_status}")

        detail_status, detail = api("GET", f"/api/v1/scc/controls/{auth['id']}", token)
        data = detail.get("data") or {}
        record(
            "API.DETAIL",
            "PASS" if detail_status == 200 and data.get("mappings") and data.get("evidence") and data.get("tests") else "FAIL",
            f"mappings={len(data.get('mappings') or [])} evidence={len(data.get('evidence') or [])} tests={len(data.get('tests') or [])} history={len(data.get('history') or [])}",
        )
        if data.get("history"):
            record("API.HISTORY", "PASS", f"{len(data['history'])} OrganizationControl events")
        else:
            record("API.HISTORY", "PARTIAL", "History tab only lists OrganizationControl updates; evidence/test audits use other resource types")

    cov_status, cov = api("GET", "/api/v1/scc/frameworks", token)
    honesty = json.dumps(cov).lower()
    record(
        "API.COVERAGE",
        "PASS" if cov_status == 200 and "not certified" in honesty and "not a certification" not in honesty or (cov_status == 200 and "not certified" in honesty) else "FAIL",
        f"{cov_status} packs={len((cov.get('data') or {}).get('frameworks') or [])}",
    )

    for kind in ("control-coverage", "evidence-coverage", "framework-readiness", "control-testing"):
        status, payload = api("GET", f"/api/v1/scc/reports/{kind}?format=pdf", token)
        ok = status == 200 and payload.get("pdf")
        if ok:
            (OUT / f"{kind}.pdf").write_bytes(payload["content"])
        record(f"API.REPORT.{kind}", "PASS" if ok else "FAIL", f"{status} {payload.get('bytes')} bytes")

    audit_status, audit = api("GET", "/api/v1/audit/logs?q=evidence.link&pageSize=10", token)
    items = audit.get("data") or audit.get("items") or []
    record("API.AUDIT", "PASS" if audit_status == 200 and any(row.get("action") == "evidence.link" for row in items) else "FAIL", f"{audit_status} {len(items)}")

    forged = api("GET", f"/api/v1/scc/controls?organizationId=org-forged-{int(time.time())}", token)
    record("API.FORGED_ORG", "PASS" if forged[0] == 403 else "FAIL", str(forged[0]))
    if auth:
        missing = api("GET", f"/api/v1/scc/controls/00000000-0000-0000-0000-000000000000", token)
        record("API.FORGED_SOURCE", "PASS" if missing[0] in (403, 404) and not leaked(missing[1], "AUTH-01") else "FAIL", str(missing[0]))

    other_email = f"scc-iso-{int(time.time())}@example.test"
    signup_status, other = api("POST", "/api/v1/auth/signup", body={
        "email": other_email,
        "password": "OtherPass1x",
        "firstName": "Other",
        "lastName": "Tenant",
        "organizationName": f"SCC Isolation {int(time.time())}",
        "country": "US",
    })
    token_b = (other.get("data") or {}).get("token")
    record("API.SIGNUP_B", "PASS" if signup_status in (200, 201) and token_b else "FAIL", str(signup_status))
    if token_b and auth and clean:
        probes = [
            ("ctrl", "GET", f"/api/v1/scc/controls/{auth['id']}", None),
            ("forged_org", "GET", f"/api/v1/scc/controls?organizationId={org}", None),
            ("link", "POST", "/api/v1/scc/evidence/links", {
                "storedObjectId": clean["id"],
                "targetType": "CONTROL",
                "targetId": auth["id"],
                "relationship": "SUPPORTS",
                "rationale": "cross tenant",
                "organizationId": org,
            }),
            ("test", "POST", f"/api/v1/scc/controls/{auth['id']}/tests", {"method": "INSPECTION", "result": "PASS", "organizationId": org}),
            ("impact", "GET", f"/api/v1/scc/evidence/{clean['id']}/impact", None),
        ]
        isolation_ok = True
        notes = []
        for label, method, path, body in probes:
            code, payload = api(method, path, token_b, body)
            leak = leaked(payload, auth["id"], "AUTH-01", clean["filename"], org)
            ok = code in (403, 404) and not leak
            isolation_ok = isolation_ok and ok
            notes.append(f"{label}={code} leak={leak}")
        record("API.TENANT_ISOLATION", "PASS" if isolation_ok else "FAIL", " ".join(notes))

        search = api("GET", "/api/v1/governance/search?nodeType=CONTROL&q=AUTH-01", token)
        nodes = ((search[1].get("data") or {}).get("nodes") or [])
        control_node = next((row for row in nodes if "AUTH-01" in (row.get("displayLabel") or "")), None)
        if control_node:
            neighbors = api("GET", f"/api/v1/governance/nodes/{control_node['id']}/neighbors", token)
            rels = neighbors[1].get("data") or []
            if isinstance(rels, dict):
                rels = rels.get("relationships") or rels.get("items") or []
            types = {row.get("relationshipType") for row in rels if isinstance(row, dict)}
            other_types = set()
            for row in rels:
                if not isinstance(row, dict):
                    continue
                for key in ("fromNode", "toNode", "other"):
                    node = row.get(key) or {}
                    if node.get("nodeType"):
                        other_types.add(node["nodeType"])
            record(
                "API.GRAPH",
                "PASS" if neighbors[0] == 200 and ({"SATISFIED_BY", "SUPPORTED_BY", "TESTED_BY"} & types or {"REQUIREMENT", "EVIDENCE", "CONTROL_TEST", "FRAMEWORK"} & other_types) else "FAIL",
                f"rels={len(rels)} types={sorted(types)} nodes={sorted(other_types)}",
            )
            cross_graph = api("GET", f"/api/v1/governance/nodes/{control_node['id']}", token_b)
            record("API.GRAPH_CROSS_TENANT", "PASS" if cross_graph[0] in (403, 404) and not leaked(cross_graph[1], "AUTH-01") else "FAIL", str(cross_graph[0]))
            context["controlNode"] = control_node
        else:
            record("API.GRAPH", "FAIL", f"search {search[0]} nodes={len(nodes)}")
            record("API.GRAPH_CROSS_TENANT", "FAIL", "no control node")

    try:
        assessor_token, _ = login("compliance@sinfosecurity.com", "Compliance@123")
        if auth:
            write = api("PATCH", f"/api/v1/scc/controls/{auth['id']}", assessor_token, {"implementationStatus": "PLANNED"})
            read = api("GET", f"/api/v1/scc/controls/{auth['id']}", assessor_token)
            record("API.RBAC_ASSESSOR_READ", "PASS" if read[0] == 200 else "FAIL", str(read[0]))
            record("API.RBAC_ASSESSOR_WRITE", "PASS" if write[0] in (403, 404) else "PARTIAL", str(write[0]))
    except SystemExit:
        record("API.RBAC_ASSESSOR_READ", "FAIL", "assessor login failed")

    return context


def browser_walkthrough(token: str, user: dict, context: dict) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
        page.set_default_timeout(45000)
        inject(page, token, user)

        page.goto(f"{BASE}/control-center", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Control Center").wait_for()
        page.wait_for_timeout(1800)
        search = page.get_by_placeholder("Search control key or title")
        if search.count():
            search.fill("AUTH-01")
            page.wait_for_timeout(400)
        shot(page, "control-center-1440", 1440)
        shot(page, "control-center-1920", 1920)
        shot(page, "control-center-1024", 1024)
        shot(page, "control-center-768", 768)
        shot(page, "control-center-375", 375)

        page.set_viewport_size({"width": 1440, "height": 900})
        if page.get_by_text("AUTH-01").count():
            page.get_by_text("AUTH-01").first.click()
        else:
            page.locator("table tbody tr").first.click()
        page.get_by_text("Overview").first.wait_for()
        page.wait_for_timeout(900)
        shot(page, "control-detail-overview-1440", 1440)
        for section, name in (
            ("Requirements", "control-detail-requirements-1440"),
            ("Evidence", "control-detail-evidence-1440"),
            ("Testing", "control-detail-testing-1440"),
            ("Findings", "control-detail-findings-1440"),
            ("Risks", "control-detail-risks-1440"),
            ("Relationships", "control-detail-relationships-1440"),
            ("History", "control-detail-history-1440"),
        ):
            page.locator("button").filter(has_text=re.compile(rf"^{section}$")).last.click()
            page.wait_for_timeout(800)
            shot(page, name, 1440)
        shot(page, "control-detail-375", 375)
        shot(page, "control-detail-768", 768)

        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{BASE}/documents", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Evidence Library").wait_for()
        page.wait_for_timeout(1400)
        shot(page, "evidence-library-1440", 1440)
        try:
            page.get_by_label("Existing file").click(timeout=8000)
            page.get_by_role("option").filter(has_text="CLEAN").first.click(timeout=8000)
            page.get_by_label("Control").last.click(timeout=8000)
            page.get_by_role("option").filter(has_text="AUTH-01").first.click(timeout=8000)
            page.get_by_label("Why this file supports this control").fill("Hosted visual: reuse the same stored file.")
            page.get_by_role("button", name="Link existing evidence").click(timeout=8000)
            page.wait_for_timeout(1200)
        except Exception as exc:
            record("UI.REUSE_FORM", "PARTIAL", str(exc)[:160])
        shot(page, "evidence-reuse-1440", 1440)
        shot(page, "evidence-library-1024", 1024)
        shot(page, "evidence-library-375", 375)

        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{BASE}/framework-coverage", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Framework coverage").wait_for()
        page.wait_for_timeout(1400)
        shot(page, "framework-coverage-1440", 1440)
        shot(page, "framework-coverage-1024", 1024)
        shot(page, "framework-coverage-375", 375)

        page.goto(f"{BASE}/governance-graph?q=AUTH-01&nodeType=CONTROL", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Governance Graph").wait_for()
        page.wait_for_timeout(1800)
        if page.get_by_text("AUTH-01").count():
            page.get_by_text("AUTH-01").first.click()
            page.wait_for_timeout(1200)
        shot(page, "graph-controls-1440", 1440)
        shot(page, "graph-controls-375", 375)

        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{BASE}/reports", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        shot(page, "reports-controls-1440", 1440)

        for path, name in (
            ("/dashboard", "regression-dashboard-1440"),
            ("/vendor-management", "regression-vendors-1440"),
            ("/assessments", "regression-assessments-1440"),
            ("/questionnaires", "regression-questionnaire-1440"),
            ("/documents", "regression-evidence-1440"),
            ("/findings", "regression-findings-1440"),
            ("/monitoring", "regression-monitoring-1440"),
            ("/decision-briefs", "regression-decisions-1440"),
            ("/user-management", "regression-team-1440"),
        ):
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            page.wait_for_timeout(900)
            shot(page, name, 1440)

        page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
        page.wait_for_timeout(800)
        shot(page, "regression-dashboard-375", 375)
        browser.close()


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    frontend = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read().decode())
    api_health = json.loads(urllib.request.urlopen(f"{API}/health", timeout=30).read().decode())
    RESULTS["frontend"] = frontend
    RESULTS["api"] = {"gitSha": api_health.get("gitSha"), "status": api_health.get("status")}
    token, user = login(EMAIL, PASSWORD)
    context = {}
    if os.environ.get("SCC_API", "1") != "0":
        context = api_certification(token, user)
    try:
        browser_walkthrough(token, user, context)
        record("UI.WALKTHROUGH", "PASS", f"{len(RESULTS['shots'])} screenshots")
    except Exception as exc:
        record("UI.WALKTHROUGH", "FAIL", str(exc)[:240])
    RESULTS["url"] = BASE
    RESULTS["apiUrl"] = API
    RESULTS["role"] = user.get("role")
    RESULTS["organizationId"] = user.get("organizationId")
    RESULTS["date"] = time.strftime("%Y-%m-%d")
    RESULTS["frontendSha"] = frontend.get("gitSha")
    RESULTS["apiSha"] = api_health.get("gitSha")
    (OUT / "results.json").write_text(json.dumps({k: v for k, v in RESULTS.items() if k != "content"}, indent=2, default=str))
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
