import ExcelJS from 'exceljs';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
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
    rows(data).forEach((row) => sheet.addRow(row));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filenameParts: ['Supreme-Risk-Findings', isoDate(data.generatedAt)] };
}

export async function renderFindingsPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: data.organizationName,
            title: 'Findings and Remediation Report',
            reportDate: isoDate(data.generatedAt),
        });
        drawSection(doc, {
            heading: 'Summary',
            rows: [
                ['Open / in progress', String(data.openIssues.length)],
                ['Critical / high', String(data.criticalFindings.length)],
                ['Overdue remediation', String(data.overdueRemediation.length)],
            ],
        });
        drawSection(doc, {
            heading: 'Findings',
            bullets: rows(data).slice(0, 40).map((row) => `${row.vendor}: ${row.severity} ${row.status} — ${row.title} (age ${row.ageDays}d${row.riskAcceptance ? '; accepted' : ''})`),
        });
        drawFooter(doc, 'Findings export from VendorIssue records');
    });
    return { buffer, filenameParts: ['Supreme-Risk-Findings', isoDate(data.generatedAt)] };
}
