import {
    SupportMessageVisibility,
    SupportTicketCategory,
    SupportTicketPriority,
    SupportTicketStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { notify, emailStatus } from './notificationDeliveryService';
import { recordNotificationDelivery } from './opsEventService';
import { isPlatformStaffRole, isPlatformOwnerRole, hasPermission, PERMISSIONS } from '../security/rbac';

const OPEN_STATUSES: SupportTicketStatus[] = [
    'NEW',
    'OPEN',
    'IN_PROGRESS',
    'WAITING_ON_CUSTOMER',
    'WAITING_INTERNAL',
];

function publicTicket<T extends { messages?: Array<{ visibility: SupportMessageVisibility }> }>(
    ticket: T,
    includeInternal: boolean
) {
    if (!ticket.messages) return ticket;
    return {
        ...ticket,
        displayId: `SUP-${(ticket as { ticketNumber?: number }).ticketNumber}`,
        messages: includeInternal
            ? ticket.messages
            : ticket.messages.filter((message) => message.visibility === 'CUSTOMER'),
    };
}

export const supportTicketService = {
    async createFromCustomer(input: {
        organizationId: string;
        userId: string;
        requesterName: string;
        requesterEmail: string;
        subject: string;
        description: string;
        category?: SupportTicketCategory;
        requestedPriority?: SupportTicketPriority;
        diagnosticContext?: Record<string, unknown> | null;
        actor: { requestId?: string | null; ipAddress?: string | null; userAgent?: string | null };
    }) {
        if (input.subject.trim().length < 3 || input.description.trim().length < 8) {
            throw new ApiError(400, 'Enter a subject and description for this support request.');
        }
        const requested = input.requestedPriority || 'P3';
        const priority = requested === 'P1' ? 'P2' : requested;
        const ticket = await prisma.supportTicket.create({
            data: {
                organizationId: input.organizationId,
                createdByUserId: input.userId,
                requesterName: input.requesterName,
                requesterEmail: input.requesterEmail,
                subject: input.subject.trim(),
                description: input.description.trim(),
                category: input.category || 'OTHER',
                priority,
                requestedPriority: requested,
                status: 'NEW',
                diagnosticContext: input.diagnosticContext
                    ? {
                          organizationId: input.organizationId,
                          userId: input.userId,
                          route: String(input.diagnosticContext.route || ''),
                          workflow: String(input.diagnosticContext.workflow || ''),
                          kind: String(input.diagnosticContext.kind || ''),
                          perceivedSeverity: String(input.diagnosticContext.perceivedSeverity || ''),
                          evidenceObjectId: String(input.diagnosticContext.evidenceObjectId || ''),
                          timestamp: String(input.diagnosticContext.timestamp || ''),
                          requestId: input.diagnosticContext.requestId ? String(input.diagnosticContext.requestId) : '',
                          userAgent: input.diagnosticContext.userAgent ? String(input.diagnosticContext.userAgent) : '',
                          environment: String(input.diagnosticContext.environment || ''),
                      }
                    : undefined,
            },
        });
        await prisma.supportTicketMessage.create({
            data: {
                ticketId: ticket.id,
                authorUserId: input.userId,
                visibility: 'CUSTOMER',
                body: input.description.trim(),
            },
        });
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.userId,
            action: 'support.ticket_created',
            resourceType: 'SupportTicket',
            resourceId: ticket.id,
            result: 'success',
            requestId: input.actor.requestId,
            ipAddress: input.actor.ipAddress,
            userAgent: input.actor.userAgent,
            metadata: { priority, requestedPriority: requested, category: ticket.category },
        });
        return { ...ticket, displayId: `SUP-${ticket.ticketNumber}` };
    },

    async listForOrganization(organizationId: string) {
        const items = await prisma.supportTicket.findMany({
            where: { organizationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
        return items.map((item) => publicTicket(item, false));
    },

    async getForOrganization(id: string, organizationId: string) {
        const ticket = await prisma.supportTicket.findFirst({
            where: { id, organizationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!ticket) throw new ApiError(404, 'Support request not found');
        return publicTicket(ticket, false);
    },

    async customerReply(id: string, organizationId: string, userId: string, body: string) {
        const ticket = await prisma.supportTicket.findFirst({ where: { id, organizationId } });
        if (!ticket) throw new ApiError(404, 'Support request not found');
        if (ticket.status === 'CLOSED') throw new ApiError(400, 'This request is closed');
        await prisma.supportTicketMessage.create({
            data: { ticketId: id, authorUserId: userId, visibility: 'CUSTOMER', body: body.trim() },
        });
        const updated = await prisma.supportTicket.update({
            where: { id },
            data: { status: ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status === 'NEW' ? 'OPEN' : ticket.status },
        });
        return { ...updated, displayId: `SUP-${updated.ticketNumber}` };
    },

    async listPlatform(input: {
        role: string;
        userId: string;
        status?: SupportTicketStatus;
        priority?: SupportTicketPriority;
        organizationId?: string;
        assignedToUserId?: string;
        q?: string;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.support.read'])) {
            throw new ApiError(403, 'Platform access denied');
        }
        const assignedOnly = !hasPermission(input.role, PERMISSIONS['platform.support.manage']) && !isPlatformOwnerRole(input.role);
        const where = {
            ...(input.status ? { status: input.status } : {}),
            ...(input.priority ? { priority: input.priority } : {}),
            ...(input.organizationId ? { organizationId: input.organizationId } : {}),
            ...(assignedOnly || input.assignedToUserId
                ? { assignedToUserId: assignedOnly ? input.userId : input.assignedToUserId }
                : {}),
            ...(input.q
                ? {
                      OR: [
                          { subject: { contains: input.q, mode: 'insensitive' as const } },
                          { requesterEmail: { contains: input.q, mode: 'insensitive' as const } },
                          { requesterName: { contains: input.q, mode: 'insensitive' as const } },
                      ],
                  }
                : {}),
        };
        const items = await prisma.supportTicket.findMany({
            where,
            include: {
                organization: { select: { id: true, name: true, plan: true, status: true } },
                assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            take: 200,
        });
        return items.map((item) => ({
            ...item,
            displayId: `SUP-${item.ticketNumber}`,
            ageMinutes: Math.round((Date.now() - item.createdAt.getTime()) / 60000),
            lastCustomerReplyAt: item.messages.find((message) => message.visibility === 'CUSTOMER')?.createdAt || null,
        }));
    },

    async getPlatform(id: string, role: string, userId: string) {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                organization: { select: { id: true, name: true, plan: true, status: true } },
                messages: { orderBy: { createdAt: 'asc' } },
                assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        if (!ticket) throw new ApiError(404, 'Support request not found');
        if (
            !hasPermission(role, PERMISSIONS['platform.support.manage']) &&
            !isPlatformOwnerRole(role) &&
            ticket.assignedToUserId !== userId
        ) {
            throw new ApiError(403, 'Platform access denied');
        }
        return { ...ticket, displayId: `SUP-${ticket.ticketNumber}` };
    },

    async updatePlatform(input: {
        id: string;
        actorUserId: string;
        role: string;
        status?: SupportTicketStatus;
        priority?: SupportTicketPriority;
        assignedToUserId?: string | null;
        resolutionSummary?: string;
        securityIncident?: boolean;
        internalNote?: string;
        customerReply?: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.support.manage']) && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Platform access denied');
        }
        const existing = await prisma.supportTicket.findUnique({ where: { id: input.id } });
        if (!existing) throw new ApiError(404, 'Support request not found');
        if (input.internalNote?.trim()) {
            await prisma.supportTicketMessage.create({
                data: {
                    ticketId: input.id,
                    authorUserId: input.actorUserId,
                    visibility: 'INTERNAL',
                    body: input.internalNote.trim(),
                },
            });
        }
        if (input.customerReply?.trim()) {
            await prisma.supportTicketMessage.create({
                data: {
                    ticketId: input.id,
                    authorUserId: input.actorUserId,
                    visibility: 'CUSTOMER',
                    body: input.customerReply.trim(),
                },
            });
        }
        const resolved = input.status === 'RESOLVED' || input.status === 'CLOSED';
        const updated = await prisma.supportTicket.update({
            where: { id: input.id },
            data: {
                ...(input.status ? { status: input.status } : {}),
                ...(input.priority ? { priority: input.priority } : {}),
                ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId } : {}),
                ...(input.resolutionSummary !== undefined ? { resolutionSummary: input.resolutionSummary } : {}),
                ...(input.securityIncident !== undefined ? { securityIncident: input.securityIncident } : {}),
                ...(resolved && !existing.resolvedAt ? { resolvedAt: new Date() } : {}),
            },
        });
        await recordAudit({
            organizationId: updated.organizationId,
            actorUserId: input.actorUserId,
            action: 'support.ticket_updated',
            resourceType: 'SupportTicket',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: {
                status: updated.status,
                assignedToUserId: updated.assignedToUserId,
                securityIncident: updated.securityIncident,
            },
        });
        if (input.customerReply?.trim() || (input.status && input.status !== existing.status)) {
            try {
                const delivery = await notify({
                    organizationId: updated.organizationId,
                    userId: updated.createdByUserId || input.actorUserId,
                    eventType: 'ops.alert',
                    title: `Support request SUP-${updated.ticketNumber} updated`,
                    body: 'Your Supreme support request was updated. Sign in to Help & Support to review the latest reply.',
                    resourceType: 'SupportTicket',
                    resourceId: updated.id,
                    emailTo: updated.requesterEmail,
                });
                await recordNotificationDelivery({
                    organizationId: updated.organizationId,
                    eventType: 'support.ticket_update',
                    status: typeof delivery.email === 'string' ? delivery.email : emailStatus(),
                    recipient: updated.requesterEmail,
                    resourceType: 'SupportTicket',
                    resourceId: updated.id,
                });
            } catch {
                await recordNotificationDelivery({
                    organizationId: updated.organizationId,
                    eventType: 'support.ticket_update',
                    status: 'FAILED',
                    recipient: updated.requesterEmail,
                    resourceType: 'SupportTicket',
                    resourceId: updated.id,
                });
            }
        }
        return { ...updated, displayId: `SUP-${updated.ticketNumber}` };
    },

    openStatuses: OPEN_STATUSES,
};

export function assertPlatformCanSeeTickets(role: string) {
    if (!isPlatformStaffRole(role)) {
        throw new ApiError(403, 'Platform access denied');
    }
}
