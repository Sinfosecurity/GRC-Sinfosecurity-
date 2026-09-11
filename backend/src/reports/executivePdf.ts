import { createReportPdf, ensureSpace } from './reportLayout';
import { drawBarChart, drawTrendChart } from './reportCharts';
import {
    drawBullets,
    drawKpiRow,
    drawParagraph,
    drawProfessionalTable,
    drawSectionTitle,
} from './reportPrimitives';
import { reportId } from './reportTheme';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';

export async function renderExecutivePdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const reportDate = isoDate(data.generatedAt);
    const buffer = await createReportPdf({
        title: 'Executive Risk Report',
        subtitle: 'Operating view of third-party risk, remediation, and attention items',
        organizationName: data.organizationName,
        reportDate,
        generatedAt: data.generatedAt,
        reportId: reportId('EXC', data.generatedAt),
        classification: 'Confidential — Executive',
        footerNote: `Generated ${reportDate} from live tenant data`,
    }, (doc) => {
        drawSectionTitle(doc, 'Portfolio posture');
        drawParagraph(doc,
            `${data.organizationName} currently manages ${data.totals.vendors} vendors. Residual risk is ${data.trendDelta.direction}. This report is operational: it highlights work due this week as well as the vendors that dominate residual risk.`
        );
        drawKpiRow(doc, [
            { label: 'Vendors', value: data.totals.vendors },
            { label: 'Critical', value: data.totals.criticalVendors, tone: data.totals.criticalVendors ? 'high' : 'low' },
            { label: 'High residual', value: data.totals.highResidual, tone: data.totals.highResidual ? 'critical' : 'low' },
            { label: 'Overdue reviews', value: data.totals.overdueAssessments, tone: data.totals.overdueAssessments ? 'high' : 'low' },
        ]);
        drawKpiRow(doc, [
            { label: 'Critical findings', value: data.totals.criticalFindings, tone: data.totals.criticalFindings ? 'critical' : 'low' },
            { label: 'Overdue CAP', value: data.totals.overdueRemediation, tone: data.totals.overdueRemediation ? 'high' : 'low' },
            { label: 'Monitoring alerts', value: data.totals.monitoringAlerts, tone: data.totals.monitoringAlerts ? 'high' : 'low' },
            { label: 'Expiring evidence', value: data.totals.expiringEvidence, tone: data.totals.expiringEvidence ? 'medium' : 'low' },
        ]);
        drawTrendChart(doc, 'Residual risk trend', data.riskTrend.map((row) => ({ label: row.month, value: row.avgResidual })), 'Score history will appear after the first two persisted calculations.');
        drawBarChart(doc, 'Vendor residual distribution', data.residualBands, 'No residual scores are persisted.');
        drawProfessionalTable(
            doc,
            [
                { key: 'name', header: 'Vendor', width: 180 },
                { key: 'tier', header: 'Criticality', width: 80, badge: true },
                { key: 'inherent', header: 'Inherent', width: 70, align: 'right' },
                { key: 'residual', header: 'Residual', width: 70, align: 'right' },
                { key: 'review', header: 'Next review', width: 124 },
            ],
            data.topRiskVendors.map((vendor) => ({
                name: vendor.name,
                tier: vendor.tier,
                inherent: vendor.inherentRiskScore,
                residual: vendor.residualRiskScore,
                review: isoDate(vendor.nextReviewDate),
            })),
            'No vendors',
            'Top residual-risk vendors will appear when the tenant has vendor records.'
        );
        ensureSpace(doc, 150);
        drawSectionTitle(doc, 'Assessments due or overdue');
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 180 },
                { key: 'type', header: 'Assessment', width: 160 },
                { key: 'status', header: 'Status', width: 100, badge: true },
                { key: 'due', header: 'Due', width: 84 },
            ],
            data.overdueAssessments.slice(0, 10).map((row) => ({
                vendor: row.vendor.name,
                type: row.assessmentType,
                status: row.status,
                due: isoDate(row.dueDate),
            })),
            'No overdue assessments',
            'No assessments are past due in the current tenant records.'
        );
        drawBarChart(doc, 'Findings by severity', data.severityCounts, 'No findings recorded.');
        drawBarChart(doc, 'Remediation aging', data.agingBuckets, 'No open findings to age.');
        drawSectionTitle(doc, 'Evidence expirations');
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 180 },
                { key: 'title', header: 'Evidence', width: 240 },
                { key: 'until', header: 'Valid until', width: 104 },
            ],
            data.expiringEvidence.slice(0, 8).map((row) => ({
                vendor: row.vendor.name,
                title: row.title,
                until: isoDate(row.validUntil),
            })),
            'No evidence expiring',
            'No stored evidence expires in the next 45 days.'
        );
        drawSectionTitle(doc, 'Monitoring alerts');
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 160 },
                { key: 'indicator', header: 'Indicator', width: 220 },
                { key: 'level', header: 'Level', width: 80, badge: true },
                { key: 'date', header: 'Detected', width: 64 },
            ],
            data.monitoring.filter((row) => row.requiresAction).slice(0, 8).map((row) => ({
                vendor: row.vendor.name,
                indicator: row.riskIndicator,
                level: row.riskLevel,
                date: isoDate(row.detectedAt),
            })),
            'No monitoring alerts',
            'Only recorded VendorMonitoring events that require action are listed.'
        );
        drawSectionTitle(doc, 'What needs attention this week');
        if (data.attention.length) {
            drawBullets(doc, data.attention.slice(0, 12).map((item) => `${item.severity} · ${item.action}: ${item.title}`));
        } else {
            drawBullets(doc, ['Nothing is overdue or blocking in the current attention queue.']);
        }
        drawSectionTitle(doc, 'Management recommendations');
        drawBullets(doc, data.recommendations);
    });
    return { buffer, filenameParts: ['Supreme-Risk-Executive-Report', reportDate] };
}
