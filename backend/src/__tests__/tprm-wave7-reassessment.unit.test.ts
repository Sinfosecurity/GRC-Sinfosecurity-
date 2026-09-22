import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { EngagementStatus } from '@prisma/client';

describe('#12 Wave 7 next action', () => {
    it('prefers an open reassessment over monitoring setup', () => {
        const open = engagementPrimaryAction(EngagementStatus.ACTIVE, { openReassessment: true, reassessmentRecommended: true });
        expect(open.label).toBe('Continue reassessment');
        const recommended = engagementPrimaryAction(EngagementStatus.ACTIVE, { reassessmentRecommended: true });
        expect(recommended.label).toBe('Start reassessment');
    });
});
