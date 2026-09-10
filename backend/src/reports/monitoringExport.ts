import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
import { isoDate } from './sendDownload';

export async function renderMonitoringCsv(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const header = ['providerStatus', 'signalCount', 'vendor', 'eventType', 'detectedDate', 'riskIndicator', 'requiresAction', 'status'];
    const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const lines = [
        header.join(','),
        ...data.monitoring.map((row) =>
            [
                data.providerStatus,
                String(data.signalCount),
                row.vendor.name,
                row.monitoringType,
                isoDate(row.detectedAt),
                row.riskIndicator,
                String(row.requiresAction),
                row.resolvedAt ? 'RESOLVED' : row.acknowledgedAt ? 'ACKNOWLEDGED' : 'OPEN',
            ].map((value) => escape(String(value))).join(',')
        ),
    ];
    return { buffer: Buffer.from(lines.join('\n'), 'utf8'), filenameParts: ['Supreme-Risk-Monitoring', isoDate(data.generatedAt)] };
}

export async function renderMonitoringPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: data.organizationName,
            title: 'Continuous Monitoring Report',
            subtitle: 'Recorded VendorMonitoring events only. Provider health is independent of signal count.',
            reportDate: isoDate(data.generatedAt),
        });
        drawSection(doc, {
            heading: 'Provider',
            rows: [
                ['Provider status', data.providerStatus],
                ['Signal count', String(data.signalCount)],
            ],
        });
        drawSection(doc, {
            heading: 'Signals',
            bullets: data.monitoring.length
                ? data.monitoring.map((row) => `${isoDate(row.detectedAt)} ${row.vendor.name}: ${row.monitoringType} — ${row.riskIndicator} (action ${row.requiresAction ? 'yes' : 'no'})`)
                : ['No recorded monitoring events.'],
        });
        drawFooter(doc, 'Monitoring export does not invent events');
    });
    return { buffer, filenameParts: ['Supreme-Risk-Monitoring', isoDate(data.generatedAt)] };
}
