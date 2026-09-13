# Governance Graph Certification

**ITEM:** #13 Governance Graph  
**DATE:** 2026-09-13  
**STARTING SHA:** `70e4953e9d9eba13ac8604b721c81216a4e149ad`  
**IMPLEMENTATION SHA:** `8ec44343fea25a027bedd048ae7097fca17a06b7`  
**GITHUB CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34749488009 PASS on `8ec44343fea25a027bedd048ae7097fca17a06b7`  
**BRANCH:** `supreme-risk-transformation`  
**#12:** remains PARTIAL / OPEN IN PARALLEL  
**#14 STARTED:** NO  
**COMMERCIAL PRODUCTION:** NO-GO  
**PRODUCTION READY:** NO

## Local evidence (this implementation)

| Check | Result |
|---|---|
| ADR accepted | PASS — `docs/ADR-GOVERNANCE-GRAPH.md` |
| Authoritative source model preserved | PASS — graph stores identity refs only |
| Separate graph database | NO |
| Prisma generate / validate | PASS |
| Additive migration | PASS — `20260913120000_governance_graph` |
| Migration safety | PASS — 10 files, no DROP/TRUNCATE/reset |
| Backend typecheck | PASS |
| Frontend typecheck | PASS |
| Backend tests | PASS — 286 |
| Frontend tests | PASS — 123 |
| Secret scan | PASS |
| Production frontend build | PASS |
| Tenant isolation / cross-tenant attacks | PASS — 403/404, no metadata body |
| Concurrent node/edge create | PASS — uniqueness reused |
| Backfill idempotent (3 runs) | PASS — runs 2–3 create 0 |
| Reconciliation | PASS — does not invent edges |
| Query depth/result limits | PASS — max depth 3, max 200 |
| Synthetic scale | 5,000 nodes / 15,000 edges; search 19–21ms; neighbors 9–11ms; 2-hop 21–29ms; 3-hop 18–21ms; impact 17–20ms; lineage 8ms. Not enterprise-scale certification. |
| P0/P1 open for #13 | NONE observed in local tests |

## Hosted explorer rejection (2026-09-13)

Product Leadership tested live `/governance-graph` and received “Too many attempts. Too many requests. Please try again later.” during ordinary use. #13 remains PARTIAL.

| Fact | Finding |
|---|---|
| Limiter that fired | **report** (`createCategoryLimiter('report')`) on all `/governance/*` routes |
| Not the cause | general API 800/15m; search/traversal depth (400/timeout); frontend retry loop |
| Endpoints returning 429 | `GET /governance/summary`, `GET /governance/search`, `GET /governance/nodes/:id/relationships`, `GET /governance/nodes/:id/impact`, `GET /governance/nodes/:id/lineage`, `POST /governance/backfill` — same shared report bucket as PDF downloads |
| Root cause | Graph reads shared the 40-request / 60-minute / user+org report budget. Explorer `load()` also posted backfill and fetched summary + search + relationships + impact + lineage on every page load and every node click (~6 requests). React Strict Mode can double that. EntityRelationships on other pages used the same bucket. QueryState titled “Too many attempts” and then appended the API 429 sentence. |
| Request count before | Typical open: 6. Each node click: +6. Five searches plus several clicks exceeded 40/hour. |
| Request count after | Open: 2 (`summary` + `search`). Select: 1 (`relationships`). Impact tab: 1 (cached). Lineage tab: 1 (cached). Search: 1 debounced (~400ms), stale requests aborted. No backfill on ordinary load. |
| Limiter policy after | `graph` 180 / 15 min / user+org / fail-open for interactive reads. Report PDFs stay 40 / 60 min. Graph writes also use `bulk` 5 / 60 min. General API 800 / 15 min unchanged. Abuse protection is preserved. |

429 copy is now a single sentence: “Too many requests were made in a short period. Please wait a moment and try again.”

The explorer landing page shows guidance and recent stored relationship changes. A selected node opens a relationship workspace (entity, summary, direct relationships, impact, lineage, related-record links). No force-directed graph.

## Hosted ordinary-use proof (2026-09-13)

| Evidence | Value |
|---|---|
| Frontend SHA | `1d4bf1bb54f220fafb1db32e2e742ca4a9f9ab85` (`/version.json`) |
| API SHA | `b9daaf57a309846dab025a8abd50520d3a4685ae` (`/health.gitSha`) |
| Limiter CI | https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34751123207 PASS on `b9daaf5` |
| Endpoints previously 429 | `/governance/summary`, `/governance/search`, `/governance/nodes/:id/relationships`, `/governance/nodes/:id/impact`, `/governance/nodes/:id/lineage`, `/governance/backfill` on the **report** limiter |
| Request count before | ~6 per load/select (backfill + summary + search + relationships + impact + lineage) |
| Request count after (ordinary session) | summary 1, search 12 (several searches + filters), relationships 1, impact 1, lineage 1, backfill 0 |
| Unexpected 429s | **0** |
| Selected entity | Northwind Cloud (vendor, real tenant record) |
| Screenshots | `docs/private-beta/hosted-ux-qa/graph-explorer/` — selected entity, direct relationships, impact, lineage, landing, 1440, 375 |

This is hosted engineering evidence. It is not Product Leadership acceptance and does not make #13 PASS.

## Known non-closures

- Hosted Supreme CI PASS on first implementation SHA `8ec4434` (run `34749488009`). Product Leadership later rejected that hosted explorer.
- #13 remains PARTIAL until Product Leadership reviews the remediating hosted experience.
- #12 invitation inbox confirmation, visual acceptance, UX-P2/P3, and commercial NO-GO remain #12 issues.
- Private external testers are not authorized.
- #14 is not authorized and was not started.

## Threat model (local)

IDOR, cross-tenant traversal, edge injection, sourceId forgery via body organizationId, relationship overposting, recursive depth, support-role tenant access, and audit of graph mutations were tested. Remaining residual risk is hosted runtime confirmation.
