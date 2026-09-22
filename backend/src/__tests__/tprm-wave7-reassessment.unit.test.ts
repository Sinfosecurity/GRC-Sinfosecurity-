import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { EngagementStatus } from '@prisma/client';

describe('#12 Wave 7 next action', () => {
    it('prefers an open reassessment over monitoring setup', () => {
        const open = engagementPrimaryAction(EngagementStatus.ACTIVE, { openReassessment: true, reassessmentRecommended: true });
        expect(open.label).toBe('Continue reassessment');
        const recommended = engagementPrimaryAction(EngagementStatus.ACTIVE, { reassessmentRecommended: true });
        expect(recommended.label).toBe('Start reassessment');
    });

    it('starts offboarding only after authorized termination, not from an open reassessment', () => {
        const blocked = engagementPrimaryAction(EngagementStatus.ACTIVE, { terminationRecommended: true, openReassessment: true });
        expect(blocked.label).toBe('Continue reassessment');
        const start = engagementPrimaryAction(EngagementStatus.ACTIVE, { terminationRecommended: true });
        expect(start.label).toBe('Start offboarding');
        const review = engagementPrimaryAction(EngagementStatus.OFFBOARDING, { offboardingGateReady: true });
        expect(review.label).toBe('Review closure');
        const closed = engagementPrimaryAction(EngagementStatus.OFFBOARDED, {});
        expect(closed.label).toBe('Engagement offboarded — history is inspectable');
    });
});
