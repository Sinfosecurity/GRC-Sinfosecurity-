import {
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
    GovernanceRelationshipType,
    Prisma,
    VendorStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { emitGovernanceEvent, GOVERNANCE_EVENTS } from './governanceGraphEvents';
import {
    GRAPH_MAX_DEPTH,
    GRAPH_MAX_RESULTS,
    GRAPH_SEARCH_LIMIT,
    isAiAuthoritativeBlocked,
    publicNode,
} from './governanceGraphTaxonomy';

const TRAVERSAL_TIMEOUT_MS = 2000;

export type EnsureNodeInput = {
    organizationId: string;
    nodeType: GovernanceNodeType;
    sourceModel: string;
    sourceId: string;
    displayLabel: string;
    status?: string;
    archivedAt?: Date | null;
    actorUserId?: string | null;
};

export type CreateRelationshipInput = {
    organizationId: string;
    fromNodeId: string;
    toNodeId: string;
    relationshipType: GovernanceRelationshipType;
    provenance?: GovernanceProvenance;
    authority?: GovernanceAuthority;
    isDerived?: boolean;
    createdBy?: string | null;
    validFrom?: Date;
    validTo?: Date | null;
};

export type BackfillCounts = {
    nodesCreated: number;
    nodesReused: number;
    edgesCreated: number;
    edgesReused: number;
    errors: Array<{ code: string; detail: string }>;
};

type GraphNodeRow = Prisma.GovernanceNodeGetPayload<object>;
type GraphEdgeRow = Prisma.GovernanceEdgeGetPayload<object>;

function isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function activeEdgeWhere(organizationId: string, extra: Prisma.GovernanceEdgeWhereInput = {}): Prisma.GovernanceEdgeWhereInput {
    return {
        organizationId,
        archivedAt: null,
        validTo: null,
        ...extra,
    };
}

async function auditGraph(input: {
    organizationId: string;
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
}) {
    await recordAudit({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        result: 'success',
        metadata: input.metadata,
    });
}

export async function ensureNode(input: EnsureNodeInput): Promise<{ node: GraphNodeRow; created: boolean }> {
    const data = {
        organizationId: input.organizationId,
        nodeType: input.nodeType,
        sourceModel: input.sourceModel,
        sourceId: input.sourceId,
        displayLabel: input.displayLabel,
        status: input.status || 'ACTIVE',
        archivedAt: input.archivedAt ?? null,
    };
    try {
        const node = await prisma.governanceNode.create({ data });
        emitGovernanceEvent(GOVERNANCE_EVENTS.NODE_CREATED, {
            organizationId: node.organizationId,
            nodeId: node.id,
            nodeType: node.nodeType,
            sourceModel: node.sourceModel,
            sourceId: node.sourceId,
        });
        await auditGraph({
            organizationId: node.organizationId,
            actorUserId: input.actorUserId,
            action: 'governance.node.registered',
            resourceType: 'GovernanceNode',
            resourceId: node.id,
            metadata: { nodeType: node.nodeType, sourceModel: node.sourceModel, sourceId: node.sourceId },
        });
        return { node, created: true };
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const existing = await prisma.governanceNode.findUnique({
            where: {
                organizationId_nodeType_sourceModel_sourceId: {
                    organizationId: input.organizationId,
                    nodeType: input.nodeType,
                    sourceModel: input.sourceModel,
                    sourceId: input.sourceId,
                },
            },
        });
        if (!existing) throw error;
        const nextStatus = input.status || existing.status;
        const nextArchived = input.archivedAt !== undefined ? input.archivedAt : existing.archivedAt;
        if (existing.displayLabel !== input.displayLabel || existing.status !== nextStatus || existing.archivedAt !== nextArchived) {
            const updated = await prisma.governanceNode.update({
                where: { id: existing.id },
                data: {
                    displayLabel: input.displayLabel,
                    status: nextStatus,
                    archivedAt: nextArchived,
                },
            });
            return { node: updated, created: false };
        }
        return { node: existing, created: false };
    }
}

export async function createRelationship(input: CreateRelationshipInput): Promise<{ edge: GraphEdgeRow; created: boolean }> {
    if (input.fromNodeId === input.toNodeId) {
        throw new ApiError(400, 'A relationship cannot connect a node to itself');
    }
    const provenance = input.provenance || GovernanceProvenance.SYSTEM;
    const authority = input.authority || GovernanceAuthority.AUTHORITATIVE;
    if (isAiAuthoritativeBlocked(provenance, authority)) {
        throw new ApiError(400, 'AI-suggested relationships cannot become authoritative');
    }
    if (provenance === GovernanceProvenance.AI_SUGGESTED && authority !== GovernanceAuthority.SUGGESTED) {
        throw new ApiError(400, 'AI-suggested relationships must remain SUGGESTED until approved');
    }

    const [fromNode, toNode] = await Promise.all([
        prisma.governanceNode.findFirst({ where: { id: input.fromNodeId, organizationId: input.organizationId } }),
        prisma.governanceNode.findFirst({ where: { id: input.toNodeId, organizationId: input.organizationId } }),
    ]);
    if (!fromNode || !toNode) {
        throw new ApiError(404, 'Graph node not found');
    }
    if (fromNode.organizationId !== toNode.organizationId || fromNode.organizationId !== input.organizationId) {
        throw new ApiError(404, 'Graph node not found');
    }

    try {
        const edge = await prisma.governanceEdge.create({
            data: {
                organizationId: input.organizationId,
                fromNodeId: input.fromNodeId,
                toNodeId: input.toNodeId,
                relationshipType: input.relationshipType,
                provenance,
                authority,
                isDerived: Boolean(input.isDerived),
                createdBy: input.createdBy || null,
                validFrom: input.validFrom || new Date(),
                validTo: input.validTo ?? null,
            },
        });
        emitGovernanceEvent(GOVERNANCE_EVENTS.EDGE_CREATED, {
            organizationId: edge.organizationId,
            edgeId: edge.id,
            relationshipType: edge.relationshipType,
            provenance: edge.provenance,
            authority: edge.authority,
        });
        emitGovernanceEvent(GOVERNANCE_EVENTS.RELATIONSHIP_CHANGED, {
            organizationId: edge.organizationId,
            edgeId: edge.id,
            change: 'created',
        });
        await auditGraph({
            organizationId: edge.organizationId,
            actorUserId: input.createdBy,
            action: 'governance.edge.created',
            resourceType: 'GovernanceEdge',
            resourceId: edge.id,
            metadata: {
                relationshipType: edge.relationshipType,
                provenance: edge.provenance,
                authority: edge.authority,
                fromNodeId: edge.fromNodeId,
                toNodeId: edge.toNodeId,
            },
        });
        return { edge, created: true };
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const existing = await prisma.governanceEdge.findFirst({
            where: activeEdgeWhere(input.organizationId, {
                fromNodeId: input.fromNodeId,
                toNodeId: input.toNodeId,
                relationshipType: input.relationshipType,
            }),
        });
        if (!existing) throw error;
        return { edge: existing, created: false };
    }
}

export async function archiveRelationship(input: {
    organizationId: string;
    edgeId: string;
    actorUserId?: string | null;
}) {
    const existing = await prisma.governanceEdge.findFirst({
        where: { id: input.edgeId, organizationId: input.organizationId },
    });
    if (!existing) {
        throw new ApiError(404, 'Relationship not found');
    }
    if (existing.archivedAt) {
        return existing;
    }
    const archived = await prisma.governanceEdge.update({
        where: { id: existing.id },
        data: { archivedAt: new Date(), validTo: existing.validTo || new Date() },
    });
    emitGovernanceEvent(GOVERNANCE_EVENTS.EDGE_ARCHIVED, {
        organizationId: archived.organizationId,
        edgeId: archived.id,
        relationshipType: archived.relationshipType,
    });
    emitGovernanceEvent(GOVERNANCE_EVENTS.RELATIONSHIP_CHANGED, {
        organizationId: archived.organizationId,
        edgeId: archived.id,
        change: 'archived',
    });
    await auditGraph({
        organizationId: archived.organizationId,
        actorUserId: input.actorUserId,
        action: 'governance.edge.archived',
        resourceType: 'GovernanceEdge',
        resourceId: archived.id,
        metadata: { relationshipType: archived.relationshipType },
    });
    return archived;
}

export async function approveSuggestedRelationship(input: {
    organizationId: string;
    edgeId: string;
    actorUserId: string;
}) {
    const existing = await prisma.governanceEdge.findFirst({
        where: { id: input.edgeId, organizationId: input.organizationId },
    });
    if (!existing) {
        throw new ApiError(404, 'Relationship not found');
    }
    if (existing.provenance !== GovernanceProvenance.AI_SUGGESTED || existing.authority !== GovernanceAuthority.SUGGESTED) {
        throw new ApiError(400, 'Only AI-suggested relationships can be approved');
    }
    const approved = await prisma.governanceEdge.update({
        where: { id: existing.id },
        data: {
            provenance: GovernanceProvenance.AI_APPROVED,
            authority: GovernanceAuthority.VERIFIED,
        },
    });
    emitGovernanceEvent(GOVERNANCE_EVENTS.RELATIONSHIP_CHANGED, {
        organizationId: approved.organizationId,
        edgeId: approved.id,
        change: 'approved',
    });
    await auditGraph({
        organizationId: approved.organizationId,
        actorUserId: input.actorUserId,
        action: 'governance.edge.approved',
        resourceType: 'GovernanceEdge',
        resourceId: approved.id,
        metadata: { relationshipType: approved.relationshipType, authority: approved.authority },
    });
    return approved;
}

export async function findRelationship(organizationId: string, edgeId: string) {
    const edge = await prisma.governanceEdge.findFirst({
        where: { id: edgeId, organizationId },
        include: { fromNode: true, toNode: true },
    });
    if (!edge) {
        throw new ApiError(404, 'Relationship not found');
    }
    return edge;
}

export async function findNodeBySource(
    organizationId: string,
    sourceModel: string,
    sourceId: string,
    nodeType?: GovernanceNodeType
) {
    const node = await prisma.governanceNode.findFirst({
        where: {
            organizationId,
            sourceModel,
            sourceId,
            ...(nodeType ? { nodeType } : {}),
        },
        orderBy: { createdAt: 'asc' },
    });
    if (!node) {
        throw new ApiError(404, 'Graph node not found');
    }
    return node;
}

export async function getNode(organizationId: string, nodeId: string) {
    const node = await prisma.governanceNode.findFirst({
        where: { id: nodeId, organizationId },
    });
    if (!node) {
        throw new ApiError(404, 'Graph node not found');
    }
    return node;
}

function publicEdge(edge: GraphEdgeRow & { fromNode?: GraphNodeRow; toNode?: GraphNodeRow }) {
    return {
        id: edge.id,
        relationshipType: edge.relationshipType,
        provenance: edge.provenance,
        authority: edge.authority,
        isDerived: edge.isDerived,
        validFrom: edge.validFrom,
        validTo: edge.validTo,
        archivedAt: edge.archivedAt,
        createdAt: edge.createdAt,
        fromNode: edge.fromNode ? publicNode(edge.fromNode) : { id: edge.fromNodeId },
        toNode: edge.toNode ? publicNode(edge.toNode) : { id: edge.toNodeId },
    };
}

export async function neighbors(organizationId: string, nodeId: string, options: {
    relationshipType?: GovernanceRelationshipType;
    includeArchived?: boolean;
    limit?: number;
} = {}) {
    await getNode(organizationId, nodeId);
    const limit = Math.min(options.limit || GRAPH_MAX_RESULTS, GRAPH_MAX_RESULTS);
    const where: Prisma.GovernanceEdgeWhereInput = {
        organizationId,
        OR: [{ fromNodeId: nodeId }, { toNodeId: nodeId }],
        ...(options.relationshipType ? { relationshipType: options.relationshipType } : {}),
        ...(options.includeArchived ? {} : { archivedAt: null, validTo: null }),
    };
    const edges = await prisma.governanceEdge.findMany({
        where,
        include: { fromNode: true, toNode: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
    });
    return {
        nodeId,
        count: edges.length,
        truncated: edges.length === limit,
        relationships: edges.map(publicEdge),
    };
}

type TraversalHop = {
    depth: number;
    edge: ReturnType<typeof publicEdge>;
    node: ReturnType<typeof publicNode>;
};

async function traverse(input: {
    organizationId: string;
    startNodeId: string;
    direction: 'OUT' | 'IN' | 'BOTH';
    maxDepth?: number;
    maxResults?: number;
    relationshipTypes?: GovernanceRelationshipType[];
    nodeTypes?: GovernanceNodeType[];
}) {
    const start = await getNode(input.organizationId, input.startNodeId);
    const maxDepth = Math.min(Math.max(input.maxDepth || GRAPH_MAX_DEPTH, 1), GRAPH_MAX_DEPTH);
    const maxResults = Math.min(input.maxResults || GRAPH_MAX_RESULTS, GRAPH_MAX_RESULTS);
    const started = Date.now();
    const visited = new Set<string>([start.id]);
    const hops: TraversalHop[] = [];
    let frontier = [start.id];
    let depth = 0;
    let timedOut = false;
    let truncated = false;

    while (frontier.length && depth < maxDepth && hops.length < maxResults) {
        if (Date.now() - started > TRAVERSAL_TIMEOUT_MS) {
            timedOut = true;
            break;
        }
        depth += 1;
        const edges = await prisma.governanceEdge.findMany({
            where: activeEdgeWhere(input.organizationId, {
                ...(input.relationshipTypes?.length ? { relationshipType: { in: input.relationshipTypes } } : {}),
                OR: [
                    ...(input.direction !== 'IN' ? [{ fromNodeId: { in: frontier } }] : []),
                    ...(input.direction !== 'OUT' ? [{ toNodeId: { in: frontier } }] : []),
                ],
            }),
            include: { fromNode: true, toNode: true },
            take: GRAPH_MAX_RESULTS,
        });
        const nextFrontier: string[] = [];
        for (const edge of edges) {
            if (hops.length >= maxResults) {
                truncated = true;
                break;
            }
            const outgoing = frontier.includes(edge.fromNodeId);
            const neighbor = outgoing ? edge.toNode : edge.fromNode;
            if (neighbor.organizationId !== input.organizationId) {
                continue;
            }
            if (input.nodeTypes?.length && !input.nodeTypes.includes(neighbor.nodeType)) {
                continue;
            }
            if (visited.has(neighbor.id) && depth > 1) {
                hops.push({ depth, edge: publicEdge(edge), node: publicNode(neighbor) });
                continue;
            }
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                nextFrontier.push(neighbor.id);
            }
            hops.push({ depth, edge: publicEdge(edge), node: publicNode(neighbor) });
        }
        frontier = nextFrontier;
    }

    return {
        start: publicNode(start),
        depthUsed: depth,
        maxDepth,
        timedOut,
        truncated: truncated || hops.length >= maxResults,
        hops,
        nodes: [publicNode(start), ...hops.map((hop) => hop.node)].filter(
            (node, index, all) => all.findIndex((item) => item.id === node.id) === index
        ),
    };
}

export async function pathBetween(organizationId: string, fromNodeId: string, toNodeId: string, maxDepth = GRAPH_MAX_DEPTH) {
    await getNode(organizationId, fromNodeId);
    await getNode(organizationId, toNodeId);
    const result = await traverse({
        organizationId,
        startNodeId: fromNodeId,
        direction: 'BOTH',
        maxDepth,
    });
    const reached = result.nodes.some((node) => node.id === toNodeId);
    if (!reached) {
        return { found: false, path: [], ...result };
    }
    const path = result.hops.filter((hop) => hop.node.id === toNodeId || hop.edge.fromNode.id === toNodeId || hop.edge.toNode.id === toNodeId);
    return { found: true, path: result.hops, ...result };
}

export async function lineage(organizationId: string, nodeId: string, maxDepth = GRAPH_MAX_DEPTH) {
    return traverse({
        organizationId,
        startNodeId: nodeId,
        direction: 'IN',
        maxDepth,
    });
}

export async function impact(organizationId: string, nodeId: string, maxDepth = GRAPH_MAX_DEPTH) {
    const result = await traverse({
        organizationId,
        startNodeId: nodeId,
        direction: 'BOTH',
        maxDepth,
    });
    const byType = result.nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.nodeType] = (acc[node.nodeType] || 0) + 1;
        return acc;
    }, {});
    return { ...result, relatedCounts: byType };
}

async function compliancePublicIdClause(organizationId: string, q: string): Promise<Prisma.GovernanceNodeWhereInput[]> {
    const needle = q.trim();
    if (!/^(GAP|EXC|ATT|AUD|ACT|CAM|CRS)-/i.test(needle)) return [];
    const [gap, exception, attestation, period, activation, campaign] = await Promise.all([
        prisma.complianceGap.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
        prisma.complianceException.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
        prisma.complianceAttestation.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
        prisma.compliancePeriod.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
        prisma.complianceActivation.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
        prisma.complianceAttestationCampaign.findFirst({ where: { organizationId, publicId: { equals: needle, mode: 'insensitive' } }, select: { id: true } }),
    ]);
    return [gap?.id, exception?.id, attestation?.id, period?.id, activation?.id, campaign?.id]
        .filter((id): id is string => Boolean(id))
        .map((sourceId) => ({ sourceId }));
}

export async function searchNodes(organizationId: string, query: {
    q?: string;
    nodeType?: GovernanceNodeType;
    status?: string;
    limit?: number;
    offset?: number;
}) {
    const limit = Math.min(query.limit || GRAPH_SEARCH_LIMIT, GRAPH_SEARCH_LIMIT);
    const offset = Math.max(query.offset || 0, 0);
    const where: Prisma.GovernanceNodeWhereInput = {
        organizationId,
        ...(query.nodeType ? { nodeType: query.nodeType } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
            ? {
                  OR: [
                      { displayLabel: { contains: query.q, mode: 'insensitive' } },
                      { sourceId: { contains: query.q, mode: 'insensitive' } },
                      ...await compliancePublicIdClause(organizationId, query.q),
                  ],
              }
            : {}),
    };
    const [total, nodes] = await Promise.all([
        prisma.governanceNode.count({ where }),
        prisma.governanceNode.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset,
        }),
    ]);
    return {
        total,
        limit,
        offset,
        nodes: nodes.map((node) => publicNode(node)),
    };
}

export async function summary(organizationId: string) {
    const [nodes, edges, recent] = await Promise.all([
        prisma.governanceNode.findMany({
            where: { organizationId },
            select: { id: true, nodeType: true, status: true },
        }),
        prisma.governanceEdge.findMany({
            where: { organizationId },
            select: { id: true, relationshipType: true, provenance: true, archivedAt: true, fromNodeId: true, toNodeId: true },
        }),
        prisma.governanceEdge.findMany({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            include: { fromNode: true, toNode: true },
        }),
    ]);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const connected = new Set<string>();
    for (const edge of edges) {
        connected.add(edge.fromNodeId);
        connected.add(edge.toNodeId);
    }
    const nodeCounts = nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.nodeType] = (acc[node.nodeType] || 0) + 1;
        return acc;
    }, {});
    const relationshipCounts = edges.reduce<Record<string, number>>((acc, edge) => {
        acc[edge.relationshipType] = (acc[edge.relationshipType] || 0) + 1;
        return acc;
    }, {});
    const provenanceCounts = edges.reduce<Record<string, number>>((acc, edge) => {
        acc[edge.provenance] = (acc[edge.provenance] || 0) + 1;
        return acc;
    }, {});
    return {
        nodeCount: nodes.length,
        relationshipCount: edges.length,
        activeRelationshipCount: edges.filter((edge) => !edge.archivedAt).length,
        nodeCounts,
        relationshipCounts,
        provenanceCounts,
        orphanNodes: nodes.filter((node) => !connected.has(node.id)).map((node) => ({ id: node.id, nodeType: node.nodeType })),
        recentChanges: recent.map(publicEdge),
    };
}

export async function exportGraph(organizationId: string) {
    const [nodes, edges] = await Promise.all([
        prisma.governanceNode.findMany({ where: { organizationId } }),
        prisma.governanceEdge.findMany({ where: { organizationId } }),
    ]);
    return {
        organizationId,
        nodeCount: nodes.length,
        relationshipCount: edges.length,
        nodes: nodes.map((node) => publicNode(node)),
        relationships: edges.map((edge) => ({
            id: edge.id,
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
            relationshipType: edge.relationshipType,
            provenance: edge.provenance,
            authority: edge.authority,
            validFrom: edge.validFrom,
            validTo: edge.validTo,
            archivedAt: edge.archivedAt,
        })),
    };
}

async function safeEnsure(counts: BackfillCounts, input: EnsureNodeInput) {
    try {
        const result = await ensureNode(input);
        if (result.created) counts.nodesCreated += 1;
        else counts.nodesReused += 1;
        return result.node;
    } catch (error) {
        counts.errors.push({ code: 'NODE_FAILED', detail: `${input.nodeType}:${input.sourceId}:${(error as Error).message}` });
        return null;
    }
}

async function safeRelate(
    counts: BackfillCounts,
    input: CreateRelationshipInput
) {
    if (!input.fromNodeId || !input.toNodeId) return;
    try {
        const result = await createRelationship(input);
        if (result.created) counts.edgesCreated += 1;
        else counts.edgesReused += 1;
    } catch (error) {
        counts.errors.push({
            code: 'EDGE_FAILED',
            detail: `${input.relationshipType}:${input.fromNodeId}->${input.toNodeId}:${(error as Error).message}`,
        });
    }
}

export async function backfillOrganization(organizationId: string, actorUserId?: string | null): Promise<BackfillCounts> {
    const counts: BackfillCounts = {
        nodesCreated: 0,
        nodesReused: 0,
        edgesCreated: 0,
        edgesReused: 0,
        errors: [],
    };

    const [
        organization,
        vendors,
        assessments,
        issues,
        storedObjects,
        evidenceLinks,
        scores,
        briefs,
        contracts,
        vendorControls,
        legacyRisks,
        legacyControls,
        riskControls,
    ] = await Promise.all([
        prisma.organization.findUnique({ where: { id: organizationId } }),
        prisma.vendor.findMany({ where: { organizationId } }),
        prisma.vendorAssessment.findMany({ where: { organizationId } }),
        prisma.vendorIssue.findMany({ where: { organizationId } }),
        prisma.storedObject.findMany({ where: { organizationId, deletedAt: null } }),
        prisma.evidenceLink.findMany({ where: { organizationId } }),
        prisma.scoreCalculation.findMany({ where: { organizationId } }),
        prisma.riskDecisionBrief.findMany({ where: { organizationId } }),
        prisma.vendorContract.findMany({ where: { organizationId } }),
        prisma.vendorRiskControl.findMany({ where: { organizationId } }),
        prisma.risk.findMany({ where: { organizationId } }),
        prisma.control.findMany({ where: { organizationId } }),
        prisma.riskControl.findMany({
            where: { risk: { organizationId } },
            include: { risk: true, control: true },
        }),
    ]);

    if (!organization) {
        counts.errors.push({ code: 'ORG_MISSING', detail: organizationId });
        return counts;
    }

    const orgNode = await safeEnsure(counts, {
        organizationId,
        nodeType: GovernanceNodeType.ORGANIZATION,
        sourceModel: 'Organization',
        sourceId: organization.id,
        displayLabel: organization.name,
        actorUserId,
    });

    const vendorNodes = new Map<string, string>();
    for (const vendor of vendors) {
        const archived = vendor.status === VendorStatus.TERMINATED || vendor.status === VendorStatus.REJECTED;
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.VENDOR,
            sourceModel: 'Vendor',
            sourceId: vendor.id,
            displayLabel: vendor.name,
            status: archived ? 'ARCHIVED' : vendor.status,
            archivedAt: archived ? vendor.terminatedAt || vendor.updatedAt : null,
            actorUserId,
        });
        if (node) {
            vendorNodes.set(vendor.id, node.id);
            if (orgNode) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: orgNode.id,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.OWNS,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }

    const assessmentNodes = new Map<string, string>();
    for (const assessment of assessments) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.ASSESSMENT,
            sourceModel: 'VendorAssessment',
            sourceId: assessment.id,
            displayLabel: `${assessment.assessmentType} ${assessment.status}`,
            status: assessment.status,
            actorUserId,
        });
        if (node) {
            assessmentNodes.set(assessment.id, node.id);
            const vendorNodeId = vendorNodes.get(assessment.vendorId);
            if (vendorNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: vendorNodeId,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.ASSESSED_BY,
                    provenance: GovernanceProvenance.ASSESSMENT,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }

    const findingNodes = new Map<string, string>();
    for (const issue of issues) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.FINDING,
            sourceModel: 'VendorIssue',
            sourceId: issue.id,
            displayLabel: issue.title,
            status: issue.status,
            actorUserId,
        });
        if (node) {
            findingNodes.set(issue.id, node.id);
            const vendorNodeId = vendorNodes.get(issue.vendorId);
            if (vendorNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: vendorNodeId,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.HAS_FINDING,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
            if (issue.correctiveActionPlan && issue.correctiveActionPlan.trim()) {
                const remediation = await safeEnsure(counts, {
                    organizationId,
                    nodeType: GovernanceNodeType.REMEDIATION,
                    sourceModel: 'VendorIssue',
                    sourceId: issue.id,
                    displayLabel: `Remediation: ${issue.title}`,
                    status: issue.status,
                    actorUserId,
                });
                if (remediation) {
                    await safeRelate(counts, {
                        organizationId,
                        fromNodeId: node.id,
                        toNodeId: remediation.id,
                        relationshipType: GovernanceRelationshipType.REMEDIATED_BY,
                        provenance: GovernanceProvenance.SYSTEM,
                        authority: GovernanceAuthority.AUTHORITATIVE,
                        createdBy: actorUserId,
                    });
                }
            }
        }
    }

    const evidenceNodes = new Map<string, string>();
    for (const stored of storedObjects) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.EVIDENCE,
            sourceModel: 'StoredObject',
            sourceId: stored.id,
            displayLabel: stored.filename,
            status: stored.retentionStatus,
            actorUserId,
        });
        if (node) evidenceNodes.set(stored.id, node.id);
    }

    for (const link of evidenceLinks) {
        const evidenceNodeId = evidenceNodes.get(link.storedObjectId);
        if (!evidenceNodeId) continue;
        const targets: Array<{ id?: string; type: GovernanceRelationshipType }> = [
            { id: link.vendorId ? vendorNodes.get(link.vendorId) : undefined, type: GovernanceRelationshipType.SUPPORTED_BY },
            { id: link.assessmentId ? assessmentNodes.get(link.assessmentId) : undefined, type: GovernanceRelationshipType.SUPPORTED_BY },
            { id: link.issueId ? findingNodes.get(link.issueId) : undefined, type: GovernanceRelationshipType.SUPPORTED_BY },
        ];
        for (const target of targets) {
            if (!target.id) continue;
            await safeRelate(counts, {
                organizationId,
                fromNodeId: evidenceNodeId,
                toNodeId: target.id,
                relationshipType: target.type,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.AUTHORITATIVE,
                createdBy: actorUserId,
            });
        }
    }

    const riskNodes = new Map<string, string>();
    for (const score of scores) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.RISK,
            sourceModel: 'ScoreCalculation',
            sourceId: score.id,
            displayLabel: `Residual ${score.residualRisk} (${score.riskBand})`,
            status: 'ACTIVE',
            actorUserId,
        });
        if (node) {
            riskNodes.set(score.id, node.id);
            const vendorNodeId = vendorNodes.get(score.vendorId);
            if (vendorNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: vendorNodeId,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.HAS_RISK,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }

    for (const risk of legacyRisks) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.RISK,
            sourceModel: 'Risk',
            sourceId: risk.id,
            displayLabel: risk.title,
            status: risk.status,
            actorUserId,
        });
        if (node) riskNodes.set(`legacy:${risk.id}`, node.id);
    }

    const controlNodes = new Map<string, string>();
    for (const control of vendorControls) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.CONTROL,
            sourceModel: 'VendorRiskControl',
            sourceId: control.id,
            displayLabel: control.controlName,
            status: 'ACTIVE',
            actorUserId,
        });
        if (node) {
            controlNodes.set(control.id, node.id);
            const vendorNodeId = vendorNodes.get(control.vendorId);
            if (vendorNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: vendorNodeId,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.CONTROLLED_BY,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }
    for (const control of legacyControls) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.CONTROL,
            sourceModel: 'Control',
            sourceId: control.id,
            displayLabel: control.name,
            status: control.status,
            actorUserId,
        });
        if (node) controlNodes.set(`legacy:${control.id}`, node.id);
    }
    for (const mapping of riskControls) {
        const controlId = controlNodes.get(`legacy:${mapping.controlId}`);
        const riskId = riskNodes.get(`legacy:${mapping.riskId}`);
        if (controlId && riskId) {
            await safeRelate(counts, {
                organizationId,
                fromNodeId: controlId,
                toNodeId: riskId,
                relationshipType: GovernanceRelationshipType.MITIGATES,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.AUTHORITATIVE,
                createdBy: actorUserId,
            });
        }
    }

    for (const brief of briefs) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.DECISION,
            sourceModel: 'RiskDecisionBrief',
            sourceId: brief.id,
            displayLabel: brief.engagementName || `${brief.riskBand} decision`,
            status: brief.status,
            actorUserId,
        });
        if (!node) continue;
        const vendorNodeId = vendorNodes.get(brief.vendorId);
        if (vendorNodeId) {
            await safeRelate(counts, {
                organizationId,
                fromNodeId: node.id,
                toNodeId: vendorNodeId,
                relationshipType: GovernanceRelationshipType.APPLIES_TO,
                provenance: GovernanceProvenance.SYSTEM,
                authority: GovernanceAuthority.AUTHORITATIVE,
                createdBy: actorUserId,
            });
        }
        if (brief.scoreCalculationId) {
            const riskNodeId = riskNodes.get(brief.scoreCalculationId);
            if (riskNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: node.id,
                    toNodeId: riskNodeId,
                    relationshipType: GovernanceRelationshipType.APPLIES_TO,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }

    for (const contract of contracts) {
        const node = await safeEnsure(counts, {
            organizationId,
            nodeType: GovernanceNodeType.CONTRACT,
            sourceModel: 'VendorContract',
            sourceId: contract.id,
            displayLabel: contract.title,
            status: contract.status,
            actorUserId,
        });
        if (node) {
            const vendorNodeId = vendorNodes.get(contract.vendorId);
            if (vendorNodeId) {
                await safeRelate(counts, {
                    organizationId,
                    fromNodeId: vendorNodeId,
                    toNodeId: node.id,
                    relationshipType: GovernanceRelationshipType.USES,
                    provenance: GovernanceProvenance.SYSTEM,
                    authority: GovernanceAuthority.AUTHORITATIVE,
                    createdBy: actorUserId,
                });
            }
        }
    }

    try {
        const { adoptCatalogForOrganization } = await import('./sharedControlEvidenceService');
        await adoptCatalogForOrganization(organizationId, actorUserId || undefined);
    } catch (error) {
        counts.errors.push({
            code: 'SHARED_CONTROL_ADOPT',
            detail: error instanceof Error ? error.message : 'shared control adopt failed',
        });
    }

    await auditGraph({
        organizationId,
        actorUserId,
        action: 'governance.backfill',
        resourceType: 'GovernanceGraph',
        resourceId: organizationId,
        metadata: { ...counts, errors: counts.errors.length },
    });
    return counts;
}

export async function applySourceLifecycle(input: {
    organizationId: string;
    sourceModel: string;
    sourceId: string;
    status: string;
    archivedAt?: Date | null;
    actorUserId?: string | null;
}) {
    const nodes = await prisma.governanceNode.findMany({
        where: { organizationId: input.organizationId, sourceModel: input.sourceModel, sourceId: input.sourceId },
    });
    const updated = [];
    for (const node of nodes) {
        const next = await prisma.governanceNode.update({
            where: { id: node.id },
            data: {
                status: input.status,
                archivedAt: input.archivedAt ?? (input.status === 'ARCHIVED' || input.status === 'TERMINATED' ? new Date() : node.archivedAt),
            },
        });
        updated.push(next);
    }
    if (updated.length) {
        await auditGraph({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: 'governance.source.lifecycle',
            resourceType: input.sourceModel,
            resourceId: input.sourceId,
            metadata: { status: input.status, nodeIds: updated.map((node) => node.id) },
        });
    }
    return updated;
}

export async function reconcileOrganization(organizationId: string, actorUserId?: string | null) {
    const findings: Array<{ code: string; detail: string }> = [];
    const [
        vendors,
        assessments,
        issues,
        storedObjects,
        scores,
        briefs,
        nodes,
        edges,
    ] = await Promise.all([
        prisma.vendor.findMany({ where: { organizationId }, select: { id: true, status: true, terminatedAt: true } }),
        prisma.vendorAssessment.findMany({ where: { organizationId }, select: { id: true, vendorId: true } }),
        prisma.vendorIssue.findMany({ where: { organizationId }, select: { id: true, vendorId: true, correctiveActionPlan: true } }),
        prisma.storedObject.findMany({ where: { organizationId }, select: { id: true, deletedAt: true } }),
        prisma.scoreCalculation.findMany({ where: { organizationId }, select: { id: true, vendorId: true } }),
        prisma.riskDecisionBrief.findMany({ where: { organizationId }, select: { id: true, vendorId: true, scoreCalculationId: true } }),
        prisma.governanceNode.findMany({ where: { organizationId } }),
        prisma.governanceEdge.findMany({ where: { organizationId }, include: { fromNode: true, toNode: true } }),
    ]);

    const key = (type: string, model: string, id: string) => `${type}:${model}:${id}`;
    const nodeByKey = new Map(nodes.map((node) => [key(node.nodeType, node.sourceModel, node.sourceId), node]));
    const expectNode = (type: GovernanceNodeType, model: string, id: string, label: string) => {
        if (!nodeByKey.has(key(type, model, id))) {
            findings.push({ code: 'MISSING_NODE', detail: `${label}:${id}` });
        }
    };

    expectNode(GovernanceNodeType.ORGANIZATION, 'Organization', organizationId, 'Organization');
    for (const vendor of vendors) expectNode(GovernanceNodeType.VENDOR, 'Vendor', vendor.id, 'Vendor');
    for (const assessment of assessments) expectNode(GovernanceNodeType.ASSESSMENT, 'VendorAssessment', assessment.id, 'Assessment');
    for (const issue of issues) {
        expectNode(GovernanceNodeType.FINDING, 'VendorIssue', issue.id, 'Finding');
        if (issue.correctiveActionPlan) expectNode(GovernanceNodeType.REMEDIATION, 'VendorIssue', issue.id, 'Remediation');
    }
    for (const stored of storedObjects.filter((row) => !row.deletedAt)) {
        expectNode(GovernanceNodeType.EVIDENCE, 'StoredObject', stored.id, 'Evidence');
    }
    for (const score of scores) expectNode(GovernanceNodeType.RISK, 'ScoreCalculation', score.id, 'Risk');
    for (const brief of briefs) expectNode(GovernanceNodeType.DECISION, 'RiskDecisionBrief', brief.id, 'Decision');

    const seenIdentity = new Map<string, string>();
    for (const node of nodes) {
        const identity = key(node.nodeType, node.sourceModel, node.sourceId);
        if (seenIdentity.has(identity)) findings.push({ code: 'DUPLICATE_NODE', detail: identity });
        seenIdentity.set(identity, node.id);
        if (node.organizationId !== organizationId) findings.push({ code: 'WRONG_TENANT', detail: node.id });
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const sourceExists = new Set<string>([
        ...vendors.map((row) => `Vendor:${row.id}`),
        ...assessments.map((row) => `VendorAssessment:${row.id}`),
        ...issues.map((row) => `VendorIssue:${row.id}`),
        ...storedObjects.map((row) => `StoredObject:${row.id}`),
        ...scores.map((row) => `ScoreCalculation:${row.id}`),
        ...briefs.map((row) => `RiskDecisionBrief:${row.id}`),
        `Organization:${organizationId}`,
    ]);

    for (const edge of edges) {
        if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
            findings.push({ code: 'ORPHAN_EDGE', detail: edge.id });
        }
        if (edge.fromNode.organizationId !== organizationId || edge.toNode.organizationId !== organizationId) {
            findings.push({ code: 'WRONG_TENANT', detail: edge.id });
        }
    }

    for (const node of nodes) {
        const sourceKey = `${node.sourceModel}:${node.sourceId}`;
        if (!sourceExists.has(sourceKey) && ['Vendor', 'VendorAssessment', 'VendorIssue', 'StoredObject', 'ScoreCalculation', 'RiskDecisionBrief', 'Organization'].includes(node.sourceModel)) {
            findings.push({ code: 'STALE_SOURCE', detail: `${node.nodeType}:${node.sourceId}` });
        }
    }

    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    for (const node of nodes.filter((item) => item.sourceModel === 'Vendor')) {
        const vendor = vendorById.get(node.sourceId);
        if (vendor && (vendor.status === VendorStatus.TERMINATED || vendor.status === VendorStatus.REJECTED) && node.status === 'ACTIVE') {
            findings.push({ code: 'ARCHIVED_SOURCE_MISMATCH', detail: node.sourceId });
        }
    }

    const activeEdges = edges.filter((edge) => !edge.archivedAt && !edge.validTo);
    const hasRel = (fromSource: string, type: GovernanceRelationshipType, toSource: string) =>
        activeEdges.some(
            (edge) =>
                edge.relationshipType === type &&
                `${edge.fromNode.sourceModel}:${edge.fromNode.sourceId}` === fromSource &&
                `${edge.toNode.sourceModel}:${edge.toNode.sourceId}` === toSource
        );

    for (const vendor of vendors) {
        if (!hasRel(`Organization:${organizationId}`, GovernanceRelationshipType.OWNS, `Vendor:${vendor.id}`)) {
            findings.push({ code: 'MISSING_PROVEN_RELATION', detail: `OWNS:${vendor.id}` });
        }
    }
    for (const assessment of assessments) {
        if (!hasRel(`Vendor:${assessment.vendorId}`, GovernanceRelationshipType.ASSESSED_BY, `VendorAssessment:${assessment.id}`)) {
            findings.push({ code: 'MISSING_PROVEN_RELATION', detail: `ASSESSED_BY:${assessment.id}` });
        }
    }

    await auditGraph({
        organizationId,
        actorUserId,
        action: 'governance.reconcile',
        resourceType: 'GovernanceGraph',
        resourceId: organizationId,
        metadata: { findingCount: findings.length, codes: Array.from(new Set(findings.map((item) => item.code))) },
    });

    return {
        organizationId,
        findingCount: findings.length,
        findings,
        inventedRelationships: false,
    };
}

export const governanceGraphService = {
    ensureNode,
    createRelationship,
    archiveRelationship,
    approveSuggestedRelationship,
    findRelationship,
    findNodeBySource,
    getNode,
    neighbors,
    pathBetween,
    lineage,
    impact,
    searchNodes,
    summary,
    exportGraph,
    backfillOrganization,
    applySourceLifecycle,
    reconcileOrganization,
};
