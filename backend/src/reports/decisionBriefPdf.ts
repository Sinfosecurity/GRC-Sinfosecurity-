import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { createReportPdf } from './reportLayout';
import {
    drawBullets,
    drawCallout,
    drawComparisonBars,
    drawDecisionBanner,
    drawKeyValueGrid,
    drawParagraph,
    drawSectionTitle,
} from './reportPrimitives';
import { C, humanizeEnum, reportId, riskTone } from './reportTheme';
import { isoDate } from './sendDownload';

type Snapshot = Record<string, any>;

function text(value: unknown): string {
    if (value == null || value === '') return '—';
    if (value instanceof Date) return isoDate(value);
    return String(value);
}

export async function renderDecisionBriefPdf(organizationId: string, briefId: string): Promise<{ buffer: Buffer; filenameParts: string[] }> {
    const [brief, organization] = await Promise.all([
        prisma.riskDecisionBrief.findFirst({ where: { id: briefId, organizationId } }),
        prisma.organization.findFirst({ where: { id: organizationId }, select: { name: true } }),
    ]);
    if (!brief) {
        throw new ApiError(404, 'Decision brief not found');
    }

    const snapshot = (typeof brief.immutableSnapshot === 'object' && brief.immutableSnapshot ? brief.immutableSnapshot : {}) as Snapshot;
    const vendor = snapshot.vendor || {};
    const score = snapshot.score || {};
    const decision = snapshot.decision || {};
    const acceptance = snapshot.acceptance || {};

    let controlEffectiveness = score.controlEffectiveness;
    if (controlEffectiveness == null && brief.scoreCalculationId) {
        const stored = await prisma.scoreCalculation.findFirst({
            where: { id: brief.scoreCalculationId, organizationId },
            select: { controlEffectiveness: true },
        });
        controlEffectiveness = stored?.controlEffectiveness;
    }

    let decidedByName = decision.decidedByName as string | undefined;
    const decidedByUserId = decision.decidedByUserId || brief.decidedByUserId;
    if (!decidedByName && decidedByUserId) {
        const user = await prisma.user.findFirst({
            where: { id: decidedByUserId, organizationId },
            select: { firstName: true, lastName: true, email: true },
        });
        decidedByName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : undefined;
    }

    const factors = Array.isArray(score.factors) ? score.factors : [];
    const topFactors = [...factors]
        .sort((a, b) => Math.abs(Number(b.points || 0)) - Math.abs(Number(a.points || 0)))
        .slice(0, 8);

    const keyFindings = Array.isArray(snapshot.keyFindings)
        ? snapshot.keyFindings.map((item: unknown) => String(item))
        : [];

    const humanDecision = decision.humanDecision || brief.humanDecision;
    const vendorName = vendor.name || 'Vendor';
    const reportDate = isoDate(brief.createdAt);
    const residual = score.residualRisk ?? brief.residualRisk;
    const inherent = score.inherentRisk ?? brief.inherentRisk;
    const band = score.riskBand ?? brief.riskBand;
    const methodology = text(score.version || score.scoreVersion);

    const buffer = await createReportPdf({
        title: 'Risk Decision Brief',
        subtitle: `${vendorName}  ·  ${text(vendor.service || brief.engagementName)}`,
        organizationName: text(snapshot.organizationName || organization?.name),
        reportDate,
        generatedAt: brief.createdAt,
        reportId: reportId('RDB', brief.createdAt),
        classification: 'Confidential — Decision record',
        methodologyVersion: methodology !== '—' ? methodology : undefined,
        footerNote: 'Immutable snapshot — scores are not recalculated at export',
    }, (doc) => {
        drawDecisionBanner(doc, humanDecision);
        drawSectionTitle(doc, 'Engagement');
        drawKeyValueGrid(doc, [
            ['Vendor', text(vendorName)],
            ['Service', text(vendor.service || brief.engagementName)],
            ['Criticality', text(vendor.criticality || vendor.tier)],
            ['Business owner', text(vendor.businessOwner)],
            ['Relationship owner', text(vendor.relationshipOwner)],
            ['Assessment state', humanizeEnum(snapshot.assessmentStatus ?? brief.assessmentStatus)],
        ]);

        drawSectionTitle(doc, 'Authoritative risk score');
        drawParagraph(doc, 'Residual and inherent values are taken from the immutable decision snapshot. Historical scores are not recalculated when this PDF is generated.');
        drawComparisonBars(doc, [
            { label: 'Inherent', value: Number(inherent || 0), color: C.high },
            { label: 'Residual', value: Number(residual || 0), color: C.navy },
        ]);
        drawKeyValueGrid(doc, [
            ['Inherent risk', text(inherent)],
            ['Residual risk', text(residual)],
            ['Risk band', text(band)],
            ['Control effectiveness', text(controlEffectiveness)],
            ['Methodology version', methodology],
            ['Score calculated', isoDate(score.calculatedAt)],
            ['Evidence confidence', humanizeEnum(snapshot.evidenceConfidence ?? brief.evidenceConfidence)],
            ['Monitoring status', humanizeEnum(snapshot.monitoringStatus) === '—' ? `${brief.monitoringAlertCount} recorded alert(s)` : humanizeEnum(snapshot.monitoringStatus)],
        ]);
        if (score.explanation) {
            drawParagraph(doc, String(score.explanation));
        }

        drawSectionTitle(doc, 'Key findings');
        if (keyFindings.length) {
            drawBullets(doc, keyFindings.slice(0, 8));
        } else {
            drawCallout(doc, 'No key findings in snapshot', 'Open finding count at decision time was recorded as ' + text(snapshot.openFindings ?? brief.openFindingsCount) + '. Individual finding titles are shown only when stored on the snapshot.', 'info');
        }

        drawSectionTitle(doc, 'Top risk factors');
        if (topFactors.length) {
            drawBullets(doc, topFactors.map((factor) => `${factor.label || factor.code}: ${Number(factor.points) >= 0 ? '+' : ''}${factor.points} — ${factor.rationale || 'Persisted factor'}`));
        } else {
            drawCallout(doc, 'No persisted factors', 'This snapshot does not include explainable factor rows. The residual score above remains the authoritative figure.', 'info');
        }

        drawSectionTitle(doc, 'AI analyst summary');
        drawParagraph(doc,
            brief.aiSummaryStatus === 'SUCCESS' && brief.aiSummary
                ? String(brief.aiSummary)
                : `AI status: ${humanizeEnum(brief.aiSummaryStatus)}. Model output is narrative only and is never treated as residual risk.`
        );

        drawSectionTitle(doc, 'Reviewer analysis');
        drawParagraph(doc, text(decision.reviewerAnalysis || brief.reviewerAnalysis));

        drawSectionTitle(doc, 'Governance disposition');
        drawKeyValueGrid(doc, [
            ['Final decision', humanizeEnum(humanDecision)],
            ['Conditions', text(decision.conditions || brief.conditions)],
            ['Decision maker', text(decidedByName || decidedByUserId)],
            ['Decision date', isoDate(decision.decidedAt || brief.decidedAt)],
            ['Next review', text(brief.nextReviewDate)],
            ['Acceptance expiry', text(acceptance.acceptanceExpiry)],
        ]);
        if (humanDecision === 'RISK_ACCEPTED') {
            drawCallout(
                doc,
                'Accepted risk metadata',
                `Risk accepted is a governance disposition. Residual risk remains ${text(acceptance.residualRisk ?? residual)} ${text(acceptance.riskBand ?? band)}. Acceptance does not reduce the scored residual.`,
                riskTone('RISK_ACCEPTED')
            );
        }
    });

    return { buffer, filenameParts: ['Supreme-Risk-Decision-Brief', vendorName, reportDate] };
}
