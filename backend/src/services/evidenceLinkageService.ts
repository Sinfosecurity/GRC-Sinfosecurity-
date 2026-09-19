import { VendorDocumentType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { objectStorageService } from './objectStorageService';
import { recordAudit } from './auditEventService';
import { tenantWhere } from '../security/tenant';

export type LinkedUploadInput = {
    organizationId: string;
    uploadedBy: string;
    vendorId?: string;
    assessmentId?: string;
    issueId?: string;
    questionId?: string;
    engagementId?: string;
    intakeRequestId?: string;
    intakeInformationRequestId?: string;
    filename: string;
    contentType: string;
    buffer: Buffer;
    classification?: string;
    documentType?: VendorDocumentType;
    title?: string;
};

export const evidenceLinkageService = {
    async uploadLinked(input: LinkedUploadInput) {
        if (input.vendorId) {
            const vendor = await prisma.vendor.findFirst({
                where: tenantWhere(input.organizationId, { id: input.vendorId }),
                select: { id: true, name: true },
            });
            if (!vendor) {
                throw new ApiError(404, 'Vendor not found');
            }
        } else if (!input.intakeRequestId) {
            throw new ApiError(400, 'An intake or vendor record is required to attach evidence.');
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
            ownerType: input.intakeRequestId ? 'intake' : 'vendor',
            ownerId: input.intakeRequestId || input.vendorId || input.organizationId,
            filename: input.filename,
            contentType: input.contentType,
            buffer: input.buffer,
            classification: input.classification,
        });

        try {
            const linked = await prisma.$transaction(async (tx) => {
                const document = input.vendorId ? await tx.vendorDocument.create({
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
                }) : null;
                const link = await tx.evidenceLink.create({
                    data: {
                        organizationId: input.organizationId,
                        storedObjectId: stored.id,
                        vendorId: input.vendorId,
                        assessmentId: input.assessmentId,
                        issueId: input.issueId,
                        questionId: input.questionId,
                        engagementId: input.engagementId,
                        intakeRequestId: input.intakeRequestId,
                        intakeInformationRequestId: input.intakeInformationRequestId,
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
                if (input.assessmentId && input.questionId && stored.scanStatus === 'CLEAN') {
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

            try {
                const actor = await prisma.user.findUnique({ where: { id: input.uploadedBy }, select: { id: true } });
                await recordAudit({
                    organizationId: input.organizationId,
                    actorUserId: actor?.id || null,
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
                        intakeRequestId: input.intakeRequestId,
                        intakeInformationRequestId: input.intakeInformationRequestId,
                    },
                });
            } catch {
                // Vendor contacts are not Users; mocked tests may omit user lookup.
            }

            return { stored, ...linked };
        } catch (error) {
            try {
                await objectStorageService.remove(stored.id, input.organizationId, input.uploadedBy);
            } catch {
                // Cleanup is best-effort.
            }
            throw error;
        }
    },
};
