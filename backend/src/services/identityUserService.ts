import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { authService } from './authService';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';
import { permissionsForRole } from '../security/rbac';
import { emailStatus, notify } from './notificationDeliveryService';
import { invitationEmailBody, invitationEmailHtml, portalFrontendUrl } from './publicFrontendUrl';

export const CUSTOMER_ROLE_LABELS: Record<string, { label: string; description: string }> = {
    ORGANIZATION_ADMIN: { label: 'Organization Admin', description: 'Manages the organization, people, and Third Party settings.' },
    ADMIN: { label: 'Organization Admin', description: 'Manages the organization, people, and Third Party settings.' },
    RISK_MANAGER: { label: 'Risk Manager', description: 'Owns residual risk, findings, and decisions.' },
    ASSESSOR: { label: 'Assessor', description: 'Completes assessments and attaches evidence.' },
    APPROVER: { label: 'Approver', description: 'Reviews assessments and records decisions.' },
    VIEWER: { label: 'Viewer', description: 'Can view records but cannot export or change work.' },
    AUDITOR: { label: 'Auditor', description: 'Reads records and audit history.' },
    BUSINESS_OWNER: { label: 'Business Owner', description: 'Follows vendors they own and related work.' },
    COMPLIANCE_OFFICER: { label: 'Assessor', description: 'Completes assessments and attaches evidence.' },
    USER: { label: 'Viewer', description: 'Can view records but cannot export or change work.' },
};

export function customerDeliveryLabel(status?: string | null) {
    if (status === 'DELIVERED') return 'delivered';
    if (status === 'SENT' || status === 'ACCEPTED' || status === 'QUEUED') return 'sent';
    if (status === 'BOUNCED') return 'bounced';
    if (status === 'FAILED' || status === 'REJECTED' || status === 'COMPLAINED' || status === 'ERROR' || status === 'NOT_CONFIGURED') {
        return 'failed';
    }
    return 'unknown';
}

const PLATFORM_ROLES = new Set<Role>([
    Role.SUPERADMIN,
    Role.PLATFORM_ADMIN,
    Role.PLATFORM_OWNER,
    Role.SUPPORT_ADMIN,
    Role.SUPPORT_ANALYST,
    Role.BILLING_SUPPORT,
    Role.SECURITY_ADMIN,
]);

const PLATFORM_OWNER_ROLES = new Set<Role>([Role.SUPERADMIN, Role.PLATFORM_ADMIN, Role.PLATFORM_OWNER]);

const ORG_ADMIN_ROLES = new Set<Role>([Role.ORGANIZATION_ADMIN, Role.ADMIN]);

async function assertRemainingOrgAdmin(organizationId: string, targetId: string, nextRole?: Role) {
    const target = await prisma.user.findFirst({ where: { id: targetId, organizationId } });
    if (!target || !ORG_ADMIN_ROLES.has(target.role)) {
        return;
    }
    if (nextRole && ORG_ADMIN_ROLES.has(nextRole)) {
        return;
    }
    const remaining = await prisma.user.count({
        where: {
            organizationId,
            status: UserAccountStatus.ACTIVE,
            role: { in: [Role.ORGANIZATION_ADMIN, Role.ADMIN] },
            id: { not: targetId },
        },
    });
    if (remaining === 0) {
        throw new ApiError(403, 'Cannot remove the last organization administrator');
    }
}

export const ORG_ASSIGNABLE_ROLES: Role[] = [
    Role.ORGANIZATION_ADMIN,
    Role.ADMIN,
    Role.RISK_MANAGER,
    Role.COMPLIANCE_OFFICER,
    Role.ASSESSOR,
    Role.APPROVER,
    Role.BUSINESS_OWNER,
    Role.AUDITOR,
    Role.VIEWER,
    Role.USER,
];

function publicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    status: UserAccountStatus;
    lastLogin: Date | null;
    createdAt: Date;
}) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        organizationId: user.organizationId,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        permissions: permissionsForRole(user.role),
        roleLabel: CUSTOMER_ROLE_LABELS[user.role]?.label || user.role.replace(/_/g, ' ').toLowerCase(),
        roleDescription: CUSTOMER_ROLE_LABELS[user.role]?.description || '',
    };
}

export function invitationApiPayload<T extends { token?: string; activationUrl?: string; delivery?: string }>(
    result: T
): Omit<T, 'token' | 'activationUrl'> & { token?: string; activationUrl?: string } {
    const { token, activationUrl, ...safe } = result;
    const failed = result.delivery === 'failed' || result.delivery === 'unknown';
    if (process.env.NODE_ENV === 'test' && token) {
        return { ...safe, token, activationUrl };
    }
    if (failed && activationUrl) {
        return { ...safe, activationUrl };
    }
    return safe;
}

export function assertRoleAssignment(input: {
    actorId: string;
    actorRole: Role | string;
    targetId: string;
    targetCurrentRole?: Role | string;
    nextRole?: Role | string;
    action: 'role_change' | 'disable' | 'invite';
}) {
    if (input.action === 'role_change' && input.actorId === input.targetId) {
        throw new ApiError(403, 'You cannot change your own role');
    }
    if (input.action === 'disable' && input.actorId === input.targetId) {
        throw new ApiError(403, 'You cannot deactivate your own account');
    }
    const actorIsOwner = PLATFORM_OWNER_ROLES.has(input.actorRole as Role);
    if (input.targetCurrentRole && PLATFORM_ROLES.has(input.targetCurrentRole as Role) && !actorIsOwner) {
        throw new ApiError(403, 'Only a platform owner can change a platform role');
    }
    if (input.nextRole && PLATFORM_ROLES.has(input.nextRole as Role) && !actorIsOwner) {
        throw new ApiError(403, 'Cannot assign a platform role');
    }
}

export const identityUserService = {
    async list(organizationId: string) {
        const users = await prisma.user.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return users.map(publicUser);
    },

    async getById(id: string, organizationId: string) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        return publicUser(user);
    },

    async updateRole(id: string, organizationId: string, role: Role, actorUserId: string, actorRole: Role) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        assertRoleAssignment({
            actorId: actorUserId,
            actorRole,
            targetId: id,
            targetCurrentRole: user.role,
            nextRole: role,
            action: 'role_change',
        });
        await assertRemainingOrgAdmin(organizationId, id, role);
        const updated = await prisma.user.update({
            where: { id },
            data: { role },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'user.role_change',
            resourceType: 'User',
            resourceId: id,
            result: 'success',
            metadata: { from: user.role, to: role },
        });
        return publicUser(updated);
    },

    async setDisabled(id: string, organizationId: string, disabled: boolean, actorUserId: string, actorRole: Role) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        if (disabled) {
            assertRoleAssignment({
                actorId: actorUserId,
                actorRole,
                targetId: id,
                targetCurrentRole: user.role,
                action: 'disable',
            });
            await assertRemainingOrgAdmin(organizationId, id);
            await prisma.refreshToken.updateMany({
                where: { userId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await prisma.passwordResetToken.updateMany({
                where: { userId: id, usedAt: null },
                data: { usedAt: new Date() },
            });
        }
        const updated = await prisma.user.update({
            where: { id },
            data: {
                status: disabled ? UserAccountStatus.DISABLED : UserAccountStatus.ACTIVE,
                disabledAt: disabled ? new Date() : null,
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: disabled ? 'user.disabled' : 'user.enabled',
            resourceType: 'User',
            resourceId: id,
            result: 'success',
        });
        return publicUser(updated);
    },

    async invite(organizationId: string, invitedById: string, email: string, role: Role, actorRole: Role) {
        assertRoleAssignment({
            actorId: invitedById,
            actorRole,
            targetId: 'invite',
            nextRole: role,
            action: 'invite',
        });
        const normalized = email.trim().toLowerCase();
        if (!normalized || !normalized.includes('@')) {
            throw new ApiError(400, 'Enter a valid work email.');
        }
        const actor = await prisma.user.findUnique({ where: { id: invitedById }, select: { email: true } });
        if (actor?.email?.toLowerCase() === normalized) {
            throw new ApiError(400, 'You already have access. Invite a different person.');
        }
        const existingMember = await prisma.user.findUnique({ where: { email: normalized } });
        if (existingMember) {
            if (existingMember.organizationId === organizationId) {
                throw new ApiError(409, 'That person already has access to this organization.');
            }
            throw new ApiError(409, 'That email already belongs to a Supreme user. Invite a unique work email.');
        }
        const pending = await prisma.accountInvitation.findFirst({
            where: { organizationId, email: normalized, status: 'PENDING' },
        });
        if (pending) {
            return this.resendInvitation(organizationId, pending.id, invitedById, actorRole);
        }
        const [organization, inviter] = await Promise.all([
            prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
            prisma.user.findUnique({ where: { id: invitedById }, select: { firstName: true, lastName: true, email: true } }),
        ]);
        const result = await authService.invite({ organizationId, invitedById, email: normalized, role });
        const roleLabel = CUSTOMER_ROLE_LABELS[role]?.label || 'a team member';
        const invitedByName = [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') || 'A team administrator';
        const delivery = await notify({
            organizationId,
            userId: invitedById,
            eventType: 'user.invitation',
            title: "You're invited to Supreme",
            body: `${invitedByName} invited you as ${roleLabel}.`,
            emailBody: invitationEmailBody(role, result.token, process.env, {
                organizationName: organization?.name,
                invitedByName,
                roleLabel,
            }),
            emailHtml: invitationEmailHtml(role, result.token, process.env, {
                organizationName: organization?.name,
                invitedByName,
                roleLabel,
            }),
            resourceType: 'AccountInvitation',
            resourceId: result.invitation.id,
            emailTo: normalized,
        });
        const emailDelivery = typeof delivery === 'object' && delivery && 'email' in delivery ? String(delivery.email) : emailStatus();
        return invitationApiPayload({
            invitation: result.invitation,
            emailStatus: emailDelivery,
            delivery: customerDeliveryLabel(emailDelivery),
            activationUrl: `${portalFrontendUrl('CUSTOMER').replace(/\/$/, '')}/activate?token=${result.token}`,
            token: result.token,
        });
    },

    async listInvitations(organizationId: string) {
        const rows = await prisma.accountInvitation.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                acceptedAt: true,
                invitedBy: { select: { firstName: true, lastName: true, email: true } },
                emailDeliveryStatus: true,
                emailSentAt: true,
                emailDeliveredAt: true,
                emailFailedAt: true,
            },
        });
        const deliveries = await prisma.notificationDeliveryLog.findMany({
            where: { organizationId, resourceId: { in: rows.map((row) => row.id) } },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((row) => {
            const latest = deliveries.find((item) => item.resourceId === row.id);
            const deliveryStatus = row.emailDeliveryStatus || latest?.status;
            return {
                id: row.id,
                email: row.email,
                role: row.role,
                status: row.status,
                expiresAt: row.expiresAt,
                createdAt: row.createdAt,
                acceptedAt: row.acceptedAt,
                invitedByName: row.invitedBy ? `${row.invitedBy.firstName} ${row.invitedBy.lastName}`.trim() : '—',
                emailDelivery: customerDeliveryLabel(deliveryStatus),
                emailAttemptedAt: row.emailSentAt || latest?.createdAt || null,
                emailDeliveredAt: row.emailDeliveredAt || null,
                emailFailedAt: row.emailFailedAt || null,
            };
        });
    },

    async resendInvitation(organizationId: string, invitationId: string, invitedById: string, actorRole: Role) {
        const invitation = await prisma.accountInvitation.findFirst({
            where: { id: invitationId, organizationId },
        });
        if (!invitation) {
            throw new ApiError(404, 'Invitation not found');
        }
        if (invitation.status !== 'PENDING') {
            throw new ApiError(400, 'Only pending invitations can be resent');
        }
        assertRoleAssignment({
            actorId: invitedById,
            actorRole,
            targetId: invitationId,
            nextRole: invitation.role,
            action: 'invite',
        });
        const [organization, inviter] = await Promise.all([
            prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
            prisma.user.findUnique({ where: { id: invitedById }, select: { firstName: true, lastName: true } }),
        ]);
        const result = await authService.rotateInvitationToken(invitation.id);
        const roleLabel = CUSTOMER_ROLE_LABELS[invitation.role]?.label || 'a team member';
        const invitedByName = [inviter?.firstName, inviter?.lastName].filter(Boolean).join(' ') || 'A team administrator';
        const delivery = await notify({
            organizationId,
            userId: invitedById,
            eventType: 'user.invitation',
            title: 'Your Supreme invitation was resent',
            body: `${invitedByName} resent your invitation as ${roleLabel}.`,
            emailBody: invitationEmailBody(invitation.role, result.token, process.env, {
                organizationName: organization?.name,
                invitedByName,
                roleLabel,
            }),
            emailHtml: invitationEmailHtml(invitation.role, result.token, process.env, {
                organizationName: organization?.name,
                invitedByName,
                roleLabel,
            }),
            resourceType: 'AccountInvitation',
            resourceId: invitation.id,
            emailTo: invitation.email,
        });
        await recordAudit({
            organizationId,
            actorUserId: invitedById,
            action: 'user.invitation_resent',
            resourceType: 'AccountInvitation',
            resourceId: invitation.id,
            result: 'success',
        });
        const emailDelivery = typeof delivery === 'object' && delivery && 'email' in delivery ? String(delivery.email) : emailStatus();
        return invitationApiPayload({
            invitation: { ...invitation, expiresAt: result.expiresAt },
            emailStatus: emailDelivery,
            delivery: customerDeliveryLabel(emailDelivery),
            activationUrl: `${portalFrontendUrl('CUSTOMER').replace(/\/$/, '')}/activate?token=${result.token}`,
            token: result.token,
        });
    },

    async revokeInvitation(organizationId: string, invitationId: string, actorUserId: string, actorRole: Role) {
        const invitation = await prisma.accountInvitation.findFirst({
            where: { id: invitationId, organizationId },
        });
        if (!invitation) {
            throw new ApiError(404, 'Invitation not found');
        }
        if (invitation.status !== 'PENDING') {
            throw new ApiError(400, 'Only pending invitations can be revoked');
        }
        assertRoleAssignment({
            actorId: actorUserId,
            actorRole,
            targetId: invitationId,
            nextRole: invitation.role,
            action: 'invite',
        });
        const updated = await prisma.accountInvitation.update({
            where: { id: invitation.id },
            data: { status: 'REVOKED' },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'user.invitation_revoked',
            resourceType: 'AccountInvitation',
            resourceId: invitation.id,
            result: 'success',
        });
        return updated;
    },
};
