import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { enterpriseIntelligenceService } from '../services/enterpriseIntelligenceService';
import { renderIntelligencePdf } from '../reports/enterpriseIntelligenceReports';
import { downloadFilename, sendBinaryFile } from '../reports/sendDownload';
import { reportLimiter, intelligenceLimiter } from '../middleware/rateLimiter';
import { canExportReport, reportDenialReason } from '../security/reportAuthorization';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

router.use(intelligenceLimiter);

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

function actor(req: AuthRequest) {
    return req.user?.id;
}

function role(req: AuthRequest) {
    return req.user?.role || 'VIEWER';
}

function assertExport(req: AuthRequest, kind: 'operational' | 'board') {
    if (!canExportReport(req.user?.role, kind)) {
        throw new ApiError(403, reportDenialReason(req.user?.role, kind) || 'Export is not permitted for this role.');
    }
}

router.get('/catalog', requirePermission(PERMISSIONS['intelligence.read']), async (_req, res, next) => {
    try {
        res.json({ success: true, data: enterpriseIntelligenceService.catalog() });
    } catch (error) { next(error); }
});

router.get('/workspace', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseIntelligenceService.workspace(orgId(req, req.query.organizationId), role(req), actor(req)) });
    } catch (error) { next(error); }
});

router.get('/teaser', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const started = Date.now();
        const data = await enterpriseIntelligenceService.teaser(orgId(req), role(req), actor(req));
        res.setHeader('Server-Timing', `teaser;dur=${Date.now() - started}`);
        res.json({ success: true, data });
    } catch (error) { next(error); }
});

router.get('/items', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseIntelligenceService.search(orgId(req), role(req), {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                priority: typeof req.query.priority === 'string' ? req.query.priority : undefined,
                domain: typeof req.query.domain === 'string' ? req.query.domain : undefined,
                status: typeof req.query.status === 'string' ? req.query.status : undefined,
                changeType: typeof req.query.changeType === 'string' ? req.query.changeType : undefined,
                current: typeof req.query.current === 'string' ? req.query.current : undefined,
                actorUserId: actor(req),
            }),
        });
    } catch (error) { next(error); }
});

router.get('/items/:publicId', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseIntelligenceService.get(orgId(req), req.params.publicId, role(req), actor(req)) });
    } catch (error) { next(error); }
});

router.post('/items/:publicId/acknowledge', requirePermission(PERMISSIONS['intelligence.acknowledge']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const nextState = req.body?.lifecycle === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'ACKNOWLEDGED';
        res.json({ success: true, data: await enterpriseIntelligenceService.acknowledge(orgId(req), req.params.publicId, actor(req) || '', nextState) });
    } catch (error) { next(error); }
});

router.get('/items/:publicId/narrative', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseIntelligenceService.narrative(orgId(req), req.params.publicId, role(req), actor(req)) });
    } catch (error) { next(error); }
});

router.get('/external', requirePermission(PERMISSIONS['intelligence.read']), async (_req, res, next) => {
    try {
        res.json({ success: true, data: { status: 'NOT_CONFIGURED', message: 'External intelligence not configured' } });
    } catch (error) { next(error); }
});

router.get('/executive', requirePermission(PERMISSIONS['intelligence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const workspace = await enterpriseIntelligenceService.workspace(orgId(req), role(req), actor(req));
        res.json({
            success: true,
            data: {
                honesty: workspace.honesty,
                executive: workspace.executive,
                period: workspace.period,
                decisionsToWatch: workspace.decisionsToWatch,
                positiveMovement: workspace.positiveMovement,
                externalIntelligence: workspace.externalIntelligence,
            },
        });
    } catch (error) { next(error); }
});

router.get('/reports/:kind.pdf', reportLimiter, requirePermission(PERMISSIONS['intelligence.report']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'operational');
        const buffer = await renderIntelligencePdf(orgId(req), role(req), actor(req), req.params.kind);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-Intelligence-Brief'], 'pdf'));
    } catch (error) { next(error); }
});

export default router;
