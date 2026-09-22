import { MFA_REQUIRED_ROLES } from './sessionPlane';

export const PRIVILEGED_CUSTOMER_MFA_ROLES = new Set([
    'ORGANIZATION_ADMIN',
    'RISK_MANAGER',
]);

export type PrivilegedMfaDecision = {
    required: boolean;
    reason: string;
    grace: boolean;
};

function parseEmailList(raw: string | undefined) {
    return new Set(
        String(raw || '')
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    );
}

export function privilegedMfaRoles() {
    return [...MFA_REQUIRED_ROLES, ...PRIVILEGED_CUSTOMER_MFA_ROLES];
}

export function roleRequiresPrivilegedMfa(role: string) {
    return MFA_REQUIRED_ROLES.has(role) || PRIVILEGED_CUSTOMER_MFA_ROLES.has(role);
}

export function privilegedMfaDecision(input: {
    role: string;
    email: string;
    plane: 'CUSTOMER' | 'PLATFORM' | 'VENDOR';
    env?: NodeJS.ProcessEnv;
}): PrivilegedMfaDecision {
    const env = input.env || process.env;
    if (input.plane === 'VENDOR') {
        return { required: false, reason: 'vendor_invitation_plane', grace: false };
    }
    if (!roleRequiresPrivilegedMfa(input.role) && input.plane !== 'PLATFORM') {
        return { required: false, reason: 'role_not_privileged', grace: false };
    }
    if (input.plane === 'PLATFORM' && MFA_REQUIRED_ROLES.has(input.role)) {
        return { required: true, reason: 'platform_staff', grace: false };
    }
    if (env.NODE_ENV === 'test') {
        return { required: false, reason: 'automated_test', grace: true };
    }
    const exempt = parseEmailList(env.MFA_POLICY_EXEMPT_EMAILS);
    if (exempt.has(input.email.toLowerCase().trim())) {
        return { required: false, reason: 'qa_exemption', grace: true };
    }
    if (env.PRIVILEGED_MFA_ENFORCE === 'false') {
        return { required: false, reason: 'enforce_disabled', grace: true };
    }
    if (env.APP_ENVIRONMENT === 'production' || env.PRIVILEGED_MFA_ENFORCE === 'true') {
        return { required: true, reason: 'privileged_customer_role', grace: false };
    }
    if (env.APP_ENVIRONMENT === 'staging' && !exempt.size) {
        return { required: false, reason: 'staging_grace_until_qa_exemptions_configured', grace: true };
    }
    return { required: true, reason: 'privileged_customer_role', grace: false };
}
