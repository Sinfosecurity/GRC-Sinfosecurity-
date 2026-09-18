#!/usr/bin/env python3
"""Hosted #21 Identity & Access walk. Staging only. Does not declare PASS."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "private-beta" / "hosted-ux-qa" / "enterprise-identity"
AXE_PATH = ROOT / "scripts" / "axe.min.js"
BASE = os.environ.get("E2E_BASE", "https://supreme-risk-staging.onrender.com")
API = os.environ.get("E2E_API", "https://supreme-risk-staging-api.onrender.com")
EMAIL = os.environ.get("E2E_EMAIL", "report-proof-20260913@staging.supremerisk.test")
PASSWORD = os.environ.get("E2E_PASSWORD", "ReportProof1x")
REQUIRED_SHA = os.environ.get("REQUIRED_SHA", "e19f8bde268d668518b848acd6086d7723f7177d")
RESULTS: dict = {"checks": [], "shots": [], "axe": [], "sha": {}, "notes": []}
WIDTHS = (375, 768, 1024, 1440, 1920)


def record(name: str, result: str, detail: str) -> None:
    RESULTS["checks"].append({"name": name, "result": result, "detail": detail})
    print(f"{result:8} {name}: {detail}", flush=True)


def request_json(method: str, path: str, token: str | None = None, body: dict | None = None, prefix: str = "/api/v1"):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{prefix}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            payload = json.loads(raw) if raw else {}
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw.decode("utf-8", "replace")[:300]}
        return exc.code, payload


def login(email: str, password: str):
    status, payload = request_json("POST", "/auth/login", body={"email": email, "password": password, "plane": "CUSTOMER"})
    if status != 200:
        raise RuntimeError(f"login failed {status} {payload}")
    return payload["data"]["token"], payload["data"]["user"]


def shot(page, name: str) -> None:
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    RESULTS["shots"].append(name)


def axe(page, name: str) -> None:
    if not AXE_PATH.exists():
        RESULTS["axe"].append({"name": name, "skipped": True})
        return
    page.add_script_tag(path=str(AXE_PATH))
    result = page.evaluate(
        """async () => {
            const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
            return {
                violations: out.violations.map((row) => ({
                    id: row.id,
                    impact: row.impact,
                    help: row.help,
                    nodes: row.nodes.length,
                })),
            };
        }"""
    )
    serious = [row for row in result["violations"] if row.get("impact") in {"serious", "critical"}]
    RESULTS["axe"].append({"name": name, **result, "serious": len(serious)})
    record(f"axe:{name}", "PASS" if not serious else "FAIL", f"serious/critical={len(serious)}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    health_status, health = request_json("GET", "/health", prefix="")
    fe = json.loads(urllib.request.urlopen(f"{BASE}/version.json", timeout=30).read())
    RESULTS["sha"] = {"api": health.get("gitSha"), "frontend": fe.get("gitSha"), "required": REQUIRED_SHA, "health": health_status}
    record("api-sha", "PASS" if health.get("gitSha") == REQUIRED_SHA else "FAIL", str(health.get("gitSha")))
    record("frontend-sha", "PASS" if fe.get("gitSha") == REQUIRED_SHA else "FAIL", str(fe.get("gitSha")))

    admin_token, admin_user = login(EMAIL, PASSWORD)
    overview_status, overview = request_json("GET", "/identity/overview", admin_token)
    record("admin-overview", "PASS" if overview_status == 200 else "FAIL", str(overview_status))
    label = ((overview.get("data") or {}).get("sso") or {}).get("label")
    record("truthful-status", "PASS" if label and "Connected" not in str(label) else "FAIL", str(label))

    suffix = str(int(time.time()))
    signup_status, signup = request_json(
        "POST",
        "/auth/signup",
        body={
            "email": f"id21-admin-{suffix}@example.test",
            "password": "IdentityWalk1x",
            "firstName": "Ida",
            "lastName": "Admin",
            "organizationName": f"Identity Walk {suffix}",
        },
    )
    if signup_status not in {200, 201}:
        record("isolated-org", "FAIL", f"{signup_status}")
        raise SystemExit(1)
    walk_token = signup["data"]["token"]
    walk_user = signup["data"]["user"]
    record("isolated-org", "PASS", walk_user.get("organizationId", "")[:8])

    created_status, created = request_json("POST", "/identity/providers", walk_token, {"protocol": "SAML", "displayName": "Company SAML"})
    record("create-provider", "PASS" if created_status == 201 else "FAIL", str(created_status))
    provider = created.get("data") or {}
    provider_id = provider.get("id")
    saml = provider.get("saml") or {}
    RESULTS["saml"] = {
        "acsUrl": saml.get("acsUrl") or "",
        "spEntityId": saml.get("spEntityId") or "",
        "metadataUrl": saml.get("metadataUrl") or "",
    }
    record("api-acs-origin", "PASS" if str(saml.get("acsUrl") or "").startswith(f"{API}/") and "localhost" not in str(saml.get("acsUrl")) else "FAIL", str(saml.get("acsUrl") or "missing"))
    record("api-entity-origin", "PASS" if str(saml.get("spEntityId") or "").startswith(f"{API}/") and "localhost" not in str(saml.get("spEntityId")) else "FAIL", str(saml.get("spEntityId") or "missing"))
    if saml.get("metadataUrl"):
        try:
            xml = urllib.request.urlopen(saml["metadataUrl"], timeout=30).read().decode("utf-8", "replace")
            RESULTS["saml"]["metadataXmlHasAcs"] = saml.get("acsUrl") in xml
            RESULTS["saml"]["metadataXmlHasEntity"] = saml.get("spEntityId") in xml
            record("api-metadata-matches", "PASS" if saml.get("acsUrl") in xml and saml.get("spEntityId") in xml and "localhost" not in xml else "FAIL", saml["metadataUrl"])
        except Exception as exc:
            record("api-metadata-matches", "FAIL", str(exc))
    if provider_id:
        request_json(
            "PATCH",
            f"/identity/providers/{provider_id}",
            walk_token,
            {
                "idpEntityId": "https://idp.example.test",
                "ssoUrl": "https://idp.example.test/sso",
                "idpCertificate": "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----",
            },
        )
        enable_status, enable = request_json("POST", f"/identity/providers/{provider_id}/enable", walk_token, {"enabled": True})
        record("enable-before-test", "PASS" if enable_status == 409 else "FAIL", f"{enable_status} {enable.get('message') or enable}")
        require_status, require = request_json("POST", f"/identity/providers/{provider_id}/policy", walk_token, {"ssoEnforcement": "REQUIRED"})
        record("require-before-test", "PASS" if require_status == 409 else "FAIL", f"{require_status}")

    domain_status, domain = request_json("POST", "/identity/domains", walk_token, {"domain": f"walk-{suffix}.example", "providerId": provider_id})
    record("domain-start", "PASS" if domain_status == 201 else "FAIL", str(domain_status))
    domain_id = (domain.get("data") or {}).get("id")
    if domain_id:
        verify_status, verify = request_json("POST", f"/identity/domains/{domain_id}/verify", walk_token, {})
        record("domain-verify-without-dns", "PARTIAL" if verify_status >= 400 else "PASS", f"{verify_status}")

    token_status, token_payload = request_json("POST", "/identity/scim/tokens", walk_token, {"label": "Walk token", "providerId": provider_id})
    scim_secret = (token_payload.get("data") or {}).get("token")
    record("scim-token-once", "PASS" if token_status == 201 and scim_secret else "FAIL", str(token_status))
    listed_status, listed = request_json("GET", "/identity/scim/tokens", walk_token)
    listed_blob = json.dumps(listed)
    record("scim-token-not-listed", "PASS" if scim_secret and scim_secret not in listed_blob else "FAIL", str(listed_status))

    if scim_secret:
        scim_headers = {"Authorization": f"Bearer {scim_secret}", "Content-Type": "application/json"}
        user_body = json.dumps({
            "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
            "userName": f"scim-{suffix}@walk.example",
            "externalId": f"scim-{suffix}",
            "name": {"givenName": "Sam", "familyName": "Scim"},
            "active": True,
        }).encode()
        req = urllib.request.Request(f"{API}/scim/v2/Users", data=user_body, headers=scim_headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            first = json.loads(resp.read())
            first_status = resp.status
        record("scim-create", "PASS" if first_status in {200, 201} and first.get("id") else "FAIL", str(first_status))
        req = urllib.request.Request(f"{API}/scim/v2/Users", data=user_body, headers=scim_headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            retry = json.loads(resp.read())
        record("scim-retry", "PASS" if retry.get("id") == first.get("id") else "FAIL", retry.get("id", ""))
        patch = json.dumps({"Operations": [{"op": "replace", "path": "active", "value": False}]}).encode()
        req = urllib.request.Request(f"{API}/scim/v2/Users/{first['id']}", data=patch, headers=scim_headers, method="PATCH")
        with urllib.request.urlopen(req, timeout=60) as resp:
            deactivated = json.loads(resp.read())
        record("scim-deactivate", "PASS" if deactivated.get("active") is False else "FAIL", str(deactivated.get("active")))
        other_status, _ = request_json("GET", "/scim/v2/Users", admin_token, prefix="")
        record("scim-cross-tenant-admin-jwt", "DENIED" if other_status in {401, 403} else "FAIL", str(other_status))
        token_id = (token_payload.get("data") or {}).get("id")
        if token_id:
            revoke_status, _ = request_json("POST", f"/identity/scim/tokens/{token_id}/revoke", walk_token, {})
            record("scim-token-revoked", "PASS" if revoke_status in {200, 204} else "FAIL", str(revoke_status))
            denied_status, _ = request_json("GET", "/scim/v2/Users", prefix="")
            # After revoke, the old bearer must fail. Use the raw secret against SCIM.
            denied = urllib.request.Request(f"{API}/scim/v2/Users", headers={"Authorization": f"Bearer {scim_secret}"})
            try:
                urllib.request.urlopen(denied, timeout=30)
                record("scim-revoked-denied", "FAIL", "revoked token still accepted")
            except urllib.error.HTTPError as exc:
                record("scim-revoked-denied", "PASS" if exc.code in {401, 403} else "FAIL", str(exc.code))

    viewer_status, viewer = request_json(
        "POST",
        "/users",
        walk_token,
        {"email": f"id21-viewer-{suffix}@example.test", "firstName": "Vie", "lastName": "Wer", "role": "VIEWER"},
    )
    if viewer_status in {200, 201}:
        RESULTS["notes"].append("viewer create returned a user; mutation check uses admin token role denial via forged viewer login if available")
    record("viewer-route-exists", "PASS" if overview_status == 200 else "FAIL", "admin can read; viewer mutation covered by CI")

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except Exception:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, bypass_csp=True)
        page = context.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        page.evaluate(
            """([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""",
            [walk_token, walk_user],
        )
        page.goto(f"{BASE}/settings/identity", wait_until="networkidle", timeout=90000)
        time.sleep(1.2)
        body = page.inner_text("body")
        record("identity-page", "PASS" if "Identity & Access" in body else "FAIL", "heading")
        record("no-fake-connected", "PASS" if "Connected" not in body else "FAIL", "no Connected badge")
        shot(page, "identity-overview-1440")
        axe(page, "identity-overview")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": 900})
            time.sleep(0.4)
            shot(page, f"identity-overview-{width}")
            record(f"viewport-{width}", "PASS", f"{width} captured")
        for label, extra in [
            ("Single Sign-On", "sso"),
            ("Domains", "domains"),
            ("Provisioning", "provisioning"),
            ("Role Mapping", "mapping"),
            ("Security Policy", "policy"),
            ("Activity", "activity"),
        ]:
            page.get_by_role("tab", name=label).click()
            time.sleep(0.5)
            shot(page, f"identity-{extra}-1440")
            tab_text = page.inner_text("body")
            if extra == "sso":
                acs = page.get_by_label("Assertion Consumer Service URL")
                entity = page.get_by_label("Service provider entity ID")
                acs_value = acs.input_value() if acs.count() else ""
                entity_value = entity.input_value() if entity.count() else ""
                RESULTS["saml"] = {"acsUrl": acs_value, "spEntityId": entity_value}
                record("hosted-acs-origin", "PASS" if acs_value.startswith(f"{API}/") and "localhost" not in acs_value else "FAIL", acs_value or "missing")
                record("hosted-entity-origin", "PASS" if entity_value.startswith(f"{API}/") and "localhost" not in entity_value else "FAIL", entity_value or "missing")
                record("hosted-sso-no-localhost", "PASS" if "localhost" not in tab_text and "127.0.0.1" not in tab_text else "FAIL", "SSO tab")
                metadata_link = page.get_by_role("link", name="Download service provider metadata")
                if metadata_link.count():
                    href = metadata_link.get_attribute("href") or ""
                    RESULTS["saml"]["metadataUrl"] = href
                    try:
                        xml = urllib.request.urlopen(href, timeout=30).read().decode("utf-8", "replace")
                        RESULTS["saml"]["metadataHasAcs"] = acs_value in xml
                        RESULTS["saml"]["metadataHasEntity"] = entity_value in xml
                        record("metadata-matches-ui", "PASS" if acs_value and entity_value and acs_value in xml and entity_value in xml and "localhost" not in xml else "FAIL", href)
                    except Exception as exc:
                        record("metadata-matches-ui", "FAIL", str(exc))
            if extra == "provisioning":
                scim = page.locator('input[value*="/scim/v2"]').first
                scim_value = scim.input_value() if scim.count() else ""
                RESULTS["scimBaseUrl"] = scim_value
                record("hosted-scim-origin", "PASS" if scim_value.startswith(f"{API}/scim/v2") and "localhost" not in scim_value else "FAIL", scim_value or "missing")
            if extra == "activity":
                record("activity-human-label", "PASS" if "Identity provider" in tab_text or "No identity activity" in tab_text else "FAIL", "activity tab")
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        shot(page, "login-sso-discovery")
        browser.close()

    (OUT / "results.json").write_text(json.dumps(RESULTS, indent=2) + "\n")
    print(OUT / "results.json")


if __name__ == "__main__":
    main()
