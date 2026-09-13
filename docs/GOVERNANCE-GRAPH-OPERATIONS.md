# Governance Graph Operations

## Services

Central module: `backend/src/services/governanceGraphService.ts`.

Products must not write `GovernanceNode` / `GovernanceEdge` with ad-hoc rules.

| Method | Purpose |
|---|---|
| `ensureNode` | Idempotent, uniqueness-backed registration |
| `createRelationship` | Tenant-checked edge create; AI cannot be AUTHORITATIVE |
| `archiveRelationship` | Temporal close; history retained |
| `approveSuggestedRelationship` | AI_SUGGESTED → AI_APPROVED / VERIFIED |
| `neighbors` / `pathBetween` / `lineage` / `impact` | Bounded traversal |
| `searchNodes` / `summary` / `exportGraph` | Tenant-scoped read |
| `backfillOrganization` | Proven TPRM registration |
| `reconcileOrganization` | Validation only; does not invent edges |
| `applySourceLifecycle` | Status/archive when sources offboard |

## APIs

Mounted at `/api/v1/governance` behind `authenticate` + `rejectPlatformTenantContent`.

Read: summary, search, node, relationships, neighbors, lineage, impact, path, export.  
Manage: backfill, reconcile, create/archive/approve relationship.

## Transaction policy

- Authoritative TPRM writes commit first.
- Graph backfill and lifecycle are eventual; failure is audited and must not corrupt TPRM rows.
- Explicit user-created relationships write the graph after tenant checks.
- Empty-graph GET summary may backfill the caller’s tenant.

## Query safety

Max depth 3, max 200 traversal nodes, search limit 50, 2s traversal timeout, report-category rate limit.

## Backup / restore

`GovernanceNode` and `GovernanceEdge` are in `AUTHORITATIVE_TABLES`. Recovery populate backfills both recovery tenants. Restore must preserve tenant ownership, temporal fields, and relationship identity.

## Events

In-process only: `governance.node.created`, `governance.edge.created`, `governance.edge.archived`, `governance.relationship.changed`. Not customer webhooks.
