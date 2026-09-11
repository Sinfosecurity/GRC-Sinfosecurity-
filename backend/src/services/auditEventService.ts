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
    async list(
        organizationId: string,
        filters?: {
            action?: string;
            resourceType?: string;
            result?: string;
            q?: string;
            limit?: number;
            page?: number;
            pageSize?: number;
        }
    ) {
        const page = Math.max(1, filters?.page || 1);
        const pageSize = Math.min(Math.max(1, filters?.pageSize || filters?.limit || 25), 100);
        const q = filters?.q?.trim();
        const where = {
            organizationId,
            ...(filters?.action ? { action: { contains: filters.action, mode: 'insensitive' as const } } : {}),
            ...(filters?.resourceType ? { resourceType: { contains: filters.resourceType, mode: 'insensitive' as const } } : {}),
            ...(filters?.result ? { result: filters.result } : {}),
            ...(q
                ? {
                      OR: [
                          { action: { contains: q, mode: 'insensitive' as const } },
                          { resourceType: { contains: q, mode: 'insensitive' as const } },
                          { resourceId: { contains: q, mode: 'insensitive' as const } },
                          { result: { contains: q, mode: 'insensitive' as const } },
                          { actor: { email: { contains: q, mode: 'insensitive' as const } } },
                          { actor: { firstName: { contains: q, mode: 'insensitive' as const } } },
                          { actor: { lastName: { contains: q, mode: 'insensitive' as const } } },
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.auditEvent.findMany({
                where,
                include: {
                    actor: {
                        select: { id: true, email: true, firstName: true, lastName: true, role: true },
                    },
                },
                orderBy: { timestamp: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.auditEvent.count({ where }),
        ]);

        return { items, page, pageSize, total };
    },
};
