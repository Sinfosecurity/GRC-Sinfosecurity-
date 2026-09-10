import { VendorDocumentType } from '@prisma/client';
import { evidenceLinkageService } from '../services/evidenceLinkageService';
import { prisma } from '../config/database';
import { objectStorageService } from '../services/objectStorageService';

jest.mock('../config/database', () => ({
    prisma: {
        vendor: { findFirst: jest.fn() },
        vendorAssessment: { findFirst: jest.fn(), update: jest.fn() },
        vendorIssue: { findFirst: jest.fn(), updateMany: jest.fn() },
        vendorDocument: { create: jest.fn() },
        evidenceLink: { create: jest.fn() },
        assessmentResponse: { updateMany: jest.fn() },
        $transaction: jest.fn(),
    },
}));

jest.mock('../services/objectStorageService', () => ({
    objectStorageService: {
        upload: jest.fn(),
        remove: jest.fn(),
    },
}));

jest.mock('../services/auditEventService', () => ({
    recordAudit: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
    vendor: { findFirst: jest.Mock };
    vendorAssessment: { findFirst: jest.Mock };
    $transaction: jest.Mock;
};

describe('atomic evidence linkage', () => {
    it('rejects upload when the vendor is not in the tenant', async () => {
        mockedPrisma.vendor.findFirst.mockResolvedValue(null);
        await expect(
            evidenceLinkageService.uploadLinked({
                organizationId: 'org-a',
                uploadedBy: 'user-a',
                vendorId: 'vendor-b',
                filename: 'soc2.pdf',
                contentType: 'application/pdf',
                buffer: Buffer.from('%PDF'),
            })
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(objectStorageService.upload).not.toHaveBeenCalled();
    });

    it('creates stored object, vendor document, and evidence link together', async () => {
        mockedPrisma.vendor.findFirst.mockResolvedValue({ id: 'vendor-a', name: 'Acme' });
        (objectStorageService.upload as jest.Mock).mockResolvedValue({
            id: 'obj-1',
            filename: 'soc2.pdf',
            size: 12,
            contentType: 'application/pdf',
            storageKey: 'key',
            checksum: 'abc',
            scanStatus: 'NOT_CONFIGURED',
        });
        mockedPrisma.$transaction.mockImplementation(async (fn: any) =>
            fn({
                vendorDocument: { create: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
                evidenceLink: { create: jest.fn().mockResolvedValue({ id: 'link-1' }) },
                vendorAssessment: { update: jest.fn() },
                assessmentResponse: { updateMany: jest.fn() },
                vendorIssue: { updateMany: jest.fn() },
            })
        );

        const result = await evidenceLinkageService.uploadLinked({
            organizationId: 'org-a',
            uploadedBy: 'user-a',
            vendorId: 'vendor-a',
            filename: 'soc2.pdf',
            contentType: 'application/pdf',
            buffer: Buffer.from('%PDF'),
            documentType: VendorDocumentType.SOC2_REPORT,
        });
        expect(result.stored.id).toBe('obj-1');
        expect(result.link.id).toBe('link-1');
        expect(result.document.id).toBe('doc-1');
    });
});
