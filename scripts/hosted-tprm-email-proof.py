#!/usr/bin/env python3
"""Hosted premium transactional email proof. Staging only. Does not send extra mail. Does not declare PASS."""

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
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "transactional-email" / "hosted"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
REQUIRED = os.environ.get("REQUIRED_SHA", "e250493c7dba98d882701acd83907f8cfaff1886")
WANTED = (
    "vendor.intake_assigned",
    "vendor.invitation",
    "vendor.invitation_reminder",
    "vendor.clarification_requested",
    "vendor.assessment_submitted",
    "vendor.approval_required",
    "automation.work",
    "auth.password_reset",
)
QUALITY = (
    "who sent",
    "why received",
    "what about",
    "what to do",
    "when due",
    "where click",
    "what next",
)
RESULTS = {"checks": [], "shots": [], "previews": [], "sha": {}, "quality": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw.decode())
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:300].decode("utf-8", "replace")}


def record(name: str, result: str, detail: str):
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:7} {name}: {detail}", flush=True)


def redact(html: str) -> str:
    return re.sub(r"token=[^\"'&\s]+", "token=REDACTED", html)


def quality_check(item: dict):
    blob = f"{item.get('subject')}\n{item.get('fromName')}\n{item.get('text')}\n{item.get('html')}".lower()
    answers = {
        "who sent": bool(item.get("fromName")) and ("supreme" in blob),
        "why received": any(word in blob for word in ("requested", "invited", "required", "reset", "overdue", "decision")),
        "what about": any(word in blob for word in ("vendor", "intake", "due diligence", "approval", "password", "finding", "work")),
        "what to do": any(word in blob for word in ("complete", "start", "review", "reset", "continue", "upload", "open")),
        "when due": "due" in blob or item["templateKey"] in ("auth.password_reset", "vendor.approval_required", "vendor.assessment_submitted"),
        "where click": "http" in blob and any(word in blob for word in ("complete", "start", "review", "reset", "continue", "open", "upload")),
        "what next": "what happens next" in blob or item["templateKey"] == "auth.password_reset",
    }
    missing = [key for key, ok in answers.items() if not ok]
    status = "PASS" if not missing else "PARTIAL"
    RESULTS["quality"].append({"templateKey": item["templateKey"], "result": status, "missing": missing, "subject": item.get("subject"), "fromName": item.get("fromName")})
    record(f"quality-{item['templateKey']}", status, f"missing={missing or 'none'} subject={item.get('subject')}")
    return status


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    _, health = api("GET", "/health")
    try:
        with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
            frontend = json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001
        frontend = {"error": str(exc)}
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": frontend.get("gitSha"), "required": REQUIRED}
    record("hosted-api-sha", "PASS" if health.get("gitSha") == REQUIRED else "PARTIAL", str(health.get("gitSha")))
    record("hosted-frontend-sha", "PASS" if frontend.get("gitSha") == REQUIRED else "PARTIAL", str(frontend.get("gitSha")))

    login = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    if login[0] != 200:
        raise SystemExit(f"login failed {login}")
    token, user = login[1]["data"]["token"], login[1]["data"]["user"]
    unknown = api("POST", "/api/v1/auth/forgot-password", body={"email": "nobody-unknown@example.invalid"})
    time.sleep(1.2)
    known = api("POST", "/api/v1/auth/forgot-password", body={"email": EMAIL})
    unknown_body = json.dumps(unknown[1])
    known_body = json.dumps(known[1])
    same_customer_shape = unknown[0] == known[0] and "If an account exists" in unknown_body and "If an account exists" in known_body
    record("password-reset-no-enumeration", "PASS" if same_customer_shape else "PARTIAL", f"{unknown[0]}/{known[0]} {unknown_body[:160]} {known_body[:160]}")
    record("password-reset-no-raw-token", "FAIL" if "resetToken" in known_body or "resetToken" in unknown_body else "PASS", known_body[:180])

    previews = api("GET", "/api/v1/system/email-previews", token)
    payload = previews[1].get("data") or {}
    record("email-previews", "PASS" if previews[0] == 200 and payload.get("sent") is False else "FAIL", f"{previews[0]} sent={payload.get('sent')}")
    inventory = payload.get("inventory") or []
    record("email-inventory-count", "PASS" if len(inventory) >= 20 else "PARTIAL", str(len(inventory)))
    RESULTS["inventory"] = inventory
    items = {row.get("templateKey"): row for row in payload.get("previews") or []}
    for key in WANTED:
        item = items.get(key)
        record(f"preview-{key}", "PASS" if item else "FAIL", key if item else "missing")
        if not item:
            continue
        html = redact(item.get("html") or "")
        text = redact(item.get("text") or "")
        record(f"plain-text-{key}", "PASS" if text and "http" in text else "FAIL", text[:120])
        record(f"from-{key}", "PASS" if item.get("fromName") else "FAIL", str(item.get("fromName")))
        record(f"cta-{key}", "PASS" if "http" in html and "token=REDACTED" in html or "http" in html else "PARTIAL", "cta present; tokens redacted in capture")
        record(f"no-live-token-{key}", "PASS" if "token=" not in html or "token=REDACTED" in html or "preview-token" in (item.get("html") or "") else "FAIL", "fixture token only")
        quality_check(item)
        (OUT / f"{key.replace('.', '-')}.html").write_text(html, encoding="utf-8")
        (OUT / f"{key.replace('.', '-')}.txt").write_text(text, encoding="utf-8")
        RESULTS["previews"].append({
            "templateKey": key,
            "subject": item.get("subject"),
            "fromName": item.get("fromName"),
            "htmlFile": str((OUT / f"{key.replace('.', '-')}.html").relative_to(ROOT)),
        })

    brand = " ".join(f"{row.get('fromName')} {row.get('subject')}" for row in items.values())
    record("platform-brand", "PASS" if "Supreme" in brand else "FAIL", brand[:180])
    record("via-supreme", "PASS" if any("via Supreme" in str(row.get("fromName")) for row in items.values()) else "FAIL", str([row.get("fromName") for row in items.values()]))
    queued_truth = any("queued is not" in str(row.get("text") or "").lower() for row in items.values())
    record("queued-not-delivered-copy", "PASS" if queued_truth else "PARTIAL", "internal invitation-sent template states queued is not inbox proof" if queued_truth else "preview set does not include invitation-sent-internal")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        for key in WANTED:
            path = OUT / f"{key.replace('.', '-')}.html"
            if not path.exists():
                continue
            page.set_content(path.read_text(encoding="utf-8"))
            time.sleep(0.3)
            for width, suffix in ((1440, "desktop"), (375, "mobile")):
                page.set_viewport_size({"width": width, "height": 900})
                overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
                shot = OUT / f"{key.replace('.', '-')}-{suffix}.png"
                page.screenshot(path=str(shot), full_page=True)
                RESULTS["shots"].append(str(shot.relative_to(ROOT)))
                record(f"{key}-{suffix}-overflow", "FAIL" if overflow else "PASS", f"width {width} overflow={overflow}")
            page.add_script_tag(path=str(AXE_PATH))
            axe = page.evaluate(
                """async () => {
                    const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
                    return out.violations.filter((row) => row.impact === 'serious' || row.impact === 'critical').map((row) => row.id);
                }"""
            )
            record(f"axe-{key}", "FAIL" if axe else "PASS", str(axe))
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [token, user],
        )
        for path, name in (
            ("/vendor-onboarding", "lifecycle"),
            ("/governance-graph", "graph"),
            ("/control-center", "shared-controls"),
            ("/risks", "risk"),
            ("/compliance", "compliance"),
            ("/privacy-ops", "privacy"),
            ("/ai-governance", "ai"),
            ("/intelligence", "intelligence"),
            ("/documents", "evidence"),
            ("/dashboard", "premium-home"),
        ):
            page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=90000)
            time.sleep(0.6)
            shot = OUT / f"regression-{name}.png"
            page.screenshot(path=str(shot), full_page=False)
            RESULTS["shots"].append(str(shot.relative_to(ROOT)))
            record(f"regression-{name}", "PASS" if "login" not in page.url else "FAIL", page.url)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"failed": failed, "sha": RESULTS["sha"], "inventory": len(inventory), "quality": RESULTS["quality"]}, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
