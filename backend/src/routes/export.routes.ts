import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../security/rbac';
import { recordAudit } from '../services/auditEventService';
import { tenantWhere } from '../security/tenant';
import { csvEscape } from '../security/spreadsheetSafe';

const router = Router();
router.use(authenticate);

router.get('/vendors.csv', requirePermission(PERMISSIONS['report.export']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const vendors = await prisma.vendor.findMany({
            where: tenantWhere(req.user!.organizationId),
            orderBy: { name: 'asc' },
        });
        const header = ['id', 'name', 'status', 'tier', 'inherentRisk', 'residualRisk', 'nextReview'];
        const rows = vendors.map((v) =>
            [v.id, v.name, v.status, v.tier, v.inherentRiskScore, v.residualRiskScore, v.nextReviewDate?.toISOString() || '']
                .map(csvEscape)
                .join(',')
        );
        const body = [header.join(','), ...rows].join('\n');
        await recordAudit({
            organizationId: req.user!.organizationId,
            actorUserId: req.user!.id,
            action: 'report.export',
            resourceType: 'Vendor',
            result: 'success',
            metadata: { format: 'csv', count: vendors.length },
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="supreme-risk-vendors.csv"');
        res.send(body);
    } catch (error) {
        next(error);
    }
});

router.get('/findings.csv', requirePermission(PERMISSIONS['report.export']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const issues = await prisma.vendorIssue.findMany({
            where: tenantWhere(req.user!.organizationId),
            include: { vendor: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        const header = ['id', 'vendor', 'title', 'severity', 'status', 'targetRemediationDate'];
        const rows = issues.map((issue) =>
            [issue.id, issue.vendor.name, issue.title, issue.severity, issue.status, issue.targetRemediationDate?.toISOString() || '']
                .map(csvEscape)
                .join(',')
        );
        await recordAudit({
            organizationId: req.user!.organizationId,
            actorUserId: req.user!.id,
            action: 'report.export',
            resourceType: 'VendorIssue',
            result: 'success',
            metadata: { format: 'csv', count: issues.length },
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="supreme-risk-findings.csv"');
        res.send([header.join(','), ...rows].join('\n'));
    } catch (error) {
        next(error);
    }
});

router.get('/board.json', requirePermission(PERMISSIONS['report.read']), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = req.user!.organizationId;
        const [vendors, issues, assessments, monitoring] = await Promise.all([
            prisma.vendor.findMany({ where: { organizationId } }),
            prisma.vendorIssue.findMany({ where: { organizationId, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
            prisma.vendorAssessment.findMany({ where: { organizationId } }),
            prisma.vendorMonitoring.findMany({
                where: { organizationId },
                orderBy: { detectedAt: 'desc' },
                take: 20,
            }),
        ]);
        const report = {
            title: 'Supreme Risk Board Report',
            generatedAt: new Date().toISOString(),
            sections: {
                executiveSummary: {
                    vendorCount: vendors.length,
                    averageResidualRisk:
                        vendors.length === 0
                            ? 0
                            : Math.round(vendors.reduce((sum, v) => sum + v.residualRiskScore, 0) / vendors.length),
                },
                portfolioRisk: vendors.map((v) => ({
                    id: v.id,
                    name: v.name,
                    inherent: v.inherentRiskScore,
                    residual: v.residualRiskScore,
                    tier: v.tier,
                })),
                topRiskVendors: [...vendors].sort((a, b) => b.residualRiskScore - a.residualRiskScore).slice(0, 10),
                assessmentStatus: assessments.reduce<Record<string, number>>((acc, a) => {
                    acc[a.status] = (acc[a.status] || 0) + 1;
                    return acc;
                }, {}),
                openFindings: issues.length,
                overdueRemediation: issues.filter((i) => i.targetRemediationDate && i.targetRemediationDate < new Date()).length,
                monitoringEvents: monitoring,
            },
        };
        await recordAudit({
            organizationId,
            actorUserId: req.user!.id,
            action: 'report.export',
            resourceType: 'BoardReport',
            result: 'success',
            metadata: { format: 'json' },
        });
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
});

export default router;
