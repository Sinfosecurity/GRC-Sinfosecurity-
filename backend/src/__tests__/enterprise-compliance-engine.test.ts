import { buildReadiness, containsForbiddenClaim, evidenceCoverageLabel, neutralizeSpreadsheetCell } from '../services/enterpriseComplianceEngine';

describe('supreme compliance readiness math', () => {
    it('excludes not applicable from the denominator and does not treat empty applicability as zero or one hundred', () => {
        const empty = buildReadiness({
            totalRequirements: 8,
            applicable: 0,
            notApplicable: 2,
            notDetermined: 6,
            underReview: 0,
            mappedApplicable: 0,
            implementedMapped: 0,
            implementedControls: 0,
            testedImplemented: 0,
            evidenceMapped: 0,
        });
        expect(empty.calculable).toBe(false);
        expect(empty.metrics.requirementCoverage.percent).toBeNull();
        expect(empty.emptyReason).toMatch(/not determined/i);

        const ready = buildReadiness({
            totalRequirements: 8,
            applicable: 5,
            notApplicable: 3,
            notDetermined: 0,
            underReview: 0,
            mappedApplicable: 4,
            implementedMapped: 2,
            implementedControls: 4,
            testedImplemented: 1,
            evidenceMapped: 3,
        });
        expect(ready.metrics.requirementCoverage.percent).toBe(80);
        expect(ready.metrics.requirementCoverage.denominator).toBe(5);
        expect(ready.metrics.testingCoverage.percent).toBe(25);
        expect(ready.honesty).toMatch(/not certification/);
        expect(ready.honesty).not.toMatch(/you are .* compliant/i);
    });

    it('labels evidence truthfully and neutralizes spreadsheet formulas', () => {
        expect(evidenceCoverageLabel({ scanStatus: 'INFECTED' })).toBe('Evidence not usable');
        expect(evidenceCoverageLabel({ scanStatus: 'CLEAN', freshness: 'EXPIRED' })).toBe('Evidence expired');
        expect(evidenceCoverageLabel({ scanStatus: 'CLEAN', freshness: 'CURRENT' })).toBe('Evidence available');
        expect(neutralizeSpreadsheetCell('=1+1')).toBe("'=1+1");
        expect(containsForbiddenClaim('You are ISO 27001 certified')).toBe(true);
    });
});
