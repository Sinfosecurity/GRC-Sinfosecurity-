# Hosted #22 API / Webhooks / Integrations

**Implementation SHA:** `340f90818d9278a5173be3ca7be8eabba585f0cd`  
**Frontend hosted SHA:** `340f90818d9278a5173be3ca7be8eabba585f0cd`  
**API hosted SHA:** `340f90818d9278a5173be3ca7be8eabba585f0cd`  
**Frontend:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/35384963420  
**Deploy:** API `dep-damorrjtqb8s73brs14g` live. Frontend auto-deployed the same SHA.  
**Health:** `/health/basic` ok. `/health` degraded for Mongo NOT_CONFIGURED, email DEGRADED, AI NOT_CONFIGURED, and heap ratio. Redis, storage, malware, automation, and Stripe test mode were up.  
**#22 PASS:** NOT DECLARED  
**LIVE PROVIDER TEST:** NOT TESTED  

Architecture: `docs/API-INTEGRATIONS.md`. Internal `/api/v1` session routes are not this item.

Mutating API and webhook checks used disposable walk organizations. Elite Claims was used only for the administration UI screenshots. No Slack or Jira credentials were supplied.

## Public API golden journey

Proved on hosted staging SHA `340f908`:

1. Create API client — secret `srk_…` returned once
2. List clients — secret not re-listed
3. POST `/public/v1/vendors` without `vendors:write` — 403
4. POST `/public/v1/vendors` with write scope — 201
5. Retry with the same `Idempotency-Key` — same vendor id
6. Tenant B credential GET Tenant A vendor — 404
7. Revoke client — subsequent GET `/public/v1/vendors` — 401
8. `/public/v1/docs` and `/public/v1/openapi.json` — 200, vendors documented, platform routes absent

## Webhook golden journey

1. Create HTTPS sink endpoint — `whsec_…` shown once, not re-listed
2. Subscribe to `third_party.created`
3. Public API vendor create emitted the event
4. Delivery `DELIVERED`, HTTP 200, duration recorded, event id `evt_a2db604811a0`
5. Signature headers present (`X-Supreme-Signature`, timestamp, event id)
6. Forced `failOnce=1` produced FAILED
7. Manual retry kept the same logical event id
8. Disable endpoint — later vendor create added no delivery (`3→3`)

HMAC algorithm and replay window are covered by backend tests. The staging sink stores parsed JSON, so byte-exact re-hash of a stored receipt is not a substitute for raw-body verification on a customer receiver.

## Integration golden journey

Slack and Jira are configurable. ServiceNow, SIEM, SecurityScorecard, and BitSight show **Coming later**. Slack test without configuration returned 409. No provider card showed Connected.

**LIVE PROVIDER TEST: NOT TESTED** — no Slack incoming webhook or Jira token was available.

## UI / RBAC / responsive

- Administration → API & Integrations
- Tabs: Overview, API Clients, Webhooks, Integrations, Activity
- Responsive shots: 375 / 768 / 1024 / 1440 / 1920
- axe skipped: hosted CSP blocks inline script injection
- Organization Admin can open the page (`integration.manage`)
- Viewer/analyst hosted sessions were not separately logged in

## Screenshot index

- `overview-375.png`
- `overview-768.png`
- `overview-1024.png`
- `overview-1440.png`
- `overview-1920.png`
- `clients-1440.png`
- `webhooks-1440.png`
- `integrations-1440.png`
- `activity-1440.png`

Raw API secrets and webhook signing secrets are not in this folder.
