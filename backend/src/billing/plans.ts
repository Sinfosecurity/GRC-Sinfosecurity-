export type PlanId = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

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
    if (value === 'PROFESSIONAL' || value === 'ENTERPRISE' || value === 'STARTER') {
        return value;
    }
    return 'STARTER';
}

export function entitlementsFor(plan?: string | null): Entitlements {
    return PLAN_ENTITLEMENTS[normalizePlan(plan)];
}

export function assertEntitlement(plan: string | null | undefined, key: keyof Entitlements): boolean {
    const value = entitlementsFor(plan)[key];
    return value === true || (typeof value === 'number' && value > 0);
}
