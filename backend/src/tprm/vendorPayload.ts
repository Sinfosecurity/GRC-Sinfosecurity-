const FORBIDDEN_VENDOR_KEYS = [
    'weight',
    'score',
    'maxScore',
    'maximumScore',
    'scoringContribution',
    'inherentRisk',
    'inherentRiskScore',
    'residualRisk',
    'residualRiskScore',
    'recommendedTier',
    'confirmedTier',
    'tier',
    'tierKey',
    'scopeAnswer',
    'scopeAnswers',
    'irAnswers',
    'intakeAnswers',
    'packReason',
    'packReasons',
    'packSelection',
    'analystNotes',
    'reviewerComment',
    'internalNotes',
    'findings',
    'unresolvedScope',
    'hardFloors',
    'factors',
];

const ALLOWED_QUESTION_KEYS = new Set([
    'key',
    'controlId',
    'domain',
    'topic',
    'question',
    'guidance',
    'expectedEvidence',
    'section',
    'type',
    'options',
    'required',
    'evidenceRequired',
    'evidenceOptional',
    'evidenceExpectation',
    'response',
    'comment',
    'hasEvidence',
    'evidenceStatus',
    'visible',
    'locked',
]);

export function parseWorkbookQuestionText(text: string) {
    const raw = String(text || '');
    const question = raw.split('\n\n')[0] || raw;
    const guidanceMatch = raw.match(/Guidance:\s*([\s\S]*?)(?:\n\nExpected evidence:|$)/);
    const evidenceMatch = raw.match(/Expected evidence:\s*([\s\S]*?)(?:\n\nTopic:|$)/);
    const topicMatch = raw.match(/Topic:\s*([\s\S]*)$/);
    return {
        question: question.trim(),
        guidance: guidanceMatch?.[1]?.trim() || null,
        expectedEvidence: evidenceMatch?.[1]?.trim() || null,
        topic: topicMatch?.[1]?.trim() || null,
    };
}

export function presentVendorQuestion(input: {
    key: string;
    question: string;
    domain?: string | null;
    topic?: string | null;
    guidance?: string | null;
    expectedEvidence?: string | null;
    options?: string[];
    required?: boolean;
    evidenceRequired?: boolean;
    evidenceOptional?: boolean;
    evidenceExpectation?: 'REQUIRED' | 'OPTIONAL' | 'NOT_REQUIRED';
    response?: string | null;
    comment?: string | null;
    hasEvidence?: boolean;
    evidenceStatus?: string | null;
    visible?: boolean;
    locked?: boolean;
}) {
    const parsed = parseWorkbookQuestionText(input.question);
    return {
        key: input.key,
        controlId: input.key,
        domain: input.domain || parsed.topic || 'Assessment',
        topic: input.topic || parsed.topic || input.domain || 'Assessment',
        question: parsed.question,
        guidance: input.guidance || parsed.guidance,
        expectedEvidence: input.expectedEvidence || parsed.expectedEvidence,
        section: input.domain || parsed.topic || 'Assessment',
        type: 'SINGLE_CHOICE',
        options: input.options?.length ? input.options : ['Yes', 'Partial', 'No', 'N/A'],
        required: input.required !== false,
        evidenceRequired: Boolean(input.evidenceRequired),
        evidenceOptional: Boolean(input.evidenceOptional),
        evidenceExpectation: input.evidenceExpectation || (input.evidenceRequired ? 'REQUIRED' : input.evidenceOptional ? 'OPTIONAL' : 'NOT_REQUIRED'),
        response: input.response || '',
        comment: input.comment || '',
        hasEvidence: Boolean(input.hasEvidence),
        evidenceStatus: input.evidenceStatus || null,
        visible: input.visible !== false,
        locked: Boolean(input.locked),
    };
}

export function sanitizeVendorPayload<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeVendorPayload(item)) as T;
    }
    if (value && typeof value === 'object') {
        const next: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (FORBIDDEN_VENDOR_KEYS.includes(key)) continue;
            next[key] = sanitizeVendorPayload(item);
        }
        return next as T;
    }
    return value;
}

export function sanitizeVendorQuestions<T extends Record<string, unknown>>(questions: T[]) {
    return questions.map((question) => {
        const next: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(question)) {
            if (ALLOWED_QUESTION_KEYS.has(key)) next[key] = value;
        }
        return next as T;
    });
}

export function assertVendorBoundary(payload: unknown) {
    const blob = JSON.stringify(payload);
    for (const key of FORBIDDEN_VENDOR_KEYS) {
        if (new RegExp(`"${key}"\\s*:`).test(blob)) {
            throw new Error(`Vendor payload leaked internal field: ${key}`);
        }
    }
}
