import {
    estimatedMinutesOf,
    pickCanonicalTemplate,
    presentQuestionnaireTemplate,
    templateCategory,
    templateScopeKey,
    templateSourceLabel,
} from '../services/questionnairePresentation';

describe('questionnaire presentation and uniqueness helpers', () => {
    it('scopes platform templates separately from tenant templates', () => {
        expect(templateScopeKey(null)).toBe('platform');
        expect(templateScopeKey(undefined)).toBe('platform');
        expect(templateScopeKey('org-1')).toBe('org-1');
    });

    it('labels Supreme and cloned templates differently', () => {
        expect(templateSourceLabel('SUPREME')).toBe('Supreme template');
        expect(templateSourceLabel('CLONED', 'org-1')).toBe('Organization template');
        expect(templateSourceLabel('CUSTOM', 'org-1')).toBe('Custom template');
    });

    it('keeps the oldest row as the canonical duplicate', () => {
        const older = { id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') };
        const newer = { id: 'b', createdAt: new Date('2026-06-01T00:00:00Z') };
        const picked = pickCanonicalTemplate([newer, older]);
        expect(picked.canonical.id).toBe('a');
        expect(picked.duplicates.map((row) => row.id)).toEqual(['b']);
    });

    it('presents catalog metadata without inventing certification', () => {
        const presented = presentQuestionnaireTemplate({
            id: 't1',
            name: 'CMMC Readiness Assessment',
            framework: 'CMMC 2.0 aligned',
            version: '1.0.0',
            organizationId: null,
            source: 'SUPREME',
            sections: [
                { title: 'Readiness', questions: [{ evidenceRequired: true }, { evidenceRequired: false }] },
            ],
        }, { purpose: 'Readiness discussion. Not a CMMC certification.' });
        expect(presented.category).toBe('Framework-aligned');
        expect(presented.questionCount).toBe(2);
        expect(presented.domainCount).toBe(1);
        expect(presented.estimatedMinutes).toBe(estimatedMinutesOf(2));
        expect(presented.evidenceRequired).toBe(true);
        expect(presented.sourceLabel).toBe('Supreme template');
        expect(templateCategory('ISO 27001-Aligned Security Assessment', 'ISO')).toBe('Framework-aligned');
    });
});
