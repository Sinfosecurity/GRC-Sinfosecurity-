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

    const periodStart = filters.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const closedThisPeriod = issues.filter((issue) =>
        issue.status === VendorIssueStatus.CLOSED && issue.closedAt && issue.closedAt >= periodStart && issue.closedAt <= now
    );
    const ages = openIssues.map((issue) => Math.max(0, Math.floor((now.getTime() - issue.identifiedDate.getTime()) / 86400000)));
    const averageFindingAge = ages.length ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;
    const agingBuckets = [
        { label: '0–30 days', value: ages.filter((age) => age <= 30).length },
        { label: '31–60 days', value: ages.filter((age) => age > 30 && age <= 60).length },
        { label: '61–90 days', value: ages.filter((age) => age > 60 && age <= 90).length },
        { label: '90+ days', value: ages.filter((age) => age > 90).length },
    ];
    const severityCounts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((label) => ({
        label,
        value: issues.filter((issue) => issue.severity === label).length,
    }));
    const statusCounts = ['OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION', 'CLOSED', 'RISK_ACCEPTED'].map((label) => ({
        label,
        value: issues.filter((issue) => issue.status === label).length,
    }));
    const residualBands = [
        { label: 'Critical 80–100', value: vendors.filter((vendor) => vendor.residualRiskScore >= 80).length, color: '#B42318' },
        { label: 'High 60–79', value: vendors.filter((vendor) => vendor.residualRiskScore >= 60 && vendor.residualRiskScore < 80).length, color: '#B54708' },
        { label: 'Medium 40–59', value: vendors.filter((vendor) => vendor.residualRiskScore >= 40 && vendor.residualRiskScore < 60).length, color: '#CA8A04' },
        { label: 'Low 0–39', value: vendors.filter((vendor) => vendor.residualRiskScore < 40).length, color: '#027A48' },
    ];
    const heatmap = emptyHeatmap();
    vendors.forEach((vendor) => {
        const impact = impactFromTier(vendor.tier);
        const likelihood = likelihoodFromResidual(vendor.residualRiskScore);
        heatmap[likelihood - 1][impact - 1] += 1;
    });
    const categoryConcentration = Object.entries(
        vendors.reduce<Record<string, number>>((acc, vendor) => {
            const key = String(vendor.category || 'Unspecified');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const monitoredVendorIds = new Set(monitoring.map((row) => row.vendorId));
    const latestByVendor = new Map<string, { residual: number; prior?: number }>();
    [...scores].sort((a, b) => a.calculatedAt.getTime() - b.calculatedAt.getTime()).forEach((score) => {
        const current = latestByVendor.get(score.vendorId);
        if (!current) {
            latestByVendor.set(score.vendorId, { residual: score.residualRisk });
        } else {
            latestByVendor.set(score.vendorId, { residual: score.residualRisk, prior: current.residual });
        }
    });
    const scoreIncreases = [...latestByVendor.values()].filter((row) => row.prior != null && row.residual > row.prior).length;
    const scoreDecreases = [...latestByVendor.values()].filter((row) => row.prior != null && row.residual < row.prior).length;
    const upcomingReviews = vendors
        .filter((vendor) => vendor.nextReviewDate)
        .sort((a, b) => (a.nextReviewDate?.getTime() || 0) - (b.nextReviewDate?.getTime() || 0))
        .slice(0, 8);
    const controlScores = scores.slice(-vendors.length || -1).map((row) => row.controlEffectiveness).filter((value): value is number => typeof value === 'number');
    const avgControlEffectiveness = controlScores.length
        ? Math.round(controlScores.reduce((sum, value) => sum + value, 0) / controlScores.length)
        : null;
    const observations = [
        highResidual.length
            ? `${highResidual.length} vendor${highResidual.length === 1 ? '' : 's'} currently sit in high or critical residual risk.`
            : 'No vendors currently sit in high or critical residual risk.',
        criticalFindings.length
            ? `${criticalFindings.length} critical or high finding${criticalFindings.length === 1 ? '' : 's'} remain open.`
            : 'No critical or high findings are open.',
        overdueRemediation.length
            ? `${overdueRemediation.length} remediation item${overdueRemediation.length === 1 ? '' : 's'} are past the target date.`
            : 'No remediation items are past their target date.',
    ];
    const trendDelta = dataTrendDelta(riskTrend);
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
        trendDelta,
        recommendations,
        observations,
        heatmap,
        residualBands,
        severityCounts,
        statusCounts,
        agingBuckets,
        averageFindingAge,
        closedThisPeriod: closedThisPeriod.length,
        categoryConcentration,
        monitoredVendors: monitoredVendorIds.size,
        scoreIncreases,
        scoreDecreases,
        upcomingReviews,
        avgControlEffectiveness,
        majorDecisions: briefs.filter((brief) => brief.status === 'DECIDED').slice(0, 12),
        acceptedRisks: briefs.filter((brief) => brief.humanDecision === 'RISK_ACCEPTED').slice(0, 8),
        conditionedApprovals: briefs.filter((brief) => brief.humanDecision === 'APPROVE_WITH_CONDITIONS').slice(0, 8),
    };
}

function impactFromTier(tier: string): number {
    if (tier === 'CRITICAL') return 5;
    if (tier === 'HIGH') return 4;
    if (tier === 'MEDIUM') return 3;
    if (tier === 'LOW') return 2;
    return 1;
}

function likelihoodFromResidual(score: number): number {
    if (score >= 80) return 5;
    if (score >= 60) return 4;
    if (score >= 40) return 3;
    if (score >= 20) return 2;
    return 1;
}

function emptyHeatmap(): number[][] {
    return Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
}

function dataTrendDelta(trend: Array<{ month: string; avgResidual: number }>): { direction: string; delta: number; latest: number | null } {
    if (trend.length < 2) {
        return { direction: 'insufficient history', delta: 0, latest: trend[0]?.avgResidual ?? null };
    }
    const latest = trend[trend.length - 1].avgResidual;
    const prior = trend[trend.length - 2].avgResidual;
    const delta = latest - prior;
    return {
        latest,
        delta,
        direction: delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'stable',
    };
}

export type PortfolioSnapshot = Awaited<ReturnType<typeof loadPortfolioSnapshot>>;
