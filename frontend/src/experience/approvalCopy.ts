export function approvalStatusCopy(input: {
    readyForIndependentApproval?: boolean;
    waitingForApproval?: boolean;
    approvalDecision?: string | null;
    approvalPreparedBy?: string | null;
    actorId?: string | null;
    waitingFor?: string | null;
    preparedByName?: string | null;
}): { status: string; waitingDetail: string | null; isPreparer: boolean } {
    const isPreparer = Boolean(input.actorId && input.approvalPreparedBy && input.actorId === input.approvalPreparedBy);
    if (input.approvalDecision) {
        const decision = String(input.approvalDecision).toUpperCase();
        if (decision === 'APPROVE' || decision === 'APPROVED') return { status: 'Approved', waitingDetail: null, isPreparer };
        if (decision === 'APPROVE_WITH_CONDITIONS') return { status: 'Approved with conditions', waitingDetail: null, isPreparer };
        if (decision === 'REJECT' || decision === 'REJECTED') return { status: 'Rejected', waitingDetail: null, isPreparer };
        if (decision === 'CHANGES_REQUESTED') return { status: 'Changes requested', waitingDetail: null, isPreparer };
    }
    if (input.readyForIndependentApproval || input.waitingForApproval) {
        if (isPreparer) {
            return {
                status: 'Waiting for approval',
                waitingDetail: input.waitingFor ? `Waiting for ${input.waitingFor}` : 'Waiting for an authorized approver',
                isPreparer,
            };
        }
        return {
            status: 'Ready for independent approval',
            waitingDetail: input.preparedByName ? `Prepared by ${input.preparedByName}` : 'Supreme prepared this record.',
            isPreparer,
        };
    }
    return { status: 'Draft', waitingDetail: null, isPreparer };
}
