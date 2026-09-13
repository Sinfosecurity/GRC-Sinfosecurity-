import { isPlatformStaff } from '../platform/roles';

export type NavPermission =
    | 'always'
    | 'vendor.read'
    | 'assessment.read'
    | 'evidence.read'
    | 'finding.read'
    | 'monitoring.read'
    | 'approval.read'
    | 'report.read'
    | 'organization.manage'
    | 'user.manage'
    | 'questionnaire.manage'
    | 'integration.manage'
    | 'billing.manage'
    | 'audit.read'
    | 'platform';

const ROLE_NAV: Record<string, NavPermission[]> = {
    VIEWER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    USER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    ASSESSOR: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    COMPLIANCE_OFFICER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    APPROVER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read'],
    BUSINESS_OWNER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    DEPARTMENT_MANAGER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read'],
    AUDITOR: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read'],
    RISK_MANAGER: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read',
    ],
    MANAGER: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read',
    ],
    ORGANIZATION_ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'audit.read',
    ],
    ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'audit.read',
    ],
    ORG_ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'audit.read',
    ],
};

export function canSeeNav(role: string | undefined | null, permission: NavPermission, extraPermissions?: string[]): boolean {
    if (permission === 'always') return true;
    if (permission === 'platform') return isPlatformStaff(role);
    if (extraPermissions?.includes(permission)) return true;
    const granted = ROLE_NAV[role || ''] || ROLE_NAV.VIEWER;
    if (isPlatformStaff(role)) {
        return granted.includes(permission) || permission === 'audit.read';
    }
    return granted.includes(permission);
}
