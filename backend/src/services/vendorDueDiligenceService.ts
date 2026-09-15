import {
    AssessmentStatus,
    ContactRole,
    IssueReviewState,
    IssueSeverity,
    IssueSource,
    Prisma,
    ScanStatus,
    VendorInvitationStatus,
    VendorIssueType,
    VendorOnboardingStage,
    VendorTier,
} from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { canonicalizeRole } from '../security/rbac';
import { VENDOR_PLANE } from '../security/sessionPlane';
import { recordAudit } from './auditEventService';
import { evidenceLinkageService } from './evidenceLinkageService';
import { deliverEmail, notifyUser } from './notificationDeliveryService';
import { hashToken, randomToken } from './passwordService';
import { portalFrontendUrl, publicFrontendUrl } from './publicFrontendUrl';
import { scoreAssessmentResponse } from './vendorAssessmentService';
import { addBusinessDays, recommendTierFromIntake, workbookControlGap } from './vendorOnboardingScoring';
import { getOnboarding } from './vendorOnboardingService';
import { explainableRiskService } from './explainableRiskService';
import {
    assessmentOverdueEmail,
    assessmentSubmittedEmail,
    clarificationRequestedEmail,
    customerAppUrl,
    vendorInvitationEmail,
    vendorInvitationSentInternalEmail,
} from './transactionalEmail';

export const ATTESTATION_VERSION = 'vendor-ddq-1.0';
export const ATTESTATION_STATEMENT =
    'I confirm that the responses provided are accurate to the best of my knowledge and that I am authorized to submit this assessment on behalf of the vendor.';
export const VENDOR_SLA_DAYS: Record<VendorTier, number> = {
    CRITICAL: 10,
    HIGH: 15,
    MEDIUM: 20,
    LOW: 25,
};

const INVITE_LABEL: Record<VendorInvitationStatus, string> = {
    PENDING: 'Pending',
    ACTIVATED: 'Activated',
    EXPIRED: 'Expired',
    REVOKED: 'Revoked',
    COMPLETED: 'Completed',
};

type Actor = { id: string; role: string; name?: string };
type VendorActor = { sessionId: string; contactId: string; vendorId: string; organizationId: string; email: string; name: string };

function canSend(role: string) {
    return ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR'].includes(canonicalizeRole(role));
}

function deliveryLabel(status?: string | null) {
    if (!status) return 'Not emailed';
    if (status === 'LINK_COPIED' || status === 'MARKED_SHARED' || status === 'NOT_SENT') return 'Not emailed';
    if (status === 'ACCEPTED' || status === 'SENT') return status === 'SENT' ? 'Sent' : 'Queued';
    if (status === 'DELIVERED') return 'Delivered';
    if (['BOUNCED', 'FAILED', 'COMPLAINED', 'REJECTED'].includes(status)) return 'Delivery problem';
    if (status === 'NOT_CONFIGURED') return 'Unknown';
    return 'Unknown';
}

function invitationPreparedLabel(status?: string | null, emailStatus?: string | null) {
    if (status === 'ACTIVATED') return 'Activated';
    if (status === 'COMPLETED') return 'Completed';
    if (emailStatus === 'MARKED_SHARED') return 'Link copied';
    if (emailStatus === 'LINK_COPIED') return 'Link copied';
    if (emailStatus === 'ACCEPTED' || emailStatus === 'SENT') return 'Email queued';
    if (emailStatus === 'DELIVERED') return 'Email queued';
    if (['BOUNCED', 'FAILED', 'COMPLAINED', 'REJECTED'].includes(String(emailStatus || ''))) return 'Delivery problem';
    if (status === 'PENDING') return 'Invitation prepared';
    return INVITE_LABEL[status as VendorInvitationStatus] || 'Invitation prepared';
}

function scanLabel(status: ScanStatus | string) {
    if (status === ScanStatus.CLEAN) return 'Ready';
    if (status === ScanStatus.PENDING) return 'Scanning';
    if (status === ScanStatus.INFECTED) return 'Blocked';
    return 'Security status unavailable';
}

function isUsableEvidence(status: ScanStatus | string) {
    return status === ScanStatus.CLEAN;
}

function firstName(name: string) {
    return name.trim().split(/\s+/)[0] || name;
}

function dueDays(tier: VendorTier) {
    return VENDOR_SLA_DAYS[tier] || 20;
}

function severityFor(tier: VendorTier, score: number | null, evidenceMissing: boolean): IssueSeverity {
    if (tier === VendorTier.CRITICAL || evidenceMissing) return IssueSeverity.HIGH;
    if (score != null && score <= 2) return tier === VendorTier.HIGH ? IssueSeverity.HIGH : IssueSeverity.MEDIUM;
    return IssueSeverity.MEDIUM;
}

async function loadVendor(organizationId: string, vendorKey: string) {
    const vendor = await prisma.vendor.findFirst({
        where: {
            organizationId,
            OR: [{ id: vendorKey }, { publicId: vendorKey }],
        },
        include: { onboarding: true, contacts: true },
    });
    if (!vendor?.onboarding) throw new ApiError(404, 'Vendor onboarding was not found.');
    return vendor;
}

async function writeHistory(organizationId: string, actorUserId: string | null, action: string, vendorId: string, summary: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({
        organizationId,
        actorUserId,
        action,
        resourceType: 'VendorOnboarding',
        resourceId: vendorId,
        result: 'success',
        metadata: { summary, ...metadata },
    });
}

export async function upsertAssessmentContact(organizationId: string, vendorKey: string, actor: Actor, input: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
}) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can assign the vendor assessment contact.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const email = String(input.email || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    if (!email || !name) throw new ApiError(400, 'Name and email are required for the assessment contact.');
    const existing = vendor.contacts.find((row) => row.email.toLowerCase() === email);
    const contact = existing
        ? await prisma.vendorContact.update({
            where: { id: existing.id },
            data: { name, title: input.title || existing.title, phone: input.phone || existing.phone, isAssessmentContact: true, role: existing.role || ContactRole.SECURITY_CONTACT },
        })
        : await prisma.vendorContact.create({
            data: {
                vendorId: vendor.id,
                name,
                email,
                title: input.title || null,
                phone: input.phone || null,
                role: ContactRole.SECURITY_CONTACT,
                isPrimary: vendor.contacts.length === 0,
                isAssessmentContact: true,
            },
        });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: { assessmentContactId: contact.id },
    });
    return contact;
}

async function vendorFacingAssessments(organizationId: string, vendorId: string, intakeAssessmentId?: string | null) {
    return prisma.vendorAssessment.findMany({
        where: {
            organizationId,
            vendorId,
            status: { notIn: [AssessmentStatus.COMPLETED, AssessmentStatus.CANCELLED] },
            ...(intakeAssessmentId ? { id: { not: intakeAssessmentId } } : {}),
        },
        include: {
            responses: true,
            evidence: { include: { } },
        },
        orderBy: { createdAt: 'asc' },
    });
}

function questionVisible(question: { questionId: string; conditionalOnKey?: string | null; conditionalValue?: string | null }, answers: Map<string, string>) {
    if (!question.conditionalOnKey) return true;
    const parent = answers.get(question.conditionalOnKey) || '';
    return parent.toLowerCase() === String(question.conditionalValue || '').toLowerCase();
}

async function assertReadyToInvite(organizationId: string, vendor: { id: string; onboarding: { stage: VendorOnboardingStage; intakeAssessmentId?: string | null; plan?: unknown } | null }) {
    if (vendor.onboarding!.stage !== VendorOnboardingStage.READY_TO_SEND && vendor.onboarding!.stage !== VendorOnboardingStage.AWAITING_VENDOR) {
        throw new ApiError(409, 'The due-diligence plan must be confirmed before an invitation is created.');
    }
    const answers = await prisma.assessmentResponse.findMany({
        where: { assessmentId: vendor.onboarding?.intakeAssessmentId || '' },
        select: { questionId: true, response: true },
    });
    const unresolved = recommendTierFromIntake(answers.map((row) => ({ questionKey: row.questionId, response: row.response }))).packs.unresolved;
    if (unresolved.length) {
        throw new ApiError(409, `We still need to know: ${unresolved.map((row) => row.question).join(' ')} Complete intake before sending.`);
    }
}

async function issueInvitation(organizationId: string, vendorId: string, contactId: string, actorId: string) {
    await prisma.vendorAssessmentInvitation.updateMany({
        where: { organizationId, vendorId, status: VendorInvitationStatus.PENDING },
        data: { status: VendorInvitationStatus.REVOKED, revokedAt: new Date() },
    });
    const rawToken = randomToken(32);
    const invitation = await prisma.vendorAssessmentInvitation.create({
        data: {
            organizationId,
            vendorId,
            vendorContactId: contactId,
            tokenHash: hashToken(rawToken),
            status: VendorInvitationStatus.PENDING,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            createdBy: actorId,
        },
    });
    return { invitation, rawToken, activationUrl: `${publicFrontendUrl()}/vendor-assessment/activate?token=${rawToken}` };
}

export async function sendDueDiligence(organizationId: string, vendorKey: string, actor: Actor, input: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
    dueDate?: string;
    allowActivationLink?: boolean;
}) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can send due diligence.');
    const vendor = await loadVendor(organizationId, vendorKey);
    await assertReadyToInvite(organizationId, vendor);
    const contact = await upsertAssessmentContact(organizationId, vendor.id, actor, input);
    const dueAt = input.dueDate ? new Date(input.dueDate) : addBusinessDays(new Date(), dueDays(vendor.onboarding!.confirmedTier || vendor.tier));
    const assessments = await vendorFacingAssessments(organizationId, vendor.id, vendor.onboarding!.intakeAssessmentId);
    if (!assessments.length) throw new ApiError(409, 'No due-diligence assessments are ready to send.');
    await prisma.vendorAssessment.updateMany({
        where: { id: { in: assessments.map((row) => row.id) } },
        data: {
            assignedContactId: contact.id,
            dueDate: dueAt,
            respondentPlane: 'VENDOR',
        },
    });

    const issued = await issueInvitation(organizationId, vendor.id, contact.id, actor.id);
    const invitation = issued.invitation;
    const activationUrl = issued.activationUrl;
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const reminder = Boolean(vendor.onboarding?.dueDiligenceSentAt);
    const invitationMail = vendorInvitationEmail({
        contactFirstName: firstName(contact.name),
        organizationName: org?.name || 'A customer',
        vendorName: vendor.name,
        dueAt,
        activationUrl,
        reminder,
    });
    const email = await deliverEmail({
        to: contact.email,
        subject: invitationMail.subject,
        body: invitationMail.text,
        html: invitationMail.html,
        fromName: invitationMail.fromName,
        eventType: 'vendor.assessment_invitation',
        organizationId,
        resourceType: 'VendorAssessmentInvitation',
        resourceId: invitation.id,
    });
    await prisma.vendorAssessmentInvitation.update({
        where: { id: invitation.id },
        data: {
            emailProvider: email.provider || null,
            providerMessageId: email.messageId || null,
            emailDeliveryStatus: email.status,
            emailSentAt: email.status === 'ACCEPTED' ? new Date() : null,
            emailFailedAt: email.status === 'FAILED' ? new Date() : null,
        },
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.AWAITING_VENDOR,
            assessmentContactId: contact.id,
            invitationId: invitation.id,
            dueDiligenceDueAt: dueAt,
            dueDiligenceSentAt: new Date(),
            dueDiligenceSentBy: actor.id,
        },
    });
    await writeHistory(organizationId, actor.id, 'vendor.due_diligence_sent', vendor.id, `Due diligence sent to ${contact.name}.`);
    if (vendor.businessOwnerUserId) {
        const sentMail = vendorInvitationSentInternalEmail({
            vendorName: vendor.name,
            publicId: vendor.publicId,
            ctaUrl: customerAppUrl(`/vendor-onboarding/${vendor.publicId}`),
        });
        await notifyUser({
            organizationId,
            userId: vendor.businessOwnerUserId,
            eventType: 'assessment.assigned',
            title: sentMail.subject,
            body: sentMail.text,
            emailBody: sentMail.text,
            emailHtml: sentMail.html,
            fromName: sentMail.fromName,
            resourceType: 'Vendor',
            resourceId: vendor.id,
        });
    }
    const workspace = await presentDueDiligence(organizationId, vendor.id, actor);
    return {
        ...workspace,
        activationUrl: process.env.NODE_ENV === 'test' || process.env.APP_ENVIRONMENT === 'staging' || input.allowActivationLink
            ? activationUrl
            : undefined,
        emailStatus: deliveryLabel(email.status),
    };
}

export async function resendInvitation(organizationId: string, vendorKey: string, actor: Actor) {
    const vendor = await loadVendor(organizationId, vendorKey);
    const contact = vendor.contacts.find((row) => row.id === vendor.onboarding?.assessmentContactId);
    if (!contact) throw new ApiError(409, 'Assign an assessment contact before resending.');
    return sendDueDiligence(organizationId, vendor.id, actor, {
        name: contact.name,
        email: contact.email,
        title: contact.title || undefined,
        phone: contact.phone || undefined,
        dueDate: vendor.onboarding?.dueDiligenceDueAt?.toISOString(),
        allowActivationLink: process.env.NODE_ENV === 'test',
    });
}

export async function activationLink(organizationId: string, vendorKey: string, actor: Actor, input: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
} = {}) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can copy the activation link.');
    const vendor = await loadVendor(organizationId, vendorKey);
    await assertReadyToInvite(organizationId, vendor);
    const contact = vendor.contacts.find((row) => row.id === vendor.onboarding?.assessmentContactId)
        || vendor.contacts.find((row) => row.isAssessmentContact);
    const assigned = (input.email && input.name)
        ? await upsertAssessmentContact(organizationId, vendor.id, actor, input)
        : contact;
    if (!assigned) throw new ApiError(409, 'Assign an assessment contact before copying the secure link.');
    const assessments = await vendorFacingAssessments(organizationId, vendor.id, vendor.onboarding!.intakeAssessmentId);
    if (!assessments.length) throw new ApiError(409, 'No due-diligence assessments are ready to send.');
    const dueAt = vendor.onboarding?.dueDiligenceDueAt || addBusinessDays(new Date(), dueDays(vendor.onboarding!.confirmedTier || vendor.tier));
    await prisma.vendorAssessment.updateMany({
        where: { id: { in: assessments.map((row) => row.id) } },
        data: { assignedContactId: assigned.id, dueDate: dueAt, respondentPlane: 'VENDOR' },
    });
    const issued = await issueInvitation(organizationId, vendor.id, assigned.id, actor.id);
    await prisma.vendorAssessmentInvitation.update({
        where: { id: issued.invitation.id },
        data: { emailDeliveryStatus: 'LINK_COPIED', emailProvider: null, providerMessageId: null },
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.AWAITING_VENDOR,
            assessmentContactId: assigned.id,
            invitationId: issued.invitation.id,
            dueDiligenceDueAt: dueAt,
        },
    });
    await writeHistory(organizationId, actor.id, 'vendor.secure_link_copied', vendor.id, 'Secure invitation link copied. This is not email delivery.');
    const workspace = await presentDueDiligence(organizationId, vendor.id, actor);
    return {
        ...workspace,
        activationUrl: issued.activationUrl,
        deliveryMethod: 'LINK',
        invitation: workspace.invitation,
    };
}

export async function markInvitationShared(organizationId: string, vendorKey: string, actor: Actor) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can mark the invitation as shared.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const invitation = vendor.onboarding?.invitationId
        ? await prisma.vendorAssessmentInvitation.findFirst({ where: { id: vendor.onboarding.invitationId, organizationId } })
        : await prisma.vendorAssessmentInvitation.findFirst({ where: { organizationId, vendorId: vendor.id }, orderBy: { createdAt: 'desc' } });
    if (!invitation) throw new ApiError(409, 'Copy or send an invitation before marking it as shared.');
    if (invitation.emailDeliveryStatus !== 'LINK_COPIED' && invitation.emailDeliveryStatus !== 'MARKED_SHARED') {
        throw new ApiError(409, 'Mark as shared is only for the copy-link path. It is not email delivery.');
    }
    await prisma.vendorAssessmentInvitation.update({
        where: { id: invitation.id },
        data: { emailDeliveryStatus: 'MARKED_SHARED' },
    });
    await writeHistory(organizationId, actor.id, 'vendor.secure_link_marked_shared', vendor.id, 'Customer marked the secure invitation as shared through their own channel. This is not email delivery.');
    return presentDueDiligence(organizationId, vendor.id, actor);
}

export async function activateVendorAccess(rawToken: string) {
    const token = String(rawToken || '').trim();
    if (!token) throw new ApiError(400, 'An activation link is required.');
    const invitation = await prisma.vendorAssessmentInvitation.findFirst({
        where: { tokenHash: hashToken(token) },
        include: { contact: true, vendor: { include: { organization: { select: { name: true, status: true } } } } },
    });
    if (!invitation) throw new ApiError(404, 'This invitation is not valid.');
    if (invitation.status === VendorInvitationStatus.REVOKED) throw new ApiError(410, 'This invitation has been replaced. Ask the customer to resend it.');
    if (invitation.status === VendorInvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
        await prisma.vendorAssessmentInvitation.update({ where: { id: invitation.id }, data: { status: VendorInvitationStatus.EXPIRED } });
        throw new ApiError(410, 'This invitation has expired.');
    }
    if (invitation.status !== VendorInvitationStatus.PENDING) {
        throw new ApiError(410, 'This invitation has already been used. Ask the customer to resend it if you need a new link.');
    }
    if (invitation.vendor.organization.status === 'SUSPENDED' || invitation.vendor.organization.status === 'CANCELLED') {
        throw new ApiError(403, 'This assessment is not available.');
    }
    if (invitation.status === VendorInvitationStatus.PENDING) {
        await prisma.vendorAssessmentInvitation.update({
            where: { id: invitation.id },
            data: { status: VendorInvitationStatus.ACTIVATED, activatedAt: new Date() },
        });
    }
    const sessionToken = randomToken(32);
    const session = await prisma.vendorPortalSession.create({
        data: {
            organizationId: invitation.organizationId,
            vendorId: invitation.vendorId,
            vendorContactId: invitation.vendorContactId,
            invitationId: invitation.id,
            tokenHash: hashToken(sessionToken),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        },
    });
    await prisma.vendorContact.update({ where: { id: invitation.vendorContactId }, data: { lastActivatedAt: new Date() } });
    await prisma.vendorOnboarding.updateMany({
        where: { vendorId: invitation.vendorId, stage: VendorOnboardingStage.AWAITING_VENDOR },
        data: { stage: VendorOnboardingStage.VENDOR_IN_PROGRESS, vendorActivatedAt: new Date() },
    });
    await writeHistory(invitation.organizationId, null, 'vendor.access_activated', invitation.vendorId, `${invitation.contact.name} started the vendor assessment.`);
    const jwtToken = jwt.sign({
        plane: VENDOR_PLANE,
        kind: 'vendor_session',
        sessionId: session.id,
        contactId: invitation.vendorContactId,
        vendorId: invitation.vendorId,
        organizationId: invitation.organizationId,
        email: invitation.contact.email,
    }, getEnv().jwtSecret, { algorithm: 'HS256', expiresIn: '12h' });
    return {
        token: jwtToken,
        contact: { name: invitation.contact.name, email: invitation.contact.email },
        vendor: { name: invitation.vendor.name, publicId: invitation.vendor.publicId },
        organization: { name: invitation.vendor.organization.name },
    };
}

export async function logoutVendor(sessionId: string) {
    await prisma.vendorPortalSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

async function assignedAssessments(actor: VendorActor) {
    return prisma.vendorAssessment.findMany({
        where: {
            organizationId: actor.organizationId,
            vendorId: actor.vendorId,
            assignedContactId: actor.contactId,
            respondentPlane: 'VENDOR',
        },
        include: {
            responses: { orderBy: { questionId: 'asc' } },
            evidence: { orderBy: { uploadedAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
    });
}

async function templateMap(templateId?: string | null) {
    if (!templateId) return new Map<string, { text: string; required: boolean; evidenceRequired: boolean; options: string[]; section: string; type: string; guidance?: string | null; conditionalOnKey?: string | null; conditionalValue?: string | null }>();
    const template = await prisma.questionnaireTemplate.findUnique({
        where: { id: templateId },
        include: { sections: { include: { questions: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
    });
    const map = new Map<string, { text: string; required: boolean; evidenceRequired: boolean; options: string[]; section: string; type: string; guidance?: string | null; conditionalOnKey?: string | null; conditionalValue?: string | null }>();
    for (const section of template?.sections || []) {
        for (const question of section.questions) {
            map.set(question.questionKey, {
                text: question.questionText.replace(/\n\nGuidance:.*$/s, ''),
                guidance: question.questionText.includes('Guidance:') ? question.questionText.split('Guidance:')[1]?.trim() : null,
                required: question.required,
                evidenceRequired: question.evidenceRequired,
                options: Array.isArray(question.options) ? question.options as string[] : [],
                section: section.title,
                type: question.questionType,
                conditionalOnKey: question.conditionalOnKey,
                conditionalValue: question.conditionalValue,
            });
        }
    }
    return map;
}

function presentQuestion(row: { questionId: string; questionText: string; response: string | null; evidenceRequired: boolean; hasEvidence: boolean }, meta: { text?: string; required: boolean; evidenceRequired: boolean; options: string[]; section: string; type: string; guidance?: string | null; conditionalOnKey?: string | null; conditionalValue?: string | null } | undefined, answers: Map<string, string>, evidenceStatus?: string) {
    const visible = questionVisible({ questionId: row.questionId, conditionalOnKey: meta?.conditionalOnKey, conditionalValue: meta?.conditionalValue }, answers);
    return {
        key: row.questionId,
        question: meta?.text || row.questionText,
        guidance: meta?.guidance || null,
        section: meta?.section || 'Assessment',
        type: meta?.type || 'SINGLE_CHOICE',
        options: meta?.options || [],
        required: meta?.required !== false && visible,
        evidenceRequired: (meta?.evidenceRequired || row.evidenceRequired) && visible,
        response: row.response || '',
        hasEvidence: row.hasEvidence,
        evidenceStatus: evidenceStatus || null,
        visible,
        locked: false,
    };
}

export async function vendorWorkspace(actor: VendorActor) {
    const vendor = await prisma.vendor.findFirst({
        where: { id: actor.vendorId, organizationId: actor.organizationId },
        include: { onboarding: true, organization: { select: { name: true } } },
    });
    if (!vendor) throw new ApiError(404, 'Assessment not found.');
    const assessments = await assignedAssessments(actor);
    const presented = [];
    let answered = 0;
    let total = 0;
    for (const assessment of assessments) {
        const meta = await templateMap(assessment.templateId);
        const answers = new Map(assessment.responses.map((row) => [row.questionId, row.response || '']));
        const questions = assessment.responses.map((row) => presentQuestion(row, meta.get(row.questionId), answers));
        const visible = questions.filter((row) => row.visible);
        const done = visible.filter((row) => row.response).length;
        answered += done;
        total += visible.length;
        presented.push({
            id: assessment.id,
            name: assessment.frameworkUsed || 'Assessment',
            status: assessment.status === AssessmentStatus.PENDING_REVIEW ? 'Submitted' : assessment.status === AssessmentStatus.IN_PROGRESS ? 'In progress' : 'Not started',
            answered: done,
            total: visible.length,
            dueDate: assessment.dueDate,
            submittedAt: assessment.submittedAt,
        });
    }
    return {
        organizationName: vendor.organization.name,
        vendorName: vendor.name,
        publicId: vendor.publicId,
        dueDate: vendor.onboarding?.dueDiligenceDueAt,
        progress: total ? Math.round((answered / total) * 100) : 0,
        assessments: presented,
        contactName: actor.name,
    };
}

export async function vendorAssessmentDetail(actor: VendorActor, assessmentId: string) {
    const assessment = (await assignedAssessments(actor)).find((row) => row.id === assessmentId);
    if (!assessment) throw new ApiError(404, 'Assessment not found.');
    const meta = await templateMap(assessment.templateId);
    const answers = new Map(assessment.responses.map((row) => [row.questionId, row.response || '']));
    const evidenceByQuestion = new Map<string, string>();
    for (const doc of assessment.evidence) {
        evidenceByQuestion.set(doc.id, scanLabel(doc.scanStatus));
    }
    const links = await prisma.evidenceLink.findMany({
        where: { organizationId: actor.organizationId, assessmentId: assessment.id, vendorId: actor.vendorId },
        include: { storedObject: { select: { scanStatus: true, filename: true, id: true } } },
    });
    const questions = assessment.responses.map((row) => {
        const link = links.find((item) => item.questionId === row.questionId);
        return presentQuestion(row, meta.get(row.questionId), answers, link ? scanLabel(link.storedObject.scanStatus) : undefined);
    });
    const clarification = Array.isArray(assessment.clarificationQuestionIds) ? assessment.clarificationQuestionIds as string[] : [];
    return {
        id: assessment.id,
        name: assessment.frameworkUsed || 'Assessment',
        templateVersion: assessment.templateVersion,
        status: assessment.status === AssessmentStatus.PENDING_REVIEW ? 'Submitted' : 'Open',
        submitted: Boolean(assessment.submittedAt),
        lastSaved: assessment.updatedAt,
        dueDate: assessment.dueDate,
        attestation: ATTESTATION_STATEMENT,
        questions: questions.map((row) => ({
            ...row,
            locked: Boolean(assessment.submittedAt) && !clarification.includes(row.key),
        })),
        vendorEvidence: links
            .filter((link) => link.storedObject)
            .map((link) => ({
                id: link.storedObject.id,
                filename: link.storedObject.filename,
                status: scanLabel(link.storedObject.scanStatus),
                usable: isUsableEvidence(link.storedObject.scanStatus),
                questionId: link.questionId,
            })),
    };
}

export async function saveVendorResponse(actor: VendorActor, assessmentId: string, input: { questionKey: string; response?: string; notes?: string }) {
    const assessment = (await assignedAssessments(actor)).find((row) => row.id === assessmentId);
    if (!assessment) throw new ApiError(404, 'Assessment not found.');
    if (assessment.submittedAt) {
        const clarification = Array.isArray(assessment.clarificationQuestionIds) ? assessment.clarificationQuestionIds as string[] : [];
        if (!clarification.includes(input.questionKey)) {
            throw new ApiError(409, 'This assessment has been submitted and cannot be changed.');
        }
    }
    const response = String(input.response || '').trim();
    if (!response) throw new ApiError(400, 'A response is required.');
    const existing = assessment.responses.find((row) => row.questionId === input.questionKey);
    if (!existing) throw new ApiError(404, 'Question not found.');
    await prisma.assessmentResponse.update({
        where: { id: existing.id },
        data: {
            response,
            notes: input.notes,
            score: scoreAssessmentResponse(response),
            respondedBy: actor.contactId,
            respondedAt: new Date(),
        },
    });
    if (assessment.status === AssessmentStatus.NOT_STARTED || assessment.status === AssessmentStatus.PENDING_REVIEW) {
        await prisma.vendorAssessment.update({
            where: { id: assessment.id },
            data: { status: AssessmentStatus.IN_PROGRESS, submittedAt: null },
        });
    }
    await prisma.vendorOnboarding.updateMany({
        where: { vendorId: actor.vendorId, stage: { in: [VendorOnboardingStage.AWAITING_VENDOR, VendorOnboardingStage.SUBMITTED] } },
        data: { stage: VendorOnboardingStage.VENDOR_IN_PROGRESS },
    });
    return vendorAssessmentDetail(actor, assessmentId);
}

export async function uploadVendorEvidence(actor: VendorActor, assessmentId: string, input: {
    questionKey: string;
    filename: string;
    contentType: string;
    buffer: Buffer;
    reuseStoredObjectId?: string;
}) {
    const assessment = (await assignedAssessments(actor)).find((row) => row.id === assessmentId);
    if (!assessment) throw new ApiError(404, 'Assessment not found.');
    if (assessment.submittedAt) throw new ApiError(409, 'This assessment has been submitted and cannot be changed.');
    if (input.reuseStoredObjectId) {
        const existing = await prisma.evidenceLink.findFirst({
            where: {
                organizationId: actor.organizationId,
                vendorId: actor.vendorId,
                storedObjectId: input.reuseStoredObjectId,
            },
            include: { storedObject: true },
        });
        if (!existing || existing.storedObject.uploadedBy !== actor.contactId) {
            throw new ApiError(404, 'That file is not available to reuse.');
        }
        if (!isUsableEvidence(existing.storedObject.scanStatus)) {
            throw new ApiError(409, 'Only a ready file can be reused.');
        }
        await prisma.evidenceLink.create({
            data: {
                organizationId: actor.organizationId,
                storedObjectId: existing.storedObjectId,
                vendorId: actor.vendorId,
                assessmentId,
                questionId: input.questionKey,
                createdBy: actor.contactId,
            },
        });
        await prisma.assessmentResponse.updateMany({
            where: { assessmentId, questionId: input.questionKey },
            data: { hasEvidence: true },
        });
        return { status: 'Ready', filename: existing.storedObject.filename };
    }
    const stored = await evidenceLinkageService.uploadLinked({
        organizationId: actor.organizationId,
        uploadedBy: actor.contactId,
        vendorId: actor.vendorId,
        assessmentId,
        questionId: input.questionKey,
        filename: input.filename,
        contentType: input.contentType,
        buffer: input.buffer,
        title: input.filename,
    });
    return {
        status: scanLabel(stored.stored.scanStatus),
        usable: isUsableEvidence(stored.stored.scanStatus),
        filename: stored.stored.filename,
        id: stored.stored.id,
    };
}

export function submissionChecklist(questions: Array<{ key: string; required: boolean; evidenceRequired: boolean; response: string; visible: boolean; hasEvidence: boolean; evidenceStatus?: string | null }>) {
    const visible = questions.filter((row) => row.visible);
    const unanswered = visible.filter((row) => row.required && !row.response);
    const evidenceMissing = visible.filter((row) => row.evidenceRequired && (!row.hasEvidence || row.evidenceStatus === 'Scanning' || row.evidenceStatus === 'Blocked' || row.evidenceStatus === 'Unavailable' || row.evidenceStatus === 'Security status unavailable'));
    return {
        remaining: unanswered.length + evidenceMissing.length,
        unanswered: unanswered.map((row) => row.key),
        evidence: evidenceMissing.map((row) => row.key),
        complete: unanswered.length === 0 && evidenceMissing.length === 0,
    };
}

export async function submitVendorAssessment(actor: VendorActor, assessmentId: string, input: { attested?: boolean }) {
    const detail = await vendorAssessmentDetail(actor, assessmentId);
    if (detail.submitted && !(await prisma.vendorAssessment.findFirst({ where: { id: assessmentId, clarificationQuestionIds: { not: Prisma.JsonNull } } }))) {
        throw new ApiError(409, 'This assessment has already been submitted.');
    }
    if (!input.attested) throw new ApiError(400, 'You must attest before submitting.');
    const checklist = submissionChecklist(detail.questions);
    if (!checklist.complete) {
        throw new ApiError(409, `${checklist.remaining} item${checklist.remaining === 1 ? '' : 's'} remain before this can be submitted.`, true, checklist);
    }
    await prisma.vendorAssessment.update({
        where: { id: assessmentId },
        data: {
            status: AssessmentStatus.PENDING_REVIEW,
            submittedAt: new Date(),
            attestationStatement: ATTESTATION_STATEMENT,
            attestationVersion: ATTESTATION_VERSION,
            attestedByName: actor.name,
            attestedAt: new Date(),
            clarificationQuestionIds: Prisma.JsonNull,
        },
    });
    const drafts = await generateDraftFindings(actor.organizationId, actor.vendorId, assessmentId, actor.name);
    const remaining = await prisma.vendorAssessment.count({
        where: {
            organizationId: actor.organizationId,
            vendorId: actor.vendorId,
            assignedContactId: actor.contactId,
            respondentPlane: 'VENDOR',
            submittedAt: null,
            status: { notIn: [AssessmentStatus.COMPLETED, AssessmentStatus.CANCELLED] },
        },
    });
    if (remaining === 0) {
        await prisma.vendorOnboarding.update({
            where: { vendorId: actor.vendorId },
            data: { stage: VendorOnboardingStage.SUBMITTED, vendorSubmittedAt: new Date() },
        });
        await prisma.vendorAssessmentInvitation.updateMany({
            where: { organizationId: actor.organizationId, vendorId: actor.vendorId, status: VendorInvitationStatus.ACTIVATED },
            data: { status: VendorInvitationStatus.COMPLETED },
        });
    }
    const vendor = await prisma.vendor.findUnique({ where: { id: actor.vendorId } });
    await writeHistory(actor.organizationId, null, 'vendor.assessment_submitted', actor.vendorId, `${actor.name} submitted ${detail.name}.`);
    await explainableRiskService.recalculate(actor.organizationId, actor.vendorId);
    if (vendor?.businessOwnerUserId) {
        const submittedMail = assessmentSubmittedEmail({
            vendorName: vendor.name,
            publicId: vendor.publicId,
            assessmentName: detail.name,
            ctaUrl: customerAppUrl(`/vendor-onboarding/${vendor.publicId}`),
        });
        await notifyUser({
            organizationId: actor.organizationId,
            userId: vendor.businessOwnerUserId,
            eventType: 'assessment.completed',
            title: submittedMail.subject,
            body: submittedMail.text,
            emailBody: submittedMail.text,
            emailHtml: submittedMail.html,
            fromName: submittedMail.fromName,
            resourceType: 'Vendor',
            resourceId: actor.vendorId,
        });
    }
    return {
        submitted: true,
        submittedAt: new Date().toISOString(),
        organizationName: (await prisma.organization.findUnique({ where: { id: actor.organizationId }, select: { name: true } }))?.name,
        draftFindings: drafts.length,
    };
}

async function generateDraftFindings(organizationId: string, vendorId: string, assessmentId: string, identifiedBy: string) {
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { id: assessmentId, organizationId, vendorId },
        include: { responses: true, vendor: { select: { tier: true, name: true } } },
    });
    if (!assessment) return [];
    const meta = await templateMap(assessment.templateId);
    const links = await prisma.evidenceLink.findMany({
        where: { organizationId, assessmentId, vendorId },
        include: { storedObject: { select: { scanStatus: true } } },
    });
    const created = [];
    for (const row of assessment.responses) {
        const question = meta.get(row.questionId);
        const score = scoreAssessmentResponse(row.response || '');
        const evidence = links.find((link) => link.questionId === row.questionId);
        const evidenceMissing = Boolean(question?.evidenceRequired || row.evidenceRequired) && (!evidence || !isUsableEvidence(evidence.storedObject.scanStatus));
        const negative = score != null && score <= 5 && !String(row.response || '').toLowerCase().startsWith('yes');
        if (!negative && !evidenceMissing) continue;
        const rule = evidenceMissing ? 'required_evidence_missing' : score != null && score <= 2 ? 'required_control_no' : 'required_control_partial';
        const existing = await prisma.vendorIssue.findFirst({
            where: { organizationId, vendorId, assessmentId, questionId: row.questionId, draftRuleCode: rule, reviewState: IssueReviewState.DRAFT },
        });
        if (existing) {
            created.push(existing);
            continue;
        }
        const issue = await prisma.vendorIssue.create({
            data: {
                organizationId,
                vendorId,
                title: evidenceMissing ? `Evidence still required: ${question?.text || row.questionText}` : `Response needs review: ${question?.text || row.questionText}`,
                description: `${row.response || 'No response recorded'}. Supreme drafted this from the submitted answer.`,
                issueType: VendorIssueType.CONTROL_FAILURE,
                severity: severityFor(assessment.vendor.tier, score, evidenceMissing),
                priority: 'MEDIUM' as const,
                source: IssueSource.INTERNAL_ASSESSMENT,
                identifiedBy,
                category: row.questionCategory || 'Security',
                status: 'OPEN',
                assessmentId,
                questionId: row.questionId,
                reviewState: IssueReviewState.DRAFT,
                draftRuleCode: rule,
            },
        });
        created.push(issue);
    }
    if (created.length) {
        await writeHistory(organizationId, null, 'vendor.draft_findings_generated', vendorId, `${created.length} potential finding${created.length === 1 ? '' : 's'} drafted.`);
    }
    return created;
}

export async function presentDueDiligence(organizationId: string, vendorKey: string, actor?: Actor) {
    const base = await getOnboarding(organizationId, vendorKey, actor);
    const vendor = await loadVendor(organizationId, vendorKey);
    const contact = vendor.contacts.find((row) => row.id === vendor.onboarding?.assessmentContactId) || vendor.contacts.find((row) => row.isAssessmentContact);
    const invitation = vendor.onboarding?.invitationId
        ? await prisma.vendorAssessmentInvitation.findFirst({ where: { id: vendor.onboarding.invitationId, organizationId } })
        : await prisma.vendorAssessmentInvitation.findFirst({ where: { organizationId, vendorId: vendor.id }, orderBy: { createdAt: 'desc' } });
    const assessments = await prisma.vendorAssessment.findMany({
        where: {
            organizationId,
            vendorId: vendor.id,
            ...(vendor.onboarding?.intakeAssessmentId ? { id: { not: vendor.onboarding.intakeAssessmentId } } : {}),
        },
        include: { responses: true, evidence: true },
        orderBy: { createdAt: 'asc' },
    });
    const findings = await prisma.vendorIssue.findMany({
        where: { organizationId, vendorId: vendor.id, assessmentId: { not: null } },
        orderBy: { createdAt: 'asc' },
    });
    const workflowStatus = vendor.onboarding!.stage === VendorOnboardingStage.UNDER_REVIEW
        ? 'Under review'
        : vendor.onboarding!.stage === VendorOnboardingStage.SUBMITTED
            ? 'Submitted'
            : vendor.onboarding!.stage === VendorOnboardingStage.VENDOR_IN_PROGRESS
                ? 'In progress'
                : vendor.onboarding!.stage === VendorOnboardingStage.AWAITING_VENDOR
                    ? 'Awaiting vendor'
                    : base.stage;
    return {
        ...base,
        workflowStatus,
        nextActionOwner: vendor.onboarding!.stage === VendorOnboardingStage.AWAITING_VENDOR || vendor.onboarding!.stage === VendorOnboardingStage.VENDOR_IN_PROGRESS
            ? 'Vendor'
            : vendor.onboarding!.stage === VendorOnboardingStage.ACTIVE
                ? 'Business owner'
                : ['SUBMITTED', 'UNDER_REVIEW', 'REMEDIATION', 'RISK_ACCEPTANCE', 'CONTRACT_REVIEW', 'APPROVAL', 'REASSESSMENT', 'OFFBOARDING'].includes(vendor.onboarding!.stage)
                    ? 'Analyst'
                    : 'Business owner',
        dueDate: vendor.onboarding?.dueDiligenceDueAt?.toISOString() || base.dueDate,
        contact: contact ? { id: contact.id, name: contact.name, email: contact.email, title: contact.title, phone: contact.phone } : null,
        invitation: invitation ? {
            status: invitationPreparedLabel(invitation.status, invitation.emailDeliveryStatus),
            activationStatus: INVITE_LABEL[invitation.status],
            deliveryMethod: ['LINK_COPIED', 'MARKED_SHARED'].includes(String(invitation.emailDeliveryStatus || '')) ? 'LINK' : invitation.emailDeliveryStatus ? 'EMAIL' : null,
            emailStatus: deliveryLabel(invitation.emailDeliveryStatus),
            emailTruth: ['LINK_COPIED', 'MARKED_SHARED', 'NOT_SENT'].includes(String(invitation.emailDeliveryStatus || ''))
                ? 'Secure link copied or marked as shared. This is not email delivery.'
                : invitation.emailDeliveryStatus === 'DELIVERED'
                    ? 'The email provider reported delivery. That is not proof a person opened the message. Queued is not Delivered.'
                    : invitation.emailDeliveryStatus
                        ? 'Provider accepted or queued the message. Queued is not inbox delivery.'
                        : 'Invitation prepared. No email has been sent.',
            sentAt: invitation.emailSentAt,
            expiresAt: invitation.expiresAt,
        } : null,
        vendorAssessments: assessments.map((row) => ({
            id: row.id,
            name: row.frameworkUsed || 'Assessment',
            status: row.submittedAt ? 'Submitted' : row.status === AssessmentStatus.IN_PROGRESS ? 'In progress' : 'Not started',
            answered: row.responses.filter((item) => item.response).length,
            total: row.responses.length,
            evidenceCount: row.evidence.length,
            dueDate: row.dueDate,
            submittedAt: row.submittedAt,
        })),
        review: await analystReview(organizationId, vendor.id),
        findings: findings.map((row) => ({
            id: row.id,
            title: row.title,
            severity: row.severity,
            reviewState: row.reviewState,
            reason: row.description,
            dismissReason: row.dismissReason,
        })),
    };
}

export async function analystReview(organizationId: string, vendorId: string) {
    const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
        include: { onboarding: true },
    });
    if (!vendor) throw new ApiError(404, 'Vendor not found.');
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, vendorId, respondentPlane: 'VENDOR' },
        include: { responses: true },
    });
    const findings = await prisma.vendorIssue.findMany({ where: { organizationId, vendorId, reviewState: { in: [IssueReviewState.DRAFT, IssueReviewState.CONFIRMED] } } });
    const items = [];
    let satisfactory = 0;
    let clarify = 0;
    let potential = 0;
    for (const assessment of assessments) {
        const meta = await templateMap(assessment.templateId);
        for (const row of assessment.responses) {
            const value = String(row.response || '').trim();
            const lower = value.toLowerCase();
            const score = scoreAssessmentResponse(value);
            const question = meta.get(row.questionId);
            const finding = findings.find((item) => item.questionId === row.questionId && item.assessmentId === assessment.id);
            const unanswered = !value || lower === 'not answered' || lower === 'unknown';
            const naNeedsReview = lower === 'n/a' || lower.startsWith('not applicable');
            const negative = score != null && score <= 5 && !lower.startsWith('yes');
            const exception = finding || unanswered || naNeedsReview || negative;
            if (!exception) {
                satisfactory += 1;
                continue;
            }
            if (finding) potential += 1;
            else clarify += 1;
            items.push({
                assessmentId: assessment.id,
                assessmentName: assessment.frameworkUsed || 'Assessment',
                questionId: row.questionId,
                question: question?.text || row.questionText,
                response: value || 'Not answered',
                score,
                reason: finding?.draftRuleCode === 'required_evidence_missing'
                    ? 'Required evidence is missing or not ready.'
                    : unanswered
                        ? 'Not answered — complete or request clarification.'
                        : naNeedsReview
                            ? 'N/A requires reviewer validation of the applicability rationale.'
                            : score != null && score <= 2
                                ? 'The recorded answer does not satisfy the requirement.'
                                : 'The recorded answer is partial and needs review.',
                findingId: finding?.id || null,
                reviewState: finding?.reviewState || null,
                priority: unanswered || (score != null && score <= 2) || finding ? 'high' : 'normal',
            });
        }
    }
    if (vendor.onboarding?.stage === VendorOnboardingStage.SUBMITTED) {
        await prisma.vendorOnboarding.update({
            where: { vendorId },
            data: { stage: VendorOnboardingStage.UNDER_REVIEW },
        });
    }
    return {
        vendor: vendor.name,
        tier: vendor.tier,
        submittedAt: vendor.onboarding?.vendorSubmittedAt,
        questionsAnswered: assessments.reduce((sum, row) => sum + row.responses.filter((item) => item.response).length, 0),
        satisfactory,
        needClarification: clarify,
        potentialFindings: potential,
        controlGap: workbookControlGap(assessments.flatMap((row) => row.responses.map((item) => ({ weight: item.weight, response: item.response })))),
        items,
        triggers: vendor.onboarding?.plan && typeof vendor.onboarding.plan === 'object'
            ? (vendor.onboarding.plan as { triggers?: Record<string, boolean> }).triggers
            : null,
    };
}

export async function reviewFinding(organizationId: string, vendorKey: string, actor: Actor, findingId: string, input: {
    action: 'confirm' | 'adjust' | 'dismiss';
    severity?: IssueSeverity;
    reason?: string;
}) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can decide a draft finding.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const finding = await prisma.vendorIssue.findFirst({ where: { id: findingId, organizationId, vendorId: vendor.id } });
    if (!finding) throw new ApiError(404, 'Finding not found.');
    if (input.action === 'dismiss') {
        if (!String(input.reason || '').trim()) throw new ApiError(400, 'A dismiss reason is required.');
        await prisma.vendorIssue.update({
            where: { id: finding.id },
            data: {
                reviewState: IssueReviewState.DISMISSED,
                dismissReason: input.reason,
                dismissedBy: actor.id,
                dismissedAt: new Date(),
                status: 'CLOSED',
                closedAt: new Date(),
                closedBy: actor.id,
                closureNotes: input.reason,
            },
        });
        await writeHistory(organizationId, actor.id, 'vendor.finding_dismissed', vendor.id, `${actor.name || 'Analyst'} dismissed a draft finding.`);
    } else if (input.action === 'adjust') {
        if (!input.severity || !String(input.reason || '').trim()) throw new ApiError(400, 'Adjusted severity and a reason are required.');
        await prisma.vendorIssue.update({
            where: { id: finding.id },
            data: {
                reviewState: IssueReviewState.CONFIRMED,
                severity: input.severity,
                severityAdjustReason: input.reason,
            },
        });
        await writeHistory(organizationId, actor.id, 'vendor.finding_adjusted', vendor.id, `${actor.name || 'Analyst'} adjusted a finding to ${input.severity}.`);
    } else {
        await prisma.vendorIssue.update({
            where: { id: finding.id },
            data: { reviewState: IssueReviewState.CONFIRMED },
        });
        await writeHistory(organizationId, actor.id, 'vendor.finding_confirmed', vendor.id, `${actor.name || 'Analyst'} confirmed a finding.`);
    }
    const drafts = await prisma.vendorIssue.count({ where: { organizationId, vendorId: vendor.id, reviewState: IssueReviewState.DRAFT } });
    if (!drafts) {
        await prisma.vendorOnboarding.update({
            where: { vendorId: vendor.id },
            data: { stage: VendorOnboardingStage.REMEDIATION },
        });
    }
    return presentDueDiligence(organizationId, vendor.id, actor);
}

export async function requestClarification(organizationId: string, vendorKey: string, actor: Actor, input: { assessmentId: string; questionKeys: string[] }) {
    if (!canSend(actor.role)) throw new ApiError(403, 'Only a risk reviewer can request clarification.');
    const vendor = await loadVendor(organizationId, vendorKey);
    const keys = (input.questionKeys || []).filter(Boolean);
    if (!keys.length) throw new ApiError(400, 'Select the questions that need clarification.');
    const assessment = await prisma.vendorAssessment.findFirst({
        where: { id: input.assessmentId, organizationId, vendorId: vendor.id, respondentPlane: 'VENDOR' },
    });
    if (!assessment) throw new ApiError(404, 'Assessment not found.');
    await prisma.vendorAssessment.update({
        where: { id: assessment.id },
        data: {
            status: AssessmentStatus.IN_PROGRESS,
            submittedAt: null,
            clarificationQuestionIds: keys,
        },
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: { stage: VendorOnboardingStage.VENDOR_IN_PROGRESS },
    });
    await writeHistory(organizationId, actor.id, 'vendor.clarification_requested', vendor.id, `${actor.name || 'Analyst'} requested clarification on ${keys.length} question${keys.length === 1 ? '' : 's'}.`);
    const contact = vendor.contacts.find((row) => row.id === vendor.onboarding?.assessmentContactId)
        || vendor.contacts.find((row) => row.isAssessmentContact);
    if (contact?.email) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        const mail = clarificationRequestedEmail({
            contactFirstName: firstName(contact.name),
            organizationName: org?.name || 'A customer',
            vendorName: vendor.name,
            questionCount: keys.length,
            ctaUrl: `${portalFrontendUrl('VENDOR')}/vendor-assessment`,
        });
        await deliverEmail({
            to: contact.email,
            subject: mail.subject,
            body: mail.text,
            html: mail.html,
            fromName: mail.fromName,
            eventType: 'vendor.clarification_requested',
            organizationId,
            resourceType: 'VendorAssessment',
            resourceId: assessment.id,
        });
    }
    return presentDueDiligence(organizationId, vendor.id, actor);
}

export async function scanVendorDueDiligenceAttention(now = new Date()) {
    const rows = await prisma.vendorOnboarding.findMany({
        where: {
            stage: { in: [VendorOnboardingStage.AWAITING_VENDOR, VendorOnboardingStage.VENDOR_IN_PROGRESS] },
            dueDiligenceDueAt: { lte: now },
        },
        include: { vendor: { select: { id: true, name: true, publicId: true, businessOwnerUserId: true, organizationId: true } } },
        take: 50,
    });
    let sent = 0;
    for (const row of rows) {
        if (!row.vendor.businessOwnerUserId) continue;
        const already = await prisma.inAppNotification.findFirst({
            where: { organizationId: row.organizationId, resourceId: row.vendorId, eventType: 'assessment.overdue' },
        });
        if (already) continue;
        const overdueMail = assessmentOverdueEmail({
            vendorName: row.vendor.name,
            publicId: row.vendor.publicId || row.vendor.name,
            ctaUrl: customerAppUrl(`/vendor-onboarding/${row.vendor.publicId || row.vendor.id}`),
        });
        await notifyUser({
            organizationId: row.organizationId,
            userId: row.vendor.businessOwnerUserId,
            eventType: 'assessment.overdue',
            title: overdueMail.subject,
            body: overdueMail.text,
            emailBody: overdueMail.text,
            emailHtml: overdueMail.html,
            fromName: overdueMail.fromName,
            resourceType: 'Vendor',
            resourceId: row.vendorId,
        });
        sent += 1;
    }
    return sent;
}
