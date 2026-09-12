const STAGING_FRONTEND = 'https://supreme-risk-staging.onrender.com';

function isLocalHost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function publicFrontendUrl(env: NodeJS.ProcessEnv = process.env): string {
    const hosted = env.NODE_ENV === 'production' || env.APP_ENVIRONMENT === 'staging';
    const candidates = [env.FRONTEND_BASE_URL, env.FRONTEND_URL, env.CORS_ORIGIN];
    for (const raw of candidates) {
        if (!raw) continue;
        try {
            const url = new URL(raw);
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

export function invitationEmailBody(role: string, token: string, env: NodeJS.ProcessEnv = process.env) {
    const activateUrl = `${publicFrontendUrl(env)}/activate?token=${token}`;
    return [
        `You were invited to Supreme Risk as ${role}.`,
        'Activate your account with this single-use link. It expires in 7 days.',
        activateUrl,
        'If you did not expect this invitation, ignore this email.',
    ].join('\n');
}

export function passwordResetEmailBody(token: string, env: NodeJS.ProcessEnv = process.env) {
    const resetUrl = `${publicFrontendUrl(env)}/reset-password?token=${token}`;
    return [
        'A password reset was requested for this Supreme Risk account.',
        'Reset your password with this single-use link. It expires in 1 hour.',
        resetUrl,
        'If you did not request this, ignore this email.',
    ].join('\n');
}
