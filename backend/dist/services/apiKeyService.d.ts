/**
 * API Key Service
 * Manages API keys for external integrations
 */
interface APIKey {
    id: string;
    name: string;
    key: string;
    userId: string;
    scopes: string[];
    rateLimit: number;
    createdAt: Date;
    lastUsed?: Date;
    expiresAt?: Date;
    isActive: boolean;
}
declare class APIKeyService {
    /**
     * Generate new API key
     */
    generateAPIKey(userId: string, name: string, scopes: string[], rateLimit?: number): APIKey;
    /**
     * Validate API key
     */
    validateAPIKey(key: string): APIKey | null;
    /**
     * Check if API key has required scope
     */
    hasScope(apiKey: APIKey, requiredScope: string): boolean;
    /**
     * Revoke API key
     */
    revokeAPIKey(key: string): boolean;
    /**
     * Get all API keys for a user
     */
    getUserAPIKeys(userId: string): APIKey[];
    /**
     * Generate random key
     */
    private generateRandomKey;
    /**
     * Mask API key for display
     */
    private maskKey;
}
declare const _default: APIKeyService;
export default _default;
export { APIKey };
//# sourceMappingURL=apiKeyService.d.ts.map