import crypto from 'crypto';
import { Role } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { ORG_ASSIGNABLE_ROLES } from '../services/identityUserService';

export const IDENTITY_ERRORS = {
    invalid_signature: 'The identity provider response could not be verified.',
    expired_assertion: 'The sign-in response has expired. Try again.',
    issuer_mismatch: 'The identity provider did not match the configured issuer.',
    audience_mismatch: 'The sign-in response was not issued for this organization.',
    destination_mismatch: 'The sign-in response was sent to the wrong destination.',
    recipient_mismatch: 'The sign-in response recipient did not match this organization.',
    replay: 'This sign-in response has already been used.',
    unverified_domain: 'The work email domain is not verified for Company SSO.',
    user_not_assigned: 'This account is not assigned to the organization.',
    jit_disabled: 'Just-in-time provisioning is not enabled for this organization.',
    role_mapping_missing: 'No role mapping applies, and a privileged default is not allowed.',
    sso_required: 'Use Company SSO to continue.',
    configuration_error: 'Company SSO is not ready. Contact your administrator.',
    provider_unavailable: 'The identity provider could not be reached.',
    state_mismatch: 'The sign-in request could not be completed. Try again.',
    nonce_mismatch: 'The sign-in response could not be validated. Try again.',
    scim_unauthorized: 'Not authorized.',
    scim_invalid_filter: 'The filter is not supported.',
    scim_schema: 'The request does not match the expected schema.',
} as const;

export type IdentityErrorCode = keyof typeof IDENTITY_ERRORS;

export class IdentityError extends ApiError {
    code: IdentityErrorCode;
    constructor(code: IdentityErrorCode, status = 401) {
        super(status, IDENTITY_ERRORS[code]);
        this.code = code;
    }
}

export function publicIdentityId(prefix: string) {
    return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
}

export function emailDomain(email: string) {
    const domain = normalizeEmail(email).split('@')[1] || '';
    return domain.replace(/\.+$/, '');
}

export function normalizeDomain(value: string) {
    return String(value || '').trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
}

const ROLE_RANK: Record<string, number> = {
    VIEWER: 0,
    USER: 0,
    AUDITOR: 1,
    BUSINESS_OWNER: 2,
    APPROVER: 3,
    ASSESSOR: 4,
    COMPLIANCE_OFFICER: 4,
    RISK_MANAGER: 5,
    ORGANIZATION_ADMIN: 6,
    ADMIN: 6,
};

export const MAPPABLE_ROLES = ORG_ASSIGNABLE_ROLES.filter((role) => !['SUPERADMIN', 'PLATFORM_ADMIN', 'PLATFORM_OWNER', 'SUPPORT_ADMIN', 'SUPPORT_ANALYST', 'BILLING_SUPPORT', 'SECURITY_ADMIN'].includes(role));

export function lowestMappedRole(roles: Role[], fallback: Role): Role {
    if (!roles.length) return fallback;
    return roles.slice().sort((a, b) => (ROLE_RANK[a] ?? 0) - (ROLE_RANK[b] ?? 0))[0];
}

export function assertMappableRole(role: Role) {
    if (!MAPPABLE_ROLES.includes(role)) {
        throw new ApiError(400, 'That role cannot be assigned from an identity provider group.');
    }
}

export async function identityAudit(input: {
    organizationId: string;
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    result: 'success' | 'failure';
    metadata?: Record<string, unknown>;
}) {
    await recordAudit({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId || undefined,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        result: input.result,
        metadata: input.metadata,
    });
}

export function customerSafeStatus(status: string) {
    if (status === 'ENABLED') return { key: 'enabled', label: 'Enabled' };
    if (status === 'TESTED') return { key: 'tested', label: 'Configured — verified' };
    if (status === 'CONFIGURED') return { key: 'configured', label: 'Configured — not verified' };
    if (status === 'DISABLED') return { key: 'disabled', label: 'Disabled' };
    return { key: 'not_configured', label: 'Not configured' };
}
