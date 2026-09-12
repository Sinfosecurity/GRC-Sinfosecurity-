import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { authService } from './authService';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';
import { permissionsForRole } from '../security/rbac';
import { emailStatus, notify } from './notificationDeliveryService';
import { invitationEmailBody } from './publicFrontendUrl';

const PLATFORM_ROLES = new Set<Role>([Role.SUPERADMIN, Role.PLATFORM_ADMIN]);

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
    };
}

export function invitationApiPayload<T extends { token?: string }>(result: T): Omit<T, 'token'> & { token?: string } {
    const { token, ...safe } = result;
    if (process.env.NODE_ENV === 'test' && token) {
        return { ...safe, token };
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
    const actorIsPlatform = PLATFORM_ROLES.has(input.actorRole as Role);
    if (input.targetCurrentRole && PLATFORM_ROLES.has(input.targetCurrentRole as Role) && !actorIsPlatform) {
        throw new ApiError(403, 'Only a platform administrator can change a platform role');
    }
    if (input.nextRole && PLATFORM_ROLES.has(input.nextRole as Role) && !actorIsPlatform) {
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
        const result = await authService.invite({ organizationId, invitedById, email, role });
        const delivery = await notify({
            organizationId,
            userId: invitedById,
            eventType: 'user.invitation',
            title: 'You are invited to Supreme Risk',
            body: `An administrator invited you with role ${role}.`,
            emailBody: invitationEmailBody(role, result.token),
            resourceType: 'AccountInvitation',
            resourceId: result.invitation.id,
            emailTo: email,
        });
        return invitationApiPayload({
            invitation: result.invitation,
            emailStatus: typeof delivery === 'object' && delivery && 'email' in delivery ? delivery.email : emailStatus(),
            token: result.token,
        });
    },

    async listInvitations(organizationId: string) {
        return prisma.accountInvitation.findMany({
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
            },
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
        const result = await authService.rotateInvitationToken(invitation.id);
        const delivery = await notify({
            organizationId,
            userId: invitedById,
            eventType: 'user.invitation',
            title: 'Supreme Risk invitation (resent)',
            body: `Your invitation to join the organization as ${invitation.role} was resent.`,
            emailBody: invitationEmailBody(invitation.role, result.token),
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
        return invitationApiPayload({
            invitation: { ...invitation, expiresAt: result.expiresAt },
            emailStatus: typeof delivery === 'object' && delivery && 'email' in delivery ? delivery.email : emailStatus(),
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
