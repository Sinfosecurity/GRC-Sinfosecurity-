export const PUBLIC_API_SCOPES = [
    'vendors:read',
    'vendors:write',
    'assessments:read',
    'findings:read',
    'findings:write',
    'evidence:read',
    'risks:read',
    'reports:read',
    'webhooks:manage',
    'insurance:read',
] as const;

export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];

export const WEBHOOK_EVENTS = [
    'third_party.created',
    'third_party.updated',
    'ira.submitted',
    'assessment.sent',
    'assessment.submitted',
    'finding.created',
    'finding.updated',
    'finding.closed',
    'decision.created',
    'risk.updated',
    'evidence.added',
    'evidence.status_changed',
    'webhook.test',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export function assertScopes(scopes: string[]) {
    const unknown = scopes.filter((scope) => !PUBLIC_API_SCOPES.includes(scope as PublicApiScope));
    if (unknown.length) {
        const { ApiError } = require('../middleware/errorHandler') as typeof import('../middleware/errorHandler');
        throw new ApiError(400, `Unsupported scope: ${unknown.join(', ')}`);
    }
    return scopes as PublicApiScope[];
}

export function hasScope(granted: string[], needed: PublicApiScope) {
    return granted.includes(needed);
}
