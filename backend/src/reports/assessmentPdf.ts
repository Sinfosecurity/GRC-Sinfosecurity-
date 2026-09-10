import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
import { isoDate } from './sendDownload';

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

    const template = assessment.templateId
        ? await prisma.questionnaireTemplate.findFirst({
            where: {
                id: assessment.templateId,
                OR: [{ organizationId }, { organizationId: null }],
            },
            include: { sections: { orderBy: { sortOrder: 'asc' }, include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
        })
        : null;

    const reportDate = isoDate(assessment.createdAt);
    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: organization?.name || 'Organization',
            title: 'Vendor Assessment Report',
            subtitle: `${assessment.vendor.name}  ·  ${assessment.assessmentType}`,
            reportDate,
        });
        drawSection(doc, {
            heading: 'Assessment metadata',
            rows: [
                ['Vendor', assessment.vendor.name],
                ['Type', assessment.assessmentType],
                ['Status', assessment.status],
                ['Framework', assessment.frameworkUsed || '—'],
                ['Template', template?.name || assessment.templateId || '—'],
                ['Template version', assessment.templateVersion || template?.version || '—'],
                ['Score version', assessment.scoreVersion || '—'],
                ['Due date', isoDate(assessment.dueDate)],
                ['Completed', isoDate(assessment.completedAt)],
                ['Reviewer', assessment.reviewer || '—'],
            ],
        });
        drawSection(doc, {
            heading: 'Scoring',
            rows: [
                ['Overall', String(assessment.overallScore ?? '—')],
                ['Security', String(assessment.securityScore ?? '—')],
                ['Privacy', String(assessment.privacyScore ?? '—')],
                ['Compliance', String(assessment.complianceScore ?? '—')],
                ['Operational', String(assessment.operationalScore ?? '—')],
            ],
        });
        (template?.sections || []).forEach((section) => {
            drawSection(doc, {
                heading: section.title,
                bullets: section.questions.map((question) => {
                    const response = assessment.responses.find((row) => row.questionId === question.questionKey);
                    return `${question.questionText} → ${response?.response || 'Unanswered'} (score ${response?.score ?? '—'}/${response?.maxScore ?? question.weight})`;
                }),
            });
        });
        if (!template) {
            drawSection(doc, {
                heading: 'Questions and responses',
                bullets: assessment.responses.map((row) => `${row.questionText || row.questionId}: ${row.response || 'Unanswered'} (${row.score ?? '—'}/${row.maxScore}) ${row.reviewerComment ? `Reviewer: ${row.reviewerComment}` : ''}`),
            });
        } else {
            const reviewerNotes = assessment.responses.filter((row) => row.reviewerComment || row.notes);
            if (reviewerNotes.length) {
                drawSection(doc, {
                    heading: 'Reviewer comments',
                    bullets: reviewerNotes.map((row) => `${row.questionId}: ${row.reviewerComment || row.notes}`),
                });
            }
        }
        drawSection(doc, {
            heading: 'Evidence references',
            bullets: assessment.evidence.length
                ? assessment.evidence.map((row) => `${row.title} (${row.fileName}) · scan ${row.scanStatus}`)
                : ['No evidence linked to this assessment.'],
        });
        drawSection(doc, {
            heading: 'Gaps',
            bullets: asList(assessment.gapsIdentified).length ? asList(assessment.gapsIdentified) : ['No gaps recorded.'],
        });
        drawSection(doc, {
            heading: 'Final outcome',
            rows: [
                ['Status', assessment.status],
                ['Overall score', String(assessment.overallScore ?? '—')],
            ],
            bullets: asList(assessment.recommendations),
        });
        drawFooter(doc, 'Assessment report uses persisted questionnaire and response records only.');
    });

    return { buffer, filenameParts: ['Supreme-Risk-Assessment', assessment.vendor.name, reportDate] };
}
