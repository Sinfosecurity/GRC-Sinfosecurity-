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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type CanonicalRole =
    | 'PLATFORM_ADMIN'
    | 'ORGANIZATION_ADMIN'
    | 'RISK_MANAGER'
    | 'ASSESSOR'
    | 'APPROVER'
    | 'BUSINESS_OWNER'
    | 'AUDITOR'
    | 'VIEWER';

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

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
    PLATFORM_ADMIN: ALL_PERMISSIONS,
    ORGANIZATION_ADMIN: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS['approval.override'] || true),
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
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
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
