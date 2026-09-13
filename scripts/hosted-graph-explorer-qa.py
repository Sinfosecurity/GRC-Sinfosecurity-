#!/usr/bin/env python3
"""Ordinary hosted Graph Explorer session. Does not invent graph data."""

from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "graph-explorer"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "admin@sinfosecurity.com")
PASSWORD = os.environ.get("E2E_PASSWORD", "Admin@123")

counts = {
    "governance": 0,
    "governance_429": 0,
    "any_429": 0,
    "by_path": {},
}
unexpected_429 = []


def record_request(response):
    url = response.url
    if "/governance" not in url and response.status != 429:
        return
    path = url.split("?")[0]
    if "/governance" in path:
        counts["governance"] += 1
        counts["by_path"][path] = counts["by_path"].get(path, 0) + 1
        if response.status == 429:
            counts["governance_429"] += 1
            unexpected_429.append({"url": url, "status": response.status})
    elif response.status == 429:
        counts["any_429"] += 1
        unexpected_429.append({"url": url, "status": response.status})


def shot(page, name: str, width: int):
    page.set_viewport_size({"width": width, "height": 900 if width >= 1000 else 812})
    time.sleep(0.4)
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    return path


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.set_default_timeout(45000)
        page.on("response", record_request)

        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.get_by_label("Email").fill(EMAIL)
        page.get_by_label("Password").fill(PASSWORD)
        page.get_by_role("button", name=re.compile(r"(Log In|Sign in)", re.I)).click()
        page.wait_for_url("**/dashboard", timeout=45000)

        page.goto(f"{BASE}/governance-graph", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Governance Graph").wait_for()
        page.wait_for_timeout(1500)
        shot(page, "landing", 1440)

        search = page.get_by_label("Search")
        for term in ("Harbor", "Northwind", "vendor", "risk", "Cloud"):
            search.fill("")
            search.fill(term)
            page.wait_for_timeout(700)
        search.fill("")
        page.wait_for_timeout(700)

        page.get_by_label("Node type").click()
        page.get_by_role("option", name="VENDOR").click()
        page.wait_for_timeout(800)
        page.get_by_label("Node type").click()
        page.get_by_role("option", name="All types").click()
        page.wait_for_timeout(800)

        object_buttons = page.locator("button").filter(has_text=re.compile(r"VENDOR|ASSESSMENT|FINDING|RISK|EVIDENCE|DECISION", re.I))
        if object_buttons.count() == 0:
            object_buttons = page.get_by_role("button").filter(has_text=re.compile(r".+"))
        object_buttons.first.click()
        page.get_by_text("Selected entity").wait_for()
        page.wait_for_timeout(800)
        shot(page, "selected-entity", 1440)
        shot(page, "direct-relationships", 1440)

        page.get_by_role("tab", name="Impact").click()
        page.wait_for_timeout(900)
        shot(page, "impact", 1440)

        page.get_by_role("tab", name="Lineage").click()
        page.wait_for_timeout(900)
        shot(page, "lineage", 1440)

        page.go_back()
        page.wait_for_timeout(600)
        page.go_forward()
        page.wait_for_timeout(600)
        page.get_by_text("Selected entity").wait_for()

        search.fill("a")
        page.wait_for_timeout(700)
        search.fill("cloud")
        page.wait_for_timeout(700)
        search.fill("")
        page.wait_for_timeout(700)

        shot(page, "graph-1440", 1440)
        shot(page, "graph-375", 375)
        shot(page, "selected-375", 375)
        page.get_by_role("tab", name="Relationships").click()
        page.wait_for_timeout(400)
        shot(page, "relationships-375", 375)

        browser.close()

    result = {
        "base": BASE,
        "governanceRequestCount": counts["governance"],
        "governance429": counts["governance_429"],
        "other429": counts["any_429"],
        "byPath": counts["by_path"],
        "unexpected429": unexpected_429,
        "passed": counts["governance_429"] == 0 and counts["any_429"] == 0,
    }
    (OUT / "session.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
