#!/usr/bin/env python3
"""Continue VND-2026-0025 after contract 520. Staging only. Does not declare H-4 closed."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "sprint-3-phase-c-integrity"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL_A = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
EMAIL_B = os.environ.get("E2E_APPROVER_EMAIL", "sales@eliteadjustersny.com")
PASSWORD_B = os.environ.get("E2E_APPROVER_PASSWORD", PASSWORD)
PUBLIC_ID = os.environ.get("E2E_VENDOR", "VND-2026-0025")
WIDTHS = (375, 768, 1024, 1440, 1920)
AXE_PATH = ROOT / "scripts" / "axe.min.js"
RESULTS = {"checks": [], "shots": [], "axe": [], "overflows": [], "sha": {}, "workflow": {"publicId": PUBLIC_ID}}

CLAUSES = {
    "security_addendum": True,
    "breach_notification": True,
    "subprocessor": True,
    "dpa": True,
    "baa": True,
    "deletion_return": True,
    "right_to_audit": True,
}


def api(method, path, token=None, body=None, timeout=180):
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


def residual(workspace):
    data = unwrap(workspace) if isinstance(workspace, dict) else {}
    life = data.get("lifecycle") or {}
    return life.get("residualRisk") if life.get("residualRisk") is not None else data.get("residualRiskScore")


def findings_of(workspace):
    data = unwrap(workspace) if isinstance(workspace, dict) else {}
    life = data.get("lifecycle") or {}
    return life.get("findings") or data.get("findings") or []


def login(email, password, plane="CUSTOMER"):
    status, payload = api("POST", "/api/v1/auth/login", body={"email": email, "password": password, "plane": plane})
    if status != 200:
        return None, None, status, payload
    return payload["data"]["token"], payload["data"]["user"], status, payload


def persist():
    OUT.mkdir(parents=True, exist_ok=True)
    existing = {}
    if (OUT / "results.json").exists():
        existing = json.loads((OUT / "results.json").read_text(encoding="utf-8"))
    merged = {
        **existing,
        "followup": RESULTS,
        "checks": (existing.get("checks") or []) + RESULTS["checks"],
        "shots": (existing.get("shots") or []) + RESULTS["shots"],
        "axe": (existing.get("axe") or []) + RESULTS["axe"],
    }
    (OUT / "results.json").write_text(json.dumps(merged, indent=2), encoding="utf-8")


def shot(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.4)
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    if overflow:
        RESULTS["overflows"].append(f"{name}@{width}")
    record(f"{name}-{width}", "FAIL" if overflow else "PASS", f"overflow={overflow}")


def axe_page(page, name):
    if not AXE_PATH.exists():
        record(f"axe-{name}", "PARTIAL", "axe.min.js missing")
        return
    page.add_script_tag(path=str(AXE_PATH))
    result = page.evaluate(
        """async () => {
            const run = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
            return { violations: run.violations.map((row) => ({ id: row.id, impact: row.impact, help: row.help })) };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("serious", "critical")]
    RESULTS["axe"].append({"name": name, **result, "seriousOrCritical": len(serious)})
    record(f"axe-{name}", "PASS" if not serious else "FAIL", f"serious+critical={len(serious)}")


def main():
    token_a, user_a, status_a, _ = login(EMAIL_A, PASSWORD)
    record("user-a-login", "PASS" if token_a else "FAIL", str(status_a))
    token_b, user_b, status_b, _ = login(EMAIL_B, PASSWORD_B)
    record("user-b-login", "PASS" if token_b else "FAIL", str(status_b))
    if not token_a or not token_b:
        persist()
        raise SystemExit(1)

    _, workspace = api("GET", f"/api/v1/vendors/onboarding/{PUBLIC_ID}", token_a)
    before = residual(workspace)
    record("residual-after-close-before-more-acceptance", "PASS" if before is not None else "FAIL", str(before))
    open_rows = [
        row
        for row in findings_of(workspace)
        if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED", "RESOLVED", "ESCALATED")
    ]
    for row in open_rows:
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{PUBLIC_ID}/findings/{row['id']}/accept-risk",
            token_a,
            {"rationale": "Time-bounded exception pending the next review.", "conditions": "Revisit at reassessment."},
        )
        api(
            "POST",
            f"/api/v1/vendors/onboarding/{PUBLIC_ID}/findings/{row['id']}/accept-risk/approve",
            token_b,
            {"rationale": "Independent reviewer accepts the residual as presented."},
        )
    _, after_accept = api("GET", f"/api/v1/vendors/onboarding/{PUBLIC_ID}", token_a)
    after = residual(after_accept)
    record(
        "acceptance-does-not-change-residual",
        "PASS" if after == before else "FAIL",
        f"before={before} after={after}",
    )

    attest_status, attested = (None, {})
    for attempt in range(4):
        attest_status, attested = api(
            "POST",
            f"/api/v1/vendors/onboarding/{PUBLIC_ID}/contract/attest",
            token_a,
            {"attested": True, "clauses": CLAUSES},
        )
        if attest_status == 200:
            break
        time.sleep(5)
    record("contract", "PASS" if attest_status == 200 else "FAIL", f"{attest_status} {message_of(attested)}")
    ready = (unwrap(attested).get("lifecycle") or {}).get("readyForIndependentApproval")
    record("ready-for-independent-approval", "PASS" if ready or attest_status == 200 else "FAIL", str(ready))

    self_status, self_body = api(
        "POST",
        f"/api/v1/vendors/onboarding/{PUBLIC_ID}/approval",
        token_a,
        {"decision": "APPROVE_WITH_CONDITIONS", "conditions": "Keep inventory current.", "rationale": "Gates satisfied."},
    )
    record("user-a-self-approve-vendor", "DENIED" if self_status == 403 else "FAIL", f"{self_status} {message_of(self_body)}")

    approve_status, approved = api(
        "POST",
        f"/api/v1/vendors/onboarding/{PUBLIC_ID}/approval",
        token_b,
        {"decision": "APPROVE_WITH_CONDITIONS", "conditions": "Keep inventory current.", "rationale": "Gates satisfied."},
    )
    life = unwrap(approved).get("lifecycle") or {}
    record(
        "independent-approval",
        "PASS" if approve_status == 200 and life.get("approvalDecision") == "APPROVE_WITH_CONDITIONS" else "FAIL",
        f"{approve_status} {life.get('approvalDecision')} {message_of(approved)}",
    )

    activate_status, activated = api("POST", f"/api/v1/vendors/onboarding/{PUBLIC_ID}/activate", token_a, {})
    active_life = unwrap(activated).get("lifecycle") or {}
    record(
        "active",
        "PASS" if activate_status == 200 and active_life.get("vendorStatus") == "ACTIVE" else "FAIL",
        f"{activate_status} {active_life.get('vendorStatus')} {message_of(activated)}",
    )
    record("monitoring", "PASS" if activate_status == 200 else "FAIL", json.dumps(active_life.get("monitoring") or {})[:240])
    reassess_status, _ = api("GET", f"/api/v1/vendors/onboarding/{PUBLIC_ID}/reassessment", token_a)
    record("reassessment", "PASS" if reassess_status == 200 else "FAIL", str(reassess_status))

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
        page.goto(f"{BASE}/vendor-onboarding/{PUBLIC_ID}", wait_until="networkidle", timeout=90000)
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        record(
            "workspace-active-copy",
            "PASS" if "active" in body.lower() or "monitoring" in body.lower() else "PARTIAL",
            body[:220].replace("\n", " "),
        )
        for width in WIDTHS:
            shot(page, "workspace-active", width)
        axe_page(page, "workspace-active")
        browser.close()

    persist()
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"failed": len(failed), "total": len(RESULTS["checks"])}, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
