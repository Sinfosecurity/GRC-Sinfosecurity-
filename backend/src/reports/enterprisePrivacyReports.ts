import ExcelJS from 'exceljs';
import { createReportPdf } from './reportLayout';
import { drawBullets, drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { reportId } from './reportTheme';
import { csvEscape } from '../security/spreadsheetSafe';
import { neutralizeSpreadsheetCell, PRIVACY_HONESTY } from '../services/enterprisePrivacyEngine';
import { enterprisePrivacyService } from '../services/enterprisePrivacyService';
import { isoDate } from './sendDownload';
import { renderPrivacyBoardPptx as renderPremiumPrivacyBoard } from './privacyBoardPptx';

const TITLES: Record<string, string> = {
    ropa: 'ROPA / Processing Activities',
    risk: 'Privacy Risk Summary',
    dpia: 'DPIA Summary',
    transfers: 'Transfer Register',
    rights: 'Rights Request Status',
    retention: 'Retention Status',
    processors: 'Processor / Vendor Privacy Summary',
    executive: 'Privacy Executive Summary',
    board: 'Privacy Board Summary',
};

export async function renderPrivacyPdf(organizationId: string, kind: string) {
    const generatedAt = new Date();
    const pack = await enterprisePrivacyService.pack(organizationId);
    return createReportPdf({
        title: TITLES[kind] || 'Privacy Executive Summary',
        subtitle: 'Live tenant privacy-operations records. A recorded basis is not a finding that processing is lawful.',
        organizationName: pack.name,
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('PRV', generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `${PRIVACY_HONESTY} Generated ${isoDate(generatedAt)}.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Honesty');
        drawParagraph(doc, PRIVACY_HONESTY);
        drawKpiRow(doc, [
            { label: 'Active processing', value: pack.dashboard.totals.activeActivities },
            { label: 'Open rights requests', value: pack.dashboard.totals.openRightsRequests, tone: pack.dashboard.totals.overdueRightsRequests ? 'high' : 'low' },
            { label: 'Transfers in review', value: pack.dashboard.totals.transfersRequiringReview, tone: pack.dashboard.totals.transfersRequiringReview ? 'high' : 'low' },
            { label: 'Retention due', value: pack.dashboard.totals.retentionActionsDue, tone: pack.dashboard.totals.retentionActionsDue ? 'medium' : 'low' },
        ]);
        if (kind === 'ropa' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'Processing activities');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Activity', width: 90 },
                    { key: 'name', header: 'Name', width: 180 },
                    { key: 'status', header: 'Status', width: 90, badge: true },
                    { key: 'owner', header: 'Owner', width: 110 },
                ],
                pack.activities.slice(0, 20).map((row) => ({ id: row.publicId, name: row.name, status: row.status, owner: row.owner })),
                'No processing activities',
                'No processing activity is recorded for this organization.',
            );
        }
        if (kind === 'transfers' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'International transfers');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Transfer', width: 90 },
                    { key: 'path', header: 'Path', width: 180 },
                    { key: 'mechanism', header: 'Recorded mechanism', width: 110 },
                    { key: 'status', header: 'Status', width: 90, badge: true },
                ],
                pack.transfers.slice(0, 16).map((row) => ({ id: row.publicId, path: `${row.source} → ${row.destination}`, mechanism: row.mechanism, status: row.status })),
                'No transfers',
                'No international transfer is recorded.',
            );
        }
        if (kind === 'rights' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'Rights requests');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Request', width: 90 },
                    { key: 'type', header: 'Type', width: 120 },
                    { key: 'status', header: 'Status', width: 90, badge: true },
                    { key: 'due', header: 'Configured due', width: 110 },
                ],
                pack.rights.slice(0, 16).map((row) => ({
                    id: row.publicId,
                    type: row.requestType,
                    status: row.status,
                    due: row.dueAt ? isoDate(new Date(row.dueAt)) : 'Not set',
                })),
                'No rights requests',
                'No rights request is recorded. Deadlines are configured, not legal advice.',
            );
        }
        if (kind === 'dpia' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'DPIAs');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'DPIA', width: 90 },
                    { key: 'title', header: 'Title', width: 200 },
                    { key: 'status', header: 'Status', width: 90, badge: true },
                    { key: 'decision', header: 'Decision', width: 110 },
                ],
                pack.dpias.slice(0, 16).map((row) => ({ id: row.publicId, title: row.title, status: row.status, decision: row.decision })),
                'No DPIAs',
                'No privacy impact assessment is recorded.',
            );
        }
        if (kind === 'retention' || kind === 'board') {
            drawSectionTitle(doc, 'Retention');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Rule', width: 90 },
                    { key: 'period', header: 'Period', width: 160 },
                    { key: 'due', header: 'Due', width: 80 },
                    { key: 'hold', header: 'Legal hold', width: 90 },
                ],
                pack.retention.slice(0, 16).map((row) => ({ id: row.publicId, period: row.period, due: row.due ? 'Due' : 'Scheduled', hold: row.legalHold ? 'Yes' : 'No' })),
                'No retention rules',
                'No retention rule is recorded. Supreme does not auto-delete customer data.',
            );
        }
        if (kind === 'risk' || kind === 'processors' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'Needs attention');
            drawBullets(doc, pack.dashboard.attention.length
                ? pack.dashboard.attention.slice(0, 8).map((row) => `${row.type}: ${row.why}`)
                : ['No attention items from live records.']);
        }
    });
}

export async function renderPrivacyBoardPptx(organizationId: string) {
    return renderPremiumPrivacyBoard(organizationId);
}

export async function renderPrivacyWorkbook(organizationId: string, format: 'csv' | 'xlsx') {
    const pack = await enterprisePrivacyService.exportPack(organizationId);
    if (format === 'csv') {
        const header = ['Sheet', 'ID', 'Title', 'Status', 'Owner'];
        const lines = [header.join(','), ...pack.rows.map((row) => [
            csvEscape(row.sheet),
            csvEscape(row.id),
            csvEscape(row.title),
            csvEscape(row.extra),
            csvEscape(row.owner),
        ].join(','))];
        return { buffer: Buffer.from(lines.join('\n'), 'utf8'), filenameParts: ['Supreme-Privacy-Register'] };
    }
    const workbook = new ExcelJS.Workbook();
    for (const name of ['Processing', 'Transfers', 'Rights', 'Retention'] as const) {
        const sheet = workbook.addWorksheet(name);
        sheet.addRow(['ID', 'Title', 'Status', 'Owner']);
        for (const row of pack.rows.filter((item) => item.sheet === name)) {
            sheet.addRow([
                neutralizeSpreadsheetCell(row.id),
                neutralizeSpreadsheetCell(row.title),
                neutralizeSpreadsheetCell(row.extra),
                neutralizeSpreadsheetCell(row.owner),
            ]);
        }
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Privacy-Register'] };
}
