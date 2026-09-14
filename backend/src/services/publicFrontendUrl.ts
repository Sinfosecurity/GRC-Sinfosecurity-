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
    const platform = /PLATFORM_|SUPPORT_|SECURITY_ADMIN|BILLING_SUPPORT|SUPERADMIN/.test(role);
    const origin = portalFrontendUrl(platform ? 'PLATFORM' : 'CUSTOMER', env);
    const activateUrl = `${origin}${platform ? '/admin/activate' : '/activate'}?token=${token}`;
    const roleLabel = extras.roleLabel || role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const organizationName = extras.organizationName || 'their organization';
    const invitedByName = extras.invitedByName || 'A team administrator';
    return [
        `${invitedByName} invited you to join ${organizationName} on Supreme.`,
        '',
        'Supreme is a connected governance platform for third parties, risk, compliance, privacy, AI, evidence, and decisions.',
        `Your role: ${roleLabel}`,
        '',
        'Activate your account:',
        activateUrl,
        '',
        'This link expires in 7 days and can be used once.',
        'If you were not expecting this invitation, ignore this email. Do not forward the link.',
    ].join('\n');
}

function escapeEmailText(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:#b0893a;word-break:break-all;">$1</a>')
        .replace(/\n/g, '<br/>');
}

export function supremeEmailHtml(text: string, kicker = 'Governance Platform') {
    return `<!DOCTYPE html><html><body style="margin:0;background:#f3efe6;padding:32px;font-family:'Source Sans 3','Source Sans Pro',Helvetica,Arial,sans-serif;color:#14202e;">
<div style="max-width:560px;margin:0 auto;background:#fffcf7;border:1px solid rgba(20,32,46,0.12);border-radius:8px;padding:32px;">
<p style="font-family:Newsreader,Georgia,serif;font-size:24px;margin:0 0 4px;">Supreme</p>
<p style="letter-spacing:0.16em;text-transform:uppercase;font-size:11px;font-weight:700;color:#b0893a;margin:0 0 20px;">${kicker}</p>
<p style="font-size:15px;line-height:1.6;margin:0;">${escapeEmailText(text)}</p>
<p style="font-size:12px;line-height:1.5;color:#5a6573;margin:24px 0 0;">Provider accepted or queued is not inbox delivery. If you were not expecting this message, ignore it.</p>
</div></body></html>`;
}

export function invitationEmailHtml(
    role: string,
    token: string,
    env: NodeJS.ProcessEnv = process.env,
    extras: { organizationName?: string; invitedByName?: string; roleLabel?: string } = {}
) {
    return supremeEmailHtml(invitationEmailBody(role, token, env, extras), extras.organizationName || 'Governance Platform');
}

export function vendorInvitationEmailHtml(body: string, organizationName?: string) {
    return supremeEmailHtml(body, organizationName || 'Assessment request');
}

export function passwordResetEmailBody(token: string, env: NodeJS.ProcessEnv = process.env, plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR' = 'CUSTOMER') {
    const origin = portalFrontendUrl(plane, env);
    const resetUrl = `${origin}${plane === 'PLATFORM' ? '/admin/reset-password' : '/reset-password'}?token=${token}`;
    return [
        'A password reset was requested for this Supreme account.',
        'Reset your password with this single-use link. It expires in 1 hour.',
        resetUrl,
        'If you did not request this, ignore this email.',
    ].join('\n');
}

export function passwordResetEmailHtml(token: string, env: NodeJS.ProcessEnv = process.env, plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR' = 'CUSTOMER') {
    return supremeEmailHtml(passwordResetEmailBody(token, env, plane), 'Account security');
}
