import jwt, { SignOptions } from 'jsonwebtoken';
import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { canonicalizeRole, permissionsForRole } from '../security/rbac';
import { hashPassword, hashToken, randomToken, validatePasswordPolicy, verifyPassword } from './passwordService';
import { recordAudit } from './auditEventService';
import { ApiError } from '../middleware/errorHandler';

const GENERIC_AUTH_ERROR = 'Invalid credentials';

export type PublicUser = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    permissions: string[];
    organizationStatus?: string;
    plan?: string;
};

function toPublicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    organization?: { status: string; plan: string } | null;
}): PublicUser {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        permissions: permissionsForRole(user.role),
        organizationStatus: user.organization?.status,
        plan: user.organization?.plan,
    };
}

function signAccessToken(user: { id: string; email: string; role: string; organizationId: string }): string {
    const env = getEnv();
    const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
    return jwt.sign(
        {
            userId: user.id,
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        },
        env.jwtSecret,
        options
    );
}

async function issueRefreshToken(userId: string): Promise<string> {
    const env = getEnv();
    const token = randomToken();
    const days = env.jwtRefreshExpiresIn.endsWith('d')
        ? parseInt(env.jwtRefreshExpiresIn, 10)
        : 7;
    await prisma.refreshToken.create({
        data: {
            tokenHash: hashToken(token),
            userId,
            expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
    });
    return token;
}

function cookieOptions() {
    return {
        httpOnly: true,
        secure: getEnv().isProduction,
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000,
    };
}

export const authService = {
    cookieOptions,

    async login(email: string, password: string, meta?: { ip?: string; userAgent?: string; requestId?: string }) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { organization: true },
        });

        if (!user) {
            await recordAudit({
                action: 'auth.login',
                resourceType: 'User',
                result: 'failure',
                ipAddress: meta?.ip,
                userAgent: meta?.userAgent,
                requestId: meta?.requestId,
                metadata: { reason: 'unknown_user' },
            });
            throw new ApiError(401, GENERIC_AUTH_ERROR);
        }

        if (user.status === UserAccountStatus.DISABLED) {
            await recordAudit({
                organizationId: user.organizationId,
                actorUserId: user.id,
                action: 'auth.login',
                resourceType: 'User',
                resourceId: user.id,
                result: 'failure',
                ipAddress: meta?.ip,
                userAgent: meta?.userAgent,
                requestId: meta?.requestId,
                metadata: { reason: 'disabled' },
            });
            throw new ApiError(401, GENERIC_AUTH_ERROR);
        }

        if (user.status === UserAccountStatus.PENDING_ACTIVATION) {
            throw new ApiError(401, GENERIC_AUTH_ERROR);
        }

        if (user.organization.status === 'SUSPENDED' || user.organization.status === 'CANCELLED') {
            throw new ApiError(403, 'Organization is not active');
        }

        const valid = await verifyPassword(password, user.hashedPassword);
        if (!valid) {
            await recordAudit({
                organizationId: user.organizationId,
                actorUserId: user.id,
                action: 'auth.login',
                resourceType: 'User',
                resourceId: user.id,
                result: 'failure',
                ipAddress: meta?.ip,
                userAgent: meta?.userAgent,
                requestId: meta?.requestId,
                metadata: { reason: 'bad_password' },
            });
            throw new ApiError(401, GENERIC_AUTH_ERROR);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const accessToken = signAccessToken(user);
        const refreshToken = await issueRefreshToken(user.id);

        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: user.id,
            action: 'auth.login',
            resourceType: 'User',
            resourceId: user.id,
            result: 'success',
            ipAddress: meta?.ip,
            userAgent: meta?.userAgent,
            requestId: meta?.requestId,
        });

        return {
            token: accessToken,
            refreshToken,
            user: toPublicUser(user),
        };
    },

    async logout(refreshToken?: string, userId?: string) {
        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { tokenHash: hashToken(refreshToken) },
                data: { revokedAt: new Date() },
            });
        }
        if (userId) {
            await recordAudit({
                actorUserId: userId,
                action: 'auth.logout',
                resourceType: 'User',
                resourceId: userId,
                result: 'success',
            });
        }
    },

    async refresh(refreshToken: string) {
        const hashed = hashToken(refreshToken);
        const stored = await prisma.refreshToken.findUnique({
            where: { tokenHash: hashed },
            include: { user: { include: { organization: true } } },
        });

        if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            throw new ApiError(401, 'Invalid or expired token');
        }

        if (stored.user.status !== UserAccountStatus.ACTIVE) {
            throw new ApiError(401, 'Invalid or expired token');
        }

        await prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });

        const accessToken = signAccessToken(stored.user);
        const nextRefresh = await issueRefreshToken(stored.user.id);
        return {
            token: accessToken,
            refreshToken: nextRefresh,
            user: toPublicUser(stored.user),
        };
    },

    async me(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!user || user.status !== UserAccountStatus.ACTIVE) {
            throw new ApiError(401, 'Authentication required');
        }
        return toPublicUser(user);
    },

    async changePassword(userId: string, currentPassword: string, nextPassword: string) {
        const policyError = validatePasswordPolicy(nextPassword);
        if (policyError) {
            throw new ApiError(422, policyError);
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new ApiError(401, 'Authentication required');
        }
        const valid = await verifyPassword(currentPassword, user.hashedPassword);
        if (!valid) {
            throw new ApiError(401, GENERIC_AUTH_ERROR);
        }
        await prisma.user.update({
            where: { id: userId },
            data: {
                hashedPassword: await hashPassword(nextPassword),
                passwordChangedAt: new Date(),
            },
        });
        await prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: userId,
            action: 'auth.password_change',
            resourceType: 'User',
            resourceId: userId,
            result: 'success',
        });
    },

    async requestPasswordReset(email: string) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user || user.status === UserAccountStatus.DISABLED) {
            return { requested: true };
        }
        const token = randomToken();
        await prisma.passwordResetToken.create({
            data: {
                tokenHash: hashToken(token),
                userId: user.id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        });
        await recordAudit({
            organizationId: user.organizationId,
            actorUserId: user.id,
            action: 'auth.password_reset_requested',
            resourceType: 'User',
            resourceId: user.id,
            result: 'success',
        });
        return { requested: true, resetToken: process.env.NODE_ENV === 'test' ? token : undefined, userId: user.id };
    },

    async resetPassword(token: string, nextPassword: string) {
        const policyError = validatePasswordPolicy(nextPassword);
        if (policyError) {
            throw new ApiError(422, policyError);
        }
        const stored = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(token) },
        });
        if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
            throw new ApiError(400, 'Reset link is invalid or expired');
        }
        await prisma.$transaction([
            prisma.user.update({
                where: { id: stored.userId },
                data: {
                    hashedPassword: await hashPassword(nextPassword),
                    passwordChangedAt: new Date(),
                    status: UserAccountStatus.ACTIVE,
                },
            }),
            prisma.passwordResetToken.update({
                where: { id: stored.id },
                data: { usedAt: new Date() },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: stored.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await recordAudit({
            actorUserId: stored.userId,
            action: 'auth.password_reset',
            resourceType: 'User',
            resourceId: stored.userId,
            result: 'success',
        });
    },

    async signup(input: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        organizationName: string;
        country?: string;
    }) {
        const policyError = validatePasswordPolicy(input.password);
        if (policyError) {
            throw new ApiError(422, policyError);
        }
        const email = input.email.toLowerCase().trim();
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ApiError(409, 'Unable to create account');
        }

        const slugBase = input.organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'org';
        const slug = `${slugBase}-${randomToken(4)}`;
        const trialStart = new Date();
        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        const organization = await prisma.organization.create({
            data: {
                name: input.organizationName,
                country: input.country || 'US',
                slug,
                status: 'TRIAL',
                plan: 'STARTER',
                trialStart,
                trialEnd,
                subscriptionStatus: 'trialing',
            },
        });

        const user = await prisma.user.create({
            data: {
                email,
                hashedPassword: await hashPassword(input.password),
                firstName: input.firstName,
                lastName: input.lastName,
                role: Role.ORGANIZATION_ADMIN,
                organizationId: organization.id,
                status: UserAccountStatus.ACTIVE,
                emailVerifiedAt: null,
                passwordChangedAt: new Date(),
            },
            include: { organization: true },
        });

        await recordAudit({
            organizationId: organization.id,
            actorUserId: user.id,
            action: 'auth.signup',
            resourceType: 'Organization',
            resourceId: organization.id,
            result: 'success',
        });

        const accessToken = signAccessToken(user);
        const refreshToken = await issueRefreshToken(user.id);
        return {
            token: accessToken,
            refreshToken,
            user: toPublicUser(user),
        };
    },

    async invite(input: {
        organizationId: string;
        invitedById: string;
        email: string;
        role: Role;
    }) {
        const token = randomToken();
        const invitation = await prisma.accountInvitation.create({
            data: {
                email: input.email.toLowerCase().trim(),
                role: input.role,
                organizationId: input.organizationId,
                invitedById: input.invitedById,
                tokenHash: hashToken(token),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        await recordAudit({
            organizationId: input.organizationId,
            actorUserId: input.invitedById,
            action: 'user.invited',
            resourceType: 'AccountInvitation',
            resourceId: invitation.id,
            result: 'success',
            metadata: { email: input.email, role: input.role },
        });
        return { invitation, token: process.env.NODE_ENV === 'test' ? token : undefined };
    },

    async acceptInvitation(token: string, input: { password: string; firstName: string; lastName: string }) {
        const policyError = validatePasswordPolicy(input.password);
        if (policyError) {
            throw new ApiError(422, policyError);
        }
        const invitation = await prisma.accountInvitation.findUnique({
            where: { tokenHash: hashToken(token) },
        });
        if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
            throw new ApiError(400, 'Invitation is invalid or expired');
        }
        const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
        if (existing) {
            throw new ApiError(409, 'Unable to activate account');
        }
        const user = await prisma.user.create({
            data: {
                email: invitation.email,
                hashedPassword: await hashPassword(input.password),
                firstName: input.firstName,
                lastName: input.lastName,
                role: invitation.role,
                organizationId: invitation.organizationId,
                status: UserAccountStatus.ACTIVE,
                emailVerifiedAt: new Date(),
                passwordChangedAt: new Date(),
            },
            include: { organization: true },
        });
        await prisma.accountInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        await recordAudit({
            organizationId: invitation.organizationId,
            actorUserId: user.id,
            action: 'user.activated',
            resourceType: 'User',
            resourceId: user.id,
            result: 'success',
        });
        const accessToken = signAccessToken(user);
        const refreshToken = await issueRefreshToken(user.id);
        return { token: accessToken, refreshToken, user: toPublicUser(user) };
    },

    canonicalizeRole,
};
