export type EnvironmentClass = 'production' | 'staging' | 'private-beta' | 'test' | 'development';

const PRIVATE_BETA_ALIASES = new Set(['private-beta', 'private_beta', 'privatebeta', 'beta']);

export function normalizeEnvironmentName(value?: string | null): string {
    return String(value || '').trim().toLowerCase();
}

export function isPrivateBetaEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
    return PRIVATE_BETA_ALIASES.has(normalizeEnvironmentName(env.APP_ENVIRONMENT || env.VITE_ENVIRONMENT));
}

export function environmentClass(env: NodeJS.ProcessEnv = process.env): EnvironmentClass {
    const value = normalizeEnvironmentName(env.APP_ENVIRONMENT || env.VITE_ENVIRONMENT || env.NODE_ENV);
    if (value === 'production') return 'production';
    if (value === 'staging') return 'staging';
    if (PRIVATE_BETA_ALIASES.has(value)) return 'private-beta';
    if (value === 'test') return 'test';
    return 'development';
}

export function publicEnvironmentBanner(envClass: EnvironmentClass = environmentClass()): {
    label: string;
    detail: string;
    productionClaim: false;
} {
    if (envClass === 'private-beta') {
        return {
            label: 'PRIVATE BETA / TEST',
            detail: 'Controlled private testing. Not production. Use synthetic data only. Not an external pentest, SOC 2, or ISO assessment.',
            productionClaim: false,
        };
    }
    if (envClass === 'staging') {
        return {
            label: 'STAGING',
            detail: 'Isolated staging. Not production. Do not use production tenant data.',
            productionClaim: false,
        };
    }
    if (envClass === 'production') {
        return {
            label: 'PRODUCTION',
            detail: 'Production profile.',
            productionClaim: false,
        };
    }
    return {
        label: 'DEVELOPMENT',
        detail: 'Local or development profile. Not production.',
        productionClaim: false,
    };
}
