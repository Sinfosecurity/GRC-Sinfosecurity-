import { AssessmentStatus, VendorIssueStatus, VendorOnboardingStage, VendorStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { attentionService } from '../services/attentionService';
import { enterpriseIntelligenceService } from '../services/enterpriseIntelligenceService';
import vendorManagementService from '../services/vendorManagementService';

jest.setTimeout(60000);

async function time<T>(label: string, work: () => Promise<T>) {
    const started = Date.now();
    const value = await work();
    return { label, ms: Date.now() - started, value };
}

describe('Home dashboard timing (staging-equivalent)', () => {
    let organizationId = '';

    beforeAll(async () => {
        await prisma.$queryRaw`SELECT 1`;
        const org = await prisma.organization.findFirst({ select: { id: true } });
        if (!org) throw new Error('PostgreSQL is required and must have at least one organization.');
        organizationId = org.id;
    });

    it('records sequential vs concurrent Home query cost and maps each metric owner', async () => {
        const now = new Date();
        const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        const connect = await time('prisma-connect-or-first-query', () => prisma.$queryRaw`SELECT 1`);

        const sequential: Array<{ label: string; ms: number }> = [];
        sequential.push(await time('attention.onboarding', () => prisma.vendorOnboarding.findMany({
            where: { organizationId, stage: { in: [VendorOnboardingStage.INTAKE, VendorOnboardingStage.TIER_REVIEW, VendorOnboardingStage.DUE_DILIGENCE_PLAN, VendorOnboardingStage.READY_TO_SEND, VendorOnboardingStage.AWAITING_VENDOR, VendorOnboardingStage.VENDOR_IN_PROGRESS, VendorOnboardingStage.SUBMITTED, VendorOnboardingStage.UNDER_REVIEW, VendorOnboardingStage.RISK_ACCEPTANCE, VendorOnboardingStage.CONTRACT_REVIEW, VendorOnboardingStage.APPROVAL] } },
            include: { vendor: { select: { id: true, name: true, publicId: true } } },
            take: 25,
        })));
        sequential.push(await time('attention.overdueReviews', () => prisma.vendor.findMany({
            where: { organizationId, status: VendorStatus.ACTIVE, nextReviewDate: { lt: now } },
            select: { id: true, name: true, residualRiskScore: true, nextReviewDate: true, tier: true },
            take: 25,
        })));
        sequential.push(await time('attention.pendingAssessments', () => prisma.vendorAssessment.findMany({
            where: { organizationId, status: { in: [AssessmentStatus.PENDING_APPROVAL, AssessmentStatus.OVERDUE] } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        })));
        sequential.push(await time('attention.criticalFindings', () => prisma.vendorIssue.findMany({
            where: { organizationId, severity: { in: ['CRITICAL', 'HIGH'] }, status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        })));
        sequential.push(await time('attention.alerts', () => prisma.vendorMonitoring.findMany({
            where: { organizationId, requiresAction: true },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        })));
        sequential.push(await time('attention.expiringEvidence', () => prisma.vendorDocument.findMany({
            where: { organizationId, validUntil: { gte: now, lte: in45Days } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        })));
        sequential.push(await time('attention.expiringContracts', () => prisma.vendorContract.findMany({
            where: { organizationId, expirationDate: { gte: now, lte: in45Days } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        })));

        const sequentialSum = sequential.reduce((sum, row) => sum + row.ms, 0);
        const parallel = await time('attention.parallel-finds', () => Promise.all(sequential.map((row) => {
            if (row.label === 'attention.onboarding') return prisma.vendorOnboarding.findMany({ where: { organizationId }, take: 25 });
            if (row.label === 'attention.overdueReviews') return prisma.vendor.findMany({ where: { organizationId }, take: 25 });
            if (row.label === 'attention.pendingAssessments') return prisma.vendorAssessment.findMany({ where: { organizationId }, take: 25 });
            if (row.label === 'attention.criticalFindings') return prisma.vendorIssue.findMany({ where: { organizationId }, take: 25 });
            if (row.label === 'attention.alerts') return prisma.vendorMonitoring.findMany({ where: { organizationId }, take: 25 });
            if (row.label === 'attention.expiringEvidence') return prisma.vendorDocument.findMany({ where: { organizationId }, take: 25 });
            return prisma.vendorContract.findMany({ where: { organizationId }, take: 25 });
        })));

        const attention = await time('GET /tprm/attention service', () => attentionService.whatNeedsAttentionToday(organizationId));
        const statistics = await time('GET /vendors/statistics service', () => vendorManagementService.getVendorStatistics(organizationId) as Promise<{ summary: { totalVendors: number } }>);
        const teaser = await time('GET /intelligence/teaser service', () => enterpriseIntelligenceService.teaser(organizationId, 'ORGANIZATION_ADMIN'));
        const generate = await time('intelligence.generate (full workspace path)', () => enterpriseIntelligenceService.generate(organizationId));

        const report = {
            metricOwners: {
                'Critical vendors / Portfolio / Concentration': 'GET /vendors/statistics',
                'Decisions waiting / Overdue findings / Assessments due / Attention hero': 'GET /tprm/attention',
                'What changed': 'GET /intelligence/teaser',
            },
            frontendRequests: ['GET /tprm/attention', 'GET /vendors/statistics', 'GET /intelligence/teaser'],
            layoutRequests: ['GET /health', 'GET /organizations/current'],
            concurrency: 'Frontend starts the three Home APIs together. Attention queries were sequential inside the service before the fix.',
            connect,
            sequentialQueries: sequential.map(({ label, ms }) => ({ label, ms })),
            sequentialSumMs: sequentialSum,
            parallelFindMs: parallel.ms,
            attentionMs: attention.ms,
            statisticsMs: statistics.ms,
            teaserMs: teaser.ms,
            generateMs: generate.ms,
            slowest: [
                { label: 'attention service', ms: attention.ms },
                { label: 'statistics service', ms: statistics.ms },
                { label: 'teaser service', ms: teaser.ms },
                { label: 'intelligence.generate', ms: generate.ms },
                ...sequential,
            ].sort((a, b) => b.ms - a.ms)[0],
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(report, null, 2));
        expect(attention.value.work).toEqual(expect.objectContaining({
            dueAssessments: expect.any(Number),
            overdueFindings: expect.any(Number),
            pendingDecisions: expect.any(Number),
        }));
        expect(statistics.value.summary.totalVendors).toEqual(expect.any(Number));
        expect(Array.isArray(teaser.value.items)).toBe(true);
        expect(parallel.ms).toBeLessThanOrEqual(sequentialSum + 25);
    });
});
