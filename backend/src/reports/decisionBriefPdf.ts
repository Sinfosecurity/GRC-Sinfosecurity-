import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { collectPdf, drawBrandHeader, drawDecisionStrip, drawFooter, drawSection } from './pdfBrand';
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

    const humanDecision = decision.humanDecision || brief.humanDecision;
    const vendorName = vendor.name || 'Vendor';
    const reportDate = isoDate(brief.createdAt);

    const buffer = await collectPdf((doc) => {
        drawBrandHeader(doc, {
            organizationName: text(snapshot.organizationName || organization?.name),
            title: 'Risk Decision Brief',
            subtitle: `${vendorName}  ·  ${text(vendor.service || brief.engagementName)}`,
            reportDate,
        });
        drawSection(doc, {
            heading: 'Engagement',
            rows: [
                ['Vendor', text(vendorName)],
                ['Service / engagement', text(vendor.service || brief.engagementName)],
                ['Business owner', text(vendor.businessOwner)],
                ['Relationship owner', text(vendor.relationshipOwner)],
                ['Criticality', text(vendor.criticality)],
                ['Report date', reportDate],
            ],
        });
        drawSection(doc, {
            heading: 'Authoritative risk score',
            rows: [
                ['Inherent risk', text(score.inherentRisk ?? brief.inherentRisk)],
                ['Control effectiveness', text(controlEffectiveness)],
                ['Residual risk', text(score.residualRisk ?? brief.residualRisk)],
                ['Risk band', text(score.riskBand ?? brief.riskBand)],
                ['Methodology version', text(score.version)],
                ['Score calculated', text(score.calculatedAt)],
            ],
            paragraphs: [text(score.explanation)],
        });
        drawSection(doc, {
            heading: 'Top risk factors',
            bullets: topFactors.length
                ? topFactors.map((factor) => `${factor.label || factor.code}: ${factor.points >= 0 ? '+' : ''}${factor.points} — ${factor.rationale || ''}`)
                : ['No persisted factors in this snapshot.'],
        });
        drawSection(doc, {
            heading: 'Evidence and monitoring',
            rows: [
                ['Assessment status', text(snapshot.assessmentStatus ?? brief.assessmentStatus)],
                ['Evidence confidence', text(snapshot.evidenceConfidence ?? brief.evidenceConfidence)],
                ['Open findings', text(snapshot.openFindings ?? brief.openFindingsCount)],
                ['Monitoring alerts', text(snapshot.monitoringAlerts ?? brief.monitoringAlertCount)],
            ],
        });
        drawSection(doc, {
            heading: 'AI analyst summary',
            paragraphs: [
                brief.aiSummaryStatus === 'SUCCESS' && brief.aiSummary
                    ? String(brief.aiSummary)
                    : `AI status: ${brief.aiSummaryStatus}. No model output is treated as residual risk.`,
            ],
        });
        drawSection(doc, {
            heading: 'Human reviewer analysis',
            paragraphs: [text(decision.reviewerAnalysis || brief.reviewerAnalysis)],
        });
        drawDecisionStrip(doc, humanDecision);
        drawSection(doc, {
            heading: 'Governance disposition',
            rows: [
                ['Final decision', text(humanDecision)],
                ['Conditions', text(decision.conditions || brief.conditions)],
                ['Decided by', text(decidedByName || decidedByUserId)],
                ['Decided date', text(decision.decidedAt || brief.decidedAt)],
                ['Next review', text(brief.nextReviewDate)],
                ['Acceptance expiry', text(acceptance.acceptanceExpiry)],
            ],
            paragraphs: humanDecision === 'RISK_ACCEPTED'
                ? [`Risk accepted is a governance disposition. Residual risk remains ${text(acceptance.residualRisk ?? score.residualRisk ?? brief.residualRisk)} ${text(acceptance.riskBand ?? score.riskBand ?? brief.riskBand)}.`]
                : undefined,
        });
        drawFooter(doc, 'Historical values are taken from the immutable decision snapshot. Scores are not recalculated at export.');
    });

    return { buffer, filenameParts: ['Supreme-Risk-Decision-Brief', vendorName, reportDate] };
}
