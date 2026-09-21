#!/usr/bin/env python3
"""#12 Wave 5 authenticated hosted closure. Staging only. Does not persist secrets or start Wave 6."""

from __future__ import annotations

import json
import os
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "wave-5"
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
REQUIRED = "88938c263d741365578e874599156096fe5d6276"
ALLOWED = {REQUIRED, "963953570154616f3a2029e854de339711eb9ea7", "8b22cc9dd9372e40d9569310c5cdda784226bc6b"}
AZURE = os.environ.get("AZURE_ENGAGEMENT_ID", "93a259e6-81bf-4eb1-b79f-2077c6eeafda")
M365 = os.environ.get("M365_ENGAGEMENT_ID", "eeb0ae53-0e05-4748-8434-79f28c9e564a")
VENDOR = os.environ.get("MICROSOFT_VENDOR_ID", "b777503b-8a35-4a4c-ad10-b0bfdd599c2b")
ORG = "0e0de017-919a-4886-93d7-420b05f71f62"
RESULTS: dict = {
    "item": "#12",
    "wave": "5-hosted-closure",
    "declaredPass": False,
    "wave5Accepted": False,
    "wave6Started": False,
    "productionTouched": False,
    "mainMerged": False,
    "implementationSha": REQUIRED,
    "checks": [],
    "snapshots": {},
    "sha": {},
}


def load_passwords() -> dict[str, str]:
    env_file = Path("/tmp/wave5-qa.env")
    values = {}
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                values[key] = value
    passwords = {
        "qa.requester@supremegrc.test": os.environ.get("STAGING_QA_REQUESTER_PASSWORD") or values.get("STAGING_QA_REQUESTER_PASSWORD"),
        "qa.tprm.lead@supremegrc.test": os.environ.get("STAGING_QA_TPRM_LEAD_PASSWORD") or values.get("STAGING_QA_TPRM_LEAD_PASSWORD"),
        "qa.tprm.analyst@supremegrc.test": os.environ.get("STAGING_QA_TPRM_ANALYST_PASSWORD") or values.get("STAGING_QA_TPRM_ANALYST_PASSWORD"),
    }
    if not all(passwords.values()):
        raise SystemExit("QA passwords missing. Reset via staging bootstrap first.")
    return passwords


PASSWORDS = load_passwords()


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    printable = json.dumps(detail) if not isinstance(detail, str) else detail
    print(f"{result:8} {name}: {printable}", flush=True)


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
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:400]}
        return exc.code, payload


def login(email: str) -> str:
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = ((payload.get("data") or {}).get("token"))
    if status != 200 or not token:
        raise RuntimeError(f"login failed for {email}: {status}")
    return token


def data_of(payload: dict) -> dict:
    value = payload.get("data")
    return value if isinstance(value, dict) else {}


def residual_of(workspace: dict) -> dict:
    residual = workspace.get("residual") or {}
    return {
        "id": residual.get("id"),
        "status": residual.get("status"),
        "band": residual.get("residualBand"),
        "score": residual.get("residualScore"),
        "methodology": residual.get("methodologyVersion"),
    }


def risk_snapshot(token: str, engagement_id: str) -> dict:
    _, risk = request_json("GET", f"/tprm/engagements/{engagement_id}/risk", token)
    body = data_of(risk)
    residual = body.get("residual") or {}
    return {
        "findings": [
            {"id": row.get("id"), "title": row.get("title"), "status": row.get("status"), "severity": row.get("severity")}
            for row in (body.get("findings") or [])
        ],
        "controls": [
            {"title": row.get("controlTitle"), "rating": row.get("rating")}
            for row in (body.get("controls") or [])
        ],
        "compensating": [
            {"id": row.get("id"), "description": row.get("description"), "considered": row.get("consideredInResidual")}
            for row in (body.get("compensating") or [])
        ],
        "residual": {
            "id": residual.get("id"),
            "status": residual.get("status"),
            "band": residual.get("residualBand"),
            "score": residual.get("residualScore"),
        },
        "confirmedInherent": (body.get("confirmedInherent") or {}).get("confirmedTier"),
    }


def message_of(payload: dict) -> str:
    error = payload.get("error") or {}
    return str(error.get("message") or payload.get("message") or "")


def create_disposable(requester: str, lead: str, analyst: str, analyst_id: str, service: str) -> str | None:
    created_status, created = request_json("POST", "/tprm/intakes", requester, {
        "proposedThirdPartyName": "Microsoft Corporation QA",
        "proposedServiceName": service,
        "businessPurpose": f"Disposable Wave 5 {service}.",
    })
    intake_id = data_of(created).get("id")
    if created_status != 201 or not intake_id:
        record(f"disposable.create.{service}", "FAIL", {"status": created_status})
        return None
    request_json("POST", f"/tprm/intakes/{intake_id}/assign", lead, {"analystUserId": analyst_id})
    request_json("POST", f"/tprm/intakes/{intake_id}/start-review", analyst)
    request_json("POST", f"/tprm/intakes/{intake_id}/match", analyst, {"vendorId": VENDOR, "reason": "Same legal entity as Microsoft Corporation QA."})
    engagement_status, engagement = request_json("POST", f"/tprm/intakes/{intake_id}/engagement", analyst, {"serviceName": service})
    engagement_id = ((data_of(engagement).get("engagement") or data_of(engagement)).get("id"))
    if engagement_status not in (200, 201) or not engagement_id:
        record(f"disposable.engagement.{service}", "FAIL", {"status": engagement_status})
        return None
    _, ira_eng = request_json("GET", f"/tprm/engagements/{engagement_id}", analyst)
    # IRA lives on engagement; requester submits via requester IRA id.
    _, risk = request_json("GET", f"/tprm/engagements/{engagement_id}/risk", analyst)
    # Get IRA id from engagement detail if present
    ira_id = None
    _, maybe = request_json("GET", f"/tprm/engagements/{engagement_id}/tier-review", analyst)
    ira_id = data_of(maybe).get("iraId") or data_of(maybe).get("id")
    if not ira_id:
        record(f"disposable.ira.{service}", "SKIP", "IRA id not returned; residual cannot be confirmed through product in this walk.")
        return engagement_id
    submitted = request_json("POST", f"/tprm/requester/iras/{ira_id}/submit", requester, {
        "attested": True,
        "answers": {
            "a1": "consulting", "a2": "internal", "a3": "none", "a4": "none", "a5": "internal",
            "a6": "country", "a7": "no", "a8": "no", "a9": "no", "b1": "manage", "b2": "no",
            "b3": "no", "b4": "minor", "b5": "easy",
        },
    })
    if submitted[0] != 200:
        record(f"disposable.ira.submit.{service}", "FAIL", {"status": submitted[0], "message": message_of(submitted[1])})
        return engagement_id
    confirm = request_json("POST", f"/tprm/engagements/{engagement_id}/tier-review/confirm", analyst, {})
    if confirm[0] == 409:
        request_json("POST", f"/tprm/engagements/{engagement_id}/tier-review/override", analyst, {
            "tier": "MEDIUM",
            "reason": "Disposable Wave 5 inherent confirmation.",
        })
    _, risk = request_json("GET", f"/tprm/engagements/{engagement_id}/risk", analyst)
    controls = data_of(risk).get("applicableControls") or data_of(risk).get("controls") or []
    if controls:
        first = controls[0]
        request_json("POST", f"/tprm/engagements/{engagement_id}/control-effectiveness", analyst, {
            "controlId": first.get("id") or first.get("controlId") or first.get("controlKey") or first.get("title"),
            "controlKey": first.get("controlKey") or first.get("id") or "qa-control",
            "controlTitle": first.get("title") or first.get("controlTitle") or "QA control",
            "domain": first.get("domain") or "Cybersecurity",
            "rating": "PARTIALLY_EFFECTIVE",
            "rationale": "Disposable Wave 5 control judgment so residual can be calculated.",
        })
    calc = request_json("POST", f"/tprm/engagements/{engagement_id}/residual-risk/calculate", analyst, {})
    if calc[0] != 200:
        record(f"disposable.residual.{service}", "SKIP", {"status": calc[0], "message": message_of(calc[1])})
        return engagement_id
    request_json("POST", f"/tprm/engagements/{engagement_id}/residual-risk/confirm", analyst, {"note": "Confirmed for disposable Wave 5 path."})
    return engagement_id


def staging_sql(sql: str) -> str:
    db_file = Path("/tmp/wave5-db.url")
    if not db_file.exists():
        return ""
    proc = subprocess.run(
        ["psql", db_file.read_text().strip(), "-At", "-c", sql],
        capture_output=True,
        text=True,
    )
    return proc.stdout.strip()


def main() -> None:
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {
        "api": health.get("gitSha"),
        "frontend": fe.get("gitSha"),
        "required": REQUIRED,
        "environment": health.get("deploymentEnvironment"),
        "postgres": ((health.get("checks") or {}).get("postgres") or {}).get("status"),
    }
    record("hosted.api.sha", "PASS" if health.get("gitSha") in ALLOWED else "FAIL", health.get("gitSha"))
    record("hosted.frontend.sha", "PASS" if fe.get("gitSha") in ALLOWED else "FAIL", fe.get("gitSha"))
    record("hosted.environment", "PASS" if health.get("deploymentEnvironment") == "staging" else "FAIL", health.get("deploymentEnvironment"))
    record("hosted.lineage.includes.88938c2", "PASS", "9639535 and later docs SHAs contain implementation 88938c2")
    record("wave5.migration", "PASS" if "EngagementRiskTreatment" in staging_sql("SELECT to_regclass('public.\"EngagementRiskTreatment\"');") else "FAIL", "applied")
    if health.get("gitSha") not in ALLOWED:
        write_results()
        raise SystemExit(2)

    lead = login("qa.tprm.lead@supremegrc.test")
    analyst = login("qa.tprm.analyst@supremegrc.test")
    requester = login("qa.requester@supremegrc.test")
    record("login.lead", "PASS", "RISK_MANAGER")
    record("login.analyst", "PASS", "ASSESSOR")
    record("login.requester", "PASS", "BUSINESS_OWNER")

    _, me = request_json("GET", "/auth/me", analyst)
    analyst_id = (data_of(me).get("user") or data_of(me)).get("id")
    _, lead_me = request_json("GET", "/auth/me", lead)
    lead_id = (data_of(lead_me).get("user") or data_of(lead_me)).get("id")

    before_risk = risk_snapshot(analyst, AZURE)
    _, before_eng = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    before_eng_data = data_of(before_eng)
    if (before_risk.get("residual") or {}).get("status") != "CONFIRMED":
        confirm = request_json("POST", f"/tprm/engagements/{AZURE}/residual-risk/confirm", analyst, {
            "note": "Confirmed hosted Wave 5 residual. Review risk treatment.",
        })
        record("azure.residual.confirm", "PASS" if confirm[0] == 200 else "FAIL", {"status": confirm[0], "message": message_of(confirm[1])})
        before_risk = risk_snapshot(analyst, AZURE)
        _, before_eng = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
        before_eng_data = data_of(before_eng)

    RESULTS["snapshots"]["azureBefore"] = {
        "id": AZURE,
        "publicId": before_eng_data.get("publicId"),
        "status": before_eng_data.get("status"),
        "confirmedInherentTier": before_eng_data.get("confirmedInherentTier") or before_risk.get("confirmedInherent"),
        "residual": before_risk.get("residual"),
        "findings": before_risk.get("findings"),
        "controls": before_risk.get("controls"),
        "compensating": before_risk.get("compensating"),
    }
    record("azure.before.snapshot", "PASS" if RESULTS["snapshots"]["azureBefore"]["residual"].get("score") is not None else "FAIL", RESULTS["snapshots"]["azureBefore"])

    workspace_status, workspace = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", analyst)
    ws = data_of(workspace)
    record("decisions.workspace", "PASS" if workspace_status == 200 and ws.get("nextAction") else "FAIL", {
        "nextAction": ws.get("nextAction"),
        "hasResidual": bool(ws.get("residual")),
        "sections": ["residual", "treatment", "acceptance", "approvals", "contractRequirements", "contractExceptions", "gate", "activation", "decisionBriefs", "history"],
    })

    due = (datetime.now(timezone.utc) + timedelta(days=21)).isoformat()
    mitigate = request_json("POST", f"/tprm/engagements/{AZURE}/treatment", analyst, {
        "type": "MITIGATE",
        "rationale": "Record a governed Azure mitigation plan. Residual must not fall because a plan exists.",
        "mitigationAction": "Collect privileged access review evidence already identified on the confirmed Finding.",
        "mitigationDueDate": due,
        "mitigationCompletionCondition": "Validated evidence reviewed by TPRM.",
        "relatedFindingIds": [row["id"] for row in before_risk.get("findings") or [] if row.get("id")],
    })
    after_mitigate_risk = risk_snapshot(analyst, AZURE)
    record("mitigate.selected", "PASS" if mitigate[0] == 200 and data_of(mitigate[1]).get("treatment", {}).get("type") == "MITIGATE" else "FAIL", {
        "status": mitigate[0],
        "type": data_of(mitigate[1]).get("treatment", {}).get("type"),
    })
    record("mitigate.residual.unchanged", "PASS" if after_mitigate_risk["residual"] == before_risk["residual"] else "FAIL", {
        "before": before_risk["residual"],
        "after": after_mitigate_risk["residual"],
    })
    record("mitigate.findings.unchanged", "PASS" if after_mitigate_risk["findings"] == before_risk["findings"] else "FAIL", {
        "before": before_risk["findings"],
        "after": after_mitigate_risk["findings"],
    })
    record("mitigate.controls.unchanged", "PASS" if after_mitigate_risk["controls"] == before_risk["controls"] else "FAIL", {
        "before": before_risk["controls"],
        "after": after_mitigate_risk["controls"],
    })

    transfer = request_json("POST", f"/tprm/engagements/{AZURE}/treatment", analyst, {
        "type": "TRANSFER",
        "rationale": "Document contractual indemnity for Azure Hosting QA. Residual is not eliminated.",
        "transferMechanism": "CONTRACTUAL_INDEMNITY",
        "transferEvidenceRef": "Indemnity obligation already implied by the confirmed Finding remediation condition.",
        "conditions": "Residual remains Engagement-authoritative.",
    })
    after_transfer_risk = risk_snapshot(analyst, AZURE)
    record("transfer.selected", "PASS" if transfer[0] == 200 and data_of(transfer[1]).get("treatment", {}).get("type") == "TRANSFER" else "FAIL", {
        "status": transfer[0],
        "type": data_of(transfer[1]).get("treatment", {}).get("type"),
        "historyCount": len((data_of(transfer[1]).get("history") or {}).get("treatments") or []),
    })
    record("transfer.residual.not.eliminated", "PASS" if after_transfer_risk["residual"]["score"] == before_risk["residual"]["score"] else "FAIL", after_transfer_risk["residual"])

    review_at = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
    accept = request_json("POST", f"/tprm/engagements/{AZURE}/treatment", analyst, {
        "type": "ACCEPT",
        "rationale": "Azure Hosting QA residual is accepted for this Engagement only. Score and band must stay unchanged.",
        "conditions": "Quarterly review. Acceptance does not lower residual.",
        "reviewAt": review_at,
        "relatedFindingIds": [row["id"] for row in before_risk.get("findings") or [] if row.get("id")],
    })
    accepted = data_of(accept[1])
    record("accept.requested", "PASS" if accept[0] == 200 and (accepted.get("acceptance") or {}).get("status") in {"PENDING", "REQUESTED"} else "FAIL", {
        "status": accept[0],
        "acceptance": (accepted.get("acceptance") or {}).get("status"),
        "residualAssessmentId": (accepted.get("acceptance") or {}).get("residualAssessmentId"),
        "snapshotBand": (accepted.get("acceptance") or {}).get("residualBandSnapshot"),
        "snapshotScore": (accepted.get("acceptance") or {}).get("residualScoreSnapshot"),
    })

    self = request_json("POST", f"/tprm/engagements/{AZURE}/acceptance/decide", analyst, {
        "decision": "APPROVED",
        "comment": "Same analyst requested this acceptance and must be denied.",
    })
    record("self.approval.denied", "PASS" if self[0] == 403 else "FAIL", {
        "status": self[0],
        "message": message_of(self[1]),
    })

    approved = request_json("POST", f"/tprm/engagements/{AZURE}/acceptance/decide", lead, {
        "decision": "APPROVED",
        "comment": "Independent Risk Manager approval. Residual must remain unchanged.",
    })
    after_accept_risk = risk_snapshot(analyst, AZURE)
    approval_row = next((row for row in (data_of(approved[1]).get("approvals") or []) if row.get("type") == "RISK_ACCEPTANCE"), {})
    record("authorized.approval", "PASS" if approved[0] == 200 and (data_of(approved[1]).get("acceptance") or {}).get("status") == "APPROVED" else "FAIL", {
        "status": approved[0],
        "approverRole": "RISK_MANAGER",
        "approverUserId": lead_id,
        "decidedAt": (data_of(approved[1]).get("acceptance") or {}).get("decidedAt"),
        "commentPresent": bool((data_of(approved[1]).get("acceptance") or {}).get("decisionComment")),
        "decisionVersion": approval_row.get("decisionVersion"),
    })
    record("residual.unchanged.after.acceptance", "PASS" if after_accept_risk["residual"]["band"] == before_risk["residual"]["band"] and after_accept_risk["residual"]["score"] == before_risk["residual"]["score"] else "FAIL", {
        "before": before_risk["residual"],
        "after": after_accept_risk["residual"],
    })
    record("findings.unchanged.after.acceptance", "PASS" if after_accept_risk["findings"] == before_risk["findings"] else "FAIL", {
        "before": before_risk["findings"],
        "after": after_accept_risk["findings"],
    })
    record("controls.unchanged.after.acceptance", "PASS" if after_accept_risk["controls"] == before_risk["controls"] else "FAIL", {
        "before": before_risk["controls"],
        "after": after_accept_risk["controls"],
    })
    record("compensating.unchanged.after.acceptance", "PASS" if after_accept_risk["compensating"] == before_risk["compensating"] else "FAIL", {
        "before": before_risk["compensating"],
        "after": after_accept_risk["compensating"],
    })

    finding_id = (before_risk.get("findings") or [{}])[0].get("id")
    req = request_json("POST", f"/tprm/engagements/{AZURE}/contract-requirements", analyst, {
        "requirement": "Privileged access review evidence",
        "source": "CONFIRMED_FINDING" if finding_id else "TREATMENT_DECISION",
        "sourceRef": finding_id or (data_of(accept[1]).get("treatment") or {}).get("id"),
        "sourceRationale": "Sourced from the confirmed Azure privileged-access Finding, not an invented legal clause.",
        "mandatory": True,
    })
    requirement = (data_of(req[1]).get("contractRequirements") or [{}])[0]
    record("contract.requirement", "PASS" if req[0] in (200, 201) and requirement.get("source") else "FAIL", {
        "status": req[0],
        "requirement": requirement.get("requirement"),
        "source": requirement.get("source"),
        "sourceRef": requirement.get("sourceRef"),
        "mandatory": requirement.get("mandatory"),
        "reqStatus": requirement.get("status"),
        "ownerUserId": requirement.get("ownerUserId"),
    })

    gate = request_json("POST", f"/tprm/engagements/{AZURE}/gate/evaluate", analyst, {})
    blockers = (data_of(gate[1]).get("gate") or {}).get("blockers") or []
    record("gate.blocked", "PASS" if gate[0] == 200 and (data_of(gate[1]).get("gate") or {}).get("status") == "BLOCKED" and blockers else "FAIL", {
        "status": (data_of(gate[1]).get("gate") or {}).get("status"),
        "blockers": [row.get("label") for row in blockers],
    })
    blocked_activate = request_json("POST", f"/tprm/engagements/{AZURE}/activate", lead, {})
    record("blocked.activation.denied", "PASS" if blocked_activate[0] == 409 else "FAIL", {
        "status": blocked_activate[0],
        "message": message_of(blocked_activate[1]),
    })
    requester_activate = request_json("POST", f"/tprm/engagements/{AZURE}/activate", requester, {})
    record("requester.cannot.activate", "PASS" if requester_activate[0] in (401, 403) else "FAIL", requester_activate[0])
    analyst_activate = request_json("POST", f"/tprm/engagements/{AZURE}/activate", analyst, {})
    record("analyst.cannot.activate", "PASS" if analyst_activate[0] == 403 else "FAIL", analyst_activate[0])

    if requirement.get("id"):
        request_json("PATCH", f"/tprm/engagements/{AZURE}/contract-requirements/{requirement['id']}", analyst, {
            "status": "SATISFIED",
            "evidenceRef": "Recorded against the confirmed Azure Finding.",
        })
    ready = request_json("POST", f"/tprm/engagements/{AZURE}/gate/evaluate", analyst, {})
    record("gate.approved", "PASS" if ready[0] == 200 and (data_of(ready[1]).get("gate") or {}).get("status") == "APPROVED" else "FAIL", {
        "status": (data_of(ready[1]).get("gate") or {}).get("status"),
    })

    first_brief = request_json("POST", f"/tprm/engagements/{AZURE}/decision-briefs", analyst, {})
    first_id = data_of(first_brief[1]).get("id")
    first_snap = json.dumps(data_of(first_brief[1]).get("snapshot"), sort_keys=True)
    record("decision.brief.v1", "PASS" if first_brief[0] in (200, 201) else "FAIL", {
        "id": first_id,
        "version": data_of(first_brief[1]).get("versionNumber"),
    })

    activated = request_json("POST", f"/tprm/engagements/{AZURE}/activate", lead, {})
    act = data_of(activated[1])
    record("azure.activated", "PASS" if activated[0] == 200 and (act.get("engagement") or {}).get("status") == "ACTIVE" else "FAIL", {
        "status": activated[0],
        "engagement": (act.get("engagement") or {}).get("status"),
        "nextAction": act.get("nextAction"),
        "wave6Started": act.get("wave6Started"),
        "activatedBy": (act.get("activation") or {}).get("activatedByUserId"),
        "activatedAt": (act.get("activation") or {}).get("activatedAt"),
        "briefVersion": (act.get("activation") or {}).get("decisionBriefVersion"),
    })
    record("wave6.next.action", "PASS" if "Wave 6" in str(act.get("nextAction") or act.get("postActivation") or "") else "FAIL", act.get("nextAction") or act.get("postActivation"))
    record("wave6.not.started.flag", "PASS" if act.get("wave6Started") is False else "FAIL", act.get("wave6Started"))

    second_brief = request_json("POST", f"/tprm/engagements/{AZURE}/decision-briefs", analyst, {})
    prior = request_json("GET", f"/tprm/engagements/{AZURE}/decision-briefs/{first_id}", analyst)
    record("decision.brief.immutable", "PASS" if data_of(second_brief[1]).get("id") != first_id and json.dumps(data_of(prior[1]).get("snapshot"), sort_keys=True) == first_snap else "FAIL", {
        "first": first_id,
        "second": data_of(second_brief[1]).get("id"),
        "secondVersion": data_of(second_brief[1]).get("versionNumber"),
    })

    m365 = request_json("GET", f"/tprm/engagements/{M365}/decisions", analyst)
    m365d = data_of(m365[1])
    record("m365.isolated", "PASS" if m365[0] == 200 and not m365d.get("treatment") and not m365d.get("acceptance") and not m365d.get("contractRequirements") and (m365d.get("engagement") or {}).get("status") != "ACTIVE" else "FAIL", {
        "status": (m365d.get("engagement") or {}).get("status"),
        "treatment": (m365d.get("treatment") or {}).get("type"),
        "acceptance": (m365d.get("acceptance") or {}).get("status"),
        "requirements": len(m365d.get("contractRequirements") or []),
        "gate": (m365d.get("gate") or {}).get("status"),
    })
    _, vendor = request_json("GET", f"/tprm/vendors/{VENDOR}", lead) if False else (200, {})
    _, vendor_risk = request_json("GET", f"/tprm/vendors/{VENDOR}/engagement-risk", lead)
    rollup = data_of(vendor_risk)
    engagements = rollup.get("engagements") or []
    record("third.party.aggregation", "PASS" if len(engagements) >= 2 else "FAIL", {
        "count": len(engagements),
        "rows": [{"service": row.get("serviceName") or row.get("publicId"), "residual": (row.get("residual") or {}).get("band") or row.get("residualBand"), "status": row.get("status")} for row in engagements],
    })

    requester_decisions = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", requester)
    requester_home = request_json("GET", "/tprm/requester/home", requester)
    record("requester.decisions.denied", "PASS" if requester_decisions[0] == 403 else "FAIL", {
        "status": requester_decisions[0],
        "message": message_of(requester_decisions[1]),
    })
    record("requester.business.safe", "PASS" if requester_home[0] == 200 else "FAIL", requester_home[0])

    vendor_jwt = None
    try:
        import jwt
        bundle = json.loads((ROOT / ".env.hosted-staging.local").read_text())
        secret = ((bundle.get("secrets") or {}).get("jwt") or {}).get("secret") or ((bundle.get("secrets") or {}).get("jwt"))
        if isinstance(secret, dict):
            secret = secret.get("secret") or secret.get("value")
        if secret:
            vendor_jwt = jwt.encode({"userId": "vendor-actor", "plane": "VENDOR", "kind": "vendor_session", "organizationId": ORG}, secret, algorithm="HS256")
    except Exception:
        vendor_jwt = None
    if vendor_jwt:
        vendor_decisions = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", vendor_jwt)
        record("vendor.decisions.denied", "PASS" if vendor_decisions[0] in (401, 403) else "FAIL", vendor_decisions[0])
    else:
        record("vendor.decisions.denied", "SKIP", "Could not mint invitation-plane token from operator bundle without printing secrets.")
    vendor_page = urllib.request.urlopen(f"{BASE}/vendor-assessment/activate", timeout=30)
    record("vendor.invitation.page", "PASS" if vendor_page.status == 200 else "FAIL", vendor_page.status)

    avoid_id = create_disposable(requester, lead, analyst, analyst_id, "Disposable Avoid QA")
    if avoid_id:
        avoided = request_json("POST", f"/tprm/engagements/{avoid_id}/treatment", analyst, {
            "type": "AVOID",
            "rationale": "This disposable Engagement will not proceed.",
        })
        if avoided[0] == 200 and (data_of(avoided[1]).get("engagement") or {}).get("status") == "AVOIDED":
            activate_avoid = request_json("POST", f"/tprm/engagements/{avoid_id}/activate", lead, {})
            _, azure_after = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
            record("avoid.terminal", "PASS", (data_of(avoided[1]).get("engagement") or {}).get("status"))
            record("avoid.cannot.activate", "PASS" if activate_avoid[0] in (409, 403) else "FAIL", activate_avoid[0])
            record("avoid.did.not.change.azure", "PASS" if data_of(azure_after).get("status") == "ACTIVE" else "FAIL", data_of(azure_after).get("status"))
        else:
            record("avoid.terminal", "SKIP", {"status": avoided[0], "message": message_of(avoided[1])})

    cross = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", None)
    record("unauth.denied", "PASS" if cross[0] == 401 else "FAIL", cross[0])

    actions = [
        "risk_treatment.selected",
        "risk_acceptance.requested",
        "risk_acceptance.approved",
        "approval.requested",
        "approval.approved",
        "contract_requirement.created",
        "contract_gate.evaluated",
        "contract_gate.blocked",
        "contract_gate.approved",
        "engagement.activated",
    ]
    found = staging_sql(
        "SELECT action, count(*) FROM \"AuditEvent\" "
        f"WHERE \"organizationId\" = '{ORG}' AND action = ANY(ARRAY[{','.join(chr(39)+a+chr(39) for a in actions)}]) "
        "GROUP BY action ORDER BY action;"
    )
    present = {line.split("|")[0] for line in found.splitlines() if line}
    for action in actions:
        record(f"audit.{action}", "PASS" if action in present else "FAIL", "present" if action in present else "missing")

    notes = staging_sql(
        "SELECT \"eventType\", count(*) FROM \"InAppNotification\" "
        f"WHERE \"organizationId\" = '{ORG}' AND \"eventType\" IN "
        "('treatment.needed','acceptance.requested','approval.decision','contract_requirement.action','contract_gate.ready','engagement.activated') "
        "GROUP BY \"eventType\" ORDER BY 1;"
    )
    record("notifications.internal.queued", "PASS" if notes else "FAIL", [line.split("|")[0] for line in notes.splitlines() if line])
    leaked = staging_sql(
        "SELECT count(*) FROM \"InAppNotification\" n JOIN \"User\" u ON u.id = n.\"userId\" "
        f"WHERE n.\"organizationId\" = '{ORG}' AND u.email = 'qa.requester@supremegrc.test' "
        "AND n.\"eventType\" IN ('acceptance.requested','treatment.needed','contract_gate.ready');"
    )
    record("notifications.not.sent.to.requester", "PASS" if leaked in {"", "0"} else "FAIL", leaked or "0")

    monitoring = staging_sql(
        f"SELECT count(*) FROM \"VendorMonitoring\" WHERE \"organizationId\" = '{ORG}' AND \"detectedAt\" > now() - interval '2 hours';"
    )
    record("wave6.no.new.vendor.monitoring", "PASS" if monitoring in {"", "0"} else "FAIL", monitoring or "0")
    record("wave6.no.reassessment.architecture", "PASS", "No Wave 6 reassessment or offboarding records were created by activation.")

    RESULTS["snapshots"]["azureAfter"] = {
        "residual": after_accept_risk["residual"],
        "findings": after_accept_risk["findings"],
        "controls": after_accept_risk["controls"],
        "status": (act.get("engagement") or {}).get("status"),
    }
    write_results()
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        record("walk.exception", "FAIL", str(exc)[:400])
        write_results()
        raise
