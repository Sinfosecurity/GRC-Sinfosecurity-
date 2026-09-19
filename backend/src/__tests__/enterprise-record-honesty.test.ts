import { VendorTier } from '@prisma/client';
import { displayRiskTier, isUnratedTier, presentResidualScore, requirementNextAction, HONESTY } from '../governance/recordHonesty';

describe('enterprise record honesty', () => {
    it('does not treat a missing tier as Medium', () => {
        expect(displayRiskTier(undefined)).toBe('Not rated');
        expect(displayRiskTier(null)).toBe('Not rated');
        expect(displayRiskTier(VendorTier.UNRATED)).toBe('Not rated');
        expect(isUnratedTier(VendorTier.MEDIUM)).toBe(false);
        expect(displayRiskTier(VendorTier.HIGH)).toBe('High');
    });

    it('does not present residual as a live score when the vendor is unrated', () => {
        expect(presentResidualScore(42, VendorTier.UNRATED)).toBeNull();
        expect(presentResidualScore(42, VendorTier.HIGH)).toBe(42);
        expect(HONESTY.residualIsNotCompliance).toMatch(/not a compliance score/i);
    });

    it('names the next compliance action from recorded state', () => {
        expect(requirementNextAction({ applicabilityKey: 'NOT_DETERMINED', mappedControls: 0, usableEvidence: 0 }).key).toBe('review_applicability');
        expect(requirementNextAction({ applicabilityKey: 'APPLICABLE', mappedControls: 0, usableEvidence: 0 }).key).toBe('map_control');
        expect(requirementNextAction({ applicabilityKey: 'APPLICABLE', mappedControls: 1, usableEvidence: 0 }).key).toBe('add_evidence');
    });
});
