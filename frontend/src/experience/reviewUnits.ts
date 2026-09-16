export type ReviewItem = {
    assessmentId?: string;
    assessmentName?: string;
    questionId?: string;
    question?: string;
    response?: string;
    score?: number | null;
    reason?: string;
    findingId?: string | null;
    reviewState?: string | null;
    priority?: string;
};

export type ReviewKind = 'material' | 'clarification' | 'evidence' | 'other';

export type ReviewUnit = {
    id: string;
    kind: ReviewKind;
    title: string;
    why: string;
    pack: string;
    related: number;
    evidenceCount: number;
    findingId?: string | null;
    reviewState?: string | null;
    action: string;
    items: ReviewItem[];
};

export type ReviewBundle = {
    material: ReviewUnit[];
    clarifications: ReviewUnit[];
    evidence: ReviewUnit[];
    other: ReviewUnit[];
    satisfactory: number;
    totalResponses: number;
    potentialFindings: number;
    needClarification: number;
};

export function classifyReviewItem(item: ReviewItem): ReviewKind {
    const reason = String(item.reason || '').toLowerCase();
    if (reason.includes('evidence')) return 'evidence';
    if (item.findingId) return 'material';
    if (reason.includes('not answered') || reason.includes('n/a') || reason.includes('clarif')) return 'clarification';
    if (!item.findingId) return 'clarification';
    return 'other';
}

function issueTitle(item: ReviewItem, kind: ReviewKind) {
    const pack = item.assessmentName || 'Assessment';
    const reason = String(item.reason || '');
    if (kind === 'evidence') return `${pack}: evidence still needed`;
    if (kind === 'clarification' && /not answered/i.test(reason)) return `${pack}: unanswered questions`;
    if (kind === 'clarification' && /n\/a|not applicable/i.test(reason)) return `${pack}: applicability to confirm`;
    if (/does not satisfy/i.test(reason)) return `${pack}: requirement not met`;
    if (/partial/i.test(reason)) return `${pack}: partial answers`;
    return `${pack}: ${reason.split('—')[0].split('.')[0] || 'Needs review'}`;
}

function unitAction(kind: ReviewKind, items: ReviewItem[]) {
    if (kind === 'clarification') return `Review ${items.length} clarification${items.length === 1 ? '' : 's'}`;
    if (kind === 'evidence') return `Review ${items.length} evidence issue${items.length === 1 ? '' : 's'}`;
    if (items.some((item) => item.reviewState === 'DRAFT' && item.findingId)) return 'Review issue';
    if (items.some((item) => item.findingId)) return 'Open related finding';
    return 'Review issue';
}

export function groupReviewItems(
    items: ReviewItem[] = [],
    counts: { satisfactory?: number; questionsAnswered?: number; totalResponses?: number; potentialFindings?: number; needClarification?: number } = {},
): ReviewBundle {
    const buckets = new Map<string, ReviewUnit>();
    for (const item of items) {
        const kind = classifyReviewItem(item);
        const key = `${kind}::${item.assessmentName || 'Assessment'}::${String(item.reason || 'review')}`;
        const current = buckets.get(key);
        if (current) {
            current.items.push(item);
            current.related += 1;
            if (String(item.reason || '').toLowerCase().includes('evidence')) current.evidenceCount += 1;
            if (!current.findingId && item.findingId) {
                current.findingId = item.findingId;
                current.reviewState = item.reviewState;
            }
            current.action = unitAction(kind, current.items);
            continue;
        }
        buckets.set(key, {
            id: key,
            kind,
            title: issueTitle(item, kind),
            why: item.reason || 'This answer needs a human judgment.',
            pack: item.assessmentName || 'Assessment',
            related: 1,
            evidenceCount: String(item.reason || '').toLowerCase().includes('evidence') ? 1 : 0,
            findingId: item.findingId,
            reviewState: item.reviewState,
            action: unitAction(kind, [item]),
            items: [item],
        });
    }
    const units = [...buckets.values()];
    const kindRank = { material: 0, evidence: 1, clarification: 2, other: 3 };
    const priorityRank = (unit: ReviewUnit) => (unit.items.some((item) => item.priority === 'high') ? 0 : 1);
    units.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || priorityRank(a) - priorityRank(b) || b.related - a.related);
    return {
        material: units.filter((row) => row.kind === 'material'),
        clarifications: units.filter((row) => row.kind === 'clarification'),
        evidence: units.filter((row) => row.kind === 'evidence'),
        other: units.filter((row) => row.kind === 'other'),
        satisfactory: Number(counts.satisfactory || 0),
        totalResponses: Number(counts.questionsAnswered || counts.totalResponses || 0),
        potentialFindings: Number(counts.potentialFindings || 0),
        needClarification: Number(counts.needClarification || 0),
    };
}

export function decisionReadiness(stage?: string | null, bundle?: ReviewBundle) {
    const key = String(stage || '');
    if (['APPROVAL', 'CONTRACT_REVIEW', 'Approval', 'Contract review'].includes(key)) return 'Ready for approval';
    if (['RISK_ACCEPTANCE', 'Risk acceptance'].includes(key)) return 'Risk decision required';
    if (['REMEDIATION', 'Remediation'].includes(key)) return 'Remediation in progress';
    if ((bundle?.clarifications.length || 0) > 0 && !(bundle?.material.length)) return 'Waiting on vendor clarification';
    if ((bundle?.material.length || 0) > 0 || (bundle?.evidence.length || 0) > 0) return 'Review required';
    if (['SUBMITTED', 'UNDER_REVIEW', 'Submitted', 'Under review'].includes(key)) return 'Review required';
    return 'Review recorded';
}

export function reviewPrimaryAction(bundle: ReviewBundle, stage?: string | null) {
    const ready = decisionReadiness(stage, bundle);
    if (ready === 'Ready for approval') return { label: 'Make approval decision', detail: 'Supreme prepared the decision brief.' };
    if (ready === 'Risk decision required') return { label: 'Record risk decision', detail: 'Acceptance does not reduce residual risk.' };
    if (ready === 'Remediation in progress') return { label: 'Validate remediation', detail: 'Close only with ready evidence.' };
    if (bundle.material.length) return { label: `Review ${bundle.material.length} material issue${bundle.material.length === 1 ? '' : 's'}`, detail: 'Related responses stay grouped. Satisfactory answers stay in the full assessment.' };
    if (bundle.clarifications.length) return { label: `Review ${bundle.clarifications.length} clarification${bundle.clarifications.length === 1 ? '' : 's'}`, detail: 'These answers need a person before they become findings.' };
    if (bundle.evidence.length) return { label: `Review ${bundle.evidence.length} evidence issue${bundle.evidence.length === 1 ? '' : 's'}`, detail: 'Use recorded scan and completeness state only.' };
    return { label: 'View full assessment', detail: 'No grouped exceptions remain.' };
}
