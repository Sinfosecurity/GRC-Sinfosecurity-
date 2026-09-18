import { RequesterTaskPurpose, RequesterTaskStatus, VendorOnboardingStage, VendorTier } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { IRA_QUESTIONS, missingIraQuestions } from '../tprm/iraCatalog';
import { iraForm, scoreIra } from '../tprm/iraScoring';
import { hashToken, randomToken } from './passwordService';
import { deliverEmail } from './notificationDeliveryService';
import { customerAppUrl, renderTransactionalEmail } from './transactionalEmail';
import { presentOnboarding, type Actor } from './vendorOnboardingService';

const IRA_TTL_DAYS = 14;

function iraEmail(input: { requesterName?: string; vendorName: string; publicId: string; dueAt?: Date | null; ctaUrl: string }) {
    return renderTransactionalEmail({
        templateKey: 'vendor.ira_assigned',
        audience: 'internal',
        heading: 'Complete the inherent risk questions',
        intro: `GRC opened ${input.vendorName} (${input.publicId}). Answer only what you know about this engagement. You do not need a Supreme account.`,
        greeting: input.requesterName ? `Hello ${input.requesterName}` : undefined,
        context: [
            { label: 'Vendor', value: input.vendorName },
            { label: 'Engagement', value: input.publicId },
        ],
        dueLabel: 'Due',
        dueValue: input.dueAt ? input.dueAt.toISOString().slice(0, 10) : '',
        cta: { label: 'Open the inherent risk form', url: input.ctaUrl },
        nextSteps: [
            'Answer the business questions. Don\'t know is allowed.',
            'GRC reviews the answers and confirms the tier.',
            'The vendor is invited only after that.',
        ],
        securityNote: 'This link opens only this form. If you were not expecting it, tell your GRC team.',
    }, `Action required: Inherent risk questions for ${input.vendorName}`);
}

async function loadVendor(organizationId: string, vendorKey: string) {
    const vendor = await prisma.vendor.findFirst({
        where: { organizationId, OR: [{ id: vendorKey }, { publicId: vendorKey }] },
        include: { onboarding: true, organization: { select: { name: true } } },
    });
    if (!vendor?.onboarding) throw new ApiError(404, 'Onboarding was not found.');
    return vendor;
}

async function issueIraToken(organizationId: string, vendorId: string, email: string, createdBy: string) {
    await prisma.requesterTaskLink.updateMany({
        where: { organizationId, vendorId, purpose: RequesterTaskPurpose.IRA, status: { in: [RequesterTaskStatus.PENDING, RequesterTaskStatus.OPENED] } },
        data: { status: RequesterTaskStatus.REVOKED, revokedAt: new Date() },
    });
    const raw = randomToken(32);
    const expiresAt = new Date(Date.now() + IRA_TTL_DAYS * 86400000);
    const row = await prisma.requesterTaskLink.create({
        data: {
            organizationId,
            vendorId,
            purpose: RequesterTaskPurpose.IRA,
            email: email.trim().toLowerCase(),
            tokenHash: hashToken(raw),
            expiresAt,
            createdBy,
        },
    });
    return { row, raw, url: customerAppUrl(`/ira?token=${raw}`) };
}

function publicIra(vendor: { name: string; publicId: string | null; onboarding: { engagementPublicId?: string | null; iraAnswers?: unknown; intakeCompletedAt?: Date | null; requesterName?: string | null } | null }, link: { status: RequesterTaskStatus; expiresAt: Date; submittedAt: Date | null }) {
    const answers = (vendor.onboarding?.iraAnswers && typeof vendor.onboarding.iraAnswers === 'object')
        ? vendor.onboarding.iraAnswers as Record<string, string>
        : {};
    const submitted = Boolean(link.submittedAt || vendor.onboarding?.intakeCompletedAt);
    return {
        vendorName: vendor.name,
        publicId: vendor.onboarding?.engagementPublicId || vendor.publicId,
        requesterName: vendor.onboarding?.requesterName || null,
        form: iraForm(),
        answers,
        submitted,
        readOnly: submitted,
        expiresAt: link.expiresAt,
        questions: IRA_QUESTIONS,
    };
}

export async function sendIraLink(organizationId: string, vendorKey: string, actor: Actor, mode: 'email' | 'copy') {
    const vendor = await loadVendor(organizationId, vendorKey);
    if (vendor.onboarding.screeningStatus === 'HOLD') {
        throw new ApiError(409, 'Screening is on hold. Do not send the IRA until it is clear.');
    }
    const email = vendor.onboarding.requesterEmail;
    if (!email) throw new ApiError(400, 'Enter the requester email before sending the IRA.');
    const issued = await issueIraToken(organizationId, vendor.id, email, actor.id);
    let delivery = 'NOT_SENT';
    if (mode === 'email') {
        const mail = iraEmail({
            requesterName: vendor.onboarding.requesterName || undefined,
            vendorName: vendor.name,
            publicId: vendor.onboarding.engagementPublicId || vendor.publicId || vendor.id,
            dueAt: vendor.onboarding.intakeDueAt,
            ctaUrl: issued.url,
        });
        const sent = await deliverEmail({
            to: email,
            subject: mail.subject,
            body: mail.text,
            html: mail.html,
            fromName: mail.fromName,
            eventType: 'assessment.assigned',
            organizationId,
            resourceType: 'VendorOnboarding',
            resourceId: vendor.id,
        });
        delivery = sent.status;
        await prisma.requesterTaskLink.update({
            where: { id: issued.row.id },
            data: {
                deliveryMethod: 'EMAIL',
                emailDeliveryStatus: sent.status,
                emailSentAt: new Date(),
                markedSentAt: new Date(),
            },
        });
        await prisma.vendorOnboarding.update({
            where: { vendorId: vendor.id },
            data: { intakeDueAt: vendor.onboarding.intakeDueAt || new Date(Date.now() + 5 * 86400000) },
        });
    } else {
        await prisma.requesterTaskLink.update({
            where: { id: issued.row.id },
            data: { deliveryMethod: 'LINK' },
        });
    }
    return {
        ...(await presentOnboarding(organizationId, vendor.id, actor)),
        iraLink: mode === 'copy' || process.env.NODE_ENV === 'test' || process.env.APP_ENVIRONMENT === 'staging'
            ? { url: issued.url, expiresAt: issued.row.expiresAt, delivery }
            : { expiresAt: issued.row.expiresAt, delivery },
    };
}

export async function markIraShared(organizationId: string, vendorKey: string, actor: Actor) {
    const vendor = await loadVendor(organizationId, vendorKey);
    const link = await prisma.requesterTaskLink.findFirst({
        where: { organizationId, vendorId: vendor.id, purpose: RequesterTaskPurpose.IRA, status: { in: [RequesterTaskStatus.PENDING, RequesterTaskStatus.OPENED] } },
        orderBy: { createdAt: 'desc' },
    });
    if (!link) throw new ApiError(409, 'Copy the IRA link before marking it sent.');
    await prisma.requesterTaskLink.update({
        where: { id: link.id },
        data: { markedSentAt: new Date(), deliveryMethod: link.deliveryMethod || 'LINK' },
    });
    if (!vendor.onboarding.intakeDueAt) {
        await prisma.vendorOnboarding.update({
            where: { vendorId: vendor.id },
            data: { intakeDueAt: new Date(Date.now() + 5 * 86400000) },
        });
    }
    return presentOnboarding(organizationId, vendor.id, actor);
}

async function loadLink(token: string) {
    const hash = hashToken(String(token || '').trim());
    const link = await prisma.requesterTaskLink.findUnique({
        where: { tokenHash: hash },
        include: { vendor: { include: { onboarding: true } } },
    });
    if (!link || link.purpose !== RequesterTaskPurpose.IRA) throw new ApiError(404, 'This inherent-risk link is not valid.');
    if (link.status === RequesterTaskStatus.REVOKED) throw new ApiError(410, 'This link was replaced. Ask GRC for a new one.');
    if (link.expiresAt < new Date() && link.status !== RequesterTaskStatus.SUBMITTED) throw new ApiError(410, 'This inherent-risk link has expired.');
    return link;
}

export async function getIraForm(token: string) {
    const link = await loadLink(token);
    if (link.status === RequesterTaskStatus.PENDING) {
        await prisma.requesterTaskLink.update({
            where: { id: link.id },
            data: { status: RequesterTaskStatus.OPENED, openedAt: new Date() },
        });
    }
    return publicIra(link.vendor, link);
}

export async function saveIraForm(token: string, answers: Record<string, string>) {
    const link = await loadLink(token);
    if (link.submittedAt || link.vendor.onboarding?.intakeCompletedAt) {
        throw new ApiError(409, 'This inherent-risk form has already been submitted.');
    }
    await prisma.vendorOnboarding.update({
        where: { vendorId: link.vendorId },
        data: { iraAnswers: answers, intakeStartedAt: new Date() },
    });
    return publicIra({ ...link.vendor, onboarding: { ...link.vendor.onboarding!, iraAnswers: answers } }, link);
}

export async function submitIraForm(token: string, answers: Record<string, string>, attested: boolean) {
    if (!attested) throw new ApiError(400, 'Confirm the answers are accurate before submitting.');
    const link = await loadLink(token);
    if (link.submittedAt || link.vendor.onboarding?.intakeCompletedAt) {
        throw new ApiError(409, 'This inherent-risk form has already been submitted.');
    }
    const payload = IRA_QUESTIONS.map((question) => ({ questionKey: question.key, response: answers[question.key] || '' }));
    const missing = missingIraQuestions(payload);
    if (missing.length) throw new ApiError(400, `Answer every question. Don't know is allowed. Still needed: ${missing.length}.`);
    const rating = link.vendor.onboarding?.externalRating && typeof link.vendor.onboarding.externalRating === 'object'
        ? link.vendor.onboarding.externalRating as { provider?: string; grade?: string; score?: number | null; assessedAt?: string }
        : null;
    const scored = scoreIra(payload, { externalRating: rating });
    const autoConfirm = scored.autoConfirmEligible && scored.recommendedTier === VendorTier.LOW;
    await prisma.vendorOnboarding.update({
        where: { vendorId: link.vendorId },
        data: {
            iraAnswers: answers,
            iraUnknownCount: scored.unknownCount,
            intakeCompletedAt: new Date(),
            intakeAttestedAt: new Date(),
            recommendedTier: scored.recommendedTier,
            recommendedScore: scored.percent != null ? Math.round(scored.percent) : null,
            recommendedFactors: scored.factors as object[],
            hardFloors: scored.floors as object[],
            plan: { questionnairePlan: scored.packs, ira: scored, triggers: { privacy: scored.signals.privacyPack, aiGovernance: scored.signals.aiInvolved } } as object,
            stage: autoConfirm ? VendorOnboardingStage.READY_TO_SEND : VendorOnboardingStage.TIER_REVIEW,
            confirmedTier: autoConfirm ? VendorTier.LOW : null,
            tierConfirmedAt: autoConfirm ? new Date() : null,
            planConfirmedAt: autoConfirm ? new Date() : null,
        },
    });
    if (scored.recommendedTier) {
        await prisma.vendor.update({
            where: { id: link.vendorId },
            data: {
                tier: scored.recommendedTier,
                inherentRiskScore: scored.percent != null ? Math.round(scored.percent) : 0,
                dataTypesAccessed: scored.signals.personalData ? ['Personal data'] : [],
            },
        });
    }
    await prisma.requesterTaskLink.update({
        where: { id: link.id },
        data: { status: RequesterTaskStatus.SUBMITTED, submittedAt: new Date() },
    });
    return {
        ...publicIra({ ...link.vendor, onboarding: { ...link.vendor.onboarding!, iraAnswers: answers, intakeCompletedAt: new Date() } }, { ...link, submittedAt: new Date(), status: RequesterTaskStatus.SUBMITTED }),
        rating: scored.ready ? { tier: scored.recommendedTier, percent: scored.percent, explanation: scored.explanation } : { tier: null, message: scored.message },
        autoConfirmed: autoConfirm,
    };
}
