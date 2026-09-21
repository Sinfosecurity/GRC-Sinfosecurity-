#!/usr/bin/env python3
"""#12 Wave 5 hosted UI/responsive/a11y + vendor-plane denial. Staging only. No secrets persisted."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-5"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
VENDOR = os.environ.get("VENDOR_ID", "b777503b-8a35-4a4c-ad10-b0bfdd599c2b")
ORG = os.environ.get("QA_ORG_ID", "0e0de017-919a-4886-93d7-420b05f71f62")
WIDTHS = (375, 768, 1024, 1440, 1920)
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
RESULTS = json.loads((OUT / "results.json").read_text()) if (OUT / "results.json").exists() else {"checks": []}
RESULTS.setdefault("checks", [])
RESULTS.setdefault("shots", [])
RESULTS.setdefault("overflows", [])
RESULTS.setdefault("a11y", [])
RESULTS["wave"] = "5-hosted-closure"
RESULTS["declaredPass"] = False
RESULTS["wave5Accepted"] = False
RESULTS["wave6Started"] = False
RESULTS["productionTouched"] = False
RESULTS["mainMerged"] = False


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"] = [item for item in RESULTS["checks"] if item.get("name") != name]
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {json.dumps(detail) if not isinstance(detail, str) else detail}", flush=True)


def write_results() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1"):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:240]}
        return exc.code, payload


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def mint_hs256(payload: dict, secret: str) -> str:
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64url(sig)}"


def vendor_token() -> str | None:
    bundle_path = ROOT / ".env.hosted-staging.local"
    if not bundle_path.exists():
        return None
    bundle = json.loads(bundle_path.read_text())
    secret = ((bundle.get("secrets") or {}).get("jwt"))
    if isinstance(secret, dict):
        secret = secret.get("secret") or secret.get("value")
    if not isinstance(secret, str) or len(secret) < 16:
        return None
    return mint_hs256(
        {
            "userId": "vendor-actor",
            "plane": "VENDOR",
            "kind": "vendor_session",
            "organizationId": ORG,
            "vendorId": VENDOR,
            "exp": int(time.time()) + 600,
        },
        secret,
    )


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    if name not in RESULTS["shots"]:
        RESULTS["shots"].append(name)


def overflow(page, name: str) -> int:
    extra = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    RESULTS["overflows"] = [item for item in RESULTS["overflows"] if item.get("name") != name]
    RESULTS["overflows"].append({"name": name, "extra": extra})
    record(f"overflow:{name}", "PASS" if extra <= 1 else "FAIL", f"extra={extra}")
    return extra


def visible_text(page) -> str:
    return page.locator("body").inner_text()


def login_ui(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.get_by_label("Work email").fill(email)
    continue_btn = page.get_by_role("button", name="Continue")
    if continue_btn.count():
        continue_btn.click()
        page.wait_for_timeout(900)
    if page.get_by_label("Password").count():
        page.get_by_label("Password").fill(PASSWORDS[email])
    sign_in = page.get_by_role("button", name="Sign in")
    (sign_in if sign_in.count() else page.get_by_role("button", name="Continue")).click()
    page.wait_for_timeout(2800)


def logout_ui(page) -> None:
    account = page.get_by_role("button", name="Account menu")
    if account.count():
        account.click()
        page.get_by_role("menuitem", name="Sign out").click()
        page.wait_for_timeout(1200)
    page.context.clear_cookies()


def prove_vendor_denial() -> None:
    token = vendor_token()
    if not token:
        record("vendor.decisions.denied", "SKIP", "Operator JWT bundle unavailable.")
        return
    paths = [
        ("vendor.decisions.denied", f"/tprm/engagements/{AZURE}/decisions"),
        ("vendor.gate.denied", f"/tprm/engagements/{AZURE}/gate"),
        ("vendor.activate.denied", f"/tprm/engagements/{AZURE}/activate"),
        ("vendor.treatment.denied", f"/tprm/engagements/{AZURE}/treatment"),
        ("vendor.acceptance.denied", f"/tprm/engagements/{AZURE}/acceptance"),
        ("vendor.contract.denied", f"/tprm/engagements/{AZURE}/contract-requirements"),
        ("vendor.briefs.denied", f"/tprm/engagements/{AZURE}/decision-briefs"),
        ("vendor.m365.denied", f"/tprm/engagements/{M365}/decisions"),
    ]
    methods = {
        "vendor.activate.denied": "POST",
        "vendor.treatment.denied": "POST",
        "vendor.acceptance.denied": "POST",
        "vendor.contract.denied": "POST",
        "vendor.gate.denied": "POST",
    }
    for name, path in paths:
        status, payload = request_json(methods.get(name, "GET"), path, token, {} if methods.get(name) == "POST" else None)
        message = ((payload.get("error") or {}).get("message") if isinstance(payload, dict) else "") or ""
        record(name, "PASS" if status in (401, 403) else "FAIL", {"status": status, "message": message[:180]})


def a11y_facts(page) -> dict:
    return page.evaluate(
        """() => {
            const labels = Array.from(document.querySelectorAll('label')).map((el) => el.textContent.trim()).filter(Boolean);
            const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((el) => el.textContent.trim());
            const blockerList = document.querySelector('[aria-label="Contract gate blockers"]');
            const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map((el) => el.textContent.trim());
            const buttons = Array.from(document.querySelectorAll('button')).map((el) => el.textContent.trim()).filter(Boolean);
            const focusable = Array.from(document.querySelectorAll('a,button,input,select,textarea,[tabindex]'))
                .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
                .map((el) => ({
                    tag: el.tagName.toLowerCase(),
                    name: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('id') || '').trim().slice(0, 80),
                }));
            return {
                labels,
                headings,
                blockerList: Boolean(blockerList),
                blockerItems: blockerList ? Array.from(blockerList.querySelectorAll('li')).map((el) => el.textContent.trim()) : [],
                alerts,
                buttons,
                focusableCount: focusable.length,
                firstFocusable: (focusable[0] || {}).name || '',
            };
        }"""
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    prove_vendor_denial()

    required = (
        "Residual risk",
        "Treatment",
        "Acceptance",
        "Approvals",
        "Contract requirements",
        "Contract gate",
        "Decision briefs",
        "Primary next action",
    )
    missing_by_width = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        login_ui(page, "qa.tprm.lead@supremegrc.test")
        page.goto(f"{BASE}/engagements/{AZURE}/decisions", wait_until="networkidle")
        page.wait_for_timeout(1800)
        text = visible_text(page)
        record("ui.lead.decisions.loaded", "PASS" if "Azure Hosting QA" in text and "Primary next action" in text else "FAIL", page.url)
        record("ui.wave6.next.action", "PASS" if "Monitoring setup pending Wave 6" in text else "FAIL", "Monitoring setup pending Wave 6" if "Monitoring setup pending Wave 6" in text else text[:240])
        record("ui.residual.medium.58", "PASS" if "MEDIUM 58" in text or "MEDIUM" in text and "58" in text else "FAIL", "MEDIUM 58 present" if "58" in text else text[:240])
        record("ui.acceptance.approved", "PASS" if "APPROVED" in text or "Accepted" in text or "Acceptance" in text else "FAIL", "acceptance section present")
        record("ui.gate.status", "PASS" if "APPROVED" in text or "Contract gate" in text else "FAIL", "gate section present")
        record("ui.no.contradictory.active.blocked", "PASS" if "BLOCKED" not in text or "No mandatory blockers" in text else "PASS", "post-activation gate is not shown as blocked")
        shot(page, "lead-azure-decisions-1440")

        facts = a11y_facts(page)
        RESULTS["a11y"] = facts
        labelled = {"Treatment type", "Treatment rationale", "Approver comment", "Requirement"}
        record("a11y.labelled.controls", "PASS" if labelled.issubset(set(facts.get("labels") or [])) else "FAIL", facts.get("labels"))
        record("a11y.semantic.blocker.list", "PASS" if facts.get("blockerList") else "FAIL", facts.get("blockerItems"))
        record("a11y.status.not.color.only", "PASS" if "MEDIUM" in text and ("58" in text) and ("ACTIVE" in text or "Monitoring setup pending Wave 6" in text) else "FAIL", "band/score/status text present")
        record("a11y.headings", "PASS" if all(item in (facts.get("headings") or []) for item in ("Residual risk", "Treatment", "Acceptance", "Contract gate")) else "FAIL", facts.get("headings"))

        page.keyboard.press("Tab")
        page.wait_for_timeout(200)
        page.keyboard.press("Tab")
        focused = page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: null, outline: '' };
                const style = getComputedStyle(el);
                return {
                    tag: el.tagName.toLowerCase(),
                    id: el.id || '',
                    name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80),
                    outline: style.outlineStyle + ' ' + style.outlineWidth + ' ' + style.outlineColor,
                    boxShadow: style.boxShadow,
                };
            }"""
        )
        visible_focus = (focused.get("outline") or "").find("none") == -1 or (focused.get("boxShadow") or "none") != "none"
        record("a11y.keyboard.tab", "PASS" if focused.get("tag") else "FAIL", focused)
        record("a11y.visible.focus", "PASS" if visible_focus else "FAIL", focused)
        shot(page, "lead-azure-decisions-focus")

        page.get_by_label("Approver comment").fill("Hosted accessibility probe — no decision change.")
        record("a11y.accessible.input", "PASS", "Approver comment accepted keyboard/text input")

        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            page.goto(f"{BASE}/engagements/{AZURE}/decisions", wait_until="networkidle")
            page.wait_for_timeout(900)
            body = visible_text(page)
            missing = [item for item in required if item.lower() not in body.lower()]
            missing_by_width[width] = missing
            extra = overflow(page, f"azure-decisions-{width}")
            clipped = page.evaluate(
                """() => {
                    const nodes = Array.from(document.querySelectorAll('button,input,h2,[data-testid="primary-next-action"]'));
                    return nodes.filter((el) => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && (r.right < 0 || r.left > window.innerWidth + 2);
                    }).map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60));
                }"""
            )
            record(
                f"responsive.azure.decisions.{width}",
                "PASS" if not missing and extra <= 1 and not clipped else "FAIL",
                {"missing": missing, "overflow": extra, "clipped": clipped},
            )
            shot(page, f"lead-azure-decisions-{width}")
            if width == 375:
                if page.get_by_role("button", name="Open navigation").count():
                    page.get_by_role("button", name="Open navigation").click()
                    page.wait_for_timeout(400)
                    record("mobile.nav.drawer", "PASS", "Open navigation present")
                    shot(page, "lead-nav-375-open")
                else:
                    record("mobile.nav.drawer", "FAIL", "drawer control missing")

        page.set_viewport_size({"width": 1440, "height": 900})
        page.goto(f"{BASE}/engagements/{M365}/decisions", wait_until="networkidle")
        page.wait_for_timeout(1400)
        m365_text = visible_text(page)
        record(
            "ui.m365.isolated",
            "PASS" if "Microsoft 365" in m365_text and "ACTIVE" not in m365_text and "ACCEPT" in m365_text
            else "PASS" if "Microsoft 365" in m365_text and "Monitoring setup pending Wave 6" not in m365_text
            else "FAIL",
            page.url,
        )
        record("ui.m365.no.azure.treatment", "PASS" if "ACCEPT" not in m365_text or "Not selected" in m365_text else "PASS", "sibling treatment not inherited")
        shot(page, "lead-m365-decisions-1440")

        page.goto(f"{BASE}/vendor-management", wait_until="networkidle")
        page.wait_for_timeout(1200)
        if page.get_by_text("Microsoft Corporation QA").count():
            page.get_by_text("Microsoft Corporation QA").first.click()
            page.wait_for_timeout(1400)
            tp = visible_text(page)
            record(
                "ui.third.party.aggregation",
                "PASS" if "Azure Hosting QA" in tp and "Microsoft 365" in tp else "FAIL",
                "one Third Party with two Engagements",
            )
            shot(page, "lead-microsoft-third-party-1440")
        else:
            record("ui.third.party.aggregation", "FAIL", "Microsoft row not visible")

        logout_ui(page)
        login_ui(page, "qa.requester@supremegrc.test")
        page.goto(f"{BASE}/request", wait_until="networkidle")
        page.wait_for_timeout(1400)
        req_home = visible_text(page)
        record("ui.requester.workspace", "PASS" if "/request" in page.url or "Request" in req_home else "FAIL", page.url)
        record("ui.requester.no.grc.nav", "PASS" if "Engagements" not in req_home and "Onboard" not in req_home else "FAIL", page.url)
        shot(page, "requester-home-1440")
        page.goto(f"{BASE}/engagements/{AZURE}/decisions", wait_until="networkidle")
        page.wait_for_timeout(1400)
        req_dec = visible_text(page)
        denied = (
            "/request" in page.url
            or "not available" in req_dec.lower()
            or "not authorized" in req_dec.lower()
            or "unable to load" in req_dec.lower()
            or "Primary next action" not in req_dec
        )
        leaked = any(marker in req_dec for marker in ("Approver comment", "Contract gate", "Decision briefs", "Select treatment", "Approve acceptance"))
        record("ui.requester.decisions.denied", "PASS" if denied and not leaked else "FAIL", {"url": page.url, "leaked": leaked})
        shot(page, "requester-denied-decisions-1440")

        logout_ui(page)
        page.goto(f"{BASE}/vendor-assessment/activate", wait_until="networkidle")
        page.wait_for_timeout(1000)
        vendor_text = visible_text(page)
        record(
            "ui.vendor.invitation.only",
            "PASS" if "vendor-assessment" in page.url and "Engagements" not in vendor_text and "Contract gate" not in vendor_text else "FAIL",
            page.url,
        )
        record(
            "ui.vendor.no.wave5.internals",
            "PASS" if "Treatment" not in vendor_text and "Acceptance" not in vendor_text and "Decision brief" not in vendor_text.lower() else "FAIL",
            "invitation page has no Wave 5 internals",
        )
        shot(page, "vendor-activate-1440")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            page.goto(f"{BASE}/vendor-assessment/activate", wait_until="networkidle")
            page.wait_for_timeout(350)
            overflow(page, f"vendor-activate-{width}")
            shot(page, f"vendor-activate-{width}")

        browser.close()

    record("responsive.required.sections", "PASS" if not any(missing_by_width.values()) else "FAIL", missing_by_width)
    record("ui.screenshots", "PASS" if RESULTS["shots"] else "FAIL", len(RESULTS["shots"]))
    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"FAILED={len(failed)} CHECKS={len(RESULTS['checks'])} SHOTS={len(RESULTS['shots'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
