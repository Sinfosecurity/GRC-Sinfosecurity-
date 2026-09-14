import {
    ContractStatus,
    ContractType,
    IssueReviewState,
    Prisma,
    RiskDecision,
    ScanStatus,
    VendorIssueStatus,
    VendorOnboardingStage,
    VendorStatus,
    VendorTier,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { canonicalizeRole } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { notifyUser } from './notificationDeliveryService';
import { riskDecisionBriefService } from './riskDecisionBriefService';
import vendorIssueService from './vendorIssueService';
import { assertVendorTransition } from './vendorLifecycle';
import { vendorOffboardService } from './vendorOffboardService';
import { presentDueDiligence } from './vendorDueDiligenceService';
import { addBusinessDays } from './vendorOnboardingScoring';

type Actor = { id: string; role: string; name?: string };

const REVIEW_ROLES = ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR', 'COMPLIANCE_OFFICER'];
const APPROVAL_AUTHORITY: Record<string, string[]> = {
    LOW: ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR'],
    MEDIUM: ['ORGANIZATION_ADMIN', 'RISK_MANAGER'],
    HIGH: ['ORGANIZATION_ADMIN', 'RISK_MANAGER'],
    CRITICAL: ['ORGANIZATION_ADMIN'],
};

export const REASSESSMENT_DAYS: Record<VendorTier, number> = {
    CRITICAL: 90,
    HIGH: 180,
    MEDIUM: 365,
    LOW: 730,
};

function canReview(role: string) {
    return REVIEW_ROLES.includes(canonicalizeRole(role));
}

function canApprove(role: string, tier: VendorTier) {
    return (APPROVAL_AUTHORITY[tier] || APPROVAL_AUTHORITY.HIGH).includes(canonicalizeRole(role));
}

async function loadVendor(organizationId: string, vendorKey: string) {
    const vendor = await prisma.vendor.findFirst({
        where: { organizationId, OR: [{ id: vendorKey }, { publicId: vendorKey }] },
        include: { onboarding: true },
    });
    if (!vendor?.onboarding) throw new ApiError(404, 'Vendor onboarding was not found.');
    return vendor;
}

async function history(organizationId: string, actorId: string, vendorId: string, action: string, summary: string) {
    await recordAudit({
        organizationId,
        actorUserId: actorId,
        action,
        resourceType: 'VendorOnboarding',
        resourceId: vendorId,
        result: 'success',
        metadata: { summary },
    });
}

function contractRequirements(tier: VendorTier, plan: any) {
    const triggers = plan?.triggers || {};
    return [
        { key: 'security_addendum', label: 'Security addendum', required: true, rationale: 'Required for every third-party engagement.' },
        { key: 'breach_notification', label: 'Breach notification', required: true, rationale: 'Required so the customer is notified of a security incident.' },
        { key: 'subprocessor', label: 'Subprocessor obligations', required: Boolean(triggers.fourthParty || triggers.resilience), rationale: 'Required when fourth parties or critical availability are in scope.' },
        { key: 'dpa', label: 'Data processing agreement', required: Boolean(triggers.privacy), rationale: 'Required because personal data is in scope.' },
        { key: 'baa', label: 'Business associate agreement', required: Boolean(triggers.phi), rationale: 'Required only when PHI is in scope.' },
        { key: 'deletion_return', label: 'Deletion or return of customer data', required: true, rationale: 'Required at the end of the relationship.' },
        { key: 'right_to_audit', label: 'Assurance / right to audit', required: tier === VendorTier.CRITICAL || tier === VendorTier.HIGH, rationale: 'Required for High and Critical vendors.' },
    ];
}

async function openConfirmedFindings(organizationId: string, vendorId: string) {
    return prisma.vendorIssue.findMany({
        where: {
            organizationId,
            vendorId,
            reviewState: IssueReviewState.CONFIRMED,
            status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS, VendorIssueStatus.PENDING_VALIDATION, VendorIssueStatus.REMEDIATED] },
        },
    });
}

export async function presentLifecycle(organizationId: string, vendorKey: string, actor: Actor) {
    const base = await presentDueDiligence(organizationId, vendorKey, actor);
    const vendor = await loadVendor(organizationId, vendorKey);
    const onboarding = vendor.onboarding!;
    const findings = await prisma.vendorIssue.findMany({
        where: { organizationId, vendorId: vendor.id, reviewState: { not: IssueReviewState.DRAFT } },
        orderBy: { createdAt: 'asc' },
    });
    const briefs = await prisma.riskDecisionBrief.findMany({
        where: { organizationId, vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
    });
    const latestScore = await prisma.scoreCalculation.findFirst({
        where: { organizationId, vendorId: vendor.id },
        orderBy: { calculatedAt: 'desc' },
    });
    const checklist = Array.isArray(onboarding.contractChecklist)
        ? onboarding.contractChecklist
        : contractRequirements(vendor.tier, onboarding.plan);
    const monitoring = {
        vendorStatus: vendor.status,
        residualRisk: latestScore?.residualRisk ?? null,
        openFindings: findings.filter((row) => ['OPEN', 'IN_PROGRESS', 'PENDING_VALIDATION'].includes(row.status)).length,
        acceptedRisks: findings.filter((row) => row.status === VendorIssueStatus.RISK_ACCEPTED).length,
        overdueRemediation: findings.filter((row) => row.targetRemediationDate && row.targetRemediationDate < new Date() && ['OPEN', 'IN_PROGRESS'].includes(row.status)).length,
        nextReassessment: onboarding.nextReassessmentAt,
        contractAttested: Boolean(onboarding.contractAttestedAt),
        acceptanceExpiring: briefs.filter((row) => row.humanDecision === 'RISK_ACCEPTED' && row.nextReviewDate && row.nextReviewDate < addBusinessDays(new Date(), 20)).length,
        externalIntelligence: 'Only shown when a monitoring provider is connected.',
    };
    return {
        ...base,
        lifecycle: {
            stage: onboarding.stage,
            vendorStatus: vendor.status,
            residualRisk: latestScore?.residualRisk ?? null,
            residualAtApproval: onboarding.residualAtApproval,
            checklist,
            contractAttestedAt: onboarding.contractAttestedAt,
            approvalDecision: onboarding.approvalDecision,
            approvalConditions: onboarding.approvalConditions,
            nextReassessmentAt: onboarding.nextReassessmentAt,
            reassessmentFrequencyDays: onboarding.reassessmentFrequencyDays,
            findings: findings.map((row) => ({
                id: row.id,
                title: row.title,
                severity: row.severity,
                status: row.status,
                assignedTo: row.assignedTo,
                dueDate: row.targetRemediationDate,
                cap: row.correctiveActionPlan,
                validatedAt: row.validatedAt,
            })),
            decisions: briefs.map((row) => ({
                id: row.id,
                decision: row.humanDecision,
                conditions: row.conditions,
                residualRisk: row.residualRisk,
                nextReviewDate: row.nextReviewDate,
            })),
            monitoring,
        },
    };
}

export async function planRemediation(organizationId: string, vendorKey: string, actor: Actor, findingId: string, input: {
    assignedTo?: string;
    dueDate?: string;
    cap?: string;
}) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can assign remediation.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId, vendorId: vendor.id, reviewState: IssueReviewState.CONFIRMED } });
    if (!finding) throw new ApiError(404, 'Confirmed finding not found.');
    await prisma.vendorIssue.update({
        where: { id: finding.id },
        data: {
            assignedTo: input.assignedTo || vendor.businessOwnerUserId || actor.id,
            targetRemediationDate: input.dueDate ? new Date(input.dueDate) : addBusinessDays(new Date(), finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 30 : finding.severity === 'MEDIUM' ? 90 : 180),
            correctiveActionPlan: input.cap || finding.correctiveActionPlan,
            status: VendorIssueStatus.IN_PROGRESS,
            validationRequired: true,
        },
    });
    await prisma.vendorOnboarding.update({ where: { vendorId: vendor.id }, data: { stage: VendorOnboardingStage.REMEDIATION } });
    await history(organizationId, actor.id, vendor.id, 'vendor.remediation_planned', `${actor.name || 'Analyst'} assigned remediation.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function validateFinding(organizationId: string, vendorKey: string, actor: Actor, findingId: string, input: { approved: boolean; notes?: string }) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can validate remediation.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId, vendorId: vendor.id } });
    if (!finding) throw new ApiError(404, 'Finding not found.');
    await vendorIssueService.validateRemediation(finding.id, organizationId, actor.id, input.notes || 'Validation recorded.', input.approved);
    await history(organizationId, actor.id, vendor.id, 'vendor.remediation_validated', `${actor.name || 'Analyst'} recorded remediation validation.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function closeFinding(organizationId: string, vendorKey: string, actor: Actor, findingId: string, input: { notes?: string; evidenceId?: string }) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can close a finding.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId, vendorId: vendor.id } });
    if (!finding) throw new ApiError(404, 'Finding not found.');
    if (finding.reviewState !== IssueReviewState.CONFIRMED) throw new ApiError(409, 'Only a confirmed finding can enter remediation close.');
    const evidenceId = input.evidenceId || finding.closureEvidence || finding.evidenceUrl;
    if (!evidenceId) throw new ApiError(409, 'Close requires governed remediation evidence.');
    const stored = await prisma.storedObject.findFirst({ where: { id: evidenceId, organizationId, ownerId: vendor.id } });
    if (!stored || stored.scanStatus !== ScanStatus.CLEAN) throw new ApiError(409, 'Remediation evidence must be ready before the finding can close.');
    if (!finding.validatedAt) throw new ApiError(409, 'An analyst must validate remediation before close.');
    await vendorIssueService.closeIssue(finding.id, organizationId, actor.id, input.notes || 'Closed with ready remediation evidence.', stored.id);
    await history(organizationId, actor.id, vendor.id, 'vendor.finding_closed', `${actor.name || 'Analyst'} closed a finding.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function acceptFindingRisk(organizationId: string, vendorKey: string, actor: Actor, findingId: string, input: {
    rationale?: string;
    conditions?: string;
    expiry?: string;
}) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can request risk acceptance.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId, vendorId: vendor.id, reviewState: IssueReviewState.CONFIRMED } });
    if (!finding) throw new ApiError(404, 'Confirmed finding not found.');
    if (!String(input.rationale || '').trim()) throw new ApiError(400, 'Acceptance requires a rationale.');
    const expiry = input.expiry ? new Date(input.expiry) : addBusinessDays(new Date(), 180);
    if (expiry.getTime() - Date.now() > 366 * 24 * 60 * 60 * 1000) throw new ApiError(400, 'Risk acceptance cannot exceed 12 months.');
    const before = await prisma.scoreCalculation.findFirst({ where: { organizationId, vendorId: vendor.id }, orderBy: { calculatedAt: 'desc' } });
    const brief = await riskDecisionBriefService.generate(organizationId, vendor.id, actor.id);
    await riskDecisionBriefService.decide(organizationId, brief.id, {
        decision: 'RISK_ACCEPTED' as RiskDecision,
        conditions: input.conditions,
        reviewerAnalysis: `${finding.title}: ${input.rationale}`,
        nextReviewDate: expiry.toISOString(),
        actorUserId: actor.id,
    });
    await vendorIssueService.acceptRisk(finding.id, organizationId, actor.id, input.rationale!);
    const after = await prisma.scoreCalculation.findFirst({ where: { organizationId, vendorId: vendor.id }, orderBy: { calculatedAt: 'desc' } });
    if (before && after && before.residualRisk !== after.residualRisk) {
        throw new ApiError(500, 'Risk acceptance must not change the residual score.');
    }
    await prisma.vendorOnboarding.update({ where: { vendorId: vendor.id }, data: { stage: VendorOnboardingStage.RISK_ACCEPTANCE } });
    await history(organizationId, actor.id, vendor.id, 'vendor.risk_accepted', `${actor.name || 'Analyst'} recorded a time-bounded risk acceptance. Residual score unchanged.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function attestContract(organizationId: string, vendorKey: string, actor: Actor, input: { attested?: boolean; clauses?: Record<string, boolean> }) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer or legal reviewer can attest contract requirements.');
    const vendor = await loadVendor(organizationId, vendorKey);
    if (!input.attested) throw new ApiError(400, 'Legal attestation is required.');
    const required = contractRequirements(vendor.tier, vendor.onboarding?.plan);
    const clauses = input.clauses || {};
    const missing = required.filter((row) => row.required && !clauses[row.key]);
    if (missing.length) throw new ApiError(409, `${missing.length} required contract item${missing.length === 1 ? '' : 's'} remain.`);
    const existing = await prisma.vendorContract.findFirst({ where: { organizationId, vendorId: vendor.id } });
    if (!existing) {
        await prisma.vendorContract.create({
            data: {
                vendorId: vendor.id,
                organizationId,
                contractType: ContractType.MASTER_SERVICE_AGREEMENT,
                title: `${vendor.name} third-party agreement`,
                effectiveDate: new Date(),
                expirationDate: addBusinessDays(new Date(), 365),
                contractValue: vendor.estimatedAnnualSpend || 0,
                hasDataProtectionClause: Boolean(clauses.dpa),
                hasRightToAudit: Boolean(clauses.right_to_audit),
                hasBreachNotification: Boolean(clauses.breach_notification),
                hasSubcontractorControls: Boolean(clauses.subprocessor),
                hasDPA: Boolean(clauses.dpa),
                dpaSignedDate: clauses.dpa ? new Date() : undefined,
                status: ContractStatus.ACTIVE,
                approvedBy: actor.id,
                approvedAt: new Date(),
            },
        });
    }
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.APPROVAL,
            contractChecklist: required.map((row) => ({ ...row, attested: Boolean(clauses[row.key]) })) as Prisma.InputJsonValue,
            contractAttestedAt: new Date(),
            contractAttestedBy: actor.id,
        },
    });
    await history(organizationId, actor.id, vendor.id, 'vendor.contract_attested', `${actor.name || 'Legal'} attested the required contract controls.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function decideApproval(organizationId: string, vendorKey: string, actor: Actor, input: {
    decision?: 'APPROVE' | 'REJECT' | 'APPROVE_WITH_CONDITIONS';
    conditions?: string;
    rationale?: string;
}) {
    const vendor = await loadVendor(organizationId, vendorKey);
    if (!canApprove(actor.role, vendor.tier)) throw new ApiError(403, 'This role cannot approve this vendor tier.');
    if (!input.decision) throw new ApiError(400, 'Approve, reject, or approve with conditions.');
    if (input.decision === 'APPROVE_WITH_CONDITIONS' && !String(input.conditions || '').trim()) {
        throw new ApiError(400, 'Conditions are required.');
    }
    const open = await openConfirmedFindings(organizationId, vendor.id);
    if (input.decision !== 'REJECT' && open.length) {
        throw new ApiError(409, `${open.length} confirmed finding${open.length === 1 ? '' : 's'} still require remediation or acceptance.`);
    }
    if (input.decision !== 'REJECT' && !vendor.onboarding?.contractAttestedAt) {
        throw new ApiError(409, 'Contract requirements must be attested before approval.');
    }
    const latest = await prisma.scoreCalculation.findFirst({ where: { organizationId, vendorId: vendor.id }, orderBy: { calculatedAt: 'desc' } });
    const brief = await riskDecisionBriefService.generate(organizationId, vendor.id, actor.id);
    await riskDecisionBriefService.decide(organizationId, brief.id, {
        decision: input.decision as RiskDecision,
        conditions: input.conditions,
        reviewerAnalysis: input.rationale || `${vendor.name} ${input.decision.toLowerCase().replace(/_/g, ' ')}.`,
        actorUserId: actor.id,
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: input.decision === 'REJECT' ? VendorOnboardingStage.UNDER_REVIEW : VendorOnboardingStage.APPROVAL,
            approvalDecision: input.decision,
            approvalConditions: input.conditions,
            approvedAt: new Date(),
            approvedBy: actor.id,
            residualAtApproval: latest?.residualRisk ?? null,
        },
    });
    if (input.decision === 'REJECT') {
        assertVendorTransition(vendor.status, VendorStatus.REJECTED);
        await prisma.vendor.update({ where: { id: vendor.id }, data: { status: VendorStatus.REJECTED } });
    }
    await history(organizationId, actor.id, vendor.id, 'vendor.approval_decided', `${actor.name || 'Approver'} recorded ${input.decision}.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function activateVendor(organizationId: string, vendorKey: string, actor: Actor) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can activate a vendor.');
    const vendor = await loadVendor(organizationId, vendorKey);
    if (!['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(String(vendor.onboarding?.approvalDecision))) {
        throw new ApiError(409, 'Activation requires a human approval decision.');
    }
    const open = await openConfirmedFindings(organizationId, vendor.id);
    if (open.length) throw new ApiError(409, 'Activation cannot proceed while confirmed findings remain open.');
    const next = vendor.status === VendorStatus.PROPOSED ? VendorStatus.APPROVED : vendor.status;
    if (next === VendorStatus.APPROVED && vendor.status === VendorStatus.PROPOSED) {
        assertVendorTransition(vendor.status, VendorStatus.APPROVED);
        await prisma.vendor.update({ where: { id: vendor.id }, data: { status: VendorStatus.APPROVED } });
    }
    const current = (await prisma.vendor.findUnique({ where: { id: vendor.id }, select: { status: true } }))!.status;
    assertVendorTransition(current, VendorStatus.ACTIVE);
    const frequency = REASSESSMENT_DAYS[vendor.tier];
    const nextReassessmentAt = addBusinessDays(new Date(), frequency);
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.ACTIVE, nextReviewDate: nextReassessmentAt },
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.ACTIVE,
            lifecycleActivatedAt: new Date(),
            reassessmentFrequencyDays: frequency,
            nextReassessmentAt,
        },
    });
    if (vendor.businessOwnerUserId) {
        await notifyUser({
            organizationId,
            userId: vendor.businessOwnerUserId,
            eventType: 'approval.decision',
            title: 'Third party is active',
            body: `${vendor.name} is active. Next reassessment is scheduled.`,
            resourceType: 'Vendor',
            resourceId: vendor.id,
        });
    }
    await history(organizationId, actor.id, vendor.id, 'vendor.activated', `${actor.name || 'Analyst'} activated the vendor. Supreme set the review cadence.`);
    return presentLifecycle(organizationId, vendor.id, actor);
}

export async function recommendReassessment(organizationId: string, vendorKey: string, actor: Actor) {
    const vendor = await loadVendor(organizationId, vendorKey);
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, vendorId: vendor.id, respondentPlane: 'VENDOR' },
        include: { responses: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
    });
    const latest = assessments[0];
    const prior = assessments.find((row) => row.id !== latest?.id);
    const changed = latest && prior
        ? latest.responses.filter((row) => {
            const previous = prior.responses.find((item) => item.questionId === row.questionId);
            return previous && previous.response && row.response && previous.response !== row.response;
        }).length
        : 0;
    const yearAgo = new Date();
    yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
    const expiredEvidence = await prisma.storedObject.count({
        where: { organizationId, ownerId: vendor.id, uploadedAt: { lt: yearAgo } },
    });
    const unresolved = await openConfirmedFindings(organizationId, vendor.id);
    const plan = vendor.onboarding?.plan as { triggers?: Record<string, boolean> } | null;
    const recommendation = unresolved.length || expiredEvidence || changed > 3 || plan?.triggers?.privacy || plan?.triggers?.aiGovernance
        ? 'Full reassessment'
        : changed
            ? 'Targeted reassessment'
            : 'Reconfirm previous answers';
    return {
        recommendation,
        changedAnswers: changed,
        expiredEvidence,
        unresolvedFindings: unresolved.length,
        previousAnswersEligible: Boolean(prior),
        newScope: {
            privacy: Boolean(plan?.triggers?.privacy),
            aiGovernance: Boolean(plan?.triggers?.aiGovernance),
        },
        nextAction: recommendation === 'Reconfirm previous answers'
            ? 'Ask the vendor to reconfirm unchanged answers and replace expired evidence.'
            : `Start a ${recommendation.toLowerCase()}.`,
    };
}

export async function startReassessment(organizationId: string, vendorKey: string, actor: Actor) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can start reassessment.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const recommendation = await recommendReassessment(organizationId, vendorKey, actor);
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: { stage: VendorOnboardingStage.REASSESSMENT, lastReassessmentAt: new Date() },
    });
    await history(organizationId, actor.id, vendor.id, 'vendor.reassessment_started', `${actor.name || 'Analyst'} started a ${recommendation.recommendation.toLowerCase()}.`);
    return { ...await presentLifecycle(organizationId, vendor.id, actor), reassessment: recommendation };
}

export async function startOffboarding(organizationId: string, vendorKey: string, actor: Actor, input: { exitNotes?: string; acknowledgeOutstanding?: boolean }) {
    if (!canReview(actor.role)) throw new ApiError(403, 'Only a risk reviewer can start offboarding.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const result = await vendorOffboardService.offboard({
        organizationId,
        vendorId: vendor.id,
        actorUserId: actor.id,
        exitNotes: input.exitNotes,
        acknowledgeOutstanding: input.acknowledgeOutstanding,
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: { stage: VendorOnboardingStage.OFFBOARDING },
    });
    await history(organizationId, actor.id, vendor.id, 'vendor.offboarding_started', `${actor.name || 'Analyst'} started offboarding. Records are retained.`);
    return { ...await presentLifecycle(organizationId, vendor.id, actor), offboarding: result };
}
