import { Prisma, VendorIssueStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { calculateVendorRiskAt, RISK_SCORE_VERSION, type RiskEngineInput, type RiskEngineResult } from './deterministicRiskEngine';
import { tenantWhere } from '../security/tenant';
import { recordAudit } from './auditEventService';

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
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        const issues = await prisma.vendorIssue.findMany({
            where: {
                organizationId,
                vendorId,
                status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS, VendorIssueStatus.PENDING_VALIDATION] },
            },
        });
        const monitoringEvents = await prisma.vendorMonitoring.count({
            where: { organizationId, vendorId, requiresAction: true },
        });
        const result = calculateVendorRiskAt(
            toInput(vendor, {
                openFindings: issues.map((issue) => ({ severity: issue.severity })),
                monitoringEvents,
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
            metadata: { scoreVersion: result.scoreVersion, residualRisk: result.residualRisk, riskBand: result.riskBand },
        });
        return { ...result, id: record.id };
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
