import { calculateVendorRisk, DEFAULT_SCORING_WEIGHTS } from '../services/deterministicRiskEngine';
import { assertValidWeights, summarizeBandChanges } from '../services/scoringMethodologyService';

describe('organization scoring methodology', () => {
    const base = {
        vendorCriticality: 'HIGH' as const,
        dataSensitivityCount: 2,
        regulatoryCount: 1,
        hasSubcontractors: true,
        openFindings: [{ severity: 'HIGH' as const }],
    };

    it('keeps default weights producing the same residual as the certified formula', () => {
        const result = calculateVendorRisk(base);
        expect(result.inherentRisk).toBe(78);
        expect(result.scoreVersion).toBe('supreme-risk-1.2.0');
    });

    it('applies a new methodology version without rewriting the prior result object', () => {
        const before = calculateVendorRisk(base);
        const after = calculateVendorRisk({
            ...base,
            methodologyVersion: '1.0.1',
            methodology: { findingPoints: { HIGH: 20 } },
        });
        expect(before.residualRisk).not.toBe(after.residualRisk);
        expect(before.inputs.methodologyVersion).toBeUndefined();
        expect(after.inputs.methodologyVersion).toBe('1.0.1');
        expect(after.explanation).toContain('methodology 1.0.1');
    });

    it('rejects malformed methodology before publish', () => {
        expect(() => assertValidWeights({ ...DEFAULT_SCORING_WEIGHTS, fourthPartyPoints: -1 })).toThrow(/zero or greater/i);
        expect(() => assertValidWeights({ ...DEFAULT_SCORING_WEIGHTS, findingPoints: { HIGH: Number.NaN } })).toThrow(/finite/i);
        expect(() => assertValidWeights({ ...DEFAULT_SCORING_WEIGHTS, findingPoints: { URGENT: 4 } as any })).toThrow(/Critical, High, Medium, or Low/i);
        expect(assertValidWeights(DEFAULT_SCORING_WEIGHTS)).toEqual(DEFAULT_SCORING_WEIGHTS);
    });

    it('summarizes preview band movement without inventing saved scores', () => {
        const summary = summarizeBandChanges([
            { current: 'MEDIUM', preview: 'HIGH' },
            { current: 'MEDIUM', preview: 'HIGH' },
            { current: 'HIGH', preview: 'CRITICAL' },
            { current: 'LOW', preview: 'LOW' },
        ]);
        expect(summary.unchanged).toBe(1);
        expect(summary.changes).toEqual(expect.arrayContaining([
            { from: 'MEDIUM', to: 'HIGH', count: 2 },
            { from: 'HIGH', to: 'CRITICAL', count: 1 },
        ]));
    });
});
