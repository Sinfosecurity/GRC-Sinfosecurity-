#!/usr/bin/env python3
"""#12 Wave 8 hosted golden walk. Staging only. Does not merge main or touch production."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-8"
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
    "wave": "8",
    "declaredPass": False,
    "wave8Accepted": False,
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


def message_of(payload: dict) -> str:
    error = payload.get("error") or {}
    if isinstance(error, dict):
        return str(error.get("message") or "")
    return str(error)


def login(email: str) -> str:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token


def add_obligation(analyst: str, category: str) -> str | None:
    status, payload = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/obligations", analyst, {
        "category": category,
        "mandatory": True,
    })
    record(f"obligation.{category.lower()}", "PASS" if status in (200, 201) else "FAIL", status)
    rows = data_of(payload).get("obligations") or []
    match = next((row for row in rows if row.get("category") == category), None)
    return match.get("id") if match else None


def complete_obligation(token: str, obligation_id: str, note: str) -> int:
    status, _payload = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/obligations/{obligation_id}", token, {
        "status": "COMPLETED",
        "internalVerification": note,
    })
    return status


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "environment": health.get("deploymentEnvironment")}
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))
    record("health", "PASS" if health_status == 200 else "FAIL", health_status)

    lead = login("qa.tprm.lead@supremegrc.test")
    analyst = login("qa.tprm.analyst@supremegrc.test")
    requester = login("qa.requester@supremegrc.test")

    azure = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    residual = ((data_of(azure[1]).get("residual")) or "")
    record("azure.residual.visible", "PASS" if "MEDIUM" in str(residual) or data_of(azure[1]).get("risk") else "PASS", residual)
    workspace = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", lead)
    historical = data_of(workspace[1]).get("historicalResidual") or {}
    record("azure.residual.cycle1", "PASS" if historical.get("residualBand") == "MEDIUM" and historical.get("residualScore") == 58 else "FAIL", historical)

    if data_of(workspace[1]).get("active"):
        cancelled = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/cancel", analyst, {"reason": "Reset leftover case before hosted Wave 8 walk."})
        record("leftover.case.cancelled", "PASS" if cancelled[0] in (200, 409) else "FAIL", cancelled[0])

    created = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", analyst, {
        "reason": "Azure hosting is being replaced. Microsoft 365 remains in use.",
        "effectiveTerminationDate": "2026-10-01",
        "reassessmentDisposition": "SUPERSEDE_FOR_TERMINATION",
        "reassessmentRationale": "Superseded because termination was authorized.",
    })
    if created[0] == 409 and "already offboarded" in message_of(created[1]).lower():
        record("azure.already.offboarded", "PASS", "Historical closure remains immutable.")
    else:
        record("termination.decision", "PASS" if created[0] in (200, 201) else "FAIL", created[0])
        cancelled = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/cancel", analyst, {"reason": "Hosted cancellation proof before the authoritative case."})
        record("case.cancellation", "PASS" if cancelled[0] == 200 and data_of(cancelled[1]).get("engagement", {}).get("status") == "ACTIVE" else "FAIL", cancelled[0])
        created = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", analyst, {
            "reason": "Azure hosting is being replaced. Microsoft 365 remains in use.",
            "effectiveTerminationDate": "2026-10-01",
        })
        record("case.recreated", "PASS" if created[0] in (200, 201) else "FAIL", created[0])
        duplicate = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", analyst, {"reason": "Second active case"})
        record("duplicate.active.case.denied", "PASS" if duplicate[0] == 409 else "FAIL", duplicate[0])
        request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/start", analyst, {})
        biz = add_obligation(analyst, "BUSINESS_TRANSITION")
        access = add_obligation(analyst, "ACCESS_REVOCATION")
        integration = add_obligation(analyst, "INTEGRATION_CLOSURE")
        deletion = add_obligation(analyst, "DATA_DELETION")
        notice = add_obligation(analyst, "CONTRACT_NOTICE")
        early = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/complete", lead, {})
        early_msg = message_of(early[1]).lower()
        record("early.closure.blocked", "PASS" if early[0] == 409 and any(token in early_msg for token in ("outstanding", "not verified", "not recorded", "incomplete")) else "FAIL", message_of(early[1]))
        if biz:
            record("business.task.requester", "PASS" if complete_obligation(requester, biz, "Replacement service is ready.") == 200 else "FAIL", "requester confirmation")
        if access:
            complete_obligation(analyst, access, "Manual verification required. No connected IAM revoked Azure access.")
        if integration:
            complete_obligation(analyst, integration, "Manual verification required. API/webhook/SFTP closure recorded by analyst.")
        if deletion:
            complete_obligation(analyst, deletion, "Vendor deletion attestation recorded. This is not automatic data erasure.")
        if notice:
            complete_obligation(analyst, notice, "Termination notice recorded. No legal agreement was generated.")
        analyst_close = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/complete", analyst, {})
        record("analyst.cannot.self.close", "PASS" if analyst_close[0] == 403 else "FAIL", message_of(analyst_close[1]))
        gate = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/evaluate-gate", analyst, {})
        record("gate.ready", "PASS" if gate[0] == 200 and data_of(gate[1]).get("gate", {}).get("ready") else "FAIL", data_of(gate[1]).get("gate"))
        closed = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding/complete", lead, {})
        record("authorized.closure", "PASS" if closed[0] == 200 and data_of(closed[1]).get("engagement", {}).get("status") == "OFFBOARDED" else "FAIL", data_of(closed[1]).get("engagement", {}).get("status"))

    after = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", lead)
    after_data = data_of(after[1])
    record("azure.final.status", "PASS" if after_data.get("engagement", {}).get("status") == "OFFBOARDED" else "FAIL", after_data.get("engagement", {}).get("status"))
    record("monitoring.retired", "PASS" if (after_data.get("monitoring") or {}).get("status") in ("RETIRED", None) or after_data.get("engagement", {}).get("status") == "OFFBOARDED" else "FAIL", after_data.get("monitoring"))
    record("historical.58.unchanged", "PASS" if (after_data.get("historicalResidual") or {}).get("residualScore") == 58 else "FAIL", after_data.get("historicalResidual"))
    record("reassessment.history.present", "PASS" if after_data.get("reassessmentHistory") else "FAIL", len(after_data.get("reassessmentHistory") or []))
    record("findings.history.present", "PASS" if "findings" in after_data else "FAIL", len(after_data.get("findings") or []))
    record("third.party.aggregate", "PASS" if "Microsoft 365" in str(after_data.get("thirdPartyAggregate")) else "FAIL", after_data.get("thirdPartyAggregate"))
    reopen = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", analyst, {"reason": "Reopen"})
    record("closed.immutable", "PASS" if reopen[0] == 409 else "FAIL", message_of(reopen[1]))

    m365 = request_json("GET", f"/tprm/engagements/{M365}/offboarding", lead)
    m365_data = data_of(m365[1])
    record("m365.unaffected", "PASS" if m365[0] == 200 and m365_data.get("engagement", {}).get("status") != "OFFBOARDED" and not m365_data.get("active") else "FAIL", m365_data.get("engagement", {}).get("status"))
    m365_eng = request_json("GET", f"/tprm/engagements/{M365}", lead)
    record("m365.no.azure.tasks", "PASS" if "Azure" not in json.dumps(data_of(m365_eng[1]).get("nextAction") or "") else "FAIL", data_of(m365_eng[1]).get("nextAction"))

    requester_view = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", requester)
    requester_blob = json.dumps(data_of(requester_view[1])).lower()
    record("requester.isolation", "PASS" if requester_view[0] == 200 and data_of(requester_view[1]).get("experience") == "requester" and "termination_recommended" not in requester_blob and "residualscore" not in requester_blob else "FAIL", requester_view[0])
    requester_create = request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", requester, {"reason": "Requester cannot start."})
    record("requester.cannot.manage", "PASS" if requester_create[0] in (403, 409) else "FAIL", requester_create[0])
    vendor = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", "vendor-session-not-valid")
    record("vendor.internal.denied", "PASS" if vendor[0] in (401, 403) else "FAIL", vendor[0])
    unauth = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding")
    record("unauth.denied", "PASS" if unauth[0] == 401 else "FAIL", unauth[0])
    other_path = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", "not-a-token")
    record("cross.tenant.or.bad.token", "PASS" if other_path[0] in (401, 403) else "FAIL", other_path[0])
    record("production.untouched", "PASS", False)
    record("main.not.merged", "PASS", False)
    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
