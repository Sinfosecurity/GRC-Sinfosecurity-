#!/usr/bin/env python3
"""#12 consolidated Golden Journey hosted UI/responsive/a11y. Staging only. No secrets persisted."""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "final-certification"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
AZURE = "93a259e6-81bf-4eb1-b79f-2077c6eeafda"
M365 = "eeb0ae53-0e05-4748-8434-79f28c9e564a"
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
RESULTS["declaredPass"] = False
RESULTS["twelvePass"] = False
RESULTS["productionTouched"] = False
RESULTS["mainMerged"] = False


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"] = [item for item in RESULTS["checks"] if item.get("name") != name]
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail if isinstance(detail, (str, int)) else json.dumps(detail)[:240]}", flush=True)


def write_results() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")


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


def a11y_facts(page) -> dict:
    return page.evaluate(
        """() => {
            const labels = Array.from(document.querySelectorAll('label')).map((el) => el.textContent.trim()).filter(Boolean);
            const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((el) => el.textContent.trim());
            const table = document.querySelector('table');
            const focusable = Array.from(document.querySelectorAll('a,button,input,select,textarea,[tabindex]'))
                .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
            return { labels, headings, hasTable: Boolean(table), focusableCount: focusable.length };
        }"""
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["uiSha"] = fe.get("gitSha")
    RESULTS["checks"] = [
        item for item in RESULTS.get("checks", [])
        if not str(item.get("name") or "").startswith(("ui.", "overflow:", "responsive.", "a11y.", "nav."))
    ]
    record("ui.hosted.sha", "PASS" if fe.get("gitSha") == "da9f7de77239f0a354508fe757b1f2291637f20f" else "FAIL", fe.get("gitSha"))

    lifecycle = [
        ("overview", f"{BASE}/engagements/{AZURE}"),
        ("inherent", f"{BASE}/engagements/{AZURE}/inherent-risk"),
        ("dd", f"{BASE}/engagements/{AZURE}/due-diligence"),
        ("evidence", f"{BASE}/engagements/{AZURE}/evidence"),
        ("findings", f"{BASE}/engagements/{AZURE}/findings"),
        ("controls", f"{BASE}/engagements/{AZURE}/controls"),
        ("residual", f"{BASE}/engagements/{AZURE}/residual-risk"),
        ("decisions", f"{BASE}/engagements/{AZURE}/decisions"),
        ("monitoring", f"{BASE}/engagements/{AZURE}/monitoring"),
        ("reassessment", f"{BASE}/engagements/{AZURE}/reassessment"),
        ("offboarding", f"{BASE}/engagements/{AZURE}/offboarding"),
        ("history", f"{BASE}/engagements/{AZURE}/history"),
    ]

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        login_ui(page, "qa.tprm.lead@supremegrc.test")
        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(1200)
        nav = visible_text(page)
        record("nav.no.workspace.switcher", "PASS" if "Switch workspace" not in nav and "Open requester workspace" not in nav else "FAIL", "GRC shell")
        record("nav.primary.present", "PASS" if any(label.lower() in nav.lower() for label in ("Intake", "Third Part", "Engagement", "Finding")) else "FAIL", page.url)
        shot(page, "lead-home-1440")

        page.goto(f"{BASE}/third-parties/intake", wait_until="networkidle")
        page.wait_for_timeout(1200)
        record("ui.intake.queue", "PASS" if "intake" in visible_text(page).lower() else "FAIL", page.url)
        shot(page, "lead-intake-queue-1440")

        page.goto(f"{BASE}/third-parties/my-work", wait_until="networkidle")
        page.wait_for_timeout(1000)
        record("ui.my.work", "PASS" if "work" in visible_text(page).lower() or "action" in visible_text(page).lower() else "FAIL", page.url)
        shot(page, "lead-my-work-1440")

        page.goto(f"{BASE}/engagements", wait_until="networkidle")
        page.wait_for_timeout(1200)
        engagements = visible_text(page)
        record("ui.engagements.list", "PASS" if "Azure" in engagements or "Microsoft" in engagements or "engagement" in engagements.lower() else "FAIL", page.url)
        shot(page, "lead-engagements-1440")

        for name, url in lifecycle:
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(1100)
            body = visible_text(page)
            record(f"ui.azure.{name}", "PASS" if "access denied" not in body.lower() else "FAIL", page.url)
            if name in {"overview", "residual", "offboarding", "history", "findings", "monitoring", "reassessment"}:
                shot(page, f"lead-azure-{name}-1440")

        page.goto(f"{BASE}/engagements/{AZURE}/residual-risk", wait_until="networkidle")
        page.wait_for_timeout(1200)
        residual = visible_text(page)
        record("ui.cycle1.medium.58", "PASS" if "MEDIUM" in residual and "58" in residual else "FAIL", residual[:200])
        facts = a11y_facts(page)
        record("a11y.headings", "PASS" if facts.get("headings") else "FAIL", facts.get("headings"))
        page.keyboard.press("Tab")
        focused = page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: null, outline: '' };
                const style = getComputedStyle(el);
                return { tag: el.tagName.toLowerCase(), outline: style.outlineStyle + ' ' + style.outlineWidth, boxShadow: style.boxShadow };
            }"""
        )
        visible_focus = "none" not in (focused.get("outline") or "") or (focused.get("boxShadow") or "none") != "none"
        record("a11y.keyboard.tab", "PASS" if focused.get("tag") else "FAIL", focused)
        record("a11y.visible.focus", "PASS" if visible_focus else "FAIL", focused)

        page.goto(f"{BASE}/engagements/{M365}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        m365 = visible_text(page)
        record("ui.m365.independent", "PASS" if "Microsoft 365" in m365 or "365" in m365 else "FAIL", page.url)
        record("ui.m365.not.offboarded", "PASS" if "OFFBOARDED" not in m365.upper() else "FAIL", m365[:180])
        shot(page, "lead-m365-overview-1440")

        responsive_urls = {
            "intake": f"{BASE}/third-parties/intake",
            "azure-overview": f"{BASE}/engagements/{AZURE}",
            "azure-offboarding": f"{BASE}/engagements/{AZURE}/offboarding",
        }
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for name, url in responsive_urls.items():
                page.goto(url, wait_until="networkidle")
                page.wait_for_timeout(800)
                extra = overflow(page, f"{name}-{width}")
                record(f"responsive.{name}.{width}", "PASS" if extra <= 1 else "FAIL", extra)
                if width in (375, 1440, 1920):
                    shot(page, f"lead-{name}-{width}")

        logout_ui(page)
        login_ui(page, "qa.requester@supremegrc.test")
        page.goto(f"{BASE}/request", wait_until="networkidle")
        page.wait_for_timeout(1400)
        req_home = visible_text(page)
        record("ui.requester.home", "PASS" if "request" in req_home.lower() or "intake" in req_home.lower() or "action" in req_home.lower() else "FAIL", page.url)
        shot(page, "requester-home-1440")
        page.goto(f"{BASE}/engagements/{AZURE}/findings", wait_until="networkidle")
        page.wait_for_timeout(1000)
        denied = visible_text(page).lower()
        record("ui.requester.denied.findings", "PASS" if "access denied" in denied or "permission" in denied or "unauthorized" in page.url else "FAIL", page.url)
        shot(page, "requester-denied-findings-1440")
        page.goto(f"{BASE}/request/new", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "requester-intake-1440")

        logout_ui(page)
        page.goto(f"{BASE}/vendor-assessment/activate", wait_until="networkidle")
        page.wait_for_timeout(800)
        vendor = visible_text(page).lower()
        record("ui.vendor.invitation.only", "PASS" if "invitation" in vendor or "activate" in vendor or "token" in vendor else "FAIL", page.url)
        shot(page, "vendor-activate-1440")

        browser.close()

    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"UI_FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
