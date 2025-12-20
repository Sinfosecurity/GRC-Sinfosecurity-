/**
 * Integration Marketplace Service
 * Manage integrations, pre-built connectors, integration library
 */
export interface Integration {
    id: string;
    name: string;
    category: 'collaboration' | 'ticketing' | 'security' | 'monitoring' | 'cloud' | 'identity';
    description: string;
    vendor: string;
    logoUrl?: string;
    status: 'available' | 'installed' | 'configured' | 'disabled';
    version: string;
    requiresApiKey: boolean;
    requiresOAuth: boolean;
    configFields?: {
        field: string;
        type: 'text' | 'password' | 'url';
        required: boolean;
    }[];
    capabilities: string[];
    installedAt?: Date;
    lastSyncedAt?: Date;
    syncFrequency?: 'realtime' | 'hourly' | 'daily';
}
declare class IntegrationMarketplaceService {
    /**
     * Get all integrations
     */
    getIntegrations(filters?: {
        status?: Integration['status'];
        category?: Integration['category'];
    }): Integration[];
    /**
     * Get integration by ID
     */
    getIntegration(integrationId: string): Integration | undefined;
    /**
     * Install integration
     */
    installIntegration(integrationId: string): boolean;
    /**
     * Configure integration
     */
    configureIntegration(integrationId: string, config: Record<string, any>): boolean;
    /**
     * Disable integration
     */
    disableIntegration(integrationId: string): boolean;
    /**
     * Test integration connection
     */
    testConnection(integrationId: string): {
        success: boolean;
        message: string;
    };
    /**
     * Get marketplace statistics
     */
    getMarketplaceStats(): {
        total: number;
        installed: number;
        configured: number;
        available: number;
        byCategory: {
            collaboration: number;
            ticketing: number;
            security: number;
            monitoring: number;
            cloud: number;
            identity: number;
        };
    };
    /**
     * Get featured integrations
     */
    getFeaturedIntegrations(): Integration[];
}
declare const _default: IntegrationMarketplaceService;
export default _default;
//# sourceMappingURL=integrationMarketplaceService.d.ts.map