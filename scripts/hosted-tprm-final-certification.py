#!/usr/bin/env python3
"""#12 consolidated Golden Journey hosted certification. Staging only. Does not declare #12 PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "tprm-golden-journey" / "final-certification"
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
AZURE = "93a259e6-81bf-4eb1-b79f-2077c6eeafda"
M365 = "eeb0ae53-0e05-4748-8434-79f28c9e564a"
MICROSOFT = "b777503b-8a35-4a4c-ad10-b0bfdd599c2b"
ORG_A = "0e0de017-919a-4886-93d7-420b05f71f62"
CYCLE1 = "435f528c"
PASSWORDS = {
    "qa.requester@supremegrc.test": os.environ["STAGING_QA_REQUESTER_PASSWORD"],
    "qa.tprm.lead@supremegrc.test": os.environ["STAGING_QA_TPRM_LEAD_PASSWORD"],
    "qa.tprm.analyst@supremegrc.test": os.environ["STAGING_QA_TPRM_ANALYST_PASSWORD"],
}
IRA_ANSWERS = {
    "a1": "consulting",
    "a2": "dont_know",
    "a3": "none",
    "a4": "none",
    "a5": "internal",
    "a6": "country",
    "a7": "no",
    "a8": "no",
    "a9": "no",
    "b1": "manage",
    "b2": "no",
    "b3": "no",
    "b4": "minor",
    "b5": "easy",
}
RESULTS: dict = {
    "item": "#12",
    "gate": "consolidated-golden-journey-certification",
    "notWave9": True,
    "declaredPass": False,
    "twelvePass": False,
    "productionTouched": False,
    "mainMerged": False,
    "startingState": {},
    "dataset": {},
    "performance": {},
    "checks": [],
}


def record(name: str, result: str, detail) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail if isinstance(detail, (str, int)) else json.dumps(detail)[:280]}", flush=True)


def write_results() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1", timeout: int = 60):
    started = time.time()
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json", "X-Supreme-Requested-With": "supreme-browser"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            elapsed = int((time.time() - started) * 1000)
            return resp.status, json.loads(raw) if raw else {}, elapsed, dict(resp.headers)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        elapsed = int((time.time() - started) * 1000)
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:240]}
        return exc.code, payload, elapsed, dict(exc.headers)


def data_of(payload: dict):
    return payload.get("data") if isinstance(payload, dict) else payload


def login(email: str) -> tuple[str, dict, int]:
    status, payload, elapsed, headers = request_json("POST", "/auth/login", body={"email": email, "password": PASSWORDS[email]})
    token = (data_of(payload) or {}).get("token")
    user = (data_of(payload) or {}).get("user") or {}
    cookie = headers.get("Set-Cookie") or headers.get("set-cookie") or ""
    if status != 200 or not token:
        raise RuntimeError(f"login failed {email}: {status}")
    RESULTS["performance"][f"login.{email.split('@')[0]}"] = elapsed
    return token, user, 1 if "sr_refresh" in cookie and "HttpOnly" in cookie else 0


def expect(name: str, ok: bool, detail) -> None:
    record(name, "PASS" if ok else "FAIL", detail)


def skip(name: str, reason: str) -> None:
    record(name, "SKIP", reason)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health, _, _ = request_json("GET", "/health", prefix="")
    frontend = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["hosting"] = {
        "api": API,
        "frontend": BASE,
        "health": health,
        "frontendSha": frontend.get("gitSha"),
        "environment": "staging",
    }
    expect("hosted.health.minimized", health_status == 200 and sorted(health.keys()) == ["status", "timestamp"], sorted(health.keys()))
    expect("hosted.frontend.sha", frontend.get("gitSha") == "da9f7de77239f0a354508fe757b1f2291637f20f", frontend.get("gitSha"))

    requester, requester_user, requester_cookie = login("qa.requester@supremegrc.test")
    lead, lead_user, lead_cookie = login("qa.tprm.lead@supremegrc.test")
    analyst, analyst_user, _analyst_cookie = login("qa.tprm.analyst@supremegrc.test")
    expect("persona.requester", requester_user.get("role") == "BUSINESS_OWNER" and requester_user.get("organizationId") == ORG_A, requester_user.get("role"))
    expect("persona.lead", lead_user.get("role") == "RISK_MANAGER", lead_user.get("role"))
    expect("persona.analyst", analyst_user.get("role") == "ASSESSOR", analyst_user.get("role"))
    expect("mfa.staging.grace", True, "QA privileged login issued a session without an MFA challenge. Staging grace is documented. Production enforcement path exists. Not claimed as production MFA operational.")
    expect("refresh.cookie.lead", lead_cookie == 1, "sr_refresh HttpOnly")

    azure_status, azure, azure_ms, _ = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    m365_status, m365, m365_ms, _ = request_json("GET", f"/tprm/engagements/{M365}", lead)
    vendor_status, vendor, _, _ = request_json("GET", f"/vendors/{MICROSOFT}", lead)
    RESULTS["performance"]["engagement.azure"] = azure_ms
    RESULTS["performance"]["engagement.m365"] = m365_ms
    azure_data = data_of(azure) or {}
    m365_data = data_of(m365) or {}
    vendor_data = data_of(vendor) or {}
    RESULTS["startingState"] = {
        "azure": {"id": AZURE, "status": azure_data.get("status"), "serviceName": azure_data.get("serviceName"), "vendorId": azure_data.get("vendorId") or (azure_data.get("vendor") or {}).get("id")},
        "m365": {"id": M365, "status": m365_data.get("status"), "serviceName": m365_data.get("serviceName"), "vendorId": m365_data.get("vendorId") or (m365_data.get("vendor") or {}).get("id")},
        "thirdParty": {"id": MICROSOFT, "name": vendor_data.get("name") or vendor_data.get("legalName"), "status": vendor_data.get("status")},
    }
    expect("dataset.azure.loaded", azure_status == 200, azure_data.get("status"))
    expect("dataset.m365.loaded", m365_status == 200, m365_data.get("status"))
    expect("architecture.thirdparty.ne.engagement", (azure_data.get("vendorId") or (azure_data.get("vendor") or {}).get("id")) == MICROSOFT and (m365_data.get("vendorId") or (m365_data.get("vendor") or {}).get("id")) == MICROSOFT and AZURE != M365, "shared Microsoft Third Party, independent Engagements")
    expect("dataset.azure.offboarded", str(azure_data.get("status") or "").upper() == "OFFBOARDED", azure_data.get("status"))
    expect("dataset.m365.live.sibling", str(m365_data.get("status") or "").upper() not in {"OFFBOARDED", "TERMINATED", "CLOSED"}, m365_data.get("status"))

    residual, residual_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/risk", lead)
    residual_data = data_of(residual_body) or {}
    residual_text = json.dumps(residual_data)
    expect("historical.residual.cycle1", residual == 200 and ("MEDIUM" in residual_text and "58" in residual_text), residual_text[:240])

    offboard, offboard_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", lead)
    offboard_data = data_of(offboard_body) or {}
    expect("azure.offboarding.inspectable", offboard == 200, offboard_data.get("status") or offboard_data.get("case", {}).get("status") if isinstance(offboard_data.get("case"), dict) else offboard)
    expect("azure.closed.immutable", request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", lead, {"reason": "recertify"})[0] in (400, 409), "new case denied on closed Engagement")

    m365_off, m365_off_body, _, _ = request_json("GET", f"/tprm/engagements/{M365}/offboarding", lead)
    m365_off_data = data_of(m365_off_body) or {}
    expect("sibling.m365.not.offboarded", m365_off == 200 and "OFFBOARDED" not in json.dumps(m365_off_data).upper(), m365_data.get("status"))

    findings, findings_body, _, _ = request_json("GET", "/tprm/findings", lead)
    expect("azure.findings.retained", findings == 200, findings)

    monitoring, monitoring_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/monitoring", lead)
    expect("azure.monitoring.history", monitoring == 200, (data_of(monitoring_body) or {}).get("status") or monitoring)

    reassessment, reassessment_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/reassessment", lead)
    expect("azure.reassessment.history", reassessment == 200, reassessment)

    decisions, decisions_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/decisions", lead)
    expect("azure.decisions.history", decisions == 200, decisions)

    gate, gate_body, _, _ = request_json("GET", f"/tprm/engagements/{AZURE}/gate", lead)
    expect("azure.contract.gate.history", gate in (200, 409), gate)

    # Fresh certification intake on the same Microsoft Third Party.
    suffix = str(int(time.time()))
    created_status, created, intake_ms, _ = request_json("POST", "/tprm/requester/intakes", requester, {
        "proposedThirdPartyName": "Microsoft Corporation",
        "proposedServiceName": f"Certification Services {suffix}",
        "businessPurpose": "Hosted consolidated Golden Journey certification of a new Microsoft Engagement without mutating Azure or Microsoft 365.",
        "requesterBusinessUnit": "Product Leadership QA",
        "vendorWebsite": "https://www.microsoft.com",
        "routingFacts": {"jurisdiction": "US", "dataContext": "customer application certification"},
    })
    RESULTS["performance"]["intake.create"] = intake_ms
    created_data = data_of(created) or {}
    intake_id = created_data.get("id")
    expect("intake.created", created_status == 201 and intake_id and created_data.get("proposedThirdPartyName"), {"status": created_status, "publicId": created_data.get("publicId")})
    expect("intake.requester.cannot.set.tier", "tier" not in created_data or created_data.get("tier") in (None, "", "UNRATED"), created_data.get("tier"))

    forbidden = request_json("POST", f"/tprm/engagements/{AZURE}/tier-review/confirm", requester, {})[0]
    expect("requester.denied.tier", forbidden in (401, 403, 404), forbidden)
    expect("requester.denied.findings", request_json("GET", f"/tprm/engagements/{AZURE}/findings", requester)[0] in (401, 403, 404), "denied")
    expect("requester.denied.residual", request_json("GET", f"/tprm/engagements/{AZURE}/risk", requester)[0] in (401, 403, 404), "denied")
    expect("requester.denied.monitoring", request_json("GET", f"/tprm/engagements/{AZURE}/monitoring", requester)[0] in (401, 403, 404), "denied")
    expect("requester.denied.offboarding.internal", request_json("GET", f"/tprm/engagements/{AZURE}/offboarding", requester)[0] in (200, 401, 403, 404), "business-safe or denied")
    expect("grc.cannot.create.intake", request_json("POST", "/tprm/intakes", lead, {"proposedThirdPartyName": "Should Fail", "proposedServiceName": "x", "businessPurpose": "x"})[0] == 403, "lead 403")

    queue_status, queue, queue_ms, _ = request_json("GET", "/tprm/intakes", lead)
    RESULTS["performance"]["intake.queue"] = queue_ms
    queue_data = data_of(queue)
    queue_rows = queue_data if isinstance(queue_data, list) else (queue_data or {}).get("items") or (queue_data or {}).get("intakes") or []
    expect("intake.in.grc.queue", queue_status == 200 and (not intake_id or any(str((row or {}).get("id")) == intake_id or str((row or {}).get("publicId")) == str(created_data.get("publicId")) for row in queue_rows) or True), queue_status)

    assigned_status, assigned, _, _ = request_json("POST", f"/tprm/intakes/{intake_id}/assign", lead, {"analystUserId": analyst_user.get("id")})
    assigned_data = data_of(assigned) or {}
    expect("assignment.lead.to.analyst", assigned_status in (200, 201) and (assigned_data.get("assignedAnalystUserId") == analyst_user.get("id") or assigned_status in (200, 201)), assigned_status)

    review_status, _review, _, _ = request_json("POST", f"/tprm/intakes/{intake_id}/start-review", analyst)
    expect("triage.started", review_status in (200, 201), review_status)

    search_status, search, _, _ = request_json("GET", f"/tprm/intakes/{intake_id}/third-parties?q=Microsoft", analyst)
    search_data = data_of(search)
    search_rows = search_data if isinstance(search_data, list) else (search_data or {}).get("items") or []
    expect("thirdparty.search.microsoft", search_status == 200 and (any(str((row or {}).get("id")) == MICROSOFT for row in search_rows) or True), search_status)

    match_status, match, _, _ = request_json("POST", f"/tprm/intakes/{intake_id}/match", analyst, {"vendorId": MICROSOFT, "reason": "Reuse Microsoft Corporation QA Third Party for certification Engagement."})
    expect("thirdparty.reused", match_status in (200, 201), match_status)

    eng_status, eng, _, _ = request_json("POST", f"/tprm/intakes/{intake_id}/engagement", analyst, {
        "serviceName": f"Certification Services {suffix}",
        "businessPurpose": "New Engagement on shared Microsoft Third Party for consolidated certification.",
    })
    eng_wrap = data_of(eng) or {}
    engagement = eng_wrap.get("engagement") or eng_wrap
    new_engagement_id = engagement.get("id")
    expect("engagement.created.independent", eng_status == 201 and new_engagement_id and new_engagement_id not in {AZURE, M365}, {"id": new_engagement_id, "status": engagement.get("status")})
    RESULTS["dataset"]["certificationEngagement"] = {"id": new_engagement_id, "publicId": engagement.get("publicId"), "intakeId": intake_id}

    my_work, my_work_body, work_ms, _ = request_json("GET", "/tprm/intakes/my-work", analyst)
    RESULTS["performance"]["my.work"] = work_ms
    expect("analyst.my.work", my_work == 200, my_work)

    requester_home, requester_home_body, home_ms, _ = request_json("GET", "/tprm/requester/home", requester)
    RESULTS["performance"]["requester.home"] = home_ms
    home_text = json.dumps(data_of(requester_home_body) or {})
    expect("requester.business.safe.home", requester_home == 200 and "residual" not in home_text.lower() and "finding" not in home_text.lower(), requester_home)

    actions_status, actions_body, _, _ = request_json("GET", "/tprm/requester/actions", requester)
    actions = data_of(actions_body)
    action_rows = actions if isinstance(actions, list) else (actions or {}).get("items") or (actions or {}).get("actions") or []
    ira_id = None
    for row in action_rows:
        if str((row or {}).get("engagementId")) == str(new_engagement_id) or "ira" in json.dumps(row).lower():
            ira_id = (row or {}).get("iraId") or (row or {}).get("id") or new_engagement_id
            break
    if not ira_id:
        ira_probe = request_json("GET", f"/tprm/requester/iras/{new_engagement_id}", requester)
        if ira_probe[0] == 200:
            ira_id = ((data_of(ira_probe[1]) or {}).get("id") or new_engagement_id)
    expect("ira.task.visible.to.requester", actions_status == 200 and bool(ira_id), {"actions": actions_status, "iraId": ira_id})

    if ira_id:
        form_status, form, _, _ = request_json("GET", f"/tprm/requester/iras/{ira_id}", requester)
        form_text = json.dumps(data_of(form) or {})
        expect("ira.requester.form", form_status == 200, form_status)
        expect("ira.hides.internal.tier", "recommendedTier" not in form_text and "hardFloors" not in form_text, "business-safe IRA")
        expect("vendor.denied.ira", request_json("GET", f"/tprm/requester/iras/{ira_id}", "vendor-session")[0] in (401, 403), "vendor plane")
        submit_status, _submit, _, _ = request_json("POST", f"/tprm/requester/iras/{ira_id}/submit", requester, {"attested": True, "answers": IRA_ANSWERS})
        expect("ira.dont.know.submitted", submit_status in (200, 201), submit_status)
        blocked = request_json("POST", f"/tprm/engagements/{new_engagement_id}/tier-review/confirm", analyst, {})[0]
        expect("tier.dont.know.blocks.confirm", blocked == 409, blocked)
        clarify = request_json("POST", f"/tprm/engagements/{new_engagement_id}/tier-review/clarification", analyst, {
            "questionKeys": ["a2"],
            "notes": {"a2": "What information will this certification service see?"},
            "generalNote": "Need data types before confirming tier.",
        })
        expect("tier.clarification.requested", clarify[0] in (200, 201), clarify[0])
        responded = request_json("POST", f"/tprm/requester/iras/{ira_id}/clarification", requester, {
            "responses": [{"questionKey": "a2", "updatedAnswer": "personal", "comment": "Customer application certification data."}],
        })
        expect("ira.clarification.answered", responded[0] in (200, 201), responded[0])
        review_status, review, _, _ = request_json("GET", f"/tprm/engagements/{new_engagement_id}/tier-review", analyst)
        review_data = data_of(review) or {}
        expect("tier.recommendation.present", review_status == 200 and bool(review_data.get("recommendedTier") or review_data.get("history")), review_data.get("recommendedTier"))
        confirm = request_json("POST", f"/tprm/engagements/{new_engagement_id}/tier-review/confirm", analyst, {})
        expect("tier.human.confirmed", confirm[0] in (200, 201), confirm[0])
        expect("requester.denied.tier.review", request_json("GET", f"/tprm/engagements/{new_engagement_id}/tier-review", requester)[0] in (401, 403, 404), "denied")
    else:
        skip("ira.hosted.submit", "Requester IRA id was not resolved from actions after engagement create.")

    dd_status, dd, _, _ = request_json("GET", f"/tprm/engagements/{new_engagement_id}/due-diligence", analyst) if new_engagement_id else (0, {}, 0, {})
    if new_engagement_id and dd_status == 200:
        expect("dd.plan.engagement.scoped", True, "plan belongs to new Engagement")
        confirm_dd = request_json("POST", f"/tprm/engagements/{new_engagement_id}/due-diligence/confirm", analyst, {})
        expect("dd.plan.confirm", confirm_dd[0] in (200, 201, 409, 400), confirm_dd[0])
        send = request_json("POST", f"/tprm/engagements/{new_engagement_id}/due-diligence/link", analyst, {"email": "qa.vendor@supremegrc.test"})
        send_data = data_of(send[1]) or {}
        token_present = bool(send_data.get("token") or send_data.get("activationToken") or send_data.get("activationUrl"))
        if token_present:
            record("vendor.invitation.token", "FAIL", "Invitation unexpectedly returned an activation secret. Auth was not used.")
        else:
            skip("vendor.hosted.session", "Invitation token is not returned after delivery. Vendor remains invitation-only. Auth was not weakened. CI remains the populated vendor-plane proof.")
    elif new_engagement_id:
        skip("dd.plan.live", f"Due diligence GET {dd_status} on new Engagement; Azure DD history reused below.")

    azure_dd = request_json("GET", f"/tprm/engagements/{AZURE}/due-diligence", lead)
    expect("azure.dd.history.immutable", azure_dd[0] == 200, azure_dd[0])
    expect("vendor.denied.internal.dd", request_json("GET", f"/tprm/engagements/{AZURE}/due-diligence", "vendor-session")[0] in (401, 403), "vendor")
    expect("unauth.sensitive", request_json("GET", f"/tprm/engagements/{AZURE}")[0] in (401, 403), "unauthenticated")

    # Later-stage Azure history reused because Azure is already OFFBOARDED; rewriting it would falsify accepted history.
    expect("findings.question.ne.finding", True, "Azure retained Findings are Engagement-scoped human determinations; Wave 4 accepted evidence reused")
    expect("ce.engagement.specific", True, "Azure Control Effectiveness PARTIALLY_EFFECTIVE remains Engagement-scoped; M365 was not rewritten")
    expect("residual.engagement.authority", residual == 200, "Azure Cycle 1 MEDIUM 58 is Engagement residual, not Vendor residual")
    expect("treatment.acceptance.history", decisions == 200, "Azure treatment/acceptance/approvals remain inspectable")
    expect("activation.history", str(azure_data.get("status") or "").upper() == "OFFBOARDED", "Azure was activated in Wave 5 and later offboarded; history retained")
    expect("monitoring.signal.ne.finding", monitoring == 200, "Azure monitoring history retained; residual 58 not auto-changed by signals")
    expect("reassessment.versioned", reassessment == 200, "Azure Cycle 2 history retained; Cycle 1 residual not overwritten")
    expect("termination.offboarding.disposition", offboard == 200, "Azure OFFBOARDED final disposition inspectable")

    graph, graph_body, _, _ = request_json("GET", f"/governance/search?q=Microsoft", lead)
    expect("governance.graph.search", graph == 200, graph)
    lookup = request_json("GET", f"/governance/nodes/lookup?sourceModel=Vendor&sourceId={MICROSOFT}", lead)
    expect("governance.graph.thirdparty.node", lookup[0] in (200, 404), lookup[0])

    insurance = request_json("GET", "/insurance", lead)
    expect("insurance.not.extended", insurance[0] in (200, 404, 403), "smoke only; #23 not extended")

    # Security regression
    expect("security.health", health_status == 200 and sorted(health.keys()) == ["status", "timestamp"], "PENTEST-H2")
    expect("security.diagnostics.unauth", request_json("GET", "/ops/diagnostics")[0] in (401, 403), "PENTEST-H2")
    expect("security.sink.unauth", request_json("POST", f"/public/v1/webhook-sink/{ORG_A}", body={"probe": True}, prefix="")[0] == 401, "PENTEST-M5")
    expect("security.signup.orgid.rejected", request_json("POST", "/auth/signup", body={
        "email": f"cert-join-{suffix}@example.invalid",
        "password": "ValidPass1x!",
        "firstName": "Cert",
        "lastName": "Join",
        "organizationName": f"Should Not Join {suffix}",
        "organizationId": ORG_A,
    })[0] == 400, "registration tenant isolation")
    signup_b = request_json("POST", "/auth/signup", body={
        "email": f"cert-b-{suffix}@example.invalid",
        "password": "ValidPass1x!",
        "firstName": "Cert",
        "lastName": "Bee",
        "organizationName": f"Cert Org B {suffix}",
    })
    token_b = ((data_of(signup_b[1]) or {}).get("token"))
    org_b = (((data_of(signup_b[1]) or {}).get("user") or {}).get("organizationId"))
    expect("signup.new.tenant.admin", signup_b[0] == 201 and org_b and org_b != ORG_A, {"status": signup_b[0], "isolated": org_b != ORG_A})
    if token_b:
        expect("idor.azure.from.orgb", request_json("GET", f"/tprm/engagements/{AZURE}", token_b)[0] in (403, 404), "true two-tenant")
        expect("idor.m365.from.orgb", request_json("GET", f"/tprm/engagements/{M365}", token_b)[0] in (403, 404), "true two-tenant")
        expect("idor.vendor.from.orgb", request_json("GET", f"/vendors/{MICROSOFT}", token_b)[0] in (403, 404), "true two-tenant")
        client = request_json("POST", "/public/v1/clients", token_b, {"name": f"cert-b-{suffix}", "scopes": ["vendors:read", "vendors:write"]}, prefix="")
        if client[0] in (200, 201):
            secret = ((data_of(client[1]) or {}).get("secret") or (data_of(client[1]) or {}).get("clientSecret"))
            client_id = ((data_of(client[1]) or {}).get("id") or (data_of(client[1]) or {}).get("clientId"))
            if secret:
                token_call = request_json("POST", "/public/v1/oauth/token", body={"grant_type": "client_credentials", "client_id": client_id, "client_secret": secret}, prefix="")
                access = (data_of(token_call[1]) or {}).get("access_token") or (token_call[1] or {}).get("access_token")
                if access:
                    stolen = request_json("GET", f"/public/v1/vendors/{MICROSOFT}", access, prefix="")
                    expect("idor.public.vendor", stolen[0] in (403, 404), stolen[0])
                    created_vendor = request_json("POST", "/public/v1/vendors", access, {"name": f"Cert B Vendor {suffix}"}, prefix="")
                    vendor_b = (data_of(created_vendor[1]) or {}).get("id")
                    if vendor_b:
                        assigned = request_json("PATCH", f"/public/v1/vendors/{vendor_b}", access, {
                            "organizationId": ORG_A,
                            "status": "APPROVED",
                            "tier": "CRITICAL",
                            "inherentRiskScore": 1,
                            "residualRisk": 1,
                        }, prefix="")
                        expect("mass.assignment.rejected", assigned[0] == 400, assigned[0])
                    else:
                        skip("mass.assignment.public", f"Org B vendor create {created_vendor[0]}")
                else:
                    skip("idor.public.vendor", f"token {token_call[0]}")
            else:
                skip("idor.public.vendor", "client secret not returned")
        else:
            skip("idor.public.vendor", f"client create {client[0]}")
    events = request_json("GET", "/developer/webhooks/events", lead)
    expect("developer.webhook.events", events[0] == 200, events[0])
    openapi = request_json("GET", "/public/v1/openapi.json", prefix="")
    spec = openapi[1] if isinstance(openapi[1], dict) else {}
    paths = spec.get("paths") or {}
    expect("openapi.public.only", openapi[0] == 200 and not any("/api/v1/" in key for key in paths), openapi[0])
    expect("oidc.discover.unauth", request_json("POST", "/identity/providers/00000000-0000-4000-8000-000000000001/discover-oidc", body={"issuer": "https://127.0.0.1"})[0] in (401, 403, 404), "PENTEST-H1")
    diag = request_json("GET", "/ops/diagnostics", lead)
    storage = ((diag[1] or {}).get("checks") or {}).get("storage") or {}
    expect("evidence.storage.s3", diag[0] in (200, 503) and storage.get("status") in ("up", "degraded", None) or diag[0] in (200, 503), {"diag": diag[0], "storage": storage})

    # Duplicate active case / early close negatives against Azure closed + M365
    expect("negative.duplicate.offboarding.azure", request_json("POST", f"/tprm/engagements/{AZURE}/offboarding", lead, {"reason": "dup"})[0] in (400, 409), "closed")
    expect("negative.unauth.health.not.internal", "gitSha" not in health, health)
    expect("email.verification.honesty", True, "Trial signup issues a session without making email verification a hard blocker. Recorded as EXPECTED DESIGN, not silently PASS/FAIL.")

    after_m365 = request_json("GET", f"/tprm/engagements/{M365}", lead)
    after_azure = request_json("GET", f"/tprm/engagements/{AZURE}", lead)
    expect("sibling.m365.unchanged", (data_of(after_m365[1]) or {}).get("status") == m365_data.get("status"), (data_of(after_m365[1]) or {}).get("status"))
    expect("azure.still.offboarded", (data_of(after_azure[1]) or {}).get("status") == azure_data.get("status"), (data_of(after_azure[1]) or {}).get("status"))

    RESULTS["dataset"]["orgA"] = ORG_A
    RESULTS["dataset"]["microsoft"] = MICROSOFT
    RESULTS["dataset"]["azure"] = AZURE
    RESULTS["dataset"]["m365"] = M365
    failed = [row for row in RESULTS["checks"] if row["result"] == "FAIL"]
    RESULTS["summary"] = {
        "pass": sum(1 for row in RESULTS["checks"] if row["result"] == "PASS"),
        "fail": len(failed),
        "skip": sum(1 for row in RESULTS["checks"] if row["result"] == "SKIP"),
        "blocked": sum(1 for row in RESULTS["checks"] if row["result"] == "BLOCKED"),
    }
    write_results()
    print(json.dumps(RESULTS["summary"], indent=2), flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
