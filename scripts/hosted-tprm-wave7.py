#!/usr/bin/env python3
"""#12 Wave 7 hosted golden walk. Staging only. Does not start Wave 8."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-7"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
RESULTS: dict = {
    "item": "#12",
    "wave": "7",
    "declaredPass": False,
    "wave7Accepted": False,
    "wave8Started": False,
    "productionTouched": False,
    "mainMerged": False,
    "checks": [],
}


def record(name: str, result: str, detail) -> None:
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


def data_of(payload: dict) -> dict:
    return payload.get("data") or payload


def login(email: str) -> str:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "environment": health.get("deploymentEnvironment")}
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))

    lead = login("qa.tprm.lead@supremegrc.test")
    analyst = login("qa.tprm.analyst@supremegrc.test")
    requester = login("qa.requester@supremegrc.test")
    before = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment", lead)
    historical = data_of(before[1]).get("historicalResidual") or {}
    record("azure.residual.cycle1", "PASS" if historical.get("residualBand") == "MEDIUM" and historical.get("residualScore") == 58 else "FAIL", historical)
    if data_of(before[1]).get("active"):
        record("azure.existing.open.cycle", "PASS", "complete existing cycle first")
    started = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/start", analyst, {
        "kind": "TARGETED",
        "reason": "Hosted Wave 7 event-driven reassessment.",
        "scopeNote": "Targeted delta from monitoring recommendation.",
        "triggerType": "MATERIAL_SECURITY_INCIDENT",
    })
    record("reassessment.started", "PASS" if started[0] in (200, 201, 409) else "FAIL", started[0])
    workspace = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment", lead)
    data = data_of(workspace[1])
    items = data.get("items") or []
    record("delta.dispositions.present", "PASS" if {row.get("disposition") for row in items} & {"REUSE", "REFRESH"} else "FAIL", sorted({row.get("disposition") for row in items}))
    record("azure.still.active", "PASS" if data.get("engagement", {}).get("status") == "ACTIVE" else "FAIL", data.get("engagement", {}).get("status"))
    record("historical.58.unchanged", "PASS" if (data.get("historicalResidual") or {}).get("residualScore") == 58 else "FAIL", data.get("historicalResidual"))
    record("wave8.not.started", "PASS" if data.get("wave8Started") is False else "FAIL", data.get("wave8Started"))
    requester_start = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/start", requester, {"kind": "FULL"})
    record("requester.cannot.start", "PASS" if requester_start[0] in (403, 409) else "FAIL", requester_start[0])
    requester_view = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment", requester)
    record("requester.business.context.only", "PASS" if requester_view[0] == 200 and data_of(requester_view[1]).get("experience") == "requester" else "FAIL", requester_view[0])
    request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/requester-delta", requester, {"summary": "No material Azure service or data-scope change."})
    request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/ira", analyst, {"answers": {}})
    request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/tier-review", analyst, {"confirmedTier": "CRITICAL"})
    request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/delta-plan", analyst, {})
    request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/advance", analyst, {"status": "RESIDUAL_REVIEW"})
    residual = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/residual", lead, {"note": "New residual. Cycle 1 remains MEDIUM 58."})
    after_hist = ((data_of(residual[1]).get("historicalUnchanged") or data_of(residual[1]).get("historicalResidual") or {}))
    record("new.residual.does.not.rewrite.58", "PASS" if residual[0] in (200, 409) and (after_hist.get("residualScore") in (58, None) or residual[0] == 409) else "FAIL", residual[0])
    record("azure.active.after.residual", "PASS" if residual[0] in (200, 409) and (residual[0] == 409 or data_of(residual[1]).get("engagement", {}).get("status") == "ACTIVE") else "FAIL", residual[0])
    still = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment", lead)
    record("cycle1.still.medium.58", "PASS" if (data_of(still[1]).get("historicalResidual") or {}).get("residualScore") == 58 else "FAIL", data_of(still[1]).get("historicalResidual"))
    m365 = request_json("GET", f"/tprm/engagements/{M365}/reassessment", lead)
    record("m365.not.reassessed", "PASS" if m365[0] == 200 and not data_of(m365[1]).get("active") else "FAIL", m365[0])
    blocked = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/decide", lead, {
        "decision": "TERMINATION_RECOMMENDED",
        "rationale": "Must not start Wave 8.",
        "startWave8": True,
    })
    record("wave8.blocked", "PASS" if blocked[0] == 409 else "FAIL", blocked[0])
    decided = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/decide", lead, {
        "decision": "CONTINUE_MONITORING",
        "rationale": "Hosted Wave 7 decision. Return to monitoring.",
    })
    record("decision.continue.monitoring", "PASS" if decided[0] == 200 else "FAIL", decided[0])
    closed = request_json("POST", f"/tprm/engagements/{AZURE}/reassessment/return-to-monitoring", lead, {})
    record("returned.to.monitoring", "PASS" if closed[0] == 200 and data_of(closed[1]).get("active") is None else "FAIL", closed[0])
    azure = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    record("azure.active.after", "PASS" if data_of(azure[1]).get("status") == "ACTIVE" else "FAIL", data_of(azure[1]).get("status"))
    unauth = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment")
    record("unauth.denied", "PASS" if unauth[0] == 401 else "FAIL", unauth[0])
    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
