import { AssessmentStatus, AssessmentType, Prisma, VendorOnboardingStage, VendorStatus, VendorTier, VendorType } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { canonicalizeRole, canonicalRoleIn } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { explainableRiskService } from './explainableRiskService';
import { notifyUser, type NotificationEvent } from './notificationDeliveryService';
import { customerAppUrl, tierReviewEmail, vendorIntakeAssignedEmail } from './transactionalEmail';
import { getLibraryTemplateByKey, recommendAssessments } from './questionnaireLibrary';
import vendorAssessmentService from './vendorAssessmentService';
import {
    addBusinessDays,
    describeUnresolvedScope,
    extractVendorDomain,
    formatVendorPublicId,
    missingCanonicalIntake,
    namesLikelyDuplicate,
    recommendTierFromIntake,
    type IntakeAnswer,
} from './vendorOnboardingScoring';
import {
    analystDecisionsFromCustomization,
    deriveQuestionnairePlan,
    missingScopeQuestions,
    type AnalystPackDecision,
    type QuestionnairePlan,
} from '../tprm/packDerivation';
import {
    loadWorkbookCatalog,
    workbookPackCounts,
} from '../tprm/workbookCatalog';
import { assertTierMeetsFloor, parseVendorTier, resolveMinimumTier } from './vendorTierIntegrity';
import { IRA_QUESTIONS } from '../tprm/iraCatalog';
import { scoreIra } from '../tprm/iraScoring';

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
    REMEDIATION: 'Remediation',
    RISK_ACCEPTANCE: 'Risk acceptance',
    CONTRACT_REVIEW: 'Contract review',
    APPROVAL: 'Approval',
    ACTIVE: 'Active',
    REASSESSMENT: 'Reassessment',
    OFFBOARDING: 'Offboarding',
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
    'vendor.ira_sent': 'Requester IRA sent',
    'vendor.ira_opened': 'Requester IRA opened',
    'vendor.ira_submitted': 'Requester IRA submitted',
    'vendor.intake_started': 'Intake started',
    'vendor.intake_completed': 'Intake completed',
    'vendor.inherent_risk_calculated': 'Inherent risk calculated',
    'vendor.tier_recommended': 'Tier recommended',
    'vendor.tier_confirmed': 'Tier confirmed',
    'vendor.tier_overridden': 'Tier overridden',
    'vendor.plan_generated': 'Due-diligence plan generated',
    'vendor.plan_confirmed': 'Due-diligence plan confirmed',
    'vendor.plan_customized': 'Due-diligence package customized',
    'vendor.due_diligence_sent': 'Due diligence sent',
    'vendor.secure_link_copied': 'Secure invitation link copied',
    'vendor.secure_link_marked_shared': 'Secure invitation marked as shared',
    'vendor.access_activated': 'Vendor started assessment',
    'vendor.assessment_submitted': 'Vendor submitted assessment',
    'vendor.draft_findings_generated': 'Draft findings generated',
    'vendor.finding_confirmed': 'Finding confirmed',
    'vendor.finding_adjusted': 'Finding adjusted',
    'vendor.finding_dismissed': 'Finding dismissed',
    'vendor.clarification_requested': 'Clarification requested',
    'vendor.remediation_planned': 'Remediation assigned',
    'vendor.remediation_validated': 'Remediation validated',
    'vendor.finding_closed': 'Finding closed',
    'vendor.risk_accepted': 'Risk accepted',
    'vendor.contract_attested': 'Contract attested',
    'vendor.approval_decided': 'Approval decided',
    'vendor.activated': 'Vendor activated',
    'vendor.reassessment_started': 'Reassessment started',
    'vendor.offboarding_started': 'Offboarding started',
};

const MILESTONE_ACTIONS = new Set([
    'vendor.requested',
    'vendor.ira_sent',
    'vendor.ira_submitted',
    'vendor.intake_completed',
    'vendor.tier_confirmed',
    'vendor.tier_overridden',
    'vendor.plan_confirmed',
    'vendor.plan_customized',
    'vendor.due_diligence_sent',
    'vendor.secure_link_copied',
    'vendor.assessment_submitted',
    'vendor.finding_confirmed',
    'vendor.risk_accepted',
    'vendor.contract_attested',
    'vendor.approval_decided',
    'vendor.activated',
    'vendor.reassessment_started',
    'vendor.offboarding_started',
]);

export type Actor = { id: string; role: string; name?: string };

function canRequest(role: string) {
    return canonicalRoleIn(role, ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR', 'BUSINESS_OWNER']);
}

function canCompleteIntake(role: string, actorId: string, ownerId?: string | null) {
    if (ownerId && actorId === ownerId) return true;
    return canonicalRoleIn(role, ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR']);
}

function canReviewTier(role: string) {
    return canonicalRoleIn(role, ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR']);
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
    return users.filter((user) => canonicalRoleIn(user.role, ['ORGANIZATION_ADMIN', 'RISK_MANAGER', 'ASSESSOR']));
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

async function notify(
    organizationId: string,
    userId: string | null | undefined,
    eventType: NotificationEvent,
    title: string,
    body: string,
    vendorId: string,
    email?: { emailBody?: string; emailHtml?: string; fromName?: string }
) {
    if (!userId) return;
    await notifyUser({
        organizationId,
        userId,
        eventType,
        title,
        body,
        resourceType: 'VendorOnboarding',
        resourceId: vendorId,
        emailBody: email?.emailBody,
        emailHtml: email?.emailHtml,
        fromName: email?.fromName,
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
    requesterName?: string;
    requesterEmail?: string;
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
            intakeDueAt: input.requesterEmail ? null : intakeDueAt,
            requesterName: String(input.requesterName || '').trim() || null,
            requesterEmail: String(input.requesterEmail || '').trim().toLowerCase() || null,
            engagementPublicId: `ENG-${publicId.replace('VND-', '')}-01`,
            screeningStatus: 'CLEAR',
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
        if (!input.requesterEmail) {
            const intakeMail = vendorIntakeAssignedEmail({
                vendorName: name,
                publicId,
                requesterName: actor.name || 'A colleague',
                dueAt: intakeDueAt,
                ctaUrl: customerAppUrl(`/vendor-onboarding/${publicId}`),
            });
            await notify(
                organizationId,
                owner.userId,
                'assessment.assigned',
                intakeMail.subject,
                intakeMail.text,
                vendor.id,
                { emailBody: intakeMail.text, emailHtml: intakeMail.html, fromName: intakeMail.fromName },
            );
        }
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

function summarize(row: {
    stage: VendorOnboardingStage;
    intakeDueAt: Date | null;
    tierReviewDueAt: Date | null;
    requesterEmail?: string | null;
    intakeCompletedAt?: Date | null;
    iraAnswers?: unknown;
    vendor: { id: string; publicId: string | null; name: string; businessOwner: string | null; businessOwnerUserId: string | null; requesterUserId: string | null };
}, users: Map<string, { name: string }>) {
    const owner = row.vendor.businessOwnerUserId ? users.get(row.vendor.businessOwnerUserId)?.name : row.vendor.businessOwner;
    return {
        id: row.vendor.id,
        publicId: row.vendor.publicId,
        name: row.vendor.name,
        stage: STAGE_LABEL[row.stage],
        stageKey: row.stage,
        owner: owner || 'Not assigned',
        dueDate: (row.stage === VendorOnboardingStage.TIER_REVIEW ? row.tierReviewDueAt : row.intakeDueAt)?.toISOString() || null,
        nextAction: nextAction(row.stage, {
            required: Boolean(row.requesterEmail),
            sent: Boolean(row.intakeDueAt),
            submitted: Boolean(row.intakeCompletedAt && row.iraAnswers),
        }),
    };
}

function nextAction(stage: VendorOnboardingStage, ira?: { required?: boolean; sent?: boolean; submitted?: boolean }) {
    if ((stage === VendorOnboardingStage.REQUEST || stage === VendorOnboardingStage.INTAKE) && ira?.required && !ira.submitted) {
        return ira.sent ? 'Wait for the requester to complete the inherent-risk form' : 'Send the inherent-risk form';
    }
    switch (stage) {
        case VendorOnboardingStage.REQUEST:
        case VendorOnboardingStage.INTAKE:
            return 'Complete vendor intake';
        case VendorOnboardingStage.TIER_REVIEW:
            return 'Confirm recommended tier';
        case VendorOnboardingStage.DUE_DILIGENCE_PLAN:
            return 'Confirm due-diligence plan';
        case VendorOnboardingStage.READY_TO_SEND:
            return 'Send the questionnaire to the vendor';
        case VendorOnboardingStage.AWAITING_VENDOR:
            return 'Waiting for the vendor to start';
        case VendorOnboardingStage.VENDOR_IN_PROGRESS:
            return 'Vendor is completing assigned assessments';
        case VendorOnboardingStage.SUBMITTED:
            return 'Review the vendor submission';
        case VendorOnboardingStage.UNDER_REVIEW:
            return 'Confirm or dismiss draft findings';
        case VendorOnboardingStage.REMEDIATION:
            return 'Assign, validate, and close findings';
        case VendorOnboardingStage.RISK_ACCEPTANCE:
            return 'Record time-bounded risk acceptance';
        case VendorOnboardingStage.CONTRACT_REVIEW:
            return 'Attest required contract controls';
        case VendorOnboardingStage.APPROVAL:
            return 'Approve, reject, or approve with conditions';
        case VendorOnboardingStage.ACTIVE:
            return 'Monitor the active third party';
        case VendorOnboardingStage.REASSESSMENT:
            return 'Complete the recommended reassessment';
        case VendorOnboardingStage.OFFBOARDING:
            return 'Finish offboarding and retain records';
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
    const missing = missingCanonicalIntake(answers);
    if (missing.length) throw new ApiError(400, `Complete the inherent-risk questions before submitting intake. Still needed: ${missing.map((key) => key.toUpperCase().replace('_', '-')).join(', ')}.`);
    const result = recommendTierFromIntake(answers);
    const templateHasScope = (assessment?.responses || []).some((row) => String(row.questionId || '').startsWith('scope_'));
    if (templateHasScope) {
        const missingScope = missingScopeQuestions(answers);
        if (missingScope.length) {
            throw new ApiError(400, `Complete the seven internal scope questions before submitting intake. Still needed: ${missingScope.length}.`);
        }
    }
    const tierReviewDueAt = addBusinessDays(new Date(), TIER_REVIEW_SLA_DAYS);
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
            inherentRiskScore: result.inherentRisk,
            residualRiskScore: result.inherentRisk,
            tier: result.recommendedTier,
            criticalityLevel: result.recommendedTier === VendorTier.CRITICAL ? 'CRITICAL' : result.recommendedTier === VendorTier.HIGH ? 'HIGH' : result.recommendedTier === VendorTier.LOW ? 'LOW' : 'MEDIUM',
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
        const tierMail = tierReviewEmail({
            vendorName: vendor.name,
            publicId: vendor.publicId,
            recommendedTier: TIER_LABEL[result.recommendedTier],
            dueAt: tierReviewDueAt,
            ctaUrl: customerAppUrl(`/vendor-onboarding/${vendor.publicId}`),
        });
        await notify(
            organizationId,
            analyst.id,
            'approval.requested',
            tierMail.subject,
            tierMail.text,
            vendor.id,
            { emailBody: tierMail.text, emailHtml: tierMail.html, fromName: tierMail.fromName },
        );
    }
    return presentOnboarding(organizationId, vendor.id, actor);
}

function applyIraPackCustomization(packs: QuestionnairePlan, customization: {
    includeKeys?: string[];
    excludeKeys?: string[];
    packDecisions?: AnalystPackDecision[];
    reason?: string;
    actorId?: string;
} = {}): QuestionnairePlan {
    const decisions = analystDecisionsFromCustomization({
        includeKeys: customization.includeKeys,
        excludeKeys: customization.excludeKeys,
        packDecisions: customization.packDecisions,
        reason: customization.reason,
        actorId: customization.actorId,
    });
    if (!decisions.length) return packs;
    const byKey = Object.fromEntries(decisions.filter((row) => row?.key).map((row) => [row.key, row]));
    const next = packs.packs.map((pack) => {
        const decision = byKey[pack.key] || byKey[pack.templateKey];
        if (!decision || (decision.state !== 'INCLUDED' && decision.state !== 'EXCLUDED')) return pack;
        if (pack.key === 'baseline' && decision.state === 'EXCLUDED') return pack;
        return {
            ...pack,
            state: decision.state === 'EXCLUDED' ? 'EXCLUDED' as const : 'INCLUDED' as const,
            analystDecision: decision,
            reason: `${pack.reason}. Analyst ${decision.state === 'EXCLUDED' ? 'excluded' : 'included'} this pack${decision.reason ? `: ${decision.reason}` : ''}.`,
        };
    });
    const included = next.filter((row) => row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED');
    return {
        ...packs,
        packs: next,
        includedPackKeys: included.map((row) => row.key),
        includedTemplateKeys: included.map((row) => row.templateKey),
        includedQuestionCount: included.reduce((sum, row) => sum + (Number(row.questionCount) || 0), 0),
        confirmScopeCount: 0,
        sendBlocked: false,
        sendBlockMessage: '',
    };
}

async function buildIraPlan(organizationId: string, vendorId: string, confirmed: VendorTier, customization: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
    actorId?: string;
    packDecisions?: AnalystPackDecision[];
} = {}) {
    const onboarding = await prisma.vendorOnboarding.findFirst({ where: { vendorId, organizationId } });
    const answers = onboarding?.iraAnswers && typeof onboarding.iraAnswers === 'object'
        ? onboarding.iraAnswers as Record<string, string>
        : {};
    const payload = IRA_QUESTIONS.map((question) => ({ questionKey: question.key, response: answers[question.key] || '' }));
    const rating = onboarding?.externalRating && typeof onboarding.externalRating === 'object'
        ? onboarding.externalRating as { provider?: string; grade?: string; score?: number | null; assessedAt?: string }
        : null;
    const scored = scoreIra(payload, { externalRating: rating });
    const catalog = loadWorkbookCatalog();
    const baselineCount = Number(workbookPackCounts(catalog).baseline) || 45;
    let packs = scored.packs;
    if (confirmed !== VendorTier.LOW) {
        packs = {
            ...packs,
            packs: packs.packs.map((row) => row.key === 'baseline'
                ? { ...row, questionCount: baselineCount, reason: 'Full Baseline for Medium and above' }
                : row),
            includedQuestionCount: packs.packs.reduce((sum, row) => {
                const count = row.key === 'baseline' ? baselineCount : row.questionCount;
                return row.state === 'INCLUDED' || row.state === 'INCLUDED_REQUIRED' ? sum + count : sum;
            }, 0),
        };
    }
    packs = applyIraPackCustomization(packs, customization);
    if (!scored.ready) {
        return {
            rationale: scored.message,
            catalogVersion: packs.catalogVersion,
            questionnairePlan: { ...packs, sendBlocked: true, sendBlockMessage: scored.message },
            analystDecisions: analystDecisionsFromCustomization(customization),
            ira: scored,
            assessments: [],
            unresolved: [{ code: 'IRA', message: scored.message }],
            triggers: { privacy: scored.signals.privacyPack, aiGovernance: scored.signals.aiInvolved, resilience: false },
            factors: scored.factors,
        };
    }
    const recommendation = await recommendAssessments(organizationId, vendorId, {
        personalData: scored.signals.personalData,
        aiInvolved: scored.signals.aiInvolved,
        requiredTemplateKeys: packs.includedTemplateKeys,
        packReasons: Object.fromEntries(packs.packs.map((pack) => [pack.templateKey, [pack.reason]])),
    }, confirmed);
    const evidence = await reusableEvidence(organizationId, vendorId);
    const assessments = [...recommendation.required, ...recommendation.recommended].map((item: any) => ({
        templateId: item.id,
        key: item.key,
        name: item.name,
        packName: packs.packs.find((row) => row.templateKey === item.key)?.name || item.name,
        requirement: item.requirement || 'Required',
        rationale: item.reason,
        why: [packs.packs.find((row) => row.templateKey === item.key)?.reason || item.reason],
        expectedEvidence: item.expectedEvidence,
        reusableEvidence: evidence,
        framework: item.framework,
        version: item.version,
        questionCount: item.questionCount,
    }));
    return {
        rationale: scored.explanation,
        catalogVersion: packs.catalogVersion,
        questionnairePlan: packs,
        analystDecisions: analystDecisionsFromCustomization(customization),
        ira: scored,
        scopeAnswers: Object.fromEntries(packs.packs.map((pack) => [pack.key, pack.originalScopeAnswer])),
        package: {
            required: packs.packs.filter((pack) => pack.state === 'INCLUDED' || pack.state === 'INCLUDED_REQUIRED'),
            recommended: [],
        },
        unresolved: [],
        override: customization.includeKeys?.length || customization.excludeKeys?.length || customization.packDecisions?.length
            ? {
                reason: String(customization.reason || '').trim(),
                includeKeys: customization.includeKeys || [],
                excludeKeys: customization.excludeKeys || [],
                packDecisions: analystDecisionsFromCustomization(customization),
                at: new Date().toISOString(),
            }
            : null,
        assessments,
        triggers: {
            privacy: scored.signals.privacyPack,
            aiGovernance: scored.signals.aiInvolved,
            resilience: false,
        },
        factors: scored.factors,
    };
}

async function composeReadyPlan(organizationId: string, vendorId: string, confirmed: VendorTier, customization: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
    actorId?: string;
    packDecisions?: AnalystPackDecision[];
} = {}) {
    const onboarding = await prisma.vendorOnboarding.findFirst({ where: { vendorId, organizationId } });
    const iraAnswers = onboarding?.iraAnswers && typeof onboarding.iraAnswers === 'object'
        ? onboarding.iraAnswers as Record<string, string>
        : null;
    if (iraAnswers && Object.keys(iraAnswers).length) {
        return buildIraPlan(organizationId, vendorId, confirmed, customization);
    }
    return buildPlan(organizationId, vendorId, confirmed, customization);
}

async function createAssessmentsFromPlan(organizationId: string, vendorId: string, plan: { assessments?: Array<{ key?: string; requirement?: string; framework?: string; templateId?: string }> }) {
    for (const item of (plan.assessments || []).filter((row) => row.key !== 'inherent-risk' && (row.requirement === 'Required' || row.requirement === 'Recommended'))) {
        if (!item.templateId) continue;
        try {
            await vendorAssessmentService.createAssessment({
                vendorId,
                organizationId,
                assessmentType: AssessmentType.INITIAL_DUE_DILIGENCE,
                frameworkUsed: item.framework,
                templateId: item.templateId,
            });
        } catch (error) {
            if (!(error instanceof ApiError) || error.statusCode !== 409) throw error;
        }
    }
}

export async function materializeReadyPlan(organizationId: string, vendorId: string, actorId?: string | null) {
    const vendor = await loadWorkspace(organizationId, vendorId);
    const confirmed = vendor.onboarding?.confirmedTier;
    if (!confirmed) return null;
    const plan = await composeReadyPlan(organizationId, vendor.id, confirmed);
    if (plan.questionnairePlan?.sendBlocked) return plan;
    await createAssessmentsFromPlan(organizationId, vendor.id, plan);
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.READY_TO_SEND,
            plan: plan as object,
            planConfirmedAt: vendor.onboarding.planConfirmedAt || new Date(),
            planConfirmedBy: vendor.onboarding.planConfirmedBy || actorId || undefined,
        },
    });
    return plan;
}

export async function confirmTier(organizationId: string, vendorKey: string, actor: Actor, input: { confirm?: boolean; overrideTier?: VendorTier; reason?: string }) {
    if (!canReviewTier(actor.role)) throw new ApiError(403, 'Only a risk reviewer can confirm the recommended tier.');
    const vendor = await loadWorkspace(organizationId, vendorKey);
    if (vendor.onboarding?.stage !== VendorOnboardingStage.TIER_REVIEW) {
        throw new ApiError(409, 'This vendor is not waiting for tier confirmation.');
    }
    const recommended = vendor.onboarding.recommendedTier;
    if (!recommended) throw new ApiError(409, 'Not yet rated — answers still need confirmation. Questionnaire send stays blocked.');
    const requestedOverride = parseVendorTier(input.overrideTier);
    if (input.overrideTier && !requestedOverride) {
        throw new ApiError(400, 'Override tier must be Critical, High, Medium, or Low.');
    }
    const override = requestedOverride && requestedOverride !== recommended;
    if (override && !String(input.reason || '').trim()) {
        throw new ApiError(400, 'An override requires a reason.');
    }
    const minimum = resolveMinimumTier({
        hardFloors: Array.isArray(vendor.onboarding.hardFloors) ? vendor.onboarding.hardFloors as Array<{ applies?: boolean }> : [],
        dataTypesAccessed: vendor.dataTypesAccessed,
    });
    const confirmed = assertTierMeetsFloor(override ? requestedOverride! : recommended, minimum);
    const users = await userDirectory(organizationId, [actor.id]);
    const actorName = users.get(actor.id)?.name || actor.name || 'Analyst';
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
            tier: confirmed,
            inherentRiskScore: vendor.onboarding.recommendedScore ?? vendor.inherentRiskScore,
            criticalityLevel: confirmed === VendorTier.CRITICAL ? 'CRITICAL' : confirmed === VendorTier.HIGH ? 'HIGH' : confirmed === VendorTier.LOW ? 'LOW' : 'MEDIUM',
        },
    });
    const plan = await composeReadyPlan(organizationId, vendor.id, confirmed);
    const sendBlocked = Boolean(plan.questionnairePlan?.sendBlocked);
    if (!sendBlocked) {
        await createAssessmentsFromPlan(organizationId, vendor.id, plan);
    }
    const now = new Date();
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: sendBlocked ? VendorOnboardingStage.DUE_DILIGENCE_PLAN : VendorOnboardingStage.READY_TO_SEND,
            confirmedTier: confirmed,
            tierConfirmedAt: now,
            tierConfirmedBy: actor.id,
            planConfirmedAt: sendBlocked ? null : now,
            planConfirmedBy: sendBlocked ? null : actor.id,
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
    await writeHistory(organizationId, actor.id, sendBlocked ? 'vendor.plan_generated' : 'vendor.plan_confirmed', vendor.id, {
        summary: sendBlocked
            ? 'Due-diligence plan generated. Packs still need scope confirmation before send.'
            : 'Tier confirmed. Questionnaire is ready to send to the vendor.',
    });
    await explainableRiskService.recalculate(organizationId, vendor.id);
    return presentOnboarding(organizationId, vendor.id, actor);
}

export async function confirmPlan(organizationId: string, vendorKey: string, actor: Actor, input: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
    packDecisions?: AnalystPackDecision[];
} = {}) {
    if (!canReviewTier(actor.role)) throw new ApiError(403, 'Only a risk reviewer can confirm the due-diligence plan.');
    const vendor = await loadWorkspace(organizationId, vendorKey);
    const planStages: VendorOnboardingStage[] = [VendorOnboardingStage.DUE_DILIGENCE_PLAN, VendorOnboardingStage.READY_TO_SEND];
    if (!vendor.onboarding?.stage || !planStages.includes(vendor.onboarding.stage)) {
        throw new ApiError(409, 'The due-diligence plan is not waiting for confirmation.');
    }
    const confirmedTier = vendor.onboarding.confirmedTier || vendor.tier;
    const plan = await composeReadyPlan(organizationId, vendor.id, confirmedTier, { ...input, actorId: actor.id });
    if (plan.questionnairePlan?.sendBlocked) {
        throw new ApiError(409, plan.questionnairePlan.sendBlockMessage);
    }
    await createAssessmentsFromPlan(organizationId, vendor.id, plan);
    const customized = Boolean(input.includeKeys?.length || input.excludeKeys?.length || input.packDecisions?.length);
    await prisma.vendorOnboarding.update({
        where: { vendorId: vendor.id },
        data: {
            stage: VendorOnboardingStage.READY_TO_SEND,
            plan: plan as object,
            planConfirmedAt: new Date(),
            planConfirmedBy: actor.id,
        },
    });
    await writeHistory(organizationId, actor.id, customized ? 'vendor.plan_customized' : 'vendor.plan_confirmed', vendor.id, {
        summary: customized
            ? `Due-diligence package customized. ${String(input.reason || '').trim()}`
            : 'Due-diligence package confirmed. Ready to send to the vendor contact.',
        reason: input.reason || null,
        includeKeys: input.includeKeys || [],
        excludeKeys: input.excludeKeys || [],
        packDecisions: input.packDecisions || [],
        originalScopeAnswers: (plan as { questionnairePlan?: { packs?: unknown } }).questionnairePlan?.packs || [],
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

async function buildPlan(organizationId: string, vendorId: string, tier: VendorTier, customization: {
    includeKeys?: string[];
    excludeKeys?: string[];
    reason?: string;
    actorName?: string;
    actorId?: string;
    packDecisions?: AnalystPackDecision[];
} = {}) {
    const onboarding = await prisma.vendorOnboarding.findFirst({ where: { vendorId, organizationId } });
    const factors = Array.isArray(onboarding?.recommendedFactors) ? onboarding?.recommendedFactors : [];
    const answers = await prisma.assessmentResponse.findMany({
        where: { assessmentId: onboarding?.intakeAssessmentId || '' },
        select: { questionId: true, response: true },
    });
    const result = recommendTierFromIntake(answers.map((row) => ({ questionKey: row.questionId, response: row.response })));
    const persistedDecisions = Array.isArray((onboarding?.plan as { analystDecisions?: AnalystPackDecision[] } | null)?.analystDecisions)
        ? (onboarding?.plan as { analystDecisions?: AnalystPackDecision[] }).analystDecisions || []
        : [];
    const analystDecisions = analystDecisionsFromCustomization({
        includeKeys: customization.includeKeys,
        excludeKeys: customization.excludeKeys,
        packDecisions: customization.packDecisions?.length ? customization.packDecisions : persistedDecisions,
        reason: customization.reason,
        actorId: customization.actorId,
    });
    const questionnairePlan = deriveQuestionnairePlan(
        answers.map((row) => ({ questionKey: row.questionId, response: row.response })),
        analystDecisions,
        workbookPackCounts(loadWorkbookCatalog()),
        loadWorkbookCatalog().catalogVersion,
        result.packs.required.concat(result.packs.unresolved.map((row) => ({ key: row.packKey, name: row.packName } as any))).map((row: any) => ({
            key: row.key || row.packKey,
            included: result.packs.required.some((pack) => pack.key === (row.key || row.packKey)),
            unresolved: result.packs.unresolved.some((pack) => pack.packKey === (row.key || row.packKey)),
            reason: row.reason || row.question || result.packs.required.find((pack) => pack.key === (row.key || row.packKey))?.why.join(' ') || 'Confirm whether this pack applies.',
        })),
    );
    const recommendedKeys = questionnairePlan.includedTemplateKeys;
    const extraKeys: string[] = [];
    const exclude = new Set(customization.excludeKeys || []);
    const include = new Set(recommendedKeys.filter((key) => !exclude.has(key)));
    const customized = Boolean(customization.includeKeys?.length || customization.excludeKeys?.length || customization.packDecisions?.length);
    if (customized && !String(customization.reason || '').trim()) {
        throw new ApiError(400, 'Customizing the recommended package requires a reason.');
    }
    const packReasons: Record<string, string[]> = {};
    for (const pack of questionnairePlan.packs) {
        packReasons[pack.templateKey] = [pack.reason];
    }
    const recommendation = await recommendAssessments(organizationId, vendorId, {
        ...result.signals,
        requiredTemplateKeys: [...include],
        recommendedTemplateKeys: extraKeys,
        packReasons,
    }, tier);
    const evidence = await reusableEvidence(organizationId, vendorId);
    const assessments = [...recommendation.required, ...recommendation.recommended].map((item: any) => ({
        templateId: item.id,
        key: item.key,
        name: item.name,
        packName: result.packs.required.concat(result.packs.recommended).find((row) => row.templateKey === item.key)?.name || item.name,
        requirement: item.key === 'inherent-risk' ? 'Completed' : item.requirement || 'Recommended',
        rationale: item.reason,
        why: packReasons[item.key] || [item.reason],
        expectedEvidence: item.expectedEvidence,
        reusableEvidence: evidence,
        framework: item.framework,
        version: item.version,
        questionCount: item.questionCount,
    }));
    return {
        rationale: 'Supreme prepared this questionnaire from the third party\'s intake and inherent-risk assessment. Review the recommended scope before sending it.',
        catalogVersion: questionnairePlan.catalogVersion,
        questionnairePlan,
        analystDecisions,
        scopeAnswers: Object.fromEntries(
            questionnairePlan.packs.map((pack) => [pack.key, pack.originalScopeAnswer])
        ),
        package: {
            required: questionnairePlan.packs.filter((pack) => pack.state === 'INCLUDED' || pack.state === 'INCLUDED_REQUIRED'),
            recommended: [],
        },
        unresolved: describeUnresolvedScope(result.packs.unresolved),
        override: customized ? {
            reason: String(customization.reason).trim(),
            includeKeys: customization.includeKeys || [],
            excludeKeys: customization.excludeKeys || [],
            packDecisions: analystDecisions,
            at: new Date().toISOString(),
        } : null,
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
    const iraLink = await prisma.requesterTaskLink.findFirst({
        where: { organizationId, vendorId: vendor.id, purpose: 'IRA' },
        orderBy: { createdAt: 'desc' },
    }).catch(() => null);
    const liveRecommendation = recommendTierFromIntake((assessment?.responses || []).map((row) => ({
        questionKey: row.questionId,
        response: row.response,
    })));
    const unresolvedScope = vendor.onboarding?.iraAnswers
        ? (vendor.onboarding.iraUnknownCount
            ? [{ code: 'IRA', message: `Not yet rated — ${vendor.onboarding.iraUnknownCount} answer${vendor.onboarding.iraUnknownCount === 1 ? '' : 's'} need confirmation.` }]
            : [])
        : describeUnresolvedScope(liveRecommendation.packs.unresolved);
    const plan = vendor.onboarding?.plan && typeof vendor.onboarding.plan === 'object'
        ? vendor.onboarding.plan
        : vendor.onboarding?.recommendedTier
            ? await buildPlan(organizationId, vendor.id, vendor.onboarding.confirmedTier || vendor.onboarding.recommendedTier)
            : null;
    return {
        id: vendor.id,
        publicId: vendor.publicId,
        name: vendor.name,
        tier: vendor.onboarding?.confirmedTier
            ? TIER_LABEL[vendor.onboarding.confirmedTier]
            : vendor.onboarding?.recommendedTier
                ? `${TIER_LABEL[vendor.onboarding.recommendedTier]} recommended`
                : 'Not confirmed',
        tierKey: vendor.onboarding?.confirmedTier || null,
        tierAuthoritative: Boolean(vendor.onboarding?.confirmedTier),
        inherentRiskScore: vendor.inherentRiskScore,
        residualRiskScore: vendor.residualRiskScore,
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
        nextAction: vendor.onboarding!.stage === VendorOnboardingStage.TIER_REVIEW && !vendor.onboarding?.recommendedTier
            ? `Not yet rated — ${vendor.onboarding?.iraUnknownCount || 0} answers need confirmation.`
            : nextAction(vendor.onboarding!.stage, {
            required: Boolean(vendor.onboarding?.requesterEmail),
            sent: Boolean(iraLink?.emailSentAt || iraLink?.markedSentAt),
            submitted: Boolean(vendor.onboarding?.intakeCompletedAt && vendor.onboarding?.iraAnswers),
        }),
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
        requesterName: vendor.onboarding?.requesterName || users.get(vendor.requesterUserId || '')?.name || null,
        requesterEmail: vendor.onboarding?.requesterEmail || null,
        engagementPublicId: vendor.onboarding?.engagementPublicId || null,
        screeningStatus: vendor.onboarding?.screeningStatus || 'CLEAR',
        ira: {
            required: Boolean(vendor.onboarding?.requesterEmail),
            status: vendor.onboarding?.intakeCompletedAt && vendor.onboarding?.iraAnswers
                ? 'IRA_SUBMITTED'
                : iraLink?.status === 'OPENED' && vendor.onboarding?.iraAnswers && Object.keys(vendor.onboarding.iraAnswers as object).length
                    ? 'IRA_IN_PROGRESS'
                    : iraLink?.openedAt || iraLink?.status === 'OPENED'
                        ? 'IRA_OPENED'
                        : iraLink?.emailSentAt || iraLink?.markedSentAt
                            ? 'IRA_SENT'
                            : 'IRA_NOT_SENT',
            sent: Boolean(iraLink?.emailSentAt || iraLink?.markedSentAt),
            submitted: Boolean(vendor.onboarding?.intakeCompletedAt && vendor.onboarding?.iraAnswers),
            sentAt: iraLink?.emailSentAt || iraLink?.markedSentAt || null,
            openedAt: iraLink?.openedAt || null,
            submittedAt: iraLink?.submittedAt || vendor.onboarding?.intakeCompletedAt || null,
            unknownCount: vendor.onboarding?.iraUnknownCount || 0,
            unknownMessage: vendor.onboarding?.iraUnknownCount
                ? `Not yet rated — ${vendor.onboarding.iraUnknownCount} answer${vendor.onboarding.iraUnknownCount === 1 ? '' : 's'} need confirmation.`
                : null,
            answers: vendor.onboarding?.iraAnswers && typeof vendor.onboarding.iraAnswers === 'object' ? vendor.onboarding.iraAnswers : {},
            questions: IRA_QUESTIONS.map((question) => ({ key: question.key, part: question.part, question: question.question, options: question.options })),
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
            maxScore: 3,
            explanation: vendor.onboarding.iraAnswers
                ? `Supreme recommends ${TIER_LABEL[vendor.onboarding.recommendedTier]}${vendor.onboarding.recommendedScore != null ? ` from inherent-risk score ${vendor.onboarding.recommendedScore}%` : ''}.`
                : `Supreme recommends ${TIER_LABEL[vendor.onboarding.recommendedTier]}${vendor.onboarding.recommendedScore != null ? ` from the recorded inherent-risk average of ${vendor.onboarding.recommendedScore} of 3` : ''}.`,
            factors: vendor.onboarding.recommendedFactors,
            hardFloors: vendor.onboarding.hardFloors,
            overrideReason: vendor.onboarding.overrideReason,
            confirmedBy: users.get(vendor.onboarding.tierConfirmedBy || '')?.name || null,
        } : null,
        unresolvedScope,
        questionnairePlan: (plan as { questionnairePlan?: unknown } | null)?.questionnairePlan || deriveQuestionnairePlan(
            (assessment?.responses || []).map((row) => ({ questionKey: row.questionId, response: row.response })),
            Array.isArray((plan as { analystDecisions?: AnalystPackDecision[] } | null)?.analystDecisions)
                ? (plan as { analystDecisions?: AnalystPackDecision[] }).analystDecisions || []
                : [],
            workbookPackCounts(loadWorkbookCatalog()),
            loadWorkbookCatalog().catalogVersion,
        ),
        plan,
        history: history.map((event) => ({
            at: event.timestamp,
            milestone: MILESTONE_ACTIONS.has(event.action),
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
            const overdueMail = vendorIntakeAssignedEmail({
                vendorName: row.vendor.name,
                publicId: row.vendor.publicId,
                requesterName: 'Supreme',
                dueAt: row.intakeDueAt,
                ctaUrl: customerAppUrl(`/vendor-onboarding/${row.vendor.publicId}`),
            });
            await notify(
                row.organizationId,
                row.vendor.businessOwnerUserId,
                'assessment.overdue',
                `Action required: Vendor intake is overdue — ${row.vendor.name}`,
                overdueMail.text,
                row.vendorId,
                { emailBody: overdueMail.text, emailHtml: overdueMail.html, fromName: overdueMail.fromName },
            );
            const analysts = await orgAnalysts(row.organizationId);
            for (const analyst of analysts.slice(0, 5)) {
                await notify(
                    row.organizationId,
                    analyst.id,
                    'assessment.overdue',
                    `Action required: Vendor intake is overdue — ${row.vendor.name}`,
                    overdueMail.text,
                    row.vendorId,
                    { emailBody: overdueMail.text, emailHtml: overdueMail.html, fromName: overdueMail.fromName },
                );
            }
        }
        if (row.stage === VendorOnboardingStage.TIER_REVIEW) {
            const overdueTier = tierReviewEmail({
                vendorName: row.vendor.name,
                publicId: row.vendor.publicId,
                recommendedTier: row.recommendedTier || 'MEDIUM',
                dueAt: row.tierReviewDueAt,
                ctaUrl: customerAppUrl(`/vendor-onboarding/${row.vendor.publicId}`),
            });
            const analysts = await orgAnalysts(row.organizationId);
            for (const analyst of analysts.slice(0, 8)) {
                await notify(
                    row.organizationId,
                    analyst.id,
                    'approval.requested',
                    `Action required: Tier review is overdue — ${row.vendor.name}`,
                    overdueTier.text,
                    row.vendorId,
                    { emailBody: overdueTier.text, emailHtml: overdueTier.html, fromName: overdueTier.fromName },
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
