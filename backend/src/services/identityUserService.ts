import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { authService } from './authService';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';
import { permissionsForRole } from '../security/rbac';

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

    async updateRole(id: string, organizationId: string, role: Role, actorUserId: string) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
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

    async setDisabled(id: string, organizationId: string, disabled: boolean, actorUserId: string) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) {
            throw new ApiError(404, 'User not found');
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

    async invite(organizationId: string, invitedById: string, email: string, role: Role) {
        return authService.invite({ organizationId, invitedById, email, role });
    },
};
