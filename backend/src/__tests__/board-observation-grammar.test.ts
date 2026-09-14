import { openFindingsObservation, overdueRemediationObservation, residualRiskObservation } from '../reports/portfolioData';

describe('board observation grammar', () => {
    it('uses singular verbs for one vendor and one remediation item', () => {
        expect(residualRiskObservation(1)).toBe('1 vendor currently sits in high or critical residual risk.');
        expect(overdueRemediationObservation(1)).toBe('1 remediation item is past the target date.');
        expect(openFindingsObservation(1)).toBe('1 critical or high finding remains open.');
    });

    it('uses plural verbs for multiple items', () => {
        expect(residualRiskObservation(2)).toBe('2 vendors currently sit in high or critical residual risk.');
        expect(overdueRemediationObservation(3)).toBe('3 remediation items are past the target date.');
    });
});
