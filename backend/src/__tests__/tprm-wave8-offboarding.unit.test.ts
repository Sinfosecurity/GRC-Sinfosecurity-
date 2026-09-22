import { EngagementOffboardingStatus, OffboardingAudience, OffboardingExceptionStatus, OffboardingObligationCategory, OffboardingObligationStatus } from '@prisma/client';
import { evaluateGate } from '../services/engagementOffboardingService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { EngagementStatus } from '@prisma/client';

describe('#12 Wave 8 offboarding gate', () => {
    it('names exact mandatory blockers and does not treat an exception as completion', () => {
        const gate = evaluateGate({
            openReassessment: true,
            obligations: [
                {
                    id: 'del',
                    applicable: true,
                    mandatory: true,
                    status: OffboardingObligationStatus.PENDING,
                    title: 'Data deletion confirmation',
                    audience: OffboardingAudience.VENDOR,
                    category: OffboardingObligationCategory.DATA_DELETION,
                },
                {
                    id: 'access',
                    applicable: true,
                    mandatory: true,
                    status: OffboardingObligationStatus.PENDING,
                    title: 'Access revocation',
                    audience: OffboardingAudience.INTERNAL,
                    category: OffboardingObligationCategory.ACCESS_REVOCATION,
                },
            ],
            exceptions: [{ status: OffboardingExceptionStatus.APPROVED, obligationId: 'other' }],
        });
        expect(gate.ready).toBe(false);
        expect(gate.status).toBe(EngagementOffboardingStatus.BLOCKED);
        expect(gate.blockers).toEqual(expect.arrayContaining([
            'Cannot complete offboarding while an open reassessment has no disposition.',
            'Cannot close Engagement because data deletion confirmation is still outstanding.',
            'Access revocation is not verified.',
        ]));
    });

    it('is ready only when mandatory work is complete or excepted for that obligation', () => {
        const gate = evaluateGate({
            obligations: [
                {
                    id: 'del',
                    applicable: true,
                    mandatory: true,
                    status: OffboardingObligationStatus.PENDING,
                    title: 'Data deletion confirmation',
                    audience: OffboardingAudience.VENDOR,
                    category: OffboardingObligationCategory.DATA_DELETION,
                    vendorConfirmation: 'Vendor attested deletion.',
                },
            ],
            exceptions: [{ status: OffboardingExceptionStatus.APPROVED, obligationId: 'del' }],
        });
        expect(gate.ready).toBe(true);
        expect(gate.status).toBe(EngagementOffboardingStatus.READY_FOR_CLOSURE);
    });
});

describe('#12 Wave 8 next action', () => {
    it('uses one primary action through offboarding', () => {
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE, { terminationRecommended: true }).label).toBe('Start offboarding');
        expect(engagementPrimaryAction(EngagementStatus.OFFBOARDING, {}).label).toBe('Complete obligations');
        expect(engagementPrimaryAction(EngagementStatus.OFFBOARDING, { vendorOffboardingPending: true }).label).toBe('Await vendor response');
        expect(engagementPrimaryAction(EngagementStatus.OFFBOARDING, { offboardingBlocked: true }).label).toBe('Resolve blocker');
        expect(engagementPrimaryAction(EngagementStatus.OFFBOARDING, { offboardingGateReady: true }).label).toBe('Review closure');
        expect(engagementPrimaryAction(EngagementStatus.OFFBOARDED, {}).label).toBe('Engagement offboarded — history is inspectable');
    });
});
