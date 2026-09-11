import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { addReportPage, createReportPdf, ensureSpace } from './reportLayout';
import { drawBarChart } from './reportCharts';
import {
    drawBullets,
    drawCallout,
    drawKeyValueGrid,
    drawKpiRow,
    drawParagraph,
    drawProfessionalTable,
    drawSectionTitle,
} from './reportPrimitives';
import { humanizeEnum, reportId, riskTone } from './reportTheme';
import { isoDate } from './sendDownload';

function decodeEntities(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
}

function asList(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                const record = item as Record<string, unknown>;
                return String(record.title || record.question || record.description || JSON.stringify(item));
            }
            return String(item);
        });
    }
    return [String(value)];
}

export async function renderAssessmentPdf(organizationId: string, assessmentId: string) {
    const [organization, assessment] = await Promise.all([
        prisma.organization.findFirst({ where: { id: organizationId }, select: { name: true } }),
        prisma.vendorAssessment.findFirst({
            where: { id: assessmentId, organizationId },
            include: {
                vendor: { select: { id: true, name: true, tier: true } },
                responses: { orderBy: [{ questionCategory: 'asc' }, { questionId: 'asc' }] },
                evidence: { orderBy: { uploadedAt: 'desc' } },
            },
        }),
    ]);
    if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
    }

    const [template, findings] = await Promise.all([
        assessment.templateId
            ? prisma.questionnaireTemplate.findFirst({
                where: {
                    id: assessment.templateId,
                    OR: [{ organizationId }, { organizationId: null }],
                },
                include: { sections: { orderBy: { sortOrder: 'asc' }, include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
            })
            : Promise.resolve(null),
        prisma.vendorIssue.findMany({
            where: { organizationId, vendorId: assessment.vendorId },
            orderBy: { identifiedDate: 'desc' },
            take: 12,
        }),
    ]);

    const requiredEvidence = assessment.responses.filter((row) => row.evidenceRequired);
    const evidenceComplete = requiredEvidence.length
        ? Math.round((requiredEvidence.filter((row) => row.hasEvidence).length / requiredEvidence.length) * 100)
        : (assessment.evidence.length ? 100 : 0);

    const sectionScores = (template?.sections || []).map((section) => {
        const keys = new Set(section.questions.map((question) => question.questionKey));
        const rows = assessment.responses.filter((row) => keys.has(row.questionId));
        const earned = rows.reduce((sum, row) => sum + (row.score ?? 0), 0);
        const max = rows.reduce((sum, row) => sum + (row.maxScore || 0), 0);
        return { label: section.title, value: max ? Math.round((earned / max) * 100) : 0 };
    });
    const categoryScores = Object.entries(
        assessment.responses.reduce<Record<string, { earned: number; max: number }>>((acc, row) => {
            const key = row.questionCategory || 'Unspecified';
            acc[key] = acc[key] || { earned: 0, max: 0 };
            acc[key].earned += row.score ?? 0;
            acc[key].max += row.maxScore || 0;
            return acc;
        }, {})
    ).map(([label, totals]) => ({ label, value: totals.max ? Math.round((totals.earned / totals.max) * 100) : 0 }));

    const scoreBars = sectionScores.length ? sectionScores : categoryScores;
    const gaps = asList(assessment.gapsIdentified);
    const recommendations = asList(assessment.recommendations);
    const unanswered = assessment.responses.filter((row) => !row.response).length;
    const reportDate = isoDate(assessment.createdAt);

    const buffer = await createReportPdf({
        title: 'Vendor Assessment Report',
        subtitle: `${assessment.vendor.name}  ·  ${humanizeEnum(assessment.assessmentType)}`,
        organizationName: organization?.name || 'Organization',
        reportDate,
        generatedAt: assessment.createdAt,
        reportId: reportId('ASM', assessment.createdAt),
        classification: 'Confidential — Assessment',
        methodologyVersion: assessment.scoreVersion || template?.version || undefined,
        footerNote: 'Persisted questionnaire and response records only',
    }, (doc) => {
        drawSectionTitle(doc, 'Cover summary');
        drawKpiRow(doc, [
            { label: 'Overall score', value: assessment.overallScore ?? '—', tone: assessment.overallScore != null ? riskTone(100 - Number(assessment.overallScore)) : 'neutral' },
            { label: 'Status', value: humanizeEnum(assessment.status), tone: riskTone(assessment.status) },
            { label: 'Evidence complete', value: `${evidenceComplete}%`, tone: evidenceComplete >= 80 ? 'low' : evidenceComplete >= 50 ? 'medium' : 'high' },
            { label: 'Key gaps', value: gaps.length, tone: gaps.length ? 'high' : 'low' },
        ]);
        drawKeyValueGrid(doc, [
            ['Vendor', assessment.vendor.name],
            ['Criticality', humanizeEnum(assessment.vendor.tier)],
            ['Assessment type', humanizeEnum(assessment.assessmentType)],
            ['Framework', assessment.frameworkUsed || '—'],
            ['Template', template?.name || assessment.templateId || '—'],
            ['Template version', assessment.templateVersion || template?.version || '—'],
            ['Due date', isoDate(assessment.dueDate)],
            ['Completed', isoDate(assessment.completedAt)],
            ['Reviewer', assessment.reviewer || '—'],
            ['Approver', assessment.approver || '—'],
        ]);

        drawBarChart(doc, 'Section scores', scoreBars, 'Section or category scores appear after questionnaire responses are recorded.');
        drawBarChart(
            doc,
            'Domain scores',
            [
                { label: 'Security', value: assessment.securityScore ?? 0 },
                { label: 'Privacy', value: assessment.privacyScore ?? 0 },
                { label: 'Compliance', value: assessment.complianceScore ?? 0 },
                { label: 'Operational', value: assessment.operationalScore ?? 0 },
            ].filter((row) => row.value > 0),
            'Domain scores are shown when the assessment has persisted domain totals.'
        );

        ensureSpace(doc, 160);
        drawSectionTitle(doc, 'Evidence completeness');
        drawParagraph(doc,
            requiredEvidence.length
                ? `${requiredEvidence.filter((row) => row.hasEvidence).length} of ${requiredEvidence.length} evidence-required questions have linked evidence. ${assessment.evidence.length} object(s) are attached to this assessment.`
                : assessment.evidence.length
                    ? `${assessment.evidence.length} evidence object(s) are linked. No questions on this assessment were marked as requiring evidence.`
                    : 'No evidence objects are linked to this assessment.'
        );
        drawProfessionalTable(
            doc,
            [
                { key: 'title', header: 'Evidence', width: 240 },
                { key: 'file', header: 'File', width: 180 },
                { key: 'scan', header: 'Scan', width: 104, badge: true },
            ],
            assessment.evidence.slice(0, 8).map((row) => ({
                title: row.title,
                file: row.fileName,
                scan: row.scanStatus,
            })),
            'No evidence linked',
            'Evidence uploaded against this assessment will appear here.'
        );

        drawSectionTitle(doc, 'Key gaps');
        if (gaps.length) {
            drawBullets(doc, gaps);
        } else {
            drawCallout(doc, 'No gaps recorded', unanswered ? `${unanswered} question(s) remain unanswered, but no structured gaps were stored on the assessment.` : 'The assessment record does not list structured gaps.', 'info');
        }

        drawSectionTitle(doc, 'Findings');
        drawProfessionalTable(
            doc,
            [
                { key: 'title', header: 'Finding', width: 250 },
                { key: 'severity', header: 'Severity', width: 90, badge: true },
                { key: 'status', header: 'Status', width: 100, badge: true },
                { key: 'due', header: 'Target', width: 84 },
            ],
            findings.slice(0, 10).map((issue) => ({
                title: issue.title,
                severity: issue.severity,
                status: issue.status,
                due: isoDate(issue.targetRemediationDate),
            })),
            'No findings for this vendor',
            'Vendor issues associated with this vendor will appear after they are recorded.'
        );

        drawSectionTitle(doc, 'Reviewer conclusion');
        const reviewerNotes = assessment.responses.filter((row) => row.reviewerComment || row.notes);
        if (assessment.reviewer || recommendations.length || reviewerNotes.length) {
            if (assessment.reviewer) {
                drawParagraph(doc, `Reviewer: ${assessment.reviewer}. Status ${humanizeEnum(assessment.status)}. Overall score ${assessment.overallScore ?? 'not scored'}.`);
            }
            if (recommendations.length) {
                drawBullets(doc, recommendations);
            }
            if (reviewerNotes.length) {
                drawBullets(doc, reviewerNotes.slice(0, 8).map((row) => `${row.questionText || row.questionId}: ${row.reviewerComment || row.notes}`));
            }
        } else {
            drawCallout(doc, 'No reviewer conclusion recorded', 'A reviewer name, recommendations, or question-level comments will appear here when persisted.', 'info');
        }

        addReportPage(doc);
        drawSectionTitle(doc, 'Questionnaire appendix');
        drawParagraph(doc, 'Question-level detail is provided in this appendix so the cover remains a management summary.');
        if (template?.sections?.length) {
            template.sections.forEach((section) => {
                drawSectionTitle(doc, section.title);
                drawProfessionalTable(
                    doc,
                    [
                        { key: 'question', header: 'Question', width: 250 },
                        { key: 'response', header: 'Response', width: 140 },
                        { key: 'score', header: 'Score', width: 70, align: 'right' },
                        { key: 'comment', header: 'Reviewer', width: 64 },
                    ],
                    section.questions.map((question) => {
                        const response = assessment.responses.find((row) => row.questionId === question.questionKey);
                        return {
                            question: decodeEntities(question.questionText),
                            response: decodeEntities(response?.response || 'Unanswered'),
                            score: `${response?.score ?? '—'} / ${response?.maxScore ?? question.weight}`,
                            comment: response?.reviewerComment || response?.notes || '—',
                        };
                    }),
                    'No questions in section',
                    'This template section has no questions.'
                );
            });
        } else if (assessment.responses.length) {
            drawProfessionalTable(
                doc,
                [
                    { key: 'question', header: 'Question', width: 250 },
                    { key: 'response', header: 'Response', width: 140 },
                    { key: 'score', header: 'Score', width: 70, align: 'right' },
                    { key: 'comment', header: 'Reviewer', width: 64 },
                ],
                assessment.responses.map((row) => ({
                    question: decodeEntities(row.questionText || row.questionId),
                    response: decodeEntities(row.response || 'Unanswered'),
                    score: `${row.score ?? '—'} / ${row.maxScore}`,
                    comment: row.reviewerComment || row.notes || '—',
                })),
                'No responses',
                'Responses will appear after the questionnaire is completed.'
            );
        } else {
            drawCallout(doc, 'No questionnaire responses', 'This assessment does not yet have persisted question responses.', 'info');
        }
    });

    return { buffer, filenameParts: ['Supreme-Risk-Assessment', assessment.vendor.name, reportDate] };
}
