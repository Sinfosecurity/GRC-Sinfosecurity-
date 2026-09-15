/**
 * Centralized RBAC for Supreme Risk.
 * Existing Prisma role names are preserved; new SaaS roles are aliases.
 */

export const PERMISSIONS = {
    'vendor.read': 'vendor.read',
    'vendor.create': 'vendor.create',
    'vendor.update': 'vendor.update',
    'vendor.delete': 'vendor.delete',
    'assessment.read': 'assessment.read',
    'assessment.create': 'assessment.create',
    'assessment.respond': 'assessment.respond',
    'assessment.complete': 'assessment.complete',
    'evidence.read': 'evidence.read',
    'evidence.upload': 'evidence.upload',
    'evidence.delete': 'evidence.delete',
    'finding.read': 'finding.read',
    'finding.create': 'finding.create',
    'finding.update': 'finding.update',
    'finding.close': 'finding.close',
    'approval.read': 'approval.read',
    'approval.decide': 'approval.decide',
    'approval.override': 'approval.override',
    'risk.accept': 'risk.accept',
    'risk.read': 'risk.read',
    'risk.create': 'risk.create',
    'risk.update': 'risk.update',
    'risk.manage': 'risk.manage',
    'risk.score': 'risk.score',
    'risk.treat': 'risk.treat',
    'risk.approve': 'risk.approve',
    'risk.delete': 'risk.delete',
    'risk.methodology.manage': 'risk.methodology.manage',
    'risk.appetite.manage': 'risk.appetite.manage',
    'kri.read': 'kri.read',
    'kri.manage': 'kri.manage',
    'report.read': 'report.read',
    'report.export': 'report.export',
    'organization.manage': 'organization.manage',
    'user.manage': 'user.manage',
    'billing.manage': 'billing.manage',
    'integration.manage': 'integration.manage',
    'audit.read': 'audit.read',
    'notification.read': 'notification.read',
    'monitoring.read': 'monitoring.read',
    'monitoring.manage': 'monitoring.manage',
    'questionnaire.manage': 'questionnaire.manage',
    'governanceGraph.read': 'governanceGraph.read',
    'governanceGraph.manage': 'governanceGraph.manage',
    'control.read': 'control.read',
    'control.manage': 'control.manage',
    'control.test': 'control.test',
    'control.approve': 'control.approve',
    'evidence.link': 'evidence.link',
    'evidence.review': 'evidence.review',
    'framework.read': 'framework.read',
    'framework.manage': 'framework.manage',
    'framework.activate': 'framework.activate',
    'compliance.read': 'compliance.read',
    'compliance.manage': 'compliance.manage',
    'requirement.manage': 'requirement.manage',
    'requirement.attest': 'requirement.attest',
    'attestation.review': 'attestation.review',
    'exception.create': 'exception.create',
    'exception.approve': 'exception.approve',
    'audit.manage': 'audit.manage',
    'compliance.report': 'compliance.report',
    'privacy.read': 'privacy.read',
    'privacy.manage': 'privacy.manage',
    'processingActivity.create': 'processingActivity.create',
    'processingActivity.manage': 'processingActivity.manage',
    'dpia.manage': 'dpia.manage',
    'dpia.approve': 'dpia.approve',
    'rightsRequest.read': 'rightsRequest.read',
    'rightsRequest.manage': 'rightsRequest.manage',
    'rightsRequest.approve': 'rightsRequest.approve',
    'transfer.manage': 'transfer.manage',
    'retention.manage': 'retention.manage',
    'privacy.report': 'privacy.report',
    'ai.read': 'ai.read',
    'ai.create': 'ai.create',
    'ai.manage': 'ai.manage',
    'ai.assess': 'ai.assess',
    'ai.test': 'ai.test',
    'ai.approve': 'ai.approve',
    'ai.restrict': 'ai.restrict',
    'ai.retire': 'ai.retire',
    'ai.regulatoryReview': 'ai.regulatoryReview',
    'ai.report': 'ai.report',
    'intelligence.read': 'intelligence.read',
    'intelligence.acknowledge': 'intelligence.acknowledge',
    'intelligence.report': 'intelligence.report',
    'automation.read': 'automation.read',
    'automation.manage': 'automation.manage',
    'automation.retry': 'automation.retry',
    'platform.overview': 'platform.overview',
    'platform.organizations.read': 'platform.organizations.read',
    'platform.support.read': 'platform.support.read',
    'platform.support.manage': 'platform.support.manage',
    'platform.incidents.read': 'platform.incidents.read',
    'platform.incidents.manage': 'platform.incidents.manage',
    'platform.leads.read': 'platform.leads.read',
    'platform.leads.manage': 'platform.leads.manage',
    'platform.billing.read': 'platform.billing.read',
    'platform.providers.read': 'platform.providers.read',
    'platform.audit.read': 'platform.audit.read',
    'platform.users.read': 'platform.users.read',
    'platform.users.manage': 'platform.users.manage',
    'platform.sessions.request': 'platform.sessions.request',
    'platform.sessions.approve': 'platform.sessions.approve',
    'platform.testers.manage': 'platform.testers.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type CanonicalRole =
    | 'PLATFORM_OWNER'
    | 'PLATFORM_ADMIN'
    | 'SUPPORT_ADMIN'
    | 'SUPPORT_ANALYST'
    | 'BILLING_SUPPORT'
    | 'SECURITY_ADMIN'
    | 'ORGANIZATION_ADMIN'
    | 'RISK_MANAGER'
    | 'ASSESSOR'
    | 'APPROVER'
    | 'BUSINESS_OWNER'
    | 'AUDITOR'
    | 'VIEWER';

const TENANT_PERMISSIONS = Object.values(PERMISSIONS).filter((p) => !p.startsWith('platform.'));
const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const PLATFORM_OWNER_PERMS = ALL_PERMISSIONS;
const SUPPORT_ADMIN_PERMS: Permission[] = [
    PERMISSIONS['platform.overview'],
    PERMISSIONS['platform.organizations.read'],
    PERMISSIONS['platform.support.read'],
    PERMISSIONS['platform.support.manage'],
    PERMISSIONS['platform.incidents.read'],
    PERMISSIONS['platform.leads.read'],
    PERMISSIONS['platform.leads.manage'],
    PERMISSIONS['platform.providers.read'],
    PERMISSIONS['platform.sessions.request'],
    PERMISSIONS['platform.testers.manage'],
    PERMISSIONS['notification.read'],
];
const SUPPORT_ANALYST_PERMS: Permission[] = [
    PERMISSIONS['platform.overview'],
    PERMISSIONS['platform.support.read'],
    PERMISSIONS['platform.sessions.request'],
];
const BILLING_SUPPORT_PERMS: Permission[] = [
    PERMISSIONS['platform.overview'],
    PERMISSIONS['platform.organizations.read'],
    PERMISSIONS['platform.billing.read'],
];
const SECURITY_ADMIN_PERMS: Permission[] = [
    PERMISSIONS['platform.overview'],
    PERMISSIONS['platform.organizations.read'],
    PERMISSIONS['platform.incidents.read'],
    PERMISSIONS['platform.incidents.manage'],
    PERMISSIONS['platform.providers.read'],
    PERMISSIONS['platform.audit.read'],
    PERMISSIONS['platform.sessions.request'],
    PERMISSIONS['platform.sessions.approve'],
];

const READ_PORTFOLIO: Permission[] = [
    PERMISSIONS['vendor.read'],
    PERMISSIONS['assessment.read'],
    PERMISSIONS['evidence.read'],
    PERMISSIONS['finding.read'],
    PERMISSIONS['approval.read'],
    PERMISSIONS['report.read'],
    PERMISSIONS['risk.read'],
    PERMISSIONS['kri.read'],
    PERMISSIONS['notification.read'],
    PERMISSIONS['monitoring.read'],
    PERMISSIONS['governanceGraph.read'],
    PERMISSIONS['control.read'],
    PERMISSIONS['framework.read'],
    PERMISSIONS['compliance.read'],
    PERMISSIONS['privacy.read'],
    PERMISSIONS['rightsRequest.read'],
    PERMISSIONS['ai.read'],
    PERMISSIONS['intelligence.read'],
    PERMISSIONS['automation.read'],
];

const ROLE_PERMISSIONS: Record<CanonicalRole, Permission[]> = {
    PLATFORM_OWNER: PLATFORM_OWNER_PERMS,
    PLATFORM_ADMIN: PLATFORM_OWNER_PERMS,
    SUPPORT_ADMIN: SUPPORT_ADMIN_PERMS,
    SUPPORT_ANALYST: SUPPORT_ANALYST_PERMS,
    BILLING_SUPPORT: BILLING_SUPPORT_PERMS,
    SECURITY_ADMIN: SECURITY_ADMIN_PERMS,
    ORGANIZATION_ADMIN: TENANT_PERMISSIONS,
    RISK_MANAGER: [
        ...READ_PORTFOLIO,
        PERMISSIONS['vendor.create'],
        PERMISSIONS['vendor.update'],
        PERMISSIONS['assessment.create'],
        PERMISSIONS['assessment.respond'],
        PERMISSIONS['assessment.complete'],
        PERMISSIONS['evidence.upload'],
        PERMISSIONS['finding.create'],
        PERMISSIONS['finding.update'],
        PERMISSIONS['finding.close'],
        PERMISSIONS['approval.decide'],
        PERMISSIONS['risk.accept'],
        PERMISSIONS['risk.create'],
        PERMISSIONS['risk.update'],
        PERMISSIONS['risk.manage'],
        PERMISSIONS['risk.score'],
        PERMISSIONS['risk.treat'],
        PERMISSIONS['risk.approve'],
        PERMISSIONS['risk.delete'],
        PERMISSIONS['risk.methodology.manage'],
        PERMISSIONS['risk.appetite.manage'],
        PERMISSIONS['kri.manage'],
        PERMISSIONS['report.export'],
        PERMISSIONS['audit.read'],
        PERMISSIONS['monitoring.manage'],
        PERMISSIONS['questionnaire.manage'],
        PERMISSIONS['governanceGraph.manage'],
        PERMISSIONS['control.manage'],
        PERMISSIONS['control.test'],
        PERMISSIONS['control.approve'],
        PERMISSIONS['evidence.link'],
        PERMISSIONS['evidence.review'],
        PERMISSIONS['framework.manage'],
        PERMISSIONS['framework.activate'],
        PERMISSIONS['compliance.manage'],
        PERMISSIONS['requirement.manage'],
        PERMISSIONS['requirement.attest'],
        PERMISSIONS['attestation.review'],
        PERMISSIONS['exception.create'],
        PERMISSIONS['exception.approve'],
        PERMISSIONS['audit.manage'],
        PERMISSIONS['compliance.report'],
        PERMISSIONS['privacy.manage'],
        PERMISSIONS['processingActivity.create'],
        PERMISSIONS['processingActivity.manage'],
        PERMISSIONS['dpia.manage'],
        PERMISSIONS['dpia.approve'],
        PERMISSIONS['rightsRequest.manage'],
        PERMISSIONS['rightsRequest.approve'],
        PERMISSIONS['transfer.manage'],
        PERMISSIONS['retention.manage'],
        PERMISSIONS['privacy.report'],
        PERMISSIONS['ai.create'],
        PERMISSIONS['ai.manage'],
        PERMISSIONS['ai.assess'],
        PERMISSIONS['ai.test'],
        PERMISSIONS['ai.approve'],
        PERMISSIONS['ai.restrict'],
        PERMISSIONS['ai.retire'],
        PERMISSIONS['ai.regulatoryReview'],
        PERMISSIONS['ai.report'],
        PERMISSIONS['intelligence.acknowledge'],
        PERMISSIONS['intelligence.report'],
        PERMISSIONS['automation.manage'],
        PERMISSIONS['automation.retry'],
    ],
    ASSESSOR: [
        ...READ_PORTFOLIO,
        PERMISSIONS['assessment.create'],
        PERMISSIONS['assessment.respond'],
        PERMISSIONS['assessment.complete'],
        PERMISSIONS['evidence.upload'],
        PERMISSIONS['finding.create'],
        PERMISSIONS['finding.update'],
        PERMISSIONS['risk.create'],
        PERMISSIONS['risk.update'],
        PERMISSIONS['risk.treat'],
        PERMISSIONS['report.export'],
        PERMISSIONS['control.test'],
        PERMISSIONS['evidence.link'],
        PERMISSIONS['requirement.manage'],
        PERMISSIONS['requirement.attest'],
        PERMISSIONS['exception.create'],
        PERMISSIONS['compliance.report'],
        PERMISSIONS['processingActivity.create'],
        PERMISSIONS['dpia.manage'],
        PERMISSIONS['rightsRequest.manage'],
        PERMISSIONS['privacy.report'],
        PERMISSIONS['ai.create'],
        PERMISSIONS['ai.assess'],
        PERMISSIONS['ai.test'],
        PERMISSIONS['ai.report'],
        PERMISSIONS['intelligence.acknowledge'],
        PERMISSIONS['intelligence.report'],
    ],
    APPROVER: [
        ...READ_PORTFOLIO,
        PERMISSIONS['approval.decide'],
        PERMISSIONS['risk.accept'],
        PERMISSIONS['risk.approve'],
        PERMISSIONS['report.export'],
        PERMISSIONS['audit.read'],
        PERMISSIONS['control.approve'],
        PERMISSIONS['evidence.review'],
        PERMISSIONS['attestation.review'],
        PERMISSIONS['exception.approve'],
        PERMISSIONS['compliance.report'],
        PERMISSIONS['dpia.approve'],
        PERMISSIONS['rightsRequest.approve'],
        PERMISSIONS['privacy.report'],
        PERMISSIONS['ai.approve'],
        PERMISSIONS['ai.restrict'],
        PERMISSIONS['ai.retire'],
        PERMISSIONS['ai.regulatoryReview'],
        PERMISSIONS['ai.report'],
        PERMISSIONS['intelligence.acknowledge'],
        PERMISSIONS['intelligence.report'],
    ],
    BUSINESS_OWNER: [
        ...READ_PORTFOLIO,
        PERMISSIONS['vendor.create'],
        PERMISSIONS['vendor.update'],
        PERMISSIONS['assessment.respond'],
        PERMISSIONS['evidence.upload'],
        PERMISSIONS['finding.read'],
    ],
    AUDITOR: [
        ...READ_PORTFOLIO,
        PERMISSIONS['report.export'],
        PERMISSIONS['audit.read'],
        PERMISSIONS['compliance.report'],
        PERMISSIONS['privacy.report'],
        PERMISSIONS['ai.report'],
        PERMISSIONS['intelligence.report'],
    ],
    VIEWER: READ_PORTFOLIO,
};

const ROLE_ALIASES: Record<string, CanonicalRole> = {
    SUPERADMIN: 'PLATFORM_ADMIN',
    PLATFORM_OWNER: 'PLATFORM_OWNER',
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    SUPPORT_ADMIN: 'SUPPORT_ADMIN',
    SUPPORT_ANALYST: 'SUPPORT_ANALYST',
    BILLING_SUPPORT: 'BILLING_SUPPORT',
    SECURITY_ADMIN: 'SECURITY_ADMIN',
    ADMIN: 'ORGANIZATION_ADMIN',
    ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
    ORG_ADMIN: 'ORGANIZATION_ADMIN',
    ORG_OWNER: 'ORGANIZATION_ADMIN',
    MANAGER: 'RISK_MANAGER',
    RISK_MANAGER: 'RISK_MANAGER',
    COMPLIANCE_OFFICER: 'ASSESSOR',
    COMPLIANCE_MANAGER: 'ASSESSOR',
    ASSESSOR: 'ASSESSOR',
    APPROVER: 'APPROVER',
    BUSINESS_OWNER: 'BUSINESS_OWNER',
    DEPARTMENT_MANAGER: 'BUSINESS_OWNER',
    AUDITOR: 'AUDITOR',
    USER: 'VIEWER',
    VIEWER: 'VIEWER',
    CONTRIBUTOR: 'ASSESSOR',
};

export function canonicalizeRole(role: string | undefined | null): CanonicalRole {
    if (!role) return 'VIEWER';
    return ROLE_ALIASES[role] || 'VIEWER';
}

export function permissionsForRole(role: string | undefined | null): Permission[] {
    return ROLE_PERMISSIONS[canonicalizeRole(role)];
}

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
    return permissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: string | undefined | null, permissions: Permission[]): boolean {
    return permissions.some((permission) => hasPermission(role, permission));
}

export function roleMatches(userRole: string | undefined | null, allowed: string[]): boolean {
    if (!userRole) return false;
    const canonical = canonicalizeRole(userRole);
    return allowed.some((role) => {
        const allowedCanonical = canonicalizeRole(role);
        return role === userRole || allowedCanonical === canonical || role === canonical;
    });
}

export const PLATFORM_OWNER_ROLES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPERADMIN'] as const;
export const PLATFORM_STAFF_ROLES = [
    ...PLATFORM_OWNER_ROLES,
    'SUPPORT_ADMIN',
    'SUPPORT_ANALYST',
    'BILLING_SUPPORT',
    'SECURITY_ADMIN',
] as const;

export function isPlatformOwnerRole(role: string | undefined | null): boolean {
    const canonical = canonicalizeRole(role);
    return canonical === 'PLATFORM_OWNER' || canonical === 'PLATFORM_ADMIN';
}

export function isPlatformStaffRole(role: string | undefined | null): boolean {
    const canonical = canonicalizeRole(role);
    return (
        isPlatformOwnerRole(role) ||
        canonical === 'SUPPORT_ADMIN' ||
        canonical === 'SUPPORT_ANALYST' ||
        canonical === 'BILLING_SUPPORT' ||
        canonical === 'SECURITY_ADMIN'
    );
}

export function isTenantCustomerRole(role: string | undefined | null): boolean {
    return !isPlatformStaffRole(role);
}

/** Legacy enum exported so existing imports of Permission from userService can migrate. */
export enum LegacyPermission {
    MANAGE_USERS = 'user.manage',
    INVITE_USERS = 'user.manage',
    VIEW_USERS = 'user.manage',
    CREATE_RISK = 'risk.create',
    EDIT_RISK = 'risk.update',
    DELETE_RISK = 'risk.delete',
    VIEW_RISK = 'risk.read',
    CREATE_COMPLIANCE = 'vendor.read',
    EDIT_COMPLIANCE = 'vendor.update',
    DELETE_COMPLIANCE = 'vendor.delete',
    VIEW_COMPLIANCE = 'vendor.read',
    CREATE_POLICY = 'vendor.update',
    EDIT_POLICY = 'vendor.update',
    DELETE_POLICY = 'vendor.delete',
    VIEW_POLICY = 'vendor.read',
    APPROVE_POLICY = 'approval.decide',
    CREATE_INCIDENT = 'finding.create',
    EDIT_INCIDENT = 'finding.update',
    DELETE_INCIDENT = 'finding.close',
    VIEW_INCIDENT = 'finding.read',
    CREATE_CONTROL = 'vendor.update',
    EDIT_CONTROL = 'vendor.update',
    DELETE_CONTROL = 'vendor.delete',
    VIEW_CONTROL = 'vendor.read',
    UPLOAD_DOCUMENT = 'evidence.upload',
    DELETE_DOCUMENT = 'evidence.delete',
    VIEW_DOCUMENT = 'evidence.read',
    VIEW_REPORTS = 'report.read',
    CREATE_REPORTS = 'report.read',
    EXPORT_DATA = 'report.export',
    MANAGE_SETTINGS = 'organization.manage',
    VIEW_AUDIT_LOGS = 'audit.read',
}
