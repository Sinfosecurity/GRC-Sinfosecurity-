import { createReportPdf } from './reportLayout';
import { drawBullets, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { reportId } from './reportTheme';
import { enterpriseIntelligenceService } from '../services/enterpriseIntelligenceService';
import { honestyCopy } from '../services/enterpriseIntelligenceEngine';
import { isoDate } from './sendDownload';

export async function renderIntelligencePdf(organizationId: string, role: string, actorUserId: string | undefined, _kind: string) {
    const generatedAt = new Date();
    const pack = await enterpriseIntelligenceService.pack(organizationId, role, actorUserId);
    const workspace = pack.workspace;
    return createReportPdf({
        title: 'Supreme Intelligence Brief',
        subtitle: 'Derived from live governed records. Intelligence interprets. Humans decide.',
        organizationName: pack.name,
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('INT', generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `Generated ${isoDate(generatedAt)}.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Executive summary');
        drawParagraph(doc, honestyCopy());
        drawParagraph(doc, workspace.period?.available
            ? workspace.period.label
            : 'Trend not yet established. Period comparison is shown only when recorded history supports it.');
        drawSectionTitle(doc, 'Critical attention');
        drawProfessionalTable(
            doc,
            [
                { key: 'id', header: 'Item', width: 80 },
                { key: 'title', header: 'What happened', width: 180 },
                { key: 'why', header: 'Why it matters', width: 200 },
                { key: 'next', header: 'Review next', width: 140 },
            ],
            workspace.criticalAttention.slice(0, 8).map((row: { publicId: string; title: string; whyItMatters: string; reviewGuidance: string }) => ({
                id: row.publicId,
                title: row.title,
                why: row.whyItMatters,
                next: row.reviewGuidance,
            })),
            'No critical attention',
            'No critical attention is currently recorded.'
        );
        drawSectionTitle(doc, 'Top changes');
        drawBullets(doc, workspace.whatChanged.slice(0, 8).map((row: { publicId: string; title: string }) => `${row.publicId} · ${row.title}`).concat(workspace.whatChanged.length ? [] : ['No material change is currently recorded.']));
        drawSectionTitle(doc, 'Decisions required');
        drawBullets(doc, workspace.decisionsToWatch.slice(0, 8).map((row: { publicId: string; title: string }) => `${row.publicId} · ${row.title}`).concat(workspace.decisionsToWatch.length ? [] : ['No decision is waiting on a person.']));
        drawSectionTitle(doc, 'Positive movement');
        drawBullets(doc, workspace.positiveMovement.slice(0, 8).map((row: { publicId: string; title: string }) => `${row.publicId} · ${row.title}`).concat(workspace.positiveMovement.length ? [] : ['No recorded positive movement in this period.']));
        drawSectionTitle(doc, 'Watch next');
        drawBullets(doc, workspace.review.slice(0, 8).map((row: { publicId: string; reviewGuidance: string }) => `${row.publicId} · ${row.reviewGuidance}`).concat(workspace.review.length ? [] : ['Nothing additional is queued for review.']));
        drawSectionTitle(doc, 'External intelligence');
        drawParagraph(doc, 'External intelligence not configured.');
    });
}
