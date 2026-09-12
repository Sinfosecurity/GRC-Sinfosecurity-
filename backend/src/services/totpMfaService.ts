import crypto from 'crypto';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './auditEventService';
import { hashToken, randomToken } from './passwordService';
import { decryptSecret, encryptSecret } from '../security/secretBox';
import { generateTotpSecret, otpauthUrl, totpAt, verifyTotp } from '../security/totp';

const RECOVERY_COUNT = 8;
const CHALLENGE_MINUTES = 10;

function recoveryCode(): string {
    return crypto.randomBytes(5).toString('hex').slice(0, 10).toUpperCase();
}

export const totpMfaService = {
    totpAt,

    async startEnrollment(userId: string, email: string, meta?: { requestId?: string | null }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ApiError(401, 'Authentication required');
        const secret = generateTotpSecret();
        await prisma.user.update({
            where: { id: userId },
            data: {
                mfaSecretEnc: encryptSecret(secret),
                mfaEnabled: false,
                mfaEnrolledAt: null,
            },
        });
        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: userId,
            action: 'mfa.enrollment_started',
            resourceType: 'User',
            resourceId: userId,
            result: 'success',
            requestId: meta?.requestId,
        });
        return {
            secret,
            otpauthUrl: otpauthUrl({ secret, accountName: email, issuer: 'Supreme Risk' }),
        };
    },

    async confirmEnrollment(userId: string, code: string, meta?: { requestId?: string | null }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.mfaSecretEnc) {
            throw new ApiError(400, 'MFA enrollment has not been started');
        }
        const secret = decryptSecret(user.mfaSecretEnc);
        const verified = verifyTotp(secret, code, { lastCounter: user.mfaLastCounter });
        if (!verified.valid || verified.counter == null) {
            await recordAudit({
                organizationId: user.organizationId,
                actorUserId: userId,
                action: 'mfa.enrollment_failed',
                resourceType: 'User',
                resourceId: userId,
                result: 'failure',
                requestId: meta?.requestId,
            });
            throw new ApiError(403, 'Invalid verification code');
        }
        const codes = Array.from({ length: RECOVERY_COUNT }, () => recoveryCode());
        await prisma.$transaction([
            prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
            prisma.mfaRecoveryCode.createMany({
                data: codes.map((item) => ({ userId, codeHash: hashToken(item) })),
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    mfaEnabled: true,
                    mfaEnrolledAt: new Date(),
                    lastMfaVerifiedAt: new Date(),
                    mfaLastCounter: verified.counter,
                },
            }),
        ]);
        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: userId,
            action: 'mfa.enrollment_completed',
            resourceType: 'User',
            resourceId: userId,
            result: 'success',
            requestId: meta?.requestId,
        });
        return { recoveryCodes: codes };
    },

    async verifyCode(userId: string, code: string, meta?: { requestId?: string | null; purpose?: string }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.mfaEnabled || !user.mfaSecretEnc) {
            throw new ApiError(403, 'MFA is not enrolled');
        }
        const secret = decryptSecret(user.mfaSecretEnc);
        const totp = verifyTotp(secret, code, { lastCounter: user.mfaLastCounter });
        if (totp.valid && totp.counter != null) {
            await prisma.user.update({
                where: { id: userId },
                data: { lastMfaVerifiedAt: new Date(), mfaLastCounter: totp.counter },
            });
            await recordAudit({
                organizationId: user.organizationId,
                actorUserId: userId,
                action: meta?.purpose === 'step_up' ? 'auth.step_up' : 'mfa.verified',
                resourceType: 'User',
                resourceId: userId,
                result: 'success',
                requestId: meta?.requestId,
            });
            return { method: 'TOTP' as const };
        }
        const used = await this.consumeRecoveryCode(userId, code);
        if (used) {
            await prisma.user.update({
                where: { id: userId },
                data: { lastMfaVerifiedAt: new Date() },
            });
            await recordAudit({
                organizationId: user.organizationId,
                actorUserId: userId,
                action: 'mfa.recovery_used',
                resourceType: 'User',
                resourceId: userId,
                result: 'success',
                requestId: meta?.requestId,
            });
            return { method: 'RECOVERY' as const };
        }
        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: userId,
            action: 'mfa.failed',
            resourceType: 'User',
            resourceId: userId,
            result: 'failure',
            requestId: meta?.requestId,
            metadata: { replayed: totp.replayed === true },
        });
        throw new ApiError(403, 'Invalid verification code');
    },

    async consumeRecoveryCode(userId: string, code: string) {
        const normalized = String(code || '').replace(/[\s-]/g, '').toUpperCase();
        if (normalized.length < 8) return false;
        const hashed = hashToken(normalized);
        const row = await prisma.mfaRecoveryCode.findFirst({
            where: { userId, codeHash: hashed, usedAt: null },
        });
        if (!row) return false;
        await prisma.mfaRecoveryCode.update({
            where: { id: row.id },
            data: { usedAt: new Date() },
        });
        return true;
    },

    async createChallenge(userId: string, purpose: 'MFA_LOGIN' | 'MFA_ENROLL' | 'STEP_UP') {
        const token = randomToken();
        await prisma.authChallenge.create({
            data: {
                userId,
                purpose,
                tokenHash: hashToken(token),
                expiresAt: new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000),
            },
        });
        return token;
    },

    async consumeChallenge(token: string, purpose: string) {
        const stored = await prisma.authChallenge.findUnique({
            where: { tokenHash: hashToken(token) },
        });
        if (!stored || stored.purpose !== purpose || stored.consumedAt || stored.expiresAt < new Date()) {
            throw new ApiError(401, 'Invalid credentials');
        }
        await prisma.authChallenge.update({
            where: { id: stored.id },
            data: { consumedAt: new Date() },
        });
        return stored.userId;
    },

    async reset(targetUserId: string, actorUserId: string, meta?: { requestId?: string | null }) {
        const target = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target) throw new ApiError(404, 'User not found');
        await prisma.$transaction([
            prisma.user.update({
                where: { id: targetUserId },
                data: {
                    mfaEnabled: false,
                    mfaSecretEnc: null,
                    mfaEnrolledAt: null,
                    lastMfaVerifiedAt: null,
                    mfaLastCounter: null,
                },
            }),
            prisma.mfaRecoveryCode.deleteMany({ where: { userId: targetUserId } }),
            prisma.authChallenge.updateMany({
                where: { userId: targetUserId, consumedAt: null },
                data: { consumedAt: new Date() },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: targetUserId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
            prisma.privilegeElevation.updateMany({
                where: { userId: targetUserId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await recordAudit({
            organizationId: target.organizationId,
            actorUserId,
            action: 'mfa.reset',
            resourceType: 'User',
            resourceId: targetUserId,
            result: 'success',
            requestId: meta?.requestId,
        });
    },
};
