import { VendorTier } from '@prisma/client';
import { applyHardFloorToTier, resolveMinimumTier } from '../services/vendorTierIntegrity';

describe('vendor tier hard floors', () => {
    it('does not persist MEDIUM when a critical floor applies', () => {
        expect(() => applyHardFloorToTier(
            VendorTier.MEDIUM,
            resolveMinimumTier({ dataTypesAccessed: ['Cardholder (PCI)'] })
        )).toThrow(/at least CRITICAL/);
    });

    it('allows the recommended critical tier', () => {
        expect(applyHardFloorToTier(
            VendorTier.CRITICAL,
            resolveMinimumTier({ hardFloors: [{ applies: true }] })
        )).toBe(VendorTier.CRITICAL);
    });

    it('does not invent a floor when exposure facts are absent', () => {
        expect(applyHardFloorToTier(VendorTier.LOW, resolveMinimumTier({ dataTypesAccessed: ['Public'] }))).toBe(VendorTier.LOW);
    });
});
