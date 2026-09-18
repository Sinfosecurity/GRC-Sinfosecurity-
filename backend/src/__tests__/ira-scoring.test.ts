import { VendorTier } from '@prisma/client';
import { BASELINE_LITE_KEYS } from '../tprm/iraCatalog';
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

describe('Version 3 inherent-risk IRA', () => {
    it('does not store a tier while any answer is Don\'t know', () => {
        const result = scoreIra(answers({ a4: 'dont_know' }));
        expect(result.ready).toBe(false);
        expect(result.recommendedTier).toBeNull();
        expect(result.message).toMatch(/Not yet rated/);
        expect(result.autoConfirmEligible).toBe(false);
    });

    it('floors any personal data to Medium and requires GRC review', () => {
        const result = scoreIra(answers({ a2: 'personal' }), {
            externalRating: { provider: 'securityscorecard', score: 90, grade: 'A', assessedAt: new Date() },
        });
        expect(result.recommendedTier).toBe(VendorTier.MEDIUM);
        expect(result.signals.dpaRequired).toBe(true);
        expect(result.autoConfirmEligible).toBe(false);
        expect(result.packs.packs.find((row) => row.key === 'personal-sensitive-data')?.state).toBe('INCLUDED');
    });

    it('floors personal data over 100,000 records to High', () => {
        const result = scoreIra(answers({ a2: 'personal', a3: 'over_100k' }));
        expect(result.recommendedTier).toBe(VendorTier.HIGH);
    });

    it('does not turn on Critical Operations for a work-around', () => {
        const result = scoreIra(answers({ b1: 'workaround' }));
        expect(result.packs.packs.find((row) => row.key === 'critical-operations')?.state).toBe('EXCLUDED');
        expect(result.packs.packs.find((row) => row.key === 'critical-operations')?.state).not.toBe('INCLUDED');
    });

    it('turns on Critical Operations only from serious disruption within a week', () => {
        const result = scoreIra(answers({ b1: 'week' }));
        expect(result.packs.packs.find((row) => row.key === 'critical-operations')?.state).toBe('INCLUDED');
    });

    it('blocks auto-confirm when the vendor uses AI', () => {
        const result = scoreIra(answers({ a8: 'yes' }), {
            externalRating: { provider: 'securityscorecard', score: 90, grade: 'A', assessedAt: new Date() },
        });
        expect(result.autoConfirmEligible).toBe(false);
        expect(result.autoConfirmBlockedReason).toMatch(/AI/);
    });

    it('auto-confirms Low only with a current rating and no floors', () => {
        const result = scoreIra(answers(), {
            externalRating: { provider: 'securityscorecard', score: 92, grade: 'A', assessedAt: new Date() },
        });
        expect(result.recommendedTier).toBe(VendorTier.LOW);
        expect(result.autoConfirmEligible).toBe(true);
        expect(result.packs.packs.find((row) => row.key === 'baseline')?.questionCount).toBe(14);
        expect(BASELINE_LITE_KEYS).toHaveLength(14);
    });

    it('raises one tier when SecurityScorecard is below B', () => {
        const result = scoreIra(answers(), {
            externalRating: { provider: 'securityscorecard', score: 70, grade: 'C', assessedAt: new Date() },
        });
        expect(result.recommendedTier).toBe(VendorTier.MEDIUM);
        expect(result.autoConfirmEligible).toBe(false);
    });

    it('blocks auto-confirm Low when the external rating is missing or stale', () => {
        expect(scoreIra(answers()).autoConfirmEligible).toBe(false);
        expect(scoreIra(answers(), {
            externalRating: { provider: 'securityscorecard', score: 92, grade: 'A', assessedAt: new Date('2020-01-01') },
            now: new Date('2026-09-18'),
        }).autoConfirmEligible).toBe(false);
    });

    it('raises one tier when BitSight is below 650 and leaves a 700 rating alone', () => {
        expect(scoreIra(answers(), {
            externalRating: { provider: 'bitsight', score: 600, assessedAt: new Date() },
        }).recommendedTier).toBe(VendorTier.MEDIUM);
        expect(scoreIra(answers(), {
            externalRating: { provider: 'bitsight', score: 700, assessedAt: new Date() },
        }).recommendedTier).toBe(VendorTier.LOW);
    });
});
