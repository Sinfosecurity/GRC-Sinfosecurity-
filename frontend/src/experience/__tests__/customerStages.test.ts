import { customerStage, customerStageIndex, dominantNextAction, workspaceSection } from '../customerStages';

describe('five-stage customer mapping', () => {
    it('maps governed states without creating a second lifecycle', () => {
        expect(customerStage('INTAKE')).toBe('Assess');
        expect(customerStage('TIER_REVIEW')).toBe('Assess');
        expect(customerStage('READY_TO_SEND')).toBe('Vendor Review');
        expect(customerStage('SUBMITTED')).toBe('Review & Decide');
        expect(customerStage('ACTIVE')).toBe('Monitor');
        expect(customerStageIndex('INTAKE')).toBe(1);
        expect(workspaceSection('INTAKE')).toBe('assessment');
        expect(workspaceSection('ACTIVE')).toBe('overview');
    });

    it('names one next human action', () => {
        expect(dominantNextAction({ stageKey: 'TIER_REVIEW' }).label).toMatch(/Confirm recommended tier/);
        expect(dominantNextAction({ stageKey: 'SUBMITTED', review: { potentialFindings: 4 } }).label).toBe('Review 4 items');
    });
});
