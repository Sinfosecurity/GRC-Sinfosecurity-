export type PlanId = 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

/** Numeric seats/vendors are commercial allowances, not hard-enforced product limits. */
export const ALLOWANCE_ENFORCEMENT = 'COMMERCIAL_NOT_ENFORCED' as const;

export type Entitlements = {
    maxUsers: number;
    maxVendors: number;
    assessments: boolean;
    continuousMonitoring: boolean;
    aiUsage: boolean;
    advancedReporting: boolean;
    sso: boolean;
    apiAccess: boolean;
    integrations: boolean;
};

export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
    STARTER: {
        maxUsers: 5,
        maxVendors: 25,
        assessments: true,
        continuousMonitoring: false,
        aiUsage: false,
        advancedReporting: false,
        sso: false,
        apiAccess: false,
        integrations: false,
    },
    PROFESSIONAL: {
        maxUsers: 25,
        maxVendors: 250,
        assessments: true,
        continuousMonitoring: true,
        aiUsage: true,
        advancedReporting: true,
        sso: false,
        apiAccess: true,
        integrations: true,
    },
    BUSINESS: {
        maxUsers: 75,
        maxVendors: 750,
        assessments: true,
        continuousMonitoring: true,
        aiUsage: true,
        advancedReporting: true,
        sso: false,
        apiAccess: true,
        integrations: true,
    },
    ENTERPRISE: {
        maxUsers: Number.POSITIVE_INFINITY,
        maxVendors: Number.POSITIVE_INFINITY,
        assessments: true,
        continuousMonitoring: true,
        aiUsage: true,
        advancedReporting: true,
        sso: true,
        apiAccess: true,
        integrations: true,
    },
};

export function normalizePlan(plan?: string | null): PlanId {
    const value = (plan || 'STARTER').toUpperCase();
    if (value === 'PROFESSIONAL' || value === 'BUSINESS' || value === 'ENTERPRISE' || value === 'STARTER') {
        return value;
    }
    return 'STARTER';
}

export function stripePriceEnvName(plan?: string | null, interval?: string | null): string {
    const base = `STRIPE_PRICE_${normalizePlan(plan)}`;
    const cycle = (interval || '').toLowerCase();
    if (cycle === 'annual' || cycle === 'year' || cycle === 'yearly') {
        return `${base}_ANNUAL`;
    }
    return base;
}

export function normalizeBillingInterval(interval?: string | null): 'month' | 'year' {
    const cycle = (interval || '').toLowerCase();
    if (cycle === 'annual' || cycle === 'year' || cycle === 'yearly') {
        return 'year';
    }
    return 'month';
}

const PRICE_ENV_BY_PLAN: Array<{ env: string; plan: PlanId; interval: 'month' | 'year' }> = [
    { env: 'STRIPE_PRICE_STARTER', plan: 'STARTER', interval: 'month' },
    { env: 'STRIPE_PRICE_STARTER_ANNUAL', plan: 'STARTER', interval: 'year' },
    { env: 'STRIPE_PRICE_PROFESSIONAL', plan: 'PROFESSIONAL', interval: 'month' },
    { env: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL', plan: 'PROFESSIONAL', interval: 'year' },
    { env: 'STRIPE_PRICE_BUSINESS', plan: 'BUSINESS', interval: 'month' },
    { env: 'STRIPE_PRICE_BUSINESS_ANNUAL', plan: 'BUSINESS', interval: 'year' },
    { env: 'STRIPE_PRICE_ENTERPRISE', plan: 'ENTERPRISE', interval: 'month' },
    { env: 'STRIPE_PRICE_ENTERPRISE_ANNUAL', plan: 'ENTERPRISE', interval: 'year' },
];

export function planFromStripePriceId(priceId?: string | null): PlanId | null {
    if (!priceId) {
        return null;
    }
    const match = PRICE_ENV_BY_PLAN.find((row) => process.env[row.env] === priceId);
    return match?.plan || null;
}

export function intervalFromStripePriceId(priceId?: string | null): 'month' | 'year' | null {
    if (!priceId) {
        return null;
    }
    const match = PRICE_ENV_BY_PLAN.find((row) => process.env[row.env] === priceId);
    return match?.interval || null;
}

export function entitlementsFor(plan?: string | null): Entitlements {
    return PLAN_ENTITLEMENTS[normalizePlan(plan)];
}

export function assertEntitlement(plan: string | null | undefined, key: keyof Entitlements): boolean {
    const value = entitlementsFor(plan)[key];
    return value === true || (typeof value === 'number' && value > 0);
}
