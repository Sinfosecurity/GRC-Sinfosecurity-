import { customerStage, customerStageIndex, dominantNextAction, version3OperatingSteps, workspaceSection } from '../customerStages';

describe('five-stage customer mapping', () => {
    it('maps governed states without creating a second lifecycle', () => {
        expect(customerStage('INTAKE')).toBe('Assess');
        expect(customerStage('TIER_REVIEW')).toBe('Assess');
        expect(customerStage('READY_TO_SEND')).toBe('Assess');
        expect(customerStage('AWAITING_VENDOR')).toBe('Vendor Review');
        expect(customerStage('SUBMITTED')).toBe('Review & Decide');
        expect(customerStage('ACTIVE')).toBe('Monitor');
        expect(customerStageIndex('INTAKE')).toBe(1);
        expect(workspaceSection('INTAKE')).toBe('assessment');
        expect(workspaceSection('ACTIVE')).toBe('overview');
    });

    it('names one next human action', () => {
        expect(dominantNextAction({ stageKey: 'TIER_REVIEW', tierReview: { recommendedTier: 'High' } }).label).toMatch(/Confirm recommended tier/);
        expect(dominantNextAction({ stageKey: 'SUBMITTED', review: { potentialFindings: 4 } }).label).toBe('Review 4 material issues');
        expect(dominantNextAction({
            stageKey: 'APPROVAL',
            lifecycle: { readyForIndependentApproval: true },
        }).label).toBe('Ready for independent approval');
        expect(dominantNextAction({
            stageKey: 'UNDER_REVIEW',
            review: {
                items: [
                    { assessmentName: 'Privileged Access', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f1' },
                    { assessmentName: 'Privileged Access', reason: 'The recorded answer does not satisfy the requirement.', findingId: 'f2' },
                    { assessmentName: 'Privacy', reason: 'Not answered — complete or request clarification.' },
                ],
            },
        }).label).toBe('Review 1 material issue');
        expect(dominantNextAction({
            stageKey: 'OFFBOARDING',
            review: { potentialFindings: 18 },
        }).label).toBe('This vendor is already onboarded');
        expect(dominantNextAction({
            stageKey: 'INTAKE',
            ira: { required: true, sent: false, submitted: false },
        }).label).toBe('Send assessment');
        expect(dominantNextAction({
            stageKey: 'INTAKE',
            ira: { required: true, sent: true, submitted: false },
        }).label).toBe('Waiting on requester');
        expect(dominantNextAction({ stageKey: 'READY_TO_SEND' }).label).toBe('Send questionnaire');
        expect(dominantNextAction({ stageKey: 'TIER_REVIEW', tierReview: {} }).label).toBe('Not yet rated');
    });

    it('treats READY_TO_SEND as questionnaire ready, not vendor review', () => {
        const steps = version3OperatingSteps({ stageKey: 'READY_TO_SEND', ira: { required: true, sent: true, submitted: true } });
        expect(steps.find((row) => row.key === 'QUESTIONNAIRE_READY')?.state).toBe('current');
        expect(steps.find((row) => row.key === 'QUESTIONNAIRE_SENT')?.state).toBe('upcoming');
        expect(customerStage('READY_TO_SEND')).not.toBe('Vendor Review');
        expect(customerStage('AWAITING_VENDOR')).toBe('Vendor Review');
    });
});
