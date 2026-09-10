import { DecisionBriefStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { explainableRiskService } from '../services/explainableRiskService';
import { riskDecisionBriefService } from '../services/riskDecisionBriefService';

jest.mock('../config/database', () => ({
    prisma: {
        riskDecisionBrief: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        vendor: { updateMany: jest.fn() },
    },
}));

jest.mock('../services/auditEventService', () => ({
    recordAudit: jest.fn(),
}));

jest.mock('../services/explainableRiskService', () => ({
    explainableRiskService: {
        recalculate: jest.fn(),
    },
}));

const mockedPrisma = prisma as unknown as {
    riskDecisionBrief: { findFirst: jest.Mock; update: jest.Mock };
    vendor: { updateMany: jest.Mock };
};

describe('RISK_ACCEPTED does not recalculate residual risk', () => {
    it('records acceptance metadata and leaves residual risk unchanged', async () => {
        const brief = {
            id: 'brief-1',
            organizationId: 'org-a',
            vendorId: 'vendor-a',
            status: DecisionBriefStatus.DRAFT,
            residualRisk: 72,
            riskBand: 'HIGH',
            nextReviewDate: null,
            immutableSnapshot: { score: { residualRisk: 72, riskBand: 'HIGH' } },
        };
        mockedPrisma.riskDecisionBrief.findFirst.mockResolvedValue(brief);
        mockedPrisma.riskDecisionBrief.update.mockImplementation(async ({ data }) => ({ ...brief, ...data }));
        mockedPrisma.vendor.updateMany.mockResolvedValue({ count: 1 });

        const updated = await riskDecisionBriefService.decide('org-a', 'brief-1', {
            decision: 'RISK_ACCEPTED',
            reviewerAnalysis: 'Board accepted residual exposure',
            conditions: 'Quarterly review',
            nextReviewDate: '2027-01-01T00:00:00.000Z',
            actorUserId: 'user-1',
        });

        expect(explainableRiskService.recalculate).not.toHaveBeenCalled();
        expect(updated.residualRisk).toBe(72);
        expect(updated.riskBand).toBe('HIGH');
        const snapshot = updated.immutableSnapshot as {
            acceptance: {
                acceptedBy: string;
                acceptedAt: string;
                acceptanceReason: string;
                acceptanceExpiry: string;
                conditions: string;
                residualRisk: number;
                riskBand: string;
            };
        };
        expect(snapshot.acceptance).toMatchObject({
            acceptedBy: 'user-1',
            acceptanceReason: 'Board accepted residual exposure',
            conditions: 'Quarterly review',
            residualRisk: 72,
            riskBand: 'HIGH',
        });
        expect(snapshot.acceptance.acceptedAt).toBeTruthy();
        expect(snapshot.acceptance.acceptanceExpiry).toBe('2027-01-01T00:00:00.000Z');
    });
});
