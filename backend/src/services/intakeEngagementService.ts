import {
    EngagementResidualStatus,
    EngagementStatus,
    GovernanceNodeType,
    GovernanceRelationshipType,
    IntakePriority,
    IntakeSourceChannel,
    IntakeStatus,
    IssueReviewState,
    Prisma,
    VendorCategory,
    VendorIssueStatus,
    VendorStatus,
    VendorTier,
    VendorType,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { hasPermission, PERMISSIONS } from '../security/rbac';
import { recordAudit } from './auditEventService';
import { createRelationship, ensureNode } from './governanceGraphService';
import { deliverEmail, notifyUser, type NotificationEvent } from './notificationDeliveryService';
import { hashToken, randomToken } from './passwordService';
import { customerAppUrl, genericOperationalEmail } from './transactionalEmail';
import { allocateVendorPublicId, findDuplicateVendors } from './vendorOnboardingService';
import { extractVendorDomain } from './vendorOnboardingScoring';
import {
    engagementIraStatusLabel,
    listRequesterIraActions,
    openIraForEngagement,
    requesterEngagementStatus,
} from './engagementIraService';
import { evidenceLinkageService } from './evidenceLinkageService';
import { objectStorageService } from './objectStorageService';
import { presentEvidenceAttachment } from '../tprm/evidenceRequirement';
import { engagementPrimaryAction, notCalculated, notYetAssessed, recordedOrUnavailable } from '../tprm/engagementWorkspace';

export type Actor = { id: string; name: string; email: string; role: string };

const OPEN_STATUSES: IntakeStatus[] = [
    IntakeStatus.SUBMITTED,
    IntakeStatus.UNASSIGNED,
    IntakeStatus.ASSIGNED,
    IntakeStatus.IN_REVIEW,
    IntakeStatus.NEEDS_INFORMATION,
    IntakeStatus.READY_FOR_MATCH,
    IntakeStatus.VENDOR_MATCHED,
];

const ROUTING_KEYS = [
    'receivesCompanyOrCustomerInformation',
    'connectsToCompanySystems',
    'supportsImportantOperation',
    'interactsWithCustomers',
    'usesAiOrAutomatedDecisions',
    'processesPaymentsOrFunds',
] as const;

const INFO_FIELDS = ['proposedThirdPartyName', 'proposedServiceName', 'businessPurpose', 'businessOwner', 'targetStartDate', 'procurementReference', 'other'] as const;

function canCreate(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.create']) || hasPermission(actor.role, PERMISSIONS['intake.create_own']);
}

function canCreatePractitioner(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.create']);
}

function canReadOwn(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.read_own']) || canCreate(actor);
}

function canRespondOwn(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.respond_own']) || canCreate(actor);
}

function canRead(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.read']);
}

function canAssign(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.assign']);
}

function canTriage(actor: Actor) {
    return hasPermission(actor.role, PERMISSIONS['intake.triage']);
}

function canSeeQueue(actor: Actor) {
    return canAssign(actor) || canTriage(actor) || (canRead(actor) && !canCreatePractitioner(actor) && !hasPermission(actor.role, PERMISSIONS['intake.create_own']));
}

function assertRequesterOwn(actor: Actor) {
    if (!canReadOwn(actor) && !canRespondOwn(actor)) {
        throw new ApiError(403, 'You cannot use the requester workspace.');
    }
}

function statusIn(status: IntakeStatus, allowed: IntakeStatus[]) {
    return allowed.includes(status);
}

function isOwn(intake: { requesterUserId?: string | null; requesterEmail: string }, actor: Actor) {
    return intake.requesterUserId === actor.id || intake.requesterEmail.toLowerCase() === actor.email.toLowerCase();
}

function assertNotVendorPlane(actor: Actor) {
    if (String(actor.role || '').toUpperCase() === 'VENDOR') {
        throw new ApiError(403, 'Vendors cannot access intake or engagement intake context.');
    }
}

async function allocatePublicId(organizationId: string, model: 'intake' | 'engagement', year = new Date().getFullYear()) {
    const prefix = `${model === 'intake' ? 'INT' : 'ENG'}-${year}-`;
    const latest = model === 'intake'
        ? await prisma.intakeRequest.findFirst({ where: { organizationId, publicId: { startsWith: prefix } }, orderBy: { publicId: 'desc' }, select: { publicId: true } })
        : await prisma.engagement.findFirst({ where: { organizationId, publicId: { startsWith: prefix } }, orderBy: { publicId: 'desc' }, select: { publicId: true } });
    const current = latest?.publicId ? Number(latest.publicId.slice(prefix.length)) : 0;
    return `${prefix}${String(current + 1).padStart(4, '0')}`;
}

function parsePriority(value?: string | null): IntakePriority {
    const raw = String(value || 'MEDIUM').toUpperCase();
    if (raw === 'LOW' || raw === 'MEDIUM' || raw === 'HIGH' || raw === 'URGENT') return raw;
    throw new ApiError(400, 'Priority must be Low, Medium, High, or Urgent.');
}

function routingFacts(input: Record<string, unknown> | undefined) {
    const source = input || {};
    return Object.fromEntries(ROUTING_KEYS.map((key) => [key, source[key] === true || source[key] === 'yes' || source[key] === 'YES']));
}

function money(value: Prisma.Decimal | null | undefined) {
    if (value == null) return null;
    return Number(value);
}

function ageHours(from: Date) {
    return Math.max(0, Math.round((Date.now() - from.getTime()) / 36e5));
}

async function usersByIds(organizationId: string, ids: Array<string | null | undefined>) {
    const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!wanted.length) return new Map<string, { id: string; name: string; email: string }>();
    const users = await prisma.user.findMany({
        where: { organizationId, id: { in: wanted } },
        select: { id: true, firstName: true, lastName: true, email: true },
    });
    return new Map(users.map((user) => [user.id, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
    }]));
}

async function leadUsers(organizationId: string) {
    const users = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, role: true, firstName: true, lastName: true, email: true },
    });
    return users.filter((user) => hasPermission(user.role, PERMISSIONS['intake.assign']));
}

async function analystUsers(organizationId: string) {
    const users = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, role: true, firstName: true, lastName: true, email: true },
    });
    return users.filter((user) => hasPermission(user.role, PERMISSIONS['intake.triage'])).map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
        role: user.role,
    }));
}

async function audit(organizationId: string, actorUserId: string | null, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) {
    await recordAudit({
        organizationId,
        actorUserId,
        action,
        resourceType,
        resourceId,
        result: 'success',
        metadata,
    });
}

async function notifyActor(
    organizationId: string,
    userId: string | null | undefined,
    eventType: NotificationEvent,
    title: string,
    body: string,
    resourceType: string,
    resourceId: string,
    email?: { emailBody?: string; emailHtml?: string; fromName?: string }
) {
    if (!userId) return { inApp: false, email: 'SKIPPED' as const };
    return notifyUser({
        organizationId,
        userId,
        eventType,
        title,
        body,
        resourceType,
        resourceId,
        emailBody: email?.emailBody,
        emailHtml: email?.emailHtml,
        fromName: email?.fromName,
    });
}

export function presentIntake(row: {
    id: string;
    publicId: string;
    requesterUserId: string | null;
    requesterName: string;
    requesterEmail: string;
    requesterBusinessUnit: string | null;
    businessOwnerUserId: string | null;
    businessOwnerName: string | null;
    businessOwnerEmail: string | null;
    proposedThirdPartyName: string;
    proposedServiceName: string;
    businessPurpose: string;
    vendorWebsite: string | null;
    vendorContactName: string | null;
    vendorContactEmail: string | null;
    targetStartDate: Date | null;
    estimatedSpend: Prisma.Decimal | null;
    procurementReference: string | null;
    sourceChannel: IntakeSourceChannel;
    priority: IntakePriority;
    status: IntakeStatus;
    assignedAnalystUserId: string | null;
    assignmentDueAt: Date | null;
    matchedVendorId: string | null;
    createdEngagementId: string | null;
    routingFacts: Prisma.JsonValue | null;
    matchCandidates: Prisma.JsonValue | null;
    matchReason: string | null;
    matchConfirmedBy: string | null;
    matchConfirmedAt: Date | null;
    submittedAt: Date;
    assignedAt: Date | null;
    triageStartedAt: Date | null;
    completedAt: Date | null;
    closedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    matchedVendor?: { id: string; publicId: string | null; name: string; legalName: string | null; website: string | null; country: string | null; status: VendorStatus; tier: VendorTier } | null;
    createdEngagement?: { id: string; publicId: string; serviceName: string; status: EngagementStatus } | null;
    assignments?: Array<{ id: string; fromAnalystUserId: string | null; toAnalystUserId: string; assignedByUserId: string; note: string | null; priority: IntakePriority; dueAt: Date | null; assignedAt: Date }>;
    informationRequests?: Array<{ id: string; fields: string[]; requestNote: string; requestedBy: string; requestedAt: Date; response: string | null; respondedAt: Date | null; respondedBy: string | null }>;
}, directory?: Map<string, { id: string; name: string; email: string }>) {
    const overdue = Boolean(row.assignmentDueAt && row.assignmentDueAt.getTime() < Date.now() && OPEN_STATUSES.includes(row.status));
    const nextAction = nextIntakeAction(row.status);
    return {
        id: row.id,
        publicId: row.publicId,
        requesterUserId: row.requesterUserId,
        requesterName: row.requesterName,
        requesterEmail: row.requesterEmail,
        requesterBusinessUnit: row.requesterBusinessUnit,
        businessOwnerUserId: row.businessOwnerUserId,
        businessOwnerName: row.businessOwnerName,
        businessOwnerEmail: row.businessOwnerEmail,
        proposedThirdPartyName: row.proposedThirdPartyName,
        proposedServiceName: row.proposedServiceName,
        businessPurpose: row.businessPurpose,
        vendorWebsite: row.vendorWebsite,
        vendorContactName: row.vendorContactName,
        vendorContactEmail: row.vendorContactEmail,
        targetStartDate: row.targetStartDate,
        estimatedSpend: money(row.estimatedSpend),
        procurementReference: row.procurementReference,
        sourceChannel: row.sourceChannel,
        priority: row.priority,
        status: row.status,
        statusLabel: statusLabel(row.status),
        assignedAnalystUserId: row.assignedAnalystUserId,
        assignedAnalystName: row.assignedAnalystUserId ? directory?.get(row.assignedAnalystUserId)?.name || null : null,
        assignmentDueAt: row.assignmentDueAt,
        matchedVendorId: row.matchedVendorId,
        createdEngagementId: row.createdEngagementId,
        routingFacts: row.routingFacts,
        matchCandidates: row.matchCandidates,
        matchReason: row.matchReason,
        matchConfirmedBy: row.matchConfirmedBy,
        matchConfirmedAt: row.matchConfirmedAt,
        submittedAt: row.submittedAt,
        assignedAt: row.assignedAt,
        triageStartedAt: row.triageStartedAt,
        completedAt: row.completedAt,
        closedReason: row.closedReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ageHours: ageHours(row.submittedAt),
        overdue,
        nextAction,
        matchedThirdParty: row.matchedVendor ? {
            id: row.matchedVendor.id,
            publicId: row.matchedVendor.publicId,
            name: row.matchedVendor.name,
            legalName: row.matchedVendor.legalName,
            website: row.matchedVendor.website,
            country: row.matchedVendor.country,
            status: row.matchedVendor.status,
            tier: row.matchedVendor.tier === VendorTier.UNRATED ? 'Not rated' : row.matchedVendor.tier,
        } : null,
        createdEngagement: row.createdEngagement || null,
        assignmentHistory: (row.assignments || []).map((item) => ({
            id: item.id,
            fromAnalystUserId: item.fromAnalystUserId,
            fromAnalystName: item.fromAnalystUserId ? directory?.get(item.fromAnalystUserId)?.name || null : null,
            toAnalystUserId: item.toAnalystUserId,
            toAnalystName: directory?.get(item.toAnalystUserId)?.name || null,
            assignedByUserId: item.assignedByUserId,
            assignedByName: directory?.get(item.assignedByUserId)?.name || null,
            note: item.note,
            priority: item.priority,
            dueAt: item.dueAt,
            assignedAt: item.assignedAt,
        })),
        informationRequests: (row.informationRequests || []).map((item) => ({
            id: item.id,
            fields: item.fields,
            requestNote: item.requestNote,
            requestedBy: item.requestedBy,
            requestedByName: directory?.get(item.requestedBy)?.name || null,
            requestedAt: item.requestedAt,
            response: item.response,
            respondedAt: item.respondedAt,
            respondedBy: item.respondedBy,
            respondedByName: item.respondedBy ? directory?.get(item.respondedBy)?.name || null : null,
            attachments: presentAttachments((item as { evidenceLinks?: Array<{ storedObject: { id: string; filename: string; contentType: string; uploadedAt: Date; scanStatus: string } }> }).evidenceLinks),
        })),
    };
}

function statusLabel(status: IntakeStatus) {
    switch (status) {
        case IntakeStatus.SUBMITTED:
        case IntakeStatus.UNASSIGNED: return 'Submitted for GRC review';
        case IntakeStatus.ASSIGNED: return 'Assigned';
        case IntakeStatus.IN_REVIEW: return 'In review';
        case IntakeStatus.NEEDS_INFORMATION: return 'Needs information';
        case IntakeStatus.READY_FOR_MATCH: return 'Ready for third-party match';
        case IntakeStatus.VENDOR_MATCHED: return 'Third party matched';
        case IntakeStatus.ENGAGEMENT_CREATED: return 'Engagement created';
        case IntakeStatus.CANCELLED: return 'Cancelled';
        case IntakeStatus.REJECTED: return 'Rejected';
        case IntakeStatus.DUPLICATE: return 'Duplicate';
        default: return status;
    }
}

function requesterStatus(status: IntakeStatus, engagementStatus?: EngagementStatus | null) {
    switch (status) {
        case IntakeStatus.SUBMITTED:
        case IntakeStatus.UNASSIGNED: return 'Submitted';
        case IntakeStatus.ASSIGNED: return 'Assigned for review';
        case IntakeStatus.IN_REVIEW: return 'Under review';
        case IntakeStatus.NEEDS_INFORMATION: return 'More information needed';
        case IntakeStatus.READY_FOR_MATCH:
        case IntakeStatus.VENDOR_MATCHED: return 'Third party identified';
        case IntakeStatus.ENGAGEMENT_CREATED:
            return engagementStatus ? requesterEngagementStatus(engagementStatus) : 'Engagement created';
        case IntakeStatus.CANCELLED: return 'Cancelled';
        case IntakeStatus.REJECTED: return 'Rejected';
        case IntakeStatus.DUPLICATE: return 'Closed as duplicate';
        default: return 'Completed';
    }
}

function presentRequesterIntake(row: Parameters<typeof presentIntake>[0]) {
    const openAction = (row.informationRequests || []).find((item) => !item.respondedAt);
    return {
        id: row.id,
        publicId: row.publicId,
        proposedThirdPartyName: row.proposedThirdPartyName,
        proposedServiceName: row.proposedServiceName,
        businessPurpose: row.businessPurpose,
        requesterName: row.requesterName,
        requesterEmail: row.requesterEmail,
        requesterBusinessUnit: row.requesterBusinessUnit,
        businessOwnerName: row.businessOwnerName,
        businessOwnerEmail: row.businessOwnerEmail,
        vendorWebsite: row.vendorWebsite,
        targetStartDate: row.targetStartDate,
        procurementReference: row.procurementReference,
        submittedAt: row.submittedAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
        requesterStatus: requesterStatus(row.status, row.createdEngagement?.status),
        actionRequired: row.status === IntakeStatus.NEEDS_INFORMATION || Boolean(openAction),
        actionType: openAction ? 'INTAKE_INFORMATION_REQUEST' : null,
        nextStep: row.status === IntakeStatus.NEEDS_INFORMATION
            ? 'GRC asked for more information.'
            : row.status === IntakeStatus.ENGAGEMENT_CREATED
                ? 'The TPRM team created an engagement. They will contact you if a risk assessment is needed.'
                : 'The TPRM team will review your request and contact you if more information is needed.',
        matchedThirdPartyName: row.matchedVendor?.name || null,
        engagementPublicId: row.createdEngagement?.publicId || null,
        informationRequests: (row.informationRequests || []).map((item) => ({
            id: item.id,
            type: 'INTAKE_INFORMATION_REQUEST',
            fields: item.fields,
            requestNote: item.requestNote,
            requestedBy: 'GRC team',
            requestedAt: item.requestedAt,
            response: item.response,
            respondedAt: item.respondedAt,
            attachments: presentAttachments((item as { evidenceLinks?: Array<{ storedObject: { id: string; filename: string; contentType: string; uploadedAt: Date; scanStatus: string } }> }).evidenceLinks),
        })),
    };
}

function nextIntakeAction(status: IntakeStatus) {
    switch (status) {
        case IntakeStatus.SUBMITTED:
        case IntakeStatus.UNASSIGNED: return 'Assign an analyst';
        case IntakeStatus.ASSIGNED: return 'Start review';
        case IntakeStatus.IN_REVIEW: return 'Search third parties or request information';
        case IntakeStatus.NEEDS_INFORMATION: return 'Waiting for the requester';
        case IntakeStatus.READY_FOR_MATCH: return 'Confirm a third-party match';
        case IntakeStatus.VENDOR_MATCHED: return 'Create the engagement';
        case IntakeStatus.ENGAGEMENT_CREATED: return 'Intake complete';
        default: return 'Closed';
    }
}

function presentEngagement(row: {
    id: string;
    publicId: string;
    vendorId: string;
    originatingIntakeRequestId: string | null;
    serviceName: string;
    businessPurpose: string;
    requesterUserId: string | null;
    requesterName: string | null;
    requesterEmail: string | null;
    businessOwnerUserId: string | null;
    businessOwnerName: string | null;
    businessOwnerEmail: string | null;
    assignedAnalystUserId: string | null;
    relationshipOwnerUserId: string | null;
    businessUnit: string | null;
    targetStartDate: Date | null;
    procurementReference: string | null;
    status: EngagementStatus;
    legacyReviewRequired: boolean;
    createdAt: Date;
    updatedAt: Date;
    vendor?: { id: string; publicId: string | null; name: string; legalName: string | null };
    originatingIntake?: { id: string; publicId: string } | null;
}, directory?: Map<string, { id: string; name: string; email: string }>) {
    return {
        id: row.id,
        publicId: row.publicId,
        vendorId: row.vendorId,
        thirdParty: row.vendor ? { id: row.vendor.id, publicId: row.vendor.publicId, name: row.vendor.name, legalName: row.vendor.legalName } : null,
        originatingIntakeRequestId: row.originatingIntakeRequestId,
        originatingIntake: row.originatingIntake || null,
        serviceName: row.serviceName,
        businessPurpose: row.businessPurpose,
        requesterUserId: row.requesterUserId,
        requesterName: row.requesterName,
        requesterEmail: row.requesterEmail,
        businessOwnerUserId: row.businessOwnerUserId,
        businessOwnerName: row.businessOwnerName,
        businessOwnerEmail: row.businessOwnerEmail,
        assignedAnalystUserId: row.assignedAnalystUserId,
        assignedAnalystName: row.assignedAnalystUserId ? directory?.get(row.assignedAnalystUserId)?.name || null : null,
        relationshipOwnerUserId: row.relationshipOwnerUserId,
        businessUnit: row.businessUnit,
        targetStartDate: row.targetStartDate,
        procurementReference: row.procurementReference,
        status: row.status,
        statusLabel: engagementIraStatusLabel(row.status),
        nextAction: engagementPrimaryAction(row.status).label,
        legacyReviewRequired: row.legacyReviewRequired,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

const intakeInclude = {
    matchedVendor: { select: { id: true, publicId: true, name: true, legalName: true, website: true, country: true, status: true, tier: true } },
    createdEngagement: { select: { id: true, publicId: true, serviceName: true, status: true } },
    assignments: { orderBy: { assignedAt: 'asc' as const } },
    informationRequests: {
        orderBy: { requestedAt: 'asc' as const },
        include: {
            evidenceLinks: {
                include: { storedObject: { select: { id: true, filename: true, contentType: true, uploadedAt: true, scanStatus: true } } },
                orderBy: { createdAt: 'asc' as const },
            },
        },
    },
};

function presentAttachments(links?: Array<{ storedObject: { id: string; filename: string; contentType: string; uploadedAt: Date; scanStatus: string } }>) {
    return (links || []).map((link) => presentEvidenceAttachment(link.storedObject));
}

async function loadIntake(organizationId: string, key: string) {
    return prisma.intakeRequest.findFirst({
        where: { organizationId, OR: [{ id: key }, { publicId: key }] },
        include: intakeInclude,
    });
}

async function requireIntake(organizationId: string, key: string, actor: Actor) {
    assertNotVendorPlane(actor);
    const intake = await loadIntake(organizationId, key);
    if (!intake) throw new ApiError(404, 'Intake request not found.');
    if (!canSeeQueue(actor) && !isOwn(intake, actor) && intake.assignedAnalystUserId !== actor.id) {
        throw new ApiError(403, 'You can only view your own intake requests.');
    }
    return intake;
}

async function directoryFor(organizationId: string, intake: Awaited<ReturnType<typeof loadIntake>>) {
    if (!intake) return new Map<string, { id: string; name: string; email: string }>();
    return usersByIds(organizationId, [
        intake.assignedAnalystUserId,
        intake.requesterUserId,
        intake.businessOwnerUserId,
        intake.matchConfirmedBy,
        ...intake.assignments.flatMap((row) => [row.fromAnalystUserId, row.toAnalystUserId, row.assignedByUserId]),
        ...intake.informationRequests.flatMap((row) => [row.requestedBy, row.respondedBy]),
    ]);
}

async function writeGraphIntakeToEngagement(organizationId: string, actorId: string, intake: { id: string; publicId: string; proposedThirdPartyName: string; status: IntakeStatus }, vendor: { id: string; name: string }, engagement: { id: string; publicId: string; serviceName: string; status: EngagementStatus }) {
    const intakeNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.INTAKE,
        sourceModel: 'IntakeRequest',
        sourceId: intake.id,
        displayLabel: `${intake.publicId} · ${intake.proposedThirdPartyName}`,
        status: intake.status,
    });
    const vendorNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.VENDOR,
        sourceModel: 'Vendor',
        sourceId: vendor.id,
        displayLabel: vendor.name,
    });
    const engagementNode = await ensureNode({
        organizationId,
        actorUserId: actorId,
        nodeType: GovernanceNodeType.ENGAGEMENT,
        sourceModel: 'Engagement',
        sourceId: engagement.id,
        displayLabel: `${engagement.publicId} · ${engagement.serviceName}`,
        status: engagement.status,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: intakeNode.node.id,
        toNodeId: engagementNode.node.id,
        relationshipType: GovernanceRelationshipType.ORIGINATED,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: vendorNode.node.id,
        toNodeId: engagementNode.node.id,
        relationshipType: GovernanceRelationshipType.HAS_ENGAGEMENT,
    });
    await createRelationship({
        organizationId,
        createdBy: actorId,
        fromNodeId: intakeNode.node.id,
        toNodeId: vendorNode.node.id,
        relationshipType: GovernanceRelationshipType.CONCERNS,
    });
}

export async function createIntakeRequest(organizationId: string, actor: Actor, input: {
    requesterName?: string;
    requesterEmail?: string;
    requesterBusinessUnit?: string;
    businessOwnerUserId?: string;
    businessOwnerName?: string;
    businessOwnerEmail?: string;
    proposedThirdPartyName?: string;
    proposedServiceName?: string;
    businessPurpose?: string;
    vendorWebsite?: string;
    vendorContactName?: string;
    vendorContactEmail?: string;
    targetStartDate?: string;
    estimatedSpend?: number | string;
    procurementReference?: string;
    priority?: string;
    routingFacts?: Record<string, unknown>;
}) {
    assertNotVendorPlane(actor);
    if (!canCreate(actor)) throw new ApiError(403, 'You cannot submit a third-party request.');
    const ownerName = String(input.businessOwnerName || '').trim();
    const ownerEmail = String(input.businessOwnerEmail || '').trim();
    if ((ownerName && !ownerEmail) || (ownerEmail && !ownerName)) {
        throw new ApiError(400, 'If a business owner is known, include both name and work email.');
    }
    const proposedThirdPartyName = String(input.proposedThirdPartyName || '').trim();
    const proposedServiceName = String(input.proposedServiceName || '').trim();
    const businessPurpose = String(input.businessPurpose || '').trim();
    const requesterName = String(input.requesterName || actor.name || '').trim();
    const requesterEmail = String(input.requesterEmail || actor.email || '').trim();
    if (!proposedThirdPartyName) throw new ApiError(400, 'Company or vendor name is required.');
    if (!proposedServiceName) throw new ApiError(400, 'Product or service name is required.');
    if (!businessPurpose) throw new ApiError(400, 'Describe what the service will be used for.');
    if (!requesterName || !requesterEmail) throw new ApiError(400, 'Requester name and work email are required.');

    let publicId = await allocatePublicId(organizationId, 'intake');
    const created = await prisma.intakeRequest.create({
        data: {
            organizationId,
            publicId,
            requesterUserId: actor.id,
            requesterName,
            requesterEmail,
            requesterBusinessUnit: String(input.requesterBusinessUnit || '').trim() || null,
            businessOwnerUserId: input.businessOwnerUserId || null,
            businessOwnerName: String(input.businessOwnerName || '').trim() || null,
            businessOwnerEmail: String(input.businessOwnerEmail || '').trim() || null,
            proposedThirdPartyName,
            proposedServiceName,
            businessPurpose,
            vendorWebsite: String(input.vendorWebsite || '').trim() || null,
            vendorContactName: String(input.vendorContactName || '').trim() || null,
            vendorContactEmail: String(input.vendorContactEmail || '').trim() || null,
            targetStartDate: input.targetStartDate ? new Date(input.targetStartDate) : null,
            estimatedSpend: input.estimatedSpend === undefined || input.estimatedSpend === '' ? null : Number(input.estimatedSpend),
            procurementReference: String(input.procurementReference || '').trim() || null,
            sourceChannel: IntakeSourceChannel.SUPREME_FORM,
            priority: parsePriority(input.priority),
            status: IntakeStatus.UNASSIGNED,
            routingFacts: routingFacts(input.routingFacts),
        },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, 'intake.created', 'IntakeRequest', created.id, {
        publicId: created.publicId,
        proposedThirdPartyName,
        proposedServiceName,
        sourceChannel: 'SUPREME_FORM',
    });
    const ackMail = genericOperationalEmail({
        subject: `We received your third-party request ${created.publicId}`,
        body: `Thank you. Your third-party request has been submitted.\n\nReference: ${created.publicId}\nProposed third party: ${proposedThirdPartyName}\nService: ${proposedServiceName}\nCurrent status: Submitted for GRC review.`,
        cta: { label: 'View request', url: customerAppUrl(`/request/${created.publicId}`) },
    });
    const requesterAck = await notifyActor(organizationId, actor.id, 'intake.submitted', ackMail.subject, ackMail.text, 'IntakeRequest', created.id, { emailBody: ackMail.text, emailHtml: ackMail.html, fromName: ackMail.fromName });
    const leads = await leadUsers(organizationId);
    await Promise.all(leads.map((lead) => notifyActor(
        organizationId,
        lead.id,
        'intake.submitted',
        `${created.publicId} needs assignment`,
        `${requesterName} requested ${proposedThirdPartyName} · ${proposedServiceName}. Assign an analyst from Intake.`,
        'IntakeRequest',
        created.id
    )));
    const directory = await directoryFor(organizationId, created);
    return {
        ...presentIntake(created, directory),
        confirmation: {
            title: 'Thank you.',
            message: 'Your third-party request has been submitted.',
            reference: created.publicId,
            proposedThirdParty: proposedThirdPartyName,
            service: proposedServiceName,
            currentStatus: 'Submitted for GRC review.',
        },
        requesterAcknowledgement: {
            inApp: requesterAck.inApp,
            email: requesterAck.email,
            emailHonestStatus: requesterAck.email,
        },
    };
}

export async function listIntakeRequests(organizationId: string, actor: Actor, query: {
    filter?: string;
    q?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
}) {
    assertNotVendorPlane(actor);
    if (!canSeeQueue(actor)) throw new ApiError(403, 'You cannot view the GRC intake queue.');
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
    const filter = String(query.filter || '').toLowerCase();
    const q = String(query.q || '').trim();
    const where: Prisma.IntakeRequestWhereInput = { organizationId };
    if (!canSeeQueue(actor)) {
        where.OR = [{ requesterUserId: actor.id }, { requesterEmail: { equals: actor.email, mode: 'insensitive' } }];
    }
    if (filter === 'unassigned') where.status = { in: [IntakeStatus.SUBMITTED, IntakeStatus.UNASSIGNED] };
    if (filter === 'assigned-to-me') where.assignedAnalystUserId = actor.id;
    if (filter === 'needs-information') where.status = IntakeStatus.NEEDS_INFORMATION;
    if (filter === 'in-review') where.status = IntakeStatus.IN_REVIEW;
    if (filter === 'ready-for-match') where.status = { in: [IntakeStatus.READY_FOR_MATCH, IntakeStatus.VENDOR_MATCHED] };
    if (filter === 'overdue') {
        where.assignmentDueAt = { lt: new Date() };
        where.status = { in: OPEN_STATUSES };
    }
    if (filter === 'priority') where.priority = { in: [IntakePriority.HIGH, IntakePriority.URGENT] };
    if (q) {
        const search: Prisma.IntakeRequestWhereInput = {
            OR: [
                { publicId: { contains: q, mode: 'insensitive' } },
                { proposedThirdPartyName: { contains: q, mode: 'insensitive' } },
                { proposedServiceName: { contains: q, mode: 'insensitive' } },
                { requesterName: { contains: q, mode: 'insensitive' } },
                { requesterEmail: { contains: q, mode: 'insensitive' } },
            ],
        };
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), search];
    }
    const sort = String(query.sort || '-submittedAt');
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    const orderBy: Prisma.IntakeRequestOrderByWithRelationInput =
        field === 'priority' ? { priority: desc ? 'desc' : 'asc' }
            : field === 'targetStartDate' ? { targetStartDate: desc ? 'desc' : 'asc' }
                : field === 'status' ? { status: desc ? 'desc' : 'asc' }
                    : { submittedAt: desc ? 'desc' : 'asc' };

    const [total, rows] = await Promise.all([
        prisma.intakeRequest.count({ where }),
        prisma.intakeRequest.findMany({
            where,
            include: intakeInclude,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    const directory = await usersByIds(organizationId, rows.flatMap((row) => [row.assignedAnalystUserId, row.requesterUserId]));
    return {
        page,
        pageSize,
        total,
        items: rows.map((row) => presentIntake(row, directory)),
    };
}

export async function getIntakeRequest(organizationId: string, actor: Actor, key: string) {
    const intake = await requireIntake(organizationId, key, actor);
    return presentIntake(intake, await directoryFor(organizationId, intake));
}

export async function listMyTprmWork(organizationId: string, actor: Actor) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor) && !canAssign(actor) && !canSeeQueue(actor)) throw new ApiError(403, 'You cannot view TPRM work.');
    const now = new Date();
    const ownOrAssigned: Prisma.IntakeRequestWhereInput = canTriage(actor) || canAssign(actor)
        ? { organizationId, OR: [{ assignedAnalystUserId: actor.id }, { status: { in: [IntakeStatus.SUBMITTED, IntakeStatus.UNASSIGNED] } }] }
        : { organizationId, OR: [{ requesterUserId: actor.id }, { requesterEmail: { equals: actor.email, mode: 'insensitive' } }] };
    const rows = await prisma.intakeRequest.findMany({
        where: ownOrAssigned,
        include: intakeInclude,
        orderBy: { submittedAt: 'desc' },
        take: 200,
    });
    const directory = await usersByIds(organizationId, rows.flatMap((row) => [row.assignedAnalystUserId]));
    const items = rows.map((row) => presentIntake(row, directory));
    const mine = canTriage(actor) ? items.filter((row) => row.assignedAnalystUserId === actor.id) : items;
    return {
        newAssignments: mine.filter((row) => row.status === IntakeStatus.ASSIGNED),
        inReview: mine.filter((row) => row.status === IntakeStatus.IN_REVIEW),
        waitingForRequester: mine.filter((row) => row.status === IntakeStatus.NEEDS_INFORMATION),
        readyForVendorMatch: mine.filter((row) => row.status === IntakeStatus.READY_FOR_MATCH || row.status === IntakeStatus.VENDOR_MATCHED),
        overdue: mine.filter((row) => row.overdue),
        submitted: !canTriage(actor) ? items.filter((row) => row.status === IntakeStatus.UNASSIGNED || row.status === IntakeStatus.SUBMITTED) : [],
        analysts: canAssign(actor) ? await analystUsers(organizationId) : [],
        workload: canAssign(actor) ? await workload(organizationId) : [],
    };
}

export async function workload(organizationId: string) {
    const analysts = await analystUsers(organizationId);
    const open = await prisma.intakeRequest.groupBy({
        by: ['assignedAnalystUserId'],
        where: { organizationId, status: { in: OPEN_STATUSES }, assignedAnalystUserId: { not: null } },
        _count: { _all: true },
    });
    const overdue = await prisma.intakeRequest.groupBy({
        by: ['assignedAnalystUserId'],
        where: { organizationId, status: { in: OPEN_STATUSES }, assignmentDueAt: { lt: new Date() }, assignedAnalystUserId: { not: null } },
        _count: { _all: true },
    });
    return analysts.map((analyst) => ({
        ...analyst,
        openCount: open.find((row) => row.assignedAnalystUserId === analyst.id)?._count._all || 0,
        overdueCount: overdue.find((row) => row.assignedAnalystUserId === analyst.id)?._count._all || 0,
    }));
}

export async function assignIntake(organizationId: string, actor: Actor, key: string, input: {
    analystUserId?: string;
    dueAt?: string;
    priority?: string;
    note?: string;
}) {
    assertNotVendorPlane(actor);
    if (!canAssign(actor)) throw new ApiError(403, 'You cannot assign intake requests.');
    const intake = await loadIntake(organizationId, key);
    if (!intake) throw new ApiError(404, 'Intake request not found.');
    if (statusIn(intake.status, [IntakeStatus.ENGAGEMENT_CREATED, IntakeStatus.CANCELLED, IntakeStatus.REJECTED, IntakeStatus.DUPLICATE])) {
        throw new ApiError(400, 'This intake is closed.');
    }
    const analystId = String(input.analystUserId || '').trim();
    if (!analystId) throw new ApiError(400, 'Choose an analyst.');
    const analyst = (await analystUsers(organizationId)).find((user) => user.id === analystId);
    if (!analyst) throw new ApiError(400, 'Assignee must be a TPRM analyst in this organization.');
    const priority = input.priority ? parsePriority(input.priority) : intake.priority;
    const dueAt = input.dueAt ? new Date(input.dueAt) : intake.assignmentDueAt;
    const fromAnalyst = intake.assignedAnalystUserId;
    const reassigned = Boolean(fromAnalyst && fromAnalyst !== analystId);
    await prisma.intakeAssignment.create({
        data: {
            organizationId,
            intakeRequestId: intake.id,
            fromAnalystUserId: fromAnalyst,
            toAnalystUserId: analystId,
            assignedByUserId: actor.id,
            note: String(input.note || '').trim() || null,
            priority,
            dueAt,
        },
    });
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: {
            assignedAnalystUserId: analystId,
            assignmentDueAt: dueAt,
            priority,
            assignedAt: intake.assignedAt || new Date(),
            status: intake.status === IntakeStatus.UNASSIGNED || intake.status === IntakeStatus.SUBMITTED ? IntakeStatus.ASSIGNED : intake.status,
        },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, reassigned ? 'intake.reassigned' : 'intake.assigned', 'IntakeRequest', intake.id, {
        fromAnalystUserId: fromAnalyst,
        toAnalystUserId: analystId,
        dueAt,
        priority,
        note: String(input.note || '').trim() || null,
    });
    const mail = genericOperationalEmail({
        subject: reassigned ? `${updated.publicId} was reassigned to you` : `${updated.publicId} was assigned to you`,
        body: `${updated.proposedThirdPartyName} · ${updated.proposedServiceName}\nRequester: ${updated.requesterName}\nPriority: ${priority}\nDue: ${dueAt ? dueAt.toISOString().slice(0, 10) : 'not set'}${input.note ? `\nLead note: ${input.note}` : ''}`,
        cta: { label: 'Open intake', url: customerAppUrl(`/third-parties/intake/${updated.id}`) },
    });
    await notifyActor(organizationId, analystId, reassigned ? 'intake.reassigned' : 'intake.assigned', mail.subject, mail.text, 'IntakeRequest', updated.id, { emailBody: mail.text, emailHtml: mail.html, fromName: mail.fromName });
    if (reassigned && fromAnalyst) {
        await notifyActor(
            organizationId,
            fromAnalyst,
            'intake.reassigned',
            `${updated.publicId} was reassigned`,
            `${updated.proposedThirdPartyName} · ${updated.proposedServiceName} is now assigned to ${analyst.name}.`,
            'IntakeRequest',
            updated.id
        );
    }
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function startTriage(organizationId: string, actor: Actor, key: string) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot start intake review.');
    const intake = await requireIntake(organizationId, key, actor);
    if (intake.assignedAnalystUserId !== actor.id && !canAssign(actor)) {
        throw new ApiError(403, 'Only the assigned analyst can start this review.');
    }
    if (intake.status !== IntakeStatus.ASSIGNED && intake.status !== IntakeStatus.IN_REVIEW) {
        throw new ApiError(400, 'Start review is available after assignment.');
    }
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: {
            status: IntakeStatus.IN_REVIEW,
            triageStartedAt: intake.triageStartedAt || new Date(),
        },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, 'intake.review_started', 'IntakeRequest', intake.id, { publicId: intake.publicId });
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function requestIntakeInformation(organizationId: string, actor: Actor, key: string, input: { fields?: string[]; note?: string }) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot request intake information.');
    const intake = await requireIntake(organizationId, key, actor);
    if (!statusIn(intake.status, [IntakeStatus.ASSIGNED, IntakeStatus.IN_REVIEW, IntakeStatus.READY_FOR_MATCH])) {
        throw new ApiError(400, 'Information can be requested while the intake is in review.');
    }
    const fields = (input.fields || []).map((field) => String(field)).filter((field) => INFO_FIELDS.includes(field as typeof INFO_FIELDS[number]));
    const note = String(input.note || '').trim();
    if (!note) throw new ApiError(400, 'Describe what information is needed.');
    const rawToken = randomToken(24);
    const created = await prisma.intakeInformationRequest.create({
        data: {
            organizationId,
            intakeRequestId: intake.id,
            fields: fields.length ? fields : ['other'],
            requestNote: note,
            requestedBy: actor.id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
    });
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: { status: IntakeStatus.NEEDS_INFORMATION },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, 'intake.information_requested', 'IntakeRequest', intake.id, {
        informationRequestId: created.id,
        fields,
    });
    const ctaUrl = customerAppUrl(`/request/actions`);
    const mail = genericOperationalEmail({
        subject: `Action required: more information for ${updated.publicId}`,
        body: `GRC needs more information about ${updated.proposedThirdPartyName} · ${updated.proposedServiceName}.\n\n${note}\n\nSign in to your requester workspace to respond.`,
        cta: { label: 'Open Actions Required', url: ctaUrl },
    });
    if (updated.requesterUserId) {
        await notifyActor(organizationId, updated.requesterUserId, 'intake.information_requested', mail.subject, mail.text, 'IntakeRequest', updated.id, { emailBody: mail.text, emailHtml: mail.html, fromName: mail.fromName });
    } else {
        await deliverEmail({
            to: updated.requesterEmail,
            subject: mail.subject,
            body: mail.text,
            html: mail.html,
            fromName: mail.fromName,
            eventType: 'intake.information_requested',
            organizationId,
            resourceType: 'IntakeRequest',
            resourceId: updated.id,
        });
    }
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function respondIntakeInformation(organizationId: string, actor: Actor, key: string, input: { informationRequestId?: string; response?: string; updates?: Record<string, unknown> }) {
    assertNotVendorPlane(actor);
    const intake = await requireIntake(organizationId, key, actor);
    if (!isOwn(intake, actor) && !canTriage(actor)) throw new ApiError(403, 'Only the requester can submit this response.');
    return applyInformationResponse(organizationId, intake.id, actor.id, input);
}

export async function getPublicIntakeInfo(token: string) {
    const row = await informationByToken(token);
    return {
        publicId: row.intake.publicId,
        proposedThirdPartyName: row.intake.proposedThirdPartyName,
        proposedServiceName: row.intake.proposedServiceName,
        requestNote: row.requestNote,
        fields: row.fields,
        original: {
            proposedThirdPartyName: row.intake.proposedThirdPartyName,
            proposedServiceName: row.intake.proposedServiceName,
            businessPurpose: row.intake.businessPurpose,
            businessOwnerName: row.intake.businessOwnerName,
            targetStartDate: row.intake.targetStartDate,
            procurementReference: row.intake.procurementReference,
        },
        alreadyResponded: Boolean(row.respondedAt),
        informationRequestId: row.id,
        attachments: presentAttachments(row.evidenceLinks),
    };
}

export async function submitPublicIntakeInfo(token: string, input: { response?: string; updates?: Record<string, unknown> }) {
    const row = await informationByToken(token);
    return applyInformationResponse(row.organizationId, row.intakeRequestId, null, { informationRequestId: row.id, ...input });
}

async function informationByToken(token: string) {
    const hash = hashToken(String(token || ''));
    const row = await prisma.intakeInformationRequest.findFirst({
        where: { tokenHash: hash },
        include: {
            intake: true,
            evidenceLinks: {
                include: { storedObject: { select: { id: true, filename: true, contentType: true, uploadedAt: true, scanStatus: true } } },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
    if (!row) throw new ApiError(404, 'This information request was not found or has expired.');
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) throw new ApiError(410, 'This information request has expired.');
    return row;
}

async function applyInformationResponse(organizationId: string, intakeId: string, respondedBy: string | null, input: { informationRequestId?: string; response?: string; updates?: Record<string, unknown> }) {
    const intake = await loadIntake(organizationId, intakeId);
    if (!intake) throw new ApiError(404, 'Intake request not found.');
    const pending = intake.informationRequests.find((row) => !row.respondedAt && (!input.informationRequestId || row.id === input.informationRequestId));
    if (!pending) throw new ApiError(400, 'There is no open information request.');
    const response = String(input.response || '').trim();
    if (!response) throw new ApiError(400, 'Add a response.');
    const updates = input.updates || {};
    const data: Prisma.IntakeRequestUpdateInput = {
        status: IntakeStatus.IN_REVIEW,
        informationRequests: {
            update: {
                where: { id: pending.id },
                data: { response, respondedAt: new Date(), respondedBy },
            },
        },
    };
    if (typeof updates.proposedThirdPartyName === 'string' && updates.proposedThirdPartyName.trim()) data.proposedThirdPartyName = updates.proposedThirdPartyName.trim();
    if (typeof updates.proposedServiceName === 'string' && updates.proposedServiceName.trim()) data.proposedServiceName = updates.proposedServiceName.trim();
    if (typeof updates.businessPurpose === 'string' && updates.businessPurpose.trim()) data.businessPurpose = updates.businessPurpose.trim();
    if (typeof updates.businessOwnerName === 'string') data.businessOwnerName = updates.businessOwnerName.trim() || null;
    if (typeof updates.procurementReference === 'string') data.procurementReference = updates.procurementReference.trim() || null;
    if (typeof updates.targetStartDate === 'string' && updates.targetStartDate) data.targetStartDate = new Date(updates.targetStartDate);
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data,
        include: intakeInclude,
    });
    await audit(organizationId, respondedBy, 'intake.information_received', 'IntakeRequest', intake.id, {
        informationRequestId: pending.id,
    });
    if (respondedBy) {
        await audit(organizationId, respondedBy, 'requester.information_response.submitted', 'IntakeRequest', intake.id, {
            informationRequestId: pending.id,
        });
    }
    await notifyActor(
        organizationId,
        updated.assignedAnalystUserId,
        'intake.information_received',
        `${updated.publicId} information received`,
        `${updated.requesterName} responded. Original submission is preserved in history.`,
        'IntakeRequest',
        updated.id
    );
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function searchThirdParties(organizationId: string, actor: Actor, input: { q?: string; website?: string }) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot search the third-party master.');
    const q = String(input.q || '').trim();
    const website = String(input.website || '').trim();
    if (!q && !website) return [];
    const domain = extractVendorDomain(website || q);
    const or: Prisma.VendorWhereInput[] = [];
    if (q) {
        or.push({ name: { contains: q, mode: 'insensitive' } });
        or.push({ legalName: { contains: q, mode: 'insensitive' } });
        or.push({ website: { contains: q, mode: 'insensitive' } });
    }
    if (website) or.push({ website: { contains: website, mode: 'insensitive' } });
    if (domain) or.push({ domain });
    const vendors = await prisma.vendor.findMany({
        where: {
            organizationId,
            OR: or.length ? or : undefined,
        },
        select: {
            id: true,
            publicId: true,
            name: true,
            legalName: true,
            website: true,
            domain: true,
            country: true,
            status: true,
            tier: true,
            _count: { select: { engagements: true } },
        },
        take: 50,
        orderBy: { name: 'asc' },
    });
    const duplicates = await findDuplicateVendors(organizationId, { name: q, website: website || q, domain });
    const duplicateIds = new Set(duplicates.map((row) => row.id));
    return vendors.map((vendor) => ({
        id: vendor.id,
        publicId: vendor.publicId,
        name: vendor.name,
        legalName: vendor.legalName,
        website: vendor.website,
        domain: vendor.domain,
        country: vendor.country,
        status: vendor.status,
        tier: vendor.tier === VendorTier.UNRATED ? 'Not rated' : vendor.tier,
        engagementCount: vendor._count.engagements,
        possibleDuplicate: duplicateIds.has(vendor.id),
        matchReason: duplicates.find((row) => row.id === vendor.id)?.matchReason || (domain && vendor.domain === domain ? 'Same website or domain' : 'Name or website match'),
    }));
}

export async function confirmThirdPartyMatch(organizationId: string, actor: Actor, key: string, input: {
    vendorId?: string;
    reason?: string;
    candidates?: unknown;
}) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot confirm a third-party match.');
    const intake = await requireIntake(organizationId, key, actor);
    if (!statusIn(intake.status, [IntakeStatus.IN_REVIEW, IntakeStatus.READY_FOR_MATCH, IntakeStatus.VENDOR_MATCHED])) {
        throw new ApiError(400, 'Confirm a match after review has started.');
    }
    const vendorId = String(input.vendorId || '').trim();
    if (!vendorId) throw new ApiError(400, 'Select a third party. Matches are never automatic.');
    const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, organizationId },
        select: { id: true, publicId: true, name: true, legalName: true, website: true, country: true, status: true, tier: true },
    });
    if (!vendor) throw new ApiError(404, 'Third party not found in this organization.');
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: {
            matchedVendorId: vendor.id,
            matchCandidates: input.candidates == null ? intake.matchCandidates : (input.candidates as Prisma.InputJsonValue),
            matchReason: String(input.reason || 'Analyst confirmed existing third party').trim(),
            matchConfirmedBy: actor.id,
            matchConfirmedAt: new Date(),
            status: IntakeStatus.VENDOR_MATCHED,
        },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, 'intake.third_party_matched', 'IntakeRequest', intake.id, {
        vendorId: vendor.id,
        vendorPublicId: vendor.publicId,
        reason: updated.matchReason,
    });
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function createThirdPartyFromIntake(organizationId: string, actor: Actor, key: string, input: {
    name?: string;
    legalName?: string;
    website?: string;
    country?: string;
    acknowledgeDuplicate?: boolean;
}) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot create a third party from intake.');
    const intake = await requireIntake(organizationId, key, actor);
    if (!statusIn(intake.status, [IntakeStatus.IN_REVIEW, IntakeStatus.READY_FOR_MATCH])) {
        throw new ApiError(400, 'Create a third party after review has started.');
    }
    const name = String(input.name || intake.proposedThirdPartyName).trim();
    const website = String(input.website || intake.vendorWebsite || '').trim() || undefined;
    const duplicates = await findDuplicateVendors(organizationId, { name, website });
    if (duplicates.length && !input.acknowledgeDuplicate) {
        throw new ApiError(409, 'Possible existing third party found', true, { duplicates });
    }
    const publicId = await allocateVendorPublicId(organizationId);
    const domain = extractVendorDomain(website);
    const vendor = await prisma.vendor.create({
        data: {
            organizationId,
            publicId,
            name,
            legalName: String(input.legalName || name).trim(),
            vendorType: VendorType.OTHER,
            category: VendorCategory.OTHER,
            tier: VendorTier.UNRATED,
            status: VendorStatus.PROPOSED,
            primaryContact: intake.vendorContactName || intake.requesterName,
            contactEmail: intake.vendorContactEmail || 'not-recorded@example.invalid',
            website,
            domain,
            country: String(input.country || '').trim() || null,
            businessOwner: intake.businessOwnerName,
            servicesProvided: 'Third Party master record',
            dataTypesAccessed: [],
            geographicFootprint: input.country ? [String(input.country)] : [],
            regulatoryScope: [],
        },
    });
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: {
            matchedVendorId: vendor.id,
            matchReason: 'Analyst created a new third-party master after confirming no appropriate match',
            matchConfirmedBy: actor.id,
            matchConfirmedAt: new Date(),
            matchCandidates: duplicates,
            status: IntakeStatus.VENDOR_MATCHED,
        },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, 'intake.third_party_created', 'IntakeRequest', intake.id, {
        vendorId: vendor.id,
        vendorPublicId: vendor.publicId,
    });
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function createEngagementFromIntake(organizationId: string, actor: Actor, key: string, input?: { serviceName?: string; businessPurpose?: string }) {
    assertNotVendorPlane(actor);
    if (!canTriage(actor)) throw new ApiError(403, 'You cannot create an engagement.');
    const intake = await requireIntake(organizationId, key, actor);
    if (intake.status !== IntakeStatus.VENDOR_MATCHED || !intake.matchedVendorId) {
        throw new ApiError(400, 'Match a third party before creating an engagement.');
    }
    if (intake.createdEngagementId) throw new ApiError(400, 'This intake already created an engagement.');
    const vendor = await prisma.vendor.findFirst({ where: { id: intake.matchedVendorId, organizationId } });
    if (!vendor) throw new ApiError(404, 'Matched third party was not found.');
    const serviceName = String(input?.serviceName || intake.proposedServiceName).trim();
    const businessPurpose = String(input?.businessPurpose || intake.businessPurpose).trim();
    if (!serviceName) throw new ApiError(400, 'Service name is required.');
    let publicId = await allocatePublicId(organizationId, 'engagement');
    const engagement = await prisma.engagement.create({
        data: {
            organizationId,
            publicId,
            vendorId: vendor.id,
            originatingIntakeRequestId: intake.id,
            serviceName,
            businessPurpose,
            requesterUserId: intake.requesterUserId,
            requesterName: intake.requesterName,
            requesterEmail: intake.requesterEmail,
            businessOwnerUserId: intake.businessOwnerUserId,
            businessOwnerName: intake.businessOwnerName,
            businessOwnerEmail: intake.businessOwnerEmail,
            assignedAnalystUserId: intake.assignedAnalystUserId,
            businessUnit: intake.requesterBusinessUnit,
            targetStartDate: intake.targetStartDate,
            procurementReference: intake.procurementReference,
            status: EngagementStatus.READY_FOR_IRA,
        },
        include: { vendor: { select: { id: true, publicId: true, name: true, legalName: true } }, originatingIntake: { select: { id: true, publicId: true } } },
    });
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: {
            createdEngagementId: engagement.id,
            status: IntakeStatus.ENGAGEMENT_CREATED,
            completedAt: new Date(),
        },
        include: intakeInclude,
    });
    await writeGraphIntakeToEngagement(organizationId, actor.id, updated, vendor, engagement);
    await audit(organizationId, actor.id, 'engagement.created', 'Engagement', engagement.id, {
        publicId: engagement.publicId,
        vendorId: vendor.id,
        intakeId: intake.id,
        intakePublicId: intake.publicId,
    });
    await audit(organizationId, actor.id, 'intake.completed', 'IntakeRequest', intake.id, {
        engagementId: engagement.id,
        engagementPublicId: engagement.publicId,
        vendorId: vendor.id,
    });
    const done = genericOperationalEmail({
        subject: `${updated.publicId} is complete · ${engagement.publicId}`,
        body: `${vendor.name} · ${engagement.serviceName} is now an engagement. Intake is historical provenance.`,
        cta: { label: 'Open engagement', url: customerAppUrl(`/third-parties/engagements/${engagement.id}`) },
    });
    await notifyActor(organizationId, updated.assignedAnalystUserId, 'intake.completed', done.subject, done.text, 'Engagement', engagement.id, { emailBody: done.text, emailHtml: done.html, fromName: done.fromName });
    if (updated.requesterUserId) {
        await notifyActor(organizationId, updated.requesterUserId, 'intake.completed', `${updated.publicId} created an engagement`, `${vendor.name} · ${engagement.serviceName}`, 'Engagement', engagement.id);
    }
    await openIraForEngagement(organizationId, actor, engagement);
    const directory = await usersByIds(organizationId, [engagement.assignedAnalystUserId, engagement.requesterUserId]);
    return {
        intake: presentIntake(updated, await directoryFor(organizationId, updated)),
        engagement: presentEngagement(engagement, directory),
    };
}

export async function closeIntake(organizationId: string, actor: Actor, key: string, input: { status?: string; reason?: string }) {
    assertNotVendorPlane(actor);
    if (!canAssign(actor) && !canTriage(actor)) throw new ApiError(403, 'You cannot close this intake.');
    const intake = await requireIntake(organizationId, key, actor);
    const status = String(input.status || '').toUpperCase();
    if (!['CANCELLED', 'REJECTED', 'DUPLICATE'].includes(status)) throw new ApiError(400, 'Choose cancelled, rejected, or duplicate.');
    const reason = String(input.reason || '').trim();
    if (!reason) throw new ApiError(400, 'A reason is required.');
    if (intake.status === IntakeStatus.ENGAGEMENT_CREATED) throw new ApiError(400, 'Completed intake cannot be closed this way.');
    const updated = await prisma.intakeRequest.update({
        where: { id: intake.id },
        data: { status: status as IntakeStatus, closedReason: reason, completedAt: new Date() },
        include: intakeInclude,
    });
    await audit(organizationId, actor.id, `intake.${status.toLowerCase()}`, 'IntakeRequest', intake.id, { reason });
    return presentIntake(updated, await directoryFor(organizationId, updated));
}

export async function listEngagements(organizationId: string, actor: Actor, query: { vendorId?: string; page?: number; pageSize?: number }) {
    assertNotVendorPlane(actor);
    if (!canRead(actor) && !canTriage(actor)) throw new ApiError(403, 'You cannot view engagements.');
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
    const where: Prisma.EngagementWhereInput = {
        organizationId,
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
    };
    const [total, rows] = await Promise.all([
        prisma.engagement.count({ where }),
        prisma.engagement.findMany({
            where,
            include: { vendor: { select: { id: true, publicId: true, name: true, legalName: true } }, originatingIntake: { select: { id: true, publicId: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    const directory = await usersByIds(organizationId, rows.map((row) => row.assignedAnalystUserId));
    const residuals = await prisma.engagementResidualRiskAssessment.findMany({
        where: { organizationId, engagementId: { in: rows.map((row) => row.id) }, status: { not: EngagementResidualStatus.NOT_READY } },
        orderBy: { createdAt: 'desc' },
    });
    const latest = new Map<string, (typeof residuals)[number]>();
    for (const row of residuals) {
        if (!latest.has(row.engagementId)) latest.set(row.engagementId, row);
    }
    return {
        page,
        pageSize,
        total,
        items: rows.map((row) => {
            const residual = latest.get(row.id);
            const primary = engagementPrimaryAction(row.status, { residualConfirmed: residual?.status === EngagementResidualStatus.CONFIRMED });
            return {
                ...presentEngagement(row, directory),
                nextAction: primary.label,
                primaryActionHref: primary.href(row.id),
                residual: residual ? { band: residual.residualBand, score: residual.residualScore, calculatedAt: residual.calculatedAt } : { band: null, score: null, status: 'Not calculated' },
            };
        }),
    };
}

export async function getEngagement(organizationId: string, actor: Actor, key: string) {
    assertNotVendorPlane(actor);
    if (!canRead(actor) && !canTriage(actor)) throw new ApiError(403, 'You cannot view engagements.');
    const row = await prisma.engagement.findFirst({
        where: { organizationId, OR: [{ id: key }, { publicId: key }] },
        include: {
            vendor: { select: { id: true, publicId: true, name: true, legalName: true } },
            originatingIntake: { select: { id: true, publicId: true } },
            ira: { select: { id: true, status: true, recommendedTier: true, confirmedTier: true } },
            dueDiligencePlan: { select: { id: true, status: true, confirmedTier: true, vendorDueAt: true } },
        },
    });
    if (!row) throw new ApiError(404, 'Engagement not found.');
    const risk = await import('./engagementRiskService').then((mod) => mod.getEngagementRisk(organizationId, actor, row.id)).catch(() => null);
    const assessments = await prisma.vendorAssessment.findMany({
        where: { organizationId, engagementId: row.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true, status: true, submittedAt: true, frameworkUsed: true },
    });
    const openFindings = await prisma.vendorIssue.count({
        where: {
            organizationId,
            engagementId: row.id,
            reviewState: IssueReviewState.CONFIRMED,
            status: { in: [VendorIssueStatus.OPEN, VendorIssueStatus.IN_PROGRESS, VendorIssueStatus.PENDING_VENDOR, VendorIssueStatus.PENDING_VALIDATION, VendorIssueStatus.REMEDIATED, VendorIssueStatus.ESCALATED] },
        },
    });
    const reviews = await prisma.engagementAssessmentReview.findMany({
        where: { organizationId, engagementId: row.id },
        select: { domain: true, status: true, completedAt: true },
    });
    const history = await prisma.auditEvent.findMany({
        where: { organizationId, resourceId: { in: [row.id, row.ira?.id || '', row.dueDiligencePlan?.id || ''].filter(Boolean) } },
        orderBy: { timestamp: 'desc' },
        take: 25,
        select: { action: true, timestamp: true, actorUserId: true, resourceType: true },
    });
    const outstanding = reviews.filter((item) => item.status !== 'COMPLETE').map((item) => item.domain).filter(Boolean);
    const { monitoringExtras } = await import('./engagementMonitoringService');
    const { reassessmentExtras } = await import('./engagementReassessmentService');
    const monitoring = row.status === 'ACTIVE' ? await monitoringExtras(organizationId, row.id) : null;
    const reassessment = row.status === 'ACTIVE' ? await reassessmentExtras(organizationId, row.id) : null;
    const primary = engagementPrimaryAction(row.status, {
        residualReady: Boolean(risk?.residualReady),
        residualConfirmed: risk?.residual?.status === 'CONFIRMED',
        outstandingReviewDomains: outstanding,
        openCandidateCount: risk?.candidates?.length || 0,
        controlAssessed: Boolean(risk?.controls?.some((item: { rating?: string }) => item.rating && item.rating !== 'NOT_ASSESSED')),
        monitoringProfileStatus: monitoring?.monitoringProfileStatus,
        openMonitoringSignals: monitoring?.openMonitoringSignals,
        highPrioritySignals: monitoring?.highPrioritySignals,
        reassessmentRecommended: monitoring?.reassessmentRecommended,
        openReassessment: reassessment?.openReassessment,
    });
    const vendorAssessmentStatus = assessments.some((item) => item.submittedAt)
        ? 'Vendor submitted'
        : assessments.some((item) => item.status === 'IN_PROGRESS')
            ? 'Vendor in progress'
            : assessments.length
                ? recordedOrUnavailable(itemStatus(assessments[0].status))
                : 'Not yet assessed';
    return {
        ...presentEngagement(row, await usersByIds(organizationId, [row.assignedAnalystUserId, row.requesterUserId])),
        ira: row.ira,
        dueDiligence: row.dueDiligencePlan,
        risk,
        what: `${row.publicId} · ${row.serviceName}`,
        why: row.businessPurpose || 'Not recorded',
        source: row.originatingIntake ? `Intake ${row.originatingIntake.publicId}` : 'Legacy / none',
        state: engagementIraStatusLabel(row.status),
        owner: primary.owner,
        impact: row.ira?.confirmedTier ? `Confirmed inherent ${row.ira.confirmedTier}` : 'Not yet assessed',
        evidence: assessments.length ? `${assessments.length} vendor assessment record(s)` : 'Not recorded',
        relationships: {
            thirdParty: row.vendor ? { id: row.vendor.id, publicId: row.vendor.publicId, name: row.vendor.name } : null,
            intake: row.originatingIntake || null,
            iraId: row.ira?.id || null,
            planId: row.dueDiligencePlan?.id || null,
        },
        nextAction: primary.label,
        primaryAction: { label: primary.label, href: primary.href(row.id), owner: primary.owner, wave5: false },
        confirmedInherentTier: notYetAssessed(row.ira?.confirmedTier || row.dueDiligencePlan?.confirmedTier),
        dueDiligenceStatus: row.dueDiligencePlan?.status ? recordedOrUnavailable(row.dueDiligencePlan.status) : 'Not yet assessed',
        vendorAssessmentStatus,
        openFindingsCount: openFindings,
        residual: risk?.residual?.residualBand ? risk.residual.residualBand : notCalculated(null),
        assessments: assessments.map((item) => ({
            id: item.id,
            name: item.frameworkUsed || 'Assessment',
            status: item.status,
            submittedAt: item.submittedAt,
        })),
        history: history.map((item) => ({
            at: item.timestamp,
            action: item.action,
            actor: item.actorUserId,
            resourceType: item.resourceType,
        })),
        tabs: ['overview', 'inherent-risk', 'due-diligence', 'evidence', 'findings', 'controls', 'residual-risk', 'decisions', 'monitoring', 'reassessment', 'history'],
        monitoring: monitoring ? {
            profileStatus: monitoring.monitoringProfileStatus || 'Not configured',
            openSignals: monitoring.openSignals,
            highPriority: monitoring.highPrioritySignals,
            lastReview: monitoring.lastReview?.lastReviewedAt || null,
            nextReview: monitoring.lastReview?.nextReviewAt || null,
            reassessmentRecommended: monitoring.reassessmentRecommended,
        } : null,
    };
}

function itemStatus(status: string) {
    return status.replace(/_/g, ' ').toLowerCase();
}

export async function resolveLegacyOnboard(organizationId: string, actor: Actor, vendorKey: string) {
    assertNotVendorPlane(actor);
    if (!canRead(actor) && !canTriage(actor)) throw new ApiError(403, 'You cannot view engagements.');
    const vendor = await prisma.vendor.findFirst({
        where: { organizationId, OR: [{ id: vendorKey }, { publicId: vendorKey }] },
        select: { id: true, publicId: true, name: true },
    });
    if (!vendor) throw new ApiError(404, 'Legacy onboarding record not found.');
    const engagements = await prisma.engagement.findMany({
        where: { organizationId, vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, publicId: true, serviceName: true, status: true },
    });
    if (engagements.length === 1) {
        return { mode: 'redirect' as const, vendor, engagement: engagements[0], compatibility: 'Deep link resolved to the Golden Journey Engagement.' };
    }
    if (engagements.length > 1) {
        return { mode: 'choose' as const, vendor, engagements, compatibility: 'Multiple Engagements exist. Third Party remains the master record.' };
    }
    const onboarding = await prisma.vendorOnboarding.findFirst({ where: { organizationId, vendorId: vendor.id }, select: { id: true, stage: true } });
    return {
        mode: 'legacy' as const,
        vendor,
        onboarding,
        compatibility: 'No Golden Journey Engagement exists. This remains a read-compatible legacy onboarding record. An Engagement was not manufactured.',
    };
}

export async function createRequesterIntake(organizationId: string, actor: Actor, input: Parameters<typeof createIntakeRequest>[2]) {
    assertRequesterOwn(actor);
    const created = await createIntakeRequest(organizationId, actor, input);
    const intake = await loadIntake(organizationId, created.id);
    if (!intake) throw new ApiError(404, 'Intake request not found.');
    return {
        ...presentRequesterIntake(intake),
        confirmation: created.confirmation,
        requesterAcknowledgement: created.requesterAcknowledgement,
        whatHappensNext: 'The TPRM team will review your request and contact you if more information is needed.',
    };
}

export async function listRequesterIntakes(organizationId: string, actor: Actor) {
    assertNotVendorPlane(actor);
    assertRequesterOwn(actor);
    const rows = await prisma.intakeRequest.findMany({
        where: {
            organizationId,
            OR: [{ requesterUserId: actor.id }, { requesterEmail: { equals: actor.email, mode: 'insensitive' } }],
        },
        include: intakeInclude,
        orderBy: { submittedAt: 'desc' },
        take: 100,
    });
    return { items: rows.map((row) => presentRequesterIntake(row)) };
}

export async function getRequesterIntake(organizationId: string, actor: Actor, key: string) {
    assertNotVendorPlane(actor);
    assertRequesterOwn(actor);
    const intake = await loadIntake(organizationId, key);
    if (!intake || !isOwn(intake, actor)) throw new ApiError(404, 'Request not found.');
    await audit(organizationId, actor.id, 'requester.intake.viewed', 'IntakeRequest', intake.id, { publicId: intake.publicId });
    return presentRequesterIntake(intake);
}

export async function listRequesterActions(organizationId: string, actor: Actor) {
    const { listRequesterReassessmentActions } = await import('./engagementReassessmentService');
    const [{ items }, iraActions, reassessmentActions] = await Promise.all([
        listRequesterIntakes(organizationId, actor),
        listRequesterIraActions(organizationId, actor),
        listRequesterReassessmentActions(organizationId, actor),
    ]);
    return {
        items: [
            ...reassessmentActions,
            ...iraActions,
            ...items.flatMap((row) => row.informationRequests.filter((item) => !item.respondedAt).map((item) => ({
                id: item.id,
                type: item.type,
                intakeId: row.id,
                publicId: row.publicId,
                proposedThirdPartyName: row.proposedThirdPartyName,
                proposedServiceName: row.proposedServiceName,
                requestNote: item.requestNote,
                fields: item.fields,
                requestedBy: item.requestedBy,
                requestedAt: item.requestedAt,
                dueAt: null,
                attachments: item.attachments || [],
            }))),
        ],
    };
}

export async function requesterHome(organizationId: string, actor: Actor) {
    await audit(organizationId, actor.id, 'requester.workspace.opened', 'Organization', organizationId, {});
    const [requests, actions] = await Promise.all([
        listRequesterIntakes(organizationId, actor),
        listRequesterActions(organizationId, actor),
    ]);
    return {
        recent: requests.items.slice(0, 8),
        actions: actions.items,
        counts: {
            requests: requests.items.length,
            actionsRequired: actions.items.length,
        },
    };
}

export async function uploadRequesterInformationAttachment(
    organizationId: string,
    actor: Actor,
    key: string,
    input: { informationRequestId?: string; filename: string; contentType: string; buffer: Buffer }
) {
    assertNotVendorPlane(actor);
    const intake = await requireIntake(organizationId, key, actor);
    if (!isOwn(intake, actor) && !canTriage(actor)) throw new ApiError(403, 'Only the requester can attach supporting documents.');
    const pending = intake.informationRequests.find((row) => !row.respondedAt && (!input.informationRequestId || row.id === input.informationRequestId));
    if (!pending) throw new ApiError(400, 'There is no open information request.');
    const linked = await evidenceLinkageService.uploadLinked({
        organizationId,
        uploadedBy: actor.id,
        vendorId: intake.matchedVendorId || undefined,
        intakeRequestId: intake.id,
        intakeInformationRequestId: pending.id,
        engagementId: intake.createdEngagementId || undefined,
        questionId: `intake-info:${pending.id}`,
        filename: input.filename,
        contentType: input.contentType,
        buffer: input.buffer,
        title: input.filename,
    });
    await audit(organizationId, actor.id, 'intake.information_attachment.uploaded', 'IntakeRequest', intake.id, {
        informationRequestId: pending.id,
        storedObjectId: linked.stored.id,
        scanStatus: linked.stored.scanStatus,
    });
    return presentEvidenceAttachment(linked.stored);
}

export async function uploadPublicIntakeAttachment(token: string, input: { filename: string; contentType: string; buffer: Buffer }) {
    const row = await informationByToken(token);
    if (row.respondedAt) throw new ApiError(409, 'This information request was already answered.');
    const linked = await evidenceLinkageService.uploadLinked({
        organizationId: row.organizationId,
        uploadedBy: row.intake.requesterUserId || row.requestedBy,
        vendorId: row.intake.matchedVendorId || undefined,
        intakeRequestId: row.intakeRequestId,
        intakeInformationRequestId: row.id,
        engagementId: row.intake.createdEngagementId || undefined,
        questionId: `intake-info:${row.id}`,
        filename: input.filename,
        contentType: input.contentType,
        buffer: input.buffer,
        title: input.filename,
    });
    return presentEvidenceAttachment(linked.stored);
}

export async function downloadIntakeInformationAttachment(organizationId: string, actor: Actor, key: string, storedObjectId: string) {
    assertNotVendorPlane(actor);
    const intake = await requireIntake(organizationId, key, actor);
    if (!isOwn(intake, actor) && !canTriage(actor) && !canSeeQueue(actor)) {
        throw new ApiError(403, 'You cannot download this file.');
    }
    const link = await prisma.evidenceLink.findFirst({
        where: { organizationId, storedObjectId, intakeRequestId: intake.id },
    });
    if (!link) throw new ApiError(404, 'That file is not part of this request.');
    return objectStorageService.getForDownload(storedObjectId, organizationId, actor.id);
}

export async function respondRequesterInformation(organizationId: string, actor: Actor, key: string, input: { informationRequestId?: string; response?: string; updates?: Record<string, unknown> }) {
    assertRequesterOwn(actor);
    if (!canRespondOwn(actor)) throw new ApiError(403, 'You cannot respond to this request.');
    await respondIntakeInformation(organizationId, actor, key, input);
    return getRequesterIntake(organizationId, actor, key);
}

export async function listRequesterColleagues(organizationId: string, actor: Actor) {
    assertRequesterOwn(actor);
    const users = await prisma.user.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 100,
    });
    return users.map((user) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
    }));
}

export async function backfillLegacyEngagements(organizationId?: string) {
    const onboardings = await prisma.vendorOnboarding.findMany({
        where: {
            engagementId: null,
            ...(organizationId ? { organizationId } : {}),
        },
        include: { vendor: true },
    });
    const created: string[] = [];
    for (const row of onboardings) {
        const vendor = row.vendor;
        if (!vendor?.name?.trim()) continue;
        const service = vendor.servicesProvided?.trim();
        const publicId = await allocatePublicId(vendor.organizationId, 'engagement');
        const engagement = await prisma.engagement.create({
            data: {
                organizationId: vendor.organizationId,
                publicId,
                vendorId: vendor.id,
                serviceName: service ? service.slice(0, 240) : vendor.name,
                businessPurpose: service || 'Legacy engagement backfilled from the pre-Wave-1 Vendor record. Review required.',
                requesterUserId: vendor.requesterUserId,
                businessOwnerUserId: vendor.businessOwnerUserId,
                businessOwnerName: vendor.businessOwner,
                relationshipOwnerUserId: vendor.relationshipOwnerUserId,
                businessUnit: vendor.businessUnit,
                targetStartDate: vendor.targetStartDate,
                status: EngagementStatus.INTAKE_COMPLETE,
                legacyReviewRequired: !service,
            },
        });
        await prisma.vendorOnboarding.update({ where: { id: row.id }, data: { engagementId: engagement.id } });
        created.push(engagement.id);
    }
    return { created: created.length };
}

export async function intakeAttentionItems(organizationId: string) {
    const now = new Date();
    const rows = await prisma.intakeRequest.findMany({
        where: {
            organizationId,
            status: { in: [IntakeStatus.SUBMITTED, IntakeStatus.UNASSIGNED, IntakeStatus.ASSIGNED, IntakeStatus.NEEDS_INFORMATION, IntakeStatus.IN_REVIEW, IntakeStatus.READY_FOR_MATCH, IntakeStatus.VENDOR_MATCHED] },
        },
        orderBy: { submittedAt: 'asc' },
        take: 25,
        select: {
            id: true,
            publicId: true,
            status: true,
            proposedThirdPartyName: true,
            proposedServiceName: true,
            assignmentDueAt: true,
            assignedAnalystUserId: true,
        },
    });
    return rows.map((row) => {
        const overdue = Boolean(row.assignmentDueAt && row.assignmentDueAt < now);
        const unassigned = row.status === IntakeStatus.UNASSIGNED || row.status === IntakeStatus.SUBMITTED;
        return {
            id: `intake-${row.id}`,
            severity: overdue || unassigned ? 'HIGH' as const : 'MEDIUM' as const,
            action: unassigned ? 'ASSIGN INTAKE' : row.status === IntakeStatus.NEEDS_INFORMATION ? 'WAITING ON REQUESTER' : row.status === IntakeStatus.VENDOR_MATCHED ? 'CREATE ENGAGEMENT' : 'REVIEW INTAKE',
            title: `${row.publicId} · ${row.proposedThirdPartyName}`,
            detail: `${row.proposedServiceName} · ${statusLabel(row.status)}${overdue ? ' · overdue' : ''}.`,
            href: `/third-parties/intake/${row.id}`,
        };
    });
}
