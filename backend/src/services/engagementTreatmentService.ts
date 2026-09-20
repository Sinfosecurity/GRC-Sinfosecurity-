import {
    DecisionBriefStatus,
    EngagementAcceptanceStatus,
    EngagementApprovalStatus,
    EngagementApprovalType,
    EngagementContractGateStatus,
    EngagementContractRequirementSource,
    EngagementContractRequirementStatus,
    EngagementResidualStatus,
    EngagementStatus,
    EngagementTransferMechanism,
    EngagementTreatmentStatus,
    EngagementTreatmentType,
    GovernanceNodeType,
    GovernanceRelationshipType,
    IssueSeverity,
    Prisma,
    RiskDecision,
    VendorIssueStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import type { Actor } from './intakeEngagementService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';

const OPEN_FINDING = new Set<VendorIssueStatus>([
    VendorIssueStatus.OPEN,
    VendorIssueStatus.IN_PROGRESS,
    VendorIssueStatus.PENDING_VENDOR,
    VendorIssueStatus.PENDING_VALIDATION,
    VendorIssueStatus.REMEDIATED,
    VendorIssueStatus.ESCALATED,
]);

const HIGH_FINDING = new Set<IssueSeverity>([IssueSeverity.HIGH, IssueSeverity.CRITICAL]);

const TERMINAL = new Set<EngagementStatus>([
    EngagementStatus.ACTIVE,
    EngagementStatus.AVOIDED,
    EngagementStatus.REJECTED,
]);

export type GateBlocker = {
    code: string;
    label: string;
    href: string;
};

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') {
        throw new ApiError(403, 'Requesters cannot open Engagement treatment, acceptance, contract, or activation work.');
    }
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open internal Engagement decision work.');
    }
}

function canRead(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.read'])
        || hasPermission(actor.role, PERMISSIONS['risk.read'])
        || hasPermission(actor.role, PERMISSIONS['approval.read'])
        || hasPermission(actor.role, PERMISSIONS['finding.read']);
}

function canTreat(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['risk.treat'])
        || hasPermission(actor.role, PERMISSIONS['intake.triage']);
}

function canApprove(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['risk.accept'])
        || hasPermission(actor.role, PERMISSIONS['approval.decide'])
        || hasPermission(actor.role, PERMISSIONS['risk.approve']);
}

function canActivate(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['engagement.activate']);
}

function canManageContracts(actor: Actor) {
    return canTreat(actor) || hasPermission(actor.role, PERMISSIONS['exception.create']);
}

async function loadEngagement(organizationId: string, key: string) {
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, OR: [{ id: key }, { publicId: key }] },
        include: {
            vendor: { select: { id: true, name: true, publicId: true, legalName: true } },
            ira: true,
            dueDiligencePlan: true,
            originatingIntake: { select: { id: true, publicId: true } },
        },
    });
    if (!engagement) throw new ApiError(404, 'Engagement not found.');
    return engagement;
}

async function audit(organizationId: string, actorId: string | null, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({ organizationId, actorUserId: actorId, action, resourceType, resourceId, result: 'success', metadata });
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: NotificationEvent, title: string, body: string, resourceType: string, resourceId: string) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType, title, body, resourceType, resourceId });
}

function asIds(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function parseDate(value: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseType(value: unknown): EngagementTreatmentType {
    const type = String(value || '').toUpperCase();
    if (type === 'MITIGATE' || type === 'ACCEPT' || type === 'TRANSFER' || type === 'AVOID') return type;
    throw new ApiError(400, 'Treatment type must be MITIGATE, ACCEPT, TRANSFER, or AVOID.');
}

function parseDecision(value: unknown): 'APPROVED' | 'REJECTED' | 'RETURNED' {
    const decision = String(value || '').toUpperCase();
    if (decision === 'APPROVED' || decision === 'APPROVE') return 'APPROVED';
    if (decision === 'REJECTED' || decision === 'REJECT') return 'REJECTED';
    if (decision === 'RETURNED' || decision === 'RETURN' || decision === 'NEEDS_CHANGES') return 'RETURNED';
    throw new ApiError(400, 'Decision must be approve, reject, or return.');
}

function parseRequirementSource(value: unknown): EngagementContractRequirementSource {
    const source = String(value || '').toUpperCase();
    const allowed = Object.values(EngagementContractRequirementSource) as string[];
    if (allowed.includes(source)) return source as EngagementContractRequirementSource;
    throw new ApiError(400, 'Contract requirement source is required and must be a recorded source type.');
}

async function latestResidual(organizationId: string, engagementId: string) {
    return prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId, status: { not: EngagementResidualStatus.NOT_READY } },
        orderBy: { createdAt: 'desc' },
    });
}

async function latestTreatment(organizationId: string, engagementId: string) {
    return prisma.engagementRiskTreatment.findFirst({
        where: { organizationId, engagementId, status: { not: EngagementTreatmentStatus.SUPERSEDED } },
        orderBy: { createdAt: 'desc' },
    });
}

async function latestAcceptance(organizationId: string, engagementId: string) {
    return prisma.engagementRiskAcceptance.findFirst({
        where: { organizationId, engagementId, status: { not: EngagementAcceptanceStatus.SUPERSEDED } },
        orderBy: { createdAt: 'desc' },
    });
}

async function latestGate(organizationId: string, engagementId: string) {
    return prisma.engagementContractGate.findFirst({
        where: { organizationId, engagementId },
        orderBy: { createdAt: 'desc' },
    });
}

async function latestActivation(organizationId: string, engagementId: string) {
    return prisma.engagementActivation.findFirst({
        where: { organizationId, engagementId },
        orderBy: { createdAt: 'desc' },
    });
}

async function allowSelfApproval(organizationId: string) {
    const policy = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
    });
    if (!policy) return false;
    return false;
}

function assertIndependentApprover(actor: Actor, requesterUserId: string, allowSelf: boolean) {
    if (!allowSelf && actor.id === requesterUserId) {
        throw new ApiError(403, 'The requester of this decision cannot approve their own request.');
    }
}

function residualSnapshot(residual: {
    id: string;
    residualScore: number | null;
    residualBand: string | null;
    methodologyVersion: string;
}) {
    if (residual.residualScore == null || !residual.residualBand) {
        throw new ApiError(409, 'Confirmed residual risk is required before a treatment decision.');
    }
    return {
        residualAssessmentId: residual.id,
        residualScoreSnapshot: residual.residualScore,
        residualBandSnapshot: residual.residualBand,
        residualMethodologyVersion: residual.methodologyVersion,
    };
}

export function computeGateBlockers(input: {
    engagementId: string;
    residual: { status: EngagementResidualStatus; residualBand: string | null } | null;
    treatment: {
        type: EngagementTreatmentType;
        status: EngagementTreatmentStatus;
        mitigationAction: string | null;
        mitigationCompletionCondition: string | null;
        conditions: string | null;
        transferMechanism: EngagementTransferMechanism | null;
    } | null;
    acceptance: { status: EngagementAcceptanceStatus } | null;
    approvals: Array<{ status: EngagementApprovalStatus; type: EngagementApprovalType }>;
    requirements: Array<{
        id: string;
        requirement: string;
        mandatory: boolean;
        status: EngagementContractRequirementStatus;
    }>;
    exceptions: Array<{
        requirementId: string;
        status: EngagementApprovalStatus;
        expiresAt: Date | null;
    }>;
    openHighFindings: number;
}): GateBlocker[] {
    const href = `/engagements/${input.engagementId}/decisions`;
    const blockers: GateBlocker[] = [];
    if (!input.residual || input.residual.status !== EngagementResidualStatus.CONFIRMED || !input.residual.residualBand) {
        blockers.push({ code: 'residual_missing', label: 'Residual risk is not confirmed', href: `/engagements/${input.engagementId}/residual-risk` });
    }
    if (!input.treatment) {
        blockers.push({ code: 'treatment_missing', label: 'Treatment has not been selected', href });
        return blockers;
    }
    if (input.treatment.type === EngagementTreatmentType.AVOID) {
        blockers.push({ code: 'avoided', label: 'Engagement was avoided and cannot become Active', href });
        return blockers;
    }
    if (input.treatment.type === EngagementTreatmentType.ACCEPT) {
        if (!input.acceptance || input.acceptance.status !== EngagementAcceptanceStatus.APPROVED) {
            blockers.push({ code: 'acceptance_pending', label: 'Risk acceptance awaiting approval', href });
        }
    }
    if (input.treatment.type === EngagementTreatmentType.TRANSFER && !input.treatment.transferMechanism) {
        blockers.push({ code: 'transfer_incomplete', label: 'Transfer mechanism is not recorded', href });
    }
    if (input.treatment.type === EngagementTreatmentType.MITIGATE) {
        if (!input.treatment.mitigationAction) {
            blockers.push({ code: 'mitigation_incomplete', label: 'Mitigation plan is incomplete', href });
        }
        const postActivationAllowed = /post-activation|post activation/i.test(`${input.treatment.conditions || ''} ${input.treatment.mitigationCompletionCondition || ''}`);
        if (input.openHighFindings > 0 && !input.treatment.mitigationCompletionCondition && !postActivationAllowed) {
            blockers.push({ code: 'high_finding_condition', label: 'High Finding requires approved remediation condition', href });
        }
    }
    if (input.approvals.some((row) => row.status === EngagementApprovalStatus.REQUESTED || row.status === EngagementApprovalStatus.PENDING)) {
        blockers.push({ code: 'approval_pending', label: 'Required approval is still pending', href });
    }
    const now = Date.now();
    for (const requirement of input.requirements) {
        if (!requirement.mandatory) continue;
        if (requirement.status === EngagementContractRequirementStatus.SATISFIED) continue;
        const approved = input.exceptions.find((row) => (
            row.requirementId === requirement.id
            && row.status === EngagementApprovalStatus.APPROVED
            && (!row.expiresAt || row.expiresAt.getTime() > now)
        ));
        if (requirement.status === EngagementContractRequirementStatus.EXCEPTION_APPROVED && approved) continue;
        if (approved) continue;
        blockers.push({
            code: `requirement_${requirement.id}`,
            label: `Mandatory ${requirement.requirement} requirement not recorded`,
            href,
        });
    }
    return blockers;
}

function gateStatusFrom(blockers: GateBlocker[], treatmentType?: EngagementTreatmentType | null): EngagementContractGateStatus {
    if (treatmentType === EngagementTreatmentType.AVOID) return EngagementContractGateStatus.BLOCKED;
    if (!treatmentType) return EngagementContractGateStatus.NOT_READY;
    if (blockers.length) return EngagementContractGateStatus.BLOCKED;
    return EngagementContractGateStatus.APPROVED;
}

function nextActionFor(status: EngagementStatus, extras: {
    residualConfirmed?: boolean;
    treatmentType?: EngagementTreatmentType | null;
    acceptanceStatus?: EngagementAcceptanceStatus | null;
    gateStatus?: EngagementContractGateStatus | null;
    mandatoryOpen?: boolean;
}) {
    return engagementPrimaryAction(status, extras);
}

async function writeDecisionGraph(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string }, briefId: string, version: number) {
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
    });
    const decisionNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.DECISION,
        sourceModel: 'RiskDecisionBrief',
        sourceId: briefId,
        displayLabel: `${engagement.publicId} decision v${version}`,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: engagementNode.node.id,
        toNodeId: decisionNode.node.id,
        relationshipType: GovernanceRelationshipType.HAS_DECISION,
    });
}

async function writeRequirementGraph(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string }, requirement: { id: string; requirement: string }) {
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
    });
    const requirementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.REQUIREMENT,
        sourceModel: 'EngagementContractRequirement',
        sourceId: requirement.id,
        displayLabel: requirement.requirement.slice(0, 120),
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: engagementNode.node.id,
        toNodeId: requirementNode.node.id,
        relationshipType: GovernanceRelationshipType.SUBJECT_TO,
    });
}

async function collectContext(organizationId: string, engagementId: string) {
    const [residual, treatment, acceptance, approvals, requirements, exceptions, gates, activation, briefs, findings, controls, compensating] = await Promise.all([
        latestResidual(organizationId, engagementId),
        latestTreatment(organizationId, engagementId),
        latestAcceptance(organizationId, engagementId),
        prisma.engagementDecisionApproval.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } }),
        prisma.engagementContractRequirement.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'asc' } }),
        prisma.engagementContractException.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' } }),
        prisma.engagementContractGate.findMany({ where: { organizationId, engagementId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        latestActivation(organizationId, engagementId),
        prisma.riskDecisionBrief.findMany({ where: { organizationId, engagementId }, orderBy: { versionNumber: 'desc' } }),
        prisma.vendorIssue.findMany({
            where: { organizationId, engagementId, reviewState: 'CONFIRMED' },
            select: { id: true, title: true, status: true, severity: true },
        }),
        prisma.engagementControlEffectiveness.findMany({
            where: { organizationId, engagementId },
            select: { id: true, controlTitle: true, rating: true },
        }),
        prisma.engagementCompensatingControl.findMany({
            where: { organizationId, engagementId },
            select: { id: true, description: true, consideredInResidual: true },
        }),
    ]);
    const openFindings = findings.filter((row) => OPEN_FINDING.has(row.status));
    const openHighFindings = openFindings.filter((row) => HIGH_FINDING.has(row.severity)).length;
    const blockers = computeGateBlockers({
        engagementId,
        residual: residual ? { status: residual.status, residualBand: residual.residualBand } : null,
        treatment,
        acceptance,
        approvals,
        requirements,
        exceptions,
        openHighFindings,
    });
    return {
        residual,
        treatment,
        acceptance,
        approvals,
        requirements,
        exceptions,
        gates,
        activation,
        briefs,
        findings,
        openFindings,
        openHighFindings,
        controls,
        compensating,
        blockers,
        gateStatus: gateStatusFrom(blockers, treatment?.type),
    };
}

async function persistGate(organizationId: string, engagement: { id: string; vendorId: string; status: EngagementStatus }, actorId: string, ctx: Awaited<ReturnType<typeof collectContext>>) {
    const row = await prisma.engagementContractGate.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            residualAssessmentId: ctx.residual?.id,
            treatmentId: ctx.treatment?.id,
            status: ctx.gateStatus,
            blockers: ctx.blockers as unknown as Prisma.InputJsonValue,
            evaluatedAt: new Date(),
            evaluatedByUserId: actorId,
        },
    });
    const nextStatus = engagement.status === EngagementStatus.ACTIVE || engagement.status === EngagementStatus.AVOIDED || engagement.status === EngagementStatus.REJECTED
        ? engagement.status
        : ctx.treatment?.type === EngagementTreatmentType.AVOID
            ? EngagementStatus.AVOIDED
            : ctx.gateStatus === EngagementContractGateStatus.APPROVED
                ? EngagementStatus.GATE_APPROVED
                : ctx.gateStatus === EngagementContractGateStatus.BLOCKED
                    ? EngagementStatus.GATE_BLOCKED
                    : engagement.status;
    if (nextStatus !== engagement.status) {
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: nextStatus } });
    }
    await audit(organizationId, actorId, 'contract_gate.evaluated', 'EngagementContractGate', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualAssessmentId: ctx.residual?.id,
        status: row.status,
        blockerCount: ctx.blockers.length,
    });
    if (row.status === EngagementContractGateStatus.BLOCKED) {
        await audit(organizationId, actorId, 'contract_gate.blocked', 'EngagementContractGate', row.id, {
            engagementId: engagement.id,
            blockers: ctx.blockers.map((item) => item.code),
        });
    }
    if (row.status === EngagementContractGateStatus.APPROVED) {
        await audit(organizationId, actorId, 'contract_gate.approved', 'EngagementContractGate', row.id, {
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            residualAssessmentId: ctx.residual?.id,
        });
    }
    return { row, nextStatus };
}

export async function getDecisionWorkspace(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot view Engagement decisions.');
    const engagement = await loadEngagement(organizationId, key);
    const ctx = await collectContext(organizationId, engagement.id);
    const residualConfirmed = ctx.residual?.status === EngagementResidualStatus.CONFIRMED;
    const next = nextActionFor(engagement.status, {
        residualConfirmed,
        treatmentType: ctx.treatment?.type,
        acceptanceStatus: ctx.acceptance?.status,
        gateStatus: ctx.gateStatus,
        mandatoryOpen: ctx.requirements.some((row) => row.mandatory && row.status === EngagementContractRequirementStatus.OPEN),
    });
    const siblings = await prisma.engagement.findMany({
        where: { organizationId, vendorId: engagement.vendorId },
        select: { id: true, publicId: true, serviceName: true, status: true },
    });
    return {
        what: `${engagement.publicId} · ${engagement.serviceName}`,
        thirdParty: engagement.vendor,
        engagement: {
            id: engagement.id,
            publicId: engagement.publicId,
            serviceName: engagement.serviceName,
            businessPurpose: engagement.businessPurpose,
            businessOwnerName: engagement.businessOwnerName,
            status: engagement.status,
        },
        confirmedInherent: {
            confirmedTier: engagement.ira?.confirmedTier || null,
            source: engagement.ira?.confirmedTier ? 'EngagementIra.confirmedTier' : null,
        },
        residual: ctx.residual ? {
            id: ctx.residual.id,
            status: ctx.residual.status,
            residualBand: ctx.residual.residualBand,
            residualScore: ctx.residual.residualScore,
            methodologyVersion: ctx.residual.methodologyVersion,
            explanation: ctx.residual.explanation,
            factors: ctx.residual.factors,
        } : null,
        calculationDrivers: ctx.residual?.factors || [],
        openFindings: ctx.openFindings,
        controlEffectiveness: ctx.controls,
        compensatingControls: ctx.compensating,
        treatment: ctx.treatment,
        acceptance: ctx.acceptance,
        approvals: ctx.approvals,
        contractRequirements: ctx.requirements,
        contractExceptions: ctx.exceptions,
        gate: ctx.gates[0] ? { ...ctx.gates[0], blockers: ctx.blockers, status: ctx.gateStatus } : {
            status: ctx.gateStatus,
            blockers: ctx.blockers,
        },
        activation: ctx.activation,
        decisionBriefs: ctx.briefs.map((row) => ({
            id: row.id,
            versionNumber: row.versionNumber,
            status: row.status,
            residualRisk: row.residualRisk,
            riskBand: row.riskBand,
            humanDecision: row.humanDecision,
            createdAt: row.createdAt,
            decidedAt: row.decidedAt,
        })),
        history: {
            treatments: await prisma.engagementRiskTreatment.findMany({ where: { organizationId, engagementId: engagement.id }, orderBy: { createdAt: 'desc' } }),
            acceptances: await prisma.engagementRiskAcceptance.findMany({ where: { organizationId, engagementId: engagement.id }, orderBy: { createdAt: 'desc' } }),
            gates: ctx.gates,
        },
        requiredApprovals: ctx.treatment?.type === EngagementTreatmentType.ACCEPT
            ? ['Independent risk.accept or approval.decide capability']
            : [],
        nextAction: next.label,
        primaryAction: next,
        wave5Started: Boolean(ctx.treatment),
        wave6Started: false,
        postActivation: engagement.status === EngagementStatus.ACTIVE
            ? 'Engagement Active. Monitoring setup pending Wave 6.'
            : null,
        siblings: siblings.map((row) => ({
            id: row.id,
            publicId: row.publicId,
            serviceName: row.serviceName,
            status: row.status,
            current: row.id === engagement.id,
        })),
        honesty: {
            acceptanceDoesNotLowerResidual: true,
            unknownIsNotApproved: true,
            contractExistsIsNotGateSatisfied: true,
            legacyVendorAcceptanceIsNotCurrent: true,
        },
        authority: {
            model: 'capability',
            treat: 'risk.treat',
            accept: 'risk.accept / approval.decide',
            activate: 'engagement.activate',
            selfApproval: false,
            inventedThresholds: false,
        },
    };
}

export async function selectTreatment(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!canTreat(actor)) throw new ApiError(403, 'Only an authorized analyst or risk owner can select treatment.');
    const engagement = await loadEngagement(organizationId, key);
    if (TERMINAL.has(engagement.status) && engagement.status !== EngagementStatus.GATE_APPROVED) {
        if (engagement.status === EngagementStatus.ACTIVE || engagement.status === EngagementStatus.AVOIDED || engagement.status === EngagementStatus.REJECTED) {
            throw new ApiError(409, 'This Engagement is already in a terminal decision state.');
        }
    }
    const residual = await latestResidual(organizationId, engagement.id);
    if (!residual || residual.status !== EngagementResidualStatus.CONFIRMED) {
        throw new ApiError(409, 'Confirm residual risk before selecting treatment.');
    }
    const snapshot = residualSnapshot(residual);
    const type = parseType(body.type);
    const rationale = String(body.rationale || '').trim();
    if (rationale.length < 8) throw new ApiError(400, 'Treatment rationale is required.');
    if (type === EngagementTreatmentType.MITIGATE) {
        if (!String(body.mitigationAction || '').trim()) throw new ApiError(400, 'MITIGATE requires a treatment action.');
        if (!parseDate(body.mitigationDueDate)) throw new ApiError(400, 'MITIGATE requires a due date.');
    }
    if (type === EngagementTreatmentType.TRANSFER) {
        const mechanism = String(body.transferMechanism || '').toUpperCase();
        if (!['INSURANCE', 'CONTRACTUAL_INDEMNITY', 'SERVICE_ARCHITECTURE', 'OTHER'].includes(mechanism)) {
            throw new ApiError(400, 'TRANSFER requires a recorded mechanism.');
        }
    }
    const current = await latestTreatment(organizationId, engagement.id);
    if (current) {
        await prisma.engagementRiskTreatment.update({ where: { id: current.id }, data: { status: EngagementTreatmentStatus.SUPERSEDED } });
    }
    const row = await prisma.engagementRiskTreatment.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            ...snapshot,
            type,
            rationale,
            ownerUserId: String(body.ownerUserId || body.mitigationOwnerUserId || body.transferOwnerUserId || actor.id),
            createdByUserId: actor.id,
            status: type === EngagementTreatmentType.ACCEPT ? EngagementTreatmentStatus.PENDING_APPROVAL : EngagementTreatmentStatus.SELECTED,
            conditions: String(body.conditions || '').trim() || null,
            relatedFindingIds: asIds(body.relatedFindingIds) as unknown as Prisma.InputJsonValue,
            relatedControlIds: asIds(body.relatedControlIds) as unknown as Prisma.InputJsonValue,
            relatedEvidenceIds: asIds(body.relatedEvidenceIds) as unknown as Prisma.InputJsonValue,
            mitigationAction: String(body.mitigationAction || '').trim() || null,
            mitigationOwnerUserId: String(body.mitigationOwnerUserId || '').trim() || null,
            mitigationDueDate: parseDate(body.mitigationDueDate),
            mitigationFindingId: String(body.mitigationFindingId || '').trim() || null,
            mitigationControlId: String(body.mitigationControlId || '').trim() || null,
            mitigationEvidenceRequired: String(body.mitigationEvidenceRequired || '').trim() || null,
            mitigationCompletionCondition: String(body.mitigationCompletionCondition || '').trim() || null,
            mitigationStatus: type === EngagementTreatmentType.MITIGATE ? 'PLANNED' : null,
            transferMechanism: type === EngagementTreatmentType.TRANSFER
                ? String(body.transferMechanism).toUpperCase() as EngagementTransferMechanism
                : null,
            transferOwnerUserId: String(body.transferOwnerUserId || '').trim() || null,
            transferEvidenceRef: String(body.transferEvidenceRef || '').trim() || null,
            transferEffectiveAt: parseDate(body.transferEffectiveAt),
            transferExpiresAt: parseDate(body.transferExpiresAt),
            history: [{ at: new Date().toISOString(), actor: actor.id, action: 'selected', type }] as unknown as Prisma.InputJsonValue,
        },
    });
    let nextStatus: EngagementStatus = EngagementStatus.TREATMENT_DECIDED;
    if (type === EngagementTreatmentType.ACCEPT) nextStatus = EngagementStatus.ACCEPTANCE_PENDING;
    if (type === EngagementTreatmentType.AVOID) nextStatus = EngagementStatus.AVOIDED;
    if (type === EngagementTreatmentType.MITIGATE || type === EngagementTreatmentType.TRANSFER) nextStatus = EngagementStatus.CONTRACT_REVIEW;
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: nextStatus } });
    await audit(organizationId, actor.id, 'risk_treatment.selected', 'EngagementRiskTreatment', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualAssessmentId: snapshot.residualAssessmentId,
        type,
        residualBandSnapshot: snapshot.residualBandSnapshot,
        residualScoreSnapshot: snapshot.residualScoreSnapshot,
    });
    await notify(organizationId, engagement.assignedAnalystUserId || engagement.relationshipOwnerUserId, 'treatment.needed', `Treatment recorded: ${engagement.serviceName}`, `Treatment ${type} was selected. Residual remains ${snapshot.residualBandSnapshot} ${snapshot.residualScoreSnapshot}.`, 'EngagementRiskTreatment', row.id);
    if (type === EngagementTreatmentType.ACCEPT) {
        return requestAcceptance(organizationId, actor, engagement.id, {
            rationale,
            conditions: body.conditions,
            expiresAt: body.expiresAt,
            reviewAt: body.reviewAt,
            relatedFindingIds: body.relatedFindingIds,
            ownerUserId: body.ownerUserId,
        }, row.id);
    }
    const ctx = await collectContext(organizationId, engagement.id);
    await persistGate(organizationId, { ...engagement, status: nextStatus }, actor.id, ctx);
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function requestAcceptance(
    organizationId: string,
    actor: Actor,
    key: string,
    body: Record<string, unknown>,
    treatmentId?: string,
) {
    assertPractitioner(actor);
    if (!canTreat(actor) && !canApprove(actor)) throw new ApiError(403, 'You cannot request risk acceptance.');
    const engagement = await loadEngagement(organizationId, key);
    const treatment = treatmentId
        ? await prisma.engagementRiskTreatment.findFirst({ where: { id: treatmentId, organizationId, engagementId: engagement.id } })
        : await latestTreatment(organizationId, engagement.id);
    if (!treatment || treatment.type !== EngagementTreatmentType.ACCEPT) {
        throw new ApiError(409, 'Acceptance applies only to an Engagement ACCEPT treatment.');
    }
    const residual = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { id: treatment.residualAssessmentId, organizationId, engagementId: engagement.id },
    });
    if (!residual || residual.residualScore == null || !residual.residualBand) {
        throw new ApiError(409, 'Acceptance must reference the exact residual assessment version.');
    }
    const rationale = String(body.rationale || treatment.rationale || '').trim();
    if (rationale.length < 8) throw new ApiError(400, 'Acceptance rationale is required.');
    const expiresAt = parseDate(body.expiresAt);
    const reviewAt = parseDate(body.reviewAt);
    if (!expiresAt && !reviewAt) throw new ApiError(400, 'Acceptance requires an expiry or review date.');
    const current = await latestAcceptance(organizationId, engagement.id);
    if (current && (current.status === EngagementAcceptanceStatus.REQUESTED || current.status === EngagementAcceptanceStatus.PENDING)) {
        throw new ApiError(409, 'An acceptance request is already pending for this Engagement.');
    }
    if (current) {
        await prisma.engagementRiskAcceptance.update({ where: { id: current.id }, data: { status: EngagementAcceptanceStatus.SUPERSEDED } });
    }
    const snapshot = {
        engagementId: engagement.id,
        thirdPartyId: engagement.vendorId,
        residualAssessmentId: residual.id,
        residualBand: residual.residualBand,
        residualScore: residual.residualScore,
        methodologyVersion: residual.methodologyVersion,
        treatmentId: treatment.id,
        treatmentType: treatment.type,
        requestedBy: actor.id,
    };
    const row = await prisma.engagementRiskAcceptance.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            treatmentId: treatment.id,
            residualAssessmentId: residual.id,
            residualScoreSnapshot: residual.residualScore,
            residualBandSnapshot: residual.residualBand,
            residualMethodologyVersion: residual.methodologyVersion,
            rationale,
            requesterUserId: actor.id,
            ownerUserId: String(body.ownerUserId || treatment.ownerUserId || actor.id),
            status: EngagementAcceptanceStatus.PENDING,
            conditions: String(body.conditions || '').trim() || null,
            expiresAt,
            reviewAt,
            relatedFindingIds: asIds(body.relatedFindingIds || treatment.relatedFindingIds) as unknown as Prisma.InputJsonValue,
            decisionSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
    });
    await prisma.engagementDecisionApproval.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            type: EngagementApprovalType.RISK_ACCEPTANCE,
            treatmentId: treatment.id,
            acceptanceId: row.id,
            status: EngagementApprovalStatus.PENDING,
            requestedByUserId: actor.id,
            capability: 'risk.accept',
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
    });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.ACCEPTANCE_PENDING } });
    await audit(organizationId, actor.id, 'risk_acceptance.requested', 'EngagementRiskAcceptance', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualAssessmentId: residual.id,
        residualBandSnapshot: residual.residualBand,
        residualScoreSnapshot: residual.residualScore,
    });
    await audit(organizationId, actor.id, 'approval.requested', 'EngagementDecisionApproval', row.id, {
        engagementId: engagement.id,
        type: 'RISK_ACCEPTANCE',
    });
    const approvers = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE', role: { in: ['RISK_MANAGER', 'APPROVER', 'ORGANIZATION_ADMIN'] } },
        select: { id: true },
        take: 8,
    });
    for (const approver of approvers) {
        if (approver.id === actor.id) continue;
        await notify(organizationId, approver.id, 'acceptance.requested', `Acceptance approval needed: ${engagement.serviceName}`, `An Engagement acceptance request is pending. Residual remains ${residual.residualBand} ${residual.residualScore}.`, 'EngagementRiskAcceptance', row.id);
    }
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function decideAcceptance(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!canApprove(actor)) throw new ApiError(403, 'Only an authorized approver can decide risk acceptance.');
    const engagement = await loadEngagement(organizationId, key);
    const acceptance = await latestAcceptance(organizationId, engagement.id);
    if (!acceptance || (acceptance.status !== EngagementAcceptanceStatus.PENDING && acceptance.status !== EngagementAcceptanceStatus.REQUESTED)) {
        throw new ApiError(409, 'There is no pending Engagement acceptance to decide.');
    }
    assertIndependentApprover(actor, acceptance.requesterUserId, await allowSelfApproval(organizationId));
    const decision = parseDecision(body.decision);
    const residualBefore = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { id: acceptance.residualAssessmentId },
    });
    const status = decision === 'APPROVED'
        ? EngagementAcceptanceStatus.APPROVED
        : decision === 'REJECTED'
            ? EngagementAcceptanceStatus.REJECTED
            : EngagementAcceptanceStatus.RETURNED;
    const approvalStatus = decision === 'APPROVED'
        ? EngagementApprovalStatus.APPROVED
        : decision === 'REJECTED'
            ? EngagementApprovalStatus.REJECTED
            : EngagementApprovalStatus.RETURNED;
    const updated = await prisma.engagementRiskAcceptance.update({
        where: { id: acceptance.id },
        data: {
            status,
            decidedAt: new Date(),
            decidedByUserId: actor.id,
            authorizedApproverUserId: actor.id,
            decisionComment: String(body.comment || body.rationale || '').trim() || null,
        },
    });
    const pending = await prisma.engagementDecisionApproval.findFirst({
        where: { organizationId, engagementId: engagement.id, acceptanceId: acceptance.id, status: { in: [EngagementApprovalStatus.PENDING, EngagementApprovalStatus.REQUESTED] } },
        orderBy: { createdAt: 'desc' },
    });
    if (pending) {
        await prisma.engagementDecisionApproval.update({
            where: { id: pending.id },
            data: {
                status: approvalStatus,
                decidedByUserId: actor.id,
                decidedAt: new Date(),
                comment: updated.decisionComment,
                capability: 'risk.accept',
            },
        });
    }
    if (decision === 'APPROVED') {
        await prisma.engagementRiskTreatment.updateMany({
            where: { id: acceptance.treatmentId },
            data: { status: EngagementTreatmentStatus.APPROVED },
        });
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.CONTRACT_REVIEW } });
        await audit(organizationId, actor.id, 'risk_acceptance.approved', 'EngagementRiskAcceptance', acceptance.id, {
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            residualAssessmentId: acceptance.residualAssessmentId,
            residualBandSnapshot: acceptance.residualBandSnapshot,
            residualScoreSnapshot: acceptance.residualScoreSnapshot,
        });
        await audit(organizationId, actor.id, 'approval.approved', 'EngagementDecisionApproval', pending?.id || acceptance.id, {
            engagementId: engagement.id,
            type: 'RISK_ACCEPTANCE',
        });
    } else {
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: decision === 'REJECTED' ? EngagementStatus.REJECTED : EngagementStatus.TREATMENT_REVIEW } });
        await audit(organizationId, actor.id, decision === 'REJECTED' ? 'risk_acceptance.rejected' : 'risk_acceptance.rejected', 'EngagementRiskAcceptance', acceptance.id, {
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            residualAssessmentId: acceptance.residualAssessmentId,
            decision,
        });
        await audit(organizationId, actor.id, 'approval.rejected', 'EngagementDecisionApproval', pending?.id || acceptance.id, {
            engagementId: engagement.id,
            decision,
        });
        await notify(organizationId, acceptance.requesterUserId, 'approval.decision', `Acceptance ${decision.toLowerCase()}: ${engagement.serviceName}`, `The Engagement acceptance request was ${decision.toLowerCase()}. Residual is unchanged.`, 'EngagementRiskAcceptance', acceptance.id);
    }
    const residualAfter = await prisma.engagementResidualRiskAssessment.findFirst({ where: { id: acceptance.residualAssessmentId } });
    if (!residualBefore || !residualAfter
        || residualBefore.residualScore !== residualAfter.residualScore
        || residualBefore.residualBand !== residualAfter.residualBand) {
        throw new ApiError(500, 'Acceptance must not alter residual risk.');
    }
    const ctx = await collectContext(organizationId, engagement.id);
    await persistGate(organizationId, await loadEngagement(organizationId, engagement.id), actor.id, ctx);
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function decideApproval(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    if (String(body.type || 'RISK_ACCEPTANCE').toUpperCase() === 'RISK_ACCEPTANCE' || body.acceptanceId) {
        return decideAcceptance(organizationId, actor, key, body);
    }
    if (body.exceptionId) {
        return decideContractException(organizationId, actor, key, { ...body, exceptionId: body.exceptionId });
    }
    throw new ApiError(400, 'Approval target is missing.');
}

export async function createContractRequirement(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!canManageContracts(actor)) throw new ApiError(403, 'You cannot create Engagement contract requirements.');
    const engagement = await loadEngagement(organizationId, key);
    const requirement = String(body.requirement || '').trim();
    if (requirement.length < 4) throw new ApiError(400, 'Contract requirement text is required.');
    const source = parseRequirementSource(body.source);
    const sourceRationale = String(body.sourceRationale || body.rationale || '').trim();
    if (source === EngagementContractRequirementSource.HUMAN_ADDED && sourceRationale.length < 8) {
        throw new ApiError(400, 'A human-added requirement requires rationale.');
    }
    if (source !== EngagementContractRequirementSource.HUMAN_ADDED && !String(body.sourceRef || '').trim() && sourceRationale.length < 4) {
        throw new ApiError(400, 'Every contract requirement must record why it exists.');
    }
    const row = await prisma.engagementContractRequirement.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            requirement,
            source,
            sourceRef: String(body.sourceRef || '').trim() || null,
            sourceRationale: sourceRationale || null,
            ownerUserId: String(body.ownerUserId || actor.id),
            mandatory: body.mandatory !== false,
            status: EngagementContractRequirementStatus.OPEN,
            evidenceRef: String(body.evidenceRef || '').trim() || null,
            createdByUserId: actor.id,
        },
    });
    await writeRequirementGraph(organizationId, actor.id, engagement, row);
    await audit(organizationId, actor.id, 'contract_requirement.created', 'EngagementContractRequirement', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        source,
        mandatory: row.mandatory,
    });
    await notify(organizationId, row.ownerUserId, 'contract_requirement.action', `Contract requirement assigned: ${engagement.serviceName}`, `${requirement} needs a recorded status.`, 'EngagementContractRequirement', row.id);
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function updateContractRequirement(organizationId: string, actor: Actor, key: string, requirementId: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!canManageContracts(actor)) throw new ApiError(403, 'You cannot update Engagement contract requirements.');
    const engagement = await loadEngagement(organizationId, key);
    const existing = await prisma.engagementContractRequirement.findFirst({
        where: { id: requirementId, organizationId, engagementId: engagement.id },
    });
    if (!existing) throw new ApiError(404, 'Contract requirement not found on this Engagement.');
    const statusRaw = String(body.status || '').toUpperCase();
    const status = statusRaw && (Object.values(EngagementContractRequirementStatus) as string[]).includes(statusRaw)
        ? statusRaw as EngagementContractRequirementStatus
        : existing.status;
    const row = await prisma.engagementContractRequirement.update({
        where: { id: existing.id },
        data: {
            status,
            evidenceRef: body.evidenceRef !== undefined ? String(body.evidenceRef || '').trim() || null : existing.evidenceRef,
            ownerUserId: body.ownerUserId !== undefined ? String(body.ownerUserId || '') || null : existing.ownerUserId,
            reviewerUserId: actor.id,
            reviewedAt: new Date(),
        },
    });
    await audit(organizationId, actor.id, 'contract_requirement.updated', 'EngagementContractRequirement', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        status: row.status,
    });
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function requestContractException(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!canManageContracts(actor)) throw new ApiError(403, 'You cannot request a contract exception.');
    const engagement = await loadEngagement(organizationId, key);
    const requirement = await prisma.engagementContractRequirement.findFirst({
        where: { id: String(body.requirementId || ''), organizationId, engagementId: engagement.id },
    });
    if (!requirement) throw new ApiError(404, 'Contract requirement not found on this Engagement.');
    const reason = String(body.reason || '').trim();
    if (reason.length < 8) throw new ApiError(400, 'Exception reason is required.');
    const row = await prisma.engagementContractException.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            requirementId: requirement.id,
            reason,
            requesterUserId: actor.id,
            status: EngagementApprovalStatus.PENDING,
            conditions: String(body.conditions || '').trim() || null,
            expiresAt: parseDate(body.expiresAt),
            reviewAt: parseDate(body.reviewAt),
        },
    });
    await prisma.engagementContractRequirement.update({
        where: { id: requirement.id },
        data: { status: EngagementContractRequirementStatus.EXCEPTION_REQUESTED },
    });
    await prisma.engagementDecisionApproval.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            type: EngagementApprovalType.CONTRACT_EXCEPTION,
            exceptionId: row.id,
            status: EngagementApprovalStatus.PENDING,
            requestedByUserId: actor.id,
            capability: 'exception.approve',
        },
    });
    await audit(organizationId, actor.id, 'contract_exception.requested', 'EngagementContractException', row.id, {
        engagementId: engagement.id,
        requirementId: requirement.id,
    });
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function decideContractException(organizationId: string, actor: Actor, key: string, body: Record<string, unknown>) {
    assertPractitioner(actor);
    if (!hasPermission(actor.role, PERMISSIONS['exception.approve']) && !canApprove(actor)) {
        throw new ApiError(403, 'Only an authorized approver can decide a contract exception.');
    }
    const engagement = await loadEngagement(organizationId, key);
    const exception = await prisma.engagementContractException.findFirst({
        where: { id: String(body.exceptionId || ''), organizationId, engagementId: engagement.id },
    });
    if (!exception) throw new ApiError(404, 'Contract exception not found on this Engagement.');
    assertIndependentApprover(actor, exception.requesterUserId, await allowSelfApproval(organizationId));
    const decision = parseDecision(body.decision);
    const status = decision === 'APPROVED'
        ? EngagementApprovalStatus.APPROVED
        : decision === 'REJECTED'
            ? EngagementApprovalStatus.REJECTED
            : EngagementApprovalStatus.RETURNED;
    await prisma.engagementContractException.update({
        where: { id: exception.id },
        data: {
            status,
            decidedAt: new Date(),
            decidedByUserId: actor.id,
            authorityUserId: actor.id,
            decisionComment: String(body.comment || '').trim() || null,
        },
    });
    await prisma.engagementContractRequirement.update({
        where: { id: exception.requirementId },
        data: {
            status: decision === 'APPROVED'
                ? EngagementContractRequirementStatus.EXCEPTION_APPROVED
                : EngagementContractRequirementStatus.OPEN,
        },
    });
    await audit(organizationId, actor.id, decision === 'APPROVED' ? 'contract_exception.approved' : 'contract_exception.requested', 'EngagementContractException', exception.id, {
        engagementId: engagement.id,
        decision,
    });
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function evaluateGate(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot evaluate the Engagement contract gate.');
    const engagement = await loadEngagement(organizationId, key);
    const ctx = await collectContext(organizationId, engagement.id);
    const persisted = await persistGate(organizationId, engagement, actor.id, ctx);
    if (persisted.row.status === EngagementContractGateStatus.APPROVED) {
        await notify(organizationId, engagement.relationshipOwnerUserId || engagement.assignedAnalystUserId, 'contract_gate.ready', `Gate ready: ${engagement.serviceName}`, 'The Engagement contract gate is approved. Activation is still explicit.', 'EngagementContractGate', persisted.row.id);
    }
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function activateEngagement(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canActivate(actor)) throw new ApiError(403, 'Activation requires the engagement.activate capability.');
    const engagement = await loadEngagement(organizationId, key);
    if (engagement.requesterUserId && engagement.requesterUserId === actor.id) {
        throw new ApiError(403, 'The requester cannot activate this Engagement.');
    }
    if (engagement.status === EngagementStatus.ACTIVE) throw new ApiError(409, 'This Engagement is already Active.');
    if (engagement.status === EngagementStatus.AVOIDED || engagement.status === EngagementStatus.REJECTED) {
        throw new ApiError(409, 'An avoided or rejected Engagement cannot be activated.');
    }
    const ctx = await collectContext(organizationId, engagement.id);
    const persisted = await persistGate(organizationId, engagement, actor.id, ctx);
    if (persisted.row.status !== EngagementContractGateStatus.APPROVED) {
        throw new ApiError(409, `Activation denied. ${ctx.blockers.map((item) => item.label).join('; ') || 'Contract gate is not approved.'}`);
    }
    let brief = ctx.briefs[0];
    if (!brief) {
        const generated = await generateDecisionBrief(organizationId, actor, engagement.id);
        brief = { id: generated.id, versionNumber: generated.versionNumber } as typeof brief;
    }
    const row = await prisma.engagementActivation.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            activatedByUserId: actor.id,
            treatmentSnapshot: (ctx.treatment || {}) as unknown as Prisma.InputJsonValue,
            acceptanceSnapshot: (ctx.acceptance || null) as unknown as Prisma.InputJsonValue,
            approvalSnapshot: ctx.approvals as unknown as Prisma.InputJsonValue,
            gateSnapshot: { id: persisted.row.id, status: persisted.row.status, blockers: ctx.blockers } as unknown as Prisma.InputJsonValue,
            decisionBriefId: brief?.id,
            decisionBriefVersion: brief?.versionNumber,
        },
    });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.ACTIVE } });
    await audit(organizationId, actor.id, 'engagement.activated', 'EngagementActivation', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualAssessmentId: ctx.residual?.id,
        treatmentId: ctx.treatment?.id,
        gateId: persisted.row.id,
        decisionBriefId: brief?.id,
        decisionBriefVersion: brief?.versionNumber,
    });
    await notify(organizationId, engagement.assignedAnalystUserId, 'engagement.activated', `Engagement Active: ${engagement.serviceName}`, 'This Engagement is Active. Monitoring setup pending Wave 6.', 'Engagement', engagement.id);
    await notify(organizationId, engagement.relationshipOwnerUserId, 'engagement.activated', `Engagement Active: ${engagement.serviceName}`, 'This Engagement is Active. Monitoring setup pending Wave 6.', 'Engagement', engagement.id);
    return getDecisionWorkspace(organizationId, actor, engagement.id);
}

export async function generateDecisionBrief(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot generate an Engagement decision brief.');
    const engagement = await loadEngagement(organizationId, key);
    const ctx = await collectContext(organizationId, engagement.id);
    const latestVersion = ctx.briefs[0]?.versionNumber || 0;
    const snapshot = {
        thirdParty: engagement.vendor,
        engagement: {
            id: engagement.id,
            publicId: engagement.publicId,
            serviceName: engagement.serviceName,
            businessPurpose: engagement.businessPurpose,
            businessOwnerName: engagement.businessOwnerName,
            requesterName: engagement.requesterName,
            status: engagement.status,
        },
        confirmedInherentTier: engagement.ira?.confirmedTier || null,
        dueDiligenceScope: engagement.dueDiligencePlan ? {
            id: engagement.dueDiligencePlan.id,
            status: engagement.dueDiligencePlan.status,
            confirmedTier: engagement.dueDiligencePlan.confirmedTier,
        } : null,
        residual: ctx.residual ? {
            id: ctx.residual.id,
            residualBand: ctx.residual.residualBand,
            residualScore: ctx.residual.residualScore,
            methodologyVersion: ctx.residual.methodologyVersion,
            explanation: ctx.residual.explanation,
        } : null,
        findings: ctx.findings,
        controlEffectiveness: ctx.controls,
        compensatingControls: ctx.compensating,
        treatment: ctx.treatment,
        acceptance: ctx.acceptance,
        approvals: ctx.approvals,
        contractRequirements: ctx.requirements,
        contractExceptions: ctx.exceptions,
        gate: { status: ctx.gateStatus, blockers: ctx.blockers },
        activation: ctx.activation,
        versionNumber: latestVersion + 1,
        generatedAt: new Date().toISOString(),
        generatedBy: actor.id,
    };
    const row = await prisma.riskDecisionBrief.create({
        data: {
            organizationId,
            vendorId: engagement.vendorId,
            engagementId: engagement.id,
            versionNumber: latestVersion + 1,
            engagementName: engagement.serviceName,
            inherentRisk: Number(engagement.ira?.recommendedScore || 0),
            residualRisk: ctx.residual?.residualScore || 0,
            riskBand: ctx.residual?.residualBand || 'UNKNOWN',
            assessmentStatus: engagement.status,
            evidenceConfidence: 'ENGAGEMENT',
            openFindingsCount: ctx.openFindings.length,
            monitoringAlertCount: 0,
            reviewerAnalysis: ctx.treatment?.rationale || null,
            humanDecision: ctx.treatment?.type === EngagementTreatmentType.ACCEPT
                ? RiskDecision.RISK_ACCEPTED
                : ctx.treatment?.type === EngagementTreatmentType.AVOID
                    ? RiskDecision.REJECT
                    : ctx.gateStatus === EngagementContractGateStatus.APPROVED
                        ? RiskDecision.APPROVE
                        : null,
            conditions: ctx.treatment?.conditions || ctx.acceptance?.conditions || null,
            preparedByUserId: actor.id,
            status: DecisionBriefStatus.DECIDED,
            immutableSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
    });
    await writeDecisionGraph(organizationId, actor.id, engagement, row.id, row.versionNumber);
    await audit(organizationId, actor.id, 'decision_brief.generated', 'RiskDecisionBrief', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        versionNumber: row.versionNumber,
        residualAssessmentId: ctx.residual?.id,
    });
    return {
        id: row.id,
        versionNumber: row.versionNumber,
        status: row.status,
        residualRisk: row.residualRisk,
        riskBand: row.riskBand,
        snapshot: row.immutableSnapshot,
        createdAt: row.createdAt,
        immutable: true,
    };
}

export async function getDecisionBrief(organizationId: string, actor: Actor, key: string, briefId: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot read an Engagement decision brief.');
    const engagement = await loadEngagement(organizationId, key);
    const row = await prisma.riskDecisionBrief.findFirst({
        where: { id: briefId, organizationId, engagementId: engagement.id },
    });
    if (!row) throw new ApiError(404, 'Decision brief not found for this Engagement.');
    return {
        id: row.id,
        versionNumber: row.versionNumber,
        status: row.status,
        residualRisk: row.residualRisk,
        riskBand: row.riskBand,
        snapshot: row.immutableSnapshot,
        createdAt: row.createdAt,
        immutable: true,
        legacyVendorOnly: false,
    };
}
