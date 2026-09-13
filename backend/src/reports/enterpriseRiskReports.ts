import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { createReportPdf } from './reportLayout';
import { drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle, drawEmptyState, drawBullets } from './reportPrimitives';
import { humanizeEnum, reportId } from './reportTheme';
import { csvEscape } from '../security/spreadsheetSafe';
import { neutralizeSpreadsheetCell } from '../services/enterpriseRiskEngine';
import { enterpriseRiskService } from '../services/enterpriseRiskService';
import { isoDate } from './sendDownload';
import { buildPptx } from './pptxBuilder';

async function orgName(organizationId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    return org?.name || 'This organization';
}

function heatmapLines(heatmap: Array<Array<{ likelihood: number; impact: number; count: number }>>) {
    const labels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];
    const lines = heatmap.flat().filter((cell) => cell.count).map((cell) => (
        `${labels[cell.impact - 1]} impact × likelihood ${cell.likelihood}: ${cell.count}`
    ));
    return lines.length ? lines : ['No risks are plotted. Empty cells are zero, not estimated.'];
}

function emptyOr(items: string[], empty: string) {
    return items.length ? items : [empty];
}

export async function renderEnterpriseRiskPdf(organizationId: string, kind: string) {
    const generatedAt = new Date();
    const pack = await enterpriseRiskService.boardPack(organizationId);
    const { dashboard } = pack;
    const name = pack.name || await orgName(organizationId);
    const titles: Record<string, string> = {
        profile: 'Enterprise Risk Profile',
        'top-risks': 'Top Risks',
        appetite: 'Risk Appetite / Exceptions',
        treatment: 'Risk Treatment Status',
        board: 'Board Risk Summary',
    };
    const outside = dashboard.topRisks.filter((row) => row.appetiteStatus === 'OUTSIDE_APPETITE');
    const unownedHigh = dashboard.attention.filter((row) => row.reasons?.includes('Unassigned') && (row.residualRating === 'CRITICAL' || row.residualRating === 'HIGH'));
    return createReportPdf({
        title: titles[kind] || 'Enterprise Risk Profile',
        subtitle: 'Live tenant enterprise-risk records. Ordinal scores are not summed. Acceptance does not lower residual risk.',
        organizationName: name,
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('ERM', generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `${dashboard.honesty} Generated ${isoDate(generatedAt)}.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Honesty');
        drawParagraph(doc, dashboard.honesty);
        drawKpiRow(doc, [
            { label: 'Active risks', value: dashboard.totals.active },
            { label: 'Critical', value: dashboard.totals.critical, tone: dashboard.totals.critical ? 'critical' : 'low' },
            { label: 'Outside appetite', value: dashboard.totals.outsideAppetite, tone: dashboard.totals.outsideAppetite ? 'high' : 'low' },
            { label: 'Without owners', value: dashboard.totals.withoutOwners },
        ]);
        if (kind === 'profile' || kind === 'board') {
            drawSectionTitle(doc, '5×5 heatmap counts');
            drawBullets(doc, heatmapLines(dashboard.heatmap));
        }
        drawSectionTitle(doc, kind === 'treatment' ? 'Open treatments' : 'Highest residual risks');
        drawProfessionalTable(
            doc,
            [
                { key: 'id', header: 'Risk', width: 90 },
                { key: 'title', header: 'Title', width: 210 },
                { key: 'rating', header: 'Residual', width: 80, badge: true },
                { key: 'appetite', header: 'Appetite', width: 110 },
            ],
            (kind === 'treatment'
                ? pack.treatments.map((row) => ({
                    id: row.risk.publicId,
                    title: row.risk.title,
                    rating: humanizeEnum(row.strategy),
                    appetite: humanizeEnum(row.status),
                }))
                : dashboard.topRisks.map((row) => ({
                    id: row.publicId,
                    title: row.title,
                    rating: humanizeEnum(row.residualRating),
                    appetite: humanizeEnum(row.appetiteStatus),
                }))
            ),
            kind === 'treatment' ? 'No open treatments' : 'No enterprise risks recorded',
            kind === 'treatment' ? 'Treatment plans appear after they are recorded. A plan does not lower residual risk.' : 'Add risks in Supreme Risk to populate this report.'
        );
        if (kind === 'appetite' || kind === 'board') {
            drawSectionTitle(doc, 'Outside appetite');
            if (outside.length) {
                drawBullets(doc, outside.map((row) => `${row.publicId} · ${row.title} · ${humanizeEnum(row.residualRating)}`));
            } else {
                drawEmptyState(doc, 'No appetite exceptions', 'Risks appear here only when residual rating exceeds a configured appetite.');
            }
            drawSectionTitle(doc, 'Category counts');
            drawProfessionalTable(
                doc,
                [
                    { key: 'category', header: 'Category', width: 220 },
                    { key: 'count', header: 'Risks', width: 80 },
                    { key: 'critical', header: 'Critical', width: 80 },
                ],
                dashboard.byCategory.filter((row) => row.count).map((row) => ({
                    category: humanizeEnum(row.category),
                    count: String(row.count),
                    critical: String(row.critical),
                })),
                'No category exposure',
                'Canonical categories appear when risks exist.'
            );
        }
        if (kind === 'board') {
            drawSectionTitle(doc, 'Movement');
            drawParagraph(doc, `${dashboard.totals.worsening} worsening · ${dashboard.totals.improving} improving. No time-series trend is invented.`);
            drawSectionTitle(doc, 'Unassigned Critical / High');
            if (unownedHigh.length) drawBullets(doc, unownedHigh.map((row) => `${row.publicId} · ${row.title}`));
            else drawEmptyState(doc, 'No unassigned Critical or High risks', 'Unowned lower-rated risks are counted on the dashboard only.');
            drawSectionTitle(doc, 'KRI exceptions');
            if (pack.kris.length) drawBullets(doc, pack.kris.map((row) => `${row.publicId} · ${row.name} · ${humanizeEnum(row.status)} · ${row.risk.publicId}`));
            else drawEmptyState(doc, 'No KRI exceptions', 'Warning and critical measurements appear after thresholds are crossed.');
            drawSectionTitle(doc, 'Management decisions');
            if (pack.decisions.length) {
                drawBullets(doc, pack.decisions.map((row) => `${row.risk.publicId} · ${humanizeEnum(row.decision)} · ${humanizeEnum(row.status)}`));
            } else {
                drawEmptyState(doc, 'No recorded decisions', 'Acceptances and other decisions appear after they are approved.');
            }
        }
        if (kind === 'profile') {
            drawParagraph(doc, `${dashboard.totals.active} active risks are included. This is a count, not an aggregated enterprise score.`);
        }
    });
}

export async function renderEnterpriseRiskBoardPptx(organizationId: string) {
    const pack = await enterpriseRiskService.boardPack(organizationId);
    const { dashboard } = pack;
    const outside = dashboard.topRisks.filter((row) => row.appetiteStatus === 'OUTSIDE_APPETITE');
    const assignedUnits = dashboard.byBusinessUnit.filter((row) => row.name !== 'Unassigned' && row.count);
    const buffer = await buildPptx([
        { title: 'Board Risk Summary', bullets: [pack.name, isoDate(new Date()), 'Live tenant records. Residual scores are not summed. Acceptance does not lower residual risk.'] },
        { title: 'Enterprise risk posture', bullets: [`Active risks: ${dashboard.totals.active}`, `Critical: ${dashboard.totals.critical}`, `High: ${dashboard.totals.high}`, `Outside appetite: ${dashboard.totals.outsideAppetite}`, `Without owners: ${dashboard.totals.withoutOwners}`] },
        { title: '5×5 heatmap', bullets: heatmapLines(dashboard.heatmap) },
        { title: 'Top risks', bullets: emptyOr(dashboard.topRisks.map((row) => `${row.publicId} · ${row.title} · ${humanizeEnum(row.residualRating)}`), 'No enterprise risks recorded.') },
        { title: 'Risks outside appetite', bullets: emptyOr(outside.map((row) => `${row.publicId} · ${row.title} · ${humanizeEnum(row.residualRating)}`), 'No configured appetite exceptions.') },
        { title: 'Risk movement', bullets: [`${dashboard.totals.worsening} worsening`, `${dashboard.totals.improving} improving`, 'No invented time-series trend.'] },
        { title: 'Category exposure', bullets: emptyOr(dashboard.byCategory.filter((row) => row.count).map((row) => `${humanizeEnum(row.category)}: ${row.count}`), 'No category exposure yet.') },
        { title: 'Business-unit exposure', bullets: emptyOr(assignedUnits.map((row) => `${row.name}: ${row.count}`), 'No business units assigned. Unassigned counts are not invented structure.') },
        { title: 'Treatment status', bullets: emptyOr(pack.treatments.map((row) => `${row.risk.publicId} · ${humanizeEnum(row.strategy)} · ${humanizeEnum(row.status)}`), 'No open treatments. A plan does not lower residual risk.') },
        { title: 'KRI exceptions', bullets: emptyOr(pack.kris.map((row) => `${row.publicId} · ${row.name} · ${humanizeEnum(row.status)}`), 'No warning or critical KRI measurements.') },
        { title: 'Management decisions', bullets: emptyOr(pack.decisions.map((row) => `${row.risk.publicId} · ${humanizeEnum(row.decision)} · ${humanizeEnum(row.status)}`), 'No recorded acceptances or decisions.') },
        { title: 'Key attention items', bullets: emptyOr(dashboard.attention.map((row) => `${row.publicId} · ${row.title} · ${(row.reasons || []).join(', ')}`), 'Nothing is overdue, unowned, or outside appetite.') },
    ]);
    return { buffer, filenameParts: ['Supreme-Risk-Board-Summary', isoDate(new Date())] };
}

export async function renderEnterpriseRiskRegister(organizationId: string, format: 'csv' | 'xlsx') {
    const rows = await enterpriseRiskService.exportRows(organizationId);
    const generatedAt = new Date();
    if (format === 'csv') {
        const header = Object.keys(rows[0] || { publicId: '', title: '', category: '', residualRating: '', owner: '' });
        const body = [
            header.join(','),
            ...rows.map((row) => header.map((key) => csvEscape(String((row as Record<string, unknown>)[key] ?? ''))).join(',')),
        ].join('\n');
        return { buffer: Buffer.from(body, 'utf8'), filenameParts: ['Supreme-Risk-Register', isoDate(generatedAt)] };
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Supreme Risk';
    const sheet = workbook.addWorksheet('Risk register');
    sheet.columns = [
        { header: 'Risk ID', key: 'publicId', width: 14 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Likelihood', key: 'likelihood', width: 12 },
        { header: 'Impact', key: 'impact', width: 10 },
        { header: 'Inherent', key: 'inherentScore', width: 12 },
        { header: 'Residual', key: 'residualScore', width: 12 },
        { header: 'Rating', key: 'residualRating', width: 12 },
        { header: 'Appetite', key: 'appetiteStatus', width: 18 },
        { header: 'Owner', key: 'owner', width: 22 },
    ];
    rows.forEach((row) => sheet.addRow({
        ...row,
        title: neutralizeSpreadsheetCell(row.title),
        owner: neutralizeSpreadsheetCell(row.owner),
    }));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Risk-Register', isoDate(generatedAt)] };
}
