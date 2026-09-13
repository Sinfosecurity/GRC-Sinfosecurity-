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
                    mapped: row.metrics.requirementCoverage.percent == null ? 'Not calculated' : `${row.metrics.requirementCoverage.percent}%`,
                    implemented: row.metrics.implementationCoverage.percent == null ? 'Not calculated' : `${row.metrics.implementationCoverage.percent}%`,
                    tested: row.metrics.testingCoverage.percent == null ? 'Not calculated' : `${row.metrics.testingCoverage.percent}%`,
                    evidence: row.metrics.evidenceCoverage.percent == null ? 'Not calculated' : `${row.metrics.evidenceCoverage.percent}%`,
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
            ? pack.dashboard.attention.map((row) => `${row.kind}: ${row.title}`)
            : ['No attention items from live records.']);
    });
}

export async function renderComplianceBoardPptx(organizationId: string) {
    const pack = await enterpriseComplianceService.pack(organizationId);
    const slides = [
        { title: 'Compliance Board Summary', bullets: [pack.name, 'Readiness is not certification.', pack.honesty] },
        {
            title: 'Enterprise compliance posture',
            bullets: [
                `${pack.dashboard.totals.activeFrameworks} active framework program${pack.dashboard.totals.activeFrameworks === 1 ? '' : 's'}`,
                `${pack.dashboard.totals.openGaps} open gaps`,
                `${pack.dashboard.totals.overdueAttestations} overdue attestation campaigns`,
                `${pack.dashboard.totals.expiredExceptions} expired exceptions`,
            ],
        },
        {
            title: 'Framework readiness',
            bullets: pack.dashboard.frameworks.length
                ? pack.dashboard.frameworks.map((row) => {
                    const mapped = row.metrics.requirementCoverage.percent;
                    return `${row.name} ${row.version}: ${mapped == null ? 'readiness not calculated' : `${mapped}% requirement coverage`}`;
                })
                : ['No framework is activated.'],
        },
        {
            title: 'Gaps',
            bullets: pack.gaps.length ? pack.gaps.slice(0, 8).map((row) => `${row.publicId} ${row.title}`) : ['No gaps recorded.'],
        },
        {
            title: 'Exceptions',
            bullets: pack.exceptions.length ? pack.exceptions.slice(0, 8).map((row) => `${row.publicId} ${row.scope} — ${row.status}`) : ['No exceptions recorded.'],
        },
        {
            title: 'Key attention items',
            bullets: pack.dashboard.attention.length
                ? pack.dashboard.attention.slice(0, 8).map((row) => `${row.kind}: ${row.title}`)
                : ['No attention items from live records.'],
        },
    ];
    return {
        buffer: await buildPptx(slides),
        filenameParts: ['Supreme-Compliance-Board'],
    };
}

export async function renderComplianceWorkbook(organizationId: string, format: 'csv' | 'xlsx') {
    const rows = await enterpriseComplianceService.exportRows(organizationId);
    if (format === 'csv') {
        const header = ['Requirement', 'Summary', 'Framework', 'Version', 'Applicability', 'Owner', 'Implementation', 'Latest test'];
        const lines = [header.join(','), ...rows.map((row) => [
            csvEscape(row.requirement),
            csvEscape(row.summary),
            csvEscape(row.framework),
            csvEscape(row.version),
            csvEscape(row.applicability),
            csvEscape(row.owner),
            csvEscape(row.implementation),
            csvEscape(row.latestTest),
        ].join(','))];
        return { buffer: Buffer.from(lines.join('\n'), 'utf8'), filenameParts: ['Supreme-Compliance-Requirements'] };
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Requirements');
    sheet.addRow(['Requirement', 'Summary', 'Framework', 'Version', 'Applicability', 'Owner', 'Implementation', 'Latest test']);
    for (const row of rows) {
        sheet.addRow([
            neutralizeSpreadsheetCell(row.requirement),
            neutralizeSpreadsheetCell(row.summary),
            neutralizeSpreadsheetCell(row.framework),
            neutralizeSpreadsheetCell(row.version),
            neutralizeSpreadsheetCell(row.applicability),
            neutralizeSpreadsheetCell(row.owner),
            neutralizeSpreadsheetCell(row.implementation),
            neutralizeSpreadsheetCell(row.latestTest),
        ]);
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Compliance-Requirements'] };
}
