import { prisma } from '../config/database';
import { recordAudit } from './auditEventService';
import { maskEmail } from './publicFrontendUrl';
import { mapResendEventType } from './resendClient';

export type ApplicationDeliveryStatus =
    | 'ACCEPTED'
    | 'SENT'
    | 'DELIVERED'
    | 'BOUNCED'
    | 'COMPLAINED'
    | 'FAILED'
    | 'REJECTED'
    | 'NOT_CONFIGURED';

export async function applyProviderDeliveryEvent(input: {
    provider: string;
    providerEventId: string;
    providerMessageId?: string | null;
    eventType: string;
    recipient?: string | null;
    lastError?: string | null;
}) {
    const deliveryStatus = mapResendEventType(input.eventType);
    if (!deliveryStatus) {
        return { ignored: true as const };
    }
    const existing = await prisma.emailDeliveryEvent.findUnique({
        where: { providerEventId: input.providerEventId },
    });
    if (existing) {
        return { idempotent: true as const, deliveryStatus: existing.deliveryStatus };
    }

    const invitation = input.providerMessageId
        ? await prisma.accountInvitation.findFirst({
            where: { providerMessageId: input.providerMessageId },
        })
        : null;
    const vendorInvitation = !invitation && input.providerMessageId
        ? await prisma.vendorAssessmentInvitation.findFirst({
            where: { providerMessageId: input.providerMessageId },
        })
        : null;

    await prisma.emailDeliveryEvent.create({
        data: {
            provider: input.provider,
            providerEventId: input.providerEventId,
            providerMessageId: input.providerMessageId || undefined,
            eventType: input.eventType,
            deliveryStatus,
            recipientMask: input.recipient ? maskEmail(input.recipient) : invitation ? maskEmail(invitation.email) : undefined,
            resourceType: invitation ? 'AccountInvitation' : vendorInvitation ? 'VendorAssessmentInvitation' : undefined,
            resourceId: invitation?.id || vendorInvitation?.id,
            organizationId: invitation?.organizationId || vendorInvitation?.organizationId,
            lastError: input.lastError || undefined,
        },
    });

    if (invitation) {
        const now = new Date();
        await prisma.accountInvitation.update({
            where: { id: invitation.id },
            data: {
                emailDeliveryStatus: deliveryStatus,
                emailDeliveredAt: deliveryStatus === 'DELIVERED' ? now : invitation.emailDeliveredAt,
                emailFailedAt: ['BOUNCED', 'FAILED', 'COMPLAINED', 'REJECTED'].includes(deliveryStatus) ? now : invitation.emailFailedAt,
                emailLastError: input.lastError || invitation.emailLastError,
            },
        });
    }
    if (vendorInvitation) {
        const now = new Date();
        await prisma.vendorAssessmentInvitation.update({
            where: { id: vendorInvitation.id },
            data: {
                emailDeliveryStatus: deliveryStatus,
                emailDeliveredAt: deliveryStatus === 'DELIVERED' ? now : vendorInvitation.emailDeliveredAt,
                emailFailedAt: ['BOUNCED', 'FAILED', 'COMPLAINED', 'REJECTED'].includes(deliveryStatus) ? now : vendorInvitation.emailFailedAt,
                emailLastError: input.lastError || vendorInvitation.emailLastError,
            },
        });
    }

    if (input.providerMessageId) {
        await prisma.notificationDeliveryLog.updateMany({
            where: { providerMessageId: input.providerMessageId },
            data: {
                status: deliveryStatus,
                lastError: input.lastError || undefined,
                deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : undefined,
                failedAt: ['BOUNCED', 'FAILED', 'COMPLAINED', 'REJECTED'].includes(deliveryStatus) ? new Date() : undefined,
            },
        });
    }

    await recordAudit({
        organizationId: invitation?.organizationId,
        action: 'email.delivery_event',
        resourceType: invitation ? 'AccountInvitation' : 'Email',
        resourceId: invitation?.id || input.providerMessageId || undefined,
        result: 'success',
        metadata: {
            provider: input.provider,
            eventType: input.eventType,
            deliveryStatus,
            providerMessageId: input.providerMessageId,
        },
    });

    return { applied: true as const, deliveryStatus, invitationId: invitation?.id || null };
}
