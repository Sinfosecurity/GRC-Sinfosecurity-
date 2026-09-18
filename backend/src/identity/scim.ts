import { Role, UserAccountStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { hashToken, randomToken } from '../services/passwordService';
import { identityAudit, normalizeEmail, publicIdentityId } from './core';
import { identityServiceUrls } from '../services/publicFrontendUrl';
import { identityService, revokeUserAccess } from './service';
import { assertMappableRole } from './core';

const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
const MAX_COUNT = 100;

export function scimError(status: number, detail: string, scimType?: string) {
    return {
        schemas: [ERROR_SCHEMA],
        status: String(status),
        detail,
        scimType,
    };
}

export function scimUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserAccountStatus;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    identityAccounts?: Array<{ subject: string }>;
}) {
    return {
        schemas: [USER_SCHEMA],
        id: user.id,
        externalId: user.identityAccounts?.[0]?.subject || user.email,
        userName: user.email,
        name: { givenName: user.firstName, familyName: user.lastName },
        displayName: `${user.firstName} ${user.lastName}`.trim(),
        active: user.status === UserAccountStatus.ACTIVE,
        emails: [{ value: user.email, primary: true, type: 'work' }],
        meta: {
            resourceType: 'User',
            created: user.createdAt.toISOString(),
            lastModified: user.updatedAt.toISOString(),
            location: `/scim/v2/Users/${user.id}`,
        },
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
            department: user.role,
        },
    };
}

export function scimGroup(group: {
    id: string;
    displayName: string;
    externalId: string;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{ userId: string }>;
}) {
    return {
        schemas: [GROUP_SCHEMA],
        id: group.id,
        externalId: group.externalId,
        displayName: group.displayName,
        members: (group.members || []).map((member) => ({ value: member.userId })),
        meta: {
            resourceType: 'Group',
            created: group.createdAt.toISOString(),
            lastModified: group.updatedAt.toISOString(),
            location: `/scim/v2/Groups/${group.id}`,
        },
    };
}

export const scimService = {
    serviceProviderConfig() {
        return {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
            patch: { supported: true },
            bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
            filter: { supported: true, maxResults: MAX_COUNT },
            changePassword: { supported: false },
            sort: { supported: false },
            etag: { supported: false },
            authenticationSchemes: [{
                type: 'oauthbearertoken',
                name: 'OAuth Bearer Token',
                description: 'Organization-scoped SCIM token',
            }],
            meta: { resourceType: 'ServiceProviderConfig', location: '/scim/v2/ServiceProviderConfig' },
        };
    },

    resourceTypes() {
        return {
            schemas: [LIST_SCHEMA],
            totalResults: 2,
            Resources: [
                { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'User', name: 'User', endpoint: '/Users', schema: USER_SCHEMA },
                { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'Group', name: 'Group', endpoint: '/Groups', schema: GROUP_SCHEMA },
            ],
        };
    },

    schemas() {
        return {
            schemas: [LIST_SCHEMA],
            totalResults: 2,
            Resources: [{ id: USER_SCHEMA, name: 'User' }, { id: GROUP_SCHEMA, name: 'Group' }],
        };
    },

    async authenticate(bearer: string | undefined) {
        if (!bearer) return null;
        const token = bearer.replace(/^Bearer\s+/i, '').trim();
        if (!token) return null;
        const row = await prisma.scimToken.findUnique({ where: { tokenHash: hashToken(token) } });
        if (!row || row.revokedAt) return null;
        await prisma.scimToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
        if (row.providerId) {
            await prisma.identityProvider.update({ where: { id: row.providerId }, data: { lastScimAt: new Date() } }).catch(() => undefined);
        }
        return row;
    },

    async createToken(organizationId: string, actorUserId: string, label: string, providerId?: string) {
        const raw = randomToken() + randomToken();
        const row = await prisma.scimToken.create({
            data: {
                publicId: publicIdentityId('scim'),
                organizationId,
                providerId,
                label: label.trim() || 'Provisioning token',
                tokenHash: hashToken(raw),
            },
        });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.scim.token_created',
            resourceType: 'ScimToken',
            resourceId: row.id,
            result: 'success',
        });
        return {
            id: row.id,
            publicId: row.publicId,
            label: row.label,
            token: raw,
            baseUrl: identityServiceUrls('unused').scimBaseUrl,
            createdAt: row.createdAt,
        };
    },

    async rotateToken(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.scimToken.findFirst({ where: { id, organizationId, revokedAt: null } });
        if (!existing) throw Object.assign(new Error('not found'), { status: 404 });
        await prisma.scimToken.update({ where: { id }, data: { revokedAt: new Date() } });
        const next = await this.createToken(organizationId, actorUserId, existing.label, existing.providerId || undefined);
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.scim.token_rotated',
            resourceType: 'ScimToken',
            resourceId: id,
            result: 'success',
        });
        return next;
    },

    async revokeToken(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.scimToken.findFirst({ where: { id, organizationId } });
        if (!existing) throw Object.assign(new Error('not found'), { status: 404 });
        await prisma.scimToken.update({ where: { id }, data: { revokedAt: new Date() } });
        await identityAudit({
            organizationId,
            actorUserId,
            action: 'identity.scim.token_revoked',
            resourceType: 'ScimToken',
            resourceId: id,
            result: 'success',
        });
        return { revoked: true };
    },

    async listTokens(organizationId: string) {
        const rows = await prisma.scimToken.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((row) => ({
            id: row.id,
            publicId: row.publicId,
            label: row.label,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt,
            revoked: Boolean(row.revokedAt),
            baseUrl: identityServiceUrls('unused').scimBaseUrl,
        }));
    },

    parseFilter(filter?: string) {
        if (!filter) return {};
        const match = filter.match(/^(userName|externalId|id|displayName)\s+eq\s+"([^"]+)"$/i);
        if (!match) throw Object.assign(new Error('filter'), { status: 400 });
        return { field: match[1], value: match[2] };
    },

    page(query: { startIndex?: string; count?: string }) {
        const startIndex = Math.max(1, Number(query.startIndex || 1) || 1);
        const count = Math.min(MAX_COUNT, Math.max(1, Number(query.count || 50) || 50));
        return { skip: startIndex - 1, take: count, startIndex };
    },

    async listUsers(organizationId: string, query: { filter?: string; startIndex?: string; count?: string }) {
        const parsed = this.parseFilter(query.filter);
        const page = this.page(query);
        const where: Record<string, unknown> = { organizationId };
        if (parsed.field === 'userName') where.email = normalizeEmail(parsed.value || '');
        if (parsed.field === 'id') where.id = parsed.value;
        if (parsed.field === 'externalId') {
            where.identityAccounts = { some: { subject: parsed.value, organizationId } };
        }
        const [total, rows] = await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip: page.skip,
                take: page.take,
                orderBy: { createdAt: 'asc' },
                include: { identityAccounts: true },
            }),
        ]);
        return {
            schemas: [LIST_SCHEMA],
            totalResults: total,
            startIndex: page.startIndex,
            itemsPerPage: rows.length,
            Resources: rows.map((row) => scimUser(row)),
        };
    },

    async getUser(organizationId: string, id: string) {
        const user = await prisma.user.findFirst({
            where: { id, organizationId },
            include: { identityAccounts: true },
        });
        if (!user) return null;
        return scimUser(user);
    },

    async upsertUser(organizationId: string, body: Record<string, unknown>, providerId?: string) {
        const userName = normalizeEmail(String(body.userName || (body.emails as Array<{ value?: string }> | undefined)?.[0]?.value || ''));
        const name = (body.name || {}) as { givenName?: string; familyName?: string };
        const externalId = String(body.externalId || userName);
        const active = body.active !== false;
        if (!userName) throw Object.assign(new Error('schema'), { status: 400 });
        const existing = await prisma.user.findFirst({
            where: {
                organizationId,
                OR: [
                    { email: userName },
                    { identityAccounts: { some: { subject: externalId, organizationId } } },
                ],
            },
            include: { identityAccounts: true },
        });
        if (existing) {
            const updated = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    firstName: name.givenName || existing.firstName,
                    lastName: name.familyName || existing.lastName,
                    status: active ? UserAccountStatus.ACTIVE : UserAccountStatus.DISABLED,
                    disabledAt: active ? null : new Date(),
                    provisioningSource: existing.provisioningSource || 'scim',
                },
                include: { identityAccounts: true },
            });
            if (!active) await revokeUserAccess(updated.id);
            await identityAudit({
                organizationId,
                action: active ? 'identity.scim.user.updated' : 'identity.scim.user.deactivated',
                resourceType: 'User',
                resourceId: updated.id,
                result: 'success',
            });
            return { created: false, resource: scimUser(updated) };
        }
        const provider = providerId
            ? await prisma.identityProvider.findFirst({ where: { id: providerId, organizationId } })
            : await prisma.identityProvider.findFirst({ where: { organizationId } });
        if (!provider) throw Object.assign(new Error('schema'), { status: 409 });
        const user = await identityService.provisionOrLink({
            organizationId,
            providerId: provider.id,
            issuer: `scim:${organizationId}`,
            subject: externalId,
            email: userName,
            firstName: name.givenName || 'Provisioned',
            lastName: name.familyName || 'User',
            role: provider.defaultRole,
            jitEnabled: true,
            source: 'scim',
        });
        if (!active) {
            await prisma.user.update({
                where: { id: user.id },
                data: { status: UserAccountStatus.DISABLED, disabledAt: new Date() },
            });
            await revokeUserAccess(user.id);
        }
        const loaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { identityAccounts: true } });
        return { created: true, resource: scimUser(loaded) };
    },

    async patchUser(organizationId: string, id: string, body: { Operations?: Array<{ op: string; path?: string; value?: unknown }> }) {
        const user = await prisma.user.findFirst({ where: { id, organizationId } });
        if (!user) return null;
        let active = user.status === UserAccountStatus.ACTIVE;
        let firstName = user.firstName;
        let lastName = user.lastName;
        for (const op of body.Operations || []) {
            const path = String(op.path || '').toLowerCase();
            if (path === 'active' || (!op.path && typeof (op.value as { active?: boolean })?.active === 'boolean')) {
                const value = path === 'active' ? op.value : (op.value as { active?: boolean }).active;
                active = value !== false;
            }
            if (path.includes('givenname')) firstName = String(op.value || firstName);
            if (path.includes('familyname')) lastName = String(op.value || lastName);
        }
        const updated = await prisma.user.update({
            where: { id },
            data: {
                firstName,
                lastName,
                status: active ? UserAccountStatus.ACTIVE : UserAccountStatus.DISABLED,
                disabledAt: active ? null : new Date(),
            },
            include: { identityAccounts: true },
        });
        if (!active) await revokeUserAccess(id);
        await identityAudit({
            organizationId,
            action: active ? 'identity.scim.user.updated' : 'identity.scim.user.deactivated',
            resourceType: 'User',
            resourceId: id,
            result: 'success',
        });
        return scimUser(updated);
    },

    async listGroups(organizationId: string, query: { filter?: string; startIndex?: string; count?: string }) {
        const parsed = this.parseFilter(query.filter);
        const page = this.page(query);
        const where: Record<string, unknown> = { organizationId };
        if (parsed.field === 'displayName') where.displayName = parsed.value;
        if (parsed.field === 'externalId') where.externalId = parsed.value;
        if (parsed.field === 'id') where.id = parsed.value;
        const [total, rows] = await prisma.$transaction([
            prisma.scimGroup.count({ where }),
            prisma.scimGroup.findMany({
                where,
                skip: page.skip,
                take: page.take,
                include: { members: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        return {
            schemas: [LIST_SCHEMA],
            totalResults: total,
            startIndex: page.startIndex,
            itemsPerPage: rows.length,
            Resources: rows.map((row) => scimGroup(row)),
        };
    },

    async upsertGroup(organizationId: string, body: Record<string, unknown>, providerId?: string) {
        const displayName = String(body.displayName || '').trim();
        const externalId = String(body.externalId || displayName);
        if (!displayName) throw Object.assign(new Error('schema'), { status: 400 });
        const existing = await prisma.scimGroup.findFirst({
            where: { organizationId, OR: [{ externalId }, { displayName }] },
            include: { members: true },
        });
        const members = Array.isArray(body.members) ? body.members as Array<{ value?: string }> : [];
        const group = existing
            ? await prisma.scimGroup.update({
                where: { id: existing.id },
                data: { displayName, externalId },
                include: { members: true },
            })
            : await prisma.scimGroup.create({
                data: { organizationId, providerId, displayName, externalId },
                include: { members: true },
            });
        if (members.length) {
            const userIds = members.map((row) => String(row.value || '')).filter(Boolean);
            const users = await prisma.user.findMany({ where: { organizationId, id: { in: userIds } } });
            await prisma.scimGroupMember.deleteMany({ where: { groupId: group.id } });
            if (users.length) {
                await prisma.scimGroupMember.createMany({
                    data: users.map((user) => ({ organizationId, groupId: group.id, userId: user.id })),
                    skipDuplicates: true,
                });
            }
            const mapping = await prisma.identityRoleMapping.findFirst({
                where: { organizationId, idpGroup: displayName },
            });
            if (mapping) {
                assertMappableRole(mapping.supremeRole);
                await prisma.user.updateMany({
                    where: { id: { in: users.map((user) => user.id) }, organizationId },
                    data: { role: mapping.supremeRole },
                });
            }
        }
        const loaded = await prisma.scimGroup.findUniqueOrThrow({ where: { id: group.id }, include: { members: true } });
        return { created: !existing, resource: scimGroup(loaded) };
    },
};
