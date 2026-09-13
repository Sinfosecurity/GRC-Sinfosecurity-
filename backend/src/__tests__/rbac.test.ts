import { canonicalizeRole, hasPermission, PERMISSIONS, roleMatches } from '../security/rbac';

describe('RBAC', () => {
    it('maps legacy roles without breaking compatibility', () => {
        expect(canonicalizeRole('ADMIN')).toBe('ORGANIZATION_ADMIN');
        expect(canonicalizeRole('SUPERADMIN')).toBe('PLATFORM_ADMIN');
        expect(canonicalizeRole('USER')).toBe('VIEWER');
        expect(canonicalizeRole('COMPLIANCE_OFFICER')).toBe('ASSESSOR');
    });

    it('denies sensitive actions to viewers', () => {
        expect(hasPermission('VIEWER', PERMISSIONS['approval.decide'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['risk.accept'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['user.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['billing.manage'])).toBe(false);
        expect(hasPermission('VIEWER', PERMISSIONS['vendor.read'])).toBe(true);
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
    });

    it('matches aliased roles in authorize()', () => {
        expect(roleMatches('ADMIN', ['ORGANIZATION_ADMIN', 'ADMIN'])).toBe(true);
        expect(roleMatches('VIEWER', ['ADMIN'])).toBe(false);
    });
});
