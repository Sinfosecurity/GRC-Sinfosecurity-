import { AssessmentStatus, VendorIssueStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { attentionService } from '../services/attentionService';
import { monitoringCredentialsConfigured, resolveMonitoringProviderStatus } from '../services/monitoringProviderStatus';

export type ReportFilters = {
    vendorId?: string;
    from?: Date;
    to?: Date;
};

function dateWhere(from?: Date, to?: Date, field = 'createdAt') {
    if (!from && !to) return {};
    return {
        [field]: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
        },
    };
}

export async function loadPortfolioSnapshot(organizationId: string, filters: ReportFilters = {}) {
    const vendorScope = filters.vendorId ? { vendorId: filters.vendorId } : {};
    const now = new Date();

    const [organization, vendors, issues, assessments, monitoring, documents, briefs, scores, attention, connection] = await Promise.all([
        prisma.organization.findFirst({ where: { id: organizationId }, select: { id: true, name: true } }),
        prisma.vendor.findMany({
            where: { organizationId, ...(filters.vendorId ? { id: filters.vendorId } : {}) },
            orderBy: { residualRiskScore: 'desc' },
        }),
        prisma.vendorIssue.findMany({
            where: { organizationId, ...vendorScope, ...dateWhere(filters.from, filters.to, 'identifiedDate') },
            include: { vendor: { select: { id: true, name: true } } },
            orderBy: { identifiedDate: 'desc' },
        }),
        prisma.vendorAssessment.findMany({
            where: { organizationId, ...vendorScope, ...dateWhere(filters.from, filters.to) },
            include: { vendor: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.vendorMonitoring.findMany({
            where: { organizationId, ...vendorScope, ...dateWhere(filters.from, filters.to, 'detectedAt') },
            include: { vendor: { select: { id: true, name: true, tier: true } } },
            orderBy: { detectedAt: 'desc' },
            take: 200,
        }),
        prisma.vendorDocument.findMany({
            where: { organizationId, ...vendorScope },
            include: { vendor: { select: { id: true, name: true } } },
            orderBy: { uploadedAt: 'desc' },
            take: 200,
        }),
        prisma.riskDecisionBrief.findMany({
            where: { organizationId, ...vendorScope },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.scoreCalculation.findMany({
            where: { organizationId, ...vendorScope },
            orderBy: { calculatedAt: 'asc' },
            take: 400,
        }),
        attentionService.whatNeedsAttentionToday(organizationId),
        prisma.integrationConnection.findFirst({
            where: { organizationId, provider: { in: ['siem', 'monitoring'] } },
        }),
    ]);

    const openStatuses: Set<VendorIssueStatus> = new Set([
        VendorIssueStatus.OPEN,
        VendorIssueStatus.IN_PROGRESS,
        VendorIssueStatus.PENDING_VALIDATION,
        VendorIssueStatus.ESCALATED,
        VendorIssueStatus.PENDING_VENDOR,
    ]);
    const openIssues = issues.filter((issue) => openStatuses.has(issue.status));
    const criticalFindings = openIssues.filter((issue) => issue.severity === 'CRITICAL' || issue.severity === 'HIGH');
    const overdueRemediation = openIssues.filter((issue) => issue.targetRemediationDate && issue.targetRemediationDate < now);
    const overdueAssessments = assessments.filter((assessment) =>
        assessment.status === AssessmentStatus.OVERDUE ||
        (assessment.dueDate && assessment.dueDate < now && assessment.status !== AssessmentStatus.COMPLETED && assessment.status !== AssessmentStatus.CANCELLED)
    );
    const highResidual = vendors.filter((vendor) => vendor.residualRiskScore >= 60);
    const expiringEvidence = documents.filter((doc) => {
        if (!doc.validUntil) return false;
        const in45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        return doc.validUntil >= now && doc.validUntil <= in45;
    });
    const topRiskVendors = [...vendors].sort((a, b) => b.residualRiskScore - a.residualRiskScore).slice(0, 10);

    const monthly = new Map<string, { month: string; avgResidual: number; count: number }>();
    for (const score of scores) {
        const month = score.calculatedAt.toISOString().slice(0, 7);
        const current = monthly.get(month) || { month, avgResidual: 0, count: 0 };
        current.avgResidual += score.residualRisk;
        current.count += 1;
        monthly.set(month, current);
    }
    const riskTrend = [...monthly.values()].map((row) => ({
        month: row.month,
        avgResidual: row.count ? Math.round(row.avgResidual / row.count) : 0,
    }));

    const providerStatus = resolveMonitoringProviderStatus({
        credentialsConfigured: monitoringCredentialsConfigured(),
        dbStatus: connection?.status,
        lastError: connection?.lastError,
    });

    const recommendations: string[] = [];
    if (overdueAssessments.length) recommendations.push(`Complete ${overdueAssessments.length} overdue vendor assessment(s).`);
    if (criticalFindings.length) recommendations.push(`Remediate or formally accept ${criticalFindings.length} critical/high finding(s).`);
    if (overdueRemediation.length) recommendations.push(`Escalate ${overdueRemediation.length} overdue remediation item(s).`);
    if (highResidual.length) recommendations.push(`Review decision briefs for ${highResidual.length} vendor(s) with HIGH or CRITICAL residual risk.`);
    if (!recommendations.length) recommendations.push('No blocking portfolio exceptions were identified from persisted records.');

    return {
        organizationName: organization?.name || 'Organization',
        generatedAt: now,
        vendors,
        issues,
        openIssues,
        assessments,
        monitoring,
        documents,
        briefs,
        scores,
        attention: filters.vendorId ? attention.items.filter((item) => item.vendorId === filters.vendorId) : attention.items,
        providerStatus,
        signalCount: monitoring.length,
        totals: {
            vendors: vendors.length,
            criticalVendors: vendors.filter((vendor) => vendor.tier === 'CRITICAL').length,
            highResidual: highResidual.length,
            overdueAssessments: overdueAssessments.length,
            criticalFindings: criticalFindings.length,
            overdueRemediation: overdueRemediation.length,
            monitoringAlerts: monitoring.filter((row) => row.requiresAction).length,
            expiringEvidence: expiringEvidence.length,
        },
        overdueAssessments,
        criticalFindings,
        overdueRemediation,
        expiringEvidence,
        topRiskVendors,
        riskTrend,
        recommendations,
        majorDecisions: briefs.filter((brief) => brief.status === 'DECIDED').slice(0, 12),
    };
}

export type PortfolioSnapshot = Awaited<ReturnType<typeof loadPortfolioSnapshot>>;
