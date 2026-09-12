/**
 * Environment validation for Supreme Risk.
 * Production fails closed when critical security configuration is missing.
 * Never falls back to predictable encryption secrets.
 */

const WEAK_SECRETS = new Set([
    'dev-encryption-key',
    'your-super-secret-jwt-key-change-this-in-production',
    'your-super-secret-jwt-key-minimum-32-characters-change-this',
    'change-this',
    'secret',
    'jwt-secret',
]);

export type AppEnv = {
    nodeEnv: string;
    isProduction: boolean;
    isTest: boolean;
    port: number;
    databaseUrl?: string;
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    corsOrigin: string;
    encryptionKey?: string;
    redisUrl?: string;
    appBaseUrl: string;
    frontendUrl: string;
    customerFrontendUrl: string;
    adminFrontendUrl: string;
    platformJwtExpiresIn: string;
    platformJwtRefreshExpiresIn: string;
    elevationMinutes: number;
};

function isWeak(value: string | undefined): boolean {
    if (!value) return true;
    return WEAK_SECRETS.has(value) || value.length < 32;
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
    const nodeEnv = env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const isTest = nodeEnv === 'test';

    if (isProduction && env.DEV_MODE === 'true') {
        throw new Error(
            'DEV_MODE cannot be enabled when NODE_ENV=production. Supreme Risk will not use development authentication shortcuts.'
        );
    }

    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    if (isProduction && isWeak(jwtSecret)) {
        throw new Error('JWT_SECRET is missing, too short, or a known placeholder. Production refused to start.');
    }

    const jwtRefreshSecret = env.JWT_REFRESH_SECRET || jwtSecret;
    if (isProduction && isWeak(jwtRefreshSecret)) {
        throw new Error('JWT_REFRESH_SECRET is missing, too short, or a known placeholder. Production refused to start.');
    }

    if (isProduction && !env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required in production');
    }

    if (isProduction && (!env.ENCRYPTION_KEY || isWeak(env.ENCRYPTION_KEY))) {
        throw new Error(
            'ENCRYPTION_KEY is required in production and must not be a predictable placeholder. Production refused to start.'
        );
    }

    return {
        nodeEnv,
        isProduction,
        isTest,
        port: parseInt(env.PORT || '4000', 10),
        databaseUrl: env.DATABASE_URL,
        jwtSecret,
        jwtRefreshSecret,
        jwtExpiresIn: env.JWT_EXPIRES_IN || '15m',
        jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',
        corsOrigin: env.CORS_ORIGIN || 'http://localhost:3000',
        encryptionKey: env.ENCRYPTION_KEY,
        redisUrl: env.REDIS_URL,
        appBaseUrl: env.APP_BASE_URL || `http://localhost:${env.PORT || '4000'}`,
        frontendUrl: env.FRONTEND_URL || env.CORS_ORIGIN || 'http://localhost:3000',
        customerFrontendUrl: env.CUSTOMER_FRONTEND_URL || env.FRONTEND_URL || env.CORS_ORIGIN || 'http://localhost:3000',
        adminFrontendUrl: env.ADMIN_FRONTEND_URL || env.FRONTEND_URL || env.CORS_ORIGIN || 'http://localhost:3000',
        platformJwtExpiresIn: env.PLATFORM_JWT_EXPIRES_IN || '10m',
        platformJwtRefreshExpiresIn: env.PLATFORM_JWT_REFRESH_EXPIRES_IN || '8h',
        elevationMinutes: Math.min(Math.max(parseInt(env.PLATFORM_ELEVATION_MINUTES || '15', 10) || 15, 5), 15),
    };
}

export function getEnv(): AppEnv {
    return validateEnv();
}

export function isProviderConfigured(...keys: string[]): boolean {
    return keys.every((key) => {
        const value = process.env[key];
        return !!value && !WEAK_SECRETS.has(value);
    });
}
