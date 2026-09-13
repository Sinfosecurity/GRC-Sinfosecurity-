import { Router, Response, NextFunction } from 'express';
import {
    ComplianceApplicability,
    ComplianceAttestationReviewStatus,
    ComplianceAttestationStatus,
    ComplianceExceptionType,
    ComplianceGapSource,
    ComplianceGapStatus,
    CompliancePeriodItemType,
} from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';
import { enterpriseComplianceService } from '../services/enterpriseComplianceService';
import { renderComplianceBoardPptx, renderCompliancePdf, renderComplianceWorkbook } from '../reports/enterpriseComplianceReports';
import { downloadFilename, sendBinaryFile } from '../reports/sendDownload';
import { reportLimiter } from '../middleware/rateLimiter';
import { canExportReport, reportDenialReason } from '../security/reportAuthorization';

const router = Router();

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ApiError(400, `Invalid ${label}`);
    }
    return value as T;
}

router.get('/dashboard', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.dashboard(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/catalog', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.catalog(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.catalog(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/activations', requirePermission(PERMISSIONS['framework.activate']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.activate(orgId(req, req.body.organizationId), req.user?.userId || null, {
            frameworkVersionId: req.body.frameworkVersionId,
            scope: req.body.scope,
            ownerUserId: req.body.ownerUserId,
            businessUnitId: req.body.businessUnitId,
            startDate: req.body.startDate,
            targetDate: req.body.targetDate,
            status: req.body.status,
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.get('/activations/:publicId', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.getActivation(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.post('/activations/:publicId/gaps/refresh', requirePermission(PERMISSIONS['compliance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.refreshGaps(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null) });
    } catch (error) {
        next(error);
    }
});

router.post('/activations/:publicId/version', requirePermission(PERMISSIONS['framework.activate']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.changeVersion(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body.frameworkVersionId, req.body.notes) });
    } catch (error) {
        next(error);
    }
});

router.get('/requirements', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.listRequirements(orgId(req, req.query.organizationId), {
                activationId: typeof req.query.activationId === 'string' ? req.query.activationId : undefined,
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                applicability: typeof req.query.applicability === 'string' ? req.query.applicability : undefined,
                owner: typeof req.query.owner === 'string' ? req.query.owner : undefined,
                unmapped: req.query.unmapped === '1' || req.query.unmapped === 'true',
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/requirements/:publicId', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.getRequirement(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.patch('/requirements/:publicId/applicability', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.setApplicability(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                applicability: parseEnum(req.body.applicability, Object.values(ComplianceApplicability), 'applicability'),
                rationale: req.body.rationale,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/requirements/:publicId/owner', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.setRequirementOwner(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body.ownerUserId || null),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/gaps', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.listGaps(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/gaps', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.createGap(orgId(req, req.body.organizationId), req.user?.userId || null, {
            ...req.body,
            source: parseEnum(req.body.source, Object.values(ComplianceGapSource), 'source'),
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.patch('/gaps/:publicId', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.updateGap(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                status: req.body.status ? parseEnum(req.body.status, Object.values(ComplianceGapStatus), 'status') : undefined,
                remediation: req.body.remediation,
                enterpriseRiskId: req.body.enterpriseRiskId,
                findingId: req.body.findingId,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/exceptions', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.listExceptions(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/exceptions', requirePermission(PERMISSIONS['exception.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.createException(orgId(req, req.body.organizationId), req.user?.userId || null, {
            ...req.body,
            type: parseEnum(req.body.type, Object.values(ComplianceExceptionType), 'type'),
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.post('/exceptions/:publicId/decision', requirePermission(PERMISSIONS['exception.approve']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.decideException(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                decision: parseEnum(req.body.decision, ['APPROVED', 'REJECTED', 'CLOSED'] as const, 'decision'),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/campaigns', requirePermission(PERMISSIONS['compliance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.createCampaign(orgId(req, req.body.organizationId), req.user?.userId || null, req.body);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.get('/campaigns/:publicId', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.getCampaign(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.post('/attestations', requirePermission(PERMISSIONS['requirement.attest']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.userId) throw new ApiError(401, 'Authentication required');
        const created = await enterpriseComplianceService.attest(orgId(req, req.body.organizationId), req.user.userId, {
            ...req.body,
            status: parseEnum(req.body.status, Object.values(ComplianceAttestationStatus), 'status'),
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.post('/attestations/:publicId/review', requirePermission(PERMISSIONS['attestation.review']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseComplianceService.reviewAttestation(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                reviewStatus: parseEnum(req.body.reviewStatus, Object.values(ComplianceAttestationReviewStatus), 'reviewStatus'),
                reviewNotes: req.body.reviewNotes,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/periods', requirePermission(PERMISSIONS['audit.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.createPeriod(orgId(req, req.body.organizationId), req.user?.userId || null, req.body);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.get('/periods/:publicId', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.getPeriod(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.post('/periods/:publicId/items', requirePermission(PERMISSIONS['audit.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const created = await enterpriseComplianceService.addPeriodItem(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
            ...req.body,
            itemType: parseEnum(req.body.itemType, Object.values(CompliancePeriodItemType), 'itemType'),
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.patch('/period-items/:itemId', requirePermission(PERMISSIONS['audit.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.updatePeriodItem(orgId(req, req.body.organizationId), req.params.itemId, req.body) });
    } catch (error) {
        next(error);
    }
});

router.get('/cross-framework', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.crossFramework(orgId(req, req.query.organizationId), typeof req.query.controlId === 'string' ? req.query.controlId : undefined) });
    } catch (error) {
        next(error);
    }
});

router.get('/evidence/:storedObjectId/reuse', requirePermission(PERMISSIONS['compliance.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.evidenceReuse(orgId(req, req.query.organizationId), req.params.storedObjectId) });
    } catch (error) {
        next(error);
    }
});

router.get('/owners', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.owners(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/import/preview', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.previewImport(orgId(req, req.body.organizationId), req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.post('/import/commit', requirePermission(PERMISSIONS['requirement.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.commitImport(orgId(req, req.body.organizationId), req.user?.userId || null, req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.post('/gap-analysis', requirePermission(PERMISSIONS['compliance.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseComplianceService.refreshGaps(orgId(req, req.body.organizationId), req.body.frameworkId || req.body.activationId, req.user?.userId || null) });
    } catch (error) {
        next(error);
    }
});

function assertExport(req: AuthRequest, kind: 'operational' | 'board') {
    if (!canExportReport(req.user?.role, kind)) {
        throw new ApiError(403, reportDenialReason(req.user?.role, kind) || 'Export is not permitted for this role.');
    }
}

router.get('/export/:format', requirePermission(PERMISSIONS['compliance.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'operational');
        const format = req.params.format === 'xlsx' ? 'xlsx' : 'csv';
        const { buffer, filenameParts } = await renderComplianceWorkbook(orgId(req, req.query.organizationId), format);
        sendBinaryFile(res, buffer, format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', downloadFilename(filenameParts, format));
    } catch (error) {
        next(error);
    }
});

router.get('/reports/board.pptx', requirePermission(PERMISSIONS['compliance.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        assertExport(req, 'board');
        const { buffer, filenameParts } = await renderComplianceBoardPptx(orgId(req, req.query.organizationId));
        sendBinaryFile(res, buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', downloadFilename(filenameParts, 'pptx'));
    } catch (error) {
        next(error);
    }
});

router.get('/reports/:kind.pdf', requirePermission(PERMISSIONS['compliance.report']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const kind = req.params.kind;
        assertExport(req, kind === 'board' || kind === 'executive' ? 'board' : 'operational');
        const buffer = await renderCompliancePdf(orgId(req, req.query.organizationId), kind);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-Compliance', kind], 'pdf'));
    } catch (error) {
        next(error);
    }
});

export default router;
