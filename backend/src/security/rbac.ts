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
    'risk.delete': 'risk.delete',
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
    PERMISSIONS['notification.read'],
    PERMISSIONS['monitoring.read'],
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
        PERMISSIONS['report.export'],
        PERMISSIONS['audit.read'],
        PERMISSIONS['monitoring.manage'],
        PERMISSIONS['questionnaire.manage'],
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
    ],
    APPROVER: [
        ...READ_PORTFOLIO,
        PERMISSIONS['approval.decide'],
        PERMISSIONS['risk.accept'],
        PERMISSIONS['report.export'],
        PERMISSIONS['audit.read'],
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
