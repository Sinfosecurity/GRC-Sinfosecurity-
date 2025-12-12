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
    rateLimit: number; // requests per minute
    createdAt: Date;
    lastUsed?: Date;
    expiresAt?: Date;
    isActive: boolean;
}

// In-memory storage
const apiKeys = new Map<string, APIKey>();

class APIKeyService {
    /**
     * Generate new API key
     */
    generateAPIKey(userId: string, name: string, scopes: string[], rateLimit: number = 60): APIKey {
        const key = `grc_${this.generateRandomKey(32)}`;

        const apiKey: APIKey = {
            id: `ak_${Date.now()}`,
            name,
            key,
            userId,
            scopes,
            rateLimit,
            createdAt: new Date(),
            isActive: true,
        };

        apiKeys.set(key, apiKey);
        return apiKey;
    }

    /**
     * Validate API key
     */
    validateAPIKey(key: string): APIKey | null {
        const apiKey = apiKeys.get(key);

        if (!apiKey) return null;
        if (!apiKey.isActive) return null;
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

        // Update last used
        apiKey.lastUsed = new Date();
        apiKeys.set(key, apiKey);

        return apiKey;
    }

    /**
     * Check if API key has required scope
     */
    hasScope(apiKey: APIKey, requiredScope: string): boolean {
        return apiKey.scopes.includes('*') || apiKey.scopes.includes(requiredScope);
    }

    /**
     * Revoke API key
     */
    revokeAPIKey(key: string): boolean {
        const apiKey = apiKeys.get(key);
        if (!apiKey) return false;

        apiKey.isActive = false;
        apiKeys.set(key, apiKey);
        return true;
    }

    /**
     * Get all API keys for a user
     */
    getUserAPIKeys(userId: string): APIKey[] {
        return Array.from(apiKeys.values())
            .filter(ak => ak.userId === userId)
            .map(ak => ({ ...ak, key: this.maskKey(ak.key) })); // Mask keys for security
    }

    /**
     * Generate random key
     */
    private generateRandomKey(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Mask API key for display
     */
    private maskKey(key: string): string {
        if (key.length < 12) return '***';
        return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    }
}

export default new APIKeyService();
export { APIKey };
