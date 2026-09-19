import { canonicalizeRole, customerLandingPath, hasPermission, participantExperience, PERMISSIONS, roleMatches } from '../security/rbac';

describe('RBAC', () => {
    it('maps legacy roles without breaking compatibility', () => {
        expect(canonicalizeRole('ADMIN')).toBe('ORGANIZATION_ADMIN');
        expect(canonicalizeRole('SUPERADMIN')).toBe('PLATFORM_ADMIN');
        expect(canonicalizeRole('USER')).toBe('VIEWER');
        expect(canonicalizeRole('COMPLIANCE_OFFICER')).toBe('ASSESSOR');
    });

    it('fails closed for unknown and empty roles', () => {
        expect(canonicalizeRole('EXECUTIVE')).toBeNull();
        expect(canonicalizeRole('BOARD_MEMBER')).toBeNull();
        expect(canonicalizeRole('CFO')).toBeNull();
        expect(canonicalizeRole('UNKNOWN_PRIVILEGED')).toBeNull();
        expect(canonicalizeRole(undefined)).toBeNull();
        expect(canonicalizeRole('')).toBeNull();
        expect(hasPermission('EXECUTIVE', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['approval.decide'])).toBe(false);
        expect(roleMatches('VIEWER', ['ADMIN', 'RISK_MANAGER', 'EXECUTIVE'])).toBe(false);
        expect(roleMatches('EXECUTIVE', ['ADMIN', 'RISK_MANAGER', 'EXECUTIVE'])).toBe(false);
        expect(hasPermission(undefined, PERMISSIONS['vendor.read'])).toBe(false);
    });

    it('denies sensitive actions to viewers', () => {
        expect(hasPermission('VIEWER', PERMISSIONS['intelligence.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['automation.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['automation.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['intelligence.acknowledge'])).toBe(false);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['intelligence.acknowledge'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['risk.accept'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['user.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['identity.manage'])).toBe(false);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['identity.manage'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['billing.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['vendor.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['governanceGraph.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['governanceGraph.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['control.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['risk.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['kri.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['risk.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['kri.manage'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['risk.treat'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['risk.approve'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['risk.score'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['control.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['control.test'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['evidence.link'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['framework.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['compliance.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['privacy.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['rightsRequest.read'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['rightsRequest.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['privacy.manage'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['dpia.approve'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['rightsRequest.approve'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['privacy.manage'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['processingActivity.create'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['privacy.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['framework.activate'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['requirement.attest'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['requirement.attest'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['framework.activate'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['exception.approve'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['attestation.review'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['compliance.manage'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['framework.activate'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['control.test'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['control.manage'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['questionnaire.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['questionnaire.manage'])).toBe(false);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['questionnaire.manage'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['questionnaire.manage'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['control.approve'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['evidence.review'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['control.manage'])).toBe(true);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['framework.manage'])).toBe(true);
        expect(hasPermission('SUPPORT_ADMIN', PERMISSIONS['governanceGraph.read'])).toBe(false);
        expect(hasPermission('SUPPORT_ANALYST', PERMISSIONS['governanceGraph.manage'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['governanceGraph.manage'])).toBe(true);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['platform.overview'])).toBe(false);
        expect(hasPermission('PLATFORM_OWNER', PERMISSIONS['platform.overview'])).toBe(true);
        expect(hasPermission('PLATFORM_OWNER', PERMISSIONS['platform.testers.manage'])).toBe(true);
        expect(hasPermission('SUPPORT_ADMIN', PERMISSIONS['platform.testers.manage'])).toBe(true);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['platform.testers.manage'])).toBe(false);
    });

    it('allows approvers to decide and accept risk', () => {
        expect(hasPermission('APPROVER', PERMISSIONS['approval.decide'])).toBe(true);
        expect(hasPermission('APPROVER', PERMISSIONS['risk.accept'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['report.export'])).toBe(true);
        expect(hasPermission('VIEWER', PERMISSIONS['report.export'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['intake.assign'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['intake.create'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['intake.read'])).toBe(true);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['intake.create'])).toBe(false);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['intake.create_own'])).toBe(true);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['intake.read'])).toBe(false);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['vendor.read'])).toBe(false);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['finding.read'])).toBe(false);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['intake.assign'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['intake.triage'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['intake.assign'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['intake.assign'])).toBe(true);
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['intake.assign'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['intake.create_own'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['intake.create_own'])).toBe(false);
        expect(hasPermission('ASSESSOR', PERMISSIONS['intake.create'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['intake.create'])).toBe(false);
    });

    it('isolates requester and GRC participant experiences by role', () => {
        expect(participantExperience('BUSINESS_OWNER')).toBe('requester');
        expect(participantExperience('DEPARTMENT_MANAGER')).toBe('requester');
        expect(participantExperience('ASSESSOR')).toBe('grc');
        expect(participantExperience('RISK_MANAGER')).toBe('grc');
        expect(participantExperience('ORGANIZATION_ADMIN')).toBe('grc');
        expect(participantExperience('VIEWER')).toBe('grc');
        expect(participantExperience('APPROVER')).toBe('grc');
        expect(participantExperience('AUDITOR')).toBe('grc');
        expect(participantExperience('VENDOR')).toBe('vendor');
        expect(customerLandingPath('BUSINESS_OWNER')).toBe('/request');
        expect(customerLandingPath('ASSESSOR')).toBe('/dashboard');
        expect(customerLandingPath('ORGANIZATION_ADMIN')).toBe('/dashboard');
        expect(hasPermission('ORGANIZATION_ADMIN', PERMISSIONS['intake.create_own'])).toBe(true);
        expect(participantExperience('ORGANIZATION_ADMIN')).not.toBe('requester');
    });

    it('matches aliased roles in authorize()', () => {
        expect(roleMatches('ADMIN', ['ORGANIZATION_ADMIN', 'ADMIN'])).toBe(true);
        expect(roleMatches('VIEWER', ['ADMIN'])).toBe(false);
    });
});
