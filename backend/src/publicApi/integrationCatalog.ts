import { IntegrationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from '../services/auditEventService';
import { encryptSecret, decryptSecret } from '../security/secretBox';
import SlackIntegration from '../integrations/slackIntegration';
import JiraIntegration from '../integrations/jiraIntegration';
import { assertSafeWebhookUrl } from './webhookSsrf';

export type CatalogKind = 'collaboration' | 'ticketing' | 'siem' | 'risk_observation';

export const INTEGRATION_CATALOG = [
    { id: 'slack', label: 'Slack', purpose: 'Send tenant notifications to a Slack incoming webhook.', kind: 'collaboration' as CatalogKind, configurable: true, fields: ['webhookUrl'] },
    { id: 'jira', label: 'Jira', purpose: 'Create remediation tickets from findings.', kind: 'ticketing' as CatalogKind, configurable: true, fields: ['baseUrl', 'email', 'apiToken', 'projectKey'] },
    { id: 'servicenow', label: 'ServiceNow', purpose: 'Ticket creation for findings.', kind: 'ticketing' as CatalogKind, configurable: false, comingLater: true },
    { id: 'siem', label: 'SIEM', purpose: 'Generic HTTPS event forwarding is not a product SIEM. Coming later.', kind: 'siem' as CatalogKind, configurable: false, comingLater: true },
    { id: 'securityscorecard', label: 'SecurityScorecard', purpose: 'External vendor observations. Does not overwrite Supreme risk decisions.', kind: 'risk_observation' as CatalogKind, configurable: false, comingLater: true },
    { id: 'bitsight', label: 'BitSight', purpose: 'External vendor observations. Does not overwrite Supreme risk decisions.', kind: 'risk_observation' as CatalogKind, configurable: false, comingLater: true },
] as const;

function customerStatus(status: IntegrationStatus) {
    if (status === IntegrationStatus.CONNECTED) return { key: 'connected', label: 'Connected' };
    if (status === IntegrationStatus.CONFIGURED) return { key: 'configured', label: 'Configured' };
    if (status === IntegrationStatus.ERROR) return { key: 'error', label: 'Error' };
    if (status === IntegrationStatus.DISABLED) return { key: 'disabled', label: 'Disabled' };
    return { key: 'not_configured', label: 'Not configured' };
}

function safeConfig(provider: string, raw: Record<string, string>) {
    if (provider === 'slack') return { webhookUrl: Boolean(raw.webhookUrl) };
    if (provider === 'jira') return { baseUrl: Boolean(raw.baseUrl), email: Boolean(raw.email), apiToken: Boolean(raw.apiToken), projectKey: Boolean(raw.projectKey) };
    return {};
}

export const tenantIntegrationService = {
    catalog() {
        return INTEGRATION_CATALOG;
    },

    async list(organizationId: string) {
        const rows = await prisma.integrationConnection.findMany({ where: { organizationId } });
        const byProvider = new Map(rows.map((row) => [row.provider, row]));
        return INTEGRATION_CATALOG.map((item) => {
            const row = byProvider.get(item.id);
            return {
                ...item,
                status: row ? customerStatus(row.status) : { key: 'not_configured', label: 'comingLater' in item && item.comingLater ? 'Coming later' : 'Not configured' },
                lastTestedAt: row?.lastTestedAt || null,
                lastError: row?.lastError || null,
                configuredFields: row?.configEnc ? safeConfig(item.id, JSON.parse(decryptSecret(row.configEnc))) : {},
            };
        });
    },

    async configure(organizationId: string, provider: string, actorUserId: string, config: Record<string, string>) {
        const item = INTEGRATION_CATALOG.find((row) => row.id === provider);
        if (!item?.configurable) throw new ApiError(400, 'That integration is not configurable yet.');
        const cleaned: Record<string, string> = {};
        for (const field of item.fields) {
            const value = String(config[field] || '').trim();
            if (value) cleaned[field] = value;
        }
        if (item.fields.some((field) => !cleaned[field] && field !== 'projectKey')) {
            throw new ApiError(400, 'Complete the required integration fields.');
        }
        if (provider === 'slack') assertSafeWebhookUrl(cleaned.webhookUrl);
        if (provider === 'jira') assertSafeWebhookUrl(cleaned.baseUrl);
        const row = await prisma.integrationConnection.upsert({
            where: { organizationId_provider: { organizationId, provider } },
            create: {
                organizationId,
                provider,
                status: 'CONFIGURED',
                configEnc: encryptSecret(JSON.stringify(cleaned)),
            },
            update: {
                status: 'CONFIGURED',
                configEnc: encryptSecret(JSON.stringify(cleaned)),
                lastError: null,
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'integration.configured',
            resourceType: 'IntegrationConnection',
            resourceId: row.id,
            result: 'success',
            metadata: { provider },
        });
        return (await this.list(organizationId)).find((entry) => entry.id === provider);
    },

    async test(organizationId: string, provider: string, actorUserId: string) {
        const row = await prisma.integrationConnection.findUnique({
            where: { organizationId_provider: { organizationId, provider } },
        });
        if (!row?.configEnc) throw new ApiError(409, 'Configure the integration before testing.');
        const config = JSON.parse(decryptSecret(row.configEnc)) as Record<string, string>;
        let result: { status: string; error?: string };
        if (provider === 'slack') {
            result = await new SlackIntegration({ webhookUrl: config.webhookUrl }).testConnection();
        } else if (provider === 'jira') {
            result = await new JiraIntegration({
                host: config.baseUrl,
                email: config.email,
                apiToken: config.apiToken,
                projectKey: config.projectKey || 'SR',
            }).testConnection();
        } else {
            throw new ApiError(400, 'That integration cannot be tested.');
        }
        const connected = result.status === 'CONNECTED';
        await prisma.integrationConnection.update({
            where: { id: row.id },
            data: {
                status: connected ? 'CONNECTED' : 'ERROR',
                lastTestedAt: new Date(),
                lastError: connected ? null : (result.error || 'Test failed').slice(0, 180),
            },
        });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'integration.tested',
            resourceType: 'IntegrationConnection',
            resourceId: row.id,
            result: connected ? 'success' : 'failure',
            metadata: { provider },
        });
        return (await this.list(organizationId)).find((entry) => entry.id === provider);
    },

    async disable(organizationId: string, provider: string, actorUserId: string) {
        const row = await prisma.integrationConnection.findUnique({
            where: { organizationId_provider: { organizationId, provider } },
        });
        if (!row) throw new ApiError(404, 'Integration is not configured.');
        await prisma.integrationConnection.update({ where: { id: row.id }, data: { status: 'DISABLED' } });
        await recordAudit({
            organizationId,
            actorUserId,
            action: 'integration.disabled',
            resourceType: 'IntegrationConnection',
            resourceId: row.id,
            result: 'success',
            metadata: { provider },
        });
        return (await this.list(organizationId)).find((entry) => entry.id === provider);
    },

    async notifySlack(organizationId: string, text: string) {
        const row = await prisma.integrationConnection.findUnique({
            where: { organizationId_provider: { organizationId, provider: 'slack' } },
        });
        if (!row || row.status !== 'CONNECTED' || !row.configEnc) {
            throw new ApiError(409, 'Slack is not connected.');
        }
        const config = JSON.parse(decryptSecret(row.configEnc)) as { webhookUrl: string };
        return new SlackIntegration({ webhookUrl: config.webhookUrl }).sendMessage({ text });
    },

    async createJiraTicket(organizationId: string, finding: { id: string; title: string; description: string }) {
        const existing = await prisma.externalResourceLink.findUnique({
            where: { organizationId_provider_localType_localId: { organizationId, provider: 'jira', localType: 'finding', localId: finding.id } },
        });
        if (existing) return { reused: true, key: existing.externalId, url: existing.externalUrl };
        const row = await prisma.integrationConnection.findUnique({
            where: { organizationId_provider: { organizationId, provider: 'jira' } },
        });
        if (!row || row.status !== 'CONNECTED' || !row.configEnc) {
            throw new ApiError(409, 'Jira is not connected.');
        }
        const config = JSON.parse(decryptSecret(row.configEnc)) as { baseUrl: string; email: string; apiToken: string; projectKey?: string };
        const created = await new JiraIntegration({
            host: config.baseUrl,
            email: config.email,
            apiToken: config.apiToken,
            projectKey: config.projectKey || 'SR',
        }).createIssue({
            summary: finding.title,
            description: finding.description,
            issueType: 'Task',
            priority: 'Medium',
        });
        if (created.status !== 'CONNECTED' || !created.data?.key) {
            throw new ApiError(502, created.error || 'Jira did not create a ticket.');
        }
        const url = `${config.baseUrl.replace(/\/$/, '')}/browse/${created.data.key}`;
        await prisma.externalResourceLink.create({
            data: {
                organizationId,
                provider: 'jira',
                localType: 'finding',
                localId: finding.id,
                externalId: created.data.key,
                externalUrl: url,
            },
        });
        return { reused: false, key: created.data.key, url };
    },
};
