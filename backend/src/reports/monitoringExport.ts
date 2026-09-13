import { createReportPdf, ensureSpace } from './reportLayout';
import { drawBarChart, drawTrendChart } from './reportCharts';
import { drawCallout, drawEmptyState, drawKpiRow, drawParagraph, drawProfessionalTable, drawSectionTitle } from './reportPrimitives';
import { humanizeEnum, humanizeProviderStatus, reportId, riskTone, shortProviderStatus } from './reportTheme';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';
import { csvEscape } from '../security/spreadsheetSafe';

function signalTrend(monitoring: Array<{ detectedAt: Date }>) {
    const months = new Map<string, number>();
    monitoring.forEach((row) => {
        const key = row.detectedAt.toISOString().slice(0, 7);
        months.set(key, (months.get(key) || 0) + 1);
    });
    return [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}

export async function renderMonitoringCsv(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const header = ['providerStatus', 'signalCount', 'vendor', 'eventType', 'detectedDate', 'riskIndicator', 'requiresAction', 'status'];
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
            ].map((value) => csvEscape(value)).join(',')
        ),
    ];
    return { buffer: Buffer.from(lines.join('\n'), 'utf8'), filenameParts: ['Supreme-Risk-Monitoring', isoDate(data.generatedAt)] };
}

export async function renderMonitoringPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const criticalHigh = data.monitoring.filter((row) => {
        const level = String(row.riskLevel || '').toUpperCase();
        return level.includes('CRITICAL') || level.includes('HIGH');
    });
    const coverage = data.totals.vendors
        ? Math.round((data.monitoredVendors / data.totals.vendors) * 100)
        : 0;
    const buffer = await createReportPdf({
        title: 'Continuous Monitoring Report',
        subtitle: 'Recorded provider health and VendorMonitoring events',
        organizationName: data.organizationName,
        reportDate: isoDate(data.generatedAt),
        generatedAt: data.generatedAt,
        reportId: reportId('MON', data.generatedAt),
        classification: 'Confidential — Operations',
        footerNote: 'Recorded events only',
    }, (doc) => {
        drawSectionTitle(doc, 'Provider health');
        drawCallout(
            doc,
            humanizeProviderStatus(data.providerStatus),
            'Supreme Risk reports only persisted integration status and recorded vendor signals. Missing credentials or an unconnected provider are shown as a human-readable status, not as an invented clean bill of health.',
            riskTone(data.providerStatus)
        );
        drawKpiRow(doc, [
            { label: 'Vendors in portfolio', value: data.totals.vendors },
            { label: 'Vendors monitored', value: data.monitoredVendors, hint: `${coverage}% coverage` },
            { label: 'Signals this period', value: data.signalCount },
            { label: 'Critical / high signals', value: criticalHigh.length, tone: criticalHigh.length ? 'critical' : 'low' },
        ]);
        drawKpiRow(doc, [
            { label: 'Action required', value: data.totals.monitoringAlerts, tone: data.totals.monitoringAlerts ? 'high' : 'low' },
            { label: 'Score increases', value: data.scoreIncreases, tone: data.scoreIncreases ? 'high' : 'neutral' },
            { label: 'Score decreases', value: data.scoreDecreases, tone: data.scoreDecreases ? 'low' : 'neutral' },
            { label: 'Provider', value: shortProviderStatus(data.providerStatus), tone: riskTone(data.providerStatus) },
        ]);
        drawParagraph(doc, `Coverage counts vendors that have at least one recorded monitoring event. Residual score changes use persisted ScoreCalculation history only.`);
        drawTrendChart(doc, 'Event trend', signalTrend(data.monitoring), 'A trend line appears after signals are recorded in at least two months.');
        drawBarChart(
            doc,
            'Signals by risk level',
            ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((label) => ({
                label,
                value: data.monitoring.filter((row) => String(row.riskLevel || '').toUpperCase() === label).length,
            })),
            'No recorded signals are available to chart by risk level.'
        );

        ensureSpace(doc, 120);
        drawSectionTitle(doc, 'Recent monitoring events');
        if (!data.monitoring.length) {
            drawEmptyState(
                doc,
                'No recorded monitoring signals',
                'This panel is empty because no VendorMonitoring events exist for the tenant (or selected vendor). Supreme Risk does not invent ratings, news items, or external scores.'
            );
        } else {
            drawProfessionalTable(
                doc,
                [
                    { key: 'date', header: 'Detected', width: 70 },
                    { key: 'vendor', header: 'Vendor', width: 120 },
                    { key: 'type', header: 'Event', width: 90 },
                    { key: 'indicator', header: 'Indicator', width: 140 },
                    { key: 'level', header: 'Level', width: 64, badge: true },
                    { key: 'action', header: 'Action', width: 40 },
                ],
                data.monitoring.slice(0, 40).map((row) => ({
                    date: isoDate(row.detectedAt),
                    vendor: row.vendor.name,
                    type: humanizeEnum(row.monitoringType),
                    indicator: row.riskIndicator,
                    level: row.riskLevel,
                    action: row.requiresAction ? 'Yes' : 'No',
                })),
                'No recorded signals',
                'When a connected provider writes a vendor signal, it will appear in this register.'
            );
        }
    });
    return { buffer, filenameParts: ['Supreme-Risk-Monitoring', isoDate(data.generatedAt)] };
}
