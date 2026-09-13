import { Router, Response, NextFunction } from 'express';
import {
    EnterpriseAppetiteScope,
    EnterpriseDecisionType,
    EnterpriseKriDirection,
    EnterpriseRiskCategory,
    EnterpriseTreatmentStrategy,
} from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';
import { enterpriseRiskService } from '../services/enterpriseRiskService';
import { renderEnterpriseRiskPdf, renderEnterpriseRiskRegister } from '../reports/enterpriseRiskReports';
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

router.get('/dashboard', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.dashboard(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/risks', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await enterpriseRiskService.list(orgId(req, req.query.organizationId), {
                category: typeof req.query.category === 'string' ? req.query.category : undefined,
                rating: typeof req.query.rating === 'string' ? req.query.rating : undefined,
                appetite: typeof req.query.appetite === 'string' ? req.query.appetite : undefined,
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                likelihood: req.query.likelihood ? Number(req.query.likelihood) : undefined,
                impact: req.query.impact ? Number(req.query.impact) : undefined,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/risks/:publicId', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.get(orgId(req, req.query.organizationId), req.params.publicId) });
    } catch (error) {
        next(error);
    }
});

router.post('/risks', requirePermission(PERMISSIONS['risk.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = orgId(req, req.body.organizationId);
        const created = await enterpriseRiskService.create(organizationId, req.user?.userId || null, {
            title: req.body.title,
            statement: req.body.statement,
            description: req.body.description,
            category: parseEnum(req.body.category, Object.values(EnterpriseRiskCategory), 'category'),
            likelihood: Number(req.body.likelihood),
            impact: Number(req.body.impact),
            ownerUserId: req.body.ownerUserId,
            businessUnitId: req.body.businessUnitId,
            source: req.body.source,
            reviewDate: req.body.reviewDate,
            dimensions: req.body.dimensions,
        });
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        next(error);
    }
});

router.patch('/risks/:publicId', requirePermission(PERMISSIONS['risk.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.update(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, req.body) });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/archive', requirePermission(PERMISSIONS['risk.delete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.archive(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null) });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/controls', requirePermission(PERMISSIONS['risk.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.linkControl(orgId(req, req.body.organizationId), req.params.publicId, req.body.controlId, req.body.rationale, req.user?.userId || null),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/findings', requirePermission(PERMISSIONS['risk.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.linkFinding(orgId(req, req.body.organizationId), req.params.publicId, req.body.findingId, req.user?.userId || null),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/relationships', requirePermission(PERMISSIONS['risk.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.addRelationship(orgId(req, req.body.organizationId), req.params.publicId, req.body, req.user?.userId || null),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/treatments', requirePermission(PERMISSIONS['risk.treat']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.createTreatment(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                strategy: parseEnum(req.body.strategy, Object.values(EnterpriseTreatmentStrategy), 'strategy'),
                ownerUserId: req.body.ownerUserId,
                dueDate: req.body.dueDate,
                notes: req.body.notes,
                expectedTargetScore: req.body.expectedTargetScore,
                actions: req.body.actions,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/decisions', requirePermission(PERMISSIONS['risk.accept']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.decide(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                decision: parseEnum(req.body.decision, Object.values(EnterpriseDecisionType), 'decision'),
                rationale: req.body.rationale,
                authority: req.body.authority,
                conditions: req.body.conditions,
                expiresAt: req.body.expiresAt,
                approve: req.body.approve,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/risks/:publicId/kris', requirePermission(PERMISSIONS['kri.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.upsertKri(orgId(req, req.body.organizationId), req.params.publicId, req.user?.userId || null, {
                name: req.body.name,
                description: req.body.description,
                unit: req.body.unit,
                direction: parseEnum(req.body.direction, Object.values(EnterpriseKriDirection), 'direction'),
                warningThreshold: Number(req.body.warningThreshold),
                criticalThreshold: Number(req.body.criticalThreshold),
                ownerUserId: req.body.ownerUserId,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/kris/:publicId/measurements', requirePermission(PERMISSIONS['kri.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.measureKri(orgId(req, req.body.organizationId), req.params.publicId, Number(req.body.value), req.user?.userId || null),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/appetite', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.listAppetite(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/appetite', requirePermission(PERMISSIONS['risk.appetite.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({
            success: true,
            data: await enterpriseRiskService.setAppetite(orgId(req, req.body.organizationId), req.user?.userId || null, {
                scope: parseEnum(req.body.scope, Object.values(EnterpriseAppetiteScope), 'scope'),
                maxResidualRating: req.body.maxResidualRating,
                category: req.body.category,
                businessUnitId: req.body.businessUnitId,
                statement: req.body.statement,
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/business-units', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.listBusinessUnits(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.post('/business-units', requirePermission(PERMISSIONS['risk.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseRiskService.createBusinessUnit(orgId(req, req.body.organizationId), req.body.name) });
    } catch (error) {
        next(error);
    }
});

router.post('/import/preview', requirePermission(PERMISSIONS['risk.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.previewImport(orgId(req, req.body.organizationId), req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.post('/import/commit', requirePermission(PERMISSIONS['risk.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.status(201).json({ success: true, data: await enterpriseRiskService.commitImport(orgId(req, req.body.organizationId), req.user?.userId || null, req.body.rows || []) });
    } catch (error) {
        next(error);
    }
});

router.get('/export/:format', requirePermission(PERMISSIONS['report.export']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!canExportReport(req.user?.role, 'operational')) {
            throw new ApiError(403, reportDenialReason(req.user?.role, 'operational'));
        }
        const format = req.params.format === 'xlsx' ? 'xlsx' : 'csv';
        const file = await renderEnterpriseRiskRegister(orgId(req, req.query.organizationId), format);
        sendBinaryFile(res, file.buffer, format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', downloadFilename(file.filenameParts, format));
    } catch (error) {
        next(error);
    }
});

router.get('/reports/:kind.pdf', requirePermission(PERMISSIONS['report.export']), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!canExportReport(req.user?.role, 'operational')) {
            throw new ApiError(403, reportDenialReason(req.user?.role, 'operational'));
        }
        const buffer = await renderEnterpriseRiskPdf(orgId(req, req.query.organizationId), req.params.kind);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-Risk', req.params.kind], 'pdf'));
    } catch (error) {
        next(error);
    }
});

router.get('/impact/controls/:controlId', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await enterpriseRiskService.controlFailureImpact(orgId(req, req.query.organizationId), req.params.controlId) });
    } catch (error) {
        next(error);
    }
});

export default router;
