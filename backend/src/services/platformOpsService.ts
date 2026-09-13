import { Role, SupportTicketStatus, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { providerHealth } from './providerHealth';
import { organizationHealth } from './customerHealth';
import { recordAudit } from './auditEventService';
import { hasPermission, isPlatformOwnerRole, PERMISSIONS, isPlatformStaffRole } from '../security/rbac';
import { assertRoleAssignment } from './identityUserService';

const OPEN_STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'WAITING_INTERNAL'] as SupportTicketStatus[];
const OPEN_TICKET = { status: { in: OPEN_STATUSES } };

async function orgSignals(organizationId: string) {
    const [openP1, openP2, openIncidents, failedNotifications, infectedObjects, failedScans, pendingScans, invitationFailures, lastUser] =
        await Promise.all([
            prisma.supportTicket.count({ where: { organizationId, ...OPEN_TICKET, priority: 'P1' } }),
            prisma.supportTicket.count({ where: { organizationId, ...OPEN_TICKET, priority: 'P2' } }),
            prisma.platformIncidentOrg.count({
                where: { organizationId, incident: { status: { not: 'RESOLVED' } } },
            }),
            prisma.notificationDeliveryLog.count({ where: { organizationId, status: 'FAILED' } }),
            prisma.storedObject.count({ where: { organizationId, scanStatus: 'INFECTED' } }),
            prisma.storedObject.count({ where: { organizationId, scanStatus: 'FAILED' } }),
            prisma.storedObject.count({ where: { organizationId, scanStatus: 'PENDING' } }),
            prisma.notificationDeliveryLog.count({
                where: { organizationId, eventType: 'user.invitation', status: 'FAILED' },
            }),
            prisma.user.findFirst({
                where: { organizationId, lastLogin: { not: null } },
                orderBy: { lastLogin: 'desc' },
                select: { lastLogin: true },
            }),
        ]);
    return {
        openP1,
        openP2,
        openIncidents,
        failedNotifications,
        infectedObjects,
        failedScans,
        pendingScans,
        invitationFailures,
        lastLoginAt: lastUser?.lastLogin || null,
    };
}

export const platformOpsService = {
    async overview() {
        const provider = await providerHealth();
        const [
            totalOrgs,
            activeOrgs,
            trialOrgs,
            paidOrgs,
            pastDueOrgs,
            disabledOrgs,
            activeUsers,
            openTickets,
            p1,
            p2,
            openIncidents,
            failedNotifications,
            failedScans,
            pendingDemo,
        ] = await Promise.all([
            prisma.organization.count(),
            prisma.organization.count({ where: { status: 'ACTIVE' } }),
            prisma.organization.count({ where: { status: 'TRIAL' } }),
            prisma.organization.count({ where: { status: 'ACTIVE', subscriptionStatus: { in: ['active', 'trialing'] } } }),
            prisma.organization.count({ where: { OR: [{ status: 'PAST_DUE' }, { subscriptionStatus: 'past_due' }] } }),
            prisma.organization.count({ where: { status: { in: ['SUSPENDED', 'CANCELLED'] } } }),
            prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma.supportTicket.count({ where: OPEN_TICKET }),
            prisma.supportTicket.count({ where: { ...OPEN_TICKET, priority: 'P1' } }),
            prisma.supportTicket.count({ where: { ...OPEN_TICKET, priority: 'P2' } }),
            prisma.platformIncident.count({ where: { status: { not: 'RESOLVED' } } }),
            prisma.notificationDeliveryLog.count({ where: { status: 'FAILED' } }),
            prisma.storedObject.count({ where: { scanStatus: { in: ['FAILED', 'INFECTED'] } } }),
            prisma.demoLead.count({ where: { leadStatus: 'NEW' } }),
        ]);
        return {
            organizations: { total: totalOrgs, active: activeOrgs, trial: trialOrgs, paid: paidOrgs, pastDue: pastDueOrgs, disabled: disabledOrgs },
            activeUsers,
            openSupportTickets: openTickets,
            p1Tickets: p1,
            p2Tickets: p2,
            openIncidents,
            failedNotifications,
            failedEvidenceProcessing: failedScans,
            demoRequestsNeedingFollowUp: pendingDemo,
            provider,
        };
    },

    async attentionQueue() {
        const [p1, p2, incidents, pastDue, failedLeads, failedScans, failedInvites] = await Promise.all([
            prisma.supportTicket.findMany({
                where: { ...OPEN_TICKET, priority: 'P1' },
                include: { organization: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'asc' },
                take: 25,
            }),
            prisma.supportTicket.findMany({
                where: { ...OPEN_TICKET, priority: 'P2' },
                include: { organization: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'asc' },
                take: 25,
            }),
            prisma.platformIncident.findMany({
                where: { status: { not: 'RESOLVED' } },
                orderBy: { startedAt: 'asc' },
                take: 25,
            }),
            prisma.organization.findMany({
                where: { OR: [{ status: 'PAST_DUE' }, { subscriptionStatus: 'past_due' }] },
                select: { id: true, name: true, plan: true, subscriptionStatus: true, status: true },
                take: 25,
            }),
            prisma.demoLead.findMany({
                where: { salesNotification: 'FAILED' },
                orderBy: { submittedAt: 'desc' },
                take: 25,
            }),
            prisma.storedObject.findMany({
                where: { scanStatus: { in: ['FAILED', 'INFECTED'] } },
                select: { id: true, organizationId: true, filename: true, scanStatus: true, uploadedAt: true },
                orderBy: { uploadedAt: 'desc' },
                take: 25,
            }),
            prisma.notificationDeliveryLog.findMany({
                where: { eventType: 'user.invitation', status: 'FAILED' },
                orderBy: { createdAt: 'desc' },
                take: 25,
            }),
        ]);
        const items = [
            ...p1.map((row) => ({
                severity: 'P1',
                kind: 'support',
                id: row.id,
                title: `P1 ${row.subject}`,
                organizationId: row.organizationId,
                organizationName: row.organization.name,
                createdAt: row.createdAt,
            })),
            ...p2.map((row) => ({
                severity: 'P2',
                kind: 'support',
                id: row.id,
                title: `P2 ${row.subject}`,
                organizationId: row.organizationId,
                organizationName: row.organization.name,
                createdAt: row.createdAt,
            })),
            ...incidents.map((row) => ({
                severity: row.severity,
                kind: 'incident',
                id: row.id,
                title: row.title,
                organizationId: null,
                organizationName: null,
                createdAt: row.startedAt,
            })),
            ...pastDue.map((row) => ({
                severity: 'P2',
                kind: 'billing',
                id: row.id,
                title: `Past due — ${row.name}`,
                organizationId: row.id,
                organizationName: row.name,
                createdAt: new Date(),
            })),
            ...failedLeads.map((row) => ({
                severity: 'P3',
                kind: 'demo_notification',
                id: row.id,
                title: `Demo sales notification failed — ${row.company}`,
                organizationId: null,
                organizationName: row.company,
                createdAt: row.submittedAt,
            })),
            ...failedScans.map((row) => ({
                severity: row.scanStatus === 'INFECTED' ? 'P1' : 'P2',
                kind: 'malware',
                id: row.id,
                title: `Evidence ${row.scanStatus.toLowerCase()}`,
                organizationId: row.organizationId,
                organizationName: null,
                createdAt: row.uploadedAt,
            })),
            ...failedInvites.map((row) => ({
                severity: 'P2',
                kind: 'invitation',
                id: row.id,
                title: 'Invitation delivery failed',
                organizationId: row.organizationId,
                organizationName: null,
                createdAt: row.createdAt,
            })),
        ];
        const rank = { P1: 0, P2: 1, P3: 2 };
        return items.sort((a, b) => (rank[a.severity as 'P1' | 'P2' | 'P3'] ?? 9) - (rank[b.severity as 'P1' | 'P2' | 'P3'] ?? 9));
    },

    async listOrganizations(filters: {
        plan?: string;
        status?: string;
        q?: string;
        role: string;
        userId: string;
    }) {
        let allowedOrgIds: string[] | null = null;
        if (!hasPermission(filters.role, PERMISSIONS['platform.organizations.read']) && !isPlatformOwnerRole(filters.role)) {
            const assigned = await prisma.supportTicket.findMany({
                where: { assignedToUserId: filters.userId },
                select: { organizationId: true },
            });
            allowedOrgIds = [...new Set(assigned.map((row) => row.organizationId))];
        }
        const orgs = await prisma.organization.findMany({
            where: {
                ...(filters.plan ? { plan: filters.plan } : {}),
                ...(filters.status ? { status: filters.status as never } : {}),
                ...(allowedOrgIds ? { id: { in: allowedOrgIds } } : {}),
                ...(filters.q
                    ? {
                          OR: [
                              { name: { contains: filters.q, mode: 'insensitive' } },
                              { id: { contains: filters.q, mode: 'insensitive' } },
                              { slug: { contains: filters.q, mode: 'insensitive' } },
                              { contactEmail: { contains: filters.q, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const provider = await providerHealth();
        return Promise.all(
            orgs.map(async (org) => {
                const [users, vendors, assessments, evidence, findings, tickets, lastAudit, signals] = await Promise.all([
                    prisma.user.count({ where: { organizationId: org.id, status: 'ACTIVE' } }),
                    prisma.vendor.count({ where: { organizationId: org.id } }),
                    prisma.vendorAssessment.count({ where: { organizationId: org.id } }),
                    prisma.storedObject.count({ where: { organizationId: org.id } }),
                    prisma.vendorIssue.count({ where: { organizationId: org.id, status: { notIn: ['CLOSED', 'RESOLVED', 'RISK_ACCEPTED'] } } }),
                    prisma.supportTicket.count({ where: { organizationId: org.id, ...OPEN_TICKET } }),
                    prisma.auditEvent.findFirst({
                        where: { organizationId: org.id },
                        orderBy: { timestamp: 'desc' },
                        select: { timestamp: true, action: true },
                    }),
                    orgSignals(org.id),
                ]);
                const health = await organizationHealth({
                    status: org.status,
                    subscriptionStatus: org.subscriptionStatus,
                    ...signals,
                    provider,
                });
                return {
                    id: org.id,
                    name: org.name,
                    plan: org.plan,
                    status: org.status,
                    subscriptionStatus: org.subscriptionStatus,
                    testingAccess: Boolean(org.isDemo),
                    isDemo: Boolean(org.isDemo),
                    createdAt: org.createdAt,
                    activeUsers: users,
                    vendorCount: vendors,
                    assessmentCount: assessments,
                    evidenceCount: evidence,
                    openFindings: findings,
                    openSupportTickets: tickets,
                    lastActivityAt: lastAudit?.timestamp || org.updatedAt,
                    health: health.health,
                };
            })
        );
    },

    async organizationDetail(id: string) {
        const org = await prisma.organization.findUnique({ where: { id } });
        if (!org) throw new ApiError(404, 'Organization not found');
        const [users, invitations, vendors, assessments, evidence, findings, reports, briefs, tickets, signals, billingEvents, notifications] =
            await Promise.all([
                prisma.user.findMany({
                    where: { organizationId: id },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        status: true,
                        lastLogin: true,
                        createdAt: true,
                    },
                }),
                prisma.accountInvitation.findMany({
                    where: { organizationId: id },
                    select: { id: true, email: true, status: true, expiresAt: true, createdAt: true, role: true },
                }),
                prisma.vendor.count({ where: { organizationId: id } }),
                prisma.vendorAssessment.count({ where: { organizationId: id } }),
                prisma.storedObject.groupBy({ by: ['scanStatus'], where: { organizationId: id }, _count: true }),
                prisma.vendorIssue.count({ where: { organizationId: id, status: { notIn: ['CLOSED', 'RESOLVED', 'RISK_ACCEPTED'] } } }),
                prisma.operationalEvent.count({ where: { organizationId: id, kind: 'report_failure' } }),
                prisma.riskDecisionBrief.count({ where: { organizationId: id } }),
                prisma.supportTicket.findMany({
                    where: { organizationId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        ticketNumber: true,
                        subject: true,
                        status: true,
                        priority: true,
                        assignedToUserId: true,
                        createdAt: true,
                    },
                }),
                orgSignals(id),
                prisma.subscriptionEvent.findMany({
                    where: { organizationId: id },
                    orderBy: { processedAt: 'desc' },
                    take: 5,
                    select: { type: true, processedAt: true, stripeEventId: true },
                }),
                prisma.notificationDeliveryLog.findMany({
                    where: { organizationId: id, status: 'FAILED' },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                }),
            ]);
        const health = await organizationHealth({
            status: org.status,
            subscriptionStatus: org.subscriptionStatus,
            ...signals,
        });
        return {
            summary: {
                id: org.id,
                name: org.name,
                plan: org.plan,
                status: org.status,
                subscriptionStatus: org.subscriptionStatus,
                testingAccess: Boolean(org.isDemo),
                isDemo: Boolean(org.isDemo),
                createdAt: org.createdAt,
                contactName: org.contactName,
                contactEmail: org.contactEmail,
                health: health.health,
                healthSignals: health.signals.filter((signal) => signal.observed),
            },
            users: users.map((user) => ({
                ...user,
                password: undefined,
            })),
            invitations: invitations.map((invitation) => ({
                id: invitation.id,
                email: invitation.email,
                status: invitation.status,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                createdAt: invitation.createdAt,
            })),
            usage: {
                vendors,
                assessments,
                evidenceObjects: evidence.reduce((sum, row) => sum + row._count, 0),
                evidenceByScan: evidence,
                openFindings: findings,
                reportFailures: reports,
                decisionBriefs: briefs,
            },
            billing: {
                plan: org.plan,
                interval: org.billingInterval,
                status: org.subscriptionStatus,
                cancelAtPeriodEnd: org.cancelAtPeriodEnd,
                stripeCustomerRef: org.billingCustomerId,
                stripeSubscriptionRef: org.billingSubscriptionId,
                recentEvents: billingEvents,
            },
            support: tickets.map((ticket) => ({ ...ticket, displayId: `SUP-${ticket.ticketNumber}` })),
            notifications,
            health,
        };
    },

    async billingDirectory() {
        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                billingInterval: true,
                subscriptionStatus: true,
                cancelAtPeriodEnd: true,
                billingCustomerId: true,
                billingSubscriptionId: true,
                status: true,
            },
            orderBy: { name: 'asc' },
        });
        return orgs.map((org) => ({
            ...org,
            stripeCustomerRef: org.billingCustomerId,
            stripeSubscriptionRef: org.billingSubscriptionId,
            billingCustomerId: undefined,
            billingSubscriptionId: undefined,
        }));
    },

    async malwareOperations() {
        return prisma.storedObject.findMany({
            where: { scanStatus: { in: ['FAILED', 'INFECTED', 'PENDING', 'NOT_CONFIGURED'] } },
            select: {
                id: true,
                organizationId: true,
                filename: true,
                scanStatus: true,
                uploadedAt: true,
                size: true,
            },
            orderBy: { uploadedAt: 'desc' },
            take: 100,
        });
    },

    async notificationFailures() {
        return prisma.notificationDeliveryLog.findMany({
            where: { status: { in: ['FAILED', 'NOT_CONFIGURED'] } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    },

    async reportFailures() {
        return prisma.operationalEvent.findMany({
            where: { kind: 'report_failure' },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    },

    async search(q: string) {
        const query = q.trim();
        if (query.length < 2) return { organizations: [], tickets: [], incidents: [], leads: [] };
        const [organizations, tickets, incidents, leads] = await Promise.all([
            prisma.organization.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { id: { contains: query, mode: 'insensitive' } },
                        { contactEmail: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, name: true, plan: true, status: true },
                take: 10,
            }),
            prisma.supportTicket.findMany({
                where: {
                    OR: [
                        { subject: { contains: query, mode: 'insensitive' } },
                        { id: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, ticketNumber: true, subject: true, organizationId: true },
                take: 10,
            }),
            prisma.platformIncident.findMany({
                where: { OR: [{ title: { contains: query, mode: 'insensitive' } }, { id: { contains: query, mode: 'insensitive' } }] },
                select: { id: true, incidentNumber: true, title: true, severity: true },
                take: 10,
            }),
            prisma.demoLead.findMany({
                where: {
                    OR: [
                        { email: { contains: query, mode: 'insensitive' } },
                        { company: { contains: query, mode: 'insensitive' } },
                        { id: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, company: true, email: true, leadStatus: true },
                take: 10,
            }),
        ]);
        return {
            organizations,
            tickets: tickets.map((ticket) => ({ ...ticket, displayId: `SUP-${ticket.ticketNumber}` })),
            incidents: incidents.map((incident) => ({ ...incident, displayId: `INC-${incident.incidentNumber}` })),
            leads,
        };
    },

    async internalUsers() {
        return prisma.user.findMany({
            where: {
                role: {
                    in: [
                        Role.PLATFORM_OWNER,
                        Role.PLATFORM_ADMIN,
                        Role.SUPERADMIN,
                        Role.SUPPORT_ADMIN,
                        Role.SUPPORT_ANALYST,
                        Role.BILLING_SUPPORT,
                        Role.SECURITY_ADMIN,
                    ],
                },
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                lastLogin: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    async updateInternalRole(input: {
        targetId: string;
        nextRole: Role;
        actorId: string;
        actorRole: Role;
        requestId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
    }) {
        if (!isPlatformOwnerRole(input.actorRole)) {
            throw new ApiError(403, 'Only a platform owner can manage internal roles');
        }
        const target = await prisma.user.findUnique({ where: { id: input.targetId } });
        if (!target) throw new ApiError(404, 'User not found');
        if (!isPlatformStaffRole(target.role) && !isPlatformStaffRole(input.nextRole)) {
            throw new ApiError(400, 'This endpoint manages platform staff only');
        }
        assertRoleAssignment({
            actorId: input.actorId,
            actorRole: input.actorRole,
            targetId: input.targetId,
            targetCurrentRole: target.role,
            nextRole: input.nextRole,
            action: 'role_change',
        });
        const owners = await prisma.user.count({
            where: { role: { in: [Role.PLATFORM_OWNER, Role.PLATFORM_ADMIN, Role.SUPERADMIN] }, status: UserAccountStatus.ACTIVE },
        });
        const ownerRoles: Role[] = [Role.PLATFORM_OWNER, Role.PLATFORM_ADMIN, Role.SUPERADMIN];
        const targetIsOwner = ownerRoles.includes(target.role);
        const nextIsOwner = ownerRoles.includes(input.nextRole);
        if (targetIsOwner && !nextIsOwner && owners <= 1) {
            throw new ApiError(403, 'Cannot demote the last platform owner');
        }
        const updated = await prisma.user.update({
            where: { id: input.targetId },
            data: { role: input.nextRole },
            select: { id: true, email: true, role: true, status: true },
        });
        await recordAudit({
            organizationId: target.organizationId,
            actorUserId: input.actorId,
            action: 'platform.role_change',
            resourceType: 'User',
            resourceId: updated.id,
            result: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { from: target.role, to: updated.role },
        });
        return updated;
    },

    async platformAudit(filters?: { q?: string; action?: string }) {
        return prisma.auditEvent.findMany({
            where: {
                OR: [
                    { action: { startsWith: 'platform.' } },
                    { action: { startsWith: 'support.' } },
                    { action: { startsWith: 'mfa.' } },
                ],
                ...(filters?.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
                ...(filters?.q
                    ? {
                          OR: [
                              { action: { contains: filters.q, mode: 'insensitive' } },
                              { resourceId: { contains: filters.q, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
            },
            include: { actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
    },
};
