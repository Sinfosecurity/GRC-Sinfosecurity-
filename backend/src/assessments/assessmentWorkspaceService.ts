import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { displayRiskTier, isUnratedTier, presentResidualScore } from '../governance/recordHonesty';
import { displayTitleFor, sourceKindFor } from '../findings/findingWorkspace';

export async function getAssessmentWorkspace(organizationId: string, assessmentId: string) {
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { id: assessmentId, organizationId },
        include: {
            vendor: { select: { id: true, name: true, tier: true, residualRiskScore: true, publicId: true } },
            responses: { orderBy: { questionId: 'asc' } },
            evidence: { orderBy: { uploadedAt: 'desc' }, take: 40 },
        },
    });
    if (!assessment) throw new ApiError(404, 'Assessment not found');

    const [findings, template, briefs] = await Promise.all([
        prisma.vendorIssue.findMany({
            where: { organizationId, assessmentId: assessment.id },
            select: { id: true, title: true, severity: true, status: true, sourceSnapshot: true, draftRuleCode: true, source: true, category: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        assessment.templateId
            ? prisma.questionnaireTemplate.findFirst({
                where: { id: assessment.templateId },
                select: { id: true, name: true, version: true, framework: true },
            })
            : Promise.resolve(null),
        prisma.riskDecisionBrief.findMany({
            where: { organizationId, vendorId: assessment.vendorId },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { id: true, status: true, humanDecision: true, createdAt: true },
        }),
    ]);

    const unanswered = assessment.responses.filter((row) => !String(row.response || '').trim());
    const dontKnow = assessment.responses.filter((row) => /don'?t know|unknown|not sure/i.test(String(row.response || '')));
    const negative = assessment.responses.filter((row) => /^(no|partial)$/i.test(String(row.response || '').trim()));
    const evidenceRequired = assessment.responses.filter((row) => row.evidenceRequired);
    const evidenceReceived = assessment.evidence.length;
    const evidenceOutstanding = evidenceRequired.filter((row) => !row.hasEvidence).length;

    const next = (() => {
        const status = String(assessment.status);
        if (status === 'COMPLETED' || status === 'PENDING_REVIEW') {
            return { key: 'review', label: 'Review responses', detail: 'Read the outcome and key responses. Do not re-walk every question unless you need the original wording.' };
        }
        if (status === 'IN_PROGRESS' || status === 'NOT_STARTED') {
            return { key: 'continue', label: 'Continue questionnaire', detail: 'Answers are incomplete.' };
        }
        return { key: 'open', label: 'Open assessment', detail: 'Review the recorded state.' };
    })();

    return {
        honesty: {
            unansweredIsNotNo: 'Unanswered is not No.',
            noEvidenceIsNotFailure: 'Outstanding evidence is not a control failure.',
            scoreIsNotCertification: 'An assessment score is not certification.',
        },
        header: {
            id: assessment.id,
            vendorId: assessment.vendorId,
            vendorName: assessment.vendor.name,
            type: assessment.assessmentType,
            templateName: template?.name || assessment.frameworkUsed || 'Assessment',
            templateVersion: assessment.templateVersion || template?.version || null,
            framework: template?.framework || assessment.frameworkUsed || null,
            status: assessment.status,
            createdAt: assessment.createdAt,
            completedAt: assessment.completedAt,
            dueDate: assessment.dueDate,
            reviewer: assessment.reviewer || assessment.assignedTo || null,
        },
        scope: {
            why: 'This assessment was generated from the recorded third-party intake and pack composition.',
            vendorTier: displayRiskTier(assessment.vendor.tier),
            pack: assessment.frameworkUsed || template?.name || 'Not recorded',
            questionCount: assessment.responses.length,
        },
        outcome: {
            score: assessment.overallScore,
            unanswered: unanswered.length,
            evidenceGaps: evidenceOutstanding,
            findingsGenerated: findings.length,
            openFindings: findings.filter((row) => !/CLOSED|RESOLVED|RISK_ACCEPTED/i.test(row.status)).length,
            decisionStatus: briefs[0]?.humanDecision || briefs[0]?.status || 'No decision recorded',
        },
        keyResponses: [...dontKnow, ...negative].slice(0, 12).map((row) => ({
            questionId: row.questionId,
            question: row.questionText,
            answer: row.response || 'No response recorded',
            recorded: Boolean(String(row.response || '').trim()),
        })),
        evidence: {
            received: evidenceReceived,
            outstanding: evidenceOutstanding,
            items: assessment.evidence.map((row) => ({
                id: row.id,
                title: row.title,
                filename: row.fileName,
                usable: row.scanStatus === 'CLEAN',
            })),
            empty: evidenceReceived === 0 ? 'No supporting evidence is currently attached.' : null,
        },
        findings: findings.map((row) => ({
            id: row.id,
            title: displayTitleFor(row as never),
            severity: row.severity,
            status: row.status,
            source: sourceKindFor(row as never),
            href: `/findings?issueId=${row.id}`,
        })),
        review: {
            reviewer: assessment.reviewer || null,
            recommendation: briefs[0]?.humanDecision || null,
            status: briefs[0]?.status || null,
        },
        nextAction: next,
        risk: {
            vendorTier: displayRiskTier(assessment.vendor.tier),
            residual: presentResidualScore(assessment.vendor.residualRiskScore, assessment.vendor.tier),
            residualHonesty: isUnratedTier(assessment.vendor.tier)
                ? 'Vendor tier is Not rated. Residual is not scored from an unrated record.'
                : 'Residual is vendor metadata. It is not a compliance percentage.',
        },
        history: [
            { at: assessment.createdAt, label: 'Assessment created' },
            assessment.submittedAt ? { at: assessment.submittedAt, label: 'Submitted' } : null,
            assessment.completedAt ? { at: assessment.completedAt, label: 'Completed' } : null,
            assessment.approvedAt ? { at: assessment.approvedAt, label: 'Reviewed' } : null,
        ].filter(Boolean),
    };
}
