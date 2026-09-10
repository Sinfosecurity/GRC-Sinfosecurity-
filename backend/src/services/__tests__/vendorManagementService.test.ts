import { VendorStatus, VendorTier, VendorType } from '@prisma/client';
import vendorManagementService from '../vendorManagementService';
import { prisma } from '../../config/database';

jest.mock('../../config/database', () => ({
    prisma: {
        vendor: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('../explainableRiskService', () => ({
    explainableRiskService: {
        recalculate: jest.fn().mockResolvedValue({ id: 'score-1' }),
    },
}));

const mockedPrisma = prisma as unknown as {
    vendor: { create: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
};

describe('VendorManagementService tenant scoping', () => {
    beforeEach(() => {
        mockedPrisma.vendor.create.mockReset();
        mockedPrisma.vendor.findFirst.mockReset();
        mockedPrisma.vendor.findUnique.mockReset();
    });

    it('creates vendors with the caller organizationId', async () => {
        mockedPrisma.vendor.create.mockResolvedValue({
            id: 'vendor-1',
            name: 'Acme',
            organizationId: 'org-a',
            tier: VendorTier.HIGH,
            status: VendorStatus.PROPOSED,
        });
        mockedPrisma.vendor.findUnique.mockResolvedValue({
            id: 'vendor-1',
            name: 'Acme',
            organizationId: 'org-a',
            tier: VendorTier.HIGH,
            status: VendorStatus.PROPOSED,
        });

        const vendor = await vendorManagementService.createVendor({
            name: 'Acme',
            vendorType: VendorType.SAAS,
            category: 'CLOUD_HOSTING',
            tier: VendorTier.HIGH,
            primaryContact: 'owner@acme.test',
            contactEmail: 'owner@acme.test',
            servicesProvided: 'SaaS',
            dataTypesAccessed: ['PII'],
            geographicFootprint: ['US'],
            regulatoryScope: ['SOC2'],
            organizationId: 'org-a',
        });

        expect(mockedPrisma.vendor.create).toHaveBeenCalled();
        const payload = mockedPrisma.vendor.create.mock.calls[0][0].data;
        expect(payload.organizationId).toBe('org-a');
        expect(vendor.organizationId).toBe('org-a');
    });

    it('looks up vendors by id AND organizationId', async () => {
        mockedPrisma.vendor.findFirst.mockResolvedValue(null);
        await expect(vendorManagementService.getVendorById('vendor-b', 'org-a')).rejects.toMatchObject({
            statusCode: 404,
        });
        expect(mockedPrisma.vendor.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'vendor-b', organizationId: 'org-a' },
            })
        );
    });
});
