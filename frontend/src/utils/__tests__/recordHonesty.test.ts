import { describe, expect, it } from 'vitest';
import { complianceFromAuthoritative, displayRiskTier, residualDisplay } from '../recordHonesty';

describe('record honesty helpers', () => {
    it('never invents Medium from a missing tier', () => {
        expect(displayRiskTier(undefined)).toBe('Not rated');
        expect(displayRiskTier('UNRATED')).toBe('Not rated');
        expect(displayRiskTier('HIGH')).toBe('High');
    });

    it('never derives compliance from residual risk', () => {
        expect(complianceFromAuthoritative(undefined)).toBeNull();
        expect(complianceFromAuthoritative(100 - 32)).toBe(68);
    });

    it('does not show 0 as a scored residual on an unrated vendor', () => {
        expect(residualDisplay(0, 'UNRATED')).toBe('Not scored');
        expect(residualDisplay(32, 'HIGH')).toBe('32');
    });
});
