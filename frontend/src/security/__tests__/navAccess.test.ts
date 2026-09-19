import { describe, expect, it } from 'vitest';
import { canSeeNav } from '../navAccess';

describe('canSeeNav', () => {
    it('hides administration from viewers', () => {
        expect(canSeeNav('VIEWER', 'vendor.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'governanceGraph.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'control.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'framework.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'compliance.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'privacy.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'ai.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'automation.read')).toBe(true);
        expect(canSeeNav('VIEWER', 'user.manage')).toBe(false);
        expect(canSeeNav('VIEWER', 'identity.manage')).toBe(false);
        expect(canSeeNav('ASSESSOR', 'identity.manage')).toBe(false);
        expect(canSeeNav('VIEWER', 'billing.manage')).toBe(false);
        expect(canSeeNav('VIEWER', 'platform')).toBe(false);
        expect(canSeeNav('BUSINESS_OWNER', 'vendor.read')).toBe(false);
        expect(canSeeNav('BUSINESS_OWNER', 'intake.read')).toBe(false);
        expect(canSeeNav('BUSINESS_OWNER', 'finding.read')).toBe(false);
    });

    it('shows tenant administration to organization admins only', () => {
        expect(canSeeNav('ORGANIZATION_ADMIN', 'user.manage')).toBe(true);
        expect(canSeeNav('ORGANIZATION_ADMIN', 'identity.manage')).toBe(true);
        expect(canSeeNav('ORGANIZATION_ADMIN', 'billing.manage')).toBe(true);
        expect(canSeeNav('ASSESSOR', 'user.manage')).toBe(false);
        expect(canSeeNav('RISK_MANAGER', 'questionnaire.manage')).toBe(true);
        expect(canSeeNav('RISK_MANAGER', 'billing.manage')).toBe(false);
    });

    it('shows platform console to platform staff', () => {
        expect(canSeeNav('PLATFORM_OWNER', 'platform')).toBe(true);
        expect(canSeeNav('ORGANIZATION_ADMIN', 'platform')).toBe(false);
    });
});
