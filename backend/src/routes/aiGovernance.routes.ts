import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { enterpriseAiGovernanceService } from '../services/enterpriseAiGovernanceService';
import { renderAiBoardPptx, renderAiPdf, renderAiWorkbook } from '../reports/enterpriseAiGovernanceReports';
import { downloadFilename, sendBinaryFile } from '../reports/sendDownload';
import { reportLimiter } from '../middleware/rateLimiter';
import { canExportReport, reportDenialReason } from '../security/reportAuthorization';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

function actor(req: AuthRequest) {
    return req.user?.id;
}

function assertExport(req: AuthRequest, kind: 'operational' | 'board') {
    if (!canExportReport(req.user?.role, kind)) {
        throw new ApiError(403, reportDenialReason(req.user?.role, kind) || 'Export is not permitted for this role.');
    }
}

router.get('/catalog', requirePermission(PERMISSIONS['ai.read']), async (_req, res, next) => {
    try {
        res.json({ success: true, data: enterpriseAiGovernanceService.catalog() });
    } catch (error) { next(error); }
});

router.get('/dashboard', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.dashboard(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/systems', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listSystems(orgId(req), typeof req.query.q === 'string' ? req.query.q : undefined) });
    } catch (error) { next(error); }
});

router.post('/systems', requirePermission(PERMISSIONS['ai.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.createSystem(orgId(req, req.body?.organizationId), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.get('/systems/:publicId', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.getSystem(orgId(req), req.params.publicId) });
    } catch (error) { next(error); }
});

router.patch('/systems/:publicId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.updateSystem(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/use-cases', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.addUseCase(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.get('/use-cases/:publicId', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.getUseCase(orgId(req), req.params.publicId) });
    } catch (error) { next(error); }
});

router.get('/tests', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listTests(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/incidents', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listIncidents(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/assessments', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listAssessments(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/approvals', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listApprovals(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/regulatory-reviews', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listRegulatory(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/exceptions', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listExceptions(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/providers', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listProviders(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/providers/:publicId', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.getProvider(orgId(req), req.params.publicId) });
    } catch (error) { next(error); }
});

router.patch('/providers/:publicId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.updateProvider(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/providers', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordProvider(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.get('/controls', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.listAiControls(orgId(req)) });
    } catch (error) { next(error); }
});

router.get('/readiness/:frameworkKey', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.readiness(orgId(req), req.params.frameworkKey) });
    } catch (error) { next(error); }
});

router.get('/vendors/:vendorId', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.vendorLinks(orgId(req), req.params.vendorId) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/providers/:providerPublicId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.attachProvider(orgId(req), req.params.publicId, req.params.providerPublicId, actor(req), req.body || {}) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/versions', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.changeVersion(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/oversight', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.setOversight(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/risks', requirePermission(PERMISSIONS['ai.assess']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.addRisk(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/scores', requirePermission(PERMISSIONS['ai.assess']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.scoreSystem(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/assessments', requirePermission(PERMISSIONS['ai.assess']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.createAssessment(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/assessments/:publicId/decision', requirePermission(PERMISSIONS['ai.assess']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.decideAssessment(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/tests', requirePermission(PERMISSIONS['ai.test']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordTest(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/approvals', requirePermission(PERMISSIONS['ai.approve']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.approve(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/incidents', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordIncident(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/incidents/:publicId/close', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.closeIncident(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/exceptions', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordException(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/regulatory-reviews', requirePermission(PERMISSIONS['ai.regulatoryReview']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordRegulatoryReview(orgId(req), req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/controls/:controlId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.linkControl(orgId(req), req.params.publicId, req.params.controlId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/privacy/:activityPublicId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.linkPrivacy(orgId(req), req.params.publicId, req.params.activityPublicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/risks/enterprise/:riskPublicId', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.linkRisk(orgId(req), req.params.publicId, req.params.riskPublicId, actor(req)) });
    } catch (error) { next(error); }
});

router.post('/systems/:publicId/changes', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseAiGovernanceService.recordChange(orgId(req), req.params.publicId, req.body || {}, actor(req)) });
    } catch (error) { next(error); }
});

router.get('/systems/:publicId/affected', requirePermission(PERMISSIONS['ai.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.affected(orgId(req), req.params.publicId) });
    } catch (error) { next(error); }
});

router.post('/import/preview', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.importPreview(req.body?.rows || []) });
    } catch (error) { next(error); }
});

router.post('/import/commit', requirePermission(PERMISSIONS['ai.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseAiGovernanceService.importCommit(orgId(req), req.body?.rows || [], actor(req)) });
    } catch (error) { next(error); }
});

router.get('/reports/:kind.pdf', reportLimiter, requirePermission(PERMISSIONS['ai.report']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const kind = req.params.kind;
        assertExport(req, kind === 'board' || kind === 'executive' ? 'board' : 'operational');
        const buffer = await renderAiPdf(orgId(req), kind);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-AI', kind], 'pdf'));
    } catch (error) { next(error); }
});

router.get('/reports/board.pptx', reportLimiter, requirePermission(PERMISSIONS['ai.report']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'board');
        const result = await renderAiBoardPptx(orgId(req));
        sendBinaryFile(res, result.buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', downloadFilename(result.filenameParts, 'pptx'));
    } catch (error) { next(error); }
});

router.get('/export/:format', requirePermission(PERMISSIONS['ai.report']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'operational');
        const format = req.params.format === 'csv' ? 'csv' : 'xlsx';
        const result = await renderAiWorkbook(orgId(req), format);
        sendBinaryFile(res, result.buffer, format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', downloadFilename(result.filenameParts, format));
    } catch (error) { next(error); }
});

export default router;
