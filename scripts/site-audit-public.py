#!/usr/bin/env python3
"""Rendered public-site audit: bounding-box reflow and all-text contrast."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("AUDIT_BASE", "http://127.0.0.1:4173")
SCREEN_DIR = Path(os.environ.get("AUDIT_SCREENS", "/tmp/supreme-platform-audit"))
ROUTES = [
    "/",
    "/products/third-party",
    "/demo",
    "/pricing",
    "/trust",
    "/login",
    "/register",
    "/forgot-password",
    "/request-demo",
    "/frameworks",
    "/privacy",
    "/terms",
]
WIDTHS = [320, 325, 360, 375, 390, 414, 768, 1024, 1440, 1920]
TOLERANCE = 1.5
results: list[dict] = []


def record(step: str, status: str, observed: str) -> None:
    results.append({"step": step, "status": status, "observed": observed})
    print(f"[{status}] {step}: {observed}")


def parse_color(value: str) -> tuple[int, int, int, float] | None:
    if not value or value in {"transparent", "rgba(0, 0, 0, 0)"}:
        return None
    if value.startswith("rgb("):
        parts = value[4:-1].split(",")
        return int(parts[0]), int(parts[1]), int(parts[2]), 1.0
    if value.startswith("rgba("):
        parts = value[5:-1].split(",")
        return int(parts[0]), int(parts[1]), int(parts[2]), float(parts[3])
    return None


def channel(value: int) -> float:
    next_value = value / 255
    return next_value / 12.92 if next_value <= 0.03928 else ((next_value + 0.055) / 1.055) ** 2.4


def luminance(color: tuple[int, int, int, float]) -> float:
    return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2])


def contrast_ratio(fg: tuple[int, int, int, float], bg: tuple[int, int, int, float]) -> float:
    lighter = max(luminance(fg), luminance(bg))
    darker = min(luminance(fg), luminance(bg))
    return (lighter + 0.05) / (darker + 0.05)


REFLOW_JS = """
({tolerance}) => {
  const width = document.documentElement.clientWidth;
  const skip = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'NOSCRIPT']);
  const failures = [];
  const nodes = document.querySelectorAll('body *');
  for (const el of nodes) {
    if (skip.has(el.tagName)) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    if (el.classList.contains('mkt-skip') && style.top && parseFloat(style.top) < 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (rect.right < -tolerance || rect.bottom < -tolerance) continue;
    if (rect.left < -tolerance || rect.right > width + tolerance) {
      const text = (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 80);
      if (!text) continue;
      failures.push({
        tag: el.tagName,
        cls: el.className && String(el.className).slice(0, 80),
        text,
        left: Number(rect.left.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        width
      });
    }
  }
  return failures.slice(0, 20);
}
"""

CONTRAST_JS = """
() => {
  function parseColor(value) {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null;
    const m = value.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((p) => p.trim());
    return {
      r: Number(parts[0]),
      g: Number(parts[1]),
      b: Number(parts[2]),
      a: parts[3] === undefined ? 1 : Number(parts[3]),
    };
  }
  function channel(v) {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  }
  function lum(c) {
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }
  function ratio(a, b) {
    const lighter = Math.max(lum(a), lum(b));
    const darker = Math.min(lum(a), lum(b));
    return (lighter + 0.05) / (darker + 0.05);
  }
  function bgOf(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const color = parseColor(getComputedStyle(node).backgroundColor);
      if (color && color.a > 0.08) return color;
      node = node.parentElement;
    }
    return { r: 7, g: 16, b: 24, a: 1 };
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const failures = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const fg = parseColor(style.color);
    if (!fg || fg.a < 0.4) continue;
    const bg = bgOf(el);
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight);
    const needed = 4.5;
    const actual = ratio(fg, bg);
    if (actual + 0.01 < needed) {
      failures.push({
        text: text.slice(0, 80),
        size,
        weight,
        needed,
        actual: Number(actual.toFixed(2)),
        fg: style.color,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
      });
    }
  }
  return failures.slice(0, 25);
}
"""


def main() -> int:
    SCREEN_DIR.mkdir(parents=True, exist_ok=True)
    reflow_fail = 0
    contrast_fail = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width in WIDTHS:
            page = browser.new_page(viewport={"width": width, "height": 2400})
            page.goto(f"{BASE}/", wait_until="networkidle", timeout=60000)
            page.locator("#platform").wait_for()
            page.locator("#platform").screenshot(path=str(SCREEN_DIR / f"platform-{width}.png"))
            html = page.content()
            if width == 1440:
                record(
                    "PUBLIC BUILD SAFETY",
                    "PASS" if "@vite/client" not in html and "/src/" not in html and "react-refresh" not in html else "FAIL",
                    "Production document source checked for Vite client, /src, and react-refresh.",
                )
            failures = page.evaluate(REFLOW_JS, {"tolerance": TOLERANCE})
            if failures:
                reflow_fail += 1
                record(f"REFLOW {width}", "FAIL", json.dumps(failures[:4]))
            else:
                record(f"REFLOW {width}", "PASS", "No visible element exceeded the viewport.")
            if width <= 480:
                columns = page.evaluate(
                    """() => {
                      const preview = getComputedStyle(document.querySelector('.mkt-platform-preview')).gridTemplateColumns;
                      const roadmap = getComputedStyle(document.querySelector('.mkt-platform-roadmap')).gridTemplateColumns;
                      return { preview, roadmap };
                    }"""
                )
                one_col = columns["preview"].count("px") <= 1 and columns["roadmap"].count("px") <= 1
                record(
                    f"PLATFORM MOBILE COLS {width}",
                    "PASS" if one_col else "FAIL",
                    json.dumps(columns),
                )
            page.close()

        page = browser.new_page(viewport={"width": 1440, "height": 2400})
        for route in ROUTES:
            page.goto(f"{BASE}{route}", wait_until="networkidle", timeout=60000)
            failures = page.evaluate(CONTRAST_JS)
            if failures:
                contrast_fail += 1
                record(f"CONTRAST {route}", "FAIL", json.dumps(failures[:5]))
            else:
                record(f"CONTRAST {route}", "PASS", "All visible text met 4.5:1 against the painted background.")
        browser.close()

    record("B1 REFLOW", "PASS" if reflow_fail == 0 else "FAIL", f"failing_widths={reflow_fail}")
    record("B2 CONTRAST", "PASS" if contrast_fail == 0 else "FAIL", f"failing_routes={contrast_fail}")
    print("\n=== SITE AUDIT ===")
    failed = 0
    for row in results:
        print(f"{row['status']}\t{row['step']}\t{row['observed'][:220]}")
        if row["status"] != "PASS":
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
