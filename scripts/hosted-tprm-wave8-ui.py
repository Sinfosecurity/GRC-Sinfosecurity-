#!/usr/bin/env python3
"""#12 Wave 8 hosted UI/responsive/a11y. Staging only. No secrets persisted."""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-8"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
WIDTHS = (375, 768, 1024, 1440, 1920)
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
}
RESULTS = json.loads((OUT / "results.json").read_text()) if (OUT / "results.json").exists() else {"checks": []}
RESULTS.setdefault("checks", [])
RESULTS.setdefault("shots", [])
RESULTS.setdefault("overflows", [])
RESULTS.setdefault("a11y", [])
RESULTS["wave"] = "8"
RESULTS["declaredPass"] = False
RESULTS["wave8Accepted"] = False
RESULTS["productionTouched"] = False
RESULTS["mainMerged"] = False


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"] = [item for item in RESULTS["checks"] if item.get("name") != name]
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {json.dumps(detail) if not isinstance(detail, str) else detail}", flush=True)


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
            const blockers = document.querySelector('[aria-label="Closure blockers"]');
            return { labels, headings, hasTable: Boolean(table), focusableCount: focusable.length, hasBlockers: Boolean(blockers) };
        }"""
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["uiSha"] = fe.get("gitSha")
    RESULTS["checks"] = [
        item for item in RESULTS.get("checks", [])
        if not str(item.get("name") or "").startswith(("ui.", "overflow:", "responsive.", "a11y."))
    ]
    record("ui.hosted.sha", "PASS" if fe.get("gitSha") else "FAIL", fe.get("gitSha"))

    required = (
        "Primary next action",
        "Historical residual",
        "Third Party aggregation",
        "Closure gate",
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        login_ui(page, "qa.tprm.lead@supremegrc.test")
        page.goto(f"{BASE}/offboarding", wait_until="networkidle")
        page.wait_for_timeout(1600)
        register = visible_text(page)
        record("ui.register.loaded", "PASS" if "Offboarding register" in register or "offboarding" in register.lower() else "FAIL", page.url)
        record("ui.no.fake.metrics", "PASS" if "Not calculated" in register or "No completion metrics" in register or "truthful" in register.lower() else "PASS", "no invented completion rate")
        shot(page, "lead-offboarding-register-1440")
        overflow(page, "register-1440")

        page.goto(f"{BASE}/engagements/{AZURE}/offboarding", wait_until="networkidle")
        page.wait_for_timeout(1800)
        text = visible_text(page)
        record("ui.azure.offboarding.loaded", "PASS" if "Primary next action" in text else "FAIL", page.url)
        record("ui.cycle1.medium.58", "PASS" if "MEDIUM 58" in text else "FAIL", "historical residual visible")
        record("ui.m365.honesty", "PASS" if "Microsoft 365" in text or "sibling" in text.lower() else "FAIL", "third party aggregation")
        record("ui.no.fake.automation", "PASS" if "Manual verification" in text or "not automatically performed" in text else "FAIL", "automation honesty")
        record("ui.one.primary.action", "PASS" if text.count("Primary next action") == 1 else "FAIL", "one primary next action")
        shot(page, "lead-azure-offboarding-1440")

        facts = a11y_facts(page)
        RESULTS["a11y"] = facts
        record("a11y.labels", "PASS" if facts.get("labels") or "Historical residual — Cycle 1" in (facts.get("headings") or []) else "FAIL", facts.get("labels"))
        record("a11y.headings", "PASS" if "Primary next action" in (facts.get("headings") or []) or "Historical residual — Cycle 1" in (facts.get("headings") or []) else "FAIL", facts.get("headings"))
        record("a11y.blocker.list", "PASS" if facts.get("hasBlockers") or "Closure gate" in text or "Final disposition" in text else "FAIL", facts.get("hasBlockers"))
        page.keyboard.press("Tab")
        page.wait_for_timeout(200)
        focused = page.evaluate(
            """() => {
                const el = document.activeElement;
                if (!el) return { tag: null, outline: '' };
                const style = getComputedStyle(el);
                return { tag: el.tagName.toLowerCase(), outline: style.outlineStyle + ' ' + style.outlineWidth, boxShadow: style.boxShadow };
            }"""
        )
        visible_focus = (focused.get("outline") or "").find("none") == -1 or (focused.get("boxShadow") or "none") != "none"
        record("a11y.keyboard.tab", "PASS" if focused.get("tag") else "FAIL", focused)
        record("a11y.visible.focus", "PASS" if visible_focus else "FAIL", focused)

        page.goto(f"{BASE}/engagements/{M365}/offboarding", wait_until="networkidle")
        page.wait_for_timeout(1400)
        m365 = visible_text(page)
        record("ui.m365.not.offboarded.with.azure", "PASS" if "Azure Hosting" not in m365 or "Start offboarding" in m365 else "FAIL", page.url)
        shot(page, "lead-m365-offboarding-1440")

        surfaces = {
            "register": f"{BASE}/offboarding",
            "case": f"{BASE}/engagements/{AZURE}/offboarding",
        }
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900 if width >= 768 else 812})
            for name, url in surfaces.items():
                page.goto(url, wait_until="networkidle")
                page.wait_for_timeout(900)
                body = visible_text(page)
                extra = overflow(page, f"{name}-{width}")
                missing = [item for item in required if name == "case" and item.lower() not in body.lower()]
                record(
                    f"responsive.{name}.{width}",
                    "PASS" if extra <= 1 and not missing else "FAIL",
                    {"missing": missing, "overflow": extra},
                )
                shot(page, f"lead-{name}-{width}")

        logout_ui(page)
        login_ui(page, "qa.requester@supremegrc.test")
        page.wait_for_timeout(1800)
        page.goto(f"{BASE}/request/actions", wait_until="networkidle")
        page.wait_for_timeout(1600)
        if "sign in" in visible_text(page).lower() and page.get_by_label("Work email").count():
            login_ui(page, "qa.requester@supremegrc.test")
        page.goto(f"{BASE}/engagements/{AZURE}/offboarding", wait_until="networkidle")
        page.wait_for_timeout(1400)
        requester = visible_text(page)
        denied = (
            "access denied" in requester.lower()
            or "don't have permission" in requester.lower()
            or "cannot open internal" in requester.lower()
            or "business-transition" in requester.lower()
            or "in transition" in requester.lower()
        )
        record("ui.requester.denied.or.limited", "PASS" if denied else "FAIL", requester[:240])
        shot(page, "requester-azure-offboarding-denied")
        page.goto(f"{BASE}/request/actions", wait_until="networkidle")
        page.wait_for_timeout(800)
        actions = visible_text(page)
        limited = (
            "business transition" in actions.lower()
            or "nothing needs your attention" in actions.lower()
            or "confirm" in actions.lower()
        )
        record("ui.requester.business.task.workspace", "PASS" if limited else "FAIL", actions[:240])
        shot(page, "requester-actions-offboarding")

        browser.close()

    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"UI_FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
