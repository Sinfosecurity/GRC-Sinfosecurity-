import {
    loadWorkbookCatalog,
    workbookPackCounts,
    WORKBOOK_PACK_KEYS,
} from './workbookCatalog';

export type IntakeAnswer = { questionKey: string; response?: string | null };

export type PackState = 'INCLUDED_REQUIRED' | 'INCLUDED' | 'EXCLUDED' | 'CONFIRM_SCOPE';
export type ScopeAnswer = 'YES' | 'NO' | 'UNKNOWN' | null;
export type AnalystPackDecision = {
    key: string;
    state: 'INCLUDED' | 'EXCLUDED';
    reason?: string | null;
    at?: string;
    actorId?: string | null;
};

export const SCOPE_QUESTIONS = [
    {
        key: 'scope_personal_sensitive',
        packKey: 'personal-sensitive-data',
        packName: 'Personal and Sensitive Data',
        question: 'Does the service store, process, transmit, or access customer, confidential, personal, regulated, authentication, payment, or health information?',
        useWhen: 'The service stores, processes, transmits, or can access customer, confidential, personal, regulated, authentication, payment, or health information.',
    },
    {
        key: 'scope_software_api',
        packKey: 'software-api',
        packName: 'Software and API',
        question: 'Does the vendor supply software, a hosted application, an API, custom code, or develop code used by the organization?',
        useWhen: 'The vendor supplies software, a hosted application, an API, custom code, or develops code used by the organization.',
    },
    {
        key: 'scope_cloud_hosting',
        packKey: 'cloud-hosting',
        packName: 'Cloud Hosting',
        question: 'Does the vendor host systems or data, operate cloud infrastructure, or provide a platform used to deliver the service?',
        useWhen: 'The vendor hosts systems or data, operates cloud infrastructure, or provides a platform used to deliver the service.',
    },
    {
        key: 'scope_privileged_network',
        packKey: 'privileged-network',
        packName: 'Privileged and Network Access',
        question: 'Does the vendor connect to a trusted network or receive administrative, remote, service-account, or production-system access?',
        useWhen: 'The vendor connects to a trusted network or receives administrative, remote, service-account, or production-system access.',
    },
    {
        key: 'scope_critical_operations',
        packKey: 'critical-operations',
        packName: 'Critical Operations',
        question: 'Would an outage, recovery failure, or loss of the vendor materially disrupt critical operations or customer commitments?',
        useWhen: 'An outage, recovery failure, or loss of the vendor would materially disrupt critical operations or customer commitments.',
    },
    {
        key: 'scope_regulated_service',
        packKey: 'regulated-service',
        packName: 'Regulated Service',
        question: 'Does the service support a regulated activity or create specific legal, contractual, audit, or certification obligations?',
        useWhen: 'The service supports a regulated activity or creates specific legal, contractual, audit, or certification obligations.',
    },
    {
        key: 'scope_physical_delivery',
        packKey: 'physical-delivery',
        packName: 'Physical Delivery',
        question: 'Does the service depend on vendor facilities, physical records, equipment handling, on-site access, or physical protection of systems or media?',
        useWhen: 'The service depends on vendor facilities, physical records, equipment handling, on-site access, or physical protection of systems or media.',
    },
] as const;

export const SCOPE_RESPONSE_OPTIONS = ['Yes', 'No', 'Unknown'] as const;
export const IR_RESPONSE_OPTIONS = ['Low', 'Moderate', 'Medium', 'High', 'Unknown'] as const;

export type QuestionnairePackRow = {
    key: string;
    name: string;
    templateKey: string;
    questionCount: number;
    state: PackState;
    scopeAnswer: ScopeAnswer;
    originalScopeAnswer: ScopeAnswer;
    analystDecision: AnalystPackDecision | null;
    reason: string;
    overridable: boolean;
};

export type QuestionnairePlan = {
    catalogVersion: string;
    packs: QuestionnairePackRow[];
    includedPackKeys: string[];
    includedTemplateKeys: string[];
    includedQuestionCount: number;
    confirmScopeCount: number;
    sendBlocked: boolean;
    sendBlockMessage: string;
};

function norm(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

export function normalizeScopeAnswer(value?: string | null): ScopeAnswer {
    const key = norm(value);
    if (!key) return null;
    if (key === 'yes' || key.startsWith('yes')) return 'YES';
    if (key === 'no' || key.startsWith('no')) return 'NO';
    if (key === 'unknown' || key === 'not yet known' || key === 'not answered') return 'UNKNOWN';
    return 'UNKNOWN';
}

function answer(answers: IntakeAnswer[], key: string) {
    return answers.find((row) => row.questionKey === key)?.response || '';
}

function hasAnyScopeAnswer(answers: IntakeAnswer[]) {
    return SCOPE_QUESTIONS.some((row) => String(answer(answers, row.key) || '').trim());
}

export function missingScopeQuestions(answers: IntakeAnswer[]) {
    return SCOPE_QUESTIONS.filter((row) => !String(answer(answers, row.key) || '').trim()).map((row) => row.key);
}

export function confirmScopeBlockMessage(count: number) {
    if (count <= 0) return '';
    return count === 1
        ? '1 pack requires scope confirmation before this questionnaire can be sent.'
        : `${count} packs require scope confirmation before this questionnaire can be sent.`;
}

export function deriveQuestionnairePlan(
    answers: IntakeAnswer[],
    analystDecisions: AnalystPackDecision[] = [],
    questionCounts: Record<string, number> = workbookPackCounts(loadWorkbookCatalog()),
    catalogVersion = loadWorkbookCatalog().catalogVersion,
    historicalFallback?: Array<{ key: string; included: boolean; unresolved: boolean; reason: string; raw?: string }>
): QuestionnairePlan {
    const decisions = Object.fromEntries(analystDecisions.filter((row) => row?.key).map((row) => [row.key, row]));
    const useScope = hasAnyScopeAnswer(answers);
    const packs: QuestionnairePackRow[] = [];

    const baselineCount = Number(questionCounts.baseline);
    packs.push({
        key: 'baseline',
        name: 'Baseline',
        templateKey: 'tprm-baseline',
        questionCount: Number.isFinite(baselineCount) ? baselineCount : 0,
        state: 'INCLUDED_REQUIRED',
        scopeAnswer: 'YES',
        originalScopeAnswer: 'YES',
        analystDecision: null,
        reason: 'Required for every third party',
        overridable: false,
    });

    for (const scope of SCOPE_QUESTIONS) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.key === scope.packKey)!;
        const count = Number(questionCounts[scope.packKey]);
        let scopeAnswer = normalizeScopeAnswer(answer(answers, scope.key));
        let reason = scopeAnswer === 'YES'
            ? 'Internal scope answer: Yes'
            : scopeAnswer === 'NO'
                ? 'Internal scope answer: No'
                : scopeAnswer === 'UNKNOWN'
                    ? 'Internal scope answer: Unknown'
                    : 'Internal scope answer not recorded';
        let state: PackState = scopeAnswer === 'YES' ? 'INCLUDED' : scopeAnswer === 'NO' ? 'EXCLUDED' : 'CONFIRM_SCOPE';

        if (!useScope) {
            const fallback = historicalFallback?.find((row) => row.key === scope.packKey);
            if (fallback) {
                scopeAnswer = fallback.unresolved ? 'UNKNOWN' : fallback.included ? 'YES' : 'NO';
                reason = fallback.reason;
                state = fallback.unresolved ? 'CONFIRM_SCOPE' : fallback.included ? 'INCLUDED' : 'EXCLUDED';
            } else {
                scopeAnswer = null;
                reason = 'Internal scope answer not recorded. Confirm whether this pack applies.';
                state = 'CONFIRM_SCOPE';
            }
        }

        const decision = decisions[scope.packKey] || decisions[pack.templateKey];
        if (decision && (decision.state === 'INCLUDED' || decision.state === 'EXCLUDED')) {
            state = decision.state === 'EXCLUDED' ? 'EXCLUDED' : 'INCLUDED';
            reason = `${reason}. Analyst ${decision.state === 'EXCLUDED' ? 'excluded' : 'included'} this pack${decision.reason ? `: ${decision.reason}` : ''}.`;
        }

        packs.push({
            key: scope.packKey,
            name: scope.packName,
            templateKey: pack.templateKey,
            questionCount: Number.isFinite(count) ? count : 0,
            state,
            scopeAnswer,
            originalScopeAnswer: useScope ? normalizeScopeAnswer(answer(answers, scope.key)) : scopeAnswer,
            analystDecision: decision || null,
            reason,
            overridable: true,
        });
    }

    const included = packs.filter((row) => row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED');
    const confirmScopeCount = packs.filter((row) => row.state === 'CONFIRM_SCOPE').length;
    return {
        catalogVersion,
        packs,
        includedPackKeys: included.map((row) => row.key),
        includedTemplateKeys: included.map((row) => row.templateKey),
        includedQuestionCount: included.reduce((sum, row) => sum + (Number(row.questionCount) || 0), 0),
        confirmScopeCount,
        sendBlocked: confirmScopeCount > 0,
        sendBlockMessage: confirmScopeBlockMessage(confirmScopeCount),
    };
}

export function analystDecisionsFromCustomization(input: {
    includeKeys?: string[];
    excludeKeys?: string[];
    packDecisions?: AnalystPackDecision[];
    reason?: string;
    actorId?: string;
} = {}): AnalystPackDecision[] {
    if (input.packDecisions?.length) {
        return input.packDecisions.map((row) => ({
            ...row,
            reason: row.reason || input.reason,
            at: row.at || new Date().toISOString(),
            actorId: row.actorId || input.actorId || null,
        }));
    }
    const decisions: AnalystPackDecision[] = [];
    for (const key of input.includeKeys || []) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.key === key || row.templateKey === key);
        if (!pack || pack.key === 'baseline') continue;
        decisions.push({
            key: pack.key,
            state: 'INCLUDED',
            reason: input.reason,
            at: new Date().toISOString(),
            actorId: input.actorId || null,
        });
    }
    for (const key of input.excludeKeys || []) {
        const pack = WORKBOOK_PACK_KEYS.find((row) => row.key === key || row.templateKey === key);
        if (!pack || pack.key === 'baseline') continue;
        decisions.push({
            key: pack.key,
            state: 'EXCLUDED',
            reason: input.reason,
            at: new Date().toISOString(),
            actorId: input.actorId || null,
        });
    }
    return decisions;
}
