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

    it('treats BUSINESS as its own plan, not Professional or Enterprise', () => {
        expect(normalizePlan('BUSINESS')).toBe('BUSINESS');
        expect(normalizePlan('business')).toBe('BUSINESS');
        const business = entitlementsFor('BUSINESS');
        const professional = entitlementsFor('PROFESSIONAL');
        const enterprise = entitlementsFor('ENTERPRISE');
        expect(business.maxUsers).toBe(75);
        expect(business.maxVendors).toBe(750);
        expect(business.maxUsers).toBeGreaterThan(professional.maxUsers);
        expect(business.maxVendors).toBeGreaterThan(professional.maxVendors);
        expect(business.maxUsers).toBeLessThan(enterprise.maxUsers);
        expect(business.sso).toBe(false);
        expect(enterprise.sso).toBe(true);
        expect(business.advancedReporting).toBe(true);
        expect(business.continuousMonitoring).toBe(true);
    });

    it('enforces feature flags server-side', () => {
        expect(assertEntitlement('STARTER', 'sso')).toBe(false);
        expect(assertEntitlement('ENTERPRISE', 'sso')).toBe(true);
    });
});
