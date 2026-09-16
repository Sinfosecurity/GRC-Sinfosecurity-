import { groupReviewItems, reviewPrimaryAction, type ReviewItem } from './reviewUnits';

export const CUSTOMER_STAGES = ['Request', 'Assess', 'Vendor Review', 'Review & Decide', 'Monitor'] as const;
export type CustomerStage = (typeof CUSTOMER_STAGES)[number];

const GOVERNED_TO_CUSTOMER: Record<string, CustomerStage> = {
    Request: 'Request',
    REQUEST: 'Request',
    Intake: 'Assess',
    INTAKE: 'Assess',
    'Tier review': 'Assess',
    TIER_REVIEW: 'Assess',
    'Due diligence': 'Assess',
    DUE_DILIGENCE_PLAN: 'Assess',
    'Ready to send': 'Vendor Review',
    READY_TO_SEND: 'Vendor Review',
    'Awaiting vendor': 'Vendor Review',
    AWAITING_VENDOR: 'Vendor Review',
    'Vendor in progress': 'Vendor Review',
    VENDOR_IN_PROGRESS: 'Vendor Review',
    Submitted: 'Review & Decide',
    SUBMITTED: 'Review & Decide',
    'Under review': 'Review & Decide',
    UNDER_REVIEW: 'Review & Decide',
    Remediation: 'Review & Decide',
    REMEDIATION: 'Review & Decide',
    'Risk acceptance': 'Review & Decide',
    RISK_ACCEPTANCE: 'Review & Decide',
    'Contract review': 'Review & Decide',
    CONTRACT_REVIEW: 'Review & Decide',
    Approval: 'Review & Decide',
    APPROVAL: 'Review & Decide',
    Active: 'Monitor',
    ACTIVE: 'Monitor',
    Reassessment: 'Monitor',
    REASSESSMENT: 'Monitor',
    Offboarding: 'Monitor',
    OFFBOARDING: 'Monitor',
};

export function customerStage(stage?: string | null): CustomerStage {
    return GOVERNED_TO_CUSTOMER[String(stage || '')] || 'Request';
}

export function customerStageIndex(stage?: string | null) {
    return CUSTOMER_STAGES.indexOf(customerStage(stage));
}

export function workspaceSection(stage?: string | null): 'overview' | 'assessment' | 'findings' | 'decisions' | 'history' {
    const key = customerStage(stage);
    if (key === 'Monitor') return 'overview';
    if (key === 'Review & Decide') return 'decisions';
    if (key === 'Request' || key === 'Assess' || key === 'Vendor Review') return 'assessment';
    return 'overview';
}

export function dominantNextAction(data: {
    stage?: string;
    stageKey?: string;
    nextAction?: string;
    review?: { potentialFindings?: number; needClarification?: number; items?: unknown[]; satisfactory?: number; questionsAnswered?: number };
    unresolvedScope?: unknown[];
    canEditIntake?: boolean;
    canReviewTier?: boolean;
    intake?: { completed?: boolean };
}) {
    const stage = data.stageKey || data.stage;
    if ((data.unresolvedScope || []).length && !data.intake?.completed) {
        return { label: 'Complete intake', detail: 'A controlling fact is still Unknown. Save is allowed. Ready to send is not.' };
    }
    if (stage === 'INTAKE' || stage === 'Intake') return { label: 'Complete intake', detail: data.nextAction || 'Answer the inherent-risk questions.' };
    if (stage === 'TIER_REVIEW' || stage === 'Tier review') return { label: 'Confirm recommended tier', detail: data.nextAction || 'Supreme already scored inherent risk.' };
    if (stage === 'DUE_DILIGENCE_PLAN' || stage === 'Due diligence') return { label: 'Confirm recommended packs', detail: data.nextAction || 'Baseline is required. Other packs come from intake facts.' };
    if (stage === 'READY_TO_SEND' || stage === 'Ready to send') return { label: 'Send assessment', detail: data.nextAction || 'Send invitation or copy the secure link.' };
    if (['AWAITING_VENDOR', 'VENDOR_IN_PROGRESS', 'Awaiting vendor', 'Vendor in progress'].includes(String(stage))) {
        return { label: 'Waiting on vendor', detail: data.nextAction || 'Supreme is tracking vendor progress.' };
    }
    if (Array.isArray(data.review?.items) && data.review.items.length) {
        return reviewPrimaryAction(groupReviewItems(data.review.items as ReviewItem[], data.review), stage);
    }
    const material = Number(data.review?.potentialFindings || 0);
    const clarifications = Number(data.review?.needClarification || 0);
    if (material > 0) return { label: `Review ${material} material issue${material === 1 ? '' : 's'}`, detail: 'Related responses stay grouped. Satisfactory answers stay in the full assessment.' };
    if (clarifications > 0) return { label: `Review ${clarifications} clarification${clarifications === 1 ? '' : 's'}`, detail: 'These answers need a person before they become findings.' };
    if (['SUBMITTED', 'UNDER_REVIEW', 'Submitted', 'Under review'].includes(String(stage))) {
        return { label: 'Review exceptions', detail: data.nextAction || 'Start with answers that need judgment.' };
    }
    if (['REMEDIATION', 'RISK_ACCEPTANCE', 'Remediation', 'Risk acceptance'].includes(String(stage))) {
        return { label: 'Validate or accept risk', detail: data.nextAction || 'Acceptance does not reduce residual risk.' };
    }
    if (['CONTRACT_REVIEW', 'APPROVAL', 'Contract review', 'Approval'].includes(String(stage))) {
        return { label: 'Make decision', detail: data.nextAction || 'Approve, approve with conditions, or reject.' };
    }
    if (['ACTIVE', 'REASSESSMENT', 'Active', 'Reassessment'].includes(String(stage))) {
        return { label: data.nextAction || 'No action required', detail: 'This third party is being monitored.' };
    }
    return { label: data.nextAction || 'Continue', detail: 'Supreme prepared the next eligible step.' };
}
