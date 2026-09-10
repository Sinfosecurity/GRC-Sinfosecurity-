import { calculateVendorRisk, RISK_SCORE_VERSION } from '../services/deterministicRiskEngine';

describe('deterministic risk engine', () => {
    const base = {
        vendorCriticality: 'HIGH' as const,
        dataSensitivityCount: 2,
        regulatoryCount: 1,
        hasSubcontractors: true,
        questionScores: [{ score: 8, maxScore: 10, weight: 5 }],
        openFindings: [{ severity: 'HIGH' as const }],
        monitoringEvents: 1,
        compensatingControls: 0,
        riskAccepted: false,
    };

    it('produces identical scores for identical inputs', () => {
        const a = calculateVendorRisk(base);
        const b = calculateVendorRisk(base);
        expect(a.inherentRisk).toBe(b.inherentRisk);
        expect(a.residualRisk).toBe(b.residualRisk);
        expect(a.controlEffectiveness).toBe(b.controlEffectiveness);
        expect(a.riskBand).toBe(b.riskBand);
        expect(a.scoreVersion).toBe(RISK_SCORE_VERSION);
    });

    it('increases residual risk with critical findings', () => {
        const low = calculateVendorRisk({ ...base, openFindings: [] });
        const high = calculateVendorRisk({ ...base, openFindings: [{ severity: 'CRITICAL' }] });
        expect(high.residualRisk).toBeGreaterThan(low.residualRisk);
    });

    it('caps scores at 100', () => {
        const result = calculateVendorRisk({
            vendorCriticality: 'CRITICAL',
            dataSensitivityCount: 40,
            hasSubcontractors: true,
            openFindings: [{ severity: 'CRITICAL' }, { severity: 'CRITICAL' }],
            monitoringEvents: 50,
        });
        expect(result.inherentRisk).toBeLessThanOrEqual(100);
        expect(result.residualRisk).toBeLessThanOrEqual(100);
    });
});
