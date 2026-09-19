import {
    AssessmentStatus,
    AssessmentType,
    ContactRole,
    EngagementDueDiligencePlanStatus,
    EngagementReviewStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    Prisma,
    ScanStatus,
    VendorInvitationStatus,
    VendorTier,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, participantExperience, PERMISSIONS } from '../security/rbac';
import { editionIsInsurance } from '../insurance/insuranceService';
import { scoreIra } from '../tprm/iraScoring';
import { loadWorkbookCatalog, workbookControlIdsForPacks, workbookDomainsForPacks, workbookEvidenceForDomains } from '../tprm/workbookCatalog';
import { sanitizeVendorPayload } from '../tprm/vendorPayload';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { deliverEmail, notifyUser } from './notificationDeliveryService';
import { hashToken, randomToken } from './passwordService';
import { customerAppUrl, genericOperationalEmail, vendorInvitationEmail } from './transactionalEmail';
import { publicFrontendUrl } from './publicFrontendUrl';
import { addBusinessDays } from './vendorOnboardingScoring';
import { recommendAssessments } from './questionnaireLibrary';
import vendorAssessmentService from './vendorAssessmentService';
import { ATTESTATION_STATEMENT, ATTESTATION_VERSION, VENDOR_SLA_DAYS } from './vendorDueDiligenceService';
import type { Actor } from './intakeEngagementService';

const REVIEWABLE = new Set([
    EngagementStatus.INHERENT_TIER_CONFIRMED,
    EngagementStatus.DUE_DILIGENCE_PLANNING,
    EngagementStatus.READY_TO_SEND,
    EngagementStatus.AWAITING_VENDOR,
    EngagementStatus.VENDOR_IN_PROGRESS,
    EngagementStatus.VENDOR_SUBMITTED,
    EngagementStatus.SPECIALIST_REVIEW,
]);

const DOMAIN_FOR_PACK: Record<string, string> = {
    baseline: 'Cybersecurity',
    'cloud-hosting': 'Cybersecurity',
    'software-api': 'Cybersecurity',
    'privileged-network': 'Cybersecurity',
    'personal-sensitive-data': 'Privacy',
    'critical-operations': 'Operational Resilience',
    'physical-delivery': 'Operational Resilience',
    'regulated-service': 'Compliance',
    insurance: 'Financial Risk',
    'ai-governance': 'AI Governance',
};

function assertPractitioner(actor: Actor) {
    if (participantExperience(actor.role) === 'requester') throw new ApiError(403, 'Requesters cannot open vendor due diligence.');
    if (participantExperience(actor.role) === 'vendor' || String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendor sessions cannot open GRC due diligence.');
    }
}

function canManage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.triage']) || hasPermission(actor.role, PERMISSIONS['vendor.manage']);
}

function asAnswers(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item ?? '')]));
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function packRows(plan: { packs?: Array<Record<string, unknown>> } | null | undefined) {
    return (plan?.packs || []).map((pack) => ({
        key: String(pack.key || ''),
        name: String(pack.name || pack.key || ''),
        status: String(pack.state || 'EXCLUDED'),
        why: String(pack.reason || 'Not triggered by the confirmed inherent-risk answers.'),
        trigger: String(pack.originalScopeAnswer || pack.scopeAnswer || pack.reason || ''),
        required: pack.state === 'INCLUDED_REQUIRED' || pack.key === 'baseline',
        evidenceExpected: pack.state === 'INCLUDED' || pack.state === 'INCLUDED_REQUIRED'
            ? 'Current policy, report, or dated attestation for this domain.'
            : 'Not requested for this engagement.',
        reviewerDomain: DOMAIN_FOR_PACK[String(pack.key || '')] || 'Cybersecurity',
        overridable: pack.key !== 'baseline',
        questionCount: Number(pack.questionCount) || 0,
    }));
}

function slaFor(tier: VendorTier) {
    return VENDOR_SLA_DAYS[tier] || 20;
}

async function loadEngagement(organizationId: string, key: string) {
    const engagement = await prisma.engagement.findFirst({
        where: { organizationId, OR: [{ id: key }, { publicId: key }] },
        include: {
            vendor: true,
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

async function notify(organizationId: string, userId: string | null | undefined, eventType: string, title: string, body: string, resourceType: string, resourceId: string, extra: Record<string, unknown> = {}) {
    if (!userId) return;
    await notifyUser({ organizationId, userId, eventType: eventType as never, title, body, resourceType, resourceId, ...extra });
}

function composePlan(engagement: Awaited<ReturnType<typeof loadEngagement>>, scored: ReturnType<typeof scoreIra>, assessments: Array<Record<string, unknown>>, customization?: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
}) {
    const catalog = loadWorkbookCatalog();
    let packs = scored.packs.packs.map((pack) => ({ ...pack }));
    const includeKeys = new Set(customization?.includeKeys || []);
    const excludeKeys = new Set(customization?.excludeKeys || []);
    if (includeKeys.size || excludeKeys.size) {
        packs = packs.map((pack) => {
            if (pack.key === 'baseline' && excludeKeys.has(pack.key)) return pack;
            if (excludeKeys.has(pack.key) || excludeKeys.has(pack.templateKey)) {
                return { ...pack, state: 'EXCLUDED' as const, reason: `${pack.reason}. Analyst excluded this pack${customization?.reason ? `: ${customization.reason}` : '.'}` };
            }
            if (includeKeys.has(pack.key) || includeKeys.has(pack.templateKey)) {
                return { ...pack, state: 'INCLUDED' as const, reason: `${pack.reason}. Analyst included this pack${customization?.reason ? `: ${customization.reason}` : '.'}` };
            }
            return pack;
        });
    }
    const included = packs.filter((pack) => pack.state === 'INCLUDED' || pack.state === 'INCLUDED_REQUIRED');
    const unresolved = scored.unknownKeys.length
        ? scored.unknownKeys.map((key) => ({ code: key, message: `Don't know remains on ${key}. Scope requires review.` }))
        : [];
    const domains = [...new Set(included.map((pack) => DOMAIN_FOR_PACK[pack.key] || 'Cybersecurity'))];
    const evidence = workbookEvidenceForDomains(workbookDomainsForPacks(included.map((pack) => pack.key), catalog), catalog).map((row) => ({
        id: row.id,
        name: row.request || row.id,
        domain: row.domain || 'Security',
    }));
    return {
        catalogVersion: catalog.catalogVersion,
        scoringVersion: '3',
        confirmedTier: engagement.ira?.confirmedTier,
        recommendedTier: engagement.ira?.recommendedTier,
        sendBlocked: unresolved.length > 0,
        sendBlockMessage: unresolved.length ? 'Scope requires review. Unresolved Don\'t know answers remain.' : '',
        questionnairePlan: {
            ...scored.packs,
            packs,
            includedPackKeys: included.map((pack) => pack.key),
            includedTemplateKeys: included.map((pack) => pack.templateKey),
        },
        packs: packRows({ packs }),
        evidenceRequirements: evidence,
        reviewerDomains: domains,
        assessments,
        unresolved,
        explanation: scored.explanation,
        floors: scored.floors,
        externalRating: scored.signals ? null : null,
        slaDays: slaFor(engagement.ira?.confirmedTier || VendorTier.MEDIUM),
        wave4Started: false,
    };
}

async function buildSnapshot(organizationId: string, engagement: Awaited<ReturnType<typeof loadEngagement>>, customization?: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
}) {
    if (!engagement.ira?.confirmedTier) throw new ApiError(409, 'Confirm the inherent tier before generating a due-diligence plan.');
    const answers = asAnswers(engagement.ira.currentAnswers);
    const payload = Object.entries(answers).map(([questionKey, response]) => ({ questionKey, response }));
    const scored = scoreIra(payload);
    const recommendation = await recommendAssessments(organizationId, engagement.vendorId, {
        requiredTemplateKeys: scored.packs.includedTemplateKeys,
        personalData: scored.signals.personalData,
        aiInvolved: scored.signals.aiInvolved,
    }, engagement.ira.confirmedTier);
    const assessments = [...recommendation.required, ...recommendation.recommended].map((item: any) => ({
        templateId: item.id,
        key: item.key,
        name: item.name,
        requirement: item.requirement || 'Required',
        framework: item.framework,
        questionCount: item.questionCount,
        expectedEvidence: item.expectedEvidence,
        why: item.reason,
    }));
    return composePlan(engagement, scored, assessments, customization);
}

export async function openDueDiligencePlan(organizationId: string, actor: Actor, engagement: { id: string }) {
    assertPractitioner(actor);
    const row = await loadEngagement(organizationId, engagement.id);
    if (!row.ira?.confirmedTier || row.ira.status !== 'CONFIRMED') return null;
    if (row.dueDiligencePlan) return row.dueDiligencePlan;
    const snapshot = await buildSnapshot(organizationId, row);
    const slaDays = slaFor(row.ira.confirmedTier);
    const plan = await prisma.engagementDueDiligencePlan.create({
        data: {
            organizationId,
            engagementId: row.id,
            vendorId: row.vendorId,
            iraId: row.ira.id,
            status: snapshot.unresolved.length ? EngagementDueDiligencePlanStatus.NEEDS_REVIEW : EngagementDueDiligencePlanStatus.DRAFT,
            confirmedTier: row.ira.confirmedTier,
            catalogVersion: snapshot.catalogVersion,
            recommendedSnapshot: snapshot as object,
            includedPackKeys: snapshot.questionnairePlan.includedPackKeys,
            packReasons: snapshot.packs,
            evidenceRequirements: snapshot.evidenceRequirements,
            reviewerDomains: snapshot.reviewerDomains,
            unresolved: snapshot.unresolved,
            slaDays,
            vendorDueAt: addBusinessDays(new Date(), slaDays),
        },
    });
    if (row.status === EngagementStatus.INHERENT_TIER_CONFIRMED) {
        await prisma.engagement.update({ where: { id: row.id }, data: { status: EngagementStatus.DUE_DILIGENCE_PLANNING } });
    }
    await audit(organizationId, actor.id, 'due_diligence.plan.generated', 'EngagementDueDiligencePlan', plan.id, { engagementId: row.id });
    const mail = genericOperationalEmail({
        subject: `Due-diligence plan ready · ${row.publicId}`,
        body: `Review the recommended scope for ${row.vendor.name} · ${row.serviceName}.`,
        cta: { label: 'Review due-diligence scope', url: customerAppUrl(`/third-parties/engagements/${row.id}/due-diligence`) },
    });
    await notify(organizationId, row.assignedAnalystUserId, 'approval.requested', mail.subject, mail.text, 'Engagement', row.id, { emailBody: mail.text, emailHtml: mail.html });
    return plan;
}

export async function getDueDiligencePlan(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    const engagement = await loadEngagement(organizationId, key);
    if (!engagement.ira?.confirmedTier) throw new ApiError(409, 'Confirm the inherent tier before opening due diligence.');
    if (!engagement.dueDiligencePlan) await openDueDiligencePlan(organizationId, actor, engagement);
    return presentPlan(organizationId, engagement.id);
}

export async function modifyDueDiligencePlan(organizationId: string, actor: Actor, key: string, input: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can change due-diligence scope.');
    const engagement = await loadEngagement(organizationId, key);
    if (!engagement.dueDiligencePlan) await openDueDiligencePlan(organizationId, actor, engagement);
    const fresh = await loadEngagement(organizationId, engagement.id);
    if (fresh.dueDiligencePlan?.status === EngagementDueDiligencePlanStatus.CONFIRMED && fresh.status !== EngagementStatus.DUE_DILIGENCE_PLANNING && fresh.status !== EngagementStatus.READY_TO_SEND) {
        throw new ApiError(409, 'This plan is already in vendor assessment.');
    }
    const reason = String(input.reason || '').trim();
    if ((input.excludeKeys || []).length && reason.length < 8) throw new ApiError(400, 'Excluding a recommended pack requires a written rationale.');
    if ((input.includeKeys || []).length && reason.length < 8) throw new ApiError(400, 'Adding a pack requires a written rationale.');
    const snapshot = await buildSnapshot(organizationId, fresh, input);
    await prisma.engagementDueDiligencePlan.update({
        where: { id: fresh.dueDiligencePlan!.id },
        data: {
            status: snapshot.unresolved.length ? EngagementDueDiligencePlanStatus.NEEDS_REVIEW : EngagementDueDiligencePlanStatus.DRAFT,
            recommendedSnapshot: fresh.dueDiligencePlan?.recommendedSnapshot as object,
            confirmedSnapshot: snapshot as object,
            includedPackKeys: snapshot.questionnairePlan.includedPackKeys,
            excludedPackKeys: input.excludeKeys || [],
            packReasons: snapshot.packs,
            evidenceRequirements: snapshot.evidenceRequirements,
            reviewerDomains: snapshot.reviewerDomains,
            unresolved: snapshot.unresolved,
            changeReason: reason,
        },
    });
    await prisma.engagement.update({ where: { id: fresh.id }, data: { status: EngagementStatus.DUE_DILIGENCE_PLANNING } });
    await audit(organizationId, actor.id, 'due_diligence.plan.modified', 'EngagementDueDiligencePlan', fresh.dueDiligencePlan!.id, { reason, includeKeys: input.includeKeys || [], excludeKeys: input.excludeKeys || [] });
    return presentPlan(organizationId, fresh.id);
}

export async function confirmDueDiligencePlan(organizationId: string, actor: Actor, key: string, input: { reason?: string } = {}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can confirm the due-diligence plan.');
    const engagement = await loadEngagement(organizationId, key);
    if (!engagement.dueDiligencePlan) await openDueDiligencePlan(organizationId, actor, engagement);
    const fresh = await loadEngagement(organizationId, engagement.id);
    const snapshot = fresh.dueDiligencePlan?.confirmedSnapshot
        ? fresh.dueDiligencePlan.confirmedSnapshot as ReturnType<typeof composePlan>
        : await buildSnapshot(organizationId, fresh);
    if (snapshot.unresolved?.length) throw new ApiError(409, snapshot.sendBlockMessage || 'Scope requires review.');
    await materializeAssessments(organizationId, fresh, snapshot);
    await prisma.engagementDueDiligencePlan.update({
        where: { id: fresh.dueDiligencePlan!.id },
        data: {
            status: EngagementDueDiligencePlanStatus.CONFIRMED,
            confirmedSnapshot: snapshot as object,
            confirmedAt: new Date(),
            confirmedBy: actor.id,
            changeReason: input.reason?.trim() || fresh.dueDiligencePlan?.changeReason,
        },
    });
    await prisma.engagement.update({ where: { id: fresh.id }, data: { status: EngagementStatus.READY_TO_SEND } });
    await audit(organizationId, actor.id, 'due_diligence.plan.confirmed', 'EngagementDueDiligencePlan', fresh.dueDiligencePlan!.id, { engagementId: fresh.id });
    return presentPlan(organizationId, fresh.id);
}

async function materializeAssessments(organizationId: string, engagement: Awaited<ReturnType<typeof loadEngagement>>, snapshot: ReturnType<typeof composePlan>) {
    let items = snapshot.assessments.filter((row) => row.templateId && (row.requirement === 'Required' || row.requirement === 'Recommended'));
    if (!items.length) {
        const baseline = await prisma.questionnaireTemplate.findFirst({
            where: { organizationId: null, isActive: true, source: 'SUPREME', name: 'Baseline Questionnaire' },
            orderBy: { createdAt: 'asc' },
        });
        if (baseline) {
            items = [{ templateId: baseline.id, name: baseline.name, framework: baseline.framework, requirement: 'Required' }];
        }
    }
    for (const item of items) {
        try {
            const created = await vendorAssessmentService.createAssessment({
                vendorId: engagement.vendorId,
                organizationId,
                assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
                frameworkUsed: String(item.framework || item.name),
                templateId: String(item.templateId),
                engagementId: engagement.id,
                dueDiligencePlanId: engagement.dueDiligencePlan!.id,
            });
            try {
                await writeAssessmentGraph(organizationId, engagement.assignedAnalystUserId || engagement.id, engagement, created.id);
            } catch {
                // Graph uniqueness is idempotent; do not block the plan.
            }
            await audit(organizationId, engagement.assignedAnalystUserId || null, 'assessment.created', 'VendorAssessment', created.id, { engagementId: engagement.id });
        } catch (error) {
            if (!(error instanceof ApiError) || error.statusCode !== 409) throw error;
        }
    }
}

export async function setAssessmentContact(organizationId: string, actor: Actor, key: string, input: { name?: string; email?: string; title?: string; phone?: string }) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can assign the vendor assessment contact.');
    const engagement = await loadEngagement(organizationId, key);
    const email = String(input.email || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    if (!email || !name) throw new ApiError(400, 'Name and email are required for the assessment contact.');
    const existing = await prisma.vendorContact.findFirst({ where: { vendorId: engagement.vendorId, email: { equals: email, mode: 'insensitive' } } });
    const contact = existing
        ? await prisma.vendorContact.update({ where: { id: existing.id }, data: { name, title: input.title || existing.title, phone: input.phone || existing.phone, isAssessmentContact: true, role: ContactRole.SECURITY_CONTACT } })
        : await prisma.vendorContact.create({
            data: {
                vendorId: engagement.vendorId,
                name,
                email,
                title: input.title || 'Security contact',
                phone: input.phone || null,
                role: ContactRole.SECURITY_CONTACT,
                isPrimary: false,
                isAssessmentContact: true,
            },
        });
    if (engagement.dueDiligencePlan) {
        await prisma.engagementDueDiligencePlan.update({ where: { id: engagement.dueDiligencePlan.id }, data: { assessmentContactId: contact.id } });
    }
    return presentPlan(organizationId, engagement.id);
}

async function issueInvitation(organizationId: string, vendorId: string, engagementId: string, contactId: string, actorId: string) {
    await prisma.vendorAssessmentInvitation.updateMany({
        where: { organizationId, vendorId, engagementId, status: VendorInvitationStatus.PENDING },
        data: { status: VendorInvitationStatus.REVOKED, revokedAt: new Date() },
    });
    const rawToken = randomToken(32);
    const invitation = await prisma.vendorAssessmentInvitation.create({
        data: {
            organizationId,
            vendorId,
            engagementId,
            vendorContactId: contactId,
            tokenHash: hashToken(rawToken),
            status: VendorInvitationStatus.PENDING,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            createdBy: actorId,
        },
    });
    return { invitation, rawToken, activationUrl: `${publicFrontendUrl()}/vendor-assessment/activate?token=${rawToken}` };
}

async function pinPlan(planId: string, snapshot: Record<string, unknown>) {
    const catalog = loadWorkbookCatalog();
    const included = asStringArray((snapshot.questionnairePlan as { includedPackKeys?: string[] } | undefined)?.includedPackKeys);
    const pin = {
        catalogVersion: catalog.catalogVersion,
        includedPacks: included,
        controlIds: workbookControlIdsForPacks(included, catalog),
        evidenceRequests: workbookEvidenceForDomains(workbookDomainsForPacks(included, catalog), catalog).map((row) => row.id),
        pinnedAt: new Date().toISOString(),
    };
    await prisma.engagementDueDiligencePlan.update({ where: { id: planId }, data: { catalogPin: pin as object } });
    await prisma.vendorAssessment.updateMany({ where: { dueDiligencePlanId: planId }, data: { catalogPin: pin as object } });
    return pin;
}

async function assertInvitationIssuable(organizationId: string, engagementId: string, state: string, action: 'send' | 'copy') {
    if (state === 'READY_TO_SEND' || state === 'AWAITING_VENDOR' || state === 'VENDOR_IN_PROGRESS') return;
    const open = await prisma.vendorAssessment.count({
        where: {
            organizationId,
            engagementId,
            status: { notIn: [AssessmentStatus.COMPLETED, AssessmentStatus.CANCELLED] },
        },
    });
    if (open > 0) return;
    throw new ApiError(409, action === 'copy'
        ? 'Confirm the due-diligence plan before copying a link.'
        : 'Confirm the due-diligence plan before sending.');
}

export async function sendEngagementQuestionnaire(organizationId: string, actor: Actor, key: string, input: { name?: string; email?: string; title?: string; phone?: string; dueDate?: string; allowActivationLink?: boolean } = {}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can send the questionnaire.');
    const presented = await presentPlan(organizationId, key);
    await assertInvitationIssuable(organizationId, presented.engagement?.id || key, String(presented.state), 'send');
    if (presented.sendBlocked) throw new ApiError(409, presented.sendBlockMessage);
    if (input.email && input.name) await setAssessmentContact(organizationId, actor, key, input);
    const engagement = await loadEngagement(organizationId, key);
    const contactId = engagement.dueDiligencePlan?.assessmentContactId;
    if (!contactId) throw new ApiError(409, 'Assign a vendor assessment contact before sending.');
    const contact = await prisma.vendorContact.findFirst({ where: { id: contactId, vendorId: engagement.vendorId } });
    if (!contact) throw new ApiError(409, 'Assign a vendor assessment contact before sending.');
    const assessments = await prisma.vendorAssessment.findMany({ where: { organizationId, engagementId: engagement.id, status: { notIn: [AssessmentStatus.COMPLETED, AssessmentStatus.CANCELLED] } } });
    if (!assessments.length) throw new ApiError(409, 'No due-diligence assessments are ready to send.');
    const dueAt = input.dueDate ? new Date(input.dueDate) : engagement.dueDiligencePlan?.vendorDueAt || addBusinessDays(new Date(), presented.slaDays);
    await prisma.vendorAssessment.updateMany({
        where: { id: { in: assessments.map((row) => row.id) } },
        data: { assignedContactId: contact.id, dueDate: dueAt, respondentPlane: 'VENDOR' },
    });
    const snapshot = (engagement.dueDiligencePlan?.confirmedSnapshot || engagement.dueDiligencePlan?.recommendedSnapshot || {}) as Record<string, unknown>;
    await pinPlan(engagement.dueDiligencePlan!.id, snapshot);
    const issued = await issueInvitation(organizationId, engagement.vendorId, engagement.id, contact.id, actor.id);
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const mail = vendorInvitationEmail({
        contactFirstName: contact.name.split(/\s+/)[0] || contact.name,
        organizationName: org?.name || 'A customer',
        vendorName: `${engagement.vendor.name} · ${engagement.serviceName}`,
        dueAt,
        activationUrl: issued.activationUrl,
        reminder: Boolean(engagement.dueDiligencePlan?.sentAt),
    });
    const email = await deliverEmail({
        to: contact.email,
        subject: mail.subject,
        body: mail.text,
        html: mail.html,
        fromName: mail.fromName,
        eventType: 'vendor.assessment_invitation',
        organizationId,
        resourceType: 'VendorAssessmentInvitation',
        resourceId: issued.invitation.id,
    });
    await prisma.vendorAssessmentInvitation.update({
        where: { id: issued.invitation.id },
        data: {
            emailProvider: email.provider || null,
            providerMessageId: email.messageId || null,
            emailDeliveryStatus: email.status,
            emailSentAt: email.status === 'ACCEPTED' ? new Date() : null,
        },
    });
    await prisma.engagementDueDiligencePlan.update({
        where: { id: engagement.dueDiligencePlan!.id },
        data: { invitationId: issued.invitation.id, sentAt: new Date(), sentBy: actor.id, vendorDueAt: dueAt },
    });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.AWAITING_VENDOR } });
    await audit(organizationId, actor.id, 'assessment.invitation.sent', 'VendorAssessmentInvitation', issued.invitation.id, { engagementId: engagement.id, emailStatus: email.status });
    const next = await presentPlan(organizationId, engagement.id);
    return {
        ...next,
        activationUrl: process.env.NODE_ENV === 'test' || process.env.APP_ENVIRONMENT === 'staging' || input.allowActivationLink ? issued.activationUrl : undefined,
        emailStatus: email.status === 'DELIVERED' ? 'Queued' : email.status === 'ACCEPTED' ? 'Queued' : email.status === 'FAILED' ? 'Delivery problem' : 'Queued',
    };
}

export async function copyEngagementActivationLink(organizationId: string, actor: Actor, key: string, input: { name?: string; email?: string; title?: string; phone?: string } = {}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can copy the activation link.');
    const presented = await presentPlan(organizationId, key);
    await assertInvitationIssuable(organizationId, presented.engagement?.id || key, String(presented.state), 'copy');
    if (input.email && input.name) await setAssessmentContact(organizationId, actor, key, input);
    const engagement = await loadEngagement(organizationId, key);
    const contactId = engagement.dueDiligencePlan?.assessmentContactId;
    if (!contactId) throw new ApiError(409, 'Assign a vendor assessment contact before copying the secure link.');
    const assessments = await prisma.vendorAssessment.findMany({ where: { organizationId, engagementId: engagement.id, status: { notIn: [AssessmentStatus.COMPLETED, AssessmentStatus.CANCELLED] } } });
    if (!assessments.length) throw new ApiError(409, 'No due-diligence assessments are ready to send.');
    const dueAt = engagement.dueDiligencePlan?.vendorDueAt || addBusinessDays(new Date(), presented.slaDays);
    await prisma.vendorAssessment.updateMany({
        where: { id: { in: assessments.map((row) => row.id) } },
        data: { assignedContactId: contactId, dueDate: dueAt, respondentPlane: 'VENDOR' },
    });
    const issued = await issueInvitation(organizationId, engagement.vendorId, engagement.id, contactId, actor.id);
    await prisma.vendorAssessmentInvitation.update({
        where: { id: issued.invitation.id },
        data: { emailDeliveryStatus: 'LINK_COPIED' },
    });
    await prisma.engagementDueDiligencePlan.update({
        where: { id: engagement.dueDiligencePlan!.id },
        data: { invitationId: issued.invitation.id, vendorDueAt: dueAt },
    });
    await audit(organizationId, actor.id, 'assessment.link.copied', 'VendorAssessmentInvitation', issued.invitation.id, { engagementId: engagement.id, sent: false });
    const next = await presentPlan(organizationId, engagement.id);
    return { ...next, activationUrl: issued.activationUrl, deliveryMethod: 'LINK', copiedNotSent: true };
}

export async function markEngagementInvitationShared(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can mark the invitation as shared.');
    const engagement = await loadEngagement(organizationId, key);
    const invitation = engagement.dueDiligencePlan?.invitationId
        ? await prisma.vendorAssessmentInvitation.findFirst({ where: { id: engagement.dueDiligencePlan.invitationId, organizationId, engagementId: engagement.id } })
        : null;
    if (!invitation) throw new ApiError(409, 'Copy an invitation before marking it as shared.');
    if (invitation.emailDeliveryStatus !== 'LINK_COPIED' && invitation.emailDeliveryStatus !== 'MARKED_SHARED') {
        throw new ApiError(409, 'Mark as shared is only for the copy-link path. It is not email delivery.');
    }
    const snapshot = (engagement.dueDiligencePlan?.confirmedSnapshot || engagement.dueDiligencePlan?.recommendedSnapshot || {}) as Record<string, unknown>;
    await pinPlan(engagement.dueDiligencePlan!.id, snapshot);
    await prisma.vendorAssessmentInvitation.update({ where: { id: invitation.id }, data: { emailDeliveryStatus: 'MARKED_SHARED' } });
    await prisma.engagementDueDiligencePlan.update({ where: { id: engagement.dueDiligencePlan!.id }, data: { sentAt: new Date(), sentBy: actor.id } });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.AWAITING_VENDOR } });
    await audit(organizationId, actor.id, 'assessment.marked_shared', 'VendorAssessmentInvitation', invitation.id, { engagementId: engagement.id });
    return presentPlan(organizationId, engagement.id);
}

export async function requestVendorClarification(organizationId: string, actor: Actor, key: string, input: { assessmentId?: string; questionKeys?: string[]; note?: string }) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can request vendor clarification.');
    const engagement = await loadEngagement(organizationId, key);
    const keys = (input.questionKeys || []).filter(Boolean);
    if (!keys.length) throw new ApiError(400, 'Select the vendor questions that need clarification.');
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { organizationId, engagementId: engagement.id, id: input.assessmentId || undefined },
        orderBy: { createdAt: 'asc' },
    });
    if (!assessment) throw new ApiError(404, 'Assessment not found for this engagement.');
    await prisma.vendorAssessment.update({
        where: { id: assessment.id },
        data: { status: AssessmentStatus.IN_PROGRESS, submittedAt: null, clarificationQuestionIds: keys },
    });
    await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.VENDOR_IN_PROGRESS } });
    await prisma.engagementAssessmentReview.updateMany({
        where: { engagementId: engagement.id, assessmentId: assessment.id },
        data: { status: EngagementReviewStatus.NEEDS_CLARIFICATION },
    });
    await audit(organizationId, actor.id, 'assessment.clarification.requested', 'VendorAssessment', assessment.id, { engagementId: engagement.id, questionKeys: keys, note: input.note || null });
    const contact = engagement.dueDiligencePlan?.assessmentContactId
        ? await prisma.vendorContact.findFirst({ where: { id: engagement.dueDiligencePlan.assessmentContactId } })
        : null;
    if (contact?.email) {
        const mail = genericOperationalEmail({
            subject: `Clarification requested · ${engagement.serviceName}`,
            body: `Please clarify selected answers for ${engagement.vendor.name} · ${engagement.serviceName}.`,
            cta: { label: 'Open vendor assessment', url: customerAppUrl('/vendor-assessment') },
        });
        await deliverEmail({
            to: contact.email,
            subject: mail.subject,
            body: mail.text,
            html: mail.html,
            fromName: mail.fromName,
            eventType: 'vendor.assessment_invitation',
            organizationId,
            resourceType: 'VendorAssessment',
            resourceId: assessment.id,
        });
    }
    return presentAssessmentReview(organizationId, actor, engagement.id);
}

export async function getAssessmentReview(organizationId: string, actor: Actor, key: string) {
    assertPractitioner(actor);
    return presentAssessmentReview(organizationId, actor, key);
}

export async function completeSpecialistReview(organizationId: string, actor: Actor, key: string, input: {
    assessmentId?: string;
    domain?: string;
    conclusion?: string;
    observation?: string;
}) {
    assertPractitioner(actor);
    if (!canManage(actor)) throw new ApiError(403, 'Only a TPRM reviewer can complete specialist review.');
    const engagement = await loadEngagement(organizationId, key);
    const submitted = await prisma.vendorAssessment.count({
        where: {
            organizationId,
            engagementId: engagement.id,
            status: { in: [AssessmentStatus.PENDING_REVIEW, AssessmentStatus.COMPLETED] },
        },
    });
    if (!submitted) {
        throw new ApiError(409, 'This assessment cannot be marked review-complete because the vendor has not submitted it.');
    }
    const conclusion = String(input.conclusion || 'Review complete').trim();
    if (!['Response sufficient', 'Needs clarification', 'Evidence sufficient', 'Evidence missing', 'Review complete'].includes(conclusion)) {
        throw new ApiError(400, 'Choose an approved Wave 3 review conclusion.');
    }
    if (conclusion === 'Needs clarification') throw new ApiError(409, 'Request vendor clarification instead of completing review.');
    let review = await prisma.engagementAssessmentReview.findFirst({
        where: {
            organizationId,
            engagementId: engagement.id,
            ...(input.assessmentId ? { assessmentId: input.assessmentId } : {}),
            ...(input.domain ? { domain: input.domain } : {}),
        },
        orderBy: { createdAt: 'asc' },
    });
    if (!review) {
        const assessment = await prisma.vendorAssessment.findFirst({
            where: { organizationId, engagementId: engagement.id },
            orderBy: { createdAt: 'asc' },
        });
        review = await prisma.engagementAssessmentReview.create({
            data: {
                organizationId,
                engagementId: engagement.id,
                planId: engagement.dueDiligencePlan?.id,
                assessmentId: input.assessmentId || assessment?.id,
                domain: input.domain || asStringArray(engagement.dueDiligencePlan?.reviewerDomains)[0] || 'Cybersecurity',
                assignedTo: actor.id,
                status: EngagementReviewStatus.IN_REVIEW,
            },
        });
        await audit(organizationId, actor.id, 'assessment.review.assigned', 'EngagementAssessmentReview', review.id, { engagementId: engagement.id });
    }
    await prisma.engagementAssessmentReview.update({
        where: { id: review.id },
        data: {
            status: EngagementReviewStatus.COMPLETE,
            conclusions: { conclusion, wave4Finding: false, residualRiskCalculated: false },
            observation: input.observation?.trim() || null,
            completedAt: new Date(),
            completedBy: actor.id,
            assignedTo: review.assignedTo || actor.id,
        },
    });
    const open = await prisma.engagementAssessmentReview.count({
        where: { engagementId: engagement.id, status: { not: EngagementReviewStatus.COMPLETE } },
    });
    if (open === 0) {
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.SPECIALIST_REVIEW } });
    }
    await audit(organizationId, actor.id, 'assessment.review.completed', 'EngagementAssessmentReview', review.id, { engagementId: engagement.id, conclusion, wave4Started: true });
    if (open === 0) {
        const { seedFindingCandidates } = await import('./engagementRiskService');
        await seedFindingCandidates(organizationId, actor, engagement.id);
    }
    return presentAssessmentReview(organizationId, actor, engagement.id);
}

export async function listEngagementAssessments(organizationId: string, actor: Actor) {
    assertPractitioner(actor);
    const rows = await prisma.vendorAssessment.findMany({
        where: { organizationId, engagementId: { not: null } },
        include: {
            vendor: { select: { id: true, name: true, publicId: true } },
            engagement: { select: { id: true, publicId: true, serviceName: true, status: true } },
            dueDiligencePlan: { select: { confirmedTier: true, vendorDueAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return {
        items: rows.map((row) => ({
            id: row.id,
            thirdParty: row.vendor.name,
            vendorId: row.vendorId,
            engagementId: row.engagementId,
            engagementPublicId: row.engagement?.publicId,
            serviceName: row.engagement?.serviceName,
            assessmentType: row.assessmentType,
            framework: row.frameworkUsed,
            tier: row.dueDiligencePlan?.confirmedTier || null,
            status: row.status,
            owner: row.assignedTo || row.reviewer || null,
            dueDate: row.dueDate || row.dueDiligencePlan?.vendorDueAt || null,
            overdue: Boolean(row.dueDate && row.dueDate < new Date() && !row.submittedAt),
        })),
    };
}

export async function presentPlan(organizationId: string, key: string) {
    const engagement = await loadEngagement(organizationId, key);
    const plan = engagement.dueDiligencePlan;
    if (!plan) throw new ApiError(404, 'Due-diligence plan not found.');
    const recommended = plan.recommendedSnapshot as ReturnType<typeof composePlan>;
    const confirmed = (plan.confirmedSnapshot || plan.recommendedSnapshot) as ReturnType<typeof composePlan>;
    const contact = plan.assessmentContactId
        ? await prisma.vendorContact.findFirst({ where: { id: plan.assessmentContactId } })
        : null;
    const invitation = plan.invitationId
        ? await prisma.vendorAssessmentInvitation.findFirst({ where: { id: plan.invitationId } })
        : null;
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, engagementId: engagement.id },
        orderBy: { createdAt: 'asc' },
    });
    const insurance = await editionIsInsurance(organizationId);
    const observation = await prisma.providerObservation.findFirst({
        where: { organizationId, vendorId: engagement.vendorId },
        orderBy: { observedAt: 'desc' },
    });
    return {
        id: plan.id,
        what: `${engagement.publicId} · ${engagement.serviceName}`,
        why: `Confirmed inherent tier ${plan.confirmedTier} requires engagement-scoped due diligence.`,
        source: 'Confirmed Wave 2 IRA / Version 3 packs. The inherent tier was not recalculated.',
        state: engagement.status,
        stateLabel: engagementStatusLabel(engagement.status),
        owner: engagement.status === EngagementStatus.AWAITING_VENDOR || engagement.status === EngagementStatus.VENDOR_IN_PROGRESS ? 'Vendor' : 'Assigned TPRM analyst',
        impact: 'This plan scopes the vendor questionnaire and evidence for this engagement only. Wave 4 findings are not started.',
        evidence: 'Confirmed IRA answers, floors, pack reasons, and catalog pin after send.',
        relationships: {
            thirdParty: { id: engagement.vendor.id, name: engagement.vendor.name },
            engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName },
            intake: engagement.originatingIntake,
            iraId: engagement.ira?.id,
            planId: plan.id,
        },
        nextAction: nextDueDiligenceAction(engagement.status, Boolean(invitation), invitation?.emailDeliveryStatus),
        thirdParty: { id: engagement.vendor.id, name: engagement.vendor.name },
        engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName, businessPurpose: engagement.businessPurpose },
        confirmedTier: plan.confirmedTier,
        recommendedTier: engagement.ira?.recommendedTier,
        recommendedPlan: recommended,
        confirmedPlan: confirmed,
        packs: packRows(confirmed.questionnairePlan),
        evidenceRequirements: confirmed.evidenceRequirements,
        reviewerDomains: confirmed.reviewerDomains,
        unresolved: confirmed.unresolved || [],
        sendBlocked: Boolean(confirmed.sendBlocked || (confirmed.unresolved || []).length),
        sendBlockMessage: confirmed.sendBlockMessage || '',
        changeReason: plan.changeReason,
        confirmedAt: plan.confirmedAt,
        confirmedBy: plan.confirmedBy,
        contact: contact ? { id: contact.id, name: contact.name, email: contact.email, title: contact.title } : null,
        dueDate: plan.vendorDueAt,
        slaDays: plan.slaDays,
        invitation: invitation ? {
            id: invitation.id,
            status: invitation.status,
            deliveryStatus: invitation.emailDeliveryStatus,
            copiedNotSent: invitation.emailDeliveryStatus === 'LINK_COPIED',
            emailed: invitation.emailDeliveryStatus === 'ACCEPTED' || invitation.emailDeliveryStatus === 'SENT' || invitation.emailDeliveryStatus === 'DELIVERED',
        } : null,
        assessments: assessments.map((row) => ({
            id: row.id,
            name: row.frameworkUsed || 'Assessment',
            status: row.status,
            dueDate: row.dueDate,
            submittedAt: row.submittedAt,
            engagementPublicId: engagement.publicId,
            serviceName: engagement.serviceName,
        })),
        catalogPin: plan.catalogPin,
        insuranceContext: insurance,
        externalRating: observation
            ? { provider: observation.provider, score: observation.score, grade: null, observedAt: observation.observedAt, summary: observation.summary }
            : { status: 'Not configured / no current observation' },
        wave4Started: false,
        findingsCreated: false,
        residualRiskCalculated: false,
    };
}

async function presentAssessmentReview(organizationId: string, actor: Actor, key: string) {
    const engagement = await loadEngagement(organizationId, key);
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, engagementId: engagement.id },
        include: { responses: { orderBy: { questionId: 'asc' } } },
        orderBy: { createdAt: 'asc' },
    });
    let reviews = await prisma.engagementAssessmentReview.findMany({ where: { organizationId, engagementId: engagement.id }, orderBy: { createdAt: 'asc' } });
    if (!reviews.length && assessments.some((row) => row.submittedAt)) {
        const domains = asStringArray(engagement.dueDiligencePlan?.reviewerDomains);
        reviews = await Promise.all((domains.length ? domains : ['Cybersecurity']).map((domain) => prisma.engagementAssessmentReview.create({
            data: {
                organizationId,
                engagementId: engagement.id,
                planId: engagement.dueDiligencePlan?.id,
                assessmentId: assessments[0]?.id,
                domain,
                assignedTo: engagement.assignedAnalystUserId,
                status: EngagementReviewStatus.IN_REVIEW,
            },
        })));
        await prisma.engagement.update({ where: { id: engagement.id }, data: { status: EngagementStatus.SPECIALIST_REVIEW } });
        await audit(organizationId, actor.id, 'assessment.review.assigned', 'Engagement', engagement.id, { domains });
    }
    const links = await prisma.evidenceLink.findMany({
        where: { organizationId, engagementId: engagement.id },
        include: { storedObject: { select: { filename: true, scanStatus: true, uploadedAt: true } } },
    });
    const findings = await prisma.vendorIssue.count({
        where: { organizationId, engagementId: engagement.id, reviewState: 'CONFIRMED' },
    });
    return {
        what: `${engagement.publicId} · ${engagement.serviceName}`,
        why: `Confirmed inherent tier ${engagement.dueDiligencePlan?.confirmedTier || engagement.ira?.confirmedTier} required this assessment.`,
        source: 'Engagement due-diligence plan and pinned catalog.',
        state: engagement.status,
        stateLabel: engagementStatusLabel(engagement.status),
        owner: 'Assigned specialist / TPRM analyst',
        nextAction: reviews.every((row) => row.status === EngagementReviewStatus.COMPLETE)
            ? 'Specialist review complete. Review finding candidates. No candidate is an authoritative finding until confirmed.'
            : 'Review vendor answers and evidence, request clarification, or mark review complete.',
        history: reviews,
        thirdParty: { id: engagement.vendor.id, name: engagement.vendor.name },
        engagement: { id: engagement.id, publicId: engagement.publicId, serviceName: engagement.serviceName },
        confirmedTier: engagement.dueDiligencePlan?.confirmedTier || engagement.ira?.confirmedTier,
        reviews,
        items: assessments.flatMap((assessment) => assessment.responses.map((response) => {
            const evidence = links.find((link) => link.assessmentId === assessment.id && link.questionId === response.questionId);
            return {
                assessmentId: assessment.id,
                assessmentName: assessment.frameworkUsed || 'Assessment',
                questionKey: response.questionId,
                question: response.questionText,
                vendorAnswer: response.response,
                evidence: evidence ? {
                    filename: evidence.storedObject.filename,
                    scanStatus: evidence.storedObject.scanStatus,
                    scanLabel: evidence.storedObject.scanStatus === ScanStatus.CLEAN ? 'Ready' : evidence.storedObject.scanStatus === ScanStatus.PENDING ? 'Scanning' : evidence.storedObject.scanStatus === ScanStatus.INFECTED ? 'Blocked' : 'Security status unavailable',
                } : null,
                clarification: asStringArray(assessment.clarificationQuestionIds).includes(response.questionId),
            };
        })),
        clarificationHistory: await prisma.auditEvent.findMany({
            where: { organizationId, resourceType: { in: ['VendorAssessment', 'EngagementAssessmentReview'] }, action: { startsWith: 'assessment.clarification' } },
            orderBy: { timestamp: 'asc' },
            select: { action: true, timestamp: true, actorUserId: true, metadata: true },
            take: 50,
        }),
        wave4Started: reviews.some((row) => row.status === EngagementReviewStatus.COMPLETE),
        authoritativeFindings: findings,
        residualRiskCalculated: false,
    };
}

export function engagementStatusLabel(status: EngagementStatus) {
    switch (status) {
        case EngagementStatus.DUE_DILIGENCE_PLANNING: return 'Due-diligence planning';
        case EngagementStatus.READY_TO_SEND: return 'Ready to send questionnaire';
        case EngagementStatus.AWAITING_VENDOR: return 'Awaiting vendor';
        case EngagementStatus.VENDOR_IN_PROGRESS: return 'Vendor in progress';
        case EngagementStatus.VENDOR_SUBMITTED: return 'Vendor submitted';
        case EngagementStatus.SPECIALIST_REVIEW: return 'Specialist review';
        case EngagementStatus.FINDING_REVIEW: return 'Finding review';
        case EngagementStatus.RESIDUAL_READY: return 'Residual risk ready';
        default: return status.replace(/_/g, ' ').toLowerCase();
    }
}

export function nextDueDiligenceAction(status: EngagementStatus, hasInvitation = false, delivery?: string | null) {
    switch (status) {
        case EngagementStatus.INHERENT_TIER_CONFIRMED:
        case EngagementStatus.DUE_DILIGENCE_PLANNING:
            return 'Review due-diligence scope';
        case EngagementStatus.READY_TO_SEND:
            return hasInvitation && delivery === 'LINK_COPIED' ? 'Mark as sent, or send by email' : 'Confirm vendor contact and send questionnaire';
        case EngagementStatus.AWAITING_VENDOR:
            return 'Waiting for the vendor to activate and respond';
        case EngagementStatus.VENDOR_IN_PROGRESS:
            return 'Vendor is completing the questionnaire';
        case EngagementStatus.VENDOR_SUBMITTED:
            return 'Open specialist review';
        case EngagementStatus.SPECIALIST_REVIEW:
            return 'Complete specialist review, then review finding candidates.';
        case EngagementStatus.FINDING_REVIEW:
            return 'Review finding candidates and record control effectiveness.';
        case EngagementStatus.RESIDUAL_READY:
            return 'Risk treatment decision pending. Wave 5 is not started.';
        default:
            return 'Review this engagement';
    }
}

export function dueDiligenceReady(status: EngagementStatus) {
    return (REVIEWABLE as Set<EngagementStatus>).has(status);
}

export async function writeAssessmentGraph(organizationId: string, actorId: string, engagement: { id: string; publicId: string; serviceName: string }, assessmentId: string) {
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
        status: EngagementStatus.READY_TO_SEND,
    });
    const assessmentNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ASSESSMENT,
        sourceModel: 'VendorAssessment',
        sourceId: assessmentId,
        displayLabel: `${engagement.publicId} vendor assessment`,
        status: AssessmentStatus.NOT_STARTED,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: engagementNode.node.id,
        toNodeId: assessmentNode.node.id,
        relationshipType: GovernanceRelationshipType.ASSESSED_BY,
    });
}

export function vendorSafeWorkspace(payload: Record<string, unknown>) {
    return sanitizeVendorPayload(payload);
}

export { ATTESTATION_STATEMENT, ATTESTATION_VERSION };
