import { persistVendorScore } from '../services/explainableRiskService';
import { prisma } from '../config/database';
import { calculateVendorRiskAt } from '../services/deterministicRiskEngine';

jest.mock('../config/database', () => ({
    prisma: {
        vendor: { updateMany: jest.fn() },
        scoreCalculation: { create: jest.fn() },
    },
}));

jest.mock('../services/auditEventService', () => ({
    recordAudit: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
    vendor: { updateMany: jest.Mock };
    scoreCalculation: { create: jest.Mock };
};

describe('persistVendorScore tenant scope', () => {
    const result = calculateVendorRiskAt(
        { vendorCriticality: 'HIGH', dataSensitivityCount: 1 },
        new Date('2026-09-10T00:00:00.000Z')
    );

    beforeEach(() => {
        mockedPrisma.vendor.updateMany.mockReset();
        mockedPrisma.scoreCalculation.create.mockReset();
    });

    it('writes scores only when vendor id and organizationId both match', async () => {
        mockedPrisma.vendor.updateMany.mockResolvedValue({ count: 1 });
        mockedPrisma.scoreCalculation.create.mockResolvedValue({ id: 'score-1' });

        await persistVendorScore({
            organizationId: 'org-a',
            vendorId: 'vendor-a',
            result,
        });

        expect(mockedPrisma.vendor.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'vendor-a', organizationId: 'org-a' },
            })
        );
        expect(mockedPrisma.scoreCalculation.create).toHaveBeenCalled();
    });

    it('fails safely and does not persist a score when the tenant/vendor pair does not exist', async () => {
        mockedPrisma.vendor.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            persistVendorScore({
                organizationId: 'org-a',
                vendorId: 'vendor-b',
                result,
            })
        ).rejects.toMatchObject({ statusCode: 404 });

        expect(mockedPrisma.scoreCalculation.create).not.toHaveBeenCalled();
    });
});
