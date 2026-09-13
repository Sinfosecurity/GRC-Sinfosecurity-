import { VendorStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { assertVendorTransition } from './vendorLifecycle';

export const vendorOffboardService = {
    async preview(organizationId: string, vendorId: string) {
        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, organizationId },
            select: { id: true, name: true, status: true, terminatedAt: true },
        });
        if (!vendor) {
            throw new ApiError(404, 'Vendor not found');
        }
        const [openFindings, openAssessments, evidenceCount, auditCount] = await Promise.all([
            prisma.vendorIssue.count({
                where: { vendorId, organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            }),
            prisma.vendorAssessment.count({
                where: {
                    vendorId,
                    organizationId,
                    status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'OVERDUE'] },
                },
            }),
            prisma.storedObject.count({
                where: { organizationId, ownerType: 'vendor', ownerId: vendorId },
            }),
            prisma.auditEvent.count({
                where: { organizationId, resourceId: vendorId },
            }),
        ]);
        return {
            vendor,
            outstanding: {
                openFindings,
                openAssessments,
                evidenceCount,
                auditCount,
            },
            recordsRetained: true,
            canTerminate: vendor.status !== VendorStatus.TERMINATED && vendor.status !== VendorStatus.REJECTED,
        };
    },

    async offboard(input: {
        organizationId: string;
        vendorId: string;
        actorUserId: string;
        exitNotes?: string;
        acknowledgeOutstanding?: boolean;
    }) {
        const preview = await this.preview(input.organizationId, input.vendorId);
        if (!preview.canTerminate) {
            throw new ApiError(409, `Vendor cannot be offboarded from status ${preview.vendor.status}`);
        }
        const outstandingCount = preview.outstanding.openFindings + preview.outstanding.openAssessments;
        if (outstandingCount > 0 && !input.acknowledgeOutstanding) {
            throw new ApiError(409, 'Outstanding findings or assessments remain. Acknowledge them to terminate without destroying records.');
        }

        const from = preview.vendor.status as VendorStatus;
        const next = from === VendorStatus.OFFBOARDING ? VendorStatus.TERMINATED : VendorStatus.OFFBOARDING;
        if (from !== next) {
            assertVendorTransition(from, next);
        }

        await prisma.$transaction(async (tx) => {
            await tx.vendor.updateMany({
                where: { id: input.vendorId, organizationId: input.organizationId },
                data: {
                    status: next,
                    terminatedAt: next === VendorStatus.TERMINATED ? new Date() : preview.vendor.terminatedAt,
                },
            });
            await tx.vendorReview.create({
                data: {
                    vendorId: input.vendorId,
                    organizationId: input.organizationId,
                    reviewType: 'OFFBOARDING_REVIEW',
                    reviewDate: new Date(),
                    reviewer: input.actorUserId,
                    decision: next === VendorStatus.TERMINATED ? 'TERMINATE' : 'EXTEND_REVIEW',
                    notes: input.exitNotes || null,
                    findings: {
                        outstanding: preview.outstanding,
                        acknowledged: Boolean(input.acknowledgeOutstanding),
                        recordsRetained: true,
                    },
                },
            });
        });

        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: next === VendorStatus.TERMINATED ? 'vendor.terminated' : 'vendor.offboarding_started',
            resourceType: 'Vendor',
            resourceId: input.vendorId,
            result: 'success',
            metadata: { outstanding: preview.outstanding, recordsRetained: true },
        });

        return {
            ...preview,
            vendor: { ...preview.vendor, status: next },
            nextStatus: next,
            recordsRetained: true,
        };
    },
};
