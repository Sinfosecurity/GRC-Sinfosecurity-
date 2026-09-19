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
    'Ready to send': 'Assess',
    READY_TO_SEND: 'Assess',
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
    ira?: { required?: boolean; sent?: boolean; submitted?: boolean; unknownCount?: number; unknownMessage?: string };
    tierReview?: { recommendedTier?: string | null; confirmedTier?: string | null };
    actorId?: string;
    lifecycle?: {
        readyForIndependentApproval?: boolean;
        waitingForApproval?: boolean;
        approvalPreparedBy?: string | null;
        waitingFor?: string | null;
        findings?: Array<{ pendingIndependentApproval?: boolean }>;
    };
}) {
    const stage = data.stageKey || data.stage;
    if (['ACTIVE', 'REASSESSMENT', 'OFFBOARDING', 'Active', 'Reassessment', 'Offboarding'].includes(String(stage))) {
        if (['OFFBOARDING', 'Offboarding'].includes(String(stage))) {
            return {
                label: 'This vendor is already onboarded',
                detail: 'This page is monitoring and offboarding, not a new assessment. Request a different third party to start one.',
            };
        }
        return {
            label: data.nextAction || 'No action required',
            detail: 'This third party is being monitored. To assess a new vendor, request a third party.',
        };
    }
    if ((data.unresolvedScope || []).length && !data.intake?.completed && !data.ira?.required) {
        return { label: 'Complete intake', detail: 'A controlling fact is still Unknown. Save is allowed. Ready to send is not.' };
    }
    if ((stage === 'INTAKE' || stage === 'Intake') && data.ira?.required && !data.ira?.submitted) {
        return data.ira.sent
            ? { label: 'Waiting on requester', detail: 'The business-context risk assessment is with the requester.' }
            : { label: 'Send assessment', detail: 'Send the business-context assessment to the requester. Copy a secure link only as a secondary delivery method.' };
    }
    if (stage === 'INTAKE' || stage === 'Intake') return { label: 'Complete intake', detail: data.nextAction || 'Answer the inherent-risk questions.' };
    if (stage === 'TIER_REVIEW' || stage === 'Tier review') {
        if (!data.tierReview?.recommendedTier) {
            return { label: 'Not yet rated', detail: data.ira?.unknownMessage || 'Answers still need confirmation. Questionnaire send stays blocked.' };
        }
        return { label: 'Confirm recommended tier', detail: data.nextAction || 'Supreme already scored inherent risk. Confirm to make the questionnaire ready to send.' };
    }
    if (stage === 'DUE_DILIGENCE_PLAN' || stage === 'Due diligence') return { label: 'Confirm recommended packs', detail: data.nextAction || 'Baseline is required. Other packs come from intake facts.' };
    if (stage === 'READY_TO_SEND' || stage === 'Ready to send') {
        return { label: 'Send questionnaire', detail: 'Send the prepared questionnaire to the vendor.' };
    }
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
    if (data.lifecycle?.readyForIndependentApproval || data.lifecycle?.waitingForApproval || data.lifecycle?.findings?.some((row) => row.pendingIndependentApproval)) {
        const isPreparer = Boolean(data.actorId && data.lifecycle?.approvalPreparedBy && data.actorId === data.lifecycle.approvalPreparedBy);
        if (isPreparer) {
            return {
                label: 'Waiting for approval',
                detail: data.lifecycle?.waitingFor ? `Waiting for ${data.lifecycle.waitingFor}.` : 'Waiting for an authorized approver.',
            };
        }
        return { label: 'Ready for independent approval', detail: 'Supreme prepared the record. Another authorized reviewer must decide.' };
    }
    if (['REMEDIATION', 'RISK_ACCEPTANCE', 'Remediation', 'Risk acceptance'].includes(String(stage))) {
        return { label: 'Validate or accept risk', detail: data.nextAction || 'Acceptance does not reduce residual risk.' };
    }
    if (['CONTRACT_REVIEW', 'APPROVAL', 'Contract review', 'Approval'].includes(String(stage))) {
        return { label: 'Make decision', detail: data.nextAction || 'Approve, approve with conditions, or reject.' };
    }
    return { label: data.nextAction || 'Continue', detail: 'Supreme prepared the next eligible step.' };
}

function pathState(done: boolean, isCurrent: boolean): 'complete' | 'current' | 'upcoming' {
    if (isCurrent) return 'current';
    if (done) return 'complete';
    return 'upcoming';
}

const PAST_TIER = ['READY_TO_SEND', 'AWAITING_VENDOR', 'VENDOR_IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'FINDINGS_OPEN', 'REMEDIATION', 'RISK_ACCEPTANCE', 'CONTRACT_REVIEW', 'APPROVAL', 'ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];
const PAST_READY = ['AWAITING_VENDOR', 'VENDOR_IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'FINDINGS_OPEN', 'REMEDIATION', 'RISK_ACCEPTANCE', 'CONTRACT_REVIEW', 'APPROVAL', 'ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];
const PAST_SENT = ['VENDOR_IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'FINDINGS_OPEN', 'REMEDIATION', 'RISK_ACCEPTANCE', 'CONTRACT_REVIEW', 'APPROVAL', 'ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];
const PAST_VENDOR = ['SUBMITTED', 'UNDER_REVIEW', 'FINDINGS_OPEN', 'REMEDIATION', 'RISK_ACCEPTANCE', 'CONTRACT_REVIEW', 'APPROVAL', 'ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];
const PAST_REVIEW = ['CONTRACT_REVIEW', 'APPROVAL', 'ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];
const AT_REVIEW = ['SUBMITTED', 'UNDER_REVIEW', 'FINDINGS_OPEN', 'REMEDIATION', 'RISK_ACCEPTANCE'];
const AT_DECISION = ['CONTRACT_REVIEW', 'APPROVAL'];
const AT_MONITOR = ['ACTIVE', 'REASSESSMENT', 'OFFBOARDING'];

export function version3OperatingSteps(data: {
    stageKey?: string;
    ira?: { required?: boolean; sent?: boolean; submitted?: boolean; status?: string };
}) {
    const stage = String(data.stageKey || '');
    const iraSent = Boolean(data.ira?.sent || data.ira?.submitted || ['IRA_SENT', 'IRA_OPENED', 'IRA_IN_PROGRESS', 'IRA_SUBMITTED'].includes(String(data.ira?.status || '')));
    const iraSubmitted = Boolean(data.ira?.submitted || data.ira?.status === 'IRA_SUBMITTED');
    return [
        { key: 'REQUEST', label: 'Request', state: pathState(true, false) },
        { key: 'IRA_SENT', label: 'Inherent Risk Assessment', state: pathState(iraSent, !iraSent && (stage === 'INTAKE' || stage === 'REQUEST')) },
        { key: 'IRA_SUBMITTED', label: 'IRA submitted', state: pathState(iraSubmitted, iraSent && !iraSubmitted) },
        { key: 'TIER_REVIEW', label: 'Tier review', state: pathState(PAST_TIER.includes(stage), stage === 'TIER_REVIEW') },
        { key: 'QUESTIONNAIRE_READY', label: 'Questionnaire ready', state: pathState(PAST_READY.includes(stage), stage === 'READY_TO_SEND') },
        { key: 'QUESTIONNAIRE_SENT', label: 'Questionnaire sent', state: pathState(PAST_SENT.includes(stage), stage === 'AWAITING_VENDOR') },
        { key: 'VENDOR_RESPONDING', label: 'Vendor responding', state: pathState(PAST_VENDOR.includes(stage), stage === 'VENDOR_IN_PROGRESS') },
        { key: 'REVIEW', label: 'Review', state: pathState(PAST_REVIEW.includes(stage), AT_REVIEW.includes(stage)) },
        { key: 'DECISION', label: 'Decision', state: pathState(AT_MONITOR.includes(stage), AT_DECISION.includes(stage)) },
        { key: 'MONITOR', label: 'Monitor', state: pathState(false, AT_MONITOR.includes(stage)) },
    ];
}
