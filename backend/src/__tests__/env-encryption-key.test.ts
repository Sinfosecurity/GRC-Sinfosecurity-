import { validateEnv } from '../config/env';

describe('production encryption key', () => {
    const base = {
        NODE_ENV: 'production',
        JWT_SECRET: 'hosted-jwt-secret-value-at-least-32-chars',
        JWT_REFRESH_SECRET: 'hosted-refresh-secret-value-32-chars',
        DATABASE_URL: 'postgresql://localhost:5432/supreme',
    };

    it('refuses to start when ENCRYPTION_KEY is missing', () => {
        expect(() => validateEnv(base as NodeJS.ProcessEnv)).toThrow(/ENCRYPTION_KEY is required/);
    });

    it('refuses a predictable placeholder', () => {
        expect(() => validateEnv({
            ...base,
            ENCRYPTION_KEY: 'dev-encryption-key',
        } as NodeJS.ProcessEnv)).toThrow(/ENCRYPTION_KEY/);
    });

    it('accepts a high-entropy production key', () => {
        const env = validateEnv({
            ...base,
            ENCRYPTION_KEY: 'staging-only-high-entropy-encryption-key-value',
        } as NodeJS.ProcessEnv);
        expect(env.encryptionKey).toBe('staging-only-high-entropy-encryption-key-value');
    });

    it('refuses localhost portal URLs when APP_ENVIRONMENT is production', () => {
        expect(() => validateEnv({
            ...base,
            APP_ENVIRONMENT: 'production',
            ENCRYPTION_KEY: 'staging-only-high-entropy-encryption-key-value',
            FRONTEND_URL: 'http://localhost:3000',
        } as NodeJS.ProcessEnv)).toThrow(/CUSTOMER_FRONTEND_URL/);
    });

    it('accepts production portal URLs when APP_ENVIRONMENT is production', () => {
        const env = validateEnv({
            ...base,
            APP_ENVIRONMENT: 'production',
            ENCRYPTION_KEY: 'staging-only-high-entropy-encryption-key-value',
            CUSTOMER_FRONTEND_URL: 'https://app.supremerisk.com',
            ADMIN_FRONTEND_URL: 'https://admin.supremerisk.com',
            FRONTEND_URL: 'https://app.supremerisk.com',
        } as NodeJS.ProcessEnv);
        expect(env.customerFrontendUrl).toBe('https://app.supremerisk.com');
        expect(env.adminFrontendUrl).toBe('https://admin.supremerisk.com');
    });
});
