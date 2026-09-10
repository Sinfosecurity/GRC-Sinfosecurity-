import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';
import logger from '../config/logger';

export type NotificationEvent =
    | 'assessment.assigned'
    | 'assessment.due_soon'
    | 'assessment.overdue'
    | 'finding.assigned'
    | 'remediation.due_soon'
    | 'remediation.overdue'
    | 'approval.requested'
    | 'approval.decision'
    | 'monitoring.critical'
    | 'vendor.review_due'
    | 'user.invitation'
    | 'auth.password_reset';

export function emailStatus() {
    return isProviderConfigured('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD') ||
        isProviderConfigured('SENDGRID_API_KEY')
        ? 'CONNECTED'
        : 'NOT_CONFIGURED';
}

export async function notify(input: {
    organizationId: string;
    userId: string;
    eventType: NotificationEvent;
    title: string;
    body: string;
    resourceType?: string;
    resourceId?: string;
    emailTo?: string;
}) {
    const pref = await prisma.notificationPreference.findUnique({
        where: { userId_eventType: { userId: input.userId, eventType: input.eventType } },
    });
    const inApp = pref ? pref.inApp : true;
    const email = pref ? pref.email : true;
    const dedupeKey = `${input.eventType}:${input.userId}:${input.resourceId || 'none'}:${new Date().toISOString().slice(0, 13)}`;

    if (inApp) {
        try {
            await prisma.inAppNotification.create({
                data: {
                    organizationId: input.organizationId,
                    userId: input.userId,
                    eventType: input.eventType,
                    title: input.title,
                    body: input.body,
                    resourceType: input.resourceType,
                    resourceId: input.resourceId,
                    dedupeKey,
                },
            });
        } catch {
            // Unique dedupe key prevents notification storms.
        }
    }

    if (email && input.emailTo) {
        if (emailStatus() === 'NOT_CONFIGURED') {
            logger.info('Email notification skipped: email provider not configured', {
                eventType: input.eventType,
            });
            return { inApp, email: 'NOT_CONFIGURED' as const };
        }
        // Provider-specific send is implemented only when credentials exist.
        if (isProviderConfigured('SENDGRID_API_KEY')) {
            await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: input.emailTo }] }],
                    from: {
                        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@supremerisk.com',
                        name: process.env.SENDGRID_FROM_NAME || 'Supreme Risk',
                    },
                    subject: input.title,
                    content: [{ type: 'text/plain', value: input.body }],
                }),
            });
        }
    }

    return { inApp, email: email ? emailStatus() : 'DISABLED' };
}

export async function listNotifications(organizationId: string, userId: string) {
    return prisma.inAppNotification.findMany({
        where: { organizationId, userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
}

export async function markRead(organizationId: string, userId: string, id: string) {
    return prisma.inAppNotification.updateMany({
        where: { id, organizationId, userId },
        data: { readAt: new Date() },
    });
}
