const WEAK = new Set(['dev-encryption-key', 'change-this', 'secret', 'jwt-secret']);

export type TransactionalEmailProvider = 'RESEND' | 'SENDGRID' | 'SMTP' | 'NONE';

const EXPLICIT_PROVIDERS = new Set<TransactionalEmailProvider>(['RESEND', 'SENDGRID', 'SMTP']);

export function providerValuePresent(env: NodeJS.ProcessEnv, key: string) {
    const value = env[key];
    return Boolean(value) && !WEAK.has(value);
}

export function smtpPassword(env: NodeJS.ProcessEnv = process.env) {
    return env.SMTP_PASSWORD || env.SMTP_PASS || '';
}

export function isResendSmtp(env: NodeJS.ProcessEnv = process.env) {
    return /smtp\.resend\.com/i.test(String(env.SMTP_HOST || ''));
}

export function resendApiKey(env: NodeJS.ProcessEnv = process.env) {
    if (providerValuePresent(env, 'RESEND_API_KEY')) {
        return String(env.RESEND_API_KEY);
    }
    if (isResendSmtp(env) && smtpPassword(env)) {
        return smtpPassword(env);
    }
    return '';
}

export function selectedEmailProvider(env: NodeJS.ProcessEnv = process.env): TransactionalEmailProvider {
    const explicit = String(env.EMAIL_PROVIDER || '').trim().toUpperCase();
    if (explicit) {
        if (!EXPLICIT_PROVIDERS.has(explicit as TransactionalEmailProvider)) {
            return 'NONE';
        }
        if (explicit === 'RESEND') {
            return resendApiKey(env) ? 'RESEND' : 'NONE';
        }
        if (explicit === 'SENDGRID') {
            return providerValuePresent(env, 'SENDGRID_API_KEY') ? 'SENDGRID' : 'NONE';
        }
        return providerValuePresent(env, 'SMTP_HOST') ? 'SMTP' : 'NONE';
    }
    if (resendApiKey(env)) {
        return 'RESEND';
    }
    if (providerValuePresent(env, 'SENDGRID_API_KEY')) {
        return 'SENDGRID';
    }
    if (providerValuePresent(env, 'SMTP_HOST')) {
        return 'SMTP';
    }
    return 'NONE';
}

export function emailFromAddress(env: NodeJS.ProcessEnv = process.env, provider = selectedEmailProvider(env)) {
    if (provider === 'RESEND') {
        return String(env.RESEND_FROM_EMAIL || env.SMTP_FROM_EMAIL || env.SENDGRID_FROM_EMAIL || '').trim();
    }
    if (provider === 'SENDGRID') {
        return String(env.SENDGRID_FROM_EMAIL || env.RESEND_FROM_EMAIL || env.SMTP_FROM_EMAIL || '').trim();
    }
    if (provider === 'SMTP') {
        return String(env.SMTP_FROM_EMAIL || env.RESEND_FROM_EMAIL || env.SENDGRID_FROM_EMAIL || '').trim();
    }
    return '';
}

export function emailFromName(env: NodeJS.ProcessEnv = process.env, provider = selectedEmailProvider(env)) {
    const raw = provider === 'RESEND'
        ? String(env.RESEND_FROM_NAME || env.SMTP_FROM_NAME || env.SENDGRID_FROM_NAME || '').trim()
        : provider === 'SENDGRID'
            ? String(env.SENDGRID_FROM_NAME || env.RESEND_FROM_NAME || env.SMTP_FROM_NAME || '').trim()
            : String(env.SMTP_FROM_NAME || env.RESEND_FROM_NAME || env.SENDGRID_FROM_NAME || '').trim();
    if (!raw || /^supreme risk$/i.test(raw)) return 'Supreme';
    return raw;
}

export function emailReplyTo(env: NodeJS.ProcessEnv = process.env) {
    return String(env.RESEND_REPLY_TO || env.SMTP_REPLY_TO || env.SENDGRID_REPLY_TO || '').trim();
}

export function emailProviderSnapshot(env: NodeJS.ProcessEnv = process.env) {
    const provider = selectedEmailProvider(env);
    return {
        EMAIL_PROVIDER_SELECTED: provider,
        EMAIL_PROVIDER_EXPLICIT: String(env.EMAIL_PROVIDER || '').trim() || null,
        RESEND_CONFIGURED: resendApiKey(env) ? 'YES' : 'NO',
        RESEND_API_MODE: resendApiKey(env) ? 'YES' : 'NO',
        SMTP_CONFIGURED: providerValuePresent(env, 'SMTP_HOST') && !isResendSmtp(env) ? 'YES' : 'NO',
        RESEND_SMTP_PRESENT: isResendSmtp(env) ? 'YES' : 'NO',
        SENDGRID_CONFIGURED: providerValuePresent(env, 'SENDGRID_API_KEY') ? 'YES' : 'NO',
        WEBHOOK_CONFIGURED: providerValuePresent(env, 'RESEND_WEBHOOK_SECRET') ? 'YES' : 'NO',
        FROM_ADDRESS: emailFromAddress(env, provider) || null,
        FROM_NAME: emailFromName(env, provider) || null,
        REPLY_TO: emailReplyTo(env) || null,
        SMTP_HOST: env.SMTP_HOST || null,
    };
}

export function safeProviderError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/re_[A-Za-z0-9]+/g, '[redacted]')
        .replace(/SG\.[A-Za-z0-9._-]+/g, '[redacted]')
        .replace(/whsec_[A-Za-z0-9]+/g, '[redacted]')
        .slice(0, 300);
}
