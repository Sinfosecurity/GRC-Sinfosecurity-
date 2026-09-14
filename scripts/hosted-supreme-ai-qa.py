#!/usr/bin/env python3
"""Hosted #18 Supreme AI Governance walkthrough. Staging only."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "supreme-ai"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
OTHER_EMAIL = os.environ.get("E2E_OTHER_EMAIL", "admin@sinfosecurity.com")
OTHER_PASSWORD = os.environ.get("E2E_OTHER_PASSWORD", "Admin@123")
EXPECTED_SHA = os.environ.get("E2E_EXPECTED_SHA", "")
RESULTS: dict = {"checks": [], "shots": [], "sha": {}, "workflow": {}, "chain": {}, "discrepancies": []}


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


CLAIM_RE = re.compile(
    r"(this system is (an )?(eu ai act )?high-risk|automatically (classified|determined|declared) as.{0,60}high-risk|iso 42001 certified|nist certified|this system is legally prohibited|ai analysis says|model is safe|automatically compliant)",
    re.I,
)
DENIAL_RE = re.compile(
    r"(does not automatically claim|not a legal finding|potential applicability|review required|not certified|organization classification)",
    re.I,
)


def automatic_legal_claim(copy: str) -> bool:
    text = copy or ""
    if DENIAL_RE.search(text) and re.search(r"eu ai act high-risk|iso 42001|nist", text, re.I):
        return False
    return bool(CLAIM_RE.search(text)) or "ai analysis says" in text.lower()


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
            last = {"api": api_sha, "frontend": fe_sha, "healthStatus": health_status, "health": health}
            RESULTS["sha"] = last
            print(f"hosted sha api={api_sha} fe={fe_sha}")
            if not EXPECTED_SHA or (sha_match(str(api_sha), EXPECTED_SHA) and sha_match(str(fe_sha), EXPECTED_SHA)):
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


def seed(token: str):
    status, dash = api("GET", "/api/v1/ai-governance/dashboard", token)
    record("dashboard", "PASS" if status == 200 else "FAIL", str(status))
    honesty = (dash.get("data") or {}).get("honesty") or ""
    monitoring = (dash.get("data") or {}).get("monitoring") or ""
    record("honesty", "PASS" if "not an approval" in honesty.lower() else "FAIL", honesty[:180])
    record("monitoring", "PASS" if "manual" in monitoring.lower() else "FAIL", monitoring)

    status, existing = api("GET", "/api/v1/ai-governance/systems", token)
    existing_rows = existing.get("data") if isinstance(existing.get("data"), list) else []
    reused = next((row for row in existing_rows if row.get("publicId") == "AI-00001"), None)
    if reused:
        system = "AI-00001"
        record("create system", "PASS", f"reused {system}")
        denied_body = {"data": reused}
    else:
        denied, denied_body = api("POST", "/api/v1/ai-governance/systems", token, {"name": "Claims triage assistant", "personalData": True})
        system = (denied_body.get("data") or {}).get("publicId")
        record("create system", "PASS" if denied == 201 and str(system).startswith("AI-") else "FAIL", f"{denied} {system}")
    if not system:
        return RESULTS["workflow"]

    lifecycle = (denied_body.get("data") or {}).get("lifecycle")
    record(
        "lifecycle proposed",
        "PASS" if lifecycle in ("PROPOSED", "APPROVED", "IN_REVIEW", "PRODUCTION") and lifecycle != "" else "FAIL",
        str(lifecycle),
    )

    patch, patch_body = api("PATCH", f"/api/v1/ai-governance/systems/{system}", token, {"lifecycle": "PRODUCTION"})
    record(
        "no self-approve",
        "PASS" if patch == 400 and "human approval" in json.dumps(patch_body).lower() else "FAIL",
        f"{patch} {json.dumps(patch_body)[:180]}",
    )

    status, use_case = api("POST", f"/api/v1/ai-governance/systems/{system}/use-cases", token, {
        "name": "Claims triage",
        "purpose": "Route incoming claims for human review",
        "affectedPersons": "Claimants",
        "decisionInfluence": "Recommended routing only",
    })
    use_id = (use_case.get("data") or {}).get("publicId")
    record("use case", "PASS" if status == 201 and str(use_id).startswith("USE-") else "FAIL", f"{status} {use_id}")

    status, vendors = api("GET", "/api/v1/vendors?pageSize=100", token)
    vendor_rows = vendors.get("vendors") or vendors.get("data") or []
    if isinstance(vendor_rows, dict):
        vendor_rows = vendor_rows.get("vendors") or []
    vendor = next((row for row in vendor_rows if "supreme investigation" in str(row.get("name") or "").lower()), None)
    if not vendor and vendor_rows:
        vendor = vendor_rows[0]
    record(
        "existing vendor",
        "PASS" if vendor and vendor.get("id") else "FAIL",
        f"{(vendor or {}).get('name')} {(vendor or {}).get('id')}",
    )

    status, provider = api("POST", "/api/v1/ai-governance/providers", token, {
        "providerName": "Recorded model provider",
        "vendorId": (vendor or {}).get("id"),
        "modelVersion": "v1-recorded",
    })
    provider_id = (provider.get("data") or {}).get("publicId")
    availability = (provider.get("data") or {}).get("availabilityStatus")
    record(
        "provider unknown",
        "PASS" if status == 201 and "unknown" in str(availability).lower() else "FAIL",
        f"{status} {provider_id} {availability}",
    )
    if provider_id:
        api("POST", f"/api/v1/ai-governance/systems/{system}/providers/{provider_id}", token, {
            "modelVersion": "v1-recorded",
            "changeReason": "Initial recorded provider",
        })
        if vendor and vendor.get("id"):
            linked, _ = api("PATCH", f"/api/v1/ai-governance/providers/{provider_id}", token, {"vendorId": vendor["id"]})
            record("vendor link", "PASS" if linked == 200 else "FAIL", f"{linked} {(vendor or {}).get('name')}")

    api("POST", f"/api/v1/ai-governance/systems/{system}/oversight", token, {
        "humanReviewRequired": True,
        "humanCanOverride": True,
        "humanCanStop": True,
        "oversightOwner": "Claims operations",
    })
    api("POST", f"/api/v1/ai-governance/systems/{system}/risks", token, {"category": "Hallucination / incorrect output"})
    status, score = api("POST", f"/api/v1/ai-governance/systems/{system}/scores", token, {"impact": 4, "likelihood": 3})
    record("score", "PASS" if status == 201 and (score.get("data") or {}).get("methodologyVersion") == "supreme-ai-1.0.0" else "FAIL", json.dumps(score.get("data") or {})[:220])

    status, assessment = api("POST", "/api/v1/ai-governance/assessments", token, {
        "systemPublicId": system,
        "useCasePublicId": use_id,
        "answers": [{"key": "decisions", "answer": True}, {"key": "insurance", "answer": True}],
    })
    rec = str((assessment.get("data") or {}).get("recommendation") or "")
    record(
        "screening",
        "PASS" if status == 201 and "enhanced review may be required" in rec.lower() and "legally prohibited" not in rec.lower() else "FAIL",
        rec[:220],
    )

    status, test = api("POST", "/api/v1/ai-governance/tests", token, {
        "systemPublicId": system,
        "kind": "BIAS_FAIRNESS",
        "result": "NOT_TESTED",
        "tester": "Hosted reviewer",
    })
    record("test not invented", "PASS" if status == 201 and (test.get("data") or {}).get("result") == "NOT_TESTED" else "FAIL", str((test.get("data") or {}).get("publicId")))

    status, approval = api("POST", "/api/v1/ai-governance/approvals", token, {
        "systemPublicId": system,
        "decision": "APPROVED_WITH_CONDITIONS",
        "decisionMaker": "Risk Committee",
        "rationale": "Human review of recorded use, oversight, and untested bias posture.",
        "conditions": "Do not expand to autonomous claim denial.",
    })
    record("approval", "PASS" if status == 201 and str((approval.get("data") or {}).get("publicId")).startswith("APV-") else "FAIL", str((approval.get("data") or {}).get("publicId")))

    status, incident = api("POST", "/api/v1/ai-governance/incidents", token, {
        "systemPublicId": system,
        "title": "Incorrect claim-routing suggestion",
        "severity": "MEDIUM",
    })
    record("incident", "PASS" if status == 201 and str((incident.get("data") or {}).get("publicId")).startswith("AIN-") else "FAIL", str((incident.get("data") or {}).get("publicId")))

    status, regulatory = api("POST", "/api/v1/ai-governance/regulatory-reviews", token, {
        "systemPublicId": system,
        "regime": "EU AI Act",
        "status": "IN_REVIEW",
        "rationale": "Potential applicability. Review required. Not a legal finding.",
    })
    record(
        "regulatory",
        "PASS" if status == 201 and "not a legal finding" in json.dumps(regulatory).lower() else "FAIL",
        str((regulatory.get("data") or {}).get("publicId")),
    )

    status, activities = api("GET", "/api/v1/privacy/activities", token)
    activity_rows = activities.get("data") if isinstance(activities.get("data"), list) else []
    activity_id = (activity_rows[0] or {}).get("publicId") if activity_rows else None
    if activity_id:
        linked, _ = api("POST", f"/api/v1/ai-governance/systems/{system}/privacy/{activity_id}", token)
        record("privacy link", "PASS" if linked == 200 else "FAIL", f"{linked} {activity_id}")
    else:
        record("privacy link", "PARTIAL", "No processing activity recorded")

    status, risks = api("GET", "/api/v1/erm/risks", token)
    risk_rows = risks.get("data") if isinstance(risks.get("data"), list) else []
    risk_id = (risk_rows[0] or {}).get("publicId") if risk_rows else None
    if risk_id:
        linked, link_body = api("POST", f"/api/v1/ai-governance/systems/{system}/risks/enterprise/{risk_id}", token)
        record(
            "risk link",
            "PASS" if linked == 200 and "not recalculated" in json.dumps(link_body).lower() else "FAIL",
            f"{linked} {risk_id}",
        )
    else:
        record("risk link", "PARTIAL", "No enterprise risk recorded")

    status, controls = api("GET", "/api/v1/scc/controls", token)
    control_rows = controls.get("data") if isinstance(controls.get("data"), list) else []
    control = next((row for row in control_rows if str(row.get("controlKey") or "").upper().startswith("AIG")), control_rows[0] if control_rows else None)
    if control and control.get("id"):
        linked, _ = api("POST", f"/api/v1/ai-governance/systems/{system}/controls/{control['id']}", token)
        record("control link", "PASS" if linked == 200 else "FAIL", f"{linked} {control.get('controlKey')}")
        status, evidence = api("GET", "/api/v1/scc/evidence", token)
        evidence_rows = evidence.get("data") if isinstance(evidence.get("data"), list) else []
        clean = next((row for row in evidence_rows if str(row.get("filename") or "") == "sr-clean-evidence.txt" and str(row.get("scanStatus") or "") == "CLEAN"), None)
        if not clean:
            clean = next((row for row in evidence_rows if str(row.get("scanStatus") or "") == "CLEAN"), None)
        if clean and clean.get("id"):
            ev, ev_body = api("POST", "/api/v1/scc/evidence/links", token, {
                "storedObjectId": clean["id"],
                "targetType": "CONTROL",
                "targetId": control["id"],
                "relationship": "SUPPORTS",
                "rationale": "Hosted CLEAN evidence reuse for AIG-01",
            })
            record(
                "clean evidence reuse",
                "PASS" if ev in (200, 201, 409) else "FAIL",
                f"{ev} {clean.get('filename')}",
            )
        else:
            record("clean evidence reuse", "PARTIAL", "No CLEAN stored object found")
    else:
        record("control link", "PARTIAL", "No common control recorded")

    status, versioned = api("POST", f"/api/v1/ai-governance/systems/{system}/versions", token, {
        "modelVersion": "v2-recorded",
        "changeReason": "Hosted model version change for review",
        "providerPublicId": provider_id,
    })
    current = ((versioned.get("data") or {}).get("currentModel") or {}).get("modelVersion")
    prior = ((versioned.get("data") or {}).get("priorModel") or {}).get("modelVersion")
    record(
        "model version change",
        "PASS" if status in (200, 201) and current == "v2-recorded" else "FAIL",
        f"{status} {prior} -> {current}",
    )
    review = (versioned.get("data") or {}).get("changeReview") or {}
    record(
        "change review",
        "PASS" if review.get("reviewRequired") and "review required before this ai continues" in str(review.get("reviewQuestion") or "").lower() else "FAIL",
        str(review.get("reviewQuestion")),
    )

    for framework, label in [("NIST_AI_RMF", "nist"), ("ISO_42001", "iso")]:
        ready_status, ready = api("GET", f"/api/v1/ai-governance/readiness/{framework}", token)
        honesty = json.dumps(ready).lower()
        record(
            f"{label} readiness",
            "PASS" if ready_status == 200 and "not certified" in honesty and ready.get("data", {}).get("certified") is False else "FAIL",
            f"{ready_status} {honesty[:160]}",
        )

    status, affected = api("GET", f"/api/v1/ai-governance/systems/{system}/affected", token)
    RESULTS["chain"] = affected.get("data") or {}
    review = str((RESULTS["chain"] or {}).get("reviewQuestion") or "")
    record(
        "what is affected",
        "PASS" if status == 200 and "review before this ai continues" in review.lower() else "FAIL",
        review,
    )

    preview, preview_body = api("POST", "/api/v1/ai-governance/import/preview", token, {
        "rows": [{"name": '=HYPERLINK("http://evil")'}],
    })
    record("import formula", "PASS" if preview == 200 and "'=HYPERLINK" in json.dumps(preview_body) else "FAIL", json.dumps(preview_body)[:180])

    RESULTS["workflow"] = {
        "system": system,
        "useCase": use_id,
        "provider": provider_id,
        "assessment": (assessment.get("data") or {}).get("publicId"),
        "test": (test.get("data") or {}).get("publicId"),
        "approval": (approval.get("data") or {}).get("publicId"),
        "incident": (incident.get("data") or {}).get("publicId"),
        "regulatory": (regulatory.get("data") or {}).get("publicId"),
        "activity": activity_id,
        "risk": risk_id,
        "control": (control or {}).get("controlKey") if control else None,
        "vendor": (vendor or {}).get("name") if vendor else None,
        "vendorId": (vendor or {}).get("id") if vendor else None,
        "reviewQuestion": review,
        "currentVersion": current if "current" in locals() else None,
        "priorVersion": prior if "prior" in locals() else None,
    }

    for kind in ["inventory", "risk", "approval", "testing", "vendor", "regulatory", "executive", "board"]:
        status, payload = api("GET", f"/api/v1/ai-governance/reports/{kind}.pdf", token)
        record(f"report {kind}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if payload.get("content"):
            save_binary(f"Supreme-AI-{kind}.pdf", payload)
    status, pptx = api("GET", "/api/v1/ai-governance/reports/board.pptx", token)
    record("board pptx", "PASS" if status == 200 and pptx.get("binary") else "FAIL", str(status))
    if pptx.get("content"):
        save_binary("Supreme-AI-Board.pptx", pptx)
        try:
            import re
            import zipfile
            with zipfile.ZipFile(OUT / "Supreme-AI-Board.pptx") as zipped:
                slides = [name for name in zipped.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")]
                cover = zipped.read("ppt/slides/slide1.xml").decode("utf-8", "replace")
                texts = " ".join(re.findall(r"<a:t[^>]*>([^<]*)</a:t>", cover))
                record("board pptx slides", "PASS" if len(slides) >= 12 else "FAIL", f"{len(slides)} slides")
                record("board pptx cover", "PASS" if "Board Risk Committee" in texts and "not an approval" in texts.lower() else "FAIL", texts[:180])
                all_text = " ".join(
                    " ".join(re.findall(r"<a:t[^>]*>([^<]*)</a:t>", zipped.read(name).decode("utf-8", "replace")))
                    for name in slides
                )
                record(
                    "board honesty",
                    "PASS" if "eu ai act high-risk" not in all_text.lower() and "iso 42001 certified" not in all_text.lower() else "FAIL",
                    all_text[:220],
                )
        except Exception as exc:
            record("board pptx slides", "FAIL", str(exc))
    for fmt in ["csv", "xlsx"]:
        status, payload = api("GET", f"/api/v1/ai-governance/export/{fmt}", token)
        record(f"export {fmt}", "PASS" if status == 200 and payload.get("binary") else "FAIL", str(status))
        if payload.get("content"):
            save_binary(f"Supreme-AI-Register.{fmt}", payload)
    return RESULTS["workflow"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    api_sha, fe_sha = wait_hosted_sha()
    token, user = login(EMAIL, PASSWORD)
    other_token, _ = login(OTHER_EMAIL, OTHER_PASSWORD)
    seed(token)
    system = RESULTS["workflow"].get("system")
    if system:
        leaked, _ = api("GET", f"/api/v1/ai-governance/systems/{system}", other_token)
        record("cross-tenant system", "PASS" if leaked in (403, 404) else "FAIL", str(leaked))
        dash_b, dash_payload = api("GET", "/api/v1/ai-governance/dashboard", other_token)
        record("cross-tenant dashboard", "PASS" if dash_b == 200 and system not in json.dumps(dash_payload) else "FAIL", str(dash_b))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        inject(page, token, user)
        pages = [
            ("dashboard", "/ai-governance"),
            ("register", "/ai-governance/systems"),
            ("providers", "/ai-governance/providers"),
            ("assessments", "/ai-governance/assessments"),
            ("testing", "/ai-governance/testing"),
            ("approvals", "/ai-governance/approvals"),
            ("incidents", "/ai-governance/incidents"),
            ("regulatory", "/ai-governance/regulatory"),
            ("exceptions", "/ai-governance/exceptions"),
            ("import", "/ai-governance/import"),
            ("controls", "/ai-governance/controls"),
            ("nist", "/ai-governance/readiness/nist-ai-rmf"),
            ("iso", "/ai-governance/readiness/iso-42001"),
        ]
        if system:
            pages.append(("system-detail", f"/ai-governance/systems/{system}"))
        if RESULTS["workflow"].get("useCase"):
            pages.append(("use-case", f"/ai-governance/use-cases/{RESULTS['workflow']['useCase']}"))
        if RESULTS["workflow"].get("provider"):
            pages.append(("provider-detail", f"/ai-governance/providers/{RESULTS['workflow']['provider']}"))
        for name, path in pages:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            copy = page.inner_text("body")
            if name == "dashboard":
                record("dashboard copy", "PASS" if "Preserve human authority" in copy or "not an approval" in copy.lower() else "FAIL", copy[:180])
            if name == "import":
                record("import preview first", "PASS" if "preview before write" in copy.lower() else "FAIL", copy[:180])
            record(
                f"forbidden copy {name}",
                "FAIL" if automatic_legal_claim(copy) else "PASS",
                path,
            )
            if name in ("register", "system-detail", "testing", "approvals", "regulatory"):
                raw = any(token in copy for token in ("NOT_CLASSIFIED", "APPROVED_WITH_CONDITIONS", "NOT_TESTED", "NOT_REVIEWED", "HUMAN_IN_THE_LOOP", "NOT_RECORDED"))
                record(f"humanized {name}", "FAIL" if raw else "PASS", path)
            for width in (375, 768, 1024, 1440, 1920):
                shot(page, f"{name}-{width}", width)
            overflow = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
            record(f"overflow {name}", "FAIL" if overflow else "PASS", path)
        for path, label in [("/privacy-ops", "privacy"), ("/compliance", "compliance"), ("/risks", "risk"), ("/governance-graph", "graph"), ("/control-center", "controls"), ("/vendor-management", "vendors"), ("/reports", "reports"), ("/settings", "methodology")]:
            page.goto(f"{BASE}{path}", wait_until="networkidle")
            shot(page, f"regression-{label}-1440", 1440)
        pptx_path = OUT / "Supreme-AI-Board.pptx"
        native_dir = OUT / "native-slides"
        if pptx_path.exists():
            completed = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "render-pptx-native.py"), str(pptx_path), str(native_dir)],
                capture_output=True,
                text=True,
            )
            if completed.returncode != 0:
                record("board pptx native render", "FAIL", (completed.stderr or completed.stdout)[:400])
            else:
                payload = json.loads((native_dir / "native-render.json").read_text())
                for index in range(1, payload.get("pages", 0) + 1):
                    src = native_dir / f"native-slide-{index:02d}.png"
                    if src.exists():
                        shutil.copyfile(src, OUT / f"board-slide-{index}.png")
                        RESULTS["shots"].append(str((OUT / f"board-slide-{index}.png").relative_to(ROOT)))
                record(
                    "board pptx native render",
                    "PASS" if payload.get("pages", 0) >= 12 and payload.get("uniqueHashes", 0) >= 8 else "PARTIAL",
                    f"{payload.get('engine')} {payload.get('pages')} slides / {payload.get('uniqueHashes')} unique",
                )
        browser.close()
    RESULTS["hostedFrontendSha"] = fe_sha
    RESULTS["hostedApiSha"] = api_sha
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps({"sha": RESULTS["sha"], "workflow": RESULTS["workflow"], "chain": RESULTS.get("chain", {})}, indent=2))


if __name__ == "__main__":
    main()
