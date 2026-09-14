import { VendorTier } from '@prisma/client';
import {
    addBusinessDays,
    extractVendorDomain,
    formatVendorPublicId,
    namesLikelyDuplicate,
    recommendTierFromIntake,
} from '../services/vendorOnboardingScoring';

describe('vendor onboarding scoring', () => {
    it('allocates public vendor IDs as VND-YYYY-NNNN', () => {
        expect(formatVendorPublicId(2026, 1)).toBe('VND-2026-0001');
        expect(formatVendorPublicId(2026, 142)).toBe('VND-2026-0142');
    });

    it('detects likely duplicate names and domains', () => {
        expect(namesLikelyDuplicate('Acme Payroll Services Inc', 'Acme Payroll Services')).toBe(true);
        expect(namesLikelyDuplicate('Acme', 'Completely Different')).toBe(false);
        expect(extractVendorDomain('https://www.acmepayroll.com/security')).toBe('acmepayroll.com');
    });

    it('recommends an explainable tier from intake answers', () => {
        const result = recommendTierFromIntake([
            { questionKey: 'ir_data', response: 'Confidential' },
            { questionKey: 'ir_volume', response: '1,000 to 10,000' },
            { questionKey: 'ir_access', response: 'Read-only API' },
            { questionKey: 'ir_onsite', response: 'No' },
            { questionKey: 'ir_geo', response: 'Domestic only' },
            { questionKey: 'ir_regulated', response: 'No' },
            { questionKey: 'ir_fourth', response: 'No' },
            { questionKey: 'ir_availability', response: 'After 1 week / significant' },
            { questionKey: 'ir_spend', response: '$25k–$250k' },
            { questionKey: 'ir_ai', response: 'No' },
        ]);
        expect(result.recommendedTier).toBe(VendorTier.MEDIUM);
        expect(result.score).toBeGreaterThan(0);
        expect(result.factors.some((factor) => factor.label === 'Sensitive data')).toBe(true);
        expect(result.explanation).toMatch(/medium/i);
        expect(result.signals.aiInvolved).toBe(false);
    });

    it('applies hard-floor rules for privileged access, cardholder data, and PHI', () => {
        const privileged = recommendTierFromIntake([{ questionKey: 'ir_access', response: 'Privileged or network access' }]);
        expect(privileged.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(privileged.hardFloors.find((floor) => floor.code === 'privileged_access')?.applies).toBe(true);

        const cardholder = recommendTierFromIntake([{ questionKey: 'ir_data', response: 'Cardholder (PCI)' }]);
        expect(cardholder.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(cardholder.signals.cardholder).toBe(true);

        const phi = recommendTierFromIntake([{ questionKey: 'ir_data', response: 'PHI / highly sensitive' }]);
        expect(phi.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(phi.signals.phi).toBe(true);
        expect(phi.signals.personalData).toBe(true);
    });

    it('surfaces privacy, AI, and resilience signals without writing a legal conclusion', () => {
        const result = recommendTierFromIntake([
            { questionKey: 'ir_data', response: 'Personal data' },
            { questionKey: 'ir_ai', response: 'Yes' },
            { questionKey: 'ir_availability', response: 'Within 1 day / severe' },
            { questionKey: 'ir_fourth', response: 'Yes' },
        ]);
        expect(result.signals.personalData).toBe(true);
        expect(result.signals.aiInvolved).toBe(true);
        expect(result.signals.criticalDependency).toBe(true);
        expect(result.signals.fourthParty).toBe(true);
    });

    it('counts business days and skips weekends', () => {
        const monday = new Date(2026, 8, 14, 9, 0, 0);
        const due = addBusinessDays(monday, 5);
        expect(due.getDay()).not.toBe(0);
        expect(due.getDay()).not.toBe(6);
        expect(due.getDate()).toBe(21);
    });
});
