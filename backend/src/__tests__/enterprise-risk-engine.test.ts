import {
    appetiteStatus,
    calculateEnterpriseRisk,
    kriStatus,
    neutralizeSpreadsheetCell,
    nextPublicId,
    ratingFromScore,
    resolveAppetite,
} from '../services/enterpriseRiskEngine';
import { presentHistoryEntry, scoreChangeSummary } from '../services/enterpriseRiskHistory';

describe('enterprise risk engine', () => {
    it('scores a 5x5 matrix deterministically', () => {
        const first = calculateEnterpriseRisk({ likelihood: 5, impact: 5, reason: 'Initial' });
        const second = calculateEnterpriseRisk({ likelihood: 5, impact: 5, reason: 'Initial' });
        expect(first.inherentScore).toBe(25);
        expect(first.inherentRating).toBe('CRITICAL');
        expect(first.residualScore).toBe(25);
        expect(first.methodologyVersion).toBe(second.methodologyVersion);
        expect(first.explanation).toBe(second.explanation);
    });

    it('reduces residual impact from effective controls only', () => {
        const scored = calculateEnterpriseRisk({
            likelihood: 4,
            impact: 5,
            controlEffectiveness: ['EFFECTIVE', 'EFFECTIVE', 'NOT_TESTED'],
        });
        expect(scored.controlReduction).toBe(2);
        expect(scored.residualImpact).toBe(3);
        expect(scored.residualScore).toBe(12);
        expect(scored.explanation).toContain('Evidence files were not used as effectiveness');
    });

    it('does not treat evidence or acceptance as scoring inputs', () => {
        const scored = calculateEnterpriseRisk({ likelihood: 3, impact: 3 });
        expect(scored.explanation).toContain('Acceptance and treatment plans do not change this score');
        expect(ratingFromScore(6)).toBe('LOW');
        expect(ratingFromScore(12)).toBe('MEDIUM');
        expect(ratingFromScore(13)).toBe('HIGH');
    });

    it('uses highest impact dimension unless overridden', () => {
        const scored = calculateEnterpriseRisk({
            likelihood: 2,
            impact: 1,
            dimensions: [{ rating: 2 }, { rating: 5 }],
        });
        expect(scored.impact).toBe(5);
        expect(scored.inherentScore).toBe(10);
    });

    it('classifies appetite without inventing configuration', () => {
        expect(appetiteStatus('HIGH')).toBe('NOT_CONFIGURED');
        expect(appetiteStatus('MEDIUM', 'HIGH')).toBe('WITHIN_APPETITE');
        expect(appetiteStatus('HIGH', 'HIGH')).toBe('NEAR_TOLERANCE');
        expect(appetiteStatus('CRITICAL', 'HIGH')).toBe('OUTSIDE_APPETITE');
        expect(resolveAppetite('HIGH', [
            { scope: 'ORGANIZATION', maxResidualRating: 'MEDIUM' },
            { scope: 'CATEGORY', maxResidualRating: 'HIGH' },
        ])).toBe('NEAR_TOLERANCE');
    });

    it('evaluates KRI thresholds from configured direction', () => {
        expect(kriStatus({ value: null, warningThreshold: 5, criticalThreshold: 10, direction: 'HIGHER_IS_WORSE' })).toBe('NOT_MEASURED');
        expect(kriStatus({ value: 4, warningThreshold: 5, criticalThreshold: 10, direction: 'HIGHER_IS_WORSE' })).toBe('WITHIN');
        expect(kriStatus({ value: 5, warningThreshold: 5, criticalThreshold: 10, direction: 'HIGHER_IS_WORSE' })).toBe('WARNING');
        expect(kriStatus({ value: 12, warningThreshold: 5, criticalThreshold: 10, direction: 'HIGHER_IS_WORSE' })).toBe('CRITICAL');
        expect(kriStatus({ value: 2, warningThreshold: 5, criticalThreshold: 3, direction: 'LOWER_IS_WORSE' })).toBe('CRITICAL');
    });

    it('keeps history summaries short and preserves calculation detail', () => {
        expect(scoreChangeSummary({
            fromRating: 'HIGH',
            toRating: 'CRITICAL',
            fromScore: 16,
            toScore: 25,
            fromLikelihood: 4,
            toLikelihood: 5,
        })).toBe('Residual risk changed High → Critical');
        const presented = presentHistoryEntry({
            eventType: 'Risk reassessed',
            summary: 'Inherent 25 (CRITICAL) from likelihood 5 × impact 5. Methodology supreme-erm-1.0.0.',
            createdAt: new Date().toISOString(),
            payload: { explanation: 'Full calculation', fromRating: 'HIGH', toRating: 'CRITICAL' },
        });
        expect(presented.title).toBe('Risk reassessed');
        expect(presented.change).toContain('High → Critical');
        expect(presented.detail).toBe('Full calculation');
        expect(presented.change && presented.change.length < 80).toBe(true);
    });

    it('neutralizes spreadsheet formula injection and formats public IDs', () => {
        expect(neutralizeSpreadsheetCell('=CMD()')).toBe("'=CMD()");
        expect(neutralizeSpreadsheetCell('+1+1')).toBe("'+1+1");
        expect(nextPublicId('RISK', 124)).toBe('RISK-00124');
    });
});
