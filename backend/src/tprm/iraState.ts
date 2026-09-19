export type AuthoritativeIraStatus =
    | 'NOT_SENT'
    | 'WAITING_ON_REQUESTER'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'NEEDS_CLARIFICATION'
    | 'TIER_REVIEW'
    | 'CONFIRMED';

export type AuthoritativeIraState = {
    source: 'ENGAGEMENT_IRA' | 'LEGACY_TASK_LINK';
    status: AuthoritativeIraStatus;
    statusLabel: string;
    sent: boolean;
    submitted: boolean;
    sentAt: Date | string | null;
    submittedAt: Date | string | null;
    owner: string;
    next: string;
    primaryAction: string;
    secondaryAction: string | null;
};

const ENGAGEMENT_STATUS: Record<string, AuthoritativeIraStatus> = {
    REQUIRED: 'NOT_SENT',
    IN_PROGRESS: 'IN_PROGRESS',
    SUBMITTED: 'SUBMITTED',
    NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
    TIER_REVIEW: 'TIER_REVIEW',
    CONFIRMED: 'CONFIRMED',
};

export function labelIraStatus(status: AuthoritativeIraStatus) {
    switch (status) {
        case 'NOT_SENT': return 'Waiting to be completed';
        case 'WAITING_ON_REQUESTER': return 'Waiting on requester';
        case 'IN_PROGRESS': return 'In progress';
        case 'SUBMITTED': return 'Submitted';
        case 'NEEDS_CLARIFICATION': return 'Needs requester clarification';
        case 'TIER_REVIEW': return 'Ready for tier review';
        case 'CONFIRMED': return 'Inherent tier confirmed';
        default: return 'Waiting to be completed';
    }
}

export function authoritativeIraState(input: {
    engagementIra?: { status?: string | null; openedAt?: Date | string | null; submittedAt?: Date | string | null } | null;
    legacy?: { status?: string | null; sent?: boolean; submitted?: boolean; sentAt?: Date | string | null; submittedAt?: Date | string | null } | null;
    requesterHasWorkspace?: boolean;
}): AuthoritativeIraState {
    if (input.engagementIra?.status) {
        const raw = String(input.engagementIra.status);
        const status = ENGAGEMENT_STATUS[raw] || (raw === 'REQUIRED' ? 'NOT_SENT' : 'IN_PROGRESS');
        const opened = Boolean(input.engagementIra.openedAt) || status === 'IN_PROGRESS';
        const submitted = ['SUBMITTED', 'NEEDS_CLARIFICATION', 'TIER_REVIEW', 'CONFIRMED'].includes(status);
        const waiting = status === 'NOT_SENT' || status === 'IN_PROGRESS';
        return {
            source: 'ENGAGEMENT_IRA',
            status: status === 'NOT_SENT' && opened ? 'IN_PROGRESS' : status,
            statusLabel: labelIraStatus(status === 'NOT_SENT' && opened ? 'IN_PROGRESS' : status === 'NOT_SENT' && input.requesterHasWorkspace ? 'WAITING_ON_REQUESTER' : status),
            sent: waiting ? Boolean(input.requesterHasWorkspace || opened) : true,
            submitted,
            sentAt: input.engagementIra.openedAt || null,
            submittedAt: input.engagementIra.submittedAt || null,
            owner: status === 'NEEDS_CLARIFICATION' || waiting ? 'Requester' : 'TPRM Analyst',
            next: waiting
                ? (input.requesterHasWorkspace
                    ? 'The requester completes the business-context risk assessment in their workspace.'
                    : 'Send the business-context assessment to the requester.')
                : status === 'NEEDS_CLARIFICATION'
                    ? 'Wait for the requester to answer the clarification.'
                    : status === 'CONFIRMED'
                        ? 'Review due-diligence scope.'
                        : 'Open Tier Review and confirm the inherent tier.',
            primaryAction: waiting
                ? (input.requesterHasWorkspace ? 'Open requester workspace status' : 'Send assessment')
                : status === 'NEEDS_CLARIFICATION'
                    ? 'Waiting on requester'
                    : status === 'CONFIRMED'
                        ? 'Review due-diligence scope'
                        : 'Open Tier Review',
            secondaryAction: waiting && !input.requesterHasWorkspace ? 'Copy secure link' : null,
        };
    }

    const legacyStatus = String(input.legacy?.status || 'IRA_NOT_SENT');
    const submitted = Boolean(input.legacy?.submitted || legacyStatus === 'IRA_SUBMITTED');
    const sent = Boolean(input.legacy?.sent || ['IRA_SENT', 'IRA_OPENED', 'IRA_IN_PROGRESS', 'IRA_SUBMITTED'].includes(legacyStatus));
    const status: AuthoritativeIraStatus = submitted
        ? 'SUBMITTED'
        : legacyStatus === 'IRA_IN_PROGRESS'
            ? 'IN_PROGRESS'
            : sent
                ? 'WAITING_ON_REQUESTER'
                : 'NOT_SENT';
    return {
        source: 'LEGACY_TASK_LINK',
        status,
        statusLabel: labelIraStatus(status),
        sent,
        submitted,
        sentAt: input.legacy?.sentAt || null,
        submittedAt: input.legacy?.submittedAt || null,
        owner: sent && !submitted ? 'Requester' : 'TPRM Analyst',
        next: submitted
            ? 'Confirm the inherent tier.'
            : sent
                ? 'The requester is completing the business-context risk assessment.'
                : 'Send the business-context assessment to the requester.',
        primaryAction: submitted ? 'Open Tier Review' : sent ? 'Waiting on requester' : 'Send assessment',
        secondaryAction: submitted ? null : 'Copy secure link',
    };
}
