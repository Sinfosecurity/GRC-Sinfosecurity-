import {
    EngagementIraStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
    RequesterTaskPurpose,
    VendorTier,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { editionIsInsurance } from '../insurance/insuranceService';
import { iraQuestionsForEdition } from '../insurance/iraOverlay';
import { IRA_QUESTIONS, missingIraQuestions } from '../tprm/iraCatalog';
import { iraForm, scoreIra, type IraRating } from '../tprm/iraScoring';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { notifyUser } from './notificationDeliveryService';
import { hashToken, randomToken } from './passwordService';
import { customerAppUrl, genericOperationalEmail } from './transactionalEmail';
import type { Actor } from './intakeEngagementService';

const TIER_VALUES = new Set(Object.values(VendorTier));

function assertNotVendor(actor: Actor) {
    if (String(actor.role || '').toUpperCase() === 'VENDOR' || participantExperience(actor.role) === 'vendor') {
        throw new ApiError(403, 'Vendor sessions cannot access inherent-risk assessment.');
    }
}

function isRequester(actor: Actor) {
    return participantExperience(actor.role) === 'requester';
}

function canReviewTier(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.triage']) || hasPermission(actor.role, PERMISSIONS['intake.assign']);
}

function asAnswers(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item ?? '')]));
}

function toPayload(answers: Record<string, string>, questions = IRA_QUESTIONS) {
    return questions.map((question) => ({ questionKey: question.key, response: answers[question.key] || '' }));
}

function snapshot(scored: IraRating) {
    return JSON.parse(JSON.stringify({
        scoringVersion: '3',
        ready: scored.ready,
        recommendedTier: scored.recommendedTier,
        percent: scored.percent,
        unknownKeys: scored.unknownKeys,
        floors: scored.floors,
        packs: scored.packs,
        factors: scored.factors,
        explanation: scored.explanation,
        autoConfirmEligible: scored.autoConfirmEligible,
        autoConfirmBlockedReason: scored.autoConfirmBlockedReason,
        signals: scored.signals,
    })) as Prisma.InputJsonValue;
}

function requesterFriendlyStatus(status: EngagementIraStatus) {
    switch (status) {
        case EngagementIraStatus.REQUIRED:
        case EngagementIraStatus.IN_PROGRESS:
            return 'Risk assessment required';
        case EngagementIraStatus.SUBMITTED:
            return 'Risk assessment submitted';
        case EngagementIraStatus.NEEDS_CLARIFICATION:
            return 'Additional information required';
        case EngagementIraStatus.TIER_REVIEW:
            return 'Risk assessment under review';
        case EngagementIraStatus.CONFIRMED:
            return 'Risk assessment confirmed';
        default:
            return 'Risk assessment required';
    }
}

function questionLabel(key: string, questions = IRA_QUESTIONS) {
    return questions.find((item) => item.key === key)?.question || key;
}

function optionLabels(key: string, raw: string | null | undefined, questions = IRA_QUESTIONS) {
    const question = questions.find((item) => item.key === key);
    if (!question || !raw) return raw || '';
    return raw.split('|').filter(Boolean).map((value) => question.options.find((option) => option.value === value)?.label || value).join(', ');
}

async function audit(organizationId: string, actorId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown>) {
    await recordAudit({ organizationId, actorUserId: actorId, action, resourceType, resourceId, result: 'success', metadata });
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: Parameters<typeof notifyUser>[0]['eventType'], title: string, body: string, resourceType: string, resourceId: string, email?: { emailBody?: string; emailHtml?: string }) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType, title, body, resourceType, resourceId, emailBody: email?.emailBody, emailHtml: email?.emailHtml });
}

const iraInclude = {
    engagement: {
        include: {
            vendor: { select: { id: true, publicId: true, name: true, legalName: true } },
            originatingIntake: { select: { id: true, publicId: true } },
        },
    },
    submissions: { orderBy: { submittedAt: 'asc' as const } },
    clarifications: { orderBy: [{ round: 'asc' as const }, { requestedAt: 'asc' as const }] },
};

async function loadIra(organizationId: string, key: string) {
    return prisma.engagementIra.findFirst({
        where: { organizationId, OR: [{ id: key }, { engagementId: key }, { engagement: { publicId: key } }] },
        include: iraInclude,
    });
}

async function requireIra(organizationId: string, key: string) {
    const ira = await loadIra(organizationId, key);
    if (!ira) throw new ApiError(404, 'Inherent-risk assessment not found.');
    return ira;
}

function ownsIra(ira: { engagement: { requesterUserId: string | null; requesterEmail: string | null } }, actor: Actor) {
    return ira.engagement.requesterUserId === actor.id
        || Boolean(ira.engagement.requesterEmail && ira.engagement.requesterEmail.toLowerCase() === actor.email.toLowerCase());
}

async function scoreAnswers(organizationId: string, engagementId: string, answers: Record<string, string>) {
    const insurance = await editionIsInsurance(organizationId);
    const questions = iraQuestionsForEdition(insurance);
    const payload = toPayload(answers, questions);
    const missing = missingIraQuestions(payload, questions);
    if (missing.length) throw new ApiError(400, `Answer every question. Don't know is allowed. Still needed: ${missing.length}.`);
    const onboarding = await prisma.vendorOnboarding.findFirst({
        where: { engagementId, organizationId },
        select: { externalRating: true },
    });
    const rating = onboarding?.externalRating && typeof onboarding.externalRating === 'object'
        ? onboarding.externalRating as { provider?: string; grade?: string; score?: number | null; assessedAt?: string }
        : null;
    return { scored: scoreIra(payload, { externalRating: rating }), questions, insurance };
}

async function writeIraGraph(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string; vendorId: string }, iraId: string) {
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
        status: EngagementStatus.READY_FOR_IRA,
    });
    const iraNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ASSESSMENT,
        sourceModel: 'EngagementIra',
        sourceId: iraId,
        displayLabel: `${engagement.publicId} inherent risk`,
        status: EngagementIraStatus.REQUIRED,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: engagementNode.node.id,
        toNodeId: iraNode.node.id,
        relationshipType: GovernanceRelationshipType.ASSESSED_BY,
    });
}

async function issueWorkspaceTask(organizationId: string, vendorId: string, engagementId: string, email: string, actorId: string, purpose: RequesterTaskPurpose) {
    const token = randomToken(32);
    await prisma.requesterTaskLink.create({
        data: {
            organizationId,
            vendorId,
            engagementId,
            purpose,
            email,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 30 * 86400000),
            createdBy: actorId,
            deliveryMethod: 'workspace',
        },
    });
}

function presentRequesterIra(ira: NonNullable<Awaited<ReturnType<typeof loadIra>>>, questions = IRA_QUESTIONS, opened = false) {
    const openRound = Math.max(0, ...ira.clarifications.map((item) => item.round));
    const openItems = ira.clarifications.filter((item) => item.round === openRound && !item.respondedAt);
    return {
        id: ira.id,
        engagementId: ira.engagementId,
        engagementPublicId: ira.engagement.publicId,
        thirdPartyName: ira.engagement.vendor.name,
        serviceName: ira.engagement.serviceName,
        businessPurpose: ira.engagement.businessPurpose,
        requesterStatus: requesterFriendlyStatus(ira.status),
        status: ira.status,
        why: 'Supreme needs the business context for this service so TPRM can recommend an inherent-risk tier. This is not a technical security questionnaire.',
        expectedKnowledge: 'Answer from how the business will use this service. Don\'t know is allowed and will not be converted into a tier.',
        form: opened || ira.status === EngagementIraStatus.IN_PROGRESS || ira.status === EngagementIraStatus.REQUIRED
            ? iraForm(questions)
            : undefined,
        answers: ira.status === EngagementIraStatus.REQUIRED || ira.status === EngagementIraStatus.IN_PROGRESS ? asAnswers(ira.currentAnswers) : undefined,
        submittedAt: ira.submittedAt,
        clarification: openItems.length ? {
            round: openRound,
            generalNote: openItems[0]?.generalNote || null,
            dueAt: openItems[0]?.dueAt || null,
            items: openItems.map((item) => ({
                id: item.id,
                questionKey: item.questionKey,
                question: questionLabel(item.questionKey, questions),
                previousAnswer: optionLabels(item.questionKey, item.previousAnswer, questions),
                previousAnswerValue: item.previousAnswer,
                analystNote: item.analystNote,
                dueAt: item.dueAt,
            })),
        } : null,
        nextAction: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION
            ? 'Answer the clarification and submit.'
            : ira.status === EngagementIraStatus.REQUIRED || ira.status === EngagementIraStatus.IN_PROGRESS
                ? 'Complete the risk assessment.'
                : requesterFriendlyStatus(ira.status),
    };
}

function presentTierReview(ira: NonNullable<Awaited<ReturnType<typeof loadIra>>>, questions = IRA_QUESTIONS, impact?: Record<string, unknown> | null) {
    const answers = asAnswers(ira.currentAnswers);
    const previous = ira.previousCalculationSnapshot && typeof ira.previousCalculationSnapshot === 'object'
        ? ira.previousCalculationSnapshot as { recommendedTier?: string | null; floors?: Array<{ code: string; applies: boolean }>; packs?: { packs?: Array<{ key: string; state: string }> } }
        : null;
    const current = ira.calculationSnapshot && typeof ira.calculationSnapshot === 'object'
        ? ira.calculationSnapshot as { recommendedTier?: string | null; floors?: Array<{ code: string; applies?: boolean; label?: string; rationale?: string; tier?: string }>; packs?: { packs?: Array<{ key: string; state: string; reason?: string }> }; explanation?: string }
        : null;
    return {
        id: ira.id,
        what: `${ira.engagement.publicId} · ${ira.engagement.serviceName}`,
        why: current?.explanation || ira.explanation || 'Version 3 has not produced a recommended tier yet.',
        source: 'Engagement inherent-risk assessment. Version 3 deterministic scoring. Vendor cannot see this record.',
        state: ira.status,
        stateLabel: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION
            ? 'Waiting for requester clarification'
            : ira.status === EngagementIraStatus.CONFIRMED
                ? 'Inherent tier confirmed'
                : 'Tier review required',
        owner: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION ? 'Requester' : 'Assigned TPRM analyst',
        impact: 'The confirmed inherent tier will later inform due-diligence scoping. Wave 3 is not started.',
        evidence: 'Submitted IRA answers, calculation snapshots, floors, and pack recommendations.',
        relationships: {
            thirdParty: ira.engagement.vendor,
            engagement: { id: ira.engagement.id, publicId: ira.engagement.publicId, serviceName: ira.engagement.serviceName },
            intake: ira.engagement.originatingIntake,
            iraId: ira.id,
        },
        nextAction: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION
            ? 'Waiting for requester clarification.'
            : ira.status === EngagementIraStatus.CONFIRMED
                ? 'Inherent tier confirmed. Due-diligence scoping is pending a later authorized wave.'
                : ira.unknownKeys && Array.isArray(ira.unknownKeys) && (ira.unknownKeys as string[]).length
                    ? 'Resolve Don\'t know answers through clarification before confirming a tier.'
                    : 'Confirm the tier, override it with a rationale, or request clarification.',
        history: {
            submissions: ira.submissions.map((row) => ({
                id: row.id,
                kind: row.kind,
                submittedBy: row.submittedBy,
                submittedAt: row.submittedAt,
            })),
            clarifications: ira.clarifications.map((item) => ({
                id: item.id,
                round: item.round,
                questionKey: item.questionKey,
                question: questionLabel(item.questionKey, questions),
                previousAnswer: optionLabels(item.questionKey, item.previousAnswer, questions),
                updatedAnswer: item.updatedAnswer ? optionLabels(item.questionKey, item.updatedAnswer, questions) : null,
                analystNote: item.analystNote,
                comment: item.comment,
                requestedBy: item.requestedBy,
                requestedAt: item.requestedAt,
                respondedBy: item.respondedBy,
                respondedAt: item.respondedAt,
            })),
            confirmedTier: ira.confirmedTier,
            confirmedAt: ira.confirmedAt,
            confirmedBy: ira.confirmedBy,
            overrideFromTier: ira.overrideFromTier,
            overrideReason: ira.overrideReason,
        },
        thirdParty: ira.engagement.vendor,
        engagement: {
            id: ira.engagement.id,
            publicId: ira.engagement.publicId,
            serviceName: ira.engagement.serviceName,
            businessPurpose: ira.engagement.businessPurpose,
            status: ira.engagement.status,
        },
        requester: {
            userId: ira.engagement.requesterUserId,
            name: ira.engagement.requesterName,
            email: ira.engagement.requesterEmail,
        },
        submittedAt: ira.submittedAt,
        scoringVersion: ira.scoringVersion,
        recommendedTier: ira.recommendedTier,
        recommendedScore: ira.recommendedScore,
        unknownKeys: ira.unknownKeys,
        explanation: ira.explanation,
        floors: current?.floors || ira.floors,
        packs: current?.packs || ira.packs,
        questions: questions.map((question) => ({
            key: question.key,
            part: question.part,
            question: question.question,
            answer: answers[question.key] || '',
            answerLabel: optionLabels(question.key, answers[question.key], questions),
            dontKnow: /dont_know|don't know/i.test(answers[question.key] || ''),
        })),
        impactDelta: impact || (previous ? {
            previousRecommendation: previous.recommendedTier || null,
            updatedRecommendation: ira.recommendedTier,
            changedFloors: (current?.floors || []).filter((floor) => floor.applies !== (previous.floors || []).find((item) => item.code === floor.code)?.applies).map((floor) => floor.code),
            changedPacks: (current?.packs?.packs || []).filter((pack) => pack.state !== (previous.packs?.packs || []).find((item) => item.key === pack.key)?.state).map((pack) => pack.key),
        } : null),
        dueDiligenceStarted: false,
        wave3Started: false,
    };
}

export async function openIraForEngagement(organizationId: string, actor: Actor, engagement: {
    id: string;
    publicId: string;
    vendorId: string;
    serviceName: string;
    requesterUserId: string | null;
    requesterEmail: string | null;
    assignedAnalystUserId: string | null;
}) {
    assertNotVendor(actor);
    const existing = await prisma.engagementIra.findUnique({ where: { engagementId: engagement.id } });
    if (existing) return existing;
    const ira = await prisma.engagementIra.create({
        data: {
            organizationId,
            engagementId: engagement.id,
            status: EngagementIraStatus.REQUIRED,
        },
    });
    if (engagement.requesterEmail) {
        await issueWorkspaceTask(organizationId, engagement.vendorId, engagement.id, engagement.requesterEmail, actor.id, RequesterTaskPurpose.IRA);
    }
    await writeIraGraph(organizationId, actor.id, engagement, ira.id);
    await audit(organizationId, actor.id, 'ira.task.created', 'EngagementIra', ira.id, {
        engagementId: engagement.id,
        engagementPublicId: engagement.publicId,
    });
    const email = genericOperationalEmail({
        subject: `Risk assessment required · ${engagement.publicId}`,
        body: `TPRM needs the business context for ${engagement.serviceName}. Open Actions Required in the requester workspace.`,
        cta: { label: 'Complete risk assessment', url: customerAppUrl('/request/actions') },
    });
    await notify(organizationId, engagement.requesterUserId, 'assessment.assigned', email.subject, email.text, 'EngagementIra', ira.id, { emailBody: email.text, emailHtml: email.html });
    return ira;
}

export async function listRequesterIraActions(organizationId: string, actor: Actor) {
    assertNotVendor(actor);
    if (!isRequester(actor)) throw new ApiError(403, 'Only the business requester can open requester IRA actions.');
    const rows = await prisma.engagementIra.findMany({
        where: {
            organizationId,
            status: { in: [EngagementIraStatus.REQUIRED, EngagementIraStatus.IN_PROGRESS, EngagementIraStatus.NEEDS_CLARIFICATION] },
            OR: [
                { engagement: { requesterUserId: actor.id } },
                { engagement: { requesterEmail: { equals: actor.email, mode: 'insensitive' } } },
            ],
        },
        include: iraInclude,
        orderBy: { createdAt: 'desc' },
    });
    return rows.map((ira) => ({
        id: ira.id,
        type: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION ? 'IRA_CLARIFICATION' : 'IRA_REQUIRED',
        title: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION ? 'Risk assessment clarification' : 'Complete risk assessment',
        engagementPublicId: ira.engagement.publicId,
        thirdPartyName: ira.engagement.vendor.name,
        serviceName: ira.engagement.serviceName,
        requesterStatus: requesterFriendlyStatus(ira.status),
        href: ira.status === EngagementIraStatus.NEEDS_CLARIFICATION ? `/request/ira/${ira.id}/clarification` : `/request/ira/${ira.id}`,
    }));
}

export async function getRequesterIra(organizationId: string, actor: Actor, key: string) {
    assertNotVendor(actor);
    if (!isRequester(actor)) throw new ApiError(403, 'GRC practitioners cannot use Requester Workspace.');
    if (!hasPermission(actor.role, PERMISSIONS['ira.complete_own']) && !hasPermission(actor.role, PERMISSIONS['ira.clarify_own'])) {
        throw new ApiError(403, 'You cannot open this risk assessment.');
    }
    const ira = await requireIra(organizationId, key);
    if (!ownsIra(ira, actor)) throw new ApiError(404, 'Risk assessment not found.');
    const insurance = await editionIsInsurance(organizationId);
    const questions = iraQuestionsForEdition(insurance);
    if (ira.status === EngagementIraStatus.REQUIRED) {
        await prisma.engagementIra.update({
            where: { id: ira.id },
            data: { status: EngagementIraStatus.IN_PROGRESS, openedAt: ira.openedAt || new Date() },
        });
        await prisma.engagement.update({ where: { id: ira.engagementId }, data: { status: EngagementStatus.IRA_IN_PROGRESS } });
        await audit(organizationId, actor.id, 'ira.opened', 'EngagementIra', ira.id, { engagementId: ira.engagementId });
    }
    const fresh = await requireIra(organizationId, ira.id);
    return presentRequesterIra(fresh, questions, true);
}

export async function submitRequesterIra(organizationId: string, actor: Actor, key: string, input: { answers?: Record<string, string>; attested?: boolean }) {
    assertNotVendor(actor);
    if (!isRequester(actor)) throw new ApiError(403, 'GRC practitioners cannot submit requester IRA.');
    if (!hasPermission(actor.role, PERMISSIONS['ira.complete_own'])) throw new ApiError(403, 'You cannot submit this risk assessment.');
    if (!input.attested) throw new ApiError(400, 'Confirm the answers are accurate before submitting.');
    const ira = await requireIra(organizationId, key);
    if (!ownsIra(ira, actor)) throw new ApiError(404, 'Risk assessment not found.');
    if (ira.status !== EngagementIraStatus.REQUIRED && ira.status !== EngagementIraStatus.IN_PROGRESS) {
        throw new ApiError(409, 'This risk assessment has already been submitted.');
    }
    const answers = asAnswers(input.answers);
    const { scored, questions } = await scoreAnswers(organizationId, ira.engagementId, answers);
    const autoConfirm = scored.autoConfirmEligible && scored.recommendedTier === VendorTier.LOW;
    const now = new Date();
    await prisma.$transaction([
        prisma.engagementIra.update({
            where: { id: ira.id },
            data: {
                currentAnswers: answers,
                recommendedTier: scored.recommendedTier,
                recommendedScore: scored.percent != null ? Math.round(scored.percent) : null,
                unknownKeys: scored.unknownKeys,
                floors: scored.floors as object[],
                packs: scored.packs as object,
                explanation: scored.explanation,
                calculationSnapshot: snapshot(scored),
                status: autoConfirm ? EngagementIraStatus.CONFIRMED : EngagementIraStatus.TIER_REVIEW,
                submittedAt: now,
                submittedBy: actor.id,
                openedAt: ira.openedAt || now,
                confirmedTier: autoConfirm ? VendorTier.LOW : null,
                confirmedAt: autoConfirm ? now : null,
                confirmedBy: autoConfirm ? actor.id : null,
            },
        }),
        prisma.engagementIraSubmission.create({
            data: {
                organizationId,
                iraId: ira.id,
                kind: 'INITIAL',
                answers,
                calculationSnapshot: snapshot(scored),
                submittedBy: actor.id,
                submittedAt: now,
            },
        }),
        prisma.engagement.update({
            where: { id: ira.engagementId },
            data: { status: autoConfirm ? EngagementStatus.INHERENT_TIER_CONFIRMED : EngagementStatus.TIER_REVIEW },
        }),
    ]);
    await audit(organizationId, actor.id, 'ira.submitted', 'EngagementIra', ira.id, {
        engagementId: ira.engagementId,
        recommendedTier: scored.recommendedTier,
        unknownCount: scored.unknownCount,
        autoConfirm,
    });
    await audit(organizationId, actor.id, 'ira.calculated', 'EngagementIra', ira.id, {
        scoringVersion: '3',
        recommendedTier: scored.recommendedTier,
        explanation: scored.explanation,
    });
    const email = genericOperationalEmail({
        subject: `Risk assessment submitted · ${ira.engagement.publicId}`,
        body: `${ira.engagement.vendor.name} · ${ira.engagement.serviceName} is ready for Tier Review.`,
        cta: { label: 'Open Tier Review', url: customerAppUrl(`/third-parties/engagements/${ira.engagementId}/tier-review`) },
    });
    await notify(organizationId, ira.engagement.assignedAnalystUserId, 'approval.requested', email.subject, email.text, 'Engagement', ira.engagementId, { emailBody: email.text, emailHtml: email.html });
    const fresh = await requireIra(organizationId, ira.id);
    return presentRequesterIra(fresh, questions);
}

export async function getTierReview(organizationId: string, actor: Actor, key: string) {
    assertNotVendor(actor);
    if (isRequester(actor)) throw new ApiError(403, 'Requesters cannot open GRC Tier Review.');
    if (!canReviewTier(actor) && !hasPermission(actor.role, PERMISSIONS['intake.read'])) {
        throw new ApiError(403, 'You cannot view Tier Review.');
    }
    const ira = await requireIra(organizationId, key);
    const insurance = await editionIsInsurance(organizationId);
    await audit(organizationId, actor.id, 'ira.tier_review.opened', 'EngagementIra', ira.id, { engagementId: ira.engagementId });
    return presentTierReview(ira, iraQuestionsForEdition(insurance));
}

export async function confirmEngagementTier(organizationId: string, actor: Actor, key: string, input: { reason?: string }) {
    assertNotVendor(actor);
    if (isRequester(actor) || !canReviewTier(actor)) throw new ApiError(403, 'Only a TPRM reviewer can confirm the tier.');
    const ira = await requireIra(organizationId, key);
    if (ira.status === EngagementIraStatus.NEEDS_CLARIFICATION) {
        throw new ApiError(409, 'Clarification is outstanding. The tier cannot be finalized.');
    }
    if (ira.status === EngagementIraStatus.CONFIRMED) throw new ApiError(409, 'This inherent tier is already confirmed.');
    if (ira.status !== EngagementIraStatus.TIER_REVIEW && ira.status !== EngagementIraStatus.SUBMITTED) {
        throw new ApiError(409, 'This engagement is not waiting for tier confirmation.');
    }
    if (!ira.recommendedTier) {
        throw new ApiError(409, 'Not yet rated — Don\'t know answers still need confirmation. A final tier was not fabricated.');
    }
    const now = new Date();
    await prisma.engagementIra.update({
        where: { id: ira.id },
        data: {
            status: EngagementIraStatus.CONFIRMED,
            confirmedTier: ira.recommendedTier,
            confirmedAt: now,
            confirmedBy: actor.id,
            overrideFromTier: null,
            overrideReason: input.reason?.trim() || null,
        },
    });
    await prisma.engagement.update({
        where: { id: ira.engagementId },
        data: { status: EngagementStatus.INHERENT_TIER_CONFIRMED },
    });
    await audit(organizationId, actor.id, 'ira.tier.confirmed', 'EngagementIra', ira.id, {
        recommendedTier: ira.recommendedTier,
        confirmedTier: ira.recommendedTier,
        scoringVersion: '3',
    });
    return getTierReview(organizationId, actor, ira.id);
}

export async function overrideEngagementTier(organizationId: string, actor: Actor, key: string, input: { tier?: string; reason?: string }) {
    assertNotVendor(actor);
    if (isRequester(actor) || !canReviewTier(actor)) throw new ApiError(403, 'Only a TPRM reviewer can override the tier.');
    const ira = await requireIra(organizationId, key);
    if (ira.status === EngagementIraStatus.NEEDS_CLARIFICATION) {
        throw new ApiError(409, 'Clarification is outstanding. The tier cannot be finalized.');
    }
    if (!ira.recommendedTier) {
        throw new ApiError(409, 'Not yet rated — Don\'t know answers still need confirmation. Override cannot invent a recommendation.');
    }
    const next = String(input.tier || '').toUpperCase();
    if (!TIER_VALUES.has(next as VendorTier) || next === VendorTier.UNRATED) throw new ApiError(400, 'A valid override tier is required.');
    const reason = String(input.reason || '').trim();
    if (reason.length < 8) throw new ApiError(400, 'Override requires a written rationale.');
    if (next === ira.recommendedTier) throw new ApiError(400, 'Override must change the recommended tier.');
    const now = new Date();
    await prisma.engagementIra.update({
        where: { id: ira.id },
        data: {
            status: EngagementIraStatus.CONFIRMED,
            confirmedTier: next as VendorTier,
            confirmedAt: now,
            confirmedBy: actor.id,
            overrideFromTier: ira.recommendedTier,
            overrideReason: reason,
        },
    });
    await prisma.engagement.update({
        where: { id: ira.engagementId },
        data: { status: EngagementStatus.INHERENT_TIER_CONFIRMED },
    });
    await audit(organizationId, actor.id, 'ira.tier.overridden', 'EngagementIra', ira.id, {
        recommendedTier: ira.recommendedTier,
        confirmedTier: next,
        reason,
        scoringVersion: '3',
    });
    return getTierReview(organizationId, actor, ira.id);
}

export async function requestIraClarification(organizationId: string, actor: Actor, key: string, input: {
    questionKeys?: string[];
    notes?: Record<string, string>;
    generalNote?: string;
    dueAt?: string;
}) {
    assertNotVendor(actor);
    if (isRequester(actor) || !canReviewTier(actor)) throw new ApiError(403, 'Only a TPRM reviewer can request clarification.');
    const ira = await requireIra(organizationId, key);
    if (ira.status === EngagementIraStatus.CONFIRMED) throw new ApiError(409, 'The inherent tier is already confirmed.');
    const insurance = await editionIsInsurance(organizationId);
    const questions = iraQuestionsForEdition(insurance);
    const keys = [...new Set((input.questionKeys || []).map((item) => String(item)))].filter(Boolean);
    if (!keys.length) throw new ApiError(400, 'Select at least one IRA question.');
    const unknown = keys.filter((keyName) => !questions.some((question) => question.key === keyName));
    if (unknown.length) throw new ApiError(400, `Unknown IRA question: ${unknown.join(', ')}`);
    const answers = asAnswers(ira.currentAnswers);
    const nextRound = Math.max(0, ...ira.clarifications.map((item) => item.round)) + 1;
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    await prisma.$transaction([
        ...keys.map((questionKey) => prisma.engagementIraClarification.create({
            data: {
                organizationId,
                iraId: ira.id,
                round: nextRound,
                questionKey,
                previousAnswer: answers[questionKey] || null,
                analystNote: String(input.notes?.[questionKey] || input.generalNote || '').trim() || 'Please clarify this answer.',
                requestedBy: actor.id,
                dueAt,
                generalNote: input.generalNote?.trim() || null,
            },
        })),
        prisma.engagementIra.update({
            where: { id: ira.id },
            data: { status: EngagementIraStatus.NEEDS_CLARIFICATION },
        }),
        prisma.engagement.update({
            where: { id: ira.engagementId },
            data: { status: EngagementStatus.NEEDS_REQUESTER_CLARIFICATION },
        }),
    ]);
    if (ira.engagement.requesterEmail) {
        await issueWorkspaceTask(organizationId, ira.engagement.vendorId, ira.engagementId, ira.engagement.requesterEmail, actor.id, RequesterTaskPurpose.CLARIFICATION);
    }
    await audit(organizationId, actor.id, 'ira.clarification.requested', 'EngagementIra', ira.id, {
        round: nextRound,
        questionKeys: keys,
    });
    const email = genericOperationalEmail({
        subject: `Additional information required · ${ira.engagement.publicId}`,
        body: 'TPRM asked a follow-up on the risk assessment. Open Actions Required.',
        cta: { label: 'Answer clarification', url: customerAppUrl('/request/actions') },
    });
    await notify(organizationId, ira.engagement.requesterUserId, 'intake.information_requested', email.subject, email.text, 'EngagementIra', ira.id, { emailBody: email.text, emailHtml: email.html });
    return getTierReview(organizationId, actor, ira.id);
}

export async function submitRequesterClarification(organizationId: string, actor: Actor, key: string, input: {
    responses?: Array<{ questionKey: string; updatedAnswer?: string; comment?: string }>;
}) {
    assertNotVendor(actor);
    if (!isRequester(actor)) throw new ApiError(403, 'GRC practitioners cannot submit requester clarification.');
    if (!hasPermission(actor.role, PERMISSIONS['ira.clarify_own'])) throw new ApiError(403, 'You cannot submit this clarification.');
    const ira = await requireIra(organizationId, key);
    if (!ownsIra(ira, actor)) throw new ApiError(404, 'Risk assessment not found.');
    if (ira.status !== EngagementIraStatus.NEEDS_CLARIFICATION) throw new ApiError(409, 'No clarification is waiting.');
    const openRound = Math.max(...ira.clarifications.map((item) => item.round));
    const openItems = ira.clarifications.filter((item) => item.round === openRound && !item.respondedAt);
    if (!openItems.length) throw new ApiError(409, 'No clarification is waiting.');
    const responses = new Map((input.responses || []).map((item) => [item.questionKey, item]));
    for (const item of openItems) {
        if (!String(responses.get(item.questionKey)?.updatedAnswer || '').trim()) {
            throw new ApiError(400, `Update the answer for ${item.questionKey}.`);
        }
    }
    const answers = { ...asAnswers(ira.currentAnswers) };
    const now = new Date();
    for (const item of openItems) {
        const response = responses.get(item.questionKey)!;
        answers[item.questionKey] = String(response.updatedAnswer).trim();
        await prisma.engagementIraClarification.update({
            where: { id: item.id },
            data: {
                updatedAnswer: String(response.updatedAnswer).trim(),
                comment: response.comment?.trim() || null,
                respondedBy: actor.id,
                respondedAt: now,
            },
        });
    }
    const previousSnapshot = ira.calculationSnapshot;
    const { scored } = await scoreAnswers(organizationId, ira.engagementId, answers);
    await prisma.$transaction([
        prisma.engagementIra.update({
            where: { id: ira.id },
            data: {
                currentAnswers: answers,
                previousCalculationSnapshot: previousSnapshot ?? Prisma.JsonNull,
                recommendedTier: scored.recommendedTier,
                recommendedScore: scored.percent != null ? Math.round(scored.percent) : null,
                unknownKeys: scored.unknownKeys,
                floors: scored.floors as object[],
                packs: scored.packs as object,
                explanation: scored.explanation,
                calculationSnapshot: snapshot(scored),
                status: EngagementIraStatus.TIER_REVIEW,
                submittedAt: now,
                submittedBy: actor.id,
            },
        }),
        prisma.engagementIraSubmission.create({
            data: {
                organizationId,
                iraId: ira.id,
                kind: 'CLARIFICATION',
                answers,
                calculationSnapshot: snapshot(scored),
                submittedBy: actor.id,
                submittedAt: now,
            },
        }),
        prisma.engagement.update({
            where: { id: ira.engagementId },
            data: { status: EngagementStatus.TIER_REVIEW },
        }),
    ]);
    await audit(organizationId, actor.id, 'ira.clarification.submitted', 'EngagementIra', ira.id, { round: openRound, questionKeys: openItems.map((item) => item.questionKey) });
    await audit(organizationId, actor.id, 'ira.recalculated', 'EngagementIra', ira.id, {
        previousRecommendation: previousSnapshot && typeof previousSnapshot === 'object' ? (previousSnapshot as { recommendedTier?: string }).recommendedTier : null,
        updatedRecommendation: scored.recommendedTier,
        scoringVersion: '3',
    });
    const email = genericOperationalEmail({
        subject: `Clarification received · ${ira.engagement.publicId}`,
        body: 'The requester updated the risk assessment. Review the before-and-after impact in Tier Review.',
        cta: { label: 'Open Tier Review', url: customerAppUrl(`/third-parties/engagements/${ira.engagementId}/tier-review`) },
    });
    await notify(organizationId, ira.engagement.assignedAnalystUserId, 'intake.information_received', email.subject, email.text, 'Engagement', ira.engagementId, { emailBody: email.text, emailHtml: email.html });
    const insurance = await editionIsInsurance(organizationId);
    return presentRequesterIra(await requireIra(organizationId, ira.id), iraQuestionsForEdition(insurance));
}

export function engagementIraNextAction(status: EngagementStatus) {
    switch (status) {
        case EngagementStatus.READY_FOR_IRA:
            return 'Requester must complete the inherent-risk assessment';
        case EngagementStatus.IRA_IN_PROGRESS:
            return 'Requester is completing the inherent-risk assessment';
        case EngagementStatus.TIER_REVIEW:
            return 'Complete Tier Review';
        case EngagementStatus.NEEDS_REQUESTER_CLARIFICATION:
            return 'Waiting for requester clarification';
        case EngagementStatus.INHERENT_TIER_CONFIRMED:
            return 'Inherent tier confirmed. Due-diligence scoping is pending a later authorized wave.';
        case EngagementStatus.INTAKE_COMPLETE:
            return 'Review this engagement';
        default:
            return 'Review this engagement';
    }
}

export function engagementIraStatusLabel(status: EngagementStatus) {
    switch (status) {
        case EngagementStatus.READY_FOR_IRA: return 'Ready for inherent risk assessment';
        case EngagementStatus.IRA_IN_PROGRESS: return 'Risk assessment in progress';
        case EngagementStatus.TIER_REVIEW: return 'Tier review required';
        case EngagementStatus.NEEDS_REQUESTER_CLARIFICATION: return 'Waiting for requester clarification';
        case EngagementStatus.INHERENT_TIER_CONFIRMED: return 'Inherent tier confirmed';
        case EngagementStatus.INTAKE_COMPLETE: return 'Intake complete';
        default: return 'Draft';
    }
}

export function requesterEngagementStatus(status: EngagementStatus) {
    switch (status) {
        case EngagementStatus.READY_FOR_IRA:
        case EngagementStatus.IRA_IN_PROGRESS:
            return 'Risk assessment required';
        case EngagementStatus.TIER_REVIEW:
            return 'Risk assessment under review';
        case EngagementStatus.NEEDS_REQUESTER_CLARIFICATION:
            return 'Additional information required';
        case EngagementStatus.INHERENT_TIER_CONFIRMED:
            return 'Risk assessment confirmed';
        default:
            return 'Engagement created';
    }
}
