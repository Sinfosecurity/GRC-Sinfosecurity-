import { VendorTier } from '@prisma/client';
import {
    addBusinessDays,
    extractVendorDomain,
    formatVendorPublicId,
    namesLikelyDuplicate,
    recommendTierFromIntake,
    unresolvedScopeBlockMessage,
    workbookControlGap,
} from '../services/vendorOnboardingScoring';
import { canonicalIntakeAnswers } from './helpers/canonicalIntake';

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

    it('recommends an explainable tier from canonical IR-01 to IR-15', () => {
        const result = recommendTierFromIntake(canonicalIntakeAnswers({
            ir_01: 'Moderate',
            ir_02: 'Moderate',
            ir_03: 'Moderate',
            ir_04: 'Low',
            ir_05: 'Moderate',
            ir_06: 'Moderate',
            ir_07: 'Moderate',
            ir_08: 'Moderate',
            ir_09: 'Moderate',
            ir_10: 'Moderate',
            ir_11: 'Low',
            ir_12: 'Moderate',
            ir_13: 'Low',
            ir_14: 'Moderate',
            ir_15: 'Moderate',
        }));
        expect(result.recommendedTier).toBe(VendorTier.MEDIUM);
        expect(result.maxScore).toBe(3);
        expect(result.score).toBeGreaterThan(0);
        expect(result.factors.some((factor) => factor.code === 'IR-03' || factor.label === 'Data volume')).toBe(true);
        expect(result.factors.find((factor) => factor.code === 'annual_spend')?.points).toBe(0);
        expect(result.explanation).toMatch(/medium/i);
        expect(result.signals.aiInvolved).toBe(false);
        expect(result.packs.required.some((pack) => pack.key === 'baseline')).toBe(true);
        expect(result.packs.required.some((pack) => pack.key === 'personal-sensitive-data')).toBe(true);
        expect(result.packs.required.some((pack) => pack.key === 'cloud-hosting')).toBe(true);
        expect(result.packs.unresolved).toHaveLength(0);
    });

    it('applies hard-floor rules for privileged access, cardholder data, and PHI', () => {
        const privileged = recommendTierFromIntake([{ questionKey: 'ir_04', response: 'High' }]);
        expect(privileged.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(privileged.hardFloors.find((floor) => floor.code === 'privileged_access')?.applies).toBe(true);

        const cardholder = recommendTierFromIntake([{ questionKey: 'ir_eng_data', response: 'Cardholder (PCI)' }]);
        expect(cardholder.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(cardholder.signals.cardholder).toBe(true);

        const phi = recommendTierFromIntake([{ questionKey: 'ir_eng_data', response: 'PHI / highly sensitive' }]);
        expect(phi.recommendedTier).toBe(VendorTier.CRITICAL);
        expect(phi.signals.phi).toBe(true);
        expect(phi.signals.personalData).toBe(true);
    });

    it('does not silently drop a pack when the controlling fact is Unknown', () => {
        const result = recommendTierFromIntake(canonicalIntakeAnswers({ ir_04: 'Unknown', ir_05: 'Low', scope_privileged_network: 'Unknown' }));
        expect(result.packs.unresolved.some((row) => row.packKey === 'privileged-network')).toBe(true);
        expect(result.packs.required.some((pack) => pack.key === 'privileged-network')).toBe(false);
        expect(unresolvedScopeBlockMessage(result.packs.unresolved)).toMatch(/pack requires scope confirmation/i);
    });

    it('maps the workbook eighth pack from the physical-delivery trigger', () => {
        const result = recommendTierFromIntake(canonicalIntakeAnswers({ ir_physical: 'Yes', scope_physical_delivery: 'Yes' }));
        expect(result.packs.required.some((pack) => pack.key === 'physical-delivery')).toBe(true);
        expect(result.packs.required.find((pack) => pack.key === 'physical-delivery')?.why.join(' ')).toMatch(/Yes/i);
    });

    it('surfaces privacy, AI, and resilience signals without writing a legal conclusion', () => {
        const result = recommendTierFromIntake(canonicalIntakeAnswers({
            ir_02: 'High',
            ir_13: 'High',
            ir_01: 'High',
            ir_10: 'High',
        }));
        expect(result.signals.personalData).toBe(true);
        expect(result.signals.aiInvolved).toBe(true);
        expect(result.signals.criticalDependency).toBe(true);
        expect(result.signals.fourthParty).toBe(true);
    });

    it('computes workbook control-gap percent without replacing vendor residual', () => {
        const gap = workbookControlGap([
            { weight: 5, response: 'Yes' },
            { weight: 5, response: 'Partial' },
            { weight: 5, response: 'No' },
            { weight: 5, response: 'N/A' },
            { weight: 5, response: 'Not Answered' },
        ]);
        expect(gap.percent).toBe(50);
        expect(gap.band).toBe('High');
        expect(gap.formula).toMatch(/Not Answered excluded/);
    });

    it('applies the four approved workbook control-gap band boundaries', () => {
        const yes = (weight: number) => ({ weight, response: 'Yes' });
        const no = (weight: number) => ({ weight, response: 'No' });
        expect(workbookControlGap([yes(5)]).band).toBe('Low');
        expect(workbookControlGap([no(3), yes(18)]).percent).toBe(14.3);
        expect(workbookControlGap([no(3), yes(18)]).band).toBe('Low');
        expect(workbookControlGap([no(3), yes(17)]).percent).toBe(15);
        expect(workbookControlGap([no(3), yes(17)]).band).toBe('Medium');
        expect(workbookControlGap([no(7), yes(14)]).percent).toBe(33.3);
        expect(workbookControlGap([no(7), yes(14)]).band).toBe('Medium');
        expect(workbookControlGap([no(7), yes(13)]).percent).toBe(35);
        expect(workbookControlGap([no(7), yes(13)]).band).toBe('High');
        expect(workbookControlGap([no(12), yes(9)]).percent).toBe(57.1);
        expect(workbookControlGap([no(12), yes(9)]).band).toBe('High');
        expect(workbookControlGap([no(12), yes(8)]).percent).toBe(60);
        expect(workbookControlGap([no(12), yes(8)]).band).toBe('Critical');
    });

    it('counts business days and skips weekends', () => {
        const monday = new Date(2026, 8, 14, 9, 0, 0);
        const due = addBusinessDays(monday, 5);
        expect(due.getDay()).not.toBe(0);
        expect(due.getDay()).not.toBe(6);
        expect(due.getDate()).toBe(21);
    });
});
