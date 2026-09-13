import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { VendorDocumentType, IssueSeverity, VendorIssueStatus } from '@prisma/client';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { ApiError } from '../middleware/errorHandler';
import vendorAssessmentService from '../services/vendorAssessmentService';
import vendorIssueService from '../services/vendorIssueService';
import { listTemplates } from '../services/questionnaireService';
import { evidenceLinkageService } from '../services/evidenceLinkageService';
import { scoringMethodologyService } from '../services/scoringMethodologyService';
import { reportGenerationService } from '../reports/reportGenerationService';
import type { ReportFilters } from '../reports/portfolioData';
import { prisma } from '../config/database';
import { reportLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { notifyUser } from '../services/notificationDeliveryService';
import { requireEntitlement, privateBetaUnlocks } from '../middleware/entitlement';
import { canExportReport, reportDenialReason, type ReportKind } from '../security/reportAuthorization';
import { assertEntitlement } from '../billing/plans';
import { ensureSupremeLibrary, recommendAssessments } from '../services/questionnaireLibrary';
import { cloneTemplate } from '../services/questionnaireService';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();

function actor(req: AuthRequest) {
    return { organizationId: req.user!.organizationId, userId: req.user!.id };
}

function requireReportKind(kind: ReportKind) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!canExportReport(req.user?.role, kind)) {
            return next(new ApiError(403, reportDenialReason(req.user?.role, kind) || 'Download is not available for this role.'));
        }
        return next();
    };
}

function filters(req: AuthRequest): ReportFilters {
    return {
        vendorId: typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined,
        from: typeof req.query.from === 'string' ? new Date(req.query.from) : undefined,
        to: typeof req.query.to === 'string' ? new Date(req.query.to) : undefined,
    };
}

router.get('/questionnaires', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await ensureSupremeLibrary();
        const templates = await listTemplates(req.user!.organizationId);
        res.json({ success: true, data: templates });
    } catch (error) {
        next(error);
    }
});

router.post('/questionnaires/:templateId/clone', requirePermission(PERMISSIONS['questionnaire.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await cloneTemplate(req.user!.organizationId, req.params.templateId, req.body?.name);
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/assessments/recommendations', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const vendorId = String(req.query.vendorId || '');
        if (!vendorId) throw new ApiError(400, 'Select a vendor to see recommended assessments.');
        res.json({ success: true, data: await recommendAssessments(req.user!.organizationId, vendorId) });
    } catch (error) {
        next(error);
    }
});

router.get('/reports/capabilities', requirePermission(PERMISSIONS['report.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organization = await prisma.organization.findUnique({
            where: { id: req.user!.organizationId },
            select: { plan: true, isDemo: true },
        });
        const entitled = Boolean(organization?.isDemo && privateBetaUnlocks('advancedReporting'))
            || assertEntitlement(organization?.plan, 'advancedReporting');
        const operationalReason = !entitled
            ? 'This download is not included in the current plan. Private-beta tester organizations can export reports.'
            : reportDenialReason(req.user!.role, 'operational');
        const boardReason = !entitled
            ? 'This download is not included in the current plan. Private-beta tester organizations can export reports.'
            : reportDenialReason(req.user!.role, 'board');
        res.json({
            success: true,
            data: {
                plan: organization?.plan || 'STARTER',
                isDemo: Boolean(organization?.isDemo),
                entitled,
                canExportOperational: entitled && canExportReport(req.user!.role, 'operational'),
                canExportBoard: entitled && canExportReport(req.user!.role, 'board'),
                operationalReason,
                boardReason,
            },
        });
    } catch (error) {
        next(error);
    }
});

router.get('/assessments', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorAssessmentService.listOrganizationAssessments(req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/assessments', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorAssessmentService.listVendorAssessments(req.params.vendorId, req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/assessments', requirePermission(PERMISSIONS['assessment.create']), requireEntitlement('assessments'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorAssessmentService.createAssessment({
            vendorId: req.params.vendorId,
            organizationId: req.user!.organizationId,
            assessmentType: req.body.assessmentType || 'INITIAL_DUE_DILIGENCE',
            frameworkUsed: req.body.frameworkUsed,
            assignedTo: req.body.assignedTo,
            dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
            templateId: req.body.templateId,
        });
        await notifyUser({
            organizationId: req.user!.organizationId,
            userId: data.assignedTo || req.user!.id,
            eventType: 'assessment.assigned',
            title: 'Assessment assigned',
            body: `${data.assessmentType || 'An assessment'} was assigned.`,
            resourceType: 'VendorAssessment',
            resourceId: data.id,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/vendors/:vendorId/assessments/:assessmentId', requirePermission(PERMISSIONS['assessment.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorAssessmentService.getAssessmentById(req.params.assessmentId, req.user!.organizationId);
        if (!data || data.vendorId !== req.params.vendorId) {
            throw new ApiError(404, 'Assessment not found');
        }
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/assessments/:assessmentId/responses', requirePermission(PERMISSIONS['assessment.respond']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorAssessmentService.submitResponse(
            {
                assessmentId: req.params.assessmentId,
                organizationId: req.user!.organizationId,
                vendorId: req.params.vendorId,
                questionId: req.body.questionId,
                response: req.body.response || req.body.answer,
                notes: req.body.notes,
                reviewerComment: req.body.reviewerComment,
            },
            req.user!.id
        );
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/assessments/:assessmentId/complete', requirePermission(PERMISSIONS['assessment.complete']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const existing = await vendorAssessmentService.getAssessmentById(req.params.assessmentId, req.user!.organizationId);
        if (!existing || existing.vendorId !== req.params.vendorId) {
            throw new ApiError(404, 'Assessment not found');
        }
        const data = await vendorAssessmentService.completeAssessment(req.params.assessmentId, req.user!.id, req.user!.organizationId);
        await notifyUser({
            organizationId: req.user!.organizationId,
            userId: data.assignedTo || req.user!.id,
            eventType: 'assessment.completed',
            title: 'Assessment completed',
            body: `${data.assessmentType || 'An assessment'} was completed.`,
            resourceType: 'VendorAssessment',
            resourceId: data.id,
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post(
    '/evidence/upload',
    requirePermission(PERMISSIONS['evidence.upload']),
    uploadLimiter,
    upload.single('file'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new ApiError(400, 'File is required');
            }
            if (!req.body.vendorId) {
                throw new ApiError(400, 'vendorId is required');
            }
            const data = await evidenceLinkageService.uploadLinked({
                organizationId: req.user!.organizationId,
                uploadedBy: req.user!.id,
                vendorId: String(req.body.vendorId),
                assessmentId: req.body.assessmentId || undefined,
                issueId: req.body.issueId || undefined,
                questionId: req.body.questionId || undefined,
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                buffer: req.file.buffer,
                classification: req.body.classification,
                documentType: req.body.documentType as VendorDocumentType | undefined,
                title: req.body.title,
            });
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/findings', requirePermission(PERMISSIONS['finding.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await vendorIssueService.listOrganizationIssues(req.user!.organizationId, {
            status: typeof req.query.status === 'string' ? (req.query.status as VendorIssueStatus) : undefined,
            severity: typeof req.query.severity === 'string' ? (req.query.severity as IssueSeverity) : undefined,
            vendorId: typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined,
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/vendors/:vendorId/findings', requirePermission(PERMISSIONS['finding.create']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const vendor = await prisma.vendor.findFirst({
            where: { id: req.params.vendorId, organizationId: req.user!.organizationId },
            select: { id: true },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        const data = await vendorIssueService.createIssue({
            vendorId: vendor.id,
            organizationId: req.user!.organizationId,
            title: req.body.title,
            description: req.body.description,
            issueType: req.body.issueType || 'AUDIT_FINDING',
            severity: req.body.severity,
            priority: req.body.priority || 'MEDIUM',
            source: req.body.source || 'INTERNAL_ASSESSMENT',
            identifiedBy: req.user!.id,
            category: req.body.category || 'Security',
            assignedTo: req.body.assignedTo,
            targetRemediationDate: req.body.targetRemediationDate ? new Date(req.body.targetRemediationDate) : undefined,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/findings/:issueId/cap', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await vendorIssueService.updateCorrectiveActionPlan(
            req.params.issueId,
            req.user!.organizationId,
            req.body.correctiveActionPlan,
            new Date(req.body.targetRemediationDate)
        );
        const data = await vendorIssueService.getIssueById(req.params.issueId, req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/findings/:issueId/validate', requirePermission(PERMISSIONS['finding.update']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await vendorIssueService.validateRemediation(
            req.params.issueId,
            req.user!.organizationId,
            req.user!.id,
            req.body.validationNotes || '',
            req.body.approved !== false
        );
        const data = await vendorIssueService.getIssueById(req.params.issueId, req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/findings/:issueId/close', requirePermission(PERMISSIONS['finding.close']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await vendorIssueService.closeIssue(
            req.params.issueId,
            req.user!.organizationId,
            req.user!.id,
            req.body.closureNotes || '',
            req.body.closureEvidence
        );
        const data = await vendorIssueService.getIssueById(req.params.issueId, req.user!.organizationId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/scoring-methodology', requirePermission(PERMISSIONS['risk.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const [active, history] = await Promise.all([
            scoringMethodologyService.getActive(req.user!.organizationId),
            scoringMethodologyService.list(req.user!.organizationId),
        ]);
        res.json({ success: true, data: { active, history, engineVersion: 'supreme-risk-1.1.0' } });
    } catch (error) {
        next(error);
    }
});

router.put('/scoring-methodology', requirePermission(PERMISSIONS['questionnaire.manage']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.body?.weights || typeof req.body.weights !== 'object') {
            throw new ApiError(400, 'weights are required');
        }
        const data = await scoringMethodologyService.publish(req.user!.organizationId, req.user!.id, {
            name: req.body.name,
            weights: req.body.weights,
            notes: req.body.notes,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.get('/decision-briefs/:briefId/pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.decisionBriefPdf(actor(req), req.params.briefId, res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/executive.pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.executivePdf(actor(req), filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/vendors/:vendorId/scorecard.pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.vendorScorecardPdf(actor(req), req.params.vendorId, res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/assessments/:assessmentId/pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.assessmentPdf(actor(req), req.params.assessmentId, res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/findings.pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.findings(actor(req), 'pdf', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/findings.csv', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.findings(actor(req), 'csv', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/findings.xlsx', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.findings(actor(req), 'xlsx', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/monitoring.pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.monitoring(actor(req), 'pdf', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/monitoring.csv', requirePermission(PERMISSIONS['report.export']), requireReportKind('operational'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.monitoring(actor(req), 'csv', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/board.pdf', requirePermission(PERMISSIONS['report.export']), requireReportKind('board'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.board(actor(req), 'pdf', filters(req), res);
    } catch (error) {
        next(error);
    }
});

router.get('/reports/board.pptx', requirePermission(PERMISSIONS['report.export']), requireReportKind('board'), requireEntitlement('advancedReporting'), reportLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await reportGenerationService.board(actor(req), 'pptx', filters(req), res);
    } catch (error) {
        next(error);
    }
});

export default router;
