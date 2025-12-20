"use strict";
/**
 * API Key Service
 * Manages API keys for external integrations
 */
Object.defineProperty(exports, "__esModule", { value: true });
// In-memory storage
const apiKeys = new Map();
class APIKeyService {
    /**
     * Generate new API key
     */
    generateAPIKey(userId, name, scopes, rateLimit = 60) {
        const key = `grc_${this.generateRandomKey(32)}`;
        const apiKey = {
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
    validateAPIKey(key) {
        const apiKey = apiKeys.get(key);
        if (!apiKey)
            return null;
        if (!apiKey.isActive)
            return null;
        if (apiKey.expiresAt && apiKey.expiresAt < new Date())
            return null;
        // Update last used
        apiKey.lastUsed = new Date();
        apiKeys.set(key, apiKey);
        return apiKey;
    }
    /**
     * Check if API key has required scope
     */
    hasScope(apiKey, requiredScope) {
        return apiKey.scopes.includes('*') || apiKey.scopes.includes(requiredScope);
    }
    /**
     * Revoke API key
     */
    revokeAPIKey(key) {
        const apiKey = apiKeys.get(key);
        if (!apiKey)
            return false;
        apiKey.isActive = false;
        apiKeys.set(key, apiKey);
        return true;
    }
    /**
     * Get all API keys for a user
     */
    getUserAPIKeys(userId) {
        return Array.from(apiKeys.values())
            .filter(ak => ak.userId === userId)
            .map(ak => ({ ...ak, key: this.maskKey(ak.key) })); // Mask keys for security
    }
    /**
     * Generate random key
     */
    generateRandomKey(length) {
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
    maskKey(key) {
        if (key.length < 12)
            return '***';
        return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    }
}
exports.default = new APIKeyService();
//# sourceMappingURL=apiKeyService.js.map