import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { totpMfaService } from './totpMfaService';

export const privilegeElevationService = {
    durationMinutes() {
        return getEnv().elevationMinutes;
    },

    async stepUp(userId: string, code: string, meta?: { requestId?: string | null }) {
        await totpMfaService.verifyCode(userId, code, { ...meta, purpose: 'step_up' });
        const expiresAt = new Date(Date.now() + this.durationMinutes() * 60 * 1000);
        await prisma.privilegeElevation.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        const elevation = await prisma.privilegeElevation.create({
            data: { userId, expiresAt, requestId: meta?.requestId },
        });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await recordAudit({
            organizationId: user?.organizationId,
            actorUserId: userId,
            action: 'platform.elevation_started',
            resourceType: 'PrivilegeElevation',
            resourceId: elevation.id,
            result: 'success',
            requestId: meta?.requestId,
            metadata: { expiresAt },
        });
        return { expiresAt, minutes: this.durationMinutes() };
    },

    async requireActive(userId: string) {
        const elevation = await prisma.privilegeElevation.findFirst({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { expiresAt: 'desc' },
        });
        if (!elevation) {
            throw new ApiError(403, 'Step-up authentication is required');
        }
        return elevation;
    },
};
