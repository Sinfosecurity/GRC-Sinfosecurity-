import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { createReportPdf } from './reportLayout';
import { drawBarChart, drawTrendChart } from './reportCharts';
import {
    drawBullets,
    drawCallout,
    drawComparisonBars,
    drawDecisionBanner,
    drawKeyValueGrid,
    drawKpiRow,
    drawParagraph,
    drawProfessionalTable,
    drawSectionTitle,
} from './reportPrimitives';
import { C, humanizeEnum, reportId, riskTone } from './reportTheme';
import { isoDate } from './sendDownload';

export async function renderVendorScorecardPdf(organizationId: string, vendorId: string) {
    const [organization, vendor] = await Promise.all([
        prisma.organization.findFirst({ where: { id: organizationId }, select: { name: true } }),
        prisma.vendor.findFirst({
            where: { id: vendorId, organizationId },
            include: {
                assessments: { orderBy: { createdAt: 'desc' }, take: 12 },
                issues: { orderBy: { identifiedDate: 'desc' }, take: 20 },
                documents: { orderBy: { uploadedAt: 'desc' }, take: 12 },
                monitoringRecords: { orderBy: { detectedAt: 'desc' }, take: 12 },
            },
        }),
    ]);
    if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
    }

    const [scores, briefs] = await Promise.all([
        prisma.scoreCalculation.findMany({
            where: { organizationId, vendorId },
            orderBy: { calculatedAt: 'desc' },
            take: 12,
        }),
        prisma.riskDecisionBrief.findMany({
            where: { organizationId, vendorId },
            orderBy: { createdAt: 'desc' },
            take: 8,
        }),
    ]);

    const latest = scores[0];
    const inherent = latest?.inherentRisk ?? vendor.inherentRiskScore;
    const residual = latest?.residualRisk ?? vendor.residualRiskScore;
    const band = latest?.riskBand || (residual >= 80 ? 'CRITICAL' : residual >= 60 ? 'HIGH' : residual >= 40 ? 'MEDIUM' : 'LOW');
    const latestBrief = briefs[0];
    const openIssues = vendor.issues.filter((issue) => !['CLOSED', 'RISK_ACCEPTED', 'RESOLVED', 'REMEDIATED'].includes(issue.status));
    const overdue = openIssues.filter((issue) => issue.targetRemediationDate && issue.targetRemediationDate < new Date());
    const factors = Array.isArray(latest?.factors) ? (latest?.factors as Array<Record<string, unknown>>) : [];
    const topFactors = [...factors]
        .sort((a, b) => Math.abs(Number(b.points || 0)) - Math.abs(Number(a.points || 0)))
        .slice(0, 6);
    const reportDate = isoDate(new Date());
    const alerts = vendor.monitoringRecords.filter((row) => row.requiresAction);

    const buffer = await createReportPdf({
        title: 'Vendor Risk Scorecard',
        subtitle: `${vendor.name}  ·  ${vendor.servicesProvided || 'Service not specified'}`,
        organizationName: organization?.name || 'Organization',
        reportDate,
        generatedAt: new Date(),
        reportId: reportId('VSC', new Date()),
        classification: 'Confidential — Vendor',
        methodologyVersion: latest?.scoreVersion,
        footerNote: `Scorecard for ${vendor.name}`,
    }, (doc) => {
        drawKpiRow(doc, [
            { label: 'Residual risk', value: residual, tone: riskTone(residual), hint: humanizeEnum(band) },
            { label: 'Inherent risk', value: inherent, tone: riskTone(inherent) },
            { label: 'Criticality', value: humanizeEnum(vendor.tier), tone: riskTone(vendor.tier) },
            { label: 'Open findings', value: openIssues.length, tone: openIssues.length ? 'high' : 'low' },
        ]);
        drawSectionTitle(doc, 'Vendor profile');
        drawKeyValueGrid(doc, [
            ['Vendor', vendor.name],
            ['Service', vendor.servicesProvided || '—'],
            ['Status', humanizeEnum(vendor.status)],
            ['Criticality', humanizeEnum(vendor.tier)],
            ['Business owner', vendor.businessOwner || '—'],
            ['Relationship owner', vendor.relationshipOwner || '—'],
            ['Last review', isoDate(vendor.lastReviewDate)],
            ['Next review', isoDate(vendor.nextReviewDate)],
        ]);

        drawSectionTitle(doc, 'Inherent versus residual');
        drawComparisonBars(doc, [
            { label: 'Inherent', value: inherent, color: C.high },
            { label: 'Residual', value: residual, color: C.navy },
        ]);
        if (latest?.explanation) {
            drawParagraph(doc, latest.explanation);
        }
        drawKeyValueGrid(doc, [
            ['Methodology', latest?.scoreVersion || '—'],
            ['Control effectiveness', latest?.controlEffectiveness != null ? String(latest.controlEffectiveness) : '—'],
            ['Evidence objects', vendor.documents.length ? `${vendor.documents.length} linked` : 'No linked evidence'],
            ['Assessment status', vendor.assessments[0] ? humanizeEnum(vendor.assessments[0].status) : 'No assessment'],
        ]);

        drawTrendChart(
            doc,
            'Risk trend',
            [...scores].reverse().map((row) => ({ label: isoDate(row.calculatedAt), value: row.residualRisk })),
            'A trend appears after two persisted score calculations exist for this vendor.'
        );

        drawSectionTitle(doc, 'Top explainable factors');
        if (topFactors.length) {
            drawBullets(doc, topFactors.map((factor) => `${factor.label || factor.code}: ${Number(factor.points) >= 0 ? '+' : ''}${factor.points} — ${factor.rationale || 'Persisted factor'}`));
        } else {
            drawCallout(doc, 'No explainable factors stored', 'Factor rows appear after an explainable score calculation is persisted for this vendor.', 'info');
        }

        drawSectionTitle(doc, 'Open findings and remediation');
        drawProfessionalTable(
            doc,
            [
                { key: 'title', header: 'Finding', width: 210 },
                { key: 'severity', header: 'Severity', width: 78, badge: true },
                { key: 'status', header: 'Status', width: 90, badge: true },
                { key: 'due', header: 'Target', width: 80 },
                { key: 'cap', header: 'CAP', width: 66 },
            ],
            openIssues.slice(0, 8).map((issue) => ({
                title: issue.title,
                severity: issue.severity,
                status: issue.status,
                due: isoDate(issue.targetRemediationDate),
                cap: issue.correctiveActionPlan ? 'Recorded' : 'None',
            })),
            'No open findings',
            'Findings created from assessments or monitoring will appear on this scorecard.'
        );
        if (overdue.length) {
            drawCallout(doc, `${overdue.length} overdue remediation item(s)`, 'Target dates have passed while the finding remains open.', 'high');
        }

        drawBarChart(
            doc,
            'Assessment status',
            ['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'NOT_STARTED', 'PENDING_REVIEW'].map((label) => ({
                label: humanizeEnum(label),
                value: vendor.assessments.filter((row) => row.status === label).length,
            })),
            'No assessments recorded for this vendor.'
        );

        drawSectionTitle(doc, 'Monitoring alerts');
        drawProfessionalTable(
            doc,
            [
                { key: 'date', header: 'Detected', width: 80 },
                { key: 'type', header: 'Type', width: 110 },
                { key: 'indicator', header: 'Indicator', width: 220 },
                { key: 'level', header: 'Level', width: 114, badge: true },
            ],
            alerts.slice(0, 8).map((row) => ({
                date: isoDate(row.detectedAt),
                type: humanizeEnum(row.monitoringType),
                indicator: row.riskIndicator,
                level: row.riskLevel,
            })),
            'No monitoring alerts',
            'Only recorded VendorMonitoring events that require action are listed.'
        );

        drawDecisionBanner(doc, latestBrief?.humanDecision);
        drawKeyValueGrid(doc, [
            ['Latest decision', humanizeEnum(latestBrief?.humanDecision) || 'No decision recorded'],
            ['Brief status', humanizeEnum(latestBrief?.status)],
            ['Decision residual', latestBrief ? String(latestBrief.residualRisk) : '—'],
            ['Next review', isoDate(vendor.nextReviewDate)],
        ]);
    });

    return { buffer, filenameParts: ['Supreme-Risk-Vendor-Scorecard', vendor.name, reportDate] };
}
