import { addReportPage, createReportPdf } from './reportLayout';
import { drawBarChart, drawRiskHeatmap, drawTrendChart } from './reportCharts';
import {
    drawBullets,
    drawCallout,
    drawEmptyState,
    drawKpiRow,
    drawParagraph,
    drawProfessionalTable,
    drawSectionTitle,
} from './reportPrimitives';
import { humanizeEnum, humanizeProviderStatus, reportId, riskTone, shortProviderStatus } from './reportTheme';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';
import { buildPptx } from './pptxBuilder';

export async function renderBoardPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const reportDate = isoDate(data.generatedAt);
    const buffer = await createReportPdf({
        title: 'Board Risk Report',
        subtitle: 'Third-party risk posture for the Board of Directors',
        organizationName: data.organizationName,
        reportDate,
        generatedAt: data.generatedAt,
        reportId: reportId('BRD', data.generatedAt),
        classification: 'Confidential — Board',
        footerNote: 'Board report from persisted TPRM records',
    }, (doc) => {
        drawSectionTitle(doc, 'Executive summary', 'Page 1');
        drawParagraph(doc,
            `${data.organizationName} oversees ${data.totals.vendors} third-party relationships. ${data.totals.criticalVendors} are critical, and ${data.totals.highResidual} carry high or critical residual risk. Portfolio residual trend is ${data.trendDelta.direction}${data.trendDelta.latest != null ? ` at an average residual of ${data.trendDelta.latest}` : ''}.`
        );
        drawKpiRow(doc, [
            { label: 'Total vendors', value: data.totals.vendors, hint: 'Active portfolio' },
            { label: 'Critical vendors', value: data.totals.criticalVendors, hint: 'Highest dependency', tone: data.totals.criticalVendors ? 'high' : 'low' },
            { label: 'High / critical residual', value: data.totals.highResidual, hint: 'Requires oversight', tone: data.totals.highResidual ? 'critical' : 'low' },
            { label: 'Critical findings', value: data.totals.criticalFindings, hint: 'Open high/critical', tone: data.totals.criticalFindings ? 'critical' : 'low' },
        ]);
        drawSectionTitle(doc, 'Key observations');
        drawBullets(doc, data.observations);
        drawCallout(
            doc,
            `Risk trend: ${data.trendDelta.direction}`,
            data.riskTrend.length >= 2
                ? `Average residual moved ${data.trendDelta.delta > 0 ? '+' : ''}${data.trendDelta.delta} versus the prior recorded period.`
                : 'Insufficient persisted score history to establish a board-level trend. The figure will appear once two score periods exist.',
            data.trendDelta.delta > 0 ? 'high' : data.trendDelta.delta < 0 ? 'low' : 'neutral'
        );
        drawSectionTitle(doc, 'Decisions and actions required');
        drawBullets(doc, data.recommendations);
        drawSectionTitle(doc, 'How this report is organized');
        drawBullets(doc, [
            'Page 2 — Portfolio risk heatmap, residual distribution, and concentration.',
            'Page 3 — Findings severity, overdue remediation, aging, and control effectiveness.',
            'Page 4 — Monitoring coverage, score movement, and expiring evidence.',
            'Page 5 — Recorded decisions, acceptances, recommendations, and upcoming reviews.',
        ]);

        addReportPage(doc);
        drawSectionTitle(doc, 'Portfolio risk', 'Page 2');
        drawRiskHeatmap(doc, '5×5 residual risk heatmap', data.heatmap, 'No vendors are available to plot. Heatmap cells remain empty rather than simulated.');
        drawBarChart(doc, 'Residual risk distribution', data.residualBands, 'No vendor residual scores are persisted.');
        drawProfessionalTable(
            doc,
            [
                { key: 'name', header: 'Vendor', width: 170 },
                { key: 'service', header: 'Service', width: 150 },
                { key: 'tier', header: 'Criticality', width: 78, badge: true },
                { key: 'residual', header: 'Residual', width: 64, align: 'right' },
                { key: 'band', header: 'Band', width: 62, badge: true },
            ],
            data.topRiskVendors.slice(0, 8).map((vendor) => ({
                name: vendor.name,
                service: vendor.servicesProvided || '—',
                tier: vendor.tier,
                residual: vendor.residualRiskScore,
                band: vendor.residualRiskScore >= 80 ? 'CRITICAL' : vendor.residualRiskScore >= 60 ? 'HIGH' : vendor.residualRiskScore >= 40 ? 'MEDIUM' : 'LOW',
            })),
            'No vendors in portfolio',
            'Top-risk ranking will appear when tenant vendor records exist.'
        );
        if (data.categoryConcentration.length) {
            drawSectionTitle(doc, 'Concentration');
            drawBullets(doc, data.categoryConcentration.map(([category, count]) => `${humanizeEnum(category)}: ${count} vendor${count === 1 ? '' : 's'}`));
        } else {
            drawEmptyState(doc, 'Concentration not available', 'Category concentration is shown when vendors have persisted categories.');
        }

        addReportPage(doc);
        drawSectionTitle(doc, 'Remediation and control posture', 'Page 3');
        drawBarChart(doc, 'Findings by severity', data.severityCounts, 'No findings are recorded for this period.');
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 140 },
                { key: 'title', header: 'Finding', width: 210 },
                { key: 'severity', header: 'Severity', width: 78, badge: true },
                { key: 'due', header: 'Target date', width: 96 },
            ],
            data.overdueRemediation.slice(0, 8).map((issue) => ({
                vendor: issue.vendor.name,
                title: issue.title,
                severity: issue.severity,
                due: isoDate(issue.targetRemediationDate),
            })),
            'No overdue remediation',
            'No open findings are past their target remediation date.'
        );
        drawBarChart(doc, 'Remediation aging', data.agingBuckets, 'No open findings are available to age.');
        drawCallout(
            doc,
            'Control effectiveness',
            data.avgControlEffectiveness != null
                ? `Average persisted control effectiveness across recent score calculations is ${data.avgControlEffectiveness}. Residual risk is reduced only by scored controls, not by risk acceptance.`
                : 'Control effectiveness will appear after explainable scores are calculated for vendors.',
            'info'
        );

        addReportPage(doc);
        drawSectionTitle(doc, 'Monitoring and change', 'Page 4');
        drawKpiRow(doc, [
            { label: 'Provider', value: shortProviderStatus(data.providerStatus), tone: riskTone(data.providerStatus) },
            { label: 'Vendors monitored', value: data.monitoredVendors, hint: 'With recorded signals' },
            { label: 'Signals this period', value: data.signalCount },
            { label: 'Action required', value: data.totals.monitoringAlerts, tone: data.totals.monitoringAlerts ? 'high' : 'low' },
        ]);
        drawCallout(doc, humanizeProviderStatus(data.providerStatus), 'Provider health is independent of signal count. Supreme Risk does not invent monitoring events.', riskTone(data.providerStatus));
        if (data.monitoring.length) {
            drawProfessionalTable(
                doc,
                [
                    { key: 'date', header: 'Detected', width: 80 },
                    { key: 'vendor', header: 'Vendor', width: 140 },
                    { key: 'type', header: 'Event', width: 110 },
                    { key: 'indicator', header: 'Risk indicator', width: 140 },
                    { key: 'action', header: 'Action', width: 54 },
                ],
                data.monitoring.slice(0, 8).map((row) => ({
                    date: isoDate(row.detectedAt),
                    vendor: row.vendor.name,
                    type: humanizeEnum(row.monitoringType),
                    indicator: row.riskIndicator,
                    action: row.requiresAction ? 'Yes' : 'No',
                })),
                'No recorded signals',
                'When a connected provider records a vendor signal, it will appear here.'
            );
        } else {
            drawEmptyState(doc, 'No recorded monitoring signals', 'This panel stays empty until a provider writes VendorMonitoring events. Historical or simulated ratings are not shown.');
        }
        drawParagraph(doc, `Residual scores increased for ${data.scoreIncreases} vendor${data.scoreIncreases === 1 ? '' : 's'} and decreased for ${data.scoreDecreases}.`);
        drawProfessionalTable(
            doc,
            [
                { key: 'vendor', header: 'Vendor', width: 200 },
                { key: 'title', header: 'Evidence', width: 220 },
                { key: 'until', header: 'Valid until', width: 104 },
            ],
            data.expiringEvidence.slice(0, 6).map((row) => ({
                vendor: row.vendor.name,
                title: row.title,
                until: isoDate(row.validUntil),
            })),
            'No evidence expiring',
            'No stored evidence is due to expire in the next 45 days.'
        );

        addReportPage(doc);
        drawSectionTitle(doc, 'Decisions and recommendations', 'Page 5');
        drawProfessionalTable(
            doc,
            [
                { key: 'date', header: 'Date', width: 80 },
                { key: 'decision', header: 'Decision', width: 150, badge: true },
                { key: 'residual', header: 'Residual', width: 70, align: 'right' },
                { key: 'band', header: 'Band', width: 80, badge: true },
                { key: 'status', header: 'Status', width: 144 },
            ],
            data.majorDecisions.map((brief) => ({
                date: isoDate(brief.decidedAt || brief.createdAt),
                decision: brief.humanDecision || 'UNDECIDED',
                residual: brief.residualRisk,
                band: brief.riskBand,
                status: humanizeEnum(brief.status),
            })),
            'No decided briefs',
            'Recent risk decisions will appear after a reviewer records a decision on an immutable brief.'
        );
        if (data.acceptedRisks.length) {
            drawSectionTitle(doc, 'Risk acceptances');
            drawBullets(doc, data.acceptedRisks.map((brief) => `${isoDate(brief.decidedAt)} · residual remains ${brief.residualRisk} ${brief.riskBand}`));
        } else {
            drawEmptyState(doc, 'No risk acceptances', 'Accepted-risk dispositions are listed only when recorded on a decision brief.');
        }
        if (data.conditionedApprovals.length) {
            drawSectionTitle(doc, 'Approvals with conditions');
            drawBullets(doc, data.conditionedApprovals.map((brief) => `${isoDate(brief.decidedAt)} · ${brief.conditions || 'Conditions recorded on the brief.'}`));
        } else {
            drawEmptyState(doc, 'No approvals with conditions', 'Conditional approvals appear after a reviewer records APPROVE WITH CONDITIONS on a decision brief.');
        }
        drawSectionTitle(doc, 'Management recommendations');
        drawBullets(doc, data.recommendations);
        drawProfessionalTable(
            doc,
            [
                { key: 'name', header: 'Vendor', width: 240 },
                { key: 'tier', header: 'Criticality', width: 120, badge: true },
                { key: 'review', header: 'Next review', width: 164 },
            ],
            data.upcomingReviews.map((vendor) => ({
                name: vendor.name,
                tier: vendor.tier,
                review: isoDate(vendor.nextReviewDate),
            })),
            'No upcoming reviews',
            'Scheduled review dates will appear when vendors have a next review date.'
        );
    });
    return { buffer, filenameParts: ['Supreme-Risk-Board-Report', reportDate] };
}

export async function renderBoardPptx(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const buffer = await buildPptx([
        { title: 'Executive Summary', bullets: [`${data.organizationName}: ${data.totals.vendors} vendors, ${data.totals.highResidual} high residual risk.`, ...data.observations] },
        { title: 'Portfolio Risk', bullets: [`Critical vendors: ${data.totals.criticalVendors}`, `Overdue assessments: ${data.totals.overdueAssessments}`, `Critical findings: ${data.totals.criticalFindings}`, `Overdue remediation: ${data.totals.overdueRemediation}`] },
        { title: 'Risk Heatmap', bullets: ['See the Board PDF for the 5x5 heatmap. Slide form lists residual bands only.', ...data.residualBands.map((row) => `${row.label}: ${row.value}`)] },
        { title: 'Top Risk Vendors', bullets: data.topRiskVendors.map((vendor) => `${vendor.name}: residual ${vendor.residualRiskScore}`) },
        { title: 'Risk Trend', bullets: data.riskTrend.slice(-8).map((row) => `${row.month}: ${row.avgResidual}`) },
        { title: 'Critical Findings', bullets: data.criticalFindings.slice(0, 8).map((issue) => `${issue.vendor.name}: ${issue.title}`) },
        { title: 'Overdue Remediation', bullets: data.overdueRemediation.slice(0, 8).map((issue) => `${issue.vendor.name}: ${issue.title}`) },
        { title: 'Monitoring Changes', bullets: [humanizeProviderStatus(data.providerStatus), `Signals ${data.signalCount}`, ...data.monitoring.slice(0, 6).map((row) => `${row.vendor.name}: ${row.riskIndicator}`)] },
        { title: 'Major Decisions', bullets: data.majorDecisions.slice(0, 8).map((brief) => `${brief.humanDecision || 'UNDECIDED'} residual ${brief.residualRisk}`) },
        { title: 'Recommendations', bullets: data.recommendations },
    ]);
    return { buffer, filenameParts: ['Supreme-Risk-Board-Report', isoDate(data.generatedAt)] };
}
