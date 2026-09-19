import { calculateEngagementResidual, calculateVendorRisk, engagementResidualReadiness, RISK_SCORE_VERSION } from '../services/deterministicRiskEngine';

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

    it('does not reduce residual risk when risk is accepted as a governance decision', () => {
        const before = calculateVendorRisk(base);
        const afterAcceptance = calculateVendorRisk({ ...base, riskAccepted: true } as typeof base);
        expect(afterAcceptance.residualRisk).toBe(before.residualRisk);
        expect(afterAcceptance.riskBand).toBe(before.riskBand);
        expect(afterAcceptance.factors.some((factor) => factor.code === 'risk_acceptance')).toBe(false);
        expect(afterAcceptance.explanation).not.toContain('risk acceptance applied');
    });

    it('uses canonical inherent instead of placeholder tier reconstruction', () => {
        const placeholder = calculateVendorRisk({
            vendorCriticality: 'MEDIUM',
            dataSensitivityCount: 1,
            authoritativeInherent: 80,
            noEligibleControls: true,
        });
        expect(placeholder.inherentRisk).toBe(80);
        expect(placeholder.residualRisk).toBe(80);
        expect(placeholder.controlEffectiveness).toBe(0);
        expect(placeholder.factors.some((factor) => factor.code === 'canonical_intake')).toBe(true);
    });

    it('does not grant control credit from unanswered questions or intake-style maturity alone', () => {
        const none = calculateVendorRisk({
            vendorCriticality: 'HIGH',
            authoritativeInherent: 70,
            noEligibleControls: true,
            controlMaturity: 4,
            questionScores: [],
        });
        expect(none.controlEffectiveness).toBe(0);
        expect(none.residualRisk).toBe(70);
    });

    it('does not improve residual when control answers get worse', () => {
        const strong = calculateVendorRisk({
            vendorCriticality: 'HIGH',
            authoritativeInherent: 70,
            questionScores: [{ score: 9, maxScore: 10, weight: 1 }],
        });
        const weak = calculateVendorRisk({
            vendorCriticality: 'HIGH',
            authoritativeInherent: 70,
            questionScores: [{ score: 2, maxScore: 10, weight: 1 }],
        });
        expect(strong.residualRisk).toBeLessThanOrEqual(weak.residualRisk);
        expect(strong.controlEffectiveness).toBeGreaterThan(weak.controlEffectiveness);
    });
});

describe('engagement residual adapter', () => {
    it('blocks residual without confirmed inherent or assessed controls', () => {
        expect(engagementResidualReadiness({ confirmedTier: null, controlRatings: [] }).ready).toBe(false);
        expect(engagementResidualReadiness({
            confirmedTier: 'CRITICAL',
            controlRatings: [{ rating: 'NOT_ASSESSED' }],
        }).ready).toBe(false);
        expect(engagementResidualReadiness({
            confirmedTier: 'CRITICAL',
            controlRatings: [{ rating: 'NOT_APPLICABLE' }],
        }).blockers.join(' ')).toMatch(/rationale|applicable/i);
    });

    it('does not treat unknown as effective and uses confirmed tier not questionnaire math', () => {
        const azure = calculateEngagementResidual({
            confirmedTier: 'CRITICAL',
            controlRatings: [{ rating: 'PARTIALLY_EFFECTIVE', controlKey: 'Access Review', controlTitle: 'Access Review' }],
            openFindings: [{ severity: 'HIGH', title: 'Azure Hosting — Privileged access review not demonstrated' }],
            reviewedCompensatingCount: 1,
        });
        const services = calculateEngagementResidual({
            confirmedTier: 'MEDIUM',
            controlRatings: [{ rating: 'EFFECTIVE', controlKey: 'Access Review', controlTitle: 'Access Review' }],
            openFindings: [],
            reviewedCompensatingCount: 0,
        });
        expect(azure.residualRisk).toBeGreaterThan(services.residualRisk);
        expect(azure.riskBand).not.toBe(services.riskBand);
        expect(azure.explanation).toMatch(/Confirmed inherent CRITICAL/);
        expect(azure.explanation).not.toMatch(/100 - /);
        expect(azure.factors.some((row) => row.code === 'confirmed_inherent_tier')).toBe(true);
    });
});
