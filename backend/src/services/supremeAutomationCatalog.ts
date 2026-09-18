export const AUTOMATION_RULE_VERSION = 'supreme-automation-1.0.0';

export type ConditionOp = 'eq' | 'in' | 'true' | 'false' | 'lte' | 'exists';

export type TriggerDef = {
    type: 'EVENT' | 'SCHEDULE';
    event: string;
    lookAheadDays?: number;
};

export type ConditionDef = {
    field: string;
    op: ConditionOp;
    value?: string | string[] | number | boolean;
};

export type ActionDef = {
    type: string;
    params?: {
        dueInDays?: number;
        workKind?: 'REVIEW' | 'REMINDER' | 'EVIDENCE_REQUEST' | 'DECISION_REQUEST' | 'REASSESSMENT_REQUEST';
        title?: string;
    };
};

export type HumanBoundary = {
    required: boolean;
    before: string;
    label: string;
};

export const TRIGGERS = [
    { key: 'vendor.onboarding.created', label: 'Vendor onboarding created', domain: 'THIRD_PARTY', kind: 'EVENT' },
    { key: 'vendor.tier.changed', label: 'Vendor tier changed', domain: 'THIRD_PARTY', kind: 'EVENT' },
    { key: 'assessment.submitted', label: 'Assessment submitted', domain: 'THIRD_PARTY', kind: 'EVENT' },
    { key: 'finding.confirmed', label: 'Finding confirmed', domain: 'THIRD_PARTY', kind: 'EVENT' },
    { key: 'finding.overdue', label: 'Finding overdue', domain: 'THIRD_PARTY', kind: 'SCHEDULE' },
    { key: 'evidence.expiring', label: 'Evidence expiring', domain: 'EVIDENCE', kind: 'SCHEDULE' },
    { key: 'evidence.expired', label: 'Evidence expired', domain: 'EVIDENCE', kind: 'SCHEDULE' },
    { key: 'risk.outside_appetite', label: 'Risk outside appetite', domain: 'RISK', kind: 'EVENT' },
    { key: 'risk.acceptance.expiring', label: 'Risk acceptance nearing expiry', domain: 'RISK', kind: 'SCHEDULE' },
    { key: 'control.test.failed', label: 'Control test failed', domain: 'CONTROL', kind: 'EVENT' },
    { key: 'compliance.gap.opened', label: 'Compliance gap opened', domain: 'COMPLIANCE', kind: 'EVENT' },
    { key: 'privacy.deadline.approaching', label: 'Privacy deadline approaching', domain: 'PRIVACY', kind: 'SCHEDULE' },
    { key: 'ai.approval.due', label: 'AI approval due', domain: 'AI_GOVERNANCE', kind: 'SCHEDULE' },
    { key: 'intelligence.critical_attention', label: 'Intelligence item becomes Critical Attention', domain: 'INTELLIGENCE', kind: 'EVENT' },
    { key: 'scheduled.review', label: 'Scheduled review date reached', domain: 'CROSS_PLATFORM', kind: 'SCHEDULE' },
] as const;

export const CONDITIONS = [
    { key: 'vendor.tier', label: 'Vendor tier', ops: ['eq', 'in'] as ConditionOp[] },
    { key: 'finding.severity', label: 'Finding severity', ops: ['eq', 'in'] as ConditionOp[] },
    { key: 'risk.outside_appetite', label: 'Risk outside appetite', ops: ['true'] as ConditionOp[] },
    { key: 'evidence.expires_within_days', label: 'Evidence expires within days', ops: ['lte'] as ConditionOp[] },
    { key: 'control.test.result', label: 'Control test result', ops: ['eq'] as ConditionOp[] },
    { key: 'owner.exists', label: 'Owner exists', ops: ['true', 'exists'] as ConditionOp[] },
    { key: 'due.exceeded', label: 'Due date exceeded', ops: ['true'] as ConditionOp[] },
    { key: 'intelligence.priority', label: 'Intelligence priority', ops: ['eq'] as ConditionOp[] },
    { key: 'intelligence.current', label: 'Intelligence item is current', ops: ['true'] as ConditionOp[] },
] as const;

export const ACTIONS = [
    { key: 'CREATE_WORK_ITEM', label: 'Create review or follow-up work', retryable: false },
    { key: 'NOTIFY_OWNER', label: 'Notify owner', retryable: true },
    { key: 'REQUEST_EVIDENCE', label: 'Request replacement evidence', retryable: false },
    { key: 'REQUEST_REASSESSMENT', label: 'Request governed reassessment', retryable: false },
    { key: 'CREATE_REMINDER', label: 'Create reminder', retryable: false },
    { key: 'ESCALATE_OVERDUE', label: 'Escalate overdue work', retryable: false },
    { key: 'CREATE_REVIEW_REQUEST', label: 'Create review request', retryable: false },
    { key: 'CREATE_DECISION_PACKAGE', label: 'Prepare decision package', retryable: false },
    { key: 'SET_FOLLOW_UP_DEADLINE', label: 'Add follow-up deadline', retryable: false },
] as const;

export const PROHIBITED_ACTIONS = [
    { key: 'AUTO_APPROVE_VENDOR', reason: 'Vendor approval is a human decision.' },
    { key: 'AUTO_ACCEPT_RISK', reason: 'Risk acceptance is a human decision. Residual risk is not rewritten by automation.' },
    { key: 'AUTO_CLOSE_CRITICAL_FINDING', reason: 'Findings close only through governed human validation.' },
    { key: 'AUTO_MARK_COMPLIANT', reason: 'Compliance declarations are human decisions.' },
    { key: 'AUTO_APPROVE_AI', reason: 'AI approval is a human decision.' },
    { key: 'AUTO_DECLARE_PRIVACY_TRANSFER_VALID', reason: 'Privacy transfer validity is a legal human conclusion.' },
] as const;

export type AutomationTemplate = {
    key: string;
    name: string;
    description: string;
    domain: string;
    trigger: TriggerDef;
    conditions: ConditionDef[];
    actions: ActionDef[];
    humanBoundary: HumanBoundary;
};

export const TEMPLATES: AutomationTemplate[] = [
    {
        key: 'high-finding-remediation-follow-up',
        name: 'High finding remediation follow-up',
        description: 'When a High or Critical finding is overdue, create review work and notify the owner. A person still closes or remediates the finding.',
        domain: 'THIRD_PARTY',
        trigger: { type: 'SCHEDULE', event: 'finding.overdue' },
        conditions: [{ field: 'finding.severity', op: 'in', value: ['HIGH', 'CRITICAL'] }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 7, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
            { type: 'CREATE_REMINDER', params: { dueInDays: 7 } },
        ],
        humanBoundary: { required: true, before: 'finding_closure', label: 'Required before the finding is closed or residual risk is changed' },
    },
    {
        key: 'failed-control-test-review',
        name: 'Failed control test review',
        description: 'When a control test fails, create a review task and notify the owner. Effectiveness is not marked from this automation.',
        domain: 'CONTROL',
        trigger: { type: 'EVENT', event: 'control.test.failed' },
        conditions: [{ field: 'control.test.result', op: 'eq', value: 'FAIL' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 5, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'control_effectiveness', label: 'Required before control effectiveness or compliance is declared' },
    },
    {
        key: 'critical-vendor-evidence-expiry',
        name: 'Critical vendor evidence expiry',
        description: 'When evidence is expiring or expired, request replacement evidence and notify the owner.',
        domain: 'EVIDENCE',
        trigger: { type: 'SCHEDULE', event: 'evidence.expiring', lookAheadDays: 30 },
        conditions: [{ field: 'evidence.expires_within_days', op: 'lte', value: 30 }],
        actions: [
            { type: 'REQUEST_EVIDENCE', params: { dueInDays: 7, workKind: 'EVIDENCE_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
            { type: 'CREATE_REMINDER', params: { dueInDays: 7 } },
        ],
        humanBoundary: { required: true, before: 'vendor_approval', label: 'Required before vendor approval or reassessment conclusion' },
    },
    {
        key: 'risk-acceptance-expiry',
        name: 'Risk acceptance expiry',
        description: 'When a risk acceptance is nearing expiry, prepare a human renewal decision. Residual score is not changed.',
        domain: 'RISK',
        trigger: { type: 'SCHEDULE', event: 'risk.acceptance.expiring', lookAheadDays: 14 },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_DECISION_PACKAGE', params: { dueInDays: 14, workKind: 'DECISION_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'risk_acceptance', label: 'Required before risk is accepted, renewed, or residual score is changed' },
    },
    {
        key: 'risk-outside-appetite',
        name: 'Risk outside appetite',
        description: 'When a risk is outside appetite, notify the owner and create a treatment review. Residual score is not altered.',
        domain: 'RISK',
        trigger: { type: 'EVENT', event: 'risk.outside_appetite' },
        conditions: [{ field: 'risk.outside_appetite', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 7, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'risk_acceptance', label: 'Required before risk is accepted or residual score is changed' },
    },
    {
        key: 'critical-vendor-reassessment-reminder',
        name: 'Critical vendor reassessment reminder',
        description: 'Remind the owner to start a governed reassessment. The vendor is not approved.',
        domain: 'THIRD_PARTY',
        trigger: { type: 'SCHEDULE', event: 'scheduled.review' },
        conditions: [{ field: 'vendor.tier', op: 'in', value: ['CRITICAL', 'HIGH'] }],
        actions: [
            { type: 'REQUEST_REASSESSMENT', params: { dueInDays: 14, workKind: 'REASSESSMENT_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'vendor_approval', label: 'Required before vendor approval or reassessment conclusion' },
    },
    {
        key: 'compliance-evidence-refresh',
        name: 'Compliance evidence refresh',
        description: 'When evidence expiry affects a requirement, request a refresh. Compliance is not declared.',
        domain: 'COMPLIANCE',
        trigger: { type: 'SCHEDULE', event: 'evidence.expiring', lookAheadDays: 30 },
        conditions: [{ field: 'evidence.expires_within_days', op: 'lte', value: 30 }],
        actions: [
            { type: 'REQUEST_EVIDENCE', params: { dueInDays: 14, workKind: 'EVIDENCE_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'compliance_declaration', label: 'Required before a requirement is marked compliant' },
    },
    {
        key: 'compliance-gap-opened',
        name: 'Compliance gap opened',
        description: 'When a compliance gap is opened, assign review work and notify the owner. Compliance is not declared.',
        domain: 'COMPLIANCE',
        trigger: { type: 'EVENT', event: 'compliance.gap.opened' },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 7, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'compliance_declaration', label: 'Required before a requirement is marked compliant' },
    },
    {
        key: 'privacy-deadline-reminder',
        name: 'Privacy deadline reminder',
        description: 'Remind the owner when a privacy deadline is approaching. No legal conclusion is made.',
        domain: 'PRIVACY',
        trigger: { type: 'SCHEDULE', event: 'privacy.deadline.approaching', lookAheadDays: 7 },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REMINDER', params: { dueInDays: 3, workKind: 'REMINDER' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'privacy_legal', label: 'Required before a privacy request is closed or a transfer is declared valid' },
    },
    {
        key: 'ai-review-due',
        name: 'AI review due',
        description: 'Remind the owner when an AI review or approval is due. The system is not approved.',
        domain: 'AI_GOVERNANCE',
        trigger: { type: 'SCHEDULE', event: 'ai.approval.due', lookAheadDays: 14 },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 14, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'ai_approval', label: 'Required before an AI system is approved or restricted' },
    },
    {
        key: 'intelligence-critical-attention',
        name: 'Intelligence Critical Attention',
        description: 'When Intelligence marks Critical Attention, create review work and notify the owner. Intelligence does not change source records.',
        domain: 'INTELLIGENCE',
        trigger: { type: 'EVENT', event: 'intelligence.critical_attention' },
        conditions: [
            { field: 'intelligence.priority', op: 'eq', value: 'CRITICAL_ATTENTION' },
            { field: 'intelligence.current', op: 'true' },
        ],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 5, workKind: 'REVIEW' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'source_decision', label: 'Required on the authoritative Risk, Control, or Finding record — not on the Intelligence item' },
    },
    {
        key: 'insurance-license-review-due',
        name: 'Insurance license review due',
        description: 'When a recorded license review or expiry date is reached, create owner work. This is not a finding that the entity is operating illegally.',
        domain: 'COMPLIANCE',
        trigger: { type: 'SCHEDULE', event: 'scheduled.review' },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 7, workKind: 'REVIEW', title: 'Review insurance license record' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'compliance_declaration', label: 'Required before any licensing or legal conclusion is recorded' },
    },
    {
        key: 'insurance-claims-vendor-finding',
        name: 'Critical claims vendor finding',
        description: 'Escalate an open high/critical finding on a classified claims vendor. The vendor is not auto-suspended.',
        domain: 'THIRD_PARTY',
        trigger: { type: 'EVENT', event: 'finding.confirmed' },
        conditions: [{ field: 'finding.severity', op: 'in', value: ['HIGH', 'CRITICAL'] }],
        actions: [
            { type: 'ESCALATE_OVERDUE', params: { dueInDays: 5, workKind: 'REVIEW', title: 'Review critical claims-vendor finding' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'vendor_approval', label: 'Required before vendor status or residual risk is changed' },
    },
    {
        key: 'insurance-model-review-overdue',
        name: 'Insurance model review overdue',
        description: 'Create AI governance review work when an insurance-context next-review date has passed. The model is not approved or restricted.',
        domain: 'AI_GOVERNANCE',
        trigger: { type: 'SCHEDULE', event: 'ai.approval.due', lookAheadDays: 0 },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 7, workKind: 'REVIEW', title: 'Review insurance AI/model context' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'ai_approval', label: 'Required before an AI system is approved or restricted' },
    },
    {
        key: 'insurance-regulatory-pack-updated',
        name: 'Insurance regulatory pack updated',
        description: 'When a pack version changes, request control-impact review. Controls are not silently marked noncompliant.',
        domain: 'COMPLIANCE',
        trigger: { type: 'EVENT', event: 'compliance.gap.opened' },
        conditions: [{ field: 'owner.exists', op: 'true' }],
        actions: [
            { type: 'CREATE_REVIEW_REQUEST', params: { dueInDays: 14, workKind: 'REVIEW', title: 'Review regulatory pack impact' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'compliance_declaration', label: 'Required before applicability or compliance is changed' },
    },
    {
        key: 'insurance-evidence-expiring',
        name: 'Insurance evidence expiring',
        description: 'Request replacement evidence when shared evidence linked to an insurance requirement is nearing expiry. Missing evidence is unknown, not failed.',
        domain: 'COMPLIANCE',
        trigger: { type: 'SCHEDULE', event: 'evidence.expiring', lookAheadDays: 30 },
        conditions: [{ field: 'evidence.expires_within_days', op: 'lte', value: 30 }],
        actions: [
            { type: 'REQUEST_EVIDENCE', params: { dueInDays: 14, workKind: 'EVIDENCE_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'compliance_declaration', label: 'Required before a requirement is marked compliant' },
    },
    {
        key: 'insurance-vendor-risk-increased',
        name: 'Insurance vendor risk increased',
        description: 'When a classified insurance vendor tier increases, request reassessment. Residual score is not rewritten.',
        domain: 'THIRD_PARTY',
        trigger: { type: 'EVENT', event: 'vendor.tier.changed' },
        conditions: [{ field: 'vendor.tier', op: 'in', value: ['HIGH', 'CRITICAL'] }],
        actions: [
            { type: 'REQUEST_REASSESSMENT', params: { dueInDays: 14, workKind: 'REASSESSMENT_REQUEST' } },
            { type: 'NOTIFY_OWNER' },
        ],
        humanBoundary: { required: true, before: 'vendor_approval', label: 'Required before vendor approval or reassessment conclusion' },
    },
];

export function catalog() {
    return {
        ruleVersion: AUTOMATION_RULE_VERSION,
        honesty: 'Supreme Intelligence tells you what matters. Supreme Automation coordinates what happens next. Humans remain accountable for material decisions.',
        noAiAgents: 'Deterministic workflow automation. No AI agents are running.',
        triggers: TRIGGERS,
        conditions: CONDITIONS,
        actions: ACTIONS,
        prohibitedActions: PROHIBITED_ACTIONS,
        templates: TEMPLATES.map((row) => ({
            key: row.key,
            name: row.name,
            description: row.description,
            domain: row.domain,
            when: TRIGGERS.find((item) => item.key === row.trigger.event)?.label || row.trigger.event,
            conditions: row.conditions.map((item) => CONDITIONS.find((entry) => entry.key === item.field)?.label || item.field),
            actions: row.actions.map((item) => ACTIONS.find((entry) => entry.key === item.type)?.label || item.type),
            humanDecision: row.humanBoundary.label,
        })),
    };
}

export function templateByKey(key: string) {
    return TEMPLATES.find((row) => row.key === key) || null;
}

export function isProhibitedAction(type: string) {
    return PROHIBITED_ACTIONS.some((row) => row.key === type);
}

export function isKnownAction(type: string) {
    return ACTIONS.some((row) => row.key === type);
}

export function isKnownTrigger(event: string) {
    return TRIGGERS.some((row) => row.key === event);
}

export function actionRetryable(type: string) {
    return ACTIONS.find((row) => row.key === type)?.retryable === true;
}
