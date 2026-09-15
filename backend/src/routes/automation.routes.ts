import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { supremeAutomationService } from '../services/supremeAutomationService';
import { automationLimiter, automationWriteLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(automationLimiter);

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

function actor(req: AuthRequest) {
    return req.user?.id || '';
}

router.get('/catalog', requirePermission(PERMISSIONS['automation.read']), async (_req, res, next) => {
    try {
        res.json({ success: true, data: supremeAutomationService.catalog() });
    } catch (error) { next(error); }
});

router.get('/workspace', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.workspace(orgId(req, req.query.organizationId)) });
    } catch (error) { next(error); }
});

router.get('/templates', requirePermission(PERMISSIONS['automation.read']), async (_req, res, next) => {
    try {
        res.json({ success: true, data: supremeAutomationService.catalog().templates });
    } catch (error) { next(error); }
});

router.get('/recommendations', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.recommendations(orgId(req, req.query.organizationId)) });
    } catch (error) { next(error); }
});

router.get('/executions', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supremeAutomationService.executions(orgId(req, req.query.organizationId), {
                status: typeof req.query.status === 'string' ? req.query.status : undefined,
                domain: typeof req.query.domain === 'string' ? req.query.domain : undefined,
                automation: typeof req.query.automation === 'string' ? req.query.automation : undefined,
            }),
        });
    } catch (error) { next(error); }
});

router.get('/executions/:publicId', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.execution(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) { next(error); }
});

router.post('/executions/:publicId/retry', automationWriteLimiter, requirePermission(PERMISSIONS['automation.retry']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.retry(orgId(req, req.body?.organizationId), req.params.publicId, actor(req)) });
    } catch (error) { next(error); }
});

router.get('/', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.list(orgId(req, req.query.organizationId)) });
    } catch (error) { next(error); }
});

router.post('/', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await supremeAutomationService.create(orgId(req, req.body?.organizationId), actor(req), req.body || {}) });
    } catch (error) { next(error); }
});

router.get('/:publicId', requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.get(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) { next(error); }
});

router.patch('/:publicId', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.saveDraft(orgId(req, req.body?.organizationId), req.params.publicId, actor(req), req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/:publicId/publish', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.publish(orgId(req, req.body?.organizationId), req.params.publicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/:publicId/pause', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.pause(orgId(req, req.body?.organizationId), req.params.publicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/:publicId/resume', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.resume(orgId(req, req.body?.organizationId), req.params.publicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/:publicId/archive', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.archive(orgId(req, req.body?.organizationId), req.params.publicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/:publicId/preview', automationWriteLimiter, requirePermission(PERMISSIONS['automation.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await supremeAutomationService.preview(orgId(req, req.body?.organizationId), req.params.publicId, {
                sourceModel: String(req.body?.sourceModel || ''),
                sourceId: String(req.body?.sourceId || ''),
                event: typeof req.body?.event === 'string' ? req.body.event : undefined,
            }),
        });
    } catch (error) { next(error); }
});

router.post('/scan', automationWriteLimiter, requirePermission(PERMISSIONS['automation.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await supremeAutomationService.scan(orgId(req, req.body?.organizationId)) });
    } catch (error) { next(error); }
});

export default router;
