import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS, hasPermission } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { renderPrivacyBoardPptx, renderPrivacyPdf, renderPrivacyWorkbook } from '../reports/enterprisePrivacyReports';
import { downloadFilename, sendBinaryFile } from '../reports/sendDownload';
import { reportLimiter } from '../middleware/rateLimiter';
import { canExportReport, reportDenialReason } from '../security/reportAuthorization';

const router = Router();

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

function identity(req: AuthRequest) {
    return hasPermission(req.user?.role, PERMISSIONS['rightsRequest.manage']);
}

function assertExport(req: AuthRequest, kind: 'operational' | 'board') {
    if (!canExportReport(req.user?.role, kind)) {
        throw new ApiError(403, reportDenialReason(req.user?.role, kind) || 'Export is not permitted for this role.');
    }
}

router.get('/catalog', requirePermission(PERMISSIONS['privacy.read']), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: enterprisePrivacyService.catalog() });
    } catch (error) {
        next(error);
    }
});

router.get('/dashboard', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.dashboard(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/data-map', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterprisePrivacyService.dataMap(orgId(req, req.query.organizationId), {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                dataKind: typeof req.query.dataKind === 'string' ? req.query.dataKind : undefined,
                jurisdiction: typeof req.query.jurisdiction === 'string' ? req.query.jurisdiction : undefined,
                transfer: typeof req.query.transfer === 'string' ? req.query.transfer : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/activities', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterprisePrivacyService.listActivities(orgId(req, req.query.organizationId), {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                status: typeof req.query.status === 'string' ? req.query.status : undefined,
                jurisdiction: typeof req.query.jurisdiction === 'string' ? req.query.jurisdiction : undefined,
                dataKind: typeof req.query.dataKind === 'string' ? req.query.dataKind : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/activities', requirePermission(PERMISSIONS['processingActivity.create'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterprisePrivacyService.createActivity(orgId(req, req.body.organizationId), req.user?.userId || null, req.body);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.get('/activities/:publicId', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.getActivity(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.patch('/activities/:publicId', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.updateActivity(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/purposes', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addPurpose(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/basis', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addBasis(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/data', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addData(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/subjects', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addSubject(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/parties', requirePermission(PERMISSIONS['processingActivity.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addParty(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/activities/:publicId/links', requirePermission(PERMISSIONS['privacy.manage'], PERMISSIONS['processingActivity.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterprisePrivacyService.linkAuthoritative(orgId(req, req.body.organizationId), req.user?.userId || null, {
                activityPublicId: req.params.publicId,
                targetType: req.body.targetType,
                targetId: req.body.targetId,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/transfers', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listTransfers(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/transfers', requirePermission(PERMISSIONS['transfer.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createTransfer(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/transfers/:publicId/assessments', requirePermission(PERMISSIONS['transfer.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createTransferAssessment(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/dpias', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listDpias(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/dpias', requirePermission(PERMISSIONS['dpia.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createDpia(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/dpias/:publicId/decision', requirePermission(PERMISSIONS['dpia.approve'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.decideDpia(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/rights', requirePermission(PERMISSIONS['rightsRequest.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listRights(orgId(req, req.query.organizationId), false) });
    } catch (error) {
        next(error);
    }
});

router.post('/rights', requirePermission(PERMISSIONS['rightsRequest.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createRights(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/rights/:publicId', requirePermission(PERMISSIONS['rightsRequest.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.getRights(orgId(req, req.query.organizationId), req.params.publicId, identity(req)) });
    } catch (error) {
        next(error);
    }
});

router.patch('/rights/:publicId', requirePermission(PERMISSIONS['rightsRequest.manage'], PERMISSIONS['privacy.manage'], PERMISSIONS['rightsRequest.approve']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.updateRights(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/rights/:publicId/tasks', requirePermission(PERMISSIONS['rightsRequest.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.addRightsTask(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/retention', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listRetention(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/retention', requirePermission(PERMISSIONS['retention.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createRetention(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/deletions', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listDeletions(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/deletions', requirePermission(PERMISSIONS['retention.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createDeletion(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.patch('/deletions/:publicId', requirePermission(PERMISSIONS['retention.manage'], PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.updateDeletion(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/consent', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listConsent(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/consent', requirePermission(PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createConsent(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/consent/:publicId/withdraw', requirePermission(PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.withdrawConsent(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null) });
    } catch (error) {
        next(error);
    }
});

router.post('/notices', requirePermission(PERMISSIONS['privacy.manage'], PERMISSIONS['processingActivity.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.createNotice(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/incidents', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listIncidents(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/incidents', requirePermission(PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterprisePrivacyService.linkIncident(orgId(req, req.body.organizationId), req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/incidents/:publicId/decision', requirePermission(PERMISSIONS['privacy.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.decideIncident(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.listVendorPrivacy(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.vendorPrivacy(orgId(req, req.query.organizationId), req.params.vendorId) });
    } catch (error) {
        next(error);
    }
});

router.get('/affected', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const kind = req.query.kind === 'vendor' ? 'vendor' : 'activity';
        const id = String(req.query.id || '');
        res.json({ success: true, data: await enterprisePrivacyService.whatIsAffected(orgId(req, req.query.organizationId), kind, id) });
    } catch (error) {
        next(error);
    }
});

router.post('/import/preview', requirePermission(PERMISSIONS['privacy.manage'], PERMISSIONS['processingActivity.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.previewImportForOrg(orgId(req, req.body.organizationId), req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.get('/import/template', requirePermission(PERMISSIONS['privacy.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        orgId(req, req.query.organizationId);
        res.json({ success: true, data: enterprisePrivacyService.importTemplate() });
    } catch (error) {
        next(error);
    }
});

router.post('/import/commit', requirePermission(PERMISSIONS['privacy.manage'], PERMISSIONS['processingActivity.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterprisePrivacyService.commitImport(orgId(req, req.body.organizationId), req.user?.userId || null, req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.get('/export/:format', requirePermission(PERMISSIONS['privacy.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'operational');
        const format = req.params.format === 'xlsx' ? 'xlsx' : 'csv';
        const { buffer, filenameParts } = await renderPrivacyWorkbook(orgId(req, req.query.organizationId), format);
        sendBinaryFile(res, buffer, format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', downloadFilename(filenameParts, format));
    } catch (error) {
        next(error);
    }
});

router.get('/reports/board.pptx', requirePermission(PERMISSIONS['privacy.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'board');
        const { buffer, filenameParts } = await renderPrivacyBoardPptx(orgId(req, req.query.organizationId));
        sendBinaryFile(res, buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', downloadFilename(filenameParts, 'pptx'));
    } catch (error) {
        next(error);
    }
});

router.get('/reports/:kind.pdf', requirePermission(PERMISSIONS['privacy.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const kind = req.params.kind;
        assertExport(req, kind === 'board' || kind === 'executive' ? 'board' : 'operational');
        const buffer = await renderPrivacyPdf(orgId(req, req.query.organizationId), kind);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-Privacy', kind], 'pdf'));
    } catch (error) {
        next(error);
    }
});

export default router;
