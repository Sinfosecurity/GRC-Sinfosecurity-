import ExcelJS from 'exceljs';
import { createReportPdf } from './reportLayout';
import { drawBullets, drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { reportId } from './reportTheme';
import { csvEscape } from '../security/spreadsheetSafe';
import { honestyCopy, humanizeAiLabel, neutralizeSpreadsheetCell } from '../services/enterpriseAiGovernanceEngine';
import { enterpriseAiGovernanceService } from '../services/enterpriseAiGovernanceService';
import { isoDate } from './sendDownload';
import { renderAiBoardPptx as renderPremiumAiBoard } from './aiBoardPptx';

const TITLES: Record<string, string> = {
    inventory: 'AI Inventory',
    risk: 'AI Risk Summary',
    approval: 'AI Approval Status',
    testing: 'AI Testing Summary',
    vendor: 'AI Vendor Summary',
    regulatory: 'AI Regulatory Readiness',
    executive: 'AI Executive Summary',
    board: 'AI Board Summary',
};

export async function renderAiPdf(organizationId: string, kind: string) {
    const generatedAt = new Date();
    const pack = await enterpriseAiGovernanceService.pack(organizationId);
    return createReportPdf({
        title: TITLES[kind] || 'AI Executive Summary',
        subtitle: 'Live tenant AI-governance records. Inventory is not an approval or a legal finding.',
        organizationName: pack.name,
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('AIG', generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `${honestyCopy()} Generated ${isoDate(generatedAt)}.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Honesty');
        drawParagraph(doc, honestyCopy());
        drawKpiRow(doc, [
            { label: 'Active AI systems', value: pack.dashboard.totals.activeSystems },
            { label: 'Production', value: pack.dashboard.totals.productionSystems, tone: pack.dashboard.totals.productionSystems ? 'medium' : 'low' },
            { label: 'Open incidents', value: pack.dashboard.totals.incidentsOpen, tone: pack.dashboard.totals.incidentsOpen ? 'high' : 'low' },
            { label: 'Awaiting approval', value: pack.dashboard.totals.awaitingApproval, tone: pack.dashboard.totals.awaitingApproval ? 'medium' : 'low' },
        ]);
        drawSectionTitle(doc, 'AI systems');
        drawProfessionalTable(
            doc,
            [
                { key: 'id', header: 'System', width: 90 },
                { key: 'name', header: 'Name', width: 180 },
                { key: 'lifecycle', header: 'Lifecycle', width: 90, badge: true },
                { key: 'class', header: 'Org class', width: 90 },
            ],
            pack.systems.slice(0, 20).map((row) => ({ id: row.publicId, name: row.name, lifecycle: humanizeAiLabel(row.lifecycle), class: humanizeAiLabel(row.organizationClass) })),
            'No AI systems',
            'No AI system is recorded.',
        );
        drawSectionTitle(doc, 'Needs attention');
        drawBullets(doc, pack.dashboard.attention.length
            ? pack.dashboard.attention.slice(0, 8).map((row) => `${row.type}: ${row.why}`)
            : ['No attention items from live records.']);
        drawParagraph(doc, 'Monitoring: Manual / Not configured. No invented drift or model scores.');
    });
}

export async function renderAiBoardPptx(organizationId: string) {
    return renderPremiumAiBoard(organizationId);
}

export async function renderAiWorkbook(organizationId: string, format: 'csv' | 'xlsx') {
    const pack = await enterpriseAiGovernanceService.pack(organizationId);
    const rows = pack.systems.map((row) => [
        neutralizeSpreadsheetCell(row.publicId),
        neutralizeSpreadsheetCell(row.name),
        neutralizeSpreadsheetCell(humanizeAiLabel(row.lifecycle)),
        neutralizeSpreadsheetCell(humanizeAiLabel(row.organizationClass)),
        neutralizeSpreadsheetCell(row.businessOwner || 'Unassigned'),
    ]);
    if (format === 'csv') {
        const header = ['ID', 'Name', 'Lifecycle', 'Organization class', 'Owner'];
        const csv = [header, ...rows].map((line) => line.map((cell) => csvEscape(cell)).join(',')).join('\n');
        return { buffer: Buffer.from(csv, 'utf8'), filenameParts: ['Supreme-AI-Register'] };
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('AI Register');
    sheet.addRow(['ID', 'Name', 'Lifecycle', 'Organization class', 'Owner']);
    rows.forEach((row) => sheet.addRow(row));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-AI-Register'] };
}

