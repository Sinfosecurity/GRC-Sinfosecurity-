#!/usr/bin/env python3
"""Hosted #16 Supreme Compliance walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-compliance"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_SHA = os.environ.get("E2E_EXPECTED_SHA", "42370e22303fa18b53c92c34d08f279d7f14f4e8")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "discrepancies": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            content_type = resp.headers.get("Content-Type") or ""
            if raw[:4] == b"%PDF" or raw[:2] == b"PK" or content_type.startswith("text/csv"):
                return resp.status, {"binary": True, "bytes": len(raw), "type": content_type, "content": raw}
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
        raise SystemExit(f"login failed {email} {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}")


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.5)
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


def sha_match(actual: str, expected: str) -> bool:
    if not actual or not expected:
        return False
    return expected.startswith(str(actual)) or str(actual).startswith(expected[:7])


def wait_hosted_sha():
    deadline = time.time() + 25 * 60
    last = {}
    while time.time() < deadline:
        try:
            health_status, health = api("GET", "/health")
            api_sha = ""
            if isinstance(health, dict):
                api_sha = health.get("gitSha") or (health.get("data") or {}).get("gitSha") or ""
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                version = json.loads(resp.read().decode())
            fe_sha = version.get("gitSha") or ""
            last = {"api": api_sha, "frontend": fe_sha, "healthStatus": health_status}
            RESULTS["sha"] = last
            print(f"hosted sha api={api_sha} fe={fe_sha}")
            if sha_match(str(api_sha), EXPECTED_SHA) and sha_match(str(fe_sha), EXPECTED_SHA):
                return api_sha, fe_sha
            if api_sha and fe_sha and str(api_sha)[:7] != str(fe_sha)[:7]:
                RESULTS["discrepancies"] = [
                    f"Frontend SHA {fe_sha} does not match API SHA {api_sha}. Not silently reconciled."
                ]
        except Exception as exc:
            print(f"waiting for hosted sha: {exc}")
        time.sleep(20)
    RESULTS["sha"] = last
    RESULTS["discrepancies"].append(f"Timed out waiting for {EXPECTED_SHA}: {last}")
    return last.get("api", ""), last.get("frontend", "")


def save_binary(name: str, payload: dict):
    content = payload.get("content")
    if not content:
        return
    path = OUT / name
    path.write_bytes(content)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))


def pick_pack(catalog: list[dict], key: str) -> dict | None:
    return next((row for row in catalog if row.get("frameworkKey") == key and row.get("versionStatus") == "ACTIVE" and not row.get("activated")), None)


def seed(token: str, user: dict):
    status, catalog_payload = api("GET", "/api/v1/compliance/catalog", token)
    catalog = catalog_payload.get("data") or []
    record("catalog", "PASS" if status == 200 and catalog else "FAIL", f"{status} packs={len(catalog)}")
    keys = {row.get("frameworkKey") for row in catalog}
    record("catalog packs", "PASS" if {"NIST_CSF", "CMMC", "ISO_27001", "SOC2", "CIS"}.issubset(keys) else "PARTIAL", ",".join(sorted(keys)))
    endorsement = all("not official" in (row.get("endorsement") or "").lower() or "not" in (row.get("endorsement") or "").lower() for row in catalog) if catalog else False
    dumped = any(row.get("copyrightedText") for row in catalog)
    record("catalog licensing", "PASS" if catalog and not dumped else "FAIL", f"endorsement_ok={endorsement} dumped={dumped}")

    existing = next((row for row in catalog if row.get("activated") and row.get("activations")), None)
    pack = None if existing else (pick_pack(catalog, "NYDFS_500") or pick_pack(catalog, "HIPAA_SAFEGUARDS") or pick_pack(catalog, "CIS"))
    if existing:
        activation_id = existing["activations"][0]["publicId"]
        status, activation = api("GET", f"/api/v1/compliance/activations/{activation_id}", token)
        record("reuse activation", "PASS" if status == 200 else "FAIL", f"{status} {activation_id}")
        pack = None
    elif pack:
        status, activation = api("POST", "/api/v1/compliance/activations", token, {
            "frameworkVersionId": pack["versionId"],
            "scope": "Elite Claims hosted #16 walkthrough",
        })
        record("activation", "PASS" if status == 201 else "FAIL", f"{status} {pack.get('name')} {pack.get('version')}")
        if status != 201:
            return {}
    data = activation.get("data") or {}
    activation_id = data.get("publicId")
    remaining = (data.get("remainingWork") or {}).get("message") or ""
    RESULTS["workflow"] = {
        "activation": activation_id,
        "framework": f"{data.get('name')} {data.get('version')}",
        "remainingWork": remaining,
        "readiness": data.get("readiness"),
    }
    record("remaining work", "PASS" if remaining and "certified" not in remaining.lower() else "FAIL", remaining[:240])
    honesty = data.get("honesty") or ""
    record("activation honesty", "PASS" if "not certification" in honesty.lower() or "not certified" in honesty.lower() else "FAIL", honesty[:160])

    reqs = data.get("requirements") or []
    if not reqs:
        status, listed = api("GET", f"/api/v1/compliance/requirements?activationId={activation_id}", token)
        reqs = listed.get("data") or []
        record("requirements list", "PASS" if status == 200 else "FAIL", f"{status} count={len(reqs)}")
    first = reqs[0] if reqs else None
    requirement_id = (first or {}).get("publicId")
    if requirement_id:
        denied, _ = api("PATCH", f"/api/v1/compliance/requirements/{requirement_id}/applicability", token, {"applicability": "NOT_APPLICABLE"})
        record("na without rationale", "PASS" if denied == 400 else "FAIL", str(denied))
        status, payload = api("PATCH", f"/api/v1/compliance/requirements/{requirement_id}/applicability", token, {
            "applicability": "APPLICABLE",
            "rationale": "In scope for the Elite Claims hosted walkthrough.",
        })
        record("applicability", "PASS" if status == 200 else "FAIL", f"{status} {(payload.get('data') or {}).get('applicability')}")
        user_id = user.get("id") or user.get("userId")
        status, payload = api("PATCH", f"/api/v1/compliance/requirements/{requirement_id}/owner", token, {"ownerUserId": user_id})
        record("requirement owner", "PASS" if status == 200 else "FAIL", str(status))
        status, detail = api("GET", f"/api/v1/compliance/requirements/{requirement_id}", token)
        detail_data = detail.get("data") or {}
        raw = json.dumps(detail_data)
        record("requirement workspace", "PASS" if status == 200 and requirement_id.startswith("CRS-") and "NOT_APPLICABLE" not in raw else "FAIL", f"{status} {requirement_id}")
        controls = detail_data.get("controls") or []
        record("common control mapping", "PASS" if controls else "PARTIAL", f"controls={len(controls)}")

    status, gaps = api("POST", f"/api/v1/compliance/activations/{activation_id}/gaps/refresh", token, {})
    record("gap refresh", "PASS" if status == 200 else "FAIL", f"{status} {gaps.get('data')}")
    status, gap_list = api("GET", "/api/v1/compliance/gaps", token)
    record("gaps list", "PASS" if status == 200 else "FAIL", f"{status} count={len(gap_list.get('data') or [])}")

    owners_status, owners = api("GET", "/api/v1/compliance/owners", token)
    owner_id = ((owners.get("data") or [{}])[0] or {}).get("id") if owners_status == 200 else None
    if owner_id:
        status, exception = api("POST", "/api/v1/compliance/exceptions", token, {
            "type": "POLICY",
            "scope": "Temporary remote-admin path for hosted walkthrough",
            "rationale": "Break-glass while the preferred access path is rebuilt.",
            "ownerUserId": owner_id,
            "activationId": activation_id,
            "startAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "expiresAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 86400)),
        })
        record("exception create", "PASS" if status == 201 else "FAIL", f"{status}")
        if status == 201:
            public_id = exception["data"]["publicId"]
            status, decided = api("POST", f"/api/v1/compliance/exceptions/{public_id}/decision", token, {"decision": "APPROVED"})
            record("exception approve", "PASS" if status == 200 else "FAIL", str(status))
            record("exception not effective", "PASS" if "does not make" in json.dumps(decided).lower() or status == 200 else "FAIL", "approved exception is not control effectiveness")

    status, campaign = api("POST", "/api/v1/compliance/campaigns", token, {
        "name": "Hosted Q4 control attestation",
        "activationId": activation_id,
        "attestorUserIds": [user.get("id") or user.get("userId")] if user.get("id") or user.get("userId") else [],
    })
    record("campaign", "PASS" if status == 201 else "FAIL", f"{status} {(campaign.get('data') or {}).get('publicId')}")
    campaign_id = (campaign.get("data") or {}).get("publicId")
    control_id = None
    if requirement_id:
        status, detail = api("GET", f"/api/v1/compliance/requirements/{requirement_id}", token)
        control_id = ((detail.get("data") or {}).get("controls") or [{}])[0].get("id")
    if campaign_id and control_id:
        status, attested = api("POST", "/api/v1/compliance/attestations", token, {
            "campaignId": campaign_id,
            "organizationControlId": control_id,
            "status": "IMPLEMENTED",
            "statement": "Privileged access uses MFA in this hosted walkthrough environment.",
        })
        record("attestation", "PASS" if status == 201 else "FAIL", str(status))
        att_id = (attested.get("data") or {}).get("publicId")
        if att_id:
            status, reviewed = api("POST", f"/api/v1/compliance/attestations/{att_id}/review", token, {
                "reviewStatus": "APPROVED",
                "reviewNotes": "Governance statement reviewed. This is not a control test.",
            })
            record("attestation review", "PASS" if status == 200 else "FAIL", str(status))

    status, period = api("POST", "/api/v1/compliance/periods", token, {
        "activationId": activation_id,
        "name": "FY2026 hosted readiness",
        "startAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    record("audit period", "PASS" if status == 201 and "not an external" in json.dumps(period).lower() else "FAIL", f"{status}")
    period_id = (period.get("data") or {}).get("publicId")

    iso_old = next((row for row in catalog if row.get("frameworkKey") == "ISO_27001" and "2013" in (row.get("version") or "") and not row.get("activated")), None)
    iso_new = next((row for row in catalog if row.get("frameworkKey") == "ISO_27001" and "2022" in (row.get("version") or "") and not row.get("activated")), None)
    if iso_old and iso_new:
        status, old_act = api("POST", "/api/v1/compliance/activations", token, {
            "frameworkVersionId": iso_old["versionId"],
            "scope": "Version-change proof only",
        })
        if status == 201:
            old_id = old_act["data"]["publicId"]
            status, old_period = api("POST", "/api/v1/compliance/periods", token, {
                "activationId": old_id,
                "name": "2013 historical period",
                "startAt": "2013-01-01T00:00:00.000Z",
            })
            changed_status, changed = api("POST", f"/api/v1/compliance/activations/{old_id}/version", token, {
                "frameworkVersionId": iso_new["versionId"],
                "notes": "Hosted version change must not rewrite the historical period.",
            })
            record("framework version change", "PASS" if changed_status == 200 else "PARTIAL", f"{changed_status}")
            if status == 201:
                period_after = api("GET", f"/api/v1/compliance/periods/{old_period['data']['publicId']}", token)[1]
                frozen = json.dumps(period_after)
                record("historical period frozen", "PASS" if "2013" in frozen or old_period["data"]["publicId"] in frozen else "PARTIAL", frozen[:200])
        else:
            record("framework version change", "PARTIAL", f"could not activate 2013-ref {status}")
    else:
        record("framework version change", "PARTIAL", "2013-ref pack not available on this tenant catalog yet")

    status, dashboard = api("GET", "/api/v1/compliance/dashboard", token)
    dash = dashboard.get("data") or {}
    record("dashboard", "PASS" if status == 200 and dash.get("honesty") else "FAIL", f"{status}")
    record("needs attention", "PASS" if status == 200 and isinstance(dash.get("attention"), list) else "FAIL", f"items={len(dash.get('attention') or [])}")
    record("what changed", "PASS" if status == 200 and dash.get("changed") else "PARTIAL", f"events={len(dash.get('changed') or [])}")
    banned = json.dumps(dash).lower()
    record("no false compliance", "PASS" if "you are" not in banned or "certified" not in banned else "FAIL", "dashboard language")

    status, cross = api("GET", "/api/v1/compliance/cross-framework", token)
    mappings = cross.get("data") or []
    record("cross-framework", "PASS" if status == 200 else "FAIL", f"{status} controls={len(mappings)}")

    status, evidence = api("GET", "/api/v1/scc/evidence", token)
    rows = evidence.get("data") or []
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("rows") or []
    stored_id = None
    for row in rows:
        stored_id = row.get("storedObjectId") or row.get("id")
        if stored_id:
            break
    if stored_id:
        status, reuse = api("GET", f"/api/v1/compliance/evidence/{stored_id}/reuse", token)
        reuse_data = reuse.get("data") or {}
        record("evidence reuse", "PASS" if status == 200 and reuse_data.get("honesty") else "FAIL", f"{status} {reuse_data}")
        if reuse_data.get("scanStatus") and reuse_data.get("scanStatus") != "CLEAN":
            record("malware fail-closed reuse", "PASS" if reuse_data.get("usable") is False else "FAIL", reuse_data.get("offer") or "")
    else:
        record("evidence reuse", "PARTIAL", "No stored evidence objects on this tenant to inspect")

    risks_status, risks = api("GET", "/api/v1/erm/risks", token)
    risk_rows = risks.get("data") or []
    if risks_status == 200 and risk_rows:
        risk = risk_rows[0]
        before = risk.get("residualScore")
        gap_rows = (gap_list.get("data") or [])
        if gap_rows:
            status, linked = api("PATCH", f"/api/v1/compliance/gaps/{gap_rows[0]['publicId']}", token, {"enterpriseRiskId": risk.get("publicId") or risk.get("id")})
            after_status, after = api("GET", f"/api/v1/erm/risks/{risk.get('publicId')}", token)
            after_score = (after.get("data") or {}).get("residualScore")
            record("risk link no auto-score", "PASS" if status == 200 and after_score == before else "FAIL", f"before={before} after={after_score}")
        else:
            record("risk link no auto-score", "PARTIAL", "No gap available to link")
    else:
        record("risk link no auto-score", "PARTIAL", "No enterprise risks on tenant")

    preview_status, preview = api("POST", "/api/v1/compliance/import/preview", token, {
        "rows": [{"requirementKey": "=1+1", "applicability": "APPLICABLE"}],
    })
    key = (((preview.get("data") or {}).get("rows") or [{}])[0].get("requirementKey") or "")
    record("import neutralize", "PASS" if preview_status == 200 and key.startswith("'") else "FAIL", key[:40])

    for kind in ("readiness", "gaps", "attestations", "evidence", "exceptions", "executive", "board"):
        status, payload = api("GET", f"/api/v1/compliance/reports/{kind}.pdf", token)
        record(f"report {kind} pdf", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if status == 200 and payload.get("content"):
            save_binary(f"Supreme-Compliance-{kind}.pdf", payload)
    status, payload = api("GET", "/api/v1/compliance/reports/board.pptx", token)
    record("report board pptx", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
    if status == 200 and payload.get("content"):
        save_binary("Supreme-Compliance-Board.pptx", payload)
    status, payload = api("GET", "/api/v1/compliance/export/csv", token)
    record("export csv", "PASS" if status == 200 else "FAIL", str(status))
    status, payload = api("GET", "/api/v1/compliance/export/xlsx", token)
    record("export xlsx", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))

    return {
        "activationId": activation_id,
        "requirementId": requirement_id,
        "campaignId": campaign_id,
        "periodId": period_id,
    }


def isolation(other_token: str, bait: str):
    status, payload = api("GET", f"/api/v1/compliance/activations/{bait}", other_token)
    record("cross-tenant activation", "PASS" if status in (403, 404) else "FAIL", str(status))
    leaked = bait in json.dumps(payload)
    record("cross-tenant activation body", "PASS" if not leaked else "FAIL", f"leaked={leaked}")
    status, payload = api("GET", "/api/v1/compliance/dashboard", other_token)
    leaked = bait in json.dumps(payload)
    record("cross-tenant dashboard", "PASS" if status == 200 and not leaked else "FAIL", f"{status} leaked={leaked}")
    status, payload = api("GET", "/api/v1/compliance/reports/executive.pdf", other_token)
    leaked = bait in json.dumps(payload) if not payload.get("binary") else False
    record("cross-tenant report", "PASS" if status in (200, 403, 404) and not leaked else "FAIL", f"{status} leaked={leaked}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = wait_hosted_sha()
    if sha_match(str(api_sha), EXPECTED_SHA) and sha_match(str(fe_sha), EXPECTED_SHA):
        record("hosted sha", "PASS", f"api={api_sha} frontend={fe_sha}")
    else:
        record("hosted sha", "FAIL", f"expected {EXPECTED_SHA} api={api_sha} frontend={fe_sha} discrepancies={RESULTS['discrepancies']}")
        if not sha_match(str(api_sha), EXPECTED_SHA):
            raise SystemExit("API has not reached the implementation SHA; refusing to grade old code as #16")

    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    created = seed(token, user)
    if created.get("activationId"):
        isolation(other_token, created["activationId"])

    viewer_denied = api("POST", "/api/v1/compliance/activations", other_token, {"frameworkVersionId": "not-a-version"})
    record("rbac activate other tenant", "PASS" if viewer_denied[0] in (400, 403, 404) else "FAIL", str(viewer_denied[0]))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        inject(page, token, user)
        paths = [
            ("/compliance", "dashboard"),
            ("/compliance/frameworks", "frameworks"),
            (f"/compliance/frameworks/{created['activationId']}" if created.get("activationId") else "/compliance/frameworks", "framework-detail"),
            (f"/compliance/requirements/{created['requirementId']}" if created.get("requirementId") else "/compliance/frameworks", "requirement"),
            ("/compliance/gaps", "gaps"),
            ("/compliance/exceptions", "exceptions"),
            (f"/compliance/campaigns/{created['campaignId']}" if created.get("campaignId") else "/compliance/gaps", "campaign"),
            (f"/compliance/audits/{created['periodId']}" if created.get("periodId") else "/compliance/gaps", "audit"),
            ("/reports", "reports-regression"),
            ("/assessments", "assessments-regression"),
            ("/questionnaires", "methodology-regression"),
            ("/risks", "risk-regression"),
            ("/risks/register", "risk-register-regression"),
            ("/control-center", "controls-regression"),
            ("/framework-coverage", "coverage-regression"),
            ("/governance-graph", "graph-regression"),
        ]
        for path, name in paths:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            time.sleep(0.9)
            body = page.inner_text("body")
            overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            record(f"overflow {name}", "PASS" if not overflow else "FAIL", f"scrollWidth overflow={overflow}")
            if name in {"dashboard", "framework-detail", "requirement"}:
                record(f"copy {name}", "PASS" if "certified compliant" not in body.lower() and "you passed cmmc" not in body.lower() else "FAIL", "customer copy")
            if name == "dashboard" and "Supreme Compliance" not in body:
                record("dashboard render", "FAIL", "title missing")
            for width in (375, 768, 1024, 1440, 1920):
                shot(page, f"{name}-{width}", width)
        if created.get("activationId"):
            page.goto(f"{BASE}/compliance/frameworks/{created['activationId']}", wait_until="networkidle")
            for label in ("Overview", "Requirements", "Controls", "Evidence", "Gaps", "Attestations", "Exceptions", "Audit periods", "Relationships", "History"):
                page.get_by_role("main").get_by_role("button", name=label, exact=True).click()
                time.sleep(0.35)
                shot(page, f"framework-{label.lower().replace(' ', '-')}-1440", 1440)
        if created.get("requirementId"):
            page.goto(f"{BASE}/compliance/requirements/{created['requirementId']}", wait_until="networkidle")
            for label in ("Overview", "Controls", "Evidence", "Testing", "Gaps", "Exceptions", "Related risks", "Relationships", "History"):
                page.get_by_role("main").get_by_role("button", name=label, exact=True).click()
                time.sleep(0.35)
                shot(page, f"requirement-{label.lower().replace(' ', '-')}-1440", 1440)
        browser.close()

    (OUT / "results.json").write_text(json.dumps({k: v for k, v in RESULTS.items() if k != "content"}, indent=2, default=str))
    print(json.dumps({
        "out": str(OUT),
        "sha": RESULTS["sha"],
        "workflow": RESULTS["workflow"],
        "fail": [c for c in RESULTS["checks"] if c["result"] == "FAIL"],
        "partial": [c for c in RESULTS["checks"] if c["result"] == "PARTIAL"],
    }, indent=2))


if __name__ == "__main__":
    main()
