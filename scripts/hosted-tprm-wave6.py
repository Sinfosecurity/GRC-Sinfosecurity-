#!/usr/bin/env python3
"""#12 Wave 6 hosted golden walk. Staging only. Does not start Wave 7 or persist secrets."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-6"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
VENDOR = os.environ.get("VENDOR_ID", "b777503b-8a35-4a4c-ad10-b0bfdd599c2b")
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
RESULTS: dict = {
    "item": "#12",
    "wave": "6",
    "declaredPass": False,
    "wave6Accepted": False,
    "wave7Started": False,
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


def login(email: str) -> tuple[str, dict]:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    user = ((payload.get("data") or {}).get("user")) or {}
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token, user


def residual(token: str, engagement_id: str):
    status, payload = request_json("GET", f"/tprm/engagements/{engagement_id}/monitoring", token)
    return (data_of(payload).get("residual") or {}) if status == 200 else {}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "environment": health.get("deploymentEnvironment")}
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))

    lead, lead_user = login("qa.tprm.lead@supremegrc.test")
    analyst, analyst_user = login("qa.tprm.analyst@supremegrc.test")
    requester, _ = login("qa.requester@supremegrc.test")
    record("login.lead", "PASS", lead_user.get("role"))
    record("login.analyst", "PASS", analyst_user.get("role"))

    before = residual(lead, AZURE)
    record("azure.residual.before", "PASS" if before.get("residualBand") == "MEDIUM" and before.get("residualScore") == 58 else "FAIL", before)
    workspace = request_json("GET", f"/tprm/engagements/{AZURE}/monitoring", lead)
    record("azure.monitoring.workspace", "PASS" if workspace[0] == 200 else "FAIL", workspace[0])
    health_rows = (data_of(workspace[1]).get("sourceHealth") or [])
    record("source.health.bitsight", "PASS" if any(row.get("label") == "BitSight" and row.get("status") == "NOT_CONFIGURED" for row in health_rows) else "FAIL", "NOT_CONFIGURED")

    profile = request_json("POST", f"/tprm/engagements/{AZURE}/monitoring/profile", lead, {
        "whatMonitoring": "Azure hosting security, privileged access, and service availability.",
        "whyMonitoring": "Azure Hosting QA is an Active CRITICAL Engagement.",
        "enabledDomains": ["CYBERSECURITY", "OPERATIONAL_RESILIENCE", "BUSINESS_CONTINUITY"],
        "enabledSources": ["MANUAL_OBSERVATION", "INTERNAL_REVIEW", "VENDOR_NOTIFICATION"],
        "activate": True,
    })
    record("profile.activated", "PASS" if profile[0] == 200 and (data_of(profile[1]).get("profile") or {}).get("status") == "ACTIVE" else "FAIL", profile[0])

    signal = request_json("POST", "/tprm/monitoring/signals/manual", analyst, {
        "vendorId": VENDOR,
        "engagementId": AZURE,
        "sourceType": "MANUAL_OBSERVATION",
        "domain": "CYBERSECURITY",
        "title": "Privileged access review overdue",
        "summary": "Azure hosting owner reported the monthly privileged-access review is overdue.",
        "rationale": "Recorded during Wave 6 hosted walk.",
        "sourceSeverity": "HIGH",
        "sourceRecordRef": "hosted-wave6-azure-review",
        "signalType": "PRIVILEGED_ACCESS_REVIEW",
    })
    signal_id = data_of(signal[1]).get("id")
    record("manual.signal", "PASS" if signal[0] in (200, 201) and signal_id else "FAIL", signal[0])
    inbox = request_json("GET", "/tprm/monitoring/signals", lead, None)
    record("inbox.contains.signal", "PASS" if any(row.get("id") == signal_id for row in (data_of(inbox[1]).get("signals") or [])) else "FAIL", inbox[0])
    assigned = request_json("POST", f"/tprm/monitoring/signals/{signal_id}/assign", lead, {"ownerUserId": analyst_user.get("id")})
    record("signal.assigned", "PASS" if assigned[0] == 200 else "FAIL", assigned[0])
    request_json("POST", f"/tprm/monitoring/signals/{signal_id}/impact", analyst, {"engagementId": AZURE, "decision": "AFFECTED", "rationale": "This observation is about Azure hosting."})
    triage = request_json("POST", f"/tprm/monitoring/signals/{signal_id}/triage", analyst, {
        "decision": "ACTION_REQUIRED",
        "rationale": "Privileged access review is material for Azure attention, not residual math.",
        "materiality": "Material for attention",
        "engagementId": AZURE,
    })
    record("signal.triaged", "PASS" if triage[0] == 200 else "FAIL", triage[0])
    after = residual(lead, AZURE)
    record("residual.unchanged", "PASS" if after.get("residualBand") == before.get("residualBand") and after.get("residualScore") == before.get("residualScore") else "FAIL", {"before": before, "after": after})
    controls = data_of(request_json("GET", f"/tprm/engagements/{AZURE}/monitoring", lead)[1]).get("controls") or []
    record("controls.unchanged", "PASS" if any(row.get("rating") == "PARTIALLY_EFFECTIVE" for row in controls) else "FAIL", controls)
    escalate = request_json("POST", f"/tprm/monitoring/signals/{signal_id}/escalate", lead, {
        "toUserId": lead_user.get("id"),
        "reason": "Needs risk-owner review. Escalation does not change residual.",
        "engagementId": AZURE,
    })
    record("signal.escalated", "PASS" if escalate[0] == 200 else "FAIL", escalate[0])
    finding = request_json("POST", f"/tprm/monitoring/signals/{signal_id}/finding", analyst, {
        "engagementId": AZURE,
        "rationale": "Reviewed signal warrants a Finding. Residual is not recalculated.",
    })
    record("finding.from.signal", "PASS" if finding[0] in (200, 201) and data_of(finding[1]).get("residualAfter", {}).get("residualScore") == 58 else "FAIL", finding[0])
    recommend = request_json("POST", f"/tprm/monitoring/signals/{signal_id}/recommend-reassessment", analyst, {
        "engagementId": AZURE,
        "reason": "Material privileged-access lapse should be reassessed in Wave 7.",
        "recommendedScope": "Engagement residual and due diligence",
        "triggerType": "MATERIAL_SECURITY_INCIDENT",
    })
    record("reassessment.recommended", "PASS" if recommend[0] in (200, 201) and data_of(recommend[1]).get("wave7Started") is False else "FAIL", data_of(recommend[1]).get("wave7Started"))
    record("wave7.not.started", "PASS" if data_of(recommend[1]).get("newIraCreated") is False else "FAIL", data_of(recommend[1]))

    m365 = request_json("GET", f"/tprm/engagements/{M365}/monitoring", lead)
    m365_signals = data_of(m365[1]).get("signals") or []
    record("m365.not.auto.changed", "PASS" if m365[0] == 200 and not any(row.get("id") == signal_id for row in m365_signals) else "FAIL", len(m365_signals))

    tp = request_json("POST", "/tprm/monitoring/signals/manual", analyst, {
        "vendorId": VENDOR,
        "thirdPartyLevel": True,
        "sourceType": "VENDOR_NOTIFICATION",
        "domain": "CYBERSECURITY",
        "title": "Microsoft-wide security bulletin",
        "summary": "Vendor notified a firm-wide security bulletin.",
        "rationale": "Third Party observation for Wave 6.",
        "sourceSeverity": "MEDIUM",
        "sourceRecordRef": "hosted-wave6-ms-bulletin",
        "signalType": "VENDOR_BULLETIN",
    })
    tp_id = data_of(tp[1]).get("id")
    record("third.party.signal", "PASS" if tp[0] in (200, 201) else "FAIL", tp[0])
    request_json("POST", f"/tprm/monitoring/signals/{tp_id}/impact", analyst, {"engagementId": AZURE, "decision": "AFFECTED", "rationale": "Azure hosting is in scope."})
    request_json("POST", f"/tprm/monitoring/signals/{tp_id}/impact", analyst, {"engagementId": M365, "decision": "NEEDS_REVIEW", "rationale": "M365 needs separate review."})
    detail = request_json("GET", f"/tprm/monitoring/signals/{tp_id}", lead)
    impacts = {row.get("engagementId"): row.get("decision") for row in (data_of(detail[1]).get("impacts") or [])}
    record("independent.impacts", "PASS" if impacts.get(AZURE) == "AFFECTED" and impacts.get(M365) == "NEEDS_REVIEW" else "FAIL", impacts)

    requester_denied = request_json("GET", f"/tprm/engagements/{AZURE}/monitoring", requester)
    record("requester.denied", "PASS" if requester_denied[0] == 403 else "FAIL", requester_denied[0])
    unauth = request_json("GET", f"/tprm/engagements/{AZURE}/monitoring")
    record("unauth.denied", "PASS" if unauth[0] == 401 else "FAIL", unauth[0])
    vendor_page = urllib.request.urlopen(f"{BASE}/vendor-assessment/activate", timeout=30)
    record("vendor.invitation.only", "PASS" if vendor_page.status == 200 else "FAIL", vendor_page.status)

    azure_status = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    record("azure.still.active", "PASS" if data_of(azure_status[1]).get("status") == "ACTIVE" else "FAIL", data_of(azure_status[1]).get("status"))
    write_results()
    failed = [item for item in RESULTS["checks"] if item["result"] == "FAIL"]
    print(f"FAILED={len(failed)} CHECKS={len(RESULTS['checks'])}", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
