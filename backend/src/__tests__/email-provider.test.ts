import {
    emailFromAddress,
    emailProviderSnapshot,
    selectedEmailProvider,
} from '../services/emailProvider';
import { deliverEmail, resetEmailDeliveryState } from '../services/notificationDeliveryService';
import { notify } from '../services/notificationDeliveryService';

jest.mock('../config/database', () => ({
    prisma: {
        notificationPreference: { findUnique: jest.fn() },
        inAppNotification: { create: jest.fn() },
        user: { findFirst: jest.fn() },
        vendorAssessment: { findMany: jest.fn() },
        vendorIssue: { findMany: jest.fn() },
        accountInvitation: { updateMany: jest.fn() },
        notificationDeliveryLog: { create: jest.fn() },
    },
}));

jest.mock('../services/smtpClient', () => ({
    sendSmtpMail: jest.fn(),
}));

jest.mock('../services/opsEventService', () => ({
    recordNotificationDelivery: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/resendClient', () => ({
    sendResendEmail: jest.fn(),
    getResendEmail: jest.fn().mockResolvedValue(null),
}));

const { sendSmtpMail } = require('../services/smtpClient');
const { sendResendEmail } = require('../services/resendClient');
const { prisma } = require('../config/database');

describe('transactional email provider routing', () => {
    const previous = { ...process.env };

    afterEach(() => {
        for (const key of ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'SMTP_HOST', 'RESEND_FROM_EMAIL', 'SENDGRID_FROM_EMAIL', 'SMTP_FROM_EMAIL']) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        resetEmailDeliveryState();
        jest.clearAllMocks();
    });

    it('selects Resend when EMAIL_PROVIDER is explicit and the key is present', () => {
        expect(selectedEmailProvider({
            EMAIL_PROVIDER: 'RESEND',
            RESEND_API_KEY: 're_test_key',
            SENDGRID_API_KEY: 'SG.test',
            SMTP_HOST: 'smtp.example.com',
        } as NodeJS.ProcessEnv)).toBe('RESEND');
    });

    it('does not fall through when EMAIL_PROVIDER=RESEND and the key is missing', () => {
        expect(selectedEmailProvider({
            EMAIL_PROVIDER: 'RESEND',
            SENDGRID_API_KEY: 'SG.test',
            SMTP_HOST: 'smtp.example.com',
        } as NodeJS.ProcessEnv)).toBe('NONE');
    });

    it('prefers Resend over SendGrid when no explicit provider is set', () => {
        expect(selectedEmailProvider({
            RESEND_API_KEY: 're_test_key',
            SENDGRID_API_KEY: 'SG.test',
            SMTP_HOST: 'smtp.resend.com',
        } as NodeJS.ProcessEnv)).toBe('RESEND');
    });

    it('treats smtp.resend.com plus SMTP credentials as Resend, not generic SMTP', () => {
        expect(selectedEmailProvider({
            SMTP_HOST: 'smtp.resend.com',
            SMTP_USER: 'resend',
            SMTP_PASSWORD: 're_test_key',
            SENDGRID_API_KEY: 'SG.test',
        } as NodeJS.ProcessEnv)).toBe('RESEND');
    });

    it('uses SendGrid only when Resend is absent', () => {
        expect(selectedEmailProvider({
            SENDGRID_API_KEY: 'SG.test',
            SMTP_HOST: 'smtp.example.com',
        } as NodeJS.ProcessEnv)).toBe('SENDGRID');
    });

    it('reports the From address for the selected provider', () => {
        const env = {
            RESEND_API_KEY: 're_test_key',
            RESEND_FROM_EMAIL: 'noreply@sinfosecurity.com',
            RESEND_FROM_NAME: 'Supreme Risk',
            SENDGRID_FROM_EMAIL: 'noreply@supremerisk.com',
        } as NodeJS.ProcessEnv;
        expect(emailFromAddress(env)).toBe('noreply@sinfosecurity.com');
        expect(emailProviderSnapshot(env).RESEND_CONFIGURED).toBe('YES');
        expect(emailProviderSnapshot(env).SENDGRID_CONFIGURED).toBe('NO');
    });

    it('sends through Resend and does not call SMTP when Resend is selected', async () => {
        process.env.RESEND_API_KEY = 're_test_key';
        process.env.RESEND_FROM_EMAIL = 'noreply@sinfosecurity.com';
        delete process.env.SENDGRID_API_KEY;
        delete process.env.SMTP_HOST;
        sendResendEmail.mockResolvedValue({ messageId: 'msg_resend_1', providerStatus: '200' });
        const result = await deliverEmail({
            to: 'ashobal@sinfosecurity.com',
            subject: "You're invited to Supreme",
            body: 'Activate your account',
            eventType: 'user.invitation',
            organizationId: 'org-a',
            resourceType: 'AccountInvitation',
            resourceId: 'inv-1',
        });
        expect(result.status).toBe('ACCEPTED');
        expect(result.messageId).toBe('msg_resend_1');
        expect(result.provider).toBe('RESEND');
        expect(sendResendEmail).toHaveBeenCalled();
        expect(sendSmtpMail).not.toHaveBeenCalled();
    });

    it('records provider failure without throwing', async () => {
        process.env.RESEND_API_KEY = 're_test_key';
        process.env.RESEND_FROM_EMAIL = 'noreply@sinfosecurity.com';
        sendResendEmail.mockRejectedValue(new Error('Resend responded 403'));
        const result = await deliverEmail({
            to: 'ashobal@sinfosecurity.com',
            subject: 'Invite',
            body: 'Body',
            eventType: 'user.invitation',
        });
        expect(result.status).toBe('FAILED');
        expect(result.provider).toBe('RESEND');
    });

    it('still emails invitations when the inviter disabled notification preferences', async () => {
        process.env.RESEND_API_KEY = 're_test_key';
        process.env.RESEND_FROM_EMAIL = 'noreply@sinfosecurity.com';
        prisma.notificationPreference.findUnique.mockResolvedValue({ inApp: false, email: false });
        prisma.inAppNotification.create.mockResolvedValue({ id: 'n1' });
        sendResendEmail.mockResolvedValue({ messageId: 'msg_forced' });
        const result = await notify({
            organizationId: 'org-a',
            userId: 'admin-1',
            eventType: 'user.invitation',
            title: "You're invited to Supreme",
            body: 'Invitation recorded',
            emailTo: 'invitee@org.test',
            resourceType: 'AccountInvitation',
            resourceId: 'inv-9',
        });
        expect(result.email).toBe('ACCEPTED');
        expect(sendResendEmail).toHaveBeenCalled();
    });
});
