import { persistIraJurisdictions } from '../tprm/iraJurisdiction';
import { scoreIra } from '../tprm/iraScoring';

function answers(overrides: Record<string, string> = {}) {
    return Object.entries({
        a1: 'consulting',
        a2: 'internal',
        a3: 'none',
        a4: 'none',
        a5: 'internal',
        a6: 'country',
        a7: 'no',
        a8: 'no',
        a9: 'no',
        b1: 'manage',
        b2: 'no',
        b3: 'no',
        b4: 'minor',
        b5: 'easy',
        ...overrides,
    }).map(([questionKey, response]) => ({ questionKey, response }));
}

describe('IRA jurisdiction capture', () => {
    it('maps storage in the organization country to the existing country class', () => {
        const persisted = persistIraJurisdictions({ a6_storage: 'US' }, 'US');
        expect(persisted.derived).toBe('country');
        const scored = scoreIra(answers({ a6: '', a6_storage: 'US' }), { organizationCountry: 'US' });
        expect(scored.ready).toBe(true);
        expect(scored.factors.find((row) => row.code === 'IR-09')?.points).toBe(0);
    });

    it('maps same-region countries to the existing region class without new weights', () => {
        const persisted = persistIraJurisdictions({ a6_storage: 'US|CA', a6_processing: 'CA' }, 'United States');
        expect(persisted.derived).toBe('region');
        const scored = scoreIra(answers({ a6: '', a6_storage: 'US|CA' }), { organizationCountry: 'US' });
        expect(scored.factors.find((row) => row.code === 'IR-09')?.points).toBe(1);
    });

    it('maps an outside-region country to the existing outside class', () => {
        const persisted = persistIraJurisdictions({ a6_storage: 'GB' }, 'US');
        expect(persisted.derived).toBe('outside');
        const scored = scoreIra(answers({ a6: '', a6_storage: 'GB' }), { organizationCountry: 'US' });
        expect(scored.factors.find((row) => row.code === 'IR-09')?.points).toBe(2);
    });

    it('keeps Don\'t know as a blocking unknown, not a scored geography', () => {
        const persisted = persistIraJurisdictions({ a6_storage: 'dont_know' }, 'US');
        expect(persisted.derived).toBe('dont_know');
        const scored = scoreIra(answers({ a6: '', a6_storage: 'dont_know' }), { organizationCountry: 'US' });
        expect(scored.ready).toBe(false);
        expect(scored.unknownKeys).toContain('a6');
    });

    it('does not invent a score when the organization country is unmapped', () => {
        const persisted = persistIraJurisdictions({ a6_storage: 'US' }, 'Not A Real Country');
        expect(persisted.methodologyGap).toBe('ORG_COUNTRY_UNMAPPED');
        const scored = scoreIra(answers({ a6: '', a6_storage: 'US' }), { organizationCountry: 'Not A Real Country' });
        expect(scored.ready).toBe(false);
        expect(scored.methodologyGap).toBe('ORG_COUNTRY_UNMAPPED');
        expect(scored.percent).toBeNull();
    });
});
