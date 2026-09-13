# ADR: Governance Graph

**ADR ID:** ADR-GOVERNANCE-GRAPH  
**Status:** ACCEPTED  
**Date:** 2026-09-13  
**Item:** #13 Governance Graph  
**Starting SHA:** `70e4953e9d9eba13ac8604b721c81216a4e149ad`  
**Production-ready claim:** NO  
**#12 status:** PARTIAL / OPEN IN PARALLEL  
**#14 authorized:** NO

## CONTEXT

Supreme is becoming a multi-product governance platform. Supreme Third Party already stores vendors, assessments, evidence, findings, residual-risk snapshots, and decision briefs. Later products (Risk, Compliance, Privacy, AI Governance, Intelligence, Automation) must share one governance context rather than copy vendors, risks, controls, evidence, and decisions into disconnected applications.

Product Leadership authorized #13 on 2026-09-13 while #12 remains PARTIAL. This ADR records that authorization. It does not close #12.

## PROBLEM

Relational TPRM tables prove many relationships (vendor owns assessments, evidence links, decision applies to a vendor/score) but those relationships are not queryable as a single tenant-safe graph. Without a shared layer, future products will invent parallel copies of the same objects.

A dedicated graph database would add a paid infrastructure dependency, a second operational plane, and a dual-write problem before scale evidence exists.

## DECISION

#13 implements the Supreme Governance Graph in **PostgreSQL + Prisma**.

The graph stores identity references, relationships, provenance, temporal relationship state, and query structure. Existing business records remain authoritative. The graph is not a second copy of vendor, assessment, evidence, finding, risk, or decision payloads.

No Neo4j, Amazon Neptune, TigerGraph, ArangoDB, or other paid graph engine is introduced.

PostgreSQL/Prisma is sufficient for #13 because:

1. Current TPRM cardinality is organization-scoped and far below a dedicated graph engine’s break-even.
2. Required queries are bounded neighbor, path, lineage, and impact traversals (max depth 3, max 200 nodes), not open Cypher/SQL from customers.
3. Prisma already owns tenant data, migrations, backup/restore, and uniqueness.
4. Partial unique indexes and foreign keys enforce idempotent registration better than application check-then-insert.
5. A later graph engine can be introduced if measured scale meets the exit criteria below. Node and edge tables are already an adjacency-list model that can be exported.

## AUTHORITATIVE DATA MODEL

| Concern | Authoritative store | Graph role |
|---|---|---|
| Vendor profile | `Vendor` | `VENDOR` node identity |
| Assessment | `VendorAssessment` | `ASSESSMENT` node identity |
| Evidence file | `StoredObject` | `EVIDENCE` node identity |
| Finding / CAP | `VendorIssue` | `FINDING` and optional `REMEDIATION` nodes |
| TPRM residual risk | `ScoreCalculation` | `RISK` node identity |
| Decision | `RiskDecisionBrief` | `DECISION` node identity |
| Legacy GRC risk/control | `Risk` / `Control` | Registered only when rows exist; not a shipped Risk product |
| Relationship fact | Proven FK/link in source tables or explicit user edge | `GovernanceEdge` |

Do not treat `GovernanceNode` JSON or labels as the system of record for scores, evidence bodies, or decisions.

## NODE MODEL

`GovernanceNode` is tenant-scoped and unique on `organizationId + nodeType + sourceModel + sourceId`.

Fields: id, organizationId, nodeType, sourceModel, sourceId, displayLabel, status, createdAt, updatedAt, archivedAt.

Metadata stays minimal. Large source records are not copied.

Future node types (SYSTEM, DATA_ASSET, AI_SYSTEM, FRAMEWORK, REQUIREMENT, …) may exist in the enum without creating fake product records.

## EDGE MODEL

`GovernanceEdge` is tenant-scoped. Active uniqueness is enforced by a partial unique index on `(organizationId, fromNodeId, toNodeId, relationshipType)` where `archivedAt IS NULL AND validTo IS NULL`.

Fields include provenance, authority, isDerived, createdBy, validFrom, validTo, archivedAt.

Canonical examples:

- CONTROL --MITIGATES--> RISK
- EVIDENCE --SUPPORTED_BY--> CONTROL / ASSESSMENT / FINDING / VENDOR (direction: evidence supports the target)
- ASSESSMENT is linked from VENDOR --ASSESSED_BY--> ASSESSMENT
- FINDING --REMEDIATED_BY--> REMEDIATION
- DECISION --APPLIES_TO--> VENDOR or RISK

`VendorIssue` has no `assessmentId`. #13 does **not** invent Assessment → Finding.

## PROVENANCE

Controlled values: SYSTEM, USER, IMPORT, ASSESSMENT, RULE, INTELLIGENCE, AI_SUGGESTED, AI_APPROVED.

AI-suggested edges cannot be AUTHORITATIVE. Approval moves them to AI_APPROVED / VERIFIED.

## TEMPORAL HISTORY

`validFrom`, `validTo`, and `archivedAt` retain ended relationships. Offboarded vendors keep historical nodes; status changes to the source lifecycle; decisions remain traceable.

## TENANT ISOLATION

Every node and edge belongs to a tenant. `organizationId` is derived from authenticated membership. Browser-supplied organization IDs are rejected. Cross-tenant node, edge, path, impact, search, and export attempts return 403/404 with no metadata leak.

Platform staff roles do not receive `governanceGraph.*` and are blocked by `rejectPlatformTenantContent`. SupportAccessSession remains the only controlled support path.

## AUTHORIZATION

- `governanceGraph.read` — VIEWER and above via the read portfolio
- `governanceGraph.manage` — ORGANIZATION_ADMIN and RISK_MANAGER

## AUDIT

Audited actions: node registration, edge create/archive/approve, backfill, reconcile, source lifecycle. Metadata records actor, tenant, relationship type, and source identity. Evidence bodies and secrets are not logged.

## QUERY MODEL

Customer APIs: node, relationships, neighbors, path, lineage, impact, search, summary, export.

No customer SQL or Cypher. Max depth 3. Max 200 traversal nodes. Search page size 50. Traversal timeout 2s. Graph routes use the existing report-category limiter.

## PERFORMANCE

Indexes cover organizationId, nodeType, source identity, endpoints, relationshipType, and archivedAt. Synthetic fixture target: 5,000+ nodes / 15,000+ edges. That is a safety measurement, not enterprise-scale certification.

## BACKFILL

Idempotent, restartable, tenant-scoped, non-destructive. Three runs produce the same nodes and edges. Only proven source links are written.

## RECONCILIATION

Detects missing nodes, duplicate identities, missing proven relations, orphan edges, wrong tenant, stale source, and archived-source mismatch. It does not invent missing relationships.

## FAILURE MODE

Graph updates are eventually consistent with authoritative TPRM writes. Graph failure must not roll back vendor, assessment, evidence, finding, or decision persistence. Offboarding updates the vendor first, then applies graph lifecycle. First empty-graph read may backfill the caller’s tenant.

Same-transaction graph writes are reserved for explicit user-created relationships. Backfill and source lifecycle are post-commit.

Internal events: `governance.node.created`, `governance.edge.created`, `governance.edge.archived`, `governance.relationship.changed`. These are not product #22 webhooks.

## FUTURE SCALE / GRAPH DATABASE EXIT CRITERIA

A dedicated graph engine may be proposed only if Product Leadership approves and at least two of the following are measured in production-like load:

1. Bounded 3-hop impact regularly exceeds the PostgreSQL timeout/result budget after index and query tuning.
2. Tenant graphs exceed millions of active edges with interactive explorer SLAs missed.
3. Cross-product traversal requirements cannot be expressed as bounded adjacency queries.

Until then PostgreSQL remains the graph store.

## FUTURE PRODUCT EXTENSION

#13 architects types for Risk, Compliance, Privacy, AI Governance, Intelligence, and Automation. It does not implement those products and does not start #14’s shared control and evidence layer.

Global reference data (framework/requirement) may later be platform-owned. Private tenant edges to those references must remain tenant-scoped. #13 does not implement broad global sharing.
