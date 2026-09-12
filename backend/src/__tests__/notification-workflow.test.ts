import { notify, notifyUser, emailStatus } from '../services/notificationDeliveryService';

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

const { prisma } = require('../config/database');
const { sendSmtpMail } = require('../services/smtpClient');

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
        prisma.notificationPreference.findUnique.mockResolvedValue(null);
        prisma.inAppNotification.create.mockResolvedValue({ id: 'n1' });
        prisma.user.findFirst.mockResolvedValue({ email: 'owner@org-a.test' });
    });

    it('records in-app and reports NOT_CONFIGURED when email is absent', async () => {
        const result = await notify(base);
        expect(result.inApp).toBe(true);
        expect(result.email).toBe('NOT_CONFIGURED');
        expect(emailStatus()).toBe('NOT_CONFIGURED');
        expect(prisma.inAppNotification.create).toHaveBeenCalled();
        expect(sendSmtpMail).not.toHaveBeenCalled();
    });

    it('reports DELIVERED when SMTP accepts the message', async () => {
        process.env.SMTP_HOST = '127.0.0.1';
        sendSmtpMail.mockResolvedValue(undefined);
        const result = await notify(base);
        expect(result.email).toBe('DELIVERED');
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
        expect(prisma.inAppNotification.create).toHaveBeenCalled();
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
