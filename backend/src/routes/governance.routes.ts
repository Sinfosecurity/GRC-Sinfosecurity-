import { Router, Response, NextFunction } from 'express';
import {
    GovernanceAuthority,
    GovernanceNodeType,
    GovernanceProvenance,
    GovernanceRelationshipType,
} from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';
import { governanceGraphService } from '../services/governanceGraphService';
import { GRAPH_MAX_DEPTH } from '../services/governanceGraphTaxonomy';
import { createCategoryLimiter } from '../middleware/rateLimiter';

const router = Router();
const graphLimiter = createCategoryLimiter('report');

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ApiError(400, `Invalid ${label}`);
    }
    return value as T;
}

function parseDepth(value: unknown) {
    if (value === undefined) return GRAPH_MAX_DEPTH;
    const depth = Number(value);
    if (!Number.isInteger(depth) || depth < 1) {
        throw new ApiError(400, 'Invalid depth');
    }
    return Math.min(depth, GRAPH_MAX_DEPTH);
}

router.use(graphLimiter);

router.get('/summary', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined);
        const existing = await governanceGraphService.summary(organizationId);
        if (existing.nodeCount === 0) {
            await governanceGraphService.backfillOrganization(organizationId, req.user!.id);
        }
        res.json({ success: true, data: existing.nodeCount === 0 ? await governanceGraphService.summary(organizationId) : existing });
    } catch (error) {
        next(error);
    }
});

router.get('/search', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined);
        const nodeType = parseEnum(req.query.nodeType, Object.values(GovernanceNodeType), 'nodeType');
        res.json({
            success: true,
            data: await governanceGraphService.searchNodes(organizationId, {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                nodeType,
                status: typeof req.query.status === 'string' ? req.query.status : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                offset: req.query.offset ? Number(req.query.offset) : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/export', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined);
        res.json({ success: true, data: await governanceGraphService.exportGraph(organizationId) });
    } catch (error) {
        next(error);
    }
});

router.post('/backfill', requirePermission(PERMISSIONS['governanceGraph.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, req.body?.organizationId);
        const data = await governanceGraphService.backfillOrganization(organizationId, req.user!.id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/reconcile', requirePermission(PERMISSIONS['governanceGraph.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, req.body?.organizationId);
        res.json({ success: true, data: await governanceGraphService.reconcileOrganization(organizationId, req.user!.id) });
    } catch (error) {
        next(error);
    }
});

router.get('/nodes/:nodeId', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        const node = await governanceGraphService.getNode(organizationId, req.params.nodeId);
        res.json({ success: true, data: node });
    } catch (error) {
        next(error);
    }
});

router.get('/nodes/:nodeId/relationships', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        const relationshipType = parseEnum(req.query.relationshipType, Object.values(GovernanceRelationshipType), 'relationshipType');
        res.json({
            success: true,
            data: await governanceGraphService.neighbors(organizationId, req.params.nodeId, {
                relationshipType,
                includeArchived: req.query.includeArchived === 'true',
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/nodes/:nodeId/neighbors', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({ success: true, data: await governanceGraphService.neighbors(organizationId, req.params.nodeId) });
    } catch (error) {
        next(error);
    }
});

router.get('/nodes/:nodeId/lineage', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({
            success: true,
            data: await governanceGraphService.lineage(organizationId, req.params.nodeId, parseDepth(req.query.depth)),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/nodes/:nodeId/impact', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({
            success: true,
            data: await governanceGraphService.impact(organizationId, req.params.nodeId, parseDepth(req.query.depth)),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/path', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        const fromNodeId = typeof req.query.fromNodeId === 'string' ? req.query.fromNodeId : '';
        const toNodeId = typeof req.query.toNodeId === 'string' ? req.query.toNodeId : '';
        if (!fromNodeId || !toNodeId) {
            throw new ApiError(400, 'fromNodeId and toNodeId are required');
        }
        res.json({
            success: true,
            data: await governanceGraphService.pathBetween(organizationId, fromNodeId, toNodeId, parseDepth(req.query.depth)),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/edges/:edgeId', requirePermission(PERMISSIONS['governanceGraph.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({ success: true, data: await governanceGraphService.findRelationship(organizationId, req.params.edgeId) });
    } catch (error) {
        next(error);
    }
});

router.post('/relationships', requirePermission(PERMISSIONS['governanceGraph.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        rejectClientTenantOverride(organizationId, req.body?.organizationId);
        const relationshipType = parseEnum(req.body?.relationshipType, Object.values(GovernanceRelationshipType), 'relationshipType');
        const provenance = parseEnum(req.body?.provenance, Object.values(GovernanceProvenance), 'provenance');
        const authority = parseEnum(req.body?.authority, Object.values(GovernanceAuthority), 'authority');
        if (!relationshipType || !req.body?.fromNodeId || !req.body?.toNodeId) {
            throw new ApiError(400, 'fromNodeId, toNodeId, and relationshipType are required');
        }
        const result = await governanceGraphService.createRelationship({
            organizationId,
            fromNodeId: req.body.fromNodeId,
            toNodeId: req.body.toNodeId,
            relationshipType,
            provenance: provenance || GovernanceProvenance.USER,
            authority,
            isDerived: req.body?.isDerived,
            createdBy: req.user!.id,
        });
        res.status(result.created ? 201 : 200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/relationships/:edgeId/archive', requirePermission(PERMISSIONS['governanceGraph.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({
            success: true,
            data: await governanceGraphService.archiveRelationship({
                organizationId,
                edgeId: req.params.edgeId,
                actorUserId: req.user!.id,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/relationships/:edgeId/approve', requirePermission(PERMISSIONS['governanceGraph.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = requireTenant(req.user);
        res.json({
            success: true,
            data: await governanceGraphService.approveSuggestedRelationship({
                organizationId,
                edgeId: req.params.edgeId,
                actorUserId: req.user!.id,
            }),
        });
    } catch (error) {
        next(error);
    }
});

export default router;
