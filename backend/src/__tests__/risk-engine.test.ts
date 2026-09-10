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

    it('returns named factors that sum to inherent risk before clamp', () => {
        const result = calculateVendorRisk({
            vendorCriticality: 'HIGH',
            dataSensitivityCount: 2,
            regulatoryCount: 1,
            hasSubcontractors: true,
        });
        const inherent = result.factors.filter((f) => f.group === 'inherent');
        expect(inherent.find((f) => f.code === 'criticality')?.points).toBe(60);
        expect(inherent.find((f) => f.code === 'data_sensitivity')?.points).toBe(6);
        expect(inherent.find((f) => f.code === 'regulatory_scope')?.points).toBe(2);
        expect(inherent.find((f) => f.code === 'fourth_party')?.points).toBe(10);
        expect(result.inherentRisk).toBe(78);
        expect(result.explanation).toContain('score version');
    });
});
