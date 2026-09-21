import { EngagementStatus } from '@prisma/client';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { isAutomatedReviewSignalIssue, isNegativeAnswer, isSpecialistJudgedCandidate, reviewSignalRule } from '../tprm/reviewSignals';

describe('#12 Wave 4 closure helpers', () => {
    it('does not treat a negative answer as a finding', () => {
        expect(isNegativeAnswer('No')).toBe(true);
        expect(reviewSignalRule({ answer: 'No' })).toBe('required_control_no');
        expect(isAutomatedReviewSignalIssue({}, 'required_control_no')).toBe(true);
        expect(isSpecialistJudgedCandidate({ specialistJudged: true }, 'required_control_no')).toBe(true);
        expect(isSpecialistJudgedCandidate({}, 'required_control_no')).toBe(false);
    });

    it('keeps one primary next action from the authoritative lifecycle', () => {
        expect(engagementPrimaryAction(EngagementStatus.VENDOR_SUBMITTED).label).toBe('Complete Specialist Review');
        expect(engagementPrimaryAction(EngagementStatus.SPECIALIST_REVIEW, { outstandingReviewDomains: ['Privacy'] }).label).toMatch(/Privacy/);
        expect(engagementPrimaryAction(EngagementStatus.FINDING_REVIEW, { openCandidateCount: 2 }).label).toBe('Review Finding Candidates');
        expect(engagementPrimaryAction(EngagementStatus.FINDING_REVIEW, { openCandidateCount: 0, controlAssessed: false }).label).toBe('Assess Control Effectiveness');
        expect(engagementPrimaryAction(EngagementStatus.RESIDUAL_READY).label).toMatch(/residual-risk assessment/);
        expect(engagementPrimaryAction(EngagementStatus.RESIDUAL_READY, { residualConfirmed: true }).label).toBe('Review risk treatment');
        expect(engagementPrimaryAction(EngagementStatus.GATE_BLOCKED).label).toBe('Resolve blockers');
        expect(engagementPrimaryAction(EngagementStatus.GATE_APPROVED).label).toBe('Activate Engagement');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE).label).toBe('Configure monitoring profile');
    });
});
