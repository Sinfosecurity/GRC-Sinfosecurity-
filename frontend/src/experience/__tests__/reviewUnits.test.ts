import { classifyReviewItem, groupReviewItems, reviewPrimaryAction } from '../reviewUnits';

const items = [
    { assessmentName: 'Privileged Access', question: 'MFA required?', response: 'No', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f1', reviewState: 'DRAFT' },
    { assessmentName: 'Privileged Access', question: 'Admin logging?', response: 'No', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f2', reviewState: 'DRAFT' },
    { assessmentName: 'Privileged Access', question: 'Break-glass?', response: 'Partial', reason: 'The recorded answer is partial and needs review.', findingId: 'f3', reviewState: 'DRAFT' },
    { assessmentName: 'Privacy', question: 'DPA?', response: 'Not answered', reason: 'Not answered — complete or request clarification.' },
    { assessmentName: 'Baseline', question: 'Policy?', response: 'Yes', reason: 'Required evidence is missing or not ready.', findingId: 'f4', reviewState: 'DRAFT' },
];

describe('exception-driven review grouping', () => {
    it('classifies evidence, material findings, and clarifications without dropping rows', () => {
        expect(classifyReviewItem(items[0])).toBe('material');
        expect(classifyReviewItem(items[3])).toBe('clarification');
        expect(classifyReviewItem(items[4])).toBe('evidence');
        const bundle = groupReviewItems(items, { satisfactory: 14, questionsAnswered: 36, potentialFindings: 4, needClarification: 1 });
        expect(bundle.material.reduce((sum, row) => sum + row.related, 0) + bundle.clarifications.reduce((sum, row) => sum + row.related, 0) + bundle.evidence.reduce((sum, row) => sum + row.related, 0)).toBe(5);
        expect(bundle.material[0].related).toBe(2);
        expect(bundle.material[0].title).toMatch(/requirement not met/);
        expect(bundle.clarifications).toHaveLength(1);
        expect(bundle.evidence).toHaveLength(1);
        expect(bundle.satisfactory).toBe(14);
        expect(reviewPrimaryAction(bundle).label).toBe('Review 2 material issues');
    });

    it('interprets decision readiness from existing lifecycle facts', () => {
        const empty = groupReviewItems([], {});
        expect(reviewPrimaryAction(empty, 'APPROVAL').label).toBe('Make approval decision');
        expect(reviewPrimaryAction(empty, 'RISK_ACCEPTANCE').label).toBe('Record risk decision');
        expect(reviewPrimaryAction(empty, 'REMEDIATION').label).toBe('Validate remediation');
    });
});
