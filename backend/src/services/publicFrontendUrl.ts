const STAGING_FRONTEND = 'https://supreme-risk-staging.onrender.com';

function isLocalHost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function publicFrontendUrl(env: NodeJS.ProcessEnv = process.env): string {
    return portalFrontendUrl('CUSTOMER', env);
}

export function portalFrontendUrl(plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR', env: NodeJS.ProcessEnv = process.env): string {
    const hosted = env.NODE_ENV === 'production' || env.APP_ENVIRONMENT === 'staging';
    const candidates = plane === 'PLATFORM'
        ? [env.ADMIN_FRONTEND_URL, env.FRONTEND_BASE_URL, env.FRONTEND_URL, env.CORS_ORIGIN]
        : [env.CUSTOMER_FRONTEND_URL, env.FRONTEND_BASE_URL, env.FRONTEND_URL, env.CORS_ORIGIN];
    for (const raw of candidates) {
        if (!raw) continue;
        const first = raw.split(',')[0]?.trim();
        if (!first) continue;
        try {
            const url = new URL(first);
            if (hosted && isLocalHost(url.hostname)) {
                continue;
            }
            return url.origin;
        } catch {
            // Try the next candidate.
        }
    }
    return hosted ? STAGING_FRONTEND : 'http://localhost:3000';
}

export function maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!domain || !local) {
        return '[redacted]';
    }
    return `${local.slice(0, 1)}***@${domain}`;
}

export function invitationEmailBody(
    role: string,
    token: string,
    env: NodeJS.ProcessEnv = process.env,
    extras: { organizationName?: string; invitedByName?: string; roleLabel?: string } = {}
) {
    return invitationEmailRender(role, token, env, extras).text;
}

export function invitationEmailHtml(
    role: string,
    token: string,
    env: NodeJS.ProcessEnv = process.env,
    extras: { organizationName?: string; invitedByName?: string; roleLabel?: string } = {}
) {
    return invitationEmailRender(role, token, env, extras).html;
}

function invitationEmailRender(
    role: string,
    token: string,
    env: NodeJS.ProcessEnv,
    extras: { organizationName?: string; invitedByName?: string; roleLabel?: string }
) {
    const { accountInvitationEmail } = require('./transactionalEmail') as typeof import('./transactionalEmail');
    const platform = /PLATFORM_|SUPPORT_|SECURITY_ADMIN|BILLING_SUPPORT|SUPERADMIN/.test(role);
    const origin = portalFrontendUrl(platform ? 'PLATFORM' : 'CUSTOMER', env);
    const activateUrl = `${origin}${platform ? '/admin/activate' : '/activate'}?token=${token}`;
    const roleLabel = extras.roleLabel || role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    return accountInvitationEmail({
        invitedByName: extras.invitedByName || 'A team administrator',
        organizationName: extras.organizationName || 'their organization',
        roleLabel,
        activateUrl,
    });
}

export function vendorInvitationEmailHtml(body: string, organizationName?: string) {
    const { genericOperationalEmail } = require('./transactionalEmail') as typeof import('./transactionalEmail');
    return genericOperationalEmail({
        subject: `${organizationName || 'A customer'} has requested a third-party assessment`,
        body,
        organizationName,
        audience: 'vendor',
    }).html;
}

export function passwordResetEmailBody(token: string, env: NodeJS.ProcessEnv = process.env, plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR' = 'CUSTOMER') {
    return passwordResetRender(token, env, plane).text;
}

export function passwordResetEmailHtml(token: string, env: NodeJS.ProcessEnv = process.env, plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR' = 'CUSTOMER') {
    return passwordResetRender(token, env, plane).html;
}

function passwordResetRender(token: string, env: NodeJS.ProcessEnv, plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR') {
    const { passwordResetTransactionalEmail } = require('./transactionalEmail') as typeof import('./transactionalEmail');
    const origin = portalFrontendUrl(plane, env);
    const resetUrl = `${origin}${plane === 'PLATFORM' ? '/admin/reset-password' : '/reset-password'}?token=${token}`;
    return passwordResetTransactionalEmail({ resetUrl });
}
