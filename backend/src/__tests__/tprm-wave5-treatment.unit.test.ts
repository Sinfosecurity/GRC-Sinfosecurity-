import { EngagementAcceptanceStatus, EngagementApprovalStatus, EngagementContractRequirementStatus, EngagementResidualStatus, EngagementTreatmentStatus, EngagementTreatmentType } from '@prisma/client';
import { computeGateBlockers } from '../services/engagementTreatmentService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { EngagementStatus } from '@prisma/client';
import { hasPermission, PERMISSIONS } from '../security/rbac';

describe('#12 Wave 5 treatment helpers', () => {
    it('lists exact gate blockers and does not treat pending as approved', () => {
        const blockers = computeGateBlockers({
            engagementId: 'e1',
            residual: { status: EngagementResidualStatus.CONFIRMED, residualBand: 'MEDIUM' },
            treatment: {
                type: EngagementTreatmentType.ACCEPT,
                status: EngagementTreatmentStatus.PENDING_APPROVAL,
                mitigationAction: null,
                mitigationCompletionCondition: null,
                conditions: null,
                transferMechanism: null,
            },
            acceptance: { status: EngagementAcceptanceStatus.PENDING },
            approvals: [{ status: EngagementApprovalStatus.PENDING, type: 'RISK_ACCEPTANCE' as any }],
            requirements: [{
                id: 'req1',
                requirement: 'breach notification',
                mandatory: true,
                status: EngagementContractRequirementStatus.OPEN,
            }],
            exceptions: [],
            openHighFindings: 1,
        });
        expect(blockers.map((row) => row.label)).toEqual(expect.arrayContaining([
            'Risk acceptance awaiting approval',
            'Required approval is still pending',
            'Mandatory breach notification requirement not recorded',
        ]));
        expect(blockers.every((row) => row.href.includes('/decisions'))).toBe(true);
    });

    it('keeps one primary next action through Wave 5', () => {
        expect(engagementPrimaryAction(EngagementStatus.TREATMENT_REVIEW).label).toBe('Review risk treatment');
        expect(engagementPrimaryAction(EngagementStatus.ACCEPTANCE_PENDING).label).toBe('Await decision');
        expect(engagementPrimaryAction(EngagementStatus.CONTRACT_REVIEW, { mandatoryOpen: true }).label).toBe('Complete requirements');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE).label).toBe('Configure monitoring profile');
        expect(engagementPrimaryAction(EngagementStatus.ACTIVE, { highPrioritySignals: 1 }).label).toBe('Review high-priority monitoring signal');
    });

    it('uses capability-based activation authority without invented job titles', () => {
        expect(hasPermission('ASSESSOR', PERMISSIONS['engagement.activate'])).toBe(false);
        expect(hasPermission('BUSINESS_OWNER', PERMISSIONS['engagement.activate'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['engagement.activate'])).toBe(false);
        expect(hasPermission('RISK_MANAGER', PERMISSIONS['engagement.activate'])).toBe(true);
        expect(hasPermission('ASSESSOR', PERMISSIONS['risk.accept'])).toBe(false);
        expect(hasPermission('APPROVER', PERMISSIONS['risk.accept'])).toBe(true);
    });
});
