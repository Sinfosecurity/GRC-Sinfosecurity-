#!/usr/bin/env python3
"""STAGING ONLY. Hosted #12 Wave 1 requester-boundary walk. Does not store passwords or tokens."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://supreme-risk-staging-api.onrender.com"
APP = "https://supreme-risk-staging.onrender.com"
OUT = Path("docs/private-beta/hosted-ux-qa/tprm-golden-journey/wave-1-requester-boundary/results.json")
PASSWORD = "ReqBound12x"
RESULTS: dict = {
    "item": "#12",
    "wave": "1-requester-boundary",
    "declaredPass": False,
    "productionTouched": False,
    "mainMerged": False,
    "wave2Started": False,
    "iraScoringChanged": False,
    "steps": {},
    "ids": {},
    "hosting": {},
}


def req(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 60):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:400]}
        return error.code, parsed


def record(name: str, status, detail=None):
    RESULTS["steps"][name] = {"status": status, "detail": detail}


def json_url(url: str):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode())


def main():
    frontend = json_url(f"{APP}/version.json")
    api = json_url(f"{API}/health")
    RESULTS["hosting"] = {
        "frontend": {"url": f"{APP}/version.json", "gitSha": frontend.get("gitSha")},
        "api": {
            "url": f"{API}/health",
            "gitSha": api.get("gitSha"),
            "status": api.get("status"),
            "environment": api.get("environment"),
            "postgres": ((api.get("dependencies") or {}).get("postgres") or {}).get("status") or api.get("postgres"),
        },
    }
    suffix = str(int(time.time()))
    signup = req("POST", "/api/v1/auth/signup", body={
        "email": f"bound-lead-{suffix}@wave1.example",
        "password": PASSWORD,
        "firstName": "Lea",
        "lastName": "Lead",
        "organizationName": f"Requester Boundary {suffix}",
        "country": "US",
    })
    record("lead.signup", signup[0], {"nextPath": ((signup[1].get("data") or {}).get("user") or {}).get("nextPath")})
    if signup[0] != 201:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(RESULTS, indent=2))
        raise SystemExit(f"signup failed {signup[0]} {signup[1]}")
    lead = signup[1]["data"]
    lead_token = lead["token"]
    org = lead["user"]["organizationId"]
    RESULTS["ids"]["organizationId"] = org

    invite_req = req("POST", "/api/v1/users/invite", lead_token, {"email": f"bound-req-{suffix}@wave1.example", "role": "BUSINESS_OWNER"})
    invite_ana = req("POST", "/api/v1/users/invite", lead_token, {"email": f"bound-ana-{suffix}@wave1.example", "role": "ASSESSOR"})
    record("invite.requester", invite_req[0], {"hasToken": bool((invite_req[1].get("data") or {}).get("token")), "hasActivationUrl": bool((invite_req[1].get("data") or {}).get("activationUrl")), "delivery": (invite_req[1].get("data") or {}).get("delivery")})
    record("invite.analyst", invite_ana[0], {"hasToken": bool((invite_ana[1].get("data") or {}).get("token")), "hasActivationUrl": bool((invite_ana[1].get("data") or {}).get("activationUrl")), "delivery": (invite_ana[1].get("data") or {}).get("delivery")})

    def activate(invite, first, last):
        data = invite[1].get("data") or {}
        token = data.get("token")
        url = data.get("activationUrl") or ""
        if not token and "token=" in url:
            token = url.split("token=", 1)[1]
        if not token:
            return None
        activated = req("POST", "/api/v1/auth/activate", body={"token": token, "password": PASSWORD, "firstName": first, "lastName": last})
        return activated

    requester = activate(invite_req, "Pat", "Requester")
    analyst = activate(invite_ana, "Ana", "Lyst")
    record("activate.requester", None if requester is None else requester[0], None if requester is None else {"nextPath": ((requester[1].get("data") or {}).get("user") or {}).get("nextPath"), "permissions": ((requester[1].get("data") or {}).get("user") or {}).get("permissions")})
    record("activate.analyst", None if analyst is None else analyst[0])
    RESULTS["ids"]["leadEmail"] = f"bound-lead-{suffix}@wave1.example"
    if requester is None or requester[0] not in (200, 201):
        record("requester.only.session", "SKIP", "Invite token was not returned after delivery=sent. Staging does not expose activation secrets. Requester-only hosted login was not fabricated.")
        req_token = lead_token
        ana_token = lead_token
        ana_id = lead["user"]["id"]
        record("dual-role.fallback", "PASS", "ORG_ADMIN lead used for requester APIs plus GRC queue. This is dual-role, not requester-only.")
    else:
        req_user = requester[1]["data"]["user"]
        req_token = requester[1]["data"]["token"]
        ana_token = ((analyst or (0, {}))[1].get("data") or {}).get("token") or lead_token
        ana_id = ((analyst or (0, {}))[1].get("data") or {}).get("user", {}).get("id") or lead["user"]["id"]
        record("login.landing", req_user.get("nextPath"), {"role": req_user.get("role"), "hasVendorRead": "vendor.read" in (req_user.get("permissions") or [])})

    created = req("POST", "/api/v1/tprm/requester/intakes", req_token, {
        "proposedThirdPartyName": "Microsoft Corporation",
        "proposedServiceName": "Azure Hosting",
        "businessPurpose": "Host a customer-facing application.",
    })
    record("requester.create", created[0], {
        "publicId": (created[1].get("data") or {}).get("publicId"),
        "requesterStatus": (created[1].get("data") or {}).get("requesterStatus"),
        "hasAssignmentHistory": "assignmentHistory" in (created[1].get("data") or {}),
    })
    intake = created[1].get("data") or {}
    RESULTS["ids"]["intake"] = intake.get("publicId")
    mine = req("GET", "/api/v1/tprm/requester/intakes", req_token)
    record("requester.my-requests", mine[0], {"count": len((mine[1].get("data") or {}).get("items") or [])})

    if RESULTS["steps"].get("requester.only.session", {}).get("status") != "SKIP":
        denied = {}
        for path in (
            "/api/v1/tprm/intakes",
            "/api/v1/vendors",
            "/api/v1/tprm/assessments",
            "/api/v1/tprm/findings",
            "/api/v1/tprm/decision-briefs",
            "/api/v1/risks",
            "/api/v1/compliance",
            "/api/v1/automation",
            "/api/v1/platform/organizations",
            "/api/v1/vendor-portal/assessments/not-vendor",
        ):
            denied[path] = req("GET", path, req_token)[0]
        record("requester.denials", denied)
    else:
        record("requester.denials", "SKIP", "No requester-only session. CI suite tprm-requester-workspace.integration.test.ts remains the authoritative denial proof.")

    queue = req("GET", "/api/v1/tprm/intakes", lead_token)
    record("lead.queue", queue[0], {"count": len((queue[1].get("data") or {}).get("items") or [])})
    intake_id = intake.get("id")
    if ana_id and intake_id:
        assigned = req("POST", f"/api/v1/tprm/intakes/{intake_id}/assign", lead_token, {"analystUserId": ana_id, "note": "Triage Azure"})
        record("lead.assign", assigned[0], {"status": (assigned[1].get("data") or {}).get("status")})
        if ana_token:
            req("POST", f"/api/v1/tprm/intakes/{intake_id}/start-review", ana_token)
            asked = req("POST", f"/api/v1/tprm/intakes/{intake_id}/request-information", ana_token, {"fields": ["businessPurpose"], "note": "Need the hosting region."})
            record("analyst.request-info", asked[0], {"status": (asked[1].get("data") or {}).get("status")})
            actions = req("GET", "/api/v1/tprm/requester/actions", req_token)
            record("requester.actions", actions[0], {"count": len((actions[1].get("data") or {}).get("items") or [])})
            answered = req("POST", f"/api/v1/tprm/requester/intakes/{intake.get('publicId')}/information-response", req_token, {"response": "East US. Customer application data only."})
            record("requester.respond", answered[0], {"requesterStatus": (answered[1].get("data") or {}).get("requesterStatus")})
            vendor = req("POST", f"/api/v1/tprm/intakes/{intake_id}/third-party", ana_token, {"name": "Microsoft Corporation", "website": "https://microsoft.com", "country": "United States"})
            record("analyst.third-party", vendor[0], {"status": (vendor[1].get("data") or {}).get("status")})
            engagement = req("POST", f"/api/v1/tprm/intakes/{intake_id}/engagement", ana_token, {"serviceName": "Azure Hosting"})
            record("analyst.engagement", engagement[0], {"engagement": ((engagement[1].get("data") or {}).get("engagement") or {}).get("publicId")})
            detail = req("GET", f"/api/v1/tprm/requester/intakes/{intake.get('publicId')}", req_token)
            record("requester.updated-status", detail[0], {
                "requesterStatus": (detail[1].get("data") or {}).get("requesterStatus"),
                "hasAssignmentHistory": "assignmentHistory" in (detail[1].get("data") or {}),
                "hasMatchCandidates": "matchCandidates" in (detail[1].get("data") or {}),
            })

    record("vendor.session", "SKIP", "No hosted vendor portal session was created for this correction.")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(RESULTS, indent=2))
    print(json.dumps({"hosting": RESULTS["hosting"], "ids": RESULTS["ids"], "steps": {k: v.get("status") if isinstance(v, dict) else v for k, v in RESULTS["steps"].items()}}, indent=2))


if __name__ == "__main__":
    main()
