import { entitlementsFor, normalizePlan, assertEntitlement } from '../billing/plans';

describe('plan entitlements', () => {
    it('does not hardcode commercial pricing', () => {
        expect(entitlementsFor('STARTER').maxVendors).toBe(25);
        expect(entitlementsFor('PROFESSIONAL').continuousMonitoring).toBe(true);
        expect(entitlementsFor('ENTERPRISE').sso).toBe(true);
    });

    it('defaults unknown plans to starter', () => {
        expect(normalizePlan('gold')).toBe('STARTER');
    });

    it('enforces feature flags server-side', () => {
        expect(assertEntitlement('STARTER', 'sso')).toBe(false);
        expect(assertEntitlement('ENTERPRISE', 'sso')).toBe(true);
    });
});
