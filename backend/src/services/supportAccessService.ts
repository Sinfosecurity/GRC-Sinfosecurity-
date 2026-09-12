import { SupportAccessLevel, SupportSessionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { isPlatformOwnerRole, hasPermission, PERMISSIONS } from '../security/rbac';

const ALLOWED_DURATIONS = [15, 30, 60];

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
                accessLevel: input.accessLevel || 'READ_ONLY',
                durationMinutes: duration,
                status: 'REQUESTED',
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
        return session;
    },

    async approve(input: {
        id: string;
        actorUserId: string;
        role: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.sessions.approve']) && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Support session approval requires a platform owner');
        }
        const session = await prisma.supportAccessSession.findUnique({ where: { id: input.id } });
        if (!session) throw new ApiError(404, 'Support session not found');
        if (session.status !== 'REQUESTED') throw new ApiError(400, 'Session is not awaiting approval');
        if (session.requestedByUserId === input.actorUserId && session.accessLevel === 'LIMITED_SUPPORT_WRITE' && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Self-approval of write access is not permitted');
        }
        if (session.requestedByUserId === input.actorUserId && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Analysts and support admins cannot approve their own access');
        }
        const updated = await prisma.supportAccessSession.update({
            where: { id: input.id },
            data: {
                status: 'APPROVED',
                approvedByUserId: input.actorUserId,
                approvedAt: new Date(),
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.session_approved',
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
