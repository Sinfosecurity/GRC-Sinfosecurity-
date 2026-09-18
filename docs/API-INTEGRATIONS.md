# #22 API / Webhooks / Integrations

**Item:** #22  
**#22 PASS:** NOT DECLARED  
**Production-ready claim:** NO  
**Live Slack / Jira / ServiceNow:** NOT TESTED unless a real provider test succeeds  

This is the customer platform foundation. Internal browser `/api/v1` session routes are not this item.

## Inventory (existing before this item)

| Surface | Classification |
|---|---|
| Slack / Jira / ServiceNow / SIEM classes | Real HTTP, deploy-time env, **not** per-tenant. UI Test connection used platform env. |
| `IntegrationConnection` | Existed; unused for save/configure. |
| Stripe / Resend inbound webhooks | Internal billing/email. Not customer webhooks. |
| `apiKeyService` / `src/api/v1` mocks | Legacy, not mounted. |
| SecurityScorecard / BitSight | Labels only. No API clients. |
| SCIM hashed tokens | Pattern reused for public API credentials. |

## Four planes

1. **Public customer API** — `/public/v1`, hashed bearer credentials, scopes.
2. **Outbound webhooks** — HMAC-SHA256, SSRF-safe HTTPS, retries, delivery history.
3. **Provider integrations** — per-tenant `IntegrationConnection` + encrypted config. Connected only after a successful test.
4. **External risk observations** — catalog placeholders. Observations must not overwrite Supreme risk decisions. #40 is not this item.

## Public API

Authenticate with `Authorization: Bearer srk_…`.

Scopes: `vendors:read|write`, `assessments:read`, `findings:read|write`, `evidence:read`, `risks:read`, `reports:read`, `webhooks:manage`.

| Method | Path | Scope |
|---|---|---|
| GET | `/public/v1/vendors` | vendors:read |
| GET | `/public/v1/vendors/:id` | vendors:read |
| POST | `/public/v1/vendors` | vendors:write |
| PATCH | `/public/v1/vendors/:id` | vendors:write |
| GET | `/public/v1/findings` | findings:read |
| GET | `/public/v1/assessments` | assessments:read |
| GET | `/public/v1/risks` | risks:read |
| GET | `/public/v1/evidence` | evidence:read |
| GET | `/public/v1/openapi.json` | none |

Pagination: `{ page, pageSize, total, items }`. Mutations accept `Idempotency-Key`. Rate limit: 120 / 15 minutes per client+org. Errors use the existing `{ error: { message, requestId } }` contract.

Browser `/api/v1` is unchanged.

## Webhooks

HMAC-SHA256 of `timestamp.body`. Headers: `X-Supreme-Signature`, `X-Supreme-Timestamp`, `X-Supreme-Event-Id`, `X-Supreme-Event`. Replay window 5 minutes. Event ID is stable across retries. HTTPS only; localhost, loopback, link-local, metadata, and private networks are rejected at save and send. Redirects are not followed.

Events start with `third_party.*`, assessment/finding/evidence/risk/decision names, plus `webhook.test` for labeled tests.

Retries: five attempts, then DEAD.

## Integrations

Customer admin configures Slack (incoming webhook) and Jira (base URL, email, token, project). ServiceNow, generic SIEM, SecurityScorecard, and BitSight are **Coming later**.

Status: Not configured → Configured → Connected / Error / Disabled. Connected requires a successful test.

## Administration

Administration → API & Integrations: Overview, API Clients, Webhooks, Integrations, Activity.

Organization Admin can manage clients, webhooks, and integrations (`integration.manage`). Viewer and analyst roles do not receive that permission. Public API credentials cannot call `/api/v1` session, platform, or support routes.

## Hosted proof

Staging only. Script: `scripts/hosted-api-integrations-qa.py`. Evidence: `docs/private-beta/hosted-ux-qa/api-integrations/`.

If Slack or Jira cannot be tested with real provider credentials, record `LIVE PROVIDER TEST: NOT TESTED`. Code existence is not Connected.
