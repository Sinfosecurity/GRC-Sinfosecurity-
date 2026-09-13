import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { createReportPdf } from './reportLayout';
import { drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { humanizeEnum, reportId } from './reportTheme';
import { csvEscape } from '../security/spreadsheetSafe';
import { neutralizeSpreadsheetCell } from '../services/enterpriseRiskEngine';
import { enterpriseRiskService } from '../services/enterpriseRiskService';
import { isoDate } from './sendDownload';

async function orgName(organizationId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    return org?.name || 'This organization';
}

export async function renderEnterpriseRiskPdf(organizationId: string, kind: string) {
    const generatedAt = new Date();
    const dashboard = await enterpriseRiskService.dashboard(organizationId);
    const rows = await enterpriseRiskService.list(organizationId, {});
    const name = await orgName(organizationId);
    const titles: Record<string, string> = {
        profile: 'Enterprise Risk Profile',
        'top-risks': 'Top Risks',
        appetite: 'Risk Appetite / Exceptions',
        treatment: 'Risk Treatment Status',
        board: 'Board Risk Summary',
    };
    return createReportPdf({
        title: titles[kind] || 'Enterprise Risk Profile',
        subtitle: 'Live tenant enterprise-risk records. Ordinal scores are not summed.',
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
            { label: 'Overdue reviews', value: dashboard.totals.overdueReviews },
        ]);
        drawSectionTitle(doc, kind === 'treatment' ? 'Treatment attention' : 'Highest residual risks');
        drawProfessionalTable(
            doc,
            [
                { key: 'id', header: 'Risk', width: 90 },
                { key: 'title', header: 'Title', width: 210 },
                { key: 'rating', header: 'Residual', width: 80, badge: true },
                { key: 'appetite', header: 'Appetite', width: 110 },
            ],
            (kind === 'treatment' ? dashboard.attention : dashboard.topRisks).map((row) => ({
                id: row.publicId,
                title: row.title,
                rating: humanizeEnum(row.residualRating),
                appetite: humanizeEnum(row.appetiteStatus),
            })),
            'No enterprise risks recorded',
            'Add risks in Supreme Risk to populate this report.'
        );
        if (kind === 'appetite' || kind === 'board') {
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
        if (kind === 'profile') {
            drawParagraph(doc, `${rows.length} active risks are included. This is a count, not an aggregated enterprise score.`);
        }
    });
}

export async function renderEnterpriseRiskRegister(organizationId: string, format: 'csv' | 'xlsx') {
    const rows = await enterpriseRiskService.exportRows(organizationId);
    const generatedAt = new Date();
    if (format === 'csv') {
        const header = Object.keys(rows[0] || { publicId: '', title: '', category: '', residualRating: '' });
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
    ];
    rows.forEach((row) => sheet.addRow({
        ...row,
        title: neutralizeSpreadsheetCell(row.title),
    }));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Risk-Register', isoDate(generatedAt)] };
}
