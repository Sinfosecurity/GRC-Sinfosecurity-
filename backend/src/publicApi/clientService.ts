import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { hashToken, randomToken } from '../services/passwordService';
import { publicIdentityId } from '../identity/core';
import { assertScopes, PUBLIC_API_SCOPES, type PublicApiScope } from './scopes';

function publicClient(row: {
    id: string;
    publicId: string;
    name: string;
    scopes: string[];
    expiresAt: Date | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
}) {
    return {
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        scopes: row.scopes,
        expiresAt: row.expiresAt,
        revoked: Boolean(row.revokedAt),
        lastUsedAt: row.lastUsedAt,
        createdAt: row.createdAt,
    };
}

export const publicApiClientService = {
    async list(organizationId: string) {
        const rows = await prisma.publicApiClient.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(publicClient);
    },

    async create(organizationId: string, actorUserId: string, input: { name: string; scopes: string[]; expiresAt?: string | null }) {
        const scopes = assertScopes(input.scopes.length ? input.scopes : ['vendors:read']);
        const raw = `srk_${randomToken()}${randomToken()}`;
        const row = await prisma.publicApiClient.create({
            data: {
                publicId: publicIdentityId('api'),
                organizationId,
                name: input.name.trim() || 'API client',
                scopes,
                tokenHash: hashToken(raw),
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                createdById: actorUserId,
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'api.client.created',
            resourceType: 'PublicApiClient',
            resourceId: row.id,
            result: 'success',
            metadata: { scopes },
        });
        return { ...publicClient(row), token: raw };
    },

    async rotate(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.publicApiClient.findFirst({ where: { id, organizationId, revokedAt: null } });
        if (!existing) throw new ApiError(404, 'API client not found');
        const raw = `srk_${randomToken()}${randomToken()}`;
        const row = await prisma.publicApiClient.update({
            where: { id },
            data: { tokenHash: hashToken(raw) },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'api.client.rotated',
            resourceType: 'PublicApiClient',
            resourceId: id,
            result: 'success',
        });
        return { ...publicClient(row), token: raw };
    },

    async revoke(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.publicApiClient.findFirst({ where: { id, organizationId } });
        if (!existing) throw new ApiError(404, 'API client not found');
        await prisma.publicApiClient.update({ where: { id }, data: { revokedAt: new Date() } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'api.client.revoked',
            resourceType: 'PublicApiClient',
            resourceId: id,
            result: 'success',
        });
        return { revoked: true };
    },

    async authenticate(bearer: string | undefined) {
        if (!bearer) return null;
        const token = bearer.replace(/^Bearer\s+/i, '').trim();
        if (!token) return null;
        const row = await prisma.publicApiClient.findUnique({ where: { tokenHash: hashToken(token) } });
        if (!row || row.revokedAt) return null;
        if (row.expiresAt && row.expiresAt < new Date()) return null;
        await prisma.publicApiClient.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
        return row;
    },

    requireScope(granted: string[], needed: PublicApiScope) {
        if (!granted.includes(needed)) {
            throw new ApiError(403, `Missing scope ${needed}`);
        }
    },

    catalog() {
        return { scopes: PUBLIC_API_SCOPES };
    },
};
