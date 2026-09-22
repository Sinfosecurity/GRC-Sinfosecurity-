import { EngagementStatus } from '@prisma/client';

export const ENGAGEMENT_WORKSPACE_TABS = [
    'overview',
    'inherent-risk',
    'due-diligence',
    'evidence',
    'findings',
    'controls',
    'residual-risk',
    'decisions',
    'monitoring',
    'reassessment',
    'history',
] as const;

export type EngagementWorkspaceTab = (typeof ENGAGEMENT_WORKSPACE_TABS)[number];

export type PrimaryAction = {
    label: string;
    href: (engagementId: string) => string;
    owner: string;
    wave5: boolean;
};

const ACTIONS: Record<string, PrimaryAction> = {
    READY_FOR_IRA: {
        label: 'Requester must complete the inherent-risk assessment',
        href: (id) => `/engagements/${id}/inherent-risk`,
        owner: 'Business requester',
        wave5: false,
    },
    IRA_IN_PROGRESS: {
        label: 'Requester is completing the inherent-risk assessment',
        href: (id) => `/engagements/${id}/inherent-risk`,
        owner: 'Business requester',
        wave5: false,
    },
    TIER_REVIEW: {
        label: 'Complete Tier Review',
        href: (id) => `/engagements/${id}/inherent-risk`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    NEEDS_REQUESTER_CLARIFICATION: {
        label: 'Waiting for requester clarification',
        href: (id) => `/engagements/${id}/inherent-risk`,
        owner: 'Business requester',
        wave5: false,
    },
    INHERENT_TIER_CONFIRMED: {
        label: 'Confirm Due-Diligence Plan',
        href: (id) => `/engagements/${id}/due-diligence`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    DUE_DILIGENCE_PLANNING: {
        label: 'Confirm Due-Diligence Plan',
        href: (id) => `/engagements/${id}/due-diligence`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    READY_TO_SEND: {
        label: 'Send Vendor Assessment',
        href: (id) => `/engagements/${id}/due-diligence`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    AWAITING_VENDOR: {
        label: 'Waiting for the vendor to activate and respond',
        href: (id) => `/engagements/${id}/due-diligence`,
        owner: 'Vendor',
        wave5: false,
    },
    VENDOR_IN_PROGRESS: {
        label: 'Vendor is completing the questionnaire',
        href: (id) => `/engagements/${id}/due-diligence`,
        owner: 'Vendor',
        wave5: false,
    },
    VENDOR_SUBMITTED: {
        label: 'Complete Specialist Review',
        href: (id) => `/engagements/${id}/evidence`,
        owner: 'Assigned specialist / TPRM analyst',
        wave5: false,
    },
    SPECIALIST_REVIEW: {
        label: 'Complete Specialist Review',
        href: (id) => `/engagements/${id}/evidence`,
        owner: 'Assigned specialist / TPRM analyst',
        wave5: false,
    },
    FINDING_REVIEW: {
        label: 'Review Finding Candidates',
        href: (id) => `/engagements/${id}/findings`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    RESIDUAL_READY: {
        label: 'Calculate Residual Risk',
        href: (id) => `/engagements/${id}/residual-risk`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
    TREATMENT_REVIEW: {
        label: 'Review risk treatment',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    ACCEPTANCE_PENDING: {
        label: 'Await decision',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Authorized approver',
        wave5: true,
    },
    TREATMENT_DECIDED: {
        label: 'Review contract requirements',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    CONTRACT_REVIEW: {
        label: 'Complete requirements',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    GATE_BLOCKED: {
        label: 'Resolve blockers',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    GATE_APPROVED: {
        label: 'Activate Engagement',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Authorized activator',
        wave5: true,
    },
    ACTIVE: {
        label: 'Monitoring setup pending Wave 6',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    AVOIDED: {
        label: 'Engagement avoided',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    REJECTED: {
        label: 'Request declined',
        href: (id) => `/engagements/${id}/decisions`,
        owner: 'Assigned TPRM analyst',
        wave5: true,
    },
    INTAKE_COMPLETE: {
        label: 'Review this engagement',
        href: (id) => `/engagements/${id}`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    },
};

export function engagementPrimaryAction(
    status: EngagementStatus,
    extras: {
        residualReady?: boolean;
        residualConfirmed?: boolean;
        outstandingReviewDomains?: string[];
        openCandidateCount?: number;
        controlAssessed?: boolean;
        treatmentType?: string | null;
        acceptanceStatus?: string | null;
        gateStatus?: string | null;
        mandatoryOpen?: boolean;
        monitoringProfileStatus?: string | null;
        openMonitoringSignals?: number;
        highPrioritySignals?: number;
        reassessmentRecommended?: boolean;
        openReassessment?: boolean;
    } = {},
): PrimaryAction {
    if (status === EngagementStatus.ACTIVE) {
        if (extras.openReassessment) {
            return { label: 'Continue reassessment', href: (id) => `/engagements/${id}/reassessment`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        if (extras.reassessmentRecommended) {
            return { label: 'Start reassessment', href: (id) => `/engagements/${id}/reassessment`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        if ((extras.highPrioritySignals || 0) > 0) {
            return { label: 'Review high-priority monitoring signal', href: (id) => `/engagements/${id}/monitoring`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        if ((extras.openMonitoringSignals || 0) > 0) {
            return { label: 'Review monitoring signal', href: (id) => `/engagements/${id}/monitoring`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        if (extras.monitoringProfileStatus === 'ACTIVE') {
            return { label: 'Monitoring active — no signals need review', href: (id) => `/engagements/${id}/monitoring`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        if (extras.monitoringProfileStatus === 'PAUSED') {
            return { label: 'Resume or review monitoring profile', href: (id) => `/engagements/${id}/monitoring`, owner: 'Assigned TPRM analyst', wave5: false };
        }
        return { label: 'Configure monitoring profile', href: (id) => `/engagements/${id}/monitoring`, owner: 'Assigned TPRM analyst', wave5: false };
    }
    if (status === EngagementStatus.AVOIDED) return ACTIONS.AVOIDED;
    if (status === EngagementStatus.REJECTED) return ACTIONS.REJECTED;
    if (extras.gateStatus === 'APPROVED') return ACTIONS.GATE_APPROVED;
    if (extras.gateStatus === 'BLOCKED') return ACTIONS.GATE_BLOCKED;
    if (status === EngagementStatus.GATE_APPROVED) return ACTIONS.GATE_APPROVED;
    if (status === EngagementStatus.GATE_BLOCKED) return ACTIONS.GATE_BLOCKED;
    if (extras.mandatoryOpen || status === EngagementStatus.CONTRACT_REVIEW) return ACTIONS.CONTRACT_REVIEW;
    if (extras.acceptanceStatus === 'PENDING' || extras.acceptanceStatus === 'REQUESTED' || status === EngagementStatus.ACCEPTANCE_PENDING) {
        return extras.treatmentType === 'ACCEPT' && extras.acceptanceStatus !== 'PENDING' && extras.acceptanceStatus !== 'REQUESTED'
            ? { label: 'Request acceptance approval', href: (id) => `/engagements/${id}/decisions`, owner: 'Assigned TPRM analyst', wave5: true }
            : ACTIONS.ACCEPTANCE_PENDING;
    }
    if (extras.treatmentType === 'ACCEPT' && extras.acceptanceStatus !== 'APPROVED') {
        return { label: 'Request acceptance approval', href: (id) => `/engagements/${id}/decisions`, owner: 'Assigned TPRM analyst', wave5: true };
    }
    if (extras.residualConfirmed && !extras.treatmentType) {
        return {
            label: 'Review risk treatment',
            href: (id) => `/engagements/${id}/decisions`,
            owner: 'Assigned TPRM analyst',
            wave5: true,
        };
    }
    if (status === EngagementStatus.RESIDUAL_READY && extras.residualConfirmed) {
        return ACTIONS.TREATMENT_REVIEW;
    }
    if (status === EngagementStatus.RESIDUAL_READY) {
        return {
            label: 'Review the Engagement residual-risk assessment.',
            href: (id) => `/engagements/${id}/residual-risk`,
            owner: 'Assigned TPRM analyst',
            wave5: false,
        };
    }
    if (status === EngagementStatus.FINDING_REVIEW) {
        if (extras.openCandidateCount && extras.openCandidateCount > 0) {
            return ACTIONS.FINDING_REVIEW;
        }
        if (!extras.controlAssessed) {
            return {
                label: 'Assess Control Effectiveness',
                href: (id) => `/engagements/${id}/controls`,
                owner: 'Assigned TPRM analyst',
                wave5: false,
            };
        }
        return {
            label: 'Calculate Residual Risk',
            href: (id) => `/engagements/${id}/residual-risk`,
            owner: 'Assigned TPRM analyst',
            wave5: false,
        };
    }
    if (status === EngagementStatus.SPECIALIST_REVIEW && extras.outstandingReviewDomains?.length) {
        return {
            label: `Complete remaining specialist review: ${extras.outstandingReviewDomains.join(', ')}`,
            href: (id) => `/engagements/${id}/evidence`,
            owner: 'Assigned specialist / TPRM analyst',
            wave5: false,
        };
    }
    return ACTIONS[status] || {
        label: 'Review this engagement',
        href: (id) => `/engagements/${id}`,
        owner: 'Assigned TPRM analyst',
        wave5: false,
    };
}

export function recordedOrUnavailable(value: string | number | null | undefined, empty = 'Not recorded') {
    if (value === 0) return '0';
    if (value == null || value === '') return empty;
    return String(value);
}

export function notYetAssessed(value: string | null | undefined) {
    return recordedOrUnavailable(value, 'Not yet assessed');
}

export function notCalculated(value: string | null | undefined) {
    return recordedOrUnavailable(value, 'Not calculated');
}
