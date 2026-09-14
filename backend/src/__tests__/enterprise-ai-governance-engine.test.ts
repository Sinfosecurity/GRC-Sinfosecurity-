import {
    calculateAiScore,
    containsForbiddenAiClaim,
    honestyCopy,
    neutralizeSpreadsheetCell,
    nextAiId,
    screeningRecommendation,
} from '../services/enterpriseAiGovernanceEngine';

describe('supreme AI governance honesty', () => {
    it('uses customer IDs and refuses forbidden claims', () => {
        expect(nextAiId('AI', 1)).toBe('AI-00001');
        expect(nextAiId('USE', 12)).toBe('USE-00012');
        expect(honestyCopy()).toMatch(/not an approval/i);
        expect(honestyCopy()).toMatch(/not a legal applicability finding/i);
        expect(containsForbiddenAiClaim('This system is EU AI Act High-Risk')).toBe(true);
        expect(containsForbiddenAiClaim('ISO 42001 certified')).toBe(true);
        expect(containsForbiddenAiClaim('Enhanced review may be required')).toBe(false);
        expect(neutralizeSpreadsheetCell('=CMD()')).toBe("'=CMD()");
        expect(neutralizeSpreadsheetCell('+1+1')).toBe("'+1+1");
    });

    it('scores deterministically and keeps the calculation visible', () => {
        const first = calculateAiScore({
            impact: 4,
            likelihood: 3,
            autonomy: 3,
            decisionCriticality: 4,
            dataSensitivity: 5,
            affectedPopulation: 3,
            oversightStrength: 2,
            externalExposure: 3,
            vendorDependency: 2,
            testingStatus: 1,
            controlEffectiveness: 1,
        });
        const second = calculateAiScore({
            impact: 4,
            likelihood: 3,
            autonomy: 3,
            decisionCriticality: 4,
            dataSensitivity: 5,
            affectedPopulation: 3,
            oversightStrength: 2,
            externalExposure: 3,
            vendorDependency: 2,
            testingStatus: 1,
            controlEffectiveness: 1,
        });
        expect(first.methodologyVersion).toBe('supreme-ai-1.0.0');
        expect(first.score).toBe(second.score);
        expect(first.calculation).toContain('=');
        expect(first.inputs.impact).toBe(4);
        expect(first.rationale).toMatch(/not a legal or model-performance conclusion/i);
    });

    it('recommends enhanced review without a legal prohibition', () => {
        const none = screeningRecommendation([]);
        expect(none.enhancedReview).toBe(false);
        expect(none.recommendation).toMatch(/not a clearance/i);
        const hits = screeningRecommendation([{ key: 'employment', answer: true }, { key: 'sensitive', answer: true }]);
        expect(hits.enhancedReview).toBe(true);
        expect(hits.recommendation).toMatch(/enhanced review may be required/i);
        expect(hits.recommendation).toMatch(/not a legal prohibition/i);
        expect(hits.recommendation).not.toMatch(/this system is legally prohibited/i);
    });
});
