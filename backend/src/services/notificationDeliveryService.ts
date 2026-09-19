import { prisma } from '../config/database';
import logger from '../config/logger';
import { maskEmail } from './publicFrontendUrl';
import { sendSmtpMail } from './smtpClient';
import { recordNotificationDelivery } from './opsEventService';
import {
    emailFromAddress,
    emailFromName,
    emailReplyTo,
    safeProviderError,
    selectedEmailProvider,
} from './emailProvider';
import { getResendEmail, sendResendEmail } from './resendClient';
import {
    assessmentDueSoonEmail,
    customerAppUrl,
    genericOperationalEmail,
    remediationDueEmail,
} from './transactionalEmail';

export type NotificationEvent =
    | 'assessment.assigned'
    | 'assessment.due_soon'
    | 'assessment.overdue'
    | 'assessment.completed'
    | 'finding.assigned'
    | 'finding.confirmed'
    | 'finding.closed'
    | 'residual_risk.ready'
    | 'remediation.due_soon'
    | 'remediation.overdue'
    | 'remediation.requested'
    | 'remediation.validation_requested'
    | 'approval.requested'
    | 'approval.decision'
    | 'attestation.assigned'
    | 'monitoring.critical'
    | 'vendor.review_due'
    | 'user.invitation'
    | 'auth.password_reset'
    | 'ops.alert'
    | 'automation.action'
    | 'intake.submitted'
    | 'intake.assigned'
    | 'intake.reassigned'
    | 'intake.information_requested'
    | 'intake.information_received'
    | 'intake.completed';

export type EmailProviderStatus = 'CONNECTED' | 'DEGRADED' | 'ERROR' | 'NOT_CONFIGURED';
export type EmailDeliveryStatus = 'ACCEPTED' | 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED';

let lastDelivery: 'none' | 'success' | 'failure' = 'none';

export function resetEmailDeliveryState() {
    lastDelivery = 'none';
}

export function recordEmailDelivery(success: boolean) {
    lastDelivery = success ? 'success' : 'failure';
}

export function isEmailConfigured() {
    return selectedEmailProvider() !== 'NONE';
}

export function emailStatus(): EmailProviderStatus {
    if (!isEmailConfigured()) {
        return 'NOT_CONFIGURED';
    }
    if (lastDelivery === 'success') {
        return 'CONNECTED';
    }
    if (lastDelivery === 'failure') {
        return 'ERROR';
    }
    return 'DEGRADED';
}

export function salesNotificationRecipient(env: NodeJS.ProcessEnv = process.env) {
    return String(env.DEMO_INQUIRY_EMAIL || env.ALERT_EMAIL_TO || '').trim();
}

/**
 * Shared transactional mail path. Provider selection is explicit and
 * deterministic: EMAIL_PROVIDER if set, otherwise Resend, then SendGrid, then SMTP.
 */
export async function deliverEmail(input: {
    to: string;
    subject: string;
    body: string;
    html?: string;
    fromName?: string;
    eventType?: string;
    organizationId?: string;
    resourceType?: string;
    resourceId?: string;
}): Promise<{ status: EmailDeliveryStatus; messageId?: string; provider?: string }> {
    const provider = selectedEmailProvider();
    if (provider === 'NONE') {
        logger.info(`Email notification skipped ${JSON.stringify({
            eventType: input.eventType,
            organizationId: input.organizationId,
            deliveryStatus: 'NOT_CONFIGURED',
        })}`);
        return { status: 'NOT_CONFIGURED', provider };
    }
    try {
        const fromEmail = emailFromAddress(process.env, provider);
        if (provider !== 'SMTP' && !fromEmail) {
            throw new Error(`${provider}_FROM_EMAIL is not configured`);
        }
        let messageId: string | undefined;
        const rendered = input.html
            ? { html: input.html, text: input.body, fromName: input.fromName }
            : genericOperationalEmail({ subject: input.subject, body: input.body });
        const html = input.html || rendered.html;
        const body = input.body || rendered.text;
        const fromName = input.fromName || ('fromName' in rendered ? rendered.fromName : emailFromName());
        if (provider === 'RESEND') {
            const sent = await sendResendEmail({
                to: input.to,
                subject: input.subject,
                body,
                html,
                fromName,
                tags: [
                    input.eventType ? { name: 'event', value: input.eventType.replace(/[^a-z0-9_]/gi, '_') } : undefined,
                    input.resourceId ? { name: 'resource', value: input.resourceId } : undefined,
                ].filter((item): item is { name: string; value: string } => Boolean(item)),
            });
            messageId = sent.messageId;
            if (messageId) {
                const inspected = await getResendEmail(messageId);
                if (inspected?.lastEvent === 'bounced' || inspected?.lastEvent === 'failed') {
                    throw new Error(`Resend last_event ${inspected.lastEvent}`);
                }
            }
        } else if (provider === 'SENDGRID') {
            const replyTo = emailReplyTo();
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: input.to }] }],
                    from: {
                        email: fromEmail,
                        name: fromName,
                    },
                    reply_to: replyTo ? { email: replyTo } : undefined,
                    subject: input.subject,
                    content: [
                        { type: 'text/plain', value: body },
                        html ? { type: 'text/html', value: html } : undefined,
                    ].filter(Boolean),
                }),
            });
            if (!response.ok) {
                throw new Error(`SendGrid responded ${response.status}`);
            }
            messageId = response.headers.get('x-message-id') || undefined;
        } else {
            const sent = await sendSmtpMail({
                to: input.to,
                subject: input.subject,
                body,
                html,
                fromName,
            });
            messageId = sent.messageId;
        }
        recordEmailDelivery(true);
        await recordNotificationDelivery({
            organizationId: input.organizationId,
            eventType: input.eventType || 'email',
            status: 'ACCEPTED',
            recipient: input.to,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            provider,
            providerMessageId: messageId,
        });
        logger.info(`Email notification result ${JSON.stringify({
            eventType: input.eventType,
            organizationId: input.organizationId,
            recipient: maskEmail(input.to),
            deliveryStatus: 'ACCEPTED',
            provider,
            messageId,
        })}`);
        return { status: 'ACCEPTED', messageId, provider };
    } catch (error) {
        recordEmailDelivery(false);
        const lastError = safeProviderError(error);
        await recordNotificationDelivery({
            organizationId: input.organizationId,
            eventType: input.eventType || 'email',
            status: 'FAILED',
            recipient: input.to,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            provider,
            lastError,
        });
        logger.error(`Email notification failed ${JSON.stringify({
            eventType: input.eventType,
            organizationId: input.organizationId,
            recipient: maskEmail(input.to),
            deliveryStatus: 'FAILED',
            provider,
            error: lastError,
        })}`);
        return { status: 'FAILED', provider };
    }
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
    emailBody?: string;
    emailHtml?: string;
    fromName?: string;
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

    const forceEmail = input.eventType === 'user.invitation' || input.eventType === 'auth.password_reset';
    if ((email || forceEmail) && input.emailTo) {
        const delivered = await deliverEmail({
            to: input.emailTo,
            subject: input.title,
            body: input.emailBody || input.body,
            html: input.emailHtml,
            fromName: input.fromName,
            eventType: input.eventType,
            organizationId: input.organizationId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
        });
        return { inApp, email: delivered.status, messageId: delivered.messageId };
    }

    return { inApp, email: email ? (isEmailConfigured() ? emailStatus() : 'NOT_CONFIGURED') : 'DISABLED' };
}

export async function notifyUser(input: {
    organizationId: string;
    userId?: string | null;
    eventType: NotificationEvent;
    title: string;
    body: string;
    resourceType?: string;
    resourceId?: string;
    emailBody?: string;
    emailHtml?: string;
    fromName?: string;
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
            emailBody: input.emailBody,
            emailHtml: input.emailHtml,
            fromName: input.fromName,
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
        select: {
            id: true,
            organizationId: true,
            assignedTo: true,
            dueDate: true,
            assessmentType: true,
            status: true,
            vendor: { select: { name: true, publicId: true } },
        },
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
        const dueMail = assessmentDueSoonEmail({
            vendorName: assessment.vendor?.name || 'Vendor',
            publicId: assessment.vendor?.publicId,
            assessmentName: assessment.assessmentType,
            dueAt: assessment.dueDate,
            overdue,
            ctaUrl: customerAppUrl(assessment.vendor?.publicId ? `/vendor-onboarding/${assessment.vendor.publicId}` : '/assessments'),
        });
        await notifyUser({
            organizationId: assessment.organizationId,
            userId: assessment.assignedTo,
            eventType,
            title: dueMail.subject,
            body: dueMail.text,
            emailBody: dueMail.text,
            emailHtml: dueMail.html,
            fromName: dueMail.fromName,
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
            vendor: { select: { name: true } },
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
        const remMail = remediationDueEmail({
            title: finding.title,
            vendorName: finding.vendor?.name,
            dueAt: finding.targetRemediationDate,
            overdue,
            ctaUrl: customerAppUrl('/findings'),
        });
        await notifyUser({
            organizationId: finding.organizationId,
            userId: finding.assignedTo,
            eventType,
            title: remMail.subject,
            body: remMail.text,
            emailBody: remMail.text,
            emailHtml: remMail.html,
            fromName: remMail.fromName,
            resourceType: 'VendorIssue',
            resourceId: finding.id,
        });
        sent.push({ eventType, resourceId: finding.id });
    }

    const { scanOnboardingAttention } = await import('./vendorOnboardingService');
    const { scanVendorDueDiligenceAttention } = await import('./vendorDueDiligenceService');
    await scanOnboardingAttention(now);
    await scanVendorDueDiligenceAttention(now);

    return sent;
}
