import request from 'supertest';
import { Role } from '@prisma/client';
import { app } from '../server';
import { prisma } from '../config/database';
import { hashPassword } from '../services/passwordService';
import { assertSafeWebhookUrl, isBlockedIp } from '../publicApi/webhookSsrf';
import { signWebhook, verifyWebhookSignature } from '../publicApi/webhookSignature';
import { publicApiClientService } from '../publicApi/clientService';
import { webhookService } from '../publicApi/webhookService';
import { tenantIntegrationService } from '../publicApi/integrationCatalog';

jest.setTimeout(60000);

describe('public API, webhooks, and tenant integrations', () => {
    it('blocks unsafe webhook destinations and verifies HMAC with replay window', () => {
        expect(isBlockedIp('127.0.0.1')).toBe(true);
        expect(isBlockedIp('169.254.169.254')).toBe(true);
        expect(isBlockedIp('10.0.0.8')).toBe(true);
        expect(() => assertSafeWebhookUrl('http://example.com/hook')).toThrow(/HTTPS/);
        expect(() => assertSafeWebhookUrl('https://localhost/hook')).toThrow(/not allowed/);
        expect(() => assertSafeWebhookUrl('https://169.254.169.254/latest')).toThrow(/not allowed/);
        const body = '{"id":"evt_1"}';
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = signWebhook('whsec_test', timestamp, body);
        expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp, body, signature })).toBe(true);
        expect(verifyWebhookSignature({ secret: 'whsec_test', timestamp: String(Number(timestamp) - 400), body, signature: signWebhook('whsec_test', String(Number(timestamp) - 400), body) })).toBe(false);
    });

    it('enforces API credentials, scopes, tenant isolation, revoke, and webhooks', async () => {
        await prisma.$queryRaw`SELECT 1`;
        const suffix = `${Date.now()}`;
        const orgA = await prisma.organization.create({ data: { name: `ApiA ${suffix}`, country: 'US' } });
        const orgB = await prisma.organization.create({ data: { name: `ApiB ${suffix}`, country: 'US' } });
        const password = await hashPassword('ValidPass1x');
        const adminA = await prisma.user.create({
            data: { email: `api-a-${suffix}@a.test`, hashedPassword: password, firstName: 'Ada', lastName: 'Api', role: Role.ORGANIZATION_ADMIN, organizationId: orgA.id },
        });
        const adminB = await prisma.user.create({
            data: { email: `api-b-${suffix}@b.test`, hashedPassword: password, firstName: 'Bea', lastName: 'Api', role: Role.ORGANIZATION_ADMIN, organizationId: orgB.id },
        });

        const created = await publicApiClientService.create(orgA.id, adminA.id, { name: 'Read', scopes: ['vendors:read'] });
        const writer = await publicApiClientService.create(orgA.id, adminA.id, { name: 'Write', scopes: ['vendors:read', 'vendors:write'] });
        const other = await publicApiClientService.create(orgB.id, adminB.id, { name: 'Other', scopes: ['vendors:read', 'vendors:write'] });
        expect(JSON.stringify(await publicApiClientService.list(orgA.id))).not.toContain(created.token);

        const deniedWrite = await request(app).post('/public/v1/vendors').set('Authorization', `Bearer ${created.token}`).send({ name: `Vendor ${suffix}` });
        expect(deniedWrite.status).toBe(403);

        const vendor = await request(app).post('/public/v1/vendors').set('Authorization', `Bearer ${writer.token}`).set('Idempotency-Key', `idemp-${suffix}`).send({
            name: `Public Vendor ${suffix}`,
            contactEmail: `vendor-${suffix}@a.test`,
            primaryContact: 'Pat',
            servicesProvided: 'API created',
        });
        expect(vendor.status).toBe(201);
        const retry = await request(app).post('/public/v1/vendors').set('Authorization', `Bearer ${writer.token}`).set('Idempotency-Key', `idemp-${suffix}`).send({
            name: `Public Vendor ${suffix} again`,
        });
        expect(retry.status).toBe(201);
        expect(retry.body.data.id).toBe(vendor.body.data.id);

        const cross = await request(app).get(`/public/v1/vendors/${vendor.body.data.id}`).set('Authorization', `Bearer ${other.token}`);
        expect(cross.status).toBe(404);

        await publicApiClientService.revoke(orgA.id, created.id, adminA.id);
        const revoked = await request(app).get('/public/v1/vendors').set('Authorization', `Bearer ${created.token}`);
        expect(revoked.status).toBe(401);

        const listed = await tenantIntegrationService.list(orgA.id);
        expect(listed.find((row) => row.id === 'slack')?.status.key).toBe('not_configured');
        expect(listed.find((row) => row.id === 'siem')?.comingLater).toBe(true);
        await expect(tenantIntegrationService.test(orgA.id, 'slack', adminA.id)).rejects.toThrow(/Configure/);

        const sink = webhookService.sinkUrl(orgA.id);
        expect(sink).toContain('/public/v1/webhook-sink/');
        await expect(webhookService.create(orgA.id, adminA.id, {
            name: 'Bad',
            url: 'https://127.0.0.1/hook',
            events: ['third_party.created'],
        })).rejects.toThrow(/not allowed/);

        const hook = await webhookService.create(orgA.id, adminA.id, {
            name: 'Sink',
            url: sink.startsWith('https://') ? sink : `https://example.com/hook`,
            events: ['third_party.created', 'webhook.test'],
        });
        expect(hook.secret).toMatch(/^whsec_/);
        expect(JSON.stringify(await webhookService.list(orgA.id))).not.toContain(hook.secret);

        const audit = await prisma.auditEvent.findFirst({ where: { organizationId: orgA.id, action: 'api.client.created' } });
        expect(JSON.stringify(audit?.metadata || {})).not.toContain(created.token);

        const expired = await publicApiClientService.create(orgA.id, adminA.id, {
            name: 'Expired',
            scopes: ['vendors:read'],
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
        });
        const expiredRes = await request(app).get('/public/v1/vendors').set('Authorization', `Bearer ${expired.token}`);
        expect(expiredRes.status).toBe(401);

        await webhookService.update(orgA.id, hook.id, adminA.id, { enabled: false });
        const afterDisable = await webhookService.emit(orgA.id, 'third_party.created', { type: 'Vendor', id: vendor.body.data.id }, { name: 'x' });
        expect(afterDisable.delivered).toBe(0);
    });
});
