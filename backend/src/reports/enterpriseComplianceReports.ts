import ExcelJS from 'exceljs';
import { createReportPdf } from './reportLayout';
import { drawBullets, drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { reportId } from './reportTheme';
import { csvEscape } from '../security/spreadsheetSafe';
import { neutralizeSpreadsheetCell } from '../services/enterpriseComplianceEngine';
import { enterpriseComplianceService } from '../services/enterpriseComplianceService';
import { isoDate } from './sendDownload';
import { buildPptx } from './pptxBuilder';

export async function renderCompliancePdf(organizationId: string, kind: string) {
    const generatedAt = new Date();
    const pack = await enterpriseComplianceService.pack(organizationId);
    const titles: Record<string, string> = {
        readiness: 'Framework Readiness',
        gaps: 'Framework Gap Report',
        attestations: 'Control Attestation Report',
        evidence: 'Evidence Coverage Report',
        exceptions: 'Exceptions Report',
        executive: 'Compliance Executive Summary',
        board: 'Compliance Board Summary',
    };
    const first = pack.dashboard.frameworks[0];
    return createReportPdf({
        title: titles[kind] || 'Framework Readiness',
        subtitle: 'Live tenant compliance-program records. Readiness is not certification or a claim of compliance.',
        organizationName: pack.name,
        reportDate: isoDate(generatedAt),
        generatedAt,
        reportId: reportId('CMP', generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `${pack.honesty} Generated ${isoDate(generatedAt)}.`,
    }, (doc) => {
        drawSectionTitle(doc, 'Honesty');
        drawParagraph(doc, pack.honesty);
        drawKpiRow(doc, [
            { label: 'Active frameworks', value: pack.dashboard.totals.activeFrameworks },
            { label: 'Open gaps', value: pack.dashboard.totals.openGaps, tone: pack.dashboard.totals.openGaps ? 'high' : 'low' },
            { label: 'Overdue attestations', value: pack.dashboard.totals.overdueAttestations, tone: pack.dashboard.totals.overdueAttestations ? 'high' : 'low' },
            { label: 'Expired exceptions', value: pack.dashboard.totals.expiredExceptions, tone: pack.dashboard.totals.expiredExceptions ? 'critical' : 'low' },
        ]);
        if (kind === 'readiness' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'Framework readiness');
            drawProfessionalTable(
                doc,
                [
                    { key: 'name', header: 'Framework', width: 160 },
                    { key: 'mapped', header: 'Mapped', width: 80 },
                    { key: 'implemented', header: 'Implemented', width: 90 },
                    { key: 'tested', header: 'Tested', width: 80 },
                    { key: 'evidence', header: 'Evidence', width: 80 },
                ],
                pack.dashboard.frameworks.map((row) => ({
                    name: `${row.name} ${row.version}`,
                    mapped: row.metrics.requirementCoverage.display,
                    implemented: row.metrics.implementationCoverage.display,
                    tested: row.metrics.testingCoverage.display,
                    evidence: row.metrics.evidenceCoverage.display,
                })),
                'No active framework',
                'No framework is activated for this organization. Activation is opt-in.',
            );
            if (first) {
                drawParagraph(doc, first.metrics.requirementCoverage.formula);
            }
        }
        if (kind === 'gaps' || kind === 'executive' || kind === 'board') {
            drawSectionTitle(doc, 'Gaps');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Gap', width: 90 },
                    { key: 'title', header: 'What is missing', width: 250 },
                    { key: 'source', header: 'Source', width: 110 },
                    { key: 'status', header: 'Status', width: 80, badge: true },
                ],
                pack.gaps.slice(0, 20).map((row) => ({
                    id: row.publicId,
                    title: row.title,
                    source: row.source,
                    status: row.status,
                })),
                'No gaps recorded',
                'No compliance gaps are recorded.',
            );
        }
        if (kind === 'exceptions' || kind === 'board') {
            drawSectionTitle(doc, 'Exceptions');
            drawProfessionalTable(
                doc,
                [
                    { key: 'id', header: 'Exception', width: 90 },
                    { key: 'scope', header: 'Scope', width: 220 },
                    { key: 'type', header: 'Type', width: 110 },
                    { key: 'status', header: 'Status', width: 90, badge: true },
                ],
                pack.exceptions.slice(0, 20).map((row) => ({
                    id: row.publicId,
                    scope: row.scope,
                    type: row.type,
                    status: row.status,
                })),
                'No exceptions recorded',
                'No governed exceptions are recorded.',
            );
        }
        if (kind === 'attestations') {
            drawSectionTitle(doc, 'Attestation campaigns');
            drawBullets(doc, pack.dashboard.campaigns.length
                ? pack.dashboard.campaigns.map((row) => `${row.publicId} ${row.name} — ${row.status}`)
                : ['No attestation campaigns are open.']);
        }
        if (kind === 'evidence' || kind === 'board') {
            drawSectionTitle(doc, 'Evidence coverage');
            drawParagraph(doc, 'Evidence coverage counts CLEAN current supporting links only. A file is not compliance.');
        }
        drawSectionTitle(doc, 'Needs attention');
        drawBullets(doc, pack.dashboard.attention.length
            ? pack.dashboard.attention.map((row) => `${row.type}: ${row.why}`)
            : ['No attention items from live records.']);
    });
}

export async function renderComplianceBoardPptx(organizationId: string) {
    const pack = await enterpriseComplianceService.pack(organizationId);
    const first = pack.dashboard.frameworks[0];
    const slides = [
        {
            title: 'Compliance Board Summary',
            kpis: [
                { label: 'Active programs', value: String(pack.dashboard.totals.activeFrameworks) },
                { label: 'Open gaps', value: String(pack.dashboard.totals.openGaps) },
                { label: 'Overdue attestations', value: String(pack.dashboard.totals.overdueAttestations) },
                { label: 'Expired exceptions', value: String(pack.dashboard.totals.expiredExceptions) },
            ],
            bullets: [pack.name, 'Readiness is not certification.', 'Live tenant records only.'],
            footnote: pack.honesty,
        },
        {
            title: 'Coverage',
            kpis: first ? [
                { label: 'Mapped', value: first.metrics.requirementCoverage.display },
                { label: 'Implemented', value: first.metrics.implementationCoverage.display },
                { label: 'Tested', value: first.metrics.testingCoverage.display },
                { label: 'Evidence', value: first.metrics.evidenceCoverage.display },
            ] : [],
            bullets: pack.dashboard.frameworks.length
                ? pack.dashboard.frameworks.map((row) => `${row.name} ${row.version}: mapped ${row.metrics.requirementCoverage.display}`)
                : ['No framework is activated.'],
        },
        {
            title: 'Evidence health',
            kpis: first ? [
                { label: 'Evidence coverage', value: first.metrics.evidenceCoverage.display },
                { label: 'Open gaps', value: String(pack.dashboard.totals.openGaps) },
                { label: 'Expired exceptions', value: String(pack.dashboard.totals.expiredExceptions) },
                { label: 'Active programs', value: String(pack.dashboard.totals.activeFrameworks) },
            ] : [],
            bullets: [
                'CLEAN current supporting links only count toward evidence coverage.',
                'A file is not compliance.',
                'Malware policy remains fail-closed.',
            ],
        },
        {
            title: 'Testing status',
            kpis: first ? [
                { label: 'Testing coverage', value: first.metrics.testingCoverage.display },
                { label: 'Implemented', value: first.metrics.implementationCoverage.display },
                { label: 'Mapped', value: first.metrics.requirementCoverage.display },
                { label: 'Overdue', value: String(pack.dashboard.totals.overdueAttestations) },
            ] : [],
            bullets: [
                first ? `Testing coverage ${first.metrics.testingCoverage.display}` : 'No activated program.',
                first?.metrics.testingCoverage.emptyReason || 'Not tested is not pass. Not applicable is not pass.',
            ],
        },
        {
            title: 'Major gaps',
            kpis: [
                { label: 'Open gaps', value: String(pack.dashboard.totals.openGaps) },
                { label: 'Attention items', value: String(pack.dashboard.attention.length) },
            ],
            bullets: pack.gaps.length ? pack.gaps.slice(0, 8).map((row) => `${row.publicId} ${row.title}`) : ['No gaps recorded.'],
        },
        {
            title: 'Exceptions',
            bullets: pack.exceptions.length ? pack.exceptions.slice(0, 8).map((row) => `${row.publicId} ${row.scope} — ${row.status}`) : ['No exceptions recorded.'],
        },
        {
            title: 'Needs attention',
            bullets: pack.dashboard.attention.length
                ? pack.dashboard.attention.slice(0, 8).map((row) => `${row.type}: ${row.why}`)
                : ['No attention items from live records.'],
        },
        {
            title: 'Decisions / next actions',
            bullets: pack.dashboard.attention.length
                ? pack.dashboard.attention.slice(0, 6).map((row) => `Review ${row.related || row.publicId} — ${row.type}`)
                : ['No management action is required from the current live queue.'],
            footnote: 'An attestation is not a control test. Residual risk does not change unless Supreme recalculates it.',
        },
    ];
    return {
        buffer: await buildPptx(slides),
        filenameParts: ['Supreme-Compliance-Board'],
    };
}

export async function renderComplianceWorkbook(organizationId: string, format: 'csv' | 'xlsx') {
    const pack = await enterpriseComplianceService.exportPack(organizationId);
    if (format === 'csv') {
        const header = ['Sheet', 'ID', 'Title', 'Framework', 'Status', 'Owner'];
        const lines = [header.join(','), ...pack.rows.map((row) => [
            csvEscape(row.sheet),
            csvEscape(row.id),
            csvEscape(row.title),
            csvEscape(row.framework),
            csvEscape(row.status),
            csvEscape(row.owner),
        ].join(','))];
        return { buffer: Buffer.from(lines.join('\n'), 'utf8'), filenameParts: ['Supreme-Compliance-Register'] };
    }
    const workbook = new ExcelJS.Workbook();
    for (const name of ['Requirements', 'Controls', 'Gaps'] as const) {
        const sheet = workbook.addWorksheet(name);
        sheet.addRow(['ID', 'Title', 'Framework', 'Status', 'Owner']);
        for (const row of pack.rows.filter((item) => item.sheet === name)) {
            sheet.addRow([
                neutralizeSpreadsheetCell(row.id),
                neutralizeSpreadsheetCell(row.title),
                neutralizeSpreadsheetCell(row.framework),
                neutralizeSpreadsheetCell(row.status),
                neutralizeSpreadsheetCell(row.owner),
            ]);
        }
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Compliance-Register'] };
}
