import ExcelJS from 'exceljs';
import { createReportPdf } from './reportLayout';
import { drawBarChart } from './reportCharts';
import { drawEmptyState, drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { humanizeEnum, reportId } from './reportTheme';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';

function findingAgeDays(identifiedDate: Date): number {
    return Math.max(0, Math.floor((Date.now() - identifiedDate.getTime()) / 86400000));
}

function rows(data: Awaited<ReturnType<typeof loadPortfolioSnapshot>>) {
    return data.issues.map((issue) => ({
        vendor: issue.vendor.name,
        title: issue.title,
        severity: issue.severity,
        status: issue.status,
        owner: issue.assignedTo || '',
        targetRemediationDate: isoDate(issue.targetRemediationDate),
        ageDays: String(findingAgeDays(issue.identifiedDate)),
        remediationStatus: issue.correctiveActionPlan ? issue.status : 'NO_PLAN',
        evidence: issue.evidenceUrl || issue.closureEvidence || '',
        riskAcceptance: issue.status === 'RISK_ACCEPTED' ? issue.closureNotes || 'RISK_ACCEPTED' : '',
        cap: issue.correctiveActionPlan || '',
        description: issue.description || '',
    }));
}

export async function renderFindingsCsv(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const header = ['vendor', 'title', 'severity', 'status', 'owner', 'targetRemediationDate', 'ageDays', 'remediationStatus', 'evidence', 'riskAcceptance'];
    const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const body = [
        header.join(','),
        ...rows(data).map((row) => header.map((key) => escape(String(row[key as keyof typeof row] || ''))).join(',')),
    ].join('\n');
    return { buffer: Buffer.from(body, 'utf8'), filenameParts: ['Supreme-Risk-Findings', isoDate(data.generatedAt)] };
}

export async function renderFindingsXlsx(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Supreme Risk';
    const sheet = workbook.addWorksheet('Findings');
    sheet.columns = [
        { header: 'Vendor', key: 'vendor', width: 28 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Owner', key: 'owner', width: 22 },
        { header: 'Target remediation', key: 'targetRemediationDate', width: 18 },
        { header: 'Age (days)', key: 'ageDays', width: 12 },
        { header: 'Remediation status', key: 'remediationStatus', width: 20 },
        { header: 'Evidence', key: 'evidence', width: 24 },
        { header: 'Risk acceptance', key: 'riskAcceptance', width: 28 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F33' } };
    rows(data).forEach((row) => sheet.addRow(row));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Risk-Findings', isoDate(data.generatedAt)] };
}

export async function renderFindingsPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const detail = rows(data);
    const buffer = await createReportPdf({
        title: 'Findings & Remediation Report',
        subtitle: 'Open issues, aging, and corrective action status',
        organizationName: data.organizationName,
        reportDate: isoDate(data.generatedAt),
        generatedAt: data.generatedAt,
        reportId: reportId('FND', data.generatedAt),
        classification: 'Confidential — Compliance',
        footerNote: 'Findings export from VendorIssue records',
    }, (doc) => {
        drawSectionTitle(doc, 'Period summary');
        drawParagraph(doc, 'Figures below are taken from persisted vendor findings. Risk acceptance is a disposition, not a residual-score control.');
        drawKpiRow(doc, [
            { label: 'Open findings', value: data.openIssues.length, tone: data.openIssues.length ? 'medium' : 'low' },
            { label: 'Critical / high', value: data.criticalFindings.length, tone: data.criticalFindings.length ? 'critical' : 'low' },
            { label: 'Overdue remediation', value: data.overdueRemediation.length, tone: data.overdueRemediation.length ? 'high' : 'low' },
            { label: 'Average age (days)', value: data.averageFindingAge },
        ]);
        drawKpiRow(doc, [
            { label: 'Closed this period', value: data.closedThisPeriod, tone: 'low' },
            { label: 'Total recorded', value: data.issues.length },
            { label: 'With CAP', value: detail.filter((row) => row.cap).length },
            { label: 'Risk accepted', value: detail.filter((row) => row.riskAcceptance).length, tone: 'medium' },
        ]);
        drawBarChart(doc, 'Findings by severity', data.severityCounts, 'No findings recorded for this tenant.', 96);
        drawBarChart(doc, 'Findings by status', data.statusCounts.map((row) => ({ ...row, label: humanizeEnum(row.label) })), 'No findings recorded for this tenant.', 96);
        drawBarChart(doc, 'Remediation aging', data.agingBuckets, 'No open findings are available to age.', 96);

        drawSectionTitle(doc, 'Findings register');
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 88 },
                { key: 'title', header: 'Finding', width: 120 },
                { key: 'severity', header: 'Severity', width: 62, badge: true },
                { key: 'owner', header: 'Owner', width: 70 },
                { key: 'due', header: 'Target date', width: 62 },
                { key: 'age', header: 'Age', width: 32, align: 'right' },
                { key: 'status', header: 'Status', width: 54, badge: true },
                { key: 'cap', header: 'CAP', width: 36 },
            ],
            detail.slice(0, 40).map((row) => ({
                vendor: row.vendor,
                title: row.title,
                severity: row.severity,
                owner: row.owner || 'Unassigned',
                due: row.targetRemediationDate,
                age: row.ageDays,
                status: row.status,
                cap: row.cap ? 'Yes' : 'No',
            })),
            'No findings',
            'When assessments or monitoring create issues, they will appear in this register.'
        );

        const withCap = detail.filter((row) => row.cap);
        drawSectionTitle(doc, 'Corrective action appendix');
        if (!withCap.length) {
            drawEmptyState(
                doc,
                'No corrective action plans recorded',
                'Findings without a CAP remain listed in the register with CAP Status “None”. Plans appear here when persisted on the finding.'
            );
        } else {
            withCap.slice(0, 20).forEach((row) => {
                drawSectionTitle(doc, `${row.vendor} — ${row.title}`);
                drawParagraph(doc, row.cap);
            });
        }
    });
    return { buffer, filenameParts: ['Supreme-Risk-Findings', isoDate(data.generatedAt)] };
}
