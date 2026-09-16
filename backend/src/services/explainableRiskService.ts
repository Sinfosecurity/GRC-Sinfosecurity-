import { AssessmentStatus, AssessmentType, Prisma, VendorIssueStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { calculateVendorRiskAt, RISK_SCORE_VERSION, type RiskEngineInput, type RiskEngineResult } from './deterministicRiskEngine';
import { tenantWhere } from '../security/tenant';
import { recordAudit } from './auditEventService';
import { scoringMethodologyService } from './scoringMethodologyService';
import { recommendTierFromIntake } from './vendorOnboardingScoring';

function residualResponseScore(response: string): number | null {
    const lower = response.trim().toLowerCase();
    if (!lower || lower === 'not answered' || lower === 'unknown') return null;
    if (lower === 'n/a' || lower.startsWith('not applicable')) return null;
    if (lower.startsWith('yes') || lower.includes('no exceptions') || lower.includes('type ii')) return 9;
    if (lower.startsWith('partial') || lower.startsWith('in progress') || lower.includes('outdated') || lower.includes('bridge')) return 5;
    if (lower.startsWith('no') || lower.startsWith('qualified')) return 2;
    return null;
}

export type AssessmentPurpose = 'INHERENT_INTAKE' | 'DUE_DILIGENCE' | 'REASSESSMENT' | 'OTHER';

const REASSESSMENT_TYPES = new Set<AssessmentType>([
    AssessmentType.ANNUAL_REVIEW,
    AssessmentType.TRIGGERED_REASSESSMENT,
    AssessmentType.CONTRACT_RENEWAL,
    AssessmentType.POST_INCIDENT,
    AssessmentType.CONTINUOUS_MONITORING,
    AssessmentType.FOURTH_PARTY_REVIEW,
]);

const SCORING_FINDING_STATUSES: VendorIssueStatus[] = [
    VendorIssueStatus.OPEN,
    VendorIssueStatus.IN_PROGRESS,
    VendorIssueStatus.PENDING_VALIDATION,
    VendorIssueStatus.RISK_ACCEPTED,
];

function toInput(vendor: {
    tier: string;
    dataTypesAccessed: string[];
    regulatoryScope: string[];
    hasSubcontractors: boolean;
}, extras: Partial<RiskEngineInput> = {}): RiskEngineInput {
    return {
        vendorCriticality: vendor.tier as RiskEngineInput['vendorCriticality'],
        dataSensitivityCount: vendor.dataTypesAccessed.length,
        regulatoryCount: vendor.regulatoryScope.length,
        hasSubcontractors: vendor.hasSubcontractors,
        ...extras,
    };
}

export function assessmentPurpose(assessment: {
    id: string;
    assessmentType: AssessmentType;
    respondentPlane?: string | null;
}, intakeAssessmentId?: string | null): AssessmentPurpose {
    if (intakeAssessmentId && assessment.id === intakeAssessmentId) return 'INHERENT_INTAKE';
    if (assessment.respondentPlane === 'VENDOR') return 'DUE_DILIGENCE';
    if (REASSESSMENT_TYPES.has(assessment.assessmentType)) return 'REASSESSMENT';
    return 'OTHER';
}

function isControlEligible(purpose: AssessmentPurpose, status: AssessmentStatus): boolean {
    return (purpose === 'DUE_DILIGENCE' || purpose === 'REASSESSMENT') && status === AssessmentStatus.COMPLETED;
}

function controlQuestionScores(responses: Array<{ score?: number | null; maxScore?: number | null; weight?: number | null; response?: string | null }>) {
    const scores: Array<{ score: number; maxScore: number; weight: number }> = [];
    for (const row of responses) {
        const raw = String(row.response || '').trim().toLowerCase();
        if (!raw || raw === 'not answered' || raw === 'unknown') continue;
        if (raw === 'n/a' || raw.startsWith('not applicable')) continue;
        const scored = residualResponseScore(row.response || '');
        if (scored == null) continue;
        scores.push({
            score: scored,
            maxScore: row.maxScore || 10,
            weight: row.weight || 1,
        });
    }
    return scores;
}

export async function persistVendorScore(params: {
    organizationId: string;
    vendorId: string;
    result: RiskEngineResult;
}) {
    const updated = await prisma.vendor.updateMany({
        where: { id: params.vendorId, organizationId: params.organizationId },
        data: {
            inherentRiskScore: params.result.inherentRisk,
            residualRiskScore: params.result.residualRisk,
            lastReviewDate: new Date(),
        },
    });
    if (updated.count !== 1) {
        throw new ApiError(404, 'Vendor not found');
    }
    return prisma.scoreCalculation.create({
        data: {
            organizationId: params.organizationId,
            vendorId: params.vendorId,
            scoreVersion: params.result.scoreVersion,
            inherentRisk: params.result.inherentRisk,
            controlEffectiveness: params.result.controlEffectiveness,
            residualRisk: params.result.residualRisk,
            riskBand: params.result.riskBand,
            inputs: params.result.inputs as Prisma.InputJsonValue,
            explanation: params.result.explanation,
            factors: params.result.factors as Prisma.InputJsonValue,
            calculatedAt: new Date(params.result.calculatedAt === 'deterministic' ? Date.now() : params.result.calculatedAt),
        },
    });
}

export const explainableRiskService = {
    async recalculate(organizationId: string, vendorId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: tenantWhere(organizationId, { id: vendorId }),
            include: { onboarding: true },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        const [issues, monitoringEvents, assessments, methodology] = await Promise.all([
            prisma.vendorIssue.findMany({
                where: {
                    organizationId,
                    vendorId,
                    status: { in: SCORING_FINDING_STATUSES },
                },
            }),
            prisma.vendorMonitoring.count({
                where: { organizationId, vendorId, requiresAction: true },
            }),
            prisma.vendorAssessment.findMany({
                where: { organizationId, vendorId },
                include: { responses: true },
                orderBy: { completedAt: 'desc' },
            }),
            scoringMethodologyService.requireActive(organizationId),
        ]);

        const intakeId = vendor.onboarding?.intakeAssessmentId || null;
        const intake = assessments.find((row) => row.id === intakeId);
        let authoritativeInherent: number | undefined;
        if (intake) {
            const answers = intake.responses.map((row) => ({ questionKey: row.questionId, response: row.response }));
            if (answers.some((row) => row.response)) {
                authoritativeInherent = recommendTierFromIntake(answers).inherentRisk;
            }
        }

        const controlSource = assessments.find((row) => isControlEligible(assessmentPurpose(row, intakeId), row.status));
        const questionScores = controlSource ? controlQuestionScores(controlSource.responses) : [];
        const noEligibleControls = !controlSource || questionScores.length === 0;
        const authoritativeTier = vendor.onboarding?.confirmedTier
            || vendor.onboarding?.recommendedTier
            || vendor.tier;

        const result = calculateVendorRiskAt(
            toInput({
                ...vendor,
                tier: authoritativeTier,
            }, {
                openFindings: issues.map((issue) => ({ severity: issue.severity })),
                monitoringEvents,
                questionScores: noEligibleControls ? [] : questionScores,
                noEligibleControls,
                authoritativeInherent,
                methodology: methodology.weights,
                methodologyVersion: methodology.version,
            }),
            new Date()
        );
        const record = await persistVendorScore({ organizationId, vendorId, result });
        await recordAudit({
            organizationId,
            action: 'risk.recalculate',
            resourceType: 'Vendor',
            resourceId: vendorId,
            result: 'success',
            metadata: {
                scoreVersion: result.scoreVersion,
                residualRisk: result.residualRisk,
                riskBand: result.riskBand,
                controlAssessmentId: controlSource?.id || null,
                assessmentPurpose: controlSource ? assessmentPurpose(controlSource, intakeId) : null,
            },
        });
        return { ...result, id: record.id, controlAssessmentId: controlSource?.id || null };
    },

    async latest(organizationId: string, vendorId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: tenantWhere(organizationId, { id: vendorId }),
            select: {
                id: true,
                name: true,
                servicesProvided: true,
                businessOwner: true,
                relationshipOwner: true,
                tier: true,
                inherentRiskScore: true,
                residualRiskScore: true,
                status: true,
            },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        const latest = await prisma.scoreCalculation.findFirst({
            where: { organizationId, vendorId },
            orderBy: { calculatedAt: 'desc' },
        });
        return {
            vendor,
            methodologyVersion: latest?.scoreVersion || RISK_SCORE_VERSION,
            latest,
        };
    },

    async history(organizationId: string, vendorId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: tenantWhere(organizationId, { id: vendorId }),
            select: { id: true },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        return prisma.scoreCalculation.findMany({
            where: { organizationId, vendorId },
            orderBy: { calculatedAt: 'desc' },
            take: 50,
        });
    },
};
