export type ReviewSignalRule = 'required_control_no' | 'required_evidence_missing' | '';

export function isNegativeAnswer(answer: string | null | undefined) {
    const value = String(answer || '').trim().toLowerCase();
    return value === 'no' || value === 'false' || value.startsWith('no ') || value.startsWith('no,');
}

export function reviewSignalRule(input: {
    answer?: string | null;
    evidenceRequired?: boolean;
    evidenceClean?: boolean;
    specialistConclusion?: string | null;
}): ReviewSignalRule {
    const answer = String(input.answer || '').trim();
    if (!answer) return '';
    if (isNegativeAnswer(answer)) return 'required_control_no';
    const reviewMissing = String(input.specialistConclusion || '') === 'Evidence missing';
    if ((input.evidenceRequired && !input.evidenceClean) || reviewMissing) return 'required_evidence_missing';
    return '';
}

export function isSpecialistJudgedCandidate(snapshot: unknown, draftRuleCode?: string | null) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot as { specialistJudged?: boolean; candidateClass?: string } : {};
    if (source.specialistJudged === true || source.candidateClass === 'FINDING_CANDIDATE') return true;
    if (draftRuleCode === 'specialist_judgment') return true;
    return false;
}

export function isAutomatedReviewSignalIssue(snapshot: unknown, draftRuleCode?: string | null) {
    if (isSpecialistJudgedCandidate(snapshot, draftRuleCode)) return false;
    return draftRuleCode === 'required_control_no' || draftRuleCode === 'required_evidence_missing';
}

export function reviewSignalHonesty() {
    return {
        questionIsNotFinding: true,
        answerIsNotFinding: true,
        negativeAnswerIsNotFinding: true,
        missingEvidenceIsNotFinding: true,
        note: 'A negative answer or missing required evidence is a review signal. It is not a Finding Candidate until a specialist records judgment.',
    };
}
