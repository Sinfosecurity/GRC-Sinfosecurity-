# Production cutover runbook

Executable by another competent engineer. **No secrets.**

This is the future launch procedure. It was rehearsed in isolation on 2026-09-13. It is **not** authorization to launch.

**Do not** merge `main`, deploy production, or change public DNS until Product Leadership records GO on `#11`.

## Roles

| Role | Responsibility |
|---|---|
| Product Leadership | GO / NO-GO; customer communications |
| Engineering | SHA pin, migrate, deploy, smoke |
| Security | Secret generation, mailbox, break-glass, incident |
| Operations | Render, Postgres, Redis, storage, ClamAV, backups |
| Billing | Stripe live catalog (only when #2 is cleared) |
| Support | First-day tickets and access requests |
| DNS / registrar owner | TTL, records, rollback records (no change until T0) |
| Legal | Privacy / Terms / Subprocessors / DPA |

Do not invent named people.

## Preconditions

1. `#10` accepted by Product Leadership.
2. `#11` checklist complete with no BLOCKED items that this runbook treats as stop-the-line.
3. Approved **immutable** release SHA. Never “deploy latest.”
4. Supreme CI PASS on that exact SHA.
5. Production infrastructure exists and is **not** yet public (paid Postgres, Redis, private bucket, private ClamAV, Render services).
6. Production secrets exist only in the Render/secret store.
7. Pre-cutover backup of empty-or-approved production DB + empty object prefix, with checksums.
8. Isolated restore of that backup already proven (`scripts/recovery-certify.sh` pattern).
9. `docs/PRODUCTION-GO-NO-GO.md` is GO.

If any blocking item fails: **NO-GO**. Stop.

## Approved SHA

| Field | Value at rehearsal | At real cutover |
|---|---|---|
| APPROVED RELEASE SHA | TBD at #11 | fill at freeze |
| EXPECTED DEPLOYED SHA | same | same |
| Security baseline | `227dc3215783df523a3b6dc8973928e66ef43df3` | descendant containing all #9 fixes |

## Deployment order

1. Freeze release SHA and confirm GitHub-hosted Supreme CI PASS.
2. Confirm GO/NO-GO.
3. Take pre-cutover DB + object backup; record timestamp, manifest, checksums, retention.
4. Restore that backup into an isolated scratch target (not production).
5. Prepare production database (empty). Apply **baseline then** `npx prisma migrate deploy` (`backend/scripts/ci-migrate-deploy.sh` adapted to the production URL **only after** host/name guards are replaced by a production-approved script). Never `prisma db push`.
6. If migrate fails: **STOP**. Do not deploy the API. Diagnose. Recover by restore or forward-fix. Prisma does not auto-rollback schema.
7. Deploy API (`node dist/server.js`) pinned to the frozen SHA.
8. Verify `/health/live` 200 and `/health/ready` 200. Review `/health` for configured-provider `down`.
9. Deploy customer/admin frontend (same SPA) pinned to the same SHA. `VITE_ENVIRONMENT=production`.
10. Confirm CORS allowlist is exactly `https://app.supremerisk.com,https://admin.supremerisk.com` (plus API if needed). No wildcard.
11. Configure providers (Resend, Stripe **only if commercial catalog ready**, ClamAV, storage).
12. Bootstrap first Platform Owner on production (`npm run platform:bootstrap-owner`) with a one-time token. Print password once to a secure channel. Disable bootstrap. Enroll MFA before `/platform`.
13. Run `scripts/cutover-smoke.sh` with production URLs **after** TLS works on pre-cutover hostnames (or against Render onrender.com hostnames before DNS).
14. Run negative smoke (metrics, legacy routes, hostile origin, plane isolation).
15. Activate DNS only after smoke PASS (see timeline).
16. Monitor `/health`, alerts, Stripe webhooks, mail, malware.
17. Product Leadership declares GO or rollback.

## Empty-database initialization

```bash
# Isolated rehearsal used:
# DATABASE_URL=postgresql://supreme_staging:...@127.0.0.1:55434/supreme_risk_cutover10_ci_test
# backend/scripts/ci-migrate-deploy.sh
#
# That script refuses production/staging names. A production operator must use a
# reviewed copy that allows only the approved production database name.
```

Order:

1. Create empty paid Postgres (SSL).
2. Apply `backend/prisma/baseline/pre-transformation.sql`.
3. Apply each `backend/prisma/migrations/*/migration.sql` in sort order and `prisma migrate resolve --applied`.
4. `prisma migrate deploy`.
5. `prisma migrate status` must show up to date.

`prisma migrate deploy` **alone** on an empty database fails (`Role` does not exist). That is a stop.

## Migration window

- Additive migrations are short (rehearsal: 18 s on isolated hardware).
- No maintenance-mode feature exists.
- First launch: brief write-quiet window. **Do not promise zero downtime.**
- If a migration is recorded as failed: do not start the new API. Restore or forward-fix.

## DNS timeline (do not execute until GO)

Inspected 2026-09-13: `app`, `admin`, `www`, apex, `api`, `status` have **no** public A/CNAME/AAAA. There is nothing to lower TTL yet.

| Time | Action |
|---|---|
| T-24h | Create records on a **non-public** or unused hostname if needed for cert issuance. Prepare CNAME/ALIAS targets to Render. Reduce any existing TTL to 300s. Confirm certificates (Render/managed TLS). Confirm rollback records (leave NXDOMAIN / previous value documented). |
| T-4h | Freeze SHA. Backup. Migrate + deploy API/frontends on Render custom domains **without** public cutover if using Render-assigned hostnames first. |
| T-1h | Smoke on Render hostnames. Confirm `/health/ready`. Confirm bootstrap + MFA. |
| T-15m | Final GO/NO-GO. Confirm rollback owner is present. |
| T0 | Publish `app`, `admin`, `api` (and marketing) records. Do not publish admin as indexable. |
| T+15m | HTTP/TLS check all hostnames. Run `scripts/cutover-smoke.sh`. |
| T+1h | Review errors, Stripe, mail, malware, support. |
| T+4h | Confirm no rollback trigger. |
| T+24h | Restore TTL to 3600s if stable. |

**Record plan (intended, not configured):**

| Hostname | Type | Target | Proxy | TLS | Owner | Rollback |
|---|---|---|---|---|---|---|
| `app.supremerisk.com` | CNAME | Render customer static service | per registrar | Render-managed | DNS owner | delete CNAME / prior NXDOMAIN |
| `admin.supremerisk.com` | CNAME | same or dedicated static service | per registrar | Render-managed | DNS owner | delete CNAME |
| `api.supremerisk.com` | CNAME | Render API service | per registrar | Render-managed | DNS owner | delete CNAME |
| `www.supremerisk.com` | CNAME | marketing/static | per registrar | Render-managed | DNS owner | delete CNAME |
| apex `supremerisk.com` | ALIAS/ANAME or 301 → www | provider-specific | per registrar | provider | DNS owner | restore prior / NXDOMAIN |

TTL before cutover: 300s. Do not invent current values — there are none.

## Platform owner bootstrap

```bash
# On the production API one-off job, after migrate, before public DNS:
PLATFORM_OWNER_BOOTSTRAP_ENABLED=true
PLATFORM_OWNER_BOOTSTRAP_TOKEN=<32+ chars, generated, not in Git>
PLATFORM_OWNER_BOOTSTRAP_TOKEN_INPUT=<same>
PLATFORM_OWNER_BOOTSTRAP_EMAIL=<real operator mailbox>
npm run platform:bootstrap-owner
```

Then immediately:

1. Unset `PLATFORM_OWNER_BOOTSTRAP_ENABLED`.
2. Enroll TOTP at `/admin/login`.
3. Confirm `/platform` works.
4. Confirm a second bootstrap is denied.

Never put the password in Git, tickets, or chat logs.

## Smoke

```bash
CUTOVER_FRONTEND_URL=https://app.supremerisk.com \
CUTOVER_API_URL=https://api.supremerisk.com \
./scripts/cutover-smoke.sh
```

Before DNS, use the Render onrender.com URLs.

Negative (manual or follow-up curl): customer cannot call `/api/v1/platform`; platform cannot read `/vendors` without a support session; Org A cannot read Org B; non-CLEAN download 403; invalid Stripe webhook denied; hostile Origin not reflected; `/metrics` 404 without token; `/api/v1/tasks|workflows|reports` 404.

## Rollback

| Layer | Trigger | Steps | Time | Data risk |
|---|---|---|---|---|
| Frontend | smoke fail, bad CSP, leaked secret | Redeploy previous frontend SHA | one deploy | none |
| Backend | 5xx, ready fail, auth regression | Redeploy previous API SHA | one deploy | none if schema compatible |
| Database | failed/partial migrate | **Do not migrate down.** Restore from pre-cutover dump **or** forward-fix | restore window | HIGH if writes occurred |
| DNS | wrong host, cert fail | Restore prior record / delete new CNAME | TTL (300s–48h) | traffic |
| Config | bad CORS/URL | Revert env; restart | minutes | sessions |
| Stripe | live misconfig | Disable live checkout; keep test; do not remap plans | minutes | billing |

Rollback trigger examples: ready 503 after deploy; cross-tenant leak; metrics public; CLEAN invented; live Stripe charging wrong prices.

## Provider rollback / disable

| Provider | Disable behavior |
|---|---|
| Stripe | Unset live keys; app rejects `sk_live_` mismatch / ERROR. Test keys only until catalog ready. |
| Resend/SMTP | Unset host → email NOT_CONFIGURED; auth still works |
| ClamAV | Unset host → uploads NOT_CONFIGURED; downloads fail-closed |
| Redis | Unset → in-memory limits on one instance; authoritative data unaffected |
| Object storage | Production without S3 and without `ALLOW_LOCAL_OBJECT_STORAGE` → upload 503 |

## Communications (do not send during rehearsal)

**Cutover starting:** “Engineering is executing the approved SHA. DNS is not public yet.”
**GO:** “Public hostnames are live. Monitor #launch.”
**NO-GO:** “Cutover stopped. DNS unchanged. Reason: {blocker}.”
**Rollback initiated:** “Rolling {layer} to {previous SHA}. Customer impact: {honest}.”
**Launch completed:** “Smoke PASS. Owners watching for 24h.”
**Incident detected:** Use the P1 tabletop. No invented SLA.

Future customer comms (maintenance, incident, billing, support) require Legal-approved templates at #11. There are no production customers today.

## Access

Least privilege. Production access is required for Render, GitHub, Postgres, Redis, object storage, Stripe, Resend, DNS, registrar. If shared/personal accounts exist, record operational risk at #11. Control-plane MFA: USER ACTION REQUIRED / UNKNOWN from this rehearsal (passwords were not requested).

## Secrets at cutover (generate; do not commit)

`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (≥32, not placeholders), `DATABASE_URL`, Redis URL, S3 credentials, Stripe live secrets **only if catalog ready**, SMTP/Resend, optional `METRICS_TOKEN`. Rotate by issuing new values in the secret store and restarting; JWT rotation signs users out.

## After launch (still not #11)

Monitor health, alerts, webhooks, malware, backups. Do not declare SOC 2 / ISO / pentest. Do not start later product modules from this runbook.
