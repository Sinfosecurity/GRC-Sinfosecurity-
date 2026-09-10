import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
import { loadPortfolioSnapshot, type ReportFilters } from './portfolioData';
import { isoDate } from './sendDownload';
import { buildPptx } from './pptxBuilder';

export async function renderBoardPdf(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: data.organizationName,
            title: 'Board Risk Report',
            subtitle: 'Concise third-party risk posture for governance',
            reportDate: isoDate(data.generatedAt),
        });
        drawSection(doc, {
            heading: 'Executive summary',
            paragraphs: [
                `${data.organizationName} currently oversees ${data.totals.vendors} vendors. ${data.totals.criticalVendors} are critical, and ${data.totals.highResidual} have HIGH or CRITICAL residual risk.`,
            ],
            bullets: data.recommendations,
        });
        drawSection(doc, {
            heading: 'Portfolio risk',
            rows: [
                ['Vendors', String(data.totals.vendors)],
                ['High residual', String(data.totals.highResidual)],
                ['Overdue assessments', String(data.totals.overdueAssessments)],
                ['Critical findings', String(data.totals.criticalFindings)],
            ],
        });
        drawSection(doc, {
            heading: 'Risk heatmap',
            bullets: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((band) => {
                const count = data.vendors.filter((vendor) => {
                    const residual = vendor.residualRiskScore;
                    if (band === 'CRITICAL') return residual >= 80;
                    if (band === 'HIGH') return residual >= 60 && residual < 80;
                    if (band === 'MEDIUM') return residual >= 40 && residual < 60;
                    return residual < 40;
                }).length;
                return `${band}: ${count} vendor(s)`;
            }),
        });
        drawSection(doc, {
            heading: 'Top risk vendors',
            bullets: data.topRiskVendors.map((vendor) => `${vendor.name}: ${vendor.residualRiskScore} residual · ${vendor.tier}`),
        });
        drawSection(doc, {
            heading: 'Risk trend',
            bullets: data.riskTrend.slice(-8).map((row) => `${row.month}: ${row.avgResidual}`),
        });
        drawSection(doc, {
            heading: 'Critical findings',
            bullets: data.criticalFindings.slice(0, 10).map((issue) => `${issue.vendor.name}: ${issue.title} (${issue.severity})`),
        });
        drawSection(doc, {
            heading: 'Overdue remediation',
            bullets: data.overdueRemediation.slice(0, 10).map((issue) => `${issue.vendor.name}: ${issue.title} due ${isoDate(issue.targetRemediationDate)}`),
        });
        drawSection(doc, {
            heading: 'Monitoring changes',
            rows: [
                ['Provider status', data.providerStatus],
                ['Recorded signals', String(data.signalCount)],
            ],
            bullets: data.monitoring.slice(0, 8).map((row) => `${isoDate(row.detectedAt)} ${row.vendor.name}: ${row.riskIndicator}`),
        });
        drawSection(doc, {
            heading: 'Major decisions',
            bullets: data.majorDecisions.length
                ? data.majorDecisions.map((brief) => `${isoDate(brief.decidedAt || brief.createdAt)} ${brief.humanDecision} · residual ${brief.residualRisk} ${brief.riskBand}`)
                : ['No decided briefs in this period.'],
        });
        drawSection(doc, {
            heading: 'Recommendations',
            bullets: data.recommendations,
        });
        drawFooter(doc, 'Board report from persisted TPRM records');
    });
    return { buffer, filenameParts: ['Supreme-Risk-Board-Report', isoDate(data.generatedAt)] };
}

export async function renderBoardPptx(organizationId: string, filters: ReportFilters = {}) {
    const data = await loadPortfolioSnapshot(organizationId, filters);
    const heatmap = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((band) => {
        const count = data.vendors.filter((vendor) => {
            const residual = vendor.residualRiskScore;
            if (band === 'CRITICAL') return residual >= 80;
            if (band === 'HIGH') return residual >= 60 && residual < 80;
            if (band === 'MEDIUM') return residual >= 40 && residual < 60;
            return residual < 40;
        }).length;
        return `${band}: ${count}`;
    });
    const buffer = await buildPptx([
        { title: 'Executive Summary', bullets: [`${data.organizationName}: ${data.totals.vendors} vendors, ${data.totals.highResidual} high residual risk.`, ...data.recommendations] },
        { title: 'Portfolio Risk', bullets: [`Critical vendors: ${data.totals.criticalVendors}`, `Overdue assessments: ${data.totals.overdueAssessments}`, `Critical findings: ${data.totals.criticalFindings}`, `Overdue remediation: ${data.totals.overdueRemediation}`] },
        { title: 'Risk Heatmap', bullets: heatmap },
        { title: 'Top Risk Vendors', bullets: data.topRiskVendors.map((vendor) => `${vendor.name}: residual ${vendor.residualRiskScore}`) },
        { title: 'Risk Trend', bullets: data.riskTrend.slice(-8).map((row) => `${row.month}: ${row.avgResidual}`) },
        { title: 'Critical Findings', bullets: data.criticalFindings.slice(0, 8).map((issue) => `${issue.vendor.name}: ${issue.title}`) },
        { title: 'Overdue Remediation', bullets: data.overdueRemediation.slice(0, 8).map((issue) => `${issue.vendor.name}: ${issue.title}`) },
        { title: 'Monitoring Changes', bullets: [`Provider ${data.providerStatus}`, `Signals ${data.signalCount}`, ...data.monitoring.slice(0, 6).map((row) => `${row.vendor.name}: ${row.riskIndicator}`)] },
        { title: 'Major Decisions', bullets: data.majorDecisions.slice(0, 8).map((brief) => `${brief.humanDecision || 'UNDECIDED'} residual ${brief.residualRisk}`) },
        { title: 'Recommendations', bullets: data.recommendations },
    ]);
    return { buffer, filenameParts: ['Supreme-Risk-Board-Report', isoDate(data.generatedAt)] };
}
