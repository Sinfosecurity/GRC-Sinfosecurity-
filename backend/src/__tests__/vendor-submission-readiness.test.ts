import { submissionChecklist } from '../services/vendorDueDiligenceService';

describe('vendor submission readiness', () => {
    it('blocks required evidence and allows optional evidence', () => {
        const checklist = submissionChecklist([
            { key: 'q1', required: true, evidenceRequired: false, evidenceOptional: true, response: 'Yes', visible: true, hasEvidence: false, evidenceStatus: null },
            { key: 'q2', required: true, evidenceRequired: true, evidenceOptional: false, response: 'Yes', visible: true, hasEvidence: false, evidenceStatus: null },
            { key: 'q3', required: true, evidenceRequired: false, evidenceOptional: false, response: '', visible: true, hasEvidence: false, evidenceStatus: null },
        ]);
        expect(checklist.unanswered).toEqual(['q3']);
        expect(checklist.evidence).toEqual(['q2']);
        expect(checklist.optionalEvidence).toEqual(['q1']);
        expect(checklist.complete).toBe(false);
        expect(checklist.evidenceRequiredCount).toBe(1);
    });

    it('is complete when required questions are answered and required evidence is usable', () => {
        const checklist = submissionChecklist([
            { key: 'q1', required: true, evidenceRequired: false, evidenceOptional: true, response: 'Yes', visible: true, hasEvidence: false, evidenceStatus: null },
            { key: 'q2', required: true, evidenceRequired: true, evidenceOptional: false, response: 'Yes', visible: true, hasEvidence: true, evidenceStatus: 'Clean' },
        ]);
        expect(checklist.complete).toBe(true);
        expect(checklist.optionalEvidence).toEqual(['q1']);
    });
});
