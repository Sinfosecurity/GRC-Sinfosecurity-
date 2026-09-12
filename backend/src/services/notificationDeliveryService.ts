import { prisma } from '../config/database';
import { isProviderConfigured } from '../config/env';
import logger from '../config/logger';
import { sendSmtpMail } from './smtpClient';

export type NotificationEvent =
    | 'assessment.assigned'
    | 'assessment.due_soon'
    | 'assessment.overdue'
    | 'assessment.completed'
    | 'finding.assigned'
    | 'finding.closed'
    | 'remediation.due_soon'
    | 'remediation.overdue'
    | 'remediation.requested'
    | 'remediation.validation_requested'
    | 'approval.requested'
    | 'approval.decision'
    | 'monitoring.critical'
    | 'vendor.review_due'
    | 'user.invitation'
    | 'auth.password_reset'
    | 'ops.alert';

export function emailStatus() {
    return isProviderConfigured('SENDGRID_API_KEY') || isProviderConfigured('SMTP_HOST')
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
        try {
            if (isProviderConfigured('SENDGRID_API_KEY')) {
                const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
                if (!response.ok) {
                    throw new Error(`SendGrid responded ${response.status}`);
                }
            } else if (isProviderConfigured('SMTP_HOST')) {
                await sendSmtpMail({
                    to: input.emailTo,
                    subject: input.title,
                    body: input.body,
                });
            }
        } catch (error) {
            logger.error('Email notification failed; in-app record unchanged', {
                eventType: input.eventType,
                error: error instanceof Error ? error.message : String(error),
            });
            return { inApp, email: 'FAILED' as const };
        }
        return { inApp, email: 'DELIVERED' as const };
    }

    return { inApp, email: email ? emailStatus() : 'DISABLED' };
}

export async function notifyUser(input: {
    organizationId: string;
    userId?: string | null;
    eventType: NotificationEvent;
    title: string;
    body: string;
    resourceType?: string;
    resourceId?: string;
}) {
    if (!input.userId) {
        return { inApp: false, email: 'SKIPPED' as const };
    }
    try {
        const user = await prisma.user.findFirst({
            where: { id: input.userId, organizationId: input.organizationId },
            select: { email: true },
        });
        return await notify({
            ...input,
            userId: input.userId,
            emailTo: user?.email,
        });
    } catch (error) {
        logger.error('Notification delivery failed; business record unchanged', {
            eventType: input.eventType,
            error: error instanceof Error ? error.message : String(error),
        });
        return { inApp: false, email: 'FAILED' as const };
    }
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

export async function scanDueNotifications(now = new Date()) {
    const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sent: Array<{ eventType: NotificationEvent; resourceId: string }> = [];

    const openAssessments = await prisma.vendorAssessment.findMany({
        where: {
            status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'OVERDUE'] },
            assignedTo: { not: null },
            dueDate: { not: null },
        },
        select: { id: true, organizationId: true, assignedTo: true, dueDate: true, assessmentType: true, status: true },
    });

    for (const assessment of openAssessments) {
        if (!assessment.assignedTo || !assessment.dueDate) continue;
        const overdue = assessment.dueDate < now;
        const eventType: NotificationEvent = overdue ? 'assessment.overdue' : 'assessment.due_soon';
        if (!overdue && assessment.dueDate > dueSoon) continue;
        const already = await prisma.inAppNotification.findFirst({
            where: {
                organizationId: assessment.organizationId,
                userId: assessment.assignedTo,
                eventType,
                resourceId: assessment.id,
            },
        });
        if (already) continue;
        await notifyUser({
            organizationId: assessment.organizationId,
            userId: assessment.assignedTo,
            eventType,
            title: overdue ? 'Assessment overdue' : 'Assessment due soon',
            body: `${assessment.assessmentType} assessment is ${overdue ? 'overdue' : 'due soon'}.`,
            resourceType: 'VendorAssessment',
            resourceId: assessment.id,
        });
        sent.push({ eventType, resourceId: assessment.id });
    }

    const openFindings = await prisma.vendorIssue.findMany({
        where: {
            assignedTo: { not: null },
            targetRemediationDate: { not: null },
            status: { notIn: ['CLOSED', 'RESOLVED', 'RISK_ACCEPTED'] },
        },
        select: {
            id: true,
            organizationId: true,
            assignedTo: true,
            targetRemediationDate: true,
            title: true,
        },
    });

    for (const finding of openFindings) {
        if (!finding.assignedTo || !finding.targetRemediationDate) continue;
        const overdue = finding.targetRemediationDate < now;
        const eventType: NotificationEvent = overdue ? 'remediation.overdue' : 'remediation.due_soon';
        if (!overdue && finding.targetRemediationDate > dueSoon) continue;
        const already = await prisma.inAppNotification.findFirst({
            where: {
                organizationId: finding.organizationId,
                userId: finding.assignedTo,
                eventType,
                resourceId: finding.id,
            },
        });
        if (already) continue;
        await notifyUser({
            organizationId: finding.organizationId,
            userId: finding.assignedTo,
            eventType,
            title: overdue ? 'Remediation overdue' : 'Remediation due soon',
            body: `${finding.title} is ${overdue ? 'overdue' : 'due soon'}.`,
            resourceType: 'VendorIssue',
            resourceId: finding.id,
        });
        sent.push({ eventType, resourceId: finding.id });
    }

    return sent;
}
