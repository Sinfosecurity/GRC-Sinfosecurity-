import { calculateVendorRisk } from '../services/deterministicRiskEngine';
import { DECISION_OPTIONS } from '../services/riskDecisionBriefService';

describe('risk decision brief rules', () => {
    it('exposes the five enterprise decision options', () => {
        expect(DECISION_OPTIONS).toEqual([
            'APPROVE',
            'APPROVE_WITH_CONDITIONS',
            'ESCALATE',
            'REJECT',
            'RISK_ACCEPTED',
        ]);
    });

    it('does not treat AI as the source of residual risk', () => {
        const scored = calculateVendorRisk({
            vendorCriticality: 'CRITICAL',
            dataSensitivityCount: 3,
            openFindings: [{ severity: 'HIGH' }],
        });
        expect(scored.residualRisk).toBeGreaterThan(0);
        expect(scored.scoreVersion).toBe('supreme-risk-1.0.0');
        expect(scored.factors.some((factor) => factor.code === 'criticality')).toBe(true);
    });
});
