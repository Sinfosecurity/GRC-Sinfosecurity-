import { calculateVendorRisk } from '../services/deterministicRiskEngine';

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
        expect(result.scoreVersion).toBe('supreme-risk-1.1.0');
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
});
