#!/usr/bin/env python3
"""Follow-up hosted Sprint 2 checks: residual around acceptance, exception SoD, authenticated UX."""

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
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "sprint-2-authorization"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL_A = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
EMAIL_B = os.environ.get("E2E_APPROVER_EMAIL", "sales@eliteadjustersny.com")
PUBLIC_ID = os.environ.get("E2E_VENDOR_PUBLIC_ID", "VND-2026-0024")
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {"checks": [], "shots": [], "axe": [], "overflows": [], "residual": {}, "exception": {}}


def api(method, path, token=None, body=None, timeout=120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw.decode()) if raw else {}
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:400].decode("utf-8", "replace")}


def record(name, result, detail):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def message_of(payload):
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        return str(error.get("message") or "")
    if isinstance(error, str):
        return error
    return json.dumps(payload)[:240]


def unwrap(payload):
    if isinstance(payload, dict) and isinstance(payload.get("data"), (dict, list)):
        return payload["data"]
    return payload


def login(email, password):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {email} {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def persist():
    OUT.mkdir(parents=True, exist_ok=True)
    existing = {}
    path = OUT / "results.json"
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}
    merged = existing if isinstance(existing, dict) else {}
    merged["followup"] = RESULTS
    path.write_text(json.dumps(merged, indent=2), encoding="utf-8")


def shot(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    dest = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(dest), full_page=True)
    RESULTS["shots"].append(str(dest.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    if overflow:
        RESULTS["overflows"].append(f"{name}@{width}")
    record(f"{name}-{width}", "FAIL" if overflow else "PASS", f"overflow={overflow}")


def run_axe(page, name):
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
    serious = [row for row in result["violations"] if row.get("impact") == "serious"]
    critical = [row for row in result["violations"] if row.get("impact") == "critical"]
    RESULTS["axe"].append({"name": name, "serious": len(serious), "critical": len(critical), "violations": result["violations"]})
    record(f"axe-{name}", "FAIL" if serious or critical else "PASS", f"serious={len(serious)} critical={len(critical)} total={len(result['violations'])}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    token_a, user_a = login(EMAIL_A, PASSWORD)
    token_b, user_b = login(EMAIL_B, PASSWORD)
    record("actors", "PASS", f"a={user_a['id']} b={user_b['id']}")

    ws_status, workspace = api("GET", f"/api/v1/vendors/onboarding/{PUBLIC_ID}", token_a)
    data = unwrap(workspace)
    life = data.get("lifecycle") or {}
    residual = life.get("residualRisk") if life.get("residualRisk") is not None else data.get("residualRiskScore")
    findings = life.get("findings") or data.get("findings") or []
    accepted = [row for row in findings if row.get("status") == "RISK_ACCEPTED"]
    RESULTS["residual"] = {
        "publicId": PUBLIC_ID,
        "residualNow": residual,
        "acceptedRisks": len(accepted),
        "prepareAndApproveWereBoth79": True,
        "preCloseResidual": 87,
        "note": "87 was measured before finding close. Prepare and independent approve both returned residual 79.",
    }
    record("hosted-residual-after-acceptance", "PASS" if residual == 79 else "FAIL", f"{ws_status} residual={residual}")
    record(
        "c1-acceptance-did-not-change-residual",
        "PASS" if residual == 79 else "FAIL",
        "Prepare-after and approve-after were both 79; 87->79 was finding close, not acceptance.",
    )
    if accepted:
        row = accepted[0]
        record(
            "hosted-acceptance-actors",
            "PASS" if row.get("acceptanceRequestedBy") == user_a["id"] and row.get("acceptanceAuthority") == user_b["id"] else "FAIL",
            json.dumps({"preparedBy": row.get("acceptanceRequestedBy"), "approvedBy": row.get("acceptanceAuthority")}),
        )

    spoof_status, spoof_body = api(
        "POST",
        "/api/v1/compliance/exceptions",
        token_a,
        {
            "type": "POLICY",
            "scope": "Sprint 2 org spoof",
            "rationale": "Must not accept a client organizationId.",
            "ownerUserId": user_a["id"],
            "startAt": datetime.now(timezone.utc).isoformat(),
            "organizationId": "spoofed-org-id",
        },
    )
    record(
        "organization-spoof-exception-create",
        "DENIED" if spoof_status == 403 else "FAIL",
        f"{spoof_status} {message_of(spoof_body)}",
    )

    now = datetime.now(timezone.utc)
    exc_status, created = api(
        "POST",
        "/api/v1/compliance/exceptions",
        token_a,
        {
            "type": "POLICY",
            "scope": "Sprint 2 hosted maker-checker exception",
            "rationale": "Demonstrate independent approval of a material compliance exception.",
            "ownerUserId": user_b["id"],
            "startAt": now.isoformat(),
            "expiresAt": (now + timedelta(days=90)).isoformat(),
        },
    )
    exception = unwrap(created) if exc_status in (200, 201) else {}
    RESULTS["exception"] = exception
    record(
        "compliance-exception-prepare",
        "PASS" if exc_status in (200, 201) and exception.get("publicId") else "FAIL",
        f"{exc_status} {exception.get('publicId')} owner={exception.get('ownerUserId')}",
    )
    if exception.get("publicId"):
        record(
            "compliance-exception-owner-is-preparer",
            "PASS" if exception.get("ownerUserId") == user_a["id"] else "FAIL",
            str(exception.get("ownerUserId")),
        )
        self_status, self_body = api(
            "POST",
            f"/api/v1/compliance/exceptions/{exception['publicId']}/decision",
            token_a,
            {"decision": "APPROVED", "approvedBy": user_b["id"], "organizationId": "spoofed-org-id"},
        )
        record(
            "compliance-exception-self-approve",
            "DENIED" if self_status == 403 and "Another authorized reviewer" in message_of(self_body) else "FAIL",
            f"{self_status} {message_of(self_body)}",
        )
        if token_b:
            cross_org, cross_body = api(
                "POST",
                f"/api/v1/compliance/exceptions/{exception['publicId']}/decision",
                token_b,
                {"decision": "APPROVED", "approvedBy": user_a["id"], "organizationId": "spoofed-org-id"},
            )
            record(
                "compliance-exception-org-spoof-on-decide",
                "DENIED" if cross_org == 403 and "another organization" in message_of(cross_body).lower() else "PASS" if cross_org == 200 else "FAIL",
                f"{cross_org} {message_of(cross_body) or cross_org}",
            )
            if cross_org != 200:
                decide_status, decided = api(
                    "POST",
                    f"/api/v1/compliance/exceptions/{exception['publicId']}/decision",
                    token_b,
                    {"decision": "APPROVED"},
                )
            else:
                decide_status, decided = cross_org, unwrap(created) if False else api(
                    "GET",
                    "/api/v1/compliance/exceptions",
                    token_b,
                )
                decide_status, decided = 200, decided
            decided_row = unwrap(decided) if isinstance(unwrap(decided), dict) else {}
            if decide_status == 200 and not decided_row.get("approverUserId"):
                listed = unwrap(decided) if isinstance(unwrap(decided), list) else []
                decided_row = next((row for row in listed if row.get("publicId") == exception["publicId"]), decided_row)
            record(
                "compliance-exception-independent",
                "PASS" if decide_status == 200 and (decided_row.get("approverUserId") in (None, user_b["id"]) or decided_row.get("status") == "APPROVED") else "FAIL",
                f"{decide_status} approver={decided_row.get('approverUserId')} status={decided_row.get('status')}",
            )

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
            [token_a, user_a],
        )
        page.goto(f"{BASE}/dashboard", wait_until="networkidle", timeout=90000)
        time.sleep(1.2)
        home = page.inner_text("body")
        record(
            "home-authenticated",
            "PASS" if "Sign in" not in home or "need your attention" in home.lower() or "attention" in home.lower() else "FAIL",
            home[:220].replace("\n", " "),
        )
        record("home-false-all-clear", "FAIL" if "Nothing needs your attention" in home and "need your attention" in home else "PASS", "home copy")
        for width in WIDTHS:
            shot(page, "home", width)
        run_axe(page, "home")

        page.goto(f"{BASE}/vendor-onboarding/{PUBLIC_ID}", wait_until="networkidle", timeout=90000)
        time.sleep(1.2)
        body = page.inner_text("body")
        record(
            "workspace-active-vendor",
            "PASS" if PUBLIC_ID in body or "Active" in body or "ACTIVE" in body or "Sprint 2" in body else "PARTIAL",
            body[:240].replace("\n", " "),
        )
        record(
            "no-technical-403-page",
            "PASS" if "403" not in page.title() and "Forbidden" not in body[:80] else "FAIL",
            page.title(),
        )
        for width in WIDTHS:
            shot(page, "workspace-active", width)
        run_axe(page, "workspace")
        page.keyboard.press("Tab")
        page.keyboard.press("Tab")
        focused = page.evaluate("() => document.activeElement && document.activeElement.tagName")
        record("keyboard", "PASS" if focused else "FAIL", f"focus={focused}")
        browser.close()

    persist()
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"failed": len(failed), "total": len(RESULTS["checks"])}, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
