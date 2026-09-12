import {
    invitationEmailBody,
    maskEmail,
    passwordResetEmailBody,
    publicFrontendUrl,
} from '../services/publicFrontendUrl';
import { smtpAuthConfigured } from '../services/smtpClient';
import { invitationApiPayload } from '../services/identityUserService';

describe('public frontend URLs and invitation payload safety', () => {
    const staging = {
        NODE_ENV: 'production',
        APP_ENVIRONMENT: 'staging',
        FRONTEND_BASE_URL: 'https://supreme-risk-staging.onrender.com',
        FRONTEND_URL: 'http://localhost:5173',
        CORS_ORIGIN: 'http://127.0.0.1:3000',
    };

    it('uses the hosted staging origin and ignores localhost candidates', () => {
        expect(publicFrontendUrl(staging as NodeJS.ProcessEnv)).toBe(
            'https://supreme-risk-staging.onrender.com'
        );
    });

    it('puts an activation URL on the hosted frontend, not localhost', () => {
        const body = invitationEmailBody('VIEWER', 'opaque-invite-token', staging as NodeJS.ProcessEnv);
        expect(body).toContain(
            'https://supreme-risk-staging.onrender.com/activate?token=opaque-invite-token'
        );
        expect(body).not.toMatch(/localhost|127\.0\.0\.1|5173/);
    });

    it('puts a password reset URL on the hosted frontend', () => {
        const body = passwordResetEmailBody('opaque-reset-token', staging as NodeJS.ProcessEnv);
        expect(body).toContain(
            'https://supreme-risk-staging.onrender.com/reset-password?token=opaque-reset-token'
        );
        expect(body).not.toMatch(/localhost|127\.0\.0\.1|5173/);
    });

    it('masks recipients to local-part prefix plus domain', () => {
        expect(maskEmail('owner@org-a.test')).toBe('o***@org-a.test');
    });

    it('reads SMTP_PASSWORD for authentication configuration', () => {
        expect(
            smtpAuthConfigured({
                SMTP_HOST: 'smtp.resend.com',
                SMTP_USER: 'resend',
                SMTP_PASSWORD: 'placeholder',
            } as NodeJS.ProcessEnv)
        ).toBe(true);
        expect(smtpAuthConfigured({ SMTP_HOST: 'smtp.resend.com' } as NodeJS.ProcessEnv)).toBe(false);
    });

    it('omits invitation tokens from API payloads outside test', () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        expect(
            invitationApiPayload({
                invitation: { id: 'inv-1' },
                emailStatus: 'DELIVERED',
                token: 'must-not-leak',
            })
        ).toEqual({ invitation: { id: 'inv-1' }, emailStatus: 'DELIVERED' });
        process.env.NODE_ENV = previous;
    });
});
