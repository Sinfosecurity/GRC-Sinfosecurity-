const STAGING_FRONTEND = 'https://supreme-risk-staging.onrender.com';

function isLocalHost(hostname: string) {
    const host = hostname.replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function isHostedEnvironment(env: NodeJS.ProcessEnv = process.env) {
    const app = String(env.APP_ENVIRONMENT || '').toLowerCase();
    return env.NODE_ENV === 'production' || app === 'staging' || app === 'production';
}

function firstPublicOrigin(candidates: Array<string | undefined>, hosted: boolean) {
    for (const raw of candidates) {
        if (!raw) continue;
        const first = raw.split(',')[0]?.trim();
        if (!first) continue;
        try {
            const url = new URL(first.includes('://') ? first : `https://${first}`);
            if (hosted && isLocalHost(url.hostname)) continue;
            return url.origin;
        } catch {
            // Try the next candidate.
        }
    }
    return null;
}

export function publicFrontendUrl(env: NodeJS.ProcessEnv = process.env): string {
    return portalFrontendUrl('CUSTOMER', env);
}

export function portalFrontendUrl(plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR', env: NodeJS.ProcessEnv = process.env): string {
    const hosted = isHostedEnvironment(env);
    const candidates = plane === 'PLATFORM'
        ? [env.ADMIN_FRONTEND_URL, env.FRONTEND_BASE_URL, env.FRONTEND_URL, env.CORS_ORIGIN]
        : [env.CUSTOMER_FRONTEND_URL, env.FRONTEND_BASE_URL, env.FRONTEND_URL, env.CORS_ORIGIN];
    return firstPublicOrigin(candidates, hosted) || (hosted ? STAGING_FRONTEND : 'http://localhost:3000');
}

export function publicApiUrl(env: NodeJS.ProcessEnv = process.env): string {
    const hosted = isHostedEnvironment(env);
    const app = String(env.APP_ENVIRONMENT || '').toLowerCase();
    const origin = firstPublicOrigin([
        env.API_PUBLIC_URL,
        env.BACKEND_URL,
        env.RENDER_EXTERNAL_URL,
        env.APP_BASE_URL,
    ], hosted);
    if (origin) return origin;
    if (hosted) {
        throw new Error(
            app === 'production'
                ? 'API_PUBLIC_URL must be a non-localhost public origin when APP_ENVIRONMENT=production.'
                : 'API_PUBLIC_URL, APP_BASE_URL, BACKEND_URL, or RENDER_EXTERNAL_URL must be a non-localhost public origin in a hosted environment.'
        );
    }
    return `http://localhost:${env.PORT || '4000'}`;
}

export function identityServiceUrls(publicId: string, env: NodeJS.ProcessEnv = process.env) {
    const origin = publicApiUrl(env);
    return {
        origin,
        acsUrl: `${origin}/api/v1/auth/sso/saml/acs/${publicId}`,
        spEntityId: `${origin}/saml/sp/${publicId}`,
        metadataUrl: `${origin}/api/v1/auth/sso/saml/metadata/${publicId}`,
        oidcRedirect: `${origin}/api/v1/auth/sso/oidc/callback`,
        scimBaseUrl: `${origin}/scim/v2`,
    };
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
