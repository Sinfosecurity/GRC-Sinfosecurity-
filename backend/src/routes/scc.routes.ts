import { Router, Response, NextFunction } from 'express';
import {
    ControlEffectivenessStatus,
    ControlImplementationStatus,
    ControlLifecycleStatus,
    EvidenceFreshness,
    EvidenceGovernanceTarget,
    EvidenceLinkRelation,
    EvidenceReviewStatus,
    SharedControlTestMethod,
    SharedControlTestResult,
} from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { requireTenant, rejectClientTenantOverride } from '../security/tenant';
import { ApiError } from '../middleware/errorHandler';
import { sharedControlEvidenceService } from '../services/sharedControlEvidenceService';
import { renderSharedControlReport } from '../reports/sharedControlReports';
import { downloadFilename, sendBinaryFile } from '../reports/sendDownload';
import { reportLimiter } from '../middleware/rateLimiter';
import { canExportReport, reportDenialReason } from '../security/reportAuthorization';
import { organizationHasProductFeature } from '../middleware/entitlement';
import { billingStatus } from '../billing/stripeBillingService';
import { prisma } from '../config/database';

const router = Router();

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ApiError(400, `Invalid ${label}`);
    }
    return value as T;
}

function orgId(req: AuthRequest, candidate?: unknown) {
    const organizationId = requireTenant(req.user);
    rejectClientTenantOverride(organizationId, typeof candidate === 'string' ? candidate : undefined);
    return organizationId;
}

router.get('/summary', requirePermission(PERMISSIONS['control.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await sharedControlEvidenceService.controlCenterSummary(orgId(req, req.query.organizationId)) });
    } catch (error) {
        next(error);
    }
});

router.get('/controls', requirePermission(PERMISSIONS['control.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = orgId(req, req.query.organizationId);
        res.json({
            success: true,
            data: await sharedControlEvidenceService.listControls(organizationId, {
                q: typeof req.query.q === 'string' ? req.query.q : undefined,
                domain: typeof req.query.domain === 'string' ? req.query.domain : undefined,
                implementationStatus: parseEnum(req.query.implementationStatus, Object.values(ControlImplementationStatus), 'implementationStatus'),
                effectivenessStatus: parseEnum(req.query.effectivenessStatus, Object.values(ControlEffectivenessStatus), 'effectivenessStatus'),
            }),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/controls/:controlId', requirePermission(PERMISSIONS['control.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await sharedControlEvidenceService.getControl(orgId(req, req.query.organizationId), req.params.controlId) });
    } catch (error) {
        next(error);
    }
});

router.patch('/controls/:controlId', requirePermission(PERMISSIONS['control.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = orgId(req, req.body?.organizationId);
        const data = await sharedControlEvidenceService.updateControl(organizationId, req.params.controlId, req.user!.id, {
            implementationStatus: parseEnum(req.body?.implementationStatus, Object.values(ControlImplementationStatus), 'implementationStatus'),
            effectivenessStatus: parseEnum(req.body?.effectivenessStatus, Object.values(ControlEffectivenessStatus), 'effectivenessStatus'),
            ownerUserId: req.body?.ownerUserId === undefined ? undefined : req.body.ownerUserId,
            reviewerUserId: req.body?.reviewerUserId === undefined ? undefined : req.body.reviewerUserId,
            frequency: req.body?.frequency === undefined ? undefined : req.body.frequency,
            nextTestAt: req.body?.nextTestAt ? new Date(req.body.nextTestAt) : req.body?.nextTestAt === null ? null : undefined,
            status: parseEnum(req.body?.status, Object.values(ControlLifecycleStatus), 'status'),
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/controls/:controlId/tests', requirePermission(PERMISSIONS['control.test']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const method = parseEnum(req.body?.method, Object.values(SharedControlTestMethod), 'method');
        const result = parseEnum(req.body?.result, Object.values(SharedControlTestResult), 'result');
        if (!method || !result) throw new ApiError(400, 'method and result are required');
        const data = await sharedControlEvidenceService.recordControlTest({
            organizationId: orgId(req, req.body?.organizationId),
            actorUserId: req.user!.id,
            controlId: req.params.controlId,
            method,
            procedure: req.body?.procedure,
            result,
            notes: req.body?.notes,
            nextTestAt: req.body?.nextTestAt ? new Date(req.body.nextTestAt) : undefined,
            findingId: req.body?.findingId || null,
            createFinding: Boolean(req.body?.createFinding),
            findingTitle: req.body?.findingTitle,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/frameworks', requirePermission(PERMISSIONS['framework.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await sharedControlEvidenceService.listFrameworkCoverage(
                orgId(req, req.query.organizationId),
                typeof req.query.frameworkKey === 'string' ? req.query.frameworkKey : undefined
            ),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/evidence', requirePermission(PERMISSIONS['evidence.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await sharedControlEvidenceService.searchReusableEvidence(
                orgId(req, req.query.organizationId),
                typeof req.query.q === 'string' ? req.query.q : undefined
            ),
        });
    } catch (error) {
        next(error);
    }
});

router.post('/evidence/links', requirePermission(PERMISSIONS['evidence.link']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const relationship = parseEnum(req.body?.relationship, Object.values(EvidenceLinkRelation), 'relationship');
        const targetType = parseEnum(req.body?.targetType, Object.values(EvidenceGovernanceTarget), 'targetType');
        if (!relationship || !targetType || !req.body?.storedObjectId || !req.body?.targetId) {
            throw new ApiError(400, 'storedObjectId, targetType, targetId, and relationship are required');
        }
        const data = await sharedControlEvidenceService.linkEvidence({
            organizationId: orgId(req, req.body?.organizationId),
            actorUserId: req.user!.id,
            storedObjectId: req.body.storedObjectId,
            targetType,
            targetId: req.body.targetId,
            relationship,
            rationale: req.body.rationale || '',
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
            issuedAt: req.body.issuedAt ? new Date(req.body.issuedAt) : undefined,
            effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : undefined,
            reviewDueAt: req.body.reviewDueAt ? new Date(req.body.reviewDueAt) : undefined,
            freshness: parseEnum(req.body?.freshness, Object.values(EvidenceFreshness), 'freshness'),
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/evidence/links/:linkId/review', requirePermission(PERMISSIONS['evidence.review']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const reviewStatus = parseEnum(req.body?.reviewStatus, Object.values(EvidenceReviewStatus), 'reviewStatus');
        if (!reviewStatus) throw new ApiError(400, 'reviewStatus is required');
        const data = await sharedControlEvidenceService.reviewEvidenceLink(
            orgId(req, req.body?.organizationId),
            req.params.linkId,
            req.user!.id,
            {
                reviewStatus,
                freshness: parseEnum(req.body?.freshness, Object.values(EvidenceFreshness), 'freshness'),
            }
        );
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/evidence/links/:linkId/unlink', requirePermission(PERMISSIONS['evidence.link']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await sharedControlEvidenceService.unlinkEvidence(
            orgId(req, req.body?.organizationId),
            req.params.linkId,
            req.user!.id,
            typeof req.body?.reason === 'string' ? req.body.reason : undefined
        );
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/evidence/:storedObjectId/impact', requirePermission(PERMISSIONS['control.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: await sharedControlEvidenceService.evidenceImpact(orgId(req, req.query.organizationId), req.params.storedObjectId),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/reports/:kind', reportLimiter, requirePermission(PERMISSIONS['report.export']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const kind = req.params.kind;
        if (!['control-coverage', 'evidence-coverage', 'framework-readiness', 'control-testing'].includes(kind)) {
            throw new ApiError(404, 'Report not found');
        }
        const organizationId = orgId(req, req.query.organizationId);
        if (!canExportReport(req.user!.role, 'operational')) {
            throw new ApiError(403, reportDenialReason(req.user!.role, 'operational') || 'Report download is not available for this role');
        }
        if (billingStatus() === 'CONNECTED') {
            const organization = await prisma.organization.findUnique({
                where: { id: organizationId },
                select: { plan: true, isDemo: true },
            });
            if (!organizationHasProductFeature(organization, 'advancedReporting')) {
                throw new ApiError(403, 'This report is not included in the current subscription. Contact your organization administrator if you expected access.');
            }
        }
        const format = typeof req.query.format === 'string' ? req.query.format : 'json';
        const report = await sharedControlEvidenceService.coverageReport(organizationId);
        if (format === 'json') {
            res.json({ success: true, data: report });
            return;
        }
        if (format !== 'pdf') throw new ApiError(400, 'Supported formats are json and pdf');
        const buffer = await renderSharedControlReport(kind, report);
        sendBinaryFile(res, buffer, 'application/pdf', downloadFilename(['Supreme-Risk', kind], 'pdf'));
    } catch (error) {
        next(error);
    }
});

export default router;
