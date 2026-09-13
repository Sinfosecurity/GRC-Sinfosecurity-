import { Role } from '@prisma/client';
import { identityUserService } from '../services/identityUserService';

jest.mock('../services/authService', () => ({
    authService: {
        invite: jest.fn(),
        rotateInvitationToken: jest.fn(),
    },
}));

jest.mock('../services/notificationDeliveryService', () => ({
    notify: jest.fn(),
    emailStatus: jest.fn(() => 'DEGRADED'),
}));

jest.mock('../config/database', () => ({
        prisma: {
            user: { findUnique: jest.fn() },
            organization: { findUnique: jest.fn() },
            accountInvitation: { findFirst: jest.fn() },
        },
}));

const { authService } = require('../services/authService');
const { notify } = require('../services/notificationDeliveryService');
const { prisma } = require('../config/database');

describe('invitation email activation links', () => {
    const previousFrontend = process.env.FRONTEND_BASE_URL;
    const previousEnv = process.env.APP_ENVIRONMENT;

    beforeEach(() => {
        process.env.FRONTEND_BASE_URL = 'https://supreme-risk-staging.onrender.com';
        process.env.APP_ENVIRONMENT = 'staging';
        authService.invite.mockResolvedValue({
            invitation: { id: 'inv-1' },
            token: 'opaque-invite-token',
        });
        notify.mockResolvedValue({ inApp: true, email: 'ACCEPTED' });
        prisma.user.findUnique
            .mockResolvedValueOnce({ email: 'admin@org-a.test' })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ firstName: 'Amina', lastName: 'Cole', email: 'admin@org-a.test' })
            .mockResolvedValueOnce({ email: 'admin@org-a.test' })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ firstName: 'Amina', lastName: 'Cole', email: 'admin@org-a.test' });
        prisma.organization.findUnique.mockResolvedValue({ name: 'Elite Claims' });
        prisma.accountInvitation.findFirst.mockResolvedValue(null);
    });

    afterAll(() => {
        process.env.FRONTEND_BASE_URL = previousFrontend;
        process.env.APP_ENVIRONMENT = previousEnv;
    });

    it('emails a hosted activation URL and keeps the invitation when delivery fails', async () => {
        const delivered = await identityUserService.invite(
            'org-a',
            'admin-1',
            'invitee@org-a.test',
            Role.VIEWER,
            Role.ORGANIZATION_ADMIN
        );
        expect(notify).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'user.invitation',
                emailTo: 'invitee@org-a.test',
                body: expect.not.stringContaining('opaque-invite-token'),
                title: "You're invited to Supreme",
                emailBody: expect.stringMatching(
                    /https:\/\/supreme-risk-staging\.onrender\.com\/activate\?token=opaque-invite-token/
                ),
            })
        );
        expect(delivered.invitation.id).toBe('inv-1');
        expect(delivered.emailStatus).toBe('ACCEPTED');
        expect(delivered.delivery).toBe('sent');

        notify.mockResolvedValue({ inApp: true, email: 'FAILED' });
        const failed = await identityUserService.invite(
            'org-a',
            'admin-1',
            'invitee-2@org-a.test',
            Role.VIEWER,
            Role.ORGANIZATION_ADMIN
        );
        expect(failed.invitation.id).toBe('inv-1');
        expect(failed.emailStatus).toBe('FAILED');
    });

    it('rejects a self-invite without sending mail', async () => {
        prisma.user.findUnique.mockReset();
        prisma.user.findUnique.mockResolvedValue({ email: 'admin@org-a.test' });
        notify.mockClear();
        await expect(
            identityUserService.invite('org-a', 'admin-1', 'admin@org-a.test', Role.VIEWER, Role.ORGANIZATION_ADMIN)
        ).rejects.toThrow(/already have access/i);
        expect(notify).not.toHaveBeenCalled();
    });
});

