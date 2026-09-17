import { approvalStatusCopy } from '../approvalCopy';
import { dominantNextAction } from '../customerStages';
import { humanizeLabel } from '../../utils/humanizeLabel';

describe('customer-safe approval copy', () => {
    it('shows waiting copy to the preparer and ready copy to an approver', () => {
        expect(approvalStatusCopy({
            readyForIndependentApproval: true,
            approvalPreparedBy: 'user-a',
            actorId: 'user-a',
            waitingFor: 'Jordan Approver',
        })).toEqual({
            status: 'Waiting for approval',
            waitingDetail: 'Waiting for Jordan Approver',
            isPreparer: true,
        });
        expect(approvalStatusCopy({
            readyForIndependentApproval: true,
            approvalPreparedBy: 'user-a',
            actorId: 'user-b',
            preparedByName: 'Ava Preparer',
        }).status).toBe('Ready for independent approval');
    });

    it('does not expose raw enums on customer surfaces', () => {
        expect(humanizeLabel('READY_FOR_INDEPENDENT_APPROVAL')).toBe('Ready for independent approval');
        expect(humanizeLabel('WAITING_FOR_APPROVAL')).toBe('Waiting for approval');
        expect(humanizeLabel('APPROVE_WITH_CONDITIONS')).toBe('Approve with Conditions');
        expect(dominantNextAction({
            stageKey: 'APPROVAL',
            actorId: 'user-a',
            lifecycle: { readyForIndependentApproval: true, approvalPreparedBy: 'user-a', waitingFor: 'an authorized approver' },
        }).label).toBe('Waiting for approval');
    });
});
