import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { collectPdf, drawBrandHeader, drawFooter, drawSection } from './pdfBrand';
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
    const trend = [...scores].reverse().map((row) => `${isoDate(row.calculatedAt)}: residual ${row.residualRisk} (${row.riskBand})`);
    const reportDate = isoDate(new Date());

    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: organization?.name || 'Organization',
            title: 'Vendor Risk Scorecard',
            subtitle: vendor.name,
            reportDate,
        });
        drawSection(doc, {
            heading: 'Vendor profile',
            rows: [
                ['Vendor', vendor.name],
                ['Service', vendor.servicesProvided || '—'],
                ['Criticality', vendor.tier],
                ['Status', vendor.status],
                ['Business owner', vendor.businessOwner || '—'],
                ['Relationship owner', vendor.relationshipOwner || '—'],
                ['Next review', isoDate(vendor.nextReviewDate)],
                ['Last review', isoDate(vendor.lastReviewDate)],
            ],
        });
        drawSection(doc, {
            heading: 'Risk score',
            rows: [
                ['Inherent', String(latest?.inherentRisk ?? vendor.inherentRiskScore)],
                ['Control effectiveness', String(latest?.controlEffectiveness ?? '—')],
                ['Residual', String(latest?.residualRisk ?? vendor.residualRiskScore)],
                ['Band', latest?.riskBand || '—'],
                ['Methodology', latest?.scoreVersion || '—'],
            ],
            paragraphs: latest?.explanation ? [latest.explanation] : undefined,
        });
        drawSection(doc, {
            heading: 'Risk trend',
            bullets: trend.length ? trend : ['No persisted score history.'],
        });
        drawSection(doc, {
            heading: 'Assessment history',
            bullets: vendor.assessments.length
                ? vendor.assessments.map((row) => `${isoDate(row.createdAt)} ${row.assessmentType} · ${row.status} · score ${row.overallScore ?? '—'}`)
                : ['No assessments recorded.'],
        });
        drawSection(doc, {
            heading: 'Evidence status',
            bullets: vendor.documents.length
                ? vendor.documents.map((row) => `${row.title} · ${row.scanStatus} · ${isoDate(row.uploadedAt)}`)
                : ['No evidence objects linked to this vendor.'],
        });
        drawSection(doc, {
            heading: 'Findings and remediation',
            bullets: vendor.issues.length
                ? vendor.issues.map((row) => `${row.severity} ${row.status}: ${row.title} (target ${isoDate(row.targetRemediationDate)})`)
                : ['No findings recorded.'],
        });
        drawSection(doc, {
            heading: 'Monitoring',
            bullets: vendor.monitoringRecords.length
                ? vendor.monitoringRecords.map((row) => `${isoDate(row.detectedAt)} ${row.monitoringType}: ${row.riskIndicator}`)
                : ['No recorded monitoring events.'],
        });
        drawSection(doc, {
            heading: 'Decision status',
            bullets: briefs.length
                ? briefs.map((row) => `${row.status} · residual ${row.residualRisk} ${row.riskBand} · ${row.humanDecision || 'undecided'}`)
                : ['No decision briefs recorded.'],
            rows: [['Next review', isoDate(vendor.nextReviewDate)]],
        });
        drawFooter(doc, `Vendor scorecard ${vendor.name}`);
    });

    return { buffer, filenameParts: ['Supreme-Risk-Vendor-Scorecard', vendor.name, reportDate] };
}
