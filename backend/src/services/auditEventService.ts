import { prisma } from '../config/database';
import logger from '../config/logger';

const SENSITIVE_KEYS = [
    'password',
    'hashedPassword',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'mfaSecret',
    'mfaSecretEnc',
    'apiKey',
    'authorization',
    'cookie',
    'jwt',
];

export type AuditInput = {
    organizationId?: string | null;
    actorUserId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    result: 'success' | 'failure';
    requestId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
};

function scrub(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(scrub);
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
                out[key] = '[redacted]';
            } else {
                out[key] = scrub(nested);
            }
        }
        return out;
    }
    return value;
}

export async function recordAudit(input: AuditInput): Promise<void> {
    try {
        await prisma.auditEvent.create({
            data: {
                organizationId: input.organizationId || undefined,
                actorUserId: input.actorUserId || undefined,
                action: input.action,
                resourceType: input.resourceType,
                resourceId: input.resourceId || undefined,
                result: input.result,
                requestId: input.requestId || undefined,
                ipAddress: input.ipAddress || undefined,
                userAgent: input.userAgent || undefined,
                metadata: input.metadata ? (scrub(input.metadata) as object) : undefined,
            },
        });
    } catch (error) {
        logger.error('Failed to persist audit event', { action: input.action, error });
    }
}

export const auditEventService = {
    record: recordAudit,
    async list(organizationId: string, filters?: { action?: string; resourceType?: string; limit?: number }) {
        return prisma.auditEvent.findMany({
            where: {
                organizationId,
                ...(filters?.action ? { action: filters.action } : {}),
                ...(filters?.resourceType ? { resourceType: filters.resourceType } : {}),
            },
            orderBy: { timestamp: 'desc' },
            take: Math.min(filters?.limit || 100, 500),
        });
    },
};
