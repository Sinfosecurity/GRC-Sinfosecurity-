import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';

export async function renderExecutivePdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const reportDate = isoDate(data.generatedAt);
    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: data.organizationName,
            title: 'Executive Risk Report',
            subtitle: 'Portfolio overview from persisted vendor, assessment, finding, and monitoring records',
            reportDate,
        });
        drawSection(doc, {
            heading: 'Portfolio overview',
            rows: [
                ['Total vendors', String(data.totals.vendors)],
                ['Critical vendors', String(data.totals.criticalVendors)],
                ['High residual risk', String(data.totals.highResidual)],
                ['Overdue assessments', String(data.totals.overdueAssessments)],
                ['Critical findings', String(data.totals.criticalFindings)],
                ['Overdue remediation', String(data.totals.overdueRemediation)],
                ['Monitoring alerts', String(data.totals.monitoringAlerts)],
                ['Expiring evidence', String(data.totals.expiringEvidence)],
            ],
        });
        drawSection(doc, {
            heading: 'Risk trend',
            bullets: data.riskTrend.length
                ? data.riskTrend.slice(-8).map((row) => `${row.month}: average residual ${row.avgResidual}`)
                : ['No persisted score history is available yet.'],
        });
        drawSection(doc, {
            heading: 'Attention items',
            bullets: data.attention.length
                ? data.attention.slice(0, 12).map((item) => `${item.severity} · ${item.action}: ${item.title}`)
                : ['No attention items for today.'],
        });
        drawSection(doc, {
            heading: 'Top risk vendors',
            bullets: data.topRiskVendors.map((vendor) => `${vendor.name}: residual ${vendor.residualRiskScore} (${vendor.tier})`),
        });
        drawSection(doc, {
            heading: 'Monitoring alerts',
            bullets: data.monitoring.filter((row) => row.requiresAction).slice(0, 12).map((row) => `${row.vendor.name}: ${row.monitoringType} — ${row.riskIndicator}`),
        });
        drawSection(doc, {
            heading: 'Expiring evidence',
            bullets: data.expiringEvidence.slice(0, 10).map((docRow) => `${docRow.vendor.name}: ${docRow.title} until ${isoDate(docRow.validUntil)}`),
        });
        drawSection(doc, {
            heading: 'Summary recommendations',
            bullets: data.recommendations,
        });
        drawFooter(doc, `Generated ${reportDate} from live tenant data`);
    });
    return { buffer, filenameParts: ['Supreme-Risk-Executive-Report', reportDate] };
}
