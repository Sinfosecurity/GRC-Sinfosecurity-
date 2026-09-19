import { isPlatformStaff } from '../platform/roles';

export type NavPermission =
    | 'always'
    | 'vendor.read'
    | 'intake.create'
    | 'intake.read'
    | 'intake.triage'
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
    | 'insurance.read'
    | 'insurance.manage'
    | 'organization.manage'
    | 'user.manage'
    | 'identity.manage'
    | 'questionnaire.manage'
    | 'integration.manage'
    | 'billing.manage'
    | 'audit.read'
    | 'platform';

const ROLE_NAV: Record<string, NavPermission[]> = {
    VIEWER: ['always', 'vendor.read', 'intake.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    USER: ['always', 'vendor.read', 'intake.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    ASSESSOR: ['always', 'vendor.read', 'intake.read', 'intake.create', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage'],
    COMPLIANCE_OFFICER: ['always', 'vendor.read', 'intake.read', 'intake.create', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage'],
    APPROVER: ['always', 'vendor.read', 'intake.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    BUSINESS_OWNER: ['always', 'vendor.read', 'intake.create', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    DEPARTMENT_MANAGER: ['always', 'vendor.read', 'intake.create', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    AUDITOR: ['always', 'vendor.read', 'intake.read', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read', 'approval.read', 'report.read', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read'],
    RISK_MANAGER: [
        'always', 'vendor.read', 'intake.create', 'intake.read', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage',
    ],
    MANAGER: [
        'always', 'vendor.read', 'intake.create', 'intake.read', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'questionnaire.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage',
    ],
    ORGANIZATION_ADMIN: [
        'always', 'vendor.read', 'intake.create', 'intake.read', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage',
    ],
    ADMIN: [
        'always', 'vendor.read', 'intake.create', 'intake.read', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage',
    ],
    ORG_ADMIN: [
        'always', 'vendor.read', 'intake.create', 'intake.read', 'intake.triage', 'assessment.read', 'evidence.read', 'finding.read', 'monitoring.read',
        'approval.read', 'report.read', 'organization.manage', 'user.manage', 'questionnaire.manage',
        'integration.manage', 'billing.manage', 'identity.manage', 'audit.read', 'governanceGraph.read', 'risk.read', 'control.read', 'framework.read', 'compliance.read', 'privacy.read', 'ai.read', 'intelligence.read', 'automation.read', 'insurance.read', 'insurance.manage',
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
