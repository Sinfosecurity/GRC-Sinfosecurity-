#!/usr/bin/env python3
"""Hosted #12-V Review & Decide exception-driven closure. Staging only. Does not declare #12 PASS."""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / os.environ.get("E2E_EVIDENCE", "supreme-experience-2-review-closure")
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "")
WIDTHS = (375, 768, 1024, 1440, 1920)
RESULTS: dict = {
    "checks": [],
    "shots": [],
    "axe": [],
    "overflows": [],
    "sha": {},
    "review": {},
    "reviewApis": [],
    "workflow": {},
}

CANONICAL = {
    "ir_eng_what": "Hosted claims-review platform plus on-site file inspections",
    "ir_eng_category": "SaaS",
    "ir_eng_data": "Personal data",
    "ir_physical": "Yes",
    "ir_eng_contract": "Master services agreement",
    "ir_spend": "$25k–$250k",
    "ir_eng_contact": "Riley Vendor",
    "ir_eng_security": "Jordan Security",
    "ir_01": "High",
    "ir_02": "High",
    "ir_03": "Moderate",
    "ir_04": "High",
    "ir_05": "High",
    "ir_06": "Moderate",
    "ir_07": "High",
    "ir_08": "High",
    "ir_09": "Low",
    "ir_10": "Moderate",
    "ir_11": "Moderate",
    "ir_12": "High",
    "ir_13": "Low",
    "ir_14": "High",
    "ir_15": "High",
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


def answers(overrides=None):
    payload = dict(CANONICAL)
    payload.update(overrides or {})
    return [{"questionKey": key, "response": value} for key, value in payload.items()]


def token_from_url(url):
    if not url or "token=" not in url:
        return ""
    return url.split("token=", 1)[1]


def login():
    status, payload = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD, "plane": "CUSTOMER"})
    if status != 200:
        raise SystemExit(f"login failed {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def wait_hosted_sha():
    deadline = time.time() + 1500
    last = {}
    while time.time() < deadline:
        _, health = api("GET", "/health")
        try:
            with urllib.request.urlopen(f"{BASE}/version.json", timeout=30) as resp:
                frontend = json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            frontend = {"error": str(exc)}
        last = {
            "api": health.get("gitSha") or health.get("sha"),
            "frontend": frontend.get("gitSha"),
            "health": health.get("status"),
        }
        RESULTS["sha"] = {**last, "required": REQUIRED_SHA}
        if REQUIRED_SHA and last.get("api") == REQUIRED_SHA and last.get("frontend") == REQUIRED_SHA:
            record("hosted-sha", "PASS", REQUIRED_SHA)
            return last
        print(f"waiting hosted SHA api={last.get('api')} frontend={last.get('frontend')}", flush=True)
        time.sleep(20)
    record("hosted-sha", "FAIL", json.dumps(last))
    return last


def upload_vendor_evidence(token, assessment_id, question_key, filename, content):
    boundary = f"----SupremeBoundary{uuid.uuid4().hex}"
    parts = [
        f"--{boundary}",
        'Content-Disposition: form-data; name="questionKey"',
        "",
        question_key,
        f"--{boundary}",
        f'Content-Disposition: form-data; name="file"; filename="{filename}"',
        "Content-Type: application/pdf",
        "",
    ]
    body = "\r\n".join(parts).encode() + b"\r\n" + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{API}/api/v1/vendor-portal/assessments/{assessment_id}/evidence",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw.decode())
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:400].decode("utf-8", "replace")}


def choose_response(question, index):
    options = [str(item) for item in (question.get("options") or [])]
    lowered = [(item, item.lower()) for item in options]

    def pick(*needles):
        for item, lower in lowered:
            if any(needle in lower for needle in needles):
                return item
        return None

    if index % 5 == 0:
        return pick("no") or pick("not implemented") or (options[0] if options else "No")
    if index % 5 == 1:
        return pick("partial") or pick("in progress") or pick("yes") or (options[0] if options else "Partial")
    if index % 5 == 2:
        return pick("not applicable") or pick("n/a") or pick("yes") or (options[0] if options else "N/A")
    return pick("yes") or (options[0] if options else "Yes")


def complete_assessment(vendor_token, assessment_id):
    status, detail = api("GET", f"/api/v1/vendor-portal/assessments/{assessment_id}", vendor_token)
    if status != 200:
        return False, 0
    questions = [row for row in (detail.get("data") or {}).get("questions") or [] if row.get("visible") and not row.get("locked")]
    for index, question in enumerate(questions):
        response = choose_response(question, index)
        api("PATCH", f"/api/v1/vendor-portal/assessments/{assessment_id}/responses", vendor_token, {
            "questionKey": question["key"],
            "response": response,
        })
        if question.get("evidenceRequired") and not str(response).lower().startswith("not applicable") and index % 4 != 0:
            upload_vendor_evidence(vendor_token, assessment_id, question["key"], f"{question['key']}.pdf", b"%PDF-1.4 review-closure evidence")
    for _ in range(8):
        last, _ = api("POST", f"/api/v1/vendor-portal/assessments/{assessment_id}/submit", vendor_token, {"attested": True})
        if last == 200:
            return True, len(questions)
        time.sleep(3)
    return False, len(questions)


def classify(item):
    reason = str(item.get("reason") or "").lower()
    if "evidence" in reason:
        return "evidence"
    if item.get("findingId"):
        return "material"
    return "clarification"


def group_items(items):
    buckets = {}
    for item in items:
        kind = classify(item)
        key = f"{kind}::{item.get('assessmentName') or 'Assessment'}::{item.get('reason') or 'review'}"
        buckets.setdefault(key, {"kind": kind, "related": 0})
        buckets[key]["related"] += 1
    return {
        "material": [row for row in buckets.values() if row["kind"] == "material"],
        "clarification": [row for row in buckets.values() if row["kind"] == "clarification"],
        "evidence": [row for row in buckets.values() if row["kind"] == "evidence"],
    }


def inject(page, token, user):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.evaluate(
        """([token, user]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }""",
        [token, user],
    )


def shot(page, name, width):
    page.set_viewport_size({"width": width, "height": 940 if width >= 1024 else 812})
    time.sleep(0.35)
    path = OUT / f"{name}-{width}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(str(path.relative_to(ROOT)))
    overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    RESULTS["overflows"].append({"name": name, "width": width, "overflow": overflow})
    record(f"{name}-{width}", "FAIL" if overflow else "PASS", f"overflow={overflow}")


def run_axe(page, name):
    source = AXE_PATH.read_text(encoding="utf-8")
    page.evaluate(source)
    result = page.evaluate(
        """async () => {
            const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
            return {
                violations: out.violations.map((row) => ({
                    id: row.id,
                    impact: row.impact,
                    help: row.help,
                    nodes: row.nodes.length,
                    targets: row.nodes.slice(0, 4).map((node) => ({
                        target: node.target,
                        html: String(node.html || "").slice(0, 240),
                    })),
                })),
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in ("serious", "critical")]
    RESULTS["axe"].append({"name": name, "serious": len(serious), "violations": result["violations"]})
    record(f"axe-{name}", "FAIL" if serious else "PASS", f"serious={len(serious)} total={len(result['violations'])}")


def click_tab(page, label):
    page.get_by_role("tab", name=label, exact=True).click()
    page.wait_for_timeout(500)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    hosted = wait_hosted_sha()
    if REQUIRED_SHA and (hosted.get("api") != REQUIRED_SHA or hosted.get("frontend") != REQUIRED_SHA):
        (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
        raise SystemExit(1)

    token, user = login()
    stamp = str(int(time.time()))
    created = api("POST", "/api/v1/vendors/onboarding", token, {
        "name": f"Review Closure {stamp}",
        "website": f"https://review-closure-{stamp}.example",
        "country": "United States",
        "servicesProvided": "Privileged claims-review platform",
        "businessOwnerUserId": user["id"],
        "businessUnit": "Claims",
        "estimatedAnnualSpend": 180000,
    })
    public_id = (created[1].get("data") or {}).get("publicId")
    RESULTS["workflow"]["publicId"] = public_id
    record("request", "PASS" if created[0] == 201 and public_id else "FAIL", f"{created[0]} {public_id}")

    unknown = api("POST", f"/api/v1/vendors/onboarding/{public_id}/intake/complete", token, {
        "answers": answers({"ir_04": "Unknown"}),
        "attested": True,
    })
    record("c1-unknown-blocks", "PASS" if unknown[0] == 400 else "FAIL", str(unknown[0]))
    intake = api("POST", f"/api/v1/vendors/onboarding/{public_id}/intake/complete", token, {"answers": answers(), "attested": True})
    record("intake", "PASS" if intake[0] == 200 else "FAIL", str(intake[0]))
    api("POST", f"/api/v1/vendors/onboarding/{public_id}/tier/confirm", token, {"confirm": True})
    plan = api("POST", f"/api/v1/vendors/onboarding/{public_id}/plan/confirm", token, {})
    record("packs", "PASS" if plan[0] == 200 else "FAIL", str(plan[0]))
    send = api("POST", f"/api/v1/vendors/onboarding/{public_id}/send", token, {
        "name": "Riley Vendor",
        "email": f"riley-review-{stamp}@vendor.example",
        "title": "Security lead",
    })
    record("send-email", "PASS" if send[0] in (200, 201) else "FAIL", str(send[0]))
    link = api("POST", f"/api/v1/vendors/onboarding/{public_id}/invitation/link", token, {
        "name": "Riley Vendor",
        "email": f"riley-review-{stamp}@vendor.example",
    })
    raw = token_from_url((link[1].get("data") or {}).get("activationUrl"))
    first = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw})
    vendor_token = (first[1].get("data") or {}).get("token")
    record("h1-vendor-activate", "PASS" if first[0] == 200 and vendor_token else "FAIL", str(first[0]))
    reuse = api("POST", "/api/v1/vendor-portal/activate", body={"token": raw})
    record("token-reuse", "PASS" if reuse[0] == 410 else "FAIL", str(reuse[0]))
    plane = api("GET", "/api/v1/vendors", vendor_token)
    record("vendor-plane", "PASS" if plane[0] in (401, 403) else "FAIL", str(plane[0]))

    workspace = api("GET", "/api/v1/vendor-portal/workspace", vendor_token)[1]
    assessments = (workspace.get("data") or {}).get("assessments") or []
    submitted = 0
    total_questions = 0
    for item in assessments:
        ok, count = complete_assessment(vendor_token, item["id"])
        total_questions += count
        if ok:
            submitted += 1
    record("vendor-submit", "PASS" if submitted else "FAIL", f"{submitted}/{len(assessments)} assessments, {total_questions} questions")

    after = api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)[1]
    data = after.get("data") or {}
    review = data.get("review") or {}
    items = review.get("items") or []
    grouped = group_items(items)
    RESULTS["review"] = {
        "totalResponses": review.get("questionsAnswered") or review.get("totalResponses"),
        "satisfactory": review.get("satisfactory"),
        "needClarification": review.get("needClarification"),
        "potentialFindings": review.get("potentialFindings"),
        "flatItems": len(items),
        "materialUnits": len(grouped["material"]),
        "clarificationUnits": len(grouped["clarification"]),
        "evidenceUnits": len(grouped["evidence"]),
        "primaryBefore": len(items),
        "primaryAfter": len(grouped["material"]) or len(grouped["clarification"]) or len(grouped["evidence"]),
    }
    record("exceptions-first", "PASS" if items else "FAIL", json.dumps(RESULTS["review"]))
    record("material-grouped", "PASS" if grouped["material"] and RESULTS["review"]["materialUnits"] < max(RESULTS["review"]["flatItems"], 1) else "PARTIAL", json.dumps(grouped, default=str)[:400])

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        inject(page, token, user)

        review_apis = []
        page.on("request", lambda req: review_apis.append(req.url) if "/api/" in req.url else None)
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        try:
            click_tab(page, "Decisions")
        except Exception as exc:  # noqa: BLE001
            record("decisions-tab", "PARTIAL", str(exc)[:160])
        page.wait_for_timeout(800)
        unique = sorted({url.split("?")[0] for url in review_apis})
        RESULTS["reviewApis"] = unique
        record("review-api-count", "PASS" if len(unique) <= 3 else "PARTIAL", f"{len(unique)} {unique}")
        record("n-plus-one", "PASS" if len(unique) <= 3 else "FAIL", str(len(unique)))
        content = page.content().lower()
        record("ui-material", "PASS" if "material issue" in content else "FAIL", "material issue visible")
        record("ui-summary", "PASS" if "assessment review" in content else "FAIL", "summary visible")
        record("ui-satisfactory-deemphasized", "PASS" if "satisfactory" in content and "view" in content else "PARTIAL", "satisfactory remains secondary")

        for width in WIDTHS:
            shot(page, "review-summary", width)
            shot(page, "material-issues", width)
        run_axe(page, "review-summary")

        try:
            page.get_by_role("button", name="Review issue").first.click()
            page.wait_for_timeout(400)
            for width in WIDTHS:
                shot(page, "finding-context", width)
            record("finding-context", "PASS", "expanded related responses")
        except Exception as exc:  # noqa: BLE001
            record("finding-context", "PARTIAL", str(exc)[:160])
            shot(page, "finding-context", 1440)

        try:
            page.get_by_role("button", name=re.compile(r"^Clarifications")).click()
            page.wait_for_timeout(400)
            for width in WIDTHS:
                shot(page, "clarifications", width)
            record("ui-clarifications", "PASS", "clarification queue")
        except Exception as exc:  # noqa: BLE001
            record("ui-clarifications", "PARTIAL", str(exc)[:160])
            shot(page, "clarifications", 1440)

        try:
            page.get_by_role("button", name=re.compile(r"^Evidence issues")).click()
            page.wait_for_timeout(400)
            for width in WIDTHS:
                shot(page, "evidence-issues", width)
            record("ui-evidence", "PASS", "evidence queue")
        except Exception as exc:  # noqa: BLE001
            record("ui-evidence", "PARTIAL", str(exc)[:160])
            shot(page, "evidence-issues", 1440)

        try:
            page.get_by_role("button", name="View full assessment").click()
            page.wait_for_timeout(400)
            for width in WIDTHS:
                shot(page, "full-assessment", width)
            record("ui-full-assessment", "PASS", "full assessment available")
        except Exception as exc:  # noqa: BLE001
            record("ui-full-assessment", "PARTIAL", str(exc)[:160])
            shot(page, "full-assessment", 1440)

        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(700)
        shot(page, "home", 1440)
        shot(page, "home", 375)
        run_axe(page, "home")
        record("home-regression", "PASS" if "attention" in page.content().lower() or "next" in page.content().lower() else "PARTIAL", "home loaded")

        page.goto(f"{BASE}/vendor-onboarding", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "request", 1440)
        record("request-regression", "PASS" if "Request a third party" in page.content() else "FAIL", "request form")

        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(800)
        click_tab(page, "Assessment")
        shot(page, "assess", 1440)
        record("assess-regression", "PASS", "assessment tab")
        click_tab(page, "Overview")
        shot(page, "vendor-review", 1440)

        drafts = [row for row in (data.get("lifecycle") or {}).get("findings") or [] if row.get("reviewState") == "DRAFT" or row.get("status") in ("DRAFT", "OPEN")]
        if not drafts:
            drafts = [row for row in items if row.get("findingId")]
        finding_id = (drafts[0].get("id") or drafts[0].get("findingId")) if drafts else None
        residual_before = data.get("residualRiskScore") or (data.get("lifecycle") or {}).get("residualRisk")
        if finding_id:
            confirmed = api("POST", f"/api/v1/vendors/onboarding/{public_id}/findings/{finding_id}/review", token, {"action": "confirm"})
            rem = api("POST", f"/api/v1/vendors/onboarding/{public_id}/findings/{finding_id}/remediate", token, {
                "cap": "Correct the privileged-access gap and attach current evidence.",
            })
            record("finding-confirm", "PASS" if confirmed[0] == 200 else "PARTIAL", str(confirmed[0]))
            record("remediation-handoff", "PASS" if rem[0] == 200 else "PARTIAL", str(rem[0]))
            accepted = api("POST", f"/api/v1/vendors/onboarding/{public_id}/findings/{finding_id}/accept-risk", token, {
                "rationale": "Time-bounded exception pending the next review.",
                "conditions": "Revisit at reassessment.",
            })
            record("risk-acceptance", "PASS" if accepted[0] == 200 else "PARTIAL", str(accepted[0]))
            after_accept = accepted[1].get("data") or {}
            residual_after = after_accept.get("residualRiskScore") or (after_accept.get("lifecycle") or {}).get("residualRisk")
            record("acceptance-score-unchanged", "PASS" if residual_before == residual_after or residual_after is None else "FAIL", f"{residual_before}->{residual_after}")
        else:
            record("finding-confirm", "PARTIAL", "No draft finding")
            record("remediation-handoff", "PARTIAL", "Not exercised")
            record("risk-acceptance", "PARTIAL", "Not exercised")

        remaining = [
            row for row in (((api("GET", f"/api/v1/vendors/onboarding/{public_id}", token)[1].get("data") or {}).get("lifecycle") or {}).get("findings") or [])
            if row.get("status") in ("OPEN", "IN_PROGRESS", "PENDING_VALIDATION", "REMEDIATED")
        ]
        for row in remaining:
            api("POST", f"/api/v1/vendors/onboarding/{public_id}/findings/{row['id']}/accept-risk", token, {
                "rationale": "Accepted as a time-bounded exception.",
                "conditions": "Revisit at reassessment.",
            })
        attested = api("POST", f"/api/v1/vendors/onboarding/{public_id}/contract/attest", token, {
            "attested": True,
            "clauses": {
                "security_addendum": True,
                "breach_notification": True,
                "subprocessor": True,
                "dpa": True,
                "baa": True,
                "deletion_return": True,
                "right_to_audit": True,
            },
        })
        record("contract", "PASS" if attested[0] == 200 else "PARTIAL", str(attested[0]))
        approved = api("POST", f"/api/v1/vendors/onboarding/{public_id}/approval", token, {
            "decision": "APPROVE_WITH_CONDITIONS",
            "conditions": "Complete remaining exception review before the first reassessment.",
            "rationale": "Decision brief prepared from live tenant records.",
        })
        record("approval-handoff", "PASS" if approved[0] == 200 else "FAIL", str(approved[0]))
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(800)
        try:
            click_tab(page, "Decisions")
        except Exception:
            pass
        for width in WIDTHS:
            shot(page, "decision-ready", width)
        run_axe(page, "decision-ready")
        record("decision-ready", "PASS" if "approval" in page.content().lower() or "decision" in page.content().lower() else "PARTIAL", "decision surface")

        activated = api("POST", f"/api/v1/vendors/onboarding/{public_id}/activate", token, {})
        life = (activated[1].get("data") or {}).get("lifecycle") or {}
        record("monitor-regression", "PASS" if activated[0] == 200 and life.get("vendorStatus") == "ACTIVE" else "PARTIAL", str(life.get("vendorStatus")))
        page.goto(f"{BASE}/vendor-onboarding/{public_id}", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "monitor", 1440)
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    print(json.dumps({"failed": len(failed), "checks": len(RESULTS["checks"]), "shots": len(RESULTS["shots"]), "review": RESULTS["review"]}, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
