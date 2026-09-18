# Hosted #22 API / Webhooks / Integrations

**Status:** ACTIVE — PRODUCT LEADERSHIP REVIEW REQUIRED. #22 PASS is not declared.

**Implementation SHA (honesty/UI):** `7feb92de70cacfc954dc6632dbf862b61549ca53`  
**Backend / hosted API SHA:** `340f90818d9278a5173be3ca7be8eabba585f0cd`  
**Hosted frontend SHA:** `7feb92de70cacfc954dc6632dbf862b61549ca53`  
**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**CI (implementation 7feb92d):** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35387085923 SUCCESS  
**CI (backend 340f908):** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35384963420 SUCCESS  
**Deploy:** Frontend `dep-dampdsqjnfac73akjif0` live on `7feb92d`. API `dep-damorrjtqb8s73brs14g` live on `340f908`. SHA split is legitimate: `7feb92d` is frontend/QA only.  
**Health:** `/health/basic` ok. `/health` degraded for Mongo and AI NOT_CONFIGURED. Postgres, Redis, email, Stripe, storage, malware, and automation were up.  
**Migration:** additive `20260918190000_public_api_webhooks_integrations` exercised by live public API, webhook, and catalog routes.  
**Production touched:** NO  

**LIVE SLACK VALIDATION:** NOT TESTED  
**LIVE JIRA VALIDATION:** NOT TESTED  
**VIEWER HOSTED RBAC:** NOT TESTED / SKIPPED  

Architecture: `docs/API-INTEGRATIONS.md`. Internal `/api/v1` session routes are not this item.

Recertification command (2026-09-18):

```
python3 scripts/hosted-api-integrations-qa.py
```

Hosted SHA recorded by the script: frontend `7feb92d`, API `340f908`. Script result: **30 PASS / 0 FAIL / 2 SKIP** (viewer invite, axe CSP). Follow-up public-token/SSRF walk added 9 PASS and 1 SKIP (expired credential).

Mutating API and webhook checks used disposable walk organizations. Elite Claims / report-proof was used only for administration UI screenshots. No Slack or Jira credentials were supplied.

## Public API golden journey

Proved on hosted API `340f908` with frontend honesty `7feb92d`:

1. Create API client — secret `srk_…` returned once
2. List clients — secret not re-listed
3. GET `/public/v1/vendors` with `vendors:read` — 200
4. POST `/public/v1/vendors` without `vendors:write` — 403
5. POST `/public/v1/vendors` with write scope — 201
6. Retry with the same `Idempotency-Key` — same vendor id
7. Tenant B credential GET Tenant A vendor — 404
8. Revoke client — subsequent GET `/public/v1/vendors` — 401
9. `/public/v1/docs` and `/public/v1/openapi.json` — 200, vendors documented, platform / identity / support routes absent
10. Public token GET `/api/v1/developer/overview` — 401
11. Public token GET `/api/v1/identity/overview` — 401
12. Public token POST `/api/v1/users/invite` — 401
13. Public token GET `/api/v1/platform/overview` — 401
14. Public token GET `/api/v1/support/tickets` — 401

Expired credential: NOT TESTED (no safe hosted TTL mutation).

## Webhook golden journey

1. Create HTTPS sink endpoint — `whsec_…` shown once, not re-listed
2. Subscribe to `third_party.created`
3. Public API vendor create emitted the event
4. Delivery `DELIVERED`, HTTP 200, event id `evt_de3660cdd7f1`
5. Forced `failOnce=1` produced FAILED
6. Manual retry kept the same logical event id
7. Disable endpoint — later vendor create added no delivery (`3→3`)
8. SSRF create denied: `127.0.0.1`, `localhost`, `169.254.169.254` → 400; `http://` → 400

HMAC algorithm and replay window are covered by backend tests. Delivery uses `redirect: 'error'`. The staging sink stores parsed JSON, so byte-exact re-hash of a stored receipt is not a substitute for raw-body verification on a customer receiver.

## Integration honesty

| Provider | Configuration | UI state | Test Connection | Live test | Result |
| --- | --- | --- | --- | --- | --- |
| Slack | Configurable incoming webhook | Not configured | No | NOT TESTED | Honest |
| Jira | Configurable Cloud REST | Not configured | No | NOT TESTED | Honest |
| ServiceNow | Coming later | Coming later | No | NOT TESTED | Honest |
| SIEM | Placeholder / not a product SIEM | Coming later | No | NOT TESTED | Honest |
| SecurityScorecard | Coming later / observations only | Coming later | No | NOT TESTED | Honest |
| BitSight | Coming later / observations only | Coming later | No | NOT TESTED | Honest |

Slack test without configuration returned **409**. No provider card showed Connected. `Test connection` count on hosted Integrations was **0**.

## UI / RBAC / responsive

- Administration → API & Integrations
- Tabs: Overview, API Clients, Webhooks, Integrations, Activity
- Responsive shots: 375 / 768 / 1024 / 1440 / 1920 plus `integrations-375.png`
- 375px Integrations: all tabs present, no Test Connection, no horizontal overflow
- axe skipped: hosted CSP blocks inline script injection
- Organization Admin can open the page (`integration.manage`)
- Viewer hosted RBAC: SKIPPED — invite 201 sent, no activation token returned

## Screenshot index

- `overview-375.png`
- `overview-768.png`
- `overview-1024.png`
- `overview-1440.png`
- `overview-1920.png`
- `clients-1440.png`
- `webhooks-1440.png`
- `integrations-1440.png`
- `integrations-375.png`
- `activity-1440.png`

Raw API secrets and webhook signing secrets are not in this folder.
