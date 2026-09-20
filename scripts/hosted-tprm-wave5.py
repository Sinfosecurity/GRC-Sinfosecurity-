#!/usr/bin/env python3
"""#12 Wave 5 hosted walk. Staging only. Does not start Wave 6 or persist secrets."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-5"
SHOTS = OUT / "screenshots"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "88938c263d741365578e874599156096fe5d6276")
ALLOWED = {REQUIRED_SHA, "963953570154616f3a2029e854de339711eb9ea7"}
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
RESULTS: dict = {
    "item": "#12",
    "wave": "5",
    "declaredPass": False,
    "wave5Accepted": False,
    "wave6Started": False,
    "productionTouched": False,
    "mainMerged": False,
    "implementationSha": REQUIRED_SHA,
    "checks": [],
    "sha": {},
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
            payload = {"raw": raw.decode("utf-8", "replace")[:400]}
        return exc.code, payload


def login_api(email: str) -> str:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token


def data_of(payload: dict) -> dict:
    return payload.get("data") or {}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {
        "api": health.get("gitSha"),
        "frontend": fe.get("gitSha"),
        "required": REQUIRED_SHA,
        "environment": health.get("deploymentEnvironment"),
    }
    record("hosted.api.sha", "PASS" if health.get("gitSha") in ALLOWED else "FAIL", health.get("gitSha"))
    record("hosted.frontend.sha", "PASS" if fe.get("gitSha") in ALLOWED else "FAIL", fe.get("gitSha"))
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))
    if health.get("gitSha") not in ALLOWED or fe.get("gitSha") not in ALLOWED:
        write_results()
        raise SystemExit(2)

    lead = login_api("qa.tprm.lead@supremegrc.test")
    analyst = login_api("qa.tprm.analyst@supremegrc.test")
    requester = login_api("qa.requester@supremegrc.test")
    record("login.lead", "PASS", "RISK_MANAGER")
    record("login.analyst", "PASS", "ASSESSOR")
    record("login.requester", "PASS", "BUSINESS_OWNER")

    azure_risk_status, azure_risk = request_json("GET", f"/tprm/engagements/{AZURE}/risk", analyst)
    residual = (data_of(azure_risk).get("residual") or {})
    record("azure.residual", "PASS" if azure_risk_status == 200 and residual.get("residualBand") else "FAIL", {
        "status": azure_risk_status,
        "band": residual.get("residualBand"),
        "score": residual.get("residualScore"),
    })
    before_band = residual.get("residualBand")
    before_score = residual.get("residualScore")

    workspace_status, workspace = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", analyst)
    record("azure.decisions.read", "PASS" if workspace_status == 200 else "FAIL", {
        "status": workspace_status,
        "nextAction": data_of(workspace).get("nextAction"),
        "treatment": (data_of(workspace).get("treatment") or {}).get("type"),
    })

    review_at = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
    treat_status, treated = request_json("POST", f"/tprm/engagements/{AZURE}/treatment", analyst, {
        "type": "ACCEPT",
        "rationale": "Azure Hosting QA residual is accepted for the Engagement only. Score must stay unchanged.",
        "conditions": "Quarterly review. Acceptance does not lower residual.",
        "reviewAt": review_at,
        "relatedFindingIds": [row.get("id") for row in (data_of(workspace).get("openFindings") or []) if row.get("id")],
    })
    record("azure.treatment.accept", "PASS" if treat_status == 200 and data_of(treated).get("treatment", {}).get("type") == "ACCEPT" else "FAIL", {
        "status": treat_status,
        "treatment": (data_of(treated).get("treatment") or {}).get("type"),
        "acceptance": (data_of(treated).get("acceptance") or {}).get("status"),
    })

    self = request_json("POST", f"/tprm/engagements/{AZURE}/acceptance/decide", analyst, {
        "decision": "APPROVED",
        "comment": "Analyst must not approve own request.",
    })
    record("sod.self.approval.denied", "PASS" if self[0] in (403, 409) else "FAIL", {"status": self[0]})

    approved_status, approved = request_json("POST", f"/tprm/engagements/{AZURE}/acceptance/decide", lead, {
        "decision": "APPROVED",
        "comment": "Independent approval. Residual must remain unchanged.",
    })
    after = data_of(approved).get("residual") or {}
    record("azure.acceptance.approved", "PASS" if approved_status == 200 and (data_of(approved).get("acceptance") or {}).get("status") == "APPROVED" else "FAIL", {
        "status": approved_status,
        "acceptance": (data_of(approved).get("acceptance") or {}).get("status"),
    })
    record("accept.does.not.lower.residual", "PASS" if after.get("residualBand") == before_band and after.get("residualScore") == before_score else "FAIL", {
        "before": {"band": before_band, "score": before_score},
        "after": {"band": after.get("residualBand"), "score": after.get("residualScore")},
    })

    finding_id = ((data_of(approved).get("openFindings") or data_of(workspace).get("openFindings") or [{}])[0] or {}).get("id")
    req_status, required = request_json("POST", f"/tprm/engagements/{AZURE}/contract-requirements", analyst, {
        "requirement": "Privileged access review evidence",
        "source": "CONFIRMED_FINDING" if finding_id else "TREATMENT_DECISION",
        "sourceRef": finding_id or (data_of(approved).get("treatment") or {}).get("id"),
        "sourceRationale": "Sourced from the recorded Azure condition, not an invented legal clause.",
        "mandatory": True,
    })
    record("azure.contract.requirement", "PASS" if req_status in (200, 201) else "FAIL", {"status": req_status, "count": len(data_of(required).get("contractRequirements") or [])})

    m365_status, m365 = request_json("GET", f"/tprm/engagements/{M365}/decisions", analyst)
    record("m365.isolated.after.azure.treatment", "PASS" if m365_status == 200 and not data_of(m365).get("treatment") and not data_of(m365).get("contractRequirements") else "FAIL", {
        "status": m365_status,
        "treatment": (data_of(m365).get("treatment") or {}).get("type"),
        "requirements": len(data_of(m365).get("contractRequirements") or []),
        "engagementStatus": (data_of(m365).get("engagement") or {}).get("status"),
    })

    gate_status, gated = request_json("POST", f"/tprm/engagements/{AZURE}/gate/evaluate", analyst, {})
    blockers = (data_of(gated).get("gate") or {}).get("blockers") or []
    record("azure.gate.blocked", "PASS" if gate_status == 200 and (data_of(gated).get("gate") or {}).get("status") == "BLOCKED" and blockers else "FAIL", {
        "status": (data_of(gated).get("gate") or {}).get("status"),
        "blockers": [row.get("label") for row in blockers],
    })
    denied = request_json("POST", f"/tprm/engagements/{AZURE}/activate", lead, {})
    record("azure.activate.blocked.denied", "PASS" if denied[0] == 409 else "FAIL", {"status": denied[0], "message": ((denied[1].get("error") or {}).get("message"))})

    requirement_id = (data_of(gated).get("contractRequirements") or [{}])[0].get("id")
    if requirement_id:
        request_json("PATCH", f"/tprm/engagements/{AZURE}/contract-requirements/{requirement_id}", analyst, {
            "status": "SATISFIED",
            "evidenceRef": "Recorded against the confirmed Azure finding.",
        })
    ready_status, ready = request_json("POST", f"/tprm/engagements/{AZURE}/gate/evaluate", analyst, {})
    record("azure.gate.approved", "PASS" if ready_status == 200 and (data_of(ready).get("gate") or {}).get("status") == "APPROVED" else "FAIL", {
        "status": (data_of(ready).get("gate") or {}).get("status"),
    })

    requester_activate = request_json("POST", f"/tprm/engagements/{AZURE}/activate", requester, {})
    record("requester.activate.denied", "PASS" if requester_activate[0] in (401, 403) else "FAIL", requester_activate[0])
    analyst_activate = request_json("POST", f"/tprm/engagements/{AZURE}/activate", analyst, {})
    record("analyst.activate.denied", "PASS" if analyst_activate[0] == 403 else "FAIL", analyst_activate[0])
    activated_status, activated = request_json("POST", f"/tprm/engagements/{AZURE}/activate", lead, {})
    record("azure.activated", "PASS" if activated_status == 200 and (data_of(activated).get("engagement") or {}).get("status") == "ACTIVE" else "FAIL", {
        "status": activated_status,
        "engagement": (data_of(activated).get("engagement") or {}).get("status"),
        "nextAction": data_of(activated).get("nextAction"),
        "wave6Started": data_of(activated).get("wave6Started"),
    })

    m365_after = request_json("GET", f"/tprm/engagements/{M365}/decisions", analyst)
    record("m365.not.activated", "PASS" if (data_of(m365_after[1]).get("engagement") or {}).get("status") != "ACTIVE" else "FAIL", (data_of(m365_after[1]).get("engagement") or {}).get("status"))

    requester_decisions = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", requester)
    record("requester.decisions.denied", "PASS" if requester_decisions[0] == 403 else "FAIL", requester_decisions[0])

    first = request_json("POST", f"/tprm/engagements/{AZURE}/decision-briefs", analyst, {})
    first_id = data_of(first[1]).get("id")
    first_snap = json.dumps(data_of(first[1]).get("snapshot"), sort_keys=True)
    second = request_json("POST", f"/tprm/engagements/{AZURE}/decision-briefs", analyst, {})
    prior = request_json("GET", f"/tprm/engagements/{AZURE}/decision-briefs/{first_id}", analyst)
    record("decision.brief.immutable", "PASS" if first[0] in (200, 201) and second[0] in (200, 201) and data_of(second[1]).get("id") != first_id and json.dumps(data_of(prior[1]).get("snapshot"), sort_keys=True) == first_snap else "FAIL", {
        "first": first_id,
        "second": data_of(second[1]).get("id"),
        "version": data_of(second[1]).get("versionNumber"),
    })

    RESULTS["wave6Started"] = False
    write_results()
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        record("walk.exception", "FAIL", str(exc))
        write_results()
        raise
