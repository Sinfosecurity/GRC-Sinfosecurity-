import { getEnv } from '../config/env';

const PRODUCTION_CUSTOMER = 'https://app.supremerisk.com';
const PRODUCTION_ADMIN = 'https://admin.supremerisk.com';
const STAGING = 'https://supreme-risk-staging.onrender.com';

export function configuredCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
    const raw = env.CORS_ORIGIN || env.CORS_ORIGINS || 'http://localhost:3000';
    const extras = [env.FRONTEND_URL, env.FRONTEND_BASE_URL, env.CUSTOMER_FRONTEND_URL, env.ADMIN_FRONTEND_URL];
    const values = [...raw.split(','), ...extras]
        .map((item) => item?.trim())
        .filter((item): item is string => !!item);
    if (env.NODE_ENV !== 'production') {
        values.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000');
    }
    return Array.from(new Set(values));
}

export function isAllowedCorsOrigin(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
    if (!origin) return true;
    return configuredCorsOrigins(env).includes(origin);
}

export function corsOriginDelegate(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
    }
    callback(null, false);
}

export function documentedProductionOrigins() {
    return {
        customer: getEnv().customerFrontendUrl || PRODUCTION_CUSTOMER,
        admin: getEnv().adminFrontendUrl || PRODUCTION_ADMIN,
        staging: STAGING,
    };
}
