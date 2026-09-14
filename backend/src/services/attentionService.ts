import { AssessmentStatus, DecisionBriefStatus, VendorIssueStatus, VendorOnboardingStage, VendorStatus } from '@prisma/client';
import { prisma } from '../config/database';

export type AttentionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type AttentionItem = {
    id: string;
    severity: AttentionSeverity;
    action: string;
    title: string;
    detail: string;
    vendorId?: string;
    vendorName?: string;
    href: string;
};

function customerScanLabel(status?: string | null): string {
    switch (String(status || '').toUpperCase()) {
        case 'CLEAN':
            return 'Ready';
        case 'PENDING':
        case 'PENDING_SCAN':
            return 'Security check in progress';
        case 'QUARANTINED':
        case 'INFECTED':
            return 'Blocked';
        case 'FAILED':
        case 'ERROR':
            return 'Scan failed';
        default:
            return status || 'Not recorded';
    }
}

export type AttentionWorkCounts = {
    dueAssessments: number;
    overdueFindings: number;
    pendingDecisions: number;
};

export const attentionService = {
    async whatNeedsAttentionToday(organizationId: string): Promise<{ generatedAt: string; items: AttentionItem[]; work: AttentionWorkCounts }> {
        const now = new Date();
        const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        const items: AttentionItem[] = [];

        const onboarding = await prisma.vendorOnboarding.findMany({
            where: {
                organizationId,
                stage: { in: [VendorOnboardingStage.INTAKE, VendorOnboardingStage.TIER_REVIEW, VendorOnboardingStage.DUE_DILIGENCE_PLAN, VendorOnboardingStage.READY_TO_SEND, VendorOnboardingStage.AWAITING_VENDOR, VendorOnboardingStage.VENDOR_IN_PROGRESS, VendorOnboardingStage.SUBMITTED, VendorOnboardingStage.UNDER_REVIEW] },
            },
            include: { vendor: { select: { id: true, name: true, publicId: true } } },
            take: 25,
        });
        for (const row of onboarding) {
            const due = row.dueDiligenceDueAt || (row.stage === VendorOnboardingStage.TIER_REVIEW ? row.tierReviewDueAt : row.intakeDueAt);
            const overdue = Boolean(due && due < now);
            const action = row.stage === VendorOnboardingStage.INTAKE
                ? 'COMPLETE INTAKE'
                : row.stage === VendorOnboardingStage.TIER_REVIEW
                    ? 'CONFIRM TIER'
                    : row.stage === VendorOnboardingStage.DUE_DILIGENCE_PLAN
                        ? 'CONFIRM PLAN'
                        : row.stage === VendorOnboardingStage.READY_TO_SEND
                            ? 'SEND DUE DILIGENCE'
                            : row.stage === VendorOnboardingStage.SUBMITTED || row.stage === VendorOnboardingStage.UNDER_REVIEW
                                ? 'REVIEW SUBMISSION'
                                : 'VENDOR DUE DILIGENCE';
            items.push({
                id: `onboarding-${row.vendorId}`,
                severity: overdue ? 'HIGH' : 'MEDIUM',
                action,
                title: `${row.vendor.name} · ${row.stage.replace(/_/g, ' ').toLowerCase()}`,
                detail: `${row.vendor.publicId || 'Vendor'} · due ${due ? due.toISOString().slice(0, 10) : 'not set'}${overdue ? ' · overdue' : ''}.`,
                vendorId: row.vendorId,
                vendorName: row.vendor.name,
                href: `/vendor-onboarding/${row.vendor.publicId || row.vendorId}`,
            });
        }

        const overdueReviews = await prisma.vendor.findMany({
            where: { organizationId, status: VendorStatus.ACTIVE, nextReviewDate: { lt: now } },
            select: { id: true, name: true, residualRiskScore: true, nextReviewDate: true, tier: true },
            take: 25,
        });
        for (const vendor of overdueReviews) {
            items.push({
                id: `review-${vendor.id}`,
                severity: vendor.tier === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                action: 'REVIEW NOW',
                title: `${vendor.name} reassessment is overdue`,
                detail: `Next review was ${vendor.nextReviewDate?.toISOString().slice(0, 10) || 'unscheduled'}. Residual ${vendor.residualRiskScore}.`,
                vendorId: vendor.id,
                vendorName: vendor.name,
                href: `/vendor-management`,
            });
        }

        const pendingAssessments = await prisma.vendorAssessment.findMany({
            where: {
                organizationId,
                status: { in: [AssessmentStatus.PENDING_APPROVAL, AssessmentStatus.OVERDUE] },
            },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        });
        for (const assessment of pendingAssessments) {
            items.push({
                id: `assessment-${assessment.id}`,
                severity: assessment.status === AssessmentStatus.OVERDUE ? 'HIGH' : 'MEDIUM',
                action: assessment.status === AssessmentStatus.PENDING_APPROVAL ? 'APPROVAL REQUIRED' : 'REVIEW NOW',
                title: `${assessment.vendor.name} assessment needs action`,
                detail: `Status ${assessment.status}.`,
                vendorId: assessment.vendorId,
                vendorName: assessment.vendor.name,
                href: '/assessments',
            });
        }

        const criticalFindings = await prisma.vendorIssue.findMany({
            where: {
                organizationId,
                severity: { in: ['CRITICAL', 'HIGH'] },
                status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS] },
            },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        });
        for (const finding of criticalFindings) {
            items.push({
                id: `finding-${finding.id}`,
                severity: finding.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                action: finding.targetRemediationDate && finding.targetRemediationDate < now ? 'ESCALATE' : 'REVIEW NOW',
                title: finding.title,
                detail: `${finding.vendor.name}: ${finding.severity} finding is ${finding.status}.`,
                vendorId: finding.vendorId,
                vendorName: finding.vendor.name,
                href: '/findings',
            });
        }

        const alerts = await prisma.vendorMonitoring.findMany({
            where: { organizationId, requiresAction: true },
            include: { vendor: { select: { id: true, name: true } } },
            orderBy: { detectedAt: 'desc' },
            take: 25,
        });
        for (const alert of alerts) {
            items.push({
                id: `monitor-${alert.id}`,
                severity: alert.riskLevel === 'Critical' ? 'CRITICAL' : 'HIGH',
                action: 'REVIEW NOW',
                title: `${alert.vendor.name} monitoring alert`,
                detail: `${alert.monitoringType}: ${alert.riskIndicator}`,
                vendorId: alert.vendorId,
                vendorName: alert.vendor.name,
                href: '/monitoring',
            });
        }

        const expiringEvidence = await prisma.vendorDocument.findMany({
            where: { organizationId, validUntil: { gte: now, lte: in45Days } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        });
        for (const doc of expiringEvidence) {
            items.push({
                id: `evidence-${doc.id}`,
                severity: 'HIGH',
                action: 'REQUEST UPDATED EVIDENCE',
                title: `${doc.title} expires soon`,
                detail: `${doc.vendor.name}: valid until ${doc.validUntil?.toISOString().slice(0, 10)}. ${customerScanLabel(doc.scanStatus)}.`,
                vendorId: doc.vendorId,
                vendorName: doc.vendor.name,
                href: '/documents',
            });
        }

        const expiringContracts = await prisma.vendorContract.findMany({
            where: { organizationId, expirationDate: { gte: now, lte: in45Days } },
            include: { vendor: { select: { id: true, name: true } } },
            take: 25,
        });
        for (const contract of expiringContracts) {
            items.push({
                id: `contract-${contract.id}`,
                severity: 'MEDIUM',
                action: 'REVIEW RENEWAL',
                title: `${contract.title} expires in 45 days or less`,
                detail: `${contract.vendor.name}: expires ${contract.expirationDate.toISOString().slice(0, 10)}.`,
                vendorId: contract.vendorId,
                vendorName: contract.vendor.name,
                href: '/vendor-management',
            });
        }

        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const [dueAssessments, overdueFindings, pendingDecisions] = await Promise.all([
            prisma.vendorAssessment.count({
                where: {
                    organizationId,
                    status: { not: AssessmentStatus.COMPLETED },
                    OR: [{ dueDate: null }, { dueDate: { lte: in7Days } }],
                },
            }),
            prisma.vendorIssue.count({
                where: {
                    organizationId,
                    status: { notIn: [VendorIssueStatus.CLOSED, VendorIssueStatus.RISK_ACCEPTED, VendorIssueStatus.RESOLVED] },
                    targetRemediationDate: { lt: now },
                },
            }),
            prisma.riskDecisionBrief.count({
                where: {
                    organizationId,
                    humanDecision: null,
                    status: { not: DecisionBriefStatus.DECIDED },
                },
            }),
        ]);

        const rank: Record<AttentionSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
        items.sort((a, b) => rank[a.severity] - rank[b.severity]);
        return {
            generatedAt: now.toISOString(),
            items,
            work: { dueAssessments, overdueFindings, pendingDecisions },
        };
    },
};
