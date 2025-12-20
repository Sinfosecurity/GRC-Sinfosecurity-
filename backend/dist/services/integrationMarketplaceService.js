"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
// In-memory storage
const integrations = new Map();
// Initialize with existing and available integrations
const integrationsList = [
    // Installed integrations
    {
        id: 'int_slack',
        name: 'Slack',
        category: 'collaboration',
        description: 'Send GRC alerts and notifications to Slack channels',
        vendor: 'Slack Technologies',
        status: 'configured',
        version: '2.0',
        requiresApiKey: true,
        requiresOAuth: false,
        configFields: [
            { field: 'webhookUrl', type: 'url', required: true },
            { field: 'channel', type: 'text', required: true },
        ],
        capabilities: ['Notifications', 'Alerts', 'Incident Updates'],
        installedAt: new Date('2024-10-01'),
        lastSyncedAt: new Date(),
        syncFrequency: 'realtime',
    },
    {
        id: 'int_jira',
        name: 'Jira',
        category: 'ticketing',
        description: 'Create and track remediation tasks in Jira',
        vendor: 'Atlassian',
        status: 'configured',
        version: '3.2',
        requiresApiKey: true,
        requiresOAuth: false,
        configFields: [
            { field: 'apiUrl', type: 'url', required: true },
            { field: 'apiKey', type: 'password', required: true },
            { field: 'project', type: 'text', required: true },
        ],
        capabilities: ['Task Creation', 'Status Sync', 'Issue Tracking'],
        installedAt: new Date('2024-09-15'),
        lastSyncedAt: new Date(),
        syncFrequency: 'hourly',
    },
    {
        id: 'int_siem',
        name: 'Generic SIEM',
        category: 'security',
        description: 'Integrate with SIEM systems for security event correlation',
        vendor: 'Various',
        status: 'configured',
        version: '1.0',
        requiresApiKey: true,
        requiresOAuth: false,
        configFields: [
            { field: 'siemEndpoint', type: 'url', required: true },
            { field: 'apiKey', type: 'password', required: true },
        ],
        capabilities: ['Event Forwarding', 'Alert Correlation', 'Log Analysis'],
        installedAt: new Date('2024-11-01'),
        lastSyncedAt: new Date(),
        syncFrequency: 'realtime',
    },
    {
        id: 'int_servicenow',
        name: 'ServiceNow',
        category: 'ticketing',
        description: 'Integrate with ServiceNow for enterprise service management',
        vendor: 'ServiceNow',
        status: 'configured',
        version: '2.1',
        requiresApiKey: true,
        requiresOAuth: false,
        configFields: [
            { field: 'instanceUrl', type: 'url', required: true },
            { field: 'username', type: 'text', required: true },
            { field: 'password', type: 'password', required: true },
        ],
        capabilities: ['Incident Management', 'Change Management', 'CMDB Sync'],
        installedAt: new Date('2024-10-20'),
        lastSyncedAt: new Date(),
        syncFrequency: 'hourly',
    },
    // Available integrations
    {
        id: 'int_splunk',
        name: 'Splunk',
        category: 'security',
        description: 'Send GRC logs and events to Splunk for analysis',
        vendor: 'Splunk',
        status: 'available',
        version: '1.5',
        requiresApiKey: true,
        requiresOAuth: false,
        capabilities: ['Log Forwarding', 'Event Analysis', 'Dashboard Integration'],
    },
    {
        id: 'int_okta',
        name: 'Okta',
        category: 'identity',
        description: 'Sync users and access controls with Okta',
        vendor: 'Okta',
        status: 'available',
        version: '2.0',
        requiresApiKey: true,
        requiresOAuth: true,
        capabilities: ['SSO', 'User Provisioning', 'Access Audit'],
    },
    {
        id: 'int_azure',
        name: 'Microsoft Azure',
        category: 'cloud',
        description: 'Monitor Azure resources and security compliance',
        vendor: 'Microsoft',
        status: 'available',
        version: '1.0',
        requiresApiKey: false,
        requiresOAuth: true,
        capabilities: ['Resource Monitoring', 'Security Center Integration', 'Compliance Assessment'],
    },
    {
        id: 'int_aws',
        name: 'Amazon Web Services',
        category: 'cloud',
        description: 'AWS Security Hub and Config integration',
        vendor: 'Amazon',
        status: 'available',
        version: '2.0',
        requiresApiKey: true,
        requiresOAuth: false,
        capabilities: ['Security Hub', 'Config Rules', 'CloudTrail Integration'],
    },
    {
        id: 'int_teams',
        name: 'Microsoft Teams',
        category: 'collaboration',
        description: 'Send notifications and collaborate in Teams',
        vendor: 'Microsoft',
        status: 'available',
        version: '1.8',
        requiresApiKey: true,
        requiresOAuth: false,
        capabilities: ['Notifications', 'Adaptive Cards', 'Channel Integration'],
    },
    {
        id: 'int_pagerduty',
        name: 'PagerDuty',
        category: 'monitoring',
        description: 'Create incidents and alerts in PagerDuty',
        vendor: 'PagerDuty',
        status: 'available',
        version: '2.1',
        requiresApiKey: true,
        requiresOAuth: false,
        capabilities: ['Incident Creation', 'On-Call Integration', 'Alert Routing'],
    },
];
// Populate storage
integrationsList.forEach(int => integrations.set(int.id, int));
class IntegrationMarketplaceService {
    /**
     * Get all integrations
     */
    getIntegrations(filters) {
        let allIntegrations = Array.from(integrations.values());
        if (filters?.status) {
            allIntegrations = allIntegrations.filter(i => i.status === filters.status);
        }
        if (filters?.category) {
            allIntegrations = allIntegrations.filter(i => i.category === filters.category);
        }
        return allIntegrations.sort((a, b) => {
            if (a.status === 'configured' && b.status !== 'configured')
                return -1;
            if (a.status !== 'configured' && b.status === 'configured')
                return 1;
            return a.name.localeCompare(b.name);
        });
    }
    /**
     * Get integration by ID
     */
    getIntegration(integrationId) {
        return integrations.get(integrationId);
    }
    /**
     * Install integration
     */
    installIntegration(integrationId) {
        const integration = integrations.get(integrationId);
        if (!integration || integration.status !== 'available')
            return false;
        integration.status = 'installed';
        integration.installedAt = new Date();
        logger_1.default.info(`📦 Integration installed: ${integration.name}`);
        return true;
    }
    /**
     * Configure integration
     */
    configureIntegration(integrationId, config) {
        const integration = integrations.get(integrationId);
        if (!integration || integration.status === 'available')
            return false;
        integration.status = 'configured';
        integration.lastSyncedAt = new Date();
        logger_1.default.info(`⚙️ Integration configured: ${integration.name}`);
        return true;
    }
    /**
     * Disable integration
     */
    disableIntegration(integrationId) {
        const integration = integrations.get(integrationId);
        if (!integration)
            return false;
        integration.status = 'disabled';
        logger_1.default.info(`🔌 Integration disabled: ${integration.name}`);
        return true;
    }
    /**
     * Test integration connection
     */
    testConnection(integrationId) {
        const integration = integrations.get(integrationId);
        if (!integration) {
            return { success: false, message: 'Integration not found' };
        }
        // Simulate connection test
        return {
            success: true,
            message: `Successfully connected to ${integration.name}`,
        };
    }
    /**
     * Get marketplace statistics
     */
    getMarketplaceStats() {
        const allIntegrations = Array.from(integrations.values());
        return {
            total: allIntegrations.length,
            installed: allIntegrations.filter(i => i.status !== 'available').length,
            configured: allIntegrations.filter(i => i.status === 'configured').length,
            available: allIntegrations.filter(i => i.status === 'available').length,
            byCategory: {
                collaboration: allIntegrations.filter(i => i.category === 'collaboration').length,
                ticketing: allIntegrations.filter(i => i.category === 'ticketing').length,
                security: allIntegrations.filter(i => i.category === 'security').length,
                monitoring: allIntegrations.filter(i => i.category === 'monitoring').length,
                cloud: allIntegrations.filter(i => i.category === 'cloud').length,
                identity: allIntegrations.filter(i => i.category === 'identity').length,
            },
        };
    }
    /**
     * Get featured integrations
     */
    getFeaturedIntegrations() {
        return Array.from(integrations.values())
            .filter(i => ['Slack', 'Jira', 'Okta', 'Azure', 'AWS'].includes(i.name))
            .slice(0, 6);
    }
}
exports.default = new IntegrationMarketplaceService();
//# sourceMappingURL=integrationMarketplaceService.js.map