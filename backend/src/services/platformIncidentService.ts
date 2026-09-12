import { PlatformIncidentSeverity, PlatformIncidentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { hasPermission, PERMISSIONS, isPlatformOwnerRole } from '../security/rbac';

export const platformIncidentService = {
    async create(input: {
        actorUserId: string;
        role: string;
        title: string;
        severity: PlatformIncidentSeverity;
        summary: string;
        affectedServices?: string[];
        organizationIds?: string[];
        securityIncident?: boolean;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.incidents.manage']) && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Platform access denied');
        }
        const incident = await prisma.platformIncident.create({
            data: {
                title: input.title.trim(),
                severity: input.severity,
                summary: input.summary.trim(),
                affectedServices: input.affectedServices || [],
                ownerUserId: input.actorUserId,
                securityIncident: Boolean(input.securityIncident),
                organizations: input.organizationIds?.length
                    ? { create: input.organizationIds.map((organizationId) => ({ organizationId })) }
                    : undefined,
            },
            include: { organizations: { include: { organization: { select: { id: true, name: true } } } } },
        });
        await recordAudit({
            actorUserId: input.actorUserId,
            action: 'platform.incident_created',
            resourceType: 'PlatformIncident',
            resourceId: incident.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { severity: incident.severity, securityIncident: incident.securityIncident },
        });
        return { ...incident, displayId: `INC-${incident.incidentNumber}` };
    },

    async list() {
        const items = await prisma.platformIncident.findMany({
            include: { organizations: { include: { organization: { select: { id: true, name: true } } } } },
            orderBy: { startedAt: 'desc' },
            take: 200,
        });
        return items.map((item) => ({ ...item, displayId: `INC-${item.incidentNumber}` }));
    },

    async update(input: {
        id: string;
        actorUserId: string;
        role: string;
        status?: PlatformIncidentStatus;
        rootCause?: string;
        resolution?: string;
        customerCommunication?: string;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!hasPermission(input.role, PERMISSIONS['platform.incidents.manage']) && !isPlatformOwnerRole(input.role)) {
            throw new ApiError(403, 'Platform access denied');
        }
        const existing = await prisma.platformIncident.findUnique({ where: { id: input.id } });
        if (!existing) throw new ApiError(404, 'Incident not found');
        const updated = await prisma.platformIncident.update({
            where: { id: input.id },
            data: {
                ...(input.status ? { status: input.status } : {}),
                ...(input.rootCause !== undefined ? { rootCause: input.rootCause } : {}),
                ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
                ...(input.customerCommunication !== undefined ? { customerCommunication: input.customerCommunication } : {}),
                ...(input.status === 'RESOLVED' && !existing.resolvedAt ? { resolvedAt: new Date() } : {}),
            },
            include: { organizations: { include: { organization: { select: { id: true, name: true } } } } },
        });
        await recordAudit({
            actorUserId: input.actorUserId,
            action: input.status === 'RESOLVED' ? 'platform.incident_resolved' : 'platform.incident_updated',
            resourceType: 'PlatformIncident',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { status: updated.status },
        });
        return { ...updated, displayId: `INC-${updated.incidentNumber}` };
    },
};
