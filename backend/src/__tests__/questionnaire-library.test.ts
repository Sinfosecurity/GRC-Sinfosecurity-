import { SUPREME_LIBRARY } from '../services/questionnaireLibrary';

describe('Supreme assessment library', () => {
    it('contains the required private-beta templates without claiming certification', () => {
        expect(SUPREME_LIBRARY).toHaveLength(15);
        const names = SUPREME_LIBRARY.map((item) => item.name);
        expect(names).toEqual(expect.arrayContaining([
            'Inherent Risk Questionnaire',
            'Information Security Assessment',
            'Privacy & Data Protection Assessment',
            'NIST CSF-Aligned Cybersecurity Assessment',
            'SOC 2 Evidence / Assurance Review',
        ]));
        expect(SUPREME_LIBRARY.some((item) => /official NIST product|SOC 2 examination|ISO certification/i.test(item.purpose))).toBe(true);
        const questionCount = SUPREME_LIBRARY.reduce((sum, item) => sum + item.sections.reduce((inner, section) => inner + section.questions.length, 0), 0);
        expect(questionCount).toBeGreaterThan(80);
        expect(SUPREME_LIBRARY.some((item) => item.sections.some((section) => section.questions.some((question) => question.conditionalOnKey)))).toBe(true);
        expect(SUPREME_LIBRARY.some((item) => item.sections.some((section) => section.questions.some((question) => question.evidenceRequired)))).toBe(true);
    });
});
