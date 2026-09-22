import crypto from 'crypto';
import { Prisma, WebhookDeliveryStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { getEnv } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { encryptSecret, decryptSecret } from '../security/secretBox';
import { publicIdentityId } from '../identity/core';
import { randomToken } from '../services/passwordService';
import { identityServiceUrls } from '../services/publicFrontendUrl';
import { WEBHOOK_EVENTS, type WebhookEventType } from './scopes';
import { assertSafeWebhookDestination, assertSafeWebhookUrl } from './webhookSsrf';
import { signWebhook, WEBHOOK_SCHEMA_VERSION } from './webhookSignature';

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 30_000, 120_000, 300_000, 900_000];

function publicEndpoint(row: {
    id: string;
    publicId: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    lastDeliveryAt: Date | null;
    lastStatus: string | null;
    createdAt: Date;
}) {
    return {
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        url: row.url,
        events: row.events,
        enabled: row.enabled,
        lastDeliveryAt: row.lastDeliveryAt,
        lastStatus: row.lastStatus,
        createdAt: row.createdAt,
    };
}

function newSecret() {
    return `whsec_${randomToken()}${randomToken()}`;
}

export const webhookService = {
    events() {
        const catalog = Array.isArray(WEBHOOK_EVENTS) ? WEBHOOK_EVENTS : [];
        return catalog.filter((event) => event !== 'webhook.test');
    },

    sinkUrl(organizationId: string) {
        return `${identityServiceUrls('unused').origin}/public/v1/webhook-sink/${organizationId.slice(0, 8)}`;
    },

    sinkToken(organizationId: string) {
        return this.sinkTokenForPrefix(organizationId.slice(0, 8));
    },

    sinkTokenForPrefix(prefix: string) {
        const secret = process.env.WEBHOOK_SINK_SECRET || getEnv().jwtSecret;
        return crypto.createHmac('sha256', secret).update(`webhook-sink:${prefix}`).digest('hex');
    },

    assertSinkToken(organizationIdPrefix: string, presented?: string) {
        if (!presented) throw new ApiError(401, 'Webhook sink authentication is required.');
        const token = this.sinkTokenForPrefix(organizationIdPrefix);
        const left = Buffer.from(presented);
        const right = Buffer.from(token);
        if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
            throw new ApiError(401, 'Webhook sink authentication is required.');
        }
    },

    async list(organizationId: string) {
        const rows = await prisma.webhookEndpoint.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(publicEndpoint);
    },

    async create(organizationId: string, actorUserId: string, input: { name: string; url: string; events: string[]; description?: string }) {
        assertSafeWebhookUrl(input.url);
        const events = (input.events || []).filter((event) => WEBHOOK_EVENTS.includes(event as WebhookEventType));
        if (!events.length) throw new ApiError(400, 'Select at least one webhook event.');
        const secret = newSecret();
        const row = await prisma.webhookEndpoint.create({
            data: {
                publicId: publicIdentityId('wh'),
                organizationId,
                name: input.name.trim() || 'Webhook',
                url: input.url.trim(),
                events,
                description: input.description?.trim() || null,
                secretEnc: encryptSecret(secret),
                createdById: actorUserId,
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'webhook.endpoint.created',
            resourceType: 'WebhookEndpoint',
            resourceId: row.id,
            result: 'success',
            metadata: { events },
        });
        return { ...publicEndpoint(row), secret };
    },

    async update(organizationId: string, id: string, actorUserId: string, input: { name?: string; url?: string; events?: string[]; enabled?: boolean; description?: string }) {
        const existing = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
        if (!existing) throw new ApiError(404, 'Webhook endpoint not found');
        if (input.url) assertSafeWebhookUrl(input.url);
        const events = input.events
            ? input.events.filter((event) => WEBHOOK_EVENTS.includes(event as WebhookEventType))
            : undefined;
        const row = await prisma.webhookEndpoint.update({
            where: { id },
            data: {
                name: input.name?.trim(),
                url: input.url?.trim(),
                events,
                enabled: input.enabled,
                description: input.description?.trim(),
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: input.enabled === false ? 'webhook.endpoint.disabled' : 'webhook.endpoint.updated',
            resourceType: 'WebhookEndpoint',
            resourceId: id,
            result: 'success',
        });
        return publicEndpoint(row);
    },

    async rotateSecret(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
        if (!existing) throw new ApiError(404, 'Webhook endpoint not found');
        const secret = newSecret();
        await prisma.webhookEndpoint.update({ where: { id }, data: { secretEnc: encryptSecret(secret) } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'webhook.secret.rotated',
            resourceType: 'WebhookEndpoint',
            resourceId: id,
            result: 'success',
        });
        return { secret };
    },

    async remove(organizationId: string, id: string, actorUserId: string) {
        const existing = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
        if (!existing) throw new ApiError(404, 'Webhook endpoint not found');
        await prisma.webhookEndpoint.delete({ where: { id } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'webhook.endpoint.disabled',
            resourceType: 'WebhookEndpoint',
            resourceId: id,
            result: 'success',
        });
        return { deleted: true };
    },

    async deliveries(organizationId: string, endpointId: string) {
        await prisma.webhookEndpoint.findFirstOrThrow({ where: { id: endpointId, organizationId } });
        return prisma.webhookDelivery.findMany({
            where: { organizationId, endpointId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                eventId: true,
                eventType: true,
                attempt: true,
                status: true,
                httpStatus: true,
                durationMs: true,
                nextRetryAt: true,
                createdAt: true,
                sentAt: true,
                responseSummary: true,
            },
        });
    },

    async emit(organizationId: string, eventType: WebhookEventType, resource: { type: string; id: string }, extra: Record<string, unknown> = {}) {
        const eventId = publicIdentityId('evt');
        const endpoints = await prisma.webhookEndpoint.findMany({
            where: { organizationId, enabled: true },
        });
        const matched = endpoints.filter((row) => row.events.includes(eventType));
        const payload = {
            id: eventId,
            type: eventType,
            createdAt: new Date().toISOString(),
            organizationId,
            resource,
            schemaVersion: WEBHOOK_SCHEMA_VERSION,
            data: extra,
        };
        for (const endpoint of matched) {
            await this.deliver(endpoint.id, payload, 1);
        }
        return { eventId, delivered: matched.length };
    },

    async test(organizationId: string, id: string, actorUserId: string) {
        const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
        if (!endpoint) throw new ApiError(404, 'Webhook endpoint not found');
        const eventId = publicIdentityId('evt');
        const result = await this.deliver(endpoint.id, {
            id: eventId,
            type: 'webhook.test',
            createdAt: new Date().toISOString(),
            organizationId,
            resource: { type: 'WebhookEndpoint', id },
            schemaVersion: WEBHOOK_SCHEMA_VERSION,
            data: { test: true },
        }, 1);
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'webhook.endpoint.tested',
            resourceType: 'WebhookEndpoint',
            resourceId: id,
            result: 'success',
            metadata: { test: true, eventId },
        });
        return { ...result, eventId };
    },

    async processDueRetries() {
        const due = await prisma.webhookDelivery.findMany({
            where: { status: WebhookDeliveryStatus.FAILED, nextRetryAt: { lte: new Date() } },
            orderBy: { nextRetryAt: 'asc' },
            take: 25,
        });
        for (const row of due) {
            const claimed = await prisma.webhookDelivery.updateMany({
                where: { id: row.id, status: WebhookDeliveryStatus.FAILED },
                data: { status: WebhookDeliveryStatus.PENDING },
            });
            if (!claimed.count) continue;
            const payload = row.payload as {
                id: string;
                type: string;
                createdAt: string;
                organizationId: string;
                resource: { type: string; id: string };
                schemaVersion: string;
                data?: Record<string, unknown>;
            };
            await this.deliver(row.endpointId, payload, row.attempt + 1);
        }
        return { processed: due.length };
    },

    async retry(organizationId: string, deliveryId: string, actorUserId: string) {
        const row = await prisma.webhookDelivery.findFirst({ where: { id: deliveryId, organizationId } });
        if (!row) throw new ApiError(404, 'Delivery not found');
        const payload = row.payload as { id: string; type: WebhookEventType; organizationId: string; resource: { type: string; id: string }; data?: Record<string, unknown>; createdAt: string; schemaVersion: string };
        const result = await this.deliver(row.endpointId, payload, row.attempt + 1);
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'webhook.delivery.retried',
            resourceType: 'WebhookDelivery',
            resourceId: deliveryId,
            result: 'success',
            metadata: { eventId: row.eventId },
        });
        return result;
    },

    async deliver(endpointId: string, payload: {
        id: string;
        type: string;
        createdAt: string;
        organizationId: string;
        resource: { type: string; id: string };
        schemaVersion: string;
        data?: Record<string, unknown>;
    }, attempt: number) {
        const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
        if (!endpoint || !endpoint.enabled) return { skipped: true };
        const storedPayload = payload as Prisma.InputJsonValue;
        const body = JSON.stringify(payload);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const secret = decryptSecret(endpoint.secretEnc);
        const signature = signWebhook(secret, timestamp, body);
        let httpStatus: number | null = null;
        let summary = '';
        let durationMs = 0;
        const started = Date.now();
        try {
            const url = await assertSafeWebhookDestination(endpoint.url);
            const response = await fetch(url.toString(), {
                method: 'POST',
                redirect: 'error',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Supreme-Signature': signature,
                    'X-Supreme-Timestamp': timestamp,
                    'X-Supreme-Event-Id': payload.id,
                    'X-Supreme-Event': payload.type,
                    'X-Supreme-Schema': payload.schemaVersion,
                },
                body,
            });
            durationMs = Date.now() - started;
            httpStatus = response.status;
            summary = `HTTP ${response.status}`;
            if (!response.ok) throw new Error(summary);
            await prisma.webhookDelivery.create({
                data: {
                    organizationId: endpoint.organizationId,
                    endpointId,
                    eventId: payload.id,
                    eventType: payload.type,
                    attempt,
                    status: WebhookDeliveryStatus.DELIVERED,
                    httpStatus,
                    durationMs,
                    payload: storedPayload,
                    responseSummary: summary,
                    sentAt: new Date(),
                },
            });
            await prisma.webhookEndpoint.update({
                where: { id: endpointId },
                data: { lastDeliveryAt: new Date(), lastStatus: 'DELIVERED' },
            });
            return { status: 'DELIVERED', eventId: payload.id, httpStatus };
        } catch (error) {
            durationMs = durationMs || Date.now() - started;
            summary = error instanceof Error ? error.message.slice(0, 180) : 'Delivery failed';
            const dead = attempt >= MAX_ATTEMPTS;
            await prisma.webhookDelivery.create({
                data: {
                    organizationId: endpoint.organizationId,
                    endpointId,
                    eventId: payload.id,
                    eventType: payload.type,
                    attempt,
                    status: dead ? WebhookDeliveryStatus.DEAD : WebhookDeliveryStatus.FAILED,
                    httpStatus,
                    durationMs,
                    nextRetryAt: dead ? null : new Date(Date.now() + (BACKOFF_MS[attempt] || 900_000)),
                    payload: storedPayload,
                    responseSummary: summary,
                    sentAt: new Date(),
                },
            });
            await prisma.webhookEndpoint.update({
                where: { id: endpointId },
                data: { lastDeliveryAt: new Date(), lastStatus: dead ? 'DEAD' : 'FAILED' },
            });
            return { status: dead ? 'DEAD' : 'FAILED', eventId: payload.id, httpStatus };
        }
    },

    async receiveSink(organizationIdPrefix: string, headers: Record<string, string>, body: unknown) {
        const presented = headers['x-supreme-sink-token'] || headers['authorization']?.replace(/^Bearer\s+/i, '');
        this.assertSinkToken(organizationIdPrefix, presented);
        if (body == null || typeof body !== 'object' || Array.isArray(body)) {
            throw new ApiError(400, 'Webhook sink accepts a JSON object only.');
        }
        const serialized = JSON.stringify(body);
        if (serialized.length > 64 * 1024) {
            throw new ApiError(413, 'Webhook sink payload is too large.');
        }
        const org = await prisma.organization.findFirst({
            where: { id: { startsWith: organizationIdPrefix } },
            select: { id: true },
        });
        if (!org) throw new ApiError(404, 'Webhook sink not found');
        const eventId = headers['x-supreme-event-id'] || null;
        if (eventId) {
            const existing = await prisma.webhookSinkReceipt.findFirst({
                where: { organizationId: org.id, eventId },
            });
            if (existing) return { received: true, idempotent: true };
        }
        await prisma.webhookSinkReceipt.create({
            data: {
                organizationId: org.id,
                sinkPublicId: organizationIdPrefix,
                eventId,
                headers: {
                    'x-supreme-event-id': headers['x-supreme-event-id'] || '',
                    'x-supreme-event': headers['x-supreme-event'] || '',
                },
                body: body as object,
            },
        });
        await recordAudit({
            organizationId: org.id,
            action: 'webhook.sink.received',
            resourceType: 'WebhookSinkReceipt',
            result: 'success',
            metadata: { eventId },
        });
        return { received: true };
    },

    async listSink(organizationId: string) {
        return prisma.webhookSinkReceipt.findMany({
            where: { organizationId },
            orderBy: { receivedAt: 'desc' },
            take: 20,
        });
    },
};

const failOnceSeen = new Set<string>();

export function shouldForceSinkFailure(sinkId: string, failOnce: boolean) {
    if (!failOnce) return false;
    if (failOnceSeen.has(sinkId)) return false;
    failOnceSeen.add(sinkId);
    return true;
}

export function startWebhookRetryWorker() {
    if (process.env.NODE_ENV === 'test') return;
    const timer = setInterval(() => {
        webhookService.processDueRetries().catch(() => undefined);
    }, 15_000);
    timer.unref();
}
