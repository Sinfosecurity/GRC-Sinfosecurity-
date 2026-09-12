import { notify, notifyUser, emailStatus, resetEmailDeliveryState } from '../services/notificationDeliveryService';

jest.mock('../config/database', () => ({
    prisma: {
        notificationPreference: { findUnique: jest.fn() },
        inAppNotification: { create: jest.fn(), findFirst: jest.fn() },
        user: { findFirst: jest.fn() },
        vendorAssessment: { findMany: jest.fn() },
        vendorIssue: { findMany: jest.fn() },
    },
}));

jest.mock('../services/smtpClient', () => ({
    sendSmtpMail: jest.fn(),
}));

jest.mock('../config/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn() },
}));

const { prisma } = require('../config/database');
const { sendSmtpMail } = require('../services/smtpClient');
const logger = require('../config/logger').default;

describe('workflow notification delivery', () => {
    const base = {
        organizationId: 'org-a',
        userId: 'user-a',
        eventType: 'assessment.assigned' as const,
        title: 'Assessment assigned',
        body: 'Assessment A was assigned.',
        resourceType: 'VendorAssessment',
        resourceId: 'assess-1',
        emailTo: 'owner@org-a.test',
    };

    beforeEach(() => {
        delete process.env.SMTP_HOST;
        delete process.env.SENDGRID_API_KEY;
        resetEmailDeliveryState();
        prisma.notificationPreference.findUnique.mockResolvedValue(null);
        prisma.inAppNotification.create.mockResolvedValue({ id: 'n1' });
        prisma.user.findFirst.mockResolvedValue({ email: 'owner@org-a.test' });
        logger.info.mockReset();
        logger.error.mockReset();
    });

    it('records in-app and reports NOT_CONFIGURED when email is absent', async () => {
        const result = await notify(base);
        expect(result.inApp).toBe(true);
        expect(result.email).toBe('NOT_CONFIGURED');
        expect(emailStatus()).toBe('NOT_CONFIGURED');
        expect(prisma.inAppNotification.create).toHaveBeenCalled();
        expect(sendSmtpMail).not.toHaveBeenCalled();
    });

    it('reports DEGRADED until a delivery succeeds, then CONNECTED', async () => {
        process.env.SMTP_HOST = '127.0.0.1';
        expect(emailStatus()).toBe('DEGRADED');
        sendSmtpMail.mockResolvedValue({ messageId: 'msg-1' });
        const result = await notify(base);
        expect(result.email).toBe('DELIVERED');
        expect(emailStatus()).toBe('CONNECTED');
        expect(sendSmtpMail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'owner@org-a.test', subject: 'Assessment assigned' })
        );
    });

    it('reports FAILED without throwing when SMTP rejects', async () => {
        process.env.SMTP_HOST = '127.0.0.1';
        sendSmtpMail.mockRejectedValue(new Error('connection refused'));
        const result = await notify(base);
        expect(result.inApp).toBe(true);
        expect(result.email).toBe('FAILED');
        expect(emailStatus()).toBe('ERROR');
        expect(prisma.inAppNotification.create).toHaveBeenCalled();
    });

    it('does not log tokens, reset URLs, or raw recipients', async () => {
        process.env.SMTP_HOST = '127.0.0.1';
        sendSmtpMail.mockResolvedValue({ messageId: 'msg-1' });
        await notify({
            ...base,
            eventType: 'user.invitation',
            body: 'Invitation recorded.',
            emailBody: 'https://supreme-risk-staging.onrender.com/activate?token=super-secret-token',
        });
        const logged = JSON.stringify([logger.info.mock.calls, logger.error.mock.calls]);
        expect(logged).not.toContain('super-secret-token');
        expect(logged).not.toContain('owner@org-a.test');
        expect(logged).toContain('o***@org-a.test');
        expect(logged).toContain('DELIVERED');
        expect(logged).toContain('msg-1');
    });

    it('does not load a user from another organization', async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        await notifyUser({
            organizationId: 'org-a',
            userId: 'user-b',
            eventType: 'finding.assigned',
            title: 'Finding assigned',
            body: 'Finding recorded',
            resourceType: 'VendorIssue',
            resourceId: 'issue-1',
        });
        expect(prisma.user.findFirst).toHaveBeenCalledWith({
            where: { id: 'user-b', organizationId: 'org-a' },
            select: { email: true },
        });
    });
});
