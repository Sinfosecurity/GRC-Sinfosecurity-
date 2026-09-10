import { VendorDocumentType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { objectStorageService } from './objectStorageService';
import { recordAudit } from './auditEventService';
import { tenantWhere } from '../security/tenant';

export type LinkedUploadInput = {
    organizationId: string;
    uploadedBy: string;
    vendorId: string;
    assessmentId?: string;
    issueId?: string;
    questionId?: string;
    filename: string;
    contentType: string;
    buffer: Buffer;
    classification?: string;
    documentType?: VendorDocumentType;
    title?: string;
};

export const evidenceLinkageService = {
    async uploadLinked(input: LinkedUploadInput) {
        const vendor = await prisma.vendor.findFirst({
            where: tenantWhere(input.organizationId, { id: input.vendorId }),
            select: { id: true, name: true },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }

        if (input.assessmentId) {
            const assessment = await prisma.vendorAssessment.findFirst({
                where: {
                    id: input.assessmentId,
                    organizationId: input.organizationId,
                    vendorId: input.vendorId,
                },
                select: { id: true },
            });
            if (!assessment) {
                throw new ApiError(404, 'Assessment not found for this vendor');
            }
        }

        if (input.issueId) {
            const issue = await prisma.vendorIssue.findFirst({
                where: {
                    id: input.issueId,
                    organizationId: input.organizationId,
                    vendorId: input.vendorId,
                },
                select: { id: true },
            });
            if (!issue) {
                throw new ApiError(404, 'Finding not found for this vendor');
            }
        }

        const stored = await objectStorageService.upload({
            organizationId: input.organizationId,
            uploadedBy: input.uploadedBy,
            ownerType: 'vendor',
            ownerId: input.vendorId,
            filename: input.filename,
            contentType: input.contentType,
            buffer: input.buffer,
            classification: input.classification,
        });

        try {
            const linked = await prisma.$transaction(async (tx) => {
                const document = await tx.vendorDocument.create({
                    data: {
                        vendorId: input.vendorId,
                        organizationId: input.organizationId,
                        assessmentId: input.assessmentId,
                        documentType: input.documentType || VendorDocumentType.OTHER,
                        title: input.title || stored.filename,
                        fileName: stored.filename,
                        fileSize: stored.size,
                        fileType: stored.contentType,
                        fileUrl: stored.storageKey,
                        fileHash: stored.checksum,
                        storageKey: stored.storageKey,
                        checksum: stored.checksum,
                        scanStatus: stored.scanStatus,
                        storedObjectId: stored.id,
                        uploadedBy: input.uploadedBy,
                    },
                });
                const link = await tx.evidenceLink.create({
                    data: {
                        organizationId: input.organizationId,
                        storedObjectId: stored.id,
                        vendorId: input.vendorId,
                        assessmentId: input.assessmentId,
                        issueId: input.issueId,
                        questionId: input.questionId,
                        createdBy: input.uploadedBy,
                    },
                });
                if (input.assessmentId) {
                    await tx.vendorAssessment.update({
                        where: { id: input.assessmentId },
                        data: {
                            evidenceCollected: true,
                            evidenceCount: { increment: 1 },
                        },
                    });
                }
                if (input.assessmentId && input.questionId) {
                    await tx.assessmentResponse.updateMany({
                        where: { assessmentId: input.assessmentId, questionId: input.questionId },
                        data: { hasEvidence: true },
                    });
                }
                if (input.issueId) {
                    await tx.vendorIssue.updateMany({
                        where: { id: input.issueId, organizationId: input.organizationId },
                        data: { evidenceUrl: stored.id },
                    });
                }
                return { document, link };
            });

            await recordAudit({
                organizationId: input.organizationId,
                actorUserId: input.uploadedBy,
                action: 'evidence.link',
                resourceType: 'EvidenceLink',
                resourceId: linked.link.id,
                result: 'success',
                metadata: {
                    storedObjectId: stored.id,
                    vendorId: input.vendorId,
                    assessmentId: input.assessmentId,
                    issueId: input.issueId,
                    questionId: input.questionId,
                },
            });

            return { stored, ...linked };
        } catch (error) {
            await objectStorageService.remove(stored.id, input.organizationId, input.uploadedBy).catch(() => undefined);
            throw error;
        }
    },
};
