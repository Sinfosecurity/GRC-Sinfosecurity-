import { DecisionBriefStatus, Prisma, RiskDecision, ScanStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { runAi } from '../ai/aiProvider';
import { tenantWhere } from '../security/tenant';
import { recordAudit } from './auditEventService';
import { explainableRiskService } from './explainableRiskService';

export const DECISION_OPTIONS: RiskDecision[] = [
    'APPROVE',
    'APPROVE_WITH_CONDITIONS',
    'ESCALATE',
    'REJECT',
    'RISK_ACCEPTED',
];

function evidenceConfidence(scanStatuses: ScanStatus[], count: number): string {
    if (count === 0) return 'NOT_CONFIGURED';
    if (scanStatuses.some((status) => status === ScanStatus.INFECTED || status === ScanStatus.FAILED)) {
        return 'FAILED';
    }
    if (scanStatuses.some((status) => status === ScanStatus.NOT_CONFIGURED || status === ScanStatus.PENDING)) {
        return 'DEGRADED';
    }
    return count >= 3 ? 'HIGH' : 'MEDIUM';
}

export const riskDecisionBriefService = {
    async list(organizationId: string, vendorId?: string) {
        return prisma.riskDecisionBrief.findMany({
            where: { organizationId, ...(vendorId ? { vendorId } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    },

    async get(organizationId: string, briefId: string) {
        const brief = await prisma.riskDecisionBrief.findFirst({
            where: { id: briefId, organizationId },
        });
        if (!brief) {
            throw new ApiError(404, 'Decision brief not found');
        }
        return brief;
    },

    async generate(organizationId: string, vendorId: string, actorUserId?: string) {
        const vendor = await prisma.vendor.findFirst({
            where: tenantWhere(organizationId, { id: vendorId }),
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        let latest = await prisma.scoreCalculation.findFirst({
            where: { organizationId, vendorId },
            orderBy: { calculatedAt: 'desc' },
        });
        if (!latest) {
            const calculated = await explainableRiskService.recalculate(organizationId, vendorId);
            latest = await prisma.scoreCalculation.findUnique({ where: { id: calculated.id } });
        }
        if (!latest) {
            throw new ApiError(500, 'Unable to produce an explainable score for this vendor');
        }

        const [openFindings, monitoringAlerts, documents, latestAssessment] = await Promise.all([
            prisma.vendorIssue.count({
                where: { organizationId, vendorId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            }),
            prisma.vendorMonitoring.count({
                where: { organizationId, vendorId, requiresAction: true },
            }),
            prisma.storedObject.findMany({
                where: tenantWhere(organizationId, { ownerType: 'vendor', ownerId: vendorId, deletedAt: null }),
                select: { scanStatus: true },
            }),
            prisma.vendorAssessment.findFirst({
                where: { organizationId, vendorId },
                orderBy: { createdAt: 'desc' },
                select: { status: true, assessmentType: true },
            }),
        ]);

        const confidence = evidenceConfidence(documents.map((d) => d.scanStatus), documents.length);
        const ai = await runAi({
            organizationId,
            feature: 'executive_summary',
            context: `Vendor ${vendor.name}. Residual ${latest.residualRisk} (${latest.riskBand}). Open findings ${openFindings}. Monitoring alerts ${monitoringAlerts}. Evidence confidence ${confidence}. Score version ${latest.scoreVersion}. Do not invent evidence.`,
        });

        await prisma.riskDecisionBrief.updateMany({
            where: { organizationId, vendorId, status: DecisionBriefStatus.DRAFT },
            data: { status: DecisionBriefStatus.SUPERSEDED },
        });

        const snapshot = {
            vendor: {
                id: vendor.id,
                name: vendor.name,
                service: vendor.servicesProvided,
                businessOwner: vendor.businessOwner,
                relationshipOwner: vendor.relationshipOwner,
                criticality: vendor.tier,
            },
            score: {
                id: latest.id,
                version: latest.scoreVersion,
                inherentRisk: latest.inherentRisk,
                residualRisk: latest.residualRisk,
                riskBand: latest.riskBand,
                factors: latest.factors,
                explanation: latest.explanation,
                calculatedAt: latest.calculatedAt,
            },
            assessmentStatus: latestAssessment?.status || 'NOT_STARTED',
            evidenceConfidence: confidence,
            openFindings,
            monitoringAlerts,
        };

        const brief = await prisma.riskDecisionBrief.create({
            data: {
                organizationId,
                vendorId,
                engagementName: vendor.servicesProvided,
                scoreCalculationId: latest.id,
                inherentRisk: latest.inherentRisk,
                residualRisk: latest.residualRisk,
                riskBand: latest.riskBand,
                assessmentStatus: latestAssessment?.status || 'NOT_STARTED',
                evidenceConfidence: confidence,
                openFindingsCount: openFindings,
                monitoringAlertCount: monitoringAlerts,
                aiSummary: ai.status === 'SUCCESS' ? ai.text : null,
                aiSummaryStatus: ai.status,
                immutableSnapshot: snapshot as Prisma.InputJsonValue,
            },
        });

        await recordAudit({
            organizationId,
            actorUserId,
            action: 'decision_brief.generate',
            resourceType: 'RiskDecisionBrief',
            resourceId: brief.id,
            result: 'success',
            metadata: { vendorId, residualRisk: latest.residualRisk },
        });
        return brief;
    },

    async decide(
        organizationId: string,
        briefId: string,
        input: {
            decision: RiskDecision;
            conditions?: string;
            reviewerAnalysis?: string;
            nextReviewDate?: string;
            actorUserId: string;
        }
    ) {
        const brief = await this.get(organizationId, briefId);
        if (brief.status !== DecisionBriefStatus.DRAFT) {
            throw new ApiError(409, 'Only draft briefs can receive a decision. Historical briefs are immutable.');
        }
        if (!DECISION_OPTIONS.includes(input.decision)) {
            throw new ApiError(400, 'Invalid decision');
        }
        if (input.decision === 'APPROVE_WITH_CONDITIONS' && !input.conditions?.trim()) {
            throw new ApiError(400, 'Conditions are required for APPROVE_WITH_CONDITIONS');
        }

        const nextReviewDate = input.nextReviewDate ? new Date(input.nextReviewDate) : brief.nextReviewDate;
        const updated = await prisma.riskDecisionBrief.update({
            where: { id: brief.id },
            data: {
                humanDecision: input.decision,
                conditions: input.conditions,
                reviewerAnalysis: input.reviewerAnalysis,
                nextReviewDate,
                decidedByUserId: input.actorUserId,
                decidedAt: new Date(),
                status: DecisionBriefStatus.DECIDED,
                immutableSnapshot: {
                    ...(typeof brief.immutableSnapshot === 'object' && brief.immutableSnapshot ? brief.immutableSnapshot : {}),
                    decision: {
                        humanDecision: input.decision,
                        conditions: input.conditions,
                        reviewerAnalysis: input.reviewerAnalysis,
                        decidedByUserId: input.actorUserId,
                        decidedAt: new Date().toISOString(),
                    },
                } as Prisma.InputJsonValue,
            },
        });

        if (nextReviewDate) {
            await prisma.vendor.updateMany({
                where: { id: brief.vendorId, organizationId },
                data: { nextReviewDate },
            });
        }
        if (input.decision === 'RISK_ACCEPTED') {
            await explainableRiskService.recalculate(organizationId, brief.vendorId, { riskAccepted: true });
        }

        await recordAudit({
            organizationId,
            actorUserId: input.actorUserId,
            action: 'decision_brief.decide',
            resourceType: 'RiskDecisionBrief',
            resourceId: brief.id,
            result: 'success',
            metadata: { decision: input.decision, vendorId: brief.vendorId },
        });
        return updated;
    },
};
