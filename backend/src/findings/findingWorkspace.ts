export type FindingSourceKind =
    | 'ASSESSMENT'
    | 'MONITORING'
    | 'MANUAL'
    | 'CONTROL_TEST'
    | 'EVIDENCE'
    | 'PRIVACY'
    | 'AI'
    | 'INSURANCE'
    | 'EXTERNAL';

export type FindingResponsibility = 'VENDOR' | 'INTERNAL' | 'SHARED';

export type FindingSourceSnapshot = {
    sourceKind: FindingSourceKind;
    sourceQuestionId?: string | null;
    sourceQuestionTextAtCreation?: string | null;
    sourceAnswerAtCreation?: string | null;
    sourceAssessmentId?: string | null;
    sourceAssessmentType?: string | null;
    sourceSection?: string | null;
    sourcePack?: string | null;
    sourceControlId?: string | null;
    sourceControlKey?: string | null;
    sourceEvidenceRefs?: string[];
    sourceCreatedAt?: string | null;
    draftRuleCode?: string | null;
    displayTitle?: string | null;
};

export type FindingLike = {
    title: string;
    description?: string | null;
    status: string;
    source?: string | null;
    category?: string | null;
    assessmentId?: string | null;
    questionId?: string | null;
    draftRuleCode?: string | null;
    correctiveActionPlan?: string | null;
    evidenceUrl?: string | null;
    closureEvidence?: string | null;
    validatedAt?: Date | string | null;
    validatedBy?: string | null;
    closedAt?: Date | string | null;
    sourceSnapshot?: FindingSourceSnapshot | null;
    responsibility?: string | null;
};

const GENERIC_PREFIXES = [/^Response needs review:\s*/i, /^Evidence still required:\s*/i];

export function sourceKindFor(issue: FindingLike): FindingSourceKind {
    const stored = issue.sourceSnapshot?.sourceKind;
    if (stored) return stored;
    if (issue.source === 'CONTINUOUS_MONITORING') return 'MONITORING';
    if (issue.source === 'NEWS_MEDIA' || issue.source === 'THIRD_PARTY_REPORT' || issue.source === 'REGULATORY_FINDING') return 'EXTERNAL';
    if (issue.draftRuleCode === 'required_evidence_missing' && !issue.assessmentId) return 'EVIDENCE';
    if (issue.assessmentId) {
        if (/privacy/i.test(issue.category || '')) return 'PRIVACY';
        if (/ai|model/i.test(issue.category || '')) return 'AI';
        if (/insurance/i.test(issue.category || '')) return 'INSURANCE';
        return 'ASSESSMENT';
    }
    if (issue.source === 'INTERNAL_ASSESSMENT' && issue.questionId) return 'ASSESSMENT';
    if (issue.source === 'OTHER' || !issue.source) return 'MANUAL';
    return 'MANUAL';
}

export function sourceLabel(kind: FindingSourceKind, snapshot?: FindingSourceSnapshot | null): string {
    if (kind === 'ASSESSMENT' || kind === 'PRIVACY' || kind === 'AI' || kind === 'INSURANCE') {
        const pack = snapshot?.sourcePack || snapshot?.sourceSection;
        const question = snapshot?.sourceQuestionId;
        const parts = ['Vendor Assessment'];
        if (pack) parts.push(pack);
        if (question) parts.push(`Question ${question}`);
        return parts.join(' → ');
    }
    if (kind === 'MONITORING') return 'Monitoring → External observation';
    if (kind === 'CONTROL_TEST') return 'Control test';
    if (kind === 'EVIDENCE') return 'Evidence review';
    if (kind === 'EXTERNAL') return 'External observation';
    return 'Manual finding';
}

export function observedAnswer(issue: FindingLike): { label: string; recorded: boolean } {
    const snapshotAnswer = issue.sourceSnapshot?.sourceAnswerAtCreation;
    if (snapshotAnswer && snapshotAnswer.trim()) {
        return { label: snapshotAnswer.trim(), recorded: true };
    }
    const description = String(issue.description || '').trim();
    if (!description || /^no response recorded/i.test(description)) {
        return { label: 'No response recorded', recorded: false };
    }
    const first = description.split('.')[0]?.trim() || description;
    if (!first || /^supreme drafted/i.test(first)) {
        return { label: 'No response recorded', recorded: false };
    }
    return { label: first, recorded: true };
}

export function displayTitleFor(issue: FindingLike): string {
    if (issue.sourceSnapshot?.displayTitle) return issue.sourceSnapshot.displayTitle;
    const original = String(issue.title || '').trim();
    const stripped = GENERIC_PREFIXES.reduce((text, prefix) => text.replace(prefix, ''), original).trim();
    if (!GENERIC_PREFIXES.some((prefix) => prefix.test(original))) return original || 'Finding';
    const category = String(issue.category || '').trim() || 'Assessment';
    const topic = topicFromQuestion(stripped || issue.sourceSnapshot?.sourceQuestionTextAtCreation || '');
    const rule = issue.draftRuleCode || issue.sourceSnapshot?.draftRuleCode;
    const condition = rule === 'required_evidence_missing'
        ? `${topic} evidence not attached`
        : rule === 'required_control_partial'
            ? `${topic} requires review`
            : `${topic} not demonstrated`;
    return `${category} — ${condition}`;
}

export function topicFromQuestion(question: string): string {
    const cleaned = question
        .replace(/\?+$/g, '')
        .replace(/^(is there|is a|are there|does the vendor|does your organization|do you have|has the vendor)\s+/i, '')
        .replace(/\s+(defined|documented|in place|established)$/i, '')
        .trim();
    if (!cleaned) return 'Recorded control';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function whyFinding(issue: FindingLike): string {
    const kind = sourceKindFor(issue);
    const rule = issue.draftRuleCode || issue.sourceSnapshot?.draftRuleCode;
    const category = issue.category || 'recorded';
    const question = issue.sourceSnapshot?.sourceQuestionTextAtCreation || GENERIC_PREFIXES.reduce((text, prefix) => text.replace(prefix, ''), issue.title).trim();
    if (kind === 'MANUAL') {
        return 'This finding was recorded manually. The reason is the description provided by the author. It is not an automatic assessment conclusion.';
    }
    if (rule === 'required_evidence_missing') {
        return `This response requires review because required evidence was not attached or is not usable. Missing evidence is unknown, not a control failure.`;
    }
    if (rule === 'required_control_no') {
        return `This response requires review because the recorded answer is not Yes. The ${category} question expects a demonstrated control: ${question}`;
    }
    if (rule === 'required_control_partial') {
        return `This response requires review because the recorded answer is not a clear Yes.`;
    }
    if (kind === 'MONITORING' || kind === 'EXTERNAL') {
        return 'This finding was created from a recorded observation. The observation is not itself a legal determination.';
    }
    return 'Supreme drafted this finding from a recorded source. Review the observed condition before treating it as confirmed.';
}

export function nextAction(issue: FindingLike): { key: string; label: string; detail: string; primary: 'plan' | 'await' | 'verify' | 'close' | 'none' } {
    const status = issue.status;
    if (status === 'CLOSED' || status === 'RISK_ACCEPTED') {
        return { key: 'closed', label: 'Closed', detail: 'Reopen only if an authorized reviewer records a new observation.', primary: 'none' };
    }
    if (status === 'RESOLVED' || issue.validatedAt) {
        return { key: 'close', label: 'Close finding', detail: 'Verification is recorded. Close only with required evidence and an authorized role.', primary: 'close' };
    }
    if (status === 'PENDING_VALIDATION' || issue.evidenceUrl || issue.closureEvidence) {
        return { key: 'verify', label: 'Verify remediation', detail: 'Record who verified and what was checked. Verification is not closure.', primary: 'verify' };
    }
    if (issue.correctiveActionPlan?.trim()) {
        return { key: 'await', label: 'Await remediation', detail: 'A plan is recorded. Wait for evidence or record verification when work is done.', primary: 'await' };
    }
    return { key: 'plan', label: 'Record remediation plan', detail: 'Capture the corrective action, owner, and target date before closing.', primary: 'plan' };
}

export function responsibilityLabel(value?: string | null): string {
    if (value === 'VENDOR') return 'Vendor remediation';
    if (value === 'SHARED') return 'Shared remediation';
    if (value === 'INTERNAL') return 'Internal remediation';
    return 'Responsibility not recorded';
}

export function buildSnapshot(input: {
    kind: FindingSourceKind;
    questionId?: string | null;
    questionText?: string | null;
    answer?: string | null;
    assessmentId?: string | null;
    assessmentType?: string | null;
    section?: string | null;
    pack?: string | null;
    controlKey?: string | null;
    evidenceRefs?: string[];
    draftRuleCode?: string | null;
    title?: string;
    category?: string | null;
}): FindingSourceSnapshot {
    const snapshot: FindingSourceSnapshot = {
        sourceKind: input.kind,
        sourceQuestionId: input.questionId || null,
        sourceQuestionTextAtCreation: input.questionText || null,
        sourceAnswerAtCreation: input.answer && input.answer.trim() ? input.answer.trim() : null,
        sourceAssessmentId: input.assessmentId || null,
        sourceAssessmentType: input.assessmentType || null,
        sourceSection: input.section || null,
        sourcePack: input.pack || null,
        sourceControlKey: input.controlKey || null,
        sourceEvidenceRefs: input.evidenceRefs || [],
        sourceCreatedAt: new Date().toISOString(),
        draftRuleCode: input.draftRuleCode || null,
    };
    snapshot.displayTitle = displayTitleFor({
        title: input.title || input.questionText || 'Finding',
        category: input.category,
        draftRuleCode: input.draftRuleCode,
        sourceSnapshot: snapshot,
        status: 'OPEN',
    });
    return snapshot;
}
