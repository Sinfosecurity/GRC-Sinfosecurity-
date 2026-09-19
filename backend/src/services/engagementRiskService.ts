import {
    EngagementControlRating,
    EngagementResidualStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    IssueReviewState,
    IssueSeverity,
    Prisma,
    ScanStatus,
    VendorIssueStatus,
    VendorTier,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { editionIsInsurance } from '../insurance/insuranceService';
import { displayTitleFor, buildSnapshot, type FindingLike } from '../findings/findingWorkspace';
import { ensureFindingGraph } from '../findings/findingWorkspaceService';
import { loadWorkbookCatalog } from '../tprm/workbookCatalog';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import {
    calculateEngagementResidual,
    CONTROL_RATING_POINTS,
    ENGAGEMENT_CALCULATION_VERSION,
    ENGAGEMENT_RISK_SCORE_VERSION,
    engagementResidualReadiness,
} from './deterministicRiskEngine';
import type { Actor } from './intakeEngagementService';
import { engagementIraStatusLabel } from './engagementIraService';
import { engagementPrimaryAction } from '../tprm/engagementWorkspace';
import { isAutomatedReviewSignalIssue, isSpecialistJudgedCandidate, reviewSignalHonesty, reviewSignalRule } from '../tprm/reviewSignals';

const OPEN_FINDING = new Set<VendorIssueStatus>([
    VendorIssueStatus.OPEN,
    VendorIssueStatus.IN_PROGRESS,
    VendorIssueStatus.PENDING_VENDOR,
    VendorIssueStatus.PENDING_VALIDATION,
    VendorIssueStatus.REMEDIATED,
    VendorIssueStatus.ESCALATED,
]);

const WAVE4_STATUSES = new Set<EngagementStatus>([
    EngagementStatus.SPECIALIST_REVIEW,
    EngagementStatus.FINDING_REVIEW,
    EngagementStatus.RESIDUAL_READY,
    EngagementStatus.VENDOR_SUBMITTED,
]);

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') throw new ApiError(403, 'Requesters cannot open finding, control-effectiveness, or residual-risk work.');
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open internal GRC residual-risk work.');
    }
}

function canManage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.triage'])
        || hasPermission(actor.role, PERMISSIONS['finding.update'])
        || hasPermission(actor.role, PERMISSIONS['vendor.manage']);
}

function canRead(actor: Actor) {
    return canManage(actor)
        || hasPermission(actor.role, PERMISSIONS['intake.read'])
        || hasPermission(actor.role, PERMISSIONS['finding.read']);
}

async function loadEngagement(organizationId: string, key: string) {
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, OR: [{ id: key }, { publicId: key }] },
        include: {
            vendor: { select: { id: true, name: true, publicId: true, residualRiskScore: true, inherentRiskScore: true, tier: true } },
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

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function packKeys(plan: { includedPackKeys?: unknown; confirmedSnapshot?: unknown; recommendedSnapshot?: unknown } | null) {
    const included = asStringArray(plan?.includedPackKeys);
    if (included.length) return included;
    const snapshot = (plan?.confirmedSnapshot || plan?.recommendedSnapshot) as { questionnairePlan?: { packs?: Array<{ key?: string }> } } | null;
    return (snapshot?.questionnairePlan?.packs || []).map((pack) => String(pack.key || '')).filter(Boolean);
}

function recommendSeverity(tier: string | null | undefined, rule: string): IssueSeverity {
    if (tier === 'CRITICAL' && rule === 'required_control_no') return IssueSeverity.HIGH;
    if (tier === 'HIGH' && rule === 'required_control_no') return IssueSeverity.HIGH;
    if (rule === 'required_evidence_missing') return IssueSeverity.MEDIUM;
    if (tier === 'CRITICAL') return IssueSeverity.MEDIUM;
    return IssueSeverity.MEDIUM;
}

function findingTitle(row: { title: string; category?: string | null; draftRuleCode?: string | null; sourceSnapshot?: Prisma.JsonValue }) {
    return displayTitleFor({ ...row, status: 'OPEN', sourceSnapshot: row.sourceSnapshot as FindingLike['sourceSnapshot'] });
}

function shortTopic(question: string) {
    const cleaned = question.replace(/\?+$/g, '').replace(/^(is there|is a|are there|does the vendor|does your organization|do you have|has the vendor)\s+/i, '').trim();
    return (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)).slice(0, 120) || 'Control not demonstrated';
}

function nextWave4Action(status: EngagementStatus, residualReady: boolean, residualConfirmed: boolean, extras: {
    outstandingReviewDomains?: string[];
    openCandidateCount?: number;
    controlAssessed?: boolean;
} = {}) {
    return engagementPrimaryAction(status, {
        residualReady,
        residualConfirmed,
        outstandingReviewDomains: extras.outstandingReviewDomains,
        openCandidateCount: extras.openCandidateCount,
        controlAssessed: extras.controlAssessed,
    }).label;
}

export async function listReviewSignals(organizationId: string, engagementId: string) {
    const engagement = await loadEngagement(organizationId, engagementId);
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, engagementId: engagement.id },
        include: { responses: { orderBy: { questionId: 'asc' } } },
    });
    const reviews = await prisma.engagementAssessmentReview.findMany({ where: { organizationId, engagementId: engagement.id } });
    const links = await prisma.evidenceLink.findMany({
        where: { organizationId, engagementId: engagement.id },
        include: { storedObject: { select: { id: true, scanStatus: true, filename: true } } },
    });
    const catalog = loadWorkbookCatalog();
    const signals: Array<{
        assessmentId: string;
        questionId: string;
        question: string;
        vendorAnswer: string;
        rule: string;
        title: string;
        existingIssueId: string | null;
        candidateClass: 'REVIEW_SIGNAL';
        authoritative: false;
    }> = [];
    for (const assessment of assessments) {
        for (const response of assessment.responses) {
            const question = catalog.questions.find((row) => row.controlId === response.questionId);
            const evidence = links.find((link) => link.assessmentId === assessment.id && link.questionId === response.questionId);
            const review = reviews.find((row) => row.assessmentId === assessment.id || row.domain === (question?.domain || response.questionCategory));
            const rule = reviewSignalRule({
                answer: response.response,
                evidenceRequired: Boolean(response.evidenceRequired),
                evidenceClean: evidence?.storedObject.scanStatus === ScanStatus.CLEAN,
                specialistConclusion: String((review?.conclusions as { conclusion?: string } | null)?.conclusion || ''),
            });
            if (!rule) continue;
            const existing = await prisma.vendorIssue.findFirst({
                where: { organizationId, engagementId: engagement.id, assessmentId: assessment.id, questionId: response.questionId },
            });
            signals.push({
                assessmentId: assessment.id,
                questionId: response.questionId,
                question: response.questionText || question?.question || response.questionId,
                vendorAnswer: String(response.response || ''),
                rule,
                title: `${engagement.serviceName} — ${shortTopic(response.questionText || question?.question || response.questionId)}`,
                existingIssueId: existing?.id || null,
                candidateClass: 'REVIEW_SIGNAL',
                authoritative: false,
            });
        }
    }
    return { signals, honesty: reviewSignalHonesty() };
}

export async function seedFindingCandidates(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can review finding signals.');
    const engagement = await loadEngagement(organizationId, key);
    const listed = await listReviewSignals(organizationId, engagement.id);
    return { created: 0, ids: [] as string[], ...listed };
}

export async function createFindingCandidate(organizationId: string, actor: Actor, key: string, input: {
    assessmentId: string;
    questionId: string;
    rationale: string;
    severity?: IssueSeverity;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can create a finding candidate.');
    const rationale = String(input.rationale || '').trim();
    if (!rationale) throw new ApiError(400, 'Record why this review signal warrants a Finding Candidate.');
    const engagement = await loadEngagement(organizationId, key);
    const candidateReady = new Set<EngagementStatus>([
        EngagementStatus.VENDOR_SUBMITTED,
        EngagementStatus.SPECIALIST_REVIEW,
        EngagementStatus.FINDING_REVIEW,
        EngagementStatus.RESIDUAL_READY,
    ]);
    if (!candidateReady.has(engagement.status)) {
        throw new ApiError(409, 'Finding candidates can be created only after specialist review of a submitted vendor assessment.');
    }
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { organizationId, engagementId: engagement.id, id: input.assessmentId },
        include: { responses: true },
    });
    if (!assessment) throw new ApiError(404, 'Assessment not found for this engagement.');
    const response = assessment.responses.find((row) => row.questionId === input.questionId);
    if (!response) throw new ApiError(404, 'Question not found on this assessment.');
    const existing = await prisma.vendorIssue.findFirst({
        where: { organizationId, engagementId: engagement.id, assessmentId: assessment.id, questionId: input.questionId },
    });
    if (existing?.reviewState === IssueReviewState.CONFIRMED) throw new ApiError(409, 'An authoritative finding already exists for this question.');
    const catalog = loadWorkbookCatalog();
    const question = catalog.questions.find((row) => row.controlId === input.questionId);
    const title = `${engagement.serviceName} — ${shortTopic(response.questionText || question?.question || input.questionId)}`;
    const recommended = input.severity || recommendSeverity(engagement.ira?.confirmedTier || engagement.dueDiligencePlan?.confirmedTier, 'specialist_judgment');
    const snapshot = buildSnapshot({
        kind: /privacy/i.test(question?.domain || response.questionCategory || '') ? 'PRIVACY' : 'ASSESSMENT',
        questionId: input.questionId,
        questionText: response.questionText,
        answer: String(response.response || ''),
        assessmentId: assessment.id,
        assessmentType: assessment.assessmentType,
        section: question?.domain || response.questionCategory,
        pack: question?.pack || response.questionCategory,
        controlKey: question?.controlId || input.questionId,
        draftRuleCode: 'specialist_judgment',
        title,
        category: question?.domain || response.questionCategory || 'Security',
        evidenceRefs: [],
    }) as Record<string, unknown>;
    snapshot.displayTitle = title;
    snapshot.specialistJudged = true;
    snapshot.candidateClass = 'FINDING_CANDIDATE';
    snapshot.rationale = rationale;
    if (existing) {
        const updated = await prisma.vendorIssue.update({
            where: { id: existing.id },
            data: {
                reviewState: IssueReviewState.DRAFT,
                draftRuleCode: 'specialist_judgment',
                sourceSnapshot: snapshot as Prisma.InputJsonValue,
                determinationNote: rationale,
                identifiedBy: actor.id,
            },
        });
        await audit(organizationId, actor.id, 'finding.candidate.promoted', 'VendorIssue', updated.id, {
            engagementId: engagement.id,
            assessmentId: assessment.id,
            questionId: input.questionId,
            rationale,
        });
        if (engagement.status === EngagementStatus.SPECIALIST_REVIEW || engagement.status === EngagementStatus.VENDOR_SUBMITTED) {
            await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.FINDING_REVIEW } });
        }
        return updated;
    }
    const issue = await prisma.vendorIssue.create({
        data: {
            vendorId: engagement.vendorId,
            organizationId,
            engagementId: engagement.id,
            title,
            description: `Specialist judgment: ${rationale}`,
            issueType: 'CONTROL_FAILURE',
            severity: recommended,
            recommendedSeverity: recommended,
            priority: 'MEDIUM',
            source: 'INTERNAL_ASSESSMENT',
            identifiedBy: actor.id,
            category: question?.domain || response.questionCategory || 'Security',
            assignedTo: engagement.assignedAnalystUserId,
            assessmentId: assessment.id,
            questionId: input.questionId,
            controlId: question?.controlId || null,
            responsibility: 'VENDOR',
            reviewState: IssueReviewState.DRAFT,
            draftRuleCode: 'specialist_judgment',
            determinationNote: rationale,
            sourceSnapshot: snapshot as Prisma.InputJsonValue,
            status: VendorIssueStatus.OPEN,
        },
    });
    await audit(organizationId, actor.id, 'finding.candidate.created', 'VendorIssue', issue.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        assessmentId: assessment.id,
        questionId: input.questionId,
        rationale,
    });
    if (engagement.status === EngagementStatus.SPECIALIST_REVIEW || engagement.status === EngagementStatus.VENDOR_SUBMITTED) {
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.FINDING_REVIEW } });
    }
    return issue;
}

export async function confirmFinding(organizationId: string, actor: Actor, issueId: string, input: {
    title?: string;
    description?: string;
    severity?: IssueSeverity;
    category?: string;
    responsibility?: string;
    controlId?: string;
    determinationNote?: string;
    assignedTo?: string;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized GRC reviewer can confirm a finding.');
    const issue = await prisma.vendorIssue.findFirst({ where: { id: issueId, organizationId }, include: { vendor: true } });
    if (!issue) throw new ApiError(404, 'Finding candidate not found.');
    if (issue.reviewState === IssueReviewState.DISMISSED) throw new ApiError(409, 'A dismissed candidate cannot be confirmed. History is preserved.');
    if (!issue.engagementId) throw new ApiError(409, 'Golden Journey confirmation requires Engagement ownership.');
    const engagement = await loadEngagement(organizationId, issue.engagementId);
    const severity = input.severity || issue.severity;
    if (input.severity && input.severity !== issue.recommendedSeverity && !String(input.determinationNote || '').trim()) {
        throw new ApiError(400, 'Record why the confirmed severity differs from the recommendation.');
    }
    const title = String(input.title || issue.title).trim();
    const updated = await prisma.vendorIssue.update({
        where: { id: issue.id },
        data: {
            reviewState: IssueReviewState.CONFIRMED,
            title,
            description: String(input.description || issue.description).trim(),
            severity,
            category: input.category || issue.category,
            responsibility: input.responsibility || issue.responsibility || 'VENDOR',
            controlId: input.controlId || issue.controlId,
            determinationNote: input.determinationNote?.trim() || issue.determinationNote,
            assignedTo: input.assignedTo || issue.assignedTo || actor.id,
            severityAdjustReason: input.severity && input.severity !== issue.recommendedSeverity ? input.determinationNote : issue.severityAdjustReason,
            status: issue.status === VendorIssueStatus.CLOSED ? issue.status : VendorIssueStatus.OPEN,
        },
        include: { vendor: { select: { id: true, name: true } } },
    });
    await ensureFindingGraph({
        organizationId,
        actorUserId: actor.id,
        issueId: updated.id,
        title: findingTitle(updated),
        vendorId: engagement.vendorId,
        vendorName: engagement.vendor.name,
        assessmentId: updated.assessmentId,
        assessmentLabel: engagement.serviceName,
    });
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actor.id,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
    });
    const findingNode = await ensureNode({
        organizationId,
        actorUserId: actor.id,
        nodeType: GovernanceNodeType.FINDING,
        sourceModel: 'VendorIssue',
        sourceId: updated.id,
        displayLabel: findingTitle(updated),
    });
    await createRelationship({
        organizationId,
        createdBy: actor.id,
        fromNodeId: engagementNode.node.id,
        toNodeId: findingNode.node.id,
        relationshipType: GovernanceRelationshipType.HAS_FINDING,
    });
    if (updated.controlId) {
        const control = await prisma.organizationControl.findFirst({
            where: { organizationId, OR: [{ id: updated.controlId }, { controlKey: updated.controlId }] },
        });
        if (control) {
            const controlNode = await ensureNode({
                organizationId,
                actorUserId: actor.id,
                nodeType: GovernanceNodeType.CONTROL,
                sourceModel: 'OrganizationControl',
                sourceId: control.id,
                displayLabel: control.title,
            });
            await createRelationship({
                organizationId,
                createdBy: actor.id,
                fromNodeId: findingNode.node.id,
                toNodeId: controlNode.node.id,
                relationshipType: GovernanceRelationshipType.AFFECTS,
            });
        }
    }
    await audit(organizationId, actor.id, 'finding.confirmed', 'VendorIssue', updated.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        assessmentId: updated.assessmentId,
        severity: updated.severity,
        recommendedSeverity: issue.recommendedSeverity,
    });
    if (input.severity && issue.recommendedSeverity && input.severity !== issue.recommendedSeverity) {
        await audit(organizationId, actor.id, 'finding.severity.changed', 'VendorIssue', updated.id, {
            engagementId: engagement.id,
            from: issue.recommendedSeverity,
            to: input.severity,
            reason: input.determinationNote,
        });
    }
    await notify(organizationId, updated.assignedTo, 'finding.confirmed', `Finding confirmed: ${updated.title}`, 'A GRC reviewer confirmed this Engagement finding.', 'VendorIssue', updated.id);
    await maybeRecalculate(organizationId, actor, engagement.id, 'finding.confirmed');
    return presentFinding(updated, engagement);
}

export async function dismissCandidate(organizationId: string, actor: Actor, issueId: string, reason: string) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only an authorized GRC reviewer can dismiss a candidate.');
    if (!String(reason || '').trim()) throw new ApiError(400, 'Record why this is not a finding.');
    const issue = await prisma.vendorIssue.findFirst({ where: { id: issueId, organizationId } });
    if (!issue) throw new ApiError(404, 'Finding candidate not found.');
    if (issue.reviewState === IssueReviewState.CONFIRMED) throw new ApiError(409, 'A confirmed finding cannot be dismissed as a candidate. Use remediation and closure.');
    const updated = await prisma.vendorIssue.update({
        where: { id: issue.id },
        data: {
            reviewState: IssueReviewState.DISMISSED,
            dismissReason: reason.trim(),
            dismissedBy: actor.id,
            dismissedAt: new Date(),
            determinationNote: reason.trim(),
        },
    });
    await audit(organizationId, actor.id, 'finding.dismissed', 'VendorIssue', updated.id, {
        engagementId: issue.engagementId,
        vendorId: issue.vendorId,
        assessmentId: issue.assessmentId,
        reason: reason.trim(),
    });
    return updated;
}

export async function recordControlEffectiveness(organizationId: string, actor: Actor, key: string, input: {
    controlId: string;
    rating: EngagementControlRating;
    rationale?: string;
    scopeNote?: string;
    evidenceObjectIds?: string[];
    nextReviewAt?: string;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can record control effectiveness.');
    const engagement = await loadEngagement(organizationId, key);
    const rating = input.rating;
    if (!rating) throw new ApiError(400, 'Record a control-effectiveness rating.');
    if (rating === EngagementControlRating.NOT_APPLICABLE && !String(input.rationale || '').trim()) {
        throw new ApiError(400, 'Not applicable requires a rationale.');
    }
    const control = await prisma.organizationControl.findFirst({
        where: { organizationId, OR: [{ id: input.controlId }, { controlKey: input.controlId }] },
    });
    const catalog = loadWorkbookCatalog().questions.find((row) => row.controlId === input.controlId || row.controlId === control?.controlKey);
    const controlId = control?.id || input.controlId;
    const controlKey = control?.controlKey || catalog?.controlId || input.controlId;
    const controlTitle = control?.title || catalog?.topic || input.controlId;
    if (rating === EngagementControlRating.EFFECTIVE) {
        const evidenceIds = input.evidenceObjectIds || [];
        if (evidenceIds.length) {
            const objects = await prisma.storedObject.findMany({ where: { id: { in: evidenceIds }, organizationId } });
            if (objects.some((row) => row.scanStatus !== ScanStatus.CLEAN)) {
                throw new ApiError(409, 'Non-CLEAN evidence cannot support an Effective judgment.');
            }
        }
    }
    const previous = await prisma.engagementControlEffectiveness.findUnique({
        where: { engagementId_controlId: { engagementId: engagement.id, controlId } },
    });
    const row = await prisma.engagementControlEffectiveness.upsert({
        where: { engagementId_controlId: { engagementId: engagement.id, controlId } },
        create: {
            organizationId,
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            controlId,
            controlKey,
            controlTitle,
            domain: control?.domain || catalog?.domain || 'Cybersecurity',
            rating,
            rationale: input.rationale?.trim() || null,
            scopeNote: input.scopeNote?.trim() || null,
            evidenceObjectIds: input.evidenceObjectIds || [],
            reviewedBy: actor.id,
            reviewedAt: new Date(),
            nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
        },
        update: {
            rating,
            rationale: input.rationale?.trim() || null,
            scopeNote: input.scopeNote?.trim() || null,
            evidenceObjectIds: input.evidenceObjectIds || [],
            reviewedBy: actor.id,
            reviewedAt: new Date(),
            nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : previous?.nextReviewAt,
            controlKey,
            controlTitle,
        },
    });
    await audit(organizationId, actor.id, previous ? 'control_effectiveness.changed' : 'control_effectiveness.recorded', 'EngagementControlEffectiveness', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        controlId,
        rating,
        previous: previous?.rating || null,
    });
    if (control) {
        const engagementNode = await ensureNode({
            organizationId,
            actorUserId: actor.id,
            nodeType: GovernanceNodeType.ENGAGEMENT,
            sourceModel: 'Engagement',
            sourceId: engagement.id,
            displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
        });
        const controlNode = await ensureNode({
            organizationId,
            actorUserId: actor.id,
            nodeType: GovernanceNodeType.CONTROL,
            sourceModel: 'OrganizationControl',
            sourceId: control.id,
            displayLabel: control.title,
        });
        await createRelationship({
            organizationId,
            createdBy: actor.id,
            fromNodeId: engagementNode.node.id,
            toNodeId: controlNode.node.id,
            relationshipType: GovernanceRelationshipType.AFFECTS,
        });
    }
    await maybeRecalculate(organizationId, actor, engagement.id, previous ? 'control_effectiveness.changed' : 'control_effectiveness.recorded');
    return row;
}

export async function recordCompensatingControl(organizationId: string, actor: Actor, key: string, input: {
    affectedControlId?: string;
    description: string;
    owner?: string;
    evidenceObjectId?: string;
    evidenceNote?: string;
    effectivenessJudgment?: EngagementControlRating;
    consideredInResidual?: boolean;
    nextReviewAt?: string;
    idempotencyKey?: string;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can record a compensating control.');
    if (!String(input.description || '').trim()) throw new ApiError(400, 'Describe the compensating control.');
    const engagement = await loadEngagement(organizationId, key);
    const idempotencyKey = String(input.idempotencyKey || '').trim() || null;
    if (idempotencyKey) {
        const existing = await prisma.engagementCompensatingControl.findFirst({
            where: { organizationId, engagementId: engagement.id, idempotencyKey },
        });
        if (existing) return existing;
    }
    const judgment = input.effectivenessJudgment || EngagementControlRating.NOT_ASSESSED;
    let considered = Boolean(input.consideredInResidual);
    if (considered) {
        if (!input.owner && !actor.id) throw new ApiError(400, 'A compensating control must have an owner before it can influence residual risk.');
        if (judgment === EngagementControlRating.NOT_ASSESSED) throw new ApiError(400, 'A compensating control must be judged before it can influence residual risk.');
        if (input.evidenceObjectId) {
            const object = await prisma.storedObject.findFirst({ where: { id: input.evidenceObjectId, organizationId } });
            if (object && object.scanStatus !== ScanStatus.CLEAN) {
                throw new ApiError(409, 'Non-CLEAN evidence cannot support a compensating control used in residual risk.');
            }
        }
    }
    const control = input.affectedControlId
        ? await prisma.organizationControl.findFirst({ where: { organizationId, OR: [{ id: input.affectedControlId }, { controlKey: input.affectedControlId }] } })
        : null;
    const row = await prisma.engagementCompensatingControl.create({
        data: {
            organizationId,
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            affectedControlId: control?.id || input.affectedControlId || null,
            affectedControlKey: control?.controlKey || input.affectedControlId || null,
            description: input.description.trim(),
            owner: input.owner || actor.name || actor.id,
            evidenceObjectId: input.evidenceObjectId || null,
            evidenceNote: input.evidenceNote?.trim() || null,
            effectivenessJudgment: judgment,
            reviewedBy: actor.id,
            reviewedAt: new Date(),
            nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
            consideredInResidual: considered,
            idempotencyKey,
        },
    }).catch(async (error: { code?: string }) => {
        if (error?.code === 'P2002' && idempotencyKey) {
            const existing = await prisma.engagementCompensatingControl.findFirst({
                where: { organizationId, engagementId: engagement.id, idempotencyKey },
            });
            if (existing) return existing;
        }
        throw error;
    });
    await audit(organizationId, actor.id, 'compensating_control.recorded', 'EngagementCompensatingControl', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        consideredInResidual: considered,
    });
    await maybeRecalculate(organizationId, actor, engagement.id, 'compensating_control.recorded');
    return row;
}

export async function calculateResidual(organizationId: string, actor: Actor, key: string, triggerReason = 'manual.calculate') {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can calculate Engagement residual risk.');
    const engagement = await loadEngagement(organizationId, key);
    const workspace = await collectRiskInputs(organizationId, engagement.id);
    const readiness = engagementResidualReadiness({
        confirmedTier: workspace.inherent.confirmedTier,
        controlRatings: workspace.controls,
    });
    if (!readiness.ready) {
        await prisma.engagementResidualRiskAssessment.create({
            data: {
                organizationId,
                engagementId: engagement.id,
                vendorId: engagement.vendorId,
                status: EngagementResidualStatus.NOT_READY,
                inherentTier: workspace.inherent.confirmedTier as VendorTier | undefined,
                inherentScore: workspace.inherent.inherentScore,
                inherentSource: workspace.inherent.source,
                inherentConfirmedAt: workspace.inherent.confirmedAt,
                inherentScoringVersion: workspace.inherent.scoringVersion,
                controlEffectivenessSnapshot: workspace.controls as Prisma.InputJsonValue,
                openFindingSnapshot: workspace.openFindings as Prisma.InputJsonValue,
                compensatingSnapshot: workspace.compensating as Prisma.InputJsonValue,
                methodologyVersion: ENGAGEMENT_RISK_SCORE_VERSION,
                calculationVersion: ENGAGEMENT_CALCULATION_VERSION,
                readiness: readiness as Prisma.InputJsonValue,
                triggerReason,
                calculatedBy: actor.id,
            },
        });
        throw new ApiError(409, readiness.blockers[0] || 'Residual risk is not ready.');
    }
    const result = calculateEngagementResidual({
        confirmedTier: workspace.inherent.confirmedTier as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        controlRatings: workspace.controls,
        openFindings: workspace.openFindings.map((row) => ({ severity: row.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', id: row.id, title: row.title })),
        reviewedCompensatingCount: workspace.compensating.filter((row) => row.consideredInResidual).length,
    });
    const row = await prisma.engagementResidualRiskAssessment.create({
        data: {
            organizationId,
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            status: EngagementResidualStatus.CALCULATED,
            inherentTier: workspace.inherent.confirmedTier as VendorTier,
            inherentScore: result.inherentRisk,
            inherentSource: workspace.inherent.source,
            inherentConfirmedAt: workspace.inherent.confirmedAt,
            inherentScoringVersion: workspace.inherent.scoringVersion,
            controlEffectivenessSnapshot: workspace.controls as Prisma.InputJsonValue,
            openFindingSnapshot: workspace.openFindings as Prisma.InputJsonValue,
            compensatingSnapshot: workspace.compensating as Prisma.InputJsonValue,
            methodologyVersion: ENGAGEMENT_RISK_SCORE_VERSION,
            calculationVersion: ENGAGEMENT_CALCULATION_VERSION,
            residualScore: result.residualRisk,
            residualBand: result.riskBand,
            explanation: result.explanation,
            factors: result.factors as Prisma.InputJsonValue,
            readiness: readiness as Prisma.InputJsonValue,
            triggerReason,
            calculatedAt: new Date(),
            calculatedBy: actor.id,
        },
    });
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actor.id,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
    });
    const riskNode = await ensureNode({
        organizationId,
        actorUserId: actor.id,
        nodeType: GovernanceNodeType.RISK,
        sourceModel: 'EngagementResidualRiskAssessment',
        sourceId: row.id,
        displayLabel: `${engagement.publicId} residual ${result.riskBand}`,
    });
    await createRelationship({
        organizationId,
        createdBy: actor.id,
        fromNodeId: engagementNode.node.id,
        toNodeId: riskNode.node.id,
        relationshipType: GovernanceRelationshipType.HAS_RISK,
    });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.RESIDUAL_READY } });
    await audit(organizationId, actor.id, triggerReason === 'manual.calculate' ? 'residual_risk.calculated' : 'residual_risk.recalculated', 'EngagementResidualRiskAssessment', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualBand: result.riskBand,
        residualScore: result.residualRisk,
        triggerReason,
        methodologyVersion: ENGAGEMENT_RISK_SCORE_VERSION,
    });
    await notify(organizationId, engagement.assignedAnalystUserId, 'residual_risk.ready', `Residual risk ready: ${engagement.serviceName}`, `Engagement residual risk is ${result.riskBand}. Wave 5 treatment is not started.`, 'EngagementResidualRiskAssessment', row.id);
    return presentResidual(row, workspace);
}

export async function confirmResidual(organizationId: string, actor: Actor, key: string, note?: string) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can confirm residual risk.');
    const engagement = await loadEngagement(organizationId, key);
    const latest = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId: engagement.id, status: { not: EngagementResidualStatus.NOT_READY } },
        orderBy: { createdAt: 'desc' },
    });
    if (!latest || !latest.residualBand) throw new ApiError(409, 'Calculate residual risk before confirming it.');
    const row = await prisma.engagementResidualRiskAssessment.create({
        data: {
            organizationId,
            engagementId: engagement.id,
            vendorId: engagement.vendorId,
            status: EngagementResidualStatus.CONFIRMED,
            inherentTier: latest.inherentTier,
            inherentScore: latest.inherentScore,
            inherentSource: latest.inherentSource,
            inherentConfirmedAt: latest.inherentConfirmedAt,
            inherentScoringVersion: latest.inherentScoringVersion,
            controlEffectivenessSnapshot: latest.controlEffectivenessSnapshot ?? Prisma.JsonNull,
            openFindingSnapshot: latest.openFindingSnapshot ?? Prisma.JsonNull,
            compensatingSnapshot: latest.compensatingSnapshot ?? Prisma.JsonNull,
            methodologyVersion: latest.methodologyVersion,
            calculationVersion: latest.calculationVersion,
            residualScore: latest.residualScore,
            residualBand: latest.residualBand,
            explanation: latest.explanation,
            factors: latest.factors ?? Prisma.JsonNull,
            readiness: latest.readiness ?? Prisma.JsonNull,
            triggerReason: 'residual_risk.confirmed',
            calculatedAt: latest.calculatedAt,
            calculatedBy: latest.calculatedBy,
            reviewedAt: new Date(),
            reviewedBy: actor.id,
            reviewNote: note?.trim() || 'Confirmed. Risk treatment decision pending. Wave 5 is not started.',
        },
    });
    await audit(organizationId, actor.id, 'residual_risk.reviewed', 'EngagementResidualRiskAssessment', row.id, {
        engagementId: engagement.id,
        vendorId: engagement.vendorId,
        residualBand: row.residualBand,
    });
    return presentResidual(row, await collectRiskInputs(organizationId, engagement.id));
}

export async function getEngagementRisk(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot view Engagement residual risk.');
    const engagement = await loadEngagement(organizationId, key);
    const workspace = await collectRiskInputs(organizationId, engagement.id);
    const latest = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId: engagement.id },
        orderBy: { createdAt: 'desc' },
    });
    const history = await prisma.engagementResidualRiskAssessment.findMany({
        where: { organizationId, engagementId: engagement.id },
        orderBy: { createdAt: 'desc' },
        take: 25,
    });
    const listedSignals = await listReviewSignals(organizationId, engagement.id);
    const insurance = await editionIsInsurance(organizationId);
    const siblings = await prisma.engagementResidualRiskAssessment.findMany({
        where: { organizationId, vendorId: engagement.vendorId, status: { not: EngagementResidualStatus.NOT_READY } },
        distinct: ['engagementId'],
        orderBy: { createdAt: 'desc' },
        select: { engagementId: true, residualBand: true, residualScore: true },
    });
    const siblingEngagements = await prisma.engagement.findMany({
        where: { organizationId, vendorId: engagement.vendorId },
        select: { id: true, publicId: true, serviceName: true },
    });
    const readiness = engagementResidualReadiness({
        confirmedTier: workspace.inherent.confirmedTier,
        controlRatings: workspace.controls,
    });
    return {
        what: `${engagement.publicId} · ${engagement.serviceName}`,
        thirdParty: engagement.vendor,
        engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName, status: engagement.status },
        confirmedInherent: workspace.inherent,
        dueDiligence: engagement.dueDiligencePlan ? { id: engagement.dueDiligencePlan.id, status: engagement.dueDiligencePlan.status, confirmedTier: engagement.dueDiligencePlan.confirmedTier } : null,
        findings: workspace.findings,
        candidates: workspace.candidates,
        reviewSignals: listedSignals.signals.map((signal) => {
            const existing = workspace.reviewSignals.find((row) => row.assessmentId === signal.assessmentId && row.questionId === signal.questionId);
            return existing || {
                ...signal,
                honesty: listedSignals.honesty,
            };
        }),
        honesty: listedSignals.honesty,
        controls: workspace.controls,
        applicableControls: workspace.applicableControls,
        compensating: workspace.compensating,
        residual: latest && latest.residualBand ? presentResidual(latest, workspace) : null,
        readiness,
        residualReady: readiness.ready,
        history: history.map((row) => ({
            id: row.id,
            status: row.status,
            residualBand: row.residualBand,
            residualScore: row.residualScore,
            triggerReason: row.triggerReason,
            calculatedAt: row.calculatedAt,
            reviewedAt: row.reviewedAt,
            createdAt: row.createdAt,
        })),
        methodology: {
            version: ENGAGEMENT_RISK_SCORE_VERSION,
            calculationVersion: ENGAGEMENT_CALCULATION_VERSION,
            ratingPoints: CONTROL_RATING_POINTS,
            note: 'Residual risk uses confirmed Wave 2 inherent tier, human-governed Engagement control effectiveness, confirmed open findings, and reviewed compensating controls. Questionnaire averages are not authoritative.',
        },
        nextAction: nextWave4Action(engagement.status, readiness.ready, latest?.status === EngagementResidualStatus.CONFIRMED, {
            openCandidateCount: workspace.candidates.length,
            controlAssessed: workspace.controls.some((row) => row.rating && row.rating !== EngagementControlRating.NOT_ASSESSED),
        }),
        wave5Started: false,
        riskTreatmentPending: latest?.status === EngagementResidualStatus.CONFIRMED,
        insuranceContext: insurance,
        legacyVendorRisk: {
            label: 'Legacy Vendor residual (compatibility only)',
            inherentRiskScore: engagement.vendor.inherentRiskScore,
            residualRiskScore: engagement.vendor.residualRiskScore,
            notAuthoritativeForGoldenJourney: true,
        },
        thirdPartyRollup: {
            highestActiveBand: highestBand(siblings.map((row) => row.residualBand)),
            engagements: siblingEngagements.map((row) => ({
                id: row.id,
                publicId: row.publicId,
                serviceName: row.serviceName,
                residualBand: siblings.find((item) => item.engagementId === row.id)?.residualBand || null,
            })),
        },
        statusLabel: engagementIraStatusLabel(engagement.status),
    };
}

export async function listVendorEngagementRisk(organizationId: string, actor: Actor, vendorId: string) {
    assertPractitioner(actor);
    if (!canRead(actor)) throw new ApiError(403, 'You cannot view Engagement residual risk.');
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, organizationId }, select: { id: true, name: true, residualRiskScore: true, inherentRiskScore: true } });
    if (!vendor) throw new ApiError(404, 'Third Party not found.');
    const engagements = await prisma.engagement.findMany({
        where: { organizationId, vendorId },
        select: { id: true, publicId: true, serviceName: true, status: true },
        orderBy: { createdAt: 'asc' },
    });
    const latest = await prisma.engagementResidualRiskAssessment.findMany({
        where: { organizationId, vendorId, status: { not: EngagementResidualStatus.NOT_READY } },
        orderBy: { createdAt: 'desc' },
    });
    const byEngagement = new Map<string, (typeof latest)[number]>();
    for (const row of latest) {
        if (!byEngagement.has(row.engagementId)) byEngagement.set(row.engagementId, row);
    }
    return {
        thirdParty: vendor,
        highestActiveEngagementRisk: highestBand([...byEngagement.values()].map((row) => row.residualBand)),
        legacyVendorResidual: { residualRiskScore: vendor.residualRiskScore, label: 'Legacy Vendor residual (compatibility only)' },
        engagements: engagements.map((row) => ({
            ...row,
            residual: byEngagement.get(row.id) ? {
                band: byEngagement.get(row.id)!.residualBand,
                score: byEngagement.get(row.id)!.residualScore,
                calculatedAt: byEngagement.get(row.id)!.calculatedAt,
            } : { band: null, score: null, status: 'Not yet calculated' },
        })),
    };
}

export async function afterFindingStateChange(organizationId: string, actor: Actor, issueId: string, reason: string) {
    const issue = await prisma.vendorIssue.findFirst({ where: { id: issueId, organizationId } });
    if (!issue?.engagementId) return;
    try {
        await maybeRecalculate(organizationId, actor, issue.engagementId, reason);
    } catch (error) {
        if (error instanceof ApiError && error.statusCode === 409) return;
        throw error;
    }
}

async function maybeRecalculate(organizationId: string, actor: Actor, engagementId: string, reason: string) {
    const inputs = await collectRiskInputs(organizationId, engagementId);
    const readiness = engagementResidualReadiness({
        confirmedTier: inputs.inherent.confirmedTier,
        controlRatings: inputs.controls,
    });
    if (!readiness.ready) return null;
    const prior = await prisma.engagementResidualRiskAssessment.findFirst({
        where: { organizationId, engagementId, status: { not: EngagementResidualStatus.NOT_READY } },
        orderBy: { createdAt: 'desc' },
    });
    if (!prior) return null;
    return calculateResidual(organizationId, actor, engagementId, reason);
}

async function collectRiskInputs(organizationId: string, engagementId: string) {
    const engagement = await loadEngagement(organizationId, engagementId);
    const issues = await prisma.vendorIssue.findMany({
        where: { organizationId, engagementId },
        orderBy: { identifiedDate: 'desc' },
    });
    const controls = await prisma.engagementControlEffectiveness.findMany({
        where: { organizationId, engagementId },
        orderBy: { updatedAt: 'desc' },
    });
    const compensating = await prisma.engagementCompensatingControl.findMany({
        where: { organizationId, engagementId },
        orderBy: { createdAt: 'desc' },
    });
    const catalog = loadWorkbookCatalog();
    const keys = packKeys(engagement.dueDiligencePlan);
    const wanted = new Set(catalog.questions.filter((row) => !keys.length || keys.includes(packKeyFor(row.pack))).map((row) => row.controlId));
    const orgControls = await prisma.organizationControl.findMany({
        where: { organizationId, archivedAt: null },
        select: { id: true, controlKey: true, title: true, domain: true },
        take: 200,
    });
    const applicableControls = orgControls.filter((row) => wanted.has(row.controlKey) || wanted.has(row.id)).map((row) => ({
        id: row.id,
        controlKey: row.controlKey,
        title: row.title,
        domain: row.domain,
        recorded: controls.find((item) => item.controlId === row.id || item.controlKey === row.controlKey) || null,
    }));
    if (!applicableControls.length) {
        const unique = new Map<string, { controlId: string; topic: string; domain: string }>();
        for (const row of catalog.questions) {
            if (keys.length && !keys.includes(packKeyFor(row.pack))) continue;
            if (!unique.has(row.controlId)) unique.set(row.controlId, { controlId: row.controlId, topic: row.topic, domain: row.domain });
        }
        for (const row of unique.values()) {
            applicableControls.push({
                id: row.controlId,
                controlKey: row.controlId,
                title: row.topic,
                domain: row.domain as never,
                recorded: controls.find((item) => item.controlId === row.controlId || item.controlKey === row.controlId) || null,
            });
        }
    }
    const confirmedOpen = issues.filter((row) => row.reviewState === IssueReviewState.CONFIRMED && OPEN_FINDING.has(row.status));
    return {
        inherent: {
            confirmedTier: engagement.ira?.confirmedTier || engagement.dueDiligencePlan?.confirmedTier || null,
            confirmedAt: engagement.ira?.confirmedAt || null,
            scoringVersion: engagement.ira?.scoringVersion || '3',
            recommendedScore: engagement.ira?.recommendedScore || null,
            inherentScore: engagement.ira?.recommendedScore || null,
            source: engagement.ira?.confirmedTier ? 'EngagementIra.confirmedTier' : null,
            iraId: engagement.ira?.id || null,
        },
        findings: issues.filter((row) => row.reviewState === IssueReviewState.CONFIRMED).map((row) => presentFinding(row, engagement)),
        candidates: issues.filter((row) => row.reviewState === IssueReviewState.DRAFT && isSpecialistJudgedCandidate(row.sourceSnapshot, row.draftRuleCode)).map((row) => presentFinding(row, engagement)),
        reviewSignals: issues.filter((row) => row.reviewState === IssueReviewState.DRAFT && isAutomatedReviewSignalIssue(row.sourceSnapshot, row.draftRuleCode)).map((row) => ({
            ...presentFinding(row, engagement),
            candidateClass: 'REVIEW_SIGNAL' as const,
            authoritative: false,
            honesty: reviewSignalHonesty(),
        })),
        dismissed: issues.filter((row) => row.reviewState === IssueReviewState.DISMISSED).map((row) => ({ id: row.id, title: row.title, reason: row.dismissReason })),
        openFindings: confirmedOpen.map((row) => ({
            id: row.id,
            title: findingTitle(row),
            severity: row.severity,
            status: row.status,
            responsibility: row.responsibility,
            controlId: row.controlId,
        })),
        controls: controls.map((row) => ({
            id: row.id,
            controlId: row.controlId,
            controlKey: row.controlKey,
            controlTitle: row.controlTitle,
            domain: row.domain,
            rating: row.rating,
            rationale: row.rationale,
            reviewedBy: row.reviewedBy,
            reviewedAt: row.reviewedAt,
        })),
        compensating: compensating.map((row) => ({
            id: row.id,
            description: row.description,
            owner: row.owner,
            affectedControlKey: row.affectedControlKey,
            effectivenessJudgment: row.effectivenessJudgment,
            consideredInResidual: row.consideredInResidual,
            reviewedBy: row.reviewedBy,
            reviewedAt: row.reviewedAt,
        })),
        applicableControls,
    };
}

function packKeyFor(workbookName: string) {
    const pack = [
        ['Baseline', 'baseline'],
        ['Cloud Hosting', 'cloud-hosting'],
        ['Software and API', 'software-api'],
        ['Privileged and Network Access', 'privileged-network'],
        ['Personal and Sensitive Data', 'personal-sensitive-data'],
        ['Critical Operations', 'critical-operations'],
        ['Regulated Service', 'regulated-service'],
        ['Physical Delivery', 'physical-delivery'],
    ].find((row) => row[0] === workbookName);
    return pack?.[1] || workbookName;
}

function presentFinding(row: { id: string; title: string; description: string; severity: IssueSeverity; status: VendorIssueStatus; reviewState: IssueReviewState; responsibility: string | null; assignedTo: string | null; targetRemediationDate: Date | null; identifiedDate: Date; controlId: string | null; recommendedSeverity: IssueSeverity | null; determinationNote: string | null; assessmentId: string | null; questionId: string | null; draftRuleCode: string | null; sourceSnapshot: Prisma.JsonValue }, engagement: { id: string; publicId: string; serviceName: string; vendor: { id: string; name: string } }) {
    return {
        id: row.id,
        title: findingTitle(row),
        originalTitle: row.title,
        description: row.description,
        severity: row.severity,
        recommendedSeverity: row.recommendedSeverity,
        status: row.status,
        reviewState: row.reviewState,
        responsibility: row.responsibility,
        owner: row.assignedTo,
        dueDate: row.targetRemediationDate,
        identifiedDate: row.identifiedDate,
        controlId: row.controlId,
        controlMapping: row.controlId || 'Control mapping not recorded',
        determinationNote: row.determinationNote,
        assessmentId: row.assessmentId,
        questionId: row.questionId,
        draftRuleCode: row.draftRuleCode,
        thirdParty: engagement.vendor,
        engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName },
        authoritative: row.reviewState === IssueReviewState.CONFIRMED,
    };
}

function presentResidual(row: {
    id: string;
    status: EngagementResidualStatus;
    inherentTier: VendorTier | null;
    inherentScore: number | null;
    inherentSource: string | null;
    inherentConfirmedAt: Date | null;
    inherentScoringVersion: string | null;
    residualScore: number | null;
    residualBand: string | null;
    explanation: string | null;
    factors: Prisma.JsonValue;
    readiness: Prisma.JsonValue;
    triggerReason: string | null;
    calculatedAt: Date | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    reviewNote: string | null;
    methodologyVersion: string;
    calculationVersion: string;
    controlEffectivenessSnapshot: Prisma.JsonValue;
    openFindingSnapshot: Prisma.JsonValue;
    compensatingSnapshot: Prisma.JsonValue;
}, workspace: Awaited<ReturnType<typeof collectRiskInputs>>) {
    return {
        id: row.id,
        status: row.status,
        residualBand: row.residualBand,
        residualScore: row.residualScore,
        explanation: row.explanation,
        factors: row.factors,
        readiness: row.readiness,
        triggerReason: row.triggerReason,
        calculatedAt: row.calculatedAt,
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        reviewNote: row.reviewNote,
        methodologyVersion: row.methodologyVersion,
        calculationVersion: row.calculationVersion,
        inherent: {
            tier: row.inherentTier,
            score: row.inherentScore,
            source: row.inherentSource,
            confirmedAt: row.inherentConfirmedAt,
            scoringVersion: row.inherentScoringVersion,
        },
        controls: row.controlEffectivenessSnapshot || workspace.controls,
        findingsAffecting: row.openFindingSnapshot || workspace.openFindings,
        compensating: row.compensatingSnapshot || workspace.compensating,
        nextAction: row.status === EngagementResidualStatus.CONFIRMED
            ? 'Risk treatment decision pending. Wave 5 is not started.'
            : 'Review the calculation drivers, then confirm this Engagement residual-risk assessment.',
        wave5Started: false,
    };
}

function highestBand(bands: Array<string | null | undefined>) {
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return order.find((band) => bands.includes(band)) || null;
}

export function wave4StatusReady(status: EngagementStatus) {
    return WAVE4_STATUSES.has(status);
}

export { nextWave4Action };
