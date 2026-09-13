import { OrganizationStatus, Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { authService } from './authService';
import { recordAudit } from './auditEventService';
import { invitationEmailBody, portalFrontendUrl } from './publicFrontendUrl';
import { notify } from './notificationDeliveryService';

const TESTER_ROLES = new Set<Role>([
    Role.ORGANIZATION_ADMIN,
    Role.ASSESSOR,
    Role.APPROVER,
    Role.VIEWER,
]);

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export const privateTesterService = {
    async list() {
        return prisma.organization.findMany({
            where: { isDemo: true },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                status: true,
                plan: true,
                isDemo: true,
                createdAt: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        status: true,
                    },
                },
                invitations: {
                    where: { status: 'PENDING' },
                    select: { id: true, email: true, role: true, status: true, expiresAt: true },
                },
            },
        });
    },

    async provision(input: {
        organizationName: string;
        testerEmail: string;
        testerRole?: string;
        country?: string;
        invitedById: string;
        actorRole: Role;
    }) {
        const email = normalizeEmail(input.testerEmail);
        if (!email || !email.includes('@')) {
            throw new ApiError(400, 'A unique tester email is required.');
        }
        const name = String(input.organizationName || '').trim();
        if (name.length < 2) {
            throw new ApiError(400, 'Organization name is required.');
        }
        const role = (input.testerRole || Role.ORGANIZATION_ADMIN) as Role;
        if (!TESTER_ROLES.has(role)) {
            throw new ApiError(400, 'Tester role must be ORGANIZATION_ADMIN, ASSESSOR, APPROVER, or VIEWER.');
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ApiError(409, 'That email already belongs to a Supreme user. Invite a unique tester identity.');
        }
        const pending = await prisma.accountInvitation.findFirst({
            where: { email, status: 'PENDING' },
        });
        if (pending) {
            throw new ApiError(409, 'That email already has a pending invitation.');
        }

        const organization = await prisma.organization.create({
            data: {
                name,
                country: input.country || 'US',
                plan: 'STARTER',
                status: OrganizationStatus.TRIAL,
                isDemo: true,
                trialStart: new Date(),
                trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        const { invitation, token } = await authService.invite({
            organizationId: organization.id,
            invitedById: input.invitedById,
            email,
            role,
        });

        await recordAudit({
            organizationId: organization.id,
            actorUserId: input.invitedById,
            action: 'private_beta.tester_provisioned',
            resourceType: 'Organization',
            resourceId: organization.id,
            result: 'success',
            metadata: { email, role, invitationId: invitation.id },
        });

        const activationUrl = `${portalFrontendUrl('CUSTOMER').replace(/\/$/, '')}/activate?token=${token}`;
        try {
            await notify({
                organizationId: organization.id,
                userId: input.invitedById,
                eventType: 'user.invitation',
                title: 'You are invited to Supreme private testing',
                body: `You were invited to a private-beta organization as ${role}.`,
                emailBody: invitationEmailBody(role, token),
                resourceType: 'AccountInvitation',
                resourceId: invitation.id,
                emailTo: email,
            });
        } catch {
            // Invitation remains valid if mail/in-app notify fails.
        }

        return {
            organization: {
                id: organization.id,
                name: organization.name,
                isDemo: true,
                status: organization.status,
            },
            invitation: {
                id: invitation.id,
                email,
                role,
                status: invitation.status,
            },
            activationUrl,
            token,
            sharedPassword: false,
        };
    },

    async disableOrganization(organizationId: string, actorUserId: string) {
        const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization) {
            throw new ApiError(404, 'Organization not found');
        }
        if (!organization.isDemo) {
            throw new ApiError(403, 'Only private-beta tester organizations can be disabled from this control.');
        }

        const users = await prisma.user.findMany({ where: { organizationId } });
        await prisma.$transaction(async (tx) => {
            await tx.user.updateMany({
                where: { organizationId },
                data: { status: UserAccountStatus.DISABLED, disabledAt: new Date() },
            });
            await tx.refreshToken.updateMany({
                where: { userId: { in: users.map((user) => user.id) }, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await tx.accountInvitation.updateMany({
                where: { organizationId, status: 'PENDING' },
                data: { status: 'REVOKED' },
            });
            await tx.organization.update({
                where: { id: organizationId },
                data: { status: OrganizationStatus.SUSPENDED },
            });
        });

        await recordAudit({
            organizationId,
            actorUserId,
            action: 'private_beta.tester_disabled',
            resourceType: 'Organization',
            resourceId: organizationId,
            result: 'success',
            metadata: { disabledUsers: users.length },
        });

        return { organizationId, status: OrganizationStatus.SUSPENDED, disabledUsers: users.length };
    },

    /**
     * Designate or revoke evaluation access on an existing organization.
     * Does not suspend users, invent a paid plan, or require database access.
     */
    async setTestingAccess(organizationId: string, enabled: boolean, actorUserId: string) {
        const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization) {
            throw new ApiError(404, 'Organization not found');
        }

        if (organization.isDemo !== enabled) {
            await prisma.organization.update({
                where: { id: organizationId },
                data: {
                    isDemo: enabled,
                    ...(enabled && organization.status === OrganizationStatus.SUSPENDED
                        ? { status: OrganizationStatus.TRIAL }
                        : {}),
                },
            });
            await recordAudit({
                organizationId,
                actorUserId,
                action: enabled ? 'private_beta.testing_access_granted' : 'private_beta.testing_access_revoked',
                resourceType: 'Organization',
                resourceId: organizationId,
                result: 'success',
                metadata: { previousTestingAccess: organization.isDemo, testingAccess: enabled },
            });
        }

        const current = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true, plan: true, status: true, isDemo: true },
        });
        return {
            organizationId: current!.id,
            name: current!.name,
            plan: current!.plan,
            status: current!.status,
            testingAccess: Boolean(current!.isDemo),
            billingChargeable: false,
        };
    },
};
