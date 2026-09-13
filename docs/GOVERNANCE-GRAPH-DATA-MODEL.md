# Governance Graph Data Model

## Storage

PostgreSQL tables `GovernanceNode` and `GovernanceEdge`. Prisma models and migration `20260913120000_governance_graph`. No separate graph database.

## Node uniqueness

`@@unique([organizationId, nodeType, sourceModel, sourceId])`

A finding and its remediation may share `sourceModel=VendorIssue` and the same `sourceId` because `nodeType` differs.

## Active edge uniqueness

Partial unique index `GovernanceEdge_active_identity` on `(organizationId, fromNodeId, toNodeId, relationshipType)` where `archivedAt IS NULL AND validTo IS NULL`.

Historical rows remain after archive so a later relationship of the same type can be created.

## Enumerations

See Prisma enums: `GovernanceNodeType`, `GovernanceRelationshipType`, `GovernanceProvenance`, `GovernanceAuthority`.

Authority is categorical: AUTHORITATIVE, VERIFIED, DERIVED, SUGGESTED. No percentage confidence scores.

## Indexes

- Node: organizationId+nodeType, organizationId+sourceModel+sourceId, organizationId+archivedAt, displayLabel
- Edge: organizationId+relationshipType, organizationId+fromNodeId, organizationId+toNodeId, organizationId+archivedAt, from/to/type

## Source archive behavior

| Source event | Graph behavior |
|---|---|
| Vendor offboarded / terminated | Node remains; status updates; `archivedAt` set on terminate; historical edges and decisions remain |
| Soft-deleted stored object | Reconcile reports stale/archived source; node is not hard-deleted |
| Hard-deleted source | Reconcile reports `STALE_SOURCE`; operators decide; history is not auto-destroyed |
| CAP added to finding | Backfill/ensure creates REMEDIATION + REMEDIATED_BY |

## Global vs tenant

#13 tenant nodes always have `organizationId`. Future platform-owned framework/requirement records may omit tenant copies, but private edges stay tenant-scoped. Broad global sharing is not implemented.
