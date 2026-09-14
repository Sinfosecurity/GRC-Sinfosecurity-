import { AssessmentStatus, AssessmentType, Prisma, VendorOnboardingStage, VendorStatus, VendorTier, VendorType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { canonicalizeRole } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { explainableRiskService } from './explainableRiskService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import { getLibraryTemplateByKey, recommendAssessments } from './questionnaireLibrary';
import vendorAssessmentService from './vendorAssessmentService';
import {
    addBusinessDays,
    extractVendorDomain,
    formatVendorPublicId,
    namesLikelyDuplicate,
    recommendTierFromIntake,
    type IntakeAnswer,
} from './vendorOnboardingScoring';

export const INTAKE_SLA_DAYS = 5;
export const TIER_REVIEW_SLA_DAYS = 2;

const STAGE_LABEL: Record<VendorOnboardingStage, string> = {
    REQUEST: 'Request',
    INTAKE: 'Intake',
    TIER_REVIEW: 'Tier review',
    DUE_DILIGENCE_PLAN: 'Due diligence',
    READY_TO_SEND: 'Ready to send',
    AWAITING_VENDOR: 'Awaiting vendor',
    VENDOR_IN_PROGRESS: 'Vendor in progress',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
};

const TIER_LABEL: Record<VendorTier, string> = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
};

const HISTORY_ACTIONS: Record<string, string> = {
    'vendor.requested': 'Vendor requested',
    'vendor.owner_assigned': 'Business owner assigned',
    'vendor.intake_started': 'Intake started',
    'vendor.intake_completed': 'Intake completed',
    'vendor.inherent_risk_calculated': 'Inherent risk calculated',
    'vendor.tier_recommended': 'Tier recommended',
    'vendor.tier_confirmed': 'Tier confirmed',
    'vendor.tier_overridden': 'Tier overridden',
    'vendor.plan_generated': 'Due-diligence plan generated',
    'vendor.plan_confirmed': 'Due-diligence plan confirmed',
    'vendor.due_diligence_sent': 'Due diligence sent',
    'vendor.access_activated': 'Vendor started assessment',
    'vendor.assessment_submitted': 'Vendor submitted assessment',
    'vendor.draft_findings_generated': 'Draft findings generated',
    'vendor.finding_confirmed': 'Finding confirmed',
    'vendor.finding_adjusted': 'Finding adjusted',
    'vendor.finding_dismissed': 'Finding dismissed',
    'vendor.clarification_requested': 'Clarification requested',
};

type Actor = { id: string; role: string; name?: string };

function canRequest(role: string) {
    const canonical = canonicalizeRole(role);
    return ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR', 'BUSINESS_OWNER'].includes(canonical);
}

function canCompleteIntake(role: string, actorId: string, ownerId?: string | null) {
    if (ownerId && actorId === ownerId) return true;
    const canonical = canonicalizeRole(role);
    return ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR'].includes(canonical);
}

function canReviewTier(role: string) {
    const canonical = canonicalizeRole(role);
    return ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR'].includes(canonical);
}

function categoryFromService(category?: string): 'TECHNOLOGY' | 'CLOUD_HOSTING' | 'PAYMENT_PROCESSING' | 'HR_PAYROLL' | 'OTHER' {
    const value = String(category || '').toLowerCase();
    if (/cloud|host/.test(value)) return 'CLOUD_HOSTING';
    if (/pay|financ/.test(value)) return 'PAYMENT_PROCESSING';
    if (/staff|hr/.test(value)) return 'HR_PAYROLL';
    if (/saas|tech|software/.test(value)) return 'TECHNOLOGY';
    return 'OTHER';
}

function typeFromService(category?: string): VendorType {
    const value = String(category || '').toLowerCase();
    if (/saas/.test(value)) return VendorType.SAAS;
    if (/cloud|host/.test(value)) return VendorType.CLOUD_SERVICE;
    if (/staff/.test(value)) return VendorType.STAFFING;
    if (/professional/.test(value)) return VendorType.PROFESSIONAL_SERVICES;
    return VendorType.OTHER;
}

export async function allocateVendorPublicId(organizationId: string, year = new Date().getFullYear()) {
    const prefix = `VND-${year}-`;
    const latest = await prisma.vendor.findFirst({
        where: { organizationId, publicId: { startsWith: prefix } },
        orderBy: { publicId: 'desc' },
        select: { publicId: true },
    });
    const current = latest?.publicId ? Number(latest.publicId.slice(prefix.length)) : 0;
    return formatVendorPublicId(year, current + 1);
}

export async function ensureVendorPublicId(organizationId: string, vendorId: string) {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, organizationId }, select: { id: true, publicId: true } });
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    if (vendor.publicId) return vendor.publicId;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const publicId = await allocateVendorPublicId(organizationId);
        try {
            await prisma.vendor.update({ where: { id: vendor.id }, data: { publicId } });
            return publicId;
        } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        }
    }
    throw new ApiError(500, 'Unable to allocate a public vendor ID');
}

async function userDirectory(organizationId: string, ids: Array<string | null | undefined>) {
    const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!wanted.length) return new Map<string, { id: string; name: string; email: string; role: string }>();
    const users = await prisma.user.findMany({
        where: { organizationId, id: { in: wanted } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
    return new Map(users.map((user) => [user.id, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
        role: user.role,
    }]));
}

async function orgAnalysts(organizationId: string) {
    const users = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, role: true },
    });
    return users.filter((user) => ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR', 'ADMIN', 'COMPLIANCE_OFFICER'].includes(canonicalizeRole(user.role)));
}

async function writeHistory(organizationId: string, actorUserId: string | null, action: string, vendorId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({
        organizationId,
        actorUserId,
        action,
        resourceType: 'VendorOnboarding',
        resourceId: vendorId,
        result: 'success',
        metadata,
    });
}

async function notify(organizationId: string, userId: string | null | undefined, eventType: NotificationEvent, title: string, body: string, vendorId: string) {
    if (!userId) return;
    await notifyUser({
        organizationId,
        userId,
        eventType,
        title,
        body,
        resourceType: 'VendorOnboarding',
        resourceId: vendorId,
    });
}

export async function findDuplicateVendors(organizationId: string, input: { name?: string; website?: string; domain?: string }) {
    const domain = extractVendorDomain(input.website || input.domain);
    const vendors = await prisma.vendor.findMany({
        where: { organizationId },
        select: {
            id: true,
            publicId: true,
            name: true,
            legalName: true,
            website: true,
            domain: true,
            status: true,
            tier: true,
        },
        take: 500,
    });
    return vendors.filter((vendor) => {
        const sameDomain = Boolean(domain && (vendor.domain === domain || extractVendorDomain(vendor.website) === domain));
        const sameName = namesLikelyDuplicate(input.name || '', vendor.name) || namesLikelyDuplicate(input.name || '', vendor.legalName || '');
        return sameDomain || sameName;
    }).map((vendor) => ({
        id: vendor.id,
        publicId: vendor.publicId,
        name: vendor.name,
        website: vendor.website,
        status: vendor.status,
        tier: TIER_LABEL[vendor.tier],
        matchReason: domain && (vendor.domain === domain || extractVendorDomain(vendor.website) === domain)
            ? 'Same website or domain'
            : 'Similar name',
    }));
}

async function resolveOwner(organizationId: string, userId?: string | null, fallbackName?: string | null) {
    if (!userId) {
        return { userId: null, name: fallbackName || null };
    }
    const user = await prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!user) throw new ApiError(400, 'Business owner must be a person in this organization.');
    return { userId: user.id, name: `${user.firstName} ${user.lastName}`.trim() || user.email };
}

export async function createOnboardingRequest(organizationId: string, actor: Actor, input: {
    name: string;
    legalName?: string;
    website?: string;
    country?: string;
    servicesProvided: string;
    vendorType?: VendorType;
    category?: string;
    businessOwnerUserId?: string;
    relationshipOwnerUserId?: string;
    businessOwner?: string;
    relationshipOwner?: string;
    businessUnit?: string;
    estimatedAnnualSpend?: number;
    targetStartDate?: string;
    primaryContact?: string;
    contactEmail?: string;
    acknowledgeDuplicate?: boolean;
}) {
    if (!canRequest(actor.role)) throw new ApiError(403, 'You can view records but cannot start onboarding.');
    const name = String(input.name || '').trim();
    const servicesProvided = String(input.servicesProvided || '').trim();
    if (!name) throw new ApiError(400, 'Vendor name is required.');
    if (!servicesProvided) throw new ApiError(400, 'Describe the service or product.');
    const duplicates = await findDuplicateVendors(organizationId, { name, website: input.website });
    if (duplicates.length && !input.acknowledgeDuplicate) {
        throw new ApiError(409, 'Possible existing third party found', true, { duplicates });
    }
    const owner = await resolveOwner(organizationId, input.businessOwnerUserId, input.businessOwner);
    const relationship = await resolveOwner(organizationId, input.relationshipOwnerUserId, input.relationshipOwner || owner.name);
    const domain = extractVendorDomain(input.website);
    const publicId = await allocateVendorPublicId(organizationId);
    const intakeDueAt = addBusinessDays(new Date(), INTAKE_SLA_DAYS);
    const vendor = await prisma.vendor.create({
        data: {
            organizationId,
            publicId,
            name,
            legalName: input.legalName || name,
            vendorType: input.vendorType || typeFromService(input.category),
            category: categoryFromService(input.category),
            tier: VendorTier.MEDIUM,
            status: VendorStatus.PROPOSED,
            primaryContact: input.primaryContact || owner.name || actor.name || 'Not recorded',
            contactEmail: input.contactEmail || 'not-recorded@example.invalid',
            website: input.website,
            domain,
            country: input.country,
            businessOwner: owner.name,
            relationshipOwner: relationship.name,
            requesterUserId: actor.id,
            businessOwnerUserId: owner.userId,
            relationshipOwnerUserId: relationship.userId,
            businessUnit: input.businessUnit,
            estimatedAnnualSpend: input.estimatedAnnualSpend,
            targetStartDate: input.targetStartDate ? new Date(input.targetStartDate) : null,
            servicesProvided,
            dataTypesAccessed: [],
            geographicFootprint: input.country ? [input.country] : [],
            regulatoryScope: [],
        },
    });
    const template = await getLibraryTemplateByKey('inherent-risk');
    if (!template) throw new ApiError(500, 'Inherent-risk questionnaire is not available.');
    const assessment = await vendorAssessmentService.createAssessment({
        vendorId: vendor.id,
        organizationId,
        assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
        frameworkUsed: template.framework,
        assignedTo: owner.userId || actor.id,
        dueDate: intakeDueAt,
        templateId: template.id,
    });
    await prisma.vendorOnboarding.create({
        data: {
            vendorId: vendor.id,
            organizationId,
            stage: VendorOnboardingStage.INTAKE,
            intakeAssessmentId: assessment.id,
            intakeDueAt,
        },
    });
    await writeHistory(organizationId, actor.id, 'vendor.requested', vendor.id, {
        publicId,
        name,
        summary: `${name} was requested as ${publicId}.`,
    });
    if (owner.userId) {
        await writeHistory(organizationId, actor.id, 'vendor.owner_assigned', vendor.id, {
            ownerName: owner.name,
            summary: `${owner.name} was named business owner.`,
        });
        await notify(
            organizationId,
            owner.userId,
            'assessment.assigned',
            `Complete vendor intake — ${name}`,
            `${actor.name || 'A colleague'} requested onboarding of ${name} (${publicId}) and named you as the business owner. Complete intake by ${intakeDueAt.toISOString().slice(0, 10)}.`,
            vendor.id,
        );
    }
    return presentOnboarding(organizationId, vendor.id, actor);
}

export async function listOnboardings(organizationId: string) {
    const rows = await prisma.vendorOnboarding.findMany({
        where: { organizationId },
        include: { vendor: true },
        orderBy: { updatedAt: 'desc' },
        take: 100,
    });
    const users = await userDirectory(organizationId, rows.flatMap((row) => [row.vendor.businessOwnerUserId, row.vendor.requesterUserId]));
    return rows.map((row) => summarize(row, users));
}

export async function listOwnerDirectory(organizationId: string) {
    const users = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 200,
    });
    return users.map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
        role: user.role,
    }));
}

function summarize(row: { stage: VendorOnboardingStage; intakeDueAt: Date | null; tierReviewDueAt: Date | null; vendor: { id: string; publicId: string | null; name: string; businessOwner: string | null; businessOwnerUserId: string | null; requesterUserId: string | null } }, users: Map<string, { name: string }>) {
    const owner = row.vendor.businessOwnerUserId ? users.get(row.vendor.businessOwnerUserId)?.name : row.vendor.businessOwner;
    return {
        id: row.vendor.id,
        publicId: row.vendor.publicId,
        name: row.vendor.name,
        stage: STAGE_LABEL[row.stage],
        stageKey: row.stage,
        owner: owner || 'Not assigned',
        dueDate: (row.stage === VendorOnboardingStage.TIER_REVIEW ? row.tierReviewDueAt : row.intakeDueAt)?.toISOString() || null,
        nextAction: nextAction(row.stage),
    };
}

function nextAction(stage: VendorOnboardingStage) {
    switch (stage) {
        case VendorOnboardingStage.REQUEST:
        case VendorOnboardingStage.INTAKE:
            return 'Complete vendor intake';
        case VendorOnboardingStage.TIER_REVIEW:
            return 'Confirm recommended tier';
        case VendorOnboardingStage.DUE_DILIGENCE_PLAN:
            return 'Confirm due-diligence plan';
        case VendorOnboardingStage.READY_TO_SEND:
            return 'Send due diligence to the vendor contact';
        case VendorOnboardingStage.AWAITING_VENDOR:
            return 'Waiting for the vendor to start';
        case VendorOnboardingStage.VENDOR_IN_PROGRESS:
            return 'Vendor is completing assigned assessments';
        case VendorOnboardingStage.SUBMITTED:
            return 'Review the vendor submission';
        case VendorOnboardingStage.UNDER_REVIEW:
            return 'Confirm or dismiss draft findings';
        default:
            return 'Review onboarding';
    }
}

async function loadWorkspace(organizationId: string, vendorKey: string) {
    const vendor = await prisma.vendor.findFirst({
        where: {
            organizationId,
            OR: [{ id: vendorKey }, { publicId: vendorKey }],
        },
        include: { onboarding: true, documents: { orderBy: { uploadedAt: 'desc' }, take: 8 } },
    });
    if (!vendor) throw new ApiError(404, 'Vendor onboarding was not found.');
    if (!vendor.onboarding) throw new ApiError(404, 'This vendor does not have an onboarding workspace.');
    return vendor;
}

export async function getOnboarding(organizationId: string, vendorKey: string, actor?: Actor) {
    return presentOnboarding(organizationId, vendorKey, actor);
}

export async function saveIntake(organizationId: string, vendorKey: string, actor: Actor, answers: IntakeAnswer[], attest = false) {
    const vendor = await loadWorkspace(organizationId, vendorKey);
    if (!canCompleteIntake(actor.role, actor.id, vendor.businessOwnerUserId)) {
        throw new ApiError(403, 'Only the assigned business owner or a risk reviewer can complete intake.');
    }
    if (!vendor.onboarding?.intakeAssessmentId) throw new ApiError(409, 'Intake has not been opened.');
    if (vendor.onboarding.stage !== VendorOnboardingStage.INTAKE && vendor.onboarding.stage !== VendorOnboardingStage.REQUEST) {
        throw new ApiError(409, 'Intake is no longer open for this vendor.');
    }
    if (!vendor.onboarding.intakeStartedAt) {
        await prisma.vendorOnboarding.update({
            where: { vendorId: vendor.id },
            data: { intakeStartedAt: new Date() },
        });
        await writeHistory(organizationId, actor.id, 'vendor.intake_started', vendor.id, {
            summary: 'Intake started.',
        });
    }
    for (const item of answers) {
        if (!item.questionKey || item.response == null || String(item.response).trim() === '') continue;
        await vendorAssessmentService.submitResponse({
            assessmentId: vendor.onboarding.intakeAssessmentId,
            organizationId,
            vendorId: vendor.id,
            questionId: item.questionKey,
            response: String(item.response),
        }, actor.id);
    }
    await prisma.vendorAssessment.update({
        where: { id: vendor.onboarding.intakeAssessmentId },
        data: { status: AssessmentStatus.IN_PROGRESS },
    });
    if (attest) {
        return completeIntake(organizationId, vendor.id, actor);
    }
    return presentOnboarding(organizationId, vendor.id, actor);
}

async function completeIntake(organizationId: string, vendorId: string, actor: Actor) {
    const vendor = await loadWorkspace(organizationId, vendorId);
    const assessment = await vendorAssessmentService.getAssessmentById(vendor.onboarding!.intakeAssessmentId!, organizationId);
    const answers = (assessment?.responses || []).map((row) => ({ questionKey: row.questionId, response: row.response }));
    const required = ['ir_data', 'ir_access', 'ir_availability', 'ir_ai'];
    const missing = required.filter((key) => !answers.some((row) => row.questionKey === key && row.response));
    if (missing.length) throw new ApiError(400, 'Complete the inherent-risk questions before submitting intake.');
    const result = recommendTierFromIntake(answers);
    const tierReviewDueAt = addBusinessDays(new Date(), TIER_REVIEW_SLA_DAYS);
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
            inherentRiskScore: result.inherentRisk,
            residualRiskScore: result.inherentRisk,
            dataTypesAccessed: result.signals.dataTypes,
            hasSubcontractors: result.signals.fourthParty,
            geographicFootprint: vendor.country ? [vendor.country] : vendor.geographicFootprint,
        },
    });
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.TIER_REVIEW,
            intakeCompletedAt: new Date(),
            intakeAttestedAt: new Date(),
            intakeAttestedBy: actor.id,
            recommendedTier: result.recommendedTier,
            recommendedScore: result.score,
            recommendedFactors: result.factors as object[],
            hardFloors: result.hardFloors as object[],
            tierReviewDueAt,
        },
    });
    await prisma.vendorAssessment.update({
        where: { id: vendor.onboarding!.intakeAssessmentId! },
        data: { status: AssessmentStatus.COMPLETED, completedAt: new Date(), overallScore: result.inherentRisk },
    });
    await explainableRiskService.recalculate(organizationId, vendor.id);
    await writeHistory(organizationId, actor.id, 'vendor.intake_completed', vendor.id, {
        summary: 'Intake completed and attested.',
    });
    await writeHistory(organizationId, actor.id, 'vendor.inherent_risk_calculated', vendor.id, {
        summary: result.explanation,
        score: result.score,
        inherentRisk: result.inherentRisk,
    });
    await writeHistory(organizationId, actor.id, 'vendor.tier_recommended', vendor.id, {
        summary: `Supreme recommends ${TIER_LABEL[result.recommendedTier]}.`,
        recommendedTier: result.recommendedTier,
    });
    const analysts = await orgAnalysts(organizationId);
    for (const analyst of analysts) {
        await notify(
            organizationId,
            analyst.id,
            'approval.requested',
            `Confirm tier — ${vendor.name}`,
            `${vendor.publicId}: Supreme recommends ${TIER_LABEL[result.recommendedTier]}. Confirm or override by ${tierReviewDueAt.toISOString().slice(0, 10)}.`,
            vendor.id,
        );
    }
    return presentOnboarding(organizationId, vendor.id, actor);
}

export async function confirmTier(organizationId: string, vendorKey: string, actor: Actor, input: { confirm?: boolean; overrideTier?: VendorTier; reason?: string }) {
    if (!canReviewTier(actor.role)) throw new ApiError(403, 'Only a risk reviewer can confirm the recommended tier.');
    const vendor = await loadWorkspace(organizationId, vendorKey);
    if (vendor.onboarding?.stage !== VendorOnboardingStage.TIER_REVIEW) {
        throw new ApiError(409, 'This vendor is not waiting for tier confirmation.');
    }
    const recommended = vendor.onboarding.recommendedTier;
    if (!recommended) throw new ApiError(409, 'Inherent risk has not been calculated.');
    const override = input.overrideTier && input.overrideTier !== recommended;
    if (override && !String(input.reason || '').trim()) {
        throw new ApiError(400, 'An override requires a reason.');
    }
    const confirmed = override ? input.overrideTier! : recommended;
    const users = await userDirectory(organizationId, [actor.id]);
    const actorName = users.get(actor.id)?.name || actor.name || 'Analyst';
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: { tier: confirmed, criticalityLevel: confirmed === VendorTier.CRITICAL ? 'CRITICAL' : confirmed === VendorTier.HIGH ? 'HIGH' : confirmed === VendorTier.LOW ? 'LOW' : 'MEDIUM' },
    });
    const plan = await buildPlan(organizationId, vendor.id, confirmed);
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.DUE_DILIGENCE_PLAN,
            confirmedTier: confirmed,
            tierConfirmedAt: new Date(),
            tierConfirmedBy: actor.id,
            overrideReason: override ? String(input.reason).trim() : null,
            previousRecommendedTier: override ? recommended : null,
            plan: plan as object,
        },
    });
    await writeHistory(organizationId, actor.id, override ? 'vendor.tier_overridden' : 'vendor.tier_confirmed', vendor.id, {
        summary: override
            ? `Tier changed from ${TIER_LABEL[recommended]} to ${TIER_LABEL[confirmed]} by ${actorName}`
            : `${actorName} confirmed the ${TIER_LABEL[confirmed]} recommendation`,
        reason: input.reason || null,
        recommendedTier: recommended,
        confirmedTier: confirmed,
    });
    await writeHistory(organizationId, actor.id, 'vendor.plan_generated', vendor.id, {
        summary: 'Due-diligence plan generated from the confirmed tier.',
    });
    return presentOnboarding(organizationId, vendor.id, actor);
}

export async function confirmPlan(organizationId: string, vendorKey: string, actor: Actor) {
    if (!canReviewTier(actor.role)) throw new ApiError(403, 'Only a risk reviewer can confirm the due-diligence plan.');
    const vendor = await loadWorkspace(organizationId, vendorKey);
    if (vendor.onboarding?.stage !== VendorOnboardingStage.DUE_DILIGENCE_PLAN) {
        throw new ApiError(409, 'The due-diligence plan is not waiting for confirmation.');
    }
    const confirmedTier = vendor.onboarding.confirmedTier || vendor.tier;
    const plan = await buildPlan(organizationId, vendor.id, confirmedTier);
    for (const item of plan.assessments.filter((row) => row.key !== 'inherent-risk' && (row.requirement === 'Required' || row.requirement === 'Recommended'))) {
        if (!item.templateId) continue;
        try {
            await vendorAssessmentService.createAssessment({
                vendorId: vendor.id,
                organizationId,
                assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
                frameworkUsed: item.framework,
                templateId: item.templateId,
            });
        } catch (error) {
            if (!(error instanceof ApiError) || error.statusCode !== 409) throw error;
        }
    }
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.READY_TO_SEND,
            plan: plan as object,
            planConfirmedAt: new Date(),
            planConfirmedBy: actor.id,
        },
    });
    await writeHistory(organizationId, actor.id, 'vendor.plan_confirmed', vendor.id, {
        summary: 'Due-diligence plan confirmed. Ready to send to the vendor contact.',
    });
    return presentOnboarding(organizationId, vendor.id, actor);
}

async function reusableEvidence(organizationId: string, vendorId: string) {
    const documents = await prisma.vendorDocument.findMany({
        where: { organizationId, vendorId, scanStatus: { in: ['CLEAN', 'NOT_CONFIGURED'] } },
        select: { id: true, title: true, documentType: true, scanStatus: true, validUntil: true },
        take: 8,
        orderBy: { uploadedAt: 'desc' },
    });
    const links = await prisma.evidenceGovernanceLink.findMany({
        where: { organizationId },
        include: { storedObject: { select: { id: true, filename: true, scanStatus: true } } },
        take: 8,
        orderBy: { createdAt: 'desc' },
    });
    return [
        ...documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            kind: 'Vendor evidence',
            status: doc.scanStatus === 'CLEAN' ? 'Reusable' : 'Recorded',
        })),
        ...links.filter((link) => link.storedObject.scanStatus === 'CLEAN').map((link) => ({
            id: link.id,
            title: link.storedObject.filename,
            kind: 'Shared control evidence',
            status: 'Reusable',
        })),
    ];
}

async function buildPlan(organizationId: string, vendorId: string, tier: VendorTier) {
    const onboarding = await prisma.vendorOnboarding.findFirst({ where: { vendorId, organizationId } });
    const factors = Array.isArray(onboarding?.recommendedFactors) ? onboarding?.recommendedFactors : [];
    const answers = await prisma.assessmentResponse.findMany({
        where: { assessmentId: onboarding?.intakeAssessmentId || '' },
        select: { questionId: true, response: true },
    });
    const result = recommendTierFromIntake(answers.map((row) => ({ questionKey: row.questionId, response: row.response })));
    const recommendation = await recommendAssessments(organizationId, vendorId, result.signals, tier);
    const evidence = await reusableEvidence(organizationId, vendorId);
    const assessments = [...recommendation.required, ...recommendation.recommended].map((item: any) => ({
        templateId: item.id,
        key: item.key,
        name: item.name,
        requirement: item.key === 'inherent-risk' ? 'Completed' : item.requirement || 'Recommended',
        rationale: item.reason,
        expectedEvidence: item.expectedEvidence,
        reusableEvidence: evidence,
        framework: item.framework,
        version: item.version,
        questionCount: item.questionCount,
    }));
    return {
        rationale: recommendation.rationale,
        assessments,
        triggers: {
            privacy: result.signals.personalData,
            aiGovernance: result.signals.aiInvolved,
            resilience: result.signals.criticalDependency,
        },
        factors: factors.length ? factors : result.factors,
    };
}

export async function presentOnboarding(organizationId: string, vendorKey: string, actor?: Actor) {
    const vendor = await loadWorkspace(organizationId, vendorKey);
    const users = await userDirectory(organizationId, [
        vendor.requesterUserId,
        vendor.businessOwnerUserId,
        vendor.relationshipOwnerUserId,
        vendor.onboarding?.intakeAttestedBy,
        vendor.onboarding?.tierConfirmedBy,
        vendor.onboarding?.planConfirmedBy,
        actor?.id,
    ]);
    const assessment = vendor.onboarding?.intakeAssessmentId
        ? await vendorAssessmentService.getAssessmentById(vendor.onboarding.intakeAssessmentId, organizationId)
        : null;
    const template = await getLibraryTemplateByKey('inherent-risk');
    const answers = (assessment?.responses || []).map((row) => ({
        questionKey: row.questionId,
        question: row.questionText,
        category: row.questionCategory,
        response: row.response,
        questionType: template?.sections.flatMap((section) => section.questions).find((question) => question.questionKey === row.questionId)?.questionType || 'SINGLE_CHOICE',
        options: template?.sections.flatMap((section) => section.questions).find((question) => question.questionKey === row.questionId)?.options || [],
        section: template?.sections.find((section) => section.questions.some((question) => question.questionKey === row.questionId))?.title || row.questionCategory,
    }));
    const history = await prisma.auditEvent.findMany({
        where: { organizationId, resourceType: 'VendorOnboarding', resourceId: vendor.id },
        include: { actor: { select: { firstName: true, lastName: true } } },
        orderBy: { timestamp: 'asc' },
        take: 50,
    });
    const due = vendor.onboarding?.stage === VendorOnboardingStage.TIER_REVIEW
        ? vendor.onboarding.tierReviewDueAt
        : vendor.onboarding?.intakeDueAt;
    const overdue = Boolean(due && due < new Date() && vendor.onboarding?.stage !== VendorOnboardingStage.READY_TO_SEND);
    const plan = vendor.onboarding?.plan && typeof vendor.onboarding.plan === 'object'
        ? vendor.onboarding.plan
        : vendor.onboarding?.recommendedTier
            ? await buildPlan(organizationId, vendor.id, vendor.onboarding.confirmedTier || vendor.onboarding.recommendedTier)
            : null;
    return {
        id: vendor.id,
        publicId: vendor.publicId,
        name: vendor.name,
        legalName: vendor.legalName,
        website: vendor.website,
        country: vendor.country,
        servicesProvided: vendor.servicesProvided,
        businessUnit: vendor.businessUnit,
        estimatedAnnualSpend: vendor.estimatedAnnualSpend,
        targetStartDate: vendor.targetStartDate,
        status: 'Proposed',
        stage: STAGE_LABEL[vendor.onboarding!.stage],
        stageKey: vendor.onboarding!.stage,
        owner: users.get(vendor.businessOwnerUserId || '')?.name || vendor.businessOwner || 'Not assigned',
        requester: users.get(vendor.requesterUserId || '')?.name || 'Not recorded',
        relationshipOwner: users.get(vendor.relationshipOwnerUserId || '')?.name || vendor.relationshipOwner || 'Not assigned',
        dueDate: due?.toISOString() || null,
        overdue,
        nextAction: nextAction(vendor.onboarding!.stage),
        canEditIntake: actor ? canCompleteIntake(actor.role, actor.id, vendor.businessOwnerUserId) : false,
        canReviewTier: actor ? canReviewTier(actor.role) : false,
        request: {
            name: vendor.name,
            legalName: vendor.legalName,
            website: vendor.website,
            country: vendor.country,
            servicesProvided: vendor.servicesProvided,
            businessUnit: vendor.businessUnit,
            estimatedAnnualSpend: vendor.estimatedAnnualSpend,
            targetStartDate: vendor.targetStartDate,
        },
        intake: {
            sections: (template?.sections || []).map((section) => ({
                title: section.title,
                questions: section.questions.map((question) => ({
                    key: question.questionKey,
                    question: question.questionText.replace(/\n\nGuidance:.*$/s, ''),
                    guidance: question.questionText.includes('Guidance:') ? question.questionText.split('Guidance:')[1]?.trim() : null,
                    type: question.questionType,
                    options: Array.isArray(question.options) ? question.options : [],
                    response: answers.find((row) => row.questionKey === question.questionKey)?.response || '',
                })),
            })),
            attestedAt: vendor.onboarding?.intakeAttestedAt,
            completed: Boolean(vendor.onboarding?.intakeCompletedAt),
        },
        tierReview: vendor.onboarding?.recommendedTier ? {
            recommendedTier: TIER_LABEL[vendor.onboarding.recommendedTier],
            recommendedTierKey: vendor.onboarding.recommendedTier,
            confirmedTier: vendor.onboarding.confirmedTier ? TIER_LABEL[vendor.onboarding.confirmedTier] : null,
            score: vendor.onboarding.recommendedScore,
            maxScore: 30,
            explanation: `Supreme recommends ${TIER_LABEL[vendor.onboarding.recommendedTier]}${vendor.onboarding.recommendedScore != null ? ` from the recorded intake score of ${vendor.onboarding.recommendedScore} of 30` : ''}.`,
            factors: vendor.onboarding.recommendedFactors,
            hardFloors: vendor.onboarding.hardFloors,
            overrideReason: vendor.onboarding.overrideReason,
            confirmedBy: users.get(vendor.onboarding.tierConfirmedBy || '')?.name || null,
        } : null,
        plan,
        history: history.map((event) => ({
            at: event.timestamp,
            title: HISTORY_ACTIONS[event.action] || event.action.replace(/[._]/g, ' '),
            detail: typeof event.metadata === 'object' && event.metadata && 'summary' in event.metadata
                ? String((event.metadata as { summary?: string }).summary || '')
                : `${event.actor ? `${event.actor.firstName} ${event.actor.lastName}`.trim() : 'Supreme'} recorded this step.`,
        })),
    };
}

export async function scanOnboardingAttention(now = new Date()) {
    const rows = await prisma.vendorOnboarding.findMany({
        where: {
            stage: { in: [VendorOnboardingStage.INTAKE, VendorOnboardingStage.TIER_REVIEW] },
            OR: [
                { intakeDueAt: { lte: now } },
                { tierReviewDueAt: { lte: now } },
            ],
        },
        include: { vendor: { select: { id: true, name: true, publicId: true, businessOwnerUserId: true, organizationId: true } } },
        take: 50,
    });
    for (const row of rows) {
        const already = await prisma.inAppNotification.findFirst({
            where: { organizationId: row.organizationId, resourceId: row.vendorId, eventType: { in: ['assessment.overdue', 'approval.requested'] } },
        });
        if (already) continue;
        if (row.stage === VendorOnboardingStage.INTAKE && row.vendor.businessOwnerUserId) {
            await notify(
                row.organizationId,
                row.vendor.businessOwnerUserId,
                'assessment.overdue',
                `Intake overdue — ${row.vendor.name}`,
                `${row.vendor.publicId} intake is overdue. Complete vendor intake so Supreme can recommend a tier.`,
                row.vendorId,
            );
            const analysts = await orgAnalysts(row.organizationId);
            for (const analyst of analysts.slice(0, 5)) {
                await notify(
                    row.organizationId,
                    analyst.id,
                    'assessment.overdue',
                    `Escalate intake — ${row.vendor.name}`,
                    `${row.vendor.publicId} intake is overdue.`,
                    row.vendorId,
                );
            }
        }
        if (row.stage === VendorOnboardingStage.TIER_REVIEW) {
            const analysts = await orgAnalysts(row.organizationId);
            for (const analyst of analysts.slice(0, 8)) {
                await notify(
                    row.organizationId,
                    analyst.id,
                    'approval.requested',
                    `Tier review overdue — ${row.vendor.name}`,
                    `${row.vendor.publicId} is waiting for tier confirmation.`,
                    row.vendorId,
                );
            }
        }
        await prisma.vendorOnboarding.update({
            where: { id: row.id },
            data: { lastReminderAt: now, reminderCount: { increment: 1 } },
        });
    }
    return rows.length;
}
