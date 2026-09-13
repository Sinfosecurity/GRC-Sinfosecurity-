import { prisma } from '../config/database';
import { maskEmail } from './publicFrontendUrl';
import logger from '../config/logger';

export async function recordNotificationDelivery(input: {
    organizationId?: string | null;
    eventType: string;
    status: string;
    recipient?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    provider?: string | null;
    providerMessageId?: string | null;
    lastError?: string | null;
}) {
    try {
        const now = new Date();
        await prisma.notificationDeliveryLog.create({
            data: {
                organizationId: input.organizationId || undefined,
                eventType: input.eventType,
                status: input.status,
                recipientMask: input.recipient ? maskEmail(input.recipient) : undefined,
                resourceType: input.resourceType || undefined,
                resourceId: input.resourceId || undefined,
                provider: input.provider || undefined,
                providerMessageId: input.providerMessageId || undefined,
                lastError: input.lastError || undefined,
                sentAt: ['ACCEPTED', 'SENT', 'DELIVERED'].includes(input.status) ? now : undefined,
                deliveredAt: input.status === 'DELIVERED' ? now : undefined,
                failedAt: ['FAILED', 'BOUNCED', 'REJECTED', 'COMPLAINED'].includes(input.status) ? now : undefined,
            },
        });
        if (input.resourceType === 'AccountInvitation' && input.resourceId) {
            await prisma.accountInvitation.updateMany({
                where: { id: input.resourceId, organizationId: input.organizationId || undefined },
                data: {
                    emailProvider: input.provider || undefined,
                    providerMessageId: input.providerMessageId || undefined,
                    emailDeliveryStatus: input.status,
                    emailSentAt: ['ACCEPTED', 'SENT', 'DELIVERED'].includes(input.status) ? now : undefined,
                    emailDeliveredAt: input.status === 'DELIVERED' ? now : undefined,
                    emailFailedAt: ['FAILED', 'BOUNCED', 'REJECTED', 'COMPLAINED'].includes(input.status) ? now : undefined,
                    emailLastError: input.lastError || undefined,
                },
            });
        }
    } catch (error) {
        logger.error('Failed to persist notification delivery log', {
            eventType: input.eventType,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function recordOperationalEvent(input: {
    organizationId?: string | null;
    kind: string;
    failureClass?: string | null;
    requestId?: string | null;
    actorUserId?: string | null;
    metadata?: Record<string, unknown> | null;
}) {
    try {
        await prisma.operationalEvent.create({
            data: {
                organizationId: input.organizationId || undefined,
                kind: input.kind,
                failureClass: input.failureClass || undefined,
                requestId: input.requestId || undefined,
                actorUserId: input.actorUserId || undefined,
                metadata: input.metadata ? (input.metadata as object) : undefined,
            },
        });
    } catch (error) {
        logger.error('Failed to persist operational event', {
            kind: input.kind,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
