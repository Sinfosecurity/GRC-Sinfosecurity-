const REQUESTER_ROLES = new Set(['BUSINESS_OWNER', 'DEPARTMENT_MANAGER']);
const PLATFORM_ROLES = new Set([
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
    'SUPERADMIN',
    'SUPPORT_ADMIN',
    'SUPPORT_ANALYST',
    'BILLING_SUPPORT',
    'SECURITY_ADMIN',
]);
const GRC_ROLES = new Set([
    'ORGANIZATION_ADMIN',
    'ADMIN',
    'ORG_ADMIN',
    'ORG_OWNER',
    'RISK_MANAGER',
    'MANAGER',
    'ASSESSOR',
    'COMPLIANCE_OFFICER',
    'COMPLIANCE_MANAGER',
    'CONTRIBUTOR',
    'APPROVER',
    'AUDITOR',
    'VIEWER',
    'USER',
]);
const PRACTITIONER_PERMS = [
    'vendor.read',
    'intake.read',
    'intake.assign',
    'intake.triage',
    'assessment.read',
    'finding.read',
    'approval.read',
    'risk.read',
    'compliance.read',
    'intelligence.read',
    'automation.read',
    'organization.manage',
    'user.manage',
    'identity.manage',
];

export type ParticipantExperience = 'requester' | 'grc' | 'platform' | 'vendor' | null;

export function participantExperience(role?: string, permissions: string[] = []): ParticipantExperience {
    if (!role && !permissions.length) return null;
    if (role && String(role).toUpperCase() === 'VENDOR') return 'vendor';
    if (role && PLATFORM_ROLES.has(role)) return 'platform';
    if (role && REQUESTER_ROLES.has(role)) return 'requester';
    if (role && GRC_ROLES.has(role)) return 'grc';
    if (hasPractitionerWorkspace(permissions)) return 'grc';
    return null;
}

export function hasRequesterWorkspace(_permissions: string[] = [], role?: string) {
    return participantExperience(role, _permissions) === 'requester';
}

export function hasPractitionerWorkspace(permissions: string[] = []) {
    return PRACTITIONER_PERMS.some((permission) => permissions.includes(permission));
}

export function customerLandingPath(user?: { permissions?: string[]; role?: string; nextPath?: string; plane?: string } | null) {
    if (user?.plane === 'PLATFORM') return '/platform';
    if (participantExperience(user?.role, user?.permissions) === 'requester') return '/request';
    if (user?.nextPath) return user.nextPath;
    return '/dashboard';
}
