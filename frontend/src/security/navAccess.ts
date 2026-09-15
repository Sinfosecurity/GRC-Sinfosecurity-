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
    | 'governanceGraph.read'
    | 'risk.read'
    | 'control.read'
    | 'framework.read'
    | 'compliance.read'
    | 'privacy.read'
    | 'ai.read'
    | 'intelligence.read'
    | 'automation.read'
    | 'organization.manage'
    | 'user.manage'
    | 'identity.manage'
    | 'questionnaire.manage'
    | 'integration.manage'
    | 'billing.manage'
    | 'audit.read'
    | 'platform';

const ROLE_NAV: Record<string, NavPermission[]> = {
    VIEWER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    USER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    ASSESSOR: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    COMPLIANCE_OFFICER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    APPROVER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    BUSINESS_OWNER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    DEPARTMENT_MANAGER: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    AUDITOR: ['always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read'],
    RISK_MANAGER: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read',
    ],
    MANAGER: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read',
    ],
    ORGANIZATION_ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read',
    ],
    ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read',
    ],
    ORG_ADMIN: [
        'always', 'vendor.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read',
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
