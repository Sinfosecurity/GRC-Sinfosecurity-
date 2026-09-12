import { SupportAccessLevel, SupportSessionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { canonicalizeRole, isPlatformOwnerRole, hasPermission, PERMISSIONS } from '../security/rbac';
import { privilegeElevationService } from './privilegeElevationService';
import { notify } from './notificationDeliveryService';

const ALLOWED_DURATIONS = [15, 30, 60];

function isCustomerApprover(role: string) {
    const canonical = canonicalizeRole(role);
    return canonical === 'ORGANIZATION_ADMIN';
}

function maxMinutes() {
    const configured = Number(process.env.SUPPORT_SESSION_MAX_MINUTES || 60);
    return Number.isFinite(configured) ? Math.min(Math.max(configured, 15), 60) : 60;
}

async function expireIfNeeded<T extends { id: string; status: SupportSessionStatus; expiresAt: Date | null }>(session: T): Promise<T> {
    if ((session.status === 'ACTIVE' || session.status === 'APPROVED') && session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
        const updated = await prisma.supportAccessSession.update({
            where: { id: session.id },
            data: { status: 'EXPIRED', endedAt: new Date() },
        });
        return { ...session, ...updated };
    }
    return session;
}

export const supportAccessService = {
    async request(input: {
        actorUserId: string;
        role: string;
        organizationId: string;
        ticketId?: string;
        incident?: string;
        reason: string;
        scope?: string;
        accessLevel?: SupportAccessLevel;
        durationMinutes?: number;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.sessions.request'])) {
            throw new ApiError(403, 'Platform access denied');
        }
        const duration = ALLOWED_DURATIONS.includes(input.durationMinutes || 0)
            ? (input.durationMinutes as number)
            : 30;
        if (duration > maxMinutes()) {
            throw new ApiError(400, 'Requested duration exceeds the maximum support session length');
        }
        if (input.ticketId) {
            const ticket = await prisma.supportTicket.findFirst({
                where: { id: input.ticketId, organizationId: input.organizationId },
            });
            if (!ticket) throw new ApiError(400, 'Support ticket must belong to the requested organization');
        }
        const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
        if (!org) throw new ApiError(404, 'Organization not found');
        const session = await prisma.supportAccessSession.create({
            data: {
                organizationId: input.organizationId,
                ticketId: input.ticketId,
                incident: input.incident,
                requestedByUserId: input.actorUserId,
                reason: input.reason.trim(),
                scope: input.scope,
                accessLevel: input.accessLevel || 'READ_ONLY',
                durationMinutes: duration,
                status: 'REQUESTED',
                approvalKind: 'CUSTOMER',
                customerDecision: 'PENDING',
            },
        });
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_requested',
            resourceType: 'SupportAccessSession',
            resourceId: session.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { accessLevel: session.accessLevel, durationMinutes: duration, ticketId: input.ticketId },
        });
        const requester = await prisma.user.findUnique({
            where: { id: input.actorUserId },
            select: { firstName: true, lastName: true, role: true },
        });
        const admins = await prisma.user.findMany({
            where: {
                organizationId: input.organizationId,
                role: { in: ['ORGANIZATION_ADMIN', 'ADMIN'] },
                status: 'ACTIVE',
            },
            select: { id: true },
        });
        await Promise.all(admins.map(async (admin) => {
            try {
                await notify({
                    organizationId: input.organizationId,
                    userId: admin.id,
                    eventType: 'ops.alert',
                    title: 'Supreme Support requests temporary access',
                    body: `${requester?.firstName || 'Supreme'} ${requester?.lastName || 'Support'} requested ${session.accessLevel} access for ${duration} minutes. Reason: ${session.reason}`,
                    resourceType: 'SupportAccessSession',
                    resourceId: session.id,
                });
            } catch {
                // Notification failure must not corrupt the request.
            }
        }));
        return session;
    },

    async listForOrganization(organizationId: string) {
        const items = await prisma.supportAccessSession.findMany({
            where: { organizationId },
            include: {
                requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
                ticket: { select: { id: true, ticketNumber: true, subject: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return Promise.all(items.map((item) => expireIfNeeded(item)));
    },

    async customerApprove(input: {
        id: string;
        actorUserId: string;
        role: string;
        organizationId: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!isCustomerApprover(input.role)) {
            throw new ApiError(403, 'Only an organization administrator can approve support access');
        }
        const session = await prisma.supportAccessSession.findFirst({
            where: { id: input.id, organizationId: input.organizationId },
        });
        if (!session) throw new ApiError(404, 'Support session not found');
        if (session.breakGlass) throw new ApiError(400, 'Break-glass requests are not customer-approved');
        if (session.status !== 'REQUESTED' || session.customerDecision !== 'PENDING') {
            throw new ApiError(400, 'Session is not awaiting customer approval');
        }
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: {
                status: 'APPROVED',
                customerDecision: 'APPROVED',
                customerApproverUserId: input.actorUserId,
                customerApprovedAt: new Date(),
                approvedAt: new Date(),
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_customer_approved',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { requestedByUserId: updated.requestedByUserId, accessLevel: updated.accessLevel },
        });
        return updated;
    },

    async customerDeny(input: {
        id: string;
        actorUserId: string;
        role: string;
        organizationId: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!isCustomerApprover(input.role)) {
            throw new ApiError(403, 'Only an organization administrator can deny support access');
        }
        const session = await prisma.supportAccessSession.findFirst({
            where: { id: input.id, organizationId: input.organizationId },
        });
        if (!session) throw new ApiError(404, 'Support session not found');
        if (session.status !== 'REQUESTED') throw new ApiError(400, 'Session is not awaiting a decision');
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: {
                status: 'DENIED',
                customerDecision: 'DENIED',
                customerDeniedAt: new Date(),
                deniedByUserId: input.actorUserId,
                endedAt: new Date(),
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_customer_denied',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });
        return updated;
    },

    async customerRevoke(input: {
        id: string;
        actorUserId: string;
        role: string;
        organizationId: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!isCustomerApprover(input.role)) {
            throw new ApiError(403, 'Only an organization administrator can revoke support access');
        }
        const session = await prisma.supportAccessSession.findFirst({
            where: { id: input.id, organizationId: input.organizationId },
        });
        if (!session) throw new ApiError(404, 'Support session not found');
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: {
                status: 'REVOKED',
                customerDecision: 'REVOKED',
                endedAt: new Date(),
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_customer_revoked',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });
        return updated;
    },

    async approve(input: {
        id: string;
        actorUserId: string;
        role: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        throw new ApiError(400, 'Ordinary support access requires customer authorization');
    },

    async requestBreakGlass(input: {
        actorUserId: string;
        role: string;
        organizationId: string;
        incidentId: string;
        reason: string;
        scope?: string;
        accessLevel?: SupportAccessLevel;
        durationMinutes?: number;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.sessions.request'])) {
            throw new ApiError(403, 'Platform access denied');
        }
        if (!input.reason?.trim()) throw new ApiError(400, 'A documented reason is required');
        if (!input.incidentId?.trim()) throw new ApiError(400, 'An active incident is required');
        const incident = await prisma.platformIncident.findUnique({ where: { id: input.incidentId } });
        if (!incident || incident.status === 'RESOLVED') {
            throw new ApiError(400, 'An active incident is required');
        }
        const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
        if (!org) throw new ApiError(404, 'Organization not found');
        const duration = Math.min(input.durationMinutes && ALLOWED_DURATIONS.includes(input.durationMinutes) ? input.durationMinutes : 15, 15);
        const session = await prisma.supportAccessSession.create({
            data: {
                organizationId: input.organizationId,
                incident: input.incidentId,
                requestedByUserId: input.actorUserId,
                reason: input.reason.trim(),
                scope: input.scope,
                accessLevel: input.accessLevel || 'READ_ONLY',
                durationMinutes: duration,
                status: 'REQUESTED',
                approvalKind: 'BREAK_GLASS',
                breakGlass: true,
                postEventReviewRequired: true,
            },
        });
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.break_glass_requested',
            resourceType: 'SupportAccessSession',
            resourceId: session.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { incidentId: input.incidentId, durationMinutes: duration, postEventReviewRequired: true },
        });
        return session;
    },

    async approveBreakGlass(input: {
        id: string;
        actorUserId: string;
        role: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        await privilegeElevationService.requireActive(input.actorUserId);
        if (!isPlatformOwnerRole(input.role) && canonicalizeRole(input.role) !== 'SECURITY_ADMIN') {
            throw new ApiError(403, 'Break-glass approval requires a platform owner or security admin');
        }
        const session = await prisma.supportAccessSession.findUnique({ where: { id: input.id } });
        if (!session) throw new ApiError(404, 'Support session not found');
        if (!session.breakGlass) throw new ApiError(400, 'This session is not a break-glass request');
        if (session.status !== 'REQUESTED') throw new ApiError(400, 'Session is not awaiting approval');
        if (session.requestedByUserId === input.actorUserId) {
            throw new ApiError(403, 'The requester cannot approve their own break-glass access');
        }
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: {
                status: 'APPROVED',
                approvedByUserId: input.actorUserId,
                approvedAt: new Date(),
                postEventReviewRequired: true,
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.break_glass_approved',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { requestedByUserId: updated.requestedByUserId, incident: updated.incident, postEventReviewRequired: true },
        });
        return updated;
    },

    async start(input: {
        id: string;
        actorUserId: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        const existing = await prisma.supportAccessSession.findUnique({ where: { id: input.id } });
        if (!existing) throw new ApiError(404, 'Support session not found');
        const session = await expireIfNeeded(existing);
        if (session.status !== 'APPROVED') throw new ApiError(400, 'Session is not approved');
        if (session.requestedByUserId !== input.actorUserId && session.approvedByUserId !== input.actorUserId) {
            throw new ApiError(403, 'Only the requester or approver can start this session');
        }
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + session.durationMinutes * 60 * 1000);
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: { status: 'ACTIVE', startedAt, expiresAt },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_started',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { expiresAt, accessLevel: updated.accessLevel },
        });
        return updated;
    },

    async revoke(input: {
        id: string;
        actorUserId: string;
        role: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!isPlatformOwnerRole(input.role) && !hasPermission(input.role, PERMISSIONS['platform.sessions.approve'])) {
            throw new ApiError(403, 'Platform access denied');
        }
        const session = await prisma.supportAccessSession.findUnique({ where: { id: input.id } });
        if (!session) throw new ApiError(404, 'Support session not found');
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: { status: 'REVOKED', endedAt: new Date() },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_revoked',
            resourceType: 'SupportAccessSession',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });
        return updated;
    },

    async requireActive(id: string, actorUserId: string, organizationId?: string) {
        const raw = await prisma.supportAccessSession.findUnique({ where: { id } });
        if (!raw) throw new ApiError(404, 'Support session not found');
        const session = await expireIfNeeded(raw);
        if (session.status !== 'ACTIVE') throw new ApiError(403, 'Support session is not active');
        if (session.requestedByUserId !== actorUserId && session.approvedByUserId !== actorUserId) {
            throw new ApiError(403, 'Support session is not assigned to this operator');
        }
        if (organizationId && session.organizationId !== organizationId) {
            throw new ApiError(404, 'Resource not found');
        }
        return session;
    },

    async assertWrite(session: { accessLevel: SupportAccessLevel }, action: string) {
        if (action === 'evidence.mark_clean') {
            throw new ApiError(403, 'Support cannot mark evidence CLEAN');
        }
        if (session.accessLevel === 'READ_ONLY') {
            throw new ApiError(403, 'Support session is read-only');
        }
    },

    async list() {
        const items = await prisma.supportAccessSession.findMany({
            include: {
                organization: { select: { id: true, name: true } },
                requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
                approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
                ticket: { select: { id: true, ticketNumber: true, subject: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return Promise.all(items.map((item) => expireIfNeeded(item)));
    },
};
